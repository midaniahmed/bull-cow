import type { EmoteCode, SessionToken, EmoteSentPayload } from '@bc/shared';
type IncomingEmote = {
    id: string;
    fromToken: SessionToken;
    code: EmoteCode;
    expiresAt: number;
};
type EmoteState = {
    incoming: IncomingEmote[];
    mutedRooms: string[];
    push: (payload: EmoteSentPayload, currentRoom: string) => void;
    prune: () => void;
    toggleMute: (roomCode: string) => boolean;
};
export declare const useEmoteStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<EmoteState>, "setState" | "persist"> & {
    setState(partial: EmoteState | Partial<EmoteState> | ((state: EmoteState) => EmoteState | Partial<EmoteState>), replace?: false | undefined): unknown;
    setState(state: EmoteState | ((state: EmoteState) => EmoteState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<EmoteState, {
            mutedRooms: string[];
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: EmoteState) => void) => () => void;
        onFinishHydration: (fn: (state: EmoteState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<EmoteState, {
            mutedRooms: string[];
        }, unknown>>;
    };
}>;
export {};
//# sourceMappingURL=emote.store.d.ts.map