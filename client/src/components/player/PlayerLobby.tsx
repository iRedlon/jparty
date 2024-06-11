
import { Box, Button, Heading, Input } from "@chakra-ui/react";
import { HostSocket, PlayerSocket } from "jparty-shared";
import { useContext, useState } from "react";
import { isMobile } from "react-device-detect";

import { LayoutContext } from "../common/Layout";
import { emitLeaveSession } from "../common/MenuPanel_Settings";
import { getClientID } from "../../misc/client-utils";
import { socket } from "../../misc/socket";

export default function PlayerLobby() {
    const context = useContext(LayoutContext);
    const [sessionName, setSessionName] = useState("");
    const [playerName, setPlayerName] = useState("");

    const emitConnect = () => {
        socket.emit(PlayerSocket.Connect, sessionName, getClientID(), playerName, (resetSessionName: boolean, resetPlayerName: boolean) => {
            if (resetSessionName) {
                setSessionName("");
            }

            if (resetPlayerName) {
                setPlayerName("");
            }
        });
    }

    const switchToHost = () => {
        context.setIsPlayer(false);
        localStorage.removeItem("isPlayer");
        emitLeaveSession(true);
        socket.emit(HostSocket.Connect, getClientID());
    }

    return (
        <Box className={"mobile-box"} padding={"1em"}>
            <Heading fontSize={"3em"} fontFamily={"logo"}>JPARTY.IO</Heading>
            {isMobile && "find a session by going to jparty.io on your computer"}

            <Box margin={"0.5em"} />

            <Input placeholder={"session name"} value={sessionName} onChange={(e) => setSessionName(e.target.value)} />
            <Input placeholder={"your name"} value={playerName} onChange={(e) => setPlayerName(e.target.value)} />

            <Box margin={"1em"} />
            <Button isDisabled={!sessionName || !playerName} colorScheme={"blue"} onClick={emitConnect}>join session</Button>
            <Box margin={"0.5em"} />

            {
                !isMobile && (
                    <Box>
                        or, use your computer to host instead:<br />
                        <Button onClick={switchToHost} colorScheme={"blue"} marginTop={"0.25em"}>switch to host</Button>
                    </Box>
                )
            }
        </Box>
    );
}