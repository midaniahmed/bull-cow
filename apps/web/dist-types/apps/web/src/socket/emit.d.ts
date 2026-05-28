import type { AckResult, EmoteCode, RPSPick, RoomStateView } from '@bc/shared';
export declare const emit: {
    leaveRoom: () => Promise<AckResult<Record<string, unknown>>>;
    kickJoiner: () => Promise<AckResult<Record<string, unknown>>>;
    toggleReady: (ready: boolean) => Promise<AckResult<{
        ready: boolean;
    }>>;
    reclaimTab: () => Promise<AckResult<Record<string, unknown>>>;
    submitSecret: (value: string) => Promise<AckResult<Record<string, unknown>>>;
    rpsPick: (pick: RPSPick) => Promise<AckResult<Record<string, unknown>>>;
    submitGuess: (value: string) => Promise<AckResult<Record<string, unknown>>>;
    forfeit: () => Promise<AckResult<Record<string, unknown>>>;
    sendEmote: (code: EmoteCode) => Promise<AckResult<Record<string, unknown>>>;
    toggleMute: (muted: boolean) => Promise<AckResult<Record<string, unknown>>>;
    rematchOffer: () => Promise<AckResult<Record<string, unknown>>>;
    rematchRespond: (accept: boolean) => Promise<AckResult<Record<string, unknown>>>;
    stateRequest: () => Promise<AckResult<{
        state: RoomStateView;
    }>>;
};
//# sourceMappingURL=emit.d.ts.map