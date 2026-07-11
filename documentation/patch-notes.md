
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
- New background theme options in the settings menu
- Slight UI changes across the board i.e. new font and menu style
- New music on lobby and during game
- New sound effects for selecting clues, buzzing in, submitting responses and wagers, and clue decisions

---

### Leaderboard upgrades
- Each leaderboard now tracks its total games played and total money earned
- Players who claim a leaderboard spot are indicated as such on the final scoreboard

---

### Player UX improvements
- The lobby now shows a QR code that players can scan to join
- Clue selection now uses a single tap instead of double tap
- The keyboard opens automatically when a player is selected to respond
- All play clues now reveal the names of everyone who responded correctly instead of reading each one out one by one

---

### Trivia game generation improvements

- Prevents a category from containing two clues with the same answer
- Adds a naive filter to skip likely image-dependent clues by checking for keywords like "seen here" and "pictured here"

---

### Everything else
- Custom games are temporarily unavailable while they get reworked; the normal and party presets remain
- Lots and lots of small bug fixes

## _Version 1.0, a total remake of the former jeoparty.io_

### Major server upgrades
- Improved server stability. Crashes are mostly eliminated, and those that do happen are handled without losing game progress
- Reconnection system is completely rebuilt. Players can come and go from games (switch apps, close tab, etc.) as both a host and player
- Computers can now "spectate" an existing session, meaning you can play with friends remotely without screen sharing
- Computers can now join a session as a player instead of host

---

### Natural language clue decisions
- ChatGPT evaluates clue decisions making it much more accurate with consistent allowances for spelling and phrasing
- The result of a clue decision may be "needs more detail" giving you a second chance to clarify your answer
- Players may vote to reverse a prior clue decision, which can be used to overrule a false positive/negative

---

### Custom games
New menu to customize game settings, most notably:
- Game difficulty
- Banned category types (i.e. Geography, History)
- Timer durations (i.e. time to select a clue, time to respond)
- Number of rounds, number of categories/clues per round

Normal game settings from jeoparty.io remain the default. Only normal game results will be eligible for the public leaderboard

---

### "Party mode"
Using the aforementioned game settings; there is a new preset game mode intended for a more casual experience. Features of "party mode" include:
- Easier clues across all rounds
- Half as many clues for a shorter game
- More bonuses i.e. more clues that are wager and "all play" (meaning anyone in the game can respond without penalty)

---

### Everything else
- Overhauled UI with new animations and formatting
- New options for host narrator voice: the "modern" AI voice and the "classic" screen reader voice. Both options are available as masculine or feminine
- Signatures are visible more often throughout the game and can be edited any time
- New behavior for tossup clues. When multiple players buzz in at once, the player who wins becomes less likely to win the next one
- New "volume" menu tab to change/mute the volume of music/host voice/sound FX seperately
- New "feedback" menu tab to report bugs, report bad trivia data, and make development suggestions
- After completing a game, you have the option of returning to the lobby with the same players