# Dame

Ghanaian-style draughts drawn in a school notebook. Forest animals take on the market-day crew on a pencil-hatched board.

- **Rules:** 8×8 board, 12 pieces each, mandatory capture, multi-jumps, kings. Settings toggles for *flying kings* and *men capture backwards* (both on by default). 25 quiet king moves each is a draw.
- **Modes:** play the computer (easy / medium / hard minimax with alpha-beta, in a Web Worker), pass-and-play, or play a friend online.
- **Look:** five board palettes, night mode (tap the moon), 12 original characters drawn as inline SVG that blink, bob, hop, get shocked when captured and get a crown when promoted.
- **Online:** rooms with a 6-letter code and invite link, moves checked by the rules module on both phones, resign, rematch, resume after a dropped connection, optional turn timer, chat with quick phrases, emoji, filtering, mute and report. No accounts.
- **Extras:** how-to-play page, sound toggle (synthesised, no audio files), captured-pieces tray, ad placeholders, character-pack shop preview with a "Pay via MoMo" button that is UI only. No entry fees, stakes or prizes anywhere.
- **Light:** no build step, no frameworks. The core game is about 120 KB before compression; the online module (about 25 KB) only loads when you play a friend. Works offline after the first visit.

## Run locally

Serve the folder over HTTP (service workers and module workers don't run from `file://`):

```sh
npm start            # python3 -m http.server 8080
```

Then open http://localhost:8080 (or your computer's address from a phone on the same Wi-Fi).

## Test

```sh
npm test             # node --test: rules engine, AI, online protocol and chat filter
```

## Publish on GitHub Pages

The repo deploys from the `claude/dame-game` branch. Either Pages setting works:

- **Deploy from a branch** (Settings → Pages → Source: *Deploy from a branch*, branch `claude/dame-game`, folder `/`), or
- **GitHub Actions** (Source: *GitHub Actions*): `.github/workflows/pages.yml` runs the tests and deploys on every push.

After changing files, bump `VERSION` in `sw.js` so returning players get the new version straight away.

## Set up online play (Supabase)

Online play, chat reports and (later) leaderboards use a free Supabase project. Without it the game works fully offline and the "Play a friend online" button stays hidden.

1. Create a project at https://supabase.com (the free tier is plenty).
2. **SQL editor:** paste all of [`supabase/schema.sql`](supabase/schema.sql) and run it. It creates the tables and functions below. It is safe to run again after updates.
3. **Realtime:** in Project Settings → Realtime, make sure public channels are allowed ("Allow public access" on). The game uses broadcast and presence on channels named `dame-<CODE>`; no database replication is needed.
4. **Keys:** in Project Settings → API copy the *Project URL* and the *anon public* key into [`js/config.js`](js/config.js). **Never** use the `service_role` key in the site: `config.js` is public.
5. Commit, bump `VERSION` in `sw.js`, push. The button appears on the menu.

### Tables

All tables have row level security on with **no policies**, so the anon key can't read or write them directly. The site only calls the `SECURITY DEFINER` functions, which check their inputs.

| Table | What it holds | Written by |
| --- | --- | --- |
| `dame_rooms` | room `code`, `created_at`, `expires_at` (2 hours), host `options` (rules, timer, host team), `game` number, `first_turn`, `moves` (compact move codes), `result` | `dame_create_room`, `dame_push_move`, `dame_new_game`, `dame_finish`; read by `dame_get_room` |
| `dame_reports` | room code, reported nickname, the reported message | `dame_report` (max 20 per room) |

Expired rooms are invisible to the functions. To delete them, enable `pg_cron` and schedule the cleanup query at the bottom of `schema.sql`.

### How a game travels

- Only moves go over the channel: a move is its path, one character per square (`"kQ"`, or `"kQ3"` for a double jump). Each phone checks it with `js/rules.js` before playing it.
- Moves are also appended to `dame_rooms.moves`, which only accepts the next ply. Reopening the invite link replays them, so a dropped connection or a reload resumes the game. If the database is unreachable, the two phones sync from each other.
- Chat lines are capped at 80 characters, rate-limited on both phones and filtered for rude words (English, Twi and Pidgin; extend the list in `js/protocol.js`). Mute hides the other player's messages; report sends just that line and the nickname to `dame_reports`.
- Nicknames live in `localStorage` only. Nothing else about the player is stored.

## Layout

| File | What it does |
| --- | --- |
| `js/rules.js` | Pure rules engine: move generation, captures, promotion, results. No DOM. |
| `js/ai.js`, `js/ai-worker.js` | Negamax with alpha-beta, forced-capture extension, iterative deepening on *hard*, run off the main thread. |
| `js/protocol.js` | Move codes, room codes, nickname and chat cleaning, rate limiting (shared with the tests). |
| `js/realtime.js` | Tiny Supabase Realtime (Phoenix protocol) and RPC client. |
| `js/online.js` | Rooms, invites, presence, sync, timer, rematch and chat UI. Loaded on demand. |
| `js/characters.js` | The characters, faces, kente pattern, crown and team rings. |
| `js/sketch.js` | Wobbly pen lines, pencil hatching, board, title lettering, doodles, icons. |
| `js/sound.js` | Synthesised sound effects. |
| `js/app.js` | Screens, game flow, animations, captions, themes, night mode, shop and settings. |
| `supabase/schema.sql` | Everything Supabase needs. |
| `sw.js` | Offline cache. |

Debug helper in the console: `dame.position([...8 rows...], turn)` loads a position (`x`/`X` bottom man/king, `o`/`O` top man/king).
