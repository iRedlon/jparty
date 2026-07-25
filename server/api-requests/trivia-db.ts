
import dotenv from "dotenv";
import { TriviaCategorySchema, TriviaClueDifficulty, TriviaFinalClueSchema } from "jparty-shared";
import { MongoClient } from "mongodb";

import { getTestCategorySchema, getTestFinalClueSchema } from "./test-trivia-data";
import { debugLog, formatDebugLog, LogCategory, LogVerbosity } from "../misc/log";

dotenv.config();

export const TRIVIA_DB_NAME = process.env.TRIVIA_DB_NAME || "trivia";
export const CATEGORY_COLLECTION_NAME = "categories";
export const FINAL_CLUE_COLLECTION_NAME = "final-clues";

const client: MongoClient | undefined = process.env.MONGO_CONNECTION_STRING ? new MongoClient(process.env.MONGO_CONNECTION_STRING) : undefined;

function getMinRequiredCluesPerDifficulty(clueDifficultyOrder: TriviaClueDifficulty[]) {
    let minRequiredCluesPerDifficulty = 1;

    let clueCountPerDifficulty: Record<number, number> = {};

    for (const difficulty of clueDifficultyOrder) {
        if (clueCountPerDifficulty[difficulty] == undefined) {
            clueCountPerDifficulty[difficulty] = 1;
        }
        else {
            clueCountPerDifficulty[difficulty] += 1;
        }

        // the minimum number of clues we'll need of each difficulty, is the count of the difficulty that will appear the most in this category
        // i.e. if our difficulties are [2, 2, 2, 3, 5] then minPossibleCluesPerDifficulty should be 3 because we need at least 3 clues where difficulty=2
        minRequiredCluesPerDifficulty = Math.max(minRequiredCluesPerDifficulty, clueCountPerDifficulty[difficulty]);
    }

    return minRequiredCluesPerDifficulty;
}

const CATEGORY_ID_CACHE_DURATION_MS = 10 * 60 * 1000;

type CategoryIDCacheEntry = { idsPromise: Promise<any[]>, expirationTimeMs: number };
const categoryIDCache: Record<string, CategoryIDCacheEntry> = {};

function getCandidateCategoryIDs(minYear: number, maxYear: number, minRequiredCluesPerDifficulty: number) {
    const cacheKey = `${minYear}:${maxYear}:${minRequiredCluesPerDifficulty}`;

    const cachedEntry = categoryIDCache[cacheKey];
    if (cachedEntry && (Date.now() < cachedEntry.expirationTimeMs)) {
        return cachedEntry.idsPromise;
    }

    const db = client!.db(TRIVIA_DB_NAME);
    const categoryCollection = db.collection(CATEGORY_COLLECTION_NAME);

    // build a filter to remove the clues from each difficulty that fall outside of the year range
    let clueYearFilter: Record<string, Object> = {};
    for (let difficulty = TriviaClueDifficulty.Easiest; difficulty <= TriviaClueDifficulty.Hardest; difficulty++) {
        clueYearFilter[`clues.${difficulty}`] = {
            $filter: {
                input: `$clues.${difficulty}`,
                as: "clue",
                cond: {
                    $and: [
                        { $gte: ["$$clue.year", minYear] },
                        { $lte: ["$$clue.year", maxYear] }
                    ]
                }
            }
        }
    }

    // build a filter to find categories that have enough clues at each difficulty to meet the specifications
    let minRequiredCluesMatch: Record<string, Object> = {};

    for (let difficulty = TriviaClueDifficulty.Easiest; difficulty <= TriviaClueDifficulty.Hardest; difficulty++) {
        // i.e. a difficulty level is sure to have at least 3 clues in it if there's an element in its 2nd array position
        minRequiredCluesMatch[`clues.${difficulty}.${minRequiredCluesPerDifficulty - 1}`] = { $exists: true }
    }

    const idsPromise = categoryCollection.aggregate([
        { $set: clueYearFilter },
        { $match: minRequiredCluesMatch },
        { $project: { _id: 1 } }
    ]).toArray().then(docs => docs.map(doc => doc._id));

    idsPromise.catch(() => delete categoryIDCache[cacheKey]);
    categoryIDCache[cacheKey] = { idsPromise: idsPromise, expirationTimeMs: Date.now() + CATEGORY_ID_CACHE_DURATION_MS };

    return idsPromise;
}

export async function getRandomCategorySchema(minYear: number, maxYear: number, clueDifficultyOrder: TriviaClueDifficulty[]) {
    // no database means no real trivia. serve test data instead
    if (!client) {
        return getTestCategorySchema();
    }

    const db = client.db(TRIVIA_DB_NAME);
    const categoryCollection = db.collection(CATEGORY_COLLECTION_NAME);

    const minRequiredCluesPerDifficulty = getMinRequiredCluesPerDifficulty(clueDifficultyOrder);

    const candidateIDs = await getCandidateCategoryIDs(minYear, maxYear, minRequiredCluesPerDifficulty);

    for (let attempt = 0; (attempt < 3) && candidateIDs.length; attempt++) {
        const categoryID = candidateIDs[Math.floor(Math.random() * candidateIDs.length)];
        const categorySchema = await categoryCollection.findOne({ _id: categoryID }) as TriviaCategorySchema | null;
        if (!categorySchema) {
            continue;
        }

        let hasEnoughClues = true;

        for (let difficulty = TriviaClueDifficulty.Easiest; difficulty <= TriviaClueDifficulty.Hardest; difficulty++) {
            const filteredClues = (categorySchema.clues[difficulty] || []).filter(clue => (clue.year >= minYear) && (clue.year <= maxYear));
            categorySchema.clues[difficulty] = filteredClues;

            if (filteredClues.length < minRequiredCluesPerDifficulty) {
                hasEnoughClues = false;
            }
        }

        if (hasEnoughClues) {
            return categorySchema;
        }
    }

    throw new Error(formatDebugLog("couldn't generate a category with those settings"));
}

export async function getRandomFinalClueSchema(minYear: number, maxYear: number) {
    if (!client) {
        return getTestFinalClueSchema();
    }

    const db = client.db(TRIVIA_DB_NAME);
    const finalClueCollection = db.collection(FINAL_CLUE_COLLECTION_NAME);

    const docs = await finalClueCollection.aggregate([
        { $match: { year: { $gte: minYear, $lte: maxYear } } },
        { $sample: { size: 1 } }
    ]).toArray();

    if (!docs.length) {
        debugLog(LogCategory.TriviaDatabase, `no final clues available between years: ${minYear} and ${maxYear}`, LogVerbosity.Verbose);
        return undefined;
    }

    return docs[0] as unknown as TriviaFinalClueSchema;
}
