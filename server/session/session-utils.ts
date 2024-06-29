
import {
    AttemptReconnectResult, ClientSocket, ClientSocketCallback, getEnumSize, HostServerSocket, LeaderboardType,
    ServerSocket, ServerSocketMessage, SessionAnnouncement, SessionState, SessionTimeout, TriviaGameSettingsPreset, VoiceLineType,
    VoiceType
} from "jparty-shared";
import { Socket } from "socket.io";

import { playVoiceLine } from "./audio.js";
import { Session } from "./session.js";
import { addNewLeaderboardPlayer, getLeaderboardPlayers } from "../api-requests/leaderboard-db.js";
import { io } from "../controller.js";
import { debugLog, DebugLogType, formatDebugLog } from "../misc/log.js";

// don't let "the man" convince you that 1000 and 60 are magic numbers
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

    // modern masculine is normally the default, but we can't use it if open AI TTS is disabled
    if (!process.env.USE_OPENAI_TTS) {
        sessions[sessionName].voiceType = VoiceType.ClassicMasculine;
    }

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
        socket.emit(HostServerSocket.ShowAnnouncement, session.currentAnnouncement, session.currentVoiceLine);
    }
    else {
        socket.emit(HostServerSocket.HideAnnouncement, true);
    }

    emitStateUpdate(session.name);
}

export function joinSessionAsHost(socket: Socket, sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    joinSession(socket, sessionName);

    socket.emit(HostServerSocket.UpdateVoiceType, session.voiceType, !process.env.USE_OPENAI_TTS /* modernVoicesDisabled */);

    if (socket.id !== session.creatorSocketID) {
        socket.emit(ServerSocket.BeginSpectate);
    }

    emitLeaderboardUpdate(socket);
    socket.emit(HostServerSocket.UpdateGameSettingsPreset, session.triviaGameSettingsPreset);
    socket.emit(HostServerSocket.UpdateReadingCategoryIndex, session.readingCategoryIndex);

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
    if (!session.currentAnnouncement && (session.state === SessionState.PromptClueSelection) && (session.getConnectedPlayerIDs().length === 1)) {
        session.resetClueSelection();
        session.promptClueSelection();
        emitStateUpdate(session.name);
    }

    // check if this player needs to become the game starter
    session.promptGameStarter();

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

export function startPositionChangeAnimation(sessionName: string) {
    // for each player, a CSS variable based on that player's positionChange property is set to define their animation distance
    // after the animation is complete, we need to reset that positionChange property so the animation doesn't kick off everytime the scoreboard renders

    emitStateUpdate(sessionName);

    // in CSS this animation takes 1 second. we give it a generous amount of padding to account for network latency/rendering time/etc.
    const POSITION_CHANGE_ANIMATION_DURATION_MS = 2000;
    setTimeout(() => {
        let session = getSession(sessionName);
        if (!session) {
            return;
        }

        session.updatePlayerPositionChanges([]);
        emitStateUpdate(sessionName);
    }, POSITION_CHANGE_ANIMATION_DURATION_MS);
}

export async function updateLeaderboard(sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    if (session.triviaGameSettingsPreset !== TriviaGameSettingsPreset.Normal) {
        return;
    }

    session.clearPlayerClueDecisions();
    emitStateUpdate(sessionName);

    for (const playerID in session.players) {
        const player = session.players[playerID];
        if (!player || !player.qualifiesForLeaderboard()) {
            continue;
        }

        await addNewLeaderboardPlayer(player);
    }
}

export function startTimeout(sessionName: string, timeout: SessionTimeout, callback: Function) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    session.startTimeout(timeout, () => {
        try {
            callback();
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

    session.setCurrentAnnouncement(announcement);
    playVoiceLine(sessionName, VoiceLineType.Announcement);

    io.in(sessionName).emit(HostServerSocket.ShowAnnouncement, announcement, session.currentVoiceLine);

    startTimeout(sessionName, SessionTimeout.Announcement, () => {
        let session = getSession(sessionName);
        if (!session) {
            return;
        }

        stopTimeout(sessionName, SessionTimeout.Announcement);

        const forceHideAnnouncement = announcement === SessionAnnouncement.GameOver;
        io.in(sessionName).emit(HostServerSocket.HideAnnouncement, forceHideAnnouncement);

        session.setCurrentAnnouncement(undefined);

        callback();
    });
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

export async function emitLeaderboardUpdate(socket: Socket) {
    socket.emit(HostServerSocket.UpdateLeaderboardPlayers, LeaderboardType.AllTime, await getLeaderboardPlayers(LeaderboardType.AllTime));
    socket.emit(HostServerSocket.UpdateLeaderboardPlayers, LeaderboardType.Monthly, await getLeaderboardPlayers(LeaderboardType.Monthly));
    socket.emit(HostServerSocket.UpdateLeaderboardPlayers, LeaderboardType.Weekly, await getLeaderboardPlayers(LeaderboardType.Weekly));
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
        console.log(session);
    }

    io.to(Object.keys(session.hosts)).emit(ServerSocket.Message, new ServerSocketMessage((error as Error).message, true));

    // if an uncaught exception occured during a game in progress, try to put this session back into a stable state and hope for the best
    if (session.state > SessionState.Lobby) {
        session.forcePromptClueSelection();
        emitStateUpdate(sessionName);
    }
}