
import PlayerScoreboard from "./PlayerScoreboard";
import { LayoutContext } from "../common/Layout";
import { formatDollarValue } from "../../misc/client-utils";
import { socket } from "../../misc/socket";

import { Button, Heading } from "@chakra-ui/react";
import { Player, PlayerSocket } from "jparty-shared";
import { useContext, useState } from "react";

interface PlayerIdleProps {
    player: Player;
    canStartGame?: boolean
}

export default function PlayerIdle({ player, canStartGame }: PlayerIdleProps) {
    const context = useContext(LayoutContext);
    const [isLoading, setIsLoading] = useState(false);

    const emitStartGame = () => {
        if (!confirm("Are you sure? (Make sure everyone has joined and that your host computer is unmuted)")) {
            return;
        }

        setIsLoading(true);

        socket.emit(PlayerSocket.StartGame, (success: boolean) => {
            setIsLoading(false);
        });
    }

    return (
        <>
            <Heading>jparty.io</Heading>
            <Heading size={"sm"}>session name: {context.sessionName}</Heading>
            <Heading size={"sm"} marginTop={"0.5em"} marginBottom={"0.5em"}>{player.name}: you have {formatDollarValue(player.score)}</Heading>
            {canStartGame && <Button onClick={emitStartGame} isLoading={isLoading} margin={"0.5em"} colorScheme={"blue"}>start game</Button>}
            
            <PlayerScoreboard />
        </>
    );
}