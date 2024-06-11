
import { Box, Button, Heading } from "@chakra-ui/react";
import { Player, PlayerSocket } from "jparty-shared";
import { createRef, useEffect, useState } from "react";
import { CanvasPath, ReactSketchCanvas, ReactSketchCanvasRef } from "react-sketch-canvas";

import { socket } from "../../misc/socket";

interface PlayerSignatureProps {
    player: Player,
    setForceSignature: Function
}

export default function PlayerSignature({ player, setForceSignature }: PlayerSignatureProps) {
    const canvasRef = createRef<ReactSketchCanvasRef>();

    const [canUpdate, setCanUpdate] = useState(false);

    useEffect(() => {
        canvasRef.current?.loadPaths(player.signatureCanvasPath);
    }, []);

    const emitUpdateSignature = (imageBase64: string, canvasPath: CanvasPath[]) => {
        socket.emit(PlayerSocket.UpdateSignature, imageBase64, canvasPath);
        setForceSignature(false);
    }

    const saveSignature = () => {
        canvasRef.current?.exportImage("png")
            .then(imageBase64 => {
                canvasRef.current?.exportPaths()
                    .then(canvasPath => {
                        emitUpdateSignature(imageBase64, canvasPath);
                    });
            });
    }

    return (
        <Box className={"mobile-box"} padding={"1em"}>

            <Heading fontFamily={"logo"} fontSize={"3em"}>jparty.io</Heading>
            <Button onClick={() => setForceSignature(false)} size={"sm"} margin={"0.5em"}>back to scoreboard</Button>

            <Box className={"child-box"} height={"15em"} width={"15em"} marginLeft={"auto"} marginRight={"auto"} marginTop={"1em"}>
                <ReactSketchCanvas
                    ref={canvasRef}
                    onStroke={() => !canUpdate && setCanUpdate(true)}
                    strokeWidth={4}
                    strokeColor={"black"}
                />
            </Box>

            <Button isDisabled={!canUpdate} onClick={saveSignature} colorScheme={"blue"} marginTop={"1em"}>save changes</Button>
        </Box>
    );
}