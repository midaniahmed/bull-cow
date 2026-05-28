# Phase 3: Game Logic (pure, `packages/shared/src/game`)

Every function here is **pure** — no I/O, no clocks, no random sources except where explicitly seeded by an argument. The same module is imported by `apps/server` (authoritative use) and `apps/web` (UX feedback). Both sides call the same code; the server's call is the one that decides outcomes.

The contract for purity is non-negotiable. If you find yourself wanting `Date.now()` or `crypto.randomUUID()` in this module, lift it to a parameter.

## File layout

```
packages/shared/src/game/
├── score.ts          # bulls/cows scoring
├── validate.ts       # rule-aware number validation
├── codes.ts          # room code generation (seeded RNG factory)
├── rps.ts            # RPS resolver
├── rules.ts          # static rules helpers (digit pool size, defaults)
└── index.ts
```

## `score.ts`

```ts
export type ScoreResult = { bulls: number; cows: number };

export function scoreGuess(guess: string, secret: string): ScoreResult
```

- **Inputs**: `guess` and `secret` are equal-length digit strings (validated upstream).
- **Behavior**:
  - Iterate by index; if `guess[i] === secret[i]`, increment `bulls`.
  - Otherwise, if `guess[i]` appears anywhere in `secret` at a position where `secret[j] !== guess[j]`, increment `cows`. Each `secret` digit can be matched as a cow at most once (consume on match).
  - Works regardless of `allowDuplicateDigits` — duplicates in either guess or secret are scored by consumption (multiset intersection minus bulls).
- **Edge cases**:
  - If lengths differ → throw `InvalidArgument('length_mismatch')`. The server has already validated length; the throw is a developer-error guard, not a control-flow path.
  - If either string contains non-digits → throw `InvalidArgument('non_digit')`.

## `validate.ts`

```ts
export type NumberRules = {
  length: number;                     // 3..10
  allowDuplicateDigits: boolean;
  allowLeadingZero: boolean;
};

export type ValidationOk = { ok: true };
export type ValidationErr = {
  ok: false;
  code:
    | 'length'
    | 'charset'
    | 'duplicate_digits'
    | 'leading_zero';
  message: string;
};

export function validateNumber(value: string, rules: NumberRules): ValidationOk | ValidationErr
```

- **Order of checks**: length → charset → leading-zero (if disabled) → duplicates (if disabled). First failure short-circuits.
- **Determinism**: the same input always returns the same result. No randomness.
- **Used by**:
  - Server: gates `secret:submit` and `guess:submit`. A `false` result causes the handler to return `secret_invalid` or `guess_invalid`.
  - Client: drives input field state — disable submit when invalid, surface a per-rule hint.

```ts
export function isAllBulls(result: ScoreResult, length: number): boolean
```

- Returns `result.bulls === length`. Single-line helper; lives here so both sides have one place to ask "did they solve it?".

## `codes.ts`

Room codes are generated from `A–Z` + `0–9` minus `{0, O, 1, I, L}` — the requirements call out ambiguous characters explicitly.

```ts
export const ROOM_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 31 chars
export const ROOM_CODE_LENGTH = 6;

export function isValidRoomCode(value: string): boolean

// Pure: deterministic given the supplied byte source. The server passes
// `randomBytes`; tests pass a deterministic source.
export function generateRoomCode(getRandomBytes: (n: number) => Uint8Array): string
```

- **Why a byte-source argument**: `crypto.randomBytes` is host-specific (Node has one, browsers have another) and we want this function unit-testable without mocking.
- **Algorithm**: rejection sampling — pull 8 bytes, take each byte modulo 31, accept only if `byte < 31 * floor(256/31)` (avoids bias). Continue until we have 6 chars.
- **Collision check** is *not* in this module — the server is responsible for verifying the generated code isn't already in `roomcodes:active`. This module just produces one candidate.

## `rps.ts`

```ts
export type RPSPick = 'rock' | 'paper' | 'scissors';
export type RPSOutcome = 'p1' | 'p2' | 'tie';

export function resolveRPS(p1: RPSPick, p2: RPSPick): RPSOutcome
```

- Returns `'tie'` when picks are equal.
- Otherwise computes via the canonical table (rock beats scissors, paper beats rock, scissors beats paper).
- The *replay-up-to-3-rounds* logic lives in the server's RPS handler, not here. This function only resolves one pair.

## `rules.ts`

Static helpers, all pure:

```ts
export const DEFAULT_RULES: NumberRules = {
  length: 4,
  allowDuplicateDigits: false,
  allowLeadingZero: false,
};

// Returns the available digit count given the duplicate/leading-zero rules.
// Used in the create-room settings refinement and in client-side input hints.
export function digitPoolSize(rules: Pick<NumberRules, 'allowDuplicateDigits' | 'allowLeadingZero'>): number

// True when the given length can produce at least one valid number under the rules.
// Settings form rejects when this returns false.
export function isLengthFeasible(rules: NumberRules): boolean
```

- `digitPoolSize`:
  - duplicates allowed → 10 (any combination is fine)
  - duplicates disabled + leading zero allowed → 10
  - duplicates disabled + leading zero disabled → 9
- `isLengthFeasible`: when `allowDuplicateDigits=false`, length must be ≤ pool. With duplicates allowed, any length 3–10 is feasible.

## Edge cases covered by unit tests

- `scoreGuess('1234', '1234')` → `{ bulls: 4, cows: 0 }`
- `scoreGuess('1234', '4321')` → `{ bulls: 0, cows: 4 }`
- `scoreGuess('1122', '2211')` → `{ bulls: 0, cows: 4 }` (duplicates handled by consumption)
- `scoreGuess('1122', '1212')` → `{ bulls: 2, cows: 2 }`
- `scoreGuess('1111', '1234')` with rules allowing dup → `{ bulls: 1, cows: 0 }` (only one match)
- `validateNumber('012', { length: 3, allowDuplicateDigits: true, allowLeadingZero: false })` → `{ ok: false, code: 'leading_zero' }`
- `validateNumber('1123', { length: 4, allowDuplicateDigits: false, allowLeadingZero: false })` → `{ ok: false, code: 'duplicate_digits' }`
- `validateNumber('abcd', any)` → `{ ok: false, code: 'charset' }`
- `validateNumber('12', { length: 4, … })` → `{ ok: false, code: 'length' }`
- `generateRoomCode(detRng)` → deterministic 6-char string from the allowed charset given a fixed seed
- `resolveRPS('rock', 'rock')` → `'tie'`
- `resolveRPS('rock', 'scissors')` → `'p1'`

> The "no tests in MVP" rule (per the planning skill) means we don't write a test suite as part of phase 03's work-tracking — but these examples document the *correctness contract* the implementation must satisfy.

## Notes

- The server treats this module as the single source of truth. There is no parallel scoring or validation function on the server — duplication is forbidden.
- The client uses these for input feedback (grey out a digit when duplicates are disabled, show "valid"/"invalid" hints). Submit gating happens client-side for UX, but the server always re-runs the same function on the received value.

## Acceptance for phase 3

- [ ] `scoreGuess`, `validateNumber`, `generateRoomCode`, `resolveRPS`, `digitPoolSize`, `isLengthFeasible` are exported from `packages/shared/src/game`.
- [ ] No function imports from `apps/server` or `apps/web` or from any module outside `packages/shared`.
- [ ] No function reads `Date`, `Math.random`, or any global mutable state.
- [ ] The server's socket handlers call directly into these functions, not into a duplicated server-side implementation.
