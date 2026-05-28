import { create } from 'zustand';
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

export const useConnectionStore = create<ConnectionState>((set) => ({
  socketStatus: 'idle',
  reconnecting: false,
  attempt: 0,
  tabStatus: 'active',
  lastError: null,
  set: (partial) => set(partial),
}));
