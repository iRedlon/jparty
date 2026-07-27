
import { ExternalLinkIcon, RepeatIcon } from "@chakra-ui/icons";
import { Box, Button, Divider, Heading, Input, Link, ListItem, Select, Stack, Text, Tooltip, UnorderedList } from "@chakra-ui/react";
import {
    getClueYearOptions, getPresetGameSettings, getSortedSessionPlayerIDs, HostSocket, LeaderboardPlayers, LeaderboardPlayerSchema,
    LeaderboardStatsSchema, LeaderboardType, Player, SocketID, TriviaGameSettingsPreset
} from "jparty-shared";
import { QRCodeSVG } from "qrcode.react";
import { useContext, useRef, useState } from "react";

import { LayoutContext } from "../common/Layout";
import { emitLeaveSession } from "../common/MenuPanel_Settings";
import { formatDollarValueString, getClientID } from "../../misc/client-utils";
import { socket } from "../../misc/socket";
import { LocalStorageKey, PATCH_NOTES_LINK } from "../../misc/ui-constants";

import "../../style/components/HostLobby.css";

const CLUE_YEAR_OPTIONS = getClueYearOptions();

function JoinedPlayerBox(player: Player) {
    let nameFontSize = "2em";
    if (player.name.length > 14) {
        nameFontSize = "1em";
    }
    else if (player.name.length > 10) {
        nameFontSize = "1.2em";
    }
    else if (player.name.length > 6) {
        nameFontSize = "1.5em";
    }

    return (
        <Stack key={player.clientID} direction={"row"} justifyContent={"center"} paddingTop={"1em"} gap={"1em"}>
            <Box className={"child-box"} height={"4em"} minHeight={"4em"} width={"4em"} minWidth={"4em"}>
                <img src={player.signatureImageBase64} />
            </Box>

            <Box className={"child-box"} height={"4em"} width={"8em"} overflow={"hidden"} display={"flex"} justifyContent={"center"} alignItems={"center"} padding={"0.5em"}>
                <Text fontSize={nameFontSize} lineHeight={"1.1em"} textAlign={"center"} overflowWrap={"anywhere"}>
                    <b>{player.name}</b>
                </Text>
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
                        <i>{formatDollarValueString(leaderboardPlayer.score)}</i>
                    </Text>
                </Box>
            </Stack>
        </Box>
    );
}

function clueYearSelect(value: number, onSelect: (year: number) => void, id: string, isDisabled: boolean) {
    return (
        <Select id={id} value={value} onChange={(e) => onSelect(parseInt(e.target.value))} isDisabled={isDisabled}
            size={"sm"} width={"5.5em"} borderRadius={"md"} textAlign={"center"} cursor={"pointer"}>

            {CLUE_YEAR_OPTIONS.map(year => (
                <option key={`${id}-${year}`} value={year}>{year}</option>
            ))}
        </Select>
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
    minClueYear: number;
    setMinClueYear: Function;
    maxClueYear: number;
    setMaxClueYear: Function;
    gamePreviewCategoryNames: string[] | undefined;
    setGamePreviewCategoryNames: Function;
}

export default function HostLobby({ allTimeLeaderboardPlayers, monthlyLeaderboardPlayers, weeklyLeaderboardPlayers,
    allTimeLeaderboardStats, monthlyLeaderboardStats, weeklyLeaderboardStats,
    gameSettingsPreset, setGameSettingsPreset, minClueYear, setMinClueYear, maxClueYear, setMaxClueYear,
    gamePreviewCategoryNames, setGamePreviewCategoryNames }: HostLobbyProps) {
    const joinedPlayersBoxRef = useRef(null);

    const context = useContext(LayoutContext);
    const [spectateSessionName, setSpectateSessionName] = useState("");
    const [currentLeaderboardType, setCurrentLeaderboardType] = useState(LeaderboardType.AllTime);

    const [pendingGameSettingsPreset, setPendingGameSettingsPreset] = useState<TriviaGameSettingsPreset | undefined>();

    const applyGameSettingsPreset = (preset: TriviaGameSettingsPreset) => {
        setPendingGameSettingsPreset(undefined);

        socket.emit(HostSocket.UpdateGameSettingsPreset, preset);
        setGameSettingsPreset(preset);

        // each preset comes with its own default clue year range
        const presetGameSettings = getPresetGameSettings(preset);
        setMinClueYear(presetGameSettings.minClueYear);
        setMaxClueYear(presetGameSettings.maxClueYear);

        setGamePreviewCategoryNames(undefined);
    }

    const emitUpdateClueYearRange = (newMinClueYear: number, newMaxClueYear: number) => {
        if (context.isSpectator || ((newMinClueYear === minClueYear) && (newMaxClueYear === maxClueYear))) {
            return;
        }

        socket.emit(HostSocket.UpdateClueYearRange, newMinClueYear, newMaxClueYear);
        setMinClueYear(newMinClueYear);
        setMaxClueYear(newMaxClueYear);
        setGamePreviewCategoryNames(undefined);
    }

    const selectMinClueYear = (year: number) => emitUpdateClueYearRange(year, Math.max(year, maxClueYear));
    const selectMaxClueYear = (year: number) => emitUpdateClueYearRange(Math.min(year, minClueYear), year);

    const handleSelectGameSettingsPreset = (preset: TriviaGameSettingsPreset) => {
        if (gameSettingsPreset === TriviaGameSettingsPreset.Custom) {
            setPendingGameSettingsPreset(preset);
            return;
        }

        applyGameSettingsPreset(preset);
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
                {context.sessionName && (
                    <Box className={"child-box"} width={"fit-content"} marginLeft={"auto"} marginRight={"auto"} padding={"0.5em"} display={"flex"}>
                        <QRCodeSVG value={`${window.location.origin}/?join=${context.sessionName}`} marginSize={1} style={{ width: "12em", height: "12em" }} />
                    </Box>
                )}
                <Box id={"joined-players-list-box"}>
                    {sortedSessionPlayerIDs.map((playerID: SocketID) => {
                        return JoinedPlayerBox(context.sessionPlayers[playerID]);
                    })}
                </Box>
            </Box>

            <Stack id={"lobby-center-column"} direction={"column"}>
                <Box id={"logo-box"} className={"box"} padding={"2em"}>
                    <Heading className={"logo-text"} fontSize={"4em"}>jparty!</Heading>
                    <Heading className={"logo-text"} fontSize={"1.5em"}><i>a free couch co-op Jeopardy! game</i></Heading>
                    {<Link href={PATCH_NOTES_LINK} isExternal>
                        <i><u>version 1.1 patch notes</u></i> <ExternalLinkIcon mx={"2px"} />
                    </Link>}

                    <Divider marginTop={"0.5em"} marginBottom={"0.5em"} />

                    <Box>
                        join on your phone with session name:
                        <Heading className={"logo-text"} fontSize={"3em"} marginBottom={"-0.1em"}>{context.sessionName}</Heading>
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
                                size={"sm"} width={"8em"}
                                colorScheme={"blue"} variant={gameSettingsPreset === TriviaGameSettingsPreset.Normal ? "solid" : "outline"}>
                                normal mode
                            </Button>
                        </Tooltip>

                        <Tooltip label={"shorter, easier game. more clue bonuses"} placement={"top"}>
                            <Button
                                isDisabled={context.isSpectator}
                                onClick={() => handleSelectGameSettingsPreset(TriviaGameSettingsPreset.Party)}
                                size={"sm"} width={"8em"}
                                colorScheme={"blue"} variant={gameSettingsPreset === TriviaGameSettingsPreset.Party ? "solid" : "outline"}>
                                party mode
                            </Button>
                        </Tooltip>
                    </Stack>

                     <Stack direction={"column"} alignItems={"center"} gap={"0.4em"} marginTop={"0.5em"} marginBottom={"1em"}>
                        <Text><i>using Jeopardy! categories aired between</i></Text>

                        <Stack direction={"row"} justifyContent={"center"} alignItems={"center"} gap={"0.4em"}>
                            {clueYearSelect(minClueYear, selectMinClueYear, "min-clue-year", context.isSpectator)}

                            <Text><i>and</i></Text>

                            {clueYearSelect(maxClueYear, selectMaxClueYear, "max-clue-year", context.isSpectator)}
                        </Stack>
                    </Stack>

                    {pendingGameSettingsPreset !== undefined && (
                        <Box className={"child-box"} width={"fit-content"} marginLeft={"auto"} marginRight={"auto"} padding={"0.5em"} marginBottom={"0.5em"}>
                            <Text>are you sure? your custom game settings will be lost</Text>
                            <Stack direction={"row"} justifyContent={"center"}>
                                <Button onClick={() => applyGameSettingsPreset(pendingGameSettingsPreset)} size={"sm"} margin={"0.5em"} colorScheme={"red"}>
                                    yes, switch mode
                                </Button>
                                <Button onClick={() => setPendingGameSettingsPreset(undefined)} size={"sm"} margin={"0.5em"}>cancel</Button>
                            </Stack>
                        </Box>
                    )}

                    <Box width={"21em"} height={"4.5em"} marginLeft={"auto"} marginRight={"auto"} marginTop={"0.5em"} marginBottom={"0.5em"}
                        display={"flex"} justifyContent={"center"} alignItems={"center"}>
                        {gamePreviewCategoryNames && !gamePreviewCategoryNames.length ? (
                            <Text><i>not enough clues between {minClueYear} and {maxClueYear}. try a wider range</i></Text>
                        ) : gamePreviewCategoryNames ? (
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
                            <Text><i>randomizing categories...</i></Text>
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
                        <Text><i>{formatDollarValueString(currentLeaderboardStats.moneyEarned)} total earnings</i></Text>
                    </Box>
                )}

                <Box id={"leaderboard-players-box"}>
                    {leaderboardPlayers?.map((leaderboardPlayer, index) => LeaderboardPlayerBox(currentLeaderboardType, leaderboardPlayer, index))}
                </Box>
            </Box>
        </Stack>
    );
}