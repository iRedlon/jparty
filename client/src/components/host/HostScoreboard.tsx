
import { Box, Stack, Text } from "@chakra-ui/react";
import { getSortedSessionPlayerIDs, LEADERBOARD_TYPE_DISPLAY_NAMES, SocketID } from "jparty-shared";
import { useContext } from "react";
import { PiCrownSimpleFill } from "react-icons/pi";

import { LayoutContext } from "../common/Layout";
import { formatDollarValue, getScoreFontSize } from "../../misc/client-utils";

export default function HostScoreboard() {
    const context = useContext(LayoutContext);

    return (
        <Stack direction={"column"} gap={"1em"}>
            {getSortedSessionPlayerIDs(context.sessionPlayers).map((playerID: SocketID, index: number) => {
                const player = context.sessionPlayers[playerID];
                const isEvenPlayerIndex = index % 2 == 0;

                if (index > 2) {
                    return;
                }

                return (
                    <Stack key={player.clientID} className={`scoreboard-player-box ${isEvenPlayerIndex ? "even" : "odd"}`} direction={"row"} justifyContent={"center"}>
                        {/* signature */}
                        <Box className={"child-box"} marginRight={"0.5em"} height={"7em"} width={"7em"} display={"flex"} justifyContent={"center"} alignItems={"center"}>
                            <img src={player.signatureImageBase64} />
                        </Box>

                        {/* name and score */}
                        <Box className={"child-box"} width={"15vw"} height={"7em"} paddingLeft={"0.5em"}>
                            <Stack direction={"column"} paddingRight={"1em"} overflow={"hidden"}>
                                <Box textAlign={"left"} whiteSpace={"nowrap"}>
                                    <Stack direction={"row"} gap={"0.2em"} fontSize={"1.5em"}>
                                        <Box position={"relative"} top={"0.35em"}>
                                            {(index === 0 && player.score > 0) && <PiCrownSimpleFill />}
                                        </Box>
                                        <b>{player.name}</b>
                                        {player.claimedLeaderboardSpot && (
                                            <Text fontSize={"0.6em"} alignSelf={"center"}>
                                                (claimed #{player.claimedLeaderboardSpot.spot} on the {LEADERBOARD_TYPE_DISPLAY_NAMES[player.claimedLeaderboardSpot.type]} leaderboard)
                                            </Text>
                                        )}
                                    </Stack>
                                </Box>

                                <Box textAlign={"left"} whiteSpace={"nowrap"}>
                                    <Text fontSize={getScoreFontSize(player.score, 4)} position={"relative"} bottom={"0.3em"}>
                                        <i>{formatDollarValue(player.score)}</i>
                                    </Text>
                                </Box>
                            </Stack>
                        </Box>
                    </Stack>
                );
            })}
        </Stack>
    );
}