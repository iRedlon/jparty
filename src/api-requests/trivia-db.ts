
const MONGO_TRIVIA_DB_NAME = "trivia";

import { formatDebugLog } from "../misc/log";

import dotenv from "dotenv";
import { TriviaCategorySchema, TriviaCategoryType, TriviaClueDifficulty } from "jparty-shared";
import { MongoClient } from "mongodb";

dotenv.config();

if (!process.env.MONGO_CONNECTION_STRING) {
    throw new Error(formatDebugLog("missing environment variable: MONGO_CONNECTION_STRING"));
}

const client: MongoClient = new MongoClient(process.env.MONGO_CONNECTION_STRING);

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

export async function getRandomCategorySchema(type: TriviaCategoryType, minYear: number, clueDifficultyOrder: TriviaClueDifficulty[]) {
    try {
        const db = client.db(MONGO_TRIVIA_DB_NAME);
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
        const minRequiredCluesPerDifficulty = getMinRequiredCluesPerDifficulty(clueDifficultyOrder);

        for (let difficulty = TriviaClueDifficulty.Easiest; difficulty <= TriviaClueDifficulty.Hardest; difficulty++) {
            // i.e. a difficulty level is sure to have at least 3 clues in it if there's an element in its 2nd array position
            minRequiredCluesMatch[`clues.${difficulty}.${minRequiredCluesPerDifficulty - 1}`] = { $exists: true }
        }

        // generate exactly one category based on our filters
        const categorySchemas = await categoryTypeCollection.aggregate([
            { $set: clueYearFilter },
            { $match: minRequiredCluesMatch },
            { $sample: { size: 1 } }
        ]).toArray();

        if (categorySchemas.length === 1) {
            const categorySchema = categorySchemas[0];
            return categorySchema as TriviaCategorySchema;
        }

        throw new Error(formatDebugLog("couldn't generate a category with those settings"));
    }
    catch (e) {
        throw e;
    }
}