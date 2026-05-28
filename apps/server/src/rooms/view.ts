import type {
  RoomStateView,
  RoomPublic,
  PlayerPublic,
  SessionToken,
  HeadToHead,
  Timestamp,
} from '@bc/shared';
import type { RoomState, PlayerState } from './room-state.js';
import { opponentTokenOf } from './room-state.js';

function isoOrNull(ms: number | null): Timestamp | null {
  return ms == null ? null : new Date(ms).toISOString();
}

function toPlayerPublic(p: PlayerState): PlayerPublic {
  return {
    sessionToken: p.sessionToken,
    nickname: p.nickname,
    connected: p.connected,
    ready: p.ready,
    strikes: p.strikes,
  };
}

export function toRoomPublic(state: RoomState): RoomPublic {
  return {
    code: state.code,
    stage: state.stage,
    settings: state.settings,
    players: {
      creator: toPlayerPublic(state.creator),
      joiner: state.joiner ? toPlayerPublic(state.joiner) : null,
    },
    createdAt: new Date(state.createdAt).toISOString(),
  };
}

export function toRoomStateView(state: RoomState, recipient: SessionToken): RoomStateView {
  const room = toRoomPublic(state);
  const yourToken = recipient;
  const oppToken = opponentTokenOf(state, recipient);

  if (!state.match) {
    return { room, yourToken, match: null };
  }

  const m = state.match;
  const isTerminal = state.stage === 'ended' || state.stage === 'abandoned';

  // Filter the guess log per fog setting; in fog mode, hide opponent's values
  // before the match ends.
  const fogActive = state.settings.advanced.fogMode && !isTerminal;
  const guessLog = fogActive
    ? m.guessLog.filter((e) => e.playerToken === recipient)
    : m.guessLog;

  const view: RoomStateView = {
    room,
    yourToken,
    match: {
      yourSecret: m.secrets[recipient] ?? null,
      opponentSecretSubmitted: oppToken ? m.secrets[oppToken] != null : false,
      guessLog,
      activePlayer: m.activeTurnPlayer,
      turnIndex: m.turnIndex,
      turnDeadline: isoOrNull(m.turnDeadline),
      secretDeadline: isoOrNull(m.secretDeadlines[recipient] ?? null),
    },
  };

  if (m.roundIndex != null && view.match) {
    view.match.roundIndex = m.roundIndex;
  }
  if (m.rpsRound != null && view.match) {
    view.match.rpsRound = m.rpsRound;
    view.match.yourRPSPick = m.rpsPicks[recipient] ?? null;
    view.match.opponentRPSPickLocked = oppToken ? m.rpsPicks[oppToken] != null : false;
  }

  if (isTerminal && m.outcome) {
    const rematchScore: HeadToHead = {
      matches: state.rematchHistory.map((e) => ({
        winner: e.winner,
        endedAt: new Date(e.endedAt).toISOString(),
      })),
    };
    const secrets: Record<SessionToken, string> = {};
    for (const [k, v] of Object.entries(m.secrets)) {
      if (typeof v === 'string') secrets[k] = v;
    }
    view.endedView = {
      outcome: m.outcome,
      secrets,
      rematchScore,
    };
  }

  return view;
}
