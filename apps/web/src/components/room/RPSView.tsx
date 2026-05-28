import { useRoomStore } from '../../stores/room.store.js';
import { Button } from '../primitives/Button.js';
import { Card } from '../primitives/Card.js';
import { Countdown } from '../primitives/Countdown.js';
import { emit } from '../../socket/emit.js';
import type { RPSPick } from '@bc/shared';

const CHOICES: { v: RPSPick; emoji: string; label: string }[] = [
  { v: 'rock', emoji: '🪨', label: 'Rock' },
  { v: 'paper', emoji: '📄', label: 'Paper' },
  { v: 'scissors', emoji: '✂️', label: 'Scissors' },
];

export function RPSView() {
  const view = useRoomStore((s) => s.view);
  if (!view?.match) return null;
  const m = view.match;
  const yourPick = m.yourRPSPick;
  const oppLocked = m.opponentRPSPickLocked;
  const round = m.rpsRound ?? 1;

  return (
    <div className="flex flex-col gap-4">
      <Card className="text-center">
        <div className="text-sm text-muted">Round {round}/3</div>
        <div className="text-lg">Rock, paper, scissors!</div>
        <Countdown endsAt={view.match?.turnDeadline ?? null} className="font-mono text-warn" />
      </Card>
      <div className="grid grid-cols-3 gap-2">
        {CHOICES.map((c) => (
          <Button
            key={c.v}
            size="lg"
            tone={yourPick === c.v ? 'primary' : 'secondary'}
            disabled={!!yourPick}
            onClick={() => void emit.rpsPick(c.v)}
            className="h-24 flex flex-col"
          >
            <span className="text-3xl">{c.emoji}</span>
            <span className="text-xs mt-1">{c.label}</span>
          </Button>
        ))}
      </div>
      <div className="text-center text-sm text-muted">
        You: {yourPick ?? '…'} · Opponent: {oppLocked ? 'locked' : 'choosing…'}
      </div>
    </div>
  );
}
