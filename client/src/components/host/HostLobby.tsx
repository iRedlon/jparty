
import { ExternalLinkIcon, RepeatIcon } from "@chakra-ui/icons";
import { Box, Button, Divider, Heading, Input, Link, ListItem, Stack, Text, Tooltip, UnorderedList } from "@chakra-ui/react";
import {
    getSortedSessionPlayerIDs, HostServerSocket, HostSocket, LeaderboardPlayers, LeaderboardPlayerSchema, LeaderboardStatsSchema, LeaderboardType,
    Player, SocketID, TriviaGameSettingsPreset
} from "jparty-shared";
import { QRCodeSVG } from "qrcode.react";
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

function LeaderboardPlayerBox(leaderboardType: LeaderboardType, leaderboardPlayer: LeaderboardPlayerSchema, index: number) {
    return (
        <Box key={`${leaderboardType}-${leaderboardPlayer.name}-${leaderboardPlayer.timestampMs}`}
            className={"child-box"} height={"4em"} paddingLeft={"0.5em"} marginTop={"1em"} width={"80%"} marginLeft={"auto"} marginRight={"auto"}>

            <Stack direction={"column"} paddingRight={"1em"} overflow={"hidden"}>
                <Box textAlign={"left"} whiteSpace={"nowrap"}>
                    <b>{index + 1}. {leaderboardPlayer.name}</b>
                </Box>

                <Box textAlign={"left"} whiteSpace={"nowrap"}>
                    <Text fontSize={"2em"} position={"relative"} bottom={"0.4em"}>
                        <i>{formatDollarValue(leaderboardPlayer.score)}</i>
                    </Text>
                </Box>
            </Stack>
        </Box>
    );
}

interface HostLobbyProps {
    allTimeLeaderboardPlayers: LeaderboardPlayers | undefined;
    monthlyLeaderboardPlayers: LeaderboardPlayers | undefined;
    weeklyLeaderboardPlayers: LeaderboardPlayers | undefined;
    allTimeLeaderboardStats: LeaderboardStatsSchema | undefined;
    monthlyLeaderboardStats: LeaderboardStatsSchema | undefined;
    weeklyLeaderboardStats: LeaderboardStatsSchema | undefined;
}

export default function HostLobby({ allTimeLeaderboardPlayers, monthlyLeaderboardPlayers, weeklyLeaderboardPlayers,
    allTimeLeaderboardStats, monthlyLeaderboardStats, weeklyLeaderboardStats }: HostLobbyProps) {
    const joinedPlayersBoxRef = useRef(null);

    const context = useContext(LayoutContext);
    const [spectateSessionName, setSpectateSessionName] = useState("");
    const [gameSettingsPreset, setGameSettingsPreset] = useState(TriviaGameSettingsPreset.Normal);
    const [gamePreviewCategoryNames, setGamePreviewCategoryNames] = useState<string[] | undefined>(undefined);
    const [currentLeaderboardType, setCurrentLeaderboardType] = useState(LeaderboardType.AllTime);

    useEffect(() => {
        socket.on(HostServerSocket.UpdateGameSettingsPreset, handleUpdateGameSettingsPreset);
        socket.on(HostServerSocket.UpdateGamePreview, handleUpdateGamePreview);

        return () => {
            socket.off(HostServerSocket.UpdateGameSettingsPreset, handleUpdateGameSettingsPreset);
            socket.off(HostServerSocket.UpdateGamePreview, handleUpdateGamePreview);
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
        setGamePreviewCategoryNames(undefined);
    }

    const handleUpdateGamePreview = (categoryNames: string[]) => {
        setGamePreviewCategoryNames(categoryNames);
    }

    const emitGenerateGamePreview = () => {
        setGamePreviewCategoryNames(undefined);
        socket.emit(HostSocket.GenerateGamePreview);
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

    let leaderboardPlayers = undefined;
    let currentLeaderboardStats = undefined;
    switch (currentLeaderboardType) {
        case LeaderboardType.AllTime:
            {
                leaderboardPlayers = allTimeLeaderboardPlayers;
                currentLeaderboardStats = allTimeLeaderboardStats;
            }
            break;
        case LeaderboardType.Monthly:
            {
                leaderboardPlayers = monthlyLeaderboardPlayers;
                currentLeaderboardStats = monthlyLeaderboardStats;
            }
            break;
        case LeaderboardType.Weekly:
            {
                leaderboardPlayers = weeklyLeaderboardPlayers;
                currentLeaderboardStats = weeklyLeaderboardStats;
            }
            break;
    }

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
                    {<Link href={PATCH_NOTES_LINK} isExternal>
                        <i><u>version 1.1 patch notes</u></i> <ExternalLinkIcon mx={"2px"} />
                    </Link>}

                    <Divider marginTop={"0.5em"} marginBottom={"0.5em"} />

                    <Box>
                        join on your phone with session name:
                        <Stack direction={"row"} justifyContent={"center"} alignItems={"center"} gap={"1em"}>
                            <Heading fontFamily={"logo"} fontSize={"3em"}>{context.sessionName}</Heading>
                            <Divider orientation={"vertical"} height={"2.5em"} />
                            {context.sessionName && (
                                <QRCodeSVG value={`${window.location.origin}/?join=${context.sessionName}`} marginSize={1} style={{ width: "2.5em", height: "2.5em" }} />
                            )}
                        </Stack>
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
                            <Button
                                isDisabled={context.isSpectator}
                                onClick={() => handleUpdateGameSettingsPreset(TriviaGameSettingsPreset.Normal)}
                                colorScheme={"blue"} variant={gameSettingsPreset === TriviaGameSettingsPreset.Normal ? "solid" : "outline"}
                                marginLeft={"auto"} marginRight={"auto"}>
                                normal mode
                            </Button>
                        </Tooltip>

                        <Tooltip label={"shorter, easier game. more clue bonuses"} placement={"top"}>
                            <Button
                                isDisabled={context.isSpectator}
                                onClick={() => handleUpdateGameSettingsPreset(TriviaGameSettingsPreset.Party)}
                                colorScheme={"blue"} variant={gameSettingsPreset === TriviaGameSettingsPreset.Party ? "solid" : "outline"}
                                marginLeft={"auto"} marginRight={"auto"}>
                                party mode
                            </Button>
                        </Tooltip>

                        {/* <Tooltip label={"use the menu to make a custom game"} placement={"top"}>
                            <Button
                                isDisabled={context.isSpectator || (gameSettingsPreset !== TriviaGameSettingsPreset.Custom)}
                                colorScheme={"blue"} variant={gameSettingsPreset === TriviaGameSettingsPreset.Custom ? "solid" : "outline"}
                                marginLeft={"auto"} marginRight={"auto"}>
                                custom mode
                            </Button>
                        </Tooltip> */}
                    </Stack>

                    <Divider marginTop={"0.5em"} marginBottom={"0.5em"} />

                    <Heading size={"sm"} fontFamily={"logo"} fontSize={"1.5em"}>round 1 categories</Heading>
                    {gamePreviewCategoryNames ? (
                        <UnorderedList justifyContent={"center"} listStyleType={"none"} margin={0}>
                            {gamePreviewCategoryNames.map((categoryName, index) => (
                                <ListItem key={`game-preview-category-${index}`}>{categoryName}</ListItem>
                            ))}
                        </UnorderedList>
                    ) : (
                        <Text><i>generating trivia...</i></Text>
                    )}

                    <Button
                        isDisabled={context.isSpectator || !gamePreviewCategoryNames}
                        onClick={emitGenerateGamePreview}
                        leftIcon={<RepeatIcon />} colorScheme={"blue"} size={"sm"} marginTop={"0.5em"}>
                        re-roll
                    </Button>
                </Box>
            </Stack>

            <Box id={"leaderboard-box"} className={"box side-box"}>
                <Tooltip placement={"top"}>
                    <Heading size={"sm"} fontFamily={"logo"} fontSize={"1.5em"}>leaderboard</Heading>
                </Tooltip>

                <Stack direction={"row"} justifyContent={"center"}>
                    <Button
                        paddingLeft={"0.5em"} paddingRight={"0.5em"}
                        onClick={() => setCurrentLeaderboardType(LeaderboardType.AllTime)}
                        colorScheme={"blue"} variant={currentLeaderboardType === LeaderboardType.AllTime ? "solid" : "outline"}>
                        all time
                    </Button>

                    <Button
                        paddingLeft={"0.5em"} paddingRight={"0.5em"}
                        onClick={() => setCurrentLeaderboardType(LeaderboardType.Monthly)}
                        colorScheme={"blue"} variant={currentLeaderboardType === LeaderboardType.Monthly ? "solid" : "outline"}>
                        monthly
                    </Button>

                    <Button
                        paddingLeft={"0.5em"} paddingRight={"0.5em"}
                        onClick={() => setCurrentLeaderboardType(LeaderboardType.Weekly)}
                        colorScheme={"blue"} variant={currentLeaderboardType === LeaderboardType.Weekly ? "solid" : "outline"}>
                        weekly
                    </Button>
                </Stack>

                {currentLeaderboardStats && (
                    <Box marginTop={"0.5em"}>
                        <Text><i>games played: {currentLeaderboardStats.gamesPlayed}</i></Text>
                        <Text><i>money earned: {formatDollarValue(currentLeaderboardStats.moneyEarned)}</i></Text>
                    </Box>
                )}

                {leaderboardPlayers?.map((leaderboardPlayer, index) => LeaderboardPlayerBox(currentLeaderboardType, leaderboardPlayer, index))}
            </Box>
        </Stack>
    );
}