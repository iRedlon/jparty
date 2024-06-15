
import { Box, Button, Heading, Stack } from "@chakra-ui/react";
import { Player, PlayerSocket } from "jparty-shared";
import { createRef, useCallback, useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { FaBomb, FaRedo, FaUndo } from "react-icons/fa";
import { CanvasPath, ReactSketchCanvas, ReactSketchCanvasRef } from "react-sketch-canvas";

import { socket } from "../../misc/socket";
import { Layer } from "../../misc/ui-constants";
import useClickOutside from "../../misc/use-click-outside";

import "../../style/components/PlayerSignature.css";

interface PlayerSignatureProps {
    player: Player,
    setIsEditingSignature: Function
}

export default function PlayerSignature({ player, setIsEditingSignature }: PlayerSignatureProps) {
    const canvasRef = createRef<ReactSketchCanvasRef>();
    const colorPickerRef = useRef(null);

    const [color, setColor] = useState("black");
    const [canUpdate, setCanUpdate] = useState(false);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

    const close = useCallback(() => setIsColorPickerOpen(false), []);
    useClickOutside(colorPickerRef, close);

    useEffect(() => {
        canvasRef.current?.loadPaths(player.signatureCanvasPath);
    }, []);

    const emitUpdateSignature = (imageBase64: string, canvasPath: CanvasPath[]) => {
        socket.emit(PlayerSocket.UpdateSignature, imageBase64, canvasPath);
        setIsEditingSignature(false);
    }

    const onStroke = () => {
        if (!canUpdate) {
            setCanUpdate(true);
        }

        setIsColorPickerOpen(false);
    }

    const undo = () => {
        canvasRef.current?.undo();
        onStroke();
    }

    const redo = () => {
        canvasRef.current?.redo();
        onStroke();
    }

    const clearCanvas = () => {
        canvasRef.current?.clearCanvas();
        onStroke();
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
            <Button onClick={() => setIsEditingSignature(false)} size={"sm"} margin={"0.5em"}>
                back to scoreboard
            </Button>

            <Box className={"child-box"} height={"15em"} width={"15em"} marginLeft={"auto"} marginRight={"auto"} marginTop={"1em"}>
                <ReactSketchCanvas
                    ref={canvasRef}
                    style={{}}
                    onStroke={onStroke}
                    strokeWidth={4}
                    strokeColor={color}
                />
            </Box>

            <Stack direction={"row"} justifyContent={"center"} marginTop={"1em"} paddingLeft={"1em"} paddingRight={"1em"}>
                <Box position={"relative"}>
                    <Box
                        outline={"black solid 2px"}
                        height={"1.25em"}
                        width={"1.25em"}
                        backgroundColor={color}
                        cursor={"pointer"}
                        onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                    />

                    {isColorPickerOpen && (
                        <Box ref={colorPickerRef} position={"absolute"} zIndex={Layer.Fixed}>
                            <HexColorPicker className={"small"} color={color} onChange={setColor} />
                        </Box>
                    )}
                </Box>

                <Stack direction={"row"} marginLeft={"1em"} marginRight={"1em"}>
                    <FaUndo size={"1.25em"} cursor={"pointer"} onClick={undo} />
                    <FaRedo size={"1.25em"} cursor={"pointer"} onClick={redo} />
                </Stack>

                <FaBomb size={"1.25em"} cursor={"pointer"} onClick={clearCanvas} />
            </Stack>

            <Button isDisabled={!canUpdate} onClick={saveSignature} colorScheme={"blue"} marginTop={"2em"}>save changes</Button>
        </Box>
    );
}