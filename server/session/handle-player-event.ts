
import {
    AudioType, HostServerSocket, NORMAL_GAME_SETTINGS, PARTY_GAME_SETTINGS, PlayerResponseType, PlayerSocket, PlayerSocketCallback, ServerSocket, ServerSocketMessage,
    SessionAnnouncement, SessionState, SessionTimeoutType, SocketID, TriviaClueBonus, TriviaClueDecision, TriviaGameSettingsPreset, VoiceLineType
} from "jparty-shared";
import { Socket } from "socket.io";

import { playAudio, playVoiceLine } from "./audio.js";
import { TelemetryEvent, sendTelemetryEvent } from "../misc/telemetry.js";
import {
    attemptAccelerateWindowOpen, emitServerError, emitStateUpdate, emitTriviaRoundUpdate, getSession, handleDisconnect, joinSession,
    restartTimeout, showAnnouncement, startPositionChangeAnimation, startTimeout, stopTimeout, updateLeaderboard
} from "./session-utils.js";
import { io } from "../controller.js";
import { debugLog, formatDebugLog, LogCategory, LogVerbosity } from "../misc/log.js";
import { formatText, validatePlayerName } from "../misc/text-utils.js";

// used any time we want to make sure a voice line waits for the end of a sound effect before starting
const VOICE_DELAY_MS = 1000;
const WAGER_BONUS_VOICE_DELAY_MS = 1250;
const ALL_WAGER_VOICE_DELAY_MS = 1000;

function handleConnect(socket: Socket, sessionName: string, clientID: string, playerName: string, callback: PlayerSocketCallback[PlayerSocket.Connect]) {
    sessionName = formatText(sessionName.toLowerCase());
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

    sendTelemetryEvent(TelemetryEvent.PlayerJoined, sessionName, { player_name: playerName });

    // reset both session and player name
    callback(true, true);
}

function handleLeaveSession(socket: Socket, sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    const player = session.players[socket.id];
    if (player) {
        sendTelemetryEvent(TelemetryEvent.PlayerLeft, sessionName, { player_name: player.name });
    }

    handleDisconnect(socket);
    session.deletePlayer(socket.id);
    emitStateUpdate(sessionName);
}

function handleUpdateSignature(socket: Socket, sessionName: string, imageBase64: string, canvasPath: any[]) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    session.updatePlayerSignature(socket.id, imageBase64, canvasPath);
    emitStateUpdate(sessionName);
}

async function handleStartGame(socket: Socket, sessionName: string, callback: PlayerSocketCallback[PlayerSocket.StartGame]) {
    let session = getSession(sessionName);
    if (!session || (session.state !== SessionState.Lobby)) {
        return;
    }

    if (!session.triviaGame) {
        let gameSettings = NORMAL_GAME_SETTINGS;

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
    }

    emitTriviaRoundUpdate(sessionName);

    session.gameStartTimeMs = Date.now();
    session.gameCount++;

    sendTelemetryEvent(TelemetryEvent.GameStarted, sessionName, {
        num_players: session.getConnectedPlayerIDs().length,
        session_duration_sec: session.getSessionDurationSec(),
        session_game_count: session.gameCount
    });

    session.readCategoryNames();
    emitStateUpdate(sessionName);

    const didForceSelectFinalClue = attemptForceSelectFinalClue(sessionName);
    if (!didForceSelectFinalClue) {
        recursiveReadCategoryName(sessionName);
    }
}

export function recursiveReadCategoryName(sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    const currentRound = session.getCurrentRound();
    if (!currentRound) {
        return;
    }

    // we're done reading category names
    if (session.readingCategoryIndex >= currentRound.settings.numCategories) {
        session.resetClueSelection();
        session.promptClueSelection(true);
        playVoiceLine(sessionName, VoiceLineType.PromptClueSelection);
        emitStateUpdate(sessionName);
        return;
    }

    playVoiceLine(sessionName, VoiceLineType.ReadCategoryName);
    startTimeout(sessionName, SessionTimeoutType.ReadingCategoryName, () => {
        let session = getSession(sessionName);
        if (!session) {
            return;
        }

        io.to(Object.keys(session.hosts)).emit(HostServerSocket.UpdateReadingCategoryIndex, session.readingCategoryIndex);
        session.readingCategoryIndex++;

        recursiveReadCategoryName(sessionName);
    });
}

function promptResponse(sessionName: string, responseType: PlayerResponseType, ...responderIDs: SocketID[]) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    session.promptResponse(responseType, ...responderIDs);
    startTimeout(sessionName, SessionTimeoutType.ResponseWindow, () => finishResponseWindow(sessionName));

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
    emitStateUpdate(sessionName);

    const readClueAloud = (voiceDelayMs: number = 0) => {
        playVoiceLine(sessionName, VoiceLineType.ReadClue, voiceDelayMs);

        startTimeout(sessionName, SessionTimeoutType.ReadingClue, () => {
            let session = getSession(sessionName);
            if (!session) {
                return;
            }

            session.stopTimeout(SessionTimeoutType.ReadingClue);

            if (session.getCurrentClue()?.bonus === TriviaClueBonus.None) {
                displayTossupClue(sessionName);
            }
            else {
                // this must be a special clue, like an all play or wager. in any case, we expect our current responder IDs to have been updated already
                promptResponse(sessionName, PlayerResponseType.Clue, ...session.currentResponderIDs);
            }
        });
    }

    if (session.getCurrentClue()?.bonus === TriviaClueBonus.AllWager) {
        playVoiceLine(sessionName, VoiceLineType.IntroduceAllWagerClue);

        startTimeout(sessionName, SessionTimeoutType.ReadingClue, () => {
            let session = getSession(sessionName);
            if (!session) {
                return;
            }

            session.stopTimeout(SessionTimeoutType.ReadingClue);

            playAudio(sessionName, AudioType.AllWagerCategoryRevealed);
            readClueAloud(ALL_WAGER_VOICE_DELAY_MS);
        });
    }
    else {
        readClueAloud();
    }
}

function displayTossupClue(sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    session.displayTossupClue();
    startTimeout(sessionName, SessionTimeoutType.BuzzWindow, () => finishBuzzWindow(sessionName));
    emitStateUpdate(sessionName);
}

// if there's only one clue remaining in the current round, save some time by "forcing" the current clue selector to select it automatically
export function attemptForceSelectFinalClue(sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return false;
    }

    // only force select a clue if it's the last one remaining in the current round
    const currentRound = session.getCurrentRound();
    if (!currentRound) {
        return false;
    }

    const finalCluePosition = currentRound.getFinalCluePosition();
    if (!finalCluePosition || !finalCluePosition.validate()) {
        return false;
    }

    // this is "fake" in the sense that we're invoking the handler without being prompted to do so by a genuine client socket message
    const fakeHandleSelectClue = () => {
        let session = getSession(sessionName);
        if (!session) {
            return;
        }

        // because this isn't a "real" clue selection, we may not have reset clue selection yet
        session.resetClueSelection();

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

    return true;
}

function handleSelectClue(socket: Socket, sessionName: string, categoryIndex: number, clueIndex: number) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    session.setPlayersIdle();
    emitStateUpdate(sessionName);

    session.selectClue(categoryIndex, clueIndex);
    io.in(sessionName).emit(ServerSocket.SelectClue, categoryIndex, clueIndex);

    if (session.getCurrentClue()?.bonus !== TriviaClueBonus.AllWager) {
        playAudio(sessionName, AudioType.ClueSelected);
    }

    const handleSelectClueInternal = () => {
        let session = getSession(sessionName);
        if (!session) {
            return;
        }

        stopTimeout(sessionName, SessionTimeoutType.ReadingClueSelection);

        switch (session.getCurrentClue()?.bonus) {
            case TriviaClueBonus.Wager:
                {
                    // set the spotlight responder ID in advance, just in case their socket ID happens to change during the announcement
                    session.spotlightResponderID = socket.id;
                    session.wagerBonusCount++;

                    playAudio(sessionName, AudioType.Applause);
                    playAudio(sessionName, AudioType.FoundWagerBonus);

                    showAnnouncement(sessionName, SessionAnnouncement.ClueBonusWager, () => {
                        let session = getSession(sessionName);
                        if (!session) {
                            return;
                        }

                        promptResponse(sessionName, PlayerResponseType.Wager, session.spotlightResponderID);
                    }, WAGER_BONUS_VOICE_DELAY_MS);
                }
                break;
            case TriviaClueBonus.AllWager:
                {
                    showAnnouncement(sessionName, SessionAnnouncement.ClueBonusAllWager, () => {
                        let session = getSession(sessionName);
                        if (!session) {
                            return;
                        }

                        playAudio(sessionName, AudioType.AllWagerCategoryRevealed);
                        playVoiceLine(sessionName, VoiceLineType.RevealAllWagerCategory, ALL_WAGER_VOICE_DELAY_MS);
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

    // the clue selector has the slight advantage of knowing the category and clue value before everyone else... so we read it out to make sure everyone's on the same page
    // bonus clues are an exception to this rule, but the category and clue value info will be presented somehow else in those cases
    if (clue && !clue.bonus) {
        session.readClueSelection();
        playVoiceLine(sessionName, VoiceLineType.ReadClueSelection);

        emitStateUpdate(sessionName);

        startTimeout(sessionName, SessionTimeoutType.ReadingClueSelection, handleSelectClueInternal);
    } else {
        handleSelectClueInternal();
    }
}

function finishBuzzWindow(sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    stopTimeout(sessionName, SessionTimeoutType.BuzzWindow);

    // if the tossup window is active, it means that someone buzzed in. the buzz window didn't really end, so bail out
    if (session.timeoutInfo[SessionTimeoutType.TossupWindow]) {
        // restarting a timeout back to 0 is meant to immediatly trigger its callback
        restartTimeout(sessionName, SessionTimeoutType.TossupWindow, 0);
        return;
    }

    if (!session.getCurrentClue()?.isAllPlayClue()) {
        playAudio(sessionName, AudioType.BuzzWindowTimeout);
    }

    session.finishBuzzWindow();
    emitStateUpdate(sessionName);

    // we didn't actually get a response (because nobody buzzed in). we're just hooking into the decision reveal system so we can display the correct answer
    const showCorrectAnswer = true;
    io.to(Object.keys(session.hosts)).emit(HostServerSocket.RevealClueDecision, showCorrectAnswer);
    playVoiceLine(sessionName, VoiceLineType.ShowCorrectAnswer);

    startTimeout(sessionName, SessionTimeoutType.ReadingClueDecision, () => finishRevealClueDecision(sessionName, showCorrectAnswer));
}

function handleBuzz(socket: Socket, sessionName: string) {
    let session = getSession(sessionName);
    if (!session || (session.state !== SessionState.ClueTossup)) {
        return;
    }

    // the buzzer isn't live on anyone's screen yet — ignore early buzzes from hacked or misbehaving clients
    if (Date.now() < session.buzzWindowOpenTimeMs) {
        return;
    }

    // this must be the first buzz attempt!
    if (!session.buzzPlayerIDs.length) {
        playAudio(sessionName, AudioType.Buzz);

        startTimeout(sessionName, SessionTimeoutType.TossupWindow, () => {
            stopTimeout(sessionName, SessionTimeoutType.TossupWindow);

            let session = getSession(sessionName);
            if (!session || (session.state !== SessionState.ClueTossup)) {
                return;
            }

            const responderID = session.getFinalBuzzPlayerID();
            if (responderID) {
                stopTimeout(sessionName, SessionTimeoutType.BuzzWindow);
                promptResponse(sessionName, PlayerResponseType.Clue, responderID);
            }
        });
    }

    session.buzz(socket.id);
    emitStateUpdate(sessionName);
}

function handleUpdateResponse(socket: Socket, sessionName: string, response: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    if ((session.state !== SessionState.ClueResponse) && (session.state !== SessionState.WagerResponse)) {
        return;
    }

    // the response window isn't live on anyone's screen yet
    if (Date.now() < session.responseWindowOpenTimeMs) {
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

    if ((session.state !== SessionState.ClueResponse) && (session.state !== SessionState.WagerResponse)) {
        return;
    }

    // the response window isn't live on anyone's screen yet
    if (Date.now() < session.responseWindowOpenTimeMs) {
        return;
    }

    session.submitResponse(socket.id);
    emitStateUpdate(sessionName);

    const numSubmittedResponders = session.getNumSubmittedResponders();
    const numResponders = session.currentResponderIDs.length;

    if (!session.spotlightResponderID) {
        io.to(Object.keys(session.hosts)).emit(HostServerSocket.UpdateNumSubmittedResponders, numSubmittedResponders, numResponders);
    }

    const playingThinkingMusic = (session.state === SessionState.ClueResponse) && (session.getCurrentClue()?.bonus === TriviaClueBonus.AllWager);

    // finish the response window early if we aren't waiting for any more submissions
    if ((numSubmittedResponders >= numResponders) && !playingThinkingMusic) {
        finishResponseWindow(sessionName);
    }
}

async function finishResponseWindow(sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    stopTimeout(sessionName, SessionTimeoutType.ResponseWindow);

    // it's possible the response window ended early (because all of the players finished submitting responses, for example)
    io.in(sessionName).emit(ServerSocket.StopTimeout);

    session.resetPlayerSubmissions();

    const isAllWagerClue = session.getCurrentClue()?.bonus === TriviaClueBonus.AllWager;

    switch (session.state) {
        case SessionState.ClueResponse:
            {
                if (!isAllWagerClue) {
                    playAudio(sessionName, AudioType.ClueResponseSubmitted);
                }
                session.finishClueResponseWindow();
                emitStateUpdate(sessionName);

                // there's only one response window for an all play/wager, so we can safely announce the correct answer to begin with
                // before finding any of the decisions
                if (session.getCurrentClue()?.isAllPlayClue()) {
                    // request every responder's decision at once, in parallel with the correct answer announcement
                    const decisionsPromise = Promise.all(session.currentResponderIDs.map(responderID => session!.getClueDecision(responderID)))
                        .catch((e) => { emitServerError(e, undefined, sessionName); return undefined; });

                    const showCorrectAnswer = true;
                    io.to(Object.keys(session.hosts)).emit(HostServerSocket.RevealClueDecision, showCorrectAnswer);
                    playVoiceLine(sessionName, VoiceLineType.ShowCorrectAnswer, VOICE_DELAY_MS);

                    startTimeout(sessionName, SessionTimeoutType.ReadingClueDecision, () => batchRevealClueDecision(sessionName, decisionsPromise));
                }
                else {
                    recursiveRevealClueDecision(sessionName, false, Date.now() + VOICE_DELAY_MS);
                }
            }
            break;
        case SessionState.WagerResponse:
            {
                if (!isAllWagerClue) {
                    playAudio(sessionName, AudioType.WagerResponseSubmitted);
                }
                readClue(sessionName);
                emitStateUpdate(sessionName);
            }
            break;
    }
}

async function batchRevealClueDecision(sessionName: string, decisionsPromise: Promise<TriviaClueDecision[] | undefined>) {
    stopTimeout(sessionName, SessionTimeoutType.ReadingClueDecision);

    io.in(sessionName).emit(ServerSocket.StopTimeout);

    const decisions = await decisionsPromise;
    if (!decisions) {
        return;
    }

    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    for (const responderID of session.currentResponderIDs) {
        const responder = session.players[responderID];
        const decisionInfo = responder?.clueDecisionInfo;

        if (responder && decisionInfo) {
            sendTelemetryEvent(TelemetryEvent.ClueDecision, sessionName, {
                player_name: responder.name,
                player_answer: decisionInfo.response,
                clue: decisionInfo.clue.question,
                answer: decisionInfo.clue.answer,
                clue_value: decisionInfo.clueValue * ((decisionInfo.decision === TriviaClueDecision.Correct) ? 1 : -1)
            });
        }
    }

    session.displayingCorrectAnswer = true;

    // this emits a state update, revealing every decision and score change at once
    startPositionChangeAnimation(sessionName);

    startTimeout(sessionName, SessionTimeoutType.ReadingClueDecision, () => finishRevealClueDecision(sessionName, true));
}

// make a series of recursive calls to get a clue decision for each responder
async function recursiveRevealClueDecision(sessionName: string, showCorrectAnswer: boolean = false, minRevealTimeMs: number = 0) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    stopTimeout(sessionName, SessionTimeoutType.ReadingClueDecision);

    // turn off the client timer while we wait for a decision. it's an async process, so we can't guarantee how long it will take
    io.in(sessionName).emit(ServerSocket.StopTimeout);

    const responderID = session.findUndecidedResponderID();

    debugLog(LogCategory.ClueDecision, `found undecided responder ID: ${responderID}`, LogVerbosity.Verbose);

    if (!responderID) {
        debugLog(LogCategory.ClueDecision, `done revealing clue decisions`, LogVerbosity.Verbose);

        if (session.currentResponderIDs.length || session.getCurrentClue()?.isAllPlayClue()) {
            finishRevealClueDecision(sessionName, showCorrectAnswer);
        }
        else {
            // if we had no responders somehow... still make sure we display the correct answer before moving on
            finishBuzzWindow(sessionName);
        }

        return;
    }

    let decision = TriviaClueDecision.Incorrect;

    try {
        decision = await session.getClueDecision(responderID, minRevealTimeMs);
    }
    catch (e) {
        emitServerError(e, undefined, sessionName);
        return;
    }

    const responder = session.players[responderID];
    const decisionInfo = responder?.clueDecisionInfo;

    // "needs more detail" isn't a final decision. this responder is about to respond again and will get a real decision then
    if (responder && decisionInfo && (decision !== TriviaClueDecision.NeedsMoreDetail)) {
        sendTelemetryEvent(TelemetryEvent.ClueDecision, sessionName, {
            player_name: responder.name,
            player_answer: decisionInfo.response,
            clue: decisionInfo.clue.question,
            answer: decisionInfo.clue.answer,
            clue_value: decisionInfo.clueValue * ((decision === TriviaClueDecision.Correct) ? 1 : -1)
        });
    }

    // if the decision was "needs more detail" this responder is technically still eligible (in fact, they're about to be prompted to respond again)
    let noEligibleRespondersRemaining = (decision !== TriviaClueDecision.NeedsMoreDetail) && !session.getNumEligibleResponders();

    // decide if we should display the correct answer when we reveal this decision
    if (session.getCurrentClue()?.isAllPlayClue()) {
        showCorrectAnswer = true;
    }
    else {
        showCorrectAnswer = (decision === TriviaClueDecision.Correct) || noEligibleRespondersRemaining;
    }

    session.displayingCorrectAnswer = showCorrectAnswer;

    if (decision === TriviaClueDecision.Correct) {
        playAudio(sessionName, AudioType.CorrectDecision);
    }
    else if (decision === TriviaClueDecision.Incorrect) {
        //playAudio(sessionName, AudioType.IncorrectDecision);
    }

    startPositionChangeAnimation(sessionName);

    io.to(Object.keys(session.hosts)).emit(HostServerSocket.RevealClueDecision, showCorrectAnswer);

    if (!session.getCurrentClue()?.isAllPlayClue() && noEligibleRespondersRemaining && decision === TriviaClueDecision.Incorrect) {
        playVoiceLine(sessionName, VoiceLineType.ShowCorrectAnswer);
    }
    else {
        playVoiceLine(sessionName, VoiceLineType.RevealClueDecision);

        if ((decision === TriviaClueDecision.Correct) && (session.getCurrentClue()?.bonus === TriviaClueBonus.Wager)) {
            playAudio(sessionName, AudioType.Applause);
        }
    }

    debugLog(LogCategory.ClueDecision, `got clue decision: ${decision}. display correct answer?: ${showCorrectAnswer}`, LogVerbosity.Verbose);

    startTimeout(sessionName, SessionTimeoutType.ReadingClueDecision, () => {
        recursiveRevealClueDecision(sessionName, showCorrectAnswer);
    });
}

function finishRevealClueDecision(sessionName: string, showCorrectAnswer: boolean) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    stopTimeout(sessionName, SessionTimeoutType.ReadingClueDecision);

    // if we displayed the correct answer for any reason, we need to move on to a new clue
    if (showCorrectAnswer) {
        if (session.getCurrentRound()?.completed) {
            finishRound(sessionName);
            return;
        }
        else {
            session.resetClueSelection();
            emitStateUpdate(sessionName);

            const didForceSelectFinalClue = attemptForceSelectFinalClue(sessionName);
            if (!didForceSelectFinalClue) {
                session.promptClueSelection();
                playVoiceLine(sessionName, VoiceLineType.PromptClueSelection);
            }
        }
    }
    else if (!session.getCurrentClue()?.isAllPlayClue()) {
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
        throw new Error(formatDebugLog(`failed to finish revealing clue decision. all play?: ${session.getCurrentClue()?.isAllPlayClue()}, display correct answer?: ${showCorrectAnswer}`));
    }

    emitStateUpdate(sessionName);
}

async function finishRound(sessionName: string) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    session.advanceRound();
    io.to(Object.keys(session.hosts)).emit(HostServerSocket.UpdateReadingCategoryIndex, -1);
    emitStateUpdate(sessionName);

    let announcement = session.isFinalRound() ? SessionAnnouncement.StartFinalRound : SessionAnnouncement.StartRound;

    if (session.state === SessionState.GameOver) {
        announcement = SessionAnnouncement.GameOver;
        playAudio(sessionName, AudioType.LongApplause);

        sendTelemetryEvent(TelemetryEvent.GameFinished, sessionName, {
            num_players: session.getConnectedPlayerIDs().length,
            game_duration_sec: session.getGameDurationSec(),
            session_duration_sec: session.getSessionDurationSec()
        });

        await updateLeaderboard(sessionName);
    }
    else if (session.isFinalRound()) {
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

        if (session.state === SessionState.GameOver) {
            return;
        }

        const didForceSelectFinalClue = attemptForceSelectFinalClue(sessionName);
        if (didForceSelectFinalClue) {
            return;
        }

        session.readCategoryNames();
        emitStateUpdate(sessionName);
        recursiveReadCategoryName(sessionName);
    });
}

function handleVoteToReverseDecision(socket: Socket, sessionName: string, responderID: SocketID) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    const didReverseDecision = session.voteToReverseDecision(socket.id, responderID);
    if (didReverseDecision) {
        startPositionChangeAnimation(sessionName);
    }

    emitStateUpdate(sessionName);
}

function handleResponseWindowArrived(socket: Socket, sessionName: string, timeoutType: SessionTimeoutType, windowID: number, slackMs: number) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    const player = session.players[socket.id];
    if (!player || !Number.isFinite(slackMs)) {
        return;
    }

    if (!session.receiveWindowAck(socket.id, windowID)) {
        return;
    }

    attemptAccelerateWindowOpen(sessionName);

    slackMs = Math.round(Math.min(Math.max(slackMs, -60000), 60000));

    debugLog(LogCategory.Timeout, `(${player.name}) received ${SessionTimeoutType[timeoutType]} with ${slackMs}ms of slack time remaining`, LogVerbosity.VeryVerbose);
}

const handlers: Record<PlayerSocket, Function> = {
    [PlayerSocket.Connect]: handleConnect,
    [PlayerSocket.LeaveSession]: handleLeaveSession,
    [PlayerSocket.UpdateSignature]: handleUpdateSignature,
    [PlayerSocket.StartGame]: handleStartGame,
    [PlayerSocket.SelectClue]: handleSelectClue,
    [PlayerSocket.Buzz]: handleBuzz,
    [PlayerSocket.UpdateResponse]: handleUpdateResponse,
    [PlayerSocket.SubmitResponse]: handleSubmitResponse,
    [PlayerSocket.VoteToReverseDecision]: handleVoteToReverseDecision,
    [PlayerSocket.ResponseWindowArrived]: handleResponseWindowArrived
}

export default function handlePlayerEvent(socket: Socket, event: PlayerSocket, ...args: any[]) {
    try {
        // handle any events that could occur before this player has joined a session
        // (these handlers won't take sessionName as their second param like all the other ones do)
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