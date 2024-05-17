
const CLUE_DECISION_TIMEOUT_DURATION_MS = 10000;

import { debugLog, DebugLogType, formatDebugLog } from "../misc/log.js";

import dotenv from "dotenv";
import { TriviaClue, TriviaClueDecision } from "jparty-shared";
import OpenAI from "openai";

dotenv.config();

if (!process.env.OPENAI_SECRET_KEY) {
    throw new Error(formatDebugLog("attempted to connect to OpenAI without API key"));
}

if (!process.env.OPENAI_ASSISTANT_ID) {
    throw new Error(formatDebugLog("attempted to connect to OpenAI without assistant ID"));
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_SECRET_KEY });

// players can reverse false positives/negatives manually, so always deal with unexpected situations by returning decision: incorrect
export async function getClueDecision(clue: TriviaClue, response: string) {
    try {
        if (process.env.DEBUG_MODE) {
            if (response === "correct") {
                return TriviaClueDecision.Correct;
            }
            else if (response === "incorrect") {
                return TriviaClueDecision.Incorrect;
            }
            else if (response === "detail") {
                return TriviaClueDecision.NeedsMoreDetail;
            }
            else if (response === "error") {
                throw new Error(formatDebugLog("triggered intentionally for testing. simulated an unexpected error"));
            }
        }

        // terminate this clue decision request if it takes too long
        let timeout = false;
        setTimeout(() => {
            timeout = true;
        }, CLUE_DECISION_TIMEOUT_DURATION_MS);

        const thread = await openai.beta.threads.create();

        const decisionRequest = `trivia question: "${clue.question}". correct answer: "${clue.answer}". response: "${response}".`;

        await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: decisionRequest
        });

        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: process.env.OPENAI_ASSISTANT_ID || ""
        });

        let runStatus = await openai.beta.threads.runs.retrieve(
            thread.id,
            run.id
        );

        // poll for completion
        while (runStatus.status !== "completed") {
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

            if (timeout) {
                return TriviaClueDecision.Incorrect;
            }
        }

        const messages = await openai.beta.threads.messages.list(thread.id);
        const latestMessage = messages.data.filter((message) => message.run_id === run.id && message.role === "assistant").pop();

        if (!latestMessage) {
            // we didn't get a usable decision back from the assistant
            return TriviaClueDecision.Incorrect;
        }

        let decision = TriviaClueDecision.Incorrect;

        const rawDecision = (latestMessage.content[0] as any).text.value.toLowerCase();
        if (rawDecision.includes(TriviaClueDecision.Incorrect)) {
            decision = TriviaClueDecision.Incorrect;
        }
        else if (rawDecision.includes(TriviaClueDecision.NeedsMoreDetail)) {
            decision = TriviaClueDecision.NeedsMoreDetail;
        }
        else if (rawDecision.includes(TriviaClueDecision.Correct)) {
            decision = TriviaClueDecision.Correct;
        }

        debugLog(DebugLogType.ClueDecision, `request: ${decisionRequest}`);
        debugLog(DebugLogType.ClueDecision, `decision: ${decision}`);

        return decision;
    }
    catch (e) {
        throw e;
    }
}