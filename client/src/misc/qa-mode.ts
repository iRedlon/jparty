
import { LocalStorageKey } from "./ui-constants";

const qaParams = new URLSearchParams(window.location.search);
const qaRole = qaParams.get("qa");

export const isQAHost = qaRole === "host";
export const isQAPlayer = qaRole === "player";
export const isQAMode = isQAHost || isQAPlayer;
export const qaSessionName = qaParams.get("session") || "";
export const qaPlayerName = qaParams.get("name") || "";

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

    if (isQAPlayer && qaSessionName && (qaParams.get("rejoin") === "1")) {
        fakeLocalStorageRecord[LocalStorageKey.SessionName] = qaSessionName;

        qaParams.delete("rejoin");
        window.history.replaceState(null, "", `${window.location.pathname}?${qaParams.toString()}`);
    }
}
