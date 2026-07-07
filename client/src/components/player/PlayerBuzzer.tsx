
import { Box, Text } from "@chakra-ui/react";
import { PlayerSocket, ServerSocket, SessionTimeoutType } from "jparty-shared";
import { useEffect, useState } from "react";
import { AwesomeButton } from "react-awesome-button";

import { estimateLocalTimeMs, socket } from "../../misc/socket";

import "react-awesome-button/dist/styles.css";
import "../../style/components/PlayerBuzzer.css";

let buzzerOpenLocalTimeMs = 0;

socket.on(ServerSocket.StartTimeout, (timeoutType: SessionTimeoutType, openTimeMs: number, _closeTimeMs: number) => {
    if (timeoutType === SessionTimeoutType.BuzzWindow) {
        buzzerOpenLocalTimeMs = estimateLocalTimeMs(openTimeMs);
    }
});

function attemptBuzz() {
    if (Date.now() >= buzzerOpenLocalTimeMs) {
        socket.emit(PlayerSocket.Buzz);
    }
}

export default function PlayerBuzzer() {
    const [armed, setArmed] = useState(Date.now() >= buzzerOpenLocalTimeMs);

    useEffect(() => {
        if (armed) {
            return;
        }

        const interval = setInterval(() => {
            if (Date.now() >= buzzerOpenLocalTimeMs) {
                setArmed(true);
            }
        }, 50);

        return () => clearInterval(interval);
    }, [armed]);

    return (
        <Box onClick={attemptBuzz}>
            <AwesomeButton className={"buzzer"} type={"danger"} disabled={!armed}>
                <Text className={"buzzer-text"} fontSize={armed ? "3em" : "2em"}>{armed ? "BUZZ" : "GET READY..."}</Text>
            </AwesomeButton>
        </Box>
    );
}
