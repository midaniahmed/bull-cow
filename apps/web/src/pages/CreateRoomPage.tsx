import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RoomSettings } from '@bc/shared';
import { SettingsForm } from '../components/inputs/SettingsForm.js';
import { useUiStore } from '../stores/ui.store.js';
import { ConfirmationModal } from '../components/primitives/ConfirmationModal.js';

export function CreateRoomPage() {
  const nav = useNavigate();
  const showSnackbar = useUiStore((s) => s.showSnackbar);
  const [busy, setBusy] = useState(false);
  const [otherRoom, setOtherRoom] = useState<string | null>(null);
  const [pendingSettings, setPendingSettings] = useState<RoomSettings | null>(null);

  const create = async (settings: RoomSettings) => {
    setBusy(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.status === 409) {
        const j = (await res.json()) as { existingRoom?: string };
        setOtherRoom(j.existingRoom ?? null);
        setPendingSettings(settings);
        setBusy(false);
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        showSnackbar((j as { message?: string }).message ?? 'Failed to create room', 'error');
        setBusy(false);
        return;
      }
      const j = (await res.json()) as { joinUrl: string };
      nav(j.joinUrl, { replace: true });
    } catch {
      showSnackbar('Network error', 'error');
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-2">
      <SettingsForm busy={busy} onSubmit={create} />
      <ConfirmationModal
        open={otherRoom !== null}
        title="Leave current room?"
        body={`You're already in room ${otherRoom}. Leave it and create a new one?`}
        confirmLabel="Leave and create"
        onConfirm={async () => {
          if (!otherRoom || !pendingSettings) return;
          await fetch(`/api/rooms/${otherRoom}/membership`, {
            method: 'DELETE',
            credentials: 'include',
          });
          const s = pendingSettings;
          setOtherRoom(null);
          setPendingSettings(null);
          await create(s);
        }}
        onCancel={() => {
          setOtherRoom(null);
          setPendingSettings(null);
        }}
      />
    </div>
  );
}
