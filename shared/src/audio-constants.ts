
import { SessionAnnouncement } from "./session-constants";
import { TriviaClueDecision } from "./trivia-game-constants";

// this estimate is quite generous. the client will always tell the server to cancel the timeout early once its utterance is complete anyway
// that is to say, as long as we don't underestimate the voice duration, the timing will always be as smooth as it can possibly be
export const ESTIMATE_VOICE_DURATION_MS_PER_CHARACTER = 100;

export function getVoiceDurationMs(text: string) {
    return text.length * ESTIMATE_VOICE_DURATION_MS_PER_CHARACTER;
}

export enum VolumeType {
    Master = "master_volume",
    Music = "music_volume",
    Voice = "voice_volume",
    SoundEffects = "sound_effects_volume"
}

export enum AudioType {
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
    PromptClueSelection,
    ReadClueSelection,
    ReadClue,
    RevealClueDecision,
    ShowCorrectAnswer
}

// "voice line variables" are used to inject live game data into voice lines without needing to construct voice line strings during runtime
// voice line randomization and variable data injection happens on the server in session-utils::playVoiceLine
export enum VoiceLineVariable {
    RoundNumber = "{roundNumber}",
    CategoryName = "{categoryName}",
    ClueValue = "{clueValue}",
    ClueAnswer = "{clueAnswer}",
    ClueSelectorName = "{clueSelectorName}",
    SpotlightResponderName = "{spotlightResponderName}",
    LeaderName = "{leaderName}",
    LeaderScore = "{leaderScore}"
}

export const SESSION_ANNOUNCEMENT_VOICE_LINES: Record<SessionAnnouncement, string[]> = {
    [SessionAnnouncement.StartGame]: [
        `Welcome to j-party! Start us off ${VoiceLineVariable.ClueSelectorName}.`,
        `Welcome to j-party! Get us started ${VoiceLineVariable.ClueSelectorName}.`,
        `The game is starting! ${VoiceLineVariable.ClueSelectorName} will start the round off.`,
        `Let's get started! Select a clue ${VoiceLineVariable.ClueSelectorName}.`
    ],
    [SessionAnnouncement.ClueBonusWager]: [
        `That's a bonus! ${VoiceLineVariable.ClueSelectorName} gets to wager on: "${VoiceLineVariable.CategoryName}"!`, 
        `${VoiceLineVariable.ClueSelectorName} found a wager bonus in: "${VoiceLineVariable.CategoryName}"!`,
        `Get ready to make a wager on: "${VoiceLineVariable.CategoryName}". Good luck ${VoiceLineVariable.ClueSelectorName}.`
    ],
    [SessionAnnouncement.ClueBonusAllWager]: [
        `Everyone gets to wager. The category is: "${VoiceLineVariable.CategoryName}."`, 
        `Everyone can wager on this clue. The category is going to be: "${VoiceLineVariable.CategoryName}."`,
        `This is an all wager. The category is: ${VoiceLineVariable.CategoryName}.`
    ],
    [SessionAnnouncement.ClueBonusAllPlay]: [
        `This is a bonus! Everyone gets to respond in the category: "${VoiceLineVariable.CategoryName}"`,
        `You found an all play for: "${VoiceLineVariable.CategoryName}"! Everyone can respond.`,
        `That's an all play! Everyone get ready to respond in: "${VoiceLineVariable.CategoryName}"`
    ],
    [SessionAnnouncement.FinalClue]: [
        "This is the final clue for this round!",
        "This round is almost over. One more clue to go!",
        "Here comes the final clue in the round.",
        "One clue to go."
    ],
    [SessionAnnouncement.StartRound]: [
        `${VoiceLineVariable.LeaderName} is in the lead with ${VoiceLineVariable.LeaderScore}. Good luck in the next round. Start us off ${VoiceLineVariable.ClueSelectorName}`, 
        `Good round everyone. ${VoiceLineVariable.LeaderName} has the lead. Let's move on to round ${VoiceLineVariable.RoundNumber}.`, 
        `Round ${VoiceLineVariable.RoundNumber} is coming up. Let's find out if anyone can take the lead from ${VoiceLineVariable.LeaderName}`,
        `Well played everyone. ${VoiceLineVariable.RoundNumber} is next. Good luck. Get us started ${VoiceLineVariable.ClueSelectorName}`
    ],
    [SessionAnnouncement.StartFinalRound]: [
        `This is the final round! ${VoiceLineVariable.LeaderName} is the one to beat.`,
        `Here comes the final round! This is your last chance to overtake ${VoiceLineVariable.LeaderName}.`,
        `This is the last round! ${VoiceLineVariable.LeaderName} is in the lead with ${VoiceLineVariable.LeaderScore}.`
    ],
    [SessionAnnouncement.GameOver]: [
        `Congratulations ${VoiceLineVariable.LeaderName}! You're a j-party champion. Thanks for playing!`,
        `Well played ${VoiceLineVariable.LeaderName}! You won! Thanks for playing!`,
        `${VoiceLineVariable.LeaderName} won the game! Great work! Thanks for playing!`,
        `Your j-party champion is ${VoiceLineVariable.LeaderName}. You rock! Thanks for playing!`
    ]
};

export const PROMPT_CLUE_SELECTION_VOICE_LINES = [
    `Make a selection ${VoiceLineVariable.ClueSelectorName}.`,
    `${VoiceLineVariable.ClueSelectorName} controls the board.`,
    `It's up to you ${VoiceLineVariable.ClueSelectorName}.`,
    `Go ahead ${VoiceLineVariable.ClueSelectorName}`,
    `Where are we headed ${VoiceLineVariable.ClueSelectorName}?`
];

export const READ_CLUE_SELECTION_VOICE_LINE = `${VoiceLineVariable.CategoryName} for ${VoiceLineVariable.ClueValue}`;

export const CLEARED_CATEGORY_PROMPT_CLUE_SELECTION_VOICE_LINES = [
    `${VoiceLineVariable.ClueSelectorName} cleared that whole category, nice work!`,
    `${VoiceLineVariable.ClueSelectorName} got every clue in that category.`,
    `${VoiceLineVariable.CategoryName} was swept by ${VoiceLineVariable.ClueSelectorName}. Well done!`
];

export const TOSSUP_REVEAL_CLUE_DECISION_VOICE_LINES: Record<TriviaClueDecision, string[]> = {
    [TriviaClueDecision.Correct]: [
        "Correct!", 
        "Right!",
        "Well done.", 
        `You got it ${VoiceLineVariable.SpotlightResponderName}.`,
        "That's the answer.",
        "That was it.",
        "That's right",
        "Yep."
    ],
    [TriviaClueDecision.Incorrect]: [
        "Incorrect!",
        "Sorry, no.", 
        "That isn't it.",
        "No, I'm sorry.",
        "No, that isn't it."
    ],
    [TriviaClueDecision.NeedsMoreDetail]: [
        `Needs more detail. Try again ${VoiceLineVariable.SpotlightResponderName}.`, 
        "Could you be more specific?",
        "Could you add some detail?",
    ]
};

export const ALL_PLAY_REVEAL_CLUE_DECISION_VOICE_LINES: Record<TriviaClueDecision, string[]> = {
    [TriviaClueDecision.Correct]: [
        `${VoiceLineVariable.SpotlightResponderName} got it.`, 
        `Well done ${VoiceLineVariable.SpotlightResponderName}.`,
        `Nice one ${VoiceLineVariable.SpotlightResponderName}`,
        `That's right ${VoiceLineVariable.SpotlightResponderName}.`,
        `${VoiceLineVariable.SpotlightResponderName} knew it.`
    ],
    [TriviaClueDecision.Incorrect]: [
        `Sorry ${VoiceLineVariable.SpotlightResponderName}, that wasn't it.`, 
        `${VoiceLineVariable.SpotlightResponderName} didn't know it.`,
        `Sorry ${VoiceLineVariable.SpotlightResponderName}, that's not right.`,
    ],
    [TriviaClueDecision.NeedsMoreDetail]: [] // all play/wager clues decisions can never be "needs more detail"
};

export const DISPLAY_CORRECT_ANSWER_VOICE_LINES = [
    `The correct answer was ${VoiceLineVariable.ClueAnswer}.`,
    `It was ${VoiceLineVariable.ClueAnswer}.`,
    `The answer was ${VoiceLineVariable.ClueAnswer}.`,
    `The answer there was ${VoiceLineVariable.ClueAnswer}.`,
    `${VoiceLineVariable.ClueAnswer} was the answer.`
];