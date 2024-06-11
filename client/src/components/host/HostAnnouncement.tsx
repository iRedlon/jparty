
import { Box, Text } from "@chakra-ui/react";
import { SessionAnnouncement } from "jparty-shared";

import { SESSION_ANNOUNCEMENT_MESSAGES } from "../../misc/ui-constants";

import "../../style/components/HostAnnouncement.css";

interface HostAnnouncementProps {
    announcement: SessionAnnouncement
}

export default function HostAnnouncement({ announcement }: HostAnnouncementProps) {
    const message = SESSION_ANNOUNCEMENT_MESSAGES[announcement];

    return (
        <Box id={"desktop-announcement-box"} className={"announcement-box box"}>
            <Text fontFamily={"logo"} fontSize={"5em"}>{message}</Text>
        </Box>
    );
}