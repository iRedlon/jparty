
import { LayoutContext } from "../common/Layout";
import { formatDollarValue } from "../../misc/format";

import { Stack } from "@chakra-ui/react";
import { getSortedSessionPlayerIDs, SocketID } from "jparty-shared";
import { useContext } from "react";

export default function HostScoreboard() {
    const context = useContext(LayoutContext);

    return (
        <Stack direction={"column"} gap={0}>
            {getSortedSessionPlayerIDs(context.sessionPlayers).map((playerID: SocketID, index: number) => {
                return (
                    <span key={playerID}>
                        {index + 1}. {context.sessionPlayers[playerID].name} ({formatDollarValue(context.sessionPlayers[playerID].score)})
                    </span>
                );
            })}
        </Stack>
    );
}