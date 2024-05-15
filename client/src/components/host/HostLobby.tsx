
import { LayoutContext } from "../common/Layout";
import { emitLeaveSession } from "../common/MenuPanel_Settings";
import { getClientID } from "../../misc/client-utils";
import { socket } from "../../misc/socket";
import { playSoundEffect } from "../../misc/sound-fx";

import { Box, Button, Divider, Heading, Input, Stack, Tooltip } from "@chakra-ui/react";
import { getSortedSessionPlayerIDs, HostServerSocket, HostSocket, SocketID, SoundEffect, TriviaGameSettingsPreset } from "jparty-shared";
import { useContext, useEffect, useState } from "react";
import { GoMute, GoUnmute } from "react-icons/go";

export default function HostLobby() {
    const context = useContext(LayoutContext);
    const [spectateSessionName, setSpectateSessionName] = useState("");
    const [gameSettingsPreset, setGameSettingsPreset] = useState(TriviaGameSettingsPreset.Default);
    const [soundEnabled, setSoundEnabled] = useState(false);

    useEffect(() => {
        socket.on(HostServerSocket.UpdateGameSettingsPreset, handleUpdateGameSettingsPreset);

        return () => {
            socket.off(HostServerSocket.UpdateGameSettingsPreset, handleUpdateGameSettingsPreset);
        }
    }, []);

    const handleUpdateGameSettingsPreset = (preset: TriviaGameSettingsPreset, fromServer?: boolean) => {
        setGameSettingsPreset(preset);

        if (!fromServer) {
            socket.emit(HostSocket.UpdateGameSettingsPreset, preset);
        }
    }

    const emitAttemptSpectate = () => {
        socket.emit(HostSocket.AttemptSpectate, spectateSessionName, getClientID());
        setSpectateSessionName("");
    }

    const switchToPlayer = () => {
        context.setIsPlayer(true);
        localStorage.setItem("isPlayer", "true");
        emitLeaveSession(false);
    }

    const toggleMute = (enabled: boolean) => {
        setSoundEnabled(enabled);

        if (enabled) {
            playSoundEffect(SoundEffect.Voice);
        }
    }

    return (
        <>
            <Box _hover={{ opacity: 1 }} position={"fixed"} cursor={"pointer"} top={"1em"} left={"1em"}>
                {soundEnabled ?
                    <GoUnmute onClick={() => toggleMute(false)} size={"4em"} color={"white"} /> :
                    <GoMute onClick={() => toggleMute(true)} size={"4em"} color={"white"} className={"blink-slow"} />
                }
            </Box>

            <Stack direction={"column"}>
                <Box padding={"2em"} backgroundColor={"white"} outline={"black solid 3px"} boxShadow={"10px 10px black"}>
                    <Heading>jparty.io</Heading>

                    <Divider marginTop={"0.5em"} marginBottom={"0.5em"} />

                    <Box>
                        join on your phone with session name:
                        <Heading>{context.sessionName}</Heading>
                    </Box>

                    <Divider marginTop={"0.5em"} marginBottom={"0.5em"} />

                    <Box>
                        or, spectate an existing session with name:
                        <Stack direction={"row"} display={"flex"} justifyContent={"center"} marginTop={"0.5em"}>
                            <Input value={spectateSessionName} onChange={(e) => setSpectateSessionName(e.target.value)} width={"10em"} />
                            <Button onClick={emitAttemptSpectate} isDisabled={!spectateSessionName} colorScheme={"blue"}>spectate</Button>
                        </Stack>
                    </Box>

                    <Divider marginTop={"0.5em"} marginBottom={"0.5em"} />

                    <Box>
                        or, use your computer to play instead:
                        <Stack direction={"row"} display={"flex"} justifyContent={"center"} marginTop={"0.5em"}>
                            <Button onClick={switchToPlayer} colorScheme={"blue"}>switch to player</Button>
                        </Stack>
                    </Box>
                </Box>

                <Box marginTop={"0.5em"} marginBottom={"0.5em"} />

                <Box padding={"1em"} backgroundColor={"white"} outline={"black solid 3px"} boxShadow={"10px 10px black"}>
                    <Heading size={"sm"}>joined players</Heading>

                    <Divider marginTop={"0.5em"} marginBottom={"0.5em"} />

                    <div style={{ columnCount: 3 }}>
                        {getSortedSessionPlayerIDs(context.sessionPlayers).map((playerID: SocketID) => {
                            return <span key={playerID}>{context.sessionPlayers[playerID].name}<br /></span>;
                        })}
                    </div>

                    <Divider marginTop={"0.5em"} marginBottom={"0.5em"} />

                    <Stack direction={"column"}>
                        <Tooltip label={"standard rules. counts for public leaderboard"} placement={"top"}>
                            <Button onClick={() => handleUpdateGameSettingsPreset(TriviaGameSettingsPreset.Default)}
                                colorScheme={"blue"} variant={gameSettingsPreset === TriviaGameSettingsPreset.Default ? "solid" : "outline"}
                                width={"10em"} marginLeft={"auto"} marginRight={"auto"}>
                                normal game
                            </Button>
                        </Tooltip>

                        <Tooltip label={"shorter, easier game. more clue bonuses"} placement={"top"}>
                            <Button onClick={() => handleUpdateGameSettingsPreset(TriviaGameSettingsPreset.Party)}
                                colorScheme={"blue"} variant={gameSettingsPreset === TriviaGameSettingsPreset.Party ? "solid" : "outline"}
                                width={"10em"} marginLeft={"auto"} marginRight={"auto"}>
                                party game
                            </Button>
                        </Tooltip>

                        <Tooltip label={"use the settings menu to customize your game"} placement={"top"}>
                            <Button
                                isDisabled={gameSettingsPreset !== TriviaGameSettingsPreset.Custom}
                                colorScheme={"blue"} variant={gameSettingsPreset === TriviaGameSettingsPreset.Custom ? "solid" : "outline"}
                                width={"10em"} marginLeft={"auto"} marginRight={"auto"}>
                                custom game
                            </Button>
                        </Tooltip>
                    </Stack>
                </Box>
            </Stack>
        </>
    );
}