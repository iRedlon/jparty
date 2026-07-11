
import { FeedbackType, SessionAnnouncement, TriviaClueBonus, TriviaRoundType } from "jparty-shared";

export enum LocalStorageKey {
    ClientID = "clientID",
    IsPlayer = "isPlayer",
    SessionName = "sessionName",
    CategoryIndex = "categoryIndex", // this was the last category index selected by this player
    BackgroundTheme = "backgroundTheme",
}

// z-index values for UI components
export enum Layer {
    Bottom = "9",
    Middle = "99",
    Top = "999",
    Fixed = "9999",
    ServerMessageAlert = "99999"
}

export const SOURCE_CODE_LINK = "https://github.com/iRedlon/jparty";
export const DONATION_LINK = "https://paypal.me/iredlon";
export const PATCH_NOTES_LINK = "https://github.com/iRedlon/jparty/blob/main/documentation/patch-notes.md";
export const KNOWN_ISSUES_LINK = "https://github.com/iRedlon/jparty/blob/main/documentation/known-issues.md";

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
    [SessionAnnouncement.ClueBonusWager]: "You get to wager!",
    [SessionAnnouncement.ClueBonusAllWager]: "Get ready to wager!",
    [SessionAnnouncement.ClueBonusAllPlay]: "Everyone gets to respond!",
    [SessionAnnouncement.FinalClue]: "This is the final clue for this round!",
    [SessionAnnouncement.StartRound]: "A new round is starting!",
    [SessionAnnouncement.StartFinalRound]: "This is the final clue for the game!",
    [SessionAnnouncement.GameOver]: "Game over!"
}

export const FEEDBACK_TYPE_DISPLAY_NAMES: Record<FeedbackType, string> = {
    [FeedbackType.Bug]: "Report a bug",
    [FeedbackType.TriviaData]: "Report bad trivia data",
    [FeedbackType.Suggestion]: "Make a suggestion/comment"
}

// todo: make the game settings presets use a list like this