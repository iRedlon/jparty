
import { SessionAnnouncement } from "./socket-constants";
import { TriviaClueDecision } from "./trivia-game-constants";

export const FAST_ESTIMATED_VOICE_DURATION_MS_PER_CHARACTER = 60;
export const NORMAL_ESTIMATED_VOICE_DURATION_MS_PER_CHARACTER = 75;
export const SLOW_ESTIMATED_VOICE_DURATION_MS_PER_CHARACTER = 90;

export function getEsimatedVoiceDurationMs(text: string) {
    let numCharacters = text.length;

    // these estimates are purely observational and based specifically on our preferred TTS voice (Google UK English Male) using browser speech synthesis
    // having more to say seems to make the TTS want to speak faster, so we calculate our estimate based on number of characters

    if (numCharacters >= 100) {
        return numCharacters * FAST_ESTIMATED_VOICE_DURATION_MS_PER_CHARACTER;
    }
    else if (numCharacters >= 50) {
        return numCharacters * NORMAL_ESTIMATED_VOICE_DURATION_MS_PER_CHARACTER;
    }
    else {
        return numCharacters * SLOW_ESTIMATED_VOICE_DURATION_MS_PER_CHARACTER;
    }
}

export enum SoundEffect {
    Voice,
    Applause,
    LongApplause
}

export enum VoiceLineType {
    Announcement,
    ReadClue,
    RevealClueDecision,
    DisplayCorrectAnswer
}

export enum VoiceLineVariable {
    CategoryName = "{categoryName}",
    ClueValue = "{clueValue}",
    ClueAnswer = "{clueAnswer}",
    ClueSelectorName = "{clueSelectorName}",
    SpotlightResponderName = "{spotlightResponderName}",
    LeaderName = "{leaderName}"
}

export const SESSION_ANNOUNCEMENT_VOICE_LINES: Record<SessionAnnouncement, string[]> = {
    [SessionAnnouncement.StartGame]: ["Get ready! The game is starting."],
    [SessionAnnouncement.SelectClue]: [`"${VoiceLineVariable.CategoryName}" for $${VoiceLineVariable.ClueValue}`],
    [SessionAnnouncement.ClueBonusWager]: [`That's a bonus! ${VoiceLineVariable.ClueSelectorName} gets to wager.`],
    [SessionAnnouncement.ClueBonusAllWager]: ["That's a bonus! Everyone gets to wager."],
    [SessionAnnouncement.ClueBonusAllPlay]: ["That's a bonus! Everyone gets to respond."],
    [SessionAnnouncement.FinalClue]: ["This is the final clue for this round!"],
    [SessionAnnouncement.StartRound]: ["Time for the next round!"],
    [SessionAnnouncement.StartFinalRound]: ["This is the final round!"],
    [SessionAnnouncement.GameOver]: [`Congratulations ${VoiceLineVariable.LeaderName}! You're a j-party champion. Thanks for playing!`]
};

export const REVEAL_CLUE_DECISION_VOICE_LINES: Record<TriviaClueDecision, string[]> = {
    [TriviaClueDecision.Correct]: ["Correct!"],
    [TriviaClueDecision.Incorrect]: ["Incorrect!"],
    [TriviaClueDecision.NeedsMoreDetail]: [`Needs more detail. Try again ${VoiceLineVariable.SpotlightResponderName}.`]
};

export const DISPLAY_CORRECT_ANSWER_VOICE_LINES = [
    `The correct answer was ${VoiceLineVariable.ClueAnswer}.`
];