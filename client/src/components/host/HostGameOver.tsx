
import { Box, Button, Heading, Stack } from "@chakra-ui/react";
import { AudioType, HostSocket, ServerSocket, SessionState } from "jparty-shared";
import { useContext } from "react";

import HostScoreboard from "./HostScoreboard";
import { LayoutContext } from "../common/Layout";
import { emitLeaveSession } from "../common/MenuPanel_Settings";
import { stopAudio } from "../../misc/audio";
import { emitMockSocketEvent } from "../../misc/mock-socket";
import { socket } from "../../misc/socket";

import "../../style/components/HostGameOver.css";

export default function HostGameOver() {
    const context = useContext(LayoutContext);

    const emitPlayAgain = () => {
        socket.emit(HostSocket.PlayAgain);
        stopAudio(AudioType.LongApplause);

        // force this client back to the lobby (using the mock socket for this purpose is a little scuffed I admit)
        emitMockSocketEvent(ServerSocket.UpdateSessionState, SessionState.Lobby);
    }

    return (
        <Box id={"game-over-box"} className={"box"} padding={"1em"}>
            <Heading size={"lg"} fontFamily={"logo"}>GAME OVER!</Heading>
            <Heading size={"sm"} fontFamily={"logo"} marginBottom={"1em"}>thanks for playing</Heading>

            <HostScoreboard />

            <Stack direction={"row"} marginTop={"1em"} justifyContent={"center"}>
                <Button isDisabled={context.isSpectator} onClick={emitPlayAgain} colorScheme={"blue"} margin={"0.1em"}>play again</Button>
                <Button onClick={() => emitLeaveSession(false)} colorScheme={"blue"} margin={"0.1em"}>leave session</Button>
            </Stack>
        </Box>
    );
}