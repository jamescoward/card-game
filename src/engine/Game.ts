import { card, CardDef } from '../data/cards';
import { terrain, TerrainDef, TERRAINS } from '../data/terrains';
import {
  Action,
  GameEvent,
  GameState,
  Keyword,
  LogEntry,
  PlayerIndex,
  PlayerState,
  Unit,
  UnitRef,
  UnitView,
} from '../model/types';

/** Tunable rules. Mutable so the balance simulator can experiment. */
export const RULES = {
  startingLife: 20,
  openingHand: 5,
  /** Extra cards in the second player's opening hand. */
  secondPlayerExtraCards: 1,
  maxHand: 10,
  /** From this round the Storm deals escalating damage at the start of each turn. */
  stormRound: 8,
};

export interface GameOptions {
  decks: [string[], string[]];
  terrains?: string[];
  seed?: number;
  firstPlayer?: PlayerIndex;
  /** Starting life per player (defaults to RULES.startingLife). */
  life?: [number, number];
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Game {
  state: GameState;
  /** Everything that happened, in order. The UI replays these as animations. */
  events: GameEvent[] = [];
  log: LogEntry[] = [];
  /** Clones used for AI look-ahead skip building log text. */
  quiet = false;

  constructor(state: GameState) {
    this.state = state;
  }

  static create(opts: GameOptions): Game {
    const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
    const first = opts.firstPlayer ?? 0;
    const g = new Game({
      players: [
        Game.newPlayer(opts.decks[0], opts.life?.[0]),
        Game.newPlayer(opts.decks[1], opts.life?.[1]),
      ],
      terrains: [],
      round: 1,
      active: first,
      firstPlayer: first,
      winner: null,
      nextUid: 1,
      rngState: seed,
    });
    g.state.terrains = opts.terrains ?? g.randomTerrains();
    for (const p of [0, 1] as PlayerIndex[]) {
      g.state.players[p].deck = g.shuffle(g.state.players[p].deck);
      let n = RULES.openingHand + (p === first ? 0 : RULES.secondPlayerExtraCards);
      while (n-- > 0) g.drawQuiet(p);
    }
    g.startTurn();
    return g;
  }

  private static newPlayer(deck: string[], life?: number): PlayerState {
    return {
      life: life ?? RULES.startingLife,
      deck: [...deck],
      hand: [],
      discard: [],
      ink: 0,
      inkSpent: 0,
      bonusInk: 0,
      hasInked: false,
      lanes: [null, null, null],
    };
  }

  clone(): Game {
    const g = new Game(structuredClone(this.state));
    g.quiet = true;
    return g;
  }

  // -------------------------------------------------------------------------
  // Randomness (seeded and stored in state so clones stay deterministic)
  // -------------------------------------------------------------------------

  rand(): number {
    const next = mulberry32(this.state.rngState);
    const r = next();
    this.state.rngState = (this.state.rngState + 0x6d2b79f5) | 0;
    return r;
  }

  shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private randomTerrains(): string[] {
    return this.shuffle(TERRAINS.map(t => t.id)).slice(0, 3);
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  get active(): PlayerIndex {
    return this.state.active;
  }

  get over(): boolean {
    return this.state.winner !== null;
  }

  other(p: PlayerIndex): PlayerIndex {
    return p === 0 ? 1 : 0;
  }

  player(p: PlayerIndex): PlayerState {
    return this.state.players[p];
  }

  terrainAt(lane: number): TerrainDef {
    return terrain(this.state.terrains[lane]);
  }

  unitsOf(p: PlayerIndex): Unit[] {
    return this.state.players[p].lanes.filter((u): u is Unit => u !== null);
  }

  unitAt(ref: UnitRef): Unit | null {
    return this.state.players[ref.player]?.lanes[ref.lane] ?? null;
  }

  laneOf(u: Unit): number {
    return this.state.players[u.owner].lanes.findIndex(x => x?.uid === u.uid);
  }

  isAlive(u: Unit): boolean {
    return this.laneOf(u) >= 0 && u.damage < u.maxLife;
  }

  opposing(u: Unit): Unit | null {
    const lane = this.laneOf(u);
    if (lane < 0) return null;
    return this.state.players[this.other(u.owner)].lanes[lane];
  }

  hasKeyword(u: Unit, k: Keyword): boolean {
    if (u.keywords.includes(k)) return true;
    const lane = this.laneOf(u);
    return lane >= 0 && this.terrainAt(lane).keyword === k;
  }

  keywordsOf(u: Unit): Keyword[] {
    const lane = this.laneOf(u);
    const extra = lane >= 0 ? this.terrainAt(lane).keyword : undefined;
    return extra && !u.keywords.includes(extra) ? [...u.keywords, extra] : u.keywords;
  }

  powerOf(u: Unit): number {
    const lane = this.laneOf(u);
    let p = u.power + u.tempPower;
    if (lane >= 0) {
      p += this.terrainAt(lane).power ?? 0;
      this.state.players[u.owner].lanes.forEach((ally, allyLane) => {
        if (!ally || ally.uid === u.uid) return;
        const aura = card(ally.cardId).aura;
        if (aura) p += aura(allyLane, lane);
      });
    }
    return Math.max(0, p);
  }

  lifeOf(u: Unit): number {
    return u.maxLife - u.damage;
  }

  view(u: Unit): UnitView {
    return {
      uid: u.uid,
      cardId: u.cardId,
      owner: u.owner,
      lane: this.laneOf(u),
      power: this.powerOf(u),
      life: this.lifeOf(u),
      maxLife: u.maxLife,
      keywords: this.keywordsOf(u),
      exhausted: u.exhausted,
      frozen: u.frozen,
      shield: u.shield,
    };
  }

  availableInk(p: PlayerIndex = this.state.active): number {
    const pl = this.state.players[p];
    return pl.ink + pl.bonusInk - pl.inkSpent;
  }

  /** Effective cost of a card in hand. */
  costOf(cardId: string): number {
    return card(cardId).cost;
  }

  // -------------------------------------------------------------------------
  // Action validation
  // -------------------------------------------------------------------------

  canInk(handIndex: number): boolean {
    if (this.over) return false;
    const pl = this.player(this.state.active);
    const id = pl.hand[handIndex];
    return id !== undefined && !pl.hasInked && card(id).inkable;
  }

  canPlayInLane(handIndex: number, lane: number): boolean {
    const pl = this.player(this.state.active);
    const def = card(pl.hand[handIndex]);
    if (def.type !== 'creature' || lane < 0 || lane > 2) return false;
    const max = this.terrainAt(lane).maxCost;
    return max === undefined || def.cost <= max;
  }

  /** Can this card be played at all (ignoring lane / target choice)? */
  canAfford(handIndex: number): boolean {
    if (this.over) return false;
    const id = this.player(this.state.active).hand[handIndex];
    return id !== undefined && this.costOf(id) <= this.availableInk();
  }

  validTargets(handIndex: number): UnitRef[] {
    const p = this.state.active;
    const id = this.player(p).hand[handIndex];
    if (!id) return [];
    const kind = card(id).target ?? 'none';
    const refs: UnitRef[] = [];
    for (const owner of [0, 1] as PlayerIndex[]) {
      if (kind === 'enemyCreature' && owner === p) continue;
      if (kind === 'friendlyCreature' && owner !== p) continue;
      this.state.players[owner].lanes.forEach((u, lane) => {
        if (u) refs.push({ player: owner, lane });
      });
    }
    return refs;
  }

  canPlay(handIndex: number, lane?: number, target?: UnitRef): boolean {
    if (!this.canAfford(handIndex)) return false;
    const def = card(this.player(this.state.active).hand[handIndex]);
    if (def.type === 'creature') {
      return lane !== undefined && this.canPlayInLane(handIndex, lane);
    }
    if ((def.target ?? 'none') === 'none') return true;
    if (!target) return false;
    return this.validTargets(handIndex).some(r => r.player === target.player && r.lane === target.lane);
  }

  /** Every distinct legal action for the active player (duplicate cards collapsed). */
  legalActions(): Action[] {
    const actions: Action[] = [];
    if (this.over) return actions;
    const hand = this.player(this.state.active).hand;
    const seen = new Set<string>();
    hand.forEach((id, i) => {
      if (seen.has(id)) return;
      seen.add(id);
      if (this.canInk(i)) actions.push({ type: 'ink', hand: i });
      if (!this.canAfford(i)) return;
      const def = card(id);
      if (def.type === 'creature') {
        for (let lane = 0; lane < 3; lane++) {
          if (this.canPlayInLane(i, lane)) actions.push({ type: 'play', hand: i, lane });
        }
      } else if ((def.target ?? 'none') === 'none') {
        actions.push({ type: 'play', hand: i });
      } else {
        for (const target of this.validTargets(i)) actions.push({ type: 'play', hand: i, target });
      }
    });
    actions.push({ type: 'end' });
    return actions;
  }

  apply(a: Action): boolean {
    if (a.type === 'ink') return this.ink(a.hand);
    if (a.type === 'play') return this.play(a.hand, a.lane, a.target);
    return this.endTurn();
  }

  // -------------------------------------------------------------------------
  // Player actions
  // -------------------------------------------------------------------------

  ink(handIndex: number): boolean {
    if (!this.canInk(handIndex)) return false;
    const p = this.state.active;
    const pl = this.player(p);
    const [id] = pl.hand.splice(handIndex, 1);
    pl.ink += 1;
    pl.hasInked = true;
    pl.discard.push(id);
    this.emit({ t: 'ink', p, cardId: id, ink: pl.ink });
    this.say(p, `inked ${card(id).name} 💧`);
    card(id).onInk?.(this, p);
    this.settle();
    return true;
  }

  play(handIndex: number, lane?: number, target?: UnitRef): boolean {
    if (!this.canPlay(handIndex, lane, target)) return false;
    const p = this.state.active;
    const pl = this.player(p);
    const id = pl.hand[handIndex];
    const def = card(id);
    pl.inkSpent += this.costOf(id);
    pl.hand.splice(handIndex, 1);
    this.emit({ t: 'play', p, cardId: id, lane, target });

    if (def.type === 'creature') {
      const l = lane!;
      let replaced: Unit | null = null;
      const old = pl.lanes[l];
      if (old) {
        replaced = { ...old };
        this.say(p, `replaced ${card(old.cardId).name} with ${def.name}`);
        this.destroy(old);
        this.resolveDeaths();
      } else {
        this.say(p, `played ${def.name}`);
      }
      const unit = this.summon(p, id, l);
      def.onPlay?.(this, unit, replaced);
    } else {
      pl.discard.push(id);
      const t = target ? this.unitAt(target) : null;
      this.say(p, `cast ${def.name}${t ? ` on ${card(t.cardId).name}` : ''}`);
      def.cast?.(this, p, t);
    }
    this.settle();
    return true;
  }

  /** Fight, run end-of-turn effects, then start the opponent's turn. */
  endTurn(): boolean {
    if (this.over) return false;
    this.fight();
    if (this.over) return true;
    this.endOfTurn();
    if (this.over) return true;
    this.state.active = this.other(this.state.active);
    if (this.state.active === this.state.firstPlayer) this.state.round++;
    this.startTurn();
    return true;
  }

  // -------------------------------------------------------------------------
  // Turn structure
  // -------------------------------------------------------------------------

  /** Combat for the active player. Public so the AI can forecast a turn. */
  fight() {
    const p = this.state.active;
    const foe = this.other(p);
    for (let lane = 0; lane < 3 && !this.over; lane++) {
      const a = this.player(p).lanes[lane];
      if (!a || a.exhausted) continue;
      const power = this.powerOf(a);
      if (power <= 0) continue;
      const d = this.player(foe).lanes[lane];
      const t = this.terrainAt(lane);
      const mult = t.heroDamageMultiplier ?? 1;
      const blocked = d !== null && !t.unblockable &&
        !(this.hasKeyword(a, Keyword.Flying) && !this.hasKeyword(d, Keyword.Flying));
      this.emit({ t: 'attack', uid: a.uid, p, lane, targetUid: blocked ? d!.uid : null });

      if (!blocked) {
        this.damageHero(foe, power * mult, a);
      } else {
        const def = d!;
        const back = this.powerOf(def);
        let needed = def.shield ? Infinity : this.hasKeyword(a, Keyword.Deadly) ? 1 : this.lifeOf(def);
        if (this.hasKeyword(def, Keyword.Tough)) needed += 1;
        const excess = this.hasKeyword(a, Keyword.Trample) ? Math.max(0, power - needed) : 0;
        this.dealDamage(def, power, a);
        if (back > 0) this.dealDamage(a, back, def);
        if (excess > 0) this.damageHero(foe, excess * mult, a);
        this.resolveDeaths();
        for (const u of [a, def]) {
          if (this.isAlive(u)) card(u.cardId).onSurvive?.(this, u);
        }
      }
      this.settle();
    }
  }

  /** End-of-turn terrain effects and cleanup. Public for AI forecasting. */
  endOfTurn() {
    const p = this.state.active;
    for (let lane = 0; lane < 3 && !this.over; lane++) {
      const t = this.terrainAt(lane);
      if (t.onTurnEnd) {
        const before = this.events.length;
        t.onTurnEnd(this, lane, p);
        if (this.events.length > before) this.emitTerrainBefore(before, lane);
      }
    }
    for (const pl of this.state.players) {
      for (const u of pl.lanes) if (u) u.tempPower = 0;
    }
    this.settle();
  }

  private startTurn() {
    const p = this.state.active;
    const pl = this.player(p);
    this.emit({ t: 'turnStart', p, round: this.state.round });
    pl.inkSpent = 0;
    pl.bonusInk = 0;
    pl.hasInked = false;
    for (const u of pl.lanes) {
      if (!u) continue;
      if (u.frozen) {
        u.frozen = false;
        u.exhausted = true;
      } else {
        u.exhausted = false;
      }
    }

    if (this.state.round >= RULES.stormRound) {
      const amount = this.state.round - RULES.stormRound + 1;
      this.emit({ t: 'storm', p, amount });
      this.say(p, `is battered by the Storm for ${amount}`);
      this.damageHero(p, amount);
      if (this.settle()) return;
    }

    const skipDraw = this.state.round === 1 && p === this.state.firstPlayer;
    if (!skipDraw) this.draw(p);

    for (const u of this.unitsOf(p)) {
      if (this.isAlive(u)) card(u.cardId).onTurnStart?.(this, u);
    }
    for (let lane = 0; lane < 3; lane++) {
      const t = this.terrainAt(lane);
      if (t.onTurnStart) {
        const before = this.events.length;
        t.onTurnStart(this, lane, p);
        if (this.events.length > before) this.emitTerrainBefore(before, lane);
      }
    }
    this.settle();
  }

  // -------------------------------------------------------------------------
  // Effects (used by cards and terrains)
  // -------------------------------------------------------------------------

  /** Deal damage to a unit. Returns the damage actually dealt. */
  dealDamage(u: Unit, amount: number, source?: Unit): number {
    if (amount <= 0 || this.laneOf(u) < 0) return 0;
    if (u.shield) {
      u.shield = false;
      this.emit({ t: 'shieldPop', uid: u.uid });
      return 0;
    }
    if (this.hasKeyword(u, Keyword.Tough)) amount -= 1;
    if (amount <= 0) return 0;
    u.damage += amount;
    if (source && this.hasKeyword(source, Keyword.Deadly)) u.damage = Math.max(u.damage, u.maxLife);
    this.emit({ t: 'damage', uid: u.uid, amount, unit: this.view(u) });
    if (source && this.hasKeyword(source, Keyword.Lifesteal)) this.healHero(source.owner, amount);
    return amount;
  }

  damageHero(p: PlayerIndex, amount: number, source?: Unit) {
    if (amount <= 0) return;
    const pl = this.player(p);
    pl.life -= amount;
    this.emit({ t: 'hero', p, amount: -amount, life: pl.life });
    if (source && this.hasKeyword(source, Keyword.Lifesteal)) this.healHero(source.owner, amount);
  }

  healHero(p: PlayerIndex, amount: number) {
    if (amount <= 0) return;
    const pl = this.player(p);
    pl.life += amount;
    this.emit({ t: 'hero', p, amount, life: pl.life });
  }

  healUnit(u: Unit) {
    u.damage = 0;
    this.emit({ t: 'unit', unit: this.view(u), reason: 'heal' });
  }

  buff(u: Unit, power: number, life: number, temporary = false) {
    if (temporary) u.tempPower += power;
    else u.power += power;
    u.maxLife += life;
    this.emit({ t: 'unit', unit: this.view(u), reason: 'buff' });
  }

  giveKeyword(u: Unit, k: Keyword) {
    if (!u.keywords.includes(k)) u.keywords.push(k);
    this.emit({ t: 'unit', unit: this.view(u), reason: 'buff' });
  }

  giveShield(u: Unit) {
    u.shield = true;
    this.emit({ t: 'unit', unit: this.view(u), reason: 'shield' });
  }

  freeze(u: Unit) {
    u.frozen = true;
    u.exhausted = true;
    this.emit({ t: 'unit', unit: this.view(u), reason: 'freeze' });
  }

  /** Mark a unit for destruction (resolved by resolveDeaths). */
  destroy(u: Unit) {
    if (this.laneOf(u) < 0) return;
    u.damage = Math.max(u.damage, u.maxLife);
  }

  bounce(u: Unit) {
    const lane = this.laneOf(u);
    if (lane < 0) return;
    this.player(u.owner).lanes[lane] = null;
    this.emit({ t: 'bounce', uid: u.uid, p: u.owner, lane });
    this.say(u.owner, `had ${card(u.cardId).name} returned to hand`);
    this.addToHand(u.owner, u.cardId);
  }

  summon(p: PlayerIndex, cardId: string, lane: number): Unit {
    const def = card(cardId);
    const unit: Unit = {
      uid: this.state.nextUid++,
      cardId,
      owner: p,
      power: def.power,
      maxLife: def.life,
      damage: 0,
      keywords: [...def.keywords],
      exhausted: def.keywords.includes(Keyword.Slow),
      frozen: false,
      shield: def.keywords.includes(Keyword.Shield),
      tempPower: 0,
    };
    const buff = this.terrainAt(lane).onSummonBuff;
    if (buff) {
      unit.power += buff.power;
      unit.maxLife += buff.life;
    }
    this.player(p).lanes[lane] = unit;
    this.emit({ t: 'summon', unit: this.view(unit) });
    return unit;
  }

  draw(p: PlayerIndex, n = 1) {
    for (let i = 0; i < n; i++) {
      const pl = this.player(p);
      const id = pl.deck.pop();
      if (!id) return;
      if (pl.hand.length >= RULES.maxHand) {
        pl.discard.push(id);
        this.emit({ t: 'burn', p, cardId: id });
      } else {
        pl.hand.push(id);
        this.emit({ t: 'draw', p, cardId: id });
      }
    }
  }

  private drawQuiet(p: PlayerIndex) {
    const pl = this.player(p);
    const id = pl.deck.pop();
    if (id) pl.hand.push(id);
  }

  addToHand(p: PlayerIndex, cardId: string) {
    const pl = this.player(p);
    if (pl.hand.length >= RULES.maxHand) {
      this.emit({ t: 'burn', p, cardId });
      return;
    }
    pl.hand.push(cardId);
    this.emit({ t: 'draw', p, cardId });
  }

  /** Gain permanent ink. If not availableNow, the new crystal starts empty. */
  gainInk(p: PlayerIndex, amount: number, availableNow: boolean) {
    const pl = this.player(p);
    pl.ink += amount;
    if (!availableNow) pl.inkSpent += amount;
    this.emit({ t: 'gainInk', p, amount });
  }

  gainBonusInk(p: PlayerIndex, amount: number) {
    this.player(p).bonusInk += amount;
    this.emit({ t: 'gainInk', p, amount });
  }

  // -------------------------------------------------------------------------
  // Bookkeeping
  // -------------------------------------------------------------------------

  /** Remove dead units and fire death triggers until the board is stable. */
  resolveDeaths() {
    for (let guard = 0; guard < 20; guard++) {
      const dead: { u: Unit; lane: number }[] = [];
      for (const p of [this.state.active, this.other(this.state.active)]) {
        this.player(p).lanes.forEach((u, lane) => {
          if (u && u.damage >= u.maxLife) dead.push({ u, lane });
        });
      }
      if (dead.length === 0) return;
      for (const { u, lane } of dead) {
        this.player(u.owner).lanes[lane] = null;
        if (!card(u.cardId).token) this.player(u.owner).discard.push(u.cardId);
        this.emit({ t: 'death', uid: u.uid, p: u.owner, lane });
        this.say(u.owner, `lost ${card(u.cardId).name}`);
      }
      for (const { u, lane } of dead) {
        card(u.cardId).onDeath?.(this, u, lane);
        const t = this.terrainAt(lane);
        if (t.onDeath) {
          const before = this.events.length;
          t.onDeath(this, lane, u.owner);
          if (this.events.length > before) this.emitTerrainBefore(before, lane);
        }
        for (const ally of this.unitsOf(u.owner)) {
          card(ally.cardId).onAllyDeath?.(this, ally, u);
        }
      }
    }
  }

  /** Resolve deaths and check for a winner. Returns true if the game is over. */
  private settle(): boolean {
    this.resolveDeaths();
    if (this.over) return true;
    const [a, b] = this.state.players;
    if (a.life > 0 && b.life > 0) return false;
    let winner: PlayerIndex;
    if (a.life <= 0 && b.life <= 0) winner = this.state.active;
    else winner = a.life <= 0 ? 1 : 0;
    this.state.winner = winner;
    this.emit({ t: 'gameOver', winner });
    return true;
  }

  private emit(e: GameEvent) {
    this.events.push(e);
  }

  /** Insert a terrain marker before the events a terrain caused, so the UI can flash it. */
  private emitTerrainBefore(index: number, lane: number) {
    this.events.splice(index, 0, { t: 'terrain', lane });
  }

  private say(p: PlayerIndex, text: string) {
    if (this.quiet) return;
    this.log.push({ round: this.state.round, p, text });
  }
}

export type { CardDef };
