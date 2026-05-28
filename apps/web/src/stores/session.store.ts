import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Status = 'unknown' | 'bootstrapping' | 'ready' | 'error';

type SessionState = {
  status: Status;
  sessionToken: string | null;
  nickname: string | null;
  setNickname: (nickname: string) => Promise<void>;
  bootstrap: (nickname?: string) => Promise<void>;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      status: 'unknown',
      sessionToken: null,
      nickname: null,
      async setNickname(nickname: string) {
        const res = await fetch('/api/session', {
          method: get().sessionToken ? 'PATCH' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { message?: string }).message ?? 'nickname update failed');
        }
        const j = (await res.json()) as { sessionToken: string; nickname: string };
        set({ sessionToken: j.sessionToken, nickname: j.nickname, status: 'ready' });
      },
      async bootstrap(nickname?: string) {
        const state = get();
        if (state.status === 'ready' && !nickname) return;
        set({ status: 'bootstrapping' });
        try {
          if (nickname || state.nickname) {
            await get().setNickname(nickname ?? (state.nickname as string));
          } else {
            set({ status: 'unknown' });
          }
        } catch (e) {
          set({ status: 'error' });
          throw e;
        }
      },
    }),
    {
      name: 'bc_session',
      partialize: (s) => ({ sessionToken: s.sessionToken, nickname: s.nickname }),
    }
  )
);
