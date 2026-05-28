import { useEffect } from 'react';
import { useEmoteStore } from '../../stores/emote.store.js';
import { useRoomStore } from '../../stores/room.store.js';
import { useVibration } from '../../hooks/use-vibration.js';
import type { EmoteCode } from '@bc/shared';

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

  useEffect(() => {
    const t = setInterval(prune, 500);
    return () => clearInterval(t);
  }, [prune]);

  useEffect(() => {
    if (items.some((i) => i.fromToken !== you)) {
      vibrate(20);
    }
  }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-x-0 top-16 z-40 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {items.slice(-4).map((i) => (
        <div
          key={i.id}
          className="pointer-events-none bg-panel border border-panel2 rounded-full px-3 py-1 text-lg flex items-center gap-2"
        >
          <span>{ICONS[i.code]}</span>
          <span className="text-xs text-muted">{i.fromToken === you ? 'you' : 'opp'}</span>
        </div>
      ))}
    </div>
  );
}
