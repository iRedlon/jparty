
import { ClientSocket, ReservedEvent } from "jparty-shared";
import { io } from "socket.io-client";

const url = (process.env.NODE_ENV === "production") ? "" : `http://localhost:${process.env.SERVER_PORT}`;

const options = { transports: ["websocket", "polling"] };

export const socket = process.env.REACT_APP_OFFLINE ? io(options) : io(url, options);

// estimate the offset between the server's clock and this client's clock
const CLOCK_SYNC_SAMPLES = 3;
let serverClockOffsetMs = 0;
let bestClockSyncRttMs = Infinity;

function syncClock() {
    for (let i = 0; i < CLOCK_SYNC_SAMPLES; i++) {
        const sentTimeMs = Date.now();
        socket.emit(ClientSocket.SyncClock, (serverTimeMs: number) => {
            const rttMs = Date.now() - sentTimeMs;

            // the sample with the lowest round trip time gives the most accurate offset estimate
            if (rttMs < bestClockSyncRttMs) {
                bestClockSyncRttMs = rttMs;
                serverClockOffsetMs = serverTimeMs - (sentTimeMs + (rttMs / 2));
            }
        });
    }
}

socket.on(ReservedEvent.Connect, () => {
    bestClockSyncRttMs = Infinity;
    syncClock();
});

// convert a timestamp on the server's clock to this client's clock
export function estimateClientTimeMs(serverTimeMs: number) {
    return serverTimeMs - serverClockOffsetMs;
}