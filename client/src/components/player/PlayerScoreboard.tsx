
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { getSortedSessionPlayerIDs, SessionPlayers, SocketID, TriviaClueDecision } from "jparty-shared";
import { useContext, useEffect, useRef } from "react";
import { PiCrownSimpleFill } from "react-icons/pi";

import ClueDecisionInfo from "./ClueDecisionInfo";
import { LayoutContext } from "../common/Layout";
import { formatDollarValue, getClientID } from "../../misc/client-utils";
import { Layer } from "../../misc/ui-constants";

import "../../style/components/PlayerScoreboard.css";

export default function PlayerScoreboard() {
    const context = useContext(LayoutContext);
    const prevSessionPlayersRef = useRef<SessionPlayers>({});

    useEffect(() => {
        // store the previous state of sessionPlayers so we can compare it with the updated data and animate the position changes
        prevSessionPlayersRef.current = context.sessionPlayers;
    }, [context.sessionPlayers]);

    const sortedSessionPlayerIDs = getSortedSessionPlayerIDs(context.sessionPlayers);
    const sortedPrevSessionPlayerIDs = getSortedSessionPlayerIDs(prevSessionPlayersRef.current);
    const numPlayers = sortedSessionPlayerIDs.length;

    const triviaCategory = context.triviaRound?.categories[context.categoryIndex];
    const triviaClue = triviaCategory?.clues[context.clueIndex];

    const clueDecisionInfoArray = getSortedSessionPlayerIDs(context.sessionPlayers).map((playerID: SocketID) => {
        const player = context.sessionPlayers[playerID];
        if (!player || !player.clueDecisionInfo || player.clueDecisionInfo.decision === TriviaClueDecision.NeedsMoreDetail) {
            return;
        }

        if (player.clueDecisionInfo.clue.id !== triviaClue?.id) {
            return;
        }

        return <ClueDecisionInfo playerID={playerID} />;
    }).filter(el => !!el);

    return (
        <>
            <Heading size={"sm"} fontFamily={"logo"} marginTop={"0.5em"}>scoreboard</Heading>

            <Stack direction={"column"} gap={"1em"} alignItems={"center"} marginTop={"0.5em"}>
                {sortedSessionPlayerIDs.map((playerID: SocketID, index: number) => {
                    const player = context.sessionPlayers[playerID];

                    const prevIndex = sortedPrevSessionPlayerIDs.indexOf(playerID);
                    let indexChange = 0;

                    if (prevIndex >= 0) {
                        indexChange = prevIndex - index;
                    }

                    const height = 3.5;
                    const heightEm = `${height}em`;

                    const heightChange = `${indexChange * height}em`;
                    const zIndex = Layer.Bottom + (numPlayers - index);

                    const isViewingPlayer = player.clientID === getClientID();

                    return (
                        <Box key={`${player.clientID}-${indexChange}`}
                            className={"player-scoreboard-box"} style={{ "--height-change": heightChange } as React.CSSProperties}
                            height={heightEm} zIndex={zIndex}>

                            <Stack direction={"row"} justifyContent={"center"}>
                                <Box className={"child-box"} height={heightEm} width={heightEm}>
                                    <img src={player.signatureImageBase64} />
                                </Box>

                                <Stack className={"child-box"} direction={"column"} gap={0} height={heightEm} width={"8em"} paddingLeft={"0.25em"} overflow={"hidden"}>
                                    <Box textAlign={"left"} whiteSpace={"nowrap"}>
                                        <Stack direction={"row"} gap={"0.2em"} alignItems={"center"}>
                                            {index === 0 ? <PiCrownSimpleFill /> : <></>}
                                            <b>{isViewingPlayer ? `you (${player.name})` : player.name}</b>
                                        </Stack>
                                    </Box>

                                    <Box textAlign={"left"} whiteSpace={"nowrap"}>
                                        <Text fontSize={"1.5em"}>
                                            <i>{formatDollarValue(player.score)}</i>
                                        </Text>
                                    </Box>
                                </Stack>
                            </Stack>
                        </Box>
                    );
                })}
            </Stack>

            {
                clueDecisionInfoArray.length > 0 && (
                    <>
                        <Box margin={"1em"} />
                        <Heading size={"sm"} fontFamily={"logo"}>recent decisions</Heading>

                        <Stack direction={"column"} gap={0}>
                            {clueDecisionInfoArray}
                        </Stack>
                    </>
                )
            }
        </>
    );
}