
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { Box, Button, Divider, Heading, Input, Link, ListItem, Stack, Text, Tooltip, UnorderedList } from "@chakra-ui/react";
import { getSortedSessionPlayerIDs, HostServerSocket, HostSocket, Player, SocketID, TriviaGameSettingsPreset } from "jparty-shared";
import { useContext, useEffect, useRef, useState } from "react";

import { LayoutContext } from "../common/Layout";
import { emitLeaveSession } from "../common/MenuPanel_Settings";
import { formatDollarValue, getClientID } from "../../misc/client-utils";
import { socket } from "../../misc/socket";
import { LocalStorageKey, PATCH_NOTES_LINK } from "../../misc/ui-constants";

import "../../style/components/HostLobby.css";

function JoinedPlayerBox(player: Player) {
    return (
        <Stack key={player.clientID} direction={"row"} justifyContent={"center"} paddingTop={"1em"} gap={"1em"}>
            <Box className={"child-box"} height={"4em"} minHeight={"4em"} width={"4em"} minWidth={"4em"}>
                <img src={player.signatureImageBase64} />
            </Box>

            <Box className={"child-box"} height={"4em"} width={"8em"} overflow={"hidden"} display={"flex"} justifyContent={"center"} alignItems={"center"} padding={"0.5em"}>
                <Text fontSize={"1.5em"} lineHeight={"1em"}><b>{player.name}</b></Text>
            </Box>
        </Stack>
    );
}

function LeaderboardPlayerBox(player: Player, index: number) {
    return (
        <Box key={player.clientID} className={"child-box"} height={"4em"} paddingLeft={"0.5em"} marginTop={"1em"} width={"80%"} marginLeft={"auto"} marginRight={"auto"}>
            <Stack direction={"column"} paddingRight={"1em"} overflow={"hidden"}>
                <Box textAlign={"left"} whiteSpace={"nowrap"}>
                    <b>{index + 1}. {player.name}</b>
                </Box>

                <Box textAlign={"left"} whiteSpace={"nowrap"}>
                    <Text fontSize={"2em"} position={"relative"} bottom={"0.4em"}>
                        <i>{formatDollarValue(player.score)}</i>
                    </Text>
                </Box>
            </Stack>
        </Box>
    );
}

function PlaceholderLeaderboardPlayerBoxes() {
    let player1 = new Player("1", "aristotle");
    player1.score = 131127;

    let player2 = new Player("2", "plato");
    player2.score = 130022;

    let player3 = new Player("3", "socrates");
    player3.score = 118816;

    return (
        <>
            {LeaderboardPlayerBox(player1, 0)}
            {LeaderboardPlayerBox(player2, 1)}
            {LeaderboardPlayerBox(player3, 2)}
        </>
    )
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
        localStorage.setItem(LocalStorageKey.IsPlayer, "true");
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
                    <Link href={PATCH_NOTES_LINK} isExternal>
                        <i>patch notes <ExternalLinkIcon mx={"2px"} /></i>
                    </Link>

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
                <Heading size={"sm"} fontFamily={"logo"} fontSize={"1.5em"}>leaderboard<br />(coming soon)</Heading>
                <Text fontSize={"0.75em"}>Games must be normal mode. Player must not have earned more than $2000 from decision reversals</Text>

                {PlaceholderLeaderboardPlayerBoxes()}
            </Box>
        </Stack>
    );
}