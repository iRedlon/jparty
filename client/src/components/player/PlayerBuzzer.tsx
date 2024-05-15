
import { socket } from "../../misc/socket";
import "../../style/buzzer.css";

import { Box, Text } from "@chakra-ui/react";
import { PlayerSocket } from "jparty-shared";
import { AwesomeButton } from "react-awesome-button";
import "react-awesome-button/dist/styles.css";

interface PlayerBuzzerProps {
    renderComponent: boolean
}

export default function PlayerBuzzer({ renderComponent }: PlayerBuzzerProps) {
    const emitBuzz = () => {
        socket.emit(PlayerSocket.Buzz);
    };

    return (
        <Box display={renderComponent ? "auto" : "none"}>
            <Box onClick={emitBuzz}>
                <AwesomeButton type={"danger"} className={"buzzer"}>
                    <Text fontSize={"2em"} className={"blink-fast"}>BUZZ</Text>
                </AwesomeButton>
            </Box>
        </Box>
    );
}