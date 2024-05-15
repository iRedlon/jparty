
import RoundSettings, { numberInputForm } from "./RoundSettings";
import { LayoutContext } from "../common/Layout";
import { socket } from "../../misc/socket";

import {
    AbsoluteCenter, Box, Button, Collapse, Divider, FormControl, FormLabel, Heading,
    Radio, RadioGroup, Stack, Tab, Tabs, TabList, TabPanel, TabPanels, Text
} from "@chakra-ui/react";
import {
    DEFAULT_SINGLE_ROUND_SETTINGS, DEFAULT_GAME_SETTINGS, HostSocket, PARTY_GAME_SETTINGS, SessionState, TEST_GAME_SETTINGS,
    TriviaGameDifficulty, TriviaGameRating, TriviaGameSettings, TriviaRoundSettings
} from "jparty-shared";
import { useContext, useEffect, useState } from "react";

export interface GameSettingsProps {
    onCloseHostMenu: Function
}

export default function GameSettings({ onCloseHostMenu }: GameSettingsProps) {
    const context = useContext(LayoutContext);
    const [gameSettings, setGameSettings] = useState(TriviaGameSettings.clone(DEFAULT_GAME_SETTINGS));
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

        socket.emit(HostSocket.GenerateCustomGame, gameSettings, (success: boolean) => {
            if (success) {
                onCloseHostMenu();
            }

            setIsLoading(false);
        });
    }

    const canUpdateSettings = () => {
        return !context.isSpectator && (context.sessionState === SessionState.Lobby);
    }

    const applySettings = (settings: TriviaGameSettings) => {
        if (!canUpdateSettings()) {
            return;
        }

        setGameSettings(TriviaGameSettings.clone(settings));
        setSelectedRoundIndex(-1);
    }

    const addRound = () => {
        if (!canUpdateSettings() || !gameSettings.canAddRound()) {
            return;
        }

        let newGameSettings = TriviaGameSettings.clone(gameSettings);
        newGameSettings.roundSettings.push(TriviaRoundSettings.clone(DEFAULT_SINGLE_ROUND_SETTINGS));

        setGameSettings(newGameSettings);
    }

    const deleteRound = (roundIndex: number) => {
        if (!canUpdateSettings() || !gameSettings.canDeleteRound()) {
            return;
        }

        let newGameSettings = TriviaGameSettings.clone(gameSettings);
        newGameSettings.roundSettings.splice(roundIndex, 1);

        setGameSettings(newGameSettings);

        // fall back to previous round tab
        setSelectedRoundIndex(roundIndex > 0 ? roundIndex - 1 : 0);
    }

    const updateGameSettings = (key: string) => (value: string) => {
        if (!canUpdateSettings()) {
            return;
        }

        const numValue = parseInt(value);
        if (isNaN(numValue)) {
            return;
        }

        let newGameSettings = TriviaGameSettings.clone(gameSettings);
        (newGameSettings as any)[key] = numValue;

        setGameSettings(newGameSettings);
    }

    const heading = (context.sessionState === SessionState.Lobby) ? (
        <Heading size={"md"}>
            {context.isSpectator ? "Only the session creator can update game settings" : "Customize your settings (or use a preset), then generate your game below"}
        </Heading>
    ) : (
        <Heading size={"md"}>This game is in progress. Settings are now locked</Heading>
    );

    const presetButtons = canUpdateSettings() && (
        <Stack direction={"row"} justify={"center"} marginTop={"0.5em"} marginBottom={"0.5em"}>
            <Button onClick={() => applySettings(DEFAULT_GAME_SETTINGS)} colorScheme={"blue"} variant={"outline"} size={"sm"} margin={"0.5em"}>Use default settings</Button>
            <Button onClick={() => applySettings(PARTY_GAME_SETTINGS)} colorScheme={"blue"} variant={"outline"} size={"sm"} margin={"0.5em"}>Use party settings</Button>
            {context.debugMode && (
                <Button onClick={() => applySettings(TEST_GAME_SETTINGS)} colorScheme={"blue"} variant={"outline"} size={"sm"} margin={"0.5em"}>Use test settings</Button>
            )}
        </Stack>
    );

    const minClueYearForm = numberInputForm("Minimum clue year",
        "",
        "minClueYear",
        gameSettings.minClueYear,
        TriviaGameSettings.MIN_CLUE_YEAR,
        TriviaGameSettings.MAX_CLUE_YEAR,
        () => !canUpdateSettings(),
        () => gameSettings.isMinClueYearInvalid(),
        updateGameSettings);

    const difficultyForm = (
        <FormControl>
            <FormLabel textAlign={"center"} me={0}>Difficulty</FormLabel>
            <RadioGroup isDisabled={!canUpdateSettings()} value={gameSettings.difficulty.toString()} onChange={updateGameSettings("difficulty")}>
                <Stack direction={"row"} justifyContent={"center"}>
                    <Radio value={TriviaGameDifficulty.Easy.toString()}>Easy</Radio>
                    <Radio value={TriviaGameDifficulty.Normal.toString()}>Normal</Radio>
                    <Radio value={TriviaGameDifficulty.Hard.toString()}>Hard</Radio>
                </Stack>
            </RadioGroup>
        </FormControl>
    );

    const buzzWindowDurationForm = numberInputForm("Buzz window",
        "How long you have to buzz in",
        "buzzWindowDurationSec",
        gameSettings.buzzWindowDurationSec,
        TriviaGameSettings.MIN_BUZZ_WINDOW_DURATION_SEC,
        TriviaGameSettings.MAX_BUZZ_WINDOW_DURATION_SEC,
        () => !canUpdateSettings(),
        () => gameSettings.isBuzzWindowDurationInvalid(),
        updateGameSettings);

    const responseDurationForm = numberInputForm("Response window",
        "How long you have to type your clue response or wager",
        "responseDurationSec",
        gameSettings.responseDurationSec,
        TriviaGameSettings.MIN_RESPONSE_DURATION_SEC,
        TriviaGameSettings.MAX_RESPONSE_DURATION_SEC,
        () => !canUpdateSettings(),
        () => gameSettings.isResponseDurationInvalid(),
        updateGameSettings);

    const revealDecisionDurationForm = numberInputForm("Clue decision reveal", 
        "How long you have to see each clue decision",
        "revealDecisionDurationSec",
        gameSettings.revealDecisionDurationSec,
        TriviaGameSettings.MIN_REVEAL_DECISION_DURATION_SEC,
        TriviaGameSettings.MAX_REVEAL_DECISION_DURATION_SEC,
        () => !canUpdateSettings(),
        () => gameSettings.isRevealDecisionDurationInvalid(),
        updateGameSettings);

    const timerDurationForms = (
        <>
            <Heading size={"md"}>Timer Durations</Heading>
            {buzzWindowDurationForm}
            {responseDurationForm}
            {revealDecisionDurationForm}
        </>
    );

    const gameSummary = rating && (
        <Box marginBottom={"1em"}>
            <Heading size={"md"}>{gameSettings.getTotalNumClues()} total clues</Heading>
            <Text fontSize={"sm"} textAlign={"center"} flexWrap={"wrap"}>Estimated game time: {gameSettings.getEstimatedGameDuration()} minutes</Text>
            <Divider marginTop={"0.5em"} marginBottom={"0.5em"} />
            <Text fontSize={"sm"} textAlign={"center"} flexWrap={"wrap"}>
                This game will {rating.isRated ? "" : "not"} count for the public leaderboard
            </Text>
            {!rating.isRated && <Text fontSize={"xs"} textAlign={"center"} flexWrap={"wrap"}>reason: {rating.notRatedReason}</Text>}
            {
                canUpdateSettings() && (
                    <Button
                        onClick={emitGenerateCustomGame}
                        isDisabled={isSubmitted || gameSettings.isInvalid() || !canUpdateSettings()}
                        isLoading={isLoading}
                        colorScheme={"blue"} size={"md"} marginTop={"1em"}>
                        Save settings
                    </Button>
                )
            }
        </Box>
    );

    const roundSettingsPanels = (
        <>
            <Heading size={"md"}>Round Settings</Heading>
            <Tabs index={selectedRoundIndex} marginBottom={"1em"}>
                <TabList justifyContent={"center"}>
                    {[...Array(gameSettings.roundSettings.length)].map((_, roundIndex) => {
                        return (
                            <Tab key={roundIndex} onClick={() => setSelectedRoundIndex((roundIndex === selectedRoundIndex) ? -1 : roundIndex)}>
                                {`Round ${roundIndex + 1}`}
                            </Tab>
                        );
                    })}

                    {gameSettings.canAddRound() && canUpdateSettings() && <Tab onClick={addRound}>Add Round</Tab>}
                </TabList>

                <TabPanels>
                    {gameSettings.roundSettings.map((roundSettings: TriviaRoundSettings, roundIndex: number) => {
                        return (
                            <Collapse in={roundIndex == selectedRoundIndex} key={roundIndex}>
                                <TabPanel>
                                    <RoundSettings
                                        gameSettings={gameSettings}
                                        setGameSettings={setGameSettings}
                                        roundIndex={roundIndex}
                                        roundSettings={roundSettings}
                                        gameSummary={gameSummary}
                                        canUpdateSettings={canUpdateSettings}
                                        deleteRound={deleteRound} />
                                </TabPanel>
                            </Collapse>
                        );
                    })}
                </TabPanels>
            </Tabs>
        </>
    );

    return (
        <AbsoluteCenter axis={"horizontal"}>
            {heading}
            {presetButtons}
            <Box margin={"1em"} />
            {minClueYearForm}
            {difficultyForm}
            <Box margin={"1em"} />
            {timerDurationForms}
            {roundSettingsPanels}
            {selectedRoundIndex === -1 && gameSummary}
        </AbsoluteCenter>
    );
}