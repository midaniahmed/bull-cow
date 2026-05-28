import type { GuessLogEntry, SessionToken } from '@bc/shared';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import { popIn, stagger, spring } from '../../motion/index.js';

function Pips({ count, kind, animate }: { count: number; kind: 'bull' | 'cow'; animate: boolean }) {
  const reduce = useReducedMotion();
  if (count === 0) return null;
  return (
    <motion.span
      className="inline-flex items-center gap-0.5"
      variants={!reduce && animate ? stagger(0.06) : undefined}
      initial={!reduce && animate ? 'hidden' : false}
      animate="show"
    >
      {Array.from({ length: count }, (_, i) => (
        <motion.span
          key={i}
          variants={!reduce && animate ? popIn : undefined}
          className={clsx(
            'w-3.5 h-3.5 rounded-full',
            kind === 'bull' ? 'bg-bull shadow-glow-bull' : 'bg-cow shadow-glow'
          )}
        />
      ))}
    </motion.span>
  );
}

export function GuessLogList({
  entries,
  filterToken,
}: {
  entries: GuessLogEntry[];
  filterToken?: SessionToken;
}) {
  const reduce = useReducedMotion();
  const list = filterToken ? entries.filter((e) => e.playerToken === filterToken) : entries;
  if (list.length === 0) {
    return <div className="text-sm text-muted text-center py-4 font-mono">No guesses yet</div>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      <AnimatePresence initial={false}>
        {list.map((e, i) => {
          const latest = i === list.length - 1;
          return (
            <motion.li
              key={`${e.playerToken}:${e.turnIndex}:${i}`}
              layout
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring.snappy}
              className={clsx(
                'flex items-center justify-between rounded-xl px-3 py-2 border',
                latest ? 'border-accent/40 bg-accent/5 shadow-glow' : 'border-white/5 bg-white/[0.03]'
              )}
            >
              <span className="text-xs text-muted font-mono w-7">#{(e.roundIndex ?? e.turnIndex) + 1}</span>
              <span className="font-mono text-xl tracking-[0.15em] tnum">{e.value}</span>
              <span className="flex items-center gap-2.5">
                <span className="flex items-center gap-1">
                  <Pips count={e.bulls} kind="bull" animate={latest} />
                  <span className="text-xs text-bull font-mono tnum">{e.bulls}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Pips count={e.cows} kind="cow" animate={latest} />
                  <span className="text-xs text-cow font-mono tnum">{e.cows}</span>
                </span>
              </span>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
