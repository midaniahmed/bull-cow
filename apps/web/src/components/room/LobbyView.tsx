import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useIsCreator, useRoomStore, useYou } from '../../stores/room.store.js';
import { Button } from '../primitives/Button.js';
import { Card } from '../primitives/Card.js';
import { NicknameTag } from '../primitives/NicknameTag.js';
import { SettingsSummary } from './SettingsSummary.js';
import { emit } from '../../socket/emit.js';
import { ConfirmationModal } from '../primitives/ConfirmationModal.js';
import { popIn, stagger } from '../../motion/index.js';
import clsx from 'clsx';

export function LobbyView() {
  const view = useRoomStore((s) => s.view);
  const you = useYou();
  const isCreator = useIsCreator();
  const reduce = useReducedMotion();
  const [confirmKick, setConfirmKick] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  if (!view) return null;

  const players = [view.room.players.creator, view.room.players.joiner].filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <motion.div
        className="flex flex-col gap-2"
        variants={reduce ? undefined : stagger(0.1)}
        initial={reduce ? false : 'hidden'}
        animate="show"
      >
        {players.map((p) =>
          p ? (
            <motion.div
              key={p.sessionToken}
              variants={reduce ? undefined : popIn}
              className={clsx(
                'glass flex items-center justify-between px-4 py-3 transition-all',
                p.ready && 'border-success/40 shadow-[0_0_22px_-6px_rgba(92,242,163,0.6)]'
              )}
            >
              <NicknameTag player={p} isYou={you?.sessionToken === p.sessionToken} />
              <span
                className={clsx(
                  'rounded-full px-2.5 py-1 text-xs font-medium border',
                  p.ready ? 'text-success border-success/40 bg-success/10' : 'text-muted border-white/10'
                )}
              >
                {p.ready ? '✓ Ready' : 'Not ready'}
              </span>
            </motion.div>
          ) : null
        )}
      </motion.div>

      <SettingsSummary settings={view.room.settings} />

      <Button
        size="lg"
        tone={you?.ready ? 'secondary' : 'primary'}
        onClick={() => void emit.toggleReady(!you?.ready)}
      >
        {you?.ready ? 'Cancel ready' : "I'm Ready"}
      </Button>
      {isCreator ? (
        <Button size="sm" tone="ghost" className="text-danger/80" onClick={() => setConfirmKick(true)}>
          Kick Joiner
        </Button>
      ) : (
        <Button size="sm" tone="ghost" onClick={() => setConfirmLeave(true)}>
          Leave Room
        </Button>
      )}
      <ConfirmationModal
        open={confirmKick}
        title="Kick this player?"
        destructive
        confirmLabel="Kick"
        onConfirm={() => {
          setConfirmKick(false);
          void emit.kickJoiner();
        }}
        onCancel={() => setConfirmKick(false)}
      />
      <ConfirmationModal
        open={confirmLeave}
        title="Leave this room?"
        confirmLabel="Leave"
        onConfirm={() => {
          setConfirmLeave(false);
          void emit.leaveRoom();
        }}
        onCancel={() => setConfirmLeave(false)}
      />
    </div>
  );
}
