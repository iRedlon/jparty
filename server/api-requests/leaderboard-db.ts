
import dotenv from "dotenv";
import { LeaderboardPlayerSchema, LeaderboardType, NUM_LEADERBOARD_SPOTS, PLACEHOLDER_LEADERBOARD_PLAYERS, Player } from "jparty-shared";
import { MongoClient } from "mongodb";

import { debugLog, DebugLogType, formatDebugLog } from "../misc/log";

const MONGO_LEADERBOARD_DB_NAME = "leaderboard";

dotenv.config();

if (!process.env.MONGO_CONNECTION_STRING) {
    throw new Error(formatDebugLog("missing environment variable: MONGO_CONNECTION_STRING"));
}

const client: MongoClient = new MongoClient(process.env.MONGO_CONNECTION_STRING);

export async function getLeaderboardPlayers(type: LeaderboardType) {
    try {
        const db = client.db(MONGO_LEADERBOARD_DB_NAME);
        const leaderboard = db.collection(type);

        const leaderboardPlayerSchemas = await leaderboard.find().sort({ score: -1 }).toArray();

        return leaderboardPlayerSchemas;
    } catch (e) {
        console.error(e);
    }
}

export async function addNewLeaderboardPlayer(player: Player) {
    const newLeaderboardPlayer = {
        name: player.name,
        score: player.score,
        timestampMs: Date.now()
    } as LeaderboardPlayerSchema;

    await updateLeaderboard(LeaderboardType.AllTime, newLeaderboardPlayer);
    await updateLeaderboard(LeaderboardType.Monthly, newLeaderboardPlayer);
    await updateLeaderboard(LeaderboardType.Weekly, newLeaderboardPlayer);
}

async function updateLeaderboard(type: LeaderboardType, newLeaderboardPlayer: LeaderboardPlayerSchema) {
    try {
        const db = client.db(MONGO_LEADERBOARD_DB_NAME);
        const leaderboard = db.collection(type);

        // add the new player to the leaderboard optimistically
        await leaderboard.insertOne(newLeaderboardPlayer);
        const leaderboardPlayerSchemas = await leaderboard.find().sort({ score: 1 }).toArray();

        if (!leaderboardPlayerSchemas.length) {
            debugLog(DebugLogType.Leaderboard, `didn't find any leaderboard players for leaderboard type: ${type}`);
            return;
        }

        // eliminate as many players from the leaderboard as needed to get back to our desired number of leaderboard spots
        // our array of leaderboard players is sorted in ascending order so the players on the bubble will be at the beginning of the array
        const numEliminatedLeaderboardPlayers = Math.max(0, leaderboardPlayerSchemas.length - NUM_LEADERBOARD_SPOTS);

        for (let i = 0; i < numEliminatedLeaderboardPlayers; i++) {
            await leaderboard.deleteOne({ _id: leaderboardPlayerSchemas[i]._id });
        }
    } catch (e) {
        console.error(e);
    }
}

async function clearLeaderboard(type: LeaderboardType) {
    try {
        const db = client.db(MONGO_LEADERBOARD_DB_NAME);
        const leaderboard = db.collection(type);

        await leaderboard.deleteMany();
    } catch (e) {
        throw e;
    }
}

export async function resetLeaderboard() {
    await clearLeaderboard(LeaderboardType.AllTime);
    await clearLeaderboard(LeaderboardType.Monthly);
    await clearLeaderboard(LeaderboardType.Weekly);

    for (const placeholderLeaderboardPlayer of PLACEHOLDER_LEADERBOARD_PLAYERS) {
        await updateLeaderboard(LeaderboardType.AllTime, placeholderLeaderboardPlayer);
        await updateLeaderboard(LeaderboardType.Monthly, placeholderLeaderboardPlayer);
        await updateLeaderboard(LeaderboardType.Weekly, placeholderLeaderboardPlayer);
    }
}