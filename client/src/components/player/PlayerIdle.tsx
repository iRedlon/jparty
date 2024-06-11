
import { Box, Button, Heading } from "@chakra-ui/react";
import { PlayerSocket } from "jparty-shared";
import { useState } from "react";

import PlayerScoreboard from "./PlayerScoreboard";
import { socket } from "../../misc/socket";

interface PlayerIdleProps {
    setIsEditingSignature: Function,
    promptStartGame?: boolean
}

export default function PlayerIdle({ setIsEditingSignature, promptStartGame }: PlayerIdleProps) {
    const [isLoading, setIsLoading] = useState(false);

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

            <Button onClick={() => setIsEditingSignature(true)} size={"sm"} margin={"0.5em"}>edit signature</Button><br />
            
            {promptStartGame && <Button onClick={emitStartGame} isLoading={isLoading} margin={"0.5em"} colorScheme={"blue"}>start game</Button>}
            
            <PlayerScoreboard />
        </Box>
    );
}