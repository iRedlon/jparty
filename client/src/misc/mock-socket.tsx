
/*
Mock socket:
A tool for debugging a client that isn't connected to a real web socket. Simulates socket event handling with DOM effects

- Debugging with an offline client is convenient because it can utilize hot-reloading, but in the absence of a real server we need to simulate game events somehow
- To do this: we setup DOM event listeners at the same time as we setup socket handlers, to listen for the exact same events
- Then, we use a suite of debug commands to send those events with dummy data in order to test the client under realistic conditions
- These functions below are the boilerplate for setting up those handlers and sending game events to them
*/

import { HostServerSocket, PlayerSocket, ServerSocket } from "jparty-shared";

// there's one hard-coded div in our index.html with this ID that we use to do all of the mock socket routing
const MOCK_SOCKET_ELEMENT_ID = "mock-socket";

export function addMockSocketEventHandler(event: ServerSocket | HostServerSocket | PlayerSocket, handler: Function) {
    if (!process.env.REACT_APP_OFFLINE) {
        return;
    }

    const mockSocket = document.getElementById(MOCK_SOCKET_ELEMENT_ID);
    if (!mockSocket) {
        return;
    }

    mockSocket.addEventListener(event, ((event: CustomEvent) => handler(...event.detail.params)) as EventListener);
}

export function removeMockSocketEventHandler(event: ServerSocket | HostServerSocket | PlayerSocket, handler: Function) {
    if (!process.env.REACT_APP_OFFLINE) {
        return;
    }
    
    const mockSocket = document.getElementById(MOCK_SOCKET_ELEMENT_ID);
    if (!mockSocket) {
        return;
    }

    mockSocket.removeEventListener(event, ((event: CustomEvent) => handler(...event.detail.params)) as EventListener);
}

export function emitMockSocketEvent(event: ServerSocket | HostServerSocket, ...args: any[]) {
    const mockSocket = document.getElementById(MOCK_SOCKET_ELEMENT_ID);
    if (!mockSocket) {
        return;
    }

    mockSocket.dispatchEvent(new CustomEvent(event, {
        detail: {
            params: args
        }
    }));
}