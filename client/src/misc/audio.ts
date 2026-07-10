
import { AudioType, HostSocket, VoiceType, VolumeType } from "jparty-shared";

import { socket } from "./socket";
import { LocalStorageKey } from "./ui-constants";

import GameMusicMP3 from "../assets/game-music.mp3";
import LobbyMusicMP3 from "../assets/lobby-music.mp3";
import ThinkingMusicMP3 from "../assets/thinking-music.mp3";

import BuzzWindowTimeoutMP3 from "../assets/buzz-window-timeout.mp3";
import ApplauseMP3 from "../assets/applause.mp3";
import LongApplauseMP3 from "../assets/long-applause.mp3";
import BuzzMP3 from "../assets/buzz.mp3";
import ClueResponseSubmittedMP3 from "../assets/clue-response-submitted.mp3";
import WagerResponseSubmittedMP3 from "../assets/wager-response-submitted.mp3";
import CorrectDecisionMP3 from "../assets/correct-decision.mp3";
//import IncorrectDecisionMP3 from "../assets/incorrect-decision.mp3";
import ClueSelectedMP3 from "../assets/clue-selected.mp3";

const musicAudios: { [key in AudioType]?: HTMLAudioElement } = {
    [AudioType.LobbyMusic]: new Audio(LobbyMusicMP3),
    [AudioType.GameMusic]: new Audio(GameMusicMP3),
    [AudioType.ThinkingMusic]: new Audio(ThinkingMusicMP3)
};

const MUSIC_FADE_IN_DURATION_MS = 800;
const MUSIC_FADE_OUT_DURATION_MS = 800;
const MUSIC_FADE_TICK_MS = 50;

const musicFadeLevels: { [key in AudioType]?: number } = {
    [AudioType.LobbyMusic]: 0,
    [AudioType.GameMusic]: 0,
    [AudioType.ThinkingMusic]: 0
};

let currentMusicAudioType: AudioType | undefined;
let musicFadeInterval: NodeJS.Timeout | undefined;

// sound FX
const soundEffectAudios: { [key in AudioType]?: HTMLAudioElement } = {
    [AudioType.BuzzWindowTimeout]: new Audio(BuzzWindowTimeoutMP3),
    [AudioType.Applause]: new Audio(ApplauseMP3),
    [AudioType.LongApplause]: new Audio(LongApplauseMP3),
    [AudioType.Buzz]: new Audio(BuzzMP3),
    [AudioType.ClueResponseSubmitted]: new Audio(ClueResponseSubmittedMP3),
    [AudioType.WagerResponseSubmitted]: new Audio(WagerResponseSubmittedMP3),
    [AudioType.CorrectDecision]: new Audio(CorrectDecisionMP3),
    //[AudioType.IncorrectDecision]: new Audio(IncorrectDecisionMP3)
    [AudioType.ClueSelected]: new Audio(ClueSelectedMP3),
};

const DEFAULT_VOLUME = 1;

export function getVolume(volumeType: VolumeType) {
    const volume = parseFloat(localStorage.getItem(volumeType) || `${DEFAULT_VOLUME}`);
    if (isNaN(volume)) {
        return DEFAULT_VOLUME;
    }

    return volume;
}

export function getModVolume(volumeType: VolumeType) {
    const volume = getVolume(volumeType);
    return volume * getVolume(VolumeType.Master);
}

function applyMusicVolume(audioType: AudioType) {
    const musicAudio = musicAudios[audioType];
    if (musicAudio) {
        musicAudio.volume = getModVolume(VolumeType.Music) * (musicFadeLevels[audioType] ?? 0);
    }
}

function tickMusicFade() {
    let anyStillFading = false;

    for (const audioTypeKey of Object.keys(musicAudios)) {
        const audioType = parseInt(audioTypeKey) as AudioType;
        const target = (audioType === currentMusicAudioType) ? 1 : 0;
        const level = musicFadeLevels[audioType] ?? 0;

        if (level === target) {
            continue;
        }

        const durationMs = (target > level) ? MUSIC_FADE_IN_DURATION_MS : MUSIC_FADE_OUT_DURATION_MS;
        const step = (durationMs > 0) ? (MUSIC_FADE_TICK_MS / durationMs) : 1;
        const newLevel = (target > level) ? Math.min(level + step, 1) : Math.max(level - step, 0);

        musicFadeLevels[audioType] = newLevel;
        applyMusicVolume(audioType);

        // this track is done fading out, so it can stop playing for real
        if (newLevel === 0) {
            musicAudios[audioType]?.pause();
        }

        if (newLevel !== target) {
            anyStillFading = true;
        }
    }

    if (!anyStillFading && musicFadeInterval) {
        clearInterval(musicFadeInterval);
        musicFadeInterval = undefined;
    }
}

export function updateVolume(volumeType: VolumeType, volume: number) {
    localStorage.setItem(volumeType, `${volume}`);

    for (const audioTypeKey of Object.keys(musicAudios)) {
        applyMusicVolume(parseInt(audioTypeKey) as AudioType);
    }

    for (const audio of Object.values(soundEffectAudios)) {
        audio.volume = getModVolume(VolumeType.SoundEffects);
    }
}

// make sure all of our audios default to this client's current volume settings
updateVolume(VolumeType.Master, getVolume(VolumeType.Master));
updateVolume(VolumeType.Music, getVolume(VolumeType.Music));
updateVolume(VolumeType.SoundEffects, getVolume(VolumeType.SoundEffects));

export function playAudio(audioType: AudioType) {
    const musicAudio = musicAudios[audioType];
    if (musicAudio) {
        currentMusicAudioType = audioType;

        if (musicAudio.paused || !musicAudio.currentTime) {
            applyMusicVolume(audioType);

            musicAudio.loop = true;
            musicAudio.play();
        }

        if (!musicFadeInterval) {
            musicFadeInterval = setInterval(tickMusicFade, MUSIC_FADE_TICK_MS);
        }

        return;
    }

    const soundEffectAudio = soundEffectAudios[audioType];
    if (soundEffectAudio) {
        // correct decision sound effect should take priority over any other that might be playing right now
        if (audioType === AudioType.CorrectDecision) {
            soundEffectAudios[AudioType.ClueResponseSubmitted]?.pause();
            soundEffectAudios[AudioType.WagerResponseSubmitted]?.pause();
        }

        soundEffectAudio.currentTime = 0;
        soundEffectAudio.play();
    }
}

// audio "stop" is done by pausing the audio. it'll always be restarted the next time it plays anyway
export function stopAudio(audioType: AudioType) {
    const musicAudio = musicAudios[audioType];
    if (musicAudio) {
        if (currentMusicAudioType === audioType) {
            currentMusicAudioType = undefined;
        }

        musicFadeLevels[audioType] = 0;
        musicAudio.pause();
    }

    soundEffectAudios[audioType]?.pause();
}

function getSpeechSynthesisVoice(voiceType: VoiceType) {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
        return;
    }

    // these Google voices will only be available while using Chrome or a Google device. use them if we possibly can, the alternative default will be whatever
    // is built in to this client's device
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

        if (voice.voiceURI === voiceURI) {
            return voice;
        }
    }

    return voices[0];
}

// only one voice line should ever be playing at a time. whenever a new one starts, whatever is in progress gets cut off
let currentVoiceAudio: HTMLAudioElement | undefined;

function stopVoiceInProgress() {
    if (currentVoiceAudio) {
        currentVoiceAudio.pause();
        URL.revokeObjectURL(currentVoiceAudio.src);
        currentVoiceAudio = undefined;
    }

    window.speechSynthesis.cancel();
}

export function playOpenAIVoice(voiceType: VoiceType, voiceLine: string) {
    stopVoiceInProgress();

    // stream the audio straight from the server so playback can begin before the whole file is ready
    const sessionName = localStorage[LocalStorageKey.SessionName] || "";
    const audio = new Audio(`/api/voice?sessionName=${encodeURIComponent(sessionName)}&voiceType=${voiceType}&voiceLine=${encodeURIComponent(voiceLine)}`);

    currentVoiceAudio = audio;

    audio.volume = getModVolume(VolumeType.Voice);
    audio.play().catch(e => console.error(`audio playback failed: ${e.message}`));

    audio.onended = () => {
        socket.emit(HostSocket.UpdateVoiceDuration, voiceLine, 0);
    }

    audio.onerror = () => {
        // the API stream failed for some reason... fall back to the browser's built-in voice
        playSpeechSynthesisVoice(voiceType, voiceLine);
    }
}

let utteranceStarted = false;
let utteranceStartedInterval: NodeJS.Timeout;

const MAX_UTTERANCE_RETRIES = 3;

export function playSpeechSynthesisVoice(voiceType: VoiceType, voiceLine: string, retryCount: number = 0) {
    const voice = getSpeechSynthesisVoice(voiceType);
    if (!voice) {
        return;
    }

    if (retryCount >= MAX_UTTERANCE_RETRIES) {
        clearInterval(utteranceStartedInterval);
        socket.emit(HostSocket.UpdateVoiceDuration, voiceLine, 0);
        return;
    }

    const utterance = new SpeechSynthesisUtterance(voiceLine);

    utterance.volume = getModVolume(VolumeType.Voice);
    utterance.voice = voice;
    utterance.rate = 1.3;
    utterance.onstart = () => {
        utteranceStarted = true;
        clearInterval(utteranceStartedInterval);
    }
    utterance.onend = () => {
        // this utterance has ended so our new duration should be... nothing cause we're done!
        socket.emit(HostSocket.UpdateVoiceDuration, voiceLine, 0);
    }
    utterance.onerror = (e) => {
        console.log(e);
    }

    clearInterval(utteranceStartedInterval);
    utteranceStartedInterval = setInterval(() => {
        if (!utteranceStarted) {
            // utterances randomly fail to start once in a while... not much I can do about an external API so just manually solving this
            // by recursing in order to retry the failed voice line
            playSpeechSynthesisVoice(voiceType, voiceLine, retryCount + 1);
        }
    }, 500);

    utteranceStarted = false;
    stopVoiceInProgress();
    window.speechSynthesis.speak(utterance);
}