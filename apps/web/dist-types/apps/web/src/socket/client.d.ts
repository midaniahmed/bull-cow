import { type Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@bc/shared';
export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export declare function getSocket(): AppSocket | null;
export declare function connectSocket(roomCode: string): AppSocket;
export declare function disconnectSocket(): void;
//# sourceMappingURL=client.d.ts.map