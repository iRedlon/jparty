
import { CheatSocket, HostServerSocket, ServerSocket, SessionAnnouncement, SessionState, SessionTimeoutType, TriviaClueBonus, TriviaClueDecision, VoiceLineType } from "jparty-shared";
import { Socket } from "socket.io";

import { playVoiceLine } from "./audio.js";
import { attemptForceSelectFinalClue, recursiveReadCategoryName } from "./handle-player-event.js";
import { Session } from "./session.js";
import { emitServerError, emitStateUpdate, emitTriviaRoundUpdate, getSession, restartTimeout, showAnnouncement, startPositionChangeAnimation } from "./session-utils.js";
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

function completeRoundExceptFirstCategory(session: Session, roundIndex: number) {
    const round = session.triviaGame?.rounds[roundIndex];
    if (!round) {
        return;
    }

    for (let categoryIndex = 1; categoryIndex < round.categories.length; categoryIndex++) {
        const category = round.categories[categoryIndex];

        for (let clueIndex = 0; clueIndex < category.clues.length; clueIndex++) {
            if (category.clues[clueIndex].bonus === TriviaClueBonus.Wager) {
                session.wagerBonusCount++;
            }

            round.setClueCompleted(categoryIndex, clueIndex);
        }
    }
}

function handleSkipToRound(socket: Socket, sessionName: string, targetRoundIndex: number, completeBoard: boolean = false) {
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
    session.wagerBonusCount = (targetRoundIndex === 1) ? 1 : 3;

    if (completeBoard) {
        completeRoundExceptFirstCategory(session, targetRoundIndex);
    }

    session.resetClueSelection();
    session.resetPlayerSubmissions();

    io.to(Object.keys(session.hosts)).emit(HostServerSocket.UpdateReadingCategoryIndex, -1);
    emitStateUpdate(sessionName);

    const announcement = session.isFinalRound() ? SessionAnnouncement.StartFinalRound : SessionAnnouncement.StartRound;

    if (session.isFinalRound()) {
        emitTriviaRoundUpdate(sessionName);

        const didForceSelectFinalClue = attemptForceSelectFinalClue(sessionName);
        if (didForceSelectFinalClue) {
            return;
        }
    }

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

function handleSkipToEndOfRound(socket: Socket, sessionName: string, targetRoundIndex: number) {
    let session = getSession(sessionName);
    if (!session || !session.triviaGame) {
        return;
    }

    if ((session.state === SessionState.Lobby) || (session.state === SessionState.GameOver)) {
        return;
    }

    if ((targetRoundIndex < session.roundIndex) || (targetRoundIndex >= session.triviaGame.rounds.length)) {
        return;
    }

    if (targetRoundIndex > session.roundIndex) {
        handleSkipToRound(socket, sessionName, targetRoundIndex, true /* completeBoard */);
        return;
    }

    session.stopAllTimeouts();
    io.in(sessionName).emit(ServerSocket.StopTimeout);
    session.setCurrentAnnouncement(undefined);
    io.in(sessionName).emit(HostServerSocket.HideAnnouncement, true);

    completeRoundExceptFirstCategory(session, targetRoundIndex);

    session.resetClueSelection();
    session.resetPlayerSubmissions();

    io.to(Object.keys(session.hosts)).emit(HostServerSocket.UpdateReadingCategoryIndex, -1);
    emitTriviaRoundUpdate(sessionName);

    const didForceSelectFinalClue = attemptForceSelectFinalClue(sessionName);
    if (!didForceSelectFinalClue) {
        session.promptClueSelection();
        playVoiceLine(sessionName, VoiceLineType.PromptClueSelection);
    }

    emitStateUpdate(sessionName);
}

function handleSkipTimeout(socket: Socket, sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    if (session.timeoutInfo[SessionTimeoutType.TossupWindow]) {
        restartTimeout(sessionName, SessionTimeoutType.TossupWindow, 0);
        return;
    }

    for (const timeoutType in session.timeoutInfo) {
        restartTimeout(sessionName, parseInt(timeoutType), 0);
    }
}

const handlers: Record<CheatSocket, Function> = {
    [CheatSocket.AddMoney]: (socket: Socket, sessionName: string) => handleAdjustMoney(socket, sessionName, CHEAT_MONEY_INCREMENT),
    [CheatSocket.SubtractMoney]: (socket: Socket, sessionName: string) => handleAdjustMoney(socket, sessionName, -CHEAT_MONEY_INCREMENT),
    [CheatSocket.SkipToEndOfRound1]: (socket: Socket, sessionName: string) => handleSkipToEndOfRound(socket, sessionName, 0),
    [CheatSocket.SkipToRound2]: (socket: Socket, sessionName: string) => handleSkipToRound(socket, sessionName, 1),
    [CheatSocket.SkipToEndOfRound2]: (socket: Socket, sessionName: string) => handleSkipToEndOfRound(socket, sessionName, 1),
    [CheatSocket.SkipToRound3]: (socket: Socket, sessionName: string) => handleSkipToRound(socket, sessionName, 2),
    [CheatSocket.SkipTimeout]: (socket: Socket, sessionName: string) => handleSkipTimeout(socket, sessionName)
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
