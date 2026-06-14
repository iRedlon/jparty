
# Patch Notes
### _Version 1.0, a total remake of the former jeoparty.io_

## Major Server Upgrades
- Improved server stability. Crashes are mostly eliminated, and those that do happen are handled without losing game progress
- Reconnection system is completely rebuilt. Players can come and go from games (switch apps, close tab, etc.) as both a host and player
- Computers can now "spectate" an existing session, meaning you can play with friends remotely without screen sharing
- Computers can now join a session as a player instead of host

## Natural Language Clue Decisions
- ChatGPT evaluates clue decisions making it much more accurate with consistent allowances for spelling and phrasing
- The result of a clue decision may be "needs more detail" giving you a second chance to clarify your answer
- Players may vote to reverse a prior clue decision, which can be used to overrule a false positive/negative

## Custom Games
New menu to customize game settings, most notably:
- Game difficulty
- Banned category types (i.e. Geography, History)
- Timer durations (i.e. time to select a clue, time to respond)
- Number of rounds, number of categories/clues per round

Normal game settings from jeoparty.io remain the default. Only normal game results will be eligible for the public leaderboard

## "Party Mode"
Using the aforementioned game settings; there is a new preset game mode intended for a more casual experience. Features of "party mode" include:
- Easier clues across all rounds
- Half as many clues for a shorter game
- More bonuses i.e. more clues that are wager and "all play" (meaning anyone in the game can respond without penalty)

## Everything Else
- Overhauled UI with new animations and formatting
- New options for host narrator voice: the "modern" AI voice and the "classic" screen reader voice. Both options are available as masculine or feminine
- Signatures are visible more often throughout the game and can be edited any time
- New behavior for tossup clues. When multiple players buzz in at once, the player who wins becomes less likely to win the next one
- New "volume" menu tab to change/mute the volume of music/host voice/sound FX seperately
- New "feedback" menu tab to report bugs, report bad trivia data, and make development suggestions
- After completing a game, you have the option of returning to the lobby with the same players

### _Version 1.1, improvements by @snzow
## Summary

### Player UX improvements

**Single tap to select a clue** (`PlayerClueSelection.tsx`)
Replaced the `useDoubleTap` hook with a direct `onClick` handler on each clue value box. Removes the dependency on the `use-double-tap` package. Updated hint text from "double tap" to "tap".

**Auto-focus response input after buzzing in** (`PlayerResponse.tsx`)
Added `autoFocus` to the clue response input so the keyboard opens automatically when a player is selected to respond. Note: mobile browsers only honour programmatic focus when triggered close to a user gesture, so this works best on short tossup windows.

---

### Trivia game generation improvements (`generate-trivia-game.ts`)

- Prevents a category from containing two clues with the same answer by tracking answers in a `Map` and re-rolling on duplicates (up to 10 retries per slot).
- Adds a naive filter to skip likely image-dependent clues by checking for keywords like "seen here" and "pictured here" in the answer text.
- Swapped `usedClueIDs` from an array to a `Set` for O(1) lookups.

---

### Clue decision short-circuit (`clue-decision.ts`)

Added an exact-match check before making an OpenAI API call: if the player's response (lowercased, trimmed) exactly matches the correct answer, the decision is immediately returned as `Correct`. This avoids an unnecessary API round-trip for the common case.

---

### Accurate TTS timeout durations (`tts.ts`, `audio.ts`, `session-utils.ts`, `handle-host-event.ts`)

Previously, TTS-driven timeouts started with a rough estimate of 200ms per character and relied on the host client to report back the actual audio duration after `onloadedmetadata` fired — a round-trip that was also broken for the OpenAI TTS path (the client emitted `UpdateVoiceDuration` without the required `voiceLine` argument, so the server silently ignored it).

The fix computes duration directly from the MP3 binary on the server: OpenAI `tts-1` outputs at 24 kbps CBR, so `duration_ms = ceil(bytes / 3000) * 1000`. This value (plus a 300ms network latency buffer) is used to restart the timeout immediately after the API responds, before the audio is even sent to the client. No client round-trip required.

As part of this, the timeout-restart logic was extracted from `handleUpdateVoiceDuration` into a shared `updateVoiceDuration` helper in `session-utils.ts`, fixing a pre-existing missing `break` in the `ReadingCategoryNames` switch case. The browser TTS fallback path continues to work through the existing `onend → UpdateVoiceDuration` mechanism.