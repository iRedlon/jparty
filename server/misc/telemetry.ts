
import { debugLog, LogCategory, LogVerbosity } from "./log.js";

export enum TelemetryEvent {
    GameStarted = "game_started",
    GameFinished = "game_finished",
    PlayerJoined = "player_joined",
    PlayerLeft = "player_left",
    ClueDecision = "clue_decision",
    LeaderboardChange = "leaderboard_change",
    ResponseWindowArrived = "response_window_arrived"
}

const GA_ENDPOINT = "https://www.google-analytics.com/mp/collect";

const MAX_PARAM_VALUE_LENGTH = 100;

export function sendTelemetryEvent(event: TelemetryEvent, sessionName: string, params: Record<string, string | number> = {}) {
    const measurementID = process.env.GA_MEASUREMENT_ID;
    const apiSecret = process.env.GA_API_SECRET;

    // leaving these unset disables telemetry entirely
    if (!measurementID || !apiSecret) {
        return;
    }

    for (const key in params) {
        const value = params[key];
        if ((typeof value === "string") && (value.length > MAX_PARAM_VALUE_LENGTH)) {
            params[key] = value.slice(0, MAX_PARAM_VALUE_LENGTH);
        }
    }

    const body = JSON.stringify({
        // treat each session as a distinct GA user so that "active users" really means "active sessions"
        client_id: sessionName,
        events: [{
            name: event,
            params: { session_name: sessionName, ...params }
        }]
    });

    debugLog(LogCategory.Telemetry, `sending telemetry event: ${event}`, LogVerbosity.Verbose);
    debugLog(LogCategory.Telemetry, body, LogVerbosity.VeryVerbose);

    fetch(`${GA_ENDPOINT}?measurement_id=${measurementID}&api_secret=${apiSecret}`, { method: "POST", body }).catch(e => console.error(e));
}
