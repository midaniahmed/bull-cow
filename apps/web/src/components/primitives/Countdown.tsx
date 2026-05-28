import clsx from 'clsx';
import { useCountdown } from '../../hooks/use-countdown.js';

type Props = {
  endsAt: string | number | null;
  paused?: boolean;
  format?: 'mm:ss' | 'ss';
  className?: string;
};

export function Countdown({ endsAt, paused, format = 'ss', className }: Props) {
  const ms = useCountdown(endsAt, paused);
  if (ms == null) return <span className={clsx('tnum', className)}>—</span>;
  const total = Math.ceil(ms / 1000);
  const low = total <= 5;
  const text =
    format === 'mm:ss'
      ? `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`
      : `${total}s`;
  return (
    <span className={clsx('tnum', low && 'text-danger animate-glow-pulse', className)}>{text}</span>
  );
}
