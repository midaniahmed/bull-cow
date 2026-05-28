import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useCountdown } from '../../hooks/use-countdown.js';

type Props = {
  endsAt: string | number | null;
  paused?: boolean;
  size?: number;
  className?: string;
};

const R = 18;
const C = 2 * Math.PI * R;

/**
 * Depleting timer ring. The full ring = the longest remaining time we've seen
 * for the current `endsAt` (re-armed whenever the deadline changes), so it
 * works without being told the turn's total duration.
 */
export function TimerRing({ endsAt, paused, size = 48, className }: Props) {
  const ms = useCountdown(endsAt, paused);
  const maxRef = useRef(0);
  const keyRef = useRef<string | number | null>(null);

  // Re-arm the ring when the deadline changes (new turn / new round).
  if (keyRef.current !== endsAt) {
    keyRef.current = endsAt;
    maxRef.current = ms ?? 0;
  }
  if (ms != null && ms > maxRef.current) maxRef.current = ms;

  const frac = ms != null && maxRef.current > 0 ? ms / maxRef.current : 0;
  const total = ms == null ? null : Math.ceil(ms / 1000);
  const low = total != null && total <= 5;
  const mid = total != null && total <= 10;
  const stroke = low ? '#ff5d6c' : mid ? '#ffc04d' : '#3ee0ff';

  // Glow pulse in the final seconds.
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (wrapRef.current) wrapRef.current.style.filter = low ? `drop-shadow(0 0 8px ${stroke})` : 'none';
  }, [low, stroke]);

  return (
    <div
      ref={wrapRef}
      className={clsx('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle
          cx="22"
          cy="22"
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          style={{ transition: 'stroke 0.4s linear' }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-mono text-sm tnum"
        style={{ color: stroke }}
      >
        {total == null ? '—' : total}
      </span>
    </div>
  );
}
