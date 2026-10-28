# Inkbrawl — Rules

A fast lane battler for mobile. Two heroes, three lanes, one ink a turn. Games last about 5–6 rounds.

## Goal

Reduce the enemy hero from **20 life** to **0**.

## Setup

- Each player has a **20-card** deck from one of four factions.
- The first player draws **5** cards and skips their first draw. The second player starts with **6**.
- The board deals **3 random terrains**, one per lane (see Terrains).

## Your turn

At the start of your turn your creatures ready up and you draw a card. Then, in any order:

1. **Ink (once per turn).** Sacrifice a card from your hand for **+1 permanent ink**. Some cards have an **Ink:** bonus that triggers when inked. 🚫 cards are uninkable (bombs).
2. **Play cards.** Spend ink to play creatures into your lanes or cast spells.
   - Each lane holds one creature per player.
   - Playing onto your own creature **replaces** it. The old creature dies, and its death effects trigger.
3. **FIGHT.** Each of your ready creatures attacks the opposite lane:
   - If an enemy creature is there, they trade blows (both deal their power).
   - If the lane is empty, the enemy hero takes the damage.
   - Defenders strike back but only attack on their own turn.
   - Damage on creatures persists between turns.

The FIGHT button previews total face damage, and 💀 marks creatures predicted to die.

## The Storm

From **round 8**, each hero takes 1, 2, 3… damage at the start of their turn, so stalled games end.

## Keywords

| Keyword | Effect |
|---|---|
| 🪽 Flying | Attacks the hero directly unless the opposing creature also has Flying. |
| 🛡️ Tough | Takes 1 less damage from everything. |
| 🫧 Shield | The first instance of damage is absorbed. |
| 🩸 Lifesteal | Damage it deals heals its hero. |
| ☠️ Deadly | Any damage it deals to a creature destroys it. |
| 🦶 Trample | Excess combat damage hits the hero. |
| 🐌 Slow | Can't attack the turn it is played. |

Other effects are written on the cards: **On play**, **When this dies**, **Start of your turn**, **Ink:**, **Devour** (bonus if it replaces your creature) and **freeze** (skips its next attack).

## Terrains

| Terrain | Effect |
|---|---|
| 🌋 Volcano | End of each turn: 1 damage to both creatures here. |
| ⛩️ War Shrine | Creatures here have +1 power. |
| 🏰 Fortress | Creatures here have Tough. |
| 🌬️ Windy Pass | Attacks here can't be blocked. |
| 🏟️ Arena | Hero damage from this lane is doubled. |
| 💎 Crystal Mine | Start of your turn: +1 ink this turn if you have a creature here. |
| 📚 Library | Start of your turn: draw a card if you have a creature here. |
| 🏝️ Oasis | End of each turn: creatures here fully heal. |
| 🪦 Haunted Crypt | When a creature dies here, its owner gets a Spirit (1/1 Flying) in hand. |
| 👑 King's Hill | End of your turn: if only you have a creature here, deal 2 to the enemy hero. |
| ⛰️ Narrow Pass | Only creatures costing 3 or less can be played here. |
| ⚒️ Forge | Creatures played here get +1/+1. |

## Factions

- 🔥 **Ember Horde**: aggro. Cheap hitters, burn, Trample.
- 🌊 **Tidecallers**: tempo. Flyers, bounce, freeze, card draw.
- 🌿 **Wildgrove**: ramp. Growing creatures and trampling giants.
- 💀 **Bonecult**: sacrifice. Death triggers, Lifesteal, Deadly, Devour.

Neutral cards appear as Gauntlet rewards.

## Modes

- **Quick Battle**: vs AI (Easy / Normal / Hard).
- **Gauntlet**: roguelike run of 6 AI rivals. Draft a card after each win, trim your deck every other win, face a 25-life champion at the end. One loss ends the run.
- **Pass & Play**: hotseat, with a hand-hiding screen between turns.

## Balance

`npm run sim` plays AI-vs-AI games for every faction pairing and reports win rates, first-player advantage and game length. At the time of writing every faction sits between about 47% and 56%, and first-player win rate is about 52%.
