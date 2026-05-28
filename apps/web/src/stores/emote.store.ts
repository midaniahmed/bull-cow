import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

export const useEmoteStore = create<EmoteState>()(
  persist(
    (set, get) => ({
      incoming: [],
      mutedRooms: [],
      push: (payload, currentRoom) => {
        if (get().mutedRooms.includes(currentRoom)) return;
        const id = `${payload.fromToken}:${payload.sentAt}:${Math.random()}`;
        set({
          incoming: [
            ...get().incoming,
            { id, fromToken: payload.fromToken, code: payload.code, expiresAt: Date.now() + 3000 },
          ],
        });
      },
      prune: () => {
        const now = Date.now();
        set({ incoming: get().incoming.filter((e) => e.expiresAt > now) });
      },
      toggleMute: (roomCode) => {
        const cur = get().mutedRooms;
        const muted = cur.includes(roomCode);
        if (muted) set({ mutedRooms: cur.filter((c) => c !== roomCode) });
        else set({ mutedRooms: [...cur, roomCode] });
        return !muted;
      },
    }),
    {
      name: 'bc_emote_prefs',
      partialize: (s) => ({ mutedRooms: s.mutedRooms }),
    }
  )
);
