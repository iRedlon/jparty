import {
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  Heading,
  ListItem,
  Select,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  TabPanel,
  Text,
  UnorderedList,
  useColorModeValue,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { DEFAULT_VOICE_SPEED, HostSocket, MAX_VOICE_SPEED, MIN_VOICE_SPEED, PlayerSocket, VoiceType, VolumeType } from "jparty-shared";
import { useContext, useEffect, useState } from "react";

import { LayoutContext } from "./Layout";
import {
  getAutomaticClassicVoice,
  getAvailableClassicVoices,
  getClassicVoiceOverrideURI,
  getVolume,
  updateClassicVoiceOverrideURI,
  updateVolume,
} from "../../misc/audio";
import {
  BACKGROUND_THEME_DISPLAY_NAMES,
  BACKGROUND_THEME_SWATCHES,
  BackgroundTheme,
  getBackgroundParticlesEnabled,
  getBackgroundTheme,
  updateBackgroundParticlesEnabled,
  updateBackgroundTheme,
} from "../../misc/background-theme";
import { leaveQASession } from "../../misc/qa-dashboard";
import { socket } from "../../misc/socket";
import { LocalStorageKey } from "../../misc/ui-constants";
import {
  getUIScale,
  MAX_UI_SCALE,
  MIN_UI_SCALE,
  updateUIScale,
} from "../../misc/ui-scale";

// volume needs to be clamped between 0 and 1 when it's actually used,
// but as a UI value: it needs to be on the scale of 0 to 100
const VOLUME_STATE_MULTIPLIER = 100;

const VOICE_SPEED_SLIDER_MAX = 100;
const VOICE_SPEED_SLIDER_STEP = 5;

function voiceSpeedToSliderPosition(voiceSpeed: number) {
  const speedRatio = Math.log(voiceSpeed / MIN_VOICE_SPEED);
  const sliderRatio = Math.log(MAX_VOICE_SPEED / MIN_VOICE_SPEED);

  return Math.round((speedRatio / sliderRatio) * VOICE_SPEED_SLIDER_MAX);
}

function sliderPositionToVoiceSpeed(sliderPosition: number) {
  const voiceSpeed =
    MIN_VOICE_SPEED *
    Math.pow(
      MAX_VOICE_SPEED / MIN_VOICE_SPEED,
      sliderPosition / VOICE_SPEED_SLIDER_MAX
    );

  return Math.round(voiceSpeed * 100) / 100;
}

export function emitLeaveSession(isPlayer: boolean) {
  if (localStorage[LocalStorageKey.SessionName]) {
    socket.emit(isPlayer ? PlayerSocket.LeaveSession : HostSocket.LeaveSession);
    localStorage.removeItem(LocalStorageKey.SessionName);
  }

  leaveQASession();
  location.reload();
}

interface MenuPanel_SettingsProps {
  voiceType?: VoiceType;
  voiceSpeed?: number;
  modernVoicesDisabled?: boolean;
}

export default function MenuPanel_Settings({
  voiceType,
  voiceSpeed,
  modernVoicesDisabled,
}: MenuPanel_SettingsProps) {
  const context = useContext(LayoutContext);

  const [isConfirmingLeaveSession, setIsConfirmingLeaveSession] =
    useState(false);

  const [masterVolume, setMasterVolume] = useState(
    getVolume(VolumeType.Master) * VOLUME_STATE_MULTIPLIER
  );
  const [musicVolume, setMusicVolume] = useState(
    getVolume(VolumeType.Music) * VOLUME_STATE_MULTIPLIER
  );
  const [voiceVolume, setVoiceVolume] = useState(
    getVolume(VolumeType.Voice) * VOLUME_STATE_MULTIPLIER
  );
  const [soundEffectsVolume, setSoundEffectsVolume] = useState(
    getVolume(VolumeType.SoundEffects) * VOLUME_STATE_MULTIPLIER
  );

  const [voiceSpeedPosition, setVoiceSpeedPosition] = useState(
    voiceSpeedToSliderPosition(voiceSpeed ?? DEFAULT_VOICE_SPEED)
  );

  useEffect(() => {
    const newVoiceSpeed = voiceSpeed ?? DEFAULT_VOICE_SPEED;

    setVoiceSpeedPosition((currentPosition) =>
      sliderPositionToVoiceSpeed(currentPosition) === newVoiceSpeed
        ? currentPosition
        : voiceSpeedToSliderPosition(newVoiceSpeed)
    );
  }, [voiceSpeed]);

  const [classicVoiceURI, setClassicVoiceURI] = useState(
    getClassicVoiceOverrideURI()
  );
  const [classicVoices, setClassicVoices] = useState(
    getAvailableClassicVoices()
  );

  // speech synthesis voices can load in asynchronously after the page does
  useEffect(() => {
    if (!window.speechSynthesis) {
      return;
    }

    const handleVoicesChanged = () =>
      setClassicVoices(getAvailableClassicVoices());

    handleVoicesChanged();
    window.speechSynthesis.addEventListener(
      "voiceschanged",
      handleVoicesChanged
    );

    return () =>
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        handleVoicesChanged
      );
  }, []);

  const [backgroundTheme, setBackgroundTheme] = useState(getBackgroundTheme());
  const [backgroundParticlesEnabled, setBackgroundParticlesEnabled] = useState(
    getBackgroundParticlesEnabled()
  );
  const [uiScale, setUIScale] = useState(getUIScale());

  const selectBackgroundTheme = (newTheme: BackgroundTheme) => {
    setBackgroundTheme(newTheme);
    updateBackgroundTheme(newTheme);
  };

  const selectBackgroundParticlesEnabled = (enabled: boolean) => {
    setBackgroundParticlesEnabled(enabled);
    updateBackgroundParticlesEnabled(enabled);
  };

  const updateVolumeState = (volumeType: VolumeType, volume: number) => {
    switch (volumeType) {
      case VolumeType.Master:
        setMasterVolume(volume);
        break;
      case VolumeType.Music:
        setMusicVolume(volume);
        break;
      case VolumeType.Voice:
        setVoiceVolume(volume);
        break;
      case VolumeType.SoundEffects:
        setSoundEffectsVolume(volume);
        break;
    }

    updateVolume(volumeType, volume / VOLUME_STATE_MULTIPLIER);
  };

  const emitUpdateVoiceType = (voiceType: VoiceType) => {
    socket.emit(HostSocket.UpdateVoiceType, voiceType);
  };

  const emitUpdateVoiceSpeed = (sliderPosition: number) => {
    socket.emit(
      HostSocket.UpdateVoiceSpeed,
      sliderPositionToVoiceSpeed(sliderPosition)
    );
  };

  const getHostVoiceOptions = (masculine: boolean) => {
    let options: { value: string; label: string }[] = [];

    if (!modernVoicesDisabled) {
      options.push(
        masculine
          ? { value: VoiceType.ModernMasculine, label: "OpenAI Echo" }
          : { value: VoiceType.ModernFeminine, label: "OpenAI Nova" }
      );
    }

    const classicVoiceType = masculine
      ? VoiceType.ClassicMasculine
      : VoiceType.ClassicFeminine;

    for (const voice of masculine
      ? classicVoices.masculine
      : classicVoices.feminine) {
      options.push({
        value: `${classicVoiceType}:${voice.voiceURI}`,
        label: voice.name,
      });
    }

    return options;
  };

  const masculineVoiceOptions = getHostVoiceOptions(true);
  const feminineVoiceOptions = getHostVoiceOptions(false);

  const getHostVoiceValueFromSession = () => {
    if (
      !modernVoicesDisabled &&
      (voiceType === VoiceType.ModernMasculine ||
        voiceType === VoiceType.ModernFeminine)
    ) {
      return voiceType;
    }

    const isFeminine =
      voiceType === VoiceType.ClassicFeminine ||
      voiceType === VoiceType.ModernFeminine;

    const classicVoiceType = isFeminine
      ? VoiceType.ClassicFeminine
      : VoiceType.ClassicMasculine;

    const voiceGroup = isFeminine
      ? classicVoices.feminine
      : classicVoices.masculine;

    if (
      classicVoiceURI &&
      voiceGroup.some((voice) => voice.voiceURI === classicVoiceURI)
    ) {
      return `${classicVoiceType}:${classicVoiceURI}`;
    }

    const automaticVoice = getAutomaticClassicVoice(classicVoiceType);
    return automaticVoice ? `${classicVoiceType}:${automaticVoice.voiceURI}` : "";
  };

  const [hostVoiceValue, setHostVoiceValue] = useState(
    getHostVoiceValueFromSession
  );

  useEffect(() => {
    setHostVoiceValue(getHostVoiceValueFromSession());
  }, [voiceType, modernVoicesDisabled]);

  useEffect(() => {
    const isValidOption = [
      ...masculineVoiceOptions,
      ...feminineVoiceOptions,
    ].some((option) => option.value === hostVoiceValue);

    if (!isValidOption) {
      setHostVoiceValue(getHostVoiceValueFromSession());
    }
  }, [classicVoices]);

  const selectHostVoice = (value: string) => {
    setHostVoiceValue(value);

    if (
      value === VoiceType.ModernMasculine ||
      value === VoiceType.ModernFeminine
    ) {
      emitUpdateVoiceType(value as VoiceType);
      return;
    }

    const separatorIndex = value.indexOf(":");
    if (separatorIndex < 0) {
      return;
    }

    const classicVoiceType = value.substring(0, separatorIndex) as VoiceType;
    const voiceURI = value.substring(separatorIndex + 1);

    setClassicVoiceURI(voiceURI);
    updateClassicVoiceOverrideURI(voiceURI);
    emitUpdateVoiceType(classicVoiceType);
  };

  const cardBg = useColorModeValue("white", "gray.900");
  const subtleBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted = useColorModeValue("gray.600", "gray.300");

  return (
    <TabPanel px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }}>
      <Flex justify="center">
        <Box w="full" maxW="lg">
          <Stack spacing={5}>
            {/* Session status */}
            <Box
              bg={subtleBg}
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="2xl"
              px={{ base: 4, md: 5 }}
              py={{ base: 3, md: 4 }}
            >
              {context.sessionName && (
                <Stack spacing={3}>
                  <Text>
                    You are in session: <b>{context.sessionName}</b>
                  </Text>

                  {!isConfirmingLeaveSession && (
                    <Button
                      onClick={() => setIsConfirmingLeaveSession(true)}
                      colorScheme="red"
                      w="full"
                      borderRadius="lg"
                    >
                      Leave session
                    </Button>
                  )}

                  {isConfirmingLeaveSession && (
                    <>
                      <Text>Are you sure?</Text>
                      <Stack direction="row">
                        <Button
                          onClick={() => emitLeaveSession(context.isPlayer)}
                          colorScheme="red"
                          w="full"
                          borderRadius="lg"
                        >
                          Yes, leave session
                        </Button>
                        <Button
                          onClick={() => setIsConfirmingLeaveSession(false)}
                          w="full"
                          borderRadius="lg"
                        >
                          Cancel
                        </Button>
                      </Stack>
                    </>
                  )}
                </Stack>
              )}
            </Box>

            {/* UI scale */}
            <Box
              bg={cardBg}
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="2xl"
              boxShadow="md"
            >
              <Box px={{ base: 4, md: 5 }} py={{ base: 3, md: 4 }}>
                <Flex justify="space-between" align="center">
                  <Heading size="md">UI scale</Heading>
                  <Text color={muted}>{uiScale}%</Text>
                </Flex>
              </Box>

              <Divider />

              <Box px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }}>
                <Slider
                  value={uiScale}
                  min={MIN_UI_SCALE}
                  max={MAX_UI_SCALE}
                  onChange={setUIScale}
                  onChangeEnd={updateUIScale}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb outline="gray solid 1px" />
                </Slider>
              </Box>
            </Box>

            {/* Volume */}
            {!context.isPlayer && (
              <Box
                bg={cardBg}
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="2xl"
                boxShadow="md"
              >
                <Box px={{ base: 4, md: 5 }} py={{ base: 3, md: 4 }}>
                  <Heading size="md">Volume</Heading>
                </Box>

                <Divider />

                <Box px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }}>
                  <Stack spacing={5}>
                    <Box>
                      <Heading size="sm" mb={1}>
                        Master
                      </Heading>
                      <Slider
                        value={masterVolume}
                        onChange={(v) =>
                          updateVolumeState(VolumeType.Master, v)
                        }
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb outline="gray solid 1px" />
                      </Slider>
                    </Box>

                    <Box>
                      <Heading size="sm" mb={1}>
                        Music
                      </Heading>
                      <Slider
                        value={musicVolume}
                        onChange={(v) => updateVolumeState(VolumeType.Music, v)}
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb outline="gray solid 1px" />
                      </Slider>
                    </Box>

                    <Box>
                      <Heading size="sm" mb={1}>
                        Sound FX
                      </Heading>
                      <Slider
                        value={soundEffectsVolume}
                        onChange={(v) =>
                          updateVolumeState(VolumeType.SoundEffects, v)
                        }
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb outline="gray solid 1px" />
                      </Slider>
                    </Box>
                  </Stack>
                </Box>
              </Box>
            )}

            {!context.isPlayer && (
              <Box
                bg={cardBg}
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="2xl"
                boxShadow="md"
              >
                <Box px={{ base: 4, md: 5 }} py={{ base: 3, md: 4 }}>
                  <Heading size="md">Host voice</Heading>
                </Box>

                <Divider />

                <Box px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }}>
                  <Stack spacing={5}>
                    <Box>
                      <Heading size="sm" mb={1}>
                        Voice
                      </Heading>
                      <Select
                        isDisabled={context.isSpectator}
                        value={hostVoiceValue}
                        onChange={(e) => selectHostVoice(e.target.value)}
                      >
                        <optgroup label="Masculine">
                          {masculineVoiceOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Feminine">
                          {feminineVoiceOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </optgroup>
                      </Select>

                      {modernVoicesDisabled && (
                        <Text mt={2} fontSize="sm" color={muted}>
                          <i>
                            OpenAI voices are currently disabled due to API
                            limits. Use Google Chrome for the best voice
                            experience
                          </i>
                        </Text>
                      )}
                    </Box>

                    <Box>
                      <Heading size="sm" mb={1}>Speed</Heading>
                      <Slider
                        isDisabled={context.isSpectator}
                        value={voiceSpeedPosition}
                        min={0}
                        max={VOICE_SPEED_SLIDER_MAX}
                        step={VOICE_SPEED_SLIDER_STEP}
                        onChange={setVoiceSpeedPosition}
                        onChangeEnd={emitUpdateVoiceSpeed}
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb outline="gray solid 1px" />
                      </Slider>
                    </Box>

                    <Box>
                      <Heading size="sm" mb={1}>
                        Volume
                      </Heading>
                      <Slider
                        value={voiceVolume}
                        onChange={(v) => updateVolumeState(VolumeType.Voice, v)}
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb outline="gray solid 1px" />
                      </Slider>
                    </Box>
                  </Stack>
                </Box>
              </Box>
            )}
            
            {/* Background theme */}
            <Box
              bg={cardBg}
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="2xl"
              boxShadow="md"
            >
              <Box px={{ base: 4, md: 5 }} py={{ base: 3, md: 4 }}>
                <Heading size="md">Background theme</Heading>
              </Box>

              <Divider />

              <Box px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }}>
                <Wrap spacing={5} justify="center">
                  {Object.values(BackgroundTheme).map((themeOption) => (
                    <WrapItem key={themeOption}>
                      <Stack spacing={2} align="center">
                        <Box
                          as="button"
                          onClick={() => selectBackgroundTheme(themeOption)}
                          height="4.5em"
                          width="4.5em"
                          borderRadius="xl"
                          background={BACKGROUND_THEME_SWATCHES[themeOption]}
                          outline={
                            backgroundTheme === themeOption
                              ? "3px solid"
                              : "1px solid"
                          }
                          outlineColor={
                            backgroundTheme === themeOption
                              ? "blue.400"
                              : borderColor
                          }
                          outlineOffset="2px"
                        />
                        <Text
                          fontSize="sm"
                          fontWeight={
                            backgroundTheme === themeOption ? "bold" : "normal"
                          }
                        >
                          {BACKGROUND_THEME_DISPLAY_NAMES[themeOption]}
                        </Text>
                      </Stack>
                    </WrapItem>
                  ))}
                </Wrap>

                <Flex justify="center" mt={5}>
                  <Checkbox
                    isDisabled={backgroundTheme === BackgroundTheme.Kaleidoscope}
                    isChecked={backgroundParticlesEnabled}
                    onChange={(e) =>
                      selectBackgroundParticlesEnabled(e.target.checked)
                    }
                  >
                    Show moving squares
                  </Checkbox>
                </Flex>
              </Box>
            </Box>
          </Stack>
        </Box>
      </Flex>
    </TabPanel>
  );
}
