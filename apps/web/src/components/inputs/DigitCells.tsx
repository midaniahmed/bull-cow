import clsx from 'clsx';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { popIn, stagger, spring } from '../../motion/index.js';

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
  const reduce = useReducedMotion();
  const cells = Array.from({ length }, (_, i) => value[i] ?? '');
  return (
    <motion.div
      className={clsx('flex gap-2 justify-center', className)}
      variants={reduce ? undefined : stagger(0.04)}
      initial={reduce ? false : 'hidden'}
      animate="show"
    >
      {cells.map((c, i) => {
        const active = i === value.length;
        return (
          <motion.div
            key={i}
            variants={reduce ? undefined : popIn}
            className={clsx('digit-cell', c && 'filled', active && 'active')}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={c || 'empty'}
                initial={reduce ? false : { opacity: 0, scale: 0.5, y: -4 }}
                animate={{ opacity: c ? 1 : 0.4, scale: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5, y: 4 }}
                transition={spring.bouncy}
              >
                {c || (charset === 'digits' ? '·' : '_')}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
