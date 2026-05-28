# Phase 1: Shared Contracts (`packages/shared`)

The contracts here are the single source of truth for both `apps/server` and `apps/web`. The server re-validates every payload regardless — these schemas exist to keep both sides in lock-step and to prevent client-side drift.

## Layout

```
packages/shared/src/
├── events/                # socket event name constants + payload type maps
│   ├── server-to-client.ts
│   ├── client-to-server.ts
│   └── index.ts
├── schemas/               # Zod schemas (runtime validation)
│   ├── primitives.ts      # session token, nickname, room code, nonce
│   ├── settings.ts        # room settings + refinements
│   ├── number.ts          # secret/guess (rules-aware factory)
│   ├── rps.ts             # RPS pick enum
│   ├── emote.ts           # emote code enum
│   └── index.ts
├── types/                 # shared enums and unions
│   ├── stages.ts
│   ├── outcome.ts
│   └── index.ts
└── game/                  # see phase 03 — pure logic
```

## Shared types / enums

- **`RoomStage`** — `'waiting' | 'lobby' | 'secrets' | 'rps' | 'playing' | 'ended' | 'abandoned'`
- **`TurnSystem`** — `'alternating' | 'simultaneous'`
- **`FirstTurnRule`** — `'rps' | 'random' | 'creator' | 'joiner'`
- **`RPSPick`** — `'rock' | 'paper' | 'scissors'`
- **`Emote`** — `'gg' | 'nice' | 'thinking' | 'wow' | 'oops' | 'well_played'` (codes are stable; icons/labels are presentation)
- **`OutcomeKind`** — `'winner' | 'draw' | 'abandoned'`
- **`Outcome`** — discriminated union:
  - `{ kind: 'winner'; winner: SessionToken; reason: 'solved' | 'forfeit' | 'timeout_3x' | 'secret_timeout' | 'disconnect_grace' }`
  - `{ kind: 'draw'; reason: 'both_solved_same_round' }`
  - `{ kind: 'abandoned' }`
- **`PlayerRole`** — `'creator' | 'joiner'`
- **`Ready`** — `boolean`

## Zod schemas (primitives)

- **`SessionTokenSchema`** — opaque string, fixed length (e.g., 32 chars URL-safe). Validation only checks shape, not authenticity.
- **`NicknameSchema`** — string; trimmed length 2–20; charset `/^[a-zA-Z0-9 ._-]+$/`.
- **`RoomCodeSchema`** — exact 6 chars from `/^[A-HJ-KM-NP-Z2-9]+$/` (excludes `0`, `O`, `1`, `I`, `L`). Lowercase auto-uppercased before parse on client; server rejects non-canonical input.
- **`NonceSchema`** — UUIDv4 (client-generated per mutating action).
- **`TimestampSchema`** — ISO-8601 string emitted by the server; the server never trusts client clocks.

## Zod schemas (settings)

- **`NumberRulesSchema`** — `{ length: int 3..10, allowDuplicateDigits: boolean, allowLeadingZero: boolean }` with refinement:
  - If `allowDuplicateDigits=false` and `allowLeadingZero=false`, the available digit pool is 9 (`1..9`) — reject `length > 9`.
  - If `allowDuplicateDigits=false` and `allowLeadingZero=true`, the pool is 10 — `length` up to 10 is allowed.
  - If `allowDuplicateDigits=true`, any `length` in 3..10 is allowed.
- **`MatchRulesSchema`** — `{ turnSystem: TurnSystem, firstTurn: FirstTurnRule, turnTimeLimitSeconds: 10|20|30|60|null }`.
- **`AdvancedRulesSchema`** — `{ fogMode: boolean }`.
- **`RoomSettingsSchema`** — composition of the three; this is what the create-room HTTP payload uses.

## Zod schemas (number factory)

The secret/guess schema depends on the active room's number rules, so it is a **factory**:

```ts
makeNumberSchema(rules: NumberRules): ZodString
```

The factory returns a Zod string with:
- exact length
- digit-only charset
- duplicate rule via `.refine(allDigitsUnique, …)` when `allowDuplicateDigits=false`
- leading-zero rule via `.refine(notLeadingZero, …)` when `allowLeadingZero=false`

Both the server and client build this schema lazily once per room (rules are immutable after creation).

## Zod schemas (RPS / emote)

- **`RPSPickSchema`** — z.enum of `RPSPick`.
- **`EmoteCodeSchema`** — z.enum of `Emote` codes.

## Socket events — client → server

Every payload includes `{ nonce: NonceSchema }` for dedup. Acks are server-issued and shaped per-event.

| Event | Payload schema | Ack shape | Valid stages | Auth |
| --- | --- | --- | --- | --- |
| `room:leave` | `{ nonce }` | `{ ok: true } \| ErrorAck` | `waiting`–`playing` | session token |
| `room:kick_joiner` | `{ nonce }` | `{ ok: true } \| ErrorAck` | `lobby` | creator only |
| `room:toggle_ready` | `{ nonce, ready: boolean }` | `{ ok: true, ready: boolean } \| ErrorAck` | `lobby` | room member |
| `room:reclaim_tab` | `{ nonce }` | `{ ok: true } \| ErrorAck` | any | session token |
| `secret:submit` | `{ nonce, value: string }` | `{ ok: true } \| ErrorAck` | `secrets` | room member, not yet locked |
| `rps:pick` | `{ nonce, pick: RPSPick }` | `{ ok: true } \| ErrorAck` | `rps` | room member, not yet locked |
| `guess:submit` | `{ nonce, value: string }` | `{ ok: true } \| ErrorAck` | `playing` | active turn (alt) / current round not exceeded (sim) |
| `forfeit` | `{ nonce }` | `{ ok: true } \| ErrorAck` | `playing`, `secrets`, `rps` | room member |
| `emote:send` | `{ nonce, code: EmoteCode }` | `{ ok: true } \| ErrorAck` | `lobby`–`ended` | room member, rate-limit OK |
| `mute:toggle` | `{ nonce, muted: boolean }` | `{ ok: true } \| ErrorAck` | any | session token (room-scoped) |
| `rematch:offer` | `{ nonce }` | `{ ok: true } \| ErrorAck` | `ended` | room member |
| `rematch:respond` | `{ nonce, accept: boolean }` | `{ ok: true } \| ErrorAck` | `ended` | room member, opponent has offered |
| `state:request` | `{ nonce }` | `{ ok: true, state: RoomStateView } \| ErrorAck` | any | room member; used after reconnect |

`ErrorAck` shape: `{ ok: false; code: ErrorCode; message: string; field?: string }`.

## Socket events — server → client

Existing event names from the spec (stable, **do not rename**):
`room_created`, `room_joined`, `player_ready`, `match_started`, `guess_submitted`, `result_calculated`, `turn_changed`, `match_ended`.

Added in this requirements set:
`secret_locked`, `player_disconnected`, `player_reconnected`, `emote_sent`, `forfeit_declared`, `timeout_strike`, `rematch_offered`, `rematch_accepted`, `rematch_declined`, `rps_picked`, `rps_resolved`, `room_closed`.

Two more we need internally (not in the spec but implied by the requirements):
- `tab_demoted` — sent to the previous tab when a new tab claims the room. Payload `{ reason: 'newer_tab_connected' }`. The receiving tab goes read-only.
- `room_state` — full snapshot pushed on reconnect or in response to `state:request`. Payload `RoomStateView` (defined below).

### Payload schemas

| Event | Payload |
| --- | --- |
| `room_created` | `{ room: RoomPublic; you: PlayerPublic }` (only the creator receives it) |
| `room_joined` | `{ room: RoomPublic; joiner: PlayerPublic }` |
| `player_ready` | `{ playerToken: SessionToken; ready: boolean }` |
| `match_started` | `{ firstTurnPlayer: SessionToken; turnSystem: TurnSystem; turnTimeLimitSeconds: number \| null; startedAt: Timestamp }` |
| `secret_locked` | `{ playerToken: SessionToken }` (no secret value) |
| `rps_picked` | `{ playerToken: SessionToken }` (no pick value) |
| `rps_resolved` | `{ picks: Record<SessionToken, RPSPick>; winner: SessionToken \| 'tie'; round: 1\|2\|3; willReplay: boolean }` |
| `guess_submitted` | `{ playerToken: SessionToken; turnIndex: number }` (no value yet — used in simultaneous mode to flip "locked in" status) |
| `result_calculated` | `{ entries: GuessLogEntry[]; turnIndex: number }` — one entry in alternating mode, two in simultaneous mode (revealed together at round end) |
| `turn_changed` | `{ activePlayer: SessionToken \| null; turnIndex: number; turnDeadline: Timestamp \| null }` — `activePlayer` is `null` in simultaneous mode (rounds, not turns) |
| `timeout_strike` | `{ playerToken: SessionToken; strikes: 1\|2\|3 }` |
| `forfeit_declared` | `{ playerToken: SessionToken; reason: 'voluntary' \| 'timeout_3x' \| 'secret_timeout' \| 'disconnect_grace' }` |
| `match_ended` | `{ outcome: Outcome; secrets: Record<SessionToken, string>; guessLog: GuessLogEntry[]; stats: MatchStats; rematchScore: HeadToHead }` |
| `player_disconnected` | `{ playerToken: SessionToken; graceRemainingSeconds: number; graceEndsAt: Timestamp }` |
| `player_reconnected` | `{ playerToken: SessionToken }` |
| `emote_sent` | `{ fromToken: SessionToken; code: EmoteCode; sentAt: Timestamp }` |
| `rematch_offered` | `{ fromToken: SessionToken }` |
| `rematch_accepted` | `{ newMatch: MatchInitView }` — triggers transition back to `secrets` |
| `rematch_declined` | `{ fromToken: SessionToken }` |
| `tab_demoted` | `{ reason: 'newer_tab_connected' }` |
| `room_state` | `RoomStateView` (full snapshot — see below) |
| `room_closed` | `{ reason: 'creator_left_waiting' \| 'creator_left_lobby' \| 'abandoned' \| 'idle_post_match' }` |

### View shapes (server-controlled, opponent-secret-safe)

```ts
// Public room shell — same for both players, never contains secrets
RoomPublic = {
  code: RoomCode;
  stage: RoomStage;
  settings: RoomSettings;
  players: {
    creator: PlayerPublic;
    joiner: PlayerPublic | null;
  };
  createdAt: Timestamp;
}

PlayerPublic = {
  sessionToken: SessionToken;     // visible — used as a stable id, not a secret
  nickname: string;
  connected: boolean;
  ready: boolean;
  strikes: 0|1|2|3;
}

GuessLogEntry = {
  playerToken: SessionToken;
  value: string;                  // visible — guesses are public, secrets are not
  bulls: number;
  cows: number;
  turnIndex: number;              // alternating mode
  roundIndex?: number;            // simultaneous mode
  submittedAt: Timestamp;
}

// Full snapshot the server emits on reconnect or via state:request.
// Filtered per-recipient: `yourSecret` is included for THE RECIPIENT only;
// `opponentSecret` is omitted until stage is `ended` or `abandoned`.
RoomStateView = {
  room: RoomPublic;
  match: {
    yourSecret: string | null;          // null if you haven't submitted yet, never the opponent's
    opponentSecretSubmitted: boolean;
    guessLog: GuessLogEntry[];
    activePlayer: SessionToken | null;
    turnIndex: number;
    roundIndex?: number;                 // simultaneous
    turnDeadline: Timestamp | null;
    secretDeadline: Timestamp | null;    // remaining secret-submission window
    rpsRound?: 1|2|3;
    yourRPSPick?: RPSPick | null;
    opponentRPSPickLocked?: boolean;
  } | null;
  endedView?: {
    outcome: Outcome;
    secrets: Record<SessionToken, string>;
    rematchScore: HeadToHead;
  };
}

MatchStats = {
  perPlayer: Record<SessionToken, {
    turnsTaken: number;
    totalGuessTimeMs: number;
  }>;
}

HeadToHead = {
  matches: Array<{ winner: SessionToken | null; endedAt: Timestamp }>;
  // derived: wins[creator], wins[joiner], draws
}

MatchInitView = {
  firstTurnPlayer: SessionToken | null;   // null when rule = rps (resolved later)
  firstTurnRule: FirstTurnRule;            // post-swap value for the rematch
}
```

## Error codes

A single `ErrorCode` enum imported by both sides drives error-handling UI:

`session_invalid`, `nickname_invalid`, `room_not_found`, `room_full`, `room_in_progress`, `room_ended`, `room_already_member`, `room_other_active`, `settings_invalid`, `secret_invalid`, `secret_already_locked`, `guess_invalid`, `not_your_turn`, `rps_invalid`, `rps_already_locked`, `emote_rate_limited`, `submit_rate_limited`, `msg_rate_limited`, `nonce_replay`, `forbidden`, `tab_not_active`, `bad_stage`, `internal`.

## Stability notes

- Event names that came from the original spec (`room_created` … `match_ended`) **must remain stable** — they are the public client/server contract.
- Added events use the same `lower_snake` naming style. Inbound client events use a namespaced colon style (`room:leave`, `guess:submit`) — they're not part of the original spec's public list, so the convention is internal-only.
- Once shipped, payload fields can only be added, never removed or renamed, without a coordinated client/server release.

## Acceptance for phase 1

- [ ] All schemas live in `packages/shared` and are imported (not duplicated) by `apps/server` and `apps/web`.
- [ ] Server has a single Zod parse call at the entry of every socket handler (no ad-hoc validation).
- [ ] No outbound event payload contains the opponent's secret while the room is in `lobby`, `secrets`, `rps`, or `playing`.
- [ ] `RoomStateView` is computed per-recipient (the "you/your" fields are recipient-scoped).
