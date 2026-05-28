import { motion, useReducedMotion } from 'framer-motion';
import { useRoomStore, useYou, useOpponent } from '../../stores/room.store.js';
import { Button } from '../primitives/Button.js';
import { Card } from '../primitives/Card.js';
import { Confetti } from '../primitives/Confetti.js';
import { GuessLogList } from './GuessLogList.js';
import { emit } from '../../socket/emit.js';
import { useNavigate } from 'react-router-dom';
import { spring, stagger, fadeRise } from '../../motion/index.js';

function SecretReveal({ value, label, tone }: { value: string; label: string; tone: 'you' | 'opp' }) {
  const reduce = useReducedMotion();
  const digits = (value ?? '—').split('');
  return (
    <div>
      <div className="text-xs text-muted mb-1">{label}</div>
      <motion.div
        className="flex gap-1"
        variants={reduce ? undefined : stagger(0.08, 0.2)}
        initial={reduce ? false : 'hidden'}
        animate="show"
      >
        {digits.map((d, i) => (
          <motion.span
            key={i}
            variants={reduce ? undefined : { hidden: { opacity: 0, rotateX: -90 }, show: { opacity: 1, rotateX: 0 } }}
            transition={spring.bouncy}
            className={`font-mono text-2xl tnum px-2 py-1 rounded-lg border ${
              tone === 'you' ? 'border-accent/30 text-accent' : 'border-accent2/30 text-accent2'
            } bg-white/[0.03]`}
          >
            {d}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}

export function ResultView() {
  const view = useRoomStore((s) => s.view);
  const you = useYou();
  const opp = useOpponent();
  const nav = useNavigate();
  const reduce = useReducedMotion();
  if (!view || !view.endedView || !you) return null;

  const outcome = view.endedView.outcome;
  let bannerText: string;
  let tone: 'success' | 'error' | 'info' = 'info';
  let won = false;
  if (outcome.kind === 'draw') {
    bannerText = 'Draw';
  } else if (outcome.kind === 'abandoned') {
    bannerText = 'Match abandoned';
  } else if (outcome.winner === you.sessionToken) {
    bannerText = 'You won!';
    tone = 'success';
    won = true;
  } else {
    bannerText = 'You lost';
    tone = 'error';
  }

  const reason = outcome.kind === 'winner' ? outcome.reason : outcome.kind === 'draw' ? outcome.reason : 'abandoned';
  const secrets = view.endedView.secrets;

  const score = view.endedView.rematchScore.matches.reduce(
    (acc, mm) => {
      if (!mm.winner) acc.draws++;
      else if (mm.winner === you.sessionToken) acc.you++;
      else acc.opp++;
      return acc;
    },
    { you: 0, opp: 0, draws: 0 }
  );

  return (
    <motion.div
      className="flex flex-col gap-3"
      variants={stagger(0.08)}
      initial="hidden"
      animate="show"
    >
      {/* Hero banner — the screenshot moment */}
      <motion.div variants={fadeRise} className="relative">
        {won && <Confetti />}
        <Card animate={false} className="relative text-center py-7 overflow-hidden">
          {won && !reduce && (
            <div
              className="absolute inset-0 -z-10 opacity-60"
              style={{ background: 'radial-gradient(circle at 50% 30%, rgba(92,242,163,0.25), transparent 70%)' }}
            />
          )}
          <motion.div
            initial={reduce ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring.bouncy}
            className={`text-4xl font-bold ${
              tone === 'success' ? 'text-success' : tone === 'error' ? 'text-danger' : 'text-ink'
            }`}
            style={won ? { textShadow: '0 0 28px rgba(92,242,163,0.6)' } : undefined}
          >
            {bannerText}
          </motion.div>
          <div className="text-center text-xs text-muted mt-2">{reason}</div>
        </Card>
      </motion.div>

      <motion.div variants={fadeRise}>
        <Card animate={false}>
          <div className="text-sm text-muted mb-3">🔓 Secrets revealed</div>
          <div className="grid grid-cols-2 gap-4">
            <SecretReveal value={secrets[you.sessionToken] ?? '—'} label={`${you.nickname} (you)`} tone="you" />
            <SecretReveal
              value={opp ? secrets[opp.sessionToken] ?? '—' : '—'}
              label={opp?.nickname ?? 'Opponent'}
              tone="opp"
            />
          </div>
        </Card>
      </motion.div>

      <motion.div variants={fadeRise}>
        <Card animate={false}>
          <div className="text-sm text-muted mb-2">Head-to-head</div>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <div className="text-3xl font-bold text-success">{score.you}</div>
              <div className="text-xs text-muted">you</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-muted">{score.draws}</div>
              <div className="text-xs text-muted">draws</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-danger">{score.opp}</div>
              <div className="text-xs text-muted">opp</div>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={fadeRise}>
        <Card animate={false}>
          <div className="text-sm text-muted mb-2">Guess history</div>
          <GuessLogList entries={view.match?.guessLog ?? []} />
        </Card>
      </motion.div>

      <motion.div variants={fadeRise} className="flex flex-col gap-2">
        <Button size="lg" onClick={() => void emit.rematchOffer()}>
          Rematch
        </Button>
        <Button size="md" tone="secondary" onClick={() => nav('/home')}>
          Back to Home
        </Button>
      </motion.div>
    </motion.div>
  );
}
