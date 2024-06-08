
import "../../style/components/PlayerBuzzer.css";

import { socket } from "../../misc/socket";

import { Box, Text } from "@chakra-ui/react";
import { PlayerSocket } from "jparty-shared";
import { AwesomeButton } from "react-awesome-button";
import "react-awesome-button/dist/styles.css";

export default function PlayerBuzzer() {
    const emitBuzz = () => {
        socket.emit(PlayerSocket.Buzz);
    };

    return (
        <Box>
            <Box onClick={emitBuzz}>
                <AwesomeButton className={"buzzer"} type={"danger"}>
                    <Text className={"blink-fast"} fontSize={"2em"}>BUZZ</Text>
                </AwesomeButton>
            </Box>
        </Box>
    );
}