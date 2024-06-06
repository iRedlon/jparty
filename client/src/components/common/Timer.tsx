
import "../../style/components/Timer.css";

import { LayoutContext } from "./Layout";
import { addMockSocketEventHandler, removeMockSocketEventHandler } from "../../misc/mock-socket";
import { socket } from "../../misc/socket";

import { Box, Text } from "@chakra-ui/react";
import { ServerSocket, SessionTimeout } from "jparty-shared";
import { useContext, useEffect, useRef, useState } from "react";
import { CSSTransition } from "react-transition-group";

addMockSocketEventHandler

export default function Timer() {
    const timerRef = useRef(null);

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

        if ((currentTimeout !== undefined) && timeRemainingSec <= 0) {
            setCurrentTimeout(undefined);
        }

        return Math.max(timeRemainingSec, 0);
    }

    return (
        <CSSTransition nodeRef={timerRef} in={currentTimeout !== undefined} timeout={500} classNames={"timer"}
            appear mountOnEnter unmountOnExit>

            <Box ref={timerRef}>
                <Box id={"host-timer-wrapper"} className={"box"} zIndex={"999"}>
                    <Box id={"host-timer"}>
                        <Text fontFamily={"logo"} fontSize={"5em"}>{getTimeRemainingSec()}</Text>
                    </Box>
                </Box>
            </Box>
        </CSSTransition>
    )
}