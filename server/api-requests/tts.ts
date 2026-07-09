
import dotenv from "dotenv";
import type { Request, Response } from "express";
import { VoiceType } from "jparty-shared";
import { Readable } from "stream";

import { debugLog, formatDebugLog, LogCategory, LogVerbosity } from "../misc/log.js";
import { getSession } from "../session/session-utils.js";

dotenv.config();

if (process.env.USE_OPENAI_TTS && !process.env.OPENAI_SECRET_KEY) {
    throw new Error(formatDebugLog("USE_OPENAI_TTS is enabled without an OPENAI_SECRET_KEY"));
}

export function shouldStreamVoiceAudio(voiceType: VoiceType) {
    if (!process.env.USE_OPENAI_TTS) {
        return false;
    }

    return (voiceType === VoiceType.ModernMasculine) || (voiceType === VoiceType.ModernFeminine);
}

// stream TTS audio straight from OpenAI to the client so playback can begin before the whole file is generated
export async function streamVoiceAudio(req: Request, res: Response) {
    const voiceType = req.query.voiceType as VoiceType;
    const voiceLine = (typeof req.query.voiceLine === "string") ? req.query.voiceLine : "";
    const sessionName = (typeof req.query.sessionName === "string") ? req.query.sessionName.toLowerCase() : "";

    // only stream a voice line that this session is actually trying to speak right now
    const session = getSession(sessionName);

    if (!session || !voiceLine || (voiceLine !== session.currentVoiceLine) || !shouldStreamVoiceAudio(voiceType)) {
        res.sendStatus(204);
        return;
    }

    try {
        const abortController = new AbortController();
        const connectTimeout = setTimeout(() => abortController.abort(), 5000);

        const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            signal: abortController.signal,
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_SECRET_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "tts-1",
                voice: (voiceType === VoiceType.ModernFeminine) ? "nova" : "echo",
                input: voiceLine,
                response_format: "mp3"
            })
        });

        clearTimeout(connectTimeout);

        if (!response.ok || !response.body) {
            const errorText = response.body ? await response.text() : "no response body";
            throw new Error(formatDebugLog(`failed to fetch TTS audio from OpenAI: ${errorText}`));
        }

        debugLog(LogCategory.Voice, `streaming TTS audio from OpenAI for voice type: ${voiceType}`, LogVerbosity.Verbose);

        res.setHeader("Content-Type", "audio/mpeg");

        const audioStream = Readable.fromWeb(response.body as any);
        audioStream.pipe(res);
    }
    catch (e) {
        console.error(e);
        res.sendStatus(502);
    }
}
