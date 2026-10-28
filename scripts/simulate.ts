/**
 * Balance simulator: plays AI-vs-AI games for every deck pairing and prints
 * win rates, first-player advantage and game length.
 *
 *   npm run sim            # 200 games per pairing
 *   npm run sim -- 500     # custom count
 */
import { Game, RULES } from '../src/engine/Game';
import { chooseAction, Difficulty } from '../src/engine/ai';
import { DECKS, DECK_IDS } from '../src/data/decks';
import { card } from '../src/data/cards';
import { PlayerIndex } from '../src/model/types';

const N = Number(process.argv[2] ?? 200);
const diffs: [Difficulty, Difficulty] = [
  (process.argv[3] as Difficulty) ?? 'normal',
  (process.argv[4] as Difficulty) ?? 'normal',
];

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

interface Result { winner: PlayerIndex; rounds: number; storm: boolean; }

function playOne(a: string[], b: string[], seed: number, first: PlayerIndex): Result {
  const g = Game.create({ decks: [a, b], seed, firstPlayer: first });
  const rand = seeded(seed ^ 0x9e3779b9);
  let steps = 0;
  while (!g.over && steps++ < 2000) {
    g.apply(chooseAction(g, diffs[g.active], rand));
  }
  const storm = g.events.some(e => e.t === 'storm');
  return { winner: g.state.winner ?? 0, rounds: g.state.round, storm };
}

const playStats: Record<string, { played: number; inked: number }> = {};

const wins: Record<string, number> = {};
const games: Record<string, number> = {};
let firstWins = 0, total = 0, roundSum = 0, stormGames = 0;
const matrix: string[] = [];
const roundHist: Record<number, number> = {};

for (const x of DECK_IDS) {
  const row: string[] = [];
  for (const y of DECK_IDS) {
    let xw = 0;
    for (let i = 0; i < N; i++) {
      const first = (i % 2) as PlayerIndex;
      const seed = (i + 1) * 7919 + DECK_IDS.indexOf(x) * 104729 + DECK_IDS.indexOf(y) * 1299709;
      const g = Game.create({ decks: [DECKS[x].cards, DECKS[y].cards], seed, firstPlayer: first });
      const rand = seeded(seed ^ 0x9e3779b9);
      let steps = 0;
      while (!g.over && steps++ < 2000) g.apply(chooseAction(g, diffs[g.active], rand));
      for (const e of g.events) {
        if (e.t === 'play' || e.t === 'ink') {
          const s = (playStats[e.cardId] ??= { played: 0, inked: 0 });
          if (e.t === 'play') s.played++; else s.inked++;
        }
      }
      const r: Result = { winner: g.state.winner ?? 0, rounds: g.state.round, storm: g.events.some(e => e.t === 'storm') };
      if (r.winner === 0) xw++;
      if (r.winner === first) firstWins++;
      total++;
      roundSum += r.rounds;
      roundHist[r.rounds] = (roundHist[r.rounds] ?? 0) + 1;
      if (r.storm) stormGames++;
      wins[x] = (wins[x] ?? 0) + (r.winner === 0 ? 1 : 0);
      wins[y] = (wins[y] ?? 0) + (r.winner === 1 ? 1 : 0);
      games[x] = (games[x] ?? 0) + 1;
      games[y] = (games[y] ?? 0) + 1;
    }
    row.push(`${((xw / N) * 100).toFixed(0).padStart(4)}%`);
  }
  matrix.push(`${x.padEnd(6)} ${row.join(' ')}`);
}

console.log(`Rules: ${JSON.stringify(RULES)}  AI: ${diffs.join(' vs ')}  N=${N}/pairing\n`);
console.log(`Row deck win rate vs column deck (row deck is player 0):`);
console.log(`       ${DECK_IDS.map(d => d.padStart(5)).join(' ')}`);
console.log(matrix.join('\n'));
console.log(`\nOverall win rate:`);
for (const d of DECK_IDS) console.log(`  ${d.padEnd(6)} ${((wins[d] / games[d]) * 100).toFixed(1)}%`);
console.log(`\nFirst player wins: ${((firstWins / total) * 100).toFixed(1)}%`);
console.log(`Average rounds:    ${(roundSum / total).toFixed(2)}`);
console.log(`Reached Storm:     ${((stormGames / total) * 100).toFixed(1)}%`);
console.log(`Rounds histogram:  ${Object.entries(roundHist).map(([k, v]) => `${k}:${v}`).join(' ')}`);
if (process.env.CARDS) {
  console.log(`\nCard usage (played / inked):`);
  for (const [id, s] of Object.entries(playStats).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${card(id).name.padEnd(16)} ${String(s.played).padStart(5)} ${String(s.inked).padStart(5)}`);
  }
}
void playOne;
