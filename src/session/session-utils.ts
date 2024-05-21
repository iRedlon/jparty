
import { Session, TimeoutInfo } from "./session.js";
import { getVoiceBase64Audio } from "../api-requests/tts.js";
import { io } from "../controller.js";
import { debugLog, DebugLogType, formatDebugLog } from "../misc/log.js";
import { formatSpokenVoiceLine } from "../misc/text-utils.js";

import {
    AttemptReconnectResult, ClientSocket, ClientSocketCallback, DISPLAY_CORRECT_ANSWER_VOICE_LINES,
    getEnumSize, getRandomChoice, HostServerSocket, REVEAL_CLUE_DECISION_VOICE_LINES,
    ServerSocket, ServerSocketMessage, SessionAnnouncement, SESSION_ANNOUNCEMENT_VOICE_LINES, SessionState, SessionTimeout,
    SoundEffect, VoiceLineType, VoiceLineVariable
} from "jparty-shared";
import { Socket } from "socket.io";

const SESSION_EXPIRATION_PERIOD_MS = 10 * 60 * 1000;
const SESSION_EXPIRATION_CHECK_INTERVAL_MS = 1 * 60 * 1000;

type Sessions = { [name: string]: Session }

// the sessions object stores every active session on this server
export let sessions: Sessions = {};

// every once in a while, check our sessions and delete any stale ones
setInterval(() => {
    for (const sessionName in sessions) {
        if ((Date.now() - sessions[sessionName].lastUpdatedTimeMs) > SESSION_EXPIRATION_PERIOD_MS) {
            deleteSession(sessionName);
        }
    }
}, SESSION_EXPIRATION_CHECK_INTERVAL_MS);

export function createSession(sessionName: string, hostID: string, clientID: string) {
    sessions[sessionName] = new Session(sessionName, hostID, clientID);
    return sessions[sessionName];
}

export function getSession(sessionName: string) {
    if (sessionName in sessions) {
        let session = sessions[sessionName];
        session.lastUpdatedTimeMs = Date.now();

        return session;
    }
}

export function deleteSession(sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    session.endGame();
    delete sessions[sessionName];
}

// whether connecting for the first time or re-connecting, update this client with all the game state it needs
// if this is a re-connect, the goal is to put the client directly back into the flow of the game, as if they never left
// this function is shared by both host and players. we also have seperate join handlers for host and player to do updates specifically for one or the other
export function joinSession(socket: Socket, sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    // hacky way to assign custom properties to a typed object in typescript...
    (socket as any).sessionName = session.name;
    socket.join(session.name);

    socket.emit(ServerSocket.UpdateSessionName, session.name);

    if (session.getCurrentRound()) {
        socket.emit(ServerSocket.UpdateTriviaRound, session.getCurrentRound());
        socket.emit(ServerSocket.SelectClue, session.categoryIndex, session.clueIndex);
    }

    for (let timeout = 0; timeout < getEnumSize(SessionTimeout); timeout++) {
        let sessionTimeout = session.timeoutInfo[timeout];
        if (!sessionTimeout) {
            continue;
        }

        emitTimeoutUpdate(sessionName, timeout);
        break;
    }

    if (session.currentAnnouncement !== undefined) {
        socket.emit(ServerSocket.ShowAnnouncement, session.currentAnnouncement, session.currentVoiceLine);
    }
    else {
        socket.emit(ServerSocket.HideAnnouncement);
    }

    socket.emit(ServerSocket.UpdateVoiceType, session.voiceType);

    emitStateUpdate(session.name);
}

export function joinSessionAsHost(socket: Socket, sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    joinSession(socket, sessionName);

    if (socket.id !== session.creatorSocketID) {
        socket.emit(ServerSocket.BeginSpectate);
    }

    if (session.spotlightResponderID) {
        socket.emit(HostServerSocket.RevealClueDecision, session.displayingCorrectAnswer);
    }
    else {
        const numSubmittedResponders = session.getNumSubmittedResponders();
        const numResponders = session.currentResponderIDs.length;
        socket.emit(HostServerSocket.UpdateNumSubmittedResponders, numSubmittedResponders, numResponders);
    }

    debugLog(DebugLogType.ClientConnection, `host socket ID (${socket.id}) joined session: ${session.name}`);
}

export function joinSessionAsPlayer(socket: Socket, sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    joinSession(socket, session.name);

    // if the session is waiting for a clue selection, and this newly joined player is the only one here... they need to select a clue
    if (!session.currentAnnouncement && (session.state === SessionState.ClueSelection) && (session.getConnectedPlayerIDs().length === 1)) {
        session.promptClueSelection();
        emitStateUpdate(session.name);
    }

    debugLog(DebugLogType.ClientConnection, `player socket ID (${socket.id}) joined session: ${session.name}`);
}

export function handleDisconnect(socket: Socket) {
    const sessionName = (socket as any).sessionName;

    try {
        let session = getSession(sessionName);
        if (!session) {
            return;
        }

        const isPlayer = !!(session.players[socket.id]);

        if (isPlayer) {
            session.disconnectPlayer(socket.id);
            emitStateUpdate(session.name);
        }
        else {
            session.disconnectHost(socket.id);
        }

        debugLog(DebugLogType.ClientConnection, `socket ID (${socket.id}) disconnected from session: ${session.name}`);
    }
    catch (e) {
        emitServerError(e, socket, sessionName);
    }
}

export function handleAttemptReconnect(socket: Socket, sessionName: string, clientID: string, callback: ClientSocketCallback[ClientSocket.AttemptReconnect]) {
    debugLog(DebugLogType.ClientConnection, `socket ID (${socket.id}), client ID (${clientID}), attempting to reconnect to session: ${sessionName}`);

    try {
        const result = attemptReconnectInternal(socket, sessionName, clientID);
        debugLog(DebugLogType.ClientConnection, `finished reconnection attempt with result: ${AttemptReconnectResult[result]}`);
        callback(result);
    }
    catch (e) {
        emitServerError(e, socket, sessionName);
    }
}

function attemptReconnectInternal(socket: Socket, sessionName: string, clientID: string) {
    let session = getSession(sessionName);
    if (!session) {
        return AttemptReconnectResult.StaleSession;
    }

    // we don't know whether this client was a host or player, so try both starting with host
    const hostResult = session.attemptReconnectHost(socket.id, clientID);

    if ((hostResult === AttemptReconnectResult.HostSuccess) || (hostResult === AttemptReconnectResult.AlreadyConnected)) {
        joinSessionAsHost(socket, sessionName);
        return hostResult;
    }

    // this client wasn't a host... maybe they're a player
    const playerResult = session.attemptReconnectPlayer(socket.id, clientID);

    if ((playerResult === AttemptReconnectResult.PlayerSuccess) || (playerResult === AttemptReconnectResult.AlreadyConnected)) {
        joinSessionAsPlayer(socket, sessionName);
        return playerResult;
    }

    // turns out they were neither!
    return AttemptReconnectResult.InvalidClientID;
}

export function startTimeout(sessionName: string, timeout: SessionTimeout, cb: Function) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    session.startTimeout(timeout, () => {
        try {
            cb();
        }
        catch (e) {
            emitServerError(e, undefined, sessionName);
        }
    });

    emitTimeoutUpdate(sessionName, timeout);
}

export function stopTimeout(sessionName: string, timeout: SessionTimeout) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    session.stopTimeout(timeout);
}

function emitTimeoutUpdate(sessionName: string, timeout: SessionTimeout) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    const timeoutInfo = session.timeoutInfo[timeout];
    if (!timeoutInfo) {
        return;
    }

    const displayTimeout = (timeout === SessionTimeout.BuzzWindow) || (timeout === SessionTimeout.ResponseWindow);

    if (displayTimeout) {
        io.in(session.name).emit(ServerSocket.StartTimeout, timeout, timeoutInfo.getRemainingDurationMs());
    }
}

export function showAnnouncement(sessionName: string, announcement: SessionAnnouncement, callback: Function) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    let useVoiceLineAsMessage = false;

    switch (announcement) {
        case SessionAnnouncement.SelectClue:
            {
                useVoiceLineAsMessage = true;
            }
            break;
    }

    session.setCurrentAnnouncement(announcement);
    playVoiceLine(sessionName, VoiceLineType.Announcement);

    io.in(sessionName).emit(ServerSocket.ShowAnnouncement, announcement, useVoiceLineAsMessage && session.currentVoiceLine);

    startTimeout(sessionName, SessionTimeout.Announcement, () => {
        let session = getSession(sessionName);
        if (!session) {
            return;
        }

        stopTimeout(sessionName, SessionTimeout.Announcement);
        io.in(sessionName).emit(ServerSocket.HideAnnouncement);
        session.setCurrentAnnouncement(undefined);

        callback();
    });
}

export function playSoundEffect(sessionName: string, soundEffect: SoundEffect) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    io.to(Object.keys(session.hosts)).emit(ServerSocket.PlaySoundEffect, soundEffect);
}

export async function playVoiceLine(sessionName: string, type: VoiceLineType) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    debugLog(DebugLogType.Voice, `playing voice line of type: ${VoiceLineType[type]}`);

    let voiceLine: string = "";

    switch (type) {
        case VoiceLineType.Announcement:
            {
                if (session.currentAnnouncement === undefined) {
                    debugLog(DebugLogType.Voice, "early out. session didn't have a current announcement");
                    break;
                }

                voiceLine = getRandomChoice(SESSION_ANNOUNCEMENT_VOICE_LINES[session.currentAnnouncement]);
            }
            break;
        case VoiceLineType.ReadClue:
            {
                const clue = session.getCurrentClue();
                if (clue) {
                    voiceLine = clue.question;
                }
            }
            break;
        case VoiceLineType.RevealClueDecision:
            {
                const spotlightResponder = session.players[session.spotlightResponderID];
                if (!spotlightResponder || !spotlightResponder.clueDecisionInfo) {
                    debugLog(DebugLogType.Voice, "early out. session didn't have a valid spotlight responder");
                    break;
                }

                voiceLine = getRandomChoice(REVEAL_CLUE_DECISION_VOICE_LINES[spotlightResponder.clueDecisionInfo.decision]);
            }
            break;
        case VoiceLineType.DisplayCorrectAnswer:
            {
                voiceLine = getRandomChoice(DISPLAY_CORRECT_ANSWER_VOICE_LINES);
            }
            break;
    }

    if (!voiceLine) {
        debugLog(DebugLogType.Voice, "early out. no valid voice line");
        return;
    }

    voiceLine = voiceLine.replace(VoiceLineVariable.RoundNumber, `${session.roundIndex + 1}`);

    const categoryName = session.getCurrentCategory()?.name;
    if (categoryName) {
        voiceLine = voiceLine.replace(VoiceLineVariable.CategoryName, categoryName);
    }

    const clue = session.getCurrentClue();
    if (clue) {
        voiceLine = voiceLine.replace(VoiceLineVariable.ClueValue, `${clue.value}`);
        voiceLine = voiceLine.replace(VoiceLineVariable.ClueAnswer, clue.answer);
    }

    const clueSelector = session.players[session.clueSelectorID];
    if (clueSelector) {
        voiceLine = voiceLine.replace(VoiceLineVariable.ClueSelectorName, clueSelector.name);
    }

    const spotlightResponder = session.players[session.spotlightResponderID];
    if (spotlightResponder) {
        voiceLine = voiceLine.replace(VoiceLineVariable.SpotlightResponderName, spotlightResponder.name);
    }

    const leader = session.getCurrentLeader();
    if (leader) {
        voiceLine = voiceLine.replace(VoiceLineVariable.LeaderName, leader.name);
    }

    // if we use this voice line as display text on client, we don't want it to be formatted for being spoken aloud
    // so, set it as session data first so it can be accessed in its text form, then apply spoken formatting afterwards
    session.setCurrentVoiceLine(voiceLine);

    voiceLine = formatSpokenVoiceLine(voiceLine, type);

    debugLog(DebugLogType.Voice, `final spoken voice line: \"${voiceLine}\"`);

    let voiceBase64Audio = undefined;

    try {
        voiceBase64Audio = await getVoiceBase64Audio(session.voiceType, voiceLine);
    }
    catch (e) {
        // normally we'd go through handleServerError, but if our external TTS request fails we can just fall back on the speech synthesis voice instead
        // no need to recover the session; nothing's broken
        console.error(e);
    }

    io.to(Object.keys(session.hosts)).emit(HostServerSocket.PlayVoice, session.voiceType, voiceLine, voiceBase64Audio);
}

export function emitStateUpdate(sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    io.in(sessionName).emit(ServerSocket.UpdateSpotlightResponderID, session.spotlightResponderID);
    io.in(sessionName).emit(ServerSocket.UpdateSessionState, session.state);
    io.in(sessionName).emit(ServerSocket.UpdateSessionPlayers, session.players);
}

export function emitTriviaRoundUpdate(sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    io.in(sessionName).emit(ServerSocket.UpdateTriviaRound, session.getCurrentRound());
}

export function emitServerError(error: any, socket?: Socket, sessionName?: string) {
    console.error(error);

    if (socket) {
        socket.emit(ServerSocket.Message, new ServerSocketMessage((error as Error).message, true));
    }

    sessionName = sessionName || (socket as any).sessionName as string;

    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    if (process.env.NODE_ENV === "production") {
        console.log(formatDebugLog(`error was caught in session: ${sessionName}`));
        console.log(sessions);
    }

    io.to(Object.keys(session.hosts)).emit(ServerSocket.Message, new ServerSocketMessage((error as Error).message, true));

    // if an uncaught exception occured during a game in progress, try to put this session back into a stable state and hope for the best
    if (session.state > SessionState.Lobby) {
        session.forcePromptClueSelection();
        emitStateUpdate(sessionName);
    }
}