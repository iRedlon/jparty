
import "../../style/components/HostGameOver.css";

import HostScoreboard from "./HostScoreboard";
import { emitLeaveSession } from "../common/MenuPanel_Settings";
import { socket } from "../../misc/socket";

import { Box, Button, Heading } from "@chakra-ui/react";
import { HostSocket, ServerSocket, SessionState } from "jparty-shared";
import { emitMockSocketEvent } from "../../misc/mock-socket";

export default function HostGameOver() {
    const emitPlayAgain = () => {
        socket.emit(HostSocket.PlayAgain);

        // force this client back to the lobby (using the mock socket for this purpose is a little scuffed I admit)
        emitMockSocketEvent(ServerSocket.UpdateSessionState, SessionState.Lobby);
    }

    return (
        <>
            <Box id={"game-over-box"} className={"box"} padding={"1em"}>
                <Heading size={"lg"} fontFamily={"logo"}>GAME OVER!</Heading>
                <Heading size={"sm"} fontFamily={"logo"}>thanks for playing</Heading>

                <Box paddingTop={"1em"}>
                    <Button onClick={emitPlayAgain} colorScheme={"blue"} variant={"outline"} margin={"0.1em"}>back to lobby</Button>
                    <Button onClick={() => emitLeaveSession(false)} colorScheme={"blue"} variant={"outline"} margin={"0.1em"}>leave session</Button>
                </Box>
            </Box>

            <HostScoreboard />
        </>
    );
}