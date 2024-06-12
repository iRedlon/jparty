import { LocalStorageKey } from "./ui-constants";

export function enableFullscreen() {
    const element = document.documentElement;
    const request = element && element.requestFullscreen;

    if (request && typeof request !== "undefined") {
        request.call(element);
    }
}

export function formatDollarValue(value: number) {
    let sign = value < 0 ? "-" : "";
    return `${sign}$${Math.abs(value)}`;
}

export function getClientID() {
    if (!localStorage[LocalStorageKey.ClientID]) {
        localStorage.setItem(LocalStorageKey.ClientID, Math.random().toString());
    }

    return localStorage[LocalStorageKey.ClientID];
}