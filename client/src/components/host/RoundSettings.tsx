
import { TRIVIA_CLUE_BONUS_DESCRIPTIONS, TRIVIA_CLUE_BONUS_DISPLAY_NAMES, TRIVIA_ROUND_TYPE_DESCRIPTIONS, TRIVIA_ROUND_TYPE_DISPLAY_NAMES } from "../../misc/ui-constants";

import {
    AbsoluteCenter, Button, Checkbox, Divider, FormControl, FormErrorMessage, FormHelperText, FormLabel, Heading,
    NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
    Select, Stack, Text
} from "@chakra-ui/react";
import { getEnumKeys, getEnumSize, TriviaCategoryType, TriviaClueBonus, TriviaGameSettings, TriviaRoundSettings, TriviaRoundType } from "jparty-shared";

interface RoundSettingsProps {
    gameSettings: TriviaGameSettings,
    setGameSettings: Function,
    roundIndex: number,
    roundSettings: TriviaRoundSettings,
    gameSummary: JSX.Element | undefined,
    canUpdateSettings: Function,
    deleteRound: Function
}

export const numberInputForm = (displayName: string, description: string, key: string, value: number,
    minValue: number, maxValue: number, isDisabled: Function, isInvalid: Function, onChange: Function) => {
    return (
        <FormControl isInvalid={isInvalid()} key={displayName} marginBottom={"1em"}>
            <FormLabel textAlign={"center"} me={0}>{displayName}</FormLabel>
            <Stack direction={"row"} justify={"center"}>
                <NumberInput
                    isDisabled={isDisabled()}
                    value={value} onChange={onChange(key)}
                    min={minValue}
                    max={maxValue}
                    size={"md"} maxW={"6em"}>
                    <NumberInputField />
                    <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                    </NumberInputStepper>
                </NumberInput>
            </Stack>
            <FormHelperText>{description}</FormHelperText>
            <FormErrorMessage justifyContent={"center"}>
                Must be between {minValue} and {maxValue}
            </FormErrorMessage>
        </FormControl>
    );
}

export default function RoundSettings({ gameSettings, setGameSettings, roundIndex, roundSettings, gameSummary, canUpdateSettings, deleteRound }: RoundSettingsProps) {
    const updateRoundSettings = (key: string) => (param?: any) => (value: string) => {
        if (!canUpdateSettings()) {
            return;
        }

        const numValue = parseInt(value);

        if (isNaN(numValue)) {
            return;
        }

        let newGameSettings = TriviaGameSettings.clone(gameSettings);

        // most round settings are just number values we can simply update with a key/value pair
        // there are some exceptions where a round setting stores nested data and needs custom logic in order to be updated
        switch (key) {
            case "bannedCategoryTypes":
                {
                    const categoryType = numValue as TriviaCategoryType;
                    const useCategoryType = param as boolean;

                    if (useCategoryType) {
                        // this category type is NOT banned. filter it from our list of banned types
                        const newBannedCategoryTypes = newGameSettings.roundSettings[roundIndex].bannedCategoryTypes.filter(type => type != categoryType);
                        newGameSettings.roundSettings[roundIndex].bannedCategoryTypes = newBannedCategoryTypes;
                    }
                    else {
                        // this category type IS banned. add it to our list of banned types
                        newGameSettings.roundSettings[roundIndex].bannedCategoryTypes.push(categoryType);
                    }
                }
                break;
            case "clueBonusCounts":
                {
                    const triviaClueBonus = parseInt(param) as TriviaClueBonus;

                    newGameSettings.roundSettings[roundIndex].clueBonusCounts[triviaClueBonus] = numValue;
                }
                break;
            default:
                {
                    let newRoundSettings = TriviaRoundSettings.clone(newGameSettings.roundSettings[roundIndex]);
                    (newRoundSettings as any)[key] = numValue;

                    newGameSettings.roundSettings[roundIndex] = newRoundSettings;
                }
                break;
        }

        setGameSettings(newGameSettings);
    }

    const roundTypeForm = (
        <FormControl marginBottom={"1em"}>
            <FormLabel textAlign={"center"} me={0}>Round type</FormLabel>
            <Stack direction={"row"} justify={"center"}>
                <Select
                    isDisabled={!canUpdateSettings()}
                    value={roundSettings.type}
                    onChange={(e) => updateRoundSettings("type")()(e.target.value)}
                    size={"lg"} maxW={"10em"}>
                    {getEnumKeys(TriviaRoundType).map((_: string) => {
                        const triviaRoundType: TriviaRoundType = parseInt(_);
                        return (
                            <option key={triviaRoundType} value={triviaRoundType}>{TRIVIA_ROUND_TYPE_DISPLAY_NAMES[triviaRoundType]}</option>
                        );
                    })}
                </Select>
            </Stack>
            <FormHelperText>{TRIVIA_ROUND_TYPE_DESCRIPTIONS[roundSettings.type]}</FormHelperText>
        </FormControl>
    );

    const categoryTypeCheckboxRow = (minCategoryType: TriviaCategoryType, maxCategoryType: TriviaCategoryType) => {
        return getEnumKeys(TriviaCategoryType).map((_: string) => {
            const triviaCategoryType: TriviaCategoryType = parseInt(_);

            if (triviaCategoryType < minCategoryType || triviaCategoryType > maxCategoryType) {
                return;
            }

            return (
                <Checkbox
                    value={triviaCategoryType}
                    onChange={(e) => updateRoundSettings("bannedCategoryTypes")(e.target.checked)(e.target.value)}
                    isDisabled={!canUpdateSettings()}
                    isChecked={!roundSettings.bannedCategoryTypes.includes(triviaCategoryType)}
                    id={`round-${roundIndex}-category-type-checkbox-${triviaCategoryType}`}
                    key={triviaCategoryType}
                    margin={"0.25em"} marginTop={0}>
                    {TriviaCategoryType[triviaCategoryType]}
                </Checkbox>
            );
        })
    };

    const categoryTypesForm = (
        // split the checkboxes of category types into a top and bottom row for readability
        <FormControl marginBottom={"1em"} isInvalid={roundSettings.areCategoryTypesInvalid()}>
            <FormLabel textAlign={"center"} me={0}>Category types</FormLabel>
            <Stack direction={"row"} justify={"center"}>{categoryTypeCheckboxRow(0, 3)}</Stack>
            <Stack direction={"row"} justify={"center"}>{categoryTypeCheckboxRow(4, getEnumSize(TriviaCategoryType))}</Stack>
            <FormErrorMessage justifyContent={"center"}>There must be at least one possible category type</FormErrorMessage>
        </FormControl>
    );

    const numCategoriesForm = numberInputForm("Number of categories",
        "per round",
        "numCategories",
        roundSettings.numCategories,
        TriviaRoundSettings.MIN_NUM_CATEGORIES_PER_ROUND,
        TriviaRoundSettings.MAX_NUM_CATEGORIES_PER_ROUND,
        () => !canUpdateSettings(),
        () => roundSettings.isNumCategoriesInvalid(),
        () => updateRoundSettings("numCategories")());

    const numCluesForm = numberInputForm("Number of clues",
        "per category",
        "numClues",
        roundSettings.numClues,
        TriviaRoundSettings.MIN_NUM_CLUES_PER_CATEGORY,
        TriviaRoundSettings.MAX_NUM_CLUES_PER_CATEGORY,
        () => !canUpdateSettings(),
        () => roundSettings.isNumCluesInvalid(),
        () => updateRoundSettings("numClues")());

    const clueValueStepForm = numberInputForm("Clue value step",
        `$${roundSettings.clueValueStep}, $${roundSettings.clueValueStep * 2}, $${roundSettings.clueValueStep * 3}, ...`,
        "clueValueStep",
        roundSettings.clueValueStep,
        TriviaRoundSettings.MIN_CLUE_VALUE_STEP,
        TriviaRoundSettings.MAX_CLUE_VALUE_STEP,
        () => !canUpdateSettings(),
        () => roundSettings.isClueValueStepInvalid(),
        () => updateRoundSettings("clueValueStep")());

    const numberInputFormsRow = (
        <Stack direction={"row"} width={"lg"} justify={"center"} marginBottom={"1em"}>
            {numCategoriesForm}
            {numCluesForm}
            {clueValueStepForm}
        </Stack>
    );

    const clueBonusForms = (
        <>
            <Heading size={"md"}>Clue Bonuses</Heading>
            <Text fontSize={"xs"} textAlign={"center"} flexWrap={"wrap"} marginBottom={"1em"}>
                Special effects that are triggered on clue selection.<br />
                Choose how many of each type you want to appear in this round
            </Text>
            {getEnumKeys(TriviaClueBonus).map((_: string) => {
                const triviaClueBonus: TriviaClueBonus = parseInt(_);
                if (triviaClueBonus === TriviaClueBonus.None) {
                    return;
                }

                let count = roundSettings.clueBonusCounts[triviaClueBonus];

                return numberInputForm(TRIVIA_CLUE_BONUS_DISPLAY_NAMES[triviaClueBonus],
                    TRIVIA_CLUE_BONUS_DESCRIPTIONS[triviaClueBonus],
                    "clueBonusCounts",
                    count || 0,
                    0,
                    roundSettings.getTotalNumCluesWithoutBonus(triviaClueBonus),
                    () => !canUpdateSettings(),
                    () => roundSettings.areClueBonusCountsInvalid(),
                    () => updateRoundSettings("clueBonusCounts")(triviaClueBonus));
            })}
        </>
    );

    return (
        <AbsoluteCenter axis={"horizontal"}>
            {
                canUpdateSettings() && (
                    <Button
                        onClick={() => deleteRound(roundIndex)}
                        isDisabled={!gameSettings.canDeleteRound()}
                        colorScheme={"red"} size={"sm"} marginBottom={"1em"}>
                        Delete round
                    </Button>
                )
            }
            {roundTypeForm}
            {categoryTypesForm}
            {numberInputFormsRow}
            {clueBonusForms}
            <Divider marginTop={"1em"} marginBottom={"1em"} />
            {gameSummary}
        </AbsoluteCenter>
    );
}