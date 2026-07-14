
import {
    ALL_PLAY_REVEAL_CLUE_DECISION_VOICE_LINES, AudioType, CLEARED_CATEGORY_PROMPT_CLUE_SELECTION_VOICE_LINES,
    DISPLAY_CORRECT_ANSWER_VOICE_LINES, FIRST_WAGER_BONUS_VOICE_LINES, getOrdinalString, getRandomChoiceNoRepeat, HostServerSocket,
    INTRODUCE_ALL_WAGER_CLUE_VOICE_LINES, LAST_WAGER_BONUS_VOICE_LINES, LEADERBOARD_GAME_OVER_VOICE_LINES, LEADERBOARD_TYPE_DISPLAY_NAMES,
    PROMPT_CLUE_SELECTION_VOICE_LINES, QUOTED_LETTER_CATEGORY_VOICE_LINES, QUOTED_MULTIPLE_CATEGORY_VOICE_LINES, QUOTED_OTHER_CATEGORY_VOICE_LINES,
    QUOTED_WORD_CATEGORY_VOICE_LINES, READ_CLUE_SELECTION_VOICE_LINE, READ_FIRST_CATEGORY_NAME_VOICE_LINES, READ_LAST_CATEGORY_NAME_VOICE_LINES,
    READ_MIDDLE_CATEGORY_NAME_VOICE_LINES, REVEAL_ALL_WAGER_CATEGORY_VOICE_LINE, SECOND_WAGER_BONUS_VOICE_LINES, SESSION_ANNOUNCEMENT_VOICE_LINES,
    SessionAnnouncement, TOSSUP_REVEAL_CLUE_DECISION_VOICE_LINES, VoiceLineType, VoiceLineVariable, WELCOME_VOICE_LINES,
} from "jparty-shared";

import { getSession } from "./session-utils.js";
import { shouldStreamVoiceAudio } from "../api-requests/tts.js";
import { io } from "../controller.js";
import { debugLog, LogCategory, LogVerbosity } from "../misc/log.js";
import { formatSpokenVoiceLine, getQuotedCategoryTexts } from "../misc/text-utils.js";

export function playAudio(sessionName: string, audioType: AudioType) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    io.to(Object.keys(session.hosts)).emit(HostServerSocket.PlayAudio, audioType);
}

function joinQuotedCategoryTexts(quotedTexts: string[]) {
    if (quotedTexts.length <= 1) {
        return quotedTexts[0] || "";
    }

    return `${quotedTexts.slice(0, -1).join(", ")} and ${quotedTexts[quotedTexts.length - 1]}`;
}

export async function playVoiceLine(sessionName: string, type: VoiceLineType, delayMs: number = 0) {
    let session = getSession(sessionName);
    if (!session) {
        return;
    }

    debugLog(LogCategory.Voice, `playing voice line of type: ${VoiceLineType[type]}`, LogVerbosity.Verbose);

    let voiceLine: string = "";

    switch (type) {
        case VoiceLineType.ReadCategoryName:
            {
                const currentRound = session.getCurrentRound();
                if (!currentRound) {
                    break;
                }

                if (session.readingCategoryIndex === 0) {
                    voiceLine = getRandomChoiceNoRepeat(READ_FIRST_CATEGORY_NAME_VOICE_LINES);

                    if (session.roundIndex === 0) {
                        // if we're reading the first category for the first round, tack on an extra line welcoming players to the game
                        voiceLine = getRandomChoiceNoRepeat(WELCOME_VOICE_LINES) + voiceLine;
                    }
                }
                else if (session.readingCategoryIndex === (currentRound.settings.numCategories - 1)) {
                    voiceLine = getRandomChoiceNoRepeat(READ_LAST_CATEGORY_NAME_VOICE_LINES);
                }
                else {
                    voiceLine = getRandomChoiceNoRepeat(READ_MIDDLE_CATEGORY_NAME_VOICE_LINES);
                }

                const quotedTexts = getQuotedCategoryTexts(session.getReadingCategory()?.name || "");
                if (quotedTexts.length > 1) {
                    voiceLine += `. ${getRandomChoiceNoRepeat(QUOTED_MULTIPLE_CATEGORY_VOICE_LINES)}`;
                }
                else if (quotedTexts.length === 1) {
                    const quotedText = quotedTexts[0];

                    if (/^[a-z]$/i.test(quotedText)) {
                        voiceLine += `. ${getRandomChoiceNoRepeat(QUOTED_LETTER_CATEGORY_VOICE_LINES)}`;
                    }
                    else if (/^[a-z]+$/i.test(quotedText)) {
                        voiceLine += `. ${getRandomChoiceNoRepeat(QUOTED_WORD_CATEGORY_VOICE_LINES)}`;
                    }
                    else {
                        voiceLine += `. ${getRandomChoiceNoRepeat(QUOTED_OTHER_CATEGORY_VOICE_LINES)}`;
                    }
                }
            }
            break;
        case VoiceLineType.Announcement:
            {
                if (session.currentAnnouncement === undefined) {
                    debugLog(LogCategory.Voice, "early out. session didn't have a current announcement", LogVerbosity.Verbose);
                    break;
                }

                if (session.currentAnnouncement === SessionAnnouncement.ClueBonusWager) {
                    if (session.wagerBonusCount <= 1) {
                        voiceLine = getRandomChoiceNoRepeat(FIRST_WAGER_BONUS_VOICE_LINES);
                    }
                    else if (session.wagerBonusCount === 2) {
                        voiceLine = getRandomChoiceNoRepeat(SECOND_WAGER_BONUS_VOICE_LINES);
                    }
                    else {
                        voiceLine = getRandomChoiceNoRepeat(LAST_WAGER_BONUS_VOICE_LINES);
                    }
                }
                else if ((session.currentAnnouncement === SessionAnnouncement.GameOver) && session.getCurrentLeader()?.claimedLeaderboardSpot) {
                    voiceLine = getRandomChoiceNoRepeat(LEADERBOARD_GAME_OVER_VOICE_LINES);
                }
                else {
                    voiceLine = getRandomChoiceNoRepeat(SESSION_ANNOUNCEMENT_VOICE_LINES[session.currentAnnouncement]);
                }
            }
            break;
        case VoiceLineType.PromptClueSelection:
            {
                const clueSelector = session.players[session.clueSelectorID];
                if (!clueSelector) {
                    debugLog(LogCategory.Voice, "early out. session didn't have a clue selector", LogVerbosity.Verbose);
                    break;
                }

                const finalCluePosition = session.getCurrentRound()?.getFinalCluePosition();
                if (finalCluePosition) {
                    debugLog(LogCategory.Voice, "early out. trying to prompt clue selection on the final clue", LogVerbosity.Verbose);
                    return;
                }

                const currentCategory = session.getCurrentCategory();

                if (currentCategory && currentCategory.didPlayerClear(clueSelector.clientID)) {
                    playAudio(sessionName, AudioType.Applause);
                    voiceLine = getRandomChoiceNoRepeat(CLEARED_CATEGORY_PROMPT_CLUE_SELECTION_VOICE_LINES);
                }
                else if (session.hasNewClueSelector()) {
                    voiceLine = getRandomChoiceNoRepeat(PROMPT_CLUE_SELECTION_VOICE_LINES);
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
                    debugLog(LogCategory.Voice, "early out. session didn't have a valid spotlight responder", LogVerbosity.Verbose);
                    break;
                }

                if (session.getCurrentClue()?.isAllPlayClue()) {
                    voiceLine = getRandomChoiceNoRepeat(ALL_PLAY_REVEAL_CLUE_DECISION_VOICE_LINES[spotlightResponder.clueDecisionInfo.decision]);
                }
                else {
                    voiceLine = getRandomChoiceNoRepeat(TOSSUP_REVEAL_CLUE_DECISION_VOICE_LINES[spotlightResponder.clueDecisionInfo.decision]);
                }
            }
            break;
        case VoiceLineType.ShowCorrectAnswer:
            {
                voiceLine = getRandomChoiceNoRepeat(DISPLAY_CORRECT_ANSWER_VOICE_LINES);
            }
            break;
        case VoiceLineType.RevealAllWagerCategory:
            {
                voiceLine = REVEAL_ALL_WAGER_CATEGORY_VOICE_LINE;
            }
            break;
        case VoiceLineType.IntroduceAllWagerClue:
            {
                voiceLine = getRandomChoiceNoRepeat(INTRODUCE_ALL_WAGER_CLUE_VOICE_LINES);
            }
            break;
    }

    if (!voiceLine) {
        debugLog(LogCategory.Voice, "early out. no valid voice line", LogVerbosity.Verbose);
        return;
    }

    voiceLine = voiceLine.replace(VoiceLineVariable.RoundNumber, `${session.roundIndex + 1}`);

    const readingCategoryName = session.getReadingCategory()?.name;
    if (readingCategoryName) {
        voiceLine = voiceLine.replace(VoiceLineVariable.ReadingCategoryName, readingCategoryName);

        const quotedTexts = getQuotedCategoryTexts(readingCategoryName);
        if (quotedTexts.length) {
            voiceLine = voiceLine.replace(VoiceLineVariable.QuotedCategoryText, joinQuotedCategoryTexts(quotedTexts));
        }
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

        const claimedSpot = leader.claimedLeaderboardSpot;
        if (claimedSpot) {
            voiceLine = voiceLine.replace(VoiceLineVariable.ClaimedLeaderboardSpot, `the ${getOrdinalString(claimedSpot.spot)} spot on the ${LEADERBOARD_TYPE_DISPLAY_NAMES[claimedSpot.type]} leaderboard`);
        }
    }

    voiceLine = formatSpokenVoiceLine(voiceLine, type);
    session.setCurrentVoiceLine(voiceLine);

    debugLog(LogCategory.Voice, `final spoken voice line: \"${voiceLine}\"`, LogVerbosity.Verbose);

    const streamAudio = shouldStreamVoiceAudio(session.voiceType);

    // a delay gives whatever sound is currently playing some room to breathe before the host starts talking over it
    const emitPlayVoice = () => {
        let session = getSession(sessionName);
        if (!session || (session.currentVoiceLine !== voiceLine)) {
            return;
        }

        io.to(Object.keys(session.hosts)).emit(HostServerSocket.PlayVoice, session.voiceType, voiceLine, streamAudio);
    }

    if (delayMs > 0) {
        setTimeout(emitPlayVoice, delayMs);
    }
    else {
        emitPlayVoice();
    }
}