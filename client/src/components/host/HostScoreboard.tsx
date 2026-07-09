
import { Box, Stack, Text } from "@chakra-ui/react";
import { getOrdinalString, getSortedSessionPlayerIDs, LeaderboardType, SocketID } from "jparty-shared";
import { useContext } from "react";
import { PiCrownSimpleFill } from "react-icons/pi";

import { LayoutContext } from "../common/Layout";
import { formatDollarValue, getScoreFontSize } from "../../misc/client-utils";

const LEADERBOARD_TYPE_DISPLAY_NAMES: Record<LeaderboardType, string> = {
    [LeaderboardType.AllTime]: "all time",
    [LeaderboardType.Monthly]: "monthly",
    [LeaderboardType.Weekly]: "weekly"
};

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
                                    </Stack>
                                </Box>

                                <Box textAlign={"left"} whiteSpace={"nowrap"}>
                                    <Text fontSize={getScoreFontSize(player.score, 4)} position={"relative"} bottom={"0.3em"}>
                                        <i>{formatDollarValue(player.score)}</i>
                                    </Text>
                                </Box>
                            </Stack>
                        </Box>

                        {/* claimed leaderboard spots */}
                        {Object.keys(player.claimedLeaderboardSpots ?? {}).length > 0 && (
                            <Box className={"child-box"} height={"7em"} paddingLeft={"1em"} paddingRight={"1em"}
                                display={"flex"} flexDirection={"column"} justifyContent={"center"}>
                                {Object.values(LeaderboardType).map((type) => {
                                    const claimedSpot = player.claimedLeaderboardSpots?.[type];
                                    if (!claimedSpot) {
                                        return null;
                                    }

                                    return (
                                        <Text key={type} textAlign={"left"} whiteSpace={"nowrap"} fontSize={"1.1em"}>
                                            claimed the <b>{getOrdinalString(claimedSpot)}</b> spot on the <b>{LEADERBOARD_TYPE_DISPLAY_NAMES[type]}</b> leaderboard
                                        </Text>
                                    );
                                })}
                            </Box>
                        )}
                    </Stack>
                );
            })}
        </Stack>
    );
}