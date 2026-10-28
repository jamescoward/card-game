# Inkbrawl

A three-lane card battler built for phones. See [RULES.md](./RULES.md).

```
npm install
npm run dev      # play locally
npm test         # engine + AI tests
npm run sim      # AI-vs-AI balance report (npm run sim -- 500 for more games)
```

Code layout: `src/engine` (rules engine + AI, no DOM), `src/data` (cards, terrains, decks), `src/ui` (screens, battle view, animations, sound).
