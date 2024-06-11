
import { Box, Button, Heading, Input, Text } from "@chakra-ui/react";
import { Player, PlayerResponseType, PlayerSocket, SessionState } from "jparty-shared";
import { useContext, useEffect, useState } from "react";

import { LayoutContext } from "../common/Layout";
import { formatDollarValue } from "../../misc/client-utils";
import { socket } from "../../misc/socket";

interface PlayerResponseProps {
    player: Player,
    responseType: PlayerResponseType
}

export default function PlayerResponse({ player, responseType }: PlayerResponseProps) {
    const context = useContext(LayoutContext);
    const [response, setResponse] = useState("");

    // if we re-connect, this will restore whatever our response was
    useEffect(() => {
        switch (context.sessionState) {
            case SessionState.ClueResponse:
                {
                    setResponse(player.responses[PlayerResponseType.Clue]);
                }
                break;
            case SessionState.WagerResponse:
                {
                    setResponse(player.responses[PlayerResponseType.Wager] + "");
                }
                break;
        }
    }, [context.sessionState]);

    const emitUpdateResponse = (response: string) => {
        setResponse(response);
        socket.emit(PlayerSocket.UpdateResponse, response);
    }

    const emitSubmitResponse = () => {
        socket.emit(PlayerSocket.SubmitResponse);
    }

    switch (responseType) {
        case PlayerResponseType.Wager:
            {
                const isWagerInvalid = () => {
                    if (!response) {
                        return false;
                    }

                    const wager = parseInt(response);
                    return isNaN(wager) || wager < player.minWager || wager > player.maxWager;
                }

                const getClampedWager = () => {
                    const wager = parseInt(response);

                    if (isNaN(wager)) {
                        return 0;
                    }

                    return Math.min(Math.max(wager, player.minWager), player.maxWager);
                }

                return (
                    <Box className={"mobile-box"} padding={"2em"}>
                        <Heading size={"sm"} fontFamily={"logo"}>you may wager up to {formatDollarValue(player.maxWager)}</Heading>
                        <Input
                            onChange={(e) => emitUpdateResponse(e.target.value)}
                            value={response} min={player.minWager} max={player.maxWager}
                            isInvalid={isWagerInvalid()}
                            marginTop={"0.5em"} marginBottom={"1em"} type={"tel"} />

                        <Button onClick={emitSubmitResponse} isDisabled={!response} colorScheme={"blue"}>submit wager</Button>
                        {isWagerInvalid() && <Text marginTop={"0.5em"}>Wager will be clamped to {formatDollarValue(getClampedWager())}</Text>}
                    </Box>
                );
            }
        default:
            {
                return (
                    <Box className={"mobile-box"} padding={"2em"}>
                        <Heading size={"sm"} fontFamily={"logo"}>enter your response</Heading>
                        <Input marginTop={"0.5em"} value={response} onChange={(e) => emitUpdateResponse(e.target.value)} />
                        <Button onClick={emitSubmitResponse} isDisabled={!response} colorScheme={"blue"} marginTop={"1em"}>submit response</Button>
                    </Box>
                );
            }
    }
}