import { useNavigate } from 'react-router-dom';
import { Button } from '../primitives/Button.js';
import { Card } from '../primitives/Card.js';

export function AbandonedView() {
  const nav = useNavigate();
  return (
    <div className="flex flex-col gap-3 pt-6">
      <Card className="text-center py-7">
        <div className="text-4xl mb-2 opacity-70">👻</div>
        <div className="text-xl font-semibold">Match abandoned</div>
        <div className="text-muted text-sm mt-1">Both players went offline.</div>
      </Card>
      <Button size="lg" onClick={() => nav('/home')}>
        Back to Home
      </Button>
    </div>
  );
}
