import { type ReactNode } from 'react';
import { motion, useReducedMotion, type MotionProps } from 'framer-motion';
import clsx from 'clsx';
import { fadeRise } from '../../motion/index.js';

type Props = {
  className?: string;
  children?: ReactNode;
  /** Set false to opt out of the entrance animation (e.g. inside a stagger parent). */
  animate?: boolean;
} & Omit<MotionProps, 'children'>;

export function Card({ className, children, animate = true, ...rest }: Props) {
  const reduce = useReducedMotion();
  const motionProps: MotionProps =
    animate && !reduce
      ? { variants: fadeRise, initial: 'hidden', animate: 'show', ...rest }
      : rest;
  return (
    <motion.div className={clsx('card', className)} {...motionProps}>
      {children}
    </motion.div>
  );
}
