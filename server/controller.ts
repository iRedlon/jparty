
import compression from "compression";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { ClientSocket, ClientSocketCallback, Feedback, HostSocket, PlayerSocket, ReservedEvent, ServerSocket } from "jparty-shared";
import path from "path";
import { Server, Socket } from "socket.io";
import { fileURLToPath } from "url";

import { handleSubmitFeedback } from "./api-requests/feedback.js";
import { streamVoiceAudio } from "./api-requests/tts.js";
//import { cleanupTriviaData } from "./api-requests/trivia-db.js";
import { debugLog, LogCategory, LogVerbosity } from "./misc/log.js";
import handleHostEvent from "./session/handle-host-event.js";
import handlePlayerEvent from "./session/handle-player-event.js";
import { handleAttemptReconnect, handleDisconnect, sessions } from "./session/session-utils.js";
//import { resetLeaderboard } from "./api-requests/leaderboard-db.js";

dotenv.config();

const app = express();
const server = createServer(app);

export const io = new Server(server, { pingInterval: 10000, pingTimeout: 10000 });
const port = process.env.PORT || 3000;

// gzip responses (most importantly the client JS bundle, which every new visitor downloads)
app.use(compression());

// serve react files from the client build folder
let dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(dirname, "../../client/build")));

// QA dashboard
if (process.env.DEBUG_MODE) {
    app.get("/qa", (_req, res) => res.sendFile(path.join(dirname, "../../client/qa.html")));
}

app.get("/api/voice", streamVoiceAudio);

io.on(ReservedEvent.Connection, (socket: Socket) => {
    if (process.env.DEBUG_MODE) {
        socket.emit(ServerSocket.EnableDebugMode);
    }

    socket.on(ReservedEvent.Disconnect, () => {
        handleDisconnect(socket);
    });

    // client socket events can be emitted by any client so we don't handle them as host or player events specifically
    // todo: if there ends up being a lot more of these they should be in their own "handle-client-events" file
    socket.on(ClientSocket.AttemptReconnect, (sessionName: string, clientID: string, callback: ClientSocketCallback[ClientSocket.AttemptReconnect]) => {
        handleAttemptReconnect(socket, sessionName, clientID, callback);
    });

    socket.on(ClientSocket.SubmitFeedback, (feedback: Feedback) => {
        handleSubmitFeedback(socket, feedback);
    });

    socket.on(ClientSocket.SyncClock, (callback: ClientSocketCallback[ClientSocket.SyncClock]) => {
        callback(Date.now());
    });

    socket.onAny((event: string, ...args: any[]) => {
        if (Object.values(ClientSocket).includes(event as ClientSocket)) {
            // handled above
            return;
        }

        if (Object.values(HostSocket).includes(event as HostSocket)) {
            handleHostEvent(socket, event as HostSocket, ...args);
            return;
        }

        if (Object.values(PlayerSocket).includes(event as PlayerSocket)) {
            handlePlayerEvent(socket, event as PlayerSocket, ...args);
            return;
        }

        debugLog(LogCategory.Server, `couldn't find an event handler for event: ${event}`, LogVerbosity.Normal);
    });
});

server.listen(port, () => debugLog(LogCategory.Server, `server is running at port: ${port}`, LogVerbosity.Normal));

["SIGINT", "SIGTERM", "SIGQUIT", "uncaughtException"].forEach(signal => process.on(signal, (error) => {
    if (error) {
        console.error(error);
    }

    debugLog(LogCategory.Server, `server is shutting down`, LogVerbosity.Normal);

    // if the server is shutting down for any reason, log all of the sessions in progress so we can assess the damage (if any)
    if (process.env.NODE_ENV === "production") {
        try {
            const sessionSnapshots = Object.values(sessions).map(session => ({
                name: session.name,
                state: session.state,
                gameCount: session.gameCount,
                players: Object.values(session.players).map(player => ({ name: player.name, score: player.score }))
            }));

            console.log(JSON.stringify(sessionSnapshots));
        }
        catch (e) {
            console.error(e);
        }
    }

    // finally, cancel any games in progress so all current players are notified
    io.emit(ServerSocket.CancelGame, true);
    
    process.exit();
}));