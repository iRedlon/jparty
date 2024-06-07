
// see glossary/mock socket

import { HostServerSocket, PlayerSocket, ServerSocket } from "jparty-shared";

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