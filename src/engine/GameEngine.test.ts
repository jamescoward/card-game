import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from './GameEngine';
import { Card, Phase, Keyword, InkingMode, CombatMode } from '../model/types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    name: 'Goblin',
    cost: 1,
    power: 1,
    life: 1,
    keywords: [],
    inkable: true,
    inkValue: 1,
    ...overrides,
  };
}

function makeDeck(count = 20, overrides: Partial<Card> = {}): Card[] {
  return Array.from({ length: count }, () => makeCard(overrides));
}

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine(makeDeck(), makeDeck());
    engine.startGame();
  });

  describe('startGame', () => {
    it('deals 5 cards to each player', () => {
      expect(engine.state.players[0].hand).toHaveLength(5);
      expect(engine.state.players[1].hand).toHaveLength(5);
    });

    it('leaves 15 cards in each deck', () => {
      expect(engine.state.players[0].deck).toHaveLength(15);
      expect(engine.state.players[1].deck).toHaveLength(15);
    });

    it('starts on draw phase for player 1', () => {
      expect(engine.state.currentPhase).toBe(Phase.Draw);
      expect(engine.state.activePlayerIndex).toBe(0);
    });
  });

  describe('drawCard', () => {
    it('draws a card and moves to ink phase', () => {
      engine.drawCard();
      expect(engine.state.players[0].hand).toHaveLength(6);
      expect(engine.state.players[0].deck).toHaveLength(14);
      expect(engine.state.currentPhase).toBe(Phase.Ink);
    });

    it('handles empty deck gracefully', () => {
      engine.state.players[0].deck = [];
      engine.drawCard();
      expect(engine.state.players[0].hand).toHaveLength(5);
      expect(engine.state.currentPhase).toBe(Phase.Ink);
    });

    it('rejects draw in wrong phase', () => {
      engine.state.currentPhase = Phase.Play;
      expect(engine.drawCard()).toBe(false);
    });
  });

  describe('inkCard — persistent mode', () => {
    beforeEach(() => {
      engine.drawCard(); // Move to Ink phase
    });

    it('inks a card and increases ink pool', () => {
      expect(engine.inkCard(0)).toBe(true);
      expect(engine.state.players[0].inkPool).toBe(1);
      expect(engine.state.players[0].hand).toHaveLength(5);
    });

    it('enforces one-per-turn limit in persistent mode', () => {
      engine.inkCard(0);
      expect(engine.inkCard(0)).toBe(false);
    });

    it('rejects non-inkable cards', () => {
      engine.state.players[0].hand[0] = makeCard({ inkable: false });
      expect(engine.inkCard(0)).toBe(false);
    });

    it('rejects invalid index', () => {
      expect(engine.inkCard(-1)).toBe(false);
      expect(engine.inkCard(99)).toBe(false);
    });
  });

  describe('inkCard — expendable mode', () => {
    beforeEach(() => {
      engine = new GameEngine(makeDeck(), makeDeck(), InkingMode.Expendable);
      engine.startGame();
      engine.drawCard();
    });

    it('inks a card for temporary ink', () => {
      expect(engine.inkCard(0)).toBe(true);
      expect(engine.state.players[0].temporaryInk).toBe(1);
    });

    it('allows multiple inks per turn', () => {
      engine.inkCard(0);
      engine.inkCard(0);
      expect(engine.state.players[0].temporaryInk).toBe(2);
    });
  });

  describe('Rich keyword', () => {
    it('inks for 2 in persistent mode', () => {
      engine.state.players[0].hand[0] = makeCard({ keywords: [Keyword.Rich] });
      engine.drawCard();
      engine.inkCard(0);
      expect(engine.state.players[0].inkPool).toBe(2);
    });

    it('inks for 2 in expendable mode', () => {
      engine = new GameEngine(makeDeck(), makeDeck(), InkingMode.Expendable);
      engine.startGame();
      engine.state.players[0].hand[0] = makeCard({ keywords: [Keyword.Rich] });
      engine.drawCard();
      engine.inkCard(0);
      expect(engine.state.players[0].temporaryInk).toBe(2);
    });
  });

  describe('playCard', () => {
    beforeEach(() => {
      engine.drawCard();
      engine.inkCard(0); // Ink a card to get 1 ink
      engine.doneInking();
    });

    it('plays a card into an empty lane', () => {
      const handSize = engine.state.players[0].hand.length;
      expect(engine.playCard(0, 0)).toBe(true);
      expect(engine.state.players[0].hand).toHaveLength(handSize - 1);
      expect(engine.state.players[0].lanes[0]).not.toBeNull();
    });

    it('rejects play into occupied lane', () => {
      engine.playCard(0, 0);
      // Need more ink to play another
      engine.state.players[0].inkUsed = 0;
      expect(engine.playCard(0, 0)).toBe(false);
    });

    it('rejects play when not enough ink', () => {
      engine.state.players[0].hand[0] = makeCard({ cost: 5 });
      expect(engine.playCard(0, 0)).toBe(false);
    });

    it('rejects play in wrong phase', () => {
      engine.state.currentPhase = Phase.Draw;
      expect(engine.playCard(0, 0)).toBe(false);
    });

    it('deducts ink correctly in persistent mode', () => {
      engine.playCard(0, 0);
      expect(engine.state.players[0].inkUsed).toBe(1);
    });

    it('applies Slow keyword', () => {
      engine.state.players[0].hand[0] = makeCard({ keywords: [Keyword.Slow] });
      engine.playCard(0, 0);
      expect(engine.state.players[0].lanes[0]!.exhausted).toBe(true);
    });
  });

  describe('combat — mutual damage', () => {
    beforeEach(() => {
      engine.drawCard();
      engine.inkCard(0);
      engine.doneInking();
    });

    it('creature hits face when lane is empty', () => {
      engine.state.players[0].lanes[0] = {
        card: makeCard({ power: 2, life: 3 }),
        damage: 0,
        exhausted: false,
      };
      engine.endPlayPhase();
      engine.resolveCombat();
      expect(engine.state.players[1].life).toBe(10);
    });

    it('creatures trade damage in mutual mode', () => {
      engine.state.players[0].lanes[0] = {
        card: makeCard({ power: 2, life: 3 }),
        damage: 0,
        exhausted: false,
      };
      engine.state.players[1].lanes[0] = {
        card: makeCard({ power: 1, life: 3 }),
        damage: 0,
        exhausted: false,
      };
      engine.endPlayPhase();
      engine.resolveCombat();
      expect(engine.state.players[0].lanes[0]!.damage).toBe(1);
      expect(engine.state.players[1].lanes[0]!.damage).toBe(2);
    });

    it('removes dead creatures', () => {
      engine.state.players[0].lanes[0] = {
        card: makeCard({ power: 3, life: 2 }),
        damage: 0,
        exhausted: false,
      };
      engine.state.players[1].lanes[0] = {
        card: makeCard({ power: 3, life: 2 }),
        damage: 0,
        exhausted: false,
      };
      engine.endPlayPhase();
      engine.resolveCombat();
      expect(engine.state.players[0].lanes[0]).toBeNull();
      expect(engine.state.players[1].lanes[0]).toBeNull();
    });

    it('exhausted creatures do not attack', () => {
      engine.state.players[0].lanes[0] = {
        card: makeCard({ power: 5, life: 5 }),
        damage: 0,
        exhausted: true,
      };
      engine.endPlayPhase();
      engine.resolveCombat();
      expect(engine.state.players[1].life).toBe(12);
    });

    it('defending creature does not hit attacker face when attacker lane is empty', () => {
      // Defender has a creature in lane 1, attacker has nothing there
      engine.state.players[1].lanes[1] = {
        card: makeCard({ power: 3, life: 3 }),
        damage: 0,
        exhausted: false,
      };
      engine.endPlayPhase();
      engine.resolveCombat();
      // Attacker's life should be unchanged — defenders only counter-attack, never hit face
      expect(engine.state.players[0].life).toBe(12);
    });
  });

  describe('combat — attacker-only mode', () => {
    beforeEach(() => {
      engine = new GameEngine(makeDeck(), makeDeck(), InkingMode.Persistent, CombatMode.AttackerOnly);
      engine.startGame();
      engine.drawCard();
      engine.inkCard(0);
      engine.doneInking();
    });

    it('only attacker deals damage to defender creature', () => {
      engine.state.players[0].lanes[0] = {
        card: makeCard({ power: 2, life: 3 }),
        damage: 0,
        exhausted: false,
      };
      engine.state.players[1].lanes[0] = {
        card: makeCard({ power: 5, life: 3 }),
        damage: 0,
        exhausted: false,
      };
      engine.endPlayPhase();
      engine.resolveCombat();
      // Attacker's creature takes no damage
      expect(engine.state.players[0].lanes[0]!.damage).toBe(0);
      // Defender's creature takes attacker's power
      expect(engine.state.players[1].lanes[0]!.damage).toBe(2);
    });

    it('attacker hits face in empty lane', () => {
      engine.state.players[0].lanes[0] = {
        card: makeCard({ power: 3, life: 3 }),
        damage: 0,
        exhausted: false,
      };
      engine.endPlayPhase();
      engine.resolveCombat();
      expect(engine.state.players[1].life).toBe(9);
    });
  });

  describe('win conditions', () => {
    it('player 2 wins when player 1 life reaches 0', () => {
      engine.state.players[0].life = 0;
      expect(engine.checkGameOver()).toBe(1);
    });

    it('player 1 wins when player 2 life reaches 0', () => {
      engine.state.players[1].life = 0;
      expect(engine.checkGameOver()).toBe(0);
    });

    it('active player loses when both at 0', () => {
      engine.state.players[0].life = 0;
      engine.state.players[1].life = 0;
      engine.state.activePlayerIndex = 0;
      expect(engine.checkGameOver()).toBe(1);
    });

    it('turn limit: higher life wins', () => {
      engine.state.currentTurn = 7;
      engine.state.players[0].life = 10;
      engine.state.players[1].life = 8;
      expect(engine.checkGameOver()).toBe(0);
    });
  });

  describe('Cleave keyword', () => {
    beforeEach(() => {
      engine.drawCard();
      engine.state.players[0].inkPool = 5;
      engine.doneInking();
    });

    it('destroys the opposing creature in the same lane on play', () => {
      engine.state.players[1].lanes[0] = { card: makeCard({ name: 'Target' }), damage: 0, exhausted: false };
      engine.state.players[0].hand[0] = makeCard({ keywords: [Keyword.Cleave], cost: 1 });
      engine.playCard(0, 0);
      expect(engine.state.players[1].lanes[0]).toBeNull();
      expect(engine.state.players[1].discard).toHaveLength(1);
    });

    it('does nothing when opposing lane is empty (no-op)', () => {
      engine.state.players[0].hand[0] = makeCard({ keywords: [Keyword.Cleave], cost: 1 });
      engine.playCard(0, 0);
      expect(engine.state.players[0].lanes[0]).not.toBeNull();
      // No errors, no crash
    });

    it('does not affect other lanes', () => {
      engine.state.players[1].lanes[1] = { card: makeCard({ name: 'Safe' }), damage: 0, exhausted: false };
      engine.state.players[0].hand[0] = makeCard({ keywords: [Keyword.Cleave], cost: 1 });
      engine.playCard(0, 0); // plays into lane 0
      expect(engine.state.players[1].lanes[1]).not.toBeNull();
    });
  });

  describe('Tide keyword', () => {
    beforeEach(() => {
      engine.drawCard();
      engine.state.players[0].inkPool = 5;
      engine.doneInking();
    });

    it('sets pendingTide when creatures exist on board', () => {
      engine.state.players[1].lanes[0] = { card: makeCard({ name: 'Target' }), damage: 0, exhausted: false };
      engine.state.players[0].hand[0] = makeCard({ keywords: [Keyword.Tide], cost: 1 });
      engine.playCard(0, 0);
      expect(engine.state.pendingTide).toBe(true);
    });

    it('does not set pendingTide when no creatures on board', () => {
      engine.state.players[0].hand[0] = makeCard({ keywords: [Keyword.Tide], cost: 1 });
      engine.playCard(0, 0);
      expect(engine.state.pendingTide).toBe(false);
    });

    it('resolveTide bounces an opponent creature to their hand', () => {
      const target = makeCard({ name: 'Bounced' });
      engine.state.players[1].lanes[0] = { card: target, damage: 0, exhausted: false };
      engine.state.players[0].hand[0] = makeCard({ keywords: [Keyword.Tide], cost: 1 });
      engine.playCard(0, 0);
      const handBefore = engine.state.players[1].hand.length;
      engine.resolveTide(1, 0);
      expect(engine.state.players[1].lanes[0]).toBeNull();
      expect(engine.state.players[1].hand).toHaveLength(handBefore + 1);
      expect(engine.state.pendingTide).toBe(false);
    });

    it('resolveTide bounces own creature to hand', () => {
      engine.state.players[0].lanes[1] = { card: makeCard({ name: 'OwnCreature' }), damage: 0, exhausted: false };
      engine.state.players[0].hand[0] = makeCard({ keywords: [Keyword.Tide], cost: 1 });
      engine.playCard(0, 0); // plays into lane 0; pendingTide? only if creatures exist
      expect(engine.state.pendingTide).toBe(true);
      const handBefore = engine.state.players[0].hand.length;
      engine.resolveTide(0, 1);
      expect(engine.state.players[0].lanes[1]).toBeNull();
      expect(engine.state.players[0].hand).toHaveLength(handBefore + 1);
    });

    it('resolveTide returns false when targeting empty lane', () => {
      engine.state.players[1].lanes[0] = { card: makeCard(), damage: 0, exhausted: false };
      engine.state.players[0].hand[0] = makeCard({ keywords: [Keyword.Tide], cost: 1 });
      engine.playCard(0, 0);
      expect(engine.resolveTide(1, 2)).toBe(false); // lane 2 is empty
      expect(engine.state.pendingTide).toBe(true); // still pending
    });

    it('blocks card play while pendingTide is true', () => {
      engine.state.players[1].lanes[0] = { card: makeCard(), damage: 0, exhausted: false };
      engine.state.players[0].hand[0] = makeCard({ keywords: [Keyword.Tide], cost: 1 });
      engine.playCard(0, 0);
      expect(engine.state.pendingTide).toBe(true);
      // Cannot play another card while Tide is pending
      expect(engine.playCard(0, 1)).toBe(false);
    });
  });

  describe('Evasion keyword', () => {
    beforeEach(() => {
      engine.drawCard();
      engine.doneInking();
      engine.endPlayPhase();
    });

    it('always deals damage to face even when blocker present', () => {
      engine.state.players[0].lanes[0] = {
        card: makeCard({ power: 2, life: 3, keywords: [Keyword.Evasion] }),
        damage: 0,
        exhausted: false,
      };
      engine.state.players[1].lanes[0] = {
        card: makeCard({ power: 5, life: 5 }),
        damage: 0,
        exhausted: false,
      };
      engine.resolveCombat();
      expect(engine.state.players[1].life).toBe(10); // 12 - 2
      expect(engine.state.players[0].lanes[0]!.damage).toBe(0); // Evasion: takes no damage
    });

    it('evasion creature takes no damage from opposing creature', () => {
      engine.state.players[0].lanes[0] = {
        card: makeCard({ power: 1, life: 5, keywords: [Keyword.Evasion] }),
        damage: 0,
        exhausted: false,
      };
      engine.state.players[1].lanes[0] = {
        card: makeCard({ power: 10, life: 5 }),
        damage: 0,
        exhausted: false,
      };
      engine.resolveCombat();
      expect(engine.state.players[0].lanes[0]!.damage).toBe(0);
    });
  });

  describe('Tough keyword', () => {
    beforeEach(() => {
      engine.drawCard();
      engine.doneInking();
      engine.endPlayPhase();
    });

    it('ignores damage from lower-power attackers', () => {
      engine.state.players[0].lanes[0] = {
        card: makeCard({ power: 1, life: 3 }),
        damage: 0,
        exhausted: false,
      };
      engine.state.players[1].lanes[0] = {
        card: makeCard({ power: 3, life: 3, keywords: [Keyword.Tough] }),
        damage: 0,
        exhausted: false,
      };
      engine.resolveCombat();
      expect(engine.state.players[1].lanes[0]!.damage).toBe(0); // Tough blocks 1 power
    });

    it('takes full damage from equal or higher power', () => {
      engine.state.players[0].lanes[0] = {
        card: makeCard({ power: 3, life: 5 }),
        damage: 0,
        exhausted: false,
      };
      engine.state.players[1].lanes[0] = {
        card: makeCard({ power: 2, life: 5, keywords: [Keyword.Tough] }),
        damage: 0,
        exhausted: false,
      };
      engine.resolveCombat();
      expect(engine.state.players[1].lanes[0]!.damage).toBe(3); // equal-or-higher power hits
    });
  });

  describe('endTurn', () => {
    it('switches active player', () => {
      engine.drawCard();
      engine.skipInk();
      engine.endPlayPhase();
      engine.resolveCombat();
      engine.endTurn();
      expect(engine.state.activePlayerIndex).toBe(1);
      expect(engine.state.currentPhase).toBe(Phase.Draw);
    });

    it('increments turn after player 2', () => {
      // Player 1 turn
      engine.drawCard();
      engine.skipInk();
      engine.endPlayPhase();
      engine.resolveCombat();
      engine.endTurn();
      // Player 2 turn
      engine.drawCard();
      engine.skipInk();
      engine.endPlayPhase();
      engine.resolveCombat();
      engine.endTurn();
      expect(engine.state.currentTurn).toBe(2);
      expect(engine.state.activePlayerIndex).toBe(0);
    });

    it('clears exhausted on creatures at start of turn', () => {
      engine.state.players[1].lanes[0] = {
        card: makeCard(),
        damage: 0,
        exhausted: true,
      };
      engine.drawCard();
      engine.skipInk();
      engine.endPlayPhase();
      engine.resolveCombat();
      engine.endTurn();
      // Player 2's creatures should be unexhausted now
      expect(engine.state.players[1].lanes[0]!.exhausted).toBe(false);
    });

    it('resets ink state for next turn', () => {
      engine.drawCard();
      engine.inkCard(0);
      engine.doneInking();
      engine.endPlayPhase();
      engine.resolveCombat();
      engine.endTurn();
      expect(engine.state.players[0].hasInkedThisTurn).toBe(false);
      expect(engine.state.players[0].inkUsed).toBe(0);
    });
  });
});
