# Online Bulls & Cows PvP — Requirements Overview

## Purpose

A web-based 1v1 multiplayer Bulls & Cows game. Two players join a room with a shareable code, each picks a secret number, then take turns guessing the opponent's number. First to guess all-bulls wins.

This document is the entry point. Detailed behavior is split across:

- `01-rooms-and-lobby.md` — entry flow, room creation, joining, lobby, settings catalog
- `02-match-flow.md` — secret submission, first-turn selection, turn UX, both turn systems, end-of-match, rematch
- `03-presence-comms-edge.md` — reconnection, emote comms, anti-cheat, edge cases

## MVP Scope

In scope for this requirements set:

- Guest-only play (server-issued session token per visitor; nickname only — no accounts)
- Code-shared room model, strict 1v1, no spectators
- Configurable number rules: length (3–10), allow duplicate digits, allow leading zero
- Turn systems: alternating, simultaneous
- First-turn selection: RPS, random, creator, joiner
- Per-turn time limit: 10s, 20s, 30s, 60s, or none
- Single-match win condition (one match per room)
- Fog mode (hide opponent's guess history)
- In-room quick-emote panel (no free-text chat)
- Disconnect grace + reconnection via session token
- Voluntary forfeit and 3-strike timeout forfeit
- Rematch flow (re-uses room, swaps deterministic first-turn rules)

## Out of Scope (MVP)

- User accounts, sign-in, password/OAuth
- Persistent match history and stats
- Friends list, invites by username
- Ranked mode and matchmaking queue
- Hardcore mode (removed from spec)
- Hint system (removed from spec)
- Best-of-X / multi-round matches (removed from spec)
- Spectators / observers
- Free-text chat
- Profanity filter
- Mobile-native apps (web works on mobile browsers)

## Future Scope (explicitly planned, not in MVP)

- User accounts with persistent stats and match history
- Ranked matches with matchmaking queue and rating system

When account features land later, the existing guest session-token flow must continue to work — accounts are an additive layer on top of guests, not a replacement.

## Glossary

- **Room** — a unique container hosting one match between two players, identified by a 6-char code.
- **Lobby** — pre-match state inside a room where both players are present and can see settings before clicking Ready.
- **Secret** — the number a player chooses for the opponent to guess. Never sent to the opponent at any point.
- **Bull** — a digit in the guess that is the correct digit in the correct position.
- **Cow** — a digit in the guess that is present in the secret but in the wrong position.
- **Forfeit** — ending the match as a loss without solving the secret. Either voluntary (Forfeit button) or automatic (3 cumulative turn timeouts).
- **Session token** — a long-lived identifier server-issued to every visitor on first contact, stored in localStorage AND an HttpOnly cookie. Same token = same player across reconnects.

## Entities

### Player (Guest)
- `session_token` — server-issued, persistent across reconnects
- `nickname` — 2–20 chars; allowed: a–z, A–Z, 0–9, space, `.`, `_`, `-`; no uniqueness enforcement

### Room
- `code` — 6-char string from `A–Z` + `0–9` excluding visually ambiguous characters (`0`, `O`, `1`, `I`, `L`)
- `creator_session_token`
- `joiner_session_token` — null until joined
- `settings` — see below
- `stage` — see Stages section
- `created_at`

### Room settings
- **Number**
  - `length` — integer 3–10 (default 4)
  - `allow_duplicate_digits` — boolean (default false)
  - `allow_leading_zero` — boolean (default false)
- **Match**
  - `turn_system` — `alternating` | `simultaneous` (default alternating)
  - `first_turn` — `rps` | `random` | `creator` | `joiner` (default random)
  - `turn_time_limit_seconds` — 10 | 20 | 30 | 60 | null (default 30; null = no limit)
- **Advanced**
  - `fog_mode` — boolean (default false)

Settings are locked once the room is created.

### Match
- `room_id` (1:1 with room)
- `secrets` — one per player, server-side only, never serialized to opponent
- `guess_log` — ordered list: `{player, value, bulls, cows, submitted_at}`
- `first_turn_player_session_token`
- `active_turn_player_session_token` — alternating mode only
- `turn_index` — current turn count
- `timeout_strikes` — count per player (0–3)
- `outcome` — `winner:<session_token>` | `draw` | `abandoned`
- `ended_at`

## Stages

Every room transitions through stages in order. Reconnection always restores the player to the current stage with state intact (minus the opponent's secret).

1. **waiting** — room exists, no joiner yet; only creator is present
2. **lobby** — both players present, settings visible; each may click Ready
3. **secrets** — both players Ready; each enters their secret (60s cap each)
4. **rps** — first-turn rule is RPS; both players make a pick (10s)
5. **playing** — turns in progress per the configured turn system
6. **ended** — match concluded with a definite outcome
7. **abandoned** — both players exceeded their disconnect grace with no reconnect

## Realtime Events

Event names form the client/server contract and must remain stable.

From the original spec:
- `room_created`
- `room_joined`
- `player_ready`
- `match_started`
- `guess_submitted`
- `result_calculated`
- `turn_changed`
- `match_ended`

Added by this requirements set:
- `secret_locked` — server confirms a player locked in their secret
- `player_disconnected` / `player_reconnected` — presence updates, includes remaining grace seconds
- `emote_sent` — quick-emote broadcast
- `forfeit_declared` — voluntary or automatic
- `timeout_strike` — added when a player misses a turn timer; broadcast to both
- `rematch_offered` / `rematch_accepted` / `rematch_declined`
- `rps_picked` / `rps_resolved`
- `room_closed` — terminal cleanup notification

## Consolidated Acceptance Criteria

The MVP is complete when all of the following are demonstrably true:

- [ ] Two strangers in different browsers can land on the home page, the first creates a room with custom settings, the second joins via the code, and they play one match through to a winner.
- [ ] Every configurable setting demonstrably changes behavior: number length 3–10, duplicate digits toggle, leading zero toggle, alternating vs simultaneous, all four first-turn rules, all five time-limit options, fog mode on/off.
- [ ] Secrets never appear in any payload sent to the opponent's client, including during the match, on disconnect, or in any error message.
- [ ] All rule validation is enforced server-side. Tampering with the client (devtools) cannot bypass length/duplicate/leading-zero rules or submit out-of-turn guesses.
- [ ] A player who closes their browser mid-match can reload within 60s and resume in the same state. After 60s, the opponent wins by walkover with the abandoned player's secret revealed.
- [ ] Three cumulative turn timeouts in a single match auto-forfeit the timing-out player.
- [ ] Voluntary forfeit (with confirmation) ends the match as a loss for the forfeiter.
- [ ] Rematch from the post-match screen reuses the same room and same settings, with the deterministic first-turn rule (creator/joiner) swapped from the previous match.
- [ ] One session token cannot be active in two rooms simultaneously, nor in two live tabs of the same room.

## Dependencies

No external integrations in MVP.

The architecture stack from the original spec and `CLAUDE.md` (React + TypeScript + Vite frontend, Node.js + Express + Socket.IO backend, PostgreSQL persistence) is the planned implementation. These requirements describe **what** the system does and are framework-agnostic.
