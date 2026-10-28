import { card } from '../data/cards';
import { DECKS, FACTION_COLORS } from '../data/decks';
import { terrain } from '../data/terrains';
import { chooseAction, Difficulty } from '../engine/ai';
import { Game, RULES } from '../engine/Game';
import { Faction, GameEvent, PlayerIndex, UnitRef } from '../model/types';
import { isMuted, setMuted, sfx, vibrate } from './audio';
import { bigCardHtml, handCardHtml, terrainHtml, unitHtml } from './cardView';
import { banner, beat, burst, confetti, floatText, pulse, shake, toast } from './fx';
import { getSpeed, toggleSpeed } from './settings';

export interface ResultAction {
  label: string;
  primary?: boolean;
  run: () => void;
}

export interface BattleConfig {
  decks: [string[], string[]];
  factions: [Faction, Faction];
  names: [string, string];
  mode: 'ai' | 'hotseat';
  difficulty?: Difficulty;
  life?: [number, number];
  /** Shown in the top bar, e.g. "Gauntlet · Battle 3". */
  title?: string;
  onExit(): void;
  onResult(winner: PlayerIndex, game: Game): { title: string; subtitle: string; actions: ResultAction[] };
}

type Overlay =
  | { kind: 'inspect-card'; id: string; uid?: number }
  | { kind: 'inspect-terrain'; lane: number }
  | { kind: 'pause' }
  | { kind: 'log' }
  | { kind: 'curtain' }
  | { kind: 'result'; title: string; subtitle: string; actions: ResultAction[]; won: boolean }
  | null;

const factionArt = (f: Faction) => (f === 'Neutral' ? '⚔️' : DECKS[f].art);

export class Battle {
  game: Game;
  private el: HTMLElement;
  private viewer: PlayerIndex = 0;
  private selected: number | null = null;
  private busy = false;
  private overlay: Overlay = null;
  private seenHand = 0;
  private resultActions: ResultAction[] = [];

  constructor(root: HTMLElement, private cfg: BattleConfig) {
    const first: PlayerIndex = Math.random() < 0.5 ? 0 : 1;
    this.game = Game.create({ decks: cfg.decks, firstPlayer: first, life: cfg.life });
    this.game.events.length = 0;
    this.viewer = cfg.mode === 'hotseat' ? first : 0;
    this.el = document.createElement('div');
    this.el.className = 'battle-host';
    root.replaceChildren(this.el);
    this.el.addEventListener('click', e => this.onClick(e));
  }

  async start() {
    this.seenHand = this.me.hand.length;
    if (this.cfg.mode === 'hotseat') {
      this.overlay = { kind: 'curtain' };
      this.render();
      return;
    }
    this.render();
    const first = this.game.state.firstPlayer;
    banner(first === 0 ? 'You go first!' : 'Enemy goes first', first === 0 ? 'you' : 'foe', 1200);
    if (first !== 0) toast(`Going second: you start with +${RULES.secondPlayerExtraCards} card`);
    sfx('turn');
    await beat(1300);
    if (this.isAiTurn) await this.runAi();
  }

  // ---------------------------------------------------------------------------
  // State helpers
  // ---------------------------------------------------------------------------

  private get foe(): PlayerIndex {
    return this.viewer === 0 ? 1 : 0;
  }

  private get me() {
    return this.game.player(this.viewer);
  }

  private get isAiTurn() {
    return this.cfg.mode === 'ai' && this.game.active === 1 && !this.game.over;
  }

  private get myTurn() {
    return !this.game.over && this.game.active === this.viewer && !this.busy;
  }

  private selectedCard() {
    return this.selected === null ? null : card(this.me.hand[this.selected]);
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  render() {
    const g = this.game;
    const fc = this.forecast();
    this.el.innerHTML = `
      <div class="battle ${this.busy ? 'busy' : ''} ${g.active === this.viewer ? 'my-turn' : 'foe-turn'}">
        ${this.topBar()}
        ${this.heroRow(this.foe, fc.heroDmg)}
        <div class="field">${[0, 1, 2].map(l => this.laneHtml(l, fc.doomed)).join('')}</div>
        <div class="dock">${this.dockHtml(fc.heroDmg)}</div>
        <div class="hint">${this.hint()}</div>
        <div class="hand">${this.handHtml()}</div>
        ${this.overlayHtml()}
      </div>`;
    this.seenHand = this.me.hand.length;
  }

  private topBar(): string {
    const s = this.game.state;
    const stormIn = RULES.stormRound - s.round;
    const storm = stormIn > 0
      ? `<span class="storm-meter" title="The Storm hits both heroes from round ${RULES.stormRound}">🌩️ in ${stormIn}</span>`
      : `<span class="storm-meter raging">🌩️ ${s.round - RULES.stormRound + 1} dmg/turn</span>`;
    return `
      <div class="topbar">
        <button class="icon-btn" data-act="pause" aria-label="Menu">☰</button>
        <div class="round"><b>Round ${s.round}</b>${this.cfg.title ? `<small>${this.cfg.title}</small>` : ''}</div>
        ${storm}
        <button class="icon-btn" data-act="speed" aria-label="Animation speed">${getSpeed() > 1 ? '⏩' : '▶️'}</button>
        <button class="icon-btn" data-act="mute" aria-label="Sound">${isMuted() ? '🔇' : '🔊'}</button>
      </div>`;
  }

  private heroRow(p: PlayerIndex, incoming: number): string {
    const pl = this.game.player(p);
    const lethal = incoming >= pl.life && incoming > 0;
    const ink = this.game.availableInk(p);
    return `
      <div class="hero foe-hero ${this.game.active === p ? 'active' : ''}" data-hero="${p}" style="--fc:${FACTION_COLORS[this.cfg.factions[p]]}">
        <div class="portrait">${factionArt(this.cfg.factions[p])}</div>
        <div class="hero-info">
          <div class="hero-name">${this.cfg.names[p]}</div>
          <div class="hero-sub"><span title="Cards in hand">🂠 ${pl.hand.length}</span><span title="Cards in deck">📚 ${pl.deck.length}</span><span class="ink-pill" title="Ink">💧 ${this.game.active === p ? `${ink}/` : ''}${pl.ink}</span></div>
        </div>
        <div class="life ${pl.life <= 5 ? 'low' : ''}" title="Life">❤️<b>${pl.life}</b>${incoming > 0 && this.myTurn ? `<span class="incoming ${lethal ? 'lethal' : ''}">-${incoming}</span>` : ''}</div>
      </div>`;
  }

  private laneHtml(lane: number, doomed: Set<number>): string {
    const t = terrain(this.game.state.terrains[lane]);
    return `
      <div class="lane-col" data-lane="${lane}">
        ${this.slotHtml(this.foe, lane, doomed)}
        <button class="terrain-chip" data-terrain="${lane}"><span>${t.art}</span><small>${t.name}</small></button>
        ${this.slotHtml(this.viewer, lane, doomed)}
      </div>`;
  }

  private slotHtml(p: PlayerIndex, lane: number, doomed: Set<number>): string {
    const g = this.game;
    const u = g.player(p).lanes[lane];
    const sel = this.selectedCard();
    let cls = '';
    let label = '';
    if (this.myTurn && sel && this.selected !== null && p === this.viewer && sel.type === 'creature' && g.canAfford(this.selected)) {
      if (g.canPlayInLane(this.selected, lane)) {
        cls = u ? 'droppable replace' : 'droppable';
        label = u ? '<div class="drop-label">Replace</div>' : '<div class="drop-label">Play here</div>';
      } else {
        cls = 'blocked';
        label = '<div class="drop-label">Too costly here</div>';
      }
    }
    const targetable = !!(this.myTurn && sel && sel.type === 'spell' && this.selected !== null && g.canAfford(this.selected) &&
      g.validTargets(this.selected).some(r => r.player === p && r.lane === lane));
    return `
      <div class="slot ${p === this.viewer ? 'my-slot' : 'foe-slot'} ${cls}" data-slot="${p}-${lane}">
        ${u ? unitHtml(g.view(u), { targetable, doomed: doomed.has(u.uid) && !sel }) : '<div class="empty-slot"></div>'}
        ${label}
      </div>`;
  }

  private dockHtml(foeIncoming: number): string {
    const g = this.game;
    const pl = this.me;
    const sel = this.selectedCard();
    const hero = `
      <div class="hero my-hero ${g.active === this.viewer ? 'active' : ''}" data-hero="${this.viewer}" style="--fc:${FACTION_COLORS[this.cfg.factions[this.viewer]]}">
        <div class="portrait">${factionArt(this.cfg.factions[this.viewer])}</div>
        <div class="life ${pl.life <= 5 ? 'low' : ''}">❤️<b>${pl.life}</b></div>
        <div class="ink-pips" title="Ink available / total">${this.inkPips()}</div>
      </div>`;

    if (sel && this.selected !== null) {
      const i = this.selected;
      const afford = g.canAfford(i);
      const btns: string[] = [];
      if (g.canInk(i)) btns.push(`<button class="btn ink-btn" data-act="ink">💧 Ink it${card(pl.hand[i]).onInk ? ' ✨' : ''}</button>`);
      if (sel.type === 'spell' && (sel.target ?? 'none') === 'none' && afford) btns.push(`<button class="btn primary" data-act="cast">✨ Cast</button>`);
      btns.push(`<button class="btn ghost" data-act="deselect">✕</button>`);
      return `
        ${hero}
        <div class="dock-card" style="--fc:${FACTION_COLORS[sel.faction]}">
          <button class="dock-info" data-act="inspect-selected">
            <span class="dc-art">${sel.art}</span>
            <span class="dc-body">
              <b>${sel.name}</b> <i class="dc-cost">💧${sel.cost}</i>
              <small>${sel.type === 'creature' ? `⚔${sel.power} ❤${sel.life} ` : ''}${sel.keywords.join(', ')}${sel.keywords.length && sel.text ? ' · ' : ''}${sel.text}</small>
            </span>
          </button>
          <div class="dock-btns">${btns.join('')}</div>
        </div>`;
    }

    const lethal = foeIncoming >= g.player(this.foe).life && foeIncoming > 0;
    const canFight = this.myTurn;
    return `
      ${hero}
      <button class="fight-btn ${canFight ? '' : 'disabled'} ${lethal ? 'lethal' : ''} ${canFight && !this.hasUsefulMoves() ? 'nudge' : ''}" data-act="fight">
        <span>${lethal ? 'LETHAL!' : 'FIGHT'}</span>
        <small>${canFight ? (foeIncoming > 0 ? `⚔ ${foeIncoming} to face` : 'end turn') : this.game.over ? '' : 'enemy turn'}</small>
      </button>`;
  }

  private inkPips(): string {
    const pl = this.me;
    const avail = this.game.active === this.viewer ? this.game.availableInk(this.viewer) : pl.ink + pl.bonusInk;
    const total = Math.max(pl.ink + pl.bonusInk, avail);
    let s = '';
    for (let i = 0; i < total; i++) s += `<i class="${i < avail ? 'full' : ''}"></i>`;
    return `${s || '<em>no ink</em>'}<b>${avail}</b>`;
  }

  private hasUsefulMoves(): boolean {
    const g = this.game;
    if (!this.me.hasInked && this.me.hand.some((_, i) => g.canInk(i))) return true;
    return g.legalActions().some(a => a.type === 'play');
  }

  private hint(): string {
    const g = this.game;
    if (g.over) return '';
    if (this.busy && this.isAiTurn) return '<span class="thinking">Enemy is thinking<i>.</i><i>.</i><i>.</i></span>';
    if (this.busy) return '';
    if (g.active !== this.viewer) return '';
    const sel = this.selectedCard();
    if (sel && this.selected !== null) {
      if (!g.canAfford(this.selected)) return `Need ${sel.cost} 💧 to play this${g.canInk(this.selected) ? ' — or ink it' : ''}`;
      if (sel.type === 'creature') return 'Tap one of <b>your lanes</b> to play it';
      if ((sel.target ?? 'none') !== 'none') {
        return g.validTargets(this.selected).length ? 'Tap a <b>glowing creature</b> to target it' : 'No valid targets';
      }
      return 'Tap <b>Cast</b> to play it';
    }
    if (!this.me.hasInked && this.me.hand.some((_, i) => g.canInk(i)) && this.me.ink < 6) {
      return '💧 Tap a card and <b>Ink it</b> to grow your ink (1 per turn)';
    }
    if (g.legalActions().some(a => a.type === 'play')) return 'Tap a glowing card to play it';
    return 'All set — hit <b>FIGHT</b>!';
  }

  private handHtml(): string {
    const g = this.game;
    const pl = this.me;
    if (this.overlay?.kind === 'curtain') return '';
    return pl.hand
      .map((id, i) => {
        const c = card(id);
        const playable = this.myTurn && g.canAfford(i) &&
          (c.type === 'creature'
            ? [0, 1, 2].some(l => g.canPlayInLane(i, l))
            : (c.target ?? 'none') === 'none' || g.validTargets(i).length > 0);
        let html = handCardHtml(id, i, { playable, selected: this.selected === i, total: pl.hand.length });
        if (i >= this.seenHand) html = html.replace('class="hand-card', 'class="hand-card drawn');
        return html;
      })
      .join('');
  }

  private overlayHtml(): string {
    const o = this.overlay;
    if (!o) return '';
    const g = this.game;
    switch (o.kind) {
      case 'inspect-card': {
        const u = o.uid !== undefined ? [...g.unitsOf(0), ...g.unitsOf(1)].find(x => x.uid === o.uid) : undefined;
        return `<div class="overlay" data-act="close"><div class="overlay-inner">${bigCardHtml(o.id, u ? g.view(u) : undefined)}<p class="tap-close">Tap anywhere to close</p></div></div>`;
      }
      case 'inspect-terrain':
        return `<div class="overlay" data-act="close"><div class="overlay-inner">${terrainHtml(terrain(g.state.terrains[o.lane]))}<p class="tap-close">Tap anywhere to close</p></div></div>`;
      case 'pause':
        return `
          <div class="overlay"><div class="panel">
            <h2>Paused</h2>
            <button class="btn primary" data-act="close">Resume</button>
            <button class="btn" data-act="log">📜 Battle log</button>
            <button class="btn danger" data-act="quit">🏳️ Concede &amp; quit</button>
          </div></div>`;
      case 'log': {
        const rows = g.log.slice(-60).reverse().map(l =>
          `<div class="log-row p${l.p === this.viewer ? 'me' : 'foe'}"><small>R${l.round}</small> <b>${this.cfg.names[l.p]}</b> ${l.text}</div>`).join('');
        return `<div class="overlay"><div class="panel log-panel"><h2>Battle log</h2><div class="log-list">${rows || '<p>Nothing yet.</p>'}</div><button class="btn primary" data-act="close">Close</button></div></div>`;
      }
      case 'curtain':
        return `
          <div class="overlay curtain" data-act="reveal"><div class="panel">
            <div class="curtain-art">${factionArt(this.cfg.factions[g.active])}</div>
            <h2>${this.cfg.names[g.active]}'s turn</h2>
            <p>Pass the device, then tap to reveal your hand.</p>
            <button class="btn primary">I'm ready</button>
          </div></div>`;
      case 'result':
        return `
          <div class="overlay result ${o.won ? 'won' : 'lost'}"><div class="panel">
            <h1>${o.title}</h1>
            <p>${o.subtitle}</p>
            <div class="result-btns">${o.actions.map((a, i) => `<button class="btn ${a.primary ? 'primary' : ''}" data-result="${i}">${a.label}</button>`).join('')}</div>
          </div></div>`;
    }
  }

  /** Predict this turn's combat so the player can see what FIGHT will do. */
  private forecast(): { heroDmg: number; doomed: Set<number> } {
    const g = this.game;
    const none = { heroDmg: 0, doomed: new Set<number>() };
    if (g.over || g.active !== this.viewer) return none;
    const c = g.clone();
    const before = c.player(this.foe).life;
    const uids = [...c.unitsOf(0), ...c.unitsOf(1)].map(u => u.uid);
    c.fight();
    if (!c.over) c.endOfTurn();
    const alive = new Set([...c.unitsOf(0), ...c.unitsOf(1)].map(u => u.uid));
    return { heroDmg: Math.max(0, before - c.player(this.foe).life), doomed: new Set(uids.filter(u => !alive.has(u))) };
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private onClick(e: MouseEvent) {
    const t = e.target as HTMLElement;
    const resultBtn = t.closest<HTMLElement>('[data-result]');
    if (resultBtn) {
      sfx('click');
      this.resultActions[Number(resultBtn.dataset.result)]?.run();
      return;
    }
    const actEl = t.closest<HTMLElement>('[data-act]');
    if (actEl) {
      this.onAct(actEl.dataset.act!);
      return;
    }
    if (this.overlay) return;

    const terrainEl = t.closest<HTMLElement>('[data-terrain]');
    if (terrainEl) {
      sfx('click');
      this.overlay = { kind: 'inspect-terrain', lane: Number(terrainEl.dataset.terrain) };
      this.render();
      return;
    }

    const handEl = t.closest<HTMLElement>('[data-hand]');
    if (handEl) {
      const i = Number(handEl.dataset.hand);
      if (!this.myTurn) {
        this.overlay = { kind: 'inspect-card', id: this.me.hand[i] };
      } else {
        this.selected = this.selected === i ? null : i;
        sfx('select');
      }
      this.render();
      return;
    }

    const unitEl = t.closest<HTMLElement>('.unit');
    const slotEl = t.closest<HTMLElement>('[data-slot]');
    if (unitEl && unitEl.classList.contains('targetable') && this.selected !== null) {
      const target: UnitRef = { player: Number(unitEl.dataset.owner) as PlayerIndex, lane: Number(unitEl.dataset.lane) };
      const i = this.selected;
      void this.act(() => this.game.play(i, undefined, target));
      return;
    }
    if (slotEl && slotEl.classList.contains('droppable') && this.selected !== null) {
      const lane = Number(slotEl.dataset.slot!.split('-')[1]);
      const i = this.selected;
      void this.act(() => this.game.play(i, lane));
      return;
    }
    if (unitEl) {
      const uid = Number(unitEl.dataset.uid);
      const u = [...this.game.unitsOf(0), ...this.game.unitsOf(1)].find(x => x.uid === uid);
      if (u) {
        sfx('click');
        this.overlay = { kind: 'inspect-card', id: u.cardId, uid };
        this.render();
      }
      return;
    }
    if (slotEl && this.selected !== null) {
      sfx('error');
      return;
    }
    if (this.selected !== null && !t.closest('.dock')) {
      this.selected = null;
      this.render();
    }
  }

  private onAct(act: string) {
    switch (act) {
      case 'close':
        this.overlay = null;
        this.render();
        return;
      case 'pause':
        sfx('click');
        this.overlay = { kind: 'pause' };
        this.render();
        return;
      case 'log':
        this.overlay = { kind: 'log' };
        this.render();
        return;
      case 'quit':
        this.cfg.onExit();
        return;
      case 'mute':
        setMuted(!isMuted());
        sfx('click');
        this.render();
        return;
      case 'speed':
        toggleSpeed();
        sfx('click');
        this.render();
        return;
      case 'reveal':
        this.overlay = null;
        this.viewer = this.game.active;
        this.seenHand = this.me.hand.length;
        this.render();
        banner(`${this.cfg.names[this.viewer]}`, 'you', 900);
        sfx('turn');
        return;
      case 'deselect':
        this.selected = null;
        this.render();
        return;
      case 'inspect-selected':
        if (this.selected !== null) {
          this.overlay = { kind: 'inspect-card', id: this.me.hand[this.selected] };
          this.render();
        }
        return;
    }
    if (!this.myTurn) return;
    const i = this.selected;
    switch (act) {
      case 'ink':
        if (i !== null) void this.act(() => this.game.ink(i));
        return;
      case 'cast':
        if (i !== null) void this.act(() => this.game.play(i));
        return;
      case 'fight':
        this.selected = null;
        void this.act(() => this.game.endTurn());
        return;
    }
  }

  private async act(fn: () => boolean) {
    if (this.busy) return;
    const before = this.game.events.length;
    if (!fn()) {
      sfx('error');
      return;
    }
    this.busy = true;
    this.selected = null;
    // Update hand + dock immediately so the played card leaves the hand, but
    // keep the field as-is so the events can animate on it.
    this.refreshChrome();
    await this.playEvents(this.game.events.slice(before));
    this.busy = false;
    this.render();
    await this.afterAction();
  }

  private async afterAction() {
    if (this.game.over) return this.finish();
    if (this.isAiTurn) return this.runAi();
    if (this.cfg.mode === 'hotseat' && this.game.active !== this.viewer) {
      this.overlay = { kind: 'curtain' };
      this.render();
    }
  }

  private refreshChrome() {
    const hand = this.el.querySelector('.hand');
    if (hand) {
      this.seenHand = this.me.hand.length;
      hand.innerHTML = this.handHtml();
    }
    const hint = this.el.querySelector('.hint');
    if (hint) hint.innerHTML = '';
    const dockBtns = this.el.querySelector('.dock-card, .fight-btn');
    if (dockBtns) dockBtns.remove();
    this.el.querySelectorAll('.droppable, .targetable, .blocked').forEach(x => x.classList.remove('droppable', 'targetable', 'blocked', 'replace'));
    this.el.querySelectorAll('.drop-label, .incoming, .doom').forEach(x => x.remove());
    this.updateInk();
  }

  private updateInk() {
    const pips = this.el.querySelector('.ink-pips');
    if (pips) pips.innerHTML = this.inkPips();
    const foePill = this.el.querySelector(`[data-hero="${this.foe}"] .ink-pill`);
    if (foePill) {
      const pl = this.game.player(this.foe);
      foePill.textContent = `💧 ${this.game.active === this.foe ? `${this.game.availableInk(this.foe)}/` : ''}${pl.ink}`;
    }
  }

  // ---------------------------------------------------------------------------
  // AI
  // ---------------------------------------------------------------------------

  private async runAi() {
    this.busy = true;
    this.render();
    await beat(600);
    let guard = 0;
    while (this.isAiTurn && guard++ < 40) {
      const before = this.game.events.length;
      const a = chooseAction(this.game, this.cfg.difficulty ?? 'normal');
      this.game.apply(a);
      await this.playEvents(this.game.events.slice(before));
      this.render();
      await beat(a.type === 'end' ? 100 : 450);
    }
    this.busy = false;
    this.render();
    if (this.game.over) await this.finish();
  }

  // ---------------------------------------------------------------------------
  // Animation
  // ---------------------------------------------------------------------------

  private unitEl(uid: number): HTMLElement | null {
    return this.el.querySelector(`.unit[data-uid="${uid}"]`);
  }

  private heroEl(p: PlayerIndex): HTMLElement | null {
    return this.el.querySelector(`[data-hero="${p}"] .life`);
  }

  private async playEvents(events: GameEvent[]) {
    for (const e of events) await this.animate(e);
  }

  private async animate(e: GameEvent) {
    const g = this.game;
    switch (e.t) {
      case 'turnStart': {
        const round = this.el.querySelector('.round b');
        if (round) round.textContent = `Round ${e.round}`;
        if (this.cfg.mode === 'hotseat') return;
        const mine = e.p === this.viewer;
        banner(mine ? 'Your turn' : 'Enemy turn', mine ? 'you' : 'foe', 800);
        sfx('turn');
        await beat(mine ? 700 : 500);
        return;
      }
      case 'play': {
        if (e.p === this.viewer && this.cfg.mode === 'ai') {
          sfx(card(e.cardId).type === 'spell' ? 'spell' : 'click');
          return;
        }
        await this.reveal(e.cardId, e.p);
        if (e.target) pulse(this.el.querySelector(`[data-slot="${e.target.player}-${e.target.lane}"] .unit`), 'targeted', 600);
        return;
      }
      case 'ink': {
        sfx('ink');
        this.updateInk();
        const target = e.p === this.viewer ? this.el.querySelector('.ink-pips') : this.el.querySelector(`[data-hero="${e.p}"] .ink-pill`);
        pulse(target, 'pop', 500);
        burst(target, '💧', 6);
        if (e.p !== this.viewer || this.cfg.mode === 'hotseat') toast(`${this.cfg.names[e.p]} inked ${card(e.cardId).name}`);
        await beat(e.p === this.viewer ? 250 : 650);
        return;
      }
      case 'gainInk': {
        this.updateInk();
        pulse(e.p === this.viewer ? this.el.querySelector('.ink-pips') : this.el.querySelector(`[data-hero="${e.p}"] .ink-pill`), 'pop', 500);
        sfx('ink');
        await beat(200);
        return;
      }
      case 'summon': {
        const slot = this.el.querySelector(`[data-slot="${e.unit.owner}-${e.unit.lane}"]`);
        if (slot) slot.innerHTML = unitHtml(e.unit, { fresh: true });
        sfx('summon');
        vibrate(15);
        await beat(320);
        return;
      }
      case 'attack': {
        const el = this.unitEl(e.uid);
        const up = e.p === this.viewer;
        pulse(el, e.targetUid === null ? (up ? 'lunge-up-far' : 'lunge-down-far') : up ? 'lunge-up' : 'lunge-down', 420);
        sfx('swoosh');
        await beat(220);
        return;
      }
      case 'damage': {
        const el = this.unitEl(e.uid);
        floatText(el, `-${e.amount}`, e.amount >= 4 ? 'big' : 'dmg');
        pulse(el, 'hit', 350);
        const hp = el?.querySelector('.hp');
        if (hp) {
          hp.textContent = String(e.unit.life);
          hp.classList.add('hurt');
        }
        sfx(e.amount >= 4 ? 'bigHit' : 'hit');
        await beat(200);
        return;
      }
      case 'shieldPop': {
        const el = this.unitEl(e.uid);
        el?.classList.remove('shielded');
        burst(el, '🫧', 7);
        floatText(el, 'Blocked!', 'info');
        sfx('shield');
        await beat(260);
        return;
      }
      case 'hero': {
        const el = this.heroEl(e.p);
        const b = el?.querySelector('b');
        if (b) b.textContent = String(e.life);
        el?.classList.toggle('low', e.life <= 5);
        if (e.amount < 0) {
          floatText(el, `${e.amount}`, e.amount <= -5 ? 'big' : 'dmg');
          pulse(el, 'hit', 400);
          shake(e.amount <= -5 ? 'big' : 'small');
          sfx('face');
          vibrate(e.amount <= -5 ? 60 : 25);
        } else {
          floatText(el, `+${e.amount}`, 'heal');
          pulse(el, 'healed', 400);
          sfx('heal');
        }
        await beat(300);
        return;
      }
      case 'unit': {
        const el = this.unitEl(e.unit.uid);
        if (el) el.outerHTML = unitHtml(e.unit);
        const fresh = this.unitEl(e.unit.uid);
        const fx = { buff: ['✨', 'buff'], heal: ['💚', 'heal'], freeze: ['❄️', 'freeze'], shield: ['🫧', 'shield'] } as const;
        const [emoji, sound] = fx[e.reason];
        burst(fresh, emoji, 6);
        pulse(fresh, e.reason === 'freeze' ? 'frozen-flash' : 'buffed', 500);
        sfx(sound);
        await beat(260);
        return;
      }
      case 'death': {
        const el = this.unitEl(e.uid);
        if (el) {
          el.classList.add('dying');
          burst(el, '💥', 5);
        }
        sfx('death');
        await beat(380);
        const slot = this.el.querySelector(`[data-slot="${e.p}-${e.lane}"]`);
        el?.remove();
        if (slot && !slot.querySelector('.unit')) slot.insertAdjacentHTML('afterbegin', '<div class="empty-slot"></div>');
        return;
      }
      case 'bounce': {
        const el = this.unitEl(e.uid);
        el?.classList.add('bouncing');
        sfx('bounce');
        await beat(380);
        el?.remove();
        return;
      }
      case 'terrain': {
        pulse(this.el.querySelector(`[data-terrain="${e.lane}"]`), 'flash', 600);
        await beat(250);
        return;
      }
      case 'storm': {
        banner(`🌩️ STORM −${e.amount}`, 'storm', 900);
        pulse(this.el.querySelector('.battle'), 'lightning', 700);
        sfx('storm');
        await beat(800);
        return;
      }
      case 'draw':
        return;
      case 'burn':
        if (e.p === this.viewer) toast(`Hand full — ${card(e.cardId).name} burned!`);
        return;
      case 'gameOver':
        return;
    }
    void g;
  }

  private async reveal(cardId: string, p: PlayerIndex) {
    const el = document.createElement('div');
    el.className = 'reveal';
    el.innerHTML = `<div class="reveal-label">${this.cfg.names[p]} plays</div>${bigCardHtml(cardId)}`;
    this.el.querySelector('.battle')?.appendChild(el);
    sfx(card(cardId).type === 'spell' ? 'spell' : 'select');
    await beat(1000);
    el.classList.add('out');
    await beat(200);
    el.remove();
  }

  private async finish() {
    const g = this.game;
    const winner = g.state.winner!;
    const res = this.cfg.onResult(winner, g);
    const won = this.cfg.mode === 'hotseat' || winner === 0;
    await beat(500);
    if (won) {
      sfx('win');
      confetti();
    } else {
      sfx('lose');
    }
    this.resultActions = res.actions;
    this.overlay = { kind: 'result', title: res.title, subtitle: res.subtitle, actions: res.actions, won };
    this.render();
  }
}
