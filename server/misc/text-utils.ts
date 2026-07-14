
import cleanTextUtils from "clean-text-utils";
import { VoiceLineType } from "jparty-shared";
import { containsProfanities, isProfane } from "no-profanity";
import { englishDataset, englishRecommendedTransformers, RegExpMatcher } from "obscenity";

const MAX_PLAYER_NAME_LENGTH = 20;
const MAX_RESPONSE_LENGTH = 50;

const profanityMatcher = new RegExpMatcher({
    ...englishDataset.build(),
    ...englishRecommendedTransformers
});

const LEET_SUBSTITUTIONS: Record<string, string> = {
    "@": "a", "4": "a", "3": "e", "1": "i", "!": "i", "0": "o", "$": "s", "5": "s", "7": "t", "+": "t"
};

function normalizeLeetspeak(text: string) {
    return text.toLowerCase().replace(/[@431!0$57+]/g, char => LEET_SUBSTITUTIONS[char]);
}

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

export function formatClueResponse(response: string) {
    return formatText(response).slice(0, MAX_RESPONSE_LENGTH);
}

// captures every quoted segment in a category name (i.e. `hollowed "ground"` -> ["ground"])
export function getQuotedCategoryTexts(categoryName: string) {
    return [...categoryName.matchAll(/["“”]([^"“”]+)["“”]/g)].map(match => match[1].trim());
}

export function formatSpokenVoiceLine(text: string, type: VoiceLineType) {
    text = formatText(text);

    // quotation marks shouldn't be spoken or accidentally interrupt the voice's flow
    text = text.replace(/["“”]/g, "");

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

    const normalizedPlayerName = normalizeLeetspeak(playerName);

    if (profanityMatcher.hasMatch(playerName) || profanityMatcher.hasMatch(normalizedPlayerName)) {
        return { isValid: false, invalidReason: "profanity" };
    }

    if (isProfane(playerName) || isProfane(normalizedPlayerName)) {
        const profanityWords = containsProfanities(playerName);
        const profanityWordsString = profanityWords.map(profanity => `\"${profanity.word}\"`).join(", ");

        return { isValid: false, invalidReason: profanityWordsString ? `profanity: ${profanityWordsString}` : "profanity" };
    }

    return { isValid: true };
}