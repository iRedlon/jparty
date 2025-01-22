
# Backlog TODO
### _Planned work that isn't high enough priority to be on a TODO list yet_

- Query to mark (not delete) image clues using keywords like "seen here". Explore the possibility of finding and displaying images for such clues where appropriate
- Categories (particularly in a party game) should never have two clues with the exact same answer, unless that answer was enumerated in the category name i.e. (NBA, NFL, or NHL)
- Decide who should own voice line/sound effect validation i.e. what to say depending on the current game situation
- Make OpenAI TTS voice more resilient to symbols, for example: "4.3" as "4 point 3", "%" as "percent" instead of "cent"
- Prevent the same voice line from being randomly chosen twice in a row for a given voice line type
- Operations purely on session state that are greater than one line... should always be a session method
- Change phrasing of champion congratulations depending on game performance: "nice job" if you did poorly vs. "masterfully played" if you played really well for example
- Fix nitpick: a leading italic "j" gets cut off in the responder info box on HostClue
- Consider bringing back bespoke "lobby music" and "game music"
- Notify individual players when they make it on the leaderboard and what place they made
- Add opt-in newsletter
- Add custom events for google analytics

## Feedback from friends

- Pauses between evaluating each player answer is too long during all play
- Not enough visual feedback when doing things on mobile device: selecting clue, submitting answer, etc.
- Correct answer formatting sometimes weird and cut off
- Scores can get cut off if they're too big on final scoreboard screen or just mobile scoreboard screen
- Audio cues for someone buzzing in and when submitting an answer
- More sound FX, maybe bring back the crowd noises (awwww/applause/etc.)
- After hitting the buzzer, it switches to the scoreboard so you can accidentally click "edit signature" while spamming
- Automatically opening the keyboard after a buzzer click would be nice
- Answer check delay is a neccessary evil because it's a network request but maybe some audio would help smooth it out
- Opinion: all play answers should be penalized if you attempt an answer (but not if you don't even try)
- Don't bother waiting for network request if answer is obviously correct (use the old answer checking basically to save some time and API money)
- Add support for anki flashcards
- Add experimental support for locales by using OpenAI translate for a few popular languages (and maybe excluding America-specific trivia if possible)