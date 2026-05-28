import type { SessionToken } from './ids.js';
export type OutcomeKind = 'winner' | 'draw' | 'abandoned';
export type WinnerReason = 'solved' | 'forfeit' | 'voluntary' | 'timeout_3x' | 'secret_timeout' | 'disconnect_grace';
export type DrawReason = 'both_solved_same_round';
export type Outcome = {
    kind: 'winner';
    winner: SessionToken;
    reason: WinnerReason;
} | {
    kind: 'draw';
    reason: DrawReason;
} | {
    kind: 'abandoned';
};
//# sourceMappingURL=outcome.d.ts.map