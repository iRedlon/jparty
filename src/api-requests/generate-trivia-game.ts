
const GAME_GENERATION_TIMEOUT_DURATION_MS = 10000;

import { getRandomCategorySchema } from "./trivia-db.js";
import { debugLog, DebugLogType, formatDebugLog } from "../misc/log.js";
import { formatText } from "../misc/text-utils.js";

import {
    CLUE_DIFFICULTY_DISTRIBUTIONS, DEFAULT_CATEGORY_TYPE_DISTRIBUTION,
    getEnumSize, getRandomChoice, getRandomNum, getWeightedRandomNum,
    RATED_CLUE_BONUS_POSITION_DISTRIBUTION, RATED_CLUE_DIFFICULTY_ORDER, TriviaCategory, TriviaCategorySettings, TriviaCategoryType, 
    TriviaClueBonus, TriviaClue, TriviaClueDifficulty, TriviaCluePosition, TriviaClueSchema, TriviaGame, TriviaGameSettings, TriviaRoundSettings, TriviaRound,
} from "jparty-shared";

function generateTriviaClue(roundSettings: TriviaRoundSettings, clueSchema: TriviaClueSchema, clueIndex: number) {
    clueSchema.question = formatText(clueSchema.question);
    clueSchema.answer = formatText(clueSchema.answer);

    return new TriviaClue(clueSchema, roundSettings.clueValueStep, clueIndex);
}

// see glossary/clue difficulty order
function rollClueDifficultyOrder(gameSettings: TriviaGameSettings, roundSettings: TriviaRoundSettings): TriviaClueDifficulty[] {
    // many categories have exactly 5 clues (1 of each difficulty, in other words: [1, 2, 3, 4, 5])
    // allowing randomization of clue difficulty order when querying for exactly 5 clues would make such cateories much less likely to ever appear
    // i.e. to use a category like that we'd need exactly: [1, 2, 3, 4, 5] but we'd probably get something like [2, 2, 3, 4, 4] instead
    // to prevent this outcome... simply use the hard coded difficulty order of [1, 2, 3, 4, 5]
    if (gameSettings.getRating().isRated) {
        return RATED_CLUE_DIFFICULTY_ORDER;
    }

    const clueDifficultyDistribution = CLUE_DIFFICULTY_DISTRIBUTIONS[gameSettings.difficulty];

    let clueDifficultyOrder: TriviaClueDifficulty[] = [];
    for (let clueIndex = 0; clueIndex < roundSettings.numClues; clueIndex++) {
        clueDifficultyOrder.push(getWeightedRandomNum(clueDifficultyDistribution));
    }

    // clues should appear in increasing order of difficulty (and thus, value) i.e. $200, $400, $600...
    return clueDifficultyOrder.sort((a, b) => { return a - b; });
}

async function generateTriviaCategory(gameSettings: TriviaGameSettings, roundSettings: TriviaRoundSettings, categorySettings: TriviaCategorySettings) {
    const clueDifficultyOrder = rollClueDifficultyOrder(gameSettings, roundSettings);

    let categorySchema;

    try {
        categorySchema = await getRandomCategorySchema(categorySettings.type, gameSettings.minClueYear, clueDifficultyOrder);
    }
    catch (e) {
        throw e;
    }

    categorySchema.name = formatText(categorySchema.name);

    let triviaCategory = new TriviaCategory(categorySettings, categorySchema);

    // generate a clue for each difficulty in the rolled order
    let clueIndex = 0;
    let usedClueIDs: number[] = [];

    while (triviaCategory.clues.length < roundSettings.numClues) {
        const clueDifficulty = clueDifficultyOrder[clueIndex];
        const clueSchema = getRandomChoice<TriviaClueSchema>(categorySchema.clues[clueDifficulty]);

        if (usedClueIDs.includes(clueSchema.id)) {
            continue;
        }

        const triviaClue = generateTriviaClue(roundSettings, clueSchema, clueIndex);

        triviaCategory.clues.push(triviaClue);
        usedClueIDs.push(clueSchema.id);
        clueIndex++;
    }

    return triviaCategory;
}

function rollCategoryTypeOrder(roundSettings: TriviaRoundSettings) {
    // the combined probability of all banned category types should be redistributed evenly across the remaining types
    // i.e. if we have { 0: 0.25, 1: 0.25, 2: 0.25, 3: 0.25 }, banning 0 and 1 would yield { 0: 0, 1: 0, 2: 0.5, 3: 0.5 }
    let categoryTypeDistribution = DEFAULT_CATEGORY_TYPE_DISTRIBUTION;
    let totalBannedProbability = 0;

    for (const categoryType of roundSettings.bannedCategoryTypes) {
        // we prevent a banned type from being selected by settings its probability to 0
        categoryTypeDistribution[categoryType] = 0;
        totalBannedProbability += DEFAULT_CATEGORY_TYPE_DISTRIBUTION[categoryType];
    }

    const redistributedProbability = totalBannedProbability / (getEnumSize(TriviaCategoryType) - roundSettings.bannedCategoryTypes.length);

    for (const categoryType in categoryTypeDistribution) {
        categoryTypeDistribution[parseInt(categoryType) as TriviaCategoryType] += redistributedProbability;
    }

    let categoryTypeOrder: TriviaCategoryType[] = [];
    for (let categoryIndex = 0; categoryIndex < roundSettings.numCategories; categoryIndex++) {
        categoryTypeOrder.push(getWeightedRandomNum(categoryTypeDistribution));
    }

    return categoryTypeOrder;
}

async function generateTriviaRound(gameSettings: TriviaGameSettings, roundSettings: TriviaRoundSettings) {
    let triviaRound = new TriviaRound(roundSettings, []);

    const categoryTypeOrder = rollCategoryTypeOrder(roundSettings);

    // generate a category for each type that was rolled above
    let categoryIndex = 0;
    let usedCategoryIDs: number[] = [];

    while (triviaRound.categories.length < roundSettings.numCategories) {
        let categorySettings = { type: categoryTypeOrder[categoryIndex] } as TriviaCategorySettings;

        let triviaCategory;

        try {
            triviaCategory = await generateTriviaCategory(gameSettings, roundSettings, categorySettings);
        }
        catch (e) {
            throw e;
        }

        if (usedCategoryIDs.includes(triviaCategory.id)) {
            continue;
        }

        triviaRound.categories.push(triviaCategory);
        usedCategoryIDs.push(triviaCategory.id);
        categoryIndex++;
    }

    return triviaRound;
}

// apply clue bonuses to the specified number of clues after the game is fully generated from static data
function addClueBonuses(triviaGame: TriviaGame) {
    for (let roundIndex = 0; roundIndex < triviaGame.settings.roundSettings.length; roundIndex++) {
        const roundSettings = triviaGame.settings.roundSettings[roundIndex];

        let usedCategoryIDs: number[] = [];
        let usedCluePositions: string[] = [];

        for (const _ of Object.keys(TriviaClueBonus)) {
            const clueBonus: TriviaClueBonus = parseInt(_);
            const bonusCount = roundSettings.clueBonusCounts[clueBonus];

            // skip any clue bonus that doesn't have a specified count
            if (bonusCount === undefined) {
                continue;
            }

            let cluesAssigned = 0;

            while (cluesAssigned < bonusCount) {
                const categoryIndex = getRandomNum(roundSettings.numCategories);
                const clueIndex = triviaGame.settings.getRating().isRated ? getWeightedRandomNum(RATED_CLUE_BONUS_POSITION_DISTRIBUTION) : getRandomNum(roundSettings.numClues);

                // our weight RNG may give us an index that doesn't exist within this category
                if (clueIndex >= roundSettings.numClues) {
                    continue;
                }

                // prefer to prevent the same bonus from showing up twice in the same category unless we have no other choice
                if (usedCategoryIDs.includes(categoryIndex) && usedCategoryIDs.length < roundSettings.numCategories) {
                    continue;
                }

                let position = { categoryIndex: categoryIndex, clueIndex: clueIndex } as TriviaCluePosition;

                if (usedCluePositions.includes(JSON.stringify(position))) {
                    continue;
                }

                const categoryName = triviaGame.rounds[roundIndex].categories[categoryIndex].name;
                const clueValue = triviaGame.rounds[roundIndex].categories[categoryIndex].clues[clueIndex].value;

                debugLog(DebugLogType.GameGeneration, `adding ${TriviaClueBonus[clueBonus]} to \"${categoryName}\" for $${clueValue}`);

                triviaGame.rounds[roundIndex].categories[categoryIndex].clues[clueIndex].bonus = clueBonus;

                usedCategoryIDs.push(categoryIndex);
                usedCluePositions.push(JSON.stringify(position));
                cluesAssigned++;
            }
        }
    }
}

export async function generateTriviaGame(gameSettings: TriviaGameSettings) {
    let triviaGame = new TriviaGame(gameSettings, []);

    // terminate this game generation attempt if it takes too long
    let timeout = false;
    setTimeout(() => {
        timeout = true;
    }, GAME_GENERATION_TIMEOUT_DURATION_MS);

    let roundIndex = 0;

    while (!timeout && triviaGame.rounds.length < gameSettings.roundSettings.length) {
        let roundSettings = gameSettings.roundSettings[roundIndex];

        let triviaRound;

        try {
            triviaRound = await generateTriviaRound(gameSettings, roundSettings);
        }
        catch (e) {
            throw e;
        }

        triviaGame.rounds.push(triviaRound);
        roundIndex++;
    }

    debugLog(DebugLogType.GameGeneration, `finished generating trivia game`);
    debugLog(DebugLogType.GameGeneration, triviaGame, true);

    if (timeout) {
        throw new Error(formatDebugLog("the game generation process timed out"));
    }

    addClueBonuses(triviaGame);

    return triviaGame;
}