import { useRoomStore, useYou, useOpponent } from '../../stores/room.store.js';
import { Button } from '../primitives/Button.js';
import { Card } from '../primitives/Card.js';
import { GuessLogList } from './GuessLogList.js';
import { emit } from '../../socket/emit.js';
import { useNavigate } from 'react-router-dom';

export function ResultView() {
  const view = useRoomStore((s) => s.view);
  const you = useYou();
  const opp = useOpponent();
  const nav = useNavigate();
  if (!view || !view.endedView || !you) return null;

  const outcome = view.endedView.outcome;
  let bannerText: string;
  let tone: 'success' | 'error' | 'info' = 'info';
  if (outcome.kind === 'draw') {
    bannerText = 'Draw';
  } else if (outcome.kind === 'abandoned') {
    bannerText = 'Match abandoned';
  } else if (outcome.winner === you.sessionToken) {
    bannerText = 'You won!';
    tone = 'success';
  } else {
    bannerText = 'You lost';
    tone = 'error';
  }

  const reason = outcome.kind === 'winner' ? outcome.reason : outcome.kind === 'draw' ? outcome.reason : 'abandoned';
  const secrets = view.endedView.secrets;

  const score = view.endedView.rematchScore.matches.reduce(
    (acc, m) => {
      if (!m.winner) acc.draws++;
      else if (m.winner === you.sessionToken) acc.you++;
      else acc.opp++;
      return acc;
    },
    { you: 0, opp: 0, draws: 0 }
  );

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div
          className={`text-2xl font-bold text-center ${
            tone === 'success' ? 'text-success' : tone === 'error' ? 'text-danger' : 'text-ink'
          }`}
        >
          {bannerText}
        </div>
        <div className="text-center text-xs text-muted mt-1">{reason}</div>
      </Card>
      <Card>
        <div className="text-sm text-muted mb-2">Secrets revealed</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted">{you.nickname} (you)</div>
            <div className="font-mono text-xl">{secrets[you.sessionToken] ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted">{opp?.nickname ?? 'Opponent'}</div>
            <div className="font-mono text-xl">{opp ? secrets[opp.sessionToken] ?? '—' : '—'}</div>
          </div>
        </div>
      </Card>
      <Card>
        <div className="text-sm text-muted mb-2">Head-to-head</div>
        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className="text-2xl font-bold text-success">{score.you}</div>
            <div className="text-xs text-muted">you</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-muted">{score.draws}</div>
            <div className="text-xs text-muted">draws</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-danger">{score.opp}</div>
            <div className="text-xs text-muted">opp</div>
          </div>
        </div>
      </Card>
      <Card>
        <div className="text-sm text-muted mb-2">Guess history</div>
        <GuessLogList entries={view.match?.guessLog ?? []} />
      </Card>
      <Button size="lg" onClick={() => void emit.rematchOffer()}>
        Rematch
      </Button>
      <Button size="md" tone="secondary" onClick={() => nav('/home')}>
        Back to Home
      </Button>
    </div>
  );
}
