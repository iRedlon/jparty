
import { Box, Center, Flex } from "@chakra-ui/react";
import { AudioType, HostServerSocket, SessionAnnouncement, SessionState, VoiceType } from "jparty-shared";
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
import { playAudio, playOpenAIVoice, playSpeechSynthesisVoice } from "../../misc/audio";
import { addMockSocketEventHandler, removeMockSocketEventHandler } from "../../misc/mock-socket";
import { socket } from "../../misc/socket";
import { Layer } from "../../misc/ui-constants";

import "../../style/components/HostLayout.css";

enum HostComponentState {
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
    const [isMuted, setIsMuted] = useState(true);
    const [announcement, setAnnouncement] = useState<SessionAnnouncement | undefined>();
    const [queuedToHideAnnouncement, setQueuedToHideAnnouncement] = useState(false);
    const [numSubmittedResponders, setNumSubmittedResponders] = useState(0);
    const [numResponders, setNumResponders] = useState(0);
    const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);

    useEffect(() => {
        socket.on(HostServerSocket.PlayAudio, handlePlayAudio);
        socket.on(HostServerSocket.PlayVoice, handlePlayVoice);
        socket.on(HostServerSocket.ShowAnnouncement, handleShowAnnouncement);
        socket.on(HostServerSocket.HideAnnouncement, handleHideAnnouncement);
        socket.on(HostServerSocket.UpdateNumSubmittedResponders, handleUpdateNumSubmittedResponders);
        socket.on(HostServerSocket.RevealClueDecision, handleRevealClueDecision);

        addMockSocketEventHandler(HostServerSocket.PlayAudio, handlePlayAudio);
        addMockSocketEventHandler(HostServerSocket.PlayVoice, handlePlayVoice);
        addMockSocketEventHandler(HostServerSocket.ShowAnnouncement, handleShowAnnouncement);
        addMockSocketEventHandler(HostServerSocket.HideAnnouncement, handleHideAnnouncement);
        addMockSocketEventHandler(HostServerSocket.UpdateNumSubmittedResponders, handleUpdateNumSubmittedResponders);
        addMockSocketEventHandler(HostServerSocket.RevealClueDecision, handleRevealClueDecision);

        return () => {
            socket.off(HostServerSocket.PlayAudio, handlePlayAudio);
            socket.off(HostServerSocket.PlayVoice, handlePlayVoice);
            socket.off(HostServerSocket.ShowAnnouncement, handleShowAnnouncement);
            socket.off(HostServerSocket.HideAnnouncement, handleHideAnnouncement);
            socket.off(HostServerSocket.UpdateNumSubmittedResponders, handleUpdateNumSubmittedResponders);
            socket.off(HostServerSocket.RevealClueDecision, handleRevealClueDecision);

            removeMockSocketEventHandler(HostServerSocket.PlayAudio, handlePlayAudio);
            removeMockSocketEventHandler(HostServerSocket.PlayVoice, handlePlayVoice);
            removeMockSocketEventHandler(HostServerSocket.ShowAnnouncement, handleShowAnnouncement);
            removeMockSocketEventHandler(HostServerSocket.HideAnnouncement, handleHideAnnouncement);
            removeMockSocketEventHandler(HostServerSocket.UpdateNumSubmittedResponders, handleUpdateNumSubmittedResponders);
            removeMockSocketEventHandler(HostServerSocket.RevealClueDecision, handleRevealClueDecision);
        }
    }, []);

    useEffect(() => {
        playAudio(AudioType.LobbyMusic);

        // switch to game music once the game starts
        // if (context.sessionState > SessionState.Lobby) {
        //     playAudio(AudioType.GameMusic);
        // }

        if (queuedToHideAnnouncement) {
            setAnnouncement(undefined);
        }
    }, [context.sessionState]);

    const handlePlayAudio = (audioType: AudioType) => {
        playAudio(audioType);
    }

    const handlePlayVoice = (voiceType: VoiceType, voiceLine: string, audioBase64?: string) => {
        if (audioBase64) {
            playOpenAIVoice(audioBase64);
        }
        else {
            playSpeechSynthesisVoice(voiceType, voiceLine);
        }
    }

    const handleShowAnnouncement = (announcement: SessionAnnouncement) => {
        setAnnouncement(announcement);
        setQueuedToHideAnnouncement(false);
    }

    const handleHideAnnouncement = (forceHide: boolean) => {
        if (forceHide) {
            setAnnouncement(undefined);
        }
        else {
            setQueuedToHideAnnouncement(true);
        }
    }

    const handleUpdateNumSubmittedResponders = (numSubmittedResponders: number, numResponders: number) => {
        setNumSubmittedResponders(numSubmittedResponders);
        setNumResponders(numResponders);
    }

    const handleRevealClueDecision = (showCorrectAnswer: boolean) => {
        setShowCorrectAnswer(showCorrectAnswer);
    }

    const toggleMute = (isMuted: boolean) => {
        setIsMuted(isMuted);

        if (!isMuted) {
            playAudio(AudioType.LobbyMusic);
            // if (context.sessionState > SessionState.Lobby) {
            //     playAudio(AudioType.GameMusic);
            // }
            // else {
            //     playAudio(AudioType.LobbyMusic);
            // }
        }
    }

    // returns both the JSX component and a state representing the specific component that was returned
    const getHostComponent = () => {
        if (announcement !== undefined) {
            return [<Announcement announcement={announcement} />, SessionAnnouncement[announcement]];
        }

        if (context.sessionState === SessionState.Lobby) {
            return [<HostLobby />, HostComponentState.Lobby];
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

        return [<HostLobby />, HostComponentState.Lobby];
    }

    const [HostComponent, componentState] = getHostComponent();

    return (
        <Box onClick={() => toggleMute(false)} overflow={"hidden"}>
            <Box id={"mute-icon-box"}>
                {isMuted && (<GoMute size={"4em"} color={"white"} />)}
            </Box>

            <Timer />
            <ServerMessageAlert />
            <HostMenu />

            <Flex height={"100vh"} width={"100vw"} alignContent={"center"} justifyContent={"center"}>
                <Center zIndex={Layer.Bottom}>
                    <SwitchTransition>
                        <CSSTransition key={componentState as HostComponentState} nodeRef={sessionStateRef} timeout={1000} classNames={"session-state"}
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
