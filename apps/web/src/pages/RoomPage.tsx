import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { connectSocket, disconnectSocket } from '../socket/client.js';
import { subscribeAll } from '../socket/subscriptions.js';
import { useRoomStore } from '../stores/room.store.js';
import { Button } from '../components/primitives/Button.js';
import { Card } from '../components/primitives/Card.js';
import { EmptyLobbyView } from '../components/room/EmptyLobbyView.js';
import { LobbyView } from '../components/room/LobbyView.js';
import { SecretSubmissionView } from '../components/room/SecretSubmissionView.js';
import { RPSView } from '../components/room/RPSView.js';
import { PlayingView } from '../components/room/PlayingView.js';
import { ResultView } from '../components/room/ResultView.js';
import { AbandonedView } from '../components/room/AbandonedView.js';
import { EmotePanel } from '../components/emote/EmotePanel.js';
import { EmoteToastLayer } from '../components/emote/EmoteToastLayer.js';
import { DisconnectBanner } from '../components/presence/DisconnectBanner.js';
import { ReclaimTabBanner } from '../components/presence/ReclaimTabBanner.js';
import { useSessionStore } from '../stores/session.store.js';
import { ConfirmationModal } from '../components/primitives/ConfirmationModal.js';
import { isValidRoomCode } from '@bc/shared';

type PreviewState =
  | { kind: 'loading' }
  | { kind: 'preview'; room: { code: string; creator: { nickname: string }; settings: unknown; createdAt: string } }
  | { kind: 'joined' }
  | { kind: 'error'; code: string; message: string };

export function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const nav = useNavigate();
  const view = useRoomStore((s) => s.view);
  const sessionStatus = useSessionStore((s) => s.status);
  const [previewState, setPreviewState] = useState<PreviewState>({ kind: 'loading' });
  const [otherRoom, setOtherRoom] = useState<string | null>(null);

  // Preview lookup
  useEffect(() => {
    if (!code || !isValidRoomCode(code)) {
      setPreviewState({ kind: 'error', code: 'room_not_found', message: 'Invalid code' });
      return;
    }
    if (sessionStatus !== 'ready') return;
    void (async () => {
      try {
        const res = await fetch(`/api/rooms/${code}`, { credentials: 'include' });
        if (res.status === 200) {
          const j = (await res.json()) as { room: any };
          setPreviewState({ kind: 'preview', room: j.room });
          return;
        }
        if (res.status === 409) {
          const j = await res.json().catch(() => ({}));
          if ((j as { code?: string }).code === 'room_already_member') {
            // Already a member — connect directly.
            commit();
            return;
          }
          if ((j as { code?: string }).code === 'room_other_active') {
            setOtherRoom((j as { existingRoom?: string }).existingRoom ?? null);
            return;
          }
        }
        const j = await res.json().catch(() => ({}));
        setPreviewState({
          kind: 'error',
          code: (j as { code?: string }).code ?? 'room_not_found',
          message: (j as { message?: string }).message ?? 'Not found',
        });
      } catch {
        setPreviewState({ kind: 'error', code: 'internal', message: 'Network error' });
      }
    })();
  }, [code, sessionStatus]);

  const commit = () => {
    if (!code) return;
    setPreviewState({ kind: 'joined' });
    const sock = connectSocket(code);
    subscribeAll(sock, code, (p) => nav(p, { replace: true }));
  };

  useEffect(() => {
    return () => {
      disconnectSocket();
      useRoomStore.getState().reset();
    };
  }, []);

  if (sessionStatus !== 'ready') {
    return <Card>Setting up session…</Card>;
  }

  if (previewState.kind === 'loading') {
    return <Card>Loading…</Card>;
  }
  if (previewState.kind === 'error') {
    return (
      <div className="flex flex-col gap-3 max-w-md mx-auto pt-6">
        <Card className="text-center">
          <div className="text-lg font-semibold">{previewState.message}</div>
          <div className="text-xs text-muted mt-1">{previewState.code}</div>
        </Card>
        <Button onClick={() => nav('/home')}>Home</Button>
      </div>
    );
  }
  if (previewState.kind === 'preview') {
    return (
      <div className="flex flex-col gap-3 max-w-md mx-auto pt-6">
        <Card>
          <div className="text-sm text-muted">Joining room</div>
          <div className="font-mono text-2xl tracking-widest text-accent">{code}</div>
          <div className="text-sm mt-2">Created by <strong>{previewState.room.creator.nickname}</strong></div>
        </Card>
        <Button size="lg" onClick={commit}>Join Match</Button>
        <Button size="md" tone="secondary" onClick={() => nav('/home')}>Cancel</Button>
        <ConfirmationModal
          open={otherRoom !== null}
          title="Leave current room?"
          body={`You're already in room ${otherRoom}. Leave and join this one?`}
          confirmLabel="Leave and join"
          onConfirm={async () => {
            if (!otherRoom) return;
            await fetch(`/api/rooms/${otherRoom}/membership`, { method: 'DELETE', credentials: 'include' });
            setOtherRoom(null);
            commit();
          }}
          onCancel={() => {
            setOtherRoom(null);
            nav('/home');
          }}
        />
      </div>
    );
  }

  // Joined / socket-driven
  if (!view) {
    return <Card>Connecting…</Card>;
  }

  const stage = view.room.stage;

  return (
    <div className="pb-24 max-w-md mx-auto">
      <ReclaimTabBanner />
      <DisconnectBanner />
      {stage === 'waiting' ? <EmptyLobbyView /> : null}
      {stage === 'lobby' ? <LobbyView /> : null}
      {stage === 'secrets' ? <SecretSubmissionView /> : null}
      {stage === 'rps' ? <RPSView /> : null}
      {stage === 'playing' ? <PlayingView /> : null}
      {stage === 'ended' ? <ResultView /> : null}
      {stage === 'abandoned' ? <AbandonedView /> : null}
      {stage !== 'waiting' && stage !== 'abandoned' ? <EmotePanel /> : null}
      <EmoteToastLayer />
    </div>
  );
}
