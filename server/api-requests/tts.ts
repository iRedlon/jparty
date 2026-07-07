
import dotenv from "dotenv";
import { VoiceType } from "jparty-shared";

import { debugLog, DebugLogType, formatDebugLog } from "../misc/log.js";

dotenv.config();

if (!process.env.OPENAI_SECRET_KEY) {
    throw new Error(formatDebugLog("attempted to connect to OpenAI without API key"));
}

// tts-1 outputs MP3 at 24kHz sample rate / 160kbps CBR, so we can derive duration directly from file size
const OPENAI_TTS_BYTES_PER_SEC = 160000 / 8;

export interface VoiceAudio {
    base64: string;
    durationMs: number;
}

export async function getVoiceAudioBase64(voiceType: VoiceType, voiceLine: string): Promise<VoiceAudio | undefined> {
    if (!process.env.USE_OPENAI_TTS) {
        return;
    }

    if ((voiceType !== VoiceType.ModernMasculine) && (voiceType !== VoiceType.ModernFeminine)) {
        return;
    }

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        signal: AbortSignal.timeout(5000),
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
        const arrayBuffer = await response.arrayBuffer();
        const durationMs = Math.ceil((arrayBuffer.byteLength / OPENAI_TTS_BYTES_PER_SEC) * 1000);
        const base64 = Buffer.from(arrayBuffer).toString("base64");

        debugLog(DebugLogType.Voice, `computed TTS duration: ${durationMs}ms from ${arrayBuffer.byteLength} bytes`);

        return { base64, durationMs };
    }
    catch (e) {
        throw e;
    }
}