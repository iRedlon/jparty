
const MAX_PLAYER_NAME_LENGTH = 20;

import cleanTextUtils from "clean-text-utils";
import { VoiceLineType } from "jparty-shared";
import { containsProfanities, isProfane } from "no-profanity";

export interface ValidationResults {
    isValid: boolean,
    invalidReason?: string
}

export function formatText(text: string) {
    // strip HTML tags
    text = text.replace(/<[^>]*>?/gm, "");

    // strip quote escapes AKA backslashes
    text = text.replace(String.fromCharCode(92), "");

    text = cleanTextUtils.strip.emoji(text);
    text = cleanTextUtils.strip.extraSpace(text);
    text = cleanTextUtils.strip.nonASCII(text);
    text = cleanTextUtils.replace.exoticChars(text);

    return text;
}

export function formatSpokenVoiceLine(text: string, type: VoiceLineType) {
    text = formatText(text);

    // "_____" should be spoken as "blank"
    text = text.replace(/_+/g, "blank");

    // "...." shouldn't be spoken but rather, create a pause in speech
    text = text.replace(/\.+/g, ";");

    if (type === VoiceLineType.Announcement) {
        // prefer to say "... for one hundred" instead of "... for one hundred dollars", for example
        text = text.replace("$", "");
    }

    return text;
}

export function validatePlayerName(playerName: string): ValidationResults {
    if (!playerName) {
        return { isValid: false, invalidReason: "invalid characters" };
    }

    if (playerName.length > MAX_PLAYER_NAME_LENGTH) {
        return { isValid: false, invalidReason: "too long" };
    }

    if (isProfane(playerName)) {
        const profanityWords = containsProfanities(playerName);
        const profanityWordsString = profanityWords.map(profanity => `\"${profanity.word}\"`).join(", ");

        return { isValid: false, invalidReason: `profanity: "${profanityWordsString}"` };
    }

    return { isValid: true };
}