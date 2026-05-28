export type Snackbar = {
    id: string;
    message: string;
    tone: 'info' | 'error' | 'success';
};
type UiState = {
    snackbars: Snackbar[];
    vibrationEnabled: boolean;
    wakeLockEnabled: boolean;
    showSnackbar: (message: string, tone?: Snackbar['tone']) => void;
    dismissSnackbar: (id: string) => void;
    setVibrationEnabled: (v: boolean) => void;
    setWakeLockEnabled: (v: boolean) => void;
};
export declare const useUiStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<UiState>, "setState" | "persist"> & {
    setState(partial: UiState | Partial<UiState> | ((state: UiState) => UiState | Partial<UiState>), replace?: false | undefined): unknown;
    setState(state: UiState | ((state: UiState) => UiState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<UiState, {
            vibrationEnabled: boolean;
            wakeLockEnabled: boolean;
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: UiState) => void) => () => void;
        onFinishHydration: (fn: (state: UiState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<UiState, {
            vibrationEnabled: boolean;
            wakeLockEnabled: boolean;
        }, unknown>>;
    };
}>;
export {};
//# sourceMappingURL=ui.store.d.ts.map