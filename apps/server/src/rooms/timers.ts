import { logger } from '../logger.js';

export type TimerKind =
  | 'creator_afk'
  | 'lobby_disconnect'
  | 'secret'
  | 'rps'
  | 'turn'
  | 'round'
  | 'disconnect_grace'
  | 'post_match_idle';

export type TimerKey = string; // `${code}:${kind}:${ownerToken|self}`

type FireHandler = (code: string, kind: TimerKind, ownerToken: string | null) => Promise<void>;

const timers = new Map<TimerKey, NodeJS.Timeout>();
let fireHandler: FireHandler | null = null;

export function setTimerFireHandler(h: FireHandler) {
  fireHandler = h;
}

function makeKey(code: string, kind: TimerKind, ownerToken: string | null): TimerKey {
  return `${code}:${kind}:${ownerToken ?? '_'}`;
}

export function scheduleTimer(
  code: string,
  kind: TimerKind,
  ownerToken: string | null,
  firesAt: number
): void {
  const key = makeKey(code, kind, ownerToken);
  clearTimer(code, kind, ownerToken);
  const delay = Math.max(0, firesAt - Date.now());
  const t = setTimeout(() => {
    timers.delete(key);
    void (fireHandler?.(code, kind, ownerToken) ?? Promise.resolve()).catch((err) =>
      logger.error({ err, code, kind, ownerToken }, 'timer fire handler error')
    );
  }, delay);
  // Don't keep the event loop alive on its own.
  t.unref?.();
  timers.set(key, t);
}

export function clearTimer(
  code: string,
  kind: TimerKind,
  ownerToken: string | null
): void {
  const key = makeKey(code, kind, ownerToken);
  const t = timers.get(key);
  if (t) {
    clearTimeout(t);
    timers.delete(key);
  }
}

export function clearAllTimersForRoom(code: string): void {
  for (const key of [...timers.keys()]) {
    if (key.startsWith(`${code}:`)) {
      const t = timers.get(key);
      if (t) clearTimeout(t);
      timers.delete(key);
    }
  }
}
