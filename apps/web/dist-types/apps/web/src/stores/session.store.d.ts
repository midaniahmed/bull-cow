type Status = 'unknown' | 'bootstrapping' | 'ready' | 'error';
type SessionState = {
    status: Status;
    sessionToken: string | null;
    nickname: string | null;
    setNickname: (nickname: string) => Promise<void>;
    bootstrap: (nickname?: string) => Promise<void>;
};
export declare const useSessionStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<SessionState>, "setState" | "persist"> & {
    setState(partial: SessionState | Partial<SessionState> | ((state: SessionState) => SessionState | Partial<SessionState>), replace?: false | undefined): unknown;
    setState(state: SessionState | ((state: SessionState) => SessionState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<SessionState, {
            sessionToken: string | null;
            nickname: string | null;
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: SessionState) => void) => () => void;
        onFinishHydration: (fn: (state: SessionState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<SessionState, {
            sessionToken: string | null;
            nickname: string | null;
        }, unknown>>;
    };
}>;
export {};
//# sourceMappingURL=session.store.d.ts.map