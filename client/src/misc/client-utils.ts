
import { formatDollarValue } from "./format";

import { TriviaClueDecision, TriviaClueDecisionInfo } from "jparty-shared";

export function getClientID() {
    if (!localStorage.clientID) {
        localStorage.setItem("clientID", Math.random().toString());
    }

    return localStorage.clientID;
}

export function getClueDecisionString(clueDecisionInfo: TriviaClueDecisionInfo) {
    const decisionModifier = (clueDecisionInfo.decision === TriviaClueDecision.Incorrect) ? -1 : 1;
    const clueValueString = (clueDecisionInfo.decision !== TriviaClueDecision.NeedsMoreDetail) && ` for ${formatDollarValue(clueDecisionInfo.clueValue * decisionModifier)}`;

    return `${clueDecisionInfo.decision} ${clueValueString}`;
}

export function enableFullscreen() {
    const element = document.documentElement;
    const request = element && element.requestFullscreen;

    if (request && typeof request !== "undefined") {
        request.call(element);
    }
}