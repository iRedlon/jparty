
import { LayoutContext } from "../common/Layout";
import { DebugCommand, handleDebugCommand } from "../../misc/debug-command";
import { formatDollarValue } from "../../misc/format";

import { Box, Button, Heading, Input, InputGroup, InputLeftAddon, Stack, Text } from "@chakra-ui/react";
import { PlayerResponseType, SessionState, TriviaCategory, TriviaCategoryType, TriviaClue, TriviaClueDecision, TriviaClueDifficulty } from "jparty-shared";
import { useContext } from "react";

interface HostClueProps {
    triviaCategory: TriviaCategory,
    triviaClue: TriviaClue,
    displayCorrectAnswer?: boolean,
    numSubmittedResponders?: number,
    numResponders?: number
}

export default function HostClue({ triviaCategory, triviaClue, displayCorrectAnswer, numSubmittedResponders, numResponders }: HostClueProps) {
    const context = useContext(LayoutContext);

    const spotlightResponder = context.spotlightResponderID && context.sessionPlayers[context.spotlightResponderID];
    const spotlightResponderWager = spotlightResponder ? spotlightResponder.responses[PlayerResponseType.Wager] : 0;
    const spotlightResponderClueDecisionInfo = spotlightResponder && spotlightResponder.clueDecisionInfo;

    // our spotlight responder may be stale. make sure we only display a decision for the clue we're currently displaying
    const showSpotlightResponderClueDecision = (spotlightResponderClueDecisionInfo && spotlightResponderClueDecisionInfo.clue.id) === triviaClue.id;

    // this is a button for the sake of color scheme formatting, it isn't meant to be clicked
    let decisionDisplayButton = <></>;
    switch (spotlightResponder && spotlightResponder.clueDecisionInfo && spotlightResponder.clueDecisionInfo.decision) {
        case TriviaClueDecision.Correct:
            {
                decisionDisplayButton = <Button colorScheme={"green"} marginTop={"1em"}>correct!</Button>;
            }
            break;
        case TriviaClueDecision.Incorrect:
            {
                decisionDisplayButton = <Button colorScheme={"red"} marginTop={"1em"}>incorrect!</Button>;
            }
            break;
        case TriviaClueDecision.NeedsMoreDetail:
            {
                decisionDisplayButton = <Button colorScheme={"yellow"} marginTop={"1em"}>needs more detail!</Button>;
            }
    }

    let questionFontSize = "2em";

    if (triviaClue.question.length < 150) {
        questionFontSize = "3em";
    }
    else if (triviaClue.question.length < 300) {
        questionFontSize = "2em";
    }
    else if (triviaClue.question.length < 400) {
        questionFontSize = "1.75em";
    }
    else if (triviaClue.question.length > 400) {
        questionFontSize = "1.5em";
    }

    const areBuzzersClosed = (context.sessionState === SessionState.ReadingClue) || (context.sessionState === SessionState.ClueTossup);

    return (
        <Stack direction={"column"} width={"50vw"}>
            <Box padding={"1em"} backgroundColor={"white"} outline={"black solid 3px"} boxShadow={"10px 10px black"}
                onClick={() => handleDebugCommand(DebugCommand.UpdateSessionState, SessionState.ClueSelection)}>
                <Heading size={"lg"}>"{triviaCategory.name}" from {triviaClue.year}</Heading>

                <Heading size={"sm"}>
                    {
                        context.debugMode && (
                            <>
                                type: {TriviaCategoryType[triviaCategory.settings.type]}{"\t-\t"}
                                difficulty: {TriviaClueDifficulty[triviaClue.difficulty]}{"\t-\t"}
                            </>
                        )
                    }
                    {triviaClue.isWagerClue() ? `wager: ${formatDollarValue(spotlightResponderWager)}` : `clue value: ${formatDollarValue(triviaClue.value)}`}
                </Heading>
            </Box>

            <Box margin={"0.25em"} />

            <Box padding={"2em"} backgroundColor={"white"} outline={"black solid 3px"} boxShadow={"10px 10px black"}
                height={"50vh"} justifyContent={"center"} alignContent={"center"} overflow={"auto"}>
                <Text fontSize={questionFontSize}>
                    {triviaClue.question}
                </Text>
            </Box>

            {
                !areBuzzersClosed && (
                    <>
                        <Box margin={"0.25em"} />

                        <Box padding={"1em"} backgroundColor={"white"} outline={"black solid 3px"} boxShadow={"10px 10px black"}>
                            {
                                !triviaClue.isTossupClue() && (context.sessionState === SessionState.ClueResponse) && (
                                    <Heading size={"md"} justifyContent={"center"}>
                                        {numSubmittedResponders}/{numResponders} responses submitted
                                    </Heading>
                                )
                            }

                            {
                                spotlightResponder && (
                                    <InputGroup size={"lg"} justifyContent={"center"} marginBottom={"1em"}>
                                        <InputLeftAddon>{spotlightResponder.name}</InputLeftAddon>
                                        <Input isReadOnly={true} value={spotlightResponder.responses[PlayerResponseType.Clue]} />
                                    </InputGroup>
                                )
                            }

                            {
                                // wait until the spotlight responder's decision is available before showing the correct answer (for dramatic effect)
                                displayCorrectAnswer && (!spotlightResponder || showSpotlightResponderClueDecision) && (
                                    <Heading size={"md"}>
                                        correct answer: "{triviaClue.answer}"
                                    </Heading>
                                )
                            }

                            {
                                (context.sessionState === SessionState.ReadingClueDecision) &&
                                spotlightResponderClueDecisionInfo &&
                                showSpotlightResponderClueDecision && (
                                    decisionDisplayButton
                                )
                            }
                        </Box>
                    </>
                )
            }
        </Stack>
    );
}