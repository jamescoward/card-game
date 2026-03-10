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

### Phase 1: Project Setup

- [ ] Initialize Vite + TypeScript project (`npm create vite@latest -- --template vanilla-ts`)
- [ ] Set up project structure:
  ```
  src/
    model/        # Game state, card definitions, types
    engine/       # Game logic (turns, combat, inking)
    ui/           # DOM rendering and event handling
    data/         # Card pool and deck configurations (JSON arrays)
    main.ts       # Entry point
  ```
- [ ] Add Vitest as a dev dependency and configure a basic test script
- [ ] Create the GitHub Actions workflow for GitHub Pages deployment (`.github/workflows/deploy.yml`):
  - Trigger on push to `main`
  - Steps: checkout, install, build, deploy to GitHub Pages using `actions/deploy-pages`
  - Configure Vite `base` path for GitHub Pages

### Phase 2: Data Model & Types

- [ ] Define TypeScript types/interfaces:
  - `Card` — name, cost, power, life, keywords, inkable, inkValue
  - `CreatureInstance` — card reference, current damage, exhausted state, lane position
  - `Player` — life, deck, hand, ink pool, lanes (3 slots), discard pile
  - `GameState` — both players, current turn number, current phase, active player, inking mode
  - `Phase` enum — Draw, Ink, Play, Combat, End
  - `Keyword` enum — Cleave, Tide, Slow, Evasion, Tough, Rich
  - `InkingMode` enum — Persistent, Expendable
- [ ] Create the starter card: Goblin (cost: 1, power: 1, life: 1, keywords: none, inkable: true)
- [ ] Create two default 20-card deck configurations as JSON arrays in `src/data/decks.ts` (all Goblins for now)

### Phase 3: Game Engine — Core Loop

- [ ] Implement `GameEngine` class managing the full game state:
  - `startGame()` — shuffle decks, draw opening hands of 5
  - `drawCard()` — draw phase logic, handle empty deck
  - `inkCard(cardIndex)` — remove card from hand, add ink (persistent mode: +1 permanent ink, expendable mode: +1 temporary ink). Respect Rich keyword (ink for 2). Enforce one-per-turn limit in persistent mode.
  - `playCard(cardIndex, lane)` — validate cost, deduct ink (persistent: deduct and refill each turn from pool; expendable: spend temporary ink), place creature, trigger on-play keywords (Cleave, Tide)
  - `resolveCombat()` — simultaneous combat across all 3 lanes, apply damage to creatures and players, remove dead creatures, handle Evasion and Tough
  - `endTurn()` — advance to next player/turn, check win conditions (life <= 0, turn 6 limit)
  - `checkGameOver()` — return winner or null
- [ ] Implement persistent inking: track `inkPool` (max available) and `inkUsed` (spent this turn). Reset `inkUsed` to 0 each turn.
- [ ] Implement expendable inking: track `temporaryInk` (available this turn only). Resets to 0 each turn. No limit on cards inked per turn.
- [ ] Write unit tests for:
  - Drawing cards
  - Inking a card (both modes)
  - Playing a creature into a lane
  - Combat resolution (creature vs creature, creature vs face)
  - Win condition checks (life total, turn limit)
  - Rich keyword inking for 2

### Phase 4: UI — Game Board Layout

- [ ] Build the HTML structure for a two-player hotseat layout:
  ```
  ┌──────────────────────────────────────────────────┐
  │  [Inking Mode Toggle: Persistent / Expendable]   │
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
- [ ] Render card components showing: name, power/life stats, keywords, cost
- [ ] Show current damage on creatures in lanes (e.g., "1/1 — 0 dmg" or a health bar)
- [ ] Display current game phase prominently with clear indication of whose turn it is
- [ ] Add inking mode toggle at the top of the screen (switches between Persistent and Expendable — only usable before the game starts or resets the game with confirmation)

### Phase 5: UI — Player Interaction

- [ ] Implement phase-driven interaction flow:
  - **Draw Phase:** "Draw Card" button (auto-advance after draw)
  - **Ink Phase:** Clicking a card in hand inks it. "Skip Inking" button to proceed. In persistent mode, disable after 1 ink. In expendable mode, allow multiple. "Done Inking" button to proceed.
  - **Play Phase:** Click a card in hand to select it, then click a lane to place it. Show valid lanes (empty ones) highlighted. "End Play Phase" button to proceed to combat.
  - **Combat Phase:** "Resolve Combat" button triggers simultaneous combat with visual feedback (damage numbers, deaths). Auto-advance after resolution.
  - **End Phase:** Check win conditions, then "End Turn" to pass to the other player.
- [ ] Add a game log panel at the bottom that records all actions (inking, playing, combat results, damage)
- [ ] Add "New Game" button to reset the game state

### Phase 6: Polish & Deploy

- [ ] Add basic CSS styling:
  - Card appearance (bordered box with name, stats, keywords)
  - Lane layout (clear visual separation)
  - Active player highlighting
  - Phase indicator styling
  - Disabled/exhausted creature visual state (greyed out or rotated)
- [ ] Handle edge cases:
  - Empty deck (skip draw)
  - Full lanes (cannot play more creatures)
  - No cards in hand
  - Both players at 0 life simultaneously (active player loses)
- [ ] Verify the game plays correctly end-to-end with Goblin-only decks
- [ ] Ensure the GitHub Actions deployment works and the game is accessible via GitHub Pages
- [ ] Run all unit tests and ensure they pass

---

## Sprint 2 — Keywords & Expanded Card Pool

**Goal:** Implement all keywords and create a diverse card pool for meaningful playtesting.

### Phase 7: Keyword Implementation

- [ ] Implement **Cleave** — on play, destroy the opposing creature in the same lane. If no opposing creature, no effect.
- [ ] Implement **Tide** — on play, prompt the active player to select any creature on the board to return to its owner's hand. If no creatures on board, no effect.
- [ ] Implement **Slow** — creature enters with `exhausted = true`. Exhausted creatures skip combat. Clear exhausted state at the start of the owning player's turn.
- [ ] Implement **Evasion** — during combat, this creature always deals damage to the opponent's life total, even if an opposing creature exists. The opposing creature does NOT deal damage to the evasive creature.
- [ ] Implement **Tough** — during combat, this creature takes 0 damage from opposing creatures whose power is strictly less than this creature's power.
- [ ] Implement **Rich** — when this card is inked, it provides 2 ink instead of 1. (This should already be handled in the engine from Sprint 1 but verify and add UI indication.)
- [ ] Write unit tests for each keyword interaction:
  - Cleave destroying an opposing creature
  - Cleave into an empty lane (no-op)
  - Tide bouncing own creature / opponent creature
  - Slow creature not attacking on play turn
  - Evasion bypassing blockers
  - Tough ignoring low-power attackers
  - Rich inking for 2
- [ ] Add UI for Tide targeting (click a creature on the board to bounce it)

### Phase 8: Card Pool Design

- [ ] Design a card pool with at least 15–20 unique cards covering different costs, stats, and keywords. Structure as cycles/pairs per keyword at different costs. Example starting pool:
  - **1-cost:** Goblin (1/1), Scout (1/1 Evasion), Sentinel (0/2 Tough)
  - **2-cost:** Orc Warrior (2/2), Raider (2/1 Cleave), Tidewalker (1/2 Tide), Merchant (1/1 Rich)
  - **3-cost:** Ogre (3/2), Shadow (2/2 Evasion), Bulwark (1/3 Tough), Recruiter (2/2 Rich)
  - **4-cost:** War Chief (3/3), Assassin (3/1 Cleave), Tempest (2/3 Tide), Lumbering Giant (4/3 Slow)
  - **5-cost:** Dragon (4/4 — uninkable), Hydra (3/5 Tough — uninkable)
- [ ] Store all cards in `src/data/cards.ts` as a card pool
- [ ] Create 2–3 pre-built deck configurations (aggro, midrange, control) as JSON arrays in `src/data/decks.ts`
- [ ] Add a deck selector in the UI so each player can pick which pre-built deck to use before starting

### Phase 9: UI Improvements

- [ ] Show keyword icons or labels on cards with tooltip descriptions
- [ ] Add visual feedback for keyword triggers (e.g., flash effect when Cleave destroys a creature)
- [ ] Show uninkable cards distinctly in hand (different border or label)
- [ ] Improve the game log to clearly describe keyword effects
- [ ] Add a turn/phase history so players can review what happened

---

## Summary

| Sprint | Phases | Deliverable |
|--------|--------|-------------|
| **1**  | 1–6    | Playable two-player hotseat game with Goblin cards, both inking modes, 3-lane combat, deployed to GitHub Pages |
| **2**  | 7–9    | All 6 keywords working, 15+ card pool, pre-built decks, deck selection, improved UI |
