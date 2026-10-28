import { card } from '../data/cards';
import { Action, Keyword, PlayerIndex, Unit } from '../model/types';
import { Game } from './Game';

export type Difficulty = 'easy' | 'normal' | 'hard';

/**
 * Greedy look-ahead AI. For each legal action it clones the game, applies the
 * action, forecasts this turn's combat plus the opponent's counter-attack, and
 * scores the result. It keeps taking the best action until ending the turn
 * scores highest.
 */
export function chooseAction(g: Game, difficulty: Difficulty = 'normal', rand: () => number = Math.random): Action {
  const me = g.active;
  if (difficulty !== 'easy' && g.canMulligan(me) && shouldMulligan(g, me)) return { type: 'mulligan' };
  const actions = g.legalActions();
  if (actions.length === 1) return actions[0];

  if (difficulty === 'easy' && rand() < 0.4) {
    // Sloppy: sometimes do something random, sometimes just stop.
    const nonEnd = actions.filter(a => a.type !== 'end');
    if (rand() < 0.3 || nonEnd.length === 0) return { type: 'end' };
    return nonEnd[Math.floor(rand() * nonEnd.length)];
  }

  const careless = difficulty === 'easy';
  const scored = actions.map(a => ({ a, s: scoreAction(g, a, me, careless) }));

  // Inking is only worth it for what it enables: score each ink choice by the
  // best play it unlocks this turn.
  for (const x of scored) {
    if (x.a.type !== 'ink') continue;
    const c = g.clone();
    c.apply(x.a);
    for (const b of c.legalActions()) {
      if (b.type === 'play') x.s = Math.max(x.s, scoreAction(c, b, me, careless));
    }
  }

  if (difficulty === 'easy') for (const x of scored) x.s += (rand() - 0.5) * 10;

  if (difficulty === 'hard') {
    // Two-step search on the most promising actions: value = best follow-up.
    scored.sort((x, y) => y.s - x.s);
    for (const x of scored.slice(0, 6)) {
      if (x.a.type === 'end') continue;
      const c = g.clone();
      c.apply(x.a);
      if (c.over) continue;
      let best = x.s;
      for (const b of c.legalActions()) {
        if (b.type === 'end') continue;
        best = Math.max(best, scoreAction(c, b, me) - 0.01);
      }
      x.s = Math.max(x.s, best);
    }
  }

  let best = scored[0];
  for (const x of scored) if (x.s > best.s + 1e-9) best = x;
  const end = scored.find(x => x.a.type === 'end')!;
  // Require a small improvement to bother acting (avoids pointless overwrites).
  return best.s > end.s + 0.05 ? best.a : end.a;
}

/** Redraw hands with no early creature, or too many expensive cards. */
export function shouldMulligan(g: Game, p: PlayerIndex): boolean {
  const hand = g.player(p).hand.map(card);
  const early = hand.some(c => c.type === 'creature' && c.cost <= 2);
  const clunky = hand.filter(c => c.cost >= 4).length >= 3;
  return !early || clunky;
}

function scoreAction(g: Game, a: Action, me: PlayerIndex, careless = false): number {
  const c = g.clone();
  if (a.type !== 'end') c.apply(a);
  return forecast(c, me, !careless);
}

/** Score the position after this turn's combat and the opponent's likely counter-attack. */
export function forecast(g: Game, me: PlayerIndex, withCounter = true): number {
  if (g.over) return evaluate(g, me);
  const afterMine = g.clone();
  afterMine.fight();
  if (!afterMine.over) afterMine.endOfTurn();
  const mine = evaluate(afterMine, me);
  if (afterMine.over || !withCounter) return mine;

  const theirs = evaluate(counterAttack(afterMine), me);
  return mine * 0.5 + theirs * 0.5;
}

/**
 * Rough counter-attack: the opponent's current board swings back without new
 * plays. Returns a new game; the input is not modified.
 */
export function counterAttack(g: Game): Game {
  const counter = g.clone();
  const foe = counter.other(counter.active);
  counter.state.active = foe;
  for (const u of counter.unitsOf(foe)) {
    if (u.frozen) u.frozen = false;
    else u.exhausted = false;
  }
  counter.fight();
  return counter;
}

function lifeValue(life: number): number {
  // Life matters more the lower it gets.
  return life + (life < 10 ? (life - 10) * 0.5 : 0) + (life < 5 ? (life - 5) * 1.0 : 0);
}

function unitValue(g: Game, u: Unit): number {
  const def = card(u.cardId);
  let v = g.powerOf(u) * 1.1 + g.lifeOf(u) * 0.7 + 0.5;
  const kw = g.keywordsOf(u);
  if (kw.includes(Keyword.Flying)) v += g.powerOf(u) * 0.4;
  if (kw.includes(Keyword.Deadly)) v += 1.5;
  if (kw.includes(Keyword.Lifesteal)) v += g.powerOf(u) * 0.3;
  if (kw.includes(Keyword.Tough)) v += 0.8;
  if (kw.includes(Keyword.Trample)) v += 0.4;
  if (u.shield) v += 1;
  if (def.onTurnStart) v += 1.5;
  if (def.aura || def.onAllyDeath) v += 1.2;
  if (def.onDeath) v += 0.8;
  if (u.frozen) v -= 0.6;
  return v;
}

function inkValue(ink: number): number {
  let v = 0;
  for (let k = 1; k <= ink; k++) v += k <= 5 ? 2.2 : 0.4;
  return v;
}

export function evaluate(g: Game, me: PlayerIndex): number {
  const foe = g.other(me);
  if (g.state.winner === me) return 10000 + g.player(me).life;
  if (g.state.winner === foe) return -10000;
  const P = g.player(me);
  const F = g.player(foe);
  let s = (lifeValue(P.life) - lifeValue(F.life)) * 1.2;
  for (const u of g.unitsOf(me)) s += unitValue(g, u);
  for (const u of g.unitsOf(foe)) s -= unitValue(g, u);
  const handValue = (ids: string[], ink: number) =>
    ids.reduce((acc, id) => {
      const c = card(id);
      let v = 1.2 + c.cost * 0.25;
      if (c.cost > ink + 3) v -= 0.4;
      return acc + v;
    }, 0);
  s += handValue(P.hand, P.ink) - F.hand.length * 1.5;
  s += inkValue(P.ink) - inkValue(F.ink);
  return s;
}
