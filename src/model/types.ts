// ---------------------------------------------------------------------------
// Core data model. Game state is plain data (no functions) so it can be cloned
// cheaply for AI look-ahead and combat forecasts. Card behaviour lives in the
// card registry (src/data/cards.ts) and is looked up by id.
// ---------------------------------------------------------------------------

export type PlayerIndex = 0 | 1;

export enum Keyword {
  Flying = 'Flying',
  Tough = 'Tough',
  Shield = 'Shield',
  Lifesteal = 'Lifesteal',
  Deadly = 'Deadly',
  Trample = 'Trample',
  Slow = 'Slow',
}

export type Faction = 'Ember' | 'Tide' | 'Wild' | 'Bone' | 'Neutral';

export type CardType = 'creature' | 'spell';

/** What a spell needs the player to tap on when it is cast. */
export type TargetKind = 'none' | 'enemyCreature' | 'friendlyCreature' | 'anyCreature';

export interface UnitRef {
  player: PlayerIndex;
  lane: number;
}

/** A creature on the board. */
export interface Unit {
  uid: number;
  cardId: string;
  owner: PlayerIndex;
  power: number;
  maxLife: number;
  damage: number;
  keywords: Keyword[];
  /** Can't attack this turn (Slow, or just unfrozen). */
  exhausted: boolean;
  /** Skips its owner's next untap. */
  frozen: boolean;
  /** Absorbs the next instance of damage. */
  shield: boolean;
  /** Power bonus that wears off at end of turn. */
  tempPower: number;
}

export interface PlayerState {
  life: number;
  deck: string[];
  hand: string[];
  discard: string[];
  /** Permanent ink crystals. */
  ink: number;
  /** Ink spent this turn. */
  inkSpent: number;
  /** One-turn ink (e.g. Crystal Mine). */
  bonusInk: number;
  hasInked: boolean;
  /** May still redraw the opening hand (until the first ink, play or FIGHT). */
  canMulligan: boolean;
  lanes: (Unit | null)[];
}

export interface GameState {
  players: [PlayerState, PlayerState];
  terrains: string[];
  round: number;
  active: PlayerIndex;
  firstPlayer: PlayerIndex;
  winner: PlayerIndex | null;
  nextUid: number;
  rngState: number;
}

/** Snapshot of a unit, carried on events so the UI can animate without
 *  re-reading (possibly already changed) engine state. */
export interface UnitView {
  uid: number;
  cardId: string;
  owner: PlayerIndex;
  lane: number;
  power: number;
  life: number;
  maxLife: number;
  keywords: Keyword[];
  exhausted: boolean;
  frozen: boolean;
  shield: boolean;
}

export type GameEvent =
  | { t: 'turnStart'; p: PlayerIndex; round: number }
  | { t: 'draw'; p: PlayerIndex; cardId: string }
  | { t: 'mulligan'; p: PlayerIndex }
  | { t: 'burn'; p: PlayerIndex; cardId: string }
  | { t: 'ink'; p: PlayerIndex; cardId: string; ink: number }
  | { t: 'gainInk'; p: PlayerIndex; amount: number }
  | { t: 'play'; p: PlayerIndex; cardId: string; lane?: number; target?: UnitRef }
  | { t: 'summon'; unit: UnitView }
  | { t: 'attack'; uid: number; p: PlayerIndex; lane: number; targetUid: number | null }
  | { t: 'damage'; uid: number; amount: number; unit: UnitView }
  | { t: 'shieldPop'; uid: number }
  | { t: 'hero'; p: PlayerIndex; amount: number; life: number }
  | { t: 'unit'; unit: UnitView; reason: 'buff' | 'heal' | 'freeze' | 'shield' }
  | { t: 'death'; uid: number; p: PlayerIndex; lane: number }
  | { t: 'bounce'; uid: number; p: PlayerIndex; lane: number }
  | { t: 'terrain'; lane: number }
  | { t: 'storm'; p: PlayerIndex; amount: number }
  | { t: 'gameOver'; winner: PlayerIndex };

export interface LogEntry {
  round: number;
  p: PlayerIndex;
  text: string;
}

export type Action =
  | { type: 'ink'; hand: number }
  | { type: 'play'; hand: number; lane?: number; target?: UnitRef }
  | { type: 'mulligan' }
  | { type: 'end' };
