
import "../../style/components/PlayerScoreboard.css";

import ClueDecisionInfo from "./ClueDecisionInfo";
import { LayoutContext } from "../common/Layout";
import { formatDollarValue } from "../../misc/client-utils";
import { Layer } from "../../misc/ui-constants";

import { Box, Heading, Stack } from "@chakra-ui/react";
import { getSortedSessionPlayerIDs, SessionPlayers, SocketID } from "jparty-shared";
import { useContext, useEffect, useRef } from "react";

export default function PlayerScoreboard() {
    const context = useContext(LayoutContext);
    const prevSessionPlayersRef = useRef<SessionPlayers>({});

    useEffect(() => {
        prevSessionPlayersRef.current = context.sessionPlayers;
    }, [context.sessionPlayers]);

    const sortedSessionPlayerIDs = getSortedSessionPlayerIDs(context.sessionPlayers);
    const sortedPrevSessionPlayerIDs = getSortedSessionPlayerIDs(prevSessionPlayersRef.current);
    const numPlayers = sortedSessionPlayerIDs.length;

    const triviaCategory = context.triviaRound?.categories[context.categoryIndex];
    const triviaClue = triviaCategory?.clues[context.clueIndex];

    const clueDecisionInfoArray = getSortedSessionPlayerIDs(context.sessionPlayers).map((playerID: SocketID) => {
        const player = context.sessionPlayers[playerID];
        if (!player || !player.clueDecisionInfo) {
            return;
        }

        if (player.clueDecisionInfo.clue.id !== triviaClue?.id) {
            return;
        }

        return <ClueDecisionInfo playerID={playerID} />;
    }).filter(el => !!el);

    return (
        <>
            <Heading size={"md"}>scoreboard</Heading>

            <Stack direction={"column"} gap={"1em"} alignItems={"center"} marginTop={"0.5em"}>
                {sortedSessionPlayerIDs.map((playerID: SocketID, index: number) => {
                    const player = context.sessionPlayers[playerID];

                    const prevIndex = sortedPrevSessionPlayerIDs.indexOf(playerID);
                    let indexChange = 0;

                    if (prevIndex >= 0) {
                        indexChange = prevIndex - index;
                    }
                    else {
                        // todo: this player wasn't on the scoreboard before... do something special? come from far below maybe?
                    }

                    const heightChange = `${indexChange * 2}em`;
                    const zIndex = Layer.Bottom + (numPlayers - index);

                    return (
                        <Box key={`${playerID}-${indexChange}`}
                            className={"player-scoreboard-box"} style={{ "--height-change": heightChange } as React.CSSProperties}
                            height={"3em"} zIndex={zIndex}>

                            <Stack direction={"row"} justifyContent={"center"}>
                                <Box className={"child-box"} height={"3em"} width={"3em"} />

                                <Stack className={"child-box"} direction={"column"} gap={0} height={"3em"} width={"8em"} paddingLeft={"0.25em"} overflow={"hidden"}>
                                    <Box textAlign={"left"} whiteSpace={"nowrap"}>
                                        <b>{player.name}</b>
                                    </Box>

                                    <Box textAlign={"left"} whiteSpace={"nowrap"}>
                                        {formatDollarValue(player.score)}
                                    </Box>
                                </Stack>
                            </Stack>


                        </Box>
                    );
                })}
            </Stack>

            {
                clueDecisionInfoArray.length ? (
                    <>
                        <Box margin={"1em"} />
                        <Heading size={"md"}>recent decisions</Heading>

                        <Stack direction={"column"} gap={0}>
                            {clueDecisionInfoArray}
                        </Stack>
                    </>
                ) : <></>
            }
        </>
    );
}