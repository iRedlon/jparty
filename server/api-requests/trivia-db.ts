
import dotenv from "dotenv";
import { TriviaCategorySchema, TriviaCategoryType, TriviaClueDifficulty } from "jparty-shared";
import { MongoClient } from "mongodb";

import { getTestCategorySchema } from "./test-trivia-data";
import { debugLog, formatDebugLog, LogCategory, LogVerbosity } from "../misc/log";

const MONGO_TRIVIA_DB_NAME = "trivia";

dotenv.config();

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

function getCandidateCategoryIDs(type: TriviaCategoryType, minYear: number, minRequiredCluesPerDifficulty: number) {
    const cacheKey = `${type}:${minYear}:${minRequiredCluesPerDifficulty}`;

    const cachedEntry = categoryIDCache[cacheKey];
    if (cachedEntry && (Date.now() < cachedEntry.expirationTimeMs)) {
        return cachedEntry.idsPromise;
    }

    const db = client!.db(MONGO_TRIVIA_DB_NAME);
    const categoryTypeCollection = db.collection(TriviaCategoryType[type].toLowerCase());

    // build a filter to remove the clues from each difficulty that are older than the minimum year
    let clueYearFilter: Record<string, Object> = {};
    for (let difficulty = TriviaClueDifficulty.Easiest; difficulty <= TriviaClueDifficulty.Hardest; difficulty++) {
        clueYearFilter[`clues.${difficulty}`] = {
            $filter: {
                input: `$clues.${difficulty}`,
                as: "clue",
                cond: { $gte: ["$$clue.year", minYear] }
            }
        }
    }

    // build a filter to find categories that have enough clues at each difficulty to meet the specifications
    let minRequiredCluesMatch: Record<string, Object> = {};

    for (let difficulty = TriviaClueDifficulty.Easiest; difficulty <= TriviaClueDifficulty.Hardest; difficulty++) {
        // i.e. a difficulty level is sure to have at least 3 clues in it if there's an element in its 2nd array position
        minRequiredCluesMatch[`clues.${difficulty}.${minRequiredCluesPerDifficulty - 1}`] = { $exists: true }
    }

    const idsPromise = categoryTypeCollection.aggregate([
        { $set: clueYearFilter },
        { $match: minRequiredCluesMatch },
        { $project: { _id: 1 } }
    ]).toArray().then(docs => docs.map(doc => doc._id));

    idsPromise.catch(() => delete categoryIDCache[cacheKey]);
    categoryIDCache[cacheKey] = { idsPromise: idsPromise, expirationTimeMs: Date.now() + CATEGORY_ID_CACHE_DURATION_MS };

    return idsPromise;
}

export async function getCategoryTypeCandidateCount(type: TriviaCategoryType, minYear: number) {
    if (!client) {
        return 1;
    }

    const candidateIDs = await getCandidateCategoryIDs(type, minYear, 1);
    return candidateIDs.length;
}

export async function getRandomCategorySchema(type: TriviaCategoryType, minYear: number, clueDifficultyOrder: TriviaClueDifficulty[]) {
    // no database means no real trivia. serve test data instead
    if (!client) {
        return getTestCategorySchema(type);
    }

    const db = client.db(MONGO_TRIVIA_DB_NAME);
    const categoryTypeCollection = db.collection(TriviaCategoryType[type].toLowerCase());

    const minRequiredCluesPerDifficulty = getMinRequiredCluesPerDifficulty(clueDifficultyOrder);
    const candidateIDs = await getCandidateCategoryIDs(type, minYear, minRequiredCluesPerDifficulty);

    for (let attempt = 0; (attempt < 3) && candidateIDs.length; attempt++) {
        const categoryID = candidateIDs[Math.floor(Math.random() * candidateIDs.length)];
        const categorySchema = await categoryTypeCollection.findOne({ _id: categoryID }) as TriviaCategorySchema | null;
        if (!categorySchema) {
            continue;
        }

        let hasEnoughClues = true;

        for (let difficulty = TriviaClueDifficulty.Easiest; difficulty <= TriviaClueDifficulty.Hardest; difficulty++) {
            const filteredClues = (categorySchema.clues[difficulty] || []).filter(clue => clue.year >= minYear);
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

// categories were organized into types by ChatGPT and it didn't do that good of a job
// put any trivia data that needs to be manually moved into this function so the operation happens on server startup
export function cleanupTriviaData() {
    if (process.env.NODE_ENV === "production") {
        return;
    }

    try {
        // updateCategoryType(29, TriviaCategoryType.Miscellaneous, TriviaCategoryType.Geography);
    }
    catch (e) {
        console.error(e);
    }
}

async function updateCategoryType(categoryID: number, oldType: TriviaCategoryType, newType: TriviaCategoryType) {
    if (!client) {
        return;
    }

    try {
        const db = client.db(MONGO_TRIVIA_DB_NAME);
        const oldCategoryCollection = db.collection(TriviaCategoryType[oldType].toLowerCase());
        const newCategoryCollection = db.collection(TriviaCategoryType[newType].toLowerCase());

        const categorySchema = await oldCategoryCollection.findOne({ id: categoryID }) as TriviaCategorySchema | null;
        if (!categorySchema) {
            debugLog(LogCategory.TriviaDatabase, `failed to find category ID: ${categoryID}, in category type: ${TriviaCategoryType[oldType]}`, LogVerbosity.Normal);
            return;
        }

        const insertResult = await newCategoryCollection.insertOne(categorySchema);
        if (!insertResult.acknowledged) {
            debugLog(LogCategory.TriviaDatabase, `failed to insert category ID: ${categoryID}, into category type: ${TriviaCategoryType[newType]}`, LogVerbosity.Normal);
            return;
        }

        const deleteResult = await oldCategoryCollection.deleteOne({ id: categoryID });
        if (!deleteResult.acknowledged) {
            debugLog(LogCategory.TriviaDatabase, `failed to remove category ID: ${categoryID}, from category type: ${TriviaCategoryType[oldType]}`, LogVerbosity.Normal);
            return;
        }

        debugLog(LogCategory.TriviaDatabase, `moved category ID: ${categoryID}, from category type: ${TriviaCategoryType[oldType]} to category type: ${TriviaCategoryType[newType]}`, LogVerbosity.Normal);
    } catch (e) {
        throw e
    }
}