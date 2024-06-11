
import { Box, Text } from "@chakra-ui/react";
import { ServerSocket, SessionTimeout } from "jparty-shared";
import { useEffect, useRef, useState } from "react";
import { isMobile } from "react-device-detect";
import { CSSTransition } from "react-transition-group";

import { addMockSocketEventHandler, removeMockSocketEventHandler } from "../../misc/mock-socket";
import { socket } from "../../misc/socket";
import { Layer } from "../../misc/ui-constants";

import "../../style/components/Timer.css";

export default function Timer() {
    const timerRef = useRef(null);

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

        // no need to wait for a "stop timeout" message from the server if we know the timer expired
        if ((currentTimeout !== undefined) && timeRemainingSec <= 0) {
            setCurrentTimeout(undefined);
        }

        return Math.max(timeRemainingSec, 0);
    }

    return (
        <CSSTransition nodeRef={timerRef} in={currentTimeout !== undefined} timeout={500} classNames={"timer"}
            appear mountOnEnter unmountOnExit>

            <Box ref={timerRef}>
                <Box id={isMobile ? "mobile-timer-wrapper" : "desktop-timer-wrapper"} className={`timer-wrapper ${isMobile ? "mobile-box" : "box"}`} zIndex={Layer.Top}>
                    <Box id={"timer"}>
                        <Text fontFamily={"logo"} fontSize={isMobile ? "2em" : "4em"}>{getTimeRemainingSec()}</Text>
                    </Box>
                </Box>
            </Box>
        </CSSTransition>
    )
}