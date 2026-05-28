import type { AppSocket } from './client.js';
import { useRoomStore } from '../stores/room.store.js';
import { useEmoteStore } from '../stores/emote.store.js';
import { useConnectionStore } from '../stores/connection.store.js';
import { useUiStore } from '../stores/ui.store.js';
import { emit } from './emit.js';

export function subscribeAll(socket: AppSocket, currentRoom: string, navigate: (path: string) => void) {
  const apply = (event: string) => (payload: unknown) => {
    useRoomStore.getState().apply(event, payload);
  };

  socket.on('connect', () => {
    useConnectionStore.getState().set({
      socketStatus: 'connected',
      reconnecting: false,
      attempt: 0,
    });
  });
  socket.on('disconnect', () => {
    useConnectionStore.getState().set({ socketStatus: 'disconnected' });
  });
  socket.io.on('reconnect_attempt', (attempt) => {
    useConnectionStore.getState().set({ reconnecting: true, attempt });
  });
  socket.io.on('reconnect', () => {
    useConnectionStore.getState().set({ reconnecting: false, socketStatus: 'connected' });
    // Ask for a fresh snapshot
    void emit.stateRequest().then((r) => {
      if (r.ok) useRoomStore.getState().setView(r.state);
    });
  });

  socket.on('room_created', (p) => {
    useRoomStore.getState().apply('room_created', p);
  });
  socket.on('room_joined', apply('room_joined'));
  socket.on('player_ready', apply('player_ready'));
  socket.on('match_started', apply('match_started'));
  socket.on('secret_locked', apply('secret_locked'));
  socket.on('rps_picked', apply('rps_picked'));
  socket.on('rps_resolved', apply('rps_resolved'));
  socket.on('guess_submitted', apply('guess_submitted'));
  socket.on('result_calculated', apply('result_calculated'));
  socket.on('turn_changed', apply('turn_changed'));
  socket.on('timeout_strike', apply('timeout_strike'));
  socket.on('forfeit_declared', apply('forfeit_declared'));
  socket.on('match_ended', apply('match_ended'));
  socket.on('player_disconnected', apply('player_disconnected'));
  socket.on('player_reconnected', apply('player_reconnected'));
  socket.on('rematch_offered', (p) => {
    useUiStore.getState().showSnackbar(`Opponent offered a rematch`, 'info');
    void p;
  });
  socket.on('rematch_declined', (p) => {
    useUiStore.getState().showSnackbar(`Opponent declined the rematch`, 'info');
    void p;
  });
  socket.on('rematch_accepted', (p) => {
    void p;
    useUiStore.getState().showSnackbar(`Rematch on!`, 'success');
  });
  socket.on('emote_sent', (p) => {
    useEmoteStore.getState().push(p, currentRoom);
  });
  socket.on('room_state', (p) => {
    useRoomStore.getState().setView(p);
  });
  socket.on('tab_demoted', () => {
    useConnectionStore.getState().set({ tabStatus: 'demoted' });
  });
  socket.on('room_closed', (p) => {
    useUiStore.getState().showSnackbar(`Room closed: ${p.reason}`, 'info');
    useRoomStore.getState().reset();
    navigate('/home');
  });
}
