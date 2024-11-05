
import { Box, Text } from "@chakra-ui/react";
import { ServerSocket, SessionTimeoutType } from "jparty-shared";
import { useEffect, useRef, useState } from "react";
import { isMobile } from "react-device-detect";
import { CSSTransition } from "react-transition-group";

import { addMockSocketEventHandler, removeMockSocketEventHandler } from "../../misc/mock-socket";
import { getClientID } from "../../misc/client-utils";
import { socket } from "../../misc/socket";
import { Layer } from "../../misc/ui-constants";

import "../../style/components/Timer.css";

export default function Timer() {
    const timerRef = useRef(null);

    const [currentTimeoutType, setCurrentTimeoutType] = useState<SessionTimeoutType | undefined>();
    const [currentTimeoutEndTimeMs, setCurrentTimeoutEndTimeMs] = useState(0);
    const [timeMs, setTimeMs] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setTimeMs(Date.now()), 500);

        socket.on(ServerSocket.StartTimeout, handleStartTimeout);
        socket.on(ServerSocket.StopTimeout, handleStopTimeout);
        socket.on(ServerSocket.TimeoutAckRequest, handleTimeoutAckRequest);

        addMockSocketEventHandler(ServerSocket.StartTimeout, handleStartTimeout);

        return () => {
            clearInterval(interval);
            socket.off(ServerSocket.StartTimeout, handleStartTimeout);
            socket.off(ServerSocket.StopTimeout, handleStopTimeout);
            socket.off(ServerSocket.TimeoutAckRequest, handleTimeoutAckRequest);

            removeMockSocketEventHandler(ServerSocket.StartTimeout, handleStartTimeout);
        };
    }, []);

    const handleStartTimeout = (timeoutType: SessionTimeoutType, durationMs: number) => {
        setCurrentTimeoutType(timeoutType);
        setCurrentTimeoutEndTimeMs(Date.now() + durationMs);
    }

    const handleStopTimeout = () => {
        setCurrentTimeoutType(undefined);
        setCurrentTimeoutEndTimeMs(0);
    }

    const handleTimeoutAckRequest = (timeoutType: SessionTimeoutType, id: string, callback: Function) => {
        // console.log(`Sending ack for timeout: ${SessionTimeoutType[timeoutType]}-${id}`);
        callback(socket.id);
    }

    const getTimeRemainingSec = () => {
        let timeRemainingSec = Math.round((currentTimeoutEndTimeMs - timeMs) / 1000);

        // no need to wait for a "stop timeout" message from the server if we know the timer expired
        if ((currentTimeoutType !== undefined) && timeRemainingSec <= 0) {
            setCurrentTimeoutType(undefined);
        }

        return Math.max(timeRemainingSec, 0);
    }

    return (
        <CSSTransition nodeRef={timerRef} in={currentTimeoutType !== undefined} timeout={500} classNames={"timer"}
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