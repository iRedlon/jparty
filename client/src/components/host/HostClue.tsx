
import "../../style/components/HostClue.css";

import CategoryBox from "./CategoryBox";
import ResponderInfo from "./ResponderInfo";
import { LayoutContext } from "../common/Layout";

import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { PlayerResponseType, SessionState, TriviaCategory, TriviaClue, TriviaClueBonus } from "jparty-shared";
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
    const questionBoxRef = useRef(null);
    const responderInfoRef = useRef(null);

    const context = useContext(LayoutContext);

    const showQuestion = context.sessionState !== SessionState.ReadingClueSelection;
    let showSpotlightResponder = false;
    let showClueDecision = false;
    let wager = 0;

    const spotlightResponder = context.spotlightResponderID ? context.sessionPlayers[context.spotlightResponderID] : undefined;
    if (spotlightResponder) {
        switch (context.sessionState) {
            case SessionState.ClueResponse:
            case SessionState.WagerResponse:
            case SessionState.WaitingForClueDecision:
            case SessionState.ReadingClueDecision:
                {
                    showSpotlightResponder = true;
                }
        }

        if (spotlightResponder.clueDecisionInfo && context.sessionState === SessionState.ReadingClueDecision) {
            showClueDecision = context.debugMode || (spotlightResponder.clueDecisionInfo.clue.id === triviaClue.id);
        }

        wager = spotlightResponder.responses[PlayerResponseType.Wager];
    }

    // only show the correct answer if either: 1) nobody responded or 2) someone did respond and we're also showing their decision
    displayCorrectAnswer = displayCorrectAnswer && (!spotlightResponder || showClueDecision);

    return (
        <Stack direction={"column"}>
            <CategoryBox triviaCategory={triviaCategory} triviaClue={triviaClue} wager={wager} />

            <Box margin={"0.25em"} />

            <Box height={"50vh"} width={"50vw"} marginLeft={"auto"} marginRight={"auto"}>
                <CSSTransition nodeRef={questionBoxRef} in={showQuestion} timeout={1000} classNames={"question-box-anim"}
                    appear mountOnEnter unmountOnExit>

                    <Box ref={questionBoxRef} id={"question-box"} className={"box"}>
                        <Text fontFamily={"clue"} fontSize={getQuestionFontSize(triviaClue.question)}>
                            {triviaClue.question}
                        </Text>

                        {
                            displayCorrectAnswer && (
                                <Box id={"correct-answer"}>
                                    <Heading size={"lg"} fontFamily={"clue"}>
                                        <i>"{triviaClue.answer}"</i>
                                    </Heading>
                                </Box>
                            )
                        }
                    </Box>
                </CSSTransition>
            </Box>

            <Box margin={"0.25em"} />

            <Box height={"7em"}>
                <CSSTransition nodeRef={responderInfoRef} in={showSpotlightResponder} timeout={1000} classNames={"responder-info-box-anim"}
                    appear mountOnEnter unmountOnExit>

                    <Box ref={responderInfoRef}>
                        <ResponderInfo triviaClue={triviaClue} responder={spotlightResponder} responseType={PlayerResponseType.Clue} showClueDecision={showClueDecision}
                            numSubmittedResponders={numSubmittedResponders} numResponders={numResponders} />
                    </Box>
                </CSSTransition>
            </Box>
        </Stack>
    );
}