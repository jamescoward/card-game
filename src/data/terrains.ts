import type { Game } from '../engine/Game';
import { Keyword, PlayerIndex } from '../model/types';

/**
 * Every game deals 3 random terrains, one per lane. Terrains make each match
 * play differently and give lane placement real weight.
 */
export interface TerrainDef {
  id: string;
  name: string;
  art: string;
  text: string;
  /** Power bonus for creatures in this lane. */
  power?: number;
  /** Keyword granted to creatures in this lane. */
  keyword?: Keyword;
  /** Attacks here always hit the enemy hero. */
  unblockable?: boolean;
  /** Multiplier for damage dealt to heroes from this lane. */
  heroDamageMultiplier?: number;
  /** Highest cost creature that may be played here. */
  maxCost?: number;
  /** Bonus to a creature's stats when it is played here. */
  onSummonBuff?: { power: number; life: number };
  /** Start of player p's turn. */
  onTurnStart?(g: Game, lane: number, p: PlayerIndex): void;
  /** End of player p's turn (after combat). */
  onTurnEnd?(g: Game, lane: number, p: PlayerIndex): void;
  /** A creature owned by p died here. */
  onDeath?(g: Game, lane: number, p: PlayerIndex): void;
}

export const TERRAINS: TerrainDef[] = [
  {
    id: 'volcano', name: 'Volcano', art: '🌋',
    text: 'End of each turn: 1 damage to both creatures here.',
    onTurnEnd: (g, lane) => {
      for (const p of [0, 1] as PlayerIndex[]) {
        const u = g.state.players[p].lanes[lane];
        if (u) g.dealDamage(u, 1);
      }
    },
  },
  {
    id: 'shrine', name: 'War Shrine', art: '⛩️',
    text: 'Creatures here have +1 power.',
    power: 1,
  },
  {
    id: 'fortress', name: 'Fortress', art: '🏰',
    text: 'Creatures here have Tough.',
    keyword: Keyword.Tough,
  },
  {
    id: 'windy', name: 'Windy Pass', art: '🌬️',
    text: 'Attacks here can\'t be blocked.',
    unblockable: true,
  },
  {
    id: 'arena', name: 'Arena', art: '🏟️',
    text: 'Damage to heroes from this lane is doubled.',
    heroDamageMultiplier: 2,
  },
  {
    id: 'mine', name: 'Crystal Mine', art: '💎',
    text: 'Start of your turn: if you have a creature here, gain 1 ink this turn.',
    onTurnStart: (g, lane, p) => { if (g.state.players[p].lanes[lane]) g.gainBonusInk(p, 1); },
  },
  {
    id: 'library', name: 'Library', art: '📚',
    text: 'Start of your turn: if you have a creature here, draw a card.',
    onTurnStart: (g, lane, p) => { if (g.state.players[p].lanes[lane]) g.draw(p); },
  },
  {
    id: 'oasis', name: 'Oasis', art: '🏝️',
    text: 'End of each turn: creatures here fully heal.',
    onTurnEnd: (g, lane) => {
      for (const p of [0, 1] as PlayerIndex[]) {
        const u = g.state.players[p].lanes[lane];
        if (u && u.damage > 0) g.healUnit(u);
      }
    },
  },
  {
    id: 'crypt', name: 'Haunted Crypt', art: '🪦',
    text: 'When a creature dies here, its owner adds a Spirit (1/1 Flying) to hand.',
    onDeath: (g, _lane, p) => g.addToHand(p, 'spirit'),
  },
  {
    id: 'throne', name: 'King\'s Hill', art: '👑',
    text: 'End of your turn: if only you have a creature here, deal 2 damage to the enemy hero.',
    onTurnEnd: (g, lane, p) => {
      const mine = g.state.players[p].lanes[lane];
      const theirs = g.state.players[g.other(p)].lanes[lane];
      if (mine && !theirs) g.damageHero(g.other(p), 2);
    },
  },
  {
    id: 'pass', name: 'Narrow Pass', art: '⛰️',
    text: 'Only creatures costing 3 or less can be played here.',
    maxCost: 3,
  },
  {
    id: 'forge', name: 'Forge', art: '⚒️',
    text: 'Creatures played here get +1/+1.',
    onSummonBuff: { power: 1, life: 1 },
  },
];

export const TERRAIN_MAP: Record<string, TerrainDef> = Object.fromEntries(TERRAINS.map(t => [t.id, t]));

export function terrain(id: string): TerrainDef {
  const t = TERRAIN_MAP[id];
  if (!t) throw new Error(`Unknown terrain: ${id}`);
  return t;
}
