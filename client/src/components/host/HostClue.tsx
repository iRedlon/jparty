
import { LayoutContext } from "../common/Layout";
import { DebugCommand, handleDebugCommand } from "../../misc/debug-command";
import { formatDollarValue } from "../../misc/format";
import "../../style/host-clue-anim.css";

import { Box, Button, Heading, Stack, Text } from "@chakra-ui/react";
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
    const showSpotlightResponderClueDecision = context.debugMode || ((spotlightResponderClueDecisionInfo && spotlightResponderClueDecisionInfo.clue.id) === triviaClue.id);

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

    let questionFontSize = "2.5em";

    if (triviaClue.question.length < 50) {
        questionFontSize = "4em";
    }
    else if (triviaClue.question.length < 150) {
        questionFontSize = "3em";
    }
    else if (triviaClue.question.length < 300) {
        questionFontSize = "2.5em";
    }
    else if (triviaClue.question.length < 400) {
        questionFontSize = "1.75em";
    }
    else if (triviaClue.question.length > 400) {
        questionFontSize = "1.5em";
    }

    const areBuzzersClosed = (context.sessionState === SessionState.ReadingClue) || (context.sessionState === SessionState.ClueTossup);

    let clueDecisionAnimClassName = "";
    if ((context.sessionState === SessionState.ReadingClueDecision) && spotlightResponderClueDecisionInfo && showSpotlightResponderClueDecision) {
        switch (spotlightResponderClueDecisionInfo.decision) {
            case TriviaClueDecision.Correct:
                {
                    clueDecisionAnimClassName = "correct-shadow-blink-anim";
                }
                break;
            case TriviaClueDecision.Incorrect:
                {
                    clueDecisionAnimClassName = "incorrect-shadow-blink-anim";
                }
                break;
            case TriviaClueDecision.NeedsMoreDetail:
                {
                    clueDecisionAnimClassName = "detail-shadow-blink-anim";
                }
                break;
        }
    }

    let clueValueString = "";
    if (triviaClue.isWagerClue()) {
        if (triviaClue.isPersonalClue()) {
            clueValueString = `wager: ${formatDollarValue(spotlightResponderWager)}`;
        }
    }
    else {
        clueValueString = `clue value: ${formatDollarValue(triviaClue.value)}`;
    }

    return (
        <Stack direction={"column"} width={"50vw"}>
            <Box className={"slide-from-left-anim"} padding={"1em"} backgroundColor={"white"} boxShadow={"8px 8px black"}
                onClick={() => handleDebugCommand(DebugCommand.UpdateSessionState, SessionState.ClueSelection)}>
                <Heading size={"lg"} fontFamily={"clue"}>{triviaCategory.name.toUpperCase()} from {triviaClue.year}</Heading>

                <Heading size={"sm"} fontFamily={"clue"}>
                    {
                        context.debugMode && (
                            <>
                                type: {TriviaCategoryType[triviaCategory.settings.type]}{"\t-\t"}
                                difficulty: {TriviaClueDifficulty[triviaClue.difficulty]}{"\t-\t"}
                            </>
                        )
                    }

                    {clueValueString}
                </Heading>
            </Box>

            <Box margin={"0.25em"} />

            <Box className={"slide-from-right-anim"} padding={"2em"} backgroundColor={"white"} boxShadow={"8px 8px black"}
                height={"50vh"} justifyContent={"center"} alignContent={"center"} overflow={"auto"} position={"relative"}>
                <Text fontFamily={"clue"} fontSize={questionFontSize}>
                    {triviaClue.question}
                </Text>

                {
                    // wait until the spotlight responder's decision is available before showing the correct answer (for dramatic effect)
                    displayCorrectAnswer && (!spotlightResponder || showSpotlightResponderClueDecision) && (
                        <Box className={"slide-from-left-anim"} position={"absolute"} bottom={"10px"} left={0} right={0}>
                            <Heading size={"lg"} fontFamily={"clue"}>
                                <i>"{triviaClue.answer}"</i>
                            </Heading>
                        </Box>
                    )
                }
            </Box>

            {
                !areBuzzersClosed && (
                    <>
                        <Box margin={"0.25em"} />

                        <Stack className={"slide-from-bottom-anim"} direction={"row"} width={"30vw"} marginLeft={"auto"} marginRight={"auto"}>
                            <Box backgroundColor={"white"} boxShadow={"8px 8px black"} marginRight={"0.5em"} height={"7em"} width={"7em"} />

                            <Box className={clueDecisionAnimClassName} boxShadow={"8px 8px black"} padding={"1em"} backgroundColor={"white"} flexGrow={"1"} position={"relative"}>
                                {
                                    !triviaClue.isTossupClue() && (context.sessionState === SessionState.ClueResponse) && (
                                        <Heading size={"md"} justifyContent={"center"}>
                                            {numSubmittedResponders}/{numResponders} responses submitted
                                        </Heading>
                                    )
                                }

                                {
                                    spotlightResponder && (
                                        <>
                                            <Box position={"absolute"} top={"5px"} left={"15px"} color={"black"}><b>{spotlightResponder.name.toUpperCase()}</b></Box>
                                            <Box position={"absolute"} textAlign={"left"} fontSize={"3em"} bottom={"5px"} left={"15px"}>
                                                <i>{spotlightResponder.responses[PlayerResponseType.Clue]}</i>
                                            </Box>
                                        </>
                                    )
                                }
                            </Box>
                        </Stack>
                    </>
                )
            }
        </Stack>
    );
}