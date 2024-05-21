
# Feature TODO (Isaac)

- Finish sound system
  - New sound: applause when clearing a category
  - New sound: "you control the board ____" when the board controller changes
- Do some hardcore multiplayer testing in all available modes (including spectation)
- Overall UI face lift
  - UI for clue selection where you see each board column individually and swipe between them
  - Margins/spacing/fonts/colors, small tweaks like that
  - A background with some texture, not just a solid color
  - Basic animations: constant idle motion like Balatro, an effect for session announcements, an effect for getting correct answers, an effect for scoreboard changes
- New clue tossup behavior

# Feature TODO (A collaboator, i.e. Teddy)

- (Database 1a): Write some JS queries for moving clues from one category to another, and from one difficulty to another
- (Database 1b): Query to mark (not delete) image clues using keywords like "seen here". Explore the possibility of finding and displaying images for such clues where appropriate
- (Database 2): A centralized system to collect basic game data (game started/finished, custom games played, clues answered and their corectness, reversals used, etc.)
- (Game Design 1): Standard format for uploading one's own categories/clues (perhaps including images as well?). Consider tech literacy when deciding upon this format
- (Game Design 2): Answer streaks. Save some player data concerning their answer accuracy, then award them in the UI and with the host voice accordingly

# Backlog TODO
### _Planned work that isn't high enough priority to be on a TODO list yet_

- Switch OpenAI key in production to use new GPT model. Continue using 3.5 in dev
- Client ID should be the canonical representation of a player in more places than they are. Socket ID is still important but maybe not everywhere we refer to a player
- State validation and a general pass for data sanity on client input (i.e. if I somehow receive a buzz during clue response... don't do anything)
- Consider how reversals affect public leaderboard status
- "Battle royale" round type: continue to answer questions, player with fewest correct gets eliminated every so often

# Bugs
### _Known issues, hopefully with repro steps_

- Player leaderboard UI sometimes gets scuffed in a way where the border lines from the previous state are still visible (doesn't impact gameplay)

# Feedback
### _Raw feedback from playtesting that still needs to be organized_

- Prevent the same voice line from being randomly chosen twice in a row for a given voice line type?
- There are a few voice lines (like for the all wager bonus) that should be excluded on single clue rounds