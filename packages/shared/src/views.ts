import type { RoomStage, FirstTurnRule, SessionToken, Timestamp, RoomCode } from './types/index.js';
import type { Outcome } from './types/outcome.js';
import type { RoomSettings } from './schemas/settings.js';
import type { RPSPick } from './game/rps.js';

export type PlayerPublic = {
  sessionToken: SessionToken;
  nickname: string;
  connected: boolean;
  ready: boolean;
  strikes: 0 | 1 | 2 | 3;
};

export type RoomPublic = {
  code: RoomCode;
  stage: RoomStage;
  settings: RoomSettings;
  players: {
    creator: PlayerPublic;
    joiner: PlayerPublic | null;
  };
  createdAt: Timestamp;
};

export type GuessLogEntry = {
  playerToken: SessionToken;
  value: string;
  bulls: number;
  cows: number;
  turnIndex: number;
  roundIndex?: number;
  submittedAt: Timestamp;
};

export type HeadToHead = {
  matches: Array<{ winner: SessionToken | null; endedAt: Timestamp }>;
};

export type MatchInitView = {
  firstTurnPlayer: SessionToken | null;
  firstTurnRule: FirstTurnRule;
};

export type MatchStats = {
  perPlayer: Record<SessionToken, { turnsTaken: number; totalGuessTimeMs: number }>;
};

export type RoomStateView = {
  room: RoomPublic;
  yourToken: SessionToken;
  match: {
    yourSecret: string | null;
    opponentSecretSubmitted: boolean;
    guessLog: GuessLogEntry[];
    activePlayer: SessionToken | null;
    turnIndex: number;
    roundIndex?: number;
    turnDeadline: Timestamp | null;
    secretDeadline: Timestamp | null;
    rpsRound?: 1 | 2 | 3;
    yourRPSPick?: RPSPick | null;
    opponentRPSPickLocked?: boolean;
  } | null;
  endedView?: {
    outcome: Outcome;
    secrets: Record<SessionToken, string>;
    rematchScore: HeadToHead;
  };
};
