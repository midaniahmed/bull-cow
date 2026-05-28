import type { PlayerPublic } from '@bc/shared';

function hueFromToken(token: string): number {
  let h = 0;
  for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) % 360;
  return h;
}

export function NicknameTag({
  player,
  isYou,
  size = 'md',
}: {
  player: PlayerPublic;
  isYou?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sz = size === 'sm' ? 'w-8 h-8 text-sm' : size === 'lg' ? 'w-12 h-12 text-lg' : 'w-10 h-10 text-base';
  const initial = (player.nickname[0] ?? '?').toUpperCase();
  const hue = hueFromToken(player.sessionToken);
  return (
    <div className="inline-flex items-center gap-2.5">
      <div className="relative">
        <div
          className={`${sz} rounded-full flex items-center justify-center text-white font-semibold ring-1 ring-white/15`}
          style={{
            background: `linear-gradient(135deg, hsl(${hue} 75% 55%), hsl(${(hue + 50) % 360} 75% 45%))`,
            boxShadow: `0 0 16px -3px hsl(${hue} 80% 55% / 0.7)`,
          }}
        >
          {initial}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-bg ${
            player.connected ? 'bg-success' : 'bg-warn'
          }`}
        />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="font-medium">
          {player.nickname}
          {isYou ? <span className="ml-1 text-xs text-muted">(you)</span> : null}
        </span>
        {!player.connected ? <span className="text-xs text-warn">offline</span> : null}
      </div>
    </div>
  );
}
