
# [jparty!](https://jparty.io)
### _a couch co-op Jeopardy! game_

## [Patch Notes](documentation/patch-notes.md)
## [Known Issues](documentation/known-issues.md)

# Development
Read the [overview](documentation/overview.md) for a high level description of the codebase. The game is split into three separate
node packages: "client", "server", and "shared"

### _Setup_
```
-- install node modules in server and client
npm install
```

### _Build_
```
-- build server
npm run build

-- build client
cd client; npm run build

-- build server and client
npm run build-all
```

### _Test_
```
-- run the game in debug mode (enables client debug tools and additional logging)
npm run debug

-- run the game in production mode
npm run prod

-- open the client
start-process "https://localhost:3000"

-- open the QA dashboard
start-process "https://localhost:3000/qa"

-- test a disconnected client with hot reloading (i.e. for iterating UI design)
cd client; npm run debug
```

# License and Disclaimer
This project is open source under the [MIT License](LICENSE)

jparty! is fan-made. It is not affiliated with, endorsed by, or sponsored by Jeopardy Productions, Inc. or Sony
Pictures Entertainment. _Jeopardy!_ is a registered trademark of Jeopardy Productions, Inc. The MIT License covers the code in this
repository only; third-party assets (such as trivia clue data and music) remain subject to their own terms, as listed in the in-game
credits