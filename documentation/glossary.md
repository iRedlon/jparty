
# Glossary
### _Detailed explanations of internal concepts. Use to supplement code comments_

## Clue Difficulty Order
*An array storing the increasing order of clue difficulties that will appear in a category*
- For a rated game: this order is always: [1, 2, 3, 4, 5]. In other words, each category features one clue of each difficulty
- For a custom game: this order can be weighted to control the difficulty (i.e. [1, 1, 2, 2, 3] for an easier category or [2, 3, 4, 5, 5] for a harder category)
- This system is also how we support categories with more than 5 clues. In order to spread out the difficulty across a longer category the order may look like: [1, 1, 2, 3, 3, 4, 4, 5, 5, 5]
- Difficulty order is found prior to generating the category, then we use it as a filter to specifically select for a category that can accommodate those settings

## Mock Socket
*A tool for debugging a client that isn't connected to a web socket. Simulates socket event handling with DOM effects*
- Debugging with an offline client is convenient because it can utilize hot-reloading, but in the absence of a real server we need to simulate game events somehow
- To do this: we setup DOM event listeners at the same time as we setup socket handlers, to listen for the exact same events
- Then, we use a suite of [debug commands](../client/src/misc/debug-command.tsx) to send those events with dummy data in order to test the client under realistic conditions