import type { Variants, Transition } from 'framer-motion';

// Spring presets — name them, reuse them. No ad-hoc easing anywhere else.
export const spring = {
  snappy: { type: 'spring', stiffness: 500, damping: 30 } as Transition, // buttons, chips, toasts
  soft: { type: 'spring', stiffness: 260, damping: 24 } as Transition, // panels, cards, pages
  bouncy: { type: 'spring', stiffness: 400, damping: 14 } as Transition, // celebratory pops
} as const;

// Reusable variants ----------------------------------------------------------

export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: spring.soft },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: spring.bouncy },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: spring.snappy },
  exit: { opacity: 0, y: 16, transition: { duration: 0.15 } },
};

// Stagger container for lists (guess log, lobby players, digit cells, CTAs).
export const stagger = (gap = 0.05, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});
