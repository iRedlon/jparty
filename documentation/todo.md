
# Feature TODO

- (Database 1b): Query to mark (not delete) image clues using keywords like "seen here". Explore the possibility of finding and displaying images for such clues where appropriate
- (Database 2): A centralized system to collect basic game data (game started/finished, custom games played, clues answered and their corectness, reversals used, etc.)
- (Game Design 1): Standard format for uploading one's own categories/clues (perhaps including images as well?). Consider tech literacy when deciding upon this format
- (Game Design 2): Answer streaks. Save some player data concerning their answer accuracy, then award them in the UI and with the host voice accordingly

# Backlog TODO
### _Planned work that isn't high enough priority to be on a TODO list yet_

- Client ID should be the canonical representation of a player in more places than they are. Socket ID is still important but maybe not everywhere we refer to a player
- Categories (particularly in a party game) should never have the exact same answer unless it's an answer that's enumerated in the category name
- Decide who should own voice line/sound effect validation i.e. what to say depending on the current game situation
- Make OpenAI TTS voice more resilient to symbols, for example: "4.3" as "4 point 3", "%" as "percent" instead of "cent"
- Prevent the same voice line from being randomly chosen twice in a row for a given voice line type
- Operations purely on session state that are greater than one line... should always be a session method
- Change phrasing of champion congratulations depending on game performance: "nice job" if you did poorly vs. "masterfully played" if you played really well for example
- Fix nitpick: a leading italic "j" gets cut off in the responder info box on HostClue
- Consider bringing back bespoke "lobby music" and "game music"