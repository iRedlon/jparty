
import { LayoutContext } from "./Layout";
import { socket } from "../../misc/socket";
import { getVolume, updateVolume } from "../../misc/sound-fx";

import {
    Box, Button, Divider, Heading, Radio, RadioGroup,
    Slider, SliderThumb, SliderFilledTrack, SliderTrack, Stack, TabPanel, Text
} from "@chakra-ui/react";
import { HostSocket, PlayerSocket, VoiceType, VolumeType } from "jparty-shared";
import { useContext, useState } from "react";

export function emitLeaveSession(isPlayer: boolean) {
    if (localStorage.sessionName) {
        socket.emit(isPlayer ? PlayerSocket.LeaveSession : HostSocket.LeaveSession);
        localStorage.removeItem("sessionName");
    }

    location.reload();
}

// volume needs to be clamped between 0 and 1 when it's actually used, but as a UI value: it needs to be on the scale of 0 to 100
const VOLUME_STATE_MULTIPLIER = 100;

export default function MenuPanel_Settings() {
    const context = useContext(LayoutContext);
    
    const [musicVolume, setMusicVolume] = useState(getVolume(VolumeType.Music) * VOLUME_STATE_MULTIPLIER);
    const [voiceVolume, setVoiceVolume] = useState(getVolume(VolumeType.Voice) * VOLUME_STATE_MULTIPLIER);
    const [soundEffectsVolume, setSoundEffectsVolume] = useState(getVolume(VolumeType.SoundEffects) * VOLUME_STATE_MULTIPLIER);

    const updateVolumeState = (volumeType: VolumeType, volume: number) => {
        switch (volumeType) {
            case VolumeType.Music:
                {
                    setMusicVolume(volume);
                }
                break;
            case VolumeType.Voice:
                {
                    setVoiceVolume(volume);
                }
                break;
            case VolumeType.SoundEffects:
                {
                    setSoundEffectsVolume(volume);
                }
                break;
        }

        updateVolume(volumeType, volume / VOLUME_STATE_MULTIPLIER);
    }

    const emitUpdateVoiceType = (voiceType: VoiceType) => {
        socket.emit(HostSocket.UpdateVoiceType, voiceType);
    }

    return (
        <TabPanel>
            {
                context.sessionName && (
                    <>
                        <Stack direction={"column"}>
                            <Text>You are in session: <b>{context.sessionName}</b></Text>
                        </Stack>
                        <Button onClick={() => confirm("Are you sure?") && emitLeaveSession(context.isPlayer)} marginTop={"1em"} colorScheme={"red"}>
                            Leave session
                        </Button>
                        <Divider margin={"1em"} />
                    </>
                )
            }

            {
                !context.isPlayer && (
                    <>
                        <Heading size={"md"}>Volume</Heading>

                        <Box margin={"1em"}>
                            <Heading size={"sm"}>Music</Heading>
                            <Slider value={musicVolume} onChange={volume => updateVolumeState(VolumeType.Music, volume)}>
                                <SliderTrack>
                                    <SliderFilledTrack />
                                </SliderTrack>
                                <SliderThumb outline={"gray solid 1px"} />
                            </Slider>
                        </Box>

                        <Box margin={"1em"}>
                            <Heading size={"sm"}>Host Voice</Heading>
                            <Slider value={voiceVolume} onChange={volume => updateVolumeState(VolumeType.Voice, volume)}>
                                <SliderTrack>
                                    <SliderFilledTrack />
                                </SliderTrack>
                                <SliderThumb outline={"gray solid 1px"} />
                            </Slider>

                            <RadioGroup isDisabled={context.isSpectator} onChange={emitUpdateVoiceType} value={context.voiceType}>
                                <Stack direction={"row"} justifyContent={"center"}>
                                    <Radio value={VoiceType.ModernMasculine}>Modern (Masculine)</Radio>
                                    <Radio value={VoiceType.ModernFeminine}>Modern (Feminine)</Radio>
                                    <Radio value={VoiceType.ClassicMasculine}>Classic (Masculine)</Radio>
                                    <Radio value={VoiceType.ClassicFeminine}>Classic (Feminine)</Radio>
                                </Stack>
                            </RadioGroup>
                        </Box>

                        <Box margin={"1em"}>
                            <Heading size={"sm"}>Sound FX</Heading>
                            <Slider value={soundEffectsVolume} onChange={volume => updateVolumeState(VolumeType.SoundEffects, volume)}>
                                <SliderTrack>
                                    <SliderFilledTrack />
                                </SliderTrack>
                                <SliderThumb outline={"gray solid 1px"} />
                            </Slider>
                        </Box>
                    </>
                )
            }
        </TabPanel>
    );
}