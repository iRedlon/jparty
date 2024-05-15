
import { AttemptReconnectResult } from "./session-constants";
import { TriviaCategory } from "./trivia-game";

// events whose names are specifically reserved by socket.io or HTML
export enum ReservedSocket {
    Connect = "connect",
    Connection = "connection",
    Disconnect = "disconnect",
    BeforeUnload = "beforeunload",
    VisibilityChange = "visibilitychange"
}

// each following enum is a list of possible socket messages, labelled by their sender
// the "callback" types define the callback signature for each socket message that uses one

// messages that can be received by any client (host or player)
export enum ServerSocket {
    EnableDebugMode = "server_enable_debug_mode",
    BeginSpectate = "server_update_begin_spectate",
    Message = "server_message",
    CancelGame = "server_cancel_game",
    PlaySoundEffect = "server_play_sound_effect",
    UpdateSessionName = "server_update_session_name",
    UpdateSessionState = "server_update_session_state",
    UpdateSessionPlayers = "server_update_session_players",
    UpdateTriviaRound = "server_update_trivia_round",
    SelectClue = "host_server_select_clue",
    UpdateSpotlightResponderID = "host_server_update_spotlight_responder_id",
    StartTimeout = "host_server_start_timeout",
    StopTimeout = "host_server_stop_timeout",
    ShowAnnouncement = "host_server_show_announcement",
    HideAnnouncement = "host_server_hide_announcement"
}

export class ServerSocketMessage {
    message: string;
    isError: boolean;

    constructor (message: string, isError?: boolean) {
        this.message = message;
        this.isError = isError || false;
    }
}

export enum SessionAnnouncement {
    StartGame,
    SelectClue,
    ClueBonusWager,
    ClueBonusAllWager,
    ClueBonusAllPlay,
    StartRound,
    StartFinalRound,
    FinalClue,
    GameOver
}

export enum FeedbackType {
    Bug,
    TriviaData,
    Suggestion
}

export interface Feedback {
    type: FeedbackType,
    message: string,
    category?: TriviaCategory
}

export enum ClientSocket {
    AttemptReconnect = "client_attempt_reconnect",
    SubmitFeedback = "client_submit_feedback"
}

export type ClientSocketCallback = {
    [ClientSocket.AttemptReconnect]: (result: AttemptReconnectResult) => any;
}

export enum HostSocket {
    Connect = "host_connect",
    UpdateGameSettingsPreset = "host_update_game_settings_preset",
    AttemptSpectate = "host_attempt_spectate",
    LeaveSession = "host_leave_session",
    GenerateCustomGame = "host_generate_custom_game",
    PlayAgain = "host_play_again"
}

export type HostSocketCallback = {
    [HostSocket.GenerateCustomGame]: (success: boolean) => any;
}

export enum HostServerSocket {
    UpdateGameSettingsPreset = "host_server_update_game_settings_preset",
    UpdateNumSubmittedResponders = "host_server_update_num_submitted_responders",
    RevealClueDecision = "host_server_reveal_clue_decision"
}

export enum PlayerSocket {
    Connect = "player_connect",
    LeaveSession = "player_leave_session",
    StartGame = "player_start_game",
    SelectClue = "player_select_clue",
    Buzz = "player_buzz",
    UpdateResponse = "player_update_response",
    SubmitResponse = "player_submit_response",
    VoteToReverseDecision = "player_vote_to_reverse_decision"
}

export type PlayerSocketCallback = {
    [PlayerSocket.Connect]: (resetSessionName: boolean, resetPlayerName: boolean) => any;
    [PlayerSocket.StartGame]: (success: boolean) => any;
}