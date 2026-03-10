# Ideas & Future Concepts

Dumping ground for design ideas that aren't on the immediate roadmap.

---

## Strategic Depth (Playtesting Observation)

**Problem:** All decisions currently feel tactical and in-the-moment — players react to the current board state rather than planning ahead. There is no meaningful strategic layer.

**Root cause:** The game has no carry-forward planning hooks. Each turn is self-contained: draw, ink, play, fight. Nothing you do now sets up a future turn in a way that requires forethought.

**Candidate solutions:**

- **Secondary win conditions** — e.g. controlling 2 of 3 lanes at end of turn earns a "dominance point"; first to 3 wins. Players now need to plan which lanes to commit to rather than just reacting to the board.
- **Cards that set up future turns** — spells or creatures with delayed effects (e.g. "at the start of your next turn, draw 2") give players something to build toward rather than just responding.
- **Pre/post-combat play** (see Second Play Step below) — adds some planning around combat ordering but is still largely tactical.

---

## Cleave Balance (Playtesting Observation)

**Problem:** The aggro deck is dominant and Cleave is the main culprit. Cleave cards are doubly rewarding: they clear a lane on entry (removing the threat that would trade with them) and then deal uncontested damage because the lane is now empty. They also have high power stats, so even if they survive one turn they deal significant damage before dying.

**Why Tide doesn't answer it:** Bouncing a Cleave creature is a negative trade — the opponent just replays it, triggers Cleave again, and gets another free damage turn. You've spent a Tide effect and they got two Cleave triggers.

**Candidate fixes:**

- **Remove the damage bonus** — Cleave creatures could have lower power stats to compensate for the guaranteed damage turn. The keyword is already strong as pure removal; high attack on top is too much.
- **Cleave has Slow** — the creature enters exhausted, so it clears the lane but doesn't immediately attack. Gives the opponent a turn to respond before it deals damage.
- **Cleave destroys but doesn't clear for damage** — the destroyed creature's "ghost" still blocks damage through to the player that turn (flavour: the fight still happened). Mechanically fiddly but nerfs the free damage window.
- **Cleave costs extra** — add +1 to the cost of all Cleave cards. The effect is already a 2-for-1; the current costs don't reflect that.

---

## Overwriting Creatures in a Lane

Allow a player to play a creature into a lane that already contains one of their own creatures. The existing creature is destroyed (sent to discard) and replaced by the new one.

**Why it's interesting:**
- Prevents players getting locked out when they commit cheap early creatures to all 3 lanes
- Makes early plays feel like tempo moves rather than permanent commitments
- Creates a new decision: play a 1-drop now knowing you can replace it later, or hold it for inking?

**Rules:**
- Can only overwrite your own creatures, not the opponent's
- Replaced creature is destroyed (sent to discard) — not returned to hand, which would have no downside
- The new creature still costs ink as normal
- On-play keywords (Cleave, Tide) still trigger for the new creature

**Interactions to verify:**
- Cleave still only destroys the opposing creature in the lane, not the overwritten one
- Damaged creatures being overwritten don't heal — the new creature starts fresh

---

## Spells

A second card type with no lane presence. Spells are played from hand, cost ink, resolve immediately, and go to the discard pile.

**Why it's interesting:**
- Lets players interact with the board without occupying a lane
- Control decks get tools that don't require lane investment
- Opens up a wider design space than creatures alone

**Possible spell effects:**
- **Removal** — destroy or deal damage to a target creature (gives control a lane-independent answer)
- **Pump** — give a friendly creature +2 power this turn (enables surprise lethal)
- **Card draw** — draw 1–2 cards (rewards decks built around it)
- **Lane manipulation** — move your own creature to a different lane
- **Burn** — deal damage directly to the opponent's life total

**Design considerations:**
- Spells could be uninkable (or always inkable), which is a meaningful trade-off decision
- Instant vs. sorcery timing (can spells be played during combat?) adds complexity — keep sorcery-speed only for now
- Need to decide if spells go in the deck alongside creatures or are a separate draft pool

---

## Second Play Step (Pre- and Post-Combat Play)

Split the Play phase into two windows: one before combat and one after.

**Turn structure would become:**
Draw → Ink → Play (pre-combat) → Combat → Play (post-combat) → End

**Why it's interesting:**
- **Sacrifice and replace** — play a cheap creature to soak a hit, then drop a defender in that lane after combat clears it
- **Combat tricks** — use Tide post-combat to bounce a damaged-but-surviving threat back to the opponent's hand
- **Evasion timing decisions** — play Evasion pre-combat to have it attack, or post-combat to protect it until next turn
- **Lane reading** — players now have to think two steps ahead when placing creatures

**Design considerations:**
- Makes turns longer and more cognitively demanding — could hurt the pick-up-and-play feel
- Could limit to "play at most one card post-combat" to keep it bounded
- Would need UI to clearly distinguish the two play windows

---

## Other Keyword Ideas

- **Lifesteal** — damage this creature deals to the opponent heals you for the same amount; changes the aggro/control dynamic significantly
- **Taunt** — opposing player must target this creature with Cleave or Tide effects before targeting other friendly creatures
- **Echo** — when this creature dies, return a 1/1 token copy of it to your hand, or leave behind a 1/1 in the same spot
