import type { Server as IOServer } from 'socket.io';
import type { ServerToClientEvents } from '@bc/shared';

// Use a relaxed IO type to avoid generic plumbing complexity at the broadcast site.
let io: IOServer | null = null;

export function setIO(server: IOServer) {
  io = server;
}

export function getIO(): IOServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export function roomChannel(code: string): string {
  return `room:${code}`;
}

export function broadcastToRoom<K extends keyof ServerToClientEvents>(
  code: string,
  event: K,
  payload: Parameters<ServerToClientEvents[K]>[0]
): void {
  getIO().to(roomChannel(code)).emit(event as string, payload);
}

export function emitToToken<K extends keyof ServerToClientEvents>(
  code: string,
  token: string,
  event: K,
  payload: Parameters<ServerToClientEvents[K]>[0]
): void {
  const sockets = getIO().sockets.adapter.rooms.get(roomChannel(code));
  if (!sockets) return;
  for (const sid of sockets) {
    const s = getIO().sockets.sockets.get(sid);
    if (s && (s.data as { sessionToken?: string }).sessionToken === token) {
      s.emit(event as string, payload);
    }
  }
}

export function emitToSocketId<K extends keyof ServerToClientEvents>(
  sid: string,
  event: K,
  payload: Parameters<ServerToClientEvents[K]>[0]
): void {
  const s = getIO().sockets.sockets.get(sid);
  if (s) s.emit(event as string, payload);
}
