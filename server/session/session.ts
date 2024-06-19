
import {
    AttemptReconnectResult, getEnumSize, getRandomChoice, getSortedSessionPlayerIDs, getVoiceDurationMs, getWeightedRandomKey, Host, Player, PlayerResponseType, PlayerState,
    SessionAnnouncement, SessionHosts, SessionPlayers, SessionState, SessionTimeout, SocketID,
    TriviaClue, TriviaClueBonus, TriviaClueDecision, TriviaClueDecisionInfo,
    TriviaGame, TriviaGameSettings, TriviaGameSettingsPreset, VoiceType
} from "jparty-shared";

import { getClueDecision } from "../api-requests/clue-decision.js";
import { generateTriviaGame } from "../api-requests/generate-trivia-game.js";
import { formatClueResponse } from "../misc/text-utils.js";

import { debugLog, DebugLogType } from "../misc/log.js";

// store timeouts in their own container so we can cancel a timeout early and still trigger its callback
export class TimeoutInfo {
    timeout: NodeJS.Timeout;
    callback: Function;
    durationMs: number;
    endTimeMs: number;

    constructor(callback: Function, durationMs: number) {
        this.timeout = setTimeout(() => callback(), durationMs);
        this.callback = callback;
        this.durationMs = durationMs;
        this.endTimeMs = Date.now() + durationMs;
    }

    getRemainingDurationMs() {
        return Math.max(this.endTimeMs - Date.now(), 0);
    }
}

type SessionTimeoutInfo = Record<number, TimeoutInfo>;

export class Session {
    // keep this in memory so we can clear out sessions that have been idle for too long
    lastUpdatedTimeMs: number;

    // this game can be spectated by any number of hosts simultaneously, but only the creator of the session has certain privileges
    creatorSocketID: SocketID;
    hosts: SessionHosts;

    name: string;
    state: SessionState;
    triviaGameSettingsPreset: TriviaGameSettingsPreset;
    triviaGame: TriviaGame | undefined;
    players: SessionPlayers;
    timeoutInfo: SessionTimeoutInfo;

    // store transient data that needs to be restored for clients in the event that they disconnect and reconnect
    readingCategoryIndex: number;
    currentAnnouncement: SessionAnnouncement | undefined;
    buzzPlayerIDs: SocketID[];
    displayingCorrectAnswer: boolean;
    voiceType: VoiceType;
    currentVoiceLine: string;

    // clue selection info
    gameStarterID: SocketID;
    previousClueSelectorClientID: SocketID;
    clueSelectorID: SocketID;
    roundIndex: number;
    categoryIndex: number;
    clueIndex: number;

    // response info
    currentResponderIDs: SocketID[];
    previousResponderIDs: SocketID[];
    spotlightResponderID: SocketID;
    awaitingDecisionResponderID: SocketID;

    constructor(name: string, creatorSocketID: SocketID, creatorClientID: SocketID) {
        this.creatorSocketID = creatorSocketID;
        this.connectHost(creatorSocketID, creatorClientID);
        this.name = name;
        this.resetGame();
        this.voiceType = VoiceType.ModernMasculine;
    }

    resetGame() {
        this.lastUpdatedTimeMs = Date.now();
        this.state = SessionState.Lobby;
        this.triviaGameSettingsPreset = TriviaGameSettingsPreset.Normal;
        this.triviaGame = undefined;
        this.resetPlayers();
        this.timeoutInfo = {};
        this.readingCategoryIndex = 0;
        this.currentAnnouncement = undefined;
        this.buzzPlayerIDs = [];
        this.displayingCorrectAnswer = false;
        this.currentVoiceLine = "";

        this.gameStarterID = "";
        this.previousClueSelectorClientID = "";
        this.clueSelectorID = "";
        this.roundIndex = 0;
        this.categoryIndex = 0;
        this.clueIndex = 0;

        this.currentResponderIDs = [];
        this.previousResponderIDs = [];
        this.spotlightResponderID = "";
        this.awaitingDecisionResponderID = "";

        this.promptGameStarter();
    }

    resetPlayers() {
        if (!this.players) {
            this.players = {};
            return;
        }

        for (const playerID in this.players) {
            this.players[playerID].reset();
        }
    }

    // =================
    // host logistics
    // =================
    connectHost(hostID: SocketID, clientID: string) {
        if (!this.hosts) {
            this.hosts = {};
        }

        this.hosts[hostID] = new Host(clientID);
    }

    disconnectHost(hostID: SocketID) {
        let host = this.hosts[hostID];
        if (host) {
            host.connected = false;
        }
    }

    attemptReconnectHost(newHostID: SocketID, clientID: string) {
        let oldHostID = "";
        for (const hostID in this.hosts) {
            if (this.hosts[hostID].clientID === clientID) {
                oldHostID = hostID;
                break;
            }
        }

        if (oldHostID === newHostID) {
            return AttemptReconnectResult.AlreadyConnected;
        }

        const disconnectedHost = this.hosts[oldHostID];
        if (!disconnectedHost) {
            return AttemptReconnectResult.InvalidClientID;
        }

        if (disconnectedHost.connected) {
            return AttemptReconnectResult.AlreadyConnected;
        }

        if (oldHostID === newHostID) {
            this.players[newHostID].connected = true;
            return AttemptReconnectResult.AlreadyConnected;
        }

        this.hosts[newHostID] = disconnectedHost;
        delete this.hosts[oldHostID];
        this.hosts[newHostID].connected = true;
        this.updateHostSocketID(oldHostID, newHostID);

        return AttemptReconnectResult.HostSuccess;
    }

    updateHostSocketID(oldHostID: SocketID, newHostID: SocketID) {
        this.creatorSocketID = (this.creatorSocketID === oldHostID) ? newHostID : this.creatorSocketID;
    }

    // =================
    // player logistics
    // =================
    promptGameStarter() {
        if (this.gameStarterID || (this.state !== SessionState.Lobby)) {
            return;
        }

        const connectedPlayerIDs = this.getConnectedPlayerIDs();
        if (connectedPlayerIDs.length) {
            this.gameStarterID = getRandomChoice(connectedPlayerIDs);
        }

        const gameStarter = this.players[this.gameStarterID];
        if (!gameStarter) {
            return;
        }

        gameStarter.state = PlayerState.PromptStartGame;
    }

    connectPlayer(playerID: SocketID, clientID: string, playerName: string) {
        this.players[playerID] = new Player(clientID, playerName);

        // this player missed the start of the buzz window but should still be allowed to buzz in if they are eligible to do so
        if ((this.state === SessionState.ClueTossup) && !this.previousResponderIDs.includes(playerID)) {
            this.players[playerID].state = PlayerState.PromptBuzz;
        }

        this.promptGameStarter();
    }

    updatePlayerSignature(playerID: SocketID, imageBase64: string, canvasPath: any[]) {
        let player = this.players[playerID];
        if (!player) {
            return;
        }

        player.signatureImageBase64 = imageBase64;
        player.signatureCanvasPath = canvasPath;
    }

    disconnectPlayer(playerID: SocketID) {
        let player = this.players[playerID];
        if (player) {
            player.connected = false;
        }

        // the session is waiting for a clue selection from this player so we need to pass that responsibility off to another player
        if (!this.currentAnnouncement && (this.state === SessionState.PromptClueSelection) && (playerID === this.clueSelectorID)) {
            this.clueSelectorID = "";
            this.resetClueSelection();
            this.promptClueSelection();
        }

        if (playerID === this.gameStarterID) {
            this.gameStarterID = "";
            this.promptGameStarter();
        }
    }

    attemptReconnectPlayer(newPlayerID: SocketID, clientID: string) {
        let oldPlayerID = "";
        for (const playerID in this.players) {
            if (this.players[playerID].clientID === clientID) {
                oldPlayerID = playerID;
                break;
            }
        }

        const disconnectedPlayer = this.players[oldPlayerID];
        if (!disconnectedPlayer) {
            return AttemptReconnectResult.InvalidClientID;
        }

        if (disconnectedPlayer.connected) {
            return AttemptReconnectResult.AlreadyConnected;
        }

        if (oldPlayerID === newPlayerID) {
            this.players[newPlayerID].connected = true;
            return AttemptReconnectResult.AlreadyConnected;
        }

        this.players[newPlayerID] = disconnectedPlayer;
        delete this.players[oldPlayerID];
        this.players[newPlayerID].connected = true;
        this.updatePlayerSocketID(oldPlayerID, newPlayerID);

        return AttemptReconnectResult.PlayerSuccess;
    }

    updatePlayerSocketID(oldPlayerID: SocketID, newPlayerID: SocketID) {
        this.buzzPlayerIDs = this.buzzPlayerIDs.map(playerID => (playerID === oldPlayerID) ? newPlayerID : playerID);

        this.gameStarterID = (this.gameStarterID === oldPlayerID) ? newPlayerID : this.gameStarterID;
        this.clueSelectorID = (this.clueSelectorID === oldPlayerID) ? newPlayerID : this.clueSelectorID;
        this.spotlightResponderID = (this.spotlightResponderID === oldPlayerID) ? newPlayerID : this.spotlightResponderID;
        this.awaitingDecisionResponderID = (this.awaitingDecisionResponderID === oldPlayerID) ? newPlayerID : this.awaitingDecisionResponderID;

        this.currentResponderIDs = this.currentResponderIDs.map(playerID => (playerID === oldPlayerID) ? newPlayerID : playerID);
        this.previousResponderIDs = this.previousResponderIDs.map(playerID => (playerID === oldPlayerID) ? newPlayerID : playerID);
    }

    deletePlayer(playerID: SocketID) {
        let player = this.players[playerID];
        if (!player) {
            return;
        }

        // only delete a player if the session is in a stable state, as a precaution to avoid mutating data that's actively in-use
        if ((this.state === SessionState.Lobby) || (this.state === SessionState.PromptClueSelection) || (this.state === SessionState.GameOver)) {
            delete this.players[playerID];
            return;
        }

        // alternatively, queue them for deletion so their player object can be safely deleted once the game is back in a stable state
        player.queuedForDeletion = true;
    }

    getConnectedPlayerIDs() {
        return Object.keys(this.players).filter(playerID => this.players[playerID].connected);
    }

    getSolventPlayerIDs(): SocketID[] {
        let solventPlayerIDs = [];

        for (const playerID in this.players) {
            const player = this.players[playerID];

            if (player.score > 0) {
                solventPlayerIDs.push(playerID);
            }
        }

        return solventPlayerIDs;
    }

    setPlayersIdle() {
        for (const playerID in this.players) {
            this.players[playerID].setIdle();
        }
    }

    resetPlayerSubmissions() {
        for (const playerID in this.players) {
            this.players[playerID].resetSubmission();
        }
    }

    clearPlayerResponses() {
        for (const playerID in this.players) {
            this.players[playerID].clearResponses();
        }
    }

    getPlayerPosition(playerID: SocketID) {
        const sortedPlayerIDs = getSortedSessionPlayerIDs(this.players);
        return sortedPlayerIDs.indexOf(playerID);
    }

    updatePlayerScore(playerID: SocketID, value: number, decision?: TriviaClueDecision, modifier: number = 1) {
        let player = this.players[playerID];
        if (!player) {
            return;
        }

        const prevSortedPlayerIDs = getSortedSessionPlayerIDs(this.players);

        const decisionModifier = (decision === TriviaClueDecision.Incorrect) ? -1 : 1;
        player.score += (value * modifier * decisionModifier);

        this.updatePlayerPositionChanges(prevSortedPlayerIDs);

        // if this player happens to be wagering right now, their current wager limits and wager response should be udpated with their updated score
        this.updateWagerLimits(playerID);
        this.updateResponse(playerID, player.responses[PlayerResponseType.Wager] + "");
    }

    updatePlayerPositionChanges(prevSortedPlayerIDs: string[]) {
        const newSortedPlayerIDs = getSortedSessionPlayerIDs(this.players);

        for (const playerID of newSortedPlayerIDs) {
            let player = this.players[playerID];
            if (!player) {
                continue;
            }

            const prevPosition = prevSortedPlayerIDs.indexOf(playerID);
            const newPosition = newSortedPlayerIDs.indexOf(playerID);

            if (prevPosition >= 0) {
                player.positionChange = prevPosition - newPosition;
            }
            else {
                player.positionChange = 0;
            }
        }
    }

    updateWagerLimits(responderID: SocketID) {
        let responder = this.players[responderID];
        if (!responder) {
            return;
        }

        const minWager = 0;
        let maxWager = 0;

        switch (this.getCurrentClue()?.bonus) {
            case TriviaClueBonus.Wager:
                {
                    const maxClueValue = this.getCurrentRound()?.getMaxClueValue() || 0;
                    maxWager = Math.max(responder.score, maxClueValue);
                }
                break;
            case TriviaClueBonus.AllWager:
                {
                    maxWager = Math.max(0, responder.score);
                }
                break;
        }

        responder.minWager = minWager;
        responder.maxWager = maxWager;
    }

    // ==================
    // timeout/announcement logistics
    // ==================

    // we should never need to fall back on this but just in case...
    static DEFAULT_TIMEOUT_DURATION_MS = 3000;

    static TOSSUP_WINDOW_DURATION_MS = 750;

    getTimeoutDurationMs(timeout: SessionTimeout) {
        let durationMs = 0;

        if (!this.triviaGame) {
            return durationMs;
        }

        switch (timeout) {
            case SessionTimeout.ReadingCategoryName:
            case SessionTimeout.Announcement:
                {
                    durationMs = getVoiceDurationMs(this.currentVoiceLine);
                }
                break;
            case SessionTimeout.ReadingClue:
                {
                    const currentQuestion = this.getCurrentClue()?.question;
                    if (currentQuestion) {
                        durationMs = getVoiceDurationMs(currentQuestion);
                    }
                }
                break;
            case SessionTimeout.BuzzWindow:
                {
                    durationMs = this.triviaGame.settings.buzzWindowDurationSec * 1000;
                }
                break;
            case SessionTimeout.TossupWindow:
                {
                    durationMs = Session.TOSSUP_WINDOW_DURATION_MS;

                    // an easier clue is more likely to be a tossup. to make the effect of the tossup delay less noticable, we use the full delay duration
                    // for easier clues, while using shorter and shorter delays as the clues become more difficult
                    const currentClue = this.getCurrentClue();
                    if (currentClue) {
                        durationMs /= currentClue.difficulty;
                    }
                }
                break;
            case SessionTimeout.ResponseWindow:
                {
                    durationMs = this.triviaGame.settings.responseDurationSec * 1000;

                    // double the response duration for "all wager" clues. this applies to both the wager and clue response periods
                    if (this.getCurrentClue()?.bonus === TriviaClueBonus.AllWager) {
                        durationMs *= 2;
                    }
                }
                break;
            case SessionTimeout.ReadingClueDecision:
                {
                    durationMs = this.triviaGame.settings.revealDecisionDurationSec * 1000;
                }
                break;
        }

        if (!durationMs) {
            durationMs = Session.DEFAULT_TIMEOUT_DURATION_MS;
        }

        return durationMs;
    }

    startTimeout(timeout: SessionTimeout, callback: Function) {
        this.stopTimeout(timeout);
        this.timeoutInfo[timeout] = new TimeoutInfo(callback, this.getTimeoutDurationMs(timeout));
    }

    stopTimeout(timeout: SessionTimeout) {
        let timeoutInfo = this.timeoutInfo[timeout];
        if (timeoutInfo) {
            clearTimeout(timeoutInfo.timeout);
            delete this.timeoutInfo[timeout];
        }
    }

    stopAllTimeouts() {
        for (let timeout = 0; timeout < getEnumSize(SessionTimeout); timeout++) {
            this.stopTimeout(timeout);
        }
    }

    restartTimeout(timeout: SessionTimeout, newDurationMs: number) {
        let timeoutInfo = this.timeoutInfo[timeout];
        if (timeoutInfo) {
            this.stopTimeout(timeout);
            this.timeoutInfo[timeout] = new TimeoutInfo(timeoutInfo.callback, newDurationMs);
        }
    }

    setCurrentAnnouncement(announcement: SessionAnnouncement | undefined) {
        this.currentAnnouncement = announcement;
    }

    setCurrentVoiceLine(voiceLine: string) {
        this.currentVoiceLine = voiceLine;
    }

    // ======================
    // trivia game logistics
    // ======================
    async generateTriviaGame(gameSettings: TriviaGameSettings) {
        try {
            this.triviaGame = await generateTriviaGame(TriviaGameSettings.clone(gameSettings));
        }
        catch (e) {
            throw e;
        }
    }

    getCurrentRound() {
        if (this.triviaGame) {
            return this.triviaGame.rounds[this.roundIndex];
        }
    }

    getReadingCategory() {
        const currentRound = this.getCurrentRound();
        if (currentRound && this.readingCategoryIndex >= 0 && this.readingCategoryIndex < currentRound.settings.numCategories) {
            return currentRound.categories[this.readingCategoryIndex];
        }
    }

    getCurrentCategory() {
        const currentRound = this.getCurrentRound();
        if (currentRound) {
            return currentRound.categories[this.categoryIndex];
        }
    }

    getCurrentClue() {
        const currentCategory = this.getCurrentCategory();
        if (currentCategory) {
            return currentCategory.clues[this.clueIndex];
        }
    }

    // the value of a clue depends on the responder, and possibly on the decision to their response
    getClueValue(clue: TriviaClue | undefined, responderID: SocketID, decision: TriviaClueDecision) {
        if (!clue) {
            return 0;
        }

        let responder = this.players[responderID];
        if (!responder) {
            return clue.value;
        }

        switch (clue.bonus) {
            case TriviaClueBonus.Wager:
            case TriviaClueBonus.AllWager:
                {
                    return responder.responses[TriviaClueBonus.Wager];
                }
            case TriviaClueBonus.AllPlay:
                {
                    // "all plays" are intended to be casual, don't penalize incorrect answers
                    if (decision === TriviaClueDecision.Incorrect) {
                        return 0;
                    }
                    else {
                        return clue.value;
                    }
                }
            default:
                {
                    return clue.value;
                }
        }
    }

    isFinalRound() {
        if (!this.triviaGame) {
            return false;
        }

        return this.roundIndex === (this.triviaGame.rounds.length - 1);
    }

    advanceRound() {
        if (!this.triviaGame) {
            return;
        }

        this.setPlayersIdle();

        if (this.isFinalRound()) {
            this.endGame();
        }
        else {
            this.roundIndex++;
        }
    }

    forcePromptClueSelection() {
        this.stopAllTimeouts();
        this.resetClueSelection();
        this.promptClueSelection();
    }

    getCurrentLeader() {
        const sortedPlayerIDs = getSortedSessionPlayerIDs(this.players);
        if (sortedPlayerIDs.length > 0) {
            return this.players[sortedPlayerIDs[0]];
        }
    }

    endGame() {
        this.state = SessionState.GameOver;
        this.setPlayersIdle();
        this.stopAllTimeouts();
    }

    playAgain() {
        this.state = SessionState.Lobby;
    }

    readCategoryNames() {
        this.state = SessionState.ReadingCategoryNames;
        this.setPlayersIdle();
    }

    hasNewClueSelector() {
        const clueSelector = this.players[this.clueSelectorID];
        if (!clueSelector) {
            return false;
        }

        return this.previousClueSelectorClientID !== clueSelector.clientID;
    }

    // clue selection is a stable state, so we want to make sure any unexpected behavior during the game resolves back here
    // and that all relevant session data is reset back to a clean slate for the next clue
    resetClueSelection() {
        this.setPlayersIdle();
        this.clearPlayerResponses();
        this.spotlightResponderID = "";
        this.readingCategoryIndex = 0;
        this.displayingCorrectAnswer = false;

        for (const playerID in this.players) {
            if (this.players[playerID].queuedForDeletion) {
                this.deletePlayer(playerID);
            }
        }

        this.currentResponderIDs = [];
        this.previousResponderIDs = [];
    }

    promptClueSelection() {
        this.state = SessionState.PromptClueSelection;

        const connectedPlayerIDs = this.getConnectedPlayerIDs();
        const previousCorrectResponderIDs = connectedPlayerIDs.filter((playerID: SocketID) => {
            const player = this.players[playerID];
            if (!player || !player.connected || !player.clueDecisionInfo) {
                return false;
            }

            if (player.clueDecisionInfo.clue.id === this.getCurrentClue()?.id) {
                return player.clueDecisionInfo.decision === TriviaClueDecision.Correct;
            }

            return false;
        });

        this.previousClueSelectorClientID = this.players[this.clueSelectorID] ? `${this.players[this.clueSelectorID].clientID}` : "";

        // first: give clue selector privileges to a connected player who responded correctly to the previous clue
        // in most cases, there will be exactly one previous correct responder but if there are multiple, choose one of them randomly
        if (previousCorrectResponderIDs.length > 0) {
            this.clueSelectorID = getRandomChoice(previousCorrectResponderIDs);
        }

        // second: default to our previous clue selector, but make sure they're still connected to this session
        if (!this.clueSelectorID || !this.players[this.clueSelectorID] || !this.players[this.clueSelectorID].connected) {
            if (connectedPlayerIDs.length > 0) {
                this.clueSelectorID = getRandomChoice(connectedPlayerIDs);
            }
        }

        if (this.clueSelectorID && this.players[this.clueSelectorID]) {
            this.players[this.clueSelectorID].state = PlayerState.PromptClueSelection;
        }
    }

    selectClue(categoryIndex: number, clueIndex: number) {
        this.categoryIndex = categoryIndex;
        this.clueIndex = clueIndex;

        let currentRound = this.getCurrentRound();
        if (!currentRound) {
            return;
        }

        currentRound.setClueCompleted(categoryIndex, clueIndex);
    }

    readClueSelection() {
        this.state = SessionState.ReadingClueSelection;
        this.spotlightResponderID = "";
        this.setPlayersIdle();
    }

    readClue() {
        this.state = SessionState.ReadingClue;
    }

    displayTossupClue() {
        this.state = SessionState.ClueTossup;
        this.buzzPlayerIDs = [];
        this.spotlightResponderID = "";

        for (const playerID in this.players) {
            // players may only respond to each clue once
            if (this.previousResponderIDs.includes(playerID)) {
                this.players[playerID].state = PlayerState.Idle;
                continue;
            }

            this.players[playerID].state = PlayerState.PromptBuzz;
        }
    }

    buzz(playerID: SocketID) {
        const player = this.players[playerID];
        if (!player) {
            return;
        }

        if (!this.buzzPlayerIDs.includes(playerID)) {
            debugLog(DebugLogType.Buzz, `${player.name} buzzed in!`);
            this.buzzPlayerIDs.push(playerID);
        }

        player.setIdle();
    }

    getFinalBuzzPlayerID() {
        if (!this.buzzPlayerIDs.length) {
            return;
        }

        let buzzPlayerTossupWeights: any = {};
        for (const buzzPlayerID of this.buzzPlayerIDs) {
            const buzzPlayer = this.players[buzzPlayerID];
            if (!buzzPlayer || !buzzPlayer.connected) {
                continue;
            }

            buzzPlayerTossupWeights[buzzPlayerID] = buzzPlayer.tossupWeight;
        }

        const finalBuzzPlayerID = getWeightedRandomKey(buzzPlayerTossupWeights);
        const finalBuzzPlayer = this.players[finalBuzzPlayerID];

        debugLog(DebugLogType.Buzz, `${finalBuzzPlayer.name} was chosen to respond!`);

        // this wasn't a tossup if only one player attempted to buzz in
        if (this.buzzPlayerIDs.length > 1) {
            for (const buzzPlayerID of this.buzzPlayerIDs) {
                const buzzPlayer = this.players[buzzPlayerID];
                if (!buzzPlayer) {
                    continue;
                }

                // the chosen player will be half as likely to win the next tossup they're part of
                // all of the non-chosen players are twice as likely to win the next tossup they're each a part of

                const weightModifier = (buzzPlayerID === finalBuzzPlayerID) ? 0.5 : 2;
                buzzPlayer.tossupWeight *= weightModifier;

                debugLog(DebugLogType.Buzz, `${buzzPlayer.name} now has a tossup weight of: ${buzzPlayer.tossupWeight}`);
            }
        }

        return finalBuzzPlayerID;
    }

    // ==========================
    // player response logistics
    // ==========================
    finishBuzzWindow() {
        this.state = SessionState.ReadingClueDecision;
        this.setPlayersIdle();
        this.spotlightResponderID = "";
    }

    finishClueResponseWindow() {
        this.state = SessionState.WaitingForClueDecision;
        this.setPlayersIdle();

        if (this.getCurrentClue()?.isAllPlayClue()) {
            this.spotlightResponderID = "";
        }
    }

    // player response is a generic system. it can prompt any number of players for any of the different response types (i.e. clue, wager)
    // note that we pass in all responders who need to be prompted in one function call instead of individually for each responder
    promptResponse(responseType: PlayerResponseType, ...responderIDs: SocketID[]) {
        switch (responseType) {
            case PlayerResponseType.Clue:
                {
                    this.state = SessionState.ClueResponse;
                }
                break;
            case PlayerResponseType.Wager:
                {
                    this.state = SessionState.WagerResponse;
                }
                break;
        }

        this.setPlayersIdle();
        this.currentResponderIDs = [];

        for (let responderID of responderIDs) {
            let responder = this.players[responderID];
            if (!responder) {
                continue;
            }

            switch (responseType) {
                case PlayerResponseType.Clue:
                    {
                        responder.state = PlayerState.PromptClueResponse;
                    }
                    break;
                case PlayerResponseType.Wager:
                    {
                        responder.state = PlayerState.PromptWager;
                        this.updateWagerLimits(responderID);
                    }
                    break;
            }

            if (!this.currentResponderIDs.includes(responderID)) {
                this.currentResponderIDs.push(responderID);
            }

            if (!this.previousResponderIDs.includes(responderID)) {
                this.previousResponderIDs.push(responderID);
            }
        }

        if (!this.getCurrentClue()?.isAllPlayClue() && (responderIDs.length === 1)) {
            this.spotlightResponderID = responderIDs[0];
        }
        else {
            this.spotlightResponderID = "";
        }
    }

    updateResponse(responderID: SocketID, response: string) {
        let responder = this.players[responderID];
        if (!responder) {
            return;
        }

        switch (responder.state) {
            case PlayerState.PromptClueResponse:
                {
                    responder.responses[PlayerResponseType.Clue] = formatClueResponse(response);
                }
                break;
            case PlayerState.PromptWager:
                {
                    let wager = parseInt(response);

                    if (isNaN(wager)) {
                        wager = 0;
                    }

                    // clamp the responder's wager between their wager limits
                    wager = Math.min(Math.max(wager, responder.minWager), responder.maxWager);
                    responder.responses[PlayerResponseType.Wager] = wager;
                }
                break;
        }
    }

    submitResponse(responderID: SocketID) {
        let responder = this.players[responderID];
        if (!responder) {
            return;
        }

        responder.state = PlayerState.Idle;
        responder.submitted = true;
    }

    getNumEligibleResponders() {
        let numEligibleResponders = 0;

        const possibleResponderIDs = this.getCurrentClue()?.isPersonalClue() ? [this.spotlightResponderID] : Object.keys(this.players);

        for (const possibleResponderID of possibleResponderIDs) {
            if (!this.previousResponderIDs.includes(possibleResponderID)) {
                numEligibleResponders++;
            }
        }

        return numEligibleResponders;
    }

    getNumSubmittedResponders() {
        let submittedResponders = 0;

        for (const responderID of this.currentResponderIDs) {
            const responder = this.players[responderID];
            if (!responder) {
                continue;
            }

            if (responder.submitted) {
                submittedResponders++;
            }
        }

        return submittedResponders;
    }

    // ==========================
    // clue decision logistics
    // ==========================

    // return the next player ID who responded to the current clue and still needs a decision for their response (if there are any such players left)
    findUndecidedResponderID() {
        for (const responderID of this.currentResponderIDs) {
            const responder = this.players[responderID];
            if (!responder || responder.decided) {
                continue;
            }

            return responderID;
        }

        return;
    }

    async getClueDecision(responderID: SocketID) {
        this.awaitingDecisionResponderID = responderID;
        let responder = this.players[this.awaitingDecisionResponderID];
        let decision = TriviaClueDecision.Incorrect;

        if (!responder) {
            return decision;
        }

        const currentCategory = this.getCurrentCategory();
        const currentClue = this.getCurrentClue();
        if (!currentCategory || !currentClue) {
            return decision;
        }

        const clueResponse = responder.responses[PlayerResponseType.Clue];

        try {
            decision = await getClueDecision(currentClue, clueResponse);
        }
        catch (e) {
            throw e;
        }

        responder = this.players[this.awaitingDecisionResponderID];
        if (!responder) {
            return decision;
        }

        const needsMoreDetail = decision === TriviaClueDecision.NeedsMoreDetail;
        const isFollowUpResponse = responder.clueDecisionInfo ? (responder.clueDecisionInfo.decision === TriviaClueDecision.NeedsMoreDetail) : false;

        // don't allow the decision to be "needs more detail" more than once in a row
        if (needsMoreDetail && (isFollowUpResponse || this.getCurrentClue()?.isAllPlayClue())) {
            decision = TriviaClueDecision.Incorrect;
        }

        const clueValue = this.getClueValue(this.getCurrentClue(), this.awaitingDecisionResponderID, decision);
        const clueDecisionInfo = new TriviaClueDecisionInfo(currentCategory.id, currentCategory.name, currentClue, clueResponse, decision, clueValue);

        responder.clueDecisionInfo = clueDecisionInfo;
        this.getCurrentClue()?.updateClueDecision(responder);

        responder.decided = true;

        if (clueDecisionInfo.decision !== TriviaClueDecision.NeedsMoreDetail) {
            this.updatePlayerScore(this.awaitingDecisionResponderID, clueDecisionInfo.clueValue, clueDecisionInfo.decision);
        }

        this.state = SessionState.ReadingClueDecision;
        this.spotlightResponderID = this.awaitingDecisionResponderID;

        return decision;
    }

    // returns true if the decision was successfully reversed
    voteToReverseDecision(voterID: SocketID, responderID: SocketID): boolean {
        // responder is the player whose decision the voter wants to reverse (note, the voter may also be the responder)
        const responder = this.players[responderID];
        if (!responder) {
            return false;
        }

        if (!responder.clueDecisionInfo) {
            return false;
        }

        if (!responder.clueDecisionInfo.reversalVoterIDs.includes(voterID)) {
            responder.clueDecisionInfo.reversalVoterIDs.push(voterID);
        }

        const numVotes = responder.clueDecisionInfo.reversalVoterIDs.length;

        // reversing a decision is a majority rule
        if (numVotes > (this.getConnectedPlayerIDs().length / 2)) {
            return this.reverseDecision(responderID, responder);
        }

        return false;
    }

    // returns true if the decision was successfully reversed
    reverseDecision(responderID: SocketID, responder: Player) {
        if (!responder.clueDecisionInfo || (responder.clueDecisionInfo.decision === TriviaClueDecision.NeedsMoreDetail)) {
            return false;
        }

        const newDecision = (responder.clueDecisionInfo.decision === TriviaClueDecision.Correct) ? TriviaClueDecision.Incorrect : TriviaClueDecision.Correct;

        responder.clueDecisionInfo = new TriviaClueDecisionInfo(responder.clueDecisionInfo.categoryID,
            responder.clueDecisionInfo.categoryName,
            responder.clueDecisionInfo.clue,
            responder.clueDecisionInfo.response,
            newDecision, responder.clueDecisionInfo.clueValue, true);

        let clueValue = responder.clueDecisionInfo.clueValue;

        // double the previous clue value to account for the value that was wrongfully awarded/deducted by the previous decision
        let clueValueModifier = 2;

        // certain clues with bonuses have a different value depending on the clue decision, in those cases we can't just double the value of the old clue decision
        switch (responder.clueDecisionInfo.clue.bonus) {
            case TriviaClueBonus.AllPlay:
                {
                    clueValue = this.getClueValue(responder.clueDecisionInfo.clue, responderID, newDecision);
                    clueValueModifier = 1;
                    responder.clueDecisionInfo.clueValue = clueValue;
                }
                break;
        }

        this.getCurrentClue()?.updateClueDecision(responder);
        this.updatePlayerScore(responderID, clueValue, newDecision, clueValueModifier);

        return true;
    }
}