import { db } from '../db/client.js';
import { matches, type MatchInsert } from '../db/schema.js';
import type { RoomState } from '../rooms/room-state.js';
import { logger } from '../logger.js';

export async function persistMatch(state: RoomState): Promise<void> {
  const m = state.match;
  if (!m || !m.outcome || !m.endedAt) return;
  if (!state.joiner) return; // can't persist without a joiner

  const row: MatchInsert = {
    roomCode: state.code,
    creatorSessionToken: state.creator.sessionToken,
    joinerSessionToken: state.joiner.sessionToken,
    creatorNickname: state.creator.nickname,
    joinerNickname: state.joiner.nickname,
    settings: state.settings,
    secrets: m.secrets,
    guessLog: m.guessLog,
    outcome: m.outcome,
    startedAt: new Date(m.startedAt),
    endedAt: new Date(m.endedAt),
  };

  try {
    await db.insert(matches).values(row);
  } catch (err) {
    logger.error({ err, code: state.code }, 'failed to persist match');
  }
}
