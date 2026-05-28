# Phase 10: Components

Component inventory grouped by where they live. Inputs are in phase 12; this phase is everything else. The list aims at the *whole MVP UI* — most components are short, single-purpose, and read one or two slices of state.

```
apps/web/src/components/
├── primitives/         # Button, IconButton, Card, Modal, Snackbar, …
├── layout/             # AppShell pieces
├── room/               # Room-stage sub-views and their children
├── play/               # Play screen pieces (alternating + simultaneous)
├── emote/              # EmotePanel, EmoteToastLayer, MuteToggle
├── result/             # Result screen pieces
├── nickname/           # NicknamePrompt
├── settings/           # SettingsForm + sub-groups
├── presence/           # DisconnectBanner, ReclaimTabBanner, ReconnectingBanner
└── share/              # RoomCodeDisplay, CopyButton, QRCodeTile
```

All components are functional, typed, and read from Zustand selector hooks (no prop-drilled global state). Animations use Framer Motion only where motion adds clarity (reveal, toast, banner enter/exit) — not for hover effects.

## Primitives

### `<Button>`
- Sizes: `lg` (primary CTA, ≥48 px tall), `md` (default, 44 px), `sm` (32 px, secondary).
- States: idle, loading (spinner inline), disabled, destructive (red).
- `touch-action: manipulation` and 12 px minimum horizontal padding for tap reliability.

### `<IconButton>`
- 44 px square minimum. ARIA-labeled. Used for copy, mute, close, kick.

### `<Card>`
- Wrapper with rounded corners, border, subtle shadow. Used for settings groups, result panels, preview info.

### `<Modal>`
- Full-screen on narrow viewports (`< 480px`); centered card on wider. Locks scroll. Closeable via X, ESC, scrim tap.
- Mounted into `<ModalPortal>` from `useUiStore`.

### `<Snackbar>`
- Non-blocking, bottom-of-screen. Auto-dismiss 4s. Stacked up to 3.

### `<ConfirmationModal>`
- Two-button: Confirm / Cancel. Used for Forfeit, Kick, Leave Room, Leave Current Room.

### `<Countdown>`
- Props: `endsAt: number | null`, `paused: boolean`, `format: 'mm:ss' | 'ss' | 'percent'`.
- Re-renders ~5×/s. Reads `Date.now()` directly — no store subscription required.
- When `paused === true`, freezes the displayed value.

### `<Avatar>`
- Initials in a colored circle (deterministic color from session token hash). 36 / 48 / 64 px sizes.

### `<NicknameTag>`
- `<Avatar>` + nickname text + "You" badge if `sessionToken === yourToken`. Used everywhere a player is named.

## Layout

### `<AppShell>`
- Top bar: brand / room code / connection status pill.
- Main slot: route outlet.
- Bottom safe-area padding via `env(safe-area-inset-bottom)`.
- Mounts `<ModalPortal>`, `<SnackbarLayer>`, `<ReconnectingBanner>`.

### `<ReconnectingBanner>`
- Sticky bottom banner visible while `connectionStore.socketStatus === 'disconnected' || reconnecting`.
- Shows "Reconnecting… (attempt N)" with a retry-now button after attempt ≥ 3.

## Room sub-views (rendered by `<RoomPage>` per stage)

### `<RoomPreviewView>`
- Reads the HTTP preview response, not the socket view (no commit yet).
- Children: `<NicknameTag>` (creator), `<SettingsSummary>`, `<Button lg>` Join Match, `<Button md secondary>` Cancel.

### `<EmptyLobbyView>` (stage = `waiting`, creator only)
- `<RoomCodeDisplay>` — large, monospaced, single tap to copy.
- `<CopyLinkButton>` — copies `${window.location.origin}/room/${code}`.
- `<QRCodeTile>` — renders the join URL via `react-qr-code`. Tappable to expand to full-screen for in-person sharing.
- `<SettingsSummary>` collapsible.
- "Waiting for opponent…" pill with subtle pulse.
- `<Button md destructive>` Cancel Room → opens `<ConfirmationModal>`.

### `<LobbyView>` (stage = `lobby`)
- Two `<NicknameTag>` rows with `<ReadyToggle>` next to each.
- `<SettingsSummary>` read-only.
- Creator: `<Button sm destructive>` Kick (opens confirmation).
- Joiner: `<Button sm secondary>` Leave Room (opens confirmation).

### `<ReadyToggle>`
- Toggles `ready` via `emit.toggleReady`. Optimistic; rolls back on ack error.
- Visual: outline button → filled when ready.

### `<SettingsSummary>`
- Read-only list of all configured settings with one-line plain-language descriptions.
- Collapsible (closed by default in `<LobbyView>`, open in `<EmptyLobbyView>` and `<RoomPreviewView>`).

### `<SecretSubmissionView>` (stage = `secrets`)
- Heading "Choose your secret number".
- `<DigitInput>` (phase 12) bound to the room's `NumberRules`.
- `<Countdown>` for the per-player 60s deadline (pulled from `room.view.match.secretDeadline`).
- `<SubmitButton>` from `<Button>` with loading state.
- After lock: replace input with `<LockedSecretDisplay>` (shows your value), plus "Opponent: submitting…" / "Opponent: locked" status pill.

### `<RPSView>` (stage = `rps`)
- Three `<RPSChoiceButton>` tiles (rock/paper/scissors) — large, equal-weight grid.
- `<Countdown>` (10s).
- Below: opponent lock indicator and round indicator (`Round 1/3`).
- On `rps_resolved`: `<RPSResultReveal>` with both picks animated in; pause ~1.5s; auto-advances by the next event (`turn_changed` or new `rps_picked` for a replay).

### `<PlayingView>` — picks Alternating or Simultaneous

### `<AlternatingPlay>` (turn_system = alternating)
- Header: `<TurnIndicator>` ("Your turn" / "Opponent's turn") + `<Countdown>` + `<StrikeCounter>` for each player + `<ForfeitButton>`.
- `<GuessTabs>` (My / Opponent's).
- When your turn: `<DigitInput>` (guess) + Submit; soft duplicate-guess warning ("You've already guessed this").
- When opponent's turn: input replaced by "Opponent is guessing…" plus the running timer.

### `<SimultaneousPlay>` (turn_system = simultaneous)
- Header: round number + `<Countdown>` (defaults to 60s if `null`) + `<StrikeCounter>` + `<ForfeitButton>`.
- `<GuessTabs>` showing prior rounds.
- `<DigitInput>` for this round; once submitted, replaced by "Locked in. Waiting for round to end…" with opponent status pill.
- On `result_calculated` (round resolved): the new pair is animated into both tabs simultaneously.

### `<GuessTabs>`
- Two tabs: **My Guesses** / **Opponent's Guesses**. The visible content is `<GuessLogList>` filtered by the active tab.
- Tab switching does not refetch — both lists come from `room.view.match.guessLog`.
- In fog mode, the opponent's tab is replaced by `<FogPanel>` ("Opponent's guesses are hidden by fog mode").

### `<GuessLogList>` / `<GuessLogRow>`
- One row per guess: `#index | value | 🐂 bulls | 🐄 cows | timestamp`.
- New rows animate in (slide+fade).

### `<TurnIndicator>`
- "Your turn" (highlighted) / "Opponent's turn" (muted). Optionally pulses on transition.

### `<StrikeCounter>`
- 3 segments per player; filled red as strikes accrue. Includes a small label with player nickname.

### `<ForfeitButton>`
- Always visible during a player's match. Opens `<ConfirmationModal>` ("Are you sure? This counts as a loss.").

### `<ResultView>` (stage = `ended`)
- `<WinnerBanner>` — "You won" / "You lost" / "Draw" / "Match abandoned" + reason line.
- `<SecretsRevealed>` — both players' secrets side by side.
- `<MatchStatsPanel>` — turns taken, total submission time per player.
- `<GuessLogSideBySide>` — both logs in two columns.
- `<HeadToHeadScore>` — running rematch score.
- Buttons: `<Button lg>` Rematch, `<Button md secondary>` Back to Home.

### `<AbandonedView>` (stage = `abandoned`)
- Single message card with a Home button. Same `<SecretsRevealed>` reveal applies if state was captured.

## Emote panel

### `<EmotePanel>`
- Horizontal scroll strip of emote buttons (👋, 🔥, 🤔, 😮, 😅, 👏). Each is an `<IconButton>` with a tooltip label.
- Tapping calls `emit.sendEmote(code)`. Disabled for the remainder of the window if the ack returns `emote_rate_limited`.
- Position: fixed strip just above the safe area bottom.

### `<EmoteToastLayer>`
- Reads `emoteStore.incoming`. Renders one floating bubble per active emote near the opponent's `<NicknameTag>`. Auto-fades at `expiresAt`.

### `<MuteToggle>`
- Small `<IconButton>` (🔇 / 🔔). Toggles muted state for the current room. Calls `emit.toggleMute(...)`.

## Presence

### `<DisconnectBanner>`
- Visible when `opponent.connected === false`.
- Body: "Opponent disconnected — waiting (Xs)" with a `<Countdown>` bound to `opponent.disconnectGraceEndsAt`.
- Sticky at the top of the play area.

### `<ReclaimTabBanner>`
- Visible when `connectionStore.tabStatus === 'demoted'`.
- Body: "This room is now open in another tab — reconnect here?" with a Reclaim button (`emit.reclaimTab()`).

## Share

### `<RoomCodeDisplay>`
- Big monospaced characters, letter-spaced for legibility. Single tap copies and shows a brief "Copied!" pill.

### `<CopyButton>` / `<CopyLinkButton>`
- Wrap the Clipboard API with a graceful fallback.

### `<QRCodeTile>`
- Uses `react-qr-code`. Tappable to expand into a full-screen modal for in-person scanning.

## Animations (motion budget)

- `<EmoteToastLayer>` — enter (slide-in 200ms), exit (fade 300ms).
- `<GuessLogRow>` — enter (slide-down + fade 250ms).
- `<RPSResultReveal>` — picks slide in from each side (400ms each), result pulse (300ms).
- `<WinnerBanner>` — scale-in 300ms.
- `<TurnIndicator>` — color shift 200ms on transitions.

Anything not listed should be a plain CSS transition. Avoid layout-thrashing animations during active timers (the play screen is performance-critical on mobile).

## Acceptance for phase 10

- [ ] Every component reads from Zustand selectors, not from props that drill three levels deep.
- [ ] All buttons meet the 44 px tap target minimum.
- [ ] Modals are full-screen on `< 480 px` viewports.
- [ ] Fog mode replaces the opponent tab content (the tab still shows so the player isn't confused).
- [ ] Secrets only appear inside `<ResultView>`/`<AbandonedView>` — no other component references them.
