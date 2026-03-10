import { GameEngine } from './engine/GameEngine';
import { GameRenderer } from './ui/renderer';
import { Card, InkingMode, CombatMode } from './model/types';
import { DECK_CONFIGS } from './data/decks';

function showSetupScreen() {
  const app = document.getElementById('app')!;

  const deckOptions = Object.entries(DECK_CONFIGS)
    .map(([key, cfg]) => `<option value="${key}">${cfg.label}</option>`)
    .join('');

  app.innerHTML = `
    <div class="setup-screen">
      <h1 class="setup-title">Card Game</h1>
      <div class="setup-players">
        <div class="setup-player">
          <h3>Player 1 — Deck</h3>
          <select id="p1-deck" class="deck-select">
            ${deckOptions}
          </select>
          <div class="deck-preview" id="p1-preview"></div>
        </div>
        <div class="setup-vs">VS</div>
        <div class="setup-player">
          <h3>Player 2 — Deck</h3>
          <select id="p2-deck" class="deck-select">
            ${Object.entries(DECK_CONFIGS)
              .map(([key, cfg], i) => `<option value="${key}" ${i === 1 ? 'selected' : ''}>${cfg.label}</option>`)
              .join('')}
          </select>
          <div class="deck-preview" id="p2-preview"></div>
        </div>
      </div>
      <div class="setup-modes">
        <div class="setup-mode">
          <label for="inking-mode">Inking Mode:</label>
          <select id="inking-mode" class="mode-select">
            <option value="${InkingMode.Persistent}">Persistent — ink builds up permanently</option>
            <option value="${InkingMode.Expendable}">Expendable — ink is spent each turn</option>
          </select>
        </div>
        <div class="setup-mode">
          <label for="combat-mode">Combat Mode:</label>
          <select id="combat-mode" class="mode-select">
            <option value="${CombatMode.MutualDamage}">Mutual Damage — both creatures fight back</option>
            <option value="${CombatMode.AttackerOnly}">Attacker-Only — only attacker deals damage</option>
          </select>
        </div>
      </div>
      <button id="start-btn" class="action-btn primary setup-start-btn">Start Game</button>
    </div>
  `;

  updateDeckPreview('p1-deck', 'p1-preview');
  updateDeckPreview('p2-deck', 'p2-preview');

  document.getElementById('p1-deck')!.addEventListener('change', () => updateDeckPreview('p1-deck', 'p1-preview'));
  document.getElementById('p2-deck')!.addEventListener('change', () => updateDeckPreview('p2-deck', 'p2-preview'));

  document.getElementById('start-btn')!.addEventListener('click', () => {
    const p1Key = (document.getElementById('p1-deck') as HTMLSelectElement).value;
    const p2Key = (document.getElementById('p2-deck') as HTMLSelectElement).value;
    const inkingMode = (document.getElementById('inking-mode') as HTMLSelectElement).value as InkingMode;
    const combatMode = (document.getElementById('combat-mode') as HTMLSelectElement).value as CombatMode;

    const deck1 = DECK_CONFIGS[p1Key].deck.map(c => ({ ...c }));
    const deck2 = DECK_CONFIGS[p2Key].deck.map(c => ({ ...c }));
    startGame(deck1, deck2, inkingMode, combatMode);
  });
}

function updateDeckPreview(selectId: string, previewId: string) {
  const key = (document.getElementById(selectId) as HTMLSelectElement).value;
  const deck = DECK_CONFIGS[key].deck;
  const preview = document.getElementById(previewId)!;

  // Count cards by name
  const counts = new Map<string, number>();
  for (const card of deck) {
    counts.set(card.name, (counts.get(card.name) ?? 0) + 1);
  }

  const lines = Array.from(counts.entries())
    .map(([name, count]) => {
      const card = deck.find(c => c.name === name)!;
      const kws = card.keywords.length > 0 ? ` [${card.keywords.join(', ')}]` : '';
      const inkable = card.inkable ? '' : ' ✗ink';
      return `<div class="deck-preview-line">${count}× ${name} (${card.cost}★ ${card.power}/${card.life}${kws}${inkable})</div>`;
    });

  preview.innerHTML = lines.join('');
}

function startGame(deck1: Card[], deck2: Card[], inkingMode: InkingMode, combatMode: CombatMode) {
  const app = document.getElementById('app')!;
  const engine = new GameEngine(deck1, deck2, inkingMode, combatMode);
  engine.startGame();

  const renderer = new GameRenderer(engine, app);
  renderer.onNewGame = () => showSetupScreen();
  renderer.onToggleInking = () => {
    const newMode = inkingMode === InkingMode.Persistent ? InkingMode.Expendable : InkingMode.Persistent;
    startGame(deck1.map(c => ({ ...c })), deck2.map(c => ({ ...c })), newMode, combatMode);
  };
  renderer.onToggleCombat = () => {
    const newMode = combatMode === CombatMode.MutualDamage ? CombatMode.AttackerOnly : CombatMode.MutualDamage;
    startGame(deck1.map(c => ({ ...c })), deck2.map(c => ({ ...c })), inkingMode, newMode);
  };
  renderer.render();
}

showSetupScreen();
