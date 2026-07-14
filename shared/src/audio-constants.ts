
import { SessionAnnouncement } from "./session-constants";
import { TriviaClueDecision } from "./trivia-game-constants";

// this estimate is quite generous. the client will always tell the server to cancel the timeout early once its utterance is complete anyway
// that is to say, as long as we don't underestimate the voice duration, the timing will always be as smooth as it can possibly be
// the base duration covers TTS stream startup latency, which happens after the server's timer has already started
export const ESTIMATE_VOICE_DURATION_BASE_MS = 2500;
export const ESTIMATE_VOICE_DURATION_MS_PER_CHARACTER = 120;

export function getVoiceDurationMs(text: string) {
    return ESTIMATE_VOICE_DURATION_BASE_MS + (text.length * ESTIMATE_VOICE_DURATION_MS_PER_CHARACTER);
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
    GameMusic2,
    GameMusic3,
    ThinkingMusic,
    BuzzWindowTimeout,
    Applause,
    LongApplause,
    Buzz,
    ClueResponseSubmitted,
    WagerResponseSubmitted,
    CorrectDecision,
    IncorrectDecision,
    ClueSelected,
    FoundWagerBonus,
    AllWagerCategoryRevealed,
}

export enum VoiceType {
    ModernMasculine = "modern_masculine",
    ModernFeminine = "modern_feminine",
    ClassicMasculine = "classic_masculine",
    ClassicFeminine = "classic_feminine"
}

export enum VoiceLineType {
    ReadCategoryName,
    Announcement,
    PromptClueSelection,
    ReadClueSelection,
    ReadClue,
    RevealClueDecision,
    ShowCorrectAnswer,
    RevealAllWagerCategory,
    IntroduceAllWagerClue
}

// "voice line variables" are used to inject live game data into voice lines without needing to construct voice line strings during runtime
// voice line randomization and variable data injection happens on the server in session-utils::playVoiceLine
export enum VoiceLineVariable {
    RoundNumber = "{roundNumber}",
    ReadingCategoryName = "{readingCategoryName}",
    QuotedCategoryText = "{quotedCategoryText}",
    CategoryName = "{categoryName}",
    ClueValue = "{clueValue}",
    ClueAnswer = "{clueAnswer}",
    ClueSelectorName = "{clueSelectorName}",
    SpotlightResponderName = "{spotlightResponderName}",
    LeaderName = "{leaderName}",
    LeaderScore = "{leaderScore}",
    ClaimedLeaderboardSpot = "{claimedLeaderboardSpot}"
}

export const WELCOME_VOICE_LINES = [
    "Welcome to j-party! Let's begin.",
    "It's time to play j-party! Let's get started.",
    "Welcome to j-party! Let's get right into it.",
    "Welcome to j-party! Let's get started.",
    "This is j-party! Let's get started.",
];

export const READ_FIRST_CATEGORY_NAME_VOICE_LINES = [
    `The categories are: "${VoiceLineVariable.ReadingCategoryName}",`,
    `Our first category will be: "${VoiceLineVariable.ReadingCategoryName}",`,
    `In this round, we'll have: "${VoiceLineVariable.ReadingCategoryName}",`
];

// having three duplicates of the same line is my hacky way to implement voice line probability lol
export const READ_MIDDLE_CATEGORY_NAME_VOICE_LINES = [
    `"${VoiceLineVariable.ReadingCategoryName}",`,
    `"${VoiceLineVariable.ReadingCategoryName}",`,
    `"${VoiceLineVariable.ReadingCategoryName}",`,
    `next it'll be: "${VoiceLineVariable.ReadingCategoryName}",`,
    `then: "${VoiceLineVariable.ReadingCategoryName}",`
];

export const READ_LAST_CATEGORY_NAME_VOICE_LINES = [
    `and finally: "${VoiceLineVariable.ReadingCategoryName}".`,
    `and lastly: "${VoiceLineVariable.ReadingCategoryName}".`,
    `and the last will be: "${VoiceLineVariable.ReadingCategoryName}".`
];

export const QUOTED_WORD_CATEGORY_VOICE_LINES = [
    `All of the answers in that category will contain the word "${VoiceLineVariable.QuotedCategoryText}".`,
    `Each answer in that category will contain the word "${VoiceLineVariable.QuotedCategoryText}".`,
    `Every answer there will have the word "${VoiceLineVariable.QuotedCategoryText}" in it.`
];

export const QUOTED_LETTER_CATEGORY_VOICE_LINES = [
    `All of the answers in that category will start with the letter "${VoiceLineVariable.QuotedCategoryText}".`,
    `Each answer in that category will start with the letter "${VoiceLineVariable.QuotedCategoryText}".`,
    `Every answer there will begin with the letter "${VoiceLineVariable.QuotedCategoryText}".`
];

export const QUOTED_OTHER_CATEGORY_VOICE_LINES = [
    `Note that "${VoiceLineVariable.QuotedCategoryText}" is in quotations.`,
    `Keep in mind that "${VoiceLineVariable.QuotedCategoryText}" is in quotations.`,
    `"${VoiceLineVariable.QuotedCategoryText}" is in quotations there.`
];

export const QUOTED_MULTIPLE_CATEGORY_VOICE_LINES = [
    `Notice the "${VoiceLineVariable.QuotedCategoryText}" in quotations.`,
    `Note that the "${VoiceLineVariable.QuotedCategoryText}" are each in quotations.`,
    `Keep in mind that the "${VoiceLineVariable.QuotedCategoryText}" are in quotations there.`
];

export const SESSION_ANNOUNCEMENT_VOICE_LINES: Record<SessionAnnouncement, string[]> = {
    [SessionAnnouncement.StartGame]: [
        // WELCOME_VOICE_LINES is responsible for this
    ],
    [SessionAnnouncement.ClueBonusWager]: [
        // FIRST/SECOND/LAST_WAGER_BONUS_VOICE_LINES are responsible for this
    ],
    [SessionAnnouncement.ClueBonusAllWager]: [
        "It's time for final j-party! Get ready to wager. The category will be...",
        "It's final j-party! Time to make a wager. The category is going to be...",
        "It's time for final j-party! Everyone get ready to wager. You'll be dealing with..."
    ],
    [SessionAnnouncement.ClueBonusAllPlay]: [
        `All play! Everyone gets to respond in the category: "${VoiceLineVariable.CategoryName}"`,
        `You found an all play for: "${VoiceLineVariable.CategoryName}"! Everyone can respond.`,
        `That's an all play! Everyone get ready to respond in: "${VoiceLineVariable.CategoryName}".`
    ],
    [SessionAnnouncement.FinalClue]: [
        "This is the final clue in the round.",
        "This round is almost over! One more clue to go.",
        "Here comes the final clue in the round.",
        "One clue to go."
    ],
    [SessionAnnouncement.StartRound]: [
        `${VoiceLineVariable.LeaderName} is in the lead with ${VoiceLineVariable.LeaderScore}. Clue values will be doubled in the next round.`,
        `${VoiceLineVariable.LeaderName} has the lead as we head to double j-party. All clue values are doubled in this round.`, 
        `It's time for double j-party! All the clues are worth twice as much here. ${VoiceLineVariable.LeaderName} has the lead with ${VoiceLineVariable.LeaderScore}.`,
        `Well played everyone. We're headed to double j-party! There's plenty of money on the board to take the lead from ${VoiceLineVariable.LeaderName}.`
    ],
    [SessionAnnouncement.StartFinalRound]: [
        // SessionAnnouncement.ClueBonusAllWager is responsible for this
    ],
    [SessionAnnouncement.GameOver]: [
        `Congratulations ${VoiceLineVariable.LeaderName}! You're a j-party champion. Thanks for playing!`,
        `Well played ${VoiceLineVariable.LeaderName}! You won! Thanks for playing!`,
        `${VoiceLineVariable.LeaderName} won the game! Great work! Thanks for playing!`,
        `Your j-party champion is ${VoiceLineVariable.LeaderName}. You rock! Thanks for playing!`
    ]
};

export const REVEAL_ALL_WAGER_CATEGORY_VOICE_LINE = `"${VoiceLineVariable.CategoryName}".`;

export const INTRODUCE_ALL_WAGER_CLUE_VOICE_LINES = [
    "And here's your final clue...",
    "Here's your final clue...",
    "Now, here's your final clue..."
];

export const FIRST_WAGER_BONUS_VOICE_LINES = [
    `${VoiceLineVariable.ClueSelectorName} found our first daily double in "${VoiceLineVariable.CategoryName}"! Best of luck.`,
    `And there's the first daily double. ${VoiceLineVariable.ClueSelectorName} gets to wager on "${VoiceLineVariable.CategoryName}". Good luck.`,
    `And that's our first daily double. Best of luck ${VoiceLineVariable.ClueSelectorName}.`,
    `${VoiceLineVariable.ClueSelectorName} found the first daily double of the game in "${VoiceLineVariable.CategoryName}"! Good luck.`
];

export const SECOND_WAGER_BONUS_VOICE_LINES = [
    `${VoiceLineVariable.ClueSelectorName} found our second daily double in "${VoiceLineVariable.CategoryName}"! Just one more left on the board. Best of luck.`,
    `And there's the second daily double of the game. ${VoiceLineVariable.ClueSelectorName} gets to wager on "${VoiceLineVariable.CategoryName}". Good luck.`,
    `And that's our second daily double! There's only one more left on the board. Best of luck ${VoiceLineVariable.ClueSelectorName}.`,
    `${VoiceLineVariable.ClueSelectorName} found the second daily double of the game in "${VoiceLineVariable.CategoryName}"! Good luck.`
];

export const LAST_WAGER_BONUS_VOICE_LINES = [
    `${VoiceLineVariable.ClueSelectorName} found the last daily double of the game in "${VoiceLineVariable.CategoryName}"! Best of luck.`,
    `And there's our final daily double. ${VoiceLineVariable.ClueSelectorName} gets to wager on "${VoiceLineVariable.CategoryName}". Good luck.`,
    `And that's our last daily double. Best of luck ${VoiceLineVariable.ClueSelectorName}.`,
    `${VoiceLineVariable.ClueSelectorName} found the last daily double of the game in "${VoiceLineVariable.CategoryName}"! Good luck.`
];

export const LEADERBOARD_GAME_OVER_VOICE_LINES = [
    `Congratulations ${VoiceLineVariable.LeaderName}! You're a j-party champion, and you claimed ${VoiceLineVariable.ClaimedLeaderboardSpot}. Thanks for playing!`,
    `Well played ${VoiceLineVariable.LeaderName}! You won, and you claimed ${VoiceLineVariable.ClaimedLeaderboardSpot}! Thanks for playing!`,
    `${VoiceLineVariable.LeaderName} won the game and claimed ${VoiceLineVariable.ClaimedLeaderboardSpot}! Great work! Thanks for playing!`,
    `Your j-party champion is ${VoiceLineVariable.LeaderName}, and they claimed ${VoiceLineVariable.ClaimedLeaderboardSpot}. You rock! Thanks for playing!`
];

export const PROMPT_CLUE_SELECTION_VOICE_LINES = [
    `Make a selection ${VoiceLineVariable.ClueSelectorName}.`,
    `${VoiceLineVariable.ClueSelectorName} controls the board.`,
    `It's up to you ${VoiceLineVariable.ClueSelectorName}.`,
    `Go ahead ${VoiceLineVariable.ClueSelectorName}.`,
    `Where are we headed ${VoiceLineVariable.ClueSelectorName}?`,
    `Where to next ${VoiceLineVariable.ClueSelectorName}?`,
    `It's all yours ${VoiceLineVariable.ClueSelectorName}.`,
];

export const READ_CLUE_SELECTION_VOICE_LINE = `${VoiceLineVariable.CategoryName} for ${VoiceLineVariable.ClueValue}`;

export const CLEARED_CATEGORY_PROMPT_CLUE_SELECTION_VOICE_LINES = [
    `Nice work ${VoiceLineVariable.ClueSelectorName}, you cleared that whole category. Where to next?`,
    `You got every clue in that category ${VoiceLineVariable.ClueSelectorName}. The board is still yours.`,
    `${VoiceLineVariable.ClueSelectorName} swept ${VoiceLineVariable.CategoryName}. Well done! It's still your choice.`
];

export const TOSSUP_REVEAL_CLUE_DECISION_VOICE_LINES: Record<TriviaClueDecision, string[]> = {
    [TriviaClueDecision.Correct]: [
        "Correct!", 
        "Right!",
        "Well done.", 
        `Good.`,
        "That's the answer.",
        "That was it.",
        "That's right.",
        "You got it.",
    ],
    [TriviaClueDecision.Incorrect]: [
        "Incorrect.",
        "Sorry, no.", 
        "That isn't it.",
        "No, I'm sorry.",
        "No, that isn't it.",
        "I'm afraid not."
    ],
    [TriviaClueDecision.NeedsMoreDetail]: [
        `That needs more detail. Try again ${VoiceLineVariable.SpotlightResponderName}.`, 
        "Could you be more specific?",
        "Could you add some detail?",
        `Could you please clarify, ${VoiceLineVariable.SpotlightResponderName}?`,
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