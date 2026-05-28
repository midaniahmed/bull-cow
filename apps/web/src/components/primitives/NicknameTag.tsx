import type { PlayerPublic } from '@bc/shared';

function colorFromToken(token: string): string {
  let h = 0;
  for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) % 360;
  return `hsl(${h} 60% 45%)`;
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
  return (
    <div className="inline-flex items-center gap-2">
      <div
        className={`${sz} rounded-full flex items-center justify-center text-white font-semibold`}
        style={{ background: colorFromToken(player.sessionToken) }}
      >
        {initial}
      </div>
      <div className="flex flex-col leading-tight">
        <span className="font-medium">
          {player.nickname}
          {isYou ? <span className="ml-1 text-xs text-muted">(you)</span> : null}
        </span>
        {!player.connected ? (
          <span className="text-xs text-warn">offline</span>
        ) : null}
      </div>
    </div>
  );
}
