
# Overview
A high level description of this codebase. Linked files/folders lead to relevant code locations for each concept

## _File Structure_
- The node project at the root of the jparty directory is the "server project" (jparty-server); written in typescript express
- The client directory contains the "client project" (jparty-client); written in typescript react
- The shared directory contains the "shared project" (jparty-shared); written in node typescript; contains enums/classes/types/etc. that are shared by both the server and client projects. Both projects utilize the shared project in the form of a local npm dependency

## _Environment Variables_
Environment variables are set by a .env file at the roots of the server and client projects. Copy from [server example](../.env.example) or [client example](../client/.env.example) and fill out variables as needed. Setting these variables isn't a requirement; if none are set: trivia games use test data and other APIs like clue decisions and host voice are disabled

## _[Sessions](../server/session/session.ts)_
- A "session" is an object that stores all of the relevant data for a particular game session. This includes client info for hosts and players, its current trivia game, and most importantly: its state
- Session state is ultimately how the client knows what to display. The behavior of most server code can be boiled down to: respond to a client event by updating session state, then send the results of that state changes back to the client
- All of the sessions that are active on the server are stored within an object called "sessions" mapping the session name to the corresponding session object

## _Clients_
- A "client" refers to any device running the client app whether as a host or player
- A client will generally be memorized and interacted with from the server using its socket ID
- In addition to its socket ID (which changes on disconnect), it also has a client ID which will always stay the same throughout a client's session
- On the client, hosts only need to consume session state in order to know which component to display
- Players, on the other hand, have a player state in addition to session state. This combination defines which component to display

## _React Context_
- Clients don't store the entire session object as state, but they do all store quite a bit of session data as state
- The highest level component in the react app is [Layout](../client/src/components/common/Layout.tsx) which is responsible for listening to all socket events from the server, and updating its state accordingly. This state is passed down to all components (for both hosts and players) in the form of LayoutContext
- [Host](../client/src/components/host/HostLayout.tsx) and [player](../client/src/components/player/PlayerLayout.tsx) each has their own layout where they store their own custom state that the other doesn't need to be knowledgable of

## _Client Animations_
- Client animations are mostly built with an external tool. That is CSSTransitions of React Transition Group
- We use this tool to trigger specific CSS animations when certain client state changes. The best example of this are the SwitchTransitions set up for HostLayout and PlayerLayout. These are keyed on session state, and thus performs a specific animation as we leave one state, and a specific animation as we enter another state
- For more on the React code side, reference the [React Transition Group documentation](https://reactcommunity.org/react-transition-group). In jparty-client, these animations are specified in .css files. They'll always be named for the .tsx file they accompany. An example are [these animations](../client/src/style/components/HostLobby.css) for host lobby boxes which are defined to slide in when entering the lobby state, and slide out when leaving the lobby state

## _Socket Networking_
- All server <-> client networking flows through socket.io. As a style rule: all socket events must be stored as an enum value, where the enum is labelled by its sender
- Within a session, hosts and players are associated with their socket ID, which is ultimately how we send messages to specific clients. IMPORTANT: socket IDs are transient, they're likely to change often and unpredictably. This codebase is actively concerned with handling that possibility
- Clients store a unique "client ID" so they can be remembered if they attempt to reconnect after disconnecting. This will always stay the same for a particular client, even as their socket ID changes
- Client events are handled seperately depending on if they were emitted by a [host](../server/session/handle-host-event.ts) or [player](../server/session/handle-player-event.ts). As a style rule: event handlers are responsible for communicating back with clients, while the session object is only responsible for reading and writing its own state
- Any event handlers or session utilities that are shared between host and player clients are stored in [session-utils](../server/session/session-utils.ts)

## _Scheduled Action Windows_
- Time-sensitive player actions (buzzing, responding) are governed by "action windows" scheduled in real-world clock time, rather than timers that start whenever each client happens to hear about them
- Clients estimate their clock offset from the server, and each window opens slightly in the future so every player's screen unlocks at the same real-world instant regardless of latency
- Each window is provisionally scheduled at a worst-case open time. Every potential responder confirms receipt of the window schedule, and once all of them have, the server pulls the open time forward and re-broadcasts. This way even a badly desynced player gets their full window, but a frozen client can only delay everyone up to the cap
- The client timer UI stays hidden until the window's open instant, so the countdown appears simultaneously on every screen already showing the full duration

## _[Logging](../server/misc/log.ts)_
- All server logging flows through a single custom function: "debugLog". This is so that each log can be labelled by the system its a part of (i.e. connection, clue decision, game generation) and can be chosen to be logged or not depending on the current log level (which is ultimately set by an environment variable: LOG_LEVEL)

## _[Telemetry](../server/misc/telemetry.ts)_
- Custom game events are sent server-side to a separate Google Analytics property using the Measurement Protocol
- Each session is reported as a distinct GA "user", so "active users" really means "active sessions"
- Telemetry is disabled entirely when the GA environment variables are unset. Note that new event params must also be registered as custom dimensions in GA before they'll show up in reports

## _[Trivia Database](../server/api-requests/generate-trivia-game.ts)_
- jparty has its own database for trivia clues. It's organized as follows: category type -> categories -> clue difficulty -> clues
- For example: within the "Science" category type, we have an array of categories including one called "Solar System". Within "Solar System" we have an array of clues including one of difficulty=1 (easiest) which is "The Earth orbits around this star"

## _Buzz Tossup_
- A new feature in jparty is a catchup mechanic intended to handle "buzz tossups" in a more even way
- A "buzz tossup" is a situation where multiple people buzz in for a clue at around the same moment. In a real trivia competition, it's just a matter of speed but there's no guarantee in network speed between different player devices. Thus it's unfair give the buzz to the first player that the server hears from
- The solution is to add a small delay (less than a second) when an initial player buzzes in, creating a window where other players may still buzz in. Once this window closes, the buzz is granted to a player based on a weighted random selection
- This weight representing win likelihood is the crux of the catchup mechanic. All players start with an equal weight of 1. Winning a buzz tossup halves a player's weight, while lossing a buzz tossup doubles their weight. Thus everyone should win around the same number of buzz tossups
- This delay is somewhat annoying in that it's not as responsive as other user inputs in the game. I think it's a neccessary evil though, so to lessen the blow: the delay timer for each clue is divided by its clue dificulty. That is to say that a very easy clue will use the full 750ms, while a very difficult one will only have a 150ms delay
- This is because easier clues are more likely to result in a buzz tossup where multiple players know the answer

## _[Clue Decisions](../server/api-requests/clue-decision.ts)_
- It's ChatGPT. In other words, it's an OpenAI model whose job is to evaluate player clue responses
- Its reply must be: "correct", "incorrect", or "needs more detail"
- A response that exactly matches the correct answer is ruled correct without an API request. If the request fails or times out, the response is ruled incorrect rather than interrupting the game; reversal votes are the safety net for any bad ruling
- Test #1: `trivia question: "This man was the second president of the U.S.". correct answer: "John Adams". response: "John"` should be `needs more detail`
- Test #2: `trivia question: "This is the color of the middle stripe of the U.S. flag". correct answer: "red". response: "red or white"` should be `needs more detail`
- Test #3: `trivia question: "She is the protagonist of Pride & Prejudice". correct answer: "elizabeth bennet". response: "the progatonist of pride & prejudice"` should be `incorrect`
- Test #4: `trivia question: "This is the longest running Netflix original series". correct answer: "orange is the new black". response: "OITNB"` should be `correct`
- Test #5: `trivia question: "This is the capital of Finland". correct answer: "helsinki". response: "hellsinky"` should be `correct`

## _Debug Mode_
- An offline client (not connected to a web socket) will always start up in debug mode. In order to run both the server and client in debug mode, the DEBUG_MODE environment variable must be set on the server (it will be set when using the "npm run debug" script on server)
- Debug mode enables a few tools and shortcuts for ease of testing, including these on client:
  - Debug panel in settings menu allowing you to use debug commands
  - Click clues on HostBoard to select them
  - Click the category name on HostClue to return to board
- And these on server:
  - Enables debug logging which includes some extra info like the position of clue bonuses, outgoing API requests, etc.
  - Forced clue decisions by responding with the desired response. A response may be "correct", "incorrect", or "detail"
  - Serves the QA dashboard at /qa: a tool that runs a host screen and any number of auto-joined players together in a single tab (see [client/qa-dashboard.html](../client/qa-dashboard.html) and [qa-dashboard](../client/src/misc/qa-dashboard.ts)). It comes with a few useful cheats e.g. add/subtract money, skip to a certain round

## _[Host Voice](../client/src/misc/audio.ts)_
- Voice lines are spoken aloud by the host computer throughout the game. Most importantly, this voice reads out the clues but also filler lines like "correct" or "that's a bonus, you get to wager, etc."
- There are two TTS systems in use in jparty: the first is API-requested OpenAI TTS with a very realistic sounding voice. This service costs money per request and is enabled/disabled with an environment variable
- OpenAI TTS audio is streamed to the host through the server (see [tts.ts](../server/api-requests/tts.ts)), so playback can begin before the whole file is generated
- The second is the built-in browser screen reader. This TTS is actually pretty good in terms of pronunciation, but is still very robotic. We support it because it's free and not API requested so if the API needs to be disabled or is otherwise not working for any reason: we can easily fall back on the screen reader
- Many timers in the game rely on the TTS system (i.e. when reading out the clue, we need to trigger the next state change once it's done being read aloud) but for various reasons, it's difficult to tell exactly how long a voice line will take to say out loud
- To solve this, we start the timer with an educated estimate that's intentionally generous. Then, once we have more info about exactly how long it will take to be spoken, we update the timer by cancelling it and restarting it with our new duration. These timers are always hidden from players so the mid-timer duration update isn't noticeable