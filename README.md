# Dame

Ghanaian-style draughts drawn in a school notebook. Forest animals take on the market-day crew on a pencil-hatched board.

- **Rules:** 8×8 board, 12 pieces each, mandatory capture, multi-jumps, kings. Settings toggles for *flying kings* and *men capture backwards* (both on by default). 25 quiet king moves each is a draw.
- **Modes:** pass-and-play, or play the computer (easy / medium / hard minimax with alpha-beta pruning, run in a Web Worker).
- **Characters:** 12 original characters drawn as inline SVG. They blink, bob, hop, get shocked when captured and get a crown when promoted.
- **Extras:** how-to-play page, sound toggle (synthesised with Web Audio, no audio files), ad placeholder on the game-over card, character-pack shop with a "Pay via MoMo" button that is UI only.
- **Offline:** a service worker caches the game after the first visit. Installable as a PWA.

No build step and no dependencies. The whole game is about 110 KB. The two handwriting fonts (Caveat, Patrick Hand) come from Google Fonts and are cached for offline use.

## Run

Serve the folder over HTTP (service workers and module workers don't run from `file://`):

```sh
npm start            # python3 -m http.server 8080
```

Then open http://localhost:8080 (use your phone's browser on the same network for the real feel).

## Publish on GitHub Pages

`.github/workflows/pages.yml` runs the tests and deploys the site on every push. One-time setup:

1. The repo must be public (or on a paid plan that allows Pages for private repos).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Re-run the workflow from the **Actions** tab. The game is then at `https://codeclif.github.io/dame/`.

## Test

```sh
npm test             # node --test: rules engine + AI
```

## Layout

| File | What it does |
| --- | --- |
| `js/rules.js` | Pure rules engine: move generation, captures, promotion, results. No DOM. |
| `js/ai.js` | Negamax with alpha-beta, forced-capture extension, iterative deepening on *hard*. |
| `js/ai-worker.js` | Runs the AI off the main thread. |
| `js/characters.js` | The 12 characters, faces, kente pattern and crown. |
| `js/sketch.js` | Wobbly pen lines, pencil hatching, board, title lettering, doodles, icons. |
| `js/sound.js` | Synthesised sound effects. |
| `js/app.js` | Screens, game flow, animations, captions, shop and settings. |
| `sw.js` | Offline cache. Bump `VERSION` when you ship changes. |

Debug helper in the console: `dame.position([...8 rows...], turn)` loads a position (`x`/`X` bottom man/king, `o`/`O` top man/king).
