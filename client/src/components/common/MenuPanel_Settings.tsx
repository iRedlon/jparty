
import { LayoutContext } from "./Layout";
import { socket } from "../../misc/socket";

import { Box, Button, Divider, Heading, Slider, SliderThumb, SliderFilledTrack, SliderTrack, Stack, TabPanel, Text } from "@chakra-ui/react";
import { HostSocket, PlayerSocket } from "jparty-shared";
import { useContext } from "react";

export function emitLeaveSession(isPlayer: boolean) {
    if (localStorage.sessionName) {
        socket.emit(isPlayer ? PlayerSocket.LeaveSession : HostSocket.LeaveSession);
        localStorage.removeItem("sessionName");
    }

    location.reload();
}

export default function MenuPanel_Settings() {
    const context = useContext(LayoutContext);

    return (
        <TabPanel>
            {
                context.sessionName && (
                    <>
                        <Stack direction={"column"}>
                            <Text>You are in session: <b>{context.sessionName}</b></Text>
                        </Stack>
                        <Button onClick={() => confirm("Are you sure?") && emitLeaveSession(context.isPlayer)} marginTop={"1em"} colorScheme={"red"}>
                            Leave Session
                        </Button>
                        <Divider margin={"1em"} />
                    </>
                )
            }

            {
                !context.isPlayer && (
                    <>
                        <Heading size={"md"}>Volume</Heading>

                        <Box margin={"1em"}>
                            <Heading size={"sm"}>Music</Heading>
                            <Slider defaultValue={100}>
                                <SliderTrack>
                                    <SliderFilledTrack />
                                </SliderTrack>
                                <SliderThumb outline={"gray solid 1px"} />
                            </Slider>
                        </Box>

                        <Box margin={"1em"}>
                            <Heading size={"sm"}>Host Voice</Heading>
                            <Slider defaultValue={100}>
                                <SliderTrack>
                                    <SliderFilledTrack />
                                </SliderTrack>
                                <SliderThumb outline={"gray solid 1px"} />
                            </Slider>
                        </Box>

                        <Box margin={"1em"}>
                            <Heading size={"sm"}>Sound FX</Heading>
                            <Slider defaultValue={100}>
                                <SliderTrack>
                                    <SliderFilledTrack />
                                </SliderTrack>
                                <SliderThumb outline={"gray solid 1px"} />
                            </Slider>
                        </Box>
                    </>
                )
            }
        </TabPanel>
    );
}