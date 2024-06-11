
import PlayerScoreboard from "./PlayerScoreboard";
import { socket } from "../../misc/socket";

import { Box, Button, Heading } from "@chakra-ui/react";
import { Player, PlayerSocket } from "jparty-shared";
import { useState } from "react";

interface PlayerIdleProps {
    player: Player;
    setForceSignature: Function,
    promptStartGame?: boolean
}

export default function PlayerIdle({ player, setForceSignature, promptStartGame }: PlayerIdleProps) {
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

            <Button onClick={() => setForceSignature(true)} size={"sm"} margin={"0.5em"}>edit signature</Button>
            
            {promptStartGame && <Button onClick={emitStartGame} isLoading={isLoading} margin={"0.5em"} colorScheme={"blue"}>start game</Button>}
            
            <PlayerScoreboard />
        </Box>
    );
}