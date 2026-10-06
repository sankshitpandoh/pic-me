# Playmate pitch deck

`../Playmate-Pitch-Deck.pdf` is rendered from `deck.html` (1920×1080 slides). The screenshots in `img/` were captured from the app's web build with demo data (sample conversations, placeholder persona photos, `MOCK_LLM=1`).

Re-render after editing (needs `mobile/node_modules` installed for the fonts, and Playwright):

```bash
cd docs/pitch-deck
node render.cjs ../Playmate-Pitch-Deck.pdf
```
