
import "../../style/components/HostClue.css";

import { LayoutContext } from "../common/Layout";
import { DebugCommand, handleDebugCommand } from "../../misc/debug-command";
import { formatDollarValue } from "../../misc/format";

import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { PlayerResponseType, SessionState, TriviaCategory, TriviaCategoryType, TriviaClue, TriviaClueDifficulty } from "jparty-shared";
import { useContext, useRef } from "react";

import { CSSTransition } from "react-transition-group";

function getQuestionFontSize(question: string) {
    if (question.length < 50) {
        return "4em";
    }
    else if (question.length < 150) {
        return "3em";
    }
    else if (question.length < 300) {
        return "2.5em";
    }
    else if (question.length < 400) {
        return "1.75em";
    }
    else if (question.length > 400) {
        return "1.5em";
    }

    return "2.5em";
}

interface HostClueProps {
    triviaCategory: TriviaCategory,
    triviaClue: TriviaClue,
    displayCorrectAnswer?: boolean,
    numSubmittedResponders?: number,
    numResponders?: number
}

export default function HostClue({ triviaCategory, triviaClue, displayCorrectAnswer, numSubmittedResponders, numResponders }: HostClueProps) {
    const spotlightResponderTransitionRef = useRef(null);

    const context = useContext(LayoutContext);

    const arePlayersResponding = (context.sessionState === SessionState.ClueResponse) ||
        (context.sessionState === SessionState.WagerResponse) ||
        (context.sessionState === SessionState.WaitingForClueDecision) ||
        (context.sessionState === SessionState.ReadingClueDecision);

    // todo: re-implement submitted responders
    const showSubmittedResponders = !triviaClue.isTossupClue() && (context.sessionState === SessionState.ClueResponse);
    const showWager = triviaClue.isWagerClue() && triviaClue.isPersonalClue();

    let showSpotlightResponder = false;
    let showClueDecision = false;
    let wager = 0;

    const spotlightResponder = context.spotlightResponderID && context.sessionPlayers[context.spotlightResponderID];
    if (spotlightResponder) {
        showSpotlightResponder = arePlayersResponding;

        if (spotlightResponder.clueDecisionInfo) {
            showClueDecision = context.debugMode || (spotlightResponder.clueDecisionInfo.clue.id === triviaClue.id);
        }

        wager = spotlightResponder.responses[PlayerResponseType.Wager];
    }

    // only show the correct answer if either: 1) nobody responded or 2) someone did respond and we're also showing their decision
    displayCorrectAnswer = displayCorrectAnswer && (!spotlightResponder || showClueDecision);

    return (
        <Stack direction={"column"} width={"50vw"}>
            <Box id={"category-box"} className={"box"} padding={"1em"} onClick={() => handleDebugCommand(DebugCommand.UpdateSessionState, SessionState.ClueSelection)}>
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

                    {
                        showWager ? <>wager: {formatDollarValue(wager)}</> : <>clue value: {formatDollarValue(triviaClue.value)}</>
                    }
                </Heading>
            </Box>

            <Box margin={"0.25em"} />

            <Box id={"question-box"} className={"box"} padding={"2em"} height={"50vh"} justifyContent={"center"} alignContent={"center"} overflow={"auto"} position={"relative"}>
                <Text fontFamily={"clue"} fontSize={getQuestionFontSize(triviaClue.question)}>
                    {triviaClue.question}
                </Text>

                {
                    displayCorrectAnswer && (
                        <Box id={"correct-answer"} position={"absolute"} left={0} right={0} marginTop={"1em"}>
                            <Heading size={"lg"} fontFamily={"clue"}>
                                <i>"{triviaClue.answer}"</i>
                            </Heading>
                        </Box>
                    )
                }
            </Box>

            <Box margin={"0.25em"} />

            <Box height={"7em"}>
                <CSSTransition nodeRef={spotlightResponderTransitionRef} in={showSpotlightResponder} timeout={1000} classNames={"spotlight-responder"} appear mountOnEnter unmountOnExit>
                    <Stack ref={spotlightResponderTransitionRef} direction={"row"} justifyContent={"center"}>
                        {/* signature box */}
                        <Box className={"box"} marginRight={"0.5em"} height={"7em"} width={"7em"} />

                        {/* name and response box */}
                        <Box className={"box"} padding={"1em"} width={"25vw"} height={"7em"}>
                            {
                                spotlightResponder && (
                                    <Stack direction={"column"} alignItems={"stretch"} paddingRight={"1em"} overflow={"hidden"}>
                                        <Box textAlign={"left"}>
                                            <b>{spotlightResponder.name.toUpperCase()}</b>
                                        </Box>

                                        <Box textAlign={"center"} fontSize={"2em"} whiteSpace={"nowrap"}>
                                            <i>{spotlightResponder.responses[PlayerResponseType.Clue]}</i>
                                        </Box>
                                    </Stack>
                                )
                            }
                        </Box>
                    </Stack>

                </CSSTransition>
            </Box>
        </Stack>
    );
}