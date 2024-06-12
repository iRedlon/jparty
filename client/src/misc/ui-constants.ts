
import { FeedbackType, SessionAnnouncement, TriviaClueBonus, TriviaRoundType } from "jparty-shared";

// all of these are stored in the window's localStorage object for this browser session
export enum LocalStorageKey {
    ClientID = "clientID",
    IsPlayer = "isPlayer",
    SessionName = "sessionName",
    CategoryIndex = "categoryIndex", // this was the last category index selected by this player
}

export const BACKGROUND_COLOR = "#0d47a1";
export const BACKGROUND_ACCENT_COLOR = "#00008b";

// z-index values for UI components
export enum Layer {
    Bottom = "9",
    Middle = "99",
    Top = "999",
    Fixed = "9999",
    ServerMessageAlert = "99999"
}

export const TRIVIA_ROUND_TYPE_DISPLAY_NAMES: Record<TriviaRoundType, string> = {
    [TriviaRoundType.Standard]: "Standard"
}

export const TRIVIA_ROUND_TYPE_DESCRIPTIONS: Record<TriviaRoundType, string> = {
    [TriviaRoundType.Standard]: "A random selection of categories with increasing clue value"
}

export const TRIVIA_CLUE_BONUS_DISPLAY_NAMES: Record<TriviaClueBonus, string> = {
    [TriviaClueBonus.None]: "None",
    [TriviaClueBonus.Wager]: "Wager",
    [TriviaClueBonus.AllWager]: "All Wager",
    [TriviaClueBonus.AllPlay]: "All Play"
}

export const TRIVIA_CLUE_BONUS_DESCRIPTIONS: Record<TriviaClueBonus, string> = {
    [TriviaClueBonus.None]: "A normal clue without any bonuses",
    [TriviaClueBonus.Wager]: "Responder may wager before seeing the clue",
    [TriviaClueBonus.AllWager]: "All solvent players may wager before seeing the clue",
    [TriviaClueBonus.AllPlay]: "All players may attempt a response. Incorrect responses aren't penalized"
}

export const SESSION_ANNOUNCEMENT_MESSAGES: Record<SessionAnnouncement, string> = {
    [SessionAnnouncement.StartGame]: "The game is starting!",
    [SessionAnnouncement.ClueBonusWager]: "Clue bonus: wager!",
    [SessionAnnouncement.ClueBonusAllWager]: "Clue bonus: all wager!",
    [SessionAnnouncement.ClueBonusAllPlay]: "Clue bonus: all play!",
    [SessionAnnouncement.FinalClue]: "This is the final clue for this round!",
    [SessionAnnouncement.StartRound]: "A new round is starting!",
    [SessionAnnouncement.StartFinalRound]: "The final round is starting!",
    [SessionAnnouncement.GameOver]: "Game over!"
}

export const FEEDBACK_TYPE_DISPLAY_NAMES: Record<FeedbackType, string> = {
    [FeedbackType.Bug]: "Report a bug",
    [FeedbackType.TriviaData]: "Report bad trivia data",
    [FeedbackType.Suggestion]: "Make a suggestion/comment"
}

// todo: make the game settings presets use a list like this