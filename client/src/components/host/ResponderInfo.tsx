
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { Player, PlayerResponseType, SessionState, TriviaClue, TriviaClueDecision } from "jparty-shared";
import { useContext, useRef } from "react";
import { CSSTransition, SwitchTransition } from "react-transition-group";

import { LayoutContext } from "../common/Layout";
import { formatDollarValue } from "../../misc/client-utils";

import "../../style/components/ResponderInfo.css";

interface ResponderInfoProps {
    triviaClue: TriviaClue,
    responder: Player | undefined,
    responseType: PlayerResponseType,
    showClueDecision?: boolean,
    numSubmittedResponders?: number,
    numResponders?: number
}

export default function ResponderInfo({ triviaClue, responder, responseType, showClueDecision, numSubmittedResponders, numResponders }: ResponderInfoProps) {
    const responderInfoRef = useRef(null);
    const clueDecisionRef = useRef(null);

    const context = useContext(LayoutContext);

    const isWagerResponse = context.sessionState === SessionState.WagerResponse;
    const isClueResponse = context.sessionState === SessionState.ClueResponse;
    const isResponse = isWagerResponse || isClueResponse;

    const showSubmittedResponders = triviaClue.isAllPlayClue() && isResponse;

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
        let decisionModifier = 1;

        if (clueDecisionInfo && (clueDecisionInfo.decision === TriviaClueDecision.Incorrect)) {
            decisionModifier = -1;
        }

        // label our current state with this responder's client ID. this way the switch transition knows to animate between one responder to another
        responderInfoState = responder.clientID;
        responderInfoBox = (
            <Stack id={"responder-info-box"} direction={"row"} justifyContent={"center"}>
                <SwitchTransition>
                    <CSSTransition key={showClueDecision ? "show-clue-decision" : "show-signature"} nodeRef={clueDecisionRef} timeout={500} classNames={"clue-decision"}
                        appear mountOnEnter unmountOnExit>

                        <Box id={"signature-box"} className={"box"} padding={showClueDecision ? "1em" : "0em"}>
                            <Box ref={clueDecisionRef}>
                                {(showClueDecision && clueDecisionInfo) ?
                                    <>
                                        <Text><b>{clueDecisionInfo.decision.toUpperCase()}</b></Text>
                                        {clueDecisionInfo.decision !== TriviaClueDecision.NeedsMoreDetail && <Heading fontFamily={"board"} fontWeight={0}>
                                            {formatDollarValue(clueDecisionInfo.clueValue * decisionModifier)}
                                        </Heading>}
                                    </> :
                                    <>
                                        <img src={responder.signatureImageBase64} />
                                    </>}
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
            <CSSTransition key={responderInfoState} nodeRef={responderInfoRef} timeout={500} classNames={"responder-info"}
                mountOnEnter unmountOnExit>

                <Box ref={responderInfoRef}>
                    {responderInfoBox}
                </Box>
            </CSSTransition>
        </SwitchTransition>
    );
}