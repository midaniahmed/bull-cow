import type { ErrorCode } from '@bc/shared';
type SocketStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';
type ConnectionState = {
    socketStatus: SocketStatus;
    reconnecting: boolean;
    attempt: number;
    tabStatus: 'active' | 'demoted';
    lastError: ErrorCode | null;
    set: (partial: Partial<ConnectionState>) => void;
};
export declare const useConnectionStore: import("zustand").UseBoundStore<import("zustand").StoreApi<ConnectionState>>;
export {};
//# sourceMappingURL=connection.store.d.ts.map