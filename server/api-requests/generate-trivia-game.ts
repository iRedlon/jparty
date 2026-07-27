
import {
    CLUE_DIFFICULTY_DISTRIBUTIONS,
    getRandomChoice, getRandomNum, getWeightedRandomNum,
    RATED_CLUE_BONUS_POSITION_DISTRIBUTION, RATED_CLUE_DIFFICULTY_ORDER, TriviaCategory, TriviaCategorySchema,
    TriviaClueBonus, TriviaClue, TriviaClueDifficulty, TriviaCluePosition, TriviaClueSchema, TriviaGame, TriviaGameSettings, TriviaRoundSettings, TriviaRound,
} from "jparty-shared";

import { getRandomCategorySchema, getRandomFinalClueSchema } from "./trivia-db.js";
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

async function generateTriviaCategory(gameSettings: TriviaGameSettings, roundSettings: TriviaRoundSettings, deadlineMs: number) {
    checkGameGenerationTimeout(deadlineMs);

    const clueDifficultyOrder = rollClueDifficultyOrder(gameSettings, roundSettings);

    let categorySchema;

    try {
        categorySchema = await getRandomCategorySchema(gameSettings.minClueYear, gameSettings.maxClueYear, clueDifficultyOrder);
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

    let triviaCategory = new TriviaCategory(categorySchema);

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

function isFinalWagerRound(roundSettings: TriviaRoundSettings) {
    return (roundSettings.numCategories === 1) &&
        (roundSettings.numClues === 1) &&
        ((roundSettings.clueBonusCounts[TriviaClueBonus.AllWager] || 0) > 0);
}

async function generateFinalWagerCategory(gameSettings: TriviaGameSettings, roundSettings: TriviaRoundSettings) {
    const finalClueSchema = await getRandomFinalClueSchema(gameSettings.minClueYear, gameSettings.maxClueYear);
    if (!finalClueSchema) {
        return;
    }

    const categorySchema: TriviaCategorySchema = {
        id: finalClueSchema.id,
        name: formatText(finalClueSchema.category_name),
        clues: {} as Record<TriviaClueDifficulty, TriviaClueSchema[]>
    };

    let triviaCategory = new TriviaCategory(categorySchema);

    const clueSchema: TriviaClueSchema = {
        id: finalClueSchema.id,
        category_id: finalClueSchema.id,
        question: finalClueSchema.question,
        answer: finalClueSchema.answer,
        difficulty: TriviaClueDifficulty.Hardest,
        year: finalClueSchema.year
    };

    triviaCategory.clues = [generateTriviaClue(roundSettings, clueSchema, 0)];

    return triviaCategory;
}

async function generateTriviaRound(gameSettings: TriviaGameSettings, roundSettings: TriviaRoundSettings, deadlineMs: number) {
    let triviaRound = new TriviaRound(roundSettings, []);

    if (isFinalWagerRound(roundSettings)) {
        const finalWagerCategory = await generateFinalWagerCategory(gameSettings, roundSettings);

        if (finalWagerCategory) {
            triviaRound.categories.push(finalWagerCategory);
            return triviaRound;
        }

        debugLog(LogCategory.TriviaDatabase,
            `couldn't find a final clue between ${gameSettings.minClueYear} and ${gameSettings.maxClueYear}, falling back to a normal category`,
            LogVerbosity.Normal);
    }

    let usedCategoryIDs: number[] = [];
    let hasQuotationCategory = false;

    while (triviaRound.categories.length < roundSettings.numCategories) {
        checkGameGenerationTimeout(deadlineMs);

        let triviaCategory;

        try {
            triviaCategory = await generateTriviaCategory(gameSettings, roundSettings, deadlineMs);
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
    }

    return triviaRound;
}

// rated games prefer their bonuses in the middle of the board. that preference only means something if the round is
// deep enough to have those positions in the first place: a final round is a single clue sitting at position 0
function canUseRatedClueBonusPosition(roundSettings: TriviaRoundSettings) {
    return Object.entries(RATED_CLUE_BONUS_POSITION_DISTRIBUTION)
        .some(([_, weight]) => (parseInt(_) < roundSettings.numClues) && (weight > 0));
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

            const useRatedCluePosition = triviaGame.settings.getRating().isRated && canUseRatedClueBonusPosition(roundSettings);

            while ((cluesAssigned < bonusCount) && (++assignAttempts <= maxAssignAttempts)) {
                const categoryIndex = getRandomNum(roundSettings.numCategories);
                const clueIndex = useRatedCluePosition ? getWeightedRandomNum(RATED_CLUE_BONUS_POSITION_DISTRIBUTION) : getRandomNum(roundSettings.numClues);

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

            if (cluesAssigned < bonusCount) {
                debugLog(LogCategory.TriviaDatabase,
                    `failed to add ${bonusCount - cluesAssigned}/${bonusCount} ${TriviaClueBonus[clueBonus]} bonuses to round ${roundIndex + 1}`,
                    LogVerbosity.Normal);
            }
        }
    }
}

export async function generateTriviaGame(gameSettings: TriviaGameSettings) {

    debugLog(LogCategory.TriviaDatabase, `started generating trivia game`, LogVerbosity.Normal);

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