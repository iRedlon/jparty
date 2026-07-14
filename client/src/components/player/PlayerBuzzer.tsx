
import { Box, Text } from "@chakra-ui/react";
import { PlayerSocket, ServerSocket, SessionTimeoutType } from "jparty-shared";
import { useEffect, useState } from "react";
import { AwesomeButton } from "react-awesome-button";

import { estimateClientTimeMs, socket } from "../../misc/socket";

import "react-awesome-button/dist/styles.css";
import "../../style/components/PlayerBuzzer.css";

let buzzerOpenClientTimeMs = 0;
export let buzzerUnmountTimeMs = 0;

socket.on(ServerSocket.StartTimeout, (timeoutType: SessionTimeoutType, openTimeMs: number, _closeTimeMs: number, windowID: number) => {
    if (timeoutType === SessionTimeoutType.BuzzWindow) {
        buzzerOpenClientTimeMs = estimateClientTimeMs(openTimeMs);

        const responseWindowArrivalSlackMs = Math.round(buzzerOpenClientTimeMs - Date.now());
        socket.emit(PlayerSocket.ResponseWindowArrived, timeoutType, windowID, responseWindowArrivalSlackMs);
    }
});

function attemptBuzz() {
    if (Date.now() >= buzzerOpenClientTimeMs) {
        socket.emit(PlayerSocket.Buzz);
    }
}

export default function PlayerBuzzer() {
    const [armed, setArmed] = useState(Date.now() >= buzzerOpenClientTimeMs);

    useEffect(() => {
        return () => {
            buzzerUnmountTimeMs = Date.now();
        };
    }, []);

    useEffect(() => {
        if (armed) {
            return;
        }

        const interval = setInterval(() => {
            if (Date.now() >= buzzerOpenClientTimeMs) {
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
