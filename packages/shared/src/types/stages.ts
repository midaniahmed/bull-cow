export type RoomStage =
  | 'waiting'
  | 'lobby'
  | 'secrets'
  | 'rps'
  | 'playing'
  | 'ended'
  | 'abandoned';

export type TurnSystem = 'alternating' | 'simultaneous';

export type FirstTurnRule = 'rps' | 'random' | 'creator' | 'joiner';

export type PlayerRole = 'creator' | 'joiner';
