import { Link } from 'react-router-dom';
import { Button } from '../components/primitives/Button.js';
import { Card } from '../components/primitives/Card.js';

export function LandingPage() {
  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto pt-6">
      <h1 className="text-3xl font-bold text-center">Bulls &amp; Cows</h1>
      <p className="text-center text-muted">
        Guess your opponent's secret number. Bulls are right digit in the right place; cows are right digit, wrong place.
      </p>
      <Card>
        <ol className="text-sm list-decimal pl-4 space-y-1">
          <li>Both players pick a secret number.</li>
          <li>Take turns guessing each other's number.</li>
          <li>First to get all bulls wins.</li>
        </ol>
      </Card>
      <Link to="/create">
        <Button size="lg" className="w-full">
          Create Room
        </Button>
      </Link>
      <Link to="/join">
        <Button size="lg" tone="secondary" className="w-full">
          Join Room
        </Button>
      </Link>
    </div>
  );
}
