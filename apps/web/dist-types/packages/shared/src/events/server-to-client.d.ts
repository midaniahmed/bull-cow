import type { RoomPublic, PlayerPublic, GuessLogEntry, RoomStateView, HeadToHead, MatchInitView, MatchStats } from '../views.js';
import type { Outcome } from '../types/outcome.js';
import type { SessionToken, Timestamp } from '../types/ids.js';
import type { TurnSystem } from '../types/stages.js';
import type { RPSPick } from '../game/rps.js';
import type { EmoteCode } from '../schemas/emote.js';
export declare const S2C_EVENTS: {
    readonly ROOM_CREATED: "room_created";
    readonly ROOM_JOINED: "room_joined";
    readonly PLAYER_READY: "player_ready";
    readonly MATCH_STARTED: "match_started";
    readonly SECRET_LOCKED: "secret_locked";
    readonly RPS_PICKED: "rps_picked";
    readonly RPS_RESOLVED: "rps_resolved";
    readonly GUESS_SUBMITTED: "guess_submitted";
    readonly RESULT_CALCULATED: "result_calculated";
    readonly TURN_CHANGED: "turn_changed";
    readonly TIMEOUT_STRIKE: "timeout_strike";
    readonly FORFEIT_DECLARED: "forfeit_declared";
    readonly MATCH_ENDED: "match_ended";
    readonly PLAYER_DISCONNECTED: "player_disconnected";
    readonly PLAYER_RECONNECTED: "player_reconnected";
    readonly EMOTE_SENT: "emote_sent";
    readonly REMATCH_OFFERED: "rematch_offered";
    readonly REMATCH_ACCEPTED: "rematch_accepted";
    readonly REMATCH_DECLINED: "rematch_declined";
    readonly TAB_DEMOTED: "tab_demoted";
    readonly ROOM_STATE: "room_state";
    readonly ROOM_CLOSED: "room_closed";
};
export type S2CEventName = (typeof S2C_EVENTS)[keyof typeof S2C_EVENTS];
export type RoomCreatedPayload = {
    room: RoomPublic;
    you: PlayerPublic;
};
export type RoomJoinedPayload = {
    room: RoomPublic;
    joiner: PlayerPublic;
};
export type PlayerReadyPayload = {
    playerToken: SessionToken;
    ready: boolean;
};
export type MatchStartedPayload = {
    firstTurnPlayer: SessionToken | null;
    turnSystem: TurnSystem;
    turnTimeLimitSeconds: number | null;
    startedAt: Timestamp;
};
export type SecretLockedPayload = {
    playerToken: SessionToken;
};
export type RPSPickedPayload = {
    playerToken: SessionToken;
};
export type RPSResolvedPayload = {
    picks: Record<SessionToken, RPSPick>;
    winner: SessionToken | 'tie';
    round: 1 | 2 | 3;
    willReplay: boolean;
};
export type GuessSubmittedPayload = {
    playerToken: SessionToken;
    turnIndex: number;
    roundIndex?: number;
};
export type ResultCalculatedPayload = {
    entries: GuessLogEntry[];
    turnIndex: number;
};
export type TurnChangedPayload = {
    activePlayer: SessionToken | null;
    turnIndex: number;
    turnDeadline: Timestamp | null;
};
export type TimeoutStrikePayload = {
    playerToken: SessionToken;
    strikes: 1 | 2 | 3;
};
export type ForfeitDeclaredPayload = {
    playerToken: SessionToken;
    reason: 'voluntary' | 'timeout_3x' | 'secret_timeout' | 'disconnect_grace';
};
export type MatchEndedPayload = {
    outcome: Outcome;
    secrets: Record<SessionToken, string>;
    guessLog: GuessLogEntry[];
    stats: MatchStats;
    rematchScore: HeadToHead;
};
export type PlayerDisconnectedPayload = {
    playerToken: SessionToken;
    graceRemainingSeconds: number;
    graceEndsAt: Timestamp;
};
export type PlayerReconnectedPayload = {
    playerToken: SessionToken;
};
export type EmoteSentPayload = {
    fromToken: SessionToken;
    code: EmoteCode;
    sentAt: Timestamp;
};
export type RematchOfferedPayload = {
    fromToken: SessionToken;
};
export type RematchAcceptedPayload = {
    newMatch: MatchInitView;
};
export type RematchDeclinedPayload = {
    fromToken: SessionToken;
};
export type TabDemotedPayload = {
    reason: 'newer_tab_connected';
};
export type RoomStatePayload = RoomStateView;
export type RoomClosedPayload = {
    reason: 'creator_left_waiting' | 'creator_left_lobby' | 'kicked' | 'abandoned' | 'idle_post_match';
};
export type ServerToClientEvents = {
    room_created: (p: RoomCreatedPayload) => void;
    room_joined: (p: RoomJoinedPayload) => void;
    player_ready: (p: PlayerReadyPayload) => void;
    match_started: (p: MatchStartedPayload) => void;
    secret_locked: (p: SecretLockedPayload) => void;
    rps_picked: (p: RPSPickedPayload) => void;
    rps_resolved: (p: RPSResolvedPayload) => void;
    guess_submitted: (p: GuessSubmittedPayload) => void;
    result_calculated: (p: ResultCalculatedPayload) => void;
    turn_changed: (p: TurnChangedPayload) => void;
    timeout_strike: (p: TimeoutStrikePayload) => void;
    forfeit_declared: (p: ForfeitDeclaredPayload) => void;
    match_ended: (p: MatchEndedPayload) => void;
    player_disconnected: (p: PlayerDisconnectedPayload) => void;
    player_reconnected: (p: PlayerReconnectedPayload) => void;
    emote_sent: (p: EmoteSentPayload) => void;
    rematch_offered: (p: RematchOfferedPayload) => void;
    rematch_accepted: (p: RematchAcceptedPayload) => void;
    rematch_declined: (p: RematchDeclinedPayload) => void;
    tab_demoted: (p: TabDemotedPayload) => void;
    room_state: (p: RoomStatePayload) => void;
    room_closed: (p: RoomClosedPayload) => void;
};
//# sourceMappingURL=server-to-client.d.ts.map