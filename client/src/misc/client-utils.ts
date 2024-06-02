
export function getClientID() {
    if (!localStorage.clientID) {
        localStorage.setItem("clientID", Math.random().toString());
    }

    return localStorage.clientID;
}

export function enableFullscreen() {
    const element = document.documentElement;
    const request = element && element.requestFullscreen;

    if (request && typeof request !== "undefined") {
        request.call(element);
    }
}