
import { HostServerSocket, PlayerSocket, ServerSocket } from "jparty-shared";

// see glossary/mock socket

export function addMockSocketEventHandler(event: ServerSocket | HostServerSocket | PlayerSocket, handler: Function) {
    if (!process.env.REACT_APP_OFFLINE) {
        return;
    }

    const mockSocket = document.getElementById("mock-socket");
    if (!mockSocket) {
        return;
    }

    mockSocket.addEventListener(event, ((event: CustomEvent) => handler(...event.detail.params)) as EventListener);
}

export function removeMockSocketEventHandler(event: ServerSocket | HostServerSocket | PlayerSocket, handler: Function) {
    if (!process.env.REACT_APP_OFFLINE) {
        return;
    }
    
    const mockSocket = document.getElementById("mock-socket");
    if (!mockSocket) {
        return;
    }

    mockSocket.removeEventListener(event, ((event: CustomEvent) => handler(...event.detail.params)) as EventListener);
}