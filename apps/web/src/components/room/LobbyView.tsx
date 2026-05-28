import { useState } from 'react';
import { useIsCreator, useRoomStore, useYou } from '../../stores/room.store.js';
import { Button } from '../primitives/Button.js';
import { Card } from '../primitives/Card.js';
import { NicknameTag } from '../primitives/NicknameTag.js';
import { SettingsSummary } from './SettingsSummary.js';
import { emit } from '../../socket/emit.js';
import { ConfirmationModal } from '../primitives/ConfirmationModal.js';

export function LobbyView() {
  const view = useRoomStore((s) => s.view);
  const you = useYou();
  const isCreator = useIsCreator();
  const [confirmKick, setConfirmKick] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  if (!view) return null;

  const players = [view.room.players.creator, view.room.players.joiner].filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-col gap-3">
          {players.map((p) =>
            p ? (
              <div key={p.sessionToken} className="flex items-center justify-between">
                <NicknameTag player={p} isYou={you?.sessionToken === p.sessionToken} />
                <div className="flex items-center gap-2">
                  <span className={p.ready ? 'text-success text-sm' : 'text-muted text-sm'}>
                    {p.ready ? 'Ready' : 'Not ready'}
                  </span>
                </div>
              </div>
            ) : null
          )}
        </div>
      </Card>
      <SettingsSummary settings={view.room.settings} />
      <Button
        size="lg"
        tone={you?.ready ? 'secondary' : 'primary'}
        onClick={() => void emit.toggleReady(!you?.ready)}
      >
        {you?.ready ? 'Cancel ready' : 'Ready'}
      </Button>
      {isCreator ? (
        <Button size="sm" tone="danger" onClick={() => setConfirmKick(true)}>
          Kick Joiner
        </Button>
      ) : (
        <Button size="sm" tone="secondary" onClick={() => setConfirmLeave(true)}>
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
