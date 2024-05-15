
import { handleSubmitFeedback } from "./api-requests/feedback.js";
import { debugLog, DebugLogType } from "./misc/log.js";
import handleHostEvent from "./session/handle-host-event.js";
import handlePlayerEvent from "./session/handle-player-event.js";
import { handleAttemptReconnect, handleDisconnect, sessions } from "./session/session-utils.js";

import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { ClientSocket, ClientSocketCallback, Feedback, HostSocket, PlayerSocket, ReservedSocket, ServerSocket } from "jparty-shared";
import path from "path";
import { Server, Socket } from "socket.io";
import { fileURLToPath } from "url";

dotenv.config();

// Hello, world!
const app = express();
const server = createServer(app);
export const io = new Server(server);
const port = process.env.PORT || 3000;

// serve react files from the client build folder
let dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(dirname, "../../client/build")));

io.on(ReservedSocket.Connection, (socket: Socket) => {
    if (process.env.DEBUG_MODE) {
        socket.emit(ServerSocket.EnableDebugMode);
    }

    socket.on(ReservedSocket.Disconnect, () => {
        handleDisconnect(socket);
    });

    socket.on(ClientSocket.AttemptReconnect, (sessionName: string, clientID: string, callback: ClientSocketCallback[ClientSocket.AttemptReconnect]) => {
        handleAttemptReconnect(socket, sessionName, clientID, callback);
    });

    socket.on(ClientSocket.SubmitFeedback, (feedback: Feedback) => {
        handleSubmitFeedback(socket, feedback);
    });

    socket.onAny((event: string, ...args: any[]) => {
        if (Object.values(ClientSocket).includes(event as ClientSocket)) {
            // these events have custom handlers above
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

        debugLog(DebugLogType.Server, `couldn't find an event handler for event: ${event}`);
    });
});

server.listen(port, () => debugLog(DebugLogType.Server, `server is running at port: ${port}`));

["SIGINT", "SIGTERM", "SIGQUIT", "uncaughtException"].forEach(signal => process.on(signal, (error) => {
    if (error) {
        console.error(error);
    }

    debugLog(DebugLogType.Server, `server is shutting down`);

    // if the server is shutting down for any reason, log all of the sessions in progress so we can assess the damage...
    if (process.env.NODE_ENV === "production") {
        console.log(JSON.stringify(sessions));
    }

    // ... also, cancel any games in progress
    io.emit(ServerSocket.CancelGame, true);
    
    process.exit();
}));