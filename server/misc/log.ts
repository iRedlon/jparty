
import dotenv from "dotenv";
import { getTimeStamp } from "jparty-shared";

dotenv.config();

// label for easier log searching
export enum LogCategory {
    Server = "server",
    ClientConnection = "client_connection",
    Telemetry = "telemetry",
    TriviaDatabase = "trivia_db",
    Buzz = "buzz",
    ClueDecision = "clue_decision",
    Email = "email",
    Voice = "voice",
    Leaderboard = "leaderboard",
    Timeout = "timeout"
}

export enum LogVerbosity {
    Normal,
    Verbose,
    VeryVerbose
}

export function debugLog(category: LogCategory, message: any, verbosity: LogVerbosity) {
    let logLevel = process.env.LOG_LEVEL ? (parseInt(process.env.LOG_LEVEL) as LogVerbosity) : LogVerbosity.Normal;
    if (process.env.DEBUG_MODE && (logLevel < LogVerbosity.Verbose)) {
        logLevel = LogVerbosity.Verbose;
    }

    if (verbosity > logLevel) {
        return;
    }

    if (typeof message === "object") {
        console.dir(message, { depth: null });
    }
    else {
        console.log(formatDebugLog(`[${category}] ${message}`));
    }
}

export function formatDebugLog(message: string) {
    // don't log a timestamp in production, that environment logs a timestamp already
    const timestamp = (process.env.NODE_ENV === "production") ? "" : `(${getTimeStamp()}) `;

    return `${timestamp}: ${message}`;
}
