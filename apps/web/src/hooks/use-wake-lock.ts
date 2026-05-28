import { useEffect } from 'react';
import { useUiStore } from '../stores/ui.store.js';

type WakeLockSentinel = { release: () => Promise<void> };

export function useWakeLock(active: boolean) {
  const enabled = useUiStore((s) => s.wakeLockEnabled);
  useEffect(() => {
    if (!active || !enabled) return;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> };
    };
    if (!nav.wakeLock) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        sentinel = await nav.wakeLock!.request('screen');
      } catch {
        // ignore
      }
    };
    void request();
    const onVis = () => {
      if (document.visibilityState === 'visible' && !sentinel && !cancelled) void request();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      sentinel?.release().catch(() => undefined);
      sentinel = null;
    };
  }, [active, enabled]);
}
