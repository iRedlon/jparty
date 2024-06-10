
import PlayerBuzzer from "./PlayerBuzzer";
import PlayerClueSelection from "./PlayerClueSelection";
import PlayerIdle from "./PlayerIdle";
import PlayerLobby from "./PlayerLobby";
import PlayerMenu from "./PlayerMenu";
import PlayerResponse from "./PlayerResponse";
import { LayoutContext } from "../common/Layout";
import ServerMessageAlert from "../common/ServerMessage";
import Timer from "../common/Timer";
import { socket } from "../../misc/socket";
import { Layer } from "../../misc/ui-constants";

import { Box, Button, Center, Flex } from "@chakra-ui/react";
import { PlayerResponseType, PlayerState, SessionState } from "jparty-shared";
import { useContext, useEffect, useRef, useState } from "react";
import { isMobile } from "react-device-detect";
import { CSSTransition, SwitchTransition } from "react-transition-group";

// each state represents the component currently being displayed. the top-level components in this enum are labelled with the "Player" prefix
enum PlayerComponentState {
    Lobby,
    Idle,
    ClueSelection,
    Buzzer,
    Response
}

export default function PlayerLayout() {
    const context = useContext(LayoutContext);
    const sessionStateRef = useRef(null);

    // "force idle" is a state where the player isn't idle (i.e. responding to a clue) but has "switched tabs" to check the scoreboard
    // anytime a player isn't idle, they see a button that allows them to switch between the scoreboard and whatever their normal state component is
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
    const isIdle = player ? ((player.state === PlayerState.Idle) || (player.state === PlayerState.WaitingToStartGame)) : false;

    const ForceIdleButton = () => {
        // no need to force yourself to be idle if you already are!
        if (!player || isIdle) {
            return;
        }

        return <Button colorScheme={"gray"} onClick={() => setForceIdle(!forceIdle)}>{forceIdle ? "Go back" : "Check scoreboard"}</Button>;
    }

    // see comparison in HostLayout. returns both the JSX component and a state representing the specific component that was returned
    const getPlayerComponent = () => {
        if (player && (isIdle || forceIdle)) {
            return [<PlayerIdle player={player} promptStartGame={player.state === PlayerState.WaitingToStartGame} />, PlayerComponentState.Idle];
        }

        if (context.sessionState === SessionState.Lobby) {
            return [<PlayerLobby />, PlayerComponentState.Lobby];
        }

        if (!player) {
            throw new Error(`PlayerLayout: missing player`);
        }

        // players are idle by default unless there's a specific combination of session and player state that indicates they're
        // doing something else (i.e. responding, selecting a clue)
        switch (context.sessionState) {
            case SessionState.ClueSelection:
                {
                    if (player.state === PlayerState.SelectingClue) {
                        return [<PlayerClueSelection />, PlayerComponentState.ClueSelection];
                    }
                }
                break;
            case SessionState.ClueTossup:
                {
                    if (player.state === PlayerState.WaitingToBuzz) {
                        return [<PlayerBuzzer />, PlayerComponentState.Buzzer];
                    }
                }
                break;
            case SessionState.ClueResponse:
                {
                    if (player.state === PlayerState.RespondingToClue) {
                        return [<PlayerResponse player={player} responseType={PlayerResponseType.Clue} />, PlayerComponentState.Response];
                    }
                }
                break;
            case SessionState.WagerResponse:
                {
                    if (player.state === PlayerState.Wagering) {
                        return [<PlayerResponse player={player} responseType={PlayerResponseType.Wager} />, PlayerComponentState.Response];
                    }
                }
                break;
        }

        return [<PlayerIdle player={player} />, PlayerComponentState.Idle];
    }

    const [PlayerComponent, componentState] = getPlayerComponent();

    return (
        <>
            <Timer />
            <ServerMessageAlert />
            <PlayerMenu />
            <Box position={"fixed"} bottom={"4em"} right={"1em"} zIndex={Layer.Middle}>{ForceIdleButton()}</Box>

            <Flex height={"100vh"} width={"100vw"} justifyContent={"center"} alignItems={"flex-start"} overflow={"auto"}>
                <Center id={"foo"} margin={"2em"} zIndex={Layer.Bottom}>
                    <SwitchTransition>
                        <CSSTransition key={componentState as PlayerComponentState} nodeRef={sessionStateRef} timeout={0} classNames={"session-state"}
                            appear mountOnEnter unmountOnExit>

                            <Box ref={sessionStateRef} width={isMobile ? "70vw" : "15vw"} minWidth={"15em"}>
                                {PlayerComponent}
                            </Box>
                        </CSSTransition>
                    </SwitchTransition>
                </Center>
            </Flex>
        </>
    );
}
