export enum Phase {
  Draw = 'Draw',
  Ink = 'Ink',
  Play = 'Play',
  Combat = 'Combat',
  End = 'End',
}

export enum Keyword {
  Cleave = 'Cleave',
  Tide = 'Tide',
  Slow = 'Slow',
  Evasion = 'Evasion',
  Tough = 'Tough',
  Rich = 'Rich',
}

export enum InkingMode {
  Persistent = 'Persistent',
  Expendable = 'Expendable',
}

export enum CombatMode {
  MutualDamage = 'MutualDamage',
  AttackerOnly = 'AttackerOnly',
}

export interface Card {
  name: string;
  cost: number;
  power: number;
  life: number;
  keywords: Keyword[];
  inkable: boolean;
  inkValue: number;
}

export interface CreatureInstance {
  card: Card;
  damage: number;
  exhausted: boolean;
}

export interface Player {
  life: number;
  deck: Card[];
  hand: Card[];
  inkPool: number;
  inkUsed: number;
  temporaryInk: number;
  hasInkedThisTurn: boolean;
  lanes: (CreatureInstance | null)[];
  discard: Card[];
}

export interface GameState {
  players: [Player, Player];
  currentTurn: number;
  currentPhase: Phase;
  activePlayerIndex: 0 | 1;
  inkingMode: InkingMode;
  combatMode: CombatMode;
  gameOver: boolean;
  winner: 0 | 1 | null;
  pendingTide: boolean;
}

export interface LogEntry {
  turn: number;
  player: number;
  phase: Phase;
  message: string;
}
