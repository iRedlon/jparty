
import { io } from "socket.io-client";

const url = (process.env.NODE_ENV === "production") ? "" : `http://localhost:${process.env.SERVER_PORT}`;

export const socket = process.env.REACT_APP_OFFLINE ? io() : io(url);