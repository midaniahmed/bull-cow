import { AnimatePresence, motion } from 'framer-motion';
import { useOpponent } from '../../stores/room.store.js';
import { spring } from '../../motion/index.js';

export function DisconnectBanner() {
  const opp = useOpponent();
  const show = !!opp && !opp.connected;
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={spring.snappy}
          className="sticky top-0 z-30 mb-2 flex items-center gap-2 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-sm backdrop-blur-md"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-warn opacity-60 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-warn" />
          </span>
          <span className="text-ink/90">Opponent disconnected — waiting for them to return</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
