
import PlayerBuzzer from "./PlayerBuzzer";
import PlayerClueSelection from "./PlayerClueSelection";
import PlayerIdle from "./PlayerIdle";
import PlayerLobby from "./PlayerLobby";
import PlayerMenu from "./PlayerMenu";
import PlayerResponse from "./PlayerResponse";
import Announcement from "../common/Announcement";
import { LayoutContext } from "../common/Layout";
import ServerMessageAlert from "../common/ServerMessage";
import Timer from "../common/Timer";
import { socket } from "../../misc/socket";

import { AbsoluteCenter, Box, Button, Flex, Text } from "@chakra-ui/react";
import { PlayerResponseType, PlayerState, SessionState } from "jparty-shared";
import { useContext, useEffect, useState } from "react";
import { isMobile } from "react-device-detect";

export default function PlayerLayout() {
    const context = useContext(LayoutContext);
    const [forceIdle, setForceIdle] = useState(false);

    useEffect(() => {
        setForceIdle(false);
    }, [context.sessionState]);

    const getPlayer = () => {
        if (socket.id) {
            return context.sessionPlayers[socket.id];
        }
        else if (context.debugMode) {
            return context.sessionPlayers["socket1"];
        }
    }

    const player = getPlayer();

    const getCheckScoreboardButton = () => {
        if (!player) {
            return <></>;
        }

        if ((player.state === PlayerState.Idle) || (player.state === PlayerState.WaitingToStartGame)) {
            return <></>;
        }

        if (forceIdle) {
            return <Button colorScheme={"gray"} onClick={() => setForceIdle(false)}>Go back</Button>;
        }
        else {
            return <Button colorScheme={"gray"} onClick={() => setForceIdle(true)}>Check scoreboard</Button>;
        }
    }

    const getPlayerComponent = () => {
        if (player && player.state === PlayerState.Idle) {
            return <PlayerIdle player={player} />;
        }
        else if (player && player.state === PlayerState.WaitingToStartGame) {
            return <PlayerIdle player={player} canStartGame={true} />;
        }

        if (context.sessionState === SessionState.Lobby) {
            return <PlayerLobby />;
        }

        if (!player) {
            return <Text>Player isn't populated in state: {SessionState[context.sessionState]}</Text>;
        }

        const idleComponent = <PlayerIdle player={player} />;

        // stateful child components need to be rendered with "display: none" while force idle is active so it can maintain its state while still displaying the idle component
        // (the alternative is not rendering the stateful child, which would dump its state)
        switch (context.sessionState) {
            case SessionState.ClueSelection:
                {
                    if (player.state === PlayerState.SelectingClue) {
                        return (
                            <>
                                {forceIdle && idleComponent}
                                <PlayerClueSelection renderComponent={!forceIdle} />
                            </>
                        );
                    }
                }
                break;
            case SessionState.ClueTossup:
                {
                    if (player.state === PlayerState.WaitingToBuzz) {
                        return (
                            <>
                                {forceIdle && idleComponent}
                                <PlayerBuzzer renderComponent={!forceIdle} />
                            </>
                        );
                    }
                }
                break;
            case SessionState.ClueResponse:
                {
                    if (player.state === PlayerState.RespondingToClue) {
                        return (
                            <>
                                {forceIdle && idleComponent}
                                <PlayerResponse player={player} responseType={PlayerResponseType.Clue} renderComponent={!forceIdle} />
                            </>
                        );
                    }
                }
                break;
            case SessionState.WagerResponse:
                {
                    if (player.state === PlayerState.Wagering) {
                        return (
                            <>
                                {forceIdle && idleComponent}
                                <PlayerResponse player={player} responseType={PlayerResponseType.Wager} renderComponent={!forceIdle} />
                            </>
                        );
                    }
                }
                break;
        }

        return idleComponent;
    }

    const checkScoreboardButton = getCheckScoreboardButton();
    const playerComponent = getPlayerComponent();

    const contentWidth = isMobile ? "80%" : "50%";
    const hideWrapperBox = (context.sessionState === SessionState.ClueTossup) && (player?.state === PlayerState.WaitingToBuzz) && !forceIdle;
    const wrapperBoxStyle = hideWrapperBox ? {} : { backgroundColor: "white", outline: "black solid 3px", boxShadow: "7px 7px black" };

    return (
        <Box>
            <Announcement />
            <Timer />
            <ServerMessageAlert />
            <PlayerMenu checkScoreboardButton={checkScoreboardButton} />
            <Flex height={"100vh"} width={"100vw"}>
                <AbsoluteCenter
                    zIndex={9}
                    axis={"horizontal"} width={contentWidth} minWidth={"50%"}
                    padding={"1em"} marginTop={"1em"} marginBottom={"1em"} style={wrapperBoxStyle}>
                    {playerComponent}
                </AbsoluteCenter>
            </Flex>
        </Box>
    );
}
