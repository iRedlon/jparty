
import "../../style/components/HostGameOver.css";

import { emitLeaveSession } from "../common/MenuPanel_Settings";
import Scoreboard from "../common/Scoreboard";
import { socket } from "../../misc/socket";

import { Box, Button, Heading, Stack } from "@chakra-ui/react";
import { HostSocket } from "jparty-shared";

export default function HostGameOver() {
    const emitPlayAgain = () => {
        socket.emit(HostSocket.PlayAgain);
        location.reload();
    }

    return (
        <>
            <Box id={"game-over-box"} className={"box"} padding={"1em"}>
                <Heading size={"lg"} fontFamily={"logo"}>GAME OVER!</Heading>
                <Heading size={"sm"} fontFamily={"logo"}>thanks for playing</Heading>

                <Box paddingTop={"1em"}>
                    <Button onClick={emitPlayAgain} colorScheme={"blue"} margin={"0.1em"}>back to lobby</Button>
                    <Button onClick={() => emitLeaveSession(false)} colorScheme={"blue"} margin={"0.1em"}>leave session</Button>
                </Box>
            </Box>

            <Scoreboard />
        </>
    );
}