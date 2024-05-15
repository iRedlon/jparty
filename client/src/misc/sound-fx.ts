
import ApplauseMP3 from "../assets/applause.mp3";
import LongApplauseMP3 from "../assets/longApplause.mp3";

import { SoundEffect } from "jparty-shared";

const applauseSound = new Audio(ApplauseMP3);
const longApplauseSound = new Audio(LongApplauseMP3);

function getHostVoice() {
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

export function playSoundEffect(effect: SoundEffect, voiceLine?: string) {
    switch (effect) {
        case SoundEffect.Voice:
            {
                const hostVoice = getHostVoice();
                if (!hostVoice) {
                    return;
                }

                const utterance = new SpeechSynthesisUtterance(voiceLine);
                utterance.voice = hostVoice;
                utterance.rate = 1.2;

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
            break;
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