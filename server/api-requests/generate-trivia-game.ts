
import {
    CLUE_DIFFICULTY_DISTRIBUTIONS,
    getEnumSize, getRandomChoice, getRandomNum, getWeightedRandomNum,
    RATED_CLUE_BONUS_POSITION_DISTRIBUTION, RATED_CLUE_DIFFICULTY_ORDER, TriviaCategory, TriviaCategorySettings, TriviaCategoryType,
    TriviaClueBonus, TriviaClue, TriviaClueDifficulty, TriviaCluePosition, TriviaClueSchema, TriviaGame, TriviaGameSettings, TriviaRoundSettings, TriviaRound,
} from "jparty-shared";

import { getCategoryTypeCandidateCount, getRandomCategorySchema } from "./trivia-db.js";
import { debugLog, formatDebugLog, LogCategory, LogVerbosity } from "../misc/log.js";
import { formatText, getQuotedCategoryTexts } from "../misc/text-utils.js";

const GAME_GENERATION_TIMEOUT_DURATION_MS = 10000;

function checkGameGenerationTimeout(deadlineMs: number) {
    if (Date.now() > deadlineMs) {
        throw new Error(formatDebugLog("the game generation process timed out"));
    }
}

function generateTriviaClue(roundSettings: TriviaRoundSettings, clueSchema: TriviaClueSchema, clueIndex: number) {
    clueSchema.question = formatText(clueSchema.question);
    clueSchema.answer = formatText(clueSchema.answer);

    return new TriviaClue(clueSchema, roundSettings.clueValueStep, clueIndex);
}

/*
Clue difficulty order:
An array storing the increasing order of clue difficulties that will appear in a category

- For a rated game: this order is always: [1, 2, 3, 4, 5]. In other words, each category features one clue of each difficulty
- For a custom game: this order can be weighted to control the difficulty (i.e. [1, 1, 2, 2, 3] for an easier category or [2, 3, 4, 5, 5] for a harder category)
- This system is also how we support categories with more than 5 clues. In order to spread out the difficulty across a longer category the order may look like: [1, 1, 2, 3, 3, 4, 4, 5, 5, 5]
- Difficulty order is found prior to generating the category, then we use it as a filter to specifically select for a category that can accommodate those settings
*/
function rollClueDifficultyOrder(gameSettings: TriviaGameSettings, roundSettings: TriviaRoundSettings): TriviaClueDifficulty[] {
    if (gameSettings.getRating().isRated) {
        if (roundSettings.numClues === 1) {
            return [getRandomChoice([TriviaClueDifficulty.Normal, TriviaClueDifficulty.Hard])];
        }

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

async function generateTriviaCategory(gameSettings: TriviaGameSettings, roundSettings: TriviaRoundSettings, categorySettings: TriviaCategorySettings, deadlineMs: number) {
    checkGameGenerationTimeout(deadlineMs);

    const clueDifficultyOrder = rollClueDifficultyOrder(gameSettings, roundSettings);

    let categorySchema;

    try {
        categorySchema = await getRandomCategorySchema(categorySettings.type, gameSettings.minClueYear, clueDifficultyOrder);
    }
    catch (e) {
        throw e;
    }

    categorySchema.name = formatText(categorySchema.name);

    const likelyToBeImageClue = (clue: string) => {
        const imageClueKeywords = ["seen here", "pictured here", "featured here", "shown here"];
        return imageClueKeywords.some(keyword => clue.toLowerCase().includes(keyword));
    }

    for (let difficulty = TriviaClueDifficulty.Easiest; difficulty <= TriviaClueDifficulty.Hardest; difficulty++) {
        categorySchema.clues[difficulty] = (categorySchema.clues[difficulty] || []).filter((clueSchema: TriviaClueSchema) => !likelyToBeImageClue(clueSchema.question));
    }

    let triviaCategory = new TriviaCategory(categorySettings, categorySchema);

    // generate a clue for each difficulty in the rolled order
    let clueIndex = 0;
    let usedClueIDs = new Set<number>();
    let usedAnswers = new Set<string>();

    const isDuplicateAnswer = (answer: string) => {
        const answerInCategoryName = triviaCategory.name.toLowerCase().includes(answer.toLowerCase());
        return !answerInCategoryName && usedAnswers.has(answer);
    }

    let pickAttempts = 0;
    const maxPickAttempts = roundSettings.numClues * 20;

    while (triviaCategory.clues.length < roundSettings.numClues) {
        if (++pickAttempts > maxPickAttempts) {
            debugLog(LogCategory.TriviaDatabase, `failed to pick enough unique clues for "${triviaCategory.name}", trying a different category`, LogVerbosity.Verbose);
            return;
        }

        const clueDifficulty = clueDifficultyOrder[clueIndex];
        const possibleClues = categorySchema.clues[clueDifficulty];

        if (!possibleClues.length) {
            debugLog(LogCategory.TriviaDatabase, `ran out of usable clues for "${triviaCategory.name}", trying a different category`, LogVerbosity.Verbose);
            return;
        }

        let clueSchema: TriviaClueSchema = getRandomChoice<TriviaClueSchema>(possibleClues);

        let attempts = 0;

        // ensure category doesn't have two clues with the same answer
        while (isDuplicateAnswer(clueSchema.answer) && attempts < 10) {
            clueSchema = getRandomChoice<TriviaClueSchema>(possibleClues);
            attempts++;
        }

        usedAnswers.add(clueSchema.answer);

        if (usedClueIDs.has(clueSchema.id)) {
            continue;
        }

        const triviaClue = generateTriviaClue(roundSettings, clueSchema, clueIndex);

        triviaCategory.clues.push(triviaClue);
        usedClueIDs.add(clueSchema.id);
        clueIndex++;
    }

    return triviaCategory;
}

async function rollCategoryTypeOrder(gameSettings: TriviaGameSettings, roundSettings: TriviaRoundSettings) {
    // weight each category type by the size of its candidate pool so that every category in the
    // database has an equal chance of being selected
    let categoryTypeDistribution: Record<number, number> = {};

    for (let type = 0; type < getEnumSize(TriviaCategoryType); type++) {
        if (roundSettings.bannedCategoryTypes.includes(type)) {
            // we prevent a banned type from being selected by setting its weight to 0
            categoryTypeDistribution[type] = 0;
            continue;
        }

        categoryTypeDistribution[type] = await getCategoryTypeCandidateCount(type, gameSettings.minClueYear);
    }

    let categoryTypeOrder: TriviaCategoryType[] = [];
    for (let categoryIndex = 0; categoryIndex < roundSettings.numCategories; categoryIndex++) {
        categoryTypeOrder.push(getWeightedRandomNum(categoryTypeDistribution));
    }

    return categoryTypeOrder;
}

async function generateTriviaRound(gameSettings: TriviaGameSettings, roundSettings: TriviaRoundSettings, deadlineMs: number) {
    let triviaRound = new TriviaRound(roundSettings, []);

    const categoryTypeOrder = await rollCategoryTypeOrder(gameSettings, roundSettings);

    // generate a category for each type that was rolled above
    let categoryIndex = 0;
    let usedCategoryIDs: number[] = [];
    let hasQuotationCategory = false;

    while (triviaRound.categories.length < roundSettings.numCategories) {
        checkGameGenerationTimeout(deadlineMs);

        let categorySettings = { type: categoryTypeOrder[categoryIndex] } as TriviaCategorySettings;

        let triviaCategory;

        try {
            triviaCategory = await generateTriviaCategory(gameSettings, roundSettings, categorySettings, deadlineMs);
        }
        catch (e) {
            throw e;
        }

        if (!triviaCategory) {
            continue;
        }

        if (usedCategoryIDs.includes(triviaCategory.id)) {
            continue;
        }

        if (getQuotedCategoryTexts(triviaCategory.name).length) {
            const roundHasAllWager = (roundSettings.clueBonusCounts[TriviaClueBonus.AllWager] || 0) > 0;
            if (hasQuotationCategory || roundHasAllWager) {
                continue;
            }

            hasQuotationCategory = true;
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

            let assignAttempts = 0;
            const maxAssignAttempts = 1000;

            while ((cluesAssigned < bonusCount) && (++assignAttempts <= maxAssignAttempts)) {
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

                debugLog(LogCategory.TriviaDatabase, `adding ${TriviaClueBonus[clueBonus]} to \"${categoryName}\" for $${clueValue}`, LogVerbosity.Verbose);

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
    const deadlineMs = Date.now() + GAME_GENERATION_TIMEOUT_DURATION_MS;

    let roundIndex = 0;

    while (triviaGame.rounds.length < gameSettings.roundSettings.length) {
        checkGameGenerationTimeout(deadlineMs);

        let roundSettings = gameSettings.roundSettings[roundIndex];

        let triviaRound;

        try {
            triviaRound = await generateTriviaRound(gameSettings, roundSettings, deadlineMs);
        }
        catch (e) {
            throw e;
        }

        triviaGame.rounds.push(triviaRound);
        roundIndex++;
    }

    debugLog(LogCategory.TriviaDatabase, `finished generating trivia game`, LogVerbosity.Normal);
    debugLog(LogCategory.TriviaDatabase, triviaGame, LogVerbosity.VeryVerbose);

    addClueBonuses(triviaGame);

    return triviaGame;
}