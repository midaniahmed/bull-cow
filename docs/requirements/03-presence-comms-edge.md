# Presence, Communication, and Edge Cases — Requirements

Covers: disconnection and reconnection rules, multi-presence (multi-tab / multi-room), the in-room emote panel, anti-cheat specifics, and notable edge cases.

For room/lobby behavior see `01-rooms-and-lobby.md`; for the match itself see `02-match-flow.md`.

## Session Identity

Every visitor is identified by a server-issued session token, created the first time they hit the site and stored in:
- `localStorage` (primary)
- An `HttpOnly` cookie (backup)

The token is opaque, long-lived, and has no association with personal data. It is the sole basis for "is this the same player?" decisions throughout the system.

When both storage locations have the token, the cookie is authoritative for the socket handshake; localStorage is used for cross-tab continuity.

Clearing browser data evicts the token. A user with no token is treated as a new visitor, even if they previously played from the same browser.

## Multi-Presence Enforcement

A single session token has the following hard constraints:

### One room at a time

If a player is currently in any room (any stage) and attempts to create or join a different room, the server returns an error: "You are already in another room." The client surfaces this with a "Leave current room and continue?" confirmation:

- Confirm → server transitions the player out of the current room (handled per stage: lobby → revert to waiting / room close; secrets/playing → counted as forfeit of the current match) before joining/creating the new one.
- Cancel → no-op; the player remains in the original room.

### One active tab per room

If the same session opens the same room URL in a second tab while another tab still holds the socket:

- The new tab successfully connects and takes over as the live tab.
- The old tab is immediately notified ("This room is now open in another tab — reconnect here?") with a button to reclaim the room. Until reclaim, the old tab is read-only and does not send any actions.
- Reclaiming in the old tab makes IT the live tab and demotes the newer one.

This ensures gameplay actions can only originate from one tab at a time, eliminating ambiguity in turn ownership.

## Disconnection and Reconnection

### Grace windows

| Stage | Grace window | What happens during grace | What happens at expiry |
| --- | --- | --- | --- |
| `waiting` (creator alone) | 5 minutes | Room persists; reconnect resumes | Room is closed and code freed |
| `lobby` | 60 seconds | Opponent sees countdown banner; disconnected player auto-unreadied | Joiner: removed, room reverts to `waiting`. Creator: room closes; joiner returned to home with "The room creator left." |
| `secrets` | 60 seconds | Opponent sees countdown; remaining secret-submission timer pauses for the disconnected player | Disconnected player forfeits; opponent wins; opponent's secret revealed |
| `rps` | 60 seconds | RPS pick timer pauses for the disconnected player | Disconnected player forfeits |
| `playing` | 60 seconds | Active turn timer pauses; opponent sees countdown | Disconnected player forfeits |
| `ended` | (no grace) | — | Match result is preserved; reconnect returns the player to the result screen |
| `abandoned` | (terminal) | — | See "Both players disconnect" below |

### Reconnection behavior

When a player reconnects with their session token before grace expires:
- Server emits `player_reconnected` to both players.
- The reconnected player's client is restored to the current stage with full state:
  - Lobby → both Ready states, opponent nickname, settings
  - Secrets → their submission state (or input field if not yet submitted), remaining 60s of secret-submission grace
  - Playing → full guess history, current turn, current strike counts, current turn timer remaining (timer resumes on reconnect)
  - Ended → result screen, both secrets, full history
- The opponent's secret is never sent in any reconnection payload while the match is still active.

### Both players disconnect

If both players' grace windows expire without either reconnecting (any stage from `lobby` onwards):

- Match outcome is recorded as `abandoned` — no winner, no loser.
- Room transitions to `abandoned` stage.
- The room and its abandoned result are retained for ~10 minutes so a returning player sees a clear "This match was abandoned" message and a Home button. After that, the room is fully closed.
- No `match_ended` event is delivered (both clients are gone); instead the room emits `room_closed` which any returning client interprets correctly on reconnect.

## In-Room Communication

### Quick-emote panel

The only communication channel between players during a match is a fixed set of pre-defined emotes. There is no free-text chat in MVP.

- Available throughout: lobby, secrets, rps, playing, ended (post-match)
- Suggested initial set (the exact list and icons are an implementation/design choice; the requirements are the behavior):
  - 👋 GG
  - 🔥 Nice
  - 🤔 Thinking
  - 😮 Wow
  - 😅 Oops
  - 👏 Well played
- One click sends the emote. Server broadcasts `emote_sent` to both players.
- Received emotes display as a small toast near the opponent's avatar/nickname for ~3 seconds, then fade. The emote is not added to any permanent history.

### Emote rate limit

Each player may send at most **5 emotes per 30-second window**. Excess is rejected silently on the server (the client may also disable the panel for the remainder of the window). This prevents spam without requiring a moderation surface.

### Mute (optional)

A small **Mute** toggle near the emote panel hides all incoming emotes from the opponent for the current session in this room. The opponent does not see whether they have been muted.

## Anti-Cheat Specifics

The original spec's anti-cheat principles stand:

- Server is the sole authority for state and rule enforcement.
- Secrets are stored server-side and are never serialized to the opponent's client. They are revealed only as part of `match_ended` or `room_closed` payloads.
- All gameplay validation (digit length, character set, duplicates, leading zero, turn ownership, time limits, submission validity) is enforced server-side. Client-side validation exists for UX only.
- Turn enforcement: the server tracks `active_turn_player_session_token` (alternating mode) or current round state (simultaneous mode). Guesses arriving from the wrong player or for the wrong turn/round are rejected.
- Anti-replay / duplicate-event prevention: each player action carries a client-generated nonce (e.g., per-turn or per-round identifier). The server rejects repeated submissions with the same nonce, which protects against network-glitch retries delivering the same action twice. This is distinct from the in-game rule that duplicate guess **values** are allowed and waste the turn — both rules apply independently.

### Rate limits

- A player cannot submit more than 1 valid guess per turn in alternating mode (enforced by turn ownership).
- In simultaneous mode, a player can submit and re-submit (correcting an invalid guess) up to **20 times per round**. Excess is rejected.
- Emote rate limit: 5 per 30 seconds (see above).
- Per-session global limit: at most **100 socket messages per minute** (any kind). Excess is throttled or temporarily silenced.

### No secret exposure under any condition

The server must never include a player's own secret in any outbound payload sent to the opponent, including:
- During gameplay (not even hashed or encoded)
- In the bull/cow result (only counts are returned)
- During reconnection state restoration
- In error messages

The server may include the opponent's secret in the **post-match** payload (`match_ended` with outcome `winner`/`draw`/`abandoned`) once the match is terminal. Until then, both secrets are server-only.

## Edge Cases

### Browser refresh mid-match

A page refresh is treated as a brief disconnect. The page reload re-establishes the socket using the same session token, and the client requests the current room state. As long as the refresh completes within the 60s grace, no functional impact.

### Browser back button mid-match

Navigating away from the room URL via back/forward starts the disconnect grace timer just like closing the tab. Returning to the room URL within grace restores state.

### Same nickname for both players

Allowed. The UI MUST visually differentiate "You" from "Opponent" through layout/labels, not by nickname alone, so identical nicknames cannot cause confusion.

### Invalid room URL

A URL like `/room/INVALID` triggers a server lookup; the client receives a `Room not found` and shows the same error as the join flow with a Home button.

### Two devices, same session token (e.g., copied localStorage)

Prevented by the "one active tab per room" rule — the most recently connected client takes over, the previous one is demoted to read-only. The two devices cannot both act on the room simultaneously.

### Cleared browser data mid-match

The user effectively loses their session token and is indistinguishable from a new visitor. They cannot reconnect to the existing room. If they reach the grace expiry, they forfeit. They can rejoin a new game with a new identity.

### Server restart mid-match

In-memory match state is lost. Active matches that were not snapshotted are considered abandoned. Clients see a disconnect, attempt reconnect, and if the room no longer exists, are returned to home with "The match was interrupted." (Persistence behavior is an implementation choice — these requirements describe the user-facing outcome only.)

### Network loss while submitting a secret/guess

The submitting client receives no acknowledgement and retries with the same nonce. The server, on first valid receipt, processes and acks; subsequent duplicates are deduplicated by nonce and acked again. The user sees a "Submitting…" state until acked.

## Acceptance Criteria — Presence, Comms, Edge Cases

- [ ] Session token persists across page reloads in the same browser; same token recognizes the same player on reconnect.
- [ ] One session token cannot be active in two rooms simultaneously; attempting to join a second room offers a "leave current and continue" confirmation.
- [ ] Opening the same room URL in a second tab demotes the first tab to read-only; clicking reclaim in the first tab demotes the second.
- [ ] A player who closes their browser tab mid-match can reload within 60s and resume in the same state with the turn timer paused during their absence.
- [ ] After the 60s grace expires, the disconnected player forfeits and the opponent wins; the opponent's secret reveal happens at end-of-match.
- [ ] If both players exceed grace, the match is recorded as `abandoned` with no winner; either player returning sees the "abandoned" result screen.
- [ ] Emotes are limited to the pre-defined set; sending one shows it briefly on both players' screens.
- [ ] Emote rate limit (5/30s) is enforced server-side; excess is dropped without ending the game.
- [ ] Mute toggle hides incoming emotes from the muted player without notifying the sender.
- [ ] Server rejects guesses arriving from the wrong player on the wrong turn (alternating) or beyond the round cap (simultaneous).
- [ ] Repeated socket messages with the same nonce are deduplicated and produce a single processed action.
- [ ] No outbound payload sent to a player contains the opponent's secret while the match is still in `lobby`, `secrets`, `rps`, or `playing` stage — verified by network inspection during gameplay.
