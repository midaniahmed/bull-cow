import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import { spring } from '../../motion/index.js';

type Size = 'lg' | 'md' | 'sm';
type Tone = 'primary' | 'secondary' | 'danger' | 'ghost';

// Static maps so Tailwind's content scanner sees the literal class names.
// (Building them as `btn-${tone}` template strings gets the rules tree-shaken.)
const SIZE_CLASS: Record<Size, string> = {
  lg: 'btn-lg',
  md: 'btn-md',
  sm: 'btn-sm',
};
const TONE_CLASS: Record<Tone, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
};

// Strip the handful of DOM handlers whose signatures collide with Framer Motion's.
type NativeProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onDrag' | 'onDragStart' | 'onDragEnd'
>;

type Props = NativeProps & {
  size?: Size;
  tone?: Tone;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { size = 'md', tone = 'primary', loading, disabled, className, children, ...rest },
  ref
) {
  const reduce = useReducedMotion();
  const isDisabled = disabled || loading;
  return (
    <motion.button
      ref={ref}
      disabled={isDisabled}
      whileTap={reduce || isDisabled ? undefined : { scale: 0.96 }}
      transition={spring.snappy}
      className={clsx('btn', SIZE_CLASS[size], TONE_CLASS[tone], className)}
      {...rest}
    >
      {/* Loading state = a glow sweep across the face, not a "…". */}
      {loading && !reduce ? (
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
          <span className="absolute inset-y-0 w-1/3 bg-white/30 blur-md animate-sweep" />
        </span>
      ) : null}
      <span className={clsx('inline-flex items-center justify-center gap-2', loading && 'opacity-70')}>
        {children}
      </span>
    </motion.button>
  );
});
