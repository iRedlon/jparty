
import HostScoreboard from "./HostScoreboard";
import { emitLeaveSession } from "../common/MenuPanel_Settings";
import { socket } from "../../misc/socket";

import { Box, Button, Heading } from "@chakra-ui/react";
import { HostSocket } from "jparty-shared";


export default function HostGameOver() {
    const emitPlayAgain = () => {
        socket.emit(HostSocket.PlayAgain);
        location.reload();
    }

    return (
        <Box padding={"1em"} backgroundColor={"white"} outline={"black solid 3px"} boxShadow={"10px 10px black"} fontSize={"2em"}>
            <Heading>game over, thanks for playing!</Heading>
            <HostScoreboard />

            <Button onClick={emitPlayAgain} colorScheme={"blue"} margin={"0.1em"}>back to lobby with same players</Button><br />
            <Button onClick={() => emitLeaveSession(false)} colorScheme={"blue"} margin={"0.1em"}>leave session</Button>
        </Box>
    );
}