import { motion, useReducedMotion } from 'framer-motion';
import { useRoomStore } from '../../stores/room.store.js';
import { Card } from '../primitives/Card.js';
import { TimerRing } from '../primitives/TimerRing.js';
import { emit } from '../../socket/emit.js';
import type { RPSPick } from '@bc/shared';
import { spring } from '../../motion/index.js';
import clsx from 'clsx';

const CHOICES: { v: RPSPick; emoji: string; label: string }[] = [
  { v: 'rock', emoji: '🪨', label: 'Rock' },
  { v: 'paper', emoji: '📄', label: 'Paper' },
  { v: 'scissors', emoji: '✂️', label: 'Scissors' },
];

export function RPSView() {
  const view = useRoomStore((s) => s.view);
  const reduce = useReducedMotion();
  if (!view?.match) return null;
  const m = view.match;
  const yourPick = m.yourRPSPick;
  const oppLocked = m.opponentRPSPickLocked;
  const round = m.rpsRound ?? 1;
  const bothLocked = !!yourPick && oppLocked;

  return (
    <div className="flex flex-col gap-4">
      <Card className="text-center">
        <div className="text-xs uppercase tracking-widest text-muted">Round {round}/3 · who goes first</div>
        <div className="text-2xl font-bold text-grad mt-1">Rock · Paper · Scissors</div>
        <div className="mt-2 flex justify-center">
          <TimerRing endsAt={view.match?.turnDeadline ?? null} />
        </div>
      </Card>

      {/* Clash arena */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <motion.div
          initial={reduce ? false : { x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={spring.snappy}
          className="text-center text-sm text-muted"
        >
          You
          <div className="text-3xl mt-1">{yourPick ? CHOICES.find((c) => c.v === yourPick)?.emoji : '❔'}</div>
        </motion.div>
        <motion.div
          key={bothLocked ? 'clash' : 'idle'}
          animate={bothLocked && !reduce ? { scale: [1, 1.5, 1], rotate: [0, -8, 8, 0] } : {}}
          transition={{ duration: 0.4 }}
          className={clsx('font-bold text-lg px-2', bothLocked ? 'text-bull' : 'text-muted')}
        >
          VS
        </motion.div>
        <motion.div
          initial={reduce ? false : { x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={spring.snappy}
          className="text-center text-sm text-muted"
        >
          Opponent
          <div className="text-3xl mt-1">{oppLocked ? '🔒' : '❔'}</div>
        </motion.div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {CHOICES.map((c) => {
          const selected = yourPick === c.v;
          return (
            <motion.button
              key={c.v}
              disabled={!!yourPick}
              onClick={() => void emit.rpsPick(c.v)}
              whileTap={reduce || yourPick ? undefined : { scale: 0.94 }}
              animate={selected && !reduce ? { scale: [1, 1.06, 1] } : {}}
              transition={spring.bouncy}
              className={clsx(
                'h-28 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all',
                selected
                  ? 'border-accent text-accent shadow-glow bg-accent/10'
                  : 'border-white/10 bg-white/[0.03] disabled:opacity-40'
              )}
            >
              <span className="text-4xl">{c.emoji}</span>
              <span className="text-xs">{c.label}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="text-center text-sm text-muted">
        {yourPick ? (oppLocked ? 'Resolving…' : 'Waiting for opponent…') : 'Make your pick'}
      </div>
    </div>
  );
}
