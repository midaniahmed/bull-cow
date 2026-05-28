import { useState } from 'react';
import { useOpponent, useRoomStore, useYou, useYourTurn } from '../../stores/room.store.js';
import { Button } from '../primitives/Button.js';
import { Card } from '../primitives/Card.js';
import { Countdown } from '../primitives/Countdown.js';
import { DigitInput } from '../inputs/DigitInput.js';
import { GuessLogList } from './GuessLogList.js';
import { emit } from '../../socket/emit.js';
import { ConfirmationModal } from '../primitives/ConfirmationModal.js';
import { useWakeLock } from '../../hooks/use-wake-lock.js';
import clsx from 'clsx';

function StrikeCounter({ strikes, label }: { strikes: number; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted">{label}</span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={clsx('w-3 h-3 rounded-sm', i < strikes ? 'bg-danger' : 'bg-panel2')}
        />
      ))}
    </div>
  );
}

export function PlayingView() {
  const view = useRoomStore((s) => s.view);
  const you = useYou();
  const opp = useOpponent();
  const yourTurn = useYourTurn();
  const [tab, setTab] = useState<'mine' | 'opp'>('mine');
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const fogMode = view?.room.settings.advanced.fogMode ?? false;
  useWakeLock(!!(view?.match && (yourTurn || view.room.settings.match.turnSystem === 'simultaneous')));

  if (!view || !view.match || !you || !opp) return null;
  const m = view.match;
  const isSim = view.room.settings.match.turnSystem === 'simultaneous';
  const youAlreadySubmittedThisRound =
    isSim && m.guessLog.some((e) => e.playerToken === you.sessionToken && e.roundIndex === m.roundIndex);

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            {isSim ? (
              <div className="text-sm">Round {(m.roundIndex ?? 0) + 1}</div>
            ) : (
              <div className={clsx('font-medium', yourTurn ? 'text-success' : 'text-muted')}>
                {yourTurn ? 'Your turn' : "Opponent's turn"}
              </div>
            )}
          </div>
          <Countdown endsAt={m.turnDeadline} className="font-mono text-warn text-lg" />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs">
          <StrikeCounter strikes={you.strikes} label={`${you.nickname} (you)`} />
          <StrikeCounter strikes={opp.strikes} label={opp.nickname} />
        </div>
      </Card>

      <div className="flex bg-bg rounded-lg p-1">
        <button
          className={clsx('flex-1 h-10 rounded-md text-sm', tab === 'mine' ? 'bg-accent text-bg' : 'text-muted')}
          onClick={() => setTab('mine')}
        >
          My Guesses
        </button>
        <button
          className={clsx('flex-1 h-10 rounded-md text-sm', tab === 'opp' ? 'bg-accent text-bg' : 'text-muted')}
          onClick={() => setTab('opp')}
        >
          Opponent's Guesses
        </button>
      </div>

      <Card>
        {tab === 'opp' && fogMode ? (
          <div className="text-sm text-muted text-center py-3">
            Opponent's guesses are hidden by fog mode.
          </div>
        ) : (
          <GuessLogList
            entries={m.guessLog}
            filterToken={tab === 'mine' ? you.sessionToken : opp.sessionToken}
          />
        )}
      </Card>

      {(yourTurn || isSim) && !youAlreadySubmittedThisRound ? (
        <DigitInput
          rules={view.room.settings.number}
          submitLabel="Submit guess"
          onSubmit={async (v) => emit.submitGuess(v)}
          autoFocus
        />
      ) : (
        <Card className="text-center text-sm text-muted">
          {isSim ? 'Locked in. Waiting for round to end…' : 'Opponent is guessing…'}
        </Card>
      )}

      <Button size="sm" tone="danger" onClick={() => setConfirmForfeit(true)}>
        Forfeit
      </Button>
      <ConfirmationModal
        open={confirmForfeit}
        title="Forfeit this match?"
        body="This counts as a loss."
        destructive
        confirmLabel="Forfeit"
        onConfirm={() => {
          setConfirmForfeit(false);
          void emit.forfeit();
        }}
        onCancel={() => setConfirmForfeit(false)}
      />
    </div>
  );
}
