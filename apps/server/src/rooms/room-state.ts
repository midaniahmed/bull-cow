import type {
  RoomCode,
  RoomStage,
  SessionToken,
  Outcome,
  GuessLogEntry,
  HeadToHead,
  RoomSettings,
  RPSPick,
} from '@bc/shared';

export type PlayerState = {
  sessionToken: SessionToken;
  nickname: string;
  ready: boolean;
  strikes: 0 | 1 | 2 | 3;
  connected: boolean;
  disconnectGraceEndsAt: number | null;
  activeTabId: string | null;
};

export type RoundSubmission = { value: string; submittedAt: number } | null;

export type MatchState = {
  secrets: Record<SessionToken, string | null>;
  secretsLockedAt: Record<SessionToken, number | null>;
  secretDeadlines: Record<SessionToken, number | null>;

  firstTurnPlayer: SessionToken | null;

  // alternating
  activeTurnPlayer: SessionToken | null;
  turnIndex: number;
  turnDeadline: number | null;

  // simultaneous
  roundIndex: number | null;
  roundDeadline: number | null;
  roundSubmissions: Record<SessionToken, RoundSubmission>;
  roundResubmits: Record<SessionToken, number>;

  // rps
  rpsRound: 1 | 2 | 3 | null;
  rpsPicks: Record<SessionToken, RPSPick | null>;
  rpsDeadline: number | null;

  // history
  guessLog: GuessLogEntry[];

  // turn stats
  turnsTaken: Record<SessionToken, number>;
  totalGuessTimeMs: Record<SessionToken, number>;
  lastTurnStartedAt: number | null;

  // rematch offer
  rematchOffers: Record<SessionToken, boolean>;

  // end
  outcome: Outcome | null;
  endedAt: number | null;
  startedAt: number;
};

export type RematchHistoryEntry = { winner: SessionToken | null; endedAt: number };

export type RoomState = {
  code: RoomCode;
  stage: RoomStage;
  settings: RoomSettings;
  creator: PlayerState;
  joiner: PlayerState | null;
  match: MatchState | null;
  rematchHistory: RematchHistoryEntry[];
  createdAt: number;
  closedReason?:
    | 'creator_left_waiting'
    | 'creator_left_lobby'
    | 'kicked'
    | 'abandoned'
    | 'idle_post_match';
};

export function makeInitialPlayer(
  sessionToken: SessionToken,
  nickname: string,
  tabId: string | null
): PlayerState {
  return {
    sessionToken,
    nickname,
    ready: false,
    strikes: 0,
    connected: true,
    disconnectGraceEndsAt: null,
    activeTabId: tabId,
  };
}

export function opponentTokenOf(state: RoomState, token: SessionToken): SessionToken | null {
  if (state.creator.sessionToken === token) return state.joiner?.sessionToken ?? null;
  if (state.joiner?.sessionToken === token) return state.creator.sessionToken;
  return null;
}

export function playerByToken(state: RoomState, token: SessionToken): PlayerState | null {
  if (state.creator.sessionToken === token) return state.creator;
  if (state.joiner?.sessionToken === token) return state.joiner;
  return null;
}

export function bothPlayers(state: RoomState): PlayerState[] {
  return state.joiner ? [state.creator, state.joiner] : [state.creator];
}

export function makeInitialMatchState(now: number): MatchState {
  return {
    secrets: {},
    secretsLockedAt: {},
    secretDeadlines: {},
    firstTurnPlayer: null,
    activeTurnPlayer: null,
    turnIndex: 0,
    turnDeadline: null,
    roundIndex: null,
    roundDeadline: null,
    roundSubmissions: {},
    roundResubmits: {},
    rpsRound: null,
    rpsPicks: {},
    rpsDeadline: null,
    guessLog: [],
    turnsTaken: {},
    totalGuessTimeMs: {},
    lastTurnStartedAt: null,
    rematchOffers: {},
    outcome: null,
    endedAt: null,
    startedAt: now,
  };
}
