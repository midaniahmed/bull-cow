import { useCallback } from 'react';
import { useUiStore } from '../stores/ui.store.js';

export function useVibration() {
  const enabled = useUiStore((s) => s.vibrationEnabled);
  return useCallback(
    (pattern: number | number[]) => {
      if (!enabled) return;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(pattern);
        } catch {
          // ignore
        }
      }
    },
    [enabled]
  );
}
