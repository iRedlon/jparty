
export function getClientID() {
    if (!localStorage.clientID) {
        localStorage.setItem("clientID", Math.random().toString());
    }

    return localStorage.clientID;
}