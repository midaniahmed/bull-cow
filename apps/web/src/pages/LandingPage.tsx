import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/primitives/Button.js';
import { Card } from '../components/primitives/Card.js';
import { stagger, fadeRise } from '../motion/index.js';

export function LandingPage() {
  return (
    <motion.div
      className="flex flex-col gap-5 max-w-md mx-auto pt-8 min-h-[80dvh]"
      variants={stagger(0.08)}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={fadeRise} className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-grad leading-none">
          Bulls
          <br />&amp; Cows
        </h1>
        <p className="mt-4 text-muted text-sm px-4">
          Crack your opponent's secret code before they crack yours. Bulls = right digit, right place. Cows = right
          digit, wrong place.
        </p>
      </motion.div>

      <motion.div variants={fadeRise}>
        <Card animate={false}>
          <ol className="text-sm space-y-2">
            {['Both players lock in a secret number.', "Take turns guessing each other's code.", 'First to all bulls wins.'].map(
              (t, i) => (
                <li key={i} className="flex gap-2.5 items-start">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent/40 text-xs text-accent">
                    {i + 1}
                  </span>
                  <span className="text-ink/90">{t}</span>
                </li>
              )
            )}
          </ol>
        </Card>
      </motion.div>

      <div className="flex-1" />

      <motion.div variants={fadeRise} className="flex flex-col gap-2.5">
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
      </motion.div>
    </motion.div>
  );
}
