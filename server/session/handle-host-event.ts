
import {
    HostServerSocket, HostSocket, HostSocketCallback, NORMAL_GAME_SETTINGS, PARTY_GAME_SETTINGS, ServerSocket, ServerSocketMessage,
    SessionState, TriviaGameSettings, TriviaGameSettingsPreset, VoiceType
} from "jparty-shared";
import { generate as generateRandomWord } from "random-words";
import { Socket } from "socket.io";

import { createSession, deleteSession, emitGamePreviewUpdate, emitLeaderboardUpdate, emitServerError, emitStateUpdate, emitTriviaRoundUpdate, getSession, joinSessionAsHost, updateVoiceDuration } from "./session-utils.js";
import { generateTriviaGame } from "../api-requests/generate-trivia-game.js";
import { io } from "../controller.js";
import { debugLog, LogCategory, LogVerbosity } from "../misc/log.js";
import { formatText } from "../misc/text-utils.js";

function handleConnect(socket: Socket, clientID: string) {
    let sessionName = "";

    do {
        sessionName = generateRandomWord({ minLength: 3, maxLength: 5 }) as string;
    } while (getSession(sessionName));

    createSession(sessionName, socket.id, clientID);
    joinSessionAsHost(socket, sessionName);

    generateGamePreview(socket, sessionName);
}

// pre-generate the entire trivia game while we're still in the lobby so the hosts can preview (and re-roll) the round 1 categories
async function generateGamePreview(socket: Socket, sessionName: string) {
    let session = getSession(sessionName);
    if (!session || (session.state !== SessionState.Lobby)) {
        return;
    }

    const gameSettingsPreset = session.triviaGameSettingsPreset;

    let gameSettings = NORMAL_GAME_SETTINGS;

    if (gameSettingsPreset === TriviaGameSettingsPreset.Party) {
        gameSettings = PARTY_GAME_SETTINGS;
    }

    let triviaGame;

    try {
        triviaGame = await generateTriviaGame(TriviaGameSettings.clone(gameSettings));
    }
    catch (e) {
        emitServerError(e, socket);
        emitGamePreviewUpdate(sessionName);
        return;
    }

    if ((session.state !== SessionState.Lobby) || (session.triviaGameSettingsPreset !== gameSettingsPreset)) {
        return;
    }

    session.triviaGame = triviaGame;
    emitGamePreviewUpdate(sessionName);
}

async function handleGenerateGamePreview(socket: Socket, sessionName: string) {
    let session = getSession(sessionName);
    if (!session || (session.state !== SessionState.Lobby)) {
        return;
    }

    if (socket.id !== session.creatorSocketID) {
        return;
    }

    await generateGamePreview(socket, sessionName);
}

function handleUpdateGameSettingsPreset(socket: Socket, sessionName: string, gameSettingsPreset: TriviaGameSettingsPreset) {
    let session = getSession(sessionName);
    if (!session || (session.state !== SessionState.Lobby)) {
        return;
    }

    if (socket.id !== session.creatorSocketID) {
        return;
    }

    if ((gameSettingsPreset !== TriviaGameSettingsPreset.Normal) && (gameSettingsPreset !== TriviaGameSettingsPreset.Party)) {
        return;
    }

    session.triviaGameSettingsPreset = gameSettingsPreset;

    io.to(Object.keys(session.hosts)).except(socket.id).emit(HostServerSocket.UpdateGameSettingsPreset, gameSettingsPreset, true /* fromServer */);

    // if we have a trivia game already it must have been made with the old preset. discard it and roll a fresh preview
    session.triviaGame = undefined;
    generateGamePreview(socket, sessionName);
}

function handleUpdateVoiceType(socket: Socket, sessionName: string, voiceType: VoiceType) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    debugLog(LogCategory.Voice, `updating session (${sessionName}) to use voice type: ${voiceType}`, LogVerbosity.Verbose);

    session.voiceType = voiceType;
    io.to(Object.keys(session.hosts)).emit(HostServerSocket.UpdateVoiceType, voiceType, !process.env.USE_OPENAI_TTS /* modernVoicesDisabled */);
}

function handleUpdateVoiceDuration(socket: Socket, sessionName: string, voiceLine: string, durationSec: number) {
    let session = getSession(sessionName);
    if (!session || socket.id !== session.creatorSocketID) {
        return;
    }

    debugLog(LogCategory.Voice, `got a new duration of ${durationSec} seconds for current voice line: "${session.currentVoiceLine}"`, LogVerbosity.VeryVerbose);

    updateVoiceDuration(sessionName, voiceLine, durationSec * 1000);
}

function handleAttemptSpectate(socket: Socket, sessionName: string, clientID: string) {
    sessionName = formatText(`${sessionName}`.toLowerCase());

    let session = getSession(sessionName);
    if (!session) {
        socket.emit(ServerSocket.Message, new ServerSocketMessage(`Couldn't find a session named: ${sessionName}`, true));
        return;
    }

    if (Object.keys(session.hosts).includes(socket.id)) {
        socket.emit(ServerSocket.Message, new ServerSocketMessage(`Already a host in session: ${sessionName}`, true));
        return;
    }

    // we're moving to a new session. make sure our current session knows we're leaving
    const previousSessionName = (socket as any).sessionName;
    if (previousSessionName && (previousSessionName !== sessionName)) {
        handleLeaveSession(socket, previousSessionName);
        socket.leave(previousSessionName);
    }

    session.connectHost(socket.id, clientID);
    joinSessionAsHost(socket, sessionName);

    socket.emit(ServerSocket.Message, new ServerSocketMessage(`Joined session: ${sessionName} as spectator`));
}

function handleLeaveSession(socket: Socket, sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    debugLog(LogCategory.ClientConnection, `socket ID (${socket.id}) is leaving session: ${session.name}`, LogVerbosity.Verbose);

    session.disconnectHost(socket.id);

    if (socket.id === session.creatorSocketID) {
        deleteSession(sessionName);
        socket.broadcast.to(sessionName).emit(ServerSocket.CancelGame);
    }
}

async function handleGenerateCustomGame(socket: Socket, sessionName: string, gameSettings: TriviaGameSettings, callback: HostSocketCallback[HostSocket.GenerateCustomGame]) {
    let session = getSession(sessionName);
    if (!session || (session.state !== SessionState.Lobby)) {
        return;
    }

    if (socket.id !== session.creatorSocketID) {
        return;
    }

    // gameSettings arrives as a plain object from a client we can't trust. rebuild it as a real
    // TriviaGameSettings and validate it server-side before generating anything with it
    let cleanGameSettings: TriviaGameSettings;

    try {
        cleanGameSettings = TriviaGameSettings.clone(gameSettings);

        if (cleanGameSettings.isInvalid()) {
            throw new Error("invalid custom game settings");
        }
    }
    catch (e) {
        socket.emit(ServerSocket.Message, new ServerSocketMessage("Those custom game settings are invalid", true));
        callback(false);
        return;
    }

    try {
        await session.generateTriviaGame(cleanGameSettings);
    }
    catch (e) {
        emitServerError(e, socket);
        callback(false);
        return;
    }

    session.triviaGameSettingsPreset = TriviaGameSettingsPreset.Custom;

    io.to(Object.keys(session.hosts)).emit(HostServerSocket.UpdateGameSettingsPreset, TriviaGameSettingsPreset.Custom);
    socket.emit(ServerSocket.Message, new ServerSocketMessage("Custom settings were saved successfully"));
    emitTriviaRoundUpdate(sessionName);
    callback(true);
}

function handlePlayAgain(socket: Socket, sessionName: string) {
    let session = getSession(sessionName);
    if (!session || (session.state !== SessionState.GameOver)) {
        return;
    }

    session.resetGame();
    emitStateUpdate(sessionName);
    emitTriviaRoundUpdate(sessionName);
    emitLeaderboardUpdate(socket);
    generateGamePreview(socket, sessionName);
}

const handlers: Record<HostSocket, Function> = {
    [HostSocket.Connect]: handleConnect,
    [HostSocket.UpdateGameSettingsPreset]: handleUpdateGameSettingsPreset,
    [HostSocket.UpdateVoiceType]: handleUpdateVoiceType,
    [HostSocket.UpdateVoiceDuration]: handleUpdateVoiceDuration,
    [HostSocket.AttemptSpectate]: handleAttemptSpectate,
    [HostSocket.LeaveSession]: handleLeaveSession,
    [HostSocket.GenerateCustomGame]: handleGenerateCustomGame,
    [HostSocket.GenerateGamePreview]: handleGenerateGamePreview,
    [HostSocket.PlayAgain]: handlePlayAgain
}

export default function handleHostEvent(socket: Socket, event: HostSocket, ...args: any[]) {
    try {
        // handle any events that could occur before this host has joined a session
        // (these handlers won't take sessionName as their second param like all the other ones do)
        if ((event === HostSocket.Connect) || (event === HostSocket.AttemptSpectate)) {
            handlers[event](socket, ...args);
            return;
        }

        const sessionName = (socket as any).sessionName;
        handlers[event](socket, sessionName, ...args);
    }
    catch (e) {
        emitServerError(e, socket);
    }
}