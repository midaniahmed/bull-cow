import type { RoomStateView, RoomStage, PlayerPublic } from '@bc/shared';
type RoomStoreState = {
    view: RoomStateView | null;
    setView: (view: RoomStateView | null) => void;
    apply: (event: string, payload: unknown) => void;
    reset: () => void;
};
export declare const useRoomStore: import("zustand").UseBoundStore<import("zustand").StoreApi<RoomStoreState>>;
export declare function useYourTurn(): boolean;
export declare function useStage(): RoomStage | null;
export declare function useOpponent(): PlayerPublic | null;
export declare function useYou(): PlayerPublic | null;
export declare function useIsCreator(): boolean;
export {};
//# sourceMappingURL=room.store.d.ts.map