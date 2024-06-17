
# Overview
### _A high level description of this codebase_
Linked files/folders lead to relevant code locations for each concept

## File Structure
- The node project at the root of the jparty directory is the "server project" (jparty-server); written in typescript express
- The client directory contains the "client project" (jparty-client); written in typescript react
- The shared directory contains the "shared project" (jparty-shared); written in plain typescript; contains enums/classes/types/etc. that are shared by both the server and client projects. Both projects utilize the shared project in the form of a local npm dependency

## Environment Variables
jparty server and client both rely on environment variables, most notably the credentials for connecting to 3rd-party services.
Locally, these environment variables are set with a .env file in the base directory of jparty/server and jparty/client which are loaded with dotenv.
In production, they're set manually within the server environment provided by our hosting service.

### Server Environment (store at .env in root directory)
#### server settings
- PORT
- LOG_LEVEL: a value defined in logging-utils, the log level determines which systems' debug messages will be logged
- DEBUG_MODE (optional): enables debug logging on server and the debug menu on client
- USE_OPENAI_TTS (optional): enables OpenAI API requests for TTS voice lines. Browser screen reader will otherwise be used as a fallback

#### api credentials
- MONGO_CONNECTION_STRING
- OPENAI_SECRET_KEY
- OPENAI_ASSISTANT_ID

#### email credentials
- FEEDBACK_EMAIL
- FEEDBACK_EMAIL_PASSWORD
- ETHEREAL_EMAIL
- ETHEREAL_EMAIL_PASSWORD

### Client Environment (store at client/.env)
- PORT
- SERVER_PORT
- REACT_APP_OFFLINE (optional): indicates whether this app should attempt to connect to a websocket or not. only ever enabled when testing with a disconnected client

### 3rd-Party Services
- Ethereal Email (Dev Email)
- MongoDB (Persistent Storage)
- OpenAI (NLP for Decision-Making to Clue Responses)
- Namecheap (Domain Name, SSL, Prod Email)
- Heroku (Web Hosting)

## [Sessions](../server/session/session.ts)
- A "session" is an object that stores all of the relevant data for a particular game session. This includes client info for hosts and players, its current trivia game, and most importantly: its state
- Session state is ultimately how the client knows what to display. The behavior of most server code can be boiled down to: respond to a client event by updating session state, then send the results of that state changes back to the client
- All of the sessions that are active on the server are stored within an object called "sessions"

## Clients
- A "client" refers to any device running the client app whether as a host or player
- A client will generally be memorized and interacted with from the server using its socket ID
- In addition to its socket ID (which changes on disconnect), it also has a client ID which will always stay the same throughout a client's session
- On the client, hosts only need to consume session state in order to know which component to display
- Players, on the other hand, have a player state in addition to session state. This combination defines which component to display

## React Context
- Clients don't store the entire session object as state, but they do all store quite a bit of session data as state
- The highest level component in the react app is [Layout](../client/src/components/common/Layout.tsx) which is responsible for listening to all socket events from the server, and updating its state accordingly. This state is passed down to all components (for both hosts and players) in the form of LayoutContext
- [Host](../client/src/components/host/HostLayout.tsx) and [player](../client/src/components/player/PlayerLayout.tsx) each has their own layout where they store their own custom state that the other doesn't need to be knowledgable of

## Socket Networking
- All server <-> client networking flows through socket.io. As a style rule: all socket events must be stored as an enum value, where the enum is labelled by its sender
- Within a session, hosts and players are associated with their socket ID, which is ultimately how we send messages to specific clients. IMPORTANT: socket IDs are transient, they're likely to change often and unpredictably. This codebase is actively concerned with handling that possibility
- Clients store a unique "client ID" so they can be remembered if they attempt to reconnect after disconnecting. This will always stay the same for a particular client, even as their socket ID changes
- Client events are handled seperately depending on if they were emitted by a [host](../server/session/handle-host-event.ts) or [player](../server/session/handle-player-event.ts). As a style rule: event handlers are responsible for communicating back with clients, while the session object is only responsible for reading and writing its own state
- Any event handlers or session utilities that are shared between host and player clients are stored in [session-utils](../server/session/session-utils.ts)

## [Logging](../server/misc/log.ts)
- All server logging flows through a single custom function: "debugLog". This is so that each log can be labelled by the system its a part of (i.e. connection, clue decision, game generation) and can be chosen to be logged or not depending on the current log level (which is ultimately set by an environment variable)

## [Trivia Database](../server/api-requests/generate-trivia-game.ts)
- jparty has its own database for trivia clues. It's organized as follows: category type -> categories -> clue difficulty -> clues
- For example: within the "Science" category type, we have an array of categories including one called "Solar System". Within "Solar System" we have an array of clues including one of difficulty=1 (easiest) which is "The Earth orbits around this star"
- The trivia game generation process consists of randomly selecting categories from mongo using queries based on the given settings for the requesting session

## [Clue Decisions](../server/api-requests/clue-decision.ts)
- It's ChatGPT. In other words, it's an OpenAI assistant whose job is to evaluate player clue responses
- Its reply must be: "correct", "incorrect", or "needs more detail"
- Its exact instructions are:
> Your job is to judge whether a response to a trivia question was 'correct', 'incorrect', or 'needs more detail'. You'll be given the trivia question, the correct answer, and the response. If the response is vague or non-specific you should return 'needs more detail'. If the response contains the correct answer, but also contains other incorrect answers, you should return 'needs more detail'. The response doesn't need to be an exact match to be considered 'correct', it is allowed to have discrepancies in spelling, pronunciation, and phrasing.  Try to consider if a response with spelling errors would be close to the correct answer had it been spelled correctly, in such a case: the response should still be considered 'correct'. If the response sounds similar to the correct answer phonetically, that should also be considered 'correct'. A response should only be considered 'incorrect' if it is in no way close to the correct answer. When you make your judgement, consider the possibility that the response is meant to fool you. Make your judgement based on whether you think the responder actually knows the correct answer. Please return your response by itself with no other explanation.
- Test #1: `trivia question: "This man was the second president of the U.S.". correct answer: "John Adams". response: "John"` should be `needs more detail`
- Test #2: `trivia question: "This is the color of the middle stripe of the U.S. flag". correct answer: "red". response: "red or white"` should be `needs more detail`
- Test #3: `trivia question: "She is the protagonist of Pride & Prejudice". correct answer: "elizabeth bennet". response: "the progatonist of pride & prejudice"` should be `incorrect`
- Test #4: `trivia question: "This is the longest running Netflix original series". correct answer: "orange is the new black". response: "OITNB"` should be `correct`
- Test #5: `trivia question: "This is the capital of Finland". correct answer: "helsinki". response: "hellsinky"` should be `correct`

## Debug Mode
- An offline client (not connected to a web socket) will automatically run in debug mode. In order to run both the server and client in debug mode, the DEBUG_MODE environment variable must be set on the server (it will be set when using the "npm run debug" script on server)
- Debug mode enables a few tools and shortcuts for ease of testing, including these on client:
  - Debug panel in settings menu allowing you to use debug commands
  - Click clues on HostBoard to select them
  - Click the category name on HostClue to return to board
- And these on server:
  - Enables debug logging which includes some extra info like the position of clue bonuses, outgoing API requests, etc.
  - Forced clue decisions by responding with the desired response. A response may be "correct", "incorrect", or "detail"

## [Host Voice](../client/src/misc/audio.ts)
- Voice lines are spoken aloud by the host computer throughout the game. Most importantly, this voice reads out the clues but also filler lines like "correct" or "that's a bonus, you get to wager, etc."
- There are two TTS systems in use in jparty: the first is API-requested OpenAI TTS with a very realistic sounding voice. This service costs money per request and is enabled/disabled with an environment variable
- The second is the built-in browser screen reader. This TTS is actually pretty good in terms of pronunciation, but is still very robotic. We support it because it's free and not API requested so if the API needs to be disabled or is otherwise not working for any reason: we can easily fall back on the screen reader
- Many timers in the game rely on the TTS system (i.e. when reading out the clue, we need to trigger the next state change once it's done being read aloud) but for various reasons, it's difficult to tell exactly how long a voice line will take to say out loud
- To solve this, we start the timer with an educated estimate that's intentionally generous. Then, once we have more info about exactly how long it will take to be spoken, we update the timer by cancelling it and restarting it with our new duration. These timers are always hidden from players so the mid-timer update isn't jarring or confusing