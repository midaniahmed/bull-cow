import { AnimatePresence, motion } from 'framer-motion';
import { useConnectionStore } from '../../stores/connection.store.js';
import { Button } from '../primitives/Button.js';
import { emit } from '../../socket/emit.js';
import { spring } from '../../motion/index.js';

export function ReclaimTabBanner() {
  const status = useConnectionStore((s) => s.tabStatus);
  return (
    <AnimatePresence>
      {status === 'demoted' ? (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={spring.snappy}
          className="sticky top-0 z-30 mb-2 flex items-center justify-between gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm backdrop-blur-md"
        >
          <span className="text-ink/90">This room is open in another tab.</span>
          <Button
            size="sm"
            onClick={() => {
              void emit.reclaimTab().then((r) => {
                if (r.ok) useConnectionStore.getState().set({ tabStatus: 'active' });
              });
            }}
          >
            Reconnect here
          </Button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
