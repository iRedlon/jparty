
import HostBoard from "./HostBoard";
import HostClue from "./HostClue";
import HostGameOver from "./HostGameOver";
import HostLobby from "./HostLobby";
import HostMenu from "./HostMenu";
import HostWager from "./HostWager";
import Announcement from "../common/Announcement";
import { LayoutContext } from "../common/Layout";
import ServerMessageAlert from "../common/ServerMessage";
import Timer from "../common/Timer";
import { addMockSocketEventHandler, removeMockSocketEventHandler } from "../../misc/mock-socket";
import { socket } from "../../misc/socket";
import { playOpenAIVoice, playSoundEffect, playSpeechSynthesisVoice } from "../../misc/sound-fx";

import { Box, Center, Flex, Text } from "@chakra-ui/react";
import { HostServerSocket, SessionState, SoundEffect, VoiceType } from "jparty-shared";
import { useContext, useEffect, useRef, useState } from "react";
import { GoMute } from "react-icons/go";

export default function HostLayout() {
    const context = useContext(LayoutContext);
    const myRef = useRef(null);

    const [vantaEffect, setVantaEffect] = useState(null);
    const [isMuted, setIsMuted] = useState(true);
    const [numSubmittedResponders, setNumSubmittedResponders] = useState(0);
    const [numResponders, setNumResponders] = useState(0);
    const [displayCorrectAnswer, setDisplayCorrectAnswer] = useState(true);

    useEffect(() => {

        socket.on(HostServerSocket.PlayVoice, handlePlayVoice)
        socket.on(HostServerSocket.UpdateNumSubmittedResponders, handleUpdateNumSubmittedResponders);
        socket.on(HostServerSocket.RevealClueDecision, handleRevealClueDecision);

        addMockSocketEventHandler(HostServerSocket.PlayVoice, handlePlayVoice);
        addMockSocketEventHandler(HostServerSocket.UpdateNumSubmittedResponders, handleUpdateNumSubmittedResponders);
        addMockSocketEventHandler(HostServerSocket.RevealClueDecision, handleRevealClueDecision);

        return () => {
            socket.off(HostServerSocket.UpdateNumSubmittedResponders, handleUpdateNumSubmittedResponders);
            socket.off(HostServerSocket.RevealClueDecision, handleRevealClueDecision);

            removeMockSocketEventHandler(HostServerSocket.PlayVoice, handlePlayVoice);
            removeMockSocketEventHandler(HostServerSocket.UpdateNumSubmittedResponders, handleUpdateNumSubmittedResponders);
            removeMockSocketEventHandler(HostServerSocket.RevealClueDecision, handleRevealClueDecision);
        }
    }, []);

    useEffect(() => {
        // switch to game music once the game starts
        if (context.sessionState > SessionState.Lobby) {
            playSoundEffect(SoundEffect.GameMusic);
        }
    }, [context.sessionState]);

    const handlePlayVoice = (voiceType: VoiceType, voiceLine: string, audioBase64?: string) => {
        if (audioBase64) {
            playOpenAIVoice(audioBase64);
        }
        else {
            playSpeechSynthesisVoice(voiceType, voiceLine);
        }
    }

    const handleUpdateNumSubmittedResponders = (numSubmittedResponders: number, numResponders: number) => {
        setNumSubmittedResponders(numSubmittedResponders);
        setNumResponders(numResponders);
    }

    const handleRevealClueDecision = (displayCorrectAnswer: boolean) => {
        setDisplayCorrectAnswer(displayCorrectAnswer);
    }

    const toggleMute = (isMuted: boolean) => {
        setIsMuted(isMuted);

        if (!isMuted) {
            if (context.sessionState > SessionState.Lobby) {
                playSoundEffect(SoundEffect.GameMusic);
            }
            else {
                playSoundEffect(SoundEffect.LobbyMusic);
            }

            playSpeechSynthesisVoice(VoiceType.ClassicMasculine, "");

            // enableFullscreen();
        }
    }

    const enableFullscreen = () => {
        const element = document.documentElement;
        const request = element && element.requestFullscreen;

        if (request && typeof request !== "undefined") {
            request.call(element);
        }
    }

    const getHostComponent = () => {
        if (context.sessionState === SessionState.Lobby) {
            return <HostLobby />;
        }

        if (!context.triviaRound) {
            return <Text>Trivia round isn't populated in state: {SessionState[context.sessionState]}</Text>;
        }

        if (context.sessionState === SessionState.ClueSelection) {
            return <HostBoard />;
        }

        if (context.categoryIndex < 0 || context.clueIndex < 0) {
            return <Text>Trivia clue isn't populated in state: {SessionState[context.sessionState]}</Text>;
        }

        const triviaCategory = context.triviaRound.categories[context.categoryIndex];
        const triviaClue = triviaCategory.clues[context.clueIndex];

        if ((context.sessionState === SessionState.ReadingClue) || (context.sessionState === SessionState.ClueTossup)) {
            return <HostClue triviaCategory={triviaCategory} triviaClue={triviaClue} />;
        }

        if (context.sessionState === SessionState.ClueResponse) {
            return <HostClue triviaCategory={triviaCategory} triviaClue={triviaClue} numSubmittedResponders={numSubmittedResponders} numResponders={numResponders} />;
        }

        if (context.sessionState === SessionState.WagerResponse) {
            return <HostWager triviaCategory={triviaCategory} triviaClue={triviaClue} numSubmittedResponders={numSubmittedResponders} numResponders={numResponders} />;
        }

        if ((context.sessionState === SessionState.WaitingForClueDecision) || (context.sessionState === SessionState.ReadingClueDecision)) {
            return <HostClue triviaCategory={triviaCategory} triviaClue={triviaClue} displayCorrectAnswer={displayCorrectAnswer} />;
        }

        if (context.sessionState === SessionState.GameOver) {
            return <HostGameOver />;
        }
    }

    const hostComponent = getHostComponent();

    return (
        <Box onClick={() => toggleMute(false)}>
            <Box _hover={{ opacity: 1 }} position={"fixed"} cursor={"pointer"} top={"1em"} left={"1em"}>
                {isMuted && (<GoMute size={"4em"} color={"white"} className={"blink-slow"} />)}
            </Box>

            <Announcement />
            <Timer />
            <ServerMessageAlert />
            <HostMenu />
            <Flex height={"100vh"} width={"100vw"} alignContent={"center"} justifyContent={"center"}>
                <Center zIndex={9}>
                    {hostComponent}
                </Center>
            </Flex>
        </Box>
    );
}
