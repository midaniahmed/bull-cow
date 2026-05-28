# Phase 4: Server State

The server holds **one finite-state machine per room**, mirrored to Redis after every authoritative mutation. In-memory copies exist only for fast reads inside a single request — the source of truth on every action is Redis (loaded under the per-room lock).

## Module layout

```
apps/server/src/rooms/
├── room-state.ts        # type definitions, initial state factory
├── transitions.ts       # one named function per allowed transition
├── lock.ts              # AsyncLock keyed by room code
├── store.ts             # load/save against Redis (atomic, lock-scoped)
├── timers.ts            # in-memory timer wheel + Redis-backed deadlines
├── view.ts              # toRoomStateView(state, recipientToken) — secret filter
└── lifecycle.ts         # create/cancel/close + roomcodes:active management
apps/server/src/match/
├── engine.ts            # turn/round logic, called by socket handlers
├── secrets.ts           # secret submission flow
├── rps.ts               # RPS replay logic
└── rematch.ts           # rematch first-turn flip + state reset
```

## Room state shape

```ts
type RoomState = {
  code: RoomCode;
  stage: RoomStage;
  settings: RoomSettings;
  creator: PlayerState;
  joiner: PlayerState | null;
  match: MatchState | null;        // populated from `secrets` onwards
  rematchHistory: RematchHistoryEntry[];
  createdAt: number;               // ms epoch
};

type PlayerState = {
  sessionToken: SessionToken;
  nickname: string;
  ready: boolean;
  strikes: 0|1|2|3;
  connected: boolean;
  disconnectGraceEndsAt: number | null;
  activeTabId: string | null;
};

type MatchState = {
  secrets: Record<SessionToken, string | null>;   // server-only
  secretsLockedAt: Record<SessionToken, number | null>;
  secretDeadlines: Record<SessionToken, number | null>;

  // alternating mode
  activeTurnPlayer: SessionToken | null;
  turnIndex: number;
  turnDeadline: number | null;

  // simultaneous mode
  roundIndex: number | null;
  roundDeadline: number | null;
  roundSubmissions: Record<SessionToken, { value: string; submittedAt: number } | null>;
  roundResubmits: Record<SessionToken, number>;

  // rps
  rpsRound: 1 | 2 | 3 | null;
  rpsPicks: Record<SessionToken, RPSPick | null>;

  // history
  guessLog: GuessLogEntry[];

  // end
  outcome: Outcome | null;
  endedAt: number | null;
};
```

## What never leaves the server

The serializer `toRoomStateView(state, recipientToken)` is the **only** function allowed to emit room state to a client. It enforces:

- `match.secrets[opponentToken]` is omitted entirely until `stage ∈ {ended, abandoned}`. The recipient's *own* secret is included as `yourSecret` so reconnection can restore the "Waiting for opponent…" screen with the locked value displayed.
- `match.rpsPicks[opponentToken]` is omitted until both picks are locked (then both revealed) or the RPS timer expires.
- `match.roundSubmissions[opponentToken].value` is omitted until the round timer expires; only the boolean `locked` is exposed.
- No internal timer-wheel handles, no Redis key names.

A unit-testable invariant: for any `state` with `stage ∈ {lobby, secrets, rps, playing}`, the JSON-serialized output of `toRoomStateView(state, recipient)` contains no substring of `state.match.secrets[opponentToken]`. This is the regression check that protects the no-secret-leak acceptance criterion.

## State machine — allowed transitions

```
                    cancel_room / creator_grace_expired
waiting  ─────────────────► (closed)
   │
   │  joiner committed
   ▼
 lobby  ──── joiner leaves / kicked / disconnect_grace ────► waiting
   │
   │  both ready
   ▼
secrets ──── any disconnect_grace expired ────► ended (forfeit)
   │  ─── secret submission timeout (60s) ───► ended (forfeit)
   │
   │  both secrets locked
   ▼
  ┌─ firstTurn == 'rps' ──► rps ──── tie x3 / timeout ─► playing
  │                          │
  │                          └── winner picked ─► playing
  │
  └─ playing ──── solved / forfeit / 3 strikes ────► ended
                  ──── both grace expired ─────────► abandoned
                  ──── secret submit timeout ──────► ended (forfeit)

ended  ──── rematch accepted ────► secrets   (reuses room, swap first-turn rule)
ended  ──── idle 10 min / both go home ────► (closed)
abandoned ── ttl 10 min ──► (closed)
```

Each transition is a named function in `transitions.ts`. Functions never read or write Redis directly — they take a `RoomState`, mutate, and return the new state plus a list of effects (broadcasts to emit, timers to schedule/clear). The caller (`store.ts`) acquires the lock, loads, applies the transition, saves, and dispatches effects.

```ts
// shape of every transition function
type TransitionResult = {
  next: RoomState;
  effects: Effect[];
};

type Effect =
  | { type: 'broadcast'; event: ServerEvent; payload: object; scope: 'room' | 'recipient'; recipient?: SessionToken }
  | { type: 'schedule_timer'; key: TimerKey; firesAt: number }
  | { type: 'clear_timer'; key: TimerKey }
  | { type: 'persist_match'; row: MatchInsert }
  | { type: 'close_room' };
```

## Timers

Timers are owned by the in-process timer wheel (an interval that scans next-firing keys) **and** mirrored to Redis as deadline timestamps. If the process restarts, on boot we read every room's deadlines from Redis and reschedule. The wheel never decides outcomes — it just enqueues a `tick` handler call that re-runs the transition with current time.

| Timer | Stored at | Duration | Pauses on | Effect on fire |
| --- | --- | --- | --- | --- |
| Creator-AFK grace | `room:{code}.disconnects[creatorToken]` | 5 min | — | Close room, free code |
| Lobby disconnect grace | `room:{code}.disconnects[playerToken]` | 60s | — | Joiner left → revert to waiting; creator left → close room |
| Secret submission | `room:{code}.match.secretDeadlines[playerToken]` | 60s | Disconnect | Forfeit; reveal opponent secret |
| RPS pick | `room:{code}.match.rpsDeadline` | 10s | Disconnect | Auto-assign random pick for whoever didn't pick |
| Turn timer (alt) | `room:{code}.match.turnDeadline` | per setting | Disconnect | +1 strike; pass turn; if strikes=3 → forfeit |
| Round timer (sim) | `room:{code}.match.roundDeadline` | per setting (default 60s if null) | Disconnect | Resolve round; reveal both guesses; advance |
| Disconnect grace (playing) | `room:{code}.disconnects[playerToken]` | 60s | — | Forfeit (or abandoned if both expired) |
| Post-match idle | `room:{code}` TTL | 10 min | — | Close room |

**Pause semantics**: when a player disconnects in `secrets`/`rps`/`playing`, their action-specific timer (secret deadline, RPS pick deadline, their own turn timer if active) is *paused* by recording `pausedAt` and clearing the wheel entry. On reconnect, we recompute `firesAt = now + (originalFiresAt - pausedAt)` and reschedule. The disconnect grace itself runs *while* the action timer is paused.

## Stage-by-stage state changes

### `waiting`

- Created by `POST /rooms`. `creator` populated, `joiner` is null.
- Allowed actions: `room:leave` (closes room), reconnect.
- Disconnect: 5-min creator grace. Expiry → close room, free code.

### `lobby`

- Both players present.
- Allowed actions: `room:toggle_ready`, `room:leave`, `room:kick_joiner` (creator only), emote.
- Transition `lobby → secrets` triggered when both `player.ready === true` in the same load.
- On any disconnect, the disconnecting player's `ready` is set to `false` (per requirement 01-rooms-and-lobby.md §"Lobby disconnect").

### `secrets`

- `match` is created (empty secrets), `secretDeadlines` set to `now + 60s` for each player.
- Allowed actions: `secret:submit`, emote, forfeit, reconnect.
- When the second secret is locked → transition to `rps` if `firstTurn === 'rps'`, else to `playing`.
- Secret submission timeout: when a player's `secretDeadline` fires and `secrets[token] == null`, end the match with `forfeit / secret_timeout`. Reveal the *other* player's secret on the result screen (per requirement).

### `rps`

- `rpsRound = 1`, `rpsPicks` cleared, `rpsDeadline = now + 10s`.
- Allowed actions: `rps:pick`, emote, forfeit, reconnect.
- When both picks are locked **or** timer fires (assign random for missing picks) → resolve.
- If tie and `rpsRound < 3` → bump round, clear picks, reset deadline.
- If still tied at round 3 → fall back to random first-turn selection.
- On winner determined → set `firstTurnPlayer`, transition to `playing`.

### `playing` (alternating)

- `turnIndex = 0`, `activeTurnPlayer = firstTurnPlayer`, `turnDeadline = now + turnTimeLimitSeconds` (or null).
- Allowed actions: `guess:submit` (only from active player), emote, forfeit, reconnect.
- On valid guess: append to log, score, broadcast `guess_submitted` + `result_calculated`.
  - If all-bulls → end match (winner = guesser, reason = `solved`).
  - Else flip `activeTurnPlayer`, reset `turnDeadline`, broadcast `turn_changed`.
- On timer fire (active player's turn): no log entry, strikes++ for active player, broadcast `timeout_strike`, flip turn.
  - If strikes === 3 → forfeit, opponent wins.

### `playing` (simultaneous)

- `roundIndex = 0`, `roundDeadline = now + (turnTimeLimitSeconds ?? 60)`, `roundSubmissions = { creator: null, joiner: null }`, `roundResubmits = { creator: 0, joiner: 0 }`.
- Allowed actions: `guess:submit` (either player, can re-submit until they pick a valid one or hit 20 resubmits), emote, forfeit, reconnect.
- A submission stores `{ value, submittedAt }` and broadcasts `guess_submitted` (just `{ playerToken, turnIndex }` — no value).
- **Round always runs the full timer.** When the timer fires:
  - Score each player's locked submission. Append both to the log in deterministic order (creator first, joiner second).
  - Broadcast `result_calculated` with both entries.
  - If both solved → outcome = draw.
  - If exactly one solved → that player wins.
  - If neither → both who didn't submit get a strike; check 3-strike forfeit; otherwise advance `roundIndex`, reset.

### `ended`

- `outcome` and `endedAt` set. Secrets remain in state (now safe to serialize).
- Allowed actions: `rematch:offer`, `rematch:respond`, emote, `room:leave`.
- Persistence effect: `INSERT` into `matches` table once on transition (idempotent — already-inserted rows are skipped).

### `abandoned`

- Reached when both players' disconnect graces expire without either reconnecting.
- `outcome.kind = 'abandoned'`. Secrets and guess log remain in Redis until TTL.
- Returning client gets the abandoned-result view; no `match_ended` event was ever delivered, so the client relies on `state:request` after reconnect to learn the outcome.

## Concurrency

Per `lock.ts`:
- `AsyncLock` (npm `async-lock`) keyed by room code.
- All transition functions are called inside `lock.acquire(code, async () => { … })`.
- Lock TTL ~5 seconds — any handler that takes longer is a bug.
- For horizontal scale: swap in `redlock` (or a single-key `SET … NX PX 5000` lock); no other code changes.

## Crash recovery on boot

`apps/server/src/rooms/store.ts` exposes `restoreAllTimers()` which is called once on boot:

1. `SCAN` for `room:{code}` keys.
2. For each room, load state, compute every "next firing" timestamp (turn, round, secret deadline, disconnect grace, post-match idle).
3. Re-arm the in-memory timer wheel with those timestamps.

This makes the timer wheel a derived cache — it can be lost and rebuilt at any time.

## Per-recipient projection

When the server needs to emit a state snapshot, it calls `toRoomStateView(state, recipientToken)`:

- Filters secrets as described in "What never leaves the server."
- Computes `secretDeadline` as `secretDeadlines[recipientToken]` (each player has their own).
- Includes `opponentSecretSubmitted: secrets[opponentToken] != null` (the boolean is safe).
- For RPS: includes `yourRPSPick = rpsPicks[recipientToken]` and `opponentRPSPickLocked = rpsPicks[opponentToken] != null`.

## Acceptance for phase 4

- [ ] Every state-changing path goes through `transitions.ts` (no socket handler mutates state directly).
- [ ] `toRoomStateView` is the single serializer used by every outbound state payload; no socket handler builds room payloads manually.
- [ ] The per-room lock serializes mutations within a single instance.
- [ ] All timer durations live in this phase's constants (or in `RoomSettings`) — never sprinkled across handlers.
- [ ] On process restart, `restoreAllTimers()` re-arms every active deadline from Redis.
- [ ] An invariant test confirms `JSON.stringify(toRoomStateView(state, recipient))` does not contain the opponent's secret while `stage ∈ {lobby, secrets, rps, playing}`.
