
import { Box, Button, Center, Flex } from "@chakra-ui/react";
import { PlayerResponseType, PlayerState, SessionState } from "jparty-shared";
import { useContext, useEffect, useRef, useState } from "react";
import { isMobile } from "react-device-detect";
import { CSSTransition, SwitchTransition } from "react-transition-group";

import PlayerBuzzer from "./PlayerBuzzer";
import PlayerClueSelection from "./PlayerClueSelection";
import PlayerIdle from "./PlayerIdle";
import PlayerLobby from "./PlayerLobby";
import PlayerMenu from "./PlayerMenu";
import PlayerResponse from "./PlayerResponse";
import PlayerSignature from "./PlayerSignature";
import { LayoutContext } from "../common/Layout";
import ServerMessageAlert from "../common/ServerMessage";
import Timer from "../common/Timer";
import { socket } from "../../misc/socket";
import { Layer, LocalStorageKey } from "../../misc/ui-constants";

// each state represents the component currently being displayed
// importantly: multiple session states may render the same component
enum PlayerComponentState {
    None,
    Lobby,
    Idle,
    Signature,
    ClueSelection,
    Buzzer,
    Response
}

export default function PlayerLayout() {
    const sessionStateRef = useRef(null);

    const context = useContext(LayoutContext);

    // "force idle" is a state where the player isn't idle (i.e. responding to a clue) but has "switched tabs" to check the scoreboard
    // anytime a player isn't idle, they see a button that allows them to switch between the scoreboard and whatever their normal state component is
    const [forceIdle, setForceIdle] = useState(false);
    const [isEditingSignature, setIsEditingSignature] = useState(false);

    useEffect(() => {
        setForceIdle(false);

        if (context.sessionState === SessionState.ReadingCategoryNames) {
            localStorage.removeItem(LocalStorageKey.CategoryIndex);
        }
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
    const isIdle = player ? ((player.state === PlayerState.Idle) || (player.state === PlayerState.PromptStartGame)) : false;

    const ForceIdleButton = () => {
        // no need to force yourself to be idle if you already are!
        if (!player || isIdle) {
            return;
        }

        let returnText = "Go back";
        switch (player.state) {
            case PlayerState.PromptClueSelection:
                {
                    returnText = "Select a clue";
                }
                break;
            case PlayerState.PromptBuzz:
                {
                    returnText = "Buzz in";
                }
                break;
            case PlayerState.PromptClueResponse:
                {
                    returnText = "Enter your response";
                }
                break;
            case PlayerState.PromptWager:
                {
                    returnText = "Make your wager";
                }
                break;
        }

        const handleClick = () => {
            if (isEditingSignature) {
                setIsEditingSignature(false);
                setForceIdle(false);
            }
            else {
                setForceIdle(!forceIdle);
            }
        }

        return (
            <Button colorScheme={"gray"}
                onClick={handleClick}>
                {(forceIdle || isEditingSignature) ? returnText : "Check scoreboard"}
            </Button>
        );
    }

    // returns both the JSX component and a state representing the specific component that was returned
    const getPlayerComponent = () => {
        if (!player) {
            if (context.sessionState === SessionState.Lobby) {
                return [<PlayerLobby />, PlayerComponentState.Lobby];
            }
            else {
                return [null, PlayerComponentState.None];
            }
        }

        if (isEditingSignature) {
            return [<PlayerSignature player={player} setIsEditingSignature={setIsEditingSignature} />, PlayerComponentState.Signature];
        }
        else if (isIdle || forceIdle) {
            return [<PlayerIdle setIsEditingSignature={setIsEditingSignature} promptStartGame={player.state === PlayerState.PromptStartGame} />, PlayerComponentState.Idle];
        }

        // players are idle by default unless there's a specific combination of session and player state that indicates they're
        // doing something else (i.e. responding, selecting a clue)
        switch (context.sessionState) {
            case SessionState.PromptClueSelection:
                {
                    if (player.state === PlayerState.PromptClueSelection) {
                        return [<PlayerClueSelection />, PlayerComponentState.ClueSelection];
                    }
                }
                break;
            case SessionState.ClueTossup:
                {
                    if (player.state === PlayerState.PromptBuzz) {
                        return [<PlayerBuzzer />, PlayerComponentState.Buzzer];
                    }
                }
                break;
            case SessionState.ClueResponse:
                {
                    if (player.state === PlayerState.PromptClueResponse) {
                        return [<PlayerResponse player={player} responseType={PlayerResponseType.Clue} />, PlayerComponentState.Response];
                    }
                }
                break;
            case SessionState.WagerResponse:
                {
                    if (player.state === PlayerState.PromptWager) {
                        return [<PlayerResponse player={player} responseType={PlayerResponseType.Wager} />, PlayerComponentState.Response];
                    }
                }
                break;
        }

        return [<PlayerIdle setIsEditingSignature={setIsEditingSignature} />, PlayerComponentState.Idle];
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

                            <Box ref={sessionStateRef} width={isMobile ? "70vw" : "15vw"} minWidth={"18em"}>
                                {PlayerComponent}
                            </Box>
                        </CSSTransition>
                    </SwitchTransition>
                </Center>
            </Flex>
        </>
    );
}
