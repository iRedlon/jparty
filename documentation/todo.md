
# Feature TODO (Isaac)

- Overall UI face lift
  - UI for clue selection where you see each board column individually and swipe between them
  - Margins/spacing/fonts/colors, small tweaks like that
  - A background with some texture, not just a solid color
  - Basic animations: constant idle motion like Balatro, an effect for session announcements, an effect for getting correct answers, an effect for scoreboard changes
  - Timer as a clock, sliding on and off screen whenever it comes or goes
- New clue tossup behavior
- Hook up trivia cleanup functions implemented by Teddy to a new client debug interface

# Feature TODO (A collaboator, i.e. Teddy)

- (Database 1b): Query to mark (not delete) image clues using keywords like "seen here". Explore the possibility of finding and displaying images for such clues where appropriate
- (Database 2): A centralized system to collect basic game data (game started/finished, custom games played, clues answered and their corectness, reversals used, etc.)
- (Game Design 1): Standard format for uploading one's own categories/clues (perhaps including images as well?). Consider tech literacy when deciding upon this format
- (Game Design 2): Answer streaks. Save some player data concerning their answer accuracy, then award them in the UI and with the host voice accordingly

# Backlog TODO
### _Planned work that isn't high enough priority to be on a TODO list yet_

- Client ID should be the canonical representation of a player in more places than they are. Socket ID is still important but maybe not everywhere we refer to a player
- State validation and a general pass for data sanity on client input (i.e. if I somehow receive a buzz during clue response... don't do anything)
- Consider how reversals affect public leaderboard status
- Categories (particularly in a party game) should never have the exact same answer unless it's an answer that's enumerated in the category name
- Decide who should own voice line/sound effect validation i.e. what to say depending on the current game situation
- Make OpenAI TTS voice more resilient to symbols, for example: "4.3" as "4 point 3", "%" as "percent" instead of "cent"
- Prevent the same voice line from being randomly chosen twice in a row for a given voice line type
- isTossupClue gets called a lot. Should the inverse be a method? And are there any crufty uses of "has spotlight responder ID" that should be replaced with a tossup check?
- Operations purely on session state that are greater than one line... should always be a session method

# Bugs
### _Known issues, hopefully with repro steps_

- Player leaderboard UI sometimes gets scuffed in a way where the border lines from the previous state are still visible (doesn't impact gameplay)

# Feedback
### _Raw feedback from playtesting that still needs to be organized_

- "Battle royale" round type: continue to answer questions, player with fewest correct gets eliminated every so often
- Change phrasing of champion congratulations depending on game performance: "nice job" if you did poorly vs. "masterfully played" if you played really well