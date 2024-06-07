
import "../../style/components/Announcement.css";

import { SESSION_ANNOUNCEMENT_MESSAGES } from "../../misc/ui-constants";

import { Box, Text } from "@chakra-ui/react";
import { SessionAnnouncement } from "jparty-shared";

interface AnnouncementProps {
    announcement: SessionAnnouncement
}

export default function Announcement({ announcement }: AnnouncementProps) {
    const message = SESSION_ANNOUNCEMENT_MESSAGES[announcement];

    return (
        <Box id={"desktop-announcement-box"} className={"announcement-box box"}>
            <Text fontFamily={"logo"} fontSize={"5em"}>{message}</Text>
        </Box>
    );
}