import { useEffect, useState } from 'react';

export function useCountdown(endsAt: string | number | null, paused = false): number | null {
  const target = endsAt == null ? null : typeof endsAt === 'string' ? new Date(endsAt).getTime() : endsAt;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (target == null || paused) return;
    let raf = 0;
    const tick = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, paused]);

  if (target == null) return null;
  return Math.max(0, target - now);
}
