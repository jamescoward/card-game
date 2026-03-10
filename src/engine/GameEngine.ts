import {
  Card,
  CreatureInstance,
  Player,
  GameState,
  Phase,
  Keyword,
  InkingMode,
  CombatMode,
  LogEntry,
} from '../model/types';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createPlayer(deck: Card[]): Player {
  return {
    life: 12,
    deck: shuffleArray(deck),
    hand: [],
    inkPool: 0,
    inkUsed: 0,
    temporaryInk: 0,
    hasInkedThisTurn: false,
    lanes: [null, null, null],
    discard: [],
  };
}

export class GameEngine {
  state: GameState;
  log: LogEntry[] = [];

  constructor(
    deck1: Card[],
    deck2: Card[],
    inkingMode: InkingMode = InkingMode.Persistent,
    combatMode: CombatMode = CombatMode.MutualDamage,
  ) {
    this.state = {
      players: [createPlayer(deck1), createPlayer(deck2)],
      currentTurn: 1,
      currentPhase: Phase.Draw,
      activePlayerIndex: 0,
      inkingMode: inkingMode,
      combatMode: combatMode,
      gameOver: false,
      winner: null,
      pendingTide: false,
    };
  }

  get activePlayer(): Player {
    return this.state.players[this.state.activePlayerIndex];
  }

  get inactivePlayer(): Player {
    return this.state.players[this.state.activePlayerIndex === 0 ? 1 : 0];
  }

  private addLog(message: string) {
    this.log.push({
      turn: this.state.currentTurn,
      player: this.state.activePlayerIndex + 1,
      phase: this.state.currentPhase,
      message,
    });
  }

  startGame() {
    // Draw opening hands of 5
    for (const player of this.state.players) {
      for (let i = 0; i < 5; i++) {
        const card = player.deck.pop();
        if (card) player.hand.push(card);
      }
    }
    this.state.currentPhase = Phase.Draw;
    this.addLog('Game started!');
  }

  drawCard(): boolean {
    if (this.state.currentPhase !== Phase.Draw) return false;
    const player = this.activePlayer;
    if (player.deck.length > 0) {
      const card = player.deck.pop()!;
      player.hand.push(card);
      this.addLog(`Drew ${card.name}`);
    } else {
      this.addLog('Deck empty — no card drawn');
    }
    this.state.currentPhase = Phase.Ink;
    return true;
  }

  inkCard(cardIndex: number): boolean {
    if (this.state.currentPhase !== Phase.Ink) return false;
    const player = this.activePlayer;
    if (cardIndex < 0 || cardIndex >= player.hand.length) return false;

    const card = player.hand[cardIndex];
    if (!card.inkable) return false;

    if (this.state.inkingMode === InkingMode.Persistent) {
      if (player.hasInkedThisTurn) return false;
      const inkGain = card.keywords.includes(Keyword.Rich) ? 2 : 1;
      player.inkPool += inkGain;
      player.hasInkedThisTurn = true;
      player.hand.splice(cardIndex, 1);
      player.discard.push(card);
      this.addLog(`Inked ${card.name} for ${inkGain} permanent ink (pool: ${player.inkPool})`);
    } else {
      // Expendable
      const inkGain = card.keywords.includes(Keyword.Rich) ? 2 : 1;
      player.temporaryInk += inkGain;
      player.hand.splice(cardIndex, 1);
      player.discard.push(card);
      this.addLog(`Inked ${card.name} for ${inkGain} temporary ink (available: ${player.temporaryInk})`);
    }

    return true;
  }

  skipInk() {
    if (this.state.currentPhase !== Phase.Ink) return false;
    this.state.currentPhase = Phase.Play;
    this.addLog('Skipped inking');
    return true;
  }

  doneInking() {
    if (this.state.currentPhase !== Phase.Ink) return false;
    this.state.currentPhase = Phase.Play;
    this.addLog('Done inking');
    return true;
  }

  getAvailableInk(): number {
    const player = this.activePlayer;
    if (this.state.inkingMode === InkingMode.Persistent) {
      return player.inkPool - player.inkUsed;
    }
    return player.temporaryInk;
  }

  playCard(cardIndex: number, lane: number): boolean {
    if (this.state.currentPhase !== Phase.Play) return false;
    if (this.state.pendingTide) return false;
    const player = this.activePlayer;
    if (cardIndex < 0 || cardIndex >= player.hand.length) return false;
    if (lane < 0 || lane > 2) return false;
    if (player.lanes[lane] !== null) return false;

    const card = player.hand[cardIndex];
    const available = this.getAvailableInk();
    if (card.cost > available) return false;

    // Deduct ink
    if (this.state.inkingMode === InkingMode.Persistent) {
      player.inkUsed += card.cost;
    } else {
      player.temporaryInk -= card.cost;
    }

    // Check for Tide targets before placing (Tide creature itself shouldn't count)
    const tideHasTargets = card.keywords.includes(Keyword.Tide) &&
      this.state.players.some(p => p.lanes.some(l => l !== null));

    // Remove from hand and place creature
    player.hand.splice(cardIndex, 1);
    const creature: CreatureInstance = {
      card,
      damage: 0,
      exhausted: card.keywords.includes(Keyword.Slow),
    };
    player.lanes[lane] = creature;

    this.addLog(`Played ${card.name} (${card.power}/${card.life}) into lane ${lane + 1}`);

    // On-play keywords
    if (card.keywords.includes(Keyword.Cleave)) {
      const opponent = this.inactivePlayer;
      if (opponent.lanes[lane] !== null) {
        const destroyed = opponent.lanes[lane]!;
        this.addLog(`Cleave! ${card.name} destroyed ${destroyed.card.name} in lane ${lane + 1}`);
        opponent.discard.push(destroyed.card);
        opponent.lanes[lane] = null;
      } else {
        this.addLog(`Cleave: no opposing creature in lane ${lane + 1}`);
      }
    }

    if (card.keywords.includes(Keyword.Tide)) {
      if (tideHasTargets) {
        this.state.pendingTide = true;
        this.addLog(`Tide! Select any creature to return to its owner's hand`);
      } else {
        this.addLog(`Tide: no creatures on board to bounce`);
      }
    }

    return true;
  }

  resolveTide(targetPlayerIndex: 0 | 1, lane: number): boolean {
    if (!this.state.pendingTide) return false;
    if (lane < 0 || lane > 2) return false;
    const target = this.state.players[targetPlayerIndex];
    const creature = target.lanes[lane];
    if (!creature) return false;

    target.lanes[lane] = null;
    target.hand.push(creature.card);
    this.addLog(`Tide returned ${creature.card.name} from lane ${lane + 1} to Player ${targetPlayerIndex + 1}'s hand`);
    this.state.pendingTide = false;
    return true;
  }

  endPlayPhase(): boolean {
    if (this.state.currentPhase !== Phase.Play) return false;
    this.state.currentPhase = Phase.Combat;
    return true;
  }

  resolveCombat(): boolean {
    if (this.state.currentPhase !== Phase.Combat) return false;

    const attacker = this.activePlayer;
    const defender = this.inactivePlayer;

    if (this.state.combatMode === CombatMode.MutualDamage) {
      this.resolveMutualCombat(attacker, defender);
    } else {
      this.resolveAttackerOnlyCombat(attacker, defender);
    }

    // Remove dead creatures
    this.removeDeadCreatures(attacker);
    this.removeDeadCreatures(defender);

    this.state.currentPhase = Phase.End;
    return true;
  }

  private resolveMutualCombat(attacker: Player, defender: Player) {
    for (let lane = 0; lane < 3; lane++) {
      const atkCreature = attacker.lanes[lane];
      const defCreature = defender.lanes[lane];

      if (!atkCreature || atkCreature.exhausted) continue;

      const hasEvasion = atkCreature.card.keywords.includes(Keyword.Evasion);

      if (hasEvasion) {
        // Evasion: always hits face, doesn't take damage from opposing creature
        defender.life -= atkCreature.card.power;
        this.addLog(`${atkCreature.card.name} (Evasion) in lane ${lane + 1} deals ${atkCreature.card.power} damage to opponent's life`);
      } else if (defCreature && !defCreature.exhausted) {
        // Both creatures fight — mutual damage is simultaneous
        // Apply damage from attacker to defender's creature
        const atkPower = atkCreature.card.power;
        const defPower = defCreature.card.power;

        // Tough check: takes no damage from lower power
        const defHasTough = defCreature.card.keywords.includes(Keyword.Tough);
        const atkHasTough = atkCreature.card.keywords.includes(Keyword.Tough);

        if (!defHasTough || atkPower >= defCreature.card.power) {
          defCreature.damage += atkPower;
        } else {
          this.addLog(`${defCreature.card.name} (Tough) ignores ${atkPower} damage from ${atkCreature.card.name}`);
        }

        if (!atkHasTough || defPower >= atkCreature.card.power) {
          atkCreature.damage += defPower;
        } else {
          this.addLog(`${atkCreature.card.name} (Tough) ignores ${defPower} damage from ${defCreature.card.name}`);
        }

        this.addLog(`Lane ${lane + 1}: ${atkCreature.card.name} and ${defCreature.card.name} trade blows`);
      } else if (defCreature && defCreature.exhausted) {
        // Defender is exhausted — in mutual mode, exhausted creatures don't participate
        // Attacker hits the exhausted creature but it doesn't fight back
        defCreature.damage += atkCreature.card.power;
        this.addLog(`Lane ${lane + 1}: ${atkCreature.card.name} attacks exhausted ${defCreature.card.name}`);
      } else {
        // Empty lane — hit face
        defender.life -= atkCreature.card.power;
        this.addLog(`${atkCreature.card.name} in lane ${lane + 1} deals ${atkCreature.card.power} damage to opponent's life`);
      }

      // Handle defender's non-exhausted creatures attacking back into attacker's lanes
      // (for the non-evasion attacker case, damage was already applied above)
    }

    // Also resolve defender's creatures attacking (mutual combat is simultaneous)
    for (let lane = 0; lane < 3; lane++) {
      const defCreature = defender.lanes[lane];
      const atkCreature = attacker.lanes[lane];

      if (!defCreature || defCreature.exhausted) continue;

      const hasEvasion = defCreature.card.keywords.includes(Keyword.Evasion);

      if (hasEvasion) {
        attacker.life -= defCreature.card.power;
        this.addLog(`${defCreature.card.name} (Evasion) in lane ${lane + 1} deals ${defCreature.card.power} damage to opponent's life`);
      }
      // If both creatures exist and no evasion, damage was already handled above
      // Defenders do NOT hit face when attacker's lane is empty — they only counter-attack
    }
  }

  private resolveAttackerOnlyCombat(attacker: Player, defender: Player) {
    for (let lane = 0; lane < 3; lane++) {
      const atkCreature = attacker.lanes[lane];
      const defCreature = defender.lanes[lane];

      if (!atkCreature || atkCreature.exhausted) continue;

      const hasEvasion = atkCreature.card.keywords.includes(Keyword.Evasion);

      if (hasEvasion) {
        defender.life -= atkCreature.card.power;
        this.addLog(`${atkCreature.card.name} (Evasion) in lane ${lane + 1} deals ${atkCreature.card.power} damage to opponent's life`);
      } else if (defCreature) {
        // Attacker-only: only attacker deals damage
        const atkPower = atkCreature.card.power;
        const defHasTough = defCreature.card.keywords.includes(Keyword.Tough);

        if (!defHasTough || atkPower >= defCreature.card.power) {
          defCreature.damage += atkPower;
        } else {
          this.addLog(`${defCreature.card.name} (Tough) ignores ${atkPower} damage from ${atkCreature.card.name}`);
        }
        this.addLog(`Lane ${lane + 1}: ${atkCreature.card.name} attacks ${defCreature.card.name} (defender does not strike back)`);
      } else {
        defender.life -= atkCreature.card.power;
        this.addLog(`${atkCreature.card.name} in lane ${lane + 1} deals ${atkCreature.card.power} damage to opponent's life`);
      }
    }
  }

  private removeDeadCreatures(player: Player) {
    for (let lane = 0; lane < 3; lane++) {
      const creature = player.lanes[lane];
      if (creature && creature.damage >= creature.card.life) {
        this.addLog(`${creature.card.name} in lane ${lane + 1} is destroyed`);
        player.discard.push(creature.card);
        player.lanes[lane] = null;
      }
    }
  }

  endTurn(): boolean {
    if (this.state.currentPhase !== Phase.End) return false;

    const result = this.checkGameOver();
    if (result !== null) {
      this.state.gameOver = true;
      this.state.winner = result;
      this.addLog(`Game over! Player ${result + 1} wins!`);
      return true;
    }

    // Reset turn state
    const player = this.activePlayer;
    player.hasInkedThisTurn = false;
    player.inkUsed = 0;
    player.temporaryInk = 0;

    // Clear exhausted state for creatures of the NEXT active player
    const nextIndex = this.state.activePlayerIndex === 0 ? 1 : 0;
    const nextPlayer = this.state.players[nextIndex];
    for (const creature of nextPlayer.lanes) {
      if (creature) creature.exhausted = false;
    }

    // Advance turn
    if (this.state.activePlayerIndex === 1) {
      this.state.currentTurn++;
    }
    this.state.activePlayerIndex = nextIndex as 0 | 1;
    this.state.currentPhase = Phase.Draw;

    this.addLog(`Turn passed to Player ${this.state.activePlayerIndex + 1}`);
    return true;
  }

  checkGameOver(): 0 | 1 | null {
    const p1 = this.state.players[0];
    const p2 = this.state.players[1];

    // Check life totals
    if (p1.life <= 0 && p2.life <= 0) {
      // Both at 0 — active player loses
      return this.state.activePlayerIndex === 0 ? 1 : 0;
    }
    if (p1.life <= 0) return 1;
    if (p2.life <= 0) return 0;

    // Check turn limit (after both players have taken turn 6)
    if (this.state.currentTurn > 6) {
      if (p1.life > p2.life) return 0;
      if (p2.life > p1.life) return 1;
      // Tie goes to... active player loses (as tiebreaker)
      return this.state.activePlayerIndex === 0 ? 1 : 0;
    }
    // Also check: if it's the end of player 2's turn 6
    if (this.state.currentTurn === 6 && this.state.activePlayerIndex === 1 && this.state.currentPhase === Phase.End) {
      if (p1.life > p2.life) return 0;
      if (p2.life > p1.life) return 1;
      return 0; // tie on turn 6 end: player 2 (active) loses
    }

    return null;
  }
}
