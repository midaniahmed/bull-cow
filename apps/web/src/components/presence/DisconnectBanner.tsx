import { useOpponent } from '../../stores/room.store.js';
import { Countdown } from '../primitives/Countdown.js';

export function DisconnectBanner() {
  const opp = useOpponent();
  if (!opp || opp.connected) return null;
  return (
    <div className="sticky top-0 z-30 bg-warn/20 border border-warn rounded-md px-3 py-2 mb-2 text-sm flex items-center justify-between">
      <span>Opponent disconnected — waiting</span>
      <span className="font-mono text-xs text-warn">
        <Countdown endsAt={null} />
      </span>
    </div>
  );
}
