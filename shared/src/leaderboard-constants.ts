
export const MAX_EARNED_REVERSAL_SCORE_FOR_LEADERBOARD = 2000;
export const NUM_LEADERBOARD_SPOTS = 10;

// DO NOT TOUCH: leaderboard database relies on these enum values
export enum LeaderboardType {
    AllTime = "all-time",
    Monthly = "monthly",
    Weekly = "weekly"
}

// DO NOT TOUCH: leaderboard database relies on this schema signature
export interface LeaderboardPlayerSchema {
    name: string;
    score: number;
    timestampMs: number;
}

export type LeaderboardPlayers = LeaderboardPlayerSchema[];
export const PLACEHOLDER_LEADERBOARD_PLAYERS: LeaderboardPlayers = [
    {
        name: "luffy",
        score: 10,
        timestampMs: 0
    } as LeaderboardPlayerSchema,
    {
        name: "zoro",
        score: 9,
        timestampMs: 0
    } as LeaderboardPlayerSchema,
    {
        name: "nami",
        score: 8,
        timestampMs: 0
    } as LeaderboardPlayerSchema,
    {
        name: "usopp",
        score: 7,
        timestampMs: 0
    } as LeaderboardPlayerSchema,
    {
        name: "sanji",
        score: 6,
        timestampMs: 0
    } as LeaderboardPlayerSchema,
    {
        name: "chopper",
        score: 5,
        timestampMs: 0
    } as LeaderboardPlayerSchema,
    {
        name: "robin",
        score: 4,
        timestampMs: 0
    } as LeaderboardPlayerSchema,
    {
        name: "franky",
        score: 3,
        timestampMs: 0
    } as LeaderboardPlayerSchema,
    {
        name: "brook",
        score: 2,
        timestampMs: 0
    } as LeaderboardPlayerSchema,
    {
        name: "jinbe",
        score: 1,
        timestampMs: 0
    } as LeaderboardPlayerSchema,
]