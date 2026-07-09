
import { Box, Button, Heading } from "@chakra-ui/react";
import { PlayerSocket, SessionState } from "jparty-shared";
import { useContext, useEffect, useRef, useState } from "react";

import PlayerScoreboard from "./PlayerScoreboard";
import { LayoutContext } from "../common/Layout";
import { socket } from "../../misc/socket";

interface PlayerIdleProps {
    setIsEditingSignature: Function,
    promptStartGame?: boolean
}

export default function PlayerIdle({ setIsEditingSignature, promptStartGame }: PlayerIdleProps) {
    const context = useContext(LayoutContext);
    const [isLoading, setIsLoading] = useState(false);
    const mountTimeMs = useRef(Date.now());

    const handleEditSignature = () => {
        // prevent an accidental tap if a player was spamming the buzzer and gets switched to the idle screen
        if (Date.now() - mountTimeMs.current < 1000) {
            return;
        }

        setIsEditingSignature(true);
    }

    useEffect(() => {
        // turn off the loading animation on state change in case the callback in emitStartGame doesn't work for some reason
        if (isLoading && context.sessionState > SessionState.Lobby) {
            setIsLoading(false);
        }
    }, [context.sessionState]);

    const emitStartGame = () => {
        if (!confirm("Are you sure? (Make sure everyone has joined and that your host computer is unmuted)")) {
            return;
        }

        setIsLoading(true);

        socket.emit(PlayerSocket.StartGame, () => {
            setIsLoading(false);
        });
    }

    return (
        <Box className={"mobile-box"} padding={"1em"} marginLeft={"auto"} marginRight={"auto"}>
            <Heading fontSize={"3em"} fontFamily={"logo"}>jparty.io</Heading>

            <Button onClick={handleEditSignature} size={"sm"} margin={"0.5em"}>edit signature</Button><br />
            
            {promptStartGame && <Button onClick={emitStartGame} isLoading={isLoading} margin={"0.5em"} colorScheme={"blue"}>start game</Button>}
            
            <PlayerScoreboard />
        </Box>
    );
}