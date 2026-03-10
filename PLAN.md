# Card Game Prototype — Implementation Plan

## Tech Stack

- **Framework:** Vanilla TypeScript + Vite (fast dev server, zero-config bundling, no framework overhead for a prototype)
- **Styling:** Plain CSS (simple prototype — no need for a CSS framework)
- **State management:** Plain TypeScript classes/objects (no external dependencies)
- **Testing:** Vitest (ships with Vite, zero config)
- **Deployment:** GitHub Pages via GitHub Actions

---

## Sprint 1 — Core Game Engine & Basic UI

**Goal:** A playable two-player hotseat game with one card type, persistent inking, and basic combat across 3 lanes.

### Phase 1: Project Setup ✅

- [x] Initialize Vite + TypeScript project (`npm create vite@latest -- --template vanilla-ts`)
- [x] Set up project structure:
  ```
  src/
    model/        # Game state, card definitions, types
    engine/       # Game logic (turns, combat, inking)
    ui/           # DOM rendering and event handling
    data/         # Card pool and deck configurations (JSON arrays)
    main.ts       # Entry point
  ```
- [x] Add Vitest as a dev dependency and configure a basic test script
- [x] Create the GitHub Actions workflow for GitHub Pages deployment (`.github/workflows/deploy.yml`):
  - Trigger on push to `main`
  - Steps: checkout, install, build, deploy to GitHub Pages using `actions/deploy-pages`
  - Configure Vite `base` path for GitHub Pages

### Phase 2: Data Model & Types ✅

- [x] Define TypeScript types/interfaces:
  - `Card` — name, cost, power, life, keywords, inkable, inkValue
  - `CreatureInstance` — card reference, current damage, exhausted state, lane position
  - `Player` — life, deck, hand, ink pool, lanes (3 slots), discard pile
  - `GameState` — both players, current turn number, current phase, active player, inking mode, combat mode
  - `Phase` enum — Draw, Ink, Play, Combat, End
  - `Keyword` enum — Cleave, Tide, Slow, Evasion, Tough, Rich
  - `InkingMode` enum — Persistent, Expendable
  - `CombatMode` enum — MutualDamage, AttackerOnly
- [x] Create the starter card: Goblin (cost: 1, power: 1, life: 1, keywords: none, inkable: true)
- [x] Create two default 20-card deck configurations as JSON arrays in `src/data/decks.ts` (all Goblins for now)

### Phase 3: Game Engine — Core Loop ✅

- [x] Implement `GameEngine` class managing the full game state:
  - `startGame()` — shuffle decks, draw opening hands of 5
  - `drawCard()` — draw phase logic, handle empty deck
  - `inkCard(cardIndex)` — remove card from hand, add ink (persistent mode: +1 permanent ink, expendable mode: +1 temporary ink). Respect Rich keyword (ink for 2). Enforce one-per-turn limit in persistent mode.
  - `playCard(cardIndex, lane)` — validate cost, deduct ink (persistent: deduct and refill each turn from pool; expendable: spend temporary ink), place creature, trigger on-play keywords (Cleave, Tide)
  - `resolveCombat()` — resolve combat across all 3 lanes based on active combat mode. **Mutual Damage mode:** simultaneous combat, both creatures deal damage to each other. **Attacker-Only mode:** only the active player's creatures deal damage, defenders do not strike back. In both modes: apply damage to creatures and players, remove dead creatures, handle Evasion and Tough.
  - `endTurn()` — advance to next player/turn, check win conditions (life <= 0, turn 6 limit)
  - `checkGameOver()` — return winner or null
- [x] Implement persistent inking: track `inkPool` (max available) and `inkUsed` (spent this turn). Reset `inkUsed` to 0 each turn.
- [x] Implement expendable inking: track `temporaryInk` (available this turn only). Resets to 0 each turn. No limit on cards inked per turn.
- [x] Write unit tests for:
  - Drawing cards
  - Inking a card (both modes)
  - Playing a creature into a lane
  - Combat resolution — mutual damage mode (creature vs creature, creature vs face)
  - Combat resolution — attacker-only mode (only attacker deals damage, defender does not strike back)
  - Win condition checks (life total, turn limit)
  - Rich keyword inking for 2

### Phase 4: UI — Game Board Layout ✅

- [x] Build the HTML structure for a two-player hotseat layout:
  ```
  ┌──────────────────────────────────────────────────┐
  │  [Inking Mode: Persistent / Expendable]           │
  │  [Combat Mode: Mutual Damage / Attacker-Only]    │
  ├────────────────────┬─────────────────────────────┤
  │    PLAYER 1        │        PLAYER 2             │
  │  Life: 12  Ink: 0  │  Life: 12  Ink: 0           │
  │  Turn: 1  Phase: X │  Turn: 1  Phase: X          │
  ├────────────────────┼─────────────────────────────┤
  │  Lane 1: [card]    │  Lane 1: [card]             │
  │  Lane 2: [card]    │  Lane 2: [card]             │
  │  Lane 3: [card]    │  Lane 3: [card]             │
  ├────────────────────┼─────────────────────────────┤
  │  Hand: [c][c][c]   │  Hand: [c][c][c]            │
  │  Deck: 15 remain   │  Deck: 15 remain            │
  ├────────────────────┴─────────────────────────────┤
  │              [Game Log / History]                 │
  └──────────────────────────────────────────────────┘
  ```
- [x] Render card components showing: name, power/life stats, keywords, cost
- [x] Show current damage on creatures in lanes (e.g., "1/1 — 0 dmg" or a health bar)
- [x] Display current game phase prominently with clear indication of whose turn it is
- [x] Add inking mode toggle at the top of the screen (switches between Persistent and Expendable — only usable before the game starts or resets the game with confirmation)
- [x] Add combat mode toggle at the top of the screen (switches between Mutual Damage and Attacker-Only — same pre-game/reset restriction as inking toggle)

### Phase 5: UI — Player Interaction ✅

- [x] Implement phase-driven interaction flow:
  - **Draw Phase:** "Draw Card" button (auto-advance after draw)
  - **Ink Phase:** Clicking a card in hand inks it. "Skip Inking" button to proceed. In persistent mode, disable after 1 ink. In expendable mode, allow multiple. "Done Inking" button to proceed.
  - **Play Phase:** Click a card in hand to select it, then click a lane to place it. Show valid lanes (empty ones) highlighted. "End Play Phase" button to proceed to combat.
  - **Combat Phase:** "Resolve Combat" button triggers simultaneous combat with visual feedback (damage numbers, deaths). Auto-advance after resolution.
  - **End Phase:** Check win conditions, then "End Turn" to pass to the other player.
- [x] Add a game log panel at the bottom that records all actions (inking, playing, combat results, damage)
- [x] Add "New Game" button to reset the game state

### Phase 6: Polish & Deploy ✅

- [x] Add basic CSS styling:
  - Card appearance (bordered box with name, stats, keywords)
  - Lane layout (clear visual separation)
  - Active player highlighting
  - Phase indicator styling
  - Disabled/exhausted creature visual state (greyed out or rotated)
- [x] Handle edge cases:
  - Empty deck (skip draw)
  - Full lanes (cannot play more creatures)
  - No cards in hand
  - Both players at 0 life simultaneously (active player loses)
- [x] Verify the game plays correctly end-to-end with Goblin-only decks
- [x] Ensure the GitHub Actions deployment works and the game is accessible via GitHub Pages
- [x] Run all unit tests and ensure they pass

---

## Sprint 2 — Keywords & Expanded Card Pool

**Goal:** Implement all keywords and create a diverse card pool for meaningful playtesting.

### Phase 7: Keyword Implementation ✅

- [x] Implement **Cleave** — on play, destroy the opposing creature in the same lane. If no opposing creature, no effect.
- [x] Implement **Tide** — on play, prompt the active player to select any creature on the board to return to its owner's hand. If no creatures on board, no effect.
- [x] Implement **Slow** — creature enters with `exhausted = true`. Exhausted creatures skip combat. Clear exhausted state at the start of the owning player's turn.
- [x] Implement **Evasion** — during combat, this creature always deals damage to the opponent's life total, even if an opposing creature exists. The opposing creature does NOT deal damage to the evasive creature.
- [x] Implement **Tough** — during combat, this creature takes 0 damage from opposing creatures whose power is strictly less than this creature's power.
- [x] Implement **Rich** — when this card is inked, it provides 2 ink instead of 1. (This should already be handled in the engine from Sprint 1 but verify and add UI indication.)
- [x] Write unit tests for each keyword interaction:
  - Cleave destroying an opposing creature
  - Cleave into an empty lane (no-op)
  - Tide bouncing own creature / opponent creature
  - Slow creature not attacking on play turn
  - Evasion bypassing blockers
  - Tough ignoring low-power attackers
  - Rich inking for 2
- [x] Add UI for Tide targeting (click a creature on the board to bounce it)

### Phase 8: Card Pool Design ✅

- [x] Design a card pool with at least 15–20 unique cards covering different costs, stats, and keywords. Structure as cycles/pairs per keyword at different costs. Example starting pool:
  - **1-cost:** Goblin (1/1), Scout (1/1 Evasion), Sentinel (0/2 Tough)
  - **2-cost:** Orc Warrior (2/2), Raider (2/1 Cleave), Tidewalker (1/2 Tide), Merchant (1/1 Rich)
  - **3-cost:** Ogre (3/2), Shadow (2/2 Evasion), Bulwark (1/3 Tough), Recruiter (2/2 Rich)
  - **4-cost:** War Chief (3/3), Assassin (3/1 Cleave), Tempest (2/3 Tide), Lumbering Giant (4/3 Slow)
  - **5-cost:** Dragon (4/4 — uninkable), Hydra (3/5 Tough — uninkable)
- [x] Store all cards in `src/data/cards.ts` as a card pool
- [x] Create 2–3 pre-built deck configurations (aggro, midrange, control) as JSON arrays in `src/data/decks.ts`
- [x] Add a deck selector in the UI so each player can pick which pre-built deck to use before starting

### Phase 9: UI Improvements ✅

- [x] Show keyword icons or labels on cards with tooltip descriptions
- [x] Add visual feedback for keyword triggers (e.g., flash effect when Cleave destroys a creature)
- [x] Show uninkable cards distinctly in hand (different border or label)
- [x] Improve the game log to clearly describe keyword effects
- [x] Add a turn/phase history so players can review what happened

---

## Sprint 3 — Balance Fixes & Lane Overwriting

**Goal:** Fix first-player advantage, rework Tough to be useful, and allow creatures to be replaced in lanes.

### Phase 10: Balance Fixes & Lane Overwriting

- [ ] **First player draw skip** — Player 1 does not draw on their very first turn. Reduces the inherent advantage of going first.
- [ ] **Tough rework** — Change Tough from "takes 0 damage from creatures with strictly lower power" to "takes 1 less damage from all incoming hits (minimum 0)." Simpler and more consistent — a Goblin now deals 0 to a Sentinel, but a 3-power creature still deals 2.
- [ ] **Lane overwriting** — Allow a player to play a creature into a lane already occupied by one of their own creatures. The existing creature is destroyed (sent to discard) and the new creature takes its place. On-play keywords still trigger normally.
- [ ] Update unit tests to cover:
  - Player 1 not drawing on turn 1
  - Revised Tough behaviour
  - Overwriting own creature (replaced creature goes to discard, new creature placed correctly)
  - Overwriting does not affect the opposing creature in that lane
  - Cannot overwrite the opponent's creatures

---

## Future Ideas

See [IDEAS.md](./IDEAS.md) for longer-term concepts that aren't yet on the roadmap.

---

## Summary

| Sprint | Phases | Deliverable |
|--------|--------|-------------|
| **1**  | 1–6    | Playable two-player hotseat game with Goblin cards, both inking modes, both combat modes, 3-lane combat, deployed to GitHub Pages |
| **2**  | 7–9    | All 6 keywords working, 15+ card pool, pre-built decks, deck selection, improved UI |
| **3**  | 10     | Balance fixes (first-player draw, Tough rework) and lane overwriting |
