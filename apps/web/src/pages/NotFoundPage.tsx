import { Link } from 'react-router-dom';
import { Button } from '../components/primitives/Button.js';
import { Card } from '../components/primitives/Card.js';

export function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto pt-10 flex flex-col gap-4">
      <Card className="text-center py-8">
        <div className="text-5xl font-bold text-grad">404</div>
        <div className="text-muted text-sm mt-2">This code leads nowhere.</div>
      </Card>
      <Link to="/">
        <Button className="w-full">Back to Home</Button>
      </Link>
    </div>
  );
}
