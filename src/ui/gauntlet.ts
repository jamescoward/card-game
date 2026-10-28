import { CardDef, COLLECTIBLE } from '../data/cards';
import { DECKS, DECK_IDS } from '../data/decks';
import { Difficulty } from '../engine/ai';
import { Faction } from '../model/types';

type DeckFaction = Exclude<Faction, 'Neutral'>;

export interface Opponent {
  faction: DeckFaction;
  name: string;
  taunt: string;
  difficulty: Difficulty;
  life: number;
  boss?: boolean;
  /** Extra cards shuffled into the opponent's deck. */
  extra: string[];
}

export interface RunState {
  faction: DeckFaction;
  deck: string[];
  /** Index of the next battle. */
  floor: number;
  opponents: Opponent[];
  /** Pending reward choice, if the player just won. */
  reward?: string[];
}

export const RIVALS: Record<DeckFaction, { name: string; taunt: string }[]> = {
  Ember: [
    { name: 'Grizzle the Torch', taunt: 'Everything burns eventually!' },
    { name: 'Madame Cinder', taunt: 'I do hope you brought marshmallows.' },
  ],
  Tide: [
    { name: 'Captain Brine', taunt: 'Ye\'ll be swimmin\' with the fishes.' },
    { name: 'Nerissa of the Deep', taunt: 'The tide always comes back.' },
  ],
  Wild: [
    { name: 'Old Mossbeard', taunt: 'Patience. The forest is patient.' },
    { name: 'Thistle & Thorn', taunt: 'Grow, little ones. GROW!' },
  ],
  Bone: [
    { name: 'Sister Ossuary', taunt: 'Your bones will serve me well.' },
    { name: 'Count Marrow', taunt: 'Death is only the beginning, darling.' },
  ],
};

export const FLOORS = 6;
const DIFFICULTY: Difficulty[] = ['easy', 'normal', 'normal', 'hard', 'hard', 'hard'];

const KEY = 'inkbrawl.run';
const BEST_KEY = 'inkbrawl.best';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function newRun(faction: DeckFaction): RunState {
  const others = DECK_IDS.filter(f => f !== faction);
  const order = [...shuffle(others), ...shuffle(DECK_IDS)].slice(0, FLOORS);
  const opponents: Opponent[] = order.map((f, i) => {
    const boss = i === FLOORS - 1;
    const rival = pick(RIVALS[f]);
    return {
      faction: f,
      name: boss ? `${rival.name}, Champion` : rival.name,
      taunt: rival.taunt,
      difficulty: DIFFICULTY[i],
      life: boss ? 25 : 20,
      boss,
      // Later opponents get a few extra strong cards.
      extra: i >= 2 ? shuffle(COLLECTIBLE.filter(c => c.cost >= 3 && (c.faction === f || c.faction === 'Neutral')).map(c => c.id)).slice(0, i - 1) : [],
    };
  });
  return { faction, deck: [...DECKS[faction].cards], floor: 0, opponents };
}

/** Three distinct card offers, mostly from your faction. */
export function rollRewards(run: RunState): string[] {
  const offers = new Set<string>();
  let guard = 0;
  while (offers.size < 3 && guard++ < 100) {
    const r = Math.random();
    const pool: CardDef[] = COLLECTIBLE.filter(c =>
      r < 0.5 ? c.faction === run.faction : r < 0.8 ? c.faction === 'Neutral' : c.faction !== run.faction && c.faction !== 'Neutral');
    // Later floors lean towards stronger cards.
    const weighted = pool.filter(c => c.cost >= Math.min(3, run.floor));
    const c = pick(weighted.length ? weighted : pool);
    if (c) offers.add(c.id);
  }
  return [...offers];
}

export function saveRun(run: RunState | null) {
  try {
    if (run) localStorage.setItem(KEY, JSON.stringify(run));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

export function loadRun(): RunState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RunState) : null;
  } catch {
    return null;
  }
}

export interface Best {
  floors: number;
  crowns: number;
}

export function loadBest(): Best {
  try {
    return { floors: 0, crowns: 0, ...JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}') };
  } catch {
    return { floors: 0, crowns: 0 };
  }
}

export function recordBest(floorsCleared: number, champion: boolean) {
  const b = loadBest();
  b.floors = Math.max(b.floors, floorsCleared);
  if (champion) b.crowns++;
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(b));
  } catch {
    /* storage unavailable */
  }
}
