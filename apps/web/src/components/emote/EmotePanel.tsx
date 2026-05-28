import { EMOTE_CODES, type EmoteCode } from '@bc/shared';
import { emit } from '../../socket/emit.js';
import { useEmoteStore } from '../../stores/emote.store.js';
import { useRoomStore } from '../../stores/room.store.js';

const ICONS: Record<EmoteCode, string> = {
  gg: '👏',
  nice: '🔥',
  thinking: '🤔',
  wow: '😮',
  oops: '😅',
  well_played: '🫡',
};

export function EmotePanel() {
  const code = useRoomStore((s) => s.view?.room.code);
  const muted = useEmoteStore((s) => (code ? s.mutedRooms.includes(code) : false));
  const toggleMute = useEmoteStore((s) => s.toggleMute);
  if (!code) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 pb-safe bg-bg/80 backdrop-blur-md border-t border-panel2 z-30">
      <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto">
        {EMOTE_CODES.map((c) => (
          <button
            key={c}
            onClick={() => void emit.sendEmote(c)}
            className="w-11 h-11 rounded-full bg-panel border border-panel2 text-xl shrink-0"
            aria-label={c}
          >
            {ICONS[c]}
          </button>
        ))}
        <button
          onClick={() => {
            const next = toggleMute(code);
            void emit.toggleMute(next);
          }}
          className="ml-auto w-11 h-11 rounded-full bg-panel border border-panel2 text-xl shrink-0"
          aria-label="mute"
        >
          {muted ? '🔇' : '🔔'}
        </button>
      </div>
    </div>
  );
}
