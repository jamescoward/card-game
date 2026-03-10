# Card Game Rules

## Overview

A lane-based card game where two players battle using creature cards across 3 lanes. All cards are creatures — no spells. The game emphasizes meaningful sacrifice decisions through an inking resource system.

## Win Condition

- First player to reach **0 life loses** immediately.
- If neither player reaches 0 life by the end of **turn 6**, the player with the **most life wins**.
- Starting life: **12** (tunable, target range 10–15).

## Game Setup

- Each player has a **deck of 20 cards**.
- Each player draws an opening hand of **5 cards**.
- The board has **3 lanes** shared between both players.

## Turn Structure

Each turn consists of the following phases in order:

1. **Draw Phase** — Draw 1 card from your deck.
2. **Ink Phase** — Optionally sacrifice 1 card from your hand to gain 1 permanent ink (see Resource System).
3. **Play Phase** — Play any number of creature cards from your hand, placing each into a lane (if you can afford their ink cost).
4. **Combat Phase** — All non-exhausted creatures attack simultaneously (see Combat).
5. **End Phase** — Turn passes to the opponent.

## Resource System: Inking

Inspired by Lorcana's ink mechanic. Two modes are available for playtesting:

### Persistent Inking (Default)

- Once per turn, you may sacrifice a card from your hand to gain **1 permanent ink**.
- Ink **persists and accumulates** — it represents your total mana pool each turn.
- A card sacrificed for ink is **gone forever**.
- All cards are inkable by default unless marked as **uninkable** (bombs/build-arounds).
- Cards with the **Rich** keyword ink for **2 instead of 1**.

**Ink curve:**
| Turn | Max Ink (if inked every turn) |
|------|------|
| 1    | 1    |
| 2    | 2    |
| 3    | 3    |
| 4    | 4    |
| 5    | 5    |

- Cost ceiling is realistically **5** (only playable turn 5+). Most cards cost **1–3**.

### Expendable Inking (Alternative)

- You may sacrifice **any number of cards** from your hand for ink in a single turn.
- Each sacrificed card provides ink equal to its ink value (1, or 2 for Rich).
- Ink gained this way is **spent immediately** — it does not persist between turns.
- You must ink enough cards each turn to pay for what you want to play that turn.

## Lanes

- The board has **3 lanes**.
- Each lane can hold **one creature per player** (6 total creature slots).
- When playing a creature, you must choose which lane to place it in.
- A creature stays in its lane until it dies or is returned to hand.
- You cannot play a creature into a lane where you already have a creature.

## Combat

Two combat modes are available for playtesting:

### Mutual Damage (Default)

- During the Combat Phase, **all non-exhausted creatures attack simultaneously**.
- A creature attacks the opposing creature in the same lane.
  - If there is an opposing creature: **both creatures deal their power as damage to each other**.
  - If the lane is empty: the creature deals its power as **damage to the opponent's life total**.
- **Persistent health** — damage accumulates on creatures. A creature dies when its accumulated damage equals or exceeds its life.
- Dead creatures are removed from the board immediately after combat resolves.

### Attacker-Only Damage (Alternative)

- During the Combat Phase, **all non-exhausted creatures belonging to the active player attack**.
- Only the **active player's creatures deal damage** — defending creatures do not strike back.
  - If there is an opposing creature: the attacking creature deals its power as damage to the defender. **The defender does not deal damage back.**
  - If the lane is empty: the attacking creature deals its power as **damage to the opponent's life total**.
- **Persistent health** — damage accumulates on creatures. A creature dies when its accumulated damage equals or exceeds its life.
- Dead creatures are removed from the board immediately after combat resolves.
- This mode makes **lane placement and turn order more strategic** — you can attack into a creature to soften it up without your creature taking a hit in return. Defending creatures only deal damage on their owner's turn.

## Summoning

- By default, creatures have **no summoning sickness** — they can attack the turn they are played.
- Creatures with the **Slow** keyword enter exhausted and cannot attack until the following turn.

## Keywords

| Keyword   | Effect |
|-----------|--------|
| **Cleave** | When played, destroys the creature in the opposing lane. |
| **Tide**   | When played, return any one creature (yours or opponent's) to its owner's hand. |
| **Slow**   | Enters exhausted; cannot attack the turn it is played. |
| **Evasion** | Cannot be blocked — always deals damage to the opponent's life total, even if there is an opposing creature in the same lane. Does not take combat damage from the opposing creature. |
| **Tough**  | Takes no damage from creatures with lower power. |
| **Rich**   | When sacrificed for ink, provides 2 ink instead of 1. |

## Card Anatomy

Each card has:
- **Name** — the card's identity.
- **Cost** — ink cost to play from hand.
- **Power** — damage dealt in combat.
- **Life** — total damage the creature can sustain before dying.
- **Keywords** — zero or more keyword abilities.
- **Inkable** — whether the card can be sacrificed for ink (default: yes).

## Hard Limits

- **6-turn maximum** — the game ends after 6 complete rounds.
- **Creature stats** — conservatively 1–3 power/life for most cards.
- **Hand size** — no maximum hand size enforced.
- **Deck size** — 20 cards.

## Notes for Playtesting

- Aggro decks may choose never to ink, flooding lanes with cheap creatures.
- Control decks ink consistently, aiming to land expensive bombs in later turns.
- Opponents can read inking behaviour to infer strategy and adjust lane placement.
- Evasion creatures bypass opposing lane creatures entirely — they always hit face.
