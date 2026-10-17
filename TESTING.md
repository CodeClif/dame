# iPhone test checklist

About 15 minutes on an iPhone (Safari), with a second phone or a friend for the online parts.
Tick each line; if one fails, note what you saw and the time.

## Basics (works without Supabase)
- [ ] Open https://codeclif.github.io/dame/ in Safari. The title writes itself, the board draws in, and the menu appears.
- [ ] **Play the computer → Start**. Tap a piece: red circle and dotted paths. Move. The computer replies.
- [ ] Set up a capture: when one is available, tapping another piece shows "you must capture!".
- [ ] Get a double jump: both pieces disappear and the tray under the board shows two heads.
- [ ] Reach the far row: the piece gets a crown.
- [ ] Finish a game: the result card has a ✕, 2–4 recap lines in the characters' voices, and **Rematch** works.
- [ ] **Settings**: switch **Flying kings** off, start a game, and check a king moves only one square. Switch it back on.
- [ ] Tap the moon: night mode. Tap it again: day.
- [ ] **Daily puzzle**: solve it (the "Show first move" button helps). Check the 🔥 streak, then **Share** and **WhatsApp**.
- [ ] **Pick your crew**: the Chop Bar and Wildlife packs show, and locked cards say "🔒 Locked" with how to unlock.
- [ ] **Shop**: the free packs are listed, and the paid ones say "coming soon". Nothing can be bought.
- [ ] Footer links in **Settings**: Privacy and Terms open and have a "Back to the game" link.

## Install
- [ ] Safari → Share → **Add to Home Screen**. The tortoise icon appears; open Dame from it (no Safari bars).
- [ ] Turn on Airplane mode and open Dame from the Home Screen: it still loads and you can play the computer.
- [ ] Long-press the icon: the **Daily puzzle** shortcut opens the puzzle (Android only; iPhone has no shortcuts).

## Link previews
- [ ] Paste https://codeclif.github.io/dame/ into a WhatsApp chat: a preview with the drawn board and "Play Dame with me!" appears.

## Online (needs the Supabase keys in js/config.js)
- [ ] **Play a friend online → Live now → Create a room → Share invite** to the second phone. Opening the link starts the game, and the board is turned round on the second phone.
- [ ] Play a few moves. Send "Chale!" and a short text: the bubble shows by the sender's name and the board stays visible.
- [ ] Turn Airplane mode on for 10 s mid-game, then off: a banner shows, then clears, and the moves catch up.
- [ ] Close Safari on the second phone and reopen the invite link: the game resumes.
- [ ] **Menu → Resign** on one phone: both phones show the result. **Ask for a rematch** → **Let's go!** starts a new game.
- [ ] **Over days → Start a game over days**, make a move, then **Tell … it's their turn** (WhatsApp). The friend opens the link, joins and moves.
- [ ] **My games** lists the game and says whose turn it is.
- [ ] From the Home Screen app: tap **🔔 Notify me** and allow notifications. When the friend moves, a "Your move in Dame" notification arrives. (In plain Safari it explains that you need to add Dame to the Home Screen first.)
- [ ] **Leaderboard → My league**: after a win, your nickname is in a Pebble league with an "ends in" countdown.
