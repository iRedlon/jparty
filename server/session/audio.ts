
import {
    ALL_PLAY_REVEAL_CLUE_DECISION_VOICE_LINES, AudioType, CLEARED_CATEGORY_PROMPT_CLUE_SELECTION_VOICE_LINES,
    DISPLAY_CORRECT_ANSWER_VOICE_LINES, getRandomChoice, HostServerSocket, PROMPT_CLUE_SELECTION_VOICE_LINES, READ_CLUE_SELECTION_VOICE_LINE, 
    READ_FIRST_CATEGORY_NAME_VOICE_LINES, READ_LAST_CATEGORY_NAME_VOICE_LINES, READ_MIDDLE_CATEGORY_NAME_VOICE_LINES,
    SESSION_ANNOUNCEMENT_VOICE_LINES, TOSSUP_REVEAL_CLUE_DECISION_VOICE_LINES, VoiceLineType, VoiceLineVariable, WELCOME_VOICE_LINES,
} from "jparty-shared";

import { getSession } from "./session-utils.js";
import { getVoiceAudioBase64 } from "../api-requests/tts.js";
import { io } from "../controller.js";
import { debugLog, DebugLogType } from "../misc/log.js";
import { formatSpokenVoiceLine } from "../misc/text-utils.js";

export function playAudio(sessionName: string, audioType: AudioType) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    io.to(Object.keys(session.hosts)).emit(HostServerSocket.PlayAudio, audioType);
}

export async function playVoiceLine(sessionName: string, type: VoiceLineType) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    debugLog(DebugLogType.Voice, `playing voice line of type: ${VoiceLineType[type]}`);

    let voiceLine: string = "";

    switch (type) {
        case VoiceLineType.ReadCategoryName:
            {
                const currentRound = session.getCurrentRound();
                if (!currentRound) {
                    break;
                }

                if (session.readingCategoryIndex === 0) {
                    voiceLine = getRandomChoice(READ_FIRST_CATEGORY_NAME_VOICE_LINES);

                    if (session.roundIndex === 0) {
                        // if we're reading the first category for the first round, tack on an extra line welcoming players to the game
                        voiceLine = getRandomChoice(WELCOME_VOICE_LINES) + voiceLine;
                    }
                }
                else if (session.readingCategoryIndex === (currentRound.settings.numCategories - 1)) {
                    voiceLine = getRandomChoice(READ_LAST_CATEGORY_NAME_VOICE_LINES);
                }
                else {
                    voiceLine = getRandomChoice(READ_MIDDLE_CATEGORY_NAME_VOICE_LINES);
                }
            }
            break;
        case VoiceLineType.Announcement:
            {
                if (session.currentAnnouncement === undefined) {
                    debugLog(DebugLogType.Voice, "early out. session didn't have a current announcement");
                    break;
                }

                voiceLine = getRandomChoice(SESSION_ANNOUNCEMENT_VOICE_LINES[session.currentAnnouncement]);
            }
            break;
        case VoiceLineType.PromptClueSelection:
            {
                const clueSelector = session.players[session.clueSelectorID];
                if (!clueSelector) {
                    debugLog(DebugLogType.Voice, "early out. session didn't have a clue selector");
                    break;
                }

                const finalCluePosition = session.getCurrentRound()?.getFinalCluePosition();
                if (finalCluePosition) {
                    debugLog(DebugLogType.Voice, "early out. trying to prompt clue selection on the final clue");
                    return;
                }

                const currentCategory = session.getCurrentCategory();
                if (currentCategory && currentCategory.didPlayerClear(clueSelector.clientID)) {
                    playAudio(sessionName, AudioType.Applause);
                    voiceLine = getRandomChoice(CLEARED_CATEGORY_PROMPT_CLUE_SELECTION_VOICE_LINES);
                }
                else {
                    voiceLine = getRandomChoice(PROMPT_CLUE_SELECTION_VOICE_LINES);
                }
            }
            break;
        case VoiceLineType.ReadClueSelection:
            {
                voiceLine = READ_CLUE_SELECTION_VOICE_LINE;
            }
            break;
        case VoiceLineType.ReadClue:
            {
                const clue = session.getCurrentClue();
                if (clue) {
                    voiceLine = clue.question;
                }
            }
            break;
        case VoiceLineType.RevealClueDecision:
            {
                const spotlightResponder = session.players[session.spotlightResponderID];
                if (!spotlightResponder || !spotlightResponder.clueDecisionInfo) {
                    debugLog(DebugLogType.Voice, "early out. session didn't have a valid spotlight responder");
                    break;
                }

                if (session.getCurrentClue()?.isAllPlayClue()) {
                    voiceLine = getRandomChoice(ALL_PLAY_REVEAL_CLUE_DECISION_VOICE_LINES[spotlightResponder.clueDecisionInfo.decision]);
                }
                else {
                    voiceLine = getRandomChoice(TOSSUP_REVEAL_CLUE_DECISION_VOICE_LINES[spotlightResponder.clueDecisionInfo.decision]);
                }
            }
            break;
        case VoiceLineType.ShowCorrectAnswer:
            {
                voiceLine = getRandomChoice(DISPLAY_CORRECT_ANSWER_VOICE_LINES);
            }
            break;
    }

    if (!voiceLine) {
        debugLog(DebugLogType.Voice, "early out. no valid voice line");
        return;
    }

    voiceLine = voiceLine.replace(VoiceLineVariable.RoundNumber, `${session.roundIndex + 1}`);

    const readingCategoryName = session.getReadingCategory()?.name;
    if (readingCategoryName) {
        voiceLine = voiceLine.replace(VoiceLineVariable.ReadingCategoryName, readingCategoryName);
    }

    const categoryName = session.getCurrentCategory()?.name;
    if (categoryName) {
        voiceLine = voiceLine.replace(VoiceLineVariable.CategoryName, categoryName);
    }

    const clue = session.getCurrentClue();
    if (clue) {
        voiceLine = voiceLine.replace(VoiceLineVariable.ClueValue, `${clue.value}`);
        voiceLine = voiceLine.replace(VoiceLineVariable.ClueAnswer, clue.answer);
    }

    const clueSelector = session.players[session.clueSelectorID];
    if (clueSelector) {
        voiceLine = voiceLine.replace(VoiceLineVariable.ClueSelectorName, clueSelector.name);
    }

    const spotlightResponder = session.players[session.spotlightResponderID];
    if (spotlightResponder) {
        voiceLine = voiceLine.replace(VoiceLineVariable.SpotlightResponderName, spotlightResponder.name);
    }

    const leader = session.getCurrentLeader();
    if (leader) {
        voiceLine = voiceLine.replace(VoiceLineVariable.LeaderName, leader.name);
        voiceLine = voiceLine.replace(VoiceLineVariable.LeaderScore, `${leader.score} dollars`);
    }

    voiceLine = formatSpokenVoiceLine(voiceLine, type);
    session.setCurrentVoiceLine(voiceLine);

    debugLog(DebugLogType.Voice, `final spoken voice line: \"${voiceLine}\"`);

    let voiceAudioBase64 = undefined;

    try {
        voiceAudioBase64 = await getVoiceAudioBase64(session.voiceType, voiceLine);
    }
    catch (e) {
        // normally we'd go through handleServerError, but if our external TTS request fails we can just fall back on the speech synthesis voice instead
        // no need to recover the session; nothing's broken. but the TTS request failed so we should still log it
        console.error(e);
    }

    io.to(Object.keys(session.hosts)).emit(HostServerSocket.PlayVoice, session.voiceType, voiceLine, voiceAudioBase64);
}