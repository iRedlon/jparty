
import { TriviaClueDecisionInfo } from "./trivia-game";
import { TriviaClueDecision } from "./trivia-game-constants";

export enum SessionState {
    Lobby,
    ClueSelection,
    ReadingClueSelection,
    ReadingClue,
    ClueTossup,
    ClueResponse,
    WagerResponse,
    WaitingForClueDecision,
    ReadingClueDecision,
    GameOver
}

export enum SessionTimeout {
    Announcement,
    ReadingClueSelection,
    ReadingClue,
    BuzzWindow,
    ResponseWindow,
    RevealClueDecision
}

export enum SessionAnnouncement {
    StartGame,
    ClueBonusWager,
    ClueBonusAllWager,
    ClueBonusAllPlay,
    StartRound,
    StartFinalRound,
    FinalClue,
    GameOver
}

export enum AttemptReconnectResult {
    StaleSession, // cached session no longer exists
    InvalidClientID, // cached session exists but there's no data for this client ID
    AlreadyConnected,
    HostSuccess,
    PlayerSuccess
}

export enum PlayerState {
    Idle,
    WaitingToStartGame,
    SelectingClue,
    WaitingToBuzz,
    RespondingToClue,
    Wagering
}

export enum PlayerResponseType {
    Clue,
    Wager
}

export interface PlayerResponses {
    [PlayerResponseType.Clue]: string,
    [PlayerResponseType.Wager]: number
}

export class Player {
    clientID: string;
    name: string;
    connected: boolean;
    state: PlayerState;
    score: number;
    minWager: number;
    maxWager: number;
    responses: PlayerResponses;
    submitted: boolean;
    decided: boolean;
    clueDecisionInfo: TriviaClueDecisionInfo | undefined;
    correctCluesPerCategory: Record<number, number[]>;
    queuedForDeletion: boolean;

    constructor(clientID: string, name: string) {
        this.clientID = clientID;
        this.name = name;
        this.reset();
    }

    static clone(source: Player) {
        return Object.assign(new Player("", ""), source);
    }

    reset() {
        this.connected = true;
        this.setIdle();
        this.score = 0;
        this.minWager = 0;
        this.maxWager = 0;
        this.clearResponses();
        this.submitted = false;
        this.decided = false;
        this.clearClueDecision();
        this.correctCluesPerCategory = {};
        this.queuedForDeletion = false;
    }

    setIdle() {
        this.state = PlayerState.Idle;
    }

    // don't clear responses yet, because we want to persist them across multiple attempts of the same clue
    // instead, keep our responses but reset our data related to response submission
    resetSubmission() {
        this.submitted = false;
        this.decided = false;
    }

    clearResponses() {
        this.responses = {
            [PlayerResponseType.Clue]: "",
            [PlayerResponseType.Wager]: 0
        }

        this.resetSubmission();
    }

    updateClueDecision() {
        if (!this.clueDecisionInfo) {
            return;
        }

        if (!this.correctCluesPerCategory[this.clueDecisionInfo.categoryID]) {
            this.correctCluesPerCategory[this.clueDecisionInfo.categoryID] = [];
        }

        const decision = this.clueDecisionInfo?.decision;

        if (decision === TriviaClueDecision.Correct) {
            this.correctCluesPerCategory[this.clueDecisionInfo.categoryID].push(this.clueDecisionInfo.clue.id);
        }
        else {
            this.correctCluesPerCategory[this.clueDecisionInfo.categoryID].filter(clueID => clueID !== this.clueDecisionInfo?.clue.id);
        }
    }

    clearClueDecision() {
        this.clueDecisionInfo = undefined;
    }

    getCorrectCluesInCategory(categoryID: number) {
        if (!this.correctCluesPerCategory[categoryID]) {
            return 0;
        }

        return this.correctCluesPerCategory[categoryID].length;
    }
}

export class Host {
    clientID: string;
    connected: boolean;

    constructor(clientID: string) {
        this.clientID = clientID;
        this.connected = true;
    }
}

export type SocketID = string;
export type SessionHosts = Record<SocketID, Host>;
export type SessionPlayers = Record<SocketID, Player>;

export function getSortedSessionPlayerIDs(sessionPlayers: SessionPlayers) {
    return Object.keys(sessionPlayers).sort((a: SocketID, b: SocketID) => {
        const playerA = sessionPlayers[a];
        const playerB = sessionPlayers[b];

        // sort players by score; break ties with alphabetical order
        if (playerA.score === playerB.score) {
            return playerA.name.localeCompare(playerB.name);
        }

        return playerB.score - playerA.score;
    });
}

export function cloneSessionPlayers(source: SessionPlayers) {
    const clonedSessionPlayers: SessionPlayers = {};
    for (const playerID in source) {
        clonedSessionPlayers[playerID] = Player.clone(source[playerID]);
    }

    return clonedSessionPlayers;
}