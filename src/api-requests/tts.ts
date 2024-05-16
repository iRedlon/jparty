
import { debugLog, DebugLogType, formatDebugLog } from "../misc/log.js";

import dotenv from "dotenv";

dotenv.config();

if (!process.env.OPENAI_SECRET_KEY) {
    throw new Error(formatDebugLog("attempted to connect to OpenAI without API key"));
}

const OPENAI_API_KEY = process.env.OPENAI_SECRET_KEY


export async function getOpenAITTS(text: string) {
    debugLog(DebugLogType.Server, `voiceLine: ${text}`);

    
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'tts-1', // Model used
            voice: 'onyx', // Preset voice
            input: text
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch TTS audio from OpenAI: ${errorText}`);
    }


    try {
        const arrayBuffer = await response.arrayBuffer(); // Binary Data
        const base64Audio = Buffer.from(arrayBuffer).toString('base64'); // Convert ArrayBuffer to a Base64 encoded string
        return base64Audio;// This encoded string can be sent over the web socket to a client, which can then decode it back into binary data to play the audio.
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to parse response: ${error.message}`);
        } else {
            throw new Error('An unknown error occurred');
        }
    }
}