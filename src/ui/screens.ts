import { card, KEYWORD_INFO } from '../data/cards';
import { DECKS, DECK_IDS } from '../data/decks';
import { TERRAINS } from '../data/terrains';
import { Difficulty } from '../engine/ai';
import { RULES } from '../engine/Game';
import { Faction, Keyword } from '../model/types';
import { isMuted, setMuted, sfx } from './audio';
import { Battle } from './battle';
import { bigCardHtml, miniCardHtml } from './cardView';
import { confetti } from './fx';
import { FLOORS, loadBest, loadRun, newRun, recordBest, RIVALS, rollRewards, RunState, saveRun } from './gauntlet';

type DeckFaction = Exclude<Faction, 'Neutral'>;

const app = () => document.getElementById('app')!;

/** Replace the app with a screen and wire its [data-go] buttons. */
function screen(html: string, handlers: Record<string, (el: HTMLElement) => void>) {
  const host = document.createElement('div');
  host.className = 'screen';
  host.innerHTML = html;
  host.addEventListener('click', e => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-go]');
    if (!el) return;
    const h = handlers[el.dataset.go!];
    if (h) {
      sfx('click');
      h(el);
    }
  });
  app().replaceChildren(host);
  window.scrollTo(0, 0);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

interface Record_ { w: number; l: number }

function loadRecord(): Record_ {
  try {
    return { w: 0, l: 0, ...JSON.parse(localStorage.getItem('inkbrawl.record') ?? '{}') };
  } catch {
    return { w: 0, l: 0 };
  }
}

function addRecord(won: boolean) {
  const r = loadRecord();
  if (won) r.w++;
  else r.l++;
  try {
    localStorage.setItem('inkbrawl.record', JSON.stringify(r));
  } catch {
    /* storage unavailable */
  }
}

// ---------------------------------------------------------------------------
// Main menu
// ---------------------------------------------------------------------------

export function showMenu() {
  const run = loadRun();
  const best = loadBest();
  const rec = loadRecord();
  const floaters = ['🐉', '🔥', '🌊', '💀', '🌿', '⚔️', '🐙', '🦏', '🧛', '🐦‍🔥']
    .map((e, i) => `<span style="--i:${i}">${e}</span>`).join('');
  screen(`
    <div class="menu">
      <div class="floaters">${floaters}</div>
      <h1 class="logo">INK<span>BRAWL</span></h1>
      <p class="tagline">Three lanes. One ink a turn. Bring the pain.</p>
      <div class="menu-btns">
        <button class="btn big primary" data-go="quick">⚔️ Quick Battle <small>${rec.w}W · ${rec.l}L</small></button>
        <button class="btn big gold" data-go="gauntlet">🏆 Gauntlet <small>${run ? `Continue · battle ${run.floor + 1}/${FLOORS}` : best.crowns ? `👑 × ${best.crowns}` : best.floors ? `Best: ${best.floors}/${FLOORS}` : 'Roguelike run'}</small></button>
        <button class="btn big" data-go="hotseat">👥 Pass &amp; Play</button>
        <button class="btn big" data-go="howto">📖 How to Play</button>
        <button class="btn big" data-go="cards">🃏 Card Gallery</button>
      </div>
      <button class="icon-btn mute-corner" data-go="mute">${isMuted() ? '🔇' : '🔊'}</button>
    </div>`, {
    quick: () => showQuickSetup(),
    gauntlet: () => (run ? showGauntletMap(run) : showGauntletStart()),
    hotseat: () => showHotseatSetup(),
    howto: () => showHowTo(),
    cards: () => showGallery(),
    mute: () => {
      setMuted(!isMuted());
      showMenu();
    },
  });
}

function factionTiles(selected: DeckFaction | null, group: string): string {
  const tiles = DECK_IDS.map(id => {
    const d = DECKS[id];
    return `
      <button class="faction-tile ${selected === id ? 'selected' : ''}" data-go="${group}" data-val="${id}" style="--fc:${d.color}">
        <span class="ft-art">${d.art}</span>
        <b>${d.name}</b>
        <small>${d.blurb}</small>
      </button>`;
  });
  return `<div class="faction-grid">${tiles.join('')}</div>`;
}

// ---------------------------------------------------------------------------
// Quick battle
// ---------------------------------------------------------------------------

let quickChoice: { me: DeckFaction; foe: DeckFaction | 'random'; diff: Difficulty } = { me: 'Ember', foe: 'random', diff: 'normal' };

function showQuickSetup() {
  const q = quickChoice;
  screen(`
    <div class="setup">
      <button class="back" data-go="back">‹ Back</button>
      <h2>Your deck</h2>
      ${factionTiles(q.me, 'me')}
      <h2>Opponent</h2>
      <div class="seg">
        ${(['random', ...DECK_IDS] as (DeckFaction | 'random')[]).map(f =>
          `<button class="${q.foe === f ? 'on' : ''}" data-go="foe" data-val="${f}">${f === 'random' ? '🎲 Random' : `${DECKS[f].art} ${f}`}</button>`).join('')}
      </div>
      <h2>Difficulty</h2>
      <div class="seg">
        ${(['easy', 'normal', 'hard'] as Difficulty[]).map(d =>
          `<button class="${q.diff === d ? 'on' : ''}" data-go="diff" data-val="${d}">${{ easy: '😊 Easy', normal: '😤 Normal', hard: '😈 Hard' }[d]}</button>`).join('')}
      </div>
      <button class="btn big primary sticky-go" data-go="start">Battle! ⚔️</button>
    </div>`, {
    back: () => showMenu(),
    me: el => { q.me = el.dataset.val as DeckFaction; showQuickSetup(); },
    foe: el => { q.foe = el.dataset.val as DeckFaction | 'random'; showQuickSetup(); },
    diff: el => { q.diff = el.dataset.val as Difficulty; showQuickSetup(); },
    start: () => startQuick(),
  });
}

function startQuick() {
  const q = quickChoice;
  const foe = q.foe === 'random' ? pick(DECK_IDS) : q.foe;
  const rival = pick(RIVALS[foe]);
  const battle = new Battle(app(), {
    decks: [DECKS[q.me].cards, DECKS[foe].cards],
    factions: [q.me, foe],
    names: ['You', rival.name],
    mode: 'ai',
    difficulty: q.diff,
    onExit: () => showMenu(),
    onResult: winner => {
      addRecord(winner === 0);
      return {
        title: winner === 0 ? 'Victory!' : 'Defeat',
        subtitle: winner === 0 ? `${rival.name} is toast.` : `"${rival.taunt}"`,
        actions: [
          { label: '🔁 Rematch', primary: true, run: () => startQuick() },
          { label: 'Change decks', run: () => showQuickSetup() },
          { label: 'Menu', run: () => showMenu() },
        ],
      };
    },
  });
  void battle.start();
}

// ---------------------------------------------------------------------------
// Pass & play
// ---------------------------------------------------------------------------

const hotseat: { p1: DeckFaction; p2: DeckFaction } = { p1: 'Ember', p2: 'Tide' };

function showHotseatSetup() {
  screen(`
    <div class="setup">
      <button class="back" data-go="back">‹ Back</button>
      <h2>Player 1</h2>
      ${factionTiles(hotseat.p1, 'p1')}
      <h2>Player 2</h2>
      ${factionTiles(hotseat.p2, 'p2')}
      <button class="btn big primary sticky-go" data-go="start">Start ⚔️</button>
    </div>`, {
    back: () => showMenu(),
    p1: el => { hotseat.p1 = el.dataset.val as DeckFaction; showHotseatSetup(); },
    p2: el => { hotseat.p2 = el.dataset.val as DeckFaction; showHotseatSetup(); },
    start: () => startHotseat(),
  });
}

function startHotseat() {
  const battle = new Battle(app(), {
    decks: [DECKS[hotseat.p1].cards, DECKS[hotseat.p2].cards],
    factions: [hotseat.p1, hotseat.p2],
    names: ['Player 1', 'Player 2'],
    mode: 'hotseat',
    onExit: () => showMenu(),
    onResult: winner => ({
      title: `Player ${winner + 1} wins!`,
      subtitle: 'Good game.',
      actions: [
        { label: '🔁 Rematch', primary: true, run: () => startHotseat() },
        { label: 'Menu', run: () => showMenu() },
      ],
    }),
  });
  void battle.start();
}

// ---------------------------------------------------------------------------
// Gauntlet
// ---------------------------------------------------------------------------

function showGauntletStart() {
  const best = loadBest();
  screen(`
    <div class="setup">
      <button class="back" data-go="back">‹ Back</button>
      <h1 class="screen-title">🏆 The Gauntlet</h1>
      <p class="lede">Beat ${FLOORS} rivals in a row. After every win, add a new card to your deck. One loss and the run is over.
      ${best.floors ? `<br><b>Best: ${best.floors}/${FLOORS}${best.crowns ? ` · 👑 × ${best.crowns}` : ''}</b>` : ''}</p>
      <h2>Choose your starting deck</h2>
      ${factionTiles(null, 'pick')}
    </div>`, {
    back: () => showMenu(),
    pick: el => {
      const run = newRun(el.dataset.val as DeckFaction);
      saveRun(run);
      showGauntletMap(run);
    },
  });
}

function showGauntletMap(run: RunState) {
  if (run.reward) return showReward(run);
  const next = run.opponents[run.floor];
  const nodes = run.opponents.map((o, i) => {
    const state = i < run.floor ? 'done' : i === run.floor ? 'current' : 'locked';
    return `
      <div class="floor ${state} ${o.boss ? 'boss' : ''}" style="--fc:${DECKS[o.faction].color}">
        <span class="floor-num">${i < run.floor ? '✓' : i + 1}</span>
        <span class="floor-art">${o.boss ? '👑' : DECKS[o.faction].art}</span>
        <span class="floor-name">${o.name}<small>${o.difficulty}${o.boss ? ` · ${o.life} life` : ''}</small></span>
      </div>`;
  }).reverse().join('');
  screen(`
    <div class="setup gauntlet">
      <button class="back" data-go="back">‹ Menu</button>
      <h1 class="screen-title">🏆 Gauntlet</h1>
      <div class="ladder">${nodes}</div>
      <div class="next-up" style="--fc:${DECKS[next.faction].color}">
        <div class="nu-art">${DECKS[next.faction].art}</div>
        <div><b>${next.name}</b><p>"${next.taunt}"</p></div>
      </div>
      <div class="row-btns">
        <button class="btn" data-go="deck">🃏 Your deck (${run.deck.length})</button>
        <button class="btn danger" data-go="abandon">Abandon</button>
      </div>
      <button class="btn big primary sticky-go" data-go="fight">Fight! ⚔️</button>
    </div>`, {
    back: () => showMenu(),
    deck: () => showDeck(run, () => showGauntletMap(run)),
    abandon: () => {
      if (confirm('Abandon this run?')) {
        recordBest(run.floor, false);
        saveRun(null);
        showMenu();
      }
    },
    fight: () => startGauntletBattle(run),
  });
}

function startGauntletBattle(run: RunState) {
  const o = run.opponents[run.floor];
  const battle = new Battle(app(), {
    decks: [run.deck, [...DECKS[o.faction].cards, ...o.extra]],
    factions: [run.faction, o.faction],
    names: ['You', o.name],
    mode: 'ai',
    difficulty: o.difficulty,
    life: [RULES.startingLife, o.life],
    title: `Gauntlet ${run.floor + 1}/${FLOORS}`,
    onExit: () => {
      // Quitting a gauntlet battle counts as a loss.
      recordBest(run.floor, false);
      saveRun(null);
      showMenu();
    },
    onResult: winner => {
      if (winner === 0) {
        run.floor++;
        if (run.floor >= FLOORS) {
          recordBest(FLOORS, true);
          saveRun(null);
          return {
            title: '👑 Champion!',
            subtitle: `You conquered the Gauntlet with ${DECKS[run.faction].name}!`,
            actions: [{ label: 'Bask in glory', primary: true, run: () => showChampion(run) }],
          };
        }
        recordBest(run.floor, false);
        run.reward = rollRewards(run);
        saveRun(run);
        return {
          title: 'Victory!',
          subtitle: `${o.name} falls. ${FLOORS - run.floor} to go.`,
          actions: [{ label: 'Claim reward 🎁', primary: true, run: () => showReward(run) }],
        };
      }
      recordBest(run.floor, false);
      saveRun(null);
      return {
        title: 'Run over',
        subtitle: `You cleared ${run.floor} of ${FLOORS}. "${o.taunt}"`,
        actions: [
          { label: 'New run', primary: true, run: () => showGauntletStart() },
          { label: 'Menu', run: () => showMenu() },
        ],
      };
    },
  });
  void battle.start();
}

function showReward(run: RunState) {
  const offers = run.reward ?? [];
  const trim = run.floor % 2 === 0;
  sfx('reward');
  screen(`
    <div class="setup reward">
      <h1 class="screen-title">🎁 Choose a card</h1>
      <p class="lede">Add one to your deck${trim ? ' — then you may remove a card' : ''}.</p>
      <div class="offers">
        ${offers.map(id => `<button class="offer" data-go="take" data-val="${id}">${bigCardHtml(id)}</button>`).join('')}
      </div>
      <button class="btn" data-go="skip">Skip</button>
    </div>`, {
    take: el => {
      run.deck.push(el.dataset.val!);
      afterReward(run, trim);
    },
    skip: () => afterReward(run, trim),
  });
}

function afterReward(run: RunState, trim: boolean) {
  run.reward = undefined;
  saveRun(run);
  if (trim) showRemove(run);
  else showGauntletMap(run);
}

function showRemove(run: RunState) {
  const sorted = run.deck.map((id, i) => ({ id, i })).sort((a, b) => card(a.id).cost - card(b.id).cost || a.id.localeCompare(b.id));
  screen(`
    <div class="setup">
      <h1 class="screen-title">✂️ Trim your deck</h1>
      <p class="lede">Tap a card to remove it, or keep everything.</p>
      <div class="deck-list">${sorted.map(({ id, i }) => `<button class="deck-entry" data-go="remove" data-val="${i}">${miniCardHtml(id)}</button>`).join('')}</div>
      <button class="btn big primary sticky-go" data-go="keep">Keep all</button>
    </div>`, {
    remove: el => {
      run.deck.splice(Number(el.dataset.val), 1);
      saveRun(run);
      showGauntletMap(run);
    },
    keep: () => showGauntletMap(run),
  });
}

function showDeck(run: RunState, back: () => void) {
  const sorted = [...run.deck].sort((a, b) => card(a).cost - card(b).cost || a.localeCompare(b));
  screen(`
    <div class="setup">
      <button class="back" data-go="back">‹ Back</button>
      <h1 class="screen-title">Your deck · ${run.deck.length}</h1>
      <div class="deck-list">${sorted.map(id => miniCardHtml(id)).join('')}</div>
    </div>`, { back });
}

function showChampion(run: RunState) {
  confetti(150);
  screen(`
    <div class="menu champion">
      <div class="crown">👑</div>
      <h1 class="logo">CHAMPION</h1>
      <p class="tagline">${DECKS[run.faction].name} rules the lanes.</p>
      <div class="menu-btns">
        <button class="btn big gold" data-go="again">Run it back 🏆</button>
        <button class="btn big" data-go="menu">Menu</button>
      </div>
    </div>`, {
    again: () => showGauntletStart(),
    menu: () => showMenu(),
  });
}

// ---------------------------------------------------------------------------
// How to play & gallery
// ---------------------------------------------------------------------------

function showHowTo() {
  const kws = (Object.keys(KEYWORD_INFO) as Keyword[]).map(k => `<li>${KEYWORD_INFO[k].icon} ${KEYWORD_INFO[k].text}</li>`).join('');
  const terrains = TERRAINS.map(t => `<li>${t.art} <b>${t.name}</b> — ${t.text}</li>`).join('');
  screen(`
    <div class="setup howto">
      <button class="back" data-go="back">‹ Back</button>
      <h1 class="screen-title">📖 How to Play</h1>
      <div class="rule"><span>❤️</span><p>Knock the enemy hero from <b>${RULES.startingLife}</b> life to <b>0</b>.</p></div>
      <div class="rule"><span>💧</span><p>Once per turn, <b>ink</b> a card from your hand: it's gone, but you get +1 permanent ink. Cards marked ✨ do something extra when inked. 🚫 cards can't be inked.</p></div>
      <div class="rule"><span>🃏</span><p>Spend ink to play creatures into your <b>3 lanes</b> and cast spells. Playing onto your own creature <b>replaces</b> it (and triggers its death effects).</p></div>
      <div class="rule"><span>⚔️</span><p>Hit <b>FIGHT</b>: each of your creatures attacks the lane opposite. If an enemy is there they trade blows; if not, the enemy hero takes the hit. Defenders strike back but only attack on their own turn.</p></div>
      <div class="rule"><span>🔮</span><p>The FIGHT button and 💀 marks <b>preview</b> what combat will do. Tap any card, creature or terrain to read it.</p></div>
      <div class="rule"><span>🗺️</span><p>Every battle deals <b>3 random terrains</b>, one per lane. They change everything.</p></div>
      <div class="rule"><span>🌩️</span><p>From round ${RULES.stormRound} the <b>Storm</b> hits each hero at the start of their turn, harder every round.</p></div>
      <div class="rule"><span>⚖️</span><p>Going second? You start with an extra card. The first player skips their first draw.</p></div>
      <h2>Keywords</h2><ul class="kw-list">${kws}</ul>
      <h2>Terrains</h2><ul class="kw-list">${terrains}</ul>
    </div>`, { back: () => showMenu() });
}

function showGallery(filter: DeckFaction | 'Neutral' = 'Ember') {
  const groups: (DeckFaction | 'Neutral')[] = [...DECK_IDS, 'Neutral'];
  const cards = Object.values(DECKS).flatMap(d => d.cards);
  const pool = [...new Set(filter === 'Neutral'
    ? ['sentinel', 'merchant', 'banner', 'cleric', 'ogre', 'knight', 'assassin', 'warchief', 'dragon']
    : cards.filter(id => card(id).faction === filter))];
  screen(`
    <div class="setup">
      <button class="back" data-go="back">‹ Back</button>
      <h1 class="screen-title">🃏 Cards</h1>
      <div class="seg">${groups.map(g => `<button class="${g === filter ? 'on' : ''}" data-go="tab" data-val="${g}">${g === 'Neutral' ? '⚔️' : DECKS[g].art} ${g}</button>`).join('')}</div>
      <div class="gallery">${pool.sort((a, b) => card(a).cost - card(b).cost).map(id => bigCardHtml(id)).join('')}</div>
    </div>`, {
    back: () => showMenu(),
    tab: el => showGallery(el.dataset.val as DeckFaction | 'Neutral'),
  });
}
