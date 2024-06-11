
import { Box, Text } from "@chakra-ui/react";
import { PlayerSocket } from "jparty-shared";
import { AwesomeButton } from "react-awesome-button";

import { socket } from "../../misc/socket";

import "react-awesome-button/dist/styles.css";
import "../../style/components/PlayerBuzzer.css";

function emitBuzz() {
    socket.emit(PlayerSocket.Buzz);
}

export default function PlayerBuzzer() {
    return (
        <Box onClick={emitBuzz}>
            <AwesomeButton className={"buzzer"} type={"danger"}>
                <Text className={"buzzer-text"} fontSize={"3em"}>BUZZ</Text>
            </AwesomeButton>
        </Box>
    );
}