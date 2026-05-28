import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      snackbars: [],
      vibrationEnabled: true,
      wakeLockEnabled: true,
      showSnackbar: (message, tone = 'info') => {
        const id = `sn-${Date.now()}-${Math.random()}`;
        set({ snackbars: [...get().snackbars, { id, message, tone }] });
        setTimeout(() => {
          set({ snackbars: get().snackbars.filter((s) => s.id !== id) });
        }, 4000);
      },
      dismissSnackbar: (id) => set({ snackbars: get().snackbars.filter((s) => s.id !== id) }),
      setVibrationEnabled: (v) => set({ vibrationEnabled: v }),
      setWakeLockEnabled: (v) => set({ wakeLockEnabled: v }),
    }),
    {
      name: 'bc_ui',
      partialize: (s) => ({
        vibrationEnabled: s.vibrationEnabled,
        wakeLockEnabled: s.wakeLockEnabled,
      }),
    }
  )
);
