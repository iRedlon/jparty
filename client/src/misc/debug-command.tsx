
import {
    AudioType,
    getRandomNum, HostServerSocket, LeaderboardType, PLACEHOLDER_LEADERBOARD_PLAYERS, PLACEHOLDER_TRIVIA_ROUND, Player, PlayerResponseType, PlayerState, ServerSocket,
    SessionAnnouncement, SessionState, SessionTimeout, TriviaCategory, TriviaClue,
    TriviaClueDecision, TriviaClueDecisionInfo, TriviaRound, VoiceType
} from "jparty-shared";

import { emitMockSocketEvent } from "./mock-socket";

export enum DebugCommand {
    PopulatePlaceholderData,
    UpdateSessionState,
    UpdatePlayerState,
    SelectClue,
    StartTimeout,
    ShowAnnouncement,
    HideAnnouncement,
    UpdateReadingCategoryIndex
}

function getPlaceholderSessionPlayers(triviaCategory?: TriviaCategory, triviaClue?: TriviaClue) {
    let player1 = new Player("1", "luffy");
    let player2 = new Player("2", "zoro");
    let player3 = new Player("3", "nami");
    let player4 = new Player("4", "usopp");
    let player5 = new Player("5", "sanji");
    let player6 = new Player("6", "chopper");

    player1.signatureImageBase64 = "data:image/png;base64,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";

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

    player1.responses[PlayerResponseType.Clue] = "jjjjjjjjjjjjj";

    // return { "socket1": player1, "sockt2": player2, "socket3": player3, "socket4": player4, "socket5": player5, "socket6": player6 };
    return { "socket1": player1, "socket2": player2, "socket3": player3, };
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

                emitMockSocketEvent(HostServerSocket.UpdateLeaderboardPlayers, LeaderboardType.AllTime, PLACEHOLDER_LEADERBOARD_PLAYERS);
                emitMockSocketEvent(HostServerSocket.UpdateLeaderboardPlayers, LeaderboardType.Monthly, PLACEHOLDER_LEADERBOARD_PLAYERS);
                emitMockSocketEvent(HostServerSocket.UpdateLeaderboardPlayers, LeaderboardType.Weekly, PLACEHOLDER_LEADERBOARD_PLAYERS);
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
                emitMockSocketEvent(HostServerSocket.ShowAnnouncement, SessionAnnouncement.StartFinalRound);
                setTimeout(() => {
                    handleDebugCommand(DebugCommand.HideAnnouncement);
                    
                    setTimeout(() => {
                        emitMockSocketEvent(HostServerSocket.ShowAnnouncement, SessionAnnouncement.ClueBonusAllWager);
                    }, 200);
                }, 4000);
            }
            break;
        case DebugCommand.HideAnnouncement:
            {
                emitMockSocketEvent(HostServerSocket.HideAnnouncement, true);
                emitMockSocketEvent(HostServerSocket.PlayAudio, AudioType.LongApplause)
            }
            break;
        case DebugCommand.UpdateReadingCategoryIndex:
            {
                emitMockSocketEvent(HostServerSocket.UpdateReadingCategoryIndex, args[0] || 0);
            }
    }
}