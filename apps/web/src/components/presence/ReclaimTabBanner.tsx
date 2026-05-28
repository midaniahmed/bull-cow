import { useConnectionStore } from '../../stores/connection.store.js';
import { Button } from '../primitives/Button.js';
import { emit } from '../../socket/emit.js';

export function ReclaimTabBanner() {
  const status = useConnectionStore((s) => s.tabStatus);
  if (status !== 'demoted') return null;
  return (
    <div className="sticky top-0 z-30 bg-danger/20 border border-danger rounded-md px-3 py-2 mb-2 text-sm flex items-center justify-between">
      <span>This room is open in another tab.</span>
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
    </div>
  );
}
