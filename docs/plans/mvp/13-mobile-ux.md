# Phase 13: Mobile UX

The MVP is mobile-first because that's where two-people-around-a-table-share-a-QR-code play happens. Desktop is a fallback that should still work without breaking, but every screen is designed for one-handed reach on a 5"–6.7" phone in portrait.

## Viewport & layout

- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` — `viewport-fit=cover` lets us draw under the iOS notch / home-indicator area so we can paint our own safe-area padding rather than getting the white default bars.
- Root containers use `min-height: 100dvh` (dynamic viewport height), not `100vh` — Safari's address bar collapses on scroll, and `100vh` would overflow until then. `100dvh` is the right unit for any "fills the screen" container.
- `<AppShell>` adds:
  - `padding-top: env(safe-area-inset-top)` on the header
  - `padding-bottom: env(safe-area-inset-bottom)` on the bottom strip (emote panel, primary CTAs)
  - `padding-left` / `padding-right` for landscape notches
- Tailwind: a project plugin exposes utility classes (`pt-safe`, `pb-safe`, etc.) so we don't hand-write `env(...)` in every file.

## One-handed reach

- **Primary CTAs in the lower half of the viewport.** Submit Guess, Submit Secret, Rematch, Forfeit, RPS picks — all live within thumb reach. The top half is for read-only context (room code, turn indicator, opponent state).
- Modals slide up from the bottom on `< 480 px`. The action buttons are in the bottom of the modal, not at the top.
- The Forfeit button is in the upper area of the play screen *deliberately* — it should be an intentional reach, not a one-thumb tap.

## Tap targets

- All buttons: ≥ 44 × 44 px (Apple HIG). Achieved by `<Button>` minimums in phase 10.
- `touch-action: manipulation` on all interactive elements to disable the 300ms double-tap zoom delay.
- Spacing between adjacent buttons: ≥ 8 px so big fingers don't hit the wrong one.

## Inputs (numeric keypad)

Covered in phase 12 but worth restating at the cross-cutting level:

- `inputMode="numeric"` + `pattern="[0-9]*"` on every digit input. iOS Safari and Android Chrome both honor this.
- `type="text"` (not `"number"`) — `number` permits decimals, exponents, and scroll-changes-value, all of which break things.
- `enterKeyHint="send"` so the iOS keyboard's return key reads "send" instead of "return."
- No `autoFocus` on inputs that load before the user has read the screen (room code, settings form). The secret/guess inputs auto-focus because the player has been waiting on them.

## Sensory feedback

### Wake Lock
- `useWakeLock(active)` (phase 11) holds a screen wake lock during:
  - The player's own active turn in alternating mode.
  - An active simultaneous round where the player hasn't yet submitted.
  - Active RPS pick (10s window).
- Released immediately when the condition flips or on tab hide.
- Honors `uiStore.wakeLockEnabled` and silently no-ops on browsers without `navigator.wakeLock`.

### Vibration
- `useVibration().vibrate(pattern)` (phase 11) fires:
  - `[20]` — short tap when an emote arrives.
  - `[60]` — slightly stronger when your turn begins (alternating) or round opens (simultaneous).
  - `[40, 60, 40]` — distinct pattern on win.
  - `[100]` — single long pulse on loss / forfeit.
- Default state: **off** in lobby (avoid surprise), **on** during a match (with a `<MuteVibration>` toggle in the play screen). User preference persists across sessions via `uiStore`.
- iOS Safari has no Vibration API → all calls no-op silently.

## PWA

- `vite-plugin-pwa` configured with:
  - `name: 'Bulls & Cows'`, `short_name: 'B&C'`
  - `theme_color`: matches the in-game palette (final value owned by design).
  - `background_color`: same dark/light value as the splash.
  - Icons: 192 px and 512 px (with `purpose: 'any maskable'`).
  - `display: 'standalone'`
  - `start_url: '/'`
- **Service worker scope**: precache the app shell (`index.html`, JS/CSS, fonts, icons). **Do not** attempt offline gameplay — the server is authoritative; play without a socket is impossible by design.
- **Install prompt**: surface after the first completed match (the user has demonstrated intent), never on landing. Show as a snackbar with "Install for next time?" + an Install button that fires the saved `beforeinstallprompt` event. Once dismissed, don't show again for that session.

## Orientation

- Portrait-locked feel — landscape works but isn't designed for. The play screen lays out vertically; in landscape, the same vertical layout sits in a centered column with whitespace on either side.
- No `screen.orientation.lock()` calls (these only work in fullscreen-PWA contexts and have spotty support).

## Network resilience

- `<ReconnectingBanner>` (phase 10) visible during socket retry. Visible immediately on disconnect; doesn't wait for "X seconds without connection."
- On visibility regain (`usePageVisibility`), `useReconnect` aggressively re-opens the socket — mobile browsers terminate sockets when backgrounded, and a stale-feeling reconnect kills the experience.
- The grace timers (60s for action stages) match the typical mobile background-kill window comfortably.
- Optimistic UI is allowed for: emote send (the toast may revert if the ack errors), Ready toggle. **Never** for guesses, RPS picks, or secrets — the server is authoritative and the wait is short.

## Performance budget (mobile)

- Initial JS payload: < 200 KB gzipped. Achievable with Vite's automatic code-splitting + tree-shaking of Framer Motion (import only what's used) + Tailwind purge.
- Time-to-interactive on a mid-range Android < 3s on a typical home connection.
- The play screen renders ≤ 12 elements that update per frame during the active turn (digit cells, timer, indicators). Anything heavier needs profiling before shipping.

## Accessibility (mobile-relevant subset)

- Color contrast meets WCAG AA for text on the chosen palette.
- `aria-live="polite"` on the turn indicator and on incoming emote toasts so screen readers announce changes.
- All buttons have accessible labels (icon-only buttons use `aria-label`).
- Inputs have associated `<label>`s; visible only when meaningful for sighted users (e.g., the nickname field).

## What we explicitly do NOT do in MVP

- No service worker push notifications. Re-engagement is the host's job, not the SW's.
- No offline mode. The game requires the server.
- No native app wrappers (Capacitor, etc.).
- No haptics tuning beyond the Vibration API.

## Acceptance for phase 13

- [ ] Every full-height container uses `100dvh`, not `100vh`.
- [ ] Safe-area padding is applied at `<AppShell>` via `env(safe-area-inset-*)`.
- [ ] All digit/code inputs trigger the numeric/alphanumeric keypad on iOS Safari and Android Chrome.
- [ ] Wake lock is acquired during the active-turn window and released on stage exit / tab hide.
- [ ] Vibration is off by default in lobby; user-controllable in the play screen; no-ops on iOS Safari.
- [ ] The PWA manifest is in place; the install prompt fires after the first completed match, not before.
- [ ] The reconnecting banner appears immediately on disconnect and clears on socket open + `state:request` ack.
