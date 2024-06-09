
import "../../style/components/ResponderInfo.css";

import { LayoutContext } from "../common/Layout";
import { formatDollarValue } from "../../misc/client-utils";

import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { Player, PlayerResponseType, SessionState, TriviaClue, TriviaClueDecision } from "jparty-shared";
import { useContext, useRef } from "react";
import { CSSTransition, SwitchTransition } from "react-transition-group";

interface ResponderInfoProps {
    triviaClue: TriviaClue,
    responder: Player | undefined,
    responseType: PlayerResponseType,
    showClueDecision?: boolean,
    numSubmittedResponders?: number,
    numResponders?: number
}

// todo: give this variable height and width so it can be used in other places (i.e. the game over screen)
export default function ResponderInfo({ triviaClue, responder, responseType, showClueDecision, numSubmittedResponders, numResponders }: ResponderInfoProps) {
    const responderInfoRef = useRef(null);
    const clueDecisionRef = useRef(null);

    const context = useContext(LayoutContext);

    const isWagerResponse = context.sessionState === SessionState.WagerResponse;
    const isClueResponse = context.sessionState === SessionState.ClueResponse;
    const isResponse = isWagerResponse || isClueResponse;

    const showSubmittedResponders = !triviaClue.isTossupClue() && isResponse;

    // this should be enum-ified conceptually, but the state can be static values as well as player IDs which are dynamic so *shrug*
    let responderInfoState: any = "none";
    let responderInfoBox = <></>;

    if (showSubmittedResponders) {
        responderInfoState = isWagerResponse ? "submitted-wager-responses" : "submitted-clue-responses";
        responderInfoBox = (
            <Box id={"responder-info-box"} className={"box submitted-responders-box"}>
                <Heading size={"lg"} fontFamily={"clue"}>{numSubmittedResponders}/{numResponders} players submitted</Heading>
            </Box>
        );
    }
    else if (responder) {
        let response = "";

        if (responseType === PlayerResponseType.Wager) {
            response = formatDollarValue(responder.responses[responseType]);
        }
        else {
            response = responder.responses[responseType];
        }

        let clueDecisionInfo = responder.clueDecisionInfo;
        let clueValueString = "";

        if (clueDecisionInfo) {
            const decisionModifier = (clueDecisionInfo.decision === TriviaClueDecision.Incorrect) ? -1 : 1;
            clueValueString = formatDollarValue(clueDecisionInfo.clueValue * decisionModifier);
        }

        // label our current state with this responder's client ID. this way the switch transition knows to animate between one responder to another
        responderInfoState = responder.clientID;
        responderInfoBox = (
            <Stack id={"responder-info-box"} direction={"row"} justifyContent={"center"}>
                <SwitchTransition>
                    <CSSTransition key={showClueDecision ? "show-clue-decision" : "show-signature"} nodeRef={clueDecisionRef} timeout={500} classNames={"clue-decision"}
                        appear mountOnEnter unmountOnExit>

                        <Box className={"box"} marginRight={"0.5em"} height={"7em"} width={"7em"} display={"flex"} justifyContent={"center"} alignItems={"center"} padding={"1em"} overflow={"hidden"}>
                            <Box ref={clueDecisionRef}>
                                {(showClueDecision && clueDecisionInfo) ?
                                    <>
                                        <Text><b>{clueDecisionInfo.decision.toUpperCase()}</b></Text>
                                        {clueDecisionInfo.decision !== TriviaClueDecision.NeedsMoreDetail && <Heading fontFamily={"board"} fontWeight={0}>$10000</Heading>}
                                    </> :
                                    <></>}
                            </Box>
                        </Box>
                    </CSSTransition>
                </SwitchTransition>

                <Box className={"box"} padding={"1em"} width={"25vw"} height={"7em"}>
                    {
                        responder && (
                            <Stack direction={"column"} paddingRight={"1em"} overflow={"hidden"}>
                                <Box textAlign={"left"}>
                                    <b>{responder.name.toUpperCase()}</b>
                                </Box>

                                <Box textAlign={"left"} fontSize={"2em"} whiteSpace={"nowrap"}>
                                    <i>{response}</i>
                                </Box>
                            </Stack>
                        )
                    }
                </Box>
            </Stack>
        );
    }

    return (
        <SwitchTransition>
            <CSSTransition key={responderInfoState} nodeRef={responderInfoRef} timeout={1000} classNames={"responder-info"}
                appear mountOnEnter unmountOnExit>

                <Box ref={responderInfoRef}>
                    {responderInfoBox}
                </Box>
            </CSSTransition>
        </SwitchTransition>
    );
}