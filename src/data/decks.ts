import { Card } from '../model/types';
import {
  GOBLIN, SCOUT, SENTINEL,
  ORC_WARRIOR, RAIDER, TIDEWALKER, MERCHANT,
  OGRE, SHADOW, BULWARK, RECRUITER,
  WAR_CHIEF, ASSASSIN, TEMPEST, LUMBERING_GIANT,
  DRAGON, HYDRA,
} from './cards';

function copies(card: Card, count: number): Card[] {
  return Array.from({ length: count }, () => ({ ...card }));
}

// Aggro: fast, cheap creatures; Cleave and Evasion to punch through
export const AGGRO_DECK: Card[] = [
  ...copies(GOBLIN, 4),         // 1-cost 1/1
  ...copies(SCOUT, 4),          // 1-cost 1/1 Evasion
  ...copies(RAIDER, 4),         // 2-cost 2/1 Cleave
  ...copies(ORC_WARRIOR, 4),    // 2-cost 2/2
  ...copies(ASSASSIN, 2),       // 4-cost 3/1 Cleave
  ...copies(SHADOW, 2),         // 3-cost 2/2 Evasion
  ...copies(DRAGON, 2),         // 5-cost 4/4 uninkable
  ...copies(OGRE, 2),           // 3-cost 3/2
]; // 24 → trim to 20
// Ensure exactly 20 cards
export const AGGRO_DECK_20: Card[] = [
  ...copies(GOBLIN, 4),
  ...copies(SCOUT, 4),
  ...copies(RAIDER, 4),
  ...copies(ORC_WARRIOR, 4),
  ...copies(ASSASSIN, 2),
  ...copies(SHADOW, 2),
];

// Midrange: balanced mix of costs and keywords
export const MIDRANGE_DECK: Card[] = [
  ...copies(GOBLIN, 2),           // 1-cost 1/1
  ...copies(SENTINEL, 2),         // 1-cost 0/2 Tough
  ...copies(ORC_WARRIOR, 4),      // 2-cost 2/2
  ...copies(TIDEWALKER, 2),       // 2-cost 1/2 Tide
  ...copies(OGRE, 2),             // 3-cost 3/2
  ...copies(BULWARK, 2),          // 3-cost 1/3 Tough
  ...copies(WAR_CHIEF, 2),        // 4-cost 3/3
  ...copies(TEMPEST, 2),          // 4-cost 2/3 Tide
  ...copies(LUMBERING_GIANT, 2),  // 4-cost 4/3 Slow
];

// Control: defensive, Tough creatures and bounce with Tide; Rich for ramp
export const CONTROL_DECK: Card[] = [
  ...copies(SENTINEL, 4),         // 1-cost 0/2 Tough
  ...copies(MERCHANT, 2),         // 2-cost 1/1 Rich
  ...copies(BULWARK, 4),          // 3-cost 1/3 Tough
  ...copies(RECRUITER, 2),        // 3-cost 2/2 Rich
  ...copies(WAR_CHIEF, 4),        // 4-cost 3/3
  ...copies(TEMPEST, 2),          // 4-cost 2/3 Tide
  ...copies(HYDRA, 2),            // 5-cost 3/5 Tough uninkable
];

export const DECK_CONFIGS: Record<string, { label: string; deck: Card[] }> = {
  aggro: { label: 'Aggro (Fast & Aggressive)', deck: AGGRO_DECK_20 },
  midrange: { label: 'Midrange (Balanced)', deck: MIDRANGE_DECK },
  control: { label: 'Control (Defensive)', deck: CONTROL_DECK },
};

// Legacy defaults
export const DEFAULT_DECK_1: Card[] = AGGRO_DECK_20.map(c => ({ ...c }));
export const DEFAULT_DECK_2: Card[] = MIDRANGE_DECK.map(c => ({ ...c }));
