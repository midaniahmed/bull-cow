import { useCountdown } from '../../hooks/use-countdown.js';

type Props = {
  endsAt: string | number | null;
  paused?: boolean;
  format?: 'mm:ss' | 'ss';
  className?: string;
};

export function Countdown({ endsAt, paused, format = 'ss', className }: Props) {
  const ms = useCountdown(endsAt, paused);
  if (ms == null) return <span className={className}>—</span>;
  const total = Math.ceil(ms / 1000);
  if (format === 'mm:ss') {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return <span className={className}>{`${m}:${s.toString().padStart(2, '0')}`}</span>;
  }
  return <span className={className}>{total}s</span>;
}
