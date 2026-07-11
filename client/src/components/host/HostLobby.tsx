
import { ExternalLinkIcon, RepeatIcon } from "@chakra-ui/icons";
import { Box, Button, Divider, Heading, Input, Link, ListItem, Stack, Text, Tooltip, UnorderedList } from "@chakra-ui/react";
import {
    getSortedSessionPlayerIDs, HostSocket, LeaderboardPlayers, LeaderboardPlayerSchema, LeaderboardStatsSchema, LeaderboardType,
    Player, SocketID, TriviaGameSettingsPreset
} from "jparty-shared";
import { QRCodeSVG } from "qrcode.react";
import { useContext, useRef, useState } from "react";

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
                <Text fontSize={"2em"} lineHeight={"1em"}><b>{player.name}</b></Text>
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
    gameSettingsPreset: TriviaGameSettingsPreset;
    setGameSettingsPreset: Function;
    gamePreviewCategoryNames: string[] | undefined;
    setGamePreviewCategoryNames: Function;
}

export default function HostLobby({ allTimeLeaderboardPlayers, monthlyLeaderboardPlayers, weeklyLeaderboardPlayers,
    allTimeLeaderboardStats, monthlyLeaderboardStats, weeklyLeaderboardStats,
    gameSettingsPreset, setGameSettingsPreset, gamePreviewCategoryNames, setGamePreviewCategoryNames }: HostLobbyProps) {
    const joinedPlayersBoxRef = useRef(null);

    const context = useContext(LayoutContext);
    const [spectateSessionName, setSpectateSessionName] = useState("");
    const [currentLeaderboardType, setCurrentLeaderboardType] = useState(LeaderboardType.AllTime);

    const handleSelectGameSettingsPreset = (preset: TriviaGameSettingsPreset) => {
        socket.emit(HostSocket.UpdateGameSettingsPreset, preset);

        if (gameSettingsPreset === TriviaGameSettingsPreset.Custom && !confirm("Are you sure? Your custom game settings will be lost")) {
            return;
        }

        setGameSettingsPreset(preset);
        setGamePreviewCategoryNames(undefined);
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
                <Heading size={"sm"} className={"logo-text"} fontSize={"2em"}>players</Heading>
                <Box id={"joined-players-list-box"}>
                    {sortedSessionPlayerIDs.map((playerID: SocketID) => {
                        return JoinedPlayerBox(context.sessionPlayers[playerID]);
                    })}
                </Box>
            </Box>

            <Stack id={"lobby-center-column"} direction={"column"}>
                <Box id={"logo-box"} className={"box"} padding={"2em"}>
                    <Heading className={"logo-text"} fontSize={"4em"}>jparty!</Heading>
                    {<Link href={PATCH_NOTES_LINK} isExternal>
                        <i><u>version 1.1 patch notes</u></i> <ExternalLinkIcon mx={"2px"} />
                    </Link>}

                    <Divider marginTop={"0.5em"} marginBottom={"0.5em"} />

                    <Box>
                        join on your phone with session name:
                        <Stack direction={"row"} justifyContent={"center"} alignItems={"center"} gap={"1em"}>
                            <Heading className={"logo-text"} fontSize={"3em"} marginBottom={"-0.1em"}>{context.sessionName}</Heading>
                            <Divider orientation={"vertical"} height={"4em"} />
                            {context.sessionName && (
                                <QRCodeSVG value={`${window.location.origin}/?join=${context.sessionName}`} marginSize={1} style={{ width: "5em", height: "5em" }} />
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

                <Box marginTop={"0.2em"} marginBottom={"0.2em"} />

                <Box id={"game-settings-preset-box"} className={"box"} padding={"1.5em"}>
                    <Heading size={"sm"} className={"logo-text"} fontSize={"2em"}>category preview</Heading>

                    <Stack direction={"row"} justifyContent={"center"} marginTop={"0.5em"} marginBottom={"0.5em"}>
                        <Tooltip label={"standard rules. counts for public leaderboard"} placement={"top"}>
                            <Button
                                isDisabled={context.isSpectator}
                                onClick={() => handleSelectGameSettingsPreset(TriviaGameSettingsPreset.Normal)}
                                size={"sm"}
                                colorScheme={"blue"} variant={gameSettingsPreset === TriviaGameSettingsPreset.Normal ? "solid" : "outline"}>
                                normal mode
                            </Button>
                        </Tooltip>

                        <Tooltip label={"shorter, easier game. more clue bonuses"} placement={"top"}>
                            <Button
                                isDisabled={context.isSpectator}
                                onClick={() => handleSelectGameSettingsPreset(TriviaGameSettingsPreset.Party)}
                                size={"sm"}
                                colorScheme={"blue"} variant={gameSettingsPreset === TriviaGameSettingsPreset.Party ? "solid" : "outline"}>
                                party mode
                            </Button>
                        </Tooltip>
                    </Stack>

                    <Box width={"21em"} height={"4.5em"} marginLeft={"auto"} marginRight={"auto"} marginTop={"0.5em"} marginBottom={"0.5em"} 
                        display={"flex"} justifyContent={"center"} alignItems={"center"}>
                        {gamePreviewCategoryNames ? (
                            <Stack direction={"row"} justifyContent={"center"} alignItems={"center"} gap={"1em"}>
                                <UnorderedList justifyContent={"center"} listStyleType={"none"} margin={0} width={"10em"}>
                                    {gamePreviewCategoryNames.slice(0, 3).map((categoryName, index) => (
                                        <ListItem key={`game-preview-category-${index}`} noOfLines={1}>{categoryName}</ListItem>
                                    ))}
                                </UnorderedList>

                                <Divider orientation={"vertical"} height={"4em"} />

                                <UnorderedList justifyContent={"center"} listStyleType={"none"} margin={0} width={"10em"}>
                                    {gamePreviewCategoryNames.slice(3).map((categoryName, index) => (
                                        <ListItem key={`game-preview-category-${index}`} noOfLines={1}>{categoryName}</ListItem>
                                    ))}
                                </UnorderedList>
                            </Stack>
                        ) : (
                            <Text><i>generating trivia...</i></Text>
                        )}
                    </Box>

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
                    <Heading size={"sm"} className={"logo-text"} fontSize={"2em"}>leaderboard</Heading>
                </Tooltip>

                <Stack direction={"row"} justifyContent={"center"} marginTop={"0.75em"}>
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
                        <Text><i>{currentLeaderboardStats.gamesPlayed} games played</i></Text>
                        <Text><i>{formatDollarValue(currentLeaderboardStats.moneyEarned)} total earnings</i></Text>
                    </Box>
                )}

                <Box id={"leaderboard-players-box"}>
                    {leaderboardPlayers?.map((leaderboardPlayer, index) => LeaderboardPlayerBox(currentLeaderboardType, leaderboardPlayer, index))}
                </Box>
            </Box>
        </Stack>
    );
}