import type { ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useConnectionStore } from '../../stores/connection.store.js';
import { SnackbarLayer } from '../primitives/SnackbarLayer.js';
import { fadeRise } from '../../motion/index.js';

function ConnectionPill() {
  const status = useConnectionStore((s) => s.socketStatus);
  const reconnecting = useConnectionStore((s) => s.reconnecting);
  const label = reconnecting ? 'reconnecting' : status === 'connected' ? 'online' : status === 'disconnected' ? 'offline' : '';
  if (!label) return null;
  const dot = reconnecting ? 'bg-warn' : status === 'connected' ? 'bg-success' : 'bg-danger';
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-muted">
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${reconnecting ? 'animate-glow-pulse' : ''}`} />
      {label}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const params = useParams<{ code?: string }>();
  const reduce = useReducedMotion();
  const inRoom = location.pathname.startsWith('/room/');

  return (
    <div className="min-h-dvh flex flex-col text-ink">
      {/* Living background field — fixed, behind everything, cosmetic only. */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-1/4 -right-1/4 w-[70vw] h-[70vw] rounded-full blur-3xl animate-drift"
          style={{ background: 'radial-gradient(circle, rgba(168,117,255,0.22), transparent 70%)' }}
        />
        <div
          className="absolute -bottom-1/4 -left-1/4 w-[70vw] h-[70vw] rounded-full blur-3xl animate-drift2"
          style={{ background: 'radial-gradient(circle, rgba(62,224,255,0.2), transparent 70%)' }}
        />
        <div className="absolute inset-0 bg-grid opacity-40" />
      </div>

      <header className="px-4 pt-safe py-3 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-bg/30 sticky top-0 z-20">
        {inRoom ? (
          <div className="font-mono tracking-[0.3em] text-lg text-grad">{params.code}</div>
        ) : (
          <Link to="/" className="font-bold tracking-tight text-grad text-lg">
            Bulls &amp; Cows
          </Link>
        )}
        <ConnectionPill />
      </header>

      <main className="flex-1 px-4 py-4 pl-safe pr-safe">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={fadeRise}
            initial={reduce ? false : 'hidden'}
            animate="show"
            exit={reduce ? undefined : 'exit'}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <SnackbarLayer />
    </div>
  );
}
