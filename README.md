# Dame

Ghanaian-style draughts drawn in a school notebook. Forest animals take on the market-day crew on a pencil-hatched board.

- **Rules:** 8×8 board, 12 pieces each, mandatory capture, multi-jumps, kings. Settings toggles for *flying kings* and *men capture backwards* (both on by default). 25 quiet king moves each is a draw.
- **Modes:** play the computer (easy / medium / hard minimax with alpha-beta, in a Web Worker), pass-and-play, or play a friend online.
- **Look:** five board palettes, night mode (tap the moon), 12 original characters drawn as inline SVG that blink, bob, hop, get shocked when captured and get a crown when promoted.
- **Online:** rooms with a 6-letter code and invite link, moves checked by the rules module on both phones, resign, rematch, resume after a dropped connection, optional turn timer, chat with quick phrases, emoji, filtering, mute and report. No accounts.
- **Come back daily:** a daily puzzle (same for everyone, from `data/puzzles.json`) with streaks and a WhatsApp-friendly share, weekly leaderboards by campus, school or region, replay clips you can share as video, characters unlocked by streaks (cosmetic only), and a 10-second speed mode.
- **Extras:** how-to-play page, sound toggle (synthesised, no audio files), captured-pieces tray, ad placeholders, character-pack shop preview with a "Pay via MoMo" button that is UI only. No entry fees, stakes or prizes anywhere.
- **Light:** no build step, no frameworks, no images: everything is drawn in code. The whole site is about 230 KB (about 70 KB gzipped); online play, leaderboards and the replay recorder only load when used. Works offline after the first visit.

## Test on an iPhone

See [`TESTING.md`](TESTING.md) for a 15-minute checklist.

## Install on a phone

Dame is an installable web app (PWA): it has a manifest, PNG icons (including a maskable icon for Android and an Apple touch icon), and a service worker that keeps the whole game working offline.

- **iPhone:** open the site in Safari → Share → *Add to Home Screen*.
- **Android:** Chrome shows *Install app* (or use ⋮ → *Add to Home screen*). Settings in the game also has an install button when the browser offers one.

Link previews (WhatsApp, iMessage, X…) use the Open Graph / Twitter tags in `index.html` and `og.jpg`. Regenerate the share card and icons with `node tools/make-art.mjs` (drawn from the game's own code via `tools/art.html`).

## Run locally

Serve the folder over HTTP (service workers and module workers don't run from `file://`):

```sh
npm start            # python3 -m http.server 8080
```

Then open http://localhost:8080 (or your computer's address from a phone on the same Wi-Fi).

## Test

```sh
npm test             # node --test: rules, AI, online protocol, chat filter, puzzles, unlocks
```

End-to-end (real browser, local Supabase stand-in running the real `schema.sql` in PGlite):

```sh
npm install          # dev tools only: playwright, ws, pglite
npm run e2e          # rules through the UI, online play, dropped connections, database rules, previews, install
```

The puzzle test re-solves every puzzle in `data/puzzles.json` with the rules module, so a broken puzzle fails the build.

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

### Play over days

A turn-based game for slow data. The creator gets an 8-letter code and a `?days=CODE` link to share; whoever opens it first takes the free seat. Each seat has a random secret kept on that phone (`localStorage`); the server stores only its SHA-256 hash, accepts a move only from the player whose turn it is, and refuses moves after 14 quiet days (the player to move forfeits). A move made with no signal is saved on the phone and sent automatically when the connection returns. Games are deleted 30 days after their last move by the retention job.

"Your turn" notifications are optional:

1. Generate VAPID keys once: `npx web-push generate-vapid-keys`.
2. Put the **public** key in `js/config.js` (`VAPID_PUBLIC_KEY`).
3. In Supabase → Edge Functions → Secrets, set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (your site URL).
4. Deploy the function: `supabase functions deploy dame-notify --no-verify-jwt` (it checks the player's seat secret itself).

Where push isn't available (iPhone Safari outside a Home Screen app, older browsers, notifications blocked, or VAPID not configured) the game says so and offers the share/WhatsApp nudge instead.

### Leaderboards

Players pick a nickname and a group in **Leaderboard**. Groups come from [`data/groups.json`](data/groups.json): edit the list freely (ids are lowercase letters, numbers and dashes). Points: computer win easy 1 / medium 2 / hard 3, online win 3, finished online game 1, daily puzzle 2 (once a day). Weeks start on Monday (UTC). The database checks the points, limits floods per nickname and stores nothing but nickname, group and points. It can't stop someone faking scores from a modified browser; it is a friendly board with no prizes.

### Security checklist

- Every table has row level security **on** with an explicit restrictive "deny" policy, and no table privileges for `anon`/`authenticated`. All access goes through `SECURITY DEFINER` functions with a pinned `search_path` that validate inputs. `npm test` and `npm run e2e` check all of this.
- Rooms expire after 2 hours (enforced in every room function), reports are capped per room, points are flood-limited per nickname, chat is rate-limited on both phones (Realtime broadcast never touches the database).
- Only the **anon** key is ever in the site. `test/security.test.js` fails if a `service_role`/secret key or a non-anon JWT appears in any client file.
- **Retention:** enable `pg_cron` and run the `dame-retention` block at the end of `schema.sql` once; it deletes old rooms, reports and scores as promised in `privacy.html`.
- After applying the schema, run Supabase's Security and Performance advisors (Dashboard → Advisors).

### Anonymous counts

`dame_event_counts` holds one row per day per event (`game_start_cpu`, `game_finish_online`, `invite_open`, `puzzle_play`, `puzzle_share`…) with a total. No ids, no IPs. Players can switch it off in Settings, and it's skipped for Do Not Track. To see the numbers: `select * from dame_event_counts order by day desc, event;`

### Tables

All tables have row level security on with **no policies**, so the anon key can't read or write them directly. The site only calls the `SECURITY DEFINER` functions, which check their inputs.

| Table | What it holds | Written by |
| --- | --- | --- |
| `dame_rooms` | room `code`, `created_at`, `expires_at` (2 hours), host `options` (rules, timer, host team), `game` number, `first_turn`, `moves` (compact move codes), `result` | `dame_create_room`, `dame_push_move`, `dame_new_game`, `dame_finish`; read by `dame_get_room` |
| `dame_reports` | room code, reported nickname, the reported message | `dame_report` (max 20 per room) |
| `dame_days_games` | game `id`, `options`, both nicknames and line-ups, hashed seat secrets, `first_turn`, `moves`, `last_move_at`, `result` | `dame_days_create`, `dame_days_join`, `dame_days_move`, `dame_days_finish`; read by `dame_days_get`, `dame_days_list` (never returns the secrets) |
| `dame_push_subs` | push address and keys per game seat (opt-in), deleted when the game ends | `dame_days_subscribe` / `dame_days_unsubscribe`; read only by the `dame-notify` Edge Function |
| `dame_event_counts` | `day`, `event`, `n` (a daily total) | `dame_count` |
| `dame_scores` | `week`, `nickname`, `group_id`, `points`, `reason` | `dame_add_points`; read by `dame_leaderboard` (top 20 players and groups this week) |

Expired rooms are invisible to the functions. To delete them, enable `pg_cron` and schedule the cleanup query at the bottom of `schema.sql`.

### How a game travels

- Only moves go over the channel: a move is its path, one character per square (`"kQ"`, or `"kQ3"` for a double jump). Each phone checks it with `js/rules.js` before playing it.
- Moves are also appended to `dame_rooms.moves`, which only accepts the next ply. Reopening the invite link replays them, so a dropped connection or a reload resumes the game. If the database is unreachable, the two phones sync from each other.
- Chat lines are capped at 80 characters, rate-limited on both phones and filtered for rude words (English, Twi and Pidgin; extend the list in `js/protocol.js`). Mute hides the other player's messages; report sends just that line and the nickname to `dame_reports`.
- Nicknames live in `localStorage` only. Nothing else about the player is stored.

## Daily puzzles

`data/puzzles.json` holds the puzzles. Puzzle #1 is 1 October 2026 (UTC) and they cycle, so everyone gets the same one each day. Each entry:

```json
{ "id": 31, "title": "My puzzle", "rows": ["........", "...", "8 rows"], "turn": 1, "moves": 2,
  "rules": "flying", "options": { "flyingKings": true, "menCaptureBackward": true } }
```

`rows` go top to bottom: `x`/`X` are your man/king (moving up), `o`/`O` the defender's. `moves` is how many of your moves it takes to force a win. Run `npm test` after editing: it fails if a puzzle can't be won in exactly that many moves. `node tools/make-puzzles.mjs` regenerates the 30 built-in puzzles.

## Unlockable characters and packs

Cosmetic only — every piece follows the same rules. Unlocks come from **win streaks** (against the computer or a friend) and **daily-puzzle streaks**:

| Character | Pack | Unlock |
| --- | --- | --- |
| Nana Yaa (owl) · Maame Esi (kenkey seller) | Streak friends | win 3 / 5 in a row |
| Kwesi (hedgehog) · Aunty Efua (tailor) | Streak friends | 3 / 7-day puzzle streak |
| Auntie Akosua (waakye) · Sister Aba (kenkey wrapper) · Kofi Brokeman (plantain roaster) | Chop Bar | win 2 / 4 / 6 in a row |
| Maame Ekua (bofrot) · Brother Kobina (chichinga) · Agya Kwamena (pito brewer) | Chop Bar | 2 / 5 / 14-day puzzle streak |
| Afia (hornbill) · Ekow (grasscutter) · Nana Kwasi (elephant) | Wildlife | win 2 / 4 / 8 in a row |
| Kwadwo (mona monkey) · Abenaa (pangolin) · Kweku (red river hog) | Wildlife | 2 / 4 / 10-day puzzle streak |

Each pack character has a one-line personality (`quip` in `js/characters.js`) used in captions and the post-game recap. Four seasonal characters (Harmattan, rainy-season frog, Fancy Dress masquerader, caroler) are drawn and listed as "coming"; switch one on by removing its `seasonal` field.

**Signature moves:** each character has a travel style and a secret capture skill (`SKILLS` in `js/moves.js`), e.g. the crocodile's Jaw Snap or the spider's Web Wrap. They are drawn as small SVGs in the board's effects layer and change nothing in the rules. They can be switched off in Settings and are skipped when the phone asks for reduced motion.

**Moving parts:** some characters (parrot, crocodile, waakye seller, elephant so far) are drawn as separate parts in `js/rigs.js` (wings, legs, tail, jaws, load) and act out each move. Their look at rest matches `js/characters.js`. Try them on `lab.html`. Characters without a rig use the travel styles in `js/moves.js`.

**Streak freeze:** every 5 days of puzzle streak earns a freeze (hold up to 2). Missing a single day spends one and the streak carries on.

**Post-game recap:** after each game, 2–4 lines in the characters' voices — the best capture, a missed longer jump, the other side's longest chain, a crowning, and a parting word (`js/recap.js`, tested in `test/recap.test.js`).

## Weekly leagues

Players who score points in a week are grouped into leagues of up to 30, in the order they become active. Tiers: Pebble → Cowrie → Bead → Kente → Gold. When a week ends, in leagues of 10 or more, the top 5 move up and the bottom 5 move down (worked out when the player first scores the next week, so no scheduled job is needed). Players returning after a break start one tier lower. Only a nickname and a random player number generated on the phone are stored; the league table shows nicknames only. Tables: `dame_league_members`; functions `dame_add_points(p_player, …)` and `dame_league(p_player)`.

## Layout

| File | What it does |
| --- | --- |
| `js/rules.js` | Pure rules engine: move generation, captures, promotion, results. No DOM. |
| `js/ai.js`, `js/ai-worker.js` | Negamax with alpha-beta, forced-capture extension, iterative deepening on *hard*, run off the main thread. |
| `js/protocol.js` | Move codes, room codes, nickname and chat cleaning, rate limiting (shared with the tests). |
| `js/realtime.js` | Tiny Supabase Realtime (Phoenix protocol) and RPC client. |
| `js/online.js` | Rooms, invites, presence, sync, timer, rematch and chat UI. Loaded on demand. |
| `js/puzzles.js` | Puzzle solver, best defence, daily selection, streaks and share text. |
| `js/progress.js`, `js/profile.js` | Streaks and unlocks; nickname and group (on the phone only). |
| `js/leaderboard.js` | Weekly leaderboard screen and points. Loaded on demand. |
| `js/replay.js` | Redraws the last moves on a canvas and records a short video with MediaRecorder. Loaded on demand. |
| `js/characters.js` | The characters (12 starters, 4 unlockable, 4 seasonal), faces, kente pattern, crown and team rings. |
| `js/sketch.js` | Wobbly pen lines, pencil hatching, board, title lettering, doodles, icons. |
| `js/sound.js` | Synthesised sound effects. |
| `js/app.js` | Screens, game flow, animations, captions, themes, night mode, shop and settings. |
| `data/puzzles.json`, `data/groups.json` | Puzzles and leaderboard groups, both editable. |
| `tools/make-puzzles.mjs` | Generates verified puzzles. |
| `supabase/schema.sql` | Everything Supabase needs. |
| `js/analytics.js` | Anonymous daily counts. |
| `js/recap.js` | Post-game recap lines. |
| `js/days.js`, `js/push.js` | Play over days, My games, offline move queue, "your turn" notifications. |
| `supabase/functions/dame-notify/` | Edge Function that sends the "your turn" push. |
| `privacy.html`, `terms.html` | Plain-language privacy page and terms. |
| `e2e/` | Browser end-to-end tests and the local Supabase stand-in. |
| `sw.js` | Offline cache. |

Debug helper in the console: `dame.position([...8 rows...], turn)` loads a position (`x`/`X` bottom man/king, `o`/`O` top man/king).
