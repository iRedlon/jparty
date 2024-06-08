
import ClueDecisionInfo from "./ClueDecisionInfo";
import { LayoutContext } from "../common/Layout";
import { formatDollarValue } from "../../misc/client-utils";

import { Box, Heading, Stack } from "@chakra-ui/react";
import { getSortedSessionPlayerIDs, SocketID } from "jparty-shared";
import { useContext } from "react";

export default function PlayerScoreboard() {
    const context = useContext(LayoutContext);

    const clueDecisionInfoArray = getSortedSessionPlayerIDs(context.sessionPlayers).map((playerID: SocketID) => <ClueDecisionInfo playerID={playerID} />);

    return (
        <>
            <Heading size={"md"}>scoreboard</Heading>

            <Stack direction={"column"} gap={0}>
                {getSortedSessionPlayerIDs(context.sessionPlayers).map((playerID: SocketID, index: number) => {
                    const player = context.sessionPlayers[playerID];

                    return (
                        <Box key={playerID} className={"child-box"} padding={"0.5em"} margin={"0.5em"}>
                            <Heading size={"sm"}>{index + 1}. {player.name} ({formatDollarValue(player.score)})</Heading>
                        </Box>
                    );
                })}
            </Stack>

            {
                clueDecisionInfoArray.length && (
                    <>
                        <Box margin={"1em"} />
                        <Heading size={"md"}>recent decisions</Heading>

                        <Stack direction={"column"} gap={0}>
                            {clueDecisionInfoArray}
                        </Stack>
                    </>
                )
            }
        </>
    );
}