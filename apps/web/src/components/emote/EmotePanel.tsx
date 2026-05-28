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
    <div className="fixed inset-x-0 bottom-0 pb-safe bg-bg/70 backdrop-blur-xl border-t border-white/10 z-30">
      <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto">
        {EMOTE_CODES.map((c) => (
          <button
            key={c}
            onClick={() => void emit.sendEmote(c)}
            className="w-11 h-11 rounded-full bg-white/5 border border-white/10 text-xl shrink-0 transition-all hover:border-accent/40 hover:bg-white/10 active:scale-90"
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
          className="ml-auto w-11 h-11 rounded-full bg-white/5 border border-white/10 text-xl shrink-0 transition-all active:scale-90"
          aria-label="mute"
        >
          {muted ? '🔇' : '🔔'}
        </button>
      </div>
    </div>
  );
}
