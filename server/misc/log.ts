
import dotenv from "dotenv";
import { getTimeStamp } from "jparty-shared";

dotenv.config();

export enum DebugLogType {
    Server,
    ClientConnection,
    TriviaDatabase,
    Buzz,
    ClueDecision,
    Email,
    Voice,
    Leaderboard
}

export enum LogLevel {
    Normal,
    Debug,
    Verbose
}

const NORMAL_LOG_LEVEL_TYPES = [
    DebugLogType.Server
];

const DEBUG_LOG_LEVEL_TYPES = NORMAL_LOG_LEVEL_TYPES.concat([
    // DebugLogType.Buzz,
    DebugLogType.TriviaDatabase,
    // DebugLogType.ClueDecision,
    // DebugLogType.Email,
    // DebugLogType.Voice
]);

const VERBOSE_LOG_LEVEL_TYPES = DEBUG_LOG_LEVEL_TYPES.concat([
    DebugLogType.ClientConnection,
]);

// defines which systems' debug messages will be logged at each log level
export const LOG_LEVEL_TYPES: Record<LogLevel, DebugLogType[]> = {
    [LogLevel.Normal]: NORMAL_LOG_LEVEL_TYPES,
    [LogLevel.Debug]: DEBUG_LOG_LEVEL_TYPES,
    [LogLevel.Verbose]: VERBOSE_LOG_LEVEL_TYPES
};

export function debugLog(type: DebugLogType, message?: any, isVerbose?: boolean) {
    let rawLogLevel = process.env.LOG_LEVEL;
    if (!rawLogLevel) {
        throw new Error(formatDebugLog("missing environment variable: LOG_LEVEL"));
    }

    let logLevel = parseInt(rawLogLevel) as LogLevel;
    if (process.env.DEBUG_MODE) {
        logLevel = LogLevel.Debug;
    }

    const logLevelTypes = LOG_LEVEL_TYPES[logLevel];

    if (!logLevelTypes.includes(type)) {
        return;
    }

    if (isVerbose && (logLevel !== LogLevel.Verbose)) {
        return;
    }

    if (typeof message === "object") {
        console.dir(message, { depth: null });
    }
    else {
        console.log(formatDebugLog(message));
    }
}

export function formatDebugLog(message: string) {
    // don't log a timestamp in production, that environment logs a timestamp already
    const timestamp = (process.env.NODE_ENV === "production") ? "" : `(${getTimeStamp()}) `;
    
    return `${timestamp}[jparty-server]: ${message}`;
}