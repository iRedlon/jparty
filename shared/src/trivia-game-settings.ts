
import { TriviaCategoryType, TriviaClueBonus, TriviaGameDifficulty, TriviaRoundType } from "./trivia-game-constants";
import { getEnumKeys, getEnumSize } from "./utils";

export class TriviaGameSettings {
    static MIN_CLUE_YEAR = 1985;
    static MAX_CLUE_YEAR = 2023;

    static MIN_BUZZ_WINDOW_DURATION_SEC = 1;
    static MAX_BUZZ_WINDOW_DURATION_SEC = 10;

    static MIN_RESPONSE_DURATION_SEC = 1;
    static MAX_RESPONSE_DURATION_SEC = 15;

    static MIN_REVEAL_DECISION_DURATION_SEC = 1;
    static MAX_REVEAL_DECISION_DURATION_SEC = 10;

    static MIN_NUM_ROUNDS = 1;
    static MAX_NUM_ROUNDS = 10;

    static ESTIMATED_MINUTES_PER_CLUE = 0.6;
    static MAX_BANNED_CATEGORY_TYPES_IN_RATED_ROUND = 3;

    constructor(
        public minClueYear: number,
        public difficulty: TriviaGameDifficulty,
        public buzzWindowDurationSec: number,
        public responseDurationSec: number,
        public revealDecisionDurationSec: number,
        public roundSettings: TriviaRoundSettings[]
    ) { }

    static clone(source: TriviaGameSettings) {
        const clonedRoundSettings = source.roundSettings.map(roundSettings => TriviaRoundSettings.clone(roundSettings));
        return new TriviaGameSettings(source.minClueYear, source.difficulty,
            source.buzzWindowDurationSec, source.responseDurationSec, source.revealDecisionDurationSec,
            clonedRoundSettings);
    }

    getTotalNumClues() {
        let totalNumClues = 0;
        for (const roundSettings of this.roundSettings) {
            totalNumClues += roundSettings.getTotalNumClues();
        }

        return totalNumClues;
    }

    getEstimatedGameDuration() {
        const estimatedDuration = this.getTotalNumClues() * TriviaGameSettings.ESTIMATED_MINUTES_PER_CLUE;

        // round to the nearest 5 minutes
        return Math.max(Math.floor(estimatedDuration / 5) * 5, 5);
    }

    getRating(): TriviaGameRating {
        if (this.difficulty != TriviaGameDifficulty.Normal) {
            return { isRated: false, notRatedReason: "not normal difficulty" };
        }

        if (this.roundSettings.length != NORMAL_GAME_SETTINGS.roundSettings.length) {
            return { isRated: false, notRatedReason: "wrong number of rounds" };
        }

        for (let roundIndex = 0; roundIndex < this.roundSettings.length; roundIndex++) {
            const roundSettings = this.roundSettings[roundIndex];
            const defaultRoundSettings = NORMAL_GAME_SETTINGS.roundSettings[roundIndex];

            if (roundSettings.type != defaultRoundSettings.type) {
                return { isRated: false, notRatedReason: `round ${roundIndex + 1} has wrong type` };
            }

            if (roundSettings.bannedCategoryTypes.length > TriviaGameSettings.MAX_BANNED_CATEGORY_TYPES_IN_RATED_ROUND) {
                return { isRated: false, notRatedReason: `round ${roundIndex + 1} has too many banned category types` };
            }

            if (roundSettings.numCategories != defaultRoundSettings.numCategories) {
                return { isRated: false, notRatedReason: `round ${roundIndex + 1} has the wrong number of categories` };
            }

            if (roundSettings.numClues != defaultRoundSettings.numClues) {
                return { isRated: false, notRatedReason: `round ${roundIndex + 1} has the wrong number of clues` };
            }

            if (roundSettings.clueValueStep != defaultRoundSettings.clueValueStep) {
                return { isRated: false, notRatedReason: `round ${roundIndex + 1} has the wrong clue value step` };
            }

            for (const _ of getEnumKeys(TriviaClueBonus)) {
                const clueBonus: TriviaClueBonus = parseInt(_);
                const clueBonusName = TriviaClueBonus[clueBonus].toLowerCase();

                if (roundSettings.clueBonusCounts[clueBonus] != defaultRoundSettings.clueBonusCounts[clueBonus]) {
                    return { isRated: false, notRatedReason: `round ${roundIndex + 1} has the wrong number of ${clueBonusName} bonuses` };
                }
            }
        }

        return { isRated: true };
    }

    canAddRound() {
        return this.roundSettings.length < TriviaGameSettings.MAX_NUM_ROUNDS;
    }

    canDeleteRound() {
        return this.roundSettings.length > TriviaGameSettings.MIN_NUM_ROUNDS;
    }

    isMinClueYearInvalid() {
        return this.minClueYear < TriviaGameSettings.MIN_CLUE_YEAR ||
            this.minClueYear > TriviaGameSettings.MAX_CLUE_YEAR;
    }

    isBuzzWindowDurationInvalid() {
        return this.buzzWindowDurationSec < TriviaGameSettings.MIN_BUZZ_WINDOW_DURATION_SEC ||
            this.buzzWindowDurationSec > TriviaGameSettings.MAX_BUZZ_WINDOW_DURATION_SEC;
    }

    isResponseDurationInvalid() {
        return this.responseDurationSec < TriviaGameSettings.MIN_RESPONSE_DURATION_SEC ||
            this.responseDurationSec > TriviaGameSettings.MAX_RESPONSE_DURATION_SEC;
    }

    isRevealDecisionDurationInvalid() {
        return this.revealDecisionDurationSec < TriviaGameSettings.MIN_REVEAL_DECISION_DURATION_SEC ||
            this.revealDecisionDurationSec > TriviaGameSettings.MAX_REVEAL_DECISION_DURATION_SEC;
    }

    isInvalid() {
        if (this.isMinClueYearInvalid() ||
            this.isBuzzWindowDurationInvalid() ||
            this.isResponseDurationInvalid() ||
            this.isRevealDecisionDurationInvalid()) {
            return true;
        }

        for (let roundIndex = 0; roundIndex < this.roundSettings.length; roundIndex++) {
            if (this.roundSettings[roundIndex].isInvalid()) {
                return true;
            }
        }

        return false;
    }
}

// "rated" means that this game will count for competitive player statistics (especially the public leaderboard)
export interface TriviaGameRating {
    isRated: boolean,
    notRatedReason?: string
}

// how many of each clue bonus will appear in a given round (if any)
export interface TriviaClueBonusCounts {
    [TriviaClueBonus.None]?: number;
    [TriviaClueBonus.Wager]?: number;
    [TriviaClueBonus.AllWager]?: number;
    [TriviaClueBonus.AllPlay]?: number;
}

export class TriviaRoundSettings {
    static MIN_NUM_CATEGORIES_PER_ROUND = 1;
    static MAX_NUM_CATEGORIES_PER_ROUND = 10;

    static MIN_NUM_CLUES_PER_CATEGORY = 1;
    static MAX_NUM_CLUES_PER_CATEGORY = 10;

    static MIN_CLUE_VALUE_STEP = 0;
    static MAX_CLUE_VALUE_STEP = 1000;

    constructor(
        public type: TriviaRoundType,
        public bannedCategoryTypes: TriviaCategoryType[],
        public numCategories: number,
        public numClues: number,
        public clueValueStep: number,
        public clueBonusCounts: TriviaClueBonusCounts
    ) { }

    static clone(source: TriviaRoundSettings) {
        const clonedClueBonusCounts = JSON.parse(JSON.stringify(source.clueBonusCounts));
        return new TriviaRoundSettings(source.type, [...source.bannedCategoryTypes], source.numCategories, source.numClues, source.clueValueStep, clonedClueBonusCounts);
    }

    getTotalNumClues() {
        return this.numCategories * this.numClues;
    }

    getTotalNumCluesWithAnyBonus(exclude?: TriviaClueBonus) {
        let totalNumCluesWithBonus = 0;

        for (const _ of Object.keys(this.clueBonusCounts)) {
            const clueBonus: TriviaClueBonus = parseInt(_);
            const count = this.clueBonusCounts[clueBonus] || 0;

            if (clueBonus === exclude) {
                continue;
            }

            totalNumCluesWithBonus += count;
        }

        return totalNumCluesWithBonus;
    };

    getTotalNumCluesWithoutBonus(exclude?: TriviaClueBonus) {
        return Math.abs(this.getTotalNumClues() - this.getTotalNumCluesWithAnyBonus(exclude));
    }

    areCategoryTypesInvalid() {
        const numCategoryTypes = getEnumSize(TriviaCategoryType);
        return this.bannedCategoryTypes.length >= numCategoryTypes;
    }

    isNumCategoriesInvalid() {
        return this.numCategories < TriviaRoundSettings.MIN_NUM_CATEGORIES_PER_ROUND ||
            this.numCategories > TriviaRoundSettings.MAX_NUM_CATEGORIES_PER_ROUND;
    }

    isNumCluesInvalid() {
        return this.numClues < TriviaRoundSettings.MIN_NUM_CLUES_PER_CATEGORY ||
            this.numClues > TriviaRoundSettings.MAX_NUM_CLUES_PER_CATEGORY;
    }

    isClueValueStepInvalid() {
        return this.clueValueStep < TriviaRoundSettings.MIN_CLUE_VALUE_STEP ||
            this.clueValueStep > TriviaRoundSettings.MAX_CLUE_VALUE_STEP;
    }

    areClueBonusCountsInvalid() {
        return this.getTotalNumCluesWithAnyBonus() > this.getTotalNumClues();
    }

    isInvalid() {
        return (this.areCategoryTypesInvalid() ||
            this.isNumCategoriesInvalid() ||
            this.isNumCluesInvalid() ||
            this.isClueValueStepInvalid() ||
            this.areClueBonusCountsInvalid());
    }
}

export interface TriviaCategorySettings {
    type: TriviaCategoryType;
}

export enum TriviaGameSettingsPreset {
    Normal,
    Party,
    Custom
}

// normal game settings
export const NORMAL_SINGLE_ROUND_SETTINGS = new TriviaRoundSettings(TriviaRoundType.Standard, [], 6, 5, 200, { [TriviaClueBonus.Wager]: 1 });
export const NORMAL_DOUBLE_ROUND_SETTINGS = new TriviaRoundSettings(TriviaRoundType.Standard, [], 6, 5, 400, { [TriviaClueBonus.Wager]: 2 });
export const NORMAL_FINAL_ROUND_SETTINGS = new TriviaRoundSettings(TriviaRoundType.Standard, [], 1, 1, 0, { [TriviaClueBonus.AllWager]: 1 });
export const NORMAL_ROUND_SETTINGS = [NORMAL_SINGLE_ROUND_SETTINGS, NORMAL_DOUBLE_ROUND_SETTINGS, NORMAL_FINAL_ROUND_SETTINGS];
export const NORMAL_GAME_SETTINGS = new TriviaGameSettings(2000, TriviaGameDifficulty.Normal, 5, 12, 4, NORMAL_ROUND_SETTINGS);

// party game settings
export const PARTY_SINGLE_ROUND_SETTINGS = new TriviaRoundSettings(TriviaRoundType.Standard, [], 3, 4, 250,
    { [TriviaClueBonus.Wager]: 1, [TriviaClueBonus.AllPlay]: 4 });
export const PARTY_DOUBLE_ROUND_SETTINGS = new TriviaRoundSettings(TriviaRoundType.Standard, [], 3, 4, 500,
    { [TriviaClueBonus.Wager]: 2, [TriviaClueBonus.AllPlay]: 4 });
export const PARTY_FINAL_ROUND_SETTINGS = new TriviaRoundSettings(TriviaRoundType.Standard, [], 1, 1, 0,
    { [TriviaClueBonus.AllWager]: 1 });
export const PARTY_ROUND_SETTINGS = [PARTY_SINGLE_ROUND_SETTINGS, PARTY_DOUBLE_ROUND_SETTINGS, PARTY_FINAL_ROUND_SETTINGS];
export const PARTY_GAME_SETTINGS = new TriviaGameSettings(2000, TriviaGameDifficulty.Easy, 5, 12, 4, PARTY_ROUND_SETTINGS);

// test game settings (used as a scratchpad for testing, only available in debug mode)
export const TEST_SINGLE_ROUND_SETTINGS = new TriviaRoundSettings(TriviaRoundType.Standard, [], 1, 1, 200,
    { [TriviaClueBonus.AllPlay]: 1 });
export const TEST_DOUBLE_ROUND_SETTINGS = new TriviaRoundSettings(TriviaRoundType.Standard, [], 2, 1, 400,
    { [TriviaClueBonus.Wager]: 2 });
export const TEST_FINAL_ROUND_SETTINGS = new TriviaRoundSettings(TriviaRoundType.Standard, [], 1, 1, 0,
    { [TriviaClueBonus.AllWager]: 1 });
export const TEST_ROUND_SETTINGS = [TEST_SINGLE_ROUND_SETTINGS, TEST_FINAL_ROUND_SETTINGS];
export const TEST_GAME_SETTINGS = new TriviaGameSettings(2000, TriviaGameDifficulty.Easy, 5, 12, 4, TEST_ROUND_SETTINGS);