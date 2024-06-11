
import dotenv from "dotenv";
import { VoiceType } from "jparty-shared";

import { debugLog, DebugLogType, formatDebugLog } from "../misc/log.js";

dotenv.config();

if (!process.env.OPENAI_SECRET_KEY) {
    throw new Error(formatDebugLog("attempted to connect to OpenAI without API key"));
}

export async function getVoiceAudioBase64(voiceType: VoiceType, voiceLine: string) {
    if (!process.env.USE_OPENAI_TTS) {
        return;
    }

    if ((voiceType !== VoiceType.ModernMasculine) && (voiceType !== VoiceType.ModernFeminine)) {
        return;
    }

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENAI_SECRET_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "tts-1",
            voice: (voiceType === VoiceType.ModernFeminine) ? "nova" : "echo",
            input: voiceLine
        })
    });

    debugLog(DebugLogType.Voice, `making audio request to OpenAI for voice line type: ${voiceType}`);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(formatDebugLog(`failed to fetch TTS audio from OpenAI: ${errorText}`));
    }

    try {
        const arrayBuffer = await response.arrayBuffer(); // binary data
        const base64Audio = Buffer.from(arrayBuffer).toString("base64"); // convert array buffer to a base64 encoded string
        return base64Audio; // this encoded string will be converted back into binary data on the client, before being played as audio
    } 
    catch (e) {
        throw e;
    }
}