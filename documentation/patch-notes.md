
# Patch Notes

## _Version 1.1, with contributions from @snzow and @TheodoreRed_

### Improved game timing
- Significantly reduced downtime between game events, especially online with many players: game timers no longer wait on every player's connection, and the host's voice timing is more accurate (fixing long silences after voice lines)
- Fairer play on slow connections: buzzers and response windows now unlock at the same instant for every player and always grant their full duration
- The host voice starts speaking sooner, and clue responses are judged by a newer, faster AI model

---

### First round category names preview
- Trivia games are now generated while in the lobby so first round category names can be previewed before starting

---

### New visuals and sounds
- Added back terminology inspired by Jeopardy! like "daily double" and "final jparty"
- New background theme options in the settings menu
- Slight UI changes across the board i.e. new font and menu style
- New music on lobby and during game
- New sound effects for selecting clues, buzzing in, submitting responses and wagers, and clue decisions

---

### Leaderboard upgrades
- Each leaderboard now tracks its total games played and total money earned
- Players who claim a leaderboard spot are indicated as such on the final scoreboard and mentioned by the host voice
- All leaderboards have been reset

---

### Player UX improvements
- The lobby now shows a QR code that players can scan to join
- Clue selection now uses a single tap instead of double tap
- The keyboard opens automatically when a player is selected to respond
- All play clues now reveal the names of everyone who responded correctly instead of reading each one out one by one

---

### Trivia improvements

- Prevents a category from containing two clues with the same answer
- Adds a naive filter to skip likely image-dependent clues by checking for keywords like "seen here" and "pictured here"
- Changed category type distribution to be a bit more even
- Host voice points out quotation category names i.e. a category whose clues all contain a quoted segment from the category name

---

### Everything else
- Custom games are temporarily unavailable while they get reworked; the normal and party presets remain
- Lots and lots of small bug fixes