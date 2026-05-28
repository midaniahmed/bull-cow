export type RPSPick = 'rock' | 'paper' | 'scissors';
export type RPSOutcome = 'p1' | 'p2' | 'tie';

export function resolveRPS(p1: RPSPick, p2: RPSPick): RPSOutcome {
  if (p1 === p2) return 'tie';
  if (
    (p1 === 'rock' && p2 === 'scissors') ||
    (p1 === 'paper' && p2 === 'rock') ||
    (p1 === 'scissors' && p2 === 'paper')
  ) {
    return 'p1';
  }
  return 'p2';
}
