
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { getSortedSessionPlayerIDs, Player, PlayerResponseType, SessionState, TriviaClue, TriviaClueDecision } from "jparty-shared";
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

function getCorrectResponderNamesFontSize(numNames: number) {
    if (numNames <= 3) {
        return "1.5em";
    }
    else if (numNames <= 6) {
        return "1.25em";
    }

    return "1em";
}

export default function ResponderInfo({ triviaClue, responder, responseType, showClueDecision, numSubmittedResponders, numResponders }: ResponderInfoProps) {
    const responderInfoRef = useRef(null);
    const clueDecisionRef = useRef(null);

    const context = useContext(LayoutContext);

    const showResponderInfo = (context.sessionState !== SessionState.ReadingClue) && (context.sessionState !== SessionState.ClueTossup);
    const isWagerResponse = context.sessionState === SessionState.WagerResponse;
    const isClueResponse = context.sessionState === SessionState.ClueResponse;
    const isResponse = isWagerResponse || isClueResponse;

    const showSubmittedResponders = triviaClue.isAllPlayClue() && isResponse;
    const showAllPlayResults = triviaClue.isAllPlayClue() && (context.sessionState === SessionState.ReadingClueDecision) && !responder;

    let responderInfoState: any = "none";
    let responderInfoBox = <></>;

    if (showResponderInfo) {
        if (showSubmittedResponders) {
            responderInfoState = isWagerResponse ? "submitted-wager-responses" : "submitted-clue-responses";
            responderInfoBox = (
                <Box className={"box submitted-responders-box"}>
                    <Heading size={"lg"} fontFamily={"clue"}>{numSubmittedResponders}/{numResponders} players submitted</Heading>
                </Box>
            );
        }
        else if (showAllPlayResults) {
            const correctResponderNames = getSortedSessionPlayerIDs(context.sessionPlayers)
                .map(playerID => context.sessionPlayers[playerID])
                .filter(player => player && player.clueDecisionInfo &&
                    (player.clueDecisionInfo.clue.id === triviaClue.id) &&
                    (player.clueDecisionInfo.decision === TriviaClueDecision.Correct))
                .map(player => player.name.toUpperCase());

            const numCorrectResponders = correctResponderNames.length;

            responderInfoState = "all-play-results";
            responderInfoBox = (
                <Box className={"box"} padding={"1em"} width={"30vw"} height={"7em"} marginLeft={"auto"} marginRight={"auto"}>
                    {numCorrectResponders ? (
                        <Stack direction={"column"} spacing={"0.25em"} overflow={"hidden"}>
                            <Text><b>{(numCorrectResponders === 1) ? "1 CORRECT RESPONSE" : `${numCorrectResponders} CORRECT RESPONSES`}</b></Text>
                            <Text fontSize={getCorrectResponderNamesFontSize(numCorrectResponders)} noOfLines={2}>
                                <i>{correctResponderNames.join(", ")}</i>
                            </Text>
                        </Stack>
                    ) : (
                        <Stack direction={"column"} justifyContent={"center"} height={"100%"}>
                            <Text fontSize={"1.5em"}><b>NO CORRECT RESPONSES</b></Text>
                        </Stack>
                    )}
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

            // label our current state with responder client ID so we're forced to animate between each responder
            responderInfoState = responder.clientID;
            responderInfoBox = (
                <Stack direction={"row"} justifyContent={"center"}>
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
    }

    const timeout = responderInfoState === "none" ? 0 : 1000;

    return (
        <SwitchTransition>
            <CSSTransition key={responderInfoState} nodeRef={responderInfoRef} timeout={timeout} classNames={"responder-info"}
                appear mountOnEnter unmountOnExit>

                <Box ref={responderInfoRef} id={"responder-info-box"}>
                    {responderInfoBox}
                </Box>
            </CSSTransition>
        </SwitchTransition>
    );
}