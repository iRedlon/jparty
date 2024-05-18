
import { socket } from "./socket";
import BuzzWindowTimeoutMP3 from "../assets/buzzWindowTimeout.mp3";
import ApplauseMP3 from "../assets/applause.mp3";
import GameMusicMP3 from "../assets/gameMusic.mp3";
import LobbyMusicMP3 from "../assets/lobbyMusic.mp3";
import LongApplauseMP3 from "../assets/longApplause.mp3";

import { HostSocket, SoundEffect, VoiceType } from "jparty-shared";

const buzzWindowTimeoutAudio = new Audio(BuzzWindowTimeoutMP3);
const gameMusicAudio = new Audio(GameMusicMP3);
const lobbyMusicAudio = new Audio(LobbyMusicMP3);
const applauseAudio = new Audio(ApplauseMP3);
const longApplauseAudio = new Audio(LongApplauseMP3);

export function playSoundEffect(effect: SoundEffect) {
    switch (effect) {
        case SoundEffect.LobbyMusic:
            {
                if (lobbyMusicAudio.paused || !lobbyMusicAudio.currentTime) {
                    gameMusicAudio.pause();
                    lobbyMusicAudio.play();
                }
            }
            break;
        case SoundEffect.GameMusic:
            {
                if (gameMusicAudio.paused || !gameMusicAudio.currentTime) {
                    lobbyMusicAudio.pause();
                    gameMusicAudio.play();
                }
            }
            break;
        case SoundEffect.BuzzWindowTimeout:
            {
                buzzWindowTimeoutAudio.play();
            }
            break;
        case SoundEffect.Applause:
            {
                applauseAudio.play();
            }
            break;
        case SoundEffect.LongApplause:
            {
                longApplauseAudio.play();
            }
            break;
    }
}

function getSpeechSynthesisVoice(voiceType: VoiceType) {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
        return;
    }

    let voiceURI = "";
    switch (voiceType) {
        case VoiceType.ClassicMasculine:
            {
                voiceURI = "Google UK English Male";
            }
            break;
        case VoiceType.ClassicFeminine:
            {
                voiceURI = "Google UK English Female";
            }
            break;
    }

    for (let i = 0; i < voices.length; i++) {
        const voice = voices[i];

        // the Google voices will only be available while using Chrome or a Google device. use it if we possibly can
        if (voice.voiceURI === voiceURI) {
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

export function playSpeechSynthesisVoice(voiceType: VoiceType, voiceLine: string) {
    const voice = getSpeechSynthesisVoice(voiceType);
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