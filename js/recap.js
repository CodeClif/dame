// Post-game recap: three or four handwritten lines in the characters' own voices —
// the best capture, a missed jump, the longest chain, a crowning, and a parting word.
// Pure: it reads the move records kept during the game.

const COUNT = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const word = (n) => COUNT[n] || String(n);

/**
 * @param {object} o
 * @param {{ply:number, side:number, char:string, captures:number, maxAvail:number, promote:boolean, victims:{char:string, king:boolean}[]}[]} o.entries
 * @param {number} o.localSide   the side this phone plays (1 in pass-and-play)
 * @param {number} o.winner      1, -1 or 0
 * @param {(key:string) => {name:string, kind:string, quip?:string}} o.who
 * @param {boolean} [o.twoHumans] pass-and-play: speak to both players by side
 * @returns {{char:string, text:string}[]}
 */
export function buildRecap({ entries, localSide, winner, who, twoHumans = false }) {
  const lines = [];
  const mine = (e) => e.side === localSide;
  const you = (e) => (twoHumans ? `Player ${e.side === 1 ? 1 : 2}` : mine(e) ? 'you' : 'they');
  const moveNo = (e) => e.ply + 1;
  const caps = entries.filter((e) => e.captures > 0);

  // 1. the best capture of the game (most pieces, then a king, then earliest)
  const best = [...caps].sort((a, b) => b.captures - a.captures
    || (b.victims.some((v) => v.king) - a.victims.some((v) => v.king)) || a.ply - b.ply)[0];
  if (best) {
    const { name } = who(best.char);
    const king = best.victims.some((v) => v.king);
    let text;
    if (best.captures >= 3) text = `“${word(best.captures)[0].toUpperCase() + word(best.captures).slice(1)} at once on move ${moveNo(best)}. Ayekoo to me!”`;
    else if (best.captures === 2) text = `“Double wahala on move ${moveNo(best)} — that was me.”`;
    else if (king) text = `“Move ${moveNo(best)}: I took a king. Who’s royal now?”`;
    else text = `“My capture on move ${moveNo(best)}? Captures get personal.”`;
    lines.push({ char: best.char, text: `${name}: ${text}` });
  }

  // 2. a missed jump: a smaller capture taken when a longer chain was there
  const missed = entries.filter((e) => e.captures > 0 && e.maxAvail > e.captures)
    .sort((a, b) => (mine(b) - mine(a)) || (b.maxAvail - b.captures) - (a.maxAvail - a.captures))[0];
  if (missed) {
    const { name } = who(missed.char);
    const subject = you(missed);
    lines.push({
      char: missed.char,
      text: `${name}: “Hwɛ yie! On move ${moveNo(missed)} ${subject} took ${word(missed.captures)} when ${word(missed.maxAvail)} ${missed.maxAvail === 1 ? 'was' : 'were'} there.”`,
    });
  }

  // 3. the other side's longest chain, if it wasn't the best capture already
  const other = caps.filter((e) => best && e.side !== best.side).sort((a, b) => b.captures - a.captures || a.ply - b.ply)[0];
  if (other && other.captures >= 2) {
    const { name } = who(other.char);
    lines.push({ char: other.char, text: `${name}: “Don’t forget my ${word(other.captures)}-piece chain on move ${moveNo(other)}.”` });
  }

  // 4. the first crowning
  const crown = entries.find((e) => e.promote);
  if (crown && lines.length < 3) {
    const { name } = who(crown.char);
    lines.push({ char: crown.char, text: `${name}: “Crowned on move ${moveNo(crown)} — royalty o!”` });
  }

  // 5. a parting word from someone on the winning side
  const winners = entries.filter((e) => (winner ? e.side === winner : true));
  const speaker = winners[winners.length - 1];
  if (speaker) {
    const c = who(speaker.char);
    const parting = winner ? (c.quip || 'Good game. Medaase!') : 'A draw — shake hands, no wahala.';
    lines.push({ char: speaker.char, text: `${c.name}: “${parting}”` });
  }
  return lines.slice(0, 4);
}
