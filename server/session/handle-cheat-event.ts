
import { CheatSocket, HostServerSocket, ServerSocket, SessionAnnouncement, SessionState, TriviaClueDecision } from "jparty-shared";
import { Socket } from "socket.io";

import { attemptForceSelectFinalClue, recursiveReadCategoryName } from "./handle-player-event.js";
import { emitServerError, emitStateUpdate, emitTriviaRoundUpdate, getSession, showAnnouncement, startPositionChangeAnimation } from "./session-utils.js";
import { io } from "../controller.js";

const CHEAT_MONEY_INCREMENT = 100;

function handleAdjustMoney(socket: Socket, sessionName: string, increment: number) {
    let session = getSession(sessionName);
    if (!session || !session.players[socket.id]) {
        return;
    }

    const decision = (increment > 0) ? TriviaClueDecision.Correct : TriviaClueDecision.Incorrect;
    session.updatePlayerScore(socket.id, Math.abs(increment), decision);

    startPositionChangeAnimation(sessionName);
}

function handleSkipToRound(socket: Socket, sessionName: string, targetRoundIndex: number) {
    let session = getSession(sessionName);
    if (!session || !session.triviaGame) {
        return;
    }

    if ((session.state === SessionState.Lobby) || (session.state === SessionState.GameOver)) {
        return;
    }

    // only skip forward
    if ((targetRoundIndex <= session.roundIndex) || (targetRoundIndex >= session.triviaGame.rounds.length)) {
        return;
    }

    session.stopAllTimeouts();
    io.in(sessionName).emit(ServerSocket.StopTimeout);
    session.setCurrentAnnouncement(undefined);
    io.in(sessionName).emit(HostServerSocket.HideAnnouncement, true);

    session.roundIndex = targetRoundIndex;
    session.resetClueSelection();
    session.resetPlayerSubmissions();

    io.to(Object.keys(session.hosts)).emit(HostServerSocket.UpdateReadingCategoryIndex, -1);
    emitStateUpdate(sessionName);

    const announcement = session.isFinalRound() ? SessionAnnouncement.StartFinalRound : SessionAnnouncement.StartRound;

    showAnnouncement(sessionName, announcement, () => {
        let session = getSession(sessionName);
        if (!session) {
            return;
        }

        emitTriviaRoundUpdate(sessionName);

        const didForceSelectFinalClue = attemptForceSelectFinalClue(sessionName);
        if (didForceSelectFinalClue) {
            return;
        }

        session.readCategoryNames();
        emitStateUpdate(sessionName);
        recursiveReadCategoryName(sessionName);
    });
}

const handlers: Record<CheatSocket, Function> = {
    [CheatSocket.AddMoney]: (socket: Socket, sessionName: string) => handleAdjustMoney(socket, sessionName, CHEAT_MONEY_INCREMENT),
    [CheatSocket.SubtractMoney]: (socket: Socket, sessionName: string) => handleAdjustMoney(socket, sessionName, -CHEAT_MONEY_INCREMENT),
    [CheatSocket.SkipToRound2]: (socket: Socket, sessionName: string) => handleSkipToRound(socket, sessionName, 1),
    [CheatSocket.SkipToRound3]: (socket: Socket, sessionName: string) => handleSkipToRound(socket, sessionName, 2)
}

export default function handleCheatEvent(socket: Socket, event: CheatSocket, ...args: any[]) {
    try {
        const sessionName = (socket as any).sessionName;
        handlers[event](socket, sessionName, ...args);
    }
    catch (e) {
        emitServerError(e, socket);
    }
}
