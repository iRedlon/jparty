
import {
    emitServerError, emitStateUpdate, emitTriviaRoundUpdate, getSession, handleDisconnect, joinSession,
    playSoundEffect, playVoiceLine, showAnnouncement, startTimeout, stopTimeout
} from "./session-utils.js";
import { io } from "../controller.js";
import { formatText, validatePlayerName } from "../misc/text-utils.js";

import {
    DEFAULT_GAME_SETTINGS, HostServerSocket, PARTY_GAME_SETTINGS, PlayerResponseType, PlayerSocket, PlayerSocketCallback, ServerSocket, ServerSocketMessage,
    SessionAnnouncement, SessionState, SessionTimeout, SocketID, SoundEffect, TriviaClueBonus, TriviaClueDecision, TriviaGameSettingsPreset, VoiceLineType
} from "jparty-shared";
import { Socket } from "socket.io";
import { DebugLogType, debugLog, formatDebugLog } from "../misc/log.js";

function handleConnect(socket: Socket, sessionName: string, clientID: string, playerName: string, callback: PlayerSocketCallback[PlayerSocket.Connect]) {
    sessionName = sessionName.toLowerCase();
    playerName = formatText(playerName.toLowerCase());

    let session = getSession(sessionName);
    if (!session) {
        socket.emit(ServerSocket.Message, new ServerSocketMessage(`Couldn't find a session named: ${sessionName}`, true));

        // reset session name, don't reset player name
        callback(true, false);
        return;
    }

    const playerNameValidationResults = validatePlayerName(playerName);

    if (!playerNameValidationResults.isValid) {
        socket.emit(ServerSocket.Message, new ServerSocketMessage(`That player name is invalid. Reason: ${playerNameValidationResults.invalidReason}`, true));

        // reset player name, don't reset session name
        callback(false, true);
        return;
    }

    session.connectPlayer(socket.id, clientID, playerName);
    joinSession(socket, sessionName);

    // reset both session and player name
    callback(true, true);
}

function handleLeaveSession(socket: Socket, sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    handleDisconnect(socket);
    session.deletePlayer(socket.id);
    emitStateUpdate(sessionName);
}

async function handleStartGame(socket: Socket, sessionName: string, callback: PlayerSocketCallback[PlayerSocket.StartGame]) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    if (!session.triviaGame || (session.triviaGameSettingsPreset !== TriviaGameSettingsPreset.Custom)) {
        let gameSettings = DEFAULT_GAME_SETTINGS;

        if (session.triviaGameSettingsPreset === TriviaGameSettingsPreset.Party) {
            gameSettings = PARTY_GAME_SETTINGS;
        }

        try {
            await session.generateTriviaGame(gameSettings);
        }
        catch (e) {
            emitServerError(e, socket);
            callback(false);
            return;
        }

        emitTriviaRoundUpdate(sessionName);
    }

    session.promptClueSelection();

    showAnnouncement(sessionName, SessionAnnouncement.StartGame, () => {
        let session = getSession(sessionName);
        if (!session) {
            return;
        }

        attemptForceSelectFinalClue(sessionName);
        emitStateUpdate(sessionName);
    });
}

function promptResponse(sessionName: string, responseType: PlayerResponseType, ...responderIDs: SocketID[]) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    session.promptResponse(responseType, ...responderIDs);
    startTimeout(sessionName, SessionTimeout.ResponseWindow, () => finishResponseWindow(sessionName));

    io.to(Object.keys(session.hosts)).emit(HostServerSocket.UpdateNumSubmittedResponders, 0, responderIDs.length);

    emitStateUpdate(sessionName);
}

function readClue(sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    // turn off the client timer while we wait for the clue to be read aloud
    io.in(sessionName).emit(ServerSocket.StopTimeout);

    session.readClue();
    playVoiceLine(sessionName, VoiceLineType.ReadClue);

    emitStateUpdate(sessionName);

    startTimeout(sessionName, SessionTimeout.ReadingClue, () => {
        let session = getSession(sessionName);
        if (!session) {
            return;
        }

        session.stopTimeout(SessionTimeout.ReadingClue);

        if (session.getCurrentClue()?.bonus === TriviaClueBonus.None) {
            displayTossupClue(sessionName);
        }
        else {
            // this must be a special clue, like an all play or wager. in any case, we expect our current responder IDs to have been updated already
            promptResponse(sessionName, PlayerResponseType.Clue, ...session.currentResponderIDs);
        }
    });
}

function displayTossupClue(sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    session.displayTossupClue();
    startTimeout(sessionName, SessionTimeout.BuzzWindow, () => finishBuzzWindow(sessionName));
    emitStateUpdate(sessionName);
}

// if there's only one clue remaining in the current round, save some time by "forcing" the current clue selector to select it automatically
export function attemptForceSelectFinalClue(sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    // only force select a clue if it's the last one remaining in the current round
    const currentRound = session.getCurrentRound();
    if (!currentRound) {
        return;
    }

    const finalCluePosition = currentRound.getFinalCluePosition();
    if (!finalCluePosition || !finalCluePosition.validate()) {
        return;
    }

    // this is "fake" in the sense that we're invoking the handler without being prompted to do so by a genuine client socket message
    const fakeHandleSelectClue = () => {
        let session = getSession(sessionName);
        if (!session) {
            return;
        }

        const fakeSocket = { id: session.clueSelectorID } as Socket;
        handleSelectClue(fakeSocket, sessionName, finalCluePosition.categoryIndex, finalCluePosition.clueIndex);
    }

    const finalClueBonus = currentRound.categories[finalCluePosition.categoryIndex].clues[finalCluePosition.clueIndex].bonus;

    // we don't want to force select a clue without giving the players some warning with an announcement
    // however: clue bonuses will always be announced, so we don't have to worry about it in that case
    if (finalClueBonus) {
        fakeHandleSelectClue();
    }
    else {
        showAnnouncement(sessionName, SessionAnnouncement.FinalClue, fakeHandleSelectClue);
    }
}

function handleSelectClue(socket: Socket, sessionName: string, categoryIndex: number, clueIndex: number) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    session.selectClue(categoryIndex, clueIndex);

    const handleSelectClueInternal = () => {
        let session = getSession(sessionName);
        if (!session) {
            return;
        }

        io.in(sessionName).emit(ServerSocket.SelectClue, categoryIndex, clueIndex);

        switch (session.getCurrentClue()?.bonus) {
            case TriviaClueBonus.Wager:
                {
                    // set the spotlight responder ID in advance, just in case their socket ID happens to change during the announcement
                    session.spotlightResponderID = socket.id;

                    playSoundEffect(sessionName, SoundEffect.Applause);

                    showAnnouncement(sessionName, SessionAnnouncement.ClueBonusWager, () => {
                        let session = getSession(sessionName);
                        if (!session) {
                            return;
                        }

                        promptResponse(sessionName, PlayerResponseType.Wager, session.spotlightResponderID);
                    });
                }
                break;
            case TriviaClueBonus.AllWager:
                {
                    showAnnouncement(sessionName, SessionAnnouncement.ClueBonusAllWager, () => {
                        let session = getSession(sessionName);
                        if (!session) {
                            return;
                        }

                        promptResponse(sessionName, PlayerResponseType.Wager, ...session.getSolventPlayerIDs());
                    });
                }
                break;
            case TriviaClueBonus.AllPlay:
                {
                    session.currentResponderIDs = Object.keys(session.players);
                    showAnnouncement(sessionName, SessionAnnouncement.ClueBonusAllPlay, () => readClue(sessionName));
                }
                break;
            default:
                {
                    readClue(sessionName);
                }
                break;
        }

        emitStateUpdate(sessionName);
        emitTriviaRoundUpdate(sessionName);
    }

    const clue = session.getCurrentClue();

    // the key piece of information in a "select clue" announcement is the clue value. if our clue doesn't have a value... then no need to announce it!
    if (clue && clue.value > 0) {
        showAnnouncement(sessionName, SessionAnnouncement.SelectClue, handleSelectClueInternal);
    } else {
        handleSelectClueInternal();
    }
}

function finishBuzzWindow(sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    stopTimeout(sessionName, SessionTimeout.BuzzWindow);

    if (session.getCurrentClue()?.isTossupClue()) {
        playSoundEffect(sessionName, SoundEffect.BuzzWindowTimeout);
    }

    session.finishBuzzWindow();
    emitStateUpdate(sessionName);

    // we didn't actually get a response (because nobody buzzed in). we're just hooking into the decision reveal system so we can display the correct answer
    const displayCorrectAnswer = true;
    io.to(Object.keys(session.hosts)).emit(HostServerSocket.RevealClueDecision, displayCorrectAnswer);
    playVoiceLine(sessionName, VoiceLineType.DisplayCorrectAnswer);

    startTimeout(sessionName, SessionTimeout.RevealClueDecision, () => finishRevealClueDecision(sessionName, displayCorrectAnswer));
}

function handleBuzz(socket: Socket, sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    stopTimeout(sessionName, SessionTimeout.BuzzWindow);
    promptResponse(sessionName, PlayerResponseType.Clue, socket.id);
}

function handleUpdateResponse(socket: Socket, sessionName: string, response: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    response = response.toLowerCase();

    session.updateResponse(socket.id, response);
    emitStateUpdate(sessionName);
}

function handleSubmitResponse(socket: Socket, sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    session.submitResponse(socket.id);
    emitStateUpdate(sessionName);

    const numSubmittedResponders = session.getNumSubmittedResponders();
    const numResponders = session.currentResponderIDs.length;

    if (!session.spotlightResponderID) {
        io.to(Object.keys(session.hosts)).emit(HostServerSocket.UpdateNumSubmittedResponders, numSubmittedResponders, numResponders);
    }

    // finish the response window early if we aren't waiting for any more submissions
    if (numSubmittedResponders >= numResponders) {
        finishResponseWindow(sessionName);
    }
}

async function finishResponseWindow(sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    stopTimeout(sessionName, SessionTimeout.ResponseWindow);

    session.resetPlayerSubmissions();

    switch (session.state) {
        case SessionState.ClueResponse:
            {
                session.finishClueResponseWindow();
                emitStateUpdate(sessionName);

                // there's only one response window for an all play/wager, so we can safely announce the correct answer to begin with
                // before finding the decisions
                if (!session.getCurrentClue()?.isTossupClue()) {
                    const displayCorrectAnswer = true;
                    io.to(Object.keys(session.hosts)).emit(HostServerSocket.RevealClueDecision, displayCorrectAnswer);
                    playVoiceLine(sessionName, VoiceLineType.DisplayCorrectAnswer);

                    startTimeout(sessionName, SessionTimeout.RevealClueDecision, () => recursiveRevealClueDecision(sessionName, true));
                }
                else {
                    recursiveRevealClueDecision(sessionName);
                }
            }
            break;
        case SessionState.WagerResponse:
            {
                readClue(sessionName);
                emitStateUpdate(sessionName);
            }
            break;
    }
}

// make a series of recursive calls to get a clue decision for each responder
async function recursiveRevealClueDecision(sessionName: string, displayCorrectAnswer: boolean = false) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    stopTimeout(sessionName, SessionTimeout.RevealClueDecision);

    const responderID = session.findUndecidedResponderID();

    debugLog(DebugLogType.ClueDecision, `found undecided responder ID: ${responderID}`);

    if (!responderID) {
        debugLog(DebugLogType.ClueDecision, `done revealing clue decisions`);

        if (session.currentResponderIDs.length || !session.getCurrentClue()?.isTossupClue()) {
            finishRevealClueDecision(sessionName, displayCorrectAnswer);
        }
        else {
            // if we had no responders somehow... still make sure we display the correct answer before moving on
            finishBuzzWindow(sessionName);
        }

        return;
    }

    // turn off the client timer while we wait for a decision. it's an async process, so we can't guarantee how long it will take
    io.in(sessionName).emit(ServerSocket.StopTimeout);

    let decision = TriviaClueDecision.Incorrect;

    try {
        decision = await session.getClueDecision(responderID);
    }
    catch (e) {
        emitServerError(e, undefined, sessionName);
        return;
    }

    // if the decision was "needs more detail" this responder is technically still eligible (in fact, they're about to be prompted to respond again)
    let noEligibleRespondersRemaining = (decision !== TriviaClueDecision.NeedsMoreDetail) && !session.getNumEligibleResponders();

    // decide if we should display the correct answer when we reveal this decision
    if (session.getCurrentClue()?.isTossupClue()) {
        displayCorrectAnswer = (decision === TriviaClueDecision.Correct) || noEligibleRespondersRemaining;
    }
    else {
        displayCorrectAnswer = true;
    }

    session.displayingCorrectAnswer = displayCorrectAnswer;

    emitStateUpdate(sessionName);
    io.to(Object.keys(session.hosts)).emit(HostServerSocket.RevealClueDecision, displayCorrectAnswer);

    if (session.getCurrentClue()?.isTossupClue() && noEligibleRespondersRemaining && decision === TriviaClueDecision.Incorrect) {
        playVoiceLine(sessionName, VoiceLineType.DisplayCorrectAnswer);
    }
    else {
        playVoiceLine(sessionName, VoiceLineType.RevealClueDecision);

        if ((decision === TriviaClueDecision.Correct) && (session.getCurrentClue()?.bonus === TriviaClueBonus.Wager)) {
            playSoundEffect(sessionName, SoundEffect.Applause);
        }
    }

    debugLog(DebugLogType.ClueDecision, `got clue decision: ${decision}. display correct answer?: ${displayCorrectAnswer}`);

    startTimeout(sessionName, SessionTimeout.RevealClueDecision, () => {
        recursiveRevealClueDecision(sessionName, displayCorrectAnswer);
    });
}

function finishRevealClueDecision(sessionName: string, displayCorrectAnswer: boolean) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    stopTimeout(sessionName, SessionTimeout.RevealClueDecision);

    // if we displayed the correct answer for any reason, we need to move on to a new clue
    if (displayCorrectAnswer) {
        session.promptClueSelection();
        playVoiceLine(sessionName, VoiceLineType.PromptClueSelection);

        if (session.getCurrentRound()?.completed) {
            session.advanceRound();

            let announcement = session.isFinalRound() ? SessionAnnouncement.StartFinalRound : SessionAnnouncement.StartRound;

            if (session.state === SessionState.GameOver) {
                announcement = SessionAnnouncement.GameOver;
                playSoundEffect(sessionName, SoundEffect.LongApplause);
            }

            showAnnouncement(sessionName, announcement, () => {
                attemptForceSelectFinalClue(sessionName);
                emitStateUpdate(sessionName);
                emitTriviaRoundUpdate(sessionName);
            });

            return;
        }

        attemptForceSelectFinalClue(sessionName);
    }
    else if (session.getCurrentClue()?.isTossupClue()) {
        const spotlightResponder = session.players[session.spotlightResponderID];

        let clueDecision = TriviaClueDecision.Incorrect;
        if (spotlightResponder && spotlightResponder.clueDecisionInfo) {
            clueDecision = spotlightResponder.clueDecisionInfo.decision;
        }

        switch (clueDecision) {
            case TriviaClueDecision.Incorrect:
                {
                    // if we didn't display the correct answer, there's still at least 1 player who hasn't attempted a response yet
                    displayTossupClue(sessionName);
                }
                break;
            case TriviaClueDecision.NeedsMoreDetail:
                {
                    // re-initate the same responder, giving them an opportunity to provide more detail
                    promptResponse(sessionName, PlayerResponseType.Clue, session.spotlightResponderID);
                }
                break;
        }
    }
    else {
        throw new Error(formatDebugLog(`Failed to finish revealing clue decision. tossup?: ${session.getCurrentClue()?.isTossupClue()}, display correct answer?: ${displayCorrectAnswer}`));
    }

    emitStateUpdate(sessionName);
}

function handleVoteToReverseDecision(socket: Socket, sessionName: string, responderID: SocketID) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    session.voteToReverseDecision(socket.id, responderID);
    emitStateUpdate(sessionName);
}

const handlers: Record<PlayerSocket, Function> = {
    [PlayerSocket.Connect]: handleConnect,
    [PlayerSocket.LeaveSession]: handleLeaveSession,
    [PlayerSocket.StartGame]: handleStartGame,
    [PlayerSocket.SelectClue]: handleSelectClue,
    [PlayerSocket.Buzz]: handleBuzz,
    [PlayerSocket.UpdateResponse]: handleUpdateResponse,
    [PlayerSocket.SubmitResponse]: handleSubmitResponse,
    [PlayerSocket.VoteToReverseDecision]: handleVoteToReverseDecision
}

export default function handlePlayerEvent(socket: Socket, event: PlayerSocket, ...args: any[]) {
    try {
        // handle any events that could occur before this client has joined a session
        if (event === PlayerSocket.Connect) {
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