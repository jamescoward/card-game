import { describe, it, expect } from 'vitest';
import { Game, RULES } from './Game';
import { chooseAction, counterAttack } from './ai';
import { DECKS, DECK_IDS } from '../data/decks';
import { COLLECTIBLE, card } from '../data/cards';
import { TERRAINS } from '../data/terrains';
import { Keyword, PlayerIndex } from '../model/types';

const FILLER = Array.from({ length: 20 }, () => 'goblin');

/** A game where player 0 is active with plenty of ink and a chosen hand. */
function setup(opts: { hand?: string[]; foeHand?: string[]; terrains?: string[]; ink?: number } = {}) {
  const g = Game.create({
    decks: [FILLER, FILLER],
    terrains: opts.terrains ?? ['library', 'oasis', 'crypt'],
    seed: 1,
    firstPlayer: 0,
  });
  g.player(0).hand = [...(opts.hand ?? [])];
  g.player(1).hand = [...(opts.foeHand ?? [])];
  g.player(0).ink = opts.ink ?? 10;
  g.player(1).ink = 10;
  return g;
}

/** Put a unit straight onto the board for player p. */
function place(g: Game, p: PlayerIndex, cardId: string, lane: number) {
  const u = g.summon(p, cardId, lane);
  u.exhausted = false;
  return u;
}

/** Plain terrains with no combat effects. */
const PLAIN = ['library', 'library', 'library'];

describe('setup', () => {
  it('deals opening hands, with an extra card for the second player', () => {
    const g = Game.create({ decks: [DECKS.Ember.cards, DECKS.Tide.cards], seed: 3, firstPlayer: 0 });
    expect(g.player(0).hand).toHaveLength(RULES.openingHand);
    expect(g.player(1).hand).toHaveLength(RULES.openingHand + RULES.secondPlayerExtraCards);
    expect(g.player(0).life).toBe(RULES.startingLife);
  });

  it('first player does not draw on round 1, second player does', () => {
    const g = Game.create({ decks: [FILLER, FILLER], seed: 3, firstPlayer: 0 });
    expect(g.player(0).hand).toHaveLength(RULES.openingHand);
    g.endTurn();
    expect(g.player(1).hand).toHaveLength(RULES.openingHand + RULES.secondPlayerExtraCards + 1);
    g.endTurn();
    expect(g.state.round).toBe(2);
    expect(g.player(0).hand).toHaveLength(RULES.openingHand + 1);
  });

  it('deals three distinct terrains', () => {
    const g = Game.create({ decks: [FILLER, FILLER], seed: 9 });
    expect(new Set(g.state.terrains).size).toBe(3);
    for (const t of g.state.terrains) expect(TERRAINS.some(x => x.id === t)).toBe(true);
  });

  it('every deck is 20 valid cards', () => {
    for (const id of DECK_IDS) {
      expect(DECKS[id].cards).toHaveLength(20);
      for (const c of DECKS[id].cards) expect(card(c).token).toBeFalsy();
    }
  });

  it('every card with a target is a spell and every spell has cast()', () => {
    for (const c of COLLECTIBLE) {
      if (c.type === 'spell') expect(c.cast).toBeDefined();
      else expect(c.power + c.life).toBeGreaterThan(0);
    }
  });
});

describe('ink', () => {
  it('sacrifices a card for one permanent ink, once per turn', () => {
    const g = setup({ hand: ['goblin', 'goblin'], ink: 0 });
    expect(g.ink(0)).toBe(true);
    expect(g.player(0).ink).toBe(1);
    expect(g.player(0).hand).toHaveLength(1);
    expect(g.ink(0)).toBe(false);
  });

  it('cannot ink uninkable cards', () => {
    const g = setup({ hand: ['dragon'] });
    expect(g.canInk(0)).toBe(false);
  });

  it('Ink effects fire (Merchant gives 2 ink, Sea Sprite draws)', () => {
    const g = setup({ hand: ['merchant'], ink: 0 });
    g.ink(0);
    expect(g.availableInk()).toBe(2);
    const h = setup({ hand: ['sprite'], ink: 0 });
    h.ink(0);
    expect(h.player(0).hand).toHaveLength(1);
  });

  it('ink resets each turn', () => {
    const g = setup({ hand: ['goblin'], ink: 3 });
    g.play(0, 0);
    expect(g.availableInk()).toBe(2);
    g.endTurn();
    g.endTurn();
    expect(g.availableInk()).toBe(3);
    expect(g.player(0).hasInked).toBe(false);
  });
});

describe('playing cards', () => {
  it('plays a creature into a lane and spends ink', () => {
    const g = setup({ hand: ['ogre'], ink: 3 });
    expect(g.play(0, 1)).toBe(true);
    expect(g.player(0).lanes[1]?.cardId).toBe('ogre');
    expect(g.availableInk()).toBe(0);
  });

  it('rejects unaffordable cards', () => {
    const g = setup({ hand: ['ogre'], ink: 2 });
    expect(g.play(0, 1)).toBe(false);
  });

  it('Narrow Pass blocks expensive creatures', () => {
    const g = setup({ hand: ['dragon', 'ogre'], terrains: ['pass', 'library', 'library'] });
    expect(g.canPlayInLane(0, 0)).toBe(false);
    expect(g.canPlayInLane(1, 0)).toBe(true);
  });

  it('overwriting a friendly creature destroys it and fires its death trigger', () => {
    const g = setup({ hand: ['ogre'], terrains: PLAIN });
    place(g, 0, 'skeleton', 0);
    g.play(0, 0);
    expect(g.player(0).lanes[0]?.cardId).toBe('ogre');
    expect(g.player(0).discard).toContain('skeleton');
    expect(g.player(0).hand).toContain('spirit');
  });

  it('Ghoul devours: bigger when it replaces a creature', () => {
    const g = setup({ hand: ['ghoul', 'ghoul'], terrains: PLAIN });
    g.play(0, 0);
    expect(g.powerOf(g.player(0).lanes[0]!)).toBe(2);
    g.play(0, 0);
    expect(g.powerOf(g.player(0).lanes[0]!)).toBe(4);
  });

  it('spells need a valid target', () => {
    const g = setup({ hand: ['spark'], terrains: PLAIN });
    expect(g.canPlay(0)).toBe(false);
    place(g, 1, 'ogre', 2);
    expect(g.canPlay(0, undefined, { player: 1, lane: 2 })).toBe(true);
    g.play(0, undefined, { player: 1, lane: 2 });
    expect(g.player(1).lanes[2]!.damage).toBe(2);
  });

  it('friendly-only spells reject enemy targets', () => {
    const g = setup({ hand: ['feast'], terrains: PLAIN });
    place(g, 1, 'ogre', 0);
    expect(g.canPlay(0, undefined, { player: 1, lane: 0 })).toBe(false);
  });

  it('Raider damages the opposing creature on play', () => {
    const g = setup({ hand: ['raider'], terrains: PLAIN });
    place(g, 1, 'goblin', 1);
    g.play(0, 1);
    expect(g.player(1).lanes[1]).toBeNull();
  });

  it('Tidewalker bounces the opposing creature', () => {
    const g = setup({ hand: ['tidewalker'], terrains: PLAIN });
    place(g, 1, 'ogre', 0);
    g.play(0, 0);
    expect(g.player(1).lanes[0]).toBeNull();
    expect(g.player(1).hand).toContain('ogre');
  });

  it('Lich King destroys the opposing creature', () => {
    const g = setup({ hand: ['lich'], terrains: PLAIN });
    place(g, 1, 'dragon', 2);
    g.play(0, 2);
    expect(g.player(1).lanes[2]).toBeNull();
  });
});

describe('combat', () => {
  it('unblocked creatures hit the enemy hero', () => {
    const g = setup({ terrains: PLAIN });
    place(g, 0, 'ogre', 0);
    g.endTurn();
    expect(g.player(1).life).toBe(RULES.startingLife - 4);
  });

  it('blocked creatures trade damage and dead creatures are removed', () => {
    const g = setup({ terrains: PLAIN });
    place(g, 0, 'ogre', 0); // 4/3
    place(g, 1, 'knight', 0); // 3/3 Shield
    g.endTurn();
    expect(g.player(1).lanes[0]?.shield).toBe(false); // shield popped, no damage
    expect(g.player(1).lanes[0]?.damage).toBe(0);
    expect(g.player(0).lanes[0]).toBeNull(); // knight strikes back for 3
    expect(g.player(0).discard).toContain('ogre');
    expect(g.player(1).life).toBe(RULES.startingLife);
  });

  it('defenders do not attack on the opponent\'s turn', () => {
    const g = setup({ terrains: PLAIN });
    place(g, 1, 'ogre', 0);
    g.endTurn();
    expect(g.player(0).life).toBe(RULES.startingLife);
  });

  it('Flying goes over ground blockers but not over other flyers', () => {
    const g = setup({ terrains: PLAIN });
    place(g, 0, 'storm_eagle', 0);
    place(g, 1, 'ogre', 0);
    place(g, 0, 'storm_eagle', 1);
    place(g, 1, 'sprite', 1);
    g.endTurn();
    expect(g.player(1).life).toBe(RULES.startingLife - 3);
    expect(g.player(1).lanes[0]?.damage).toBe(0);
    expect(g.player(1).lanes[1]).toBeNull();
  });

  it('Trample sends excess damage to the hero', () => {
    const g = setup({ terrains: PLAIN });
    place(g, 0, 'giant', 0); // 6/6
    place(g, 1, 'goblin', 0); // 2/1
    g.endTurn();
    expect(g.player(1).life).toBe(RULES.startingLife - 5);
  });

  it('Deadly destroys whatever it damages', () => {
    const g = setup({ terrains: PLAIN });
    place(g, 0, 'rat', 0);
    place(g, 1, 'dragon', 0);
    g.endTurn();
    expect(g.player(1).lanes[0]).toBeNull();
  });

  it('Tough reduces each hit by 1', () => {
    const g = setup({ terrains: PLAIN });
    place(g, 0, 'ogre', 0);
    place(g, 1, 'sentinel', 0); // 0/4 Tough
    g.endTurn();
    expect(g.player(1).lanes[0]?.damage).toBe(3);
  });

  it('Lifesteal heals its owner', () => {
    const g = setup({ terrains: PLAIN });
    g.player(0).life = 10;
    place(g, 0, 'bat', 0);
    g.endTurn();
    expect(g.player(0).life).toBe(12);
  });

  it('Slow creatures cannot attack the turn they are played', () => {
    const g = setup({ hand: ['giant'], terrains: PLAIN });
    g.play(0, 0);
    g.endTurn();
    expect(g.player(1).life).toBe(RULES.startingLife);
  });

  it('frozen creatures skip their next attack', () => {
    const g = setup({ hand: ['frost_bolt'], terrains: PLAIN });
    const ogre = place(g, 1, 'ogre', 0);
    g.play(0, undefined, { player: 1, lane: 0 });
    expect(ogre.frozen).toBe(true);
    g.endTurn(); // player 1's turn: ogre stays exhausted
    expect(ogre.exhausted).toBe(true);
    g.endTurn();
    expect(g.player(0).life).toBe(RULES.startingLife);
    g.endTurn(); // player 1's next turn: ogre attacks again
    g.endTurn();
    expect(g.player(0).life).toBe(RULES.startingLife - 4);
  });

  it('Wild Boar grows after surviving a fight', () => {
    const g = setup({ terrains: PLAIN });
    const boar = place(g, 0, 'boar', 0); // 2/3
    place(g, 1, 'skeleton', 0); // 1/2
    g.endTurn();
    expect(boar.power).toBe(3);
  });

  it('War Chief and Banner Bearer auras boost allies', () => {
    const g = setup({ terrains: PLAIN });
    const a = place(g, 0, 'goblin', 0);
    place(g, 0, 'banner', 1);
    const c = place(g, 0, 'goblin', 2);
    expect(g.powerOf(a)).toBe(3);
    expect(g.powerOf(c)).toBe(3);
    place(g, 0, 'warchief', 1);
    expect(g.powerOf(a)).toBe(3);
  });
});

describe('terrains', () => {
  it('War Shrine adds power', () => {
    const g = setup({ terrains: ['shrine', 'library', 'library'] });
    const u = place(g, 0, 'goblin', 0);
    expect(g.powerOf(u)).toBe(3);
  });

  it('Windy Pass attacks ignore blockers', () => {
    const g = setup({ terrains: ['windy', 'library', 'library'] });
    place(g, 0, 'goblin', 0);
    place(g, 1, 'sentinel', 0);
    g.endTurn();
    expect(g.player(1).life).toBe(RULES.startingLife - 2);
  });

  it('Arena doubles hero damage', () => {
    const g = setup({ terrains: ['arena', 'library', 'library'] });
    place(g, 0, 'goblin', 0);
    g.endTurn();
    expect(g.player(1).life).toBe(RULES.startingLife - 4);
  });

  it('Volcano burns both creatures at end of turn', () => {
    const g = setup({ terrains: ['volcano', 'library', 'library'] });
    place(g, 0, 'sentinel', 0);
    place(g, 1, 'skeleton', 0);
    g.endTurn();
    expect(g.player(1).lanes[0]?.damage).toBe(1);
  });

  it('Forge buffs creatures played there', () => {
    const g = setup({ hand: ['goblin'], terrains: ['forge', 'library', 'library'] });
    g.play(0, 0);
    expect(g.player(0).lanes[0]?.power).toBe(3);
    expect(g.player(0).lanes[0]?.maxLife).toBe(2);
  });

  it('King\'s Hill pings when you hold it alone', () => {
    const g = setup({ terrains: ['throne', 'library', 'library'] });
    place(g, 0, 'sentinel', 0);
    g.endTurn();
    expect(g.player(1).life).toBe(RULES.startingLife - 2);
  });

  it('Crystal Mine gives bonus ink at start of turn', () => {
    const g = setup({ terrains: ['mine', 'library', 'library'], ink: 2 });
    place(g, 0, 'sentinel', 0);
    g.endTurn();
    g.endTurn();
    expect(g.availableInk()).toBe(3);
  });

  it('Haunted Crypt gives a Spirit when a creature dies there', () => {
    const g = setup({ terrains: ['crypt', 'library', 'library'] });
    place(g, 0, 'ogre', 0);
    place(g, 1, 'goblin', 0);
    g.endTurn();
    expect(g.player(1).hand).toContain('spirit');
  });
});

describe('winning', () => {
  it('reducing the enemy to 0 ends the game', () => {
    const g = setup({ terrains: PLAIN });
    g.player(1).life = 3;
    place(g, 0, 'ogre', 0);
    g.endTurn();
    expect(g.over).toBe(true);
    expect(g.state.winner).toBe(0);
    expect(g.endTurn()).toBe(false);
  });

  it('the Storm hits both players from the storm round', () => {
    const g = setup({ terrains: PLAIN });
    g.state.round = RULES.stormRound;
    g.endTurn();
    expect(g.player(1).life).toBe(RULES.startingLife - 1);
  });

  it('burn spells can finish the game', () => {
    const g = setup({ hand: ['fireblast'], terrains: PLAIN });
    g.player(1).life = 3;
    g.play(0);
    expect(g.state.winner).toBe(0);
  });
});

describe('engine plumbing', () => {
  it('clones are independent', () => {
    const g = setup({ hand: ['ogre'], terrains: PLAIN });
    const c = g.clone();
    c.play(0, 0);
    expect(g.player(0).lanes[0]).toBeNull();
    expect(g.player(0).hand).toEqual(['ogre']);
  });

  it('emits events the UI can animate', () => {
    const g = setup({ terrains: PLAIN });
    place(g, 0, 'ogre', 0);
    g.events.length = 0;
    g.endTurn();
    const kinds = g.events.map(e => e.t);
    expect(kinds).toContain('attack');
    expect(kinds).toContain('hero');
    expect(kinds).toContain('turnStart');
  });

  it('every legal action is accepted', () => {
    const g = Game.create({ decks: [DECKS.Bone.cards, DECKS.Wild.cards], seed: 11 });
    for (let i = 0; i < 40 && !g.over; i++) {
      const actions = g.legalActions();
      const a = actions[i % actions.length];
      expect(g.apply(a)).toBe(true);
    }
  });
});

describe('AI', () => {
  it('plays full games to completion for every matchup', () => {
    for (const a of DECK_IDS) {
      for (const b of DECK_IDS) {
        const g = Game.create({ decks: [DECKS[a].cards, DECKS[b].cards], seed: a.length * 31 + b.length });
        let steps = 0;
        while (!g.over && steps++ < 1000) {
          const action = chooseAction(g, 'normal');
          expect(g.apply(action)).toBe(true);
        }
        expect(g.over).toBe(true);
      }
    }
  });

  it('takes lethal when it is on the board', () => {
    const g = setup({ hand: ['fireblast'], terrains: PLAIN });
    g.player(1).life = 3;
    const a = chooseAction(g, 'normal');
    expect(a.type).toBe('play');
  });

  it('plays a creature into an empty board rather than passing', () => {
    const g = setup({ hand: ['ogre'], terrains: PLAIN, ink: 3 });
    expect(chooseAction(g, 'normal').type).toBe('play');
  });

  it('counterAttack predicts the enemy swing without touching the real game', () => {
    const g = setup({ terrains: PLAIN });
    place(g, 1, 'ogre', 0);
    const c = counterAttack(g);
    expect(c.player(0).life).toBe(RULES.startingLife - 4);
    expect(g.player(0).life).toBe(RULES.startingLife);
    expect(g.active).toBe(0);
  });

  it('uses Keyword enums consistently', () => {
    expect(card('storm_eagle').keywords).toContain(Keyword.Flying);
  });
});
