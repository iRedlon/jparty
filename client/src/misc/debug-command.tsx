
import { emitMockSocketEvent } from "./mock-socket";

import {
    getRandomNum, HostServerSocket, PLACEHOLDER_TRIVIA_ROUND, Player, PlayerResponseType, PlayerState, ServerSocket,
    SessionAnnouncement, SessionState, SessionTimeout, TriviaCategory, TriviaClue,
    TriviaClueDecision, TriviaClueDecisionInfo, TriviaRound, VoiceType
} from "jparty-shared";

export enum DebugCommand {
    PopulatePlaceholderData,
    UpdateSessionState,
    UpdatePlayerState,
    SelectClue,
    StartTimeout,
    ShowAnnouncement,
    HideAnnouncement
}

function getPlaceholderSessionPlayers(triviaCategory?: TriviaCategory, triviaClue?: TriviaClue) {
    let player1 = new Player("1", "luffy");
    let player2 = new Player("2", "zoro");
    let player3 = new Player("3", "nami");
    let player4 = new Player("4", "usopp");
    let player5 = new Player("5", "sanji");
    let player6 = new Player("6", "chopper");

    player1.score = getRandomNum(1000);
    player2.score = getRandomNum(1000);
    player3.score = getRandomNum(1000);
    player4.score = getRandomNum(1000);
    player5.score = getRandomNum(1000);
    player6.score = getRandomNum(1000);

    if (triviaCategory && triviaClue) {
        player1.clueDecisionInfo = new TriviaClueDecisionInfo(triviaCategory.id, triviaCategory.name, triviaClue, "romance dawn", TriviaClueDecision.Correct, 14132, false);
        player1.responses[PlayerResponseType.Wager] = 1234;
        player1.minWager = 0;
        player1.maxWager = 10000;
    }

    player1.responses[PlayerResponseType.Clue] = "shearing a sheep in the place at the time at the word word";

    return { "socket1": player1, "sockt2": player2, "socket3": player3, "socket4": player4, "socket5": player5, "socket6": player6 };
    // return { "socket1": player1, "socket2": player2, "socket3": player3, };
}

export function handleDebugCommand(command: DebugCommand, ...args: any[]) {
    if (!process.env.REACT_APP_OFFLINE) {
        return;
    }

    const mockSocket = document.getElementById("mock-socket");
    if (!mockSocket) {
        return;
    }

    switch (command) {
        case DebugCommand.PopulatePlaceholderData:
            {
                const triviaRound = TriviaRound.clone(PLACEHOLDER_TRIVIA_ROUND);
                const triviaCategory = triviaRound.categories[0];
                const triviaClue = triviaCategory.clues[0];

                emitMockSocketEvent(ServerSocket.UpdateSessionName, "test");
                emitMockSocketEvent(ServerSocket.UpdateSessionPlayers, getPlaceholderSessionPlayers(triviaCategory, triviaClue));
                emitMockSocketEvent(ServerSocket.UpdateTriviaRound, triviaRound);
                emitMockSocketEvent(ServerSocket.SelectClue, 0, 0);
                emitMockSocketEvent(ServerSocket.UpdateSpotlightResponderID, "socket1");
            }
            break;
        case DebugCommand.UpdateSessionState:
            {
                emitMockSocketEvent(ServerSocket.UpdateSessionState, ...args);
            }
            break;
        case DebugCommand.UpdatePlayerState:
            {
                let sessionPlayers = getPlaceholderSessionPlayers();
                sessionPlayers["socket1"].state = args[0] as PlayerState;

                emitMockSocketEvent(ServerSocket.UpdateSessionPlayers, sessionPlayers);
            }
            break;
        case DebugCommand.SelectClue:
            {
                if (args[0] < 0 || args[1] < 0) {
                    return;
                }
                
                emitMockSocketEvent(ServerSocket.SelectClue, ...args);

                const triviaRound = TriviaRound.clone(PLACEHOLDER_TRIVIA_ROUND);
                const triviaCategory = triviaRound.categories[args[0]];
                const triviaClue = triviaCategory.clues[args[1]];

                if (triviaClue.value === 200) {
                    handleDebugCommand(DebugCommand.UpdateSessionState, SessionState.ReadingClueDecision);
                }
                else {
                    handleDebugCommand(DebugCommand.UpdateSessionState, SessionState.ClueTossup);
                }

                emitMockSocketEvent(HostServerSocket.PlayVoice, VoiceType.ClassicMasculine, triviaClue.question);
            }
            break;
        case DebugCommand.StartTimeout:
            {
                emitMockSocketEvent(ServerSocket.StartTimeout, SessionTimeout.Announcement, 60000);
            }
            break;
        case DebugCommand.ShowAnnouncement:
            {
                mockSocket.dispatchEvent(new CustomEvent(ServerSocket.ShowAnnouncement, {
                    detail: {
                        params: [SessionAnnouncement.StartGame]
                    }
                }));

                emitMockSocketEvent(ServerSocket.ShowAnnouncement, SessionAnnouncement.StartGame);
            }
            break;
        case DebugCommand.HideAnnouncement:
            {
                emitMockSocketEvent(ServerSocket.HideAnnouncement, true);
            }
            break;
    }
}