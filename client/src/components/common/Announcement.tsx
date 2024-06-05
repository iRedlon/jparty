
import "../../style/components/Announcement.css";

import { SESSION_ANNOUNCEMENT_MESSAGES } from "../../misc/ui-constants";

import { Box, Text } from "@chakra-ui/react";
import { SessionAnnouncement } from "jparty-shared";
import { isMobile } from "react-device-detect";

interface AnnouncementProps {
    announcement: SessionAnnouncement
}

// announcements cover the entire display, intentionally preventing any input while they're being displayed
export default function Announcement({ announcement }: AnnouncementProps) {
    const message = SESSION_ANNOUNCEMENT_MESSAGES[announcement];

    if (isMobile) {
        return (
            <Box id={"mobile-announcement-box"} className={"announcement-box box"}>
                <Text fontSize={"5vh"}>{message}</Text>
            </Box>
        );
    }
    else {
        return (
            <Box id={"desktop-announcement-box"} className={"announcement-box box"}>
                <Text fontFamily={"logo"} fontSize={"6em"}>{message}</Text>
            </Box>
        );
    }
}