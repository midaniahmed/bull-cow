import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { spring } from '../../motion/index.js';

type Props = {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  title?: string;
};

export function Modal({ open, onClose, children, title }: Props) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm pt-safe pb-safe"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="glass w-full sm:max-w-md rounded-b-none sm:rounded-2xl rounded-t-2xl p-5 pb-safe"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.98 }}
            transition={spring.soft}
          >
            {title ? <h2 className="text-lg font-semibold mb-3">{title}</h2> : null}
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
