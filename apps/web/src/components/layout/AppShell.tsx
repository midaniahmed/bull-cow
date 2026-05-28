import type { ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useConnectionStore } from '../../stores/connection.store.js';
import { SnackbarLayer } from '../primitives/SnackbarLayer.js';

export function AppShell({ children }: { children: ReactNode }) {
  const status = useConnectionStore((s) => s.socketStatus);
  const reconnecting = useConnectionStore((s) => s.reconnecting);
  const location = useLocation();
  const params = useParams<{ code?: string }>();
  const inRoom = location.pathname.startsWith('/room/');

  return (
    <div className="min-h-dvh flex flex-col bg-bg text-ink">
      <header className="px-4 pt-safe py-3 flex items-center justify-between border-b border-panel2">
        {inRoom ? (
          <div className="font-mono tracking-widest text-lg">{params.code}</div>
        ) : (
          <Link to="/" className="font-semibold text-accent">
            Bulls &amp; Cows
          </Link>
        )}
        <div className="text-xs text-muted">
          {reconnecting ? 'reconnecting…' : status === 'connected' ? '● online' : status === 'disconnected' ? '● offline' : ''}
        </div>
      </header>
      <main className="flex-1 px-4 py-4 pl-safe pr-safe">{children}</main>
      <SnackbarLayer />
    </div>
  );
}
