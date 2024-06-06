
import "../../style/components/ResponderInfo.css";

import { LayoutContext } from "../common/Layout";
import { getClueDecisionString } from "../../misc/client-utils";
import { formatDollarValue } from "../../misc/format";

import { Box, Heading, Stack } from "@chakra-ui/react";
import { Player, PlayerResponseType, SessionState, TriviaClue } from "jparty-shared";
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
    const responderInfoStateChangeRef = useRef(null);
    const showClueDecisionChangeRef = useRef(null);

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
            <Box id={"responder-info-box"} className={"box"} marginLeft={"auto"} marginRight={"auto"}
                padding={"1em"} height={"5em"} minWidth={"25vw"} display={"flex"} justifyContent={"center"} alignItems={"center"}>

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

        // label our current state with this responder's client ID. this way the switch transition knows to animate between one responder to another
        responderInfoState = responder.clientID;
        responderInfoBox = (
            <Stack id={"responder-info-box"} direction={"row"} justifyContent={"center"}>
                <SwitchTransition>
                    <CSSTransition key={showClueDecision ? "show-clue-decision" : "show-signature"} nodeRef={showClueDecisionChangeRef} timeout={500} classNames={"show-clue-decision-change"}
                        appear mountOnEnter unmountOnExit>

                        <Box className={"box"} marginRight={"0.5em"} height={"7em"} width={"7em"} display={"flex"} justifyContent={"center"} alignItems={"center"} padding={"1em"}>
                            <Box ref={showClueDecisionChangeRef}>
                                <b>{showClueDecision && responder.clueDecisionInfo ? getClueDecisionString(responder.clueDecisionInfo) : ""}</b>
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
            <CSSTransition key={responderInfoState} nodeRef={responderInfoStateChangeRef} timeout={1000} classNames={"responder-info-state-change"}
                appear mountOnEnter unmountOnExit>

                <Box ref={responderInfoStateChangeRef}>
                    {responderInfoBox}
                </Box>
            </CSSTransition>
        </SwitchTransition>
    );
}