import {
  scoreGuess,
  isAllBulls,
  validateNumber,
  resolveRPS,
  type RPSPick,
  type SessionToken,
  type Outcome,
  type GuessLogEntry,
  type Timestamp,
} from '@bc/shared';
import {
  bothPlayers,
  makeInitialMatchState,
  opponentTokenOf,
  playerByToken,
  type RoomState,
  type MatchState,
} from '../rooms/room-state.js';
import { saveRoom, deleteRoom, freeCode } from '../rooms/store.js';
import { broadcastToRoom, emitToToken } from '../rooms/broadcast.js';
import {
  clearAllTimersForRoom,
  clearTimer,
  scheduleTimer,
} from '../rooms/timers.js';
import { toRoomStateView } from '../rooms/view.js';
import { persistMatch } from './persist.js';
import { logger } from '../logger.js';

const SECRET_DEADLINE_MS = 60_000;
const RPS_DEADLINE_MS = 10_000;
const ROUND_DEFAULT_MS = 60_000;
const DISCONNECT_GRACE_MS = 60_000;
const POST_MATCH_IDLE_MS = 10 * 60_000;

function nowMs(): number {
  return Date.now();
}

function iso(ms: number): Timestamp {
  return new Date(ms).toISOString();
}

function broadcastRoomState(state: RoomState): void {
  for (const p of bothPlayers(state)) {
    emitToToken(state.code, p.sessionToken, 'room_state', toRoomStateView(state, p.sessionToken));
  }
}

export async function startSecretsStage(state: RoomState): Promise<RoomState> {
  const now = nowMs();
  const match = makeInitialMatchState(now);
  for (const p of bothPlayers(state)) {
    match.secrets[p.sessionToken] = null;
    match.secretsLockedAt[p.sessionToken] = null;
    match.secretDeadlines[p.sessionToken] = now + SECRET_DEADLINE_MS;
    match.turnsTaken[p.sessionToken] = 0;
    match.totalGuessTimeMs[p.sessionToken] = 0;
    match.rpsPicks[p.sessionToken] = null;
    match.roundSubmissions[p.sessionToken] = null;
    match.roundResubmits[p.sessionToken] = 0;
    match.rematchOffers[p.sessionToken] = false;
  }
  state.match = match;
  state.stage = 'secrets';

  broadcastToRoom(state.code, 'match_started', {
    firstTurnPlayer: null,
    turnSystem: state.settings.match.turnSystem,
    turnTimeLimitSeconds: state.settings.match.turnTimeLimitSeconds,
    startedAt: iso(now),
  });

  // Schedule secret deadlines per player.
  for (const p of bothPlayers(state)) {
    const at = match.secretDeadlines[p.sessionToken];
    if (at != null) {
      scheduleTimer(state.code, 'secret', p.sessionToken, at);
    }
  }

  await saveRoom(state);
  broadcastRoomState(state);
  return state;
}

function pickFirstTurnPlayerByRule(state: RoomState): SessionToken | null {
  if (!state.joiner) return null;
  const c = state.creator.sessionToken;
  const j = state.joiner.sessionToken;
  switch (state.settings.match.firstTurn) {
    case 'creator':
      return c;
    case 'joiner':
      return j;
    case 'random':
      return Math.random() < 0.5 ? c : j;
    case 'rps':
      return null;
  }
}

async function maybeStartPlayingOrRPS(state: RoomState): Promise<void> {
  if (!state.match) return;
  if (!state.joiner) return;
  const m = state.match;
  const allLocked = bothPlayers(state).every((p) => m.secrets[p.sessionToken] != null);
  if (!allLocked) return;

  // Clear secret timers
  for (const p of bothPlayers(state)) {
    clearTimer(state.code, 'secret', p.sessionToken);
    m.secretDeadlines[p.sessionToken] = null;
  }

  if (state.settings.match.firstTurn === 'rps') {
    state.stage = 'rps';
    m.rpsRound = 1;
    for (const p of bothPlayers(state)) m.rpsPicks[p.sessionToken] = null;
    m.rpsDeadline = nowMs() + RPS_DEADLINE_MS;
    scheduleTimer(state.code, 'rps', null, m.rpsDeadline);
    await saveRoom(state);
    broadcastRoomState(state);
    return;
  }

  const first = pickFirstTurnPlayerByRule(state);
  await beginPlaying(state, first);
}

async function beginPlaying(state: RoomState, firstTurnPlayer: SessionToken | null): Promise<void> {
  if (!state.match) return;
  const m = state.match;
  m.firstTurnPlayer = firstTurnPlayer;
  state.stage = 'playing';

  const now = nowMs();
  const turnLimit = state.settings.match.turnTimeLimitSeconds;

  if (state.settings.match.turnSystem === 'alternating') {
    m.activeTurnPlayer = firstTurnPlayer;
    m.turnIndex = 0;
    m.lastTurnStartedAt = now;
    m.turnDeadline = turnLimit != null ? now + turnLimit * 1000 : null;
    if (m.turnDeadline != null) {
      scheduleTimer(state.code, 'turn', m.activeTurnPlayer, m.turnDeadline);
    }
  } else {
    m.activeTurnPlayer = null;
    m.roundIndex = 0;
    m.lastTurnStartedAt = now;
    const limit = turnLimit != null ? turnLimit * 1000 : ROUND_DEFAULT_MS;
    m.roundDeadline = now + limit;
    scheduleTimer(state.code, 'round', null, m.roundDeadline);
  }

  broadcastToRoom(state.code, 'match_started', {
    firstTurnPlayer,
    turnSystem: state.settings.match.turnSystem,
    turnTimeLimitSeconds: turnLimit,
    startedAt: iso(now),
  });

  broadcastToRoom(state.code, 'turn_changed', {
    activePlayer: m.activeTurnPlayer,
    turnIndex: m.turnIndex,
    turnDeadline: m.turnDeadline != null ? iso(m.turnDeadline) : null,
  });

  await saveRoom(state);
  broadcastRoomState(state);
}

export async function submitSecret(
  state: RoomState,
  token: SessionToken,
  value: string
): Promise<{ ok: true } | { ok: false; code: string; field?: string }> {
  if (state.stage !== 'secrets' || !state.match) {
    return { ok: false, code: 'bad_stage' };
  }
  const m = state.match;
  if (m.secrets[token] != null) {
    return { ok: false, code: 'secret_already_locked' };
  }
  const v = validateNumber(value, state.settings.number);
  if (!v.ok) {
    return { ok: false, code: 'secret_invalid', field: v.code };
  }

  m.secrets[token] = value;
  m.secretsLockedAt[token] = nowMs();
  m.secretDeadlines[token] = null;
  clearTimer(state.code, 'secret', token);

  broadcastToRoom(state.code, 'secret_locked', { playerToken: token });
  await saveRoom(state);
  await maybeStartPlayingOrRPS(state);
  return { ok: true };
}

export async function submitRPSPick(
  state: RoomState,
  token: SessionToken,
  pick: RPSPick
): Promise<{ ok: true } | { ok: false; code: string }> {
  if (state.stage !== 'rps' || !state.match) return { ok: false, code: 'bad_stage' };
  const m = state.match;
  if (m.rpsPicks[token] != null) return { ok: false, code: 'rps_already_locked' };
  m.rpsPicks[token] = pick;
  broadcastToRoom(state.code, 'rps_picked', { playerToken: token });
  await saveRoom(state);

  // Check resolve
  if (state.joiner && m.rpsPicks[state.creator.sessionToken] && m.rpsPicks[state.joiner.sessionToken]) {
    await resolveRPSRound(state);
  }
  return { ok: true };
}

async function resolveRPSRound(state: RoomState): Promise<void> {
  if (!state.match || !state.joiner) return;
  const m = state.match;
  const c = state.creator.sessionToken;
  const j = state.joiner.sessionToken;

  const cp = m.rpsPicks[c];
  const jp = m.rpsPicks[j];
  if (!cp || !jp) {
    // assign random for missing picks (timer expiry path)
    const choices: RPSPick[] = ['rock', 'paper', 'scissors'];
    if (!cp) m.rpsPicks[c] = choices[Math.floor(Math.random() * 3)] as RPSPick;
    if (!jp) m.rpsPicks[j] = choices[Math.floor(Math.random() * 3)] as RPSPick;
  }
  const finalC = m.rpsPicks[c] as RPSPick;
  const finalJ = m.rpsPicks[j] as RPSPick;
  const result = resolveRPS(finalC, finalJ);
  clearTimer(state.code, 'rps', null);
  m.rpsDeadline = null;
  const round = (m.rpsRound ?? 1) as 1 | 2 | 3;

  if (result === 'tie' && round < 3) {
    broadcastToRoom(state.code, 'rps_resolved', {
      picks: { [c]: finalC, [j]: finalJ },
      winner: 'tie',
      round,
      willReplay: true,
    });
    m.rpsRound = (round + 1) as 1 | 2 | 3;
    m.rpsPicks[c] = null;
    m.rpsPicks[j] = null;
    m.rpsDeadline = nowMs() + RPS_DEADLINE_MS;
    scheduleTimer(state.code, 'rps', null, m.rpsDeadline);
    await saveRoom(state);
    broadcastRoomState(state);
    return;
  }

  let winner: SessionToken;
  if (result === 'tie') {
    // round 3 tie → random first-turn
    winner = Math.random() < 0.5 ? c : j;
  } else {
    winner = result === 'p1' ? c : j;
  }

  broadcastToRoom(state.code, 'rps_resolved', {
    picks: { [c]: finalC, [j]: finalJ },
    winner: result === 'tie' ? 'tie' : winner,
    round,
    willReplay: false,
  });

  await beginPlaying(state, winner);
}

export async function submitGuess(
  state: RoomState,
  token: SessionToken,
  value: string
): Promise<{ ok: true } | { ok: false; code: string; field?: string }> {
  if (state.stage !== 'playing' || !state.match) return { ok: false, code: 'bad_stage' };
  const m = state.match;
  const opp = opponentTokenOf(state, token);
  if (!opp) return { ok: false, code: 'forbidden' };

  if (state.settings.match.turnSystem === 'alternating') {
    if (m.activeTurnPlayer !== token) return { ok: false, code: 'not_your_turn' };
    const v = validateNumber(value, state.settings.number);
    if (!v.ok) return { ok: false, code: 'guess_invalid', field: v.code };

    const oppSecret = m.secrets[opp];
    if (!oppSecret) return { ok: false, code: 'internal' };

    const score = scoreGuess(value, oppSecret);
    const turnIndex = m.turnIndex;
    const now = nowMs();
    const entry: GuessLogEntry = {
      playerToken: token,
      value,
      bulls: score.bulls,
      cows: score.cows,
      turnIndex,
      submittedAt: iso(now),
    };
    m.guessLog.push(entry);
    m.turnsTaken[token] = (m.turnsTaken[token] ?? 0) + 1;
    if (m.lastTurnStartedAt != null) {
      m.totalGuessTimeMs[token] =
        (m.totalGuessTimeMs[token] ?? 0) + (now - m.lastTurnStartedAt);
    }

    broadcastToRoom(state.code, 'guess_submitted', { playerToken: token, turnIndex });

    // Broadcast per-recipient result (fog mode hides opponent's value)
    if (state.settings.advanced.fogMode) {
      for (const p of bothPlayers(state)) {
        if (p.sessionToken === token) {
          emitToToken(state.code, p.sessionToken, 'result_calculated', {
            entries: [entry],
            turnIndex,
          });
        } else {
          // Opponent doesn't see fog-hidden guess values; send only a stub entry
          // with bulls/cows hidden? Simpler: hide value but keep bulls/cows so
          // the player knows their opponent is making progress. The plan says
          // fog hides "the opponent's guesses" entirely from your board.
          // Choose strict interpretation: don't emit to opponent.
        }
      }
    } else {
      broadcastToRoom(state.code, 'result_calculated', { entries: [entry], turnIndex });
    }

    if (isAllBulls(score, state.settings.number.length)) {
      await endMatch(state, {
        kind: 'winner',
        winner: token,
        reason: 'solved',
      });
      return { ok: true };
    }

    // Flip turn
    m.activeTurnPlayer = opp;
    m.turnIndex = turnIndex + 1;
    m.lastTurnStartedAt = nowMs();
    const turnLimit = state.settings.match.turnTimeLimitSeconds;
    clearTimer(state.code, 'turn', token);
    m.turnDeadline = turnLimit != null ? nowMs() + turnLimit * 1000 : null;
    if (m.turnDeadline != null) {
      scheduleTimer(state.code, 'turn', opp, m.turnDeadline);
    }
    broadcastToRoom(state.code, 'turn_changed', {
      activePlayer: opp,
      turnIndex: m.turnIndex,
      turnDeadline: m.turnDeadline != null ? iso(m.turnDeadline) : null,
    });
    await saveRoom(state);
    return { ok: true };
  }

  // SIMULTANEOUS mode
  const v = validateNumber(value, state.settings.number);
  if (!v.ok) {
    m.roundResubmits[token] = (m.roundResubmits[token] ?? 0) + 1;
    await saveRoom(state);
    return { ok: false, code: 'guess_invalid', field: v.code };
  }
  if ((m.roundResubmits[token] ?? 0) >= 20) {
    return { ok: false, code: 'submit_rate_limited' };
  }
  m.roundResubmits[token] = (m.roundResubmits[token] ?? 0) + 1;
  m.roundSubmissions[token] = { value, submittedAt: nowMs() };
  broadcastToRoom(state.code, 'guess_submitted', {
    playerToken: token,
    turnIndex: m.turnIndex,
    roundIndex: m.roundIndex ?? 0,
  });
  await saveRoom(state);
  return { ok: true };
}

async function resolveSimultaneousRound(state: RoomState): Promise<void> {
  if (!state.match || !state.joiner) return;
  const m = state.match;
  const roundIndex = m.roundIndex ?? 0;
  const players = [state.creator, state.joiner];
  const entries: GuessLogEntry[] = [];
  const now = nowMs();

  let solved: SessionToken[] = [];
  for (const p of players) {
    const sub = m.roundSubmissions[p.sessionToken];
    const opp = opponentTokenOf(state, p.sessionToken);
    if (!opp) continue;
    const oppSecret = m.secrets[opp];
    if (!oppSecret) continue;

    if (sub) {
      const score = scoreGuess(sub.value, oppSecret);
      const entry: GuessLogEntry = {
        playerToken: p.sessionToken,
        value: sub.value,
        bulls: score.bulls,
        cows: score.cows,
        turnIndex: m.turnIndex,
        roundIndex,
        submittedAt: iso(sub.submittedAt),
      };
      m.guessLog.push(entry);
      entries.push(entry);
      m.turnsTaken[p.sessionToken] = (m.turnsTaken[p.sessionToken] ?? 0) + 1;
      if (m.lastTurnStartedAt != null) {
        m.totalGuessTimeMs[p.sessionToken] =
          (m.totalGuessTimeMs[p.sessionToken] ?? 0) + (sub.submittedAt - m.lastTurnStartedAt);
      }
      if (isAllBulls(score, state.settings.number.length)) {
        solved.push(p.sessionToken);
      }
    }
  }

  broadcastToRoom(state.code, 'result_calculated', {
    entries,
    turnIndex: m.turnIndex,
  });

  // Strikes for non-submitters
  for (const p of players) {
    const sub = m.roundSubmissions[p.sessionToken];
    if (!sub) {
      p.strikes = Math.min(3, p.strikes + 1) as 0 | 1 | 2 | 3;
      broadcastToRoom(state.code, 'timeout_strike', {
        playerToken: p.sessionToken,
        strikes: p.strikes as 1 | 2 | 3,
      });
    }
  }

  // 3-strike forfeit?
  const threeStrike = players.find((p) => p.strikes >= 3);
  if (threeStrike) {
    const opp = opponentTokenOf(state, threeStrike.sessionToken);
    if (opp) {
      await endMatch(state, { kind: 'winner', winner: opp, reason: 'timeout_3x' });
      return;
    }
  }

  if (solved.length === 2) {
    await endMatch(state, { kind: 'draw', reason: 'both_solved_same_round' });
    return;
  }
  if (solved.length === 1) {
    await endMatch(state, { kind: 'winner', winner: solved[0] as SessionToken, reason: 'solved' });
    return;
  }

  // Advance round
  m.roundIndex = (m.roundIndex ?? 0) + 1;
  m.turnIndex = m.turnIndex + 1;
  m.lastTurnStartedAt = now;
  for (const p of players) {
    m.roundSubmissions[p.sessionToken] = null;
    m.roundResubmits[p.sessionToken] = 0;
  }
  const turnLimit = state.settings.match.turnTimeLimitSeconds;
  const limit = turnLimit != null ? turnLimit * 1000 : ROUND_DEFAULT_MS;
  m.roundDeadline = nowMs() + limit;
  scheduleTimer(state.code, 'round', null, m.roundDeadline);
  broadcastToRoom(state.code, 'turn_changed', {
    activePlayer: null,
    turnIndex: m.turnIndex,
    turnDeadline: iso(m.roundDeadline),
  });
  await saveRoom(state);
  broadcastRoomState(state);
}

export async function endMatch(state: RoomState, outcome: Outcome): Promise<void> {
  if (!state.match) return;
  const m = state.match;
  m.outcome = outcome;
  m.endedAt = nowMs();
  state.stage = 'ended';
  clearAllTimersForRoom(state.code);

  // history
  const winnerToken =
    outcome.kind === 'winner' ? outcome.winner : null;
  state.rematchHistory.push({ winner: winnerToken, endedAt: m.endedAt });

  // forfeit_declared broadcast for reason
  if (outcome.kind === 'winner' && outcome.reason !== 'solved') {
    const loser = opponentTokenOf(state, outcome.winner);
    if (loser) {
      broadcastToRoom(state.code, 'forfeit_declared', {
        playerToken: loser,
        reason: outcome.reason as 'voluntary' | 'timeout_3x' | 'secret_timeout' | 'disconnect_grace',
      });
    }
  }

  // match_ended with revealed secrets
  const secretsRevealed: Record<SessionToken, string> = {};
  for (const [k, v] of Object.entries(m.secrets)) {
    if (typeof v === 'string') secretsRevealed[k] = v;
  }

  broadcastToRoom(state.code, 'match_ended', {
    outcome,
    secrets: secretsRevealed,
    guessLog: m.guessLog,
    stats: {
      perPlayer: {
        [state.creator.sessionToken]: {
          turnsTaken: m.turnsTaken[state.creator.sessionToken] ?? 0,
          totalGuessTimeMs: m.totalGuessTimeMs[state.creator.sessionToken] ?? 0,
        },
        ...(state.joiner
          ? {
              [state.joiner.sessionToken]: {
                turnsTaken: m.turnsTaken[state.joiner.sessionToken] ?? 0,
                totalGuessTimeMs: m.totalGuessTimeMs[state.joiner.sessionToken] ?? 0,
              },
            }
          : {}),
      },
    },
    rematchScore: {
      matches: state.rematchHistory.map((e) => ({
        winner: e.winner,
        endedAt: iso(e.endedAt),
      })),
    },
  });

  await persistMatch(state);
  await saveRoom(state);
  broadcastRoomState(state);

  // Post-match idle timer
  scheduleTimer(state.code, 'post_match_idle', null, nowMs() + POST_MATCH_IDLE_MS);
}

export async function forfeitMatch(
  state: RoomState,
  token: SessionToken,
  reason: 'voluntary' | 'timeout_3x' | 'secret_timeout' | 'disconnect_grace'
): Promise<void> {
  if (!state.match) return;
  const opp = opponentTokenOf(state, token);
  if (!opp) return;
  await endMatch(state, { kind: 'winner', winner: opp, reason });
}

// Timer fire handler
export async function onTimerFire(
  state: RoomState,
  kind: string,
  ownerToken: string | null
): Promise<void> {
  const m = state.match;
  switch (kind) {
    case 'secret': {
      if (state.stage !== 'secrets' || !m || !ownerToken) return;
      if (m.secrets[ownerToken] != null) return;
      await forfeitMatch(state, ownerToken, 'secret_timeout');
      return;
    }
    case 'rps': {
      if (state.stage !== 'rps' || !m) return;
      await resolveRPSRound(state);
      return;
    }
    case 'turn': {
      if (state.stage !== 'playing' || !m || !ownerToken) return;
      if (m.activeTurnPlayer !== ownerToken) return;
      const player = playerByToken(state, ownerToken);
      if (!player) return;
      player.strikes = Math.min(3, player.strikes + 1) as 0 | 1 | 2 | 3;
      broadcastToRoom(state.code, 'timeout_strike', {
        playerToken: ownerToken,
        strikes: player.strikes as 1 | 2 | 3,
      });
      if (player.strikes >= 3) {
        await forfeitMatch(state, ownerToken, 'timeout_3x');
        return;
      }
      const opp = opponentTokenOf(state, ownerToken);
      if (!opp) return;
      m.activeTurnPlayer = opp;
      m.turnIndex = m.turnIndex + 1;
      m.lastTurnStartedAt = nowMs();
      const turnLimit = state.settings.match.turnTimeLimitSeconds;
      m.turnDeadline = turnLimit != null ? nowMs() + turnLimit * 1000 : null;
      if (m.turnDeadline != null) {
        scheduleTimer(state.code, 'turn', opp, m.turnDeadline);
      }
      broadcastToRoom(state.code, 'turn_changed', {
        activePlayer: opp,
        turnIndex: m.turnIndex,
        turnDeadline: m.turnDeadline != null ? iso(m.turnDeadline) : null,
      });
      await saveRoom(state);
      return;
    }
    case 'round': {
      if (state.stage !== 'playing' || !m) return;
      await resolveSimultaneousRound(state);
      return;
    }
    case 'disconnect_grace': {
      if (!ownerToken) return;
      const player = playerByToken(state, ownerToken);
      if (!player) return;
      if (player.connected) return; // reconnected
      // Per-stage handling
      if (state.stage === 'waiting') {
        await closeRoom(state, 'creator_left_waiting');
        return;
      }
      if (state.stage === 'lobby') {
        if (ownerToken === state.creator.sessionToken) {
          await closeRoom(state, 'creator_left_lobby');
        } else if (state.joiner) {
          // joiner left → revert to waiting
          state.joiner = null;
          state.stage = 'waiting';
          state.creator.ready = false;
          broadcastRoomState(state);
          await saveRoom(state);
        }
        return;
      }
      if (state.stage === 'secrets' || state.stage === 'rps' || state.stage === 'playing') {
        // Other player connected? → forfeit them out
        const opp = opponentTokenOf(state, ownerToken);
        const oppPlayer = opp ? playerByToken(state, opp) : null;
        if (oppPlayer && oppPlayer.connected) {
          await forfeitMatch(state, ownerToken, 'disconnect_grace');
          return;
        }
        // Both gone → abandoned
        state.stage = 'abandoned';
        if (state.match) {
          state.match.outcome = { kind: 'abandoned' };
          state.match.endedAt = nowMs();
        }
        await saveRoom(state);
        broadcastRoomState(state);
        await persistMatch(state);
        return;
      }
      return;
    }
    case 'post_match_idle': {
      if (state.stage !== 'ended') return;
      await closeRoom(state, 'idle_post_match');
      return;
    }
    case 'creator_afk': {
      if (state.stage !== 'waiting') return;
      await closeRoom(state, 'creator_left_waiting');
      return;
    }
    default:
      logger.warn({ kind }, 'unknown timer kind');
  }
}

export async function closeRoom(
  state: RoomState,
  reason:
    | 'creator_left_waiting'
    | 'creator_left_lobby'
    | 'kicked'
    | 'abandoned'
    | 'idle_post_match'
): Promise<void> {
  state.closedReason = reason;
  clearAllTimersForRoom(state.code);
  broadcastToRoom(state.code, 'room_closed', { reason });
  await freeCode(state.code);
  await deleteRoom(state.code);
}

export async function applyRematch(state: RoomState): Promise<void> {
  // swap firstTurn rule if creator/joiner
  const r = state.settings.match.firstTurn;
  if (r === 'creator') state.settings.match.firstTurn = 'joiner';
  else if (r === 'joiner') state.settings.match.firstTurn = 'creator';

  // reset readiness/strikes
  state.creator.ready = false;
  state.creator.strikes = 0;
  if (state.joiner) {
    state.joiner.ready = false;
    state.joiner.strikes = 0;
  }

  // Notify the match init view
  broadcastToRoom(state.code, 'rematch_accepted', {
    newMatch: { firstTurnPlayer: null, firstTurnRule: state.settings.match.firstTurn },
  });

  // Start a new secrets stage (keeping rematchHistory)
  await startSecretsStage(state);
}
