import { useUiStore } from '../../stores/ui.store.js';
import clsx from 'clsx';

export function SnackbarLayer() {
  const items = useUiStore((s) => s.snackbars);
  const dismiss = useUiStore((s) => s.dismissSnackbar);
  return (
    <div className="fixed bottom-20 inset-x-0 z-40 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {items.map((s) => (
        <div
          key={s.id}
          onClick={() => dismiss(s.id)}
          className={clsx(
            'pointer-events-auto px-4 py-2 rounded-lg shadow-lg text-sm max-w-md',
            s.tone === 'error'
              ? 'bg-danger text-bg'
              : s.tone === 'success'
              ? 'bg-success text-bg'
              : 'bg-panel2 text-ink'
          )}
        >
          {s.message}
        </div>
      ))}
    </div>
  );
}
