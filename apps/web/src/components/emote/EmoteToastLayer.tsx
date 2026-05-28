import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEmoteStore } from '../../stores/emote.store.js';
import { useRoomStore } from '../../stores/room.store.js';
import { useVibration } from '../../hooks/use-vibration.js';
import type { EmoteCode } from '@bc/shared';
import { spring } from '../../motion/index.js';

const ICONS: Record<EmoteCode, string> = {
  gg: '👏',
  nice: '🔥',
  thinking: '🤔',
  wow: '😮',
  oops: '😅',
  well_played: '🫡',
};

export function EmoteToastLayer() {
  const items = useEmoteStore((s) => s.incoming);
  const prune = useEmoteStore((s) => s.prune);
  const you = useRoomStore((s) => s.view?.yourToken);
  const vibrate = useVibration();
  const reduce = useReducedMotion();

  useEffect(() => {
    const t = setInterval(prune, 500);
    return () => clearInterval(t);
  }, [prune]);

  useEffect(() => {
    if (items.some((i) => i.fromToken !== you)) vibrate(20);
  }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-x-0 top-16 z-40 flex flex-col items-center gap-2 px-4 pointer-events-none">
      <AnimatePresence>
        {items.slice(-4).map((i, idx) => (
          <motion.div
            key={i.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, y: 20 }}
            animate={
              reduce
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, y: -8, rotate: idx % 2 ? 6 : -6 }
            }
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: -28 }}
            transition={spring.bouncy}
            className="pointer-events-none glass rounded-full px-3 py-1.5 text-xl flex items-center gap-2"
          >
            <span>{ICONS[i.code]}</span>
            <span className="text-xs text-muted">{i.fromToken === you ? 'you' : 'opp'}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
