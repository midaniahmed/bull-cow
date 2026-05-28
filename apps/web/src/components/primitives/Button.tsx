import { type ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

type Size = 'lg' | 'md' | 'sm';
type Tone = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: Size;
  tone?: Tone;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { size = 'md', tone = 'primary', loading, disabled, className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx('btn', `btn-${size}`, `btn-${tone}`, className)}
      {...rest}
    >
      {loading ? <span className="animate-pulse">…</span> : children}
    </button>
  );
});
