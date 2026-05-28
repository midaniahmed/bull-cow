# Phase 8: Frontend State (Zustand)

The client mirrors only what the server gives it. Stores are organized by concern, not by page — most pages read from multiple stores, and most stores outlive any single page mount.

```
apps/web/src/stores/
├── session.store.ts        # token + nickname + bootstrap status
├── connection.store.ts     # socket lifecycle + reconnection + tab status
├── room.store.ts           # the active room view (mirrors RoomStateView from phase 04)
├── emote.store.ts          # incoming emote toasts + mute toggle
├── rematch.store.ts        # head-to-head score + offer state
└── ui.store.ts             # global modal stack, snackbars, prefs (vibration on/off, etc.)

apps/web/src/socket/
├── client.ts               # io() instance, lifecycle wiring
├── subscriptions.ts        # one-place mapping of incoming events → store actions
└── emit.ts                 # typed wrappers around socket.emit with ack handling + nonce generation
```

## Why Zustand (not React Context)

React Context fans out every change to every subscriber under the provider — fine for static config, painful when the *room store* updates 30× per match. Zustand's selector-based subscription only re-renders components that read the selected slice, which is what we need when a single `guess_submitted` event mutates one entry in the log without touching unrelated UI.

## Store: `useSessionStore`

```ts
type SessionState = {
  status: 'unknown' | 'bootstrapping' | 'ready' | 'error';
  sessionToken: string | null;
  nickname: string | null;
  bootstrap: () => Promise<void>;       // calls POST /session on first contact
  setNickname: (nickname: string) => Promise<void>; // PATCH /session
};
```

- `bootstrap` reads `localStorage.bc_session_token` for an early hint; the cookie + `POST /session` is the authoritative path.
- `setNickname` does the optimistic update + rollback on failure.
- Persistence: localStorage via Zustand's `persist` middleware on `{ sessionToken, nickname }` only.

## Store: `useConnectionStore`

```ts
type ConnectionState = {
  socketStatus: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';
  reconnecting: boolean;
  attempt: number;
  tabStatus: 'active' | 'demoted';
  lastError: ErrorCode | null;
  connect: (roomCode?: string) => void;
  disconnect: () => void;
  reclaimTab: () => void;
};
```

- `connect(roomCode?)` opens the socket; passing a `roomCode` hints the server about intended room (so its `connection` handler can validate before the client emits anything).
- `tabStatus = 'demoted'` flips when `tab_demoted` arrives. UI hides action buttons and renders a reclaim banner.
- `reconnecting` drives the "reconnecting…" banner per requirement.

## Store: `useRoomStore`

```ts
type RoomState = {
  view: RoomStateView | null;          // null = not in a room
  yourToken: SessionToken | null;
  // selectors (memoized via shallow):
  stage: () => RoomStage | null;
  isCreator: () => boolean;
  opponent: () => PlayerPublic | null;
  yourTurn: () => boolean;
  turnTimeRemainingMs: () => number | null;
  secretTimeRemainingMs: () => number | null;
  // actions:
  applyState: (view: RoomStateView) => void;
  applyEvent: (event: ServerEvent, payload: unknown) => void;
};
```

- `applyState` replaces the view wholesale (used on reconnect, rematch start, `state:request` ack).
- `applyEvent` does targeted mutations per incoming server event (avoids re-rendering the entire tree for a single guess).
- Selectors are exported as named hooks (`useStage`, `useYourTurn`, etc.) so components can subscribe to one field.

### Socket → store wiring

The single registration point is `socket/subscriptions.ts`. It receives `socket` and the store API and wires:

| Server event | Action |
| --- | --- |
| `room_created` | `applyEvent('room_created', …)` — only the creator path |
| `room_joined` | `applyEvent('room_joined', …)` |
| `player_ready` | `applyEvent('player_ready', …)` |
| `match_started` | `applyEvent('match_started', …)` |
| `secret_locked` | `applyEvent('secret_locked', …)` |
| `rps_picked`/`rps_resolved` | `applyEvent(…)` |
| `guess_submitted` | `applyEvent('guess_submitted', …)` — toggles "locked in" in simultaneous mode |
| `result_calculated` | `applyEvent('result_calculated', …)` — appends to log |
| `turn_changed` | `applyEvent('turn_changed', …)` |
| `timeout_strike` | `applyEvent('timeout_strike', …)` + nudge UI (vibration hook fires elsewhere) |
| `forfeit_declared` | `applyEvent('forfeit_declared', …)` |
| `match_ended` | `applyEvent('match_ended', …)` — sets `view.endedView` and clears action timers |
| `player_disconnected`/`reconnected` | `applyEvent(…)` — flips `player.connected`, updates banner |
| `room_state` | `applyState(payload)` — wholesale replace |
| `room_closed` | `applyEvent('room_closed', …)` then navigate Home (via router push action) |
| `rematch_offered`/`accepted`/`declined` | hands off to `rematchStore.applyEvent` |
| `emote_sent` | hands off to `emoteStore.push` |
| `tab_demoted` | `connectionStore.setTabStatus('demoted')` |

`emit.ts` exports typed wrappers:

```ts
emit.guessSubmit(value: string): Promise<AckResult>
emit.toggleReady(ready: boolean): Promise<AckResult>
// …one per client→server event
```

Each generates a fresh nonce (`crypto.randomUUID()`), times out at 5s, and surfaces ack errors as toasts via `uiStore`.

## Store: `useEmoteStore`

```ts
type EmoteState = {
  incoming: { id: string; fromToken: SessionToken; code: EmoteCode; expiresAt: number }[];
  mutedRooms: Set<RoomCode>;
  push: (payload: EmoteSentPayload, currentRoom: RoomCode) => void;
  toggleMute: (roomCode: RoomCode) => void;
};
```

- `push` drops the emote if the current room is muted (per-requirement client-side filter — the server still delivered it).
- Items auto-expire 3 seconds after arrival; a tick interval prunes the list.
- `mutedRooms` is also sent to the server via `mute:toggle` for cross-tab continuity.

## Store: `useRematchStore`

```ts
type RematchState = {
  yourOffer: 'idle' | 'offered' | 'declined' | 'expired';
  opponentOffered: boolean;
  headToHead: HeadToHead | null;
  reset: () => void;
  applyEvent: (event: ServerEvent, payload: unknown) => void;
  offer: () => Promise<void>;
  accept: () => Promise<void>;
  decline: () => Promise<void>;
};
```

- Separated from `useRoomStore` because the offer/decline interaction has its own UI loop that lives across the `ended → secrets` transition for the next match.
- `headToHead` is populated from `match_ended.rematchScore` and updated on each completed rematch.

## Store: `useUiStore`

```ts
type UiState = {
  modals: ModalDescriptor[];
  snackbars: Snackbar[];
  vibrationEnabled: boolean;
  wakeLockEnabled: boolean;     // user toggle
  pushModal/popModal/…
  showSnackbar/dismissSnackbar/…
};
```

- Modals and snackbars are stacked so multiple flows don't fight over the screen.
- Vibration/wake-lock toggles persist via Zustand `persist` (localStorage).

## Lifecycle hooks (driven by stores)

| Trigger | Action |
| --- | --- |
| App boot | `sessionStore.bootstrap()` → if `ready`, `connectionStore.connect()`; the socket may pull state if a room is implied by URL |
| Route enter `/room/:code` | If not connected to that room → `connection.connect(code)`; on connect → `emit.stateRequest()` if no `room_state` arrived yet |
| Socket disconnect | `connectionStore` flips to `'disconnected'`; UI shows reconnect banner; backoff retry triggers `connect(...)` |
| Socket reconnect | `emit.stateRequest()` → `applyState(view)` |
| `tab_demoted` | `connectionStore.tabStatus = 'demoted'`; UI shows reclaim banner |
| `room_closed` | Navigate to `/home` with a toast that explains the reason |

## Persistence rules

- **`persist`** (localStorage): session token & nickname, vibration/wake-lock prefs, muted rooms set.
- **Memory only**: room view, emote toasts, rematch state, connection state. All re-derived after reload via `state:request`.

## Acceptance for phase 8

- [ ] Each store has a single, narrow responsibility — no overlapping fields between stores.
- [ ] All incoming events route through `socket/subscriptions.ts`; no component subscribes to `socket.on(...)` directly.
- [ ] All outgoing events go through `socket/emit.ts`; every wrapper generates a nonce and handles ack errors.
- [ ] Selectors are exported as hooks so components subscribe to slices, not the whole store.
- [ ] The room view is wholesale-replaced on `room_state`/reconnect (no merge logic mutating partial fields).
