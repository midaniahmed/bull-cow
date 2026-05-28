import { motion, useReducedMotion } from 'framer-motion';
import { useRoomStore } from '../../stores/room.store.js';
import { DigitInput } from '../inputs/DigitInput.js';
import { Card } from '../primitives/Card.js';
import { TimerRing } from '../primitives/TimerRing.js';
import { emit } from '../../socket/emit.js';
import { spring } from '../../motion/index.js';

export function SecretSubmissionView() {
  const view = useRoomStore((s) => s.view);
  const reduce = useReducedMotion();
  if (!view || !view.match) return null;
  const yourSecret = view.match.yourSecret;
  const oppLocked = view.match.opponentSecretSubmitted;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold">Choose your secret code</span>
          <TimerRing endsAt={view.match.secretDeadline} />
        </div>
      </Card>

      {yourSecret ? (
        <motion.div
          initial={reduce ? false : { scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={spring.bouncy}
        >
          <Card animate={false} className="text-center border-success/40 shadow-[0_0_28px_-8px_rgba(92,242,163,0.6)]">
            <div className="text-3xl mb-1">🔒</div>
            <div className="text-xs uppercase tracking-widest text-muted">Your secret — locked</div>
            <div className="font-mono text-4xl tracking-[0.25em] tnum my-2 text-grad">{yourSecret}</div>
            <div className="text-sm text-muted">
              {oppLocked ? 'Both codes locked — starting…' : 'Waiting for opponent…'}
            </div>
          </Card>
        </motion.div>
      ) : (
        <>
          <DigitInput
            rules={view.room.settings.number}
            submitLabel="🔒 Lock secret"
            onSubmit={async (v) => emit.submitSecret(v)}
            autoFocus
          />
          <div className="text-center text-xs text-muted">
            🛡 Only you can see this — it never leaves the server until the match ends.
          </div>
          <div className="text-center text-sm text-muted">
            Opponent: {oppLocked ? '🔒 locked' : 'choosing…'}
          </div>
        </>
      )}
    </div>
  );
}
