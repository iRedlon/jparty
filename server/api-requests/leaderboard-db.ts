
import dotenv from "dotenv";
import { LeaderboardPlayers, LeaderboardPlayerSchema, LeaderboardStatsSchema, LeaderboardType, NUM_LEADERBOARD_SPOTS, PLACEHOLDER_LEADERBOARD_PLAYERS, Player } from "jparty-shared";
import { MongoClient } from "mongodb";

import { AnalyticsEvent, sendAnalyticsEvent } from "../misc/analytics";
import { debugLog, LogCategory, LogVerbosity } from "../misc/log";

const MONGO_LEADERBOARD_DB_NAME = "leaderboard";
const MONGO_LEADERBOARD_STATS_COLLECTION_NAME = "stats";

dotenv.config();

const client: MongoClient | undefined = process.env.MONGO_CONNECTION_STRING ? new MongoClient(process.env.MONGO_CONNECTION_STRING) : undefined;
const useFakeLeaderboard = !!process.env.DEBUG_MODE || !client;

function createFakeLeaderboard(): LeaderboardPlayers {
    return PLACEHOLDER_LEADERBOARD_PLAYERS.slice(0, 3).map(schema => ({ ...schema }));
}

const fakeLeaderboards: Record<LeaderboardType, LeaderboardPlayers> = {
    [LeaderboardType.AllTime]: createFakeLeaderboard(),
    [LeaderboardType.Monthly]: createFakeLeaderboard(),
    [LeaderboardType.Weekly]: createFakeLeaderboard()
};

const fakeLeaderboardStats: Record<LeaderboardType, LeaderboardStatsSchema> = {
    [LeaderboardType.AllTime]: { gamesPlayed: 1252125, moneyEarned: 23523211 },
    [LeaderboardType.Monthly]: { gamesPlayed: 500, moneyEarned: 135212 },
    [LeaderboardType.Weekly]: { gamesPlayed: 23, moneyEarned: 10 }
};

export async function getLeaderboardPlayers(type: LeaderboardType) {
    if (useFakeLeaderboard) {
        return [...fakeLeaderboards[type]].sort((a, b) => b.score - a.score);
    }

    try {
        const db = client.db(MONGO_LEADERBOARD_DB_NAME);
        const leaderboard = db.collection(type);

        return await leaderboard.find().sort({ score: -1 }).toArray();
    } catch (e) {
        console.error(e);
    }
}

export async function getLeaderboardStats(type: LeaderboardType): Promise<LeaderboardStatsSchema | undefined> {
    if (useFakeLeaderboard) {
        return fakeLeaderboardStats[type];
    }

    try {
        const db = client.db(MONGO_LEADERBOARD_DB_NAME);
        const stats = db.collection(MONGO_LEADERBOARD_STATS_COLLECTION_NAME);

        const statsSchema = await stats.findOne({ type: type });

        return { gamesPlayed: statsSchema?.gamesPlayed || 0, moneyEarned: statsSchema?.moneyEarned || 0 };
    } catch (e) {
        console.error(e);
    }
}

// record a completed game onto each leaderboard's running stats
export async function recordLeaderboardGameStats(moneyEarned: number) {
    if (useFakeLeaderboard) {
        for (const type of Object.values(LeaderboardType)) {
            fakeLeaderboardStats[type].gamesPlayed++;
            fakeLeaderboardStats[type].moneyEarned += moneyEarned;
        }

        return;
    }

    for (const type of Object.values(LeaderboardType)) {
        try {
            const db = client.db(MONGO_LEADERBOARD_DB_NAME);
            const stats = db.collection(MONGO_LEADERBOARD_STATS_COLLECTION_NAME);

            await stats.updateOne({ type: type }, { $inc: { gamesPlayed: 1, moneyEarned: moneyEarned } }, { upsert: true });
        } catch (e) {
            console.error(e);
        }
    }
}

export async function addNewLeaderboardPlayer(player: Player, sessionName?: string) {
    const newLeaderboardPlayer = {
        name: player.name,
        score: player.score,
        timestampMs: Date.now()
    } as LeaderboardPlayerSchema;

    const allTimeSpot = await updateLeaderboard(LeaderboardType.AllTime, newLeaderboardPlayer, sessionName);
    const monthlySpot = await updateLeaderboard(LeaderboardType.Monthly, newLeaderboardPlayer, sessionName);
    const weeklySpot = await updateLeaderboard(LeaderboardType.Weekly, newLeaderboardPlayer, sessionName);

    if (allTimeSpot) player.claimedLeaderboardSpots[LeaderboardType.AllTime] = allTimeSpot;
    if (monthlySpot) player.claimedLeaderboardSpots[LeaderboardType.Monthly] = monthlySpot;
    if (weeklySpot) player.claimedLeaderboardSpots[LeaderboardType.Weekly] = weeklySpot;
}

async function updateLeaderboard(type: LeaderboardType, newLeaderboardPlayer: LeaderboardPlayerSchema, sessionName?: string): Promise<number | undefined> {
    if (useFakeLeaderboard) {
        const insertedPlayer = { ...newLeaderboardPlayer };
        const fakeLeaderboard = fakeLeaderboards[type];

        fakeLeaderboard.push(insertedPlayer);
        fakeLeaderboard.sort((a, b) => b.score - a.score);
        fakeLeaderboard.splice(NUM_LEADERBOARD_SPOTS);

        const spotIndex = fakeLeaderboard.indexOf(insertedPlayer);
        return (spotIndex >= 0) ? (spotIndex + 1) : undefined;
    }

    try {
        const db = client.db(MONGO_LEADERBOARD_DB_NAME);
        const leaderboard = db.collection(type);

        // add the new player to the leaderboard optimistically
        const insertResult = await leaderboard.insertOne(newLeaderboardPlayer);

        const leaderboardPlayerSchemas = await leaderboard.find().sort({ score: 1 }).toArray();

        if (!leaderboardPlayerSchemas.length) {
            debugLog(LogCategory.Leaderboard, `didn't find any leaderboard players for leaderboard type: ${type}`, LogVerbosity.Normal);
            return;
        }

        // eliminate as many players from the leaderboard as needed to get back to our desired number of leaderboard spots
        // our array of leaderboard players is sorted in ascending order so the players on the bubble will be at the beginning of the array
        const numEliminatedLeaderboardPlayers = Math.max(0, leaderboardPlayerSchemas.length - NUM_LEADERBOARD_SPOTS);

        for (let i = 0; i < numEliminatedLeaderboardPlayers; i++) {
            await leaderboard.deleteOne({ _id: leaderboardPlayerSchemas[i]._id });
        }

        if (!sessionName) {
            return;
        }

        const newPlayerIndex = leaderboardPlayerSchemas.findIndex(schema => schema._id.equals(insertResult.insertedId));
        if (newPlayerIndex < numEliminatedLeaderboardPlayers) {
            return;
        }

        const leaderboardSpot = leaderboardPlayerSchemas.length - newPlayerIndex;

        sendAnalyticsEvent(AnalyticsEvent.LeaderboardChange, sessionName, {
            player_name: newLeaderboardPlayer.name,
            leaderboard_type: type,
            leaderboard_spot: leaderboardSpot,
            leaderboard_score: newLeaderboardPlayer.score
        });

        return leaderboardSpot;
    } catch (e) {
        console.error(e);
    }
}

async function clearLeaderboard(type: LeaderboardType) {
    if (useFakeLeaderboard) {
        fakeLeaderboards[type] = createFakeLeaderboard();
        fakeLeaderboardStats[type] = { gamesPlayed: 0, moneyEarned: 0 };
        return;
    }

    try {
        const db = client.db(MONGO_LEADERBOARD_DB_NAME);
        const leaderboard = db.collection(type);

        await leaderboard.deleteMany();

        const stats = db.collection(MONGO_LEADERBOARD_STATS_COLLECTION_NAME);
        await stats.updateOne({ type: type }, { $set: { gamesPlayed: 0, moneyEarned: 0 } }, { upsert: true });
    } catch (e) {
        console.error(e);
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