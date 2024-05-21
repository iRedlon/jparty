
import { SessionAnnouncement } from "./socket-constants";
import { TriviaClueDecision } from "./trivia-game-constants";

// this estimate is quite generous. the client will always tell the server to cancel the timeout early once its utterance is complete anyway
// that is to say, as long as we don't underestimate the voice duration, the timing will always be as smooth as it can possibly be
export const ESTIMATE_VOICE_DURATION_MS_PER_CHARACTER = 100;

export function getVoiceDurationMs(text: string) {
    return text.length * ESTIMATE_VOICE_DURATION_MS_PER_CHARACTER;
}

export enum VolumeType {
    Music = "music_volume",
    Voice = "voice_volume",
    SoundEffects = "sound_effects_volume"
} 

export enum SoundEffect {
    LobbyMusic,
    GameMusic,
    BuzzWindowTimeout,
    Applause,
    LongApplause
}

export enum VoiceType {
    ModernMasculine = "modern_masculine",
    ModernFeminine = "modern_feminine",
    ClassicMasculine = "classic_masculine",
    ClassicFeminine = "classic_feminine"
}

export enum VoiceLineType {
    Announcement,
    ReadClue,
    RevealClueDecision,
    DisplayCorrectAnswer
}

export enum VoiceLineVariable {
    RoundNumber = "{roundNumber}",
    CategoryName = "{categoryName}",
    ClueValue = "{clueValue}",
    ClueAnswer = "{clueAnswer}",
    ClueSelectorName = "{clueSelectorName}",
    SpotlightResponderName = "{spotlightResponderName}",
    LeaderName = "{leaderName}"
}

export const SESSION_ANNOUNCEMENT_VOICE_LINES: Record<SessionAnnouncement, string[]> = {
    [SessionAnnouncement.StartGame]: ["Get ready! The game is starting.", "Welcome! Let's get started."],
    [SessionAnnouncement.SelectClue]: [`"${VoiceLineVariable.CategoryName}" for $${VoiceLineVariable.ClueValue}`],
    [SessionAnnouncement.ClueBonusWager]: [`That's a bonus! ${VoiceLineVariable.ClueSelectorName} gets to wager!`, `${VoiceLineVariable.ClueSelectorName} found a wager bonus!`],
    [SessionAnnouncement.ClueBonusAllWager]: ["That's a bonus! Everyone gets to wager.", "You found a bonus! Everyone can wager on this clue."],
    [SessionAnnouncement.ClueBonusAllPlay]: ["That's a bonus! Everyone gets to respond.", "You found an all play! Everyone gets to respond to this clue."],
    [SessionAnnouncement.FinalClue]: ["This is the final clue for this round!", "This round is almost over. One more clue to go!"],
    [SessionAnnouncement.StartRound]: ["Here comes the next round!", "Time for the next round!", `Let's start round ${VoiceLineVariable.RoundNumber}`],
    [SessionAnnouncement.StartFinalRound]: ["This is the final round!", "One more round to go!", "Here comes the last round for this game."],
    [SessionAnnouncement.GameOver]: [`Congratulations ${VoiceLineVariable.LeaderName}! You're a j-party champion. Thanks for playing!`]
};

export const REVEAL_CLUE_DECISION_VOICE_LINES: Record<TriviaClueDecision, string[]> = {
    [TriviaClueDecision.Correct]: ["Correct!", "Right!", "Well done.", `Nice one ${VoiceLineVariable.SpotlightResponderName}`],
    [TriviaClueDecision.Incorrect]: ["Incorrect!", "Sorry, no.", "That isn't it."],
    [TriviaClueDecision.NeedsMoreDetail]: [`Needs more detail. Try again ${VoiceLineVariable.SpotlightResponderName}.`, "Could you be more specific?"]
};

export const DISPLAY_CORRECT_ANSWER_VOICE_LINES = [
    `The correct answer was ${VoiceLineVariable.ClueAnswer}.`,
    `It was ${VoiceLineVariable.ClueAnswer}.`,
    `The answer we were looking for was ${VoiceLineVariable.ClueAnswer}.`
];