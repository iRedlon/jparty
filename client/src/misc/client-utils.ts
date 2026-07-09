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

const MAX_FULL_SIZE_SCORE_LENGTH = 7;

export function getScoreFontSize(score: number, baseFontSizeEm: number) {
    const scoreLength = formatDollarValue(score).length;
    return `${baseFontSizeEm * Math.min(1, MAX_FULL_SIZE_SCORE_LENGTH / scoreLength)}em`;
}

export function getClientID() {
    if (!localStorage[LocalStorageKey.ClientID]) {
        localStorage.setItem(LocalStorageKey.ClientID, Math.random().toString());
    }

    return localStorage[LocalStorageKey.ClientID];
}

// session name prefilled by scanning the host lobby QR code (e.g. jparty.io/?join=abcde)
export const joinSessionName = new URLSearchParams(window.location.search).get("join") || "";