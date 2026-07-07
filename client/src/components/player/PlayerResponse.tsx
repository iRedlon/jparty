
import { Box, Button, Heading, Input, Text } from "@chakra-ui/react";
import { Player, PlayerResponseType, PlayerSocket, ServerSocket, SessionState, SessionTimeoutType } from "jparty-shared";
import { useContext, useEffect, useRef, useState } from "react";

import { LayoutContext } from "../common/Layout";
import { formatDollarValue } from "../../misc/client-utils";
import { estimateLocalTimeMs, socket } from "../../misc/socket";

let responseWindowOpenLocalTimeMs = 0;

socket.on(ServerSocket.StartTimeout, (timeoutType: SessionTimeoutType, openTimeMs: number, _closeTimeMs: number) => {
    if (timeoutType === SessionTimeoutType.ResponseWindow) {
        responseWindowOpenLocalTimeMs = estimateLocalTimeMs(openTimeMs);
    }
});

interface PlayerResponseProps {
    player: Player,
    responseType: PlayerResponseType
}

export default function PlayerResponse({ player, responseType }: PlayerResponseProps) {
    const context = useContext(LayoutContext);
    const [response, setResponse] = useState("");
    const [windowOpen, setWindowOpen] = useState(Date.now() >= responseWindowOpenLocalTimeMs);
    const inputRef = useRef<HTMLInputElement>(null);

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

    useEffect(() => {
        if (windowOpen) {
            inputRef.current?.focus();
            return;
        }

        const interval = setInterval(() => {
            if (Date.now() >= responseWindowOpenLocalTimeMs) {
                setWindowOpen(true);
            }
        }, 50);

        return () => clearInterval(interval);
    }, [windowOpen]);

    const emitUpdateResponse = (response: string) => {
        if (Date.now() < responseWindowOpenLocalTimeMs) {
            return;
        }

        setResponse(response);
        socket.emit(PlayerSocket.UpdateResponse, response);
    }

    const emitSubmitResponse = () => {
        if (Date.now() < responseWindowOpenLocalTimeMs) {
            return;
        }

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
                            ref={inputRef}
                            onChange={(e) => emitUpdateResponse(e.target.value)}
                            value={response} min={player.minWager} max={player.maxWager}
                            isInvalid={isWagerInvalid()} isDisabled={!windowOpen}
                            marginTop={"0.5em"} marginBottom={"1em"} type={"tel"} />

                        <Button onClick={emitSubmitResponse} isDisabled={!windowOpen || !response} colorScheme={"blue"}>submit wager</Button>
                        {isWagerInvalid() && <Text marginTop={"0.5em"}>Wager will be clamped to {formatDollarValue(getClampedWager())}</Text>}
                    </Box>
                );
            }
        default:
            {
                return (
                    <Box className={"mobile-box"} padding={"2em"}>
                        <Heading size={"sm"} fontFamily={"logo"}>enter your response</Heading>
                        <Input ref={inputRef} marginTop={"0.5em"} value={response} onChange={(e) => emitUpdateResponse(e.target.value)} isDisabled={!windowOpen} />
                        <Button onClick={emitSubmitResponse} isDisabled={!windowOpen || !response} colorScheme={"blue"} marginTop={"1em"}>submit response</Button>
                    </Box>
                );
            }
    }
}
