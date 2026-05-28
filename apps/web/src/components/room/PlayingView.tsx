import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useOpponent, useRoomStore, useYou, useYourTurn } from '../../stores/room.store.js';
import { Button } from '../primitives/Button.js';
import { Card } from '../primitives/Card.js';
import { TimerRing } from '../primitives/TimerRing.js';
import { DigitInput } from '../inputs/DigitInput.js';
import { GuessLogList } from './GuessLogList.js';
import { emit } from '../../socket/emit.js';
import { ConfirmationModal } from '../primitives/ConfirmationModal.js';
import { useWakeLock } from '../../hooks/use-wake-lock.js';
import { useVibration } from '../../hooks/use-vibration.js';
import { spring } from '../../motion/index.js';
import clsx from 'clsx';

function StrikeCounter({ strikes, label, align }: { strikes: number; label: string; align: 'left' | 'right' }) {
  const pips = (
    <span className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={clsx(
            'w-2.5 h-2.5 rounded-full transition-all',
            i < strikes ? 'bg-danger shadow-glow-danger' : 'bg-white/10'
          )}
        />
      ))}
    </span>
  );
  return (
    <div className={clsx('flex items-center gap-1.5', align === 'right' && 'flex-row-reverse')}>
      <span className="text-xs text-muted truncate max-w-[7rem]">{label}</span>
      {pips}
    </div>
  );
}

export function PlayingView() {
  const view = useRoomStore((s) => s.view);
  const you = useYou();
  const opp = useOpponent();
  const yourTurn = useYourTurn();
  const reduce = useReducedMotion();
  const vibrate = useVibration();
  const [tab, setTab] = useState<'mine' | 'opp'>('mine');
  const [showSecret, setShowSecret] = useState(false);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const fogMode = view?.room.settings.advanced.fogMode ?? false;
  const isSim = view?.room.settings.match.turnSystem === 'simultaneous';
  useWakeLock(!!(view?.match && (yourTurn || isSim)));

  // Vibration tick when a new result lands in the log (signature reveal pairing).
  const logLen = view?.match?.guessLog.length ?? 0;
  const prevLen = useRef(logLen);
  useEffect(() => {
    if (logLen > prevLen.current) vibrate([12, 30, 12]);
    prevLen.current = logLen;
  }, [logLen, vibrate]);

  if (!view || !view.match || !you || !opp) return null;
  const m = view.match;
  const youAlreadySubmittedThisRound =
    isSim && m.guessLog.some((e) => e.playerToken === you.sessionToken && e.roundIndex === m.roundIndex);
  const canGuess = (yourTurn || isSim) && !youAlreadySubmittedThisRound;

  return (
    <div className="flex flex-col gap-3">
      {/* Turn handoff + timer */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          {isSim ? (
            <div className="font-semibold">Round {(m.roundIndex ?? 0) + 1}</div>
          ) : (
            <motion.div
              key={yourTurn ? 'you' : 'opp'}
              initial={reduce ? false : { opacity: 0, x: yourTurn ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={spring.snappy}
              className={clsx('flex items-center gap-2 font-semibold', yourTurn ? 'text-success' : 'text-muted')}
            >
              <span className={clsx('w-2 h-2 rounded-full', yourTurn ? 'bg-success shadow-glow animate-glow-pulse' : 'bg-muted')} />
              {yourTurn ? 'Your turn' : `${opp.nickname}'s turn`}
            </motion.div>
          )}
          <TimerRing endsAt={m.turnDeadline} />
        </div>
        <div className="flex items-center justify-between mt-3">
          <StrikeCounter strikes={you.strikes} label="you" align="left" />
          <StrikeCounter strikes={opp.strikes} label={opp.nickname} align="right" />
        </div>
      </Card>

      {/* Your secret — reference while you guess, hidden by default */}
      {m.yourSecret && (
        <button
          type="button"
          onClick={() => setShowSecret((v) => !v)}
          aria-pressed={showSecret}
          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left active:scale-[0.99] transition-transform"
        >
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted">Your secret</span>
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              {m.yourSecret.split('').map((d, i) => (
                <span
                  key={i}
                  className={clsx(
                    'flex h-7 w-6 items-center justify-center rounded-md border border-white/10 bg-white/5 font-mono text-base tabular-nums',
                    showSecret ? 'text-ink' : 'text-muted'
                  )}
                >
                  {showSecret ? d : '•'}
                </span>
              ))}
            </span>
            <span className="text-base leading-none" aria-hidden>
              {showSecret ? '🙈' : '👁'}
            </span>
          </span>
        </button>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {(['mine', 'opp'] as const).map((t) => (
          <button
            key={t}
            className="relative flex-1 h-10 rounded-lg text-sm font-medium"
            onClick={() => setTab(t)}
          >
            {tab === t && (
              <motion.span
                layoutId="tabhl"
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-accent to-accent2 shadow-glow"
                transition={spring.snappy}
              />
            )}
            <span className={clsx('relative z-10', tab === t ? 'text-bg' : 'text-muted')}>
              {t === 'mine' ? 'My Guesses' : 'Opponent'}
            </span>
          </button>
        ))}
      </div>

      <Card animate={false}>
        {tab === 'opp' && fogMode ? (
          <div className="text-sm text-muted text-center py-4 font-mono">
            🌫 Opponent's guesses are hidden by fog mode.
          </div>
        ) : (
          <GuessLogList
            entries={m.guessLog}
            filterToken={tab === 'mine' ? you.sessionToken : opp.sessionToken}
          />
        )}
      </Card>

      {canGuess ? (
        <motion.div
          className={clsx('rounded-2xl p-3', !reduce && !isSim && 'animate-breathe-border')}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.soft}
        >
          <DigitInput
            rules={view.room.settings.number}
            submitLabel="Submit guess"
            onSubmit={async (v) => emit.submitGuess(v)}
            autoFocus
          />
        </motion.div>
      ) : (
        <Card className="text-center text-sm text-muted">
          {isSim ? '🔒 Locked in. Waiting for round to end…' : `${opp.nickname} is guessing…`}
        </Card>
      )}

      <Button size="sm" tone="ghost" onClick={() => setConfirmForfeit(true)} className="text-danger/80">
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
