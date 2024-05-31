
import { LayoutContext } from "./Layout";
import { addMockSocketEventHandler, removeMockSocketEventHandler } from "../../misc/mock-socket";
import { socket } from "../../misc/socket";
import { SESSION_ANNOUNCEMENT_MESSAGES } from "../../misc/ui-constants";
import "../../style/announcement-anim.css";

import { Box, Text } from "@chakra-ui/react";
import { ServerSocket, SessionAnnouncement } from "jparty-shared";
import { useContext, useEffect, useState } from "react";
import { isMobile } from "react-device-detect";

// announcements cover the entire display, intentionally preventing any input while they're being displayed
export default function Announcement() {
    const context = useContext(LayoutContext);
    const [announcement, setAnnouncement] = useState<SessionAnnouncement | undefined>();
    const [overrideMessage, setOverrideMessage] = useState("");
    const [queuedToHide, setQueuedToHide] = useState(false);

    useEffect(() => {
        socket.on(ServerSocket.ShowAnnouncement, handleShowAnnouncement);
        socket.on(ServerSocket.HideAnnouncement, handleHideAnnouncement);

        addMockSocketEventHandler(ServerSocket.ShowAnnouncement, handleShowAnnouncement);
        addMockSocketEventHandler(ServerSocket.HideAnnouncement, handleHideAnnouncement);

        return () => {
            socket.off(ServerSocket.ShowAnnouncement, handleShowAnnouncement);
            socket.off(ServerSocket.HideAnnouncement, handleHideAnnouncement);

            removeMockSocketEventHandler(ServerSocket.ShowAnnouncement, handleShowAnnouncement);
            removeMockSocketEventHandler(ServerSocket.HideAnnouncement, handleHideAnnouncement);
        }
    }, []);

    useEffect(() => {
        // we queue the hiding action so we don't "raise the curtain" too early
        // that is... we only want to hide the announcement and show the next game component once we know we have the server data we need to render it
        if (queuedToHide) {
            setAnnouncement(undefined);
            setOverrideMessage("");
        }
    }, [context.sessionState]);

    const handleShowAnnouncement = (announcement: SessionAnnouncement, currentVoiceLine: string) => {
        setAnnouncement(announcement);
        setQueuedToHide(false);

        switch (announcement) {
            case SessionAnnouncement.SelectClue:
                {
                    setOverrideMessage(currentVoiceLine);
                }
            
            return;
        }

        setOverrideMessage("");
    }

    const handleHideAnnouncement = (forceHide: boolean) => {
        if (forceHide) {
            setAnnouncement(undefined);
            setOverrideMessage("");
        }
        else {
            setQueuedToHide(true);
        }
    }

    if (announcement === undefined) {
        return <></>;
    }

    const message = overrideMessage || SESSION_ANNOUNCEMENT_MESSAGES[announcement];

    if (isMobile) {
        return (
            <Box position={"fixed"} height={"100vh"} width={"100vw"} display={"flex"} justifyContent={"center"} zIndex={"999"}>
                <Box height={"50%"} width={"75%"} marginTop={"10%"} display={"flex"} justifyContent={"center"} alignItems={"center"} padding={"1em"}
                    outline={"black solid 3px"} boxShadow={"7px 7px black"} backgroundColor={"white"}>
                    <Text fontSize={"5vh"}>{message}</Text>
                </Box>
            </Box>
        );
    }
    else {
        return (
            <Box backdropFilter={"blur(4px)"} position={"fixed"} left={0} right={0} top={0} bottom={0} display={"flex"} justifyContent={"center"} alignItems={"center"} zIndex={"999"}>
                <Box width={"30em"} height={"30em"} className={"bounce-anim"} display={"flex"} justifyContent={"center"} alignItems={"center"} padding={"5em"}
                    boxShadow={"8px 8px black"} backgroundColor={"white"} position={"absolute"}>
                    <Text fontFamily={"logo"} fontSize={"6em"}>{message}</Text>
                </Box>
            </Box>
        );
    }
}