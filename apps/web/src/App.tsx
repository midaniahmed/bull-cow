import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell.js';
import { LandingPage } from './pages/LandingPage.js';
import { HomePage } from './pages/HomePage.js';
import { CreateRoomPage } from './pages/CreateRoomPage.js';
import { JoinRoomPage } from './pages/JoinRoomPage.js';
import { RoomPage } from './pages/RoomPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';
import { RequireSession } from './components/auth/RequireSession.js';
import { useSessionStore } from './stores/session.store.js';

export function App() {
  const nickname = useSessionStore((s) => s.nickname);
  const status = useSessionStore((s) => s.status);
  const bootstrap = useSessionStore((s) => s.bootstrap);

  useEffect(() => {
    if (status === 'unknown' && nickname) {
      void bootstrap();
    }
  }, [status, nickname, bootstrap]);

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/home"
          element={
            <RequireSession>
              <HomePage />
            </RequireSession>
          }
        />
        <Route
          path="/create"
          element={
            <RequireSession>
              <CreateRoomPage />
            </RequireSession>
          }
        />
        <Route
          path="/join"
          element={
            <RequireSession>
              <JoinRoomPage />
            </RequireSession>
          }
        />
        <Route
          path="/room/:code"
          element={
            <RequireSession>
              <RoomPage />
            </RequireSession>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}
