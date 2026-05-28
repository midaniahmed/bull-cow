# Match Flow — Requirements

Covers everything from "both players Ready" through "match ends + rematch": secret submission, first-turn selection (incl. RPS), turn UX in both turn systems, win/loss/forfeit, post-match screen, rematch flow.

For room creation and lobby behavior, see `01-rooms-and-lobby.md`.
For disconnection during a match, see `03-presence-comms-edge.md`.

## Secret Submission (secrets stage)

Triggered the moment both players are simultaneously Ready in the lobby.

### What each player sees

- A heading: "Choose your secret number"
- A digit-entry field matching the configured number rules (length, allow-duplicates, allow-leading-zero)
- A live readout of the active rules ("4 digits, unique digits, no leading zero")
- Client-side validation feedback as the player types (e.g., grey-out previously typed digits when duplicates are disabled)
- A **Submit** button (disabled until input is valid)
- A 60-second countdown timer (independent of the configured turn timer)
- Once submitted: a "Waiting for opponent…" state with the player's own secret displayed for reference. The secret is **locked** and cannot be edited.

The opponent's submission progress is shown as a status indicator (e.g., "Opponent: submitting…" / "Opponent: locked in"). The opponent's actual digits are never revealed.

### Server validation

The server re-validates each submitted secret against the room settings:
- Correct length
- All digits 0–9
- Duplicate digits rule respected
- Leading zero rule respected

Invalid submissions are rejected with a per-field error. The 60-second timer continues to count down — a rejected submission does not reset it.

### Secret submission timeout

- A player who fails to submit a valid secret within 60 seconds **forfeits the match immediately**. The other player wins.
- The opponent's secret (the player who did submit) is revealed on the end screen as part of the result.

### On both submitted

Server confirms both secrets are valid and locked, then transitions to:
- `rps` stage if `first_turn = rps`
- `playing` stage otherwise (with `first_turn_player` set by the rule)

Server emits `secret_locked` for each player as it happens, and a `match_started` event with `first_turn_player_session_token` when both are in.

## First-Turn Selection

Four rules are configurable. Three are mechanical (server-side determination, no UI surface beyond announcing the result). One has its own UI.

### Mechanical rules

- `random` — server picks one of the two players with 50/50 probability.
- `creator` — first turn always goes to the room creator.
- `joiner` — first turn always goes to the joiner.

For these three, the players go straight from secrets → playing. The first-turn player is announced briefly (e.g., "{Nickname} goes first") with a ~2-second pause before the first turn begins.

### RPS rule (rps stage)

If `first_turn = rps`:

1. Both players see a Rock / Paper / Scissors picker with three large buttons.
2. A 10-second countdown timer is shown.
3. Each player locks their pick by clicking. Picks are hidden from the opponent until both are locked OR the timer expires.
4. The opponent's "locked in" status is visible as a status indicator without revealing the pick.
5. On timer expiry: any player who didn't pick is assigned a random pick.
6. Server emits `rps_resolved` with both picks visible and the winner highlighted via a brief reveal animation.
7. Tie → automatic replay (same 10-second window) up to 3 rounds total. If still tied after 3 rounds, server falls back to a random first-turn selection.
8. Winner of the RPS gets the first guess turn.

### Rematch first-turn flip

When the same room is used for a rematch (see Post-Match), and the configured first-turn rule is `creator` or `joiner`, the rule is **swapped** for the rematch (creator ↔ joiner). For `random` and `rps`, the rule runs again normally.

## Turn UX — Alternating Mode

### Play screen layout

A tabbed view with two tabs:
- **My Guesses** — your own guess history with bull/cow counts (your guesses against the opponent's secret).
- **Opponent's Guesses** — the opponent's guess history with bull/cow counts (their guesses against your secret).

Always visible above the tabs:
- Whose turn it is (highlighted with the active player's nickname)
- Remaining time in the current turn (if a timer is set)
- Each player's current timeout strikes (0–3)
- A **Forfeit** button

Each row in either tab shows: guess number, the guessed value, bull count, cow count, timestamp.

### Active turn — your turn

- Guess input field appears, matching the configured number rules with the same client-side validation as the secret input.
- A **Submit Guess** button is enabled when the input is valid.
- Turn timer is displayed and counts down in real time.

### Active turn — opponent's turn

- No input field; the screen shows "Opponent is guessing…" with the timer ticking.
- Your forfeit button remains available.

### On guess submitted

1. Client sends the guess to the server.
2. Server validates: correct length, digit charset, duplicate-digits rule, leading-zero rule.
   - Invalid → server rejects with a specific error. The turn timer keeps running; the player must submit a corrected guess. No strike or turn-pass for an invalid submission.
3. Server computes bulls and cows against the opponent's secret.
4. Server appends the result to the guess log and emits `guess_submitted` + `result_calculated` to both players. The new row appears in both players' "Opponent's Guesses" / "My Guesses" tabs simultaneously.
5. If bulls == length → match ends; the guesser wins (see End-of-Match).
6. Otherwise → turn passes to the other player; `turn_changed` event emitted; turn timer resets.

### Duplicate guess behavior

Per spec: duplicate guesses are **allowed but waste the turn**. The server processes the guess normally (returns the same bull/cow result as before) and the turn passes. No client-side blocking is required, but the input MAY show a soft warning ("You've already guessed this") without preventing submission.

### Turn timer expiry

- When the active player's turn timer hits 0 without a guess submitted:
  - The turn is counted as a "no guess" (no entry is added to the guess log).
  - The active player accrues 1 timeout strike. Server emits `timeout_strike` to both players with the updated strike count.
  - Turn passes to the opponent.
- If the player's strike count reaches **3**, they immediately forfeit the match. The opponent wins. Server emits `forfeit_declared` then `match_ended`.

### Voluntary forfeit

- The **Forfeit** button is always available during the player's own turn or the opponent's turn.
- Clicking it opens a confirmation modal: "Are you sure? This counts as a loss." with Confirm / Cancel.
- Confirming ends the match as a loss for the forfeiter. Server emits `forfeit_declared` then `match_ended`.

## Turn UX — Simultaneous Mode

### Play screen layout

Same tabbed view as alternating mode, but the per-turn flow differs.

Always visible above the tabs:
- Round number (e.g., "Round 5")
- Remaining time in the current round (using the configured turn timer; if `none`, defaults to 60s for simultaneous mode so the game does progress)
- Each player's current timeout strikes
- A **Forfeit** button

### Round flow

1. Both players see a guess input field at round start.
2. Each player submits independently. Server validates each submission the same as alternating mode (invalid submissions can be re-tried within the round timer).
3. Once submitted, the player sees "Locked in. Waiting for round to end…" The opponent's submission status is shown as a status indicator (locked / not yet) but never the guess value.
4. **Round always runs the full timer duration** — even if both players have submitted early. This prevents leaking information about opponent submission timing.
5. When the round timer expires, server reveals both guesses + bull/cow results simultaneously to both players. Both rows appear in both tabs at the same instant via `result_calculated`.

### Round results — winners

- Neither player solved (no all-bulls): next round starts. Server emits `turn_changed` with the incremented round number; round timer resets.
- Exactly one player solved: that player wins; match ends.
- Both players solved in the same round: the match ends in a **draw**. Result screen shows "Draw" with both secrets revealed and both guess histories. No winner declared.

### Simultaneous timeout handling

If a player does not submit within the round timer:
- They are credited with 1 timeout strike (same 3-strike forfeit cap).
- The other player's submission is still revealed at round end.
- If that player solved the secret, they win normally.
- If neither submitted, the round produces no results and a strike is added for each.

## End-of-Match

### Outcomes

A match ends with exactly one of these outcomes:
- **Winner** — one player solved the secret (all bulls) before the other.
- **Forfeit** — one player voluntarily forfeited or hit 3 timeout strikes. The opponent is the winner.
- **Secret submission timeout** — one player failed to submit a secret within 60s. The opponent is the winner.
- **Draw** — simultaneous mode, both players solved in the same round.
- **Abandoned** — both players disconnected past the grace window. No winner. (Detailed in `03-presence-comms-edge.md`.)

### Result screen

Both players see the same result screen showing:

- A clear winner banner ("You won" / "You lost" / "Draw" / "Match abandoned")
- The reason if applicable ("Opponent forfeited", "Opponent timed out 3 times")
- **Both secrets revealed** (now safe — match is over)
- Final stats per player: rounds/turns taken, total time spent submitting guesses
- Full guess history side-by-side (both players' guesses with bull/cow counts)
- Two actions: **Rematch** and **Back to Home**

Server emits `match_ended` with the full outcome payload to both players.

## Rematch

### Offer flow

- Either player can click **Rematch** on the result screen.
- The first to click broadcasts a `rematch_offered` event. The offering player sees "Waiting for opponent…" The opponent sees a "Rematch offered — Accept / Decline" prompt.
- If the opponent clicks Accept (or also clicks Rematch independently), server emits `rematch_accepted`.
- If the opponent clicks Decline, server emits `rematch_declined`; the offering player sees "Opponent declined" and is returned to the result screen with only **Back to Home** available.
- Either player navigating to home from the result screen implicitly declines any pending offer.

### On Rematch accepted

The room is reused with all settings unchanged, except:
- If the configured `first_turn` is `creator` or `joiner`, swap the rule (creator ↔ joiner) for the rematch.
- `random` and `rps` first-turn rules run again normally.

The stage transitions back to `secrets` (skipping lobby and Ready). Both players re-enter the secret submission UI with a fresh 60-second timer. A running **head-to-head score** is shown above the play screen for the duration of the rematch (e.g., "You 1 — Opponent 0"). The score persists across multiple rematches in the same room and resets when either player returns home.

### Match history within a room

The room retains a list of completed matches for the duration of the session (used only for the head-to-head score display). It is not persisted beyond the room's lifetime in MVP.

## Acceptance Criteria — Match Flow

- [ ] Both players enter secrets independently within 60s; submitted secrets are server-validated against the room's rules.
- [ ] A player who fails to submit a secret within 60s forfeits; opponent wins; opponent's secret is revealed.
- [ ] A submitted secret is locked and cannot be edited.
- [ ] First-turn rule `creator` / `joiner` correctly assigns first turn; `random` produces 50/50 distribution over many matches; `rps` runs the RPS picker with 10s timer and resolves ties up to 3 replays before random fallback.
- [ ] Alternating mode shows the tabbed view with My/Opponent guesses, current turn indicator, turn timer, and strike counters.
- [ ] Each guess is server-validated (length, digit charset, duplicates, leading zero). Invalid guesses are rejected without consuming the turn or a strike.
- [ ] Duplicate guesses are allowed and waste the turn (same bull/cow result returned, turn passes).
- [ ] Turn timer expiry adds a strike, passes the turn, and resets the timer for the opponent.
- [ ] 3 strikes auto-forfeits the timing-out player.
- [ ] Voluntary forfeit (with confirmation) ends the match as a loss for the forfeiter.
- [ ] Simultaneous mode: round always runs the full timer; both guesses are revealed at the same instant; status indicator never leaks the actual guess; double-solve in the same round produces a draw.
- [ ] Match result screen shows both secrets and full guess history; works identically across all outcome types.
- [ ] Rematch flow: offer/accept/decline events work; accepted rematch reuses the room with deterministic first-turn rule swapped; head-to-head score persists across rematches in the same room.
- [ ] Secrets never appear in any payload sent to the opponent until after the match is in `ended` or `abandoned` stage.
