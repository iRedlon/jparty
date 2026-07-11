import {
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  ListItem,
  Radio,
  RadioGroup,
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
import { HostSocket, PlayerSocket, VoiceType, VolumeType } from "jparty-shared";
import { useContext, useState } from "react";

import { LayoutContext } from "./Layout";
import { getVolume, updateVolume } from "../../misc/audio";
import {
  BACKGROUND_THEME_DISPLAY_NAMES,
  BACKGROUND_THEME_SWATCHES,
  BackgroundTheme,
  getBackgroundTheme,
  updateBackgroundTheme,
} from "../../misc/background-theme";
import { leaveQASession } from "../../misc/qa-dashboard";
import { socket } from "../../misc/socket";
import { LocalStorageKey } from "../../misc/ui-constants";

// volume needs to be clamped between 0 and 1 when it's actually used,
// but as a UI value: it needs to be on the scale of 0 to 100
const VOLUME_STATE_MULTIPLIER = 100;

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
  modernVoicesDisabled?: boolean;
}

export default function MenuPanel_Settings({
  voiceType,
  modernVoicesDisabled,
}: MenuPanel_SettingsProps) {
  const context = useContext(LayoutContext);

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

  const [backgroundTheme, setBackgroundTheme] = useState(getBackgroundTheme());

  const selectBackgroundTheme = (newTheme: BackgroundTheme) => {
    setBackgroundTheme(newTheme);
    updateBackgroundTheme(newTheme);
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
                  <Button
                    onClick={() =>
                      confirm("Are you sure?") &&
                      emitLeaveSession(context.isPlayer)
                    }
                    colorScheme="red"
                    w="full"
                    borderRadius="lg"
                  >
                    Leave session
                  </Button>
                </Stack>
              )}
            </Box>

            {/* Host settings */}
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
                    {/* Master */}
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

                    {/* Music */}
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

                    {/* Voice */}
                    <Box>
                      <Heading size="sm" mb={1}>
                        Host Voice
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

                      <Text mt={3} fontSize="sm" color={muted}>
                        <i>
                          "Modern" voices stream OpenAI text-to-speech. "Classic" voices use your browser's built-in screen reader
                        </i>
                      </Text>

                      <Box
                        mt={3}
                        bg={subtleBg}
                        borderRadius="xl"
                        p={3}
                        borderWidth="1px"
                        borderColor={borderColor}
                      >
                        <RadioGroup
                          isDisabled={context.isSpectator}
                          onChange={emitUpdateVoiceType}
                          value={voiceType}
                        >
                          <Wrap spacing={4} justify="center">
                            {!modernVoicesDisabled && (
                              <>
                                <WrapItem>
                                  <Radio value={VoiceType.ModernMasculine}>
                                    Modern (Masculine)
                                  </Radio>
                                </WrapItem>
                                <WrapItem>
                                  <Radio value={VoiceType.ModernFeminine}>
                                    Modern (Feminine)
                                  </Radio>
                                </WrapItem>
                              </>
                            )}

                            <WrapItem>
                              <Radio value={VoiceType.ClassicMasculine}>
                                Classic (Masculine)
                              </Radio>
                            </WrapItem>
                            <WrapItem>
                              <Radio value={VoiceType.ClassicFeminine}>
                                Classic (Feminine)
                              </Radio>
                            </WrapItem>
                          </Wrap>

                          {modernVoicesDisabled && (
                            <Text mt={3} fontSize="sm" color={muted}>
                              <i>
                                Note: modern voices are currently disabled due
                                to API limits. Use Google Chrome for best
                                classic voice experience
                              </i>
                            </Text>
                          )}
                        </RadioGroup>
                      </Box>
                    </Box>

                    {/* Sound FX */}
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
              </Box>
            </Box>
          </Stack>
        </Box>
      </Flex>
    </TabPanel>
  );
}
