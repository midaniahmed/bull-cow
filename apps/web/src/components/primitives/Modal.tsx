import type { ReactNode } from 'react';
import { useEffect } from 'react';

type Props = {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  title?: string;
};

export function Modal({ open, onClose, children, title }: Props) {
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

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 pt-safe pb-safe"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-panel rounded-t-2xl sm:rounded-2xl p-5 pb-safe shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title ? <h2 className="text-lg font-semibold mb-3">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}
