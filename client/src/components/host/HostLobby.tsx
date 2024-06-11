
import { Box, Button, Divider, Heading, Input, ListItem, Stack, Text, Tooltip, UnorderedList } from "@chakra-ui/react";
import { getSortedSessionPlayerIDs, HostServerSocket, HostSocket, Player, SocketID, TriviaGameSettingsPreset } from "jparty-shared";
import { useContext, useEffect, useRef, useState } from "react";

import { LayoutContext } from "../common/Layout";
import { emitLeaveSession } from "../common/MenuPanel_Settings";
import { getClientID } from "../../misc/client-utils";
import { socket } from "../../misc/socket";

import "../../style/components/HostLobby.css";

function JoinedPlayerBox(player: Player) {
    return (
        <Stack key={player.clientID} direction={"row"} justifyContent={"center"} paddingTop={"1em"} gap={"1em"}>
            <Box className={"child-box"} height={"4em"} minHeight={"4em"} width={"4em"} minWidth={"4em"}>
                <img src={player.signatureImageBase64} />
            </Box>

            <Box className={"child-box"} height={"4em"} flexGrow={1} overflow={"hidden"} display={"flex"} justifyContent={"left"} alignItems={"center"} paddingLeft={"0.5em"}>
                <Text fontSize={"1.5em"} whiteSpace={"nowrap"}><b>{player.name}</b></Text>
            </Box>
        </Stack>
    );
}

export default function HostLobby() {
    const joinedPlayersBoxRef = useRef(null);

    const context = useContext(LayoutContext);
    const [spectateSessionName, setSpectateSessionName] = useState("");
    const [gameSettingsPreset, setGameSettingsPreset] = useState(TriviaGameSettingsPreset.Normal);

    useEffect(() => {
        socket.on(HostServerSocket.UpdateGameSettingsPreset, handleUpdateGameSettingsPreset);

        return () => {
            socket.off(HostServerSocket.UpdateGameSettingsPreset, handleUpdateGameSettingsPreset);
        }
    }, []);

    const handleUpdateGameSettingsPreset = (preset: TriviaGameSettingsPreset, fromServer?: boolean) => {
        if (!fromServer) {
            socket.emit(HostSocket.UpdateGameSettingsPreset, preset);

            if (gameSettingsPreset === TriviaGameSettingsPreset.Custom && !confirm("Are you sure? Your custom game settings will be lost")) {
                return;
            }
        }

        setGameSettingsPreset(preset);
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

    const sortedSessionPlayerIDs = getSortedSessionPlayerIDs(context.sessionPlayers);

    return (
        <Stack direction={"row"}>
            <Box ref={joinedPlayersBoxRef} id={"joined-players-box"} className={"box side-box"}>
                <Heading size={"sm"} fontFamily={"logo"} fontSize={"1.5em"}>joined players</Heading>
                {sortedSessionPlayerIDs.map((playerID: SocketID) => {
                    return JoinedPlayerBox(context.sessionPlayers[playerID]);
                })}
            </Box>

            <Stack direction={"column"}>
                <Box id={"logo-box"} className={"box"} padding={"2em"}>
                    <Heading fontFamily={"logo"} fontSize={"4em"}>jparty.io</Heading>

                    <Divider marginTop={"0.5em"} marginBottom={"0.5em"} />

                    <Box>
                        join on your phone with session name:
                        <Heading fontFamily={"logo"} fontSize={"3em"}>{context.sessionName}</Heading>
                    </Box>

                    <Divider marginTop={"0.5em"} marginBottom={"0.5em"} />

                    <Box>
                        or, spectate an existing session with name:
                        <Stack direction={"row"} display={"flex"} justifyContent={"center"} marginTop={"0.5em"}>
                            <Input id={"spectate-session-name"} value={spectateSessionName} onChange={(e) => setSpectateSessionName(e.target.value)} width={"10em"} />
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

                <Box id={"game-settings-preset-box"} className={"box"} padding={"1.5em"}>
                    <Heading size={"sm"} fontFamily={"logo"} fontSize={"1.5em"} marginBottom={"0.25em"}>game presets</Heading>

                    <Stack direction={"column"}>
                        <Tooltip label={"standard rules. counts for public leaderboard"} placement={"top"}>
                            <Button onClick={() => handleUpdateGameSettingsPreset(TriviaGameSettingsPreset.Normal)}
                                colorScheme={"blue"} variant={gameSettingsPreset === TriviaGameSettingsPreset.Normal ? "solid" : "outline"}
                                marginLeft={"auto"} marginRight={"auto"}>
                                normal mode
                            </Button>
                        </Tooltip>

                        <Tooltip label={"shorter, easier game. more clue bonuses"} placement={"top"}>
                            <Button onClick={() => handleUpdateGameSettingsPreset(TriviaGameSettingsPreset.Party)}
                                colorScheme={"blue"} variant={gameSettingsPreset === TriviaGameSettingsPreset.Party ? "solid" : "outline"}
                                marginLeft={"auto"} marginRight={"auto"}>
                                party mode
                            </Button>
                        </Tooltip>

                        <Tooltip label={"use the menu to make a custom game"} placement={"top"}>
                            <Button
                                isDisabled={gameSettingsPreset !== TriviaGameSettingsPreset.Custom}
                                colorScheme={"blue"} variant={gameSettingsPreset === TriviaGameSettingsPreset.Custom ? "solid" : "outline"}
                                marginLeft={"auto"} marginRight={"auto"}>
                                custom mode
                            </Button>
                        </Tooltip>
                    </Stack>

                    <Divider marginTop={"0.5em"} marginBottom={"0.5em"} />

                    <Heading size={"sm"} fontFamily={"logo"} fontSize={"1.5em"}>tips</Heading>
                    <UnorderedList justifyContent={"center"} listStyleType={"none"} margin={0}>
                        <ListItem>Use the menu to adjust volume</ListItem>
                        <ListItem>Change text size with Ctrl-/Ctrl+</ListItem>
                        <ListItem>Go fullscreen with F11</ListItem>
                    </UnorderedList>
                </Box>
            </Stack>

            <Box id={"leaderboard-box"} className={"box side-box"}>
                <Heading size={"sm"} fontFamily={"logo"} fontSize={"1.5em"}>leaderboard (placeholder)</Heading>
                <UnorderedList justifyContent={"center"} listStyleType={"none"} margin={0}>
                    <ListItem>Leader #1</ListItem>
                    <ListItem>Leader #2</ListItem>
                    <ListItem>Leader #3</ListItem>
                </UnorderedList>
            </Box>
        </Stack>
    );
}