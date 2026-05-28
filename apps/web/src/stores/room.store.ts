import { create } from 'zustand';
import type {
  RoomStateView,
  RoomStage,
  PlayerPublic,
  GuessLogEntry,
  SessionToken,
  PlayerReadyPayload,
  MatchStartedPayload,
  SecretLockedPayload,
  RPSPickedPayload,
  RPSResolvedPayload,
  GuessSubmittedPayload,
  ResultCalculatedPayload,
  TurnChangedPayload,
  TimeoutStrikePayload,
  ForfeitDeclaredPayload,
  MatchEndedPayload,
  PlayerDisconnectedPayload,
  PlayerReconnectedPayload,
  RoomJoinedPayload,
  RoomCreatedPayload,
} from '@bc/shared';

type RoomStoreState = {
  view: RoomStateView | null;
  setView: (view: RoomStateView | null) => void;
  apply: (event: string, payload: unknown) => void;
  reset: () => void;
};

function clonePlayers(view: RoomStateView): RoomStateView {
  return {
    ...view,
    room: {
      ...view.room,
      players: {
        creator: { ...view.room.players.creator },
        joiner: view.room.players.joiner ? { ...view.room.players.joiner } : null,
      },
    },
    match: view.match ? { ...view.match, guessLog: [...view.match.guessLog] } : null,
  };
}

function findPlayer(view: RoomStateView, token: SessionToken): PlayerPublic | null {
  if (view.room.players.creator.sessionToken === token) return view.room.players.creator;
  if (view.room.players.joiner?.sessionToken === token) return view.room.players.joiner;
  return null;
}

export const useRoomStore = create<RoomStoreState>((set, get) => ({
  view: null,
  setView: (view) => set({ view }),
  reset: () => set({ view: null }),
  apply: (event, payload) => {
    const cur = get().view;
    if (!cur) {
      // Some events arrive before a snapshot; we ignore them.
      if (event === 'room_created') {
        const p = payload as RoomCreatedPayload;
        set({
          view: {
            room: p.room,
            yourToken: p.you.sessionToken,
            match: null,
          },
        });
      }
      return;
    }
    const v = clonePlayers(cur);

    switch (event) {
      case 'room_joined': {
        const p = payload as RoomJoinedPayload;
        v.room = p.room;
        break;
      }
      case 'player_ready': {
        const p = payload as PlayerReadyPayload;
        const target = findPlayer(v, p.playerToken);
        if (target) target.ready = p.ready;
        break;
      }
      case 'match_started': {
        const p = payload as MatchStartedPayload;
        if (v.match) {
          v.match.activePlayer = p.firstTurnPlayer;
        }
        v.room.stage = p.firstTurnPlayer ? 'playing' : v.room.stage === 'rps' ? 'playing' : 'secrets';
        break;
      }
      case 'secret_locked': {
        const p = payload as SecretLockedPayload;
        if (v.match && p.playerToken !== v.yourToken) {
          v.match.opponentSecretSubmitted = true;
        }
        break;
      }
      case 'rps_picked': {
        const p = payload as RPSPickedPayload;
        if (v.match && p.playerToken !== v.yourToken) {
          v.match.opponentRPSPickLocked = true;
        }
        break;
      }
      case 'rps_resolved': {
        const p = payload as RPSResolvedPayload;
        if (v.match) {
          v.match.rpsRound = p.willReplay ? ((p.round + 1) as 1 | 2 | 3) : p.round;
          v.match.yourRPSPick = p.willReplay ? null : v.match.yourRPSPick ?? null;
          v.match.opponentRPSPickLocked = p.willReplay ? false : v.match.opponentRPSPickLocked;
        }
        break;
      }
      case 'guess_submitted': {
        // No-op for visible state; just used for indicators in sim mode.
        void (payload as GuessSubmittedPayload);
        break;
      }
      case 'result_calculated': {
        const p = payload as ResultCalculatedPayload;
        if (v.match) {
          v.match.guessLog = [...v.match.guessLog, ...p.entries];
        }
        break;
      }
      case 'turn_changed': {
        const p = payload as TurnChangedPayload;
        if (v.match) {
          v.match.activePlayer = p.activePlayer;
          v.match.turnIndex = p.turnIndex;
          v.match.turnDeadline = p.turnDeadline;
        }
        break;
      }
      case 'timeout_strike': {
        const p = payload as TimeoutStrikePayload;
        const target = findPlayer(v, p.playerToken);
        if (target) target.strikes = p.strikes;
        break;
      }
      case 'forfeit_declared': {
        void (payload as ForfeitDeclaredPayload);
        break;
      }
      case 'match_ended': {
        const p = payload as MatchEndedPayload;
        v.room.stage = 'ended';
        v.endedView = {
          outcome: p.outcome,
          secrets: p.secrets,
          rematchScore: p.rematchScore,
        };
        if (v.match) {
          v.match.guessLog = p.guessLog as GuessLogEntry[];
        }
        break;
      }
      case 'player_disconnected': {
        const p = payload as PlayerDisconnectedPayload;
        const target = findPlayer(v, p.playerToken);
        if (target) target.connected = false;
        break;
      }
      case 'player_reconnected': {
        const p = payload as PlayerReconnectedPayload;
        const target = findPlayer(v, p.playerToken);
        if (target) target.connected = true;
        break;
      }
      case 'room_closed': {
        // Caller handles navigation; reset the store here.
        set({ view: null });
        return;
      }
    }
    set({ view: v });
  },
}));

export function useYourTurn(): boolean {
  return useRoomStore((s) => !!s.view?.match && s.view.match.activePlayer === s.view.yourToken);
}
export function useStage(): RoomStage | null {
  return useRoomStore((s) => s.view?.room.stage ?? null);
}
export function useOpponent(): PlayerPublic | null {
  return useRoomStore((s) => {
    const v = s.view;
    if (!v) return null;
    const c = v.room.players.creator;
    const j = v.room.players.joiner;
    if (c.sessionToken !== v.yourToken) return c;
    return j;
  });
}
export function useYou(): PlayerPublic | null {
  return useRoomStore((s) => {
    const v = s.view;
    if (!v) return null;
    const c = v.room.players.creator;
    const j = v.room.players.joiner;
    if (c.sessionToken === v.yourToken) return c;
    if (j?.sessionToken === v.yourToken) return j;
    return null;
  });
}
export function useIsCreator(): boolean {
  return useRoomStore((s) => !!s.view && s.view.room.players.creator.sessionToken === s.view.yourToken);
}
