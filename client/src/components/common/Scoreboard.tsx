
import { LayoutContext } from "./Layout";
import { formatDollarValue } from "../../misc/client-utils";

import { Box, Stack } from "@chakra-ui/react";
import { getSortedSessionPlayerIDs, SocketID } from "jparty-shared";
import { useContext } from "react";

export default function Scoreboard() {
    const context = useContext(LayoutContext);

    return (
        <Stack direction={"column"} gap={"2em"} paddingTop={"2em"}>
            {getSortedSessionPlayerIDs(context.sessionPlayers).map((playerID: SocketID, index: number) => {
                const player = context.sessionPlayers[playerID];
                const isEvenPlayerIndex = index % 2 == 0;

                if (index > 2) {
                    return;
                }

                return (
                    <Stack className={`scoreboard-player-box ${isEvenPlayerIndex ? "even" : "odd"}`} direction={"row"} justifyContent={"center"}>
                        <Box className={"box"} marginRight={"0.5em"} height={"7em"} width={"7em"} display={"flex"} justifyContent={"center"} alignItems={"center"}>
                        </Box>

                        <Box className={"box"} padding={"1em"} width={"15vw"}>
                            <Stack direction={"column"} paddingRight={"1em"} overflow={"hidden"}>
                                <Box textAlign={"left"}>
                                    <b>{player.name.toUpperCase()}</b>
                                </Box>

                                <Box textAlign={"left"} fontSize={"2em"} whiteSpace={"nowrap"}>
                                    <i>{formatDollarValue(player.score)}</i>
                                </Box>
                            </Stack>
                        </Box>
                    </Stack>
                );
            })}
        </Stack>
    );
}