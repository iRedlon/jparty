import {
  Box,
  Button,
  Collapse,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  Radio,
  RadioGroup,
  Stack,
  Tab,
  Tabs,
  TabList,
  TabPanel,
  TabPanels,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  NORMAL_SINGLE_ROUND_SETTINGS,
  NORMAL_GAME_SETTINGS,
  HostSocket,
  PARTY_GAME_SETTINGS,
  SessionState,
  TEST_GAME_SETTINGS,
  TriviaGameDifficulty,
  TriviaGameRating,
  TriviaGameSettings,
  TriviaRoundSettings,
} from "jparty-shared";
import { useContext, useEffect, useState } from "react";

import RoundSettings, { numberInputForm } from "./RoundSettings";
import { LayoutContext } from "../common/Layout";
import { socket } from "../../misc/socket";

export interface GameSettingsProps {
  onCloseHostMenu: Function;
}

export default function GameSettings({ onCloseHostMenu }: GameSettingsProps) {
  const context = useContext(LayoutContext);

  const [gameSettings, setGameSettings] = useState(
    TriviaGameSettings.clone(NORMAL_GAME_SETTINGS)
  );
  const [selectedRoundIndex, setSelectedRoundIndex] = useState(-1);
  const [rating, setRating] = useState<TriviaGameRating>();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setRating(gameSettings.getRating());
    setIsSubmitted(false);
  }, [gameSettings]);

  const emitGenerateCustomGame = () => {
    setIsLoading(true);
    setIsSubmitted(true);

    socket.emit(
      HostSocket.GenerateCustomGame,
      gameSettings,
      (success: boolean) => {
        if (success) {
          onCloseHostMenu();
        }
        setIsLoading(false);
      }
    );
  };

  const canUpdateSettings = () => {
    return !context.isSpectator && context.sessionState === SessionState.Lobby;
  };

  const applySettings = (settings: TriviaGameSettings) => {
    if (!canUpdateSettings()) return;

    setGameSettings(TriviaGameSettings.clone(settings));
    setSelectedRoundIndex(-1);
  };

  const addRound = () => {
    if (!canUpdateSettings() || !gameSettings.canAddRound()) return;

    const next = TriviaGameSettings.clone(gameSettings);
    next.roundSettings.push(
      TriviaRoundSettings.clone(NORMAL_SINGLE_ROUND_SETTINGS)
    );
    setGameSettings(next);
  };

  const deleteRound = (roundIndex: number) => {
    if (!canUpdateSettings() || !gameSettings.canDeleteRound()) return;

    const next = TriviaGameSettings.clone(gameSettings);
    next.roundSettings.splice(roundIndex, 1);
    setGameSettings(next);

    setSelectedRoundIndex(roundIndex > 0 ? roundIndex - 1 : 0);
  };

  const updateGameSettings = (key: string) => (value: string) => {
    if (!canUpdateSettings()) return;

    const numValue = parseInt(value);
    if (isNaN(numValue)) return;

    const next = TriviaGameSettings.clone(gameSettings);
    (next as any)[key] = numValue;
    setGameSettings(next);
  };

  const heading =
    context.sessionState === SessionState.Lobby ? (
      <Heading size="md" textAlign="center">
        {context.isSpectator
          ? "Only the session creator can customize game settings"
          : "Customize your game settings; then save them down below"}
      </Heading>
    ) : (
      <Heading size="md" textAlign="center">
        This game is in progress. Settings are now locked
      </Heading>
    );

  const presetButtons = canUpdateSettings() && (
    <Stack direction="row" justify="center" spacing={3} flexWrap="wrap">
      <Button
        onClick={() => applySettings(NORMAL_GAME_SETTINGS)}
        colorScheme="blue"
        variant="outline"
        size="sm"
      >
        Use normal settings
      </Button>
      <Button
        onClick={() => applySettings(PARTY_GAME_SETTINGS)}
        colorScheme="blue"
        variant="outline"
        size="sm"
      >
        Use party settings
      </Button>
      {context.debugMode && (
        <Button
          onClick={() => applySettings(TEST_GAME_SETTINGS)}
          colorScheme="blue"
          variant="outline"
          size="sm"
        >
          Use test settings
        </Button>
      )}
    </Stack>
  );

  const minClueYearForm = numberInputForm(
    "Minimum clue year",
    "",
    "minClueYear",
    gameSettings.minClueYear,
    TriviaGameSettings.MIN_CLUE_YEAR,
    TriviaGameSettings.MAX_CLUE_YEAR,
    () => !canUpdateSettings(),
    () => gameSettings.isMinClueYearInvalid(),
    updateGameSettings
  );

  const difficultyForm = (
    <FormControl>
      <FormLabel textAlign="center" me={0}>
        Difficulty
      </FormLabel>
      <RadioGroup
        isDisabled={!canUpdateSettings()}
        value={gameSettings.difficulty.toString()}
        onChange={updateGameSettings("difficulty")}
      >
        <Stack direction="row" justify="center" spacing={6}>
          <Radio value={TriviaGameDifficulty.Easy.toString()}>Easy</Radio>
          <Radio value={TriviaGameDifficulty.Normal.toString()}>Normal</Radio>
          <Radio value={TriviaGameDifficulty.Hard.toString()}>Hard</Radio>
        </Stack>
      </RadioGroup>
    </FormControl>
  );

  const buzzWindowDurationForm = numberInputForm(
    "Buzz window",
    "How long you have to buzz in",
    "buzzWindowDurationSec",
    gameSettings.buzzWindowDurationSec,
    TriviaGameSettings.MIN_BUZZ_WINDOW_DURATION_SEC,
    TriviaGameSettings.MAX_BUZZ_WINDOW_DURATION_SEC,
    () => !canUpdateSettings(),
    () => gameSettings.isBuzzWindowDurationInvalid(),
    updateGameSettings
  );

  const responseDurationForm = numberInputForm(
    "Response window",
    "How long you have to type your clue response or wager",
    "responseDurationSec",
    gameSettings.responseDurationSec,
    TriviaGameSettings.MIN_RESPONSE_DURATION_SEC,
    TriviaGameSettings.MAX_RESPONSE_DURATION_SEC,
    () => !canUpdateSettings(),
    () => gameSettings.isResponseDurationInvalid(),
    updateGameSettings
  );

  const revealDecisionDurationForm = numberInputForm(
    "Clue decision reveal",
    "How long you have to see each clue decision",
    "revealDecisionDurationSec",
    gameSettings.revealDecisionDurationSec,
    TriviaGameSettings.MIN_REVEAL_DECISION_DURATION_SEC,
    TriviaGameSettings.MAX_REVEAL_DECISION_DURATION_SEC,
    () => !canUpdateSettings(),
    () => gameSettings.isRevealDecisionDurationInvalid(),
    updateGameSettings
  );

  const gameSummary = rating && (
    <Box textAlign="center">
      <Heading size="md">{gameSettings.getTotalNumClues()} total clues</Heading>
      <Text fontSize="sm">
        Estimated game time: {gameSettings.getEstimatedGameDuration()} minutes
      </Text>

      <Divider my={3} />

      <Text fontSize="sm">
        This game will {rating.isRated ? "" : "not"} count for the public
        leaderboard
      </Text>
      {!rating.isRated && (
        <Text fontSize="xs">reason: {rating.notRatedReason}</Text>
      )}

      {canUpdateSettings() && (
        <Button
          onClick={emitGenerateCustomGame}
          isDisabled={
            isSubmitted || gameSettings.isInvalid() || !canUpdateSettings()
          }
          isLoading={isLoading}
          colorScheme="blue"
          size="md"
          mt={4}
        >
          Save settings
        </Button>
      )}
    </Box>
  );

  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const sectionBg = useColorModeValue("gray.50", "whiteAlpha.100");

  return (
    <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 6 }}>
      <Box maxW="3xl" mx="auto">
        <Box
          bg={cardBg}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="2xl"
          boxShadow="md"
          p={{ base: 4, md: 6 }}
        >
          <Stack spacing={6}>
            {heading}
            {presetButtons}

            <Box bg={sectionBg} p={4} borderRadius="xl">
              <Stack spacing={4}>
                {minClueYearForm}
                {difficultyForm}
              </Stack>
            </Box>

            <Box bg={sectionBg} p={4} borderRadius="xl">
              <Heading size="md" mb={4}>
                Timer Durations
              </Heading>
              <Stack spacing={4}>
                {buzzWindowDurationForm}
                {responseDurationForm}
                {revealDecisionDurationForm}
              </Stack>
            </Box>

            <Box bg={sectionBg} p={4} borderRadius="xl">
              <Heading size="md" mb={4}>
                Round Settings
              </Heading>

              <Tabs index={selectedRoundIndex}>
                <TabList justifyContent="center" flexWrap="wrap">
                  {[...Array(gameSettings.roundSettings.length)].map(
                    (_, roundIndex) => (
                      <Tab
                        key={roundIndex}
                        onClick={() =>
                          setSelectedRoundIndex(
                            roundIndex === selectedRoundIndex ? -1 : roundIndex
                          )
                        }
                      >
                        {`Round ${roundIndex + 1}`}
                      </Tab>
                    )
                  )}

                  {gameSettings.canAddRound() && canUpdateSettings() && (
                    <Tab onClick={addRound}>Add Round</Tab>
                  )}
                </TabList>

                <TabPanels>
                  {gameSettings.roundSettings.map(
                    (
                      roundSettings: TriviaRoundSettings,
                      roundIndex: number
                    ) => (
                      <Collapse
                        in={roundIndex === selectedRoundIndex}
                        key={roundIndex}
                      >
                        <TabPanel>
                          <RoundSettings
                            gameSettings={gameSettings}
                            setGameSettings={setGameSettings}
                            roundIndex={roundIndex}
                            roundSettings={roundSettings}
                            gameSummary={gameSummary}
                            canUpdateSettings={canUpdateSettings}
                            deleteRound={deleteRound}
                          />
                        </TabPanel>
                      </Collapse>
                    )
                  )}
                </TabPanels>
              </Tabs>
            </Box>

            {selectedRoundIndex === -1 && gameSummary}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
