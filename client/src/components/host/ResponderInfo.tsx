
import { LayoutContext } from "../common/Layout";
import { formatDollarValue } from "../../misc/format";

import { Box, Heading, Stack } from "@chakra-ui/react";
import { Player, PlayerResponseType, SessionState, TriviaClue, TriviaClueBonus } from "jparty-shared";
import { useContext } from "react";

interface ResponderInfoProps {
    triviaClue: TriviaClue,
    responder: Player | undefined,
    responseType: PlayerResponseType,
    numSubmittedResponders?: number,
    numResponders?: number
}

// todo: give this variable height and width so it can be used in other places (i.e. the game over screen)
export default function ResponderInfo({ triviaClue, responder, responseType, numSubmittedResponders, numResponders }: ResponderInfoProps) {
    const context = useContext(LayoutContext);

    const isWagerResponse = context.sessionState === SessionState.WagerResponse;
    const isAllWagerResponse = isWagerResponse && (triviaClue.bonus === TriviaClueBonus.AllWager) && (numSubmittedResponders !== undefined) && (numResponders !== undefined);

    const isClueResponse = context.sessionState === SessionState.ClueResponse;
    const isAllPlayResponse = isClueResponse && (triviaClue.bonus === TriviaClueBonus.AllPlay) && (numSubmittedResponders !== undefined) && (numResponders !== undefined);

    // todo: switch transition here to go between all response info box and individual reponse info box
    if (isAllWagerResponse || isAllPlayResponse) {
        return (
            <Box id={"responder-info-box"} className={"box"} marginLeft={"auto"} marginRight={"auto"}
                padding={"1em"} height={"5em"} minWidth={"25vw"} display={"flex"} justifyContent={"center"} alignItems={"center"}>

                <Heading size={"lg"} fontFamily={"clue"}>{numSubmittedResponders}/{numResponders} responders submitted</Heading>
            </Box>
        )
    }
    else if ((isWagerResponse || isClueResponse) && responder) {
        let response = "";

        if (responseType === PlayerResponseType.Wager) {
            response = formatDollarValue(responder.responses[responseType]);
        }
        else {
            response = responder.responses[responseType];
        }

        return (
            <Stack id={"responder-info-box"} direction={"row"} justifyContent={"center"}>
                {/* signature box */}
                <Box className={"box"} marginRight={"0.5em"} height={"7em"} width={"7em"} />

                {/* name and response box */}
                <Box className={"box"} padding={"1em"} width={"25vw"} height={"7em"}>
                    {
                        responder && (
                            <Stack direction={"column"} alignItems={"stretch"} paddingRight={"1em"} overflow={"hidden"}>
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

    return <></>;
}