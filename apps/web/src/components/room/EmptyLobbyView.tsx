import { useRoomStore } from '../../stores/room.store.js';
import { useClipboard } from '../../hooks/use-clipboard.js';
import { Button } from '../primitives/Button.js';
import { Card } from '../primitives/Card.js';
import { SettingsSummary } from './SettingsSummary.js';
import { ConfirmationModal } from '../primitives/ConfirmationModal.js';
import { useState } from 'react';
import { emit } from '../../socket/emit.js';
import QRCode from 'react-qr-code';

export function EmptyLobbyView() {
  const view = useRoomStore((s) => s.view);
  const { copy, lastCopied } = useClipboard();
  const [confirming, setConfirming] = useState(false);
  if (!view) return null;
  const code = view.room.code;
  const url = `${window.location.origin}/room/${code}`;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-3">
        <div className="text-sm text-muted">Share this code</div>
        <button
          className="font-mono text-4xl tracking-widest text-accent"
          onClick={() => void copy(code)}
        >
          {code}
        </button>
        {lastCopied?.text === code ? (
          <div className="text-xs text-success">Copied!</div>
        ) : (
          <div className="text-xs text-muted">tap to copy</div>
        )}
        <div className="mt-2 bg-white p-2 rounded-lg">
          <QRCode value={url} size={140} />
        </div>
        <Button
          size="sm"
          tone="secondary"
          onClick={() => void copy(url)}
        >
          Copy link
        </Button>
      </Card>
      <Card>
        <div className="text-center text-muted animate-pulse">Waiting for opponent…</div>
      </Card>
      <SettingsSummary settings={view.room.settings} />
      <Button size="md" tone="danger" onClick={() => setConfirming(true)}>
        Cancel Room
      </Button>
      <ConfirmationModal
        open={confirming}
        title="Cancel this room?"
        body="The room code will be released."
        destructive
        confirmLabel="Yes, cancel"
        onConfirm={() => {
          setConfirming(false);
          void emit.leaveRoom();
        }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
