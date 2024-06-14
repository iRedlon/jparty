
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { getSortedSessionPlayerIDs, SocketID, TriviaClueDecision } from "jparty-shared";
import { useContext } from "react";
import { PiCrownSimpleFill } from "react-icons/pi";

import ClueDecisionInfo from "./ClueDecisionInfo";
import { LayoutContext } from "../common/Layout";
import { formatDollarValue, getClientID } from "../../misc/client-utils";
import { Layer } from "../../misc/ui-constants";

import "../../style/components/PlayerScoreboard.css";

export default function PlayerScoreboard() {
    const context = useContext(LayoutContext);

    const sortedSessionPlayerIDs = getSortedSessionPlayerIDs(context.sessionPlayers);
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

                    const height = 3.5;
                    const heightEm = `${height}em`;
                    const heightChange = `${player.positionChange * height}em`;

                    // as the player scoreboard boxes animate, players with a higher score are rendered above those with a lower score
                    const zIndex = Layer.Bottom + (numPlayers - index);

                    const isViewingPlayer = player.clientID === getClientID();

                    return (
                        <Box key={`${player.clientID}-${player.positionChange}`}
                            className={"player-scoreboard-box"} style={{ "--height-change": heightChange } as React.CSSProperties}
                            height={heightEm} zIndex={zIndex}>

                            <Stack direction={"row"} justifyContent={"center"}>
                                <Box className={"child-box"} height={heightEm} minHeight={heightEm} width={heightEm} minWidth={heightEm}>
                                    <img src={player.signatureImageBase64} />
                                </Box>

                                <Stack className={"child-box"} direction={"column"} gap={0} height={heightEm} width={"10em"} paddingLeft={"0.25em"} overflow={"hidden"}>
                                    <Box textAlign={"left"} whiteSpace={"nowrap"}>
                                        <Stack direction={"row"} gap={"0.2em"} fontSize={"0.8em"}>
                                            <Box position={"relative"} top={"0.35em"}>
                                                {(index === 0 && player.score > 0) && <PiCrownSimpleFill />}
                                            </Box>
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