# Phase 11: Custom Hooks

Hooks own the "live behavior" of the client: timers, browser APIs, lifecycle, derived data. Each is small, single-purpose, and falls back gracefully when a browser API isn't available (iOS Safari lacks the Vibration API, etc.).

```
apps/web/src/hooks/
├── use-socket.ts
├── use-session.ts
├── use-room.ts            # convenience selectors over roomStore
├── use-stage.ts
├── use-your-turn.ts
├── use-turn-timer.ts
├── use-secret-timer.ts
├── use-wake-lock.ts
├── use-vibration.ts
├── use-page-visibility.ts
├── use-tab-claim.ts
├── use-emote-rate-limit.ts
├── use-nonce.ts
├── use-clipboard.ts
├── use-reconnect.ts
├── use-disconnect-grace.ts
└── use-head-to-head.ts
```

## `useSocket()`

- Returns the singleton socket from `socket/client.ts`.
- Triggers `connectionStore.connect()` on mount if there's a room to join (per URL) and the session is ready.
- Cleans up listeners on unmount only when the component owns them (most listeners live in `socket/subscriptions.ts`).

## `useSession()`

- Reads `sessionStore` and ensures bootstrap has run.
- Returns `{ status, sessionToken, nickname, setNickname }`.

## `useRoom()`

- Convenience: returns `roomStore.view` with a stable identity per view object.
- Designed for components that need many fields; otherwise prefer one of the narrower hooks below.

## `useStage()` / `useYourTurn()` / `useOpponent()` / `useIsCreator()`

- Single-slice selectors. Re-render only when the selected slice changes.
- These exist because *most* components only care about one field; using `useRoom()` for them would trigger unnecessary re-renders.

## `useTurnTimer()`

- Reads `view.match.turnDeadline` and `view.match.activePlayer`.
- Returns `{ remainingMs, paused, total }`.
- `paused` is true when the active player is disconnected (their disconnect-grace key is set in state). Triggers a `<Countdown paused>` to freeze.
- Implementation:
  - Owns a `requestAnimationFrame` loop while the timer is active.
  - Stops the loop on stage change or when `remainingMs <= 0`.

## `useSecretTimer()`

- Same shape, but reads `view.match.secretDeadline` (per-player) and is meaningful only in `stage === 'secrets'`.
- Pauses when the **owner of the deadline** disconnects (i.e., the running deadline is mine; if I'm disconnected the timer pauses on the server side too, so my reconnected client sees a fresh `deadline` that already accounts for the pause).

## `useWakeLock(active: boolean)`

- Acquires a screen wake lock from `navigator.wakeLock` when `active=true`.
- Releases on `active=false`, on unmount, or on Page Visibility loss.
- Re-acquires automatically when visibility returns and the consumer is still asking for `active=true`.
- Honors `uiStore.wakeLockEnabled` (user toggle) and silently no-ops on browsers without the API.

Use in `<AlternatingPlay>` when `useYourTurn() === true` and in `<SimultaneousPlay>` while a round is active and the player hasn't submitted yet.

## `useVibration()`

- Returns a stable `vibrate(pattern: number[] | number)` function.
- Drops to a no-op on platforms without `navigator.vibrate`.
- Honors `uiStore.vibrationEnabled` (default off in lobby, on during a match — settable by the user).
- Used by:
  - `<TurnIndicator>` on transition to your turn.
  - `<EmoteToastLayer>` when an emote arrives (very short pulse).
  - `<ResultView>` on win/loss (distinct patterns).

## `usePageVisibility()`

- Subscribes to `document.visibilitychange`. Returns `{ visible: boolean, lastVisibleAt: number, lastHiddenAt: number }`.
- Used by `useReconnect` (to attempt reconnect on regain) and `useWakeLock` (release on hidden).

## `useTabClaim()`

- Maintains the local `tabId` and reconciles with `session:{token}:tab` via a 25s heartbeat (`emit.stateRequest()` doubles as the heartbeat; the ack confirms our tab is still authoritative).
- Triggers `connectionStore.setTabStatus('demoted')` when a heartbeat ack signals our tab no longer matches.
- Exposes `reclaim()` which calls `emit.reclaimTab()`.

## `useEmoteRateLimit()`

- Tracks the last 5 sends locally to mirror the server's window.
- Returns `{ remaining, resetsAt, canSend }`.
- Used by `<EmotePanel>` to disable buttons proactively (the server still enforces).

## `useNonce()`

- Returns a stable function that yields `crypto.randomUUID()`. Wrapped as a hook for testability (test can swap in a deterministic generator).

## `useClipboard()`

- Wraps `navigator.clipboard.writeText` with a graceful fallback to a hidden `<textarea>` + `execCommand('copy')`.
- Returns `{ copy(text), lastCopied, lastCopiedAt }` so the UI can render a brief "Copied!" pill without local state.

## `useReconnect()`

- Owns the reconnect attempt loop when the socket disconnects.
- Backoff: 1s, 2s, 4s, 8s, capped at 8s, indefinite (the 60s grace is server-side; the client never gives up trying).
- On regain, requests `emit.stateRequest()` to restore state.
- Listens to `usePageVisibility` and aggressively reconnects on visibility regain (mobile browsers kill sockets when backgrounded).

## `useDisconnectGrace()`

- Reads `opponent.connected` and `opponent.disconnectGraceEndsAt`.
- Returns `{ active, remainingMs }` for the `<DisconnectBanner>`.

## `useHeadToHead()`

- Reads `rematchStore.headToHead` and derives `{ creator: wins, joiner: wins, draws }` along with `yourWins` based on which side the current session is.

## Notes

- Hooks that own intervals/RAF loops must clean up on unmount — every one of them does this. The mobile play screen will spend extended time on the timer hooks; leaks would compound.
- No hook reads from the socket directly except `useSocket` itself. All event-driven updates flow through `socket/subscriptions.ts` → stores → hooks.
- Hooks live in `apps/web/src/hooks/`. Each is its own file, named `use-<thing>.ts`, default-export-free (named export only) so they're greppable.

## Acceptance for phase 11

- [ ] Every hook is small (≤ ~80 lines) and single-purpose.
- [ ] Browser-API-dependent hooks (`useWakeLock`, `useVibration`, `useClipboard`) feature-detect and no-op on unsupported platforms.
- [ ] `useTurnTimer` and `useSecretTimer` use `requestAnimationFrame`, not `setInterval`, to keep rendering smooth.
- [ ] `useReconnect` survives visibility transitions and triggers `stateRequest` on every regain.
- [ ] `useTabClaim` uses the existing `state:request` heartbeat — no new socket event.
