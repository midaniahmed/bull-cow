import { setTimerFireHandler } from './timers.js';
import { withRoomLock } from './lock.js';
import { loadRoom } from './store.js';
import { onTimerFire } from '../match/engine.js';
import { logger } from '../logger.js';

export function installTimerHandler() {
  setTimerFireHandler(async (code, kind, ownerToken) => {
    await withRoomLock(code, async () => {
      const state = await loadRoom(code);
      if (!state) return;
      try {
        await onTimerFire(state, kind, ownerToken);
      } catch (err) {
        logger.error({ err, code, kind, ownerToken }, 'timer fire error');
      }
    });
  });
}
