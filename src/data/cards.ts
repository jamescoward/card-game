import type { Game } from '../engine/Game';
import { Faction, CardType, Keyword, PlayerIndex, TargetKind, Unit } from '../model/types';

const { Flying, Tough, Shield, Lifesteal, Deadly, Trample, Slow } = Keyword;

export interface CardDef {
  id: string;
  name: string;
  faction: Faction;
  type: CardType;
  cost: number;
  power: number;
  life: number;
  keywords: Keyword[];
  inkable: boolean;
  /** Emoji used as card art. */
  art: string;
  /** Rules text shown on the card (keywords are shown separately). */
  text: string;
  /** Spells only: what the player must tap to cast it. */
  target?: TargetKind;
  /** Tokens never appear in decks or draft rewards. */
  token?: boolean;

  /** Creature enters play. `replaced` is the friendly unit it overwrote, if any. */
  onPlay?(g: Game, self: Unit, replaced: Unit | null): void;
  /** Spell resolves. */
  cast?(g: Game, p: PlayerIndex, target: Unit | null): void;
  /** Creature dies (after it has left the board). */
  onDeath?(g: Game, self: Unit, lane: number): void;
  /** Card is sacrificed for ink. */
  onInk?(g: Game, p: PlayerIndex): void;
  /** Start of the owner's turn. */
  onTurnStart?(g: Game, self: Unit): void;
  /** After this creature fights a creature and survives. */
  onSurvive?(g: Game, self: Unit): void;
  /** Another friendly creature died. */
  onAllyDeath?(g: Game, self: Unit, dead: Unit): void;
  /** Power bonus this unit grants to another friendly unit. */
  aura?(selfLane: number, otherLane: number): number;
}

type Def = Omit<CardDef, 'keywords' | 'inkable' | 'power' | 'life' | 'type' | 'text'> &
  Partial<Pick<CardDef, 'keywords' | 'inkable' | 'power' | 'life' | 'type' | 'text'>>;

function def(d: Def): CardDef {
  return {
    type: 'creature',
    keywords: [],
    inkable: true,
    power: 0,
    life: 0,
    text: '',
    ...d,
  };
}

function spell(d: Omit<Def, 'type'>): CardDef {
  return def({ ...d, type: 'spell', target: d.target ?? 'none' });
}

const opposingUnit = (g: Game, self: Unit) => g.opposing(self);

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const TOKENS: CardDef[] = [
  def({ id: 'spirit', name: 'Spirit', faction: 'Bone', cost: 1, power: 1, life: 1, keywords: [Flying], art: '👻', token: true }),
  def({ id: 'imp', name: 'Imp', faction: 'Ember', cost: 1, power: 1, life: 1, art: '😈', token: true }),
];

// ---------------------------------------------------------------------------
// EMBER — aggro. Cheap hitters, burn, Trample. Wins fast or not at all.
// ---------------------------------------------------------------------------

const EMBER: CardDef[] = [
  def({ id: 'goblin', name: 'Goblin Rascal', faction: 'Ember', cost: 1, power: 2, life: 1, art: '👺' }),
  def({ id: 'ember_imp', name: 'Ember Imp', faction: 'Ember', cost: 1, power: 1, life: 1, keywords: [Flying], art: '😈',
    text: 'Ink: deal 1 damage to the enemy hero.',
    onInk: (g, p) => g.damageHero(g.other(p), 1) }),
  def({ id: 'raider', name: 'Raider', faction: 'Ember', cost: 2, power: 2, life: 1, art: '🪓',
    text: 'On play: deal 2 damage to the opposing creature.',
    onPlay: (g, self) => { const o = opposingUnit(g, self); if (o) g.dealDamage(o, 2, self); } }),
  def({ id: 'bomber', name: 'Goblin Bomber', faction: 'Ember', cost: 2, power: 2, life: 2, art: '💣',
    text: 'When this dies, deal 2 damage to the enemy hero.',
    onDeath: (g, self) => g.damageHero(g.other(self.owner), 2) }),
  def({ id: 'hellhound', name: 'Hellhound', faction: 'Ember', cost: 3, power: 4, life: 3, keywords: [Trample], art: '🐺' }),
  def({ id: 'imp_caller', name: 'Imp Caller', faction: 'Ember', cost: 3, power: 2, life: 3, art: '🧙',
    text: 'On play: add two Imps (1-cost 1/1) to your hand.',
    onPlay: (g, self) => { g.addToHand(self.owner, 'imp'); g.addToHand(self.owner, 'imp'); } }),
  def({ id: 'phoenix', name: 'Phoenix', faction: 'Ember', cost: 4, power: 3, life: 2, keywords: [Flying], art: '🐦‍🔥',
    text: 'When this dies, return it to your hand.',
    onDeath: (g, self) => g.addToHand(self.owner, 'phoenix') }),
  def({ id: 'inferno', name: 'Inferno Drake', faction: 'Ember', cost: 5, power: 5, life: 4, keywords: [Flying], inkable: false, art: '🐉',
    text: 'On play: deal 1 damage to every enemy creature and the enemy hero.',
    onPlay: (g, self) => {
      const foe = g.other(self.owner);
      for (const u of g.unitsOf(foe)) g.dealDamage(u, 1, self);
      g.damageHero(foe, 1, self);
    } }),
  spell({ id: 'spark', name: 'Spark', faction: 'Ember', cost: 1, art: '⚡', target: 'anyCreature',
    text: 'Deal 2 damage to a creature.',
    cast: (g, _p, t) => { if (t) g.dealDamage(t, 2); } }),
  spell({ id: 'war_drums', name: 'War Drums', faction: 'Ember', cost: 2, art: '🥁',
    text: 'Your creatures get +2 power this turn.',
    cast: (g, p) => { for (const u of g.unitsOf(p)) g.buff(u, 2, 0, true); } }),
  spell({ id: 'fireball', name: 'Fireball', faction: 'Ember', cost: 3, art: '🔥', target: 'anyCreature',
    text: 'Deal 4 damage to a creature.',
    cast: (g, _p, t) => { if (t) g.dealDamage(t, 4); } }),
  spell({ id: 'fireblast', name: 'Fireblast', faction: 'Ember', cost: 3, art: '☄️',
    text: 'Deal 3 damage to the enemy hero. Ink: deal 1 damage to the enemy hero.',
    cast: (g, p) => g.damageHero(g.other(p), 3),
    onInk: (g, p) => g.damageHero(g.other(p), 1) }),
];

// ---------------------------------------------------------------------------
// TIDE — tempo. Flyers, bounce, card draw, freeze.
// ---------------------------------------------------------------------------

const TIDE: CardDef[] = [
  def({ id: 'sprite', name: 'Sea Sprite', faction: 'Tide', cost: 1, power: 1, life: 2, keywords: [Flying], art: '🧚',
    text: 'Ink: draw a card.',
    onInk: (g, p) => g.draw(p) }),
  def({ id: 'tidewalker', name: 'Tidewalker', faction: 'Tide', cost: 2, power: 2, life: 3, art: '🌊',
    text: 'On play: return the opposing creature to its owner\'s hand.',
    onPlay: (g, self) => { const o = opposingUnit(g, self); if (o) g.bounce(o); } }),
  def({ id: 'turtle', name: 'Shell Turtle', faction: 'Tide', cost: 2, power: 2, life: 3, keywords: [Shield], art: '🐢' }),
  def({ id: 'mirror_mage', name: 'Mirror Mage', faction: 'Tide', cost: 3, power: 2, life: 3, art: '🧙‍♀️',
    text: 'On play: draw a card.',
    onPlay: (g, self) => g.draw(self.owner) }),
  def({ id: 'storm_eagle', name: 'Storm Eagle', faction: 'Tide', cost: 3, power: 3, life: 3, keywords: [Flying], art: '🦅' }),
  def({ id: 'frost_giant', name: 'Frost Giant', faction: 'Tide', cost: 4, power: 3, life: 5, art: '🧊',
    text: 'On play: freeze the opposing creature (it skips its next attack).',
    onPlay: (g, self) => { const o = opposingUnit(g, self); if (o) g.freeze(o); } }),
  def({ id: 'siren', name: 'Siren', faction: 'Tide', cost: 4, power: 3, life: 4, keywords: [Flying], art: '🧜‍♀️',
    text: 'On play: draw a card.',
    onPlay: (g, self) => g.draw(self.owner) }),
  def({ id: 'kraken', name: 'Kraken', faction: 'Tide', cost: 5, power: 5, life: 6, inkable: false, art: '🐙',
    text: 'On play: return every enemy creature with 3 or less power to its owner\'s hand.',
    onPlay: (g, self) => {
      for (const u of g.unitsOf(g.other(self.owner))) if (g.powerOf(u) <= 3) g.bounce(u);
    } }),
  spell({ id: 'frost_bolt', name: 'Frost Bolt', faction: 'Tide', cost: 1, art: '❄️', target: 'enemyCreature',
    text: 'Deal 2 damage to an enemy creature and freeze it.',
    cast: (g, _p, t) => { if (t) { g.dealDamage(t, 2); if (g.isAlive(t)) g.freeze(t); } } }),
  spell({ id: 'bubble', name: 'Bubble', faction: 'Tide', cost: 1, art: '🫧', target: 'friendlyCreature',
    text: 'Give a friendly creature Shield. Draw a card.',
    cast: (g, p, t) => { if (t) g.giveShield(t); g.draw(p); } }),
  spell({ id: 'insight', name: 'Insight', faction: 'Tide', cost: 2, art: '🔮',
    text: 'Draw 2 cards.',
    cast: (g, p) => g.draw(p, 2) }),
  spell({ id: 'riptide', name: 'Riptide', faction: 'Tide', cost: 2, art: '🌀', target: 'anyCreature',
    text: 'Return a creature to its owner\'s hand.',
    cast: (g, _p, t) => { if (t) g.bounce(t); } }),
];

// ---------------------------------------------------------------------------
// WILD — ramp and growth. Starts slow, ends huge.
// ---------------------------------------------------------------------------

const WILD: CardDef[] = [
  def({ id: 'sapling', name: 'Sapling', faction: 'Wild', cost: 1, power: 0, life: 1, art: '🌱',
    text: 'Start of your turn: gain +1/+1.',
    onTurnStart: (g, self) => g.buff(self, 1, 1) }),
  def({ id: 'druid', name: 'Grove Druid', faction: 'Wild', cost: 2, power: 1, life: 2, art: '🧝',
    text: 'On play: gain an empty ink crystal. Ink: gain 2 ink instead of 1.',
    onPlay: (g, self) => g.gainInk(self.owner, 1, false),
    onInk: (g, p) => g.gainInk(p, 1, true) }),
  def({ id: 'boar', name: 'Wild Boar', faction: 'Wild', cost: 2, power: 2, life: 3, art: '🐗',
    text: 'After this fights and survives, it gains +1/+1.',
    onSurvive: (g, self) => g.buff(self, 1, 1) }),
  def({ id: 'thornback', name: 'Thornback', faction: 'Wild', cost: 2, power: 2, life: 2, keywords: [Tough], art: '🦔' }),
  def({ id: 'bear', name: 'Cave Bear', faction: 'Wild', cost: 3, power: 3, life: 4, art: '🐻' }),
  def({ id: 'treant', name: 'Treant', faction: 'Wild', cost: 4, power: 3, life: 5, keywords: [Tough], art: '🌳' }),
  def({ id: 'rhino', name: 'Rhino', faction: 'Wild', cost: 4, power: 4, life: 4, keywords: [Trample], art: '🦏' }),
  def({ id: 'hydra', name: 'Hydra', faction: 'Wild', cost: 5, power: 5, life: 5, inkable: false, art: '🐍',
    text: 'Start of your turn: gain +1/+1.',
    onTurnStart: (g, self) => g.buff(self, 1, 1) }),
  def({ id: 'giant', name: 'Lumbering Giant', faction: 'Wild', cost: 5, power: 6, life: 6, keywords: [Slow, Trample], art: '🗿' }),
  spell({ id: 'feast', name: 'Mushroom Feast', faction: 'Wild', cost: 2, art: '🍄', target: 'friendlyCreature',
    text: 'Give a friendly creature +2/+3.',
    cast: (g, _p, t) => { if (t) g.buff(t, 2, 3); } }),
  spell({ id: 'wild_growth', name: 'Wild Growth', faction: 'Wild', cost: 2, art: '🌿',
    text: 'Gain an empty ink crystal. Draw a card.',
    cast: (g, p) => { g.gainInk(p, 1, false); g.draw(p); } }),
  spell({ id: 'stampede', name: 'Stampede', faction: 'Wild', cost: 3, art: '🐘',
    text: 'Your creatures get +1/+1 and Trample.',
    cast: (g, p) => { for (const u of g.unitsOf(p)) { g.buff(u, 1, 1); g.giveKeyword(u, Trample); } } }),
];

// ---------------------------------------------------------------------------
// BONE — sacrifice. Death triggers, Lifesteal, Deadly, overwrite synergies.
// ---------------------------------------------------------------------------

const BONE: CardDef[] = [
  def({ id: 'skeleton', name: 'Skeleton', faction: 'Bone', cost: 1, power: 1, life: 2, art: '💀',
    text: 'When this dies, add a Spirit (1-cost 1/1 Flying) to your hand.',
    onDeath: (g, self) => g.addToHand(self.owner, 'spirit') }),
  def({ id: 'rat', name: 'Plague Rat', faction: 'Bone', cost: 2, power: 1, life: 2, keywords: [Deadly], art: '🐀' }),
  def({ id: 'bat', name: 'Vampire Bat', faction: 'Bone', cost: 2, power: 2, life: 1, keywords: [Flying, Lifesteal], art: '🦇' }),
  def({ id: 'ghoul', name: 'Ghoul', faction: 'Bone', cost: 2, power: 2, life: 2, art: '🧟',
    text: 'Devour: if this replaces your creature, gain +2/+2.',
    onPlay: (g, self, replaced) => { if (replaced) g.buff(self, 2, 2); } }),
  def({ id: 'necromancer', name: 'Necromancer', faction: 'Bone', cost: 3, power: 2, life: 3, art: '🧛',
    text: 'Whenever another friendly creature dies, deal 1 damage to the enemy hero.',
    onAllyDeath: (g, self) => g.damageHero(g.other(self.owner), 1, self) }),
  def({ id: 'colossus', name: 'Bone Colossus', faction: 'Bone', cost: 4, power: 3, life: 5, art: '🦴',
    text: 'Whenever another friendly creature dies, gain +1/+1.',
    onAllyDeath: (g, self) => g.buff(self, 1, 1) }),
  def({ id: 'wraith', name: 'Wraith', faction: 'Bone', cost: 4, power: 3, life: 2, keywords: [Flying, Lifesteal], art: '🌫️' }),
  def({ id: 'lich', name: 'Lich King', faction: 'Bone', cost: 5, power: 4, life: 5, keywords: [Lifesteal], inkable: false, art: '☠️',
    text: 'On play: destroy the opposing creature.',
    onPlay: (g, self) => { const o = opposingUnit(g, self); if (o) g.destroy(o); } }),
  spell({ id: 'harvest', name: 'Soul Harvest', faction: 'Bone', cost: 1, art: '🩸', target: 'friendlyCreature',
    text: 'Destroy a friendly creature. Draw 2 cards.',
    cast: (g, p, t) => { if (t) g.destroy(t); g.draw(p, 2); } }),
  spell({ id: 'drain', name: 'Drain Life', faction: 'Bone', cost: 2, art: '🫀', target: 'anyCreature',
    text: 'Deal 2 damage to a creature. Heal your hero 2.',
    cast: (g, p, t) => { if (t) g.dealDamage(t, 2); g.healHero(p, 2); } }),
  spell({ id: 'raise_dead', name: 'Raise Dead', faction: 'Bone', cost: 2, art: '⚰️',
    text: 'Add two Spirits (1-cost 1/1 Flying) to your hand. Ink: gain 2 life.',
    cast: (g, p) => { g.addToHand(p, 'spirit'); g.addToHand(p, 'spirit'); },
    onInk: (g, p) => g.healHero(p, 2) }),
  spell({ id: 'plague', name: 'Plague', faction: 'Bone', cost: 4, art: '☣️',
    text: 'Deal 2 damage to every creature.',
    cast: (g) => { for (const u of [...g.unitsOf(0), ...g.unitsOf(1)]) g.dealDamage(u, 2); } }),
];

// ---------------------------------------------------------------------------
// NEUTRAL — shows up in Gauntlet draft rewards.
// ---------------------------------------------------------------------------

const NEUTRAL: CardDef[] = [
  def({ id: 'sentinel', name: 'Sentinel', faction: 'Neutral', cost: 1, power: 0, life: 4, keywords: [Tough], art: '🗽' }),
  def({ id: 'merchant', name: 'Merchant', faction: 'Neutral', cost: 2, power: 2, life: 2, art: '💰',
    text: 'Ink: gain 2 ink instead of 1.',
    onInk: (g, p) => g.gainInk(p, 1, true) }),
  def({ id: 'banner', name: 'Banner Bearer', faction: 'Neutral', cost: 2, power: 1, life: 3, art: '🚩',
    text: 'Your creatures in adjacent lanes have +1 power.',
    aura: (a, b) => (Math.abs(a - b) === 1 ? 1 : 0) }),
  def({ id: 'cleric', name: 'Cleric', faction: 'Neutral', cost: 2, power: 2, life: 2, art: '😇',
    text: 'On play: heal your hero 3.',
    onPlay: (g, self) => g.healHero(self.owner, 3) }),
  def({ id: 'ogre', name: 'Ogre', faction: 'Neutral', cost: 3, power: 4, life: 3, art: '👹' }),
  def({ id: 'knight', name: 'Knight', faction: 'Neutral', cost: 3, power: 3, life: 3, keywords: [Shield], art: '🤺' }),
  def({ id: 'assassin', name: 'Assassin', faction: 'Neutral', cost: 4, power: 3, life: 1, keywords: [Deadly], art: '🥷',
    text: 'On play: deal 1 damage to the opposing creature.',
    onPlay: (g, self) => { const o = opposingUnit(g, self); if (o) g.dealDamage(o, 1, self); } }),
  def({ id: 'warchief', name: 'War Chief', faction: 'Neutral', cost: 4, power: 3, life: 4, art: '🪖',
    text: 'Your other creatures have +1 power.',
    aura: () => 1 }),
  def({ id: 'dragon', name: 'Dragon', faction: 'Neutral', cost: 5, power: 5, life: 5, keywords: [Flying], inkable: false, art: '🐲' }),
];

export const ALL_CARDS: CardDef[] = [...EMBER, ...TIDE, ...WILD, ...BONE, ...NEUTRAL, ...TOKENS];

export const CARDS: Record<string, CardDef> = Object.fromEntries(ALL_CARDS.map(c => [c.id, c]));

export function card(id: string): CardDef {
  const c = CARDS[id];
  if (!c) throw new Error(`Unknown card: ${id}`);
  return c;
}

/** Cards that can appear in decks and draft rewards. */
export const COLLECTIBLE: CardDef[] = ALL_CARDS.filter(c => !c.token);

export const KEYWORD_INFO: Record<Keyword, { icon: string; text: string }> = {
  [Flying]: { icon: '🪽', text: 'Flying: attacks the enemy hero directly unless the opposing creature also has Flying.' },
  [Tough]: { icon: '🛡️', text: 'Tough: takes 1 less damage from everything.' },
  [Shield]: { icon: '🫧', text: 'Shield: the first time this would take damage, the Shield pops instead.' },
  [Lifesteal]: { icon: '🩸', text: 'Lifesteal: damage this deals heals your hero.' },
  [Deadly]: { icon: '☠️', text: 'Deadly: any damage this deals to a creature destroys it.' },
  [Trample]: { icon: '🦶', text: 'Trample: excess combat damage hits the enemy hero.' },
  [Slow]: { icon: '🐌', text: 'Slow: can\'t attack the turn it is played.' },
};
