import clsx from 'clsx';

export function DigitCells({
  value,
  length,
  charset = 'digits',
  className,
}: {
  value: string;
  length: number;
  charset?: 'digits' | 'alnum';
  className?: string;
}) {
  const cells = Array.from({ length }, (_, i) => value[i] ?? '');
  return (
    <div className={clsx('flex gap-2 justify-center', className)}>
      {cells.map((c, i) => (
        <div
          key={i}
          className={clsx(
            'digit-cell',
            c && 'filled',
            i === value.length && 'active'
          )}
        >
          {c || (charset === 'digits' ? '·' : '_')}
        </div>
      ))}
    </div>
  );
}
