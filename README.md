
# [jparty](https://jparty.io)
### _A couch co-op trivia game_

## [Patch Notes](documentation/patch-notes.md)
## [Known Issues](documentation/known-issues.md)

## Development
Read the [overview](documentation/overview.md) for an overall description of the codebase. It's important to understand that the game is split into three separate
node packages: "client", "server", and "shared"

```
-- install node modules in server and client
npm install

-- build server and client
npm run build-all

-- run the game in debug mode (enables client debug tools and additional logging)
npm run debug

-- run the game in production mode
npm run prod

-- test a disconnected client with hot reloading (i.e. for iterating UI design)
cd client; npm run debug
```