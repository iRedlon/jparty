
import { Alert, AlertIcon, AlertDescription, CloseButton } from "@chakra-ui/react";
import { ServerSocket, ServerSocketMessage } from "jparty-shared";
import { useEffect, useState } from "react";

import { socket } from "../../misc/socket";
import { Layer } from "../../misc/ui-constants";

const SERVER_MESSAGE_LIFETIME_MS = 5000;

// a pop-up alert fixed to the bottom of the screen that displays a message sent directly from the server
export default function ServerMessage() {
    const [serverMessage, setServerMessage] = useState<ServerSocketMessage>();

    useEffect(() => {
        socket.on(ServerSocket.Message, handleServerMessage);

        return () => {
            socket.off(ServerSocket.Message, handleServerMessage);
        }
    }, []);

    const handleServerMessage = (serverMessage: ServerSocketMessage) => {
        updateServerMessage(serverMessage);
    }

    let hideServerMessageTimeout: NodeJS.Timeout;
    const updateServerMessage = (msg: ServerSocketMessage) => {
        setServerMessage(msg);
        clearTimeout(hideServerMessageTimeout);
        hideServerMessageTimeout = setTimeout(hideServerMessage, SERVER_MESSAGE_LIFETIME_MS);
    }

    const hideServerMessage = () => {
        setServerMessage(undefined);
    }

    if (!serverMessage) {
        return null;
    }

    return (
        <Alert status={serverMessage.isError ? "error" : "success"} position={"fixed"} bottom={0} justifyContent={"center"} zIndex={Layer.ServerMessageAlert}>
            <AlertIcon />
            <AlertDescription>{serverMessage.message}</AlertDescription>
            <CloseButton onClick={hideServerMessage} position={"relative"} alignSelf={"flex-start"} right={-1} />
        </Alert>
    );
}