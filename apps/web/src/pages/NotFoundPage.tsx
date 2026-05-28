import { Link } from 'react-router-dom';
import { Button } from '../components/primitives/Button.js';
import { Card } from '../components/primitives/Card.js';

export function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto pt-6 flex flex-col gap-3">
      <Card className="text-center">
        <div className="text-xl font-semibold">Not found</div>
      </Card>
      <Link to="/">
        <Button>Home</Button>
      </Link>
    </div>
  );
}
