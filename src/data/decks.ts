import { Faction } from '../model/types';
import { card } from './cards';

export interface DeckInfo {
  id: Faction;
  name: string;
  art: string;
  color: string;
  blurb: string;
  cards: string[];
}

function list(entries: [string, number][]): string[] {
  const out: string[] = [];
  for (const [id, n] of entries) {
    card(id); // validate
    for (let i = 0; i < n; i++) out.push(id);
  }
  return out;
}

export const DECKS: Record<Exclude<Faction, 'Neutral'>, DeckInfo> = {
  Ember: {
    id: 'Ember', name: 'Ember Horde', art: '🔥', color: '#ff5a36',
    blurb: 'Aggro. Cheap hitters, burn and Trample. Win fast or burn out.',
    cards: list([
      ['goblin', 3], ['ember_imp', 3], ['raider', 2], ['bomber', 1], ['hellhound', 2],
      ['imp_caller', 2], ['phoenix', 2], ['inferno', 1], ['spark', 2],
      ['fireball', 1], ['fireblast', 1],
    ]),
  },
  Tide: {
    id: 'Tide', name: 'Tidecallers', art: '🌊', color: '#3aa0ff',
    blurb: 'Tempo. Flyers, bounce, freeze and card draw.',
    cards: list([
      ['sprite', 2], ['tidewalker', 2], ['turtle', 2], ['mirror_mage', 2], ['storm_eagle', 2],
      ['frost_giant', 2], ['siren', 1], ['kraken', 1], ['frost_bolt', 2], ['bubble', 1],
      ['insight', 1], ['riptide', 2],
    ]),
  },
  Wild: {
    id: 'Wild', name: 'Wildgrove', art: '🌿', color: '#4cc96b',
    blurb: 'Ramp. Creatures that grow, then giants that trample.',
    cards: list([
      ['sapling', 2], ['druid', 2], ['boar', 2], ['thornback', 2], ['bear', 2],
      ['treant', 2], ['rhino', 2], ['hydra', 1], ['giant', 1], ['feast', 2],
      ['wild_growth', 1], ['stampede', 1],
    ]),
  },
  Bone: {
    id: 'Bone', name: 'Bonecult', art: '💀', color: '#b06cff',
    blurb: 'Sacrifice. Death triggers, Lifesteal, Deadly and Devour.',
    cards: list([
      ['skeleton', 2], ['rat', 2], ['bat', 2], ['ghoul', 2], ['necromancer', 2],
      ['colossus', 2], ['wraith', 2], ['lich', 1], ['harvest', 1], ['drain', 2],
      ['raise_dead', 1], ['plague', 1],
    ]),
  },
};

export const FACTION_COLORS: Record<Faction, string> = {
  Ember: DECKS.Ember.color,
  Tide: DECKS.Tide.color,
  Wild: DECKS.Wild.color,
  Bone: DECKS.Bone.color,
  Neutral: '#c9b37e',
};

export const DECK_IDS = Object.keys(DECKS) as Exclude<Faction, 'Neutral'>[];
