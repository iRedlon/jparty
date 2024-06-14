
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { PlayerResponseType, SessionState, TriviaCategory, TriviaClue } from "jparty-shared";
import { useContext, useRef } from "react";
import { CSSTransition } from "react-transition-group";

import CategoryBox from "./CategoryBox";
import ResponderInfo from "./ResponderInfo";
import { LayoutContext } from "../common/Layout";

import "../../style/components/HostClue.css";

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
    showCorrectAnswer?: boolean,
    numSubmittedResponders?: number,
    numResponders?: number
}

export default function HostClue({ triviaCategory, triviaClue, showCorrectAnswer, numSubmittedResponders, numResponders }: HostClueProps) {
    const questionBoxRef = useRef(null);
    const correctAnswerRef = useRef(null);

    const context = useContext(LayoutContext);

    const showQuestion = context.sessionState !== SessionState.ReadingClueSelection;
    let showClueDecision = false;

    const spotlightResponder = context.spotlightResponderID ? context.sessionPlayers[context.spotlightResponderID] : undefined;
    if (spotlightResponder && spotlightResponder.clueDecisionInfo && context.sessionState === SessionState.ReadingClueDecision) {
        showClueDecision = context.debugMode || (spotlightResponder.clueDecisionInfo.clue.id === triviaClue.id);
    }

    // only show the correct answer if either: 1) nobody responded or 2) someone did respond and we're also showing their decision
    showCorrectAnswer = showCorrectAnswer && (triviaClue.isAllPlayClue() || showClueDecision || !spotlightResponder);

    return (
        <Stack direction={"column"}>
            <CategoryBox triviaCategory={triviaCategory} triviaClue={triviaClue} />

            <Box margin={"0.25em"} />

            <Box height={"50vh"} width={"50vw"} marginLeft={"auto"} marginRight={"auto"}>
                <CSSTransition nodeRef={questionBoxRef} in={showQuestion} timeout={1000} classNames={"question-box"}
                    appear mountOnEnter unmountOnExit>

                    <Box ref={questionBoxRef} id={"question-box"} className={"box"}>
                        <Text fontFamily={"clue"} fontSize={getQuestionFontSize(triviaClue.question)}>
                            {triviaClue.question}
                        </Text>

                        <CSSTransition nodeRef={correctAnswerRef} in={showCorrectAnswer} timeout={500} classNames={"correct-answer"} appear mountOnEnter>
                            <Box ref={correctAnswerRef} id={"correct-answer"}>
                                <Heading size={"lg"} fontFamily={"clue"}>
                                    <i>"{triviaClue.answer}"</i>
                                </Heading>
                            </Box>
                        </CSSTransition>
                    </Box>
                </CSSTransition>
            </Box>

            <Box margin={"0.25em"} />

            <Box height={"7em"}>
                <ResponderInfo triviaClue={triviaClue} responder={spotlightResponder} responseType={PlayerResponseType.Clue} showClueDecision={showClueDecision}
                    numSubmittedResponders={numSubmittedResponders} numResponders={numResponders} />
            </Box>
        </Stack>
    );
}