
import { LayoutContext } from "./Layout";
import { addMockSocketEventHandler, removeMockSocketEventHandler } from "../../misc/mock-socket";
import { socket } from "../../misc/socket";
import { TIMEOUT_DESCRIPTIONS } from "../../misc/ui-constants";

import { Box, Text } from "@chakra-ui/react";
import { ServerSocket, SessionTimeout } from "jparty-shared";
import { useContext, useEffect, useState } from "react";

addMockSocketEventHandler

export default function Timer() {
    const context = useContext(LayoutContext);
    const [currentTimeout, setCurrentTimeout] = useState<SessionTimeout | undefined>();
    const [currentTimeoutEndTimeMs, setCurrentTimeoutEndTimeMs] = useState(0);
    const [timeMs, setTimeMs] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setTimeMs(Date.now()), 500);
        
        socket.on(ServerSocket.StartTimeout, handleStartTimeout);
        socket.on(ServerSocket.StopTimeout, handleStopTimeout);

        addMockSocketEventHandler(ServerSocket.StartTimeout, handleStartTimeout);

        return () => {
            clearInterval(interval);
            socket.off(ServerSocket.StartTimeout, handleStartTimeout);
            socket.off(ServerSocket.StopTimeout, handleStopTimeout);

            removeMockSocketEventHandler(ServerSocket.StartTimeout, handleStartTimeout);
        };
    }, []);

    const handleStartTimeout = (timeout: SessionTimeout, durationMs: number) => {
        setCurrentTimeout(timeout);
        setCurrentTimeoutEndTimeMs(Date.now() + durationMs);
    }

    const handleStopTimeout = () => {
        setCurrentTimeout(undefined);
        setCurrentTimeoutEndTimeMs(0);
    }

    const getTimeRemainingSec = () => {
        let timeRemainingSec = Math.round((currentTimeoutEndTimeMs - timeMs) / 1000);

        if (timeRemainingSec <= 0) {
            setCurrentTimeout(undefined);
        }

        return Math.max(timeRemainingSec, 0);
    }

    if (currentTimeout === undefined) {
        return <></>;
    }

    const timeoutDescription = TIMEOUT_DESCRIPTIONS[currentTimeout];

    if (context.isPlayer) {
        return (
            <Box position={"fixed"} top={"1em"} left={"1em"} height={"3em"} width={"3em"}
                outline={"black solid 3px"} boxShadow={"5px 5px black"} backgroundColor={"white"} zIndex={"999"}>
                <Box display={"flex"} justifyContent={"center"} alignItems={"center"} width={"100%"} height={"100%"}>
                    <Text fontSize={"2em"}>{getTimeRemainingSec()}</Text>
                </Box>
            </Box>
        );
    }
    else {
        return (
            <Box position={"fixed"} top={"1em"} left={"1em"} height={"6em"} width={"6em"}
                outline={"black solid 3px"} boxShadow={"7px 7px black"} backgroundColor={"white"} zIndex={"999"}>
                <Box display={"flex"} justifyContent={"center"} alignItems={"center"} width={"100%"} height={"100%"}>
                    <Text fontSize={"4em"}>{getTimeRemainingSec()}</Text>
                </Box>
                {
                    timeoutDescription && (
                        <Box position={"relative"} bottom={"-0.5em"} outline={"black solid 3px"} boxShadow={"7px 7px black"} backgroundColor={"white"} padding={"0.25em"}>
                            <Text>{timeoutDescription}</Text>
                        </Box>
                    )
                }
            </Box>
        );
    }
}