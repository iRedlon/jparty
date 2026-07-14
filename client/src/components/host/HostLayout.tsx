
import { Box, Center, Flex } from "@chakra-ui/react";
import { AudioType, HostServerSocket, LeaderboardPlayers, LeaderboardStatsSchema, LeaderboardType, ServerSocket, SessionAnnouncement, SessionState, SessionTimeoutType, TriviaClueBonus, TriviaGameSettingsPreset, VoiceType } from "jparty-shared";
import { useContext, useEffect, useRef, useState } from "react";
import { GoMute } from "react-icons/go";
import { CSSTransition, SwitchTransition } from "react-transition-group";

import HostBoard from "./HostBoard";
import HostClue from "./HostClue";
import HostGameOver from "./HostGameOver";
import HostLobby from "./HostLobby";
import HostMenu from "./HostMenu";
import HostWager from "./HostWager";
import Announcement from "./HostAnnouncement";
import { LayoutContext } from "../common/Layout";
import ServerMessageAlert from "../common/ServerMessage";
import Timer from "../common/Timer";
import { playAudio, playOpenAIVoice, playSpeechSynthesisVoice, subscribeToMuteState, isAudioMuted } from "../../misc/audio";
import { addMockSocketEventHandler, removeMockSocketEventHandler } from "../../misc/mock-socket";
import { estimateClientTimeMs, socket } from "../../misc/socket";
import { Layer } from "../../misc/ui-constants";

import "../../style/components/HostLayout.css";

enum HostComponentState {
    None,
    Announcement,
    Lobby,
    Board,
    Clue,
    Wager,
    GameOver
}

export default function HostLayout() {
    const sessionStateRef = useRef(null);

    const context = useContext(LayoutContext);
    const [isMuted, setIsMuted] = useState(isAudioMuted());
    const [allTimeLeaderboardPlayers, setAllTimeLeaderboardPlayers] = useState<LeaderboardPlayers | undefined>();
    const [monthlyLeaderboardPlayers, setMonthlyLeaderboardPlayers] = useState<LeaderboardPlayers | undefined>();
    const [weeklyLeaderboardPlayers, setWeeklyLeaderboardPlayers] = useState<LeaderboardPlayers | undefined>();
    const [allTimeLeaderboardStats, setAllTimeLeaderboardStats] = useState<LeaderboardStatsSchema | undefined>();
    const [monthlyLeaderboardStats, setMonthlyLeaderboardStats] = useState<LeaderboardStatsSchema | undefined>();
    const [weeklyLeaderboardStats, setWeeklyLeaderboardStats] = useState<LeaderboardStatsSchema | undefined>();
    const [announcement, setAnnouncement] = useState<SessionAnnouncement | undefined>();
    const queuedToHideAnnouncement = useRef(false);
    const [numSubmittedResponders, setNumSubmittedResponders] = useState(0);
    const [numResponders, setNumResponders] = useState(0);
    const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
    const [gameSettingsPreset, setGameSettingsPreset] = useState(TriviaGameSettingsPreset.Normal);
    const [gamePreviewCategoryNames, setGamePreviewCategoryNames] = useState<string[] | undefined>();
    const [responseWindowOpenTimeMs, setResponseWindowOpenTimeMs] = useState<number | undefined>();
    const [responseWindowOpen, setResponseWindowOpen] = useState(false);

    useEffect(() => {
        window.speechSynthesis.getVoices();
        
        socket.on(HostServerSocket.UpdateLeaderboardPlayers, handleUpdateLeaderboardPlayers);
        socket.on(HostServerSocket.UpdateLeaderboardStats, handleUpdateLeaderboardStats);
        socket.on(HostServerSocket.PlayAudio, handlePlayAudio);
        socket.on(HostServerSocket.PlayVoice, handlePlayVoice);
        socket.on(HostServerSocket.ShowAnnouncement, handleShowAnnouncement);
        socket.on(HostServerSocket.HideAnnouncement, handleHideAnnouncement);
        socket.on(HostServerSocket.UpdateNumSubmittedResponders, handleUpdateNumSubmittedResponders);
        socket.on(HostServerSocket.RevealClueDecision, handleRevealClueDecision);
        socket.on(HostServerSocket.UpdateGameSettingsPreset, handleServerUpdateGameSettingsPreset);
        socket.on(HostServerSocket.UpdateGamePreview, handleUpdateGamePreview);
        socket.on(ServerSocket.StartTimeout, handleStartTimeout);
        socket.on(ServerSocket.StopTimeout, handleStopTimeout);
        socket.on(ServerSocket.UpdateSessionState, handleUpdateSessionState);

        addMockSocketEventHandler(HostServerSocket.UpdateLeaderboardPlayers, handleUpdateLeaderboardPlayers);
        addMockSocketEventHandler(HostServerSocket.UpdateLeaderboardStats, handleUpdateLeaderboardStats);
        addMockSocketEventHandler(HostServerSocket.PlayAudio, handlePlayAudio);
        addMockSocketEventHandler(HostServerSocket.PlayVoice, handlePlayVoice);
        addMockSocketEventHandler(HostServerSocket.ShowAnnouncement, handleShowAnnouncement);
        addMockSocketEventHandler(HostServerSocket.HideAnnouncement, handleHideAnnouncement);
        addMockSocketEventHandler(HostServerSocket.UpdateNumSubmittedResponders, handleUpdateNumSubmittedResponders);
        addMockSocketEventHandler(HostServerSocket.RevealClueDecision, handleRevealClueDecision);
        addMockSocketEventHandler(HostServerSocket.UpdateGamePreview, handleUpdateGamePreview);
        addMockSocketEventHandler(ServerSocket.StartTimeout, handleStartTimeout);
        addMockSocketEventHandler(ServerSocket.UpdateSessionState, handleUpdateSessionState);

        return () => {
            socket.off(HostServerSocket.UpdateLeaderboardPlayers, handleUpdateLeaderboardPlayers);
            socket.off(HostServerSocket.UpdateLeaderboardStats, handleUpdateLeaderboardStats);
            socket.off(HostServerSocket.PlayAudio, handlePlayAudio);
            socket.off(HostServerSocket.PlayVoice, handlePlayVoice);
            socket.off(HostServerSocket.ShowAnnouncement, handleShowAnnouncement);
            socket.off(HostServerSocket.HideAnnouncement, handleHideAnnouncement);
            socket.off(HostServerSocket.UpdateNumSubmittedResponders, handleUpdateNumSubmittedResponders);
            socket.off(HostServerSocket.RevealClueDecision, handleRevealClueDecision);
            socket.off(HostServerSocket.UpdateGameSettingsPreset, handleServerUpdateGameSettingsPreset);
            socket.off(HostServerSocket.UpdateGamePreview, handleUpdateGamePreview);
            socket.off(ServerSocket.StartTimeout, handleStartTimeout);
            socket.off(ServerSocket.StopTimeout, handleStopTimeout);
            socket.off(ServerSocket.UpdateSessionState, handleUpdateSessionState);

            removeMockSocketEventHandler(HostServerSocket.UpdateLeaderboardPlayers, handleUpdateLeaderboardPlayers);
            removeMockSocketEventHandler(HostServerSocket.UpdateLeaderboardStats, handleUpdateLeaderboardStats);
            removeMockSocketEventHandler(HostServerSocket.PlayAudio, handlePlayAudio);
            removeMockSocketEventHandler(HostServerSocket.PlayVoice, handlePlayVoice);
            removeMockSocketEventHandler(HostServerSocket.ShowAnnouncement, handleShowAnnouncement);
            removeMockSocketEventHandler(HostServerSocket.HideAnnouncement, handleHideAnnouncement);
            removeMockSocketEventHandler(HostServerSocket.UpdateNumSubmittedResponders, handleUpdateNumSubmittedResponders);
            removeMockSocketEventHandler(HostServerSocket.RevealClueDecision, handleRevealClueDecision);
            removeMockSocketEventHandler(HostServerSocket.UpdateGamePreview, handleUpdateGamePreview);
            removeMockSocketEventHandler(ServerSocket.StartTimeout, handleStartTimeout);
            removeMockSocketEventHandler(ServerSocket.UpdateSessionState, handleUpdateSessionState);
        }
    }, []);

    // keep the mute icon in sync with whether audio is actually playing, so it can never be stuck blinking while sound plays
    useEffect(() => {
        return subscribeToMuteState(setIsMuted);
    }, []);

    const handleStartTimeout = (timeoutType: SessionTimeoutType, openTimeMs: number) => {
        setResponseWindowOpenTimeMs((timeoutType === SessionTimeoutType.ResponseWindow) ? estimateClientTimeMs(openTimeMs) : undefined);
    }

    const handleStopTimeout = () => {
        setResponseWindowOpenTimeMs(undefined);
    }

    useEffect(() => {
        if (responseWindowOpenTimeMs === undefined) {
            setResponseWindowOpen(false);
            return;
        }

        const remainingMs = responseWindowOpenTimeMs - Date.now();
        if (remainingMs <= 0) {
            setResponseWindowOpen(true);
            return;
        }

        setResponseWindowOpen(false);

        const timeout = setTimeout(() => setResponseWindowOpen(true), remainingMs);
        return () => clearTimeout(timeout);
    }, [responseWindowOpenTimeMs]);

    const getMusicAudioType = () => {
        if (context.sessionState === SessionState.Lobby) {
            return AudioType.LobbyMusic;
        }

        if (responseWindowOpen && (context.sessionState === SessionState.ClueResponse) && (context.categoryIndex >= 0) && (context.clueIndex >= 0)) {
            const triviaClue = context.triviaRound?.categories[context.categoryIndex]?.clues[context.clueIndex];
            if (triviaClue?.bonus === TriviaClueBonus.AllWager) {
                return AudioType.ThinkingMusic;
            }
        }

        return AudioType.GameMusic;
    }

    useEffect(() => {
        playAudio(getMusicAudioType());
    }, [context.sessionState, responseWindowOpen]);

    const handleUpdateSessionState = () => {
        if (queuedToHideAnnouncement.current) {
            queuedToHideAnnouncement.current = false;
            setAnnouncement(undefined);
        }
    }

    const handleUpdateLeaderboardPlayers = (leaderboardType: LeaderboardType, leaderboardPlayers: LeaderboardPlayers) => {
        switch (leaderboardType) {
            case LeaderboardType.AllTime:
                {
                    setAllTimeLeaderboardPlayers(JSON.parse(JSON.stringify(leaderboardPlayers)));
                }
                break;
            case LeaderboardType.Monthly:
                {
                    setMonthlyLeaderboardPlayers(JSON.parse(JSON.stringify(leaderboardPlayers)));
                }
                break;
            case LeaderboardType.Weekly:
                {
                    setWeeklyLeaderboardPlayers(JSON.parse(JSON.stringify(leaderboardPlayers)));
                }
                break;
        }
    }

    const handleUpdateLeaderboardStats = (leaderboardType: LeaderboardType, leaderboardStats: LeaderboardStatsSchema) => {
        switch (leaderboardType) {
            case LeaderboardType.AllTime:
                {
                    setAllTimeLeaderboardStats(leaderboardStats);
                }
                break;
            case LeaderboardType.Monthly:
                {
                    setMonthlyLeaderboardStats(leaderboardStats);
                }
                break;
            case LeaderboardType.Weekly:
                {
                    setWeeklyLeaderboardStats(leaderboardStats);
                }
                break;
        }
    }

    const handleServerUpdateGameSettingsPreset = (preset: TriviaGameSettingsPreset) => {
        setGameSettingsPreset(preset);
        setGamePreviewCategoryNames(undefined);
    }

    const handleUpdateGamePreview = (categoryNames: string[]) => {
        setGamePreviewCategoryNames(categoryNames);
    }

    const handlePlayAudio = (audioType: AudioType) => {
        playAudio(audioType);
    }

    const handlePlayVoice = (voiceType: VoiceType, voiceLine: string, streamAudio?: boolean) => {
        if (streamAudio) {
            playOpenAIVoice(voiceType, voiceLine);
        }
        else {
            playSpeechSynthesisVoice(voiceType, voiceLine);
        }
    }

    const handleShowAnnouncement = (announcement: SessionAnnouncement) => {
        setAnnouncement(announcement);
        queuedToHideAnnouncement.current = false;
    }

    const handleHideAnnouncement = (forceHide: boolean) => {
        if (forceHide) {
            queuedToHideAnnouncement.current = false;
            setAnnouncement(undefined);
        }
        else {
            queuedToHideAnnouncement.current = true;
        }
    }

    const handleUpdateNumSubmittedResponders = (numSubmittedResponders: number, numResponders: number) => {
        setNumSubmittedResponders(numSubmittedResponders);
        setNumResponders(numResponders);
    }

    const handleRevealClueDecision = (showCorrectAnswer: boolean) => {
        setShowCorrectAnswer(showCorrectAnswer);
    }

    const handleUserInteraction = () => {
        playAudio(getMusicAudioType());
    }

    // returns both the JSX component and a state representing the specific component that was returned
    const getHostComponent = () => {
        if (announcement !== undefined) {
            return [<Announcement announcement={announcement} />, SessionAnnouncement[announcement]];
        }

        if (context.sessionState === SessionState.Lobby) {
            return context.sessionName ?
                [<HostLobby
                    allTimeLeaderboardPlayers={allTimeLeaderboardPlayers}
                    monthlyLeaderboardPlayers={monthlyLeaderboardPlayers}
                    weeklyLeaderboardPlayers={weeklyLeaderboardPlayers}
                    allTimeLeaderboardStats={allTimeLeaderboardStats}
                    monthlyLeaderboardStats={monthlyLeaderboardStats}
                    weeklyLeaderboardStats={weeklyLeaderboardStats}
                    gameSettingsPreset={gameSettingsPreset} setGameSettingsPreset={setGameSettingsPreset}
                    gamePreviewCategoryNames={gamePreviewCategoryNames} setGamePreviewCategoryNames={setGamePreviewCategoryNames} />, HostComponentState.Lobby] :
                [<></>, HostComponentState.None];
        }

        if (!context.triviaRound) {
            throw new Error(`HostLayout: missing trivia round`);
        }

        if ((context.sessionState === SessionState.ReadingCategoryNames) || (context.sessionState === SessionState.PromptClueSelection)) {
            return [<HostBoard triviaRound={context.triviaRound} />, HostComponentState.Board];
        }

        if (context.categoryIndex < 0 || context.clueIndex < 0) {
            throw new Error(`HostLayout: missing current clue`);
        }

        const triviaCategory = context.triviaRound.categories[context.categoryIndex];
        const triviaClue = triviaCategory.clues[context.clueIndex];

        if ((context.sessionState === SessionState.ReadingClueSelection) || (context.sessionState === SessionState.ReadingClue) || (context.sessionState === SessionState.ClueTossup)) {
            return [<HostClue triviaCategory={triviaCategory} triviaClue={triviaClue} />, HostComponentState.Clue];
        }

        if (context.sessionState === SessionState.ClueResponse) {
            return [<HostClue triviaCategory={triviaCategory} triviaClue={triviaClue} numSubmittedResponders={numSubmittedResponders} numResponders={numResponders} />, HostComponentState.Clue];
        }

        if (context.sessionState === SessionState.WagerResponse) {
            return [<HostWager triviaCategory={triviaCategory} triviaClue={triviaClue} numSubmittedResponders={numSubmittedResponders} numResponders={numResponders} />, HostComponentState.Wager];
        }

        if ((context.sessionState === SessionState.WaitingForClueDecision) || (context.sessionState === SessionState.ReadingClueDecision)) {
            return [<HostClue triviaCategory={triviaCategory} triviaClue={triviaClue} showCorrectAnswer={showCorrectAnswer} />, HostComponentState.Clue]
        }

        if (context.sessionState === SessionState.GameOver) {
            return [<HostGameOver />, HostComponentState.GameOver];
        }

        return [<></>, HostComponentState.None];
    }

    const [HostComponent, componentState] = getHostComponent();

    return (
        <Box onClick={handleUserInteraction} overflow={"hidden"}>
            <Box id={"mute-icon-box"}>
                {isMuted && (<GoMute size={"4em"} color={"white"} />)}
            </Box>

            <Timer />
            <ServerMessageAlert />
            <HostMenu />

            <Flex height={"100vh"} width={"100vw"} alignContent={"center"} justifyContent={"center"}>
                <Center zIndex={Layer.Bottom}>
                    <SwitchTransition>
                        <CSSTransition key={componentState as HostComponentState} nodeRef={sessionStateRef} timeout={{ appear: 1050, enter: 1050, exit: 1000 }} classNames={"session-state"}
                            appear mountOnEnter unmountOnExit>

                            <Box ref={sessionStateRef}>
                                {HostComponent}
                            </Box>
                        </CSSTransition>
                    </SwitchTransition>
                </Center>
            </Flex>
        </Box>
    );
}
