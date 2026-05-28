# Phase 12: Forms & Inputs

Inputs are where the keyboard hits the screen — and on mobile, where most UX wins and losses happen. Each one is built around three rules:

1. **Mobile keyboard first** — `inputMode` and `pattern` chosen so the right keyboard pops up.
2. **Validation from the shared schema** — the same Zod schema the server uses (phase 01) drives client-side hints.
3. **Non-blocking errors** — inline messages don't shift layout; the button gates submission.

```
apps/web/src/components/inputs/
├── NicknameInput.tsx
├── RoomCodeInput.tsx
├── DigitInput.tsx
├── SettingsForm/
│   ├── index.tsx
│   ├── NumberRulesGroup.tsx
│   ├── MatchRulesGroup.tsx
│   └── AdvancedRulesGroup.tsx
└── RPSPicker.tsx          # technically buttons, lives here because it's a choice input
```

## `<NicknameInput>`

Used in the nickname prompt and on the "Edit" affordance.

- Props: `value`, `onSubmit(nickname)`, `mode: 'create' | 'edit'`, `error?: ErrorCode`.
- Attributes:
  - `type="text"`
  - `inputMode="text"`
  - `autoCapitalize="off"`
  - `autoCorrect="off"`
  - `spellCheck={false}`
  - `maxLength={20}`
- Validation via `NicknameSchema` (phase 01). On `onChange`, trim + run schema; on failure show the rule that failed:
  - "Must be 2–20 characters"
  - "Allowed: letters, digits, space, . _ -"
- Submit button (44 px tall) disabled until valid.
- On submit: optimistic — closes the modal immediately, rolls back with a snackbar if `PATCH /session` fails.

## `<RoomCodeInput>`

Used on `/join`.

- Props: `onSubmit(code)`.
- Attributes:
  - `type="text"`
  - `inputMode="text"`
  - `autoCapitalize="characters"`
  - `autoCorrect="off"`
  - `spellCheck={false}`
  - `maxLength={6}`
- Visual treatment: 6 boxed character cells; tapping any cell focuses the underlying single hidden input (avoids per-cell focus mess).
- Auto-uppercase on `onChange`; reject characters outside the allowed charset (`[A-HJ-KM-NP-Z2-9]`) by stripping silently.
- When length === 6 → enable Submit. Submit navigates to `/room/{CODE}`.
- Inline error: "Invalid characters" (live, while typing); resolution errors (`Room not found`, `Match in progress`) come from the resolution call on the next page.

## `<DigitInput>`

The single most-used input. Drives secret submission and guess submission. Configured by the active room's `NumberRules`.

- Props:
  - `rules: NumberRules`
  - `onSubmit(value: string): Promise<AckResult>`
  - `submitLabel: string` ("Submit Secret" / "Submit Guess")
  - `disabled?: boolean`
  - `showDuplicateGuessHint?: { value: string; previousResult: ScoreResult } | null` — soft warning for prior guess
- Attributes:
  - `type="text"` (not `"number"` — `number` allows decimals and scroll-changes, both bad here)
  - `inputMode="numeric"`
  - `pattern="[0-9]*"`
  - `autoComplete="off"`
  - `maxLength={rules.length}`
  - `enterKeyHint="send"`
- Visual: same boxed-cell treatment as `<RoomCodeInput>`. Each cell:
  - Empty: outline.
  - Filled: solid background.
  - Active cell: prominent border.
- **Live rule readout** above the input: "4 digits, unique digits, no leading zero" — driven by `rules`.
- **Per-digit grey-out** when `allowDuplicateDigits === false`: digits already in the input render at 40% opacity in a small hint row below. This is a UX-only signal; the underlying input still accepts the keypress (the schema rejects it on submit).
- Validation:
  - Runs `validateNumber(value, rules)` from `packages/shared/game` on every change.
  - Submit button disabled when result is `ok: false`.
  - Below the input, render the first failing rule's message (short — "no leading zero", "no repeated digits", etc.).
- Duplicate-guess hint (gameplay): when `showDuplicateGuessHint` is provided and matches the current input value, show a small inline pill: "You guessed this earlier — turn will pass." Does not block submission.
- Submit:
  - Disable the button while the ack is pending. Spinner inline.
  - On ack error (`secret_invalid`/`guess_invalid`/`not_your_turn`/etc.) → show the server-provided message; don't clear the input.
  - On `ok: true` → parent component decides next step (clear, lock, navigate).

## `<RPSPicker>`

Three large tiles laid out as a 3-column grid.

- Each tile: `<Button lg>` with the emoji, label below.
- Tap → call `emit.rpsPick(pick)`. Lock the picker after a successful ack (show "Locked in" overlay).
- Lock state survives re-renders by reading `view.match.yourRPSPick` from the room store.
- Replay rounds reset the lock when `rps_resolved.willReplay === true`.

## `<SettingsForm>` (room creation)

Used on `/create`. Submits `POST /rooms`.

- Three groups, each a `<Card>`:
  - **Number rules**:
    - Length: numeric stepper 3–10 (default 4). Native `<input type="range">` for finger-friendly drag with a numeric readout — or a custom 8-tile picker for nicer mobile UX.
    - Allow duplicate digits: `<Switch>`.
    - Allow leading zero: `<Switch>`.
    - Live feasibility check via `isLengthFeasible(rules)`. If false, render an inline warning and disable submit ("Length too long for unique digits with no leading zero — max 9 here.").
  - **Match rules**:
    - Turn system: segmented control `Alternating | Simultaneous`.
    - First turn: segmented control `RPS | Random | Creator | Joiner`.
    - Turn time limit: 5-option segmented control `10s | 20s | 30s | 60s | None`.
  - **Advanced** (collapsed by default):
    - Fog mode: `<Switch>` with a tooltip "Hides your opponent's guesses from your board."
- Each setting has a one-line plain-language description per requirement.
- Submit button at the bottom: "Create Room" — disabled until all schema refinements pass.
- On submit error 409 `room_other_active`: opens `<LeaveCurrentRoomConfirm>`; the form's state persists so the user doesn't refill on confirm.

## Shared sub-components

### `<DigitCells>`
- Renders N boxed cells driven by a controlled string. Used by `<DigitInput>` and `<RoomCodeInput>`.
- Single hidden `<input>` underlay accepts the typing; cells are visual.

### `<Segmented>`
- Mobile-first segmented control (like iOS). Equal-width buttons across the row. Used in `<SettingsForm>`.

### `<Switch>`
- 44 px wide, 28 px tall pill toggle.

### `<Stepper>`
- Number stepper with `–` / value / `+` buttons. Each button 44 px square.

### `<NumberRangePicker>` (optional, for length)
- Could replace `<Stepper>` if the design wants the larger touch-target tile layout. Eight tiles for 3–10.

## Patterns

- **Submit-on-Enter** is enabled by `enterKeyHint="send"` and a `onKeyDown('Enter')` handler. Mobile keyboards then show the proper key label.
- **No `autoFocus`** on inputs that are revealed when the user is still reading. The secret input *does* autofocus (the player has been waiting for it), but the room code input does not (user has to read the page first).
- **Layout reservation**: error messages render in a reserved 20px slot below each input so showing/clearing them doesn't shift the rest of the page.

## Acceptance for phase 12

- [ ] All digit-only inputs use `inputMode="numeric"` and `pattern="[0-9]*"`; on iOS this triggers the numeric keypad.
- [ ] Validation uses `validateNumber` from `packages/shared/game` — no duplicated rule logic in the input components.
- [ ] Server still re-validates every submission; the client's rejection is for UX only.
- [ ] Settings form's feasibility check (length vs. duplicate/leading-zero rules) gates the submit button.
- [ ] All buttons in inputs meet the 44 px minimum target.
