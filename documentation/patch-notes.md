
# Patch Notes
### _Major changes from jeoparty.io to jparty.io_

## Major Server Upgrades
- Improved server stability. Crashes are mostly eliminated or very rare, and those that do happen are handled without losing game progress
- Reconnection system is completely rebuilt. Expect to come and go from games in progress with no trouble as both a host and player
- Computers can now "spectate" an existing game in progress, meaning you can play with friends remotely without screen sharing
- Computers can now join a game as a player instead of host

## AI Clue Decisions
- ChatGPT evaluates clue decisions making it much more accurate with consistent allowances for spelling and phrasing
- The result of a clue decision may be "needs more detail" giving you a second chance to clarify your answer
- Players may vote to reverse a prior clue decision, which can be used to overrule a false positive/negative

## Custom Games
New menu to customize game settings, most notably:
- Game difficulty
- Banned category types (i.e. Geography, History)
- Timer durations (i.e. time to select a clue, time to respond)
- Number of rounds, number of categories/clues per round

Default game settings remain the normal format from jeoparty.io. Only default game results will be eligible for the public leaderboard

## "Party Mode"
Using the aforementioned game settings; there is a new default game mode intended for a more casual experience. Features of a "party mode" game include:
- Easier clues across all rounds
- Half as many clues for a shorter game
- More bonuses i.e. more clues allow you to wager and "all play", meaning anyone in the game can respond without penalty

This mode and other custom settings are completely optional and merely exist as a way to further utilize what I believe is a strong "trivia engine" independent of the game show that inspired it

## Small But Important
- After completing a game, you can return to the lobby with the same players. You may of course start over with a fresh slate if you choose
- New "feedback" menu tab to report bugs, report bad trivia data, and make development suggestions
- New "volume" menu tab to change/mute the volume of music/host voice/sound FX seperately

## Coming Soon...
- New and improved user interface worthy of the re-built server
- New tech to handle "tossups" (i.e. players all buzzing around the same instant). Basically, your odds of winning a tossup improve each consecutive time you lose one
- User accounts to save historical game stats
- Public leaderboards including more detailed stats like category type accuracy (i.e. this players answers 85% of their geography attempts correctly)
- Ability to upload your own trivia categories (in an accessible format like .json or something) for flashcard studying, class lessons, etc.
- Expanded party mode (new clue bonuses and round types i.e. a round where each player gets to choose their own category type)
- Answer streaks for giving consecutive correct responses

## Fun Facts
- jparty's clue database has about 170000 clues across 20000 categories