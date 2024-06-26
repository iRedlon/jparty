
import {
    AttemptReconnectResult, ClientSocket, cloneSessionPlayers, HostSocket,
    ReservedEvent, ServerSocket, SessionPlayers, SessionState, SocketID, TriviaRound
} from "jparty-shared";
import { createContext, useEffect, useState } from "react";
import { isMobile } from "react-device-detect";

import HostLayout from "../host/HostLayout";
import PlayerLayout from "../player/PlayerLayout";
import { getClientID } from "../../misc/client-utils";
import { addMockSocketEventHandler, removeMockSocketEventHandler } from "../../misc/mock-socket";
import { socket } from "../../misc/socket";
import { LocalStorageKey } from "../../misc/ui-constants";

// shared state accessible by any client
interface LayoutContextData {
    debugMode: boolean,
    isSpectator: boolean,
    isPlayer: boolean,
    setIsPlayer: Function,
    sessionName: string,
    sessionState: SessionState,
    sessionPlayers: SessionPlayers,
    triviaRound: TriviaRound | undefined,
    categoryIndex: number,
    clueIndex: number,
    spotlightResponderID: SocketID
};

export const LayoutContext = createContext<LayoutContextData>({} as any);

export default function Layout() {
    const [debugMode, setDebugMode] = useState(process.env.NODE_ENV === "development");
    const [isSpectator, setIsSpectator] = useState(false);
    const [isPlayer, setIsPlayer] = useState(isMobile || localStorage[LocalStorageKey.IsPlayer]);
    const [sessionName, setSessionName] = useState("");
    const [sessionState, setSessionState] = useState(SessionState.Lobby);
    const [sessionPlayers, setSessionPlayers] = useState<SessionPlayers>({});
    const [triviaRound, setTriviaRound] = useState<TriviaRound>();
    const [categoryIndex, setCategoryIndex] = useState(-1);
    const [clueIndex, setClueIndex] = useState(-1);
    const [spotlightResponderID, setSpotlightResponderID] = useState<SocketID>("");

    useEffect(() => {
        window.addEventListener(ReservedEvent.VisibilityChange, handleVisibilityChange);

        socket.on(ReservedEvent.Connect, handleConnect);
        socket.on(ServerSocket.EnableDebugMode, handleEnableDebugMode);
        socket.on(ServerSocket.BeginSpectate, handleBeginSpectate);
        socket.on(ServerSocket.CancelGame, handleCancelGame);
        socket.on(ServerSocket.UpdateSessionName, handleUpdateSessionName);
        socket.on(ServerSocket.UpdateSessionState, handleUpdateSessionState);
        socket.on(ServerSocket.UpdateSessionPlayers, handleUpdateSessionPlayers);
        socket.on(ServerSocket.UpdateTriviaRound, handleUpdateTriviaRound);
        socket.on(ServerSocket.SelectClue, handleSelectClue);
        socket.on(ServerSocket.UpdateSpotlightResponderID, handleUpdateSpotlightResponderID);

        addMockSocketEventHandler(ServerSocket.UpdateSessionName, handleUpdateSessionName);
        addMockSocketEventHandler(ServerSocket.UpdateSessionState, handleUpdateSessionState);
        addMockSocketEventHandler(ServerSocket.UpdateSessionPlayers, handleUpdateSessionPlayers);
        addMockSocketEventHandler(ServerSocket.UpdateTriviaRound, handleUpdateTriviaRound);
        addMockSocketEventHandler(ServerSocket.SelectClue, handleSelectClue);
        addMockSocketEventHandler(ServerSocket.UpdateSpotlightResponderID, handleUpdateSpotlightResponderID);

        return () => {
            window.removeEventListener(ReservedEvent.VisibilityChange, handleVisibilityChange);

            socket.off(ReservedEvent.Connect, handleConnect);
            socket.off(ServerSocket.EnableDebugMode, handleEnableDebugMode);
            socket.off(ServerSocket.BeginSpectate, handleBeginSpectate);
            socket.off(ServerSocket.CancelGame, handleCancelGame);
            socket.off(ServerSocket.UpdateSessionName, handleUpdateSessionName);
            socket.off(ServerSocket.UpdateSessionState, handleUpdateSessionState);
            socket.off(ServerSocket.UpdateSessionPlayers, handleUpdateSessionPlayers);
            socket.off(ServerSocket.UpdateTriviaRound, handleUpdateTriviaRound);
            socket.off(ServerSocket.SelectClue, handleSelectClue);
            socket.off(ServerSocket.UpdateSpotlightResponderID, handleUpdateSpotlightResponderID);

            removeMockSocketEventHandler(ServerSocket.UpdateSessionName, handleUpdateSessionName);
            removeMockSocketEventHandler(ServerSocket.UpdateSessionState, handleUpdateSessionState);
            removeMockSocketEventHandler(ServerSocket.UpdateSessionPlayers, handleUpdateSessionPlayers);
            removeMockSocketEventHandler(ServerSocket.UpdateTriviaRound, handleUpdateTriviaRound);
            removeMockSocketEventHandler(ServerSocket.SelectClue, handleSelectClue);
            removeMockSocketEventHandler(ServerSocket.UpdateSpotlightResponderID, handleUpdateSpotlightResponderID);
        }
    }, []);

    // clients disconnect all the time. it happens *UNRELIABLY* when changing tabs, apps, turning your phone on and off, etc.
    // our approach to client reconnection is simply this: it doesn't hurt to get updated state from the server, so request such updates often; just in case we need them
    // "often" meaning: anytime we hear a state update from the server, or anytime the user's tab visibility has changed for any reason

    useEffect(() => {
        handleConnect();
    }, [sessionState]);

    const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
            handleConnect();
        }
    }

    const handleConnect = () => {
        if (isPlayer) {
            localStorage.setItem(LocalStorageKey.IsPlayer, "true");
        }

        if (localStorage[LocalStorageKey.SessionName]) {
            socket.emit(ClientSocket.AttemptReconnect, localStorage[LocalStorageKey.SessionName], getClientID(), (result: AttemptReconnectResult) => {
                switch (result) {
                    case AttemptReconnectResult.StaleSession:
                    case AttemptReconnectResult.InvalidClientID:
                        {
                            localStorage.removeItem(LocalStorageKey.SessionName);
                            location.reload();
                        }
                }
            });
        }
        else if (!isPlayer) {
            socket.emit(HostSocket.Connect, getClientID());
        }
    }

    const handleEnableDebugMode = () => {
        setDebugMode(true);
    }

    const handleBeginSpectate = () => {
        setIsSpectator(true);
    }

    const handleCancelGame = (serverCrashed?: boolean) => {
        if (serverCrashed && (sessionState > SessionState.Lobby)) {
            alert("We apologize: the jparty server just crashed. Your game cannot continue. This incident has been reported.");
        }

        location.reload();
    }

    const handleUpdateSessionName = (sessionName: string) => {
        setSessionName(sessionName);
        localStorage.setItem(LocalStorageKey.SessionName, sessionName);
    }

    const handleUpdateSessionState = (sessionState: SessionState) => {
        setSessionState(sessionState);
    }

    const handleUpdateSessionPlayers = (sessionPlayers: SessionPlayers) => {
        if (socket.id && sessionPlayers[socket.id]) {
            setIsPlayer(true);
        }

        setSessionPlayers(cloneSessionPlayers(sessionPlayers));
    }

    const handleUpdateTriviaRound = (triviaRound: TriviaRound) => {
        if (triviaRound) {
            setTriviaRound(TriviaRound.clone(triviaRound));
        }
        else {
            setTriviaRound(undefined);
        }
    }

    const handleSelectClue = (categoryIndex: number, clueIndex: number) => {
        setCategoryIndex(categoryIndex);
        setClueIndex(clueIndex);
    }

    const handleUpdateSpotlightResponderID = (responderID: SocketID) => {
        setSpotlightResponderID(responderID);
    }

    let context: LayoutContextData = {
        debugMode: debugMode,
        isSpectator: isSpectator,
        isPlayer: isPlayer,
        setIsPlayer: setIsPlayer,
        sessionName: sessionName,
        sessionState: sessionState,
        sessionPlayers: sessionPlayers,
        triviaRound: triviaRound,
        categoryIndex: categoryIndex,
        clueIndex: clueIndex,
        spotlightResponderID: spotlightResponderID
    };

    return (
        <LayoutContext.Provider value={context}>
            {isPlayer ? <PlayerLayout /> : <HostLayout />}
        </LayoutContext.Provider>
    );
}