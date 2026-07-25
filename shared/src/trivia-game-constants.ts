
export enum TriviaGameDifficulty {
    Easy,
    Normal,
    Hard
}

export enum TriviaRoundType {
    Standard
}

// DO NOT TOUCH: trivia database relies on these enum values
export enum TriviaClueDifficulty {
    Easiest = 1,
    Easy,
    Normal,
    Hard,
    Hardest
}

export const RATED_CLUE_DIFFICULTY_ORDER = [
    TriviaClueDifficulty.Easiest,
    TriviaClueDifficulty.Easy,
    TriviaClueDifficulty.Normal,
    TriviaClueDifficulty.Hard,
    TriviaClueDifficulty.Hardest
];

export const EASY_CLUE_DIFFICULTY_DISTRIBUTION = {
    [TriviaClueDifficulty.Easiest]: 0.4,
    [TriviaClueDifficulty.Easy]: 0.4,
    [TriviaClueDifficulty.Normal]: 0.2,
    [TriviaClueDifficulty.Hard]: 0,
    [TriviaClueDifficulty.Hardest]: 0
}

export const NORMAL_CLUE_DIFFICULTY_DISTRIBUTION = {
    [TriviaClueDifficulty.Easiest]: 0.2,
    [TriviaClueDifficulty.Easy]: 0.2,
    [TriviaClueDifficulty.Normal]: 0.2,
    [TriviaClueDifficulty.Hard]: 0.2,
    [TriviaClueDifficulty.Hardest]: 0.2
}

export const HARD_CLUE_DIFFICULTY_DISTRIBUTION = {
    [TriviaClueDifficulty.Easiest]: 0,
    [TriviaClueDifficulty.Easy]: 0,
    [TriviaClueDifficulty.Normal]: 0.2,
    [TriviaClueDifficulty.Hard]: 0.4,
    [TriviaClueDifficulty.Hardest]: 0.4
}

export const CLUE_DIFFICULTY_DISTRIBUTIONS = {
    [TriviaGameDifficulty.Easy]: EASY_CLUE_DIFFICULTY_DISTRIBUTION,
    [TriviaGameDifficulty.Normal]: NORMAL_CLUE_DIFFICULTY_DISTRIBUTION,
    [TriviaGameDifficulty.Hard]: HARD_CLUE_DIFFICULTY_DISTRIBUTION
}

export enum TriviaClueBonus {
    None,
    Wager,
    AllWager,
    AllPlay
}

// rated games only use wager bonuses, which we prefer to have on more difficult clues
// for custom games, we choose clue bonus positions randomly
export const RATED_CLUE_BONUS_POSITION_DISTRIBUTION = {
    0: 0.05,
    1: 0.2,
    2: 0.4,
    3: 0.2,
    4: 0.15
}

// DO NOT TOUCH: string values need to be the exact return format of the OpenAI decision bot
export enum TriviaClueDecision {
    Correct = "correct",
    Incorrect = "incorrect",
    NeedsMoreDetail = "needs more detail"
}