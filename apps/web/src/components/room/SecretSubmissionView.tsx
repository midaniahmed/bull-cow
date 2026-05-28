import { useRoomStore } from '../../stores/room.store.js';
import { DigitInput } from '../inputs/DigitInput.js';
import { Card } from '../primitives/Card.js';
import { Countdown } from '../primitives/Countdown.js';
import { emit } from '../../socket/emit.js';

export function SecretSubmissionView() {
  const view = useRoomStore((s) => s.view);
  if (!view || !view.match) return null;
  const yourSecret = view.match.yourSecret;
  const oppLocked = view.match.opponentSecretSubmitted;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center justify-between">
          <span>Choose your secret number</span>
          <Countdown endsAt={view.match.secretDeadline} className="font-mono text-warn" />
        </div>
      </Card>
      {yourSecret ? (
        <Card className="text-center">
          <div className="text-sm text-muted">Your secret</div>
          <div className="font-mono text-3xl tracking-widest my-2">{yourSecret}</div>
          <div className="text-sm">
            {oppLocked ? 'Both secrets locked — starting…' : 'Waiting for opponent…'}
          </div>
        </Card>
      ) : (
        <DigitInput
          rules={view.room.settings.number}
          submitLabel="Lock secret"
          onSubmit={async (v) => emit.submitSecret(v)}
          autoFocus
        />
      )}
      {yourSecret ? null : (
        <div className="text-center text-sm text-muted">
          Opponent: {oppLocked ? 'locked' : 'choosing…'}
        </div>
      )}
    </div>
  );
}
