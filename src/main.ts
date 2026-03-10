import { GameEngine } from './engine/GameEngine';
import { GameRenderer } from './ui/renderer';
import { InkingMode, CombatMode } from './model/types';
import { DEFAULT_DECK_1, DEFAULT_DECK_2 } from './data/decks';

let currentInkingMode = InkingMode.Persistent;
let currentCombatMode = CombatMode.MutualDamage;

function startNewGame() {
  const app = document.getElementById('app')!;
  const engine = new GameEngine(
    DEFAULT_DECK_1.map(c => ({ ...c })),
    DEFAULT_DECK_2.map(c => ({ ...c })),
    currentInkingMode,
    currentCombatMode,
  );
  engine.startGame();

  const renderer = new GameRenderer(engine, app);
  renderer.onNewGame = () => startNewGame();
  renderer.onToggleInking = () => {
    currentInkingMode = currentInkingMode === InkingMode.Persistent
      ? InkingMode.Expendable
      : InkingMode.Persistent;
    startNewGame();
  };
  renderer.onToggleCombat = () => {
    currentCombatMode = currentCombatMode === CombatMode.MutualDamage
      ? CombatMode.AttackerOnly
      : CombatMode.MutualDamage;
    startNewGame();
  };
  renderer.render();
}

startNewGame();
