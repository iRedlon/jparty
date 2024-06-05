
import {
    HostServerSocket, PLACEHOLDER_TRIVIA_ROUND, Player, PlayerResponseType, PlayerState, ServerSocket,
    SessionAnnouncement, SessionState, SessionTimeout, SoundEffect, TriviaCategory, TriviaClue,
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
    let player1 = new Player("", "luffy");
    let player2 = new Player("", "zoro");
    let player3 = new Player("", "nami");
    let player4 = new Player("", "usopp");
    let player5 = new Player("", "sanji");
    let player6 = new Player("", "chopper");

    if (triviaCategory && triviaClue) {
        player1.clueDecisionInfo = new TriviaClueDecisionInfo(triviaCategory.id, triviaCategory.name, triviaClue, "romance dawn", TriviaClueDecision.Correct, 200, false);
        player1.responses[PlayerResponseType.Wager] = 1234;
        player1.minWager = 0;
        player1.maxWager = 10000;
        // player2.clueDecisionInfo = new TriviaClueDecisionInfo(triviaCategory.name, triviaClue, "romance dawn", TriviaClueDecision.Incorrect, 400, false);
        // player3.clueDecisionInfo = new TriviaClueDecisionInfo(triviaCategory.name, triviaClue, "arlong park", TriviaClueDecision.Incorrect, 10000, false);
        // player4.clueDecisionInfo = new TriviaClueDecisionInfo(triviaCategory.name, triviaClue, "syrup village", TriviaClueDecision.Incorrect, 23471, false);
        // player5.clueDecisionInfo = new TriviaClueDecisionInfo(triviaCategory.name, triviaClue, "baratie", TriviaClueDecision.Incorrect, 141, false);
        // player3.clueDecisionInfo = new TriviaClueDecisionInfo(triviaCategory.name, triviaClue, "mountain?", TriviaClueDecision.Incorrect, 25235, false);
    }

    player1.responses[PlayerResponseType.Clue] = "shearing a sheep in the place at the time at the word word"

    return { "socket1": player1, "socket2": player2, "socket3": player3, "socket4": player4, "socket5": player5, "socket6": player6 };
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

                mockSocket.dispatchEvent(new CustomEvent(ServerSocket.UpdateSessionName, {
                    detail: {
                        params: ["test"]
                    }
                }));

                mockSocket.dispatchEvent(new CustomEvent(ServerSocket.UpdateSessionPlayers, {
                    detail: {
                        params: [getPlaceholderSessionPlayers(triviaCategory, triviaClue)]
                    }
                }));

                mockSocket.dispatchEvent(new CustomEvent(ServerSocket.UpdateTriviaRound, {
                    detail: {
                        params: [triviaRound]
                    }
                }));

                mockSocket.dispatchEvent(new CustomEvent(ServerSocket.SelectClue, {
                    detail: {
                        params: [0, 0]
                    }
                }));

                mockSocket.dispatchEvent(new CustomEvent(ServerSocket.UpdateSpotlightResponderID, {
                    detail: {
                        params: ["socket1"]
                    }
                }));
            }
            break;
        case DebugCommand.UpdateSessionState:
            {
                mockSocket.dispatchEvent(new CustomEvent(ServerSocket.UpdateSessionState, {
                    detail: {
                        params: args
                    }
                }));
            }
            break;
        case DebugCommand.UpdatePlayerState:
            {
                let sessionPlayers = getPlaceholderSessionPlayers();
                sessionPlayers["socket1"].state = args[0] as PlayerState;

                mockSocket.dispatchEvent(new CustomEvent(ServerSocket.UpdateSessionPlayers, {
                    detail: {
                        params: [sessionPlayers]
                    }
                }));
            }
            break;
        case DebugCommand.SelectClue:
            {
                if (args[0] < 0 || args[1] < 0) {
                    return;
                }
                
                mockSocket.dispatchEvent(new CustomEvent(ServerSocket.SelectClue, {
                    detail: {
                        params: args
                    }
                }));

                const triviaRound = TriviaRound.clone(PLACEHOLDER_TRIVIA_ROUND);
                const triviaCategory = triviaRound.categories[args[0]];
                const triviaClue = triviaCategory.clues[args[1]];

                if (triviaClue.value === 200) {
                    handleDebugCommand(DebugCommand.UpdateSessionState, SessionState.ReadingClueDecision);
                }
                else {
                    handleDebugCommand(DebugCommand.UpdateSessionState, SessionState.ClueTossup);
                }

                mockSocket.dispatchEvent(new CustomEvent(HostServerSocket.PlayVoice, {
                    detail: {
                        params: [VoiceType.ClassicMasculine, triviaClue.question]
                    }
                }));
            }
            break;
        case DebugCommand.StartTimeout:
            {
                mockSocket.dispatchEvent(new CustomEvent(ServerSocket.StartTimeout, {
                    detail: {
                        params: [SessionTimeout.Announcement, 60000]
                    }
                }));
            }
            break;
        case DebugCommand.ShowAnnouncement:
            {
                mockSocket.dispatchEvent(new CustomEvent(ServerSocket.ShowAnnouncement, {
                    detail: {
                        params: [SessionAnnouncement.StartGame]
                    }
                }));

                mockSocket.dispatchEvent(new CustomEvent(ServerSocket.PlaySoundEffect, {
                    detail: {
                        params: [SoundEffect.BuzzWindowTimeout]
                    }
                }));
            }
            break;
        case DebugCommand.HideAnnouncement:
            {
                mockSocket.dispatchEvent(new CustomEvent(ServerSocket.HideAnnouncement, {
                    detail: {
                        params: [true]
                    }
                }));
            }
            break;
    }
}