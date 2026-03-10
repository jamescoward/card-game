import { GameEngine } from '../engine/GameEngine';
import {
  Phase,
  Keyword,
  InkingMode,
  CombatMode,
  CreatureInstance,
} from '../model/types';

const KEYWORD_DESCRIPTIONS: Record<Keyword, string> = {
  [Keyword.Cleave]: 'On play, destroys the opposing creature in the same lane',
  [Keyword.Tide]: 'On play, return any creature on board to its owner\'s hand',
  [Keyword.Slow]: 'Enters exhausted — cannot attack the turn it is played',
  [Keyword.Evasion]: 'Always deals damage to opponent\'s life total; takes no damage from blockers',
  [Keyword.Tough]: 'Takes 1 less damage from all incoming hits (minimum 0)',
  [Keyword.Rich]: 'Provides 2 ink instead of 1 when inked',
};

export class GameRenderer {
  private engine: GameEngine;
  private app: HTMLElement;
  private selectedCardIndex: number | null = null;

  constructor(engine: GameEngine, app: HTMLElement) {
    this.engine = engine;
    this.app = app;
  }

  render() {
    this.app.innerHTML = `
      <div class="game-container">
        ${this.renderHeader()}
        ${this.renderTideBanner()}
        ${this.renderBoard()}
        ${this.renderActiveHand()}
        ${this.renderActions()}
        ${this.renderLog()}
      </div>
    `;

    this.bindEvents();
  }

  private renderHeader(): string {
    const s = this.engine.state;
    const p1 = s.players[0];
    const p2 = s.players[1];

    return `
      <header class="game-header">
        <div class="mode-toggles">
          <div class="mode-toggle">
            <label>Inking:</label>
            <button class="toggle-btn ${s.inkingMode === InkingMode.Persistent ? 'active' : ''}" data-action="toggle-inking">
              ${s.inkingMode}
            </button>
          </div>
          <div class="mode-toggle">
            <label>Combat:</label>
            <button class="toggle-btn ${s.combatMode === CombatMode.MutualDamage ? 'active' : ''}" data-action="toggle-combat">
              ${s.combatMode === CombatMode.MutualDamage ? 'Mutual Damage' : 'Attacker-Only'}
            </button>
          </div>
        </div>
        <div class="turn-info">
          <span class="turn-number">Turn ${s.currentTurn}/6</span>
          <span class="phase-indicator">${s.currentPhase} Phase</span>
          <span class="active-player">Player ${s.activePlayerIndex + 1}'s Turn</span>
        </div>
        <div class="player-stats">
          <div class="player-stat ${s.activePlayerIndex === 0 ? 'active-stat' : ''}">
            <strong>Player 1</strong>
            <span>Life: ${p1.life}</span>
            <span>Ink: ${s.inkingMode === InkingMode.Persistent ? `${p1.inkPool - p1.inkUsed}/${p1.inkPool}` : p1.temporaryInk}</span>
            <span>Deck: ${p1.deck.length}</span>
          </div>
          <div class="player-stat ${s.activePlayerIndex === 1 ? 'active-stat' : ''}">
            <strong>Player 2</strong>
            <span>Life: ${p2.life}</span>
            <span>Ink: ${s.inkingMode === InkingMode.Persistent ? `${p2.inkPool - p2.inkUsed}/${p2.inkPool}` : p2.temporaryInk}</span>
            <span>Deck: ${p2.deck.length}</span>
          </div>
        </div>
      </header>
    `;
  }

  private renderTideBanner(): string {
    if (!this.engine.state.pendingTide) return '';
    return `
      <div class="tide-banner">
        <span class="tide-icon">🌊</span>
        <strong>Tide:</strong> Click any creature on the board to return it to its owner's hand
      </div>
    `;
  }

  private renderBoard(): string {
    const s = this.engine.state;
    const p1 = s.players[0];
    const p2 = s.players[1];
    const isPendingTide = s.pendingTide;

    let lanesHtml = '';
    for (let i = 0; i < 3; i++) {
      const canPlay = s.currentPhase === Phase.Play && this.selectedCardIndex !== null && !isPendingTide;
      const p1Creature = p1.lanes[i];
      const p2Creature = p2.lanes[i];

      lanesHtml += `
        <div class="lane">
          <div class="lane-label">Lane ${i + 1}</div>
          <div class="lane-slots">
            <div class="lane-slot p1-slot ${p1Creature ? '' : 'empty'}">
              ${p1Creature ? this.renderCreature(p1Creature, 0, i, isPendingTide) : '<span class="empty-slot">Empty</span>'}
            </div>
            <div class="lane-divider">VS</div>
            <div class="lane-slot p2-slot ${p2Creature ? '' : 'empty'}">
              ${p2Creature ? this.renderCreature(p2Creature, 1, i, isPendingTide) : '<span class="empty-slot">Empty</span>'}
            </div>
          </div>
          ${canPlay ? `<button class="play-lane-btn" data-lane="${i}">Place Here</button>` : ''}
        </div>
      `;
    }

    return `<div class="board">${lanesHtml}</div>`;
  }

  private renderCreature(creature: CreatureInstance, playerIndex: number, lane: number, isTideTarget: boolean): string {
    const c = creature.card;
    const currentLife = c.life - creature.damage;
    const keywords = c.keywords.length > 0
      ? `<span class="creature-keywords">${c.keywords.map(k =>
          `<span class="keyword-tag" title="${KEYWORD_DESCRIPTIONS[k]}">${k}</span>`
        ).join(' ')}</span>`
      : '';
    const exhaustedClass = creature.exhausted ? 'exhausted' : '';
    const tideClass = isTideTarget ? 'tide-target' : '';

    return `
      <div class="creature-card ${exhaustedClass} ${tideClass}"
           data-player-index="${playerIndex}" data-lane="${lane}">
        <div class="creature-name">${c.name}</div>
        <div class="creature-stats">${c.power} / ${currentLife}</div>
        ${keywords}
        ${creature.exhausted ? '<span class="exhausted-label">Exhausted</span>' : ''}
      </div>
    `;
  }

  private renderActiveHand(): string {
    const s = this.engine.state;
    if (s.pendingTide) {
      return `
        <div class="hand-area">
          <h3>Player ${s.activePlayerIndex + 1}'s Hand</h3>
          <p class="hand-hint tide-hint">Waiting for Tide resolution — select a creature on the board to bounce</p>
        </div>
      `;
    }

    const player = s.players[s.activePlayerIndex];
    const isInkPhase = s.currentPhase === Phase.Ink;
    const isPlayPhase = s.currentPhase === Phase.Play;

    let cardsHtml = '';
    player.hand.forEach((card, i) => {
      const canInk = isInkPhase && card.inkable &&
        (s.inkingMode === InkingMode.Expendable || !player.hasInkedThisTurn);
      const canPlay = isPlayPhase && card.cost <= this.engine.getAvailableInk();
      const isSelected = this.selectedCardIndex === i;
      const clickable = canInk || canPlay;
      const richLabel = card.keywords.includes(Keyword.Rich)
        ? `<div class="card-rich-label">+2 Ink</div>` : '';

      cardsHtml += `
        <div class="hand-card ${clickable ? 'clickable' : ''} ${isSelected ? 'selected' : ''} ${!card.inkable ? 'uninkable' : ''}"
             data-card-index="${i}" data-can-ink="${canInk}" data-can-play="${canPlay}">
          <div class="card-cost">${card.cost}</div>
          <div class="card-name">${card.name}</div>
          <div class="card-stats">${card.power} / ${card.life}</div>
          ${card.keywords.length > 0
            ? `<div class="card-keywords">${card.keywords.map(k =>
                `<span class="keyword-tag" title="${KEYWORD_DESCRIPTIONS[k]}">${k}</span>`
              ).join(' ')}</div>`
            : ''}
          ${!card.inkable ? '<div class="card-uninkable">Uninkable</div>' : ''}
          ${richLabel}
        </div>
      `;
    });

    return `
      <div class="hand-area">
        <h3>Player ${s.activePlayerIndex + 1}'s Hand (${player.hand.length} cards)</h3>
        <div class="hand-cards">${cardsHtml}</div>
        ${isInkPhase ? '<p class="hand-hint">Click a card to ink it (hover keywords for descriptions)</p>' : ''}
        ${isPlayPhase && this.selectedCardIndex === null ? '<p class="hand-hint">Click a card to select it, then click a lane</p>' : ''}
        ${isPlayPhase && this.selectedCardIndex !== null ? '<p class="hand-hint">Click a lane to place the creature, or click the card again to deselect</p>' : ''}
      </div>
    `;
  }

  private renderActions(): string {
    const s = this.engine.state;
    const buttons: string[] = [];

    if (s.pendingTide) {
      return `<div class="actions"><p class="tide-action-hint">Click a creature on the board to resolve Tide</p></div>`;
    }

    if (s.gameOver) {
      buttons.push(`<div class="game-over-message">Player ${(s.winner ?? 0) + 1} wins!</div>`);
      buttons.push(`<button class="action-btn" data-action="new-game">New Game</button>`);
      return `<div class="actions">${buttons.join('')}</div>`;
    }

    switch (s.currentPhase) {
      case Phase.Draw:
        buttons.push(`<button class="action-btn primary" data-action="draw">Draw Card</button>`);
        break;
      case Phase.Ink:
        if (s.inkingMode === InkingMode.Persistent) {
          buttons.push(`<button class="action-btn" data-action="skip-ink">Skip Inking</button>`);
        }
        buttons.push(`<button class="action-btn" data-action="done-ink">Done Inking</button>`);
        break;
      case Phase.Play:
        buttons.push(`<button class="action-btn" data-action="end-play">End Play Phase</button>`);
        break;
      case Phase.Combat:
        buttons.push(`<button class="action-btn primary" data-action="resolve-combat">Resolve Combat</button>`);
        break;
      case Phase.End:
        buttons.push(`<button class="action-btn primary" data-action="end-turn">End Turn</button>`);
        break;
    }

    buttons.push(`<button class="action-btn secondary" data-action="new-game">New Game</button>`);

    return `<div class="actions">${buttons.join('')}</div>`;
  }

  private renderLog(): string {
    const entries = this.engine.log.slice(-20).reverse();
    const html = entries.map(e =>
      `<div class="log-entry"><span class="log-meta">T${e.turn} P${e.player} [${e.phase}]</span> ${e.message}</div>`
    ).join('');

    return `
      <div class="game-log">
        <h3>Game Log</h3>
        <div class="log-entries">${html}</div>
      </div>
    `;
  }

  private bindEvents() {
    // Action buttons
    this.app.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action;
        this.handleAction(action!);
      });
    });

    // Tide targeting — clicks on creatures when Tide is pending
    if (this.engine.state.pendingTide) {
      this.app.querySelectorAll('.tide-target').forEach(el => {
        el.addEventListener('click', (e) => {
          const target = e.currentTarget as HTMLElement;
          const playerIndex = parseInt(target.dataset.playerIndex!, 10) as 0 | 1;
          const lane = parseInt(target.dataset.lane!, 10);
          this.engine.resolveTide(playerIndex, lane);
          this.render();
        });
      });
      return; // Don't bind hand/lane events while Tide is pending
    }

    // Hand cards
    this.app.querySelectorAll('.hand-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const el = (e.currentTarget as HTMLElement);
        const idx = parseInt(el.dataset.cardIndex!, 10);
        this.handleCardClick(idx, el);
      });
    });

    // Lane placement buttons
    this.app.querySelectorAll('.play-lane-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const lane = parseInt((e.currentTarget as HTMLElement).dataset.lane!, 10);
        this.handleLaneClick(lane);
      });
    });
  }

  private handleAction(action: string) {
    switch (action) {
      case 'draw':
        this.engine.drawCard();
        break;
      case 'skip-ink':
        this.engine.skipInk();
        break;
      case 'done-ink':
        this.engine.doneInking();
        break;
      case 'end-play':
        this.selectedCardIndex = null;
        this.engine.endPlayPhase();
        break;
      case 'resolve-combat':
        this.engine.resolveCombat();
        break;
      case 'end-turn':
        this.engine.endTurn();
        break;
      case 'new-game':
        this.onNewGame?.();
        return;
      case 'toggle-inking':
        this.onToggleInking?.();
        return;
      case 'toggle-combat':
        this.onToggleCombat?.();
        return;
    }

    this.render();
  }

  private handleCardClick(index: number, el: HTMLElement) {
    const s = this.engine.state;

    if (s.currentPhase === Phase.Ink) {
      const canInk = el.dataset.canInk === 'true';
      if (canInk) {
        this.engine.inkCard(index);
        this.render();
      }
    } else if (s.currentPhase === Phase.Play) {
      if (this.selectedCardIndex === index) {
        this.selectedCardIndex = null;
      } else {
        const canPlay = el.dataset.canPlay === 'true';
        if (canPlay) {
          this.selectedCardIndex = index;
        }
      }
      this.render();
    }
  }

  private handleLaneClick(lane: number) {
    if (this.selectedCardIndex === null) return;
    const success = this.engine.playCard(this.selectedCardIndex, lane);
    if (success) {
      this.selectedCardIndex = null;
    }
    this.render();
  }

  onNewGame: (() => void) | null = null;
  onToggleInking: (() => void) | null = null;
  onToggleCombat: (() => void) | null = null;
}
