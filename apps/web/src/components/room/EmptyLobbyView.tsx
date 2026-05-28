import { useRoomStore } from '../../stores/room.store.js';
import { useClipboard } from '../../hooks/use-clipboard.js';
import { Button } from '../primitives/Button.js';
import { Card } from '../primitives/Card.js';
import { SettingsSummary } from './SettingsSummary.js';
import { ConfirmationModal } from '../primitives/ConfirmationModal.js';
import { useState } from 'react';
import { emit } from '../../socket/emit.js';
import QRCode from 'react-qr-code';
import { motion } from 'framer-motion';
import { spring } from '../../motion/index.js';

export function EmptyLobbyView() {
  const view = useRoomStore((s) => s.view);
  const { copy, lastCopied } = useClipboard();
  const [confirming, setConfirming] = useState(false);
  if (!view) return null;
  const code = view.room.code;
  const url = `${window.location.origin}/room/${code}`;
  const justCopied = lastCopied?.text === code;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-3 py-6">
        <div className="text-xs uppercase tracking-[0.2em] text-muted">Share this code</div>
        <motion.button
          className="font-mono text-5xl font-bold tracking-[0.25em] text-grad"
          onClick={() => void copy(code)}
          whileTap={{ scale: 0.96 }}
          transition={spring.snappy}
          aria-label="Copy room code"
        >
          {code}
        </motion.button>
        <div className={`text-xs h-4 ${justCopied ? 'text-success' : 'text-muted'}`}>
          {justCopied ? '✓ Copied!' : 'tap to copy'}
        </div>
        <div className="mt-1 rounded-2xl border border-white/10 bg-white p-3 shadow-glow">
          <QRCode value={url} size={140} bgColor="#ffffff" fgColor="#070b14" />
        </div>
        <Button size="sm" tone="secondary" onClick={() => void copy(url)}>
          Copy link
        </Button>
      </Card>

      <Card className="flex items-center justify-center gap-3 py-5">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
        </span>
        <span className="text-muted">Waiting for opponent…</span>
      </Card>

      <SettingsSummary settings={view.room.settings} />
      <Button size="md" tone="ghost" className="text-danger/80" onClick={() => setConfirming(true)}>
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
