
import { Box, Button, Heading, Stack, Text } from "@chakra-ui/react";
import { PlayerSocket, SessionState } from "jparty-shared";
import { useContext, useEffect, useState } from "react";

import { buzzerUnmountTimeMs } from "./PlayerBuzzer";
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

    const [isConfirmingStartGame, setIsConfirmingStartGame] = useState(false);

    const handleEditSignature = () => {
        // prevent an accidental tap if a player was spamming the buzzer and gets switched to the idle screen
        if (Date.now() - buzzerUnmountTimeMs < 1000) {
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
        setIsConfirmingStartGame(false);
        setIsLoading(true);

        socket.emit(PlayerSocket.StartGame, () => {
            setIsLoading(false);
        });
    }

    return (
        <Box className={"mobile-box"} padding={"1em"} marginLeft={"auto"} marginRight={"auto"}>
            <Heading fontSize={"3em"} className={"logo-text"}>jparty!</Heading>

            {(context.sessionState === SessionState.Lobby) && <>
                <Button onClick={handleEditSignature} size={"sm"} margin={"0.5em"}>edit signature</Button><br/>
            </>}

            {promptStartGame && !isConfirmingStartGame &&
                <Button onClick={() => setIsConfirmingStartGame(true)} isLoading={isLoading} margin={"0.5em"} colorScheme={"blue"}>start game</Button>}

            {promptStartGame && isConfirmingStartGame && (
                <Box className={"child-box"} padding={"0.5em"} margin={"0.5em"}>
                    <Text>are you sure? make sure everyone has joined and that your host computer is unmuted</Text>
                    <Stack direction={"row"} justifyContent={"center"}>
                        <Button onClick={emitStartGame} size={"sm"} margin={"0.5em"} colorScheme={"blue"}>yes, start game</Button>
                        <Button onClick={() => setIsConfirmingStartGame(false)} size={"sm"} margin={"0.5em"}>not yet</Button>
                    </Stack>
                </Box>
            )}

            <PlayerScoreboard />
        </Box>
    );
}