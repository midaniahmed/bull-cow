# Rooms and Lobby — Requirements

Covers: entry flow, creating a room, joining a room, lobby behavior, room expiry.

For the match itself, see `02-match-flow.md`.

## Entry Flow (Landing → Home)

### Landing page

Anyone visiting the root URL sees a landing page that:
- Explains the game in 1–2 sentences with a short rules summary.
- Shows two primary CTAs: **Create Room** and **Join Room**.
- Has no secondary navigation or sign-in (accounts are out of scope for MVP).

### Nickname prompt

Clicking either CTA opens a nickname-entry step (a modal or a focused screen — same UX surface either way):

- Single text input labeled "Your nickname"
- Validation:
  - 2–20 characters after trimming
  - Allowed characters: `a–z`, `A–Z`, `0–9`, space, `.`, `_`, `-`
  - No uniqueness check across players
- Inline error if invalid; submit button disabled until valid
- On submit:
  - Server issues a session token if the visitor doesn't already have one
  - Nickname is bound to the session token for the rest of the visit
  - Returning visitors (with a stored session token) skip this step — their existing nickname is reused
  - User is taken to the home screen with the chosen action pre-selected (Create or Join)

### Home screen

- Displays the user's current nickname (with an "Edit" affordance that re-opens the nickname prompt)
- Two primary actions: **Create Room** and **Join Room** (both visible at all times)
- Brief recap of how to play

The home screen is identical for first-time and returning visitors — no stats, no history.

## Creating a Room

### Configure-then-create

Clicking **Create Room** opens a settings form. The form must be submitted to create the room. Once created, settings are locked.

The settings form contains exactly the fields documented in `00-overview.md` → Room settings, with the defaults specified there. Recommended grouping in the UI: Number, Match, Advanced (collapsed by default).

Each setting has a one-line plain-language description (e.g., "Fog mode: hide your opponent's guesses from your board").

### On submit

- Server validates the full settings payload. Invalid combinations are rejected with a per-field message (e.g., `length=3 + allow_duplicate_digits=false + allow_leading_zero=false` is valid; `length=10 + allow_duplicate_digits=false` is valid (exactly the permutations of 0–9) but `length=11 + allow_duplicate_digits=false` is rejected because length max is 10).
- Server generates a unique 6-character room code from `A–Z` + `0–9`, excluding `0`, `O`, `1`, `I`, `L`. Uniqueness is checked against active rooms only. Collisions trigger retry.
- Server creates the room with stage = `waiting` and emits `room_created` to the creator.
- The creator's view transitions to the **empty lobby**.

### Empty lobby (waiting stage)

The creator alone in the room sees:

- The room code displayed prominently with a one-click "Copy code" affordance
- A "Copy link" button generating a shareable URL of the form `/room/{CODE}`
- A QR code rendering the same shareable URL (for in-person sharing via phone)
- A summary of the configured settings (read-only)
- An empty opponent slot labeled "Waiting for opponent…"
- A **Cancel Room** button that closes the room and returns the creator to the home screen

### Empty lobby — creator disconnect

If the creator's socket disconnects while alone in the room (no joiner yet):

- Server starts a 5-minute grace timer.
- If the creator reconnects within the grace (same session token), they resume the empty lobby with state intact.
- If the grace expires with no reconnect, the room is auto-closed and the code freed. No `room_closed` event is delivered (the creator is gone).

## Joining a Room

### Entry points

A joiner can reach a room two ways:

1. Click **Join Room** on home, then enter the 6-character code in an input field.
2. Follow a shared URL like `/room/A7KD92`. The code is taken from the URL; if the joiner has not yet set a nickname, they go through the nickname prompt first, then continue.

### Join code validation

- The code input accepts uppercase alphanumerics only; lowercase input is auto-uppercased.
- On submit, server checks:
  - Code maps to an existing room? If no → `Room not found`.
  - Room has space (joiner_session_token is null and the joiner is not the creator)? If no → `This room is full`.
  - Room stage is `waiting`? If no:
    - Stage `lobby` through `playing` → `Match already in progress`.
    - Stage `ended` or `abandoned` → `This match has ended`.
- Each failure mode shows its specific message with a **Retry** button and a link back to home.

### Join preview

A successful code resolution does NOT yet add the joiner to the room. Instead, the joiner sees a **preview screen** showing:

- The creator's nickname
- Full settings summary (number rules, turn system, first-turn rule, time limit, fog mode on/off)
- A **Join Match** button (commits to the lobby)
- A **Cancel** button (returns to home)

This step prevents accidental joins and makes settings explicit before commitment.

### On Join Match

- Server adds the joiner's session token to the room, sets joiner nickname, and transitions stage to `lobby`.
- Server emits `room_joined` to both players. The creator's empty-lobby view updates to show the joiner.

## Lobby (lobby stage)

Both players present, neither Ready yet.

### What both players see

- The opponent's nickname
- Their own nickname (clearly labeled "You")
- Full settings summary (read-only — settings cannot change after room creation)
- A **Ready** button (toggleable: Ready ↔ Not Ready) for each player

### What only the creator sees

- A **Kick** button next to the joiner. Clicking it (with a confirmation modal) removes the joiner from the room, reverting stage to `waiting`. The joiner's client shows "You were removed from the room" and returns them to home.

### What only the joiner sees

- A **Leave Room** button. Clicking it (with a confirmation modal) removes the joiner; stage reverts to `waiting`.

### Ready behavior

- Either player may click Ready independently. The opponent sees a visual indicator that the other is ready.
- Ready is toggleable until both are simultaneously Ready.
- The moment both players are Ready in the same state, the server transitions to `secrets` stage and emits `match_started`. No additional confirmation step.
- Server emits `player_ready` whenever either player toggles state.

### Lobby disconnect

If either player disconnects from the lobby:
- Reconnection grace is **60 seconds** (same as the match grace — see `03-presence-comms-edge.md`).
- During grace, the other player sees "Opponent disconnected — waiting (Xs)" with countdown.
- If the disconnected player was Ready, they are auto-marked Not Ready on disconnect (no auto-advance on the opponent's behalf).
- After grace expiry: if the **joiner** disconnects past grace, joiner is removed and stage reverts to `waiting`. If the **creator** disconnects past grace, the room is closed and the joiner is shown "The room creator left" with a Home button.

## Room Expiry

- An empty waiting-stage room with the creator actively connected has **no idle timeout**. It persists until the creator clicks Cancel Room or disconnects past the 5-minute creator-AFK grace.
- A lobby/playing/secrets-stage room follows its own disconnect handling (see above and `03-presence-comms-edge.md`).
- An `ended` or `abandoned` room is closed when both players acknowledge the result (click Home or Rematch). Server may also close it automatically after 10 minutes of post-match idle.

## Acceptance Criteria — Rooms & Lobby

- [ ] First-time visitor entering nickname and proceeding to home works for both Create and Join CTAs.
- [ ] Returning visitor with a stored session token skips the nickname prompt and sees their previous nickname.
- [ ] Editing the nickname from the home screen updates it on the server and reflects immediately.
- [ ] Creator can configure all documented settings before creating; invalid combinations are rejected with field-level errors.
- [ ] Room codes are exactly 6 characters from the allowed charset, never include ambiguous chars, and are unique across active rooms.
- [ ] Empty lobby shows code, copy-link, QR, settings summary, and a working Cancel button.
- [ ] Joining: correct, room-not-found, full-room, match-in-progress, and match-ended cases each show their distinct message.
- [ ] Join preview shows creator nickname + full settings before committing.
- [ ] Joiner who joins and then leaves before Ready returns the room to waiting and frees the joiner slot.
- [ ] Creator can kick the joiner from the lobby; joiner sees the correct removal message and returns to home.
- [ ] Both players Ready in the lobby transitions the room to secret submission within 1 second.
- [ ] Creator AFK in an empty waiting room: 5-minute grace, then auto-close; reconnect within grace resumes correctly.
