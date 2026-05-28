import type { RoomSettings } from '@bc/shared';
import { Card } from '../primitives/Card.js';

export function SettingsSummary({ settings }: { settings: RoomSettings }) {
  const { number, match, advanced } = settings;
  const lines = [
    `${number.length}-digit numbers`,
    number.allowDuplicateDigits ? 'duplicates allowed' : 'unique digits',
    number.allowLeadingZero ? 'leading zero ok' : 'no leading zero',
    `${match.turnSystem} turns`,
    `first turn: ${match.firstTurn}`,
    `turn time: ${match.turnTimeLimitSeconds == null ? 'none' : `${match.turnTimeLimitSeconds}s`}`,
    advanced.fogMode ? 'fog mode' : null,
  ].filter(Boolean) as string[];

  return (
    <Card>
      <div className="font-semibold mb-2 text-xs uppercase tracking-widest text-muted">Settings</div>
      <ul className="text-xs flex flex-wrap gap-1.5 font-mono">
        {lines.map((l) => (
          <li key={l} className="px-2 py-1 rounded-md border border-white/10 bg-white/5 text-ink/90">
            {l}
          </li>
        ))}
      </ul>
    </Card>
  );
}
