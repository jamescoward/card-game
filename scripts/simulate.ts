/**
 * Balance simulator: plays AI-vs-AI games for every deck pairing and reports
 * matchups, first-player advantage, game length, per-card impact and terrain
 * swings.
 *
 *   npm run sim                       # 200 games per pairing, normal vs normal
 *   npm run sim -- 500                # more games
 *   npm run sim -- 100 hard normal    # row deck AI vs column deck AI
 */
import { Game, RULES } from '../src/engine/Game';
import { chooseAction, Difficulty } from '../src/engine/ai';
import { DECKS, DECK_IDS } from '../src/data/decks';
import { card } from '../src/data/cards';
import { terrain } from '../src/data/terrains';
import { PlayerIndex } from '../src/model/types';

const N = Number(process.argv[2] ?? 200);
const diffs: [Difficulty, Difficulty] = [
  (process.argv[3] as Difficulty) ?? 'normal',
  (process.argv[4] as Difficulty) ?? 'normal',
];

type Deck = (typeof DECK_IDS)[number];

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const pct = (a: number, b: number) => (b ? (100 * a) / b : 0);
const fmt = (x: number) => `${x.toFixed(1).padStart(5)}%`;
const signed = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}`;

// Aggregates ---------------------------------------------------------------
const matchup: Record<string, { w: number; n: number }> = {};
const faction: Record<string, { w: number; n: number; firstW: number; firstN: number; mull: number; badHand: number }> = {};
const cardStat: Record<string, { deck: Deck; playedGames: number; playedWins: number; plays: number; inks: number }> = {};
const terrainStat: Record<string, { w: number; n: number }> = {};
let firstWins = 0, total = 0, roundSum = 0, stormGames = 0;
const roundHist: Record<number, number> = {};

for (const d of DECK_IDS) faction[d] = { w: 0, n: 0, firstW: 0, firstN: 0, mull: 0, badHand: 0 };

const t0 = Date.now();
for (const x of DECK_IDS) {
  for (const y of DECK_IDS) {
    for (let i = 0; i < N; i++) {
      const first = (i % 2) as PlayerIndex;
      const seed = (i + 1) * 7919 + DECK_IDS.indexOf(x) * 104729 + DECK_IDS.indexOf(y) * 1299709;
      const decks: [Deck, Deck] = [x, y];
      const g = Game.create({ decks: [DECKS[x].cards, DECKS[y].cards], seed, firstPlayer: first });

      // Opening hands with no 1-2 cost creature, before any redraw.
      for (const p of [0, 1] as PlayerIndex[]) {
        if (!g.player(p).hand.some(id => card(id).type === 'creature' && card(id).cost <= 2)) faction[decks[p]].badHand++;
      }

      const rand = seeded(seed ^ 0x9e3779b9);
      let steps = 0;
      while (!g.over && steps++ < 2000) g.apply(chooseAction(g, diffs[g.active], rand));

      const winner = g.state.winner ?? 0;
      const played: [Set<string>, Set<string>] = [new Set(), new Set()];
      for (const e of g.events) {
        if (e.t === 'mulligan') faction[decks[e.p]].mull++;
        if (e.t !== 'play' && e.t !== 'ink') continue;
        const c = card(e.cardId);
        if (c.token) continue;
        const s = (cardStat[e.cardId] ??= { deck: decks[e.p], playedGames: 0, playedWins: 0, plays: 0, inks: 0 });
        if (e.t === 'play') {
          s.plays++;
          played[e.p].add(e.cardId);
        } else {
          s.inks++;
        }
      }
      for (const p of [0, 1] as PlayerIndex[]) {
        for (const id of played[p]) {
          const s = cardStat[id];
          if (s.deck !== decks[p]) continue; // mirror: only count the deck that owns it
          s.playedGames++;
          if (winner === p) s.playedWins++;
        }
        const f = faction[decks[p]];
        f.n++;
        if (winner === p) f.w++;
        if (p === first) {
          f.firstN++;
          if (winner === p) f.firstW++;
        }
        for (const t of g.state.terrains) {
          const k = `${t}|${decks[p]}`;
          terrainStat[k] ??= { w: 0, n: 0 };
          terrainStat[k].n++;
          if (winner === p) terrainStat[k].w++;
        }
      }

      const key = `${x}|${y}`;
      matchup[key] ??= { w: 0, n: 0 };
      matchup[key].n++;
      if (winner === 0) matchup[key].w++;

      if (winner === first) firstWins++;
      total++;
      roundSum += g.state.round;
      roundHist[g.state.round] = (roundHist[g.state.round] ?? 0) + 1;
      if (g.events.some(e => e.t === 'storm')) stormGames++;
    }
  }
}

// Report -------------------------------------------------------------------
console.log(`Rules: ${JSON.stringify(RULES)}`);
console.log(`AI: ${diffs.join(' vs ')} · ${N} games per pairing · ${total} games · ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);

console.log('MATCHUPS — row deck win rate vs column deck (both seats, alternating who goes first)');
console.log(`         ${DECK_IDS.map(d => d.padStart(7)).join('')}`);
for (const x of DECK_IDS) {
  const row = DECK_IDS.map(y => {
    // Combine x-as-p0 vs y and y-as-p0 vs x so seat bias cancels out.
    const a = matchup[`${x}|${y}`], b = matchup[`${y}|${x}`];
    const w = x === y ? a.w : a.w + (b.n - b.w);
    const n = x === y ? a.n : a.n + b.n;
    return fmt(pct(w, n)).padStart(7);
  });
  console.log(`  ${x.padEnd(7)}${row.join('')}`);
}

console.log('\nFACTIONS');
console.log('           win    on-play  redraw  no-early-creature-hand');
for (const d of DECK_IDS) {
  const f = faction[d];
  console.log(`  ${d.padEnd(7)} ${fmt(pct(f.w, f.n))}  ${fmt(pct(f.firstW, f.firstN))}  ${fmt(pct(f.mull, f.n))}  ${fmt(pct(f.badHand, f.n))}`);
}

console.log(`\nFirst player wins: ${fmt(pct(firstWins, total))}`);
console.log(`Average rounds:    ${(roundSum / total).toFixed(2)}`);
console.log(`Reached Storm:     ${fmt(pct(stormGames, total))}`);
console.log(`Rounds:            ${Object.entries(roundHist).map(([k, v]) => `${k}:${v}`).join(' ')}`);

console.log('\nCARDS — win rate in games where the owner played it, vs that faction\'s overall win rate');
console.log('  (high delta = carries games; low/negative = dead weight or played from behind)');
const rows = Object.entries(cardStat)
  .map(([id, s]) => {
    const base = pct(faction[s.deck].w, faction[s.deck].n);
    const wr = pct(s.playedWins, s.playedGames);
    return { id, s, wr, delta: wr - base, playRate: pct(s.playedGames, faction[s.deck].n) };
  })
  .sort((a, b) => a.s.deck.localeCompare(b.s.deck) || b.delta - a.delta);
let lastDeck = '';
for (const r of rows) {
  if (r.s.deck !== lastDeck) {
    console.log(`  ${r.s.deck}`);
    lastDeck = r.s.deck;
  }
  const flag = r.s.playedGames >= 100 && Math.abs(r.delta) >= 10 ? (r.delta > 0 ? ' ▲' : ' ▼') : '';
  console.log(`    ${card(r.id).name.padEnd(16)} played in ${fmt(r.playRate)} of games · WR ${fmt(r.wr)} (${signed(r.delta).padStart(5)}) · inked ${String(r.s.inks).padStart(4)}×${flag}`);
}

console.log('\nTERRAINS — faction win rate when the terrain is in play (delta from faction overall)');
console.log(`  ${''.padEnd(15)}${DECK_IDS.map(d => d.padStart(8)).join('')}`);
const terrainIds = [...new Set(Object.keys(terrainStat).map(k => k.split('|')[0]))].sort();
for (const t of terrainIds) {
  const cells = DECK_IDS.map(d => {
    const s = terrainStat[`${t}|${d}`];
    const delta = pct(s.w, s.n) - pct(faction[d].w, faction[d].n);
    return `${signed(delta)}${Math.abs(delta) >= 5 ? '!' : ' '}`.padStart(8);
  });
  console.log(`  ${terrain(t).name.padEnd(15)}${cells.join('')}`);
}
