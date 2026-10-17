# Changelog

## 1.4.0 — Solid foundations

- Full end-to-end test script (`npm run e2e`, 39 checks): forced captures, multi-jumps, crowning, both rule toggles, draws, no-moves-left, vs-computer and undo, online resign, reload/resume, rematch, a connection dropped mid-move, play with the database down, and the database's security rules.
- Fixed: a result card from a finished game could pop up over a game restarted within a second.
- Fixed: the page's mode attribute shared a name with the menu buttons' (renamed to `data-play`).
- Database: explicit deny-all policies on every table, an index for reports, a retention job, and a test that fails on any secret key in the site.
- Link previews for WhatsApp and others (Open Graph + Twitter tags, a drawn 1200×630 share card).
- Installable app: PNG and maskable icons, Apple touch icon, iOS tags, app shortcuts (daily puzzle, play the computer) and an install button/instructions in Settings.
- Anonymous daily counts (games started/finished, invites opened, puzzles played/shared) with an off switch.
- Plain-language privacy and terms pages, linked from Settings, the nickname fields and the leaderboard.

## 1.3.2

- Every pop-up has a ✕ close button, including after sharing a result.
- Pop-ups are smaller and scale with the screen: tighter text and buttons, paired buttons side by side, no scrolling on small phones.
- Chat now docks in the space under the board instead of floating over it, and speech bubbles stay inside the player's own name bar, so nothing hides a move.

## 1.3.1

- Gentler sounds: soft wooden xylophone notes on a pentatonic scale, quieter overall, no scratchy noise or buzzer.

## 1.3.0 — Reasons to come back

- Daily puzzle: one position a day, the same for everyone, "win within N moves" against the computer's best defence. Streak counter and a short share message (Web Share or WhatsApp). 30 puzzles in `data/puzzles.json`, each proven solvable by the test suite.
- Weekly leaderboards: top players and top campuses, schools or regions (`data/groups.json`), anonymous nicknames only.
- Replay clip: the last moves redrawn on a canvas and recorded as a short video to share or save.
- Unlockable characters from win streaks and puzzle streaks (owl, hedgehog, kenkey seller, tailor), plus four seasonal placeholders. Cosmetic only.
- Speed mode: 10 seconds a turn; a 10-second option for online rooms too.
- How-to-play covers the new modes. README and SQL updated.

## 1.2.0 — Play a friend online

- "Play a friend online": create a room with a 6-letter code and share the invite link (Web Share, or copy). Opening the link joins the match.
- Only moves travel over Supabase Realtime, a couple of bytes each, and both phones check every move with the rules module.
- Resign, rematch (the other side starts), resume after a dropped connection or reload, optional 30 s / 60 s turn timer, rooms close after 2 hours.
- Clear banners when your connection drops or your friend's does, with a "claim the win" option if they don't come back.
- Chat: speech bubbles over the sender's character and a small log. Quick phrases (Ei!, Chale!, You try!, Akwaaba, Good game…), emoji, or up to 80 characters of text, rate-limited and filtered, with mute and report.
- No accounts: a nickname kept on the phone.
- `supabase/schema.sql` with locked-down tables and functions; README setup steps.

## 1.1.0 — Look and fixes

- Five board palettes in Settings (green pencil, blue ink, sepia kente, pink purple, high contrast), remembered on the device.
- Every piece now stands on a team ring with a thick dark outline and a soft light halo. Forest rings have a solid inner line, Market rings a dashed "stitched" line, so the teams differ by pattern as well as colour.
- Night mode: tap the moon doodle (or use Settings). Navy paper, faint rules, chalk text; legal-move paths pulse, the last move leaves a glowing trail and the side to move glows. Follows the phone's dark-mode setting until you choose, and respects reduced motion.
- The header no longer jumps when the computer is "thinking…".
- The last character in a line-up is marked and can't be removed. Name labels have more room.
- Redrawn crocodile (long snout, ridged back, tail) and antelope (long lyre horns).
- Captured-pieces tray and a banner ad placeholder under the board.
- The menu board shows a full starting position.

## 1.0.0

- First release: rules engine with tests, three-level computer opponent, pass-and-play, 12 characters, how-to-play, shop preview, offline support.
