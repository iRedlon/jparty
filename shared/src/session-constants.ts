
import { MAX_EARNED_REVERSAL_SCORE_FOR_LEADERBOARD } from "./leaderboard-constants";
import { TriviaClueDecisionInfo } from "./trivia-game";

export enum SessionState {
    Lobby,
    ReadingCategoryNames,
    PromptClueSelection,
    ReadingClueSelection,
    ReadingClue,
    ClueTossup,
    ClueResponse,
    WagerResponse,
    WaitingForClueDecision,
    ReadingClueDecision,
    GameOver
}

export enum SessionTimeoutType {
    ReadingCategoryName,
    Announcement,
    ReadingClueSelection,
    ReadingClue,
    BuzzWindow,
    TossupWindow,
    ResponseWindow,
    ReadingClueDecision
}

export enum SessionAnnouncement {
    StartGame,
    ClueBonusWager,
    ClueBonusAllWager,
    ClueBonusAllPlay,
    FinalClue,
    StartRound,
    StartFinalRound,
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
    PromptStartGame,
    PromptClueSelection,
    PromptBuzz,
    PromptClueResponse,
    PromptWager
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
    signatureImageBase64: string;
    signatureCanvasPath: any[];
    connected: boolean;
    state: PlayerState;
    score: number;
    earnedReversalScore: number;
    tossupWeight: number;
    positionChange: number;
    minWager: number;
    maxWager: number;
    responses: PlayerResponses;
    submitted: boolean;
    decided: boolean;
    clueDecisionInfo: TriviaClueDecisionInfo | undefined;
    queuedForDeletion: boolean;

    constructor(clientID: string, name: string) {
        this.connected = true;
        this.clientID = clientID;
        this.name = name;
        this.signatureImageBase64 = "";
        this.signatureCanvasPath = [];
        this.reset();
    }

    static clone(source: Player) {
        let clonedPlayer = Object.assign(new Player("", ""), source);
        clonedPlayer.signatureCanvasPath = JSON.parse(JSON.stringify(source.signatureCanvasPath));

        return clonedPlayer;
    }

    reset() {
        this.setIdle();
        this.score = 0;
        this.earnedReversalScore = 0;
        this.tossupWeight = 1;
        this.positionChange = 0;
        this.minWager = 0;
        this.maxWager = 0;
        this.clearResponses();
        this.submitted = false;
        this.decided = false;
        this.clearClueDecision();
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

    clearClueDecision() {
        this.clueDecisionInfo = undefined;
    }

    qualifiesForLeaderboard() {
        return (this.score > 0) && (this.earnedReversalScore <= MAX_EARNED_REVERSAL_SCORE_FOR_LEADERBOARD);
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