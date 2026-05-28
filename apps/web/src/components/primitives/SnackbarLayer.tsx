import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { useUiStore } from '../../stores/ui.store.js';
import { spring } from '../../motion/index.js';

export function SnackbarLayer() {
  const items = useUiStore((s) => s.snackbars);
  const dismiss = useUiStore((s) => s.dismissSnackbar);
  return (
    <div className="fixed bottom-20 inset-x-0 z-40 flex flex-col items-center gap-2 px-4 pointer-events-none">
      <AnimatePresence initial={false}>
        {items.map((s) => (
          <motion.div
            key={s.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={spring.snappy}
            onClick={() => dismiss(s.id)}
            className={clsx(
              'pointer-events-auto px-4 py-2 rounded-xl text-sm font-medium max-w-md border backdrop-blur-md shadow-glass',
              s.tone === 'error'
                ? 'bg-danger/15 border-danger/40 text-danger'
                : s.tone === 'success'
                ? 'bg-success/15 border-success/40 text-success'
                : 'bg-panel border-white/10 text-ink'
            )}
          >
            {s.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
