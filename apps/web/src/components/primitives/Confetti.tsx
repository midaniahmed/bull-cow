import { motion, useReducedMotion } from 'framer-motion';

const COLORS = ['#3ee0ff', '#a875ff', '#ffc04d', '#5cf2a3', '#ff5d6c'];

/**
 * Hand-rolled confetti burst. Trajectories vary deterministically by index
 * (no module-scope Math.random), animate transform/opacity only.
 */
export function Confetti({ count = 24 }: { count?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden flex items-start justify-center">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const dist = 120 + (i % 5) * 40;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist - 60;
        const rotate = (i % 2 ? 1 : -1) * (180 + (i % 4) * 90);
        const color = COLORS[i % COLORS.length];
        const delay = (i % 6) * 0.03;
        return (
          <motion.span
            key={i}
            className="absolute top-1/3 w-2 h-3 rounded-sm"
            style={{ background: color }}
            initial={{ opacity: 1, x: 0, y: 0, scale: 0.6, rotate: 0 }}
            animate={{ opacity: [1, 1, 0], x, y, scale: 1, rotate }}
            transition={{ duration: 1.1, delay, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}
