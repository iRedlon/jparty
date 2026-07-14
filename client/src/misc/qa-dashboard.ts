
import { CheatSocket } from "jparty-shared";

import { LocalStorageKey } from "./ui-constants";

const qaParams = new URLSearchParams(window.location.search);
const qaRole = qaParams.get("qa");

export const isQAHost = qaRole === "host";
export const isQAPlayer = qaRole === "player";
export const isQAMode = isQAHost || isQAPlayer;
export const qaSessionName = qaParams.get("session") || "";
export const qaPlayerName = qaParams.get("name") || "";

export function leaveQASession() {
    if (!isQAMode) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    params.delete("session");
    params.delete("name");
    params.delete("rejoin");
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
}

export function updateQASessionName(sessionName: string) {
    if (isQAHost && (window.parent !== window)) {
        window.parent.postMessage({ type: "jparty-qa-session-name", sessionName: sessionName }, window.location.origin);
    }
}

// QA clients all share the same localStorage
// setup a fake local storage interface instead so each of them can have their own local storage
if (isQAMode) {
    const fakeLocalStorageRecord: Record<string, string> = {};

    const fakeLocalStorageMethods = {
        getItem: (key: string) => (key in fakeLocalStorageRecord) ? fakeLocalStorageRecord[key] : null,
        setItem: (key: string, value: string) => { fakeLocalStorageRecord[key] = String(value); },
        removeItem: (key: string) => { delete fakeLocalStorageRecord[key]; },
        clear: () => { Object.keys(fakeLocalStorageRecord).forEach(key => delete fakeLocalStorageRecord[key]); },
        key: (index: number) => Object.keys(fakeLocalStorageRecord)[index] ?? null,
        get length() { return Object.keys(fakeLocalStorageRecord).length; }
    };

    const fakeLocalStorage = new Proxy(fakeLocalStorageMethods, {
        get(target, prop) {
            if ((typeof prop !== "string") || (prop in target)) {
                return (target as any)[prop];
            }

            return fakeLocalStorageRecord[prop];
        },
        set(_target, prop, value) {
            if (typeof prop === "string") {
                fakeLocalStorageRecord[prop] = String(value);
            }

            return true;
        },
        deleteProperty(_target, prop) {
            if (typeof prop === "string") {
                delete fakeLocalStorageRecord[prop];
            }

            return true;
        },
        has(target, prop) {
            return (prop in target) || ((typeof prop === "string") && (prop in fakeLocalStorageRecord));
        }
    });

    Object.defineProperty(window, "localStorage", { value: fakeLocalStorage, configurable: true });

    const qaClientID = qaParams.get("clientid");
    if (qaClientID) {
        fakeLocalStorageRecord[LocalStorageKey.ClientID] = qaClientID;
    }

    let qaLagMs = 0;

    function wrapWithQALag(fn: Function) {
        return (...args: any[]) => {
            if (qaLagMs > 0) {
                setTimeout(() => fn(...args), qaLagMs);
            }
            else {
                fn(...args);
            }
        };
    }

    function applyQALag(socket: any, lagMs: number) {
        qaLagMs = Math.max(lagMs || 0, 0);

        if (!socket.qaLagWrapped) {
            socket.qaLagWrapped = true;
            socket.emit = wrapWithQALag(socket.emit.bind(socket));
            socket.onevent = wrapWithQALag(socket.onevent.bind(socket));
            socket.onack = wrapWithQALag(socket.onack.bind(socket));
        }
    }

    window.addEventListener("message", (event) => {
        if (event.origin !== window.location.origin) {
            return;
        }

        const data = event.data;
        if (!data) {
            return;
        }

        if (data.type === "jparty-qa-font-size") {
            document.documentElement.style.fontSize = (data.fontSizePx > 0) ? `${data.fontSizePx}px` : "";
        }

        if ((data.type === "jparty-qa-cheat") && Object.values(CheatSocket).includes(data.cheat)) {
            import("./socket").then(({ socket }) => socket.emit(data.cheat));
        }

        if (data.type === "jparty-qa-lag") {
            import("./socket").then(({ socket }) => applyQALag(socket, data.lagMs));
        }
    });

    if (isQAPlayer && qaSessionName && (qaParams.get("rejoin") === "1")) {
        fakeLocalStorageRecord[LocalStorageKey.SessionName] = qaSessionName;

        qaParams.delete("rejoin");
        window.history.replaceState(null, "", `${window.location.pathname}?${qaParams.toString()}`);
    }
}
