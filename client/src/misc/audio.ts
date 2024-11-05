
import { AudioType, HostSocket, VoiceType, VolumeType } from "jparty-shared";

import { socket } from "./socket";
import BuzzWindowTimeoutMP3 from "../assets/buzz-window-timeout.mp3";
import ApplauseMP3 from "../assets/applause.mp3";
import GameMusicMP3 from "../assets/game-music.mp3";
// import LobbyMusicMP3 from "../assets/lobby-music.mp3";
import LongApplauseMP3 from "../assets/long-applause.mp3";

// music
// todo: if we want to play a different song on the lobby than during the game... re-implement the "lobby music" audio type
// const lobbyMusicAudio = new Audio(LobbyMusicMP3);
const gameMusicAudio = new Audio(GameMusicMP3);

// sound FX
const buzzWindowTimeoutAudio = new Audio(BuzzWindowTimeoutMP3);
const applauseAudio = new Audio(ApplauseMP3);
const longApplauseAudio = new Audio(LongApplauseMP3);

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

export function updateVolume(volumeType: VolumeType, volume: number) {
    localStorage.setItem(volumeType, `${volume}`);

    // update the volume for any audios that may be in progress
    // lobbyMusicAudio.volume = getModVolume(VolumeType.Music);
    gameMusicAudio.volume = getModVolume(VolumeType.Music);
    
    buzzWindowTimeoutAudio.volume = getModVolume(VolumeType.SoundEffects);
    applauseAudio.volume = getModVolume(VolumeType.SoundEffects);
    longApplauseAudio.volume = getModVolume(VolumeType.SoundEffects);
}

// make sure all of our audios default to this client's current volume settings
updateVolume(VolumeType.Master, getVolume(VolumeType.Master));
updateVolume(VolumeType.Music, getVolume(VolumeType.Music));
updateVolume(VolumeType.SoundEffects, getVolume(VolumeType.SoundEffects));

export function playAudio(audioType: AudioType) {
    switch (audioType) {
        // case AudioType.LobbyMusic:
        //     {
        //         if (lobbyMusicAudio.paused || !lobbyMusicAudio.currentTime) {
        //             gameMusicAudio.pause();

        //             lobbyMusicAudio.loop = true;
        //             lobbyMusicAudio.play();
        //         }
        //     }
        //     break;
        case AudioType.GameMusic:
            {
                if (gameMusicAudio.paused || !gameMusicAudio.currentTime) {
                    // lobbyMusicAudio.pause();

                    gameMusicAudio.loop = true;
                    gameMusicAudio.play();
                }
            }
            break;
        case AudioType.BuzzWindowTimeout:
            {
                buzzWindowTimeoutAudio.currentTime = 0;
                buzzWindowTimeoutAudio.play();
            }
            break;
        case AudioType.Applause:
            {
                applauseAudio.currentTime = 0;
                applauseAudio.play();
            }
            break;
        case AudioType.LongApplause:
            {
                longApplauseAudio.currentTime = 0;
                longApplauseAudio.play();
            }
            break;
    }
}

// audio "stop" is done by pausing the audio. it'll always be restarted the next time it plays anyway
export function stopAudio(audioType: AudioType) {
    switch (audioType) {
        case AudioType.Applause:
            {
                applauseAudio.pause();
            }
            break;
        case AudioType.LongApplause:
            {
                longApplauseAudio.pause();
            }
            break;
    }
}

function getSpeechSynthesisVoice(voiceType: VoiceType) {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
        return;
    }

    // these Google voices will only be available while using Chrome or a Google device. use them if we possibly can, the alternative default will be whatever
    // is built in to this client's device. Most likely that's Microsoft David but who knows
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

export function playOpenAIVoice(audioBase64: string) {
    const audioBlob = new Blob([Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))], { type: "audio/mpeg" }); //  converts the base64 string back into a binary blob
    const audioUrl = URL.createObjectURL(audioBlob); // URL for the blob so it can be used as a source
    const audio = new Audio(audioUrl);

    audio.volume = getModVolume(VolumeType.Voice);
    audio.play().catch(e => console.error(`audio playback failed: ${e.message}`));

    audio.onloadedmetadata = () => {
        socket.emit(HostSocket.UpdateVoiceDuration, audio.duration);
    }
}

let utteranceStarted = false;
let utteranceStartedInterval: NodeJS.Timeout;

export function playSpeechSynthesisVoice(voiceType: VoiceType, voiceLine: string) {
    const voice = getSpeechSynthesisVoice(voiceType);
    if (!voice) {
        return;
    }

    const utterance = new SpeechSynthesisUtterance(voiceLine);

    utterance.volume = getModVolume(VolumeType.Voice);
    utterance.voice = voice;
    utterance.rate = 1.2;
    utterance.onstart = () => {
        utteranceStarted = true;
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
            playSpeechSynthesisVoice(voiceType, voiceLine);
        }
    }, 500);

    utteranceStarted = false;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}