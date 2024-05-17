
import { socket } from "./socket";
import ApplauseMP3 from "../assets/applause.mp3";
import LongApplauseMP3 from "../assets/longApplause.mp3";

import { HostSocket, SoundEffect } from "jparty-shared";

const applauseSound = new Audio(ApplauseMP3);
const longApplauseSound = new Audio(LongApplauseMP3);

export function playSoundEffect(effect: SoundEffect) {
    switch (effect) {
        case SoundEffect.Applause:
            {
                applauseSound.play();
            }
            break;
        case SoundEffect.LongApplause:
            {
                longApplauseSound.play();
            }
            break;
    }
}

function getSpeechSynthesisVoice() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
        return;
    }

    for (let i = 0; i < voices.length; i++) {
        const voice = voices[i];

        // this voice will only be available while using Chrome or a Google device. use it if we possibly can
        if (voice.voiceURI === "Google UK English Male") {
            return voice;
        }
    }

    return voices[0];
}

export function playOpenAIVoice(audioBase64: string) {
    const audioBlob = new Blob([Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))], { type: "audio/mpeg" }); //  converts the base64 string back into a binary blob
    const audioUrl = URL.createObjectURL(audioBlob); // URL for the blob so it can be used as a source
    const audio = new Audio(audioUrl);

    audio.play().catch(e => console.error(`audio playback failed: ${e.message}`));
    audio.onloadedmetadata = () => {
        socket.emit(HostSocket.UpdateVoiceDuration, audio.duration);
    };
}

export function playSpeechSynthesisVoice(voiceLine: string) {
    const voice = getSpeechSynthesisVoice();
    if (!voice) {
        return;
    }

    const utterance = new SpeechSynthesisUtterance(voiceLine);
    utterance.voice = voice;
    utterance.rate = 1.2;
    utterance.onend = () => {
        // this utterance has ended so our new duration should be... nothing cause we're done!
        socket.emit(HostSocket.UpdateVoiceDuration, 0);
    }

    // DNT: keep this code around to calculate speech synthesis characters/second when iterating with settings like voice, rate, pitch, etc.

    // let startTimeMs = Date.now();
    // utterance.onend = () => { 
    //     console.log(`started at: ${startTimeMs}`);
    //     console.log(`ended at: ${Date.now()}`);

    //     const durationSec = (Date.now() - startTimeMs) / 1000;
    //     console.log(`duration was: ${durationSec}`);
    //     console.log(`text had ${utterance.text.length} characters`);

    //     const ratio = utterance.text.length / durationSec;
    //     console.log(`ratio was: ${ratio} characters per second`);
    // }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}