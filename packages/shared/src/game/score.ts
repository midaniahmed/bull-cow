export type ScoreResult = { bulls: number; cows: number };

export class InvalidArgument extends Error {
  constructor(public readonly code: string) {
    super(`invalid_argument:${code}`);
    this.name = 'InvalidArgument';
  }
}

export function scoreGuess(guess: string, secret: string): ScoreResult {
  if (guess.length !== secret.length) {
    throw new InvalidArgument('length_mismatch');
  }
  if (!/^\d+$/.test(guess) || !/^\d+$/.test(secret)) {
    throw new InvalidArgument('non_digit');
  }

  let bulls = 0;
  const remainingGuess: string[] = [];
  const remainingSecret: string[] = [];

  for (let i = 0; i < guess.length; i++) {
    const g = guess[i] as string;
    const s = secret[i] as string;
    if (g === s) {
      bulls += 1;
    } else {
      remainingGuess.push(g);
      remainingSecret.push(s);
    }
  }

  let cows = 0;
  const secretCount: Record<string, number> = {};
  for (const d of remainingSecret) {
    secretCount[d] = (secretCount[d] ?? 0) + 1;
  }
  for (const d of remainingGuess) {
    if ((secretCount[d] ?? 0) > 0) {
      cows += 1;
      secretCount[d] = (secretCount[d] as number) - 1;
    }
  }

  return { bulls, cows };
}

export function isAllBulls(result: ScoreResult, length: number): boolean {
  return result.bulls === length;
}
