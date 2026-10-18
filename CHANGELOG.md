# Changelog

## 1.9.1 — Spider's Web Sling

- The spider's capture is now **Web Sling**: he rears up, shoots a silk line at the piece (THWIP!), wraps it up, then yanks and slings it right off the board before scuttling on.

## 1.9.0 — All the Forest Friends come alive

- Moving parts for the rest of the Forest Friends:
  - **tortoise** plods with his head bobbing; to capture he tucks in and spins like a top through the piece (Shell Spin);
  - **antelope** springs across in one leap, ears flopping, legs tucked; to capture she lowers her horns and tosses the piece (Horn Toss, WHEE!);
  - **spider** scuttles on eight rippling legs; to capture he rears up and wraps the piece in a web (Web Wrap);
  - **bush cat** crouches, ears flat, tail swishing, wiggles and pounces; she lands on the piece paws first and swipes (Pounce Swipe);
  - **owl** turns her head to look, beats her wings and glides; she swoops down with talons out (Night Swoop);
  - **hedgehog** scurries, nose sniffing; he curls into a spiky ball and rolls through the piece (Spike Roll).
- Each one fidgets while waiting: the tortoise hides in his shell, the antelope flicks her ears, the spider waves a leg, the bush cat twitches an ear, the owl swivels her head, the hedgehog sniffs.
- Crocodile: the bite now lands right on the piece, with bigger tooth marks and a bigger CHOMP!

## 1.8.0 — Characters come alive (first four)

- Akua the parrot, Kwabena the crocodile, Auntie Akosua (waakye seller) and Nana Kwasi the elephant now have moving parts in the game:
  - the parrot opens her wings and flies, leaving her ring on the ground like a shadow, and dives at pieces she captures;
  - the crocodile turns to face the way he's going, crawls with paddling legs and a swishing tail, and bites captured pieces with his own jaws (CHOMP!);
  - the waakye seller stands up and walks with her bowl wobbling and steam rising, and splashes shito on captured pieces;
  - the elephant plods on stumpy legs with flapping ears, rears up (TOOT!) and stomps captured pieces.
- At rest they look exactly as before, still blinking and bobbing, with an occasional fidget (head tilt, yawn, ear flap). Crowns ride along on kings.
- The setting is now called **Character animations**. It only changes your own screen; your opponent sees whatever they chose.
- `lab.html`: a sample page for trying the motions with Move / Capture buttons, Full / Simple and slow motion.

## 1.7.0 — Signature moves

- Every character now travels its own way: the crocodile slithers, birds fly, the tortoise and pangolin roll, the antelope leaps, the spider scuttles, the bush cat pounces, the tro-tro and river hog charge, the mona monkey swings, the elephant stomps (and the board shakes).
- Every character has a secret capture skill drawn in pen, e.g. the crocodile's **Jaw Snap** (jaws close on the piece: "CHOMP!"), the spider's **Web Wrap** (lifted away on a thread), the fisherman's **Net Cast**, the trader's **Basin Scoop**, the driver's **Tro-tro Honk** ("POM POM!"), the drummer's **Drum Boom**, the elephant's **Trunk Stomp**, the plantain roaster's **Roasted!**, the grasscutter's **Nibble Nibble**.
- The first time a character uses its skill in a game, a margin note names it. Line-up cards show each skill (✨).
- Purely cosmetic: the rules are unchanged. New **Signature moves** switch in Settings; phones set to reduce motion get the old simple knock-out.
- New file `js/moves.js` (about 25 KB).

## 1.6.0 — Keep people coming back

- Weekly leagues of up to 30, grouped by when players become active, with tiers Pebble → Cowrie → Bead → Kente → Gold. Top 5 move up and bottom 5 move down in leagues of 10+. "My league" tab with nicknames only.
- Streak freeze: earn one every 5 puzzle days (hold up to 2); a single missed day uses it and the streak survives. Shown as 🧊 on the menu.
- Post-game recap: 2–4 handwritten lines in the characters' voices (best capture, missed jump, longest chain, crowning, parting word).
- Two new free packs of 6 original characters each, drawn in code: **Chop Bar** (waakye, kenkey wrapper, chichinga, bofrot, pito, plantain) and **Wildlife** (mona monkey, hornbill, elephant, pangolin, grasscutter, red river hog), with Akan day-names and their own caption lines, unlocked by streaks, with a clearly labelled locked state. The line-up screen is grouped by pack.
- Shop: free packs first; paid packs marked "coming soon". Nothing can be bought.
- Points now count without a group (group is optional); leaderboards ignore players with no group.
- `TESTING.md`: an iPhone test checklist. 59 end-to-end checks.

## 1.5.0 — Play over days

- "Over days" mode on the Play-a-friend screen: start a game, move, and share the link. The friend replies whenever they like; the game is stored in Supabase.
- After each move: a "tell them it's their turn" share button and a WhatsApp link. Optional "your turn" push notifications (Edge Function + service worker), with a clear message where the browser can't do them (e.g. iPhone Safari outside a Home Screen app).
- Moves made without signal are saved on the phone and sent when the connection returns.
- "My games": every game this phone plays, whose turn it is, time since the last move and days left. A badge on the menu shows how many are waiting for you.
- Games end after 14 days without a move; the player to move forfeits, with a clear message.
- Seats are protected by a random secret kept on each phone (only its hash is stored); only the player to move can move.
- End-to-end tests for all of the above (50 checks).

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
