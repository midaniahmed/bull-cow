# Phase 9: Routes & Pages

The app is a thin set of React Router routes. Most of the UX lives inside one polymorphic `RoomPage` that renders a different sub-view per room stage. The router is intentionally flat — no nested layouts beyond a single `<AppShell>`.

```
apps/web/src/pages/
├── LandingPage.tsx
├── HomePage.tsx
├── CreateRoomPage.tsx
├── JoinRoomPage.tsx
├── RoomPage.tsx                # polymorphic by room stage
├── NotFoundPage.tsx
└── shell/
    └── AppShell.tsx            # base layout: header, safe-area padding, modal portal
```

```
apps/web/src/App.tsx — Router definition
```

## Routes

| Path | Component | Auth | Notes |
| --- | --- | --- | --- |
| `/` | `LandingPage` | none | Public entry. Two CTAs. |
| `/home` | `HomePage` | session + nickname | Returns visitors here after nickname bootstrap. |
| `/create` | `CreateRoomPage` | session + nickname | Settings form. Submits `POST /rooms`; on success replaces history with `/room/:code`. |
| `/join` | `JoinRoomPage` | session + nickname | Code input. Submits to `/room/:code`. |
| `/room/:code` | `RoomPage` | session + nickname; if URL hit cold, nickname prompt is forced first | Stage-driven sub-views. |
| `*` | `NotFoundPage` | none | |

The auth gate is a wrapper component (`<RequireSession>`) that mounts `<NicknamePrompt>` (modal) if `sessionStore.status !== 'ready'`. Once the prompt completes, the child route renders.

## Page: `LandingPage`

- 1–2 sentence game blurb.
- Tiny rules summary.
- **Create Room** and **Join Room** buttons.
- Tapping either:
  - If session ready → navigate to `/create` or `/join`.
  - If session not ready → show `<NicknamePrompt>` modal; on success → navigate to the intended page with `?action=create|join` preserved.

## Page: `HomePage`

- Greeting with current nickname + **Edit** affordance (opens `<NicknamePrompt>` in edit mode).
- **Create Room** and **Join Room** buttons (always visible).
- One-line "How to play" recap.

## Page: `CreateRoomPage`

- `<SettingsForm>` (phase 10): Number / Match / Advanced groups.
- On submit:
  - Disable button immediately (idempotency).
  - `POST /rooms` with the settings.
  - On 201 → `navigate('/room/' + code, { replace: true })`.
  - On 409 `room_other_active` → show `<LeaveCurrentRoomConfirm>` modal; confirm → `DELETE /rooms/:code/membership` then retry.
  - On 400 `settings_invalid` → mark the offending field.

## Page: `JoinRoomPage`

- `<RoomCodeInput>` (phase 12) — uppercase, alphanumeric (excluding ambiguous chars).
- On submit:
  - Navigate to `/room/{CODE}`. The room page handles the preview lookup.
  - No HTTP call from this page — the input is just routing.

## Page: `RoomPage` (polymorphic)

`RoomPage` is the workhorse. It renders one of several sub-views based on the current room stage + the user's role + the user's commit state.

```tsx
<RoomPage>
  switch (stage)
    case undefined:           <RoomPreviewView />        // not yet committed; pre-join
    case 'waiting':           <EmptyLobbyView />          // creator alone
    case 'lobby':             <LobbyView />
    case 'secrets':           <SecretSubmissionView />
    case 'rps':               <RPSView />
    case 'playing':           <PlayingView turnSystem={…} />     // chooses Alt vs Sim inner view
    case 'ended':             <ResultView />
    case 'abandoned':         <AbandonedView />
</RoomPage>
```

### Mount flow

```
useEffect on mount:
  // 1. Make sure session is set up; if not, NicknamePrompt is already on screen via RequireSession
  // 2. Fetch the preview (GET /rooms/:code) — used to render <RoomPreviewView> if we are not yet a member.
  // 3. Once the user clicks Join Match (in the preview), open the room socket.
  // 4. The first room_state ack determines which sub-view we land on.
```

### Stage gating

- If `view.stage` puts us somewhere the URL doesn't anticipate, the URL stays — we just render the right sub-view. The URL is just `/room/{CODE}`; sub-views aren't separate routes.
- If `view` is `null` and the preview returned 404/409/410 → render the matching error state (`<RoomNotFound>`, `<RoomInProgress>`, `<RoomEnded>` cards) each with **Retry** and **Home**.
- On `room_closed` → toast + `navigate('/home', { replace: true })`.

### Sub-views (one per stage)

`<RoomPreviewView>` — creator nickname, settings summary, **Join Match** / **Cancel**.

`<EmptyLobbyView>` (creator-only, stage = `waiting`) — code, copy link, QR, settings summary, **Cancel Room**, "Waiting for opponent…".

`<LobbyView>` (stage = `lobby`) — both nicknames, settings summary, Ready toggle, Kick (creator) / Leave (joiner).

`<SecretSubmissionView>` (stage = `secrets`) — `<DigitInput>` for secret, 60s countdown, "Opponent: submitting/locked" status. After your own lock, "Waiting for opponent…" with your locked value displayed.

`<RPSView>` (stage = `rps`) — three big RPS buttons, 10s countdown, lock indicator. On `rps_resolved`, brief reveal animation then auto-advance.

`<PlayingView>` (stage = `playing`) — picks `<AlternatingPlay>` or `<SimultaneousPlay>` per `settings.match.turnSystem`. Both render the tabbed guess view, turn/round info, strike counters, **Forfeit** button.

`<ResultView>` (stage = `ended`) — winner banner, both secrets, full guess history, head-to-head score, **Rematch** / **Back to Home**.

`<AbandonedView>` (stage = `abandoned`) — "This match was abandoned" with **Home**.

### Always-mounted (room scope)

Inside `RoomPage`, regardless of stage:
- `<EmotePanel>` (lobby–ended only)
- `<EmoteToastLayer>` (renders the 3s emote toasts)
- `<DisconnectBanner>` (when opponent disconnected — shows countdown)
- `<ReclaimTabBanner>` (when `connectionStore.tabStatus === 'demoted'`)

## App shell

`<AppShell>` wraps every route:
- Safe-area padding via `env(safe-area-inset-*)` (see phase 13).
- Header strip with logo on `/` and `/home`, just the room code on `/room/:code`.
- `<ModalPortal>` mounting `<NicknamePrompt>`, `<ConfirmationModal>`, `<LeaveCurrentRoomConfirm>`.
- `<SnackbarLayer>` for `uiStore` snackbars.

## Navigation rules

- After room create/join → `navigate(..., { replace: true })` so back button doesn't bounce to a now-stale page.
- On `room_closed` → `navigate('/home', { replace: true })` with a toast.
- After match end → user explicitly clicks Rematch (stays on room) or Back to Home (`/home`).
- Going back from `/room/:code` while in a match triggers the same disconnect-grace flow as closing the tab (it's a network disconnect from the socket's perspective). On returning to `/room/:code` within grace, state restores.

## Acceptance for phase 9

- [ ] Routes are flat — no nested router layouts beyond `<AppShell>`.
- [ ] `<RequireSession>` ensures the nickname modal is shown before any auth-requiring page renders.
- [ ] `RoomPage` selects sub-views from `roomStore.view.stage`; no per-stage routes.
- [ ] `room_closed` always navigates to `/home` with a reason toast.
- [ ] Direct deep links to `/room/:code` work whether the visitor has a session or not (nickname prompt first, then preview).
