// Signature moves: how each character travels across the board, and the secret skill it
// shows off when it captures (the crocodile's Jaw Snap, the spider's Web Wrap…).
// Purely cosmetic — the rules never change. Effects are small hand-drawn SVGs that live
// for under a second in the board's effects layer and then remove themselves.

const INK = '#2b2622';

/** Every character's skill name, travel style and capture effect. */
export const SKILLS = {
  // Forest Friends
  tortoise: { name: 'Shell Spin', travel: 'roll', strike: 'spinout' },
  antelope: { name: 'Horn Toss', travel: 'leap', strike: 'toss' },
  spider: { name: 'Web Wrap', travel: 'scuttle', strike: 'web' },
  crocodile: { name: 'Jaw Snap', travel: 'slither', strike: 'chomp' },
  parrot: { name: 'Feather Flurry', travel: 'fly', strike: 'feathers' },
  bushcat: { name: 'Pounce Swipe', travel: 'pounce', strike: 'claws' },
  owl: { name: 'Night Swoop', travel: 'fly', strike: 'feathers' },
  hedgehog: { name: 'Spike Roll', travel: 'roll', strike: 'spinout' },
  // Market Crew
  trader: { name: 'Basin Scoop', travel: 'hop', strike: 'basin' },
  driver: { name: 'Tro-tro Honk', travel: 'charge', strike: 'honk' },
  drummer: { name: 'Drum Boom', travel: 'hop', strike: 'boom' },
  farmer: { name: 'Hoe Chop', travel: 'hop', strike: 'sink' },
  schoolchild: { name: 'Book Bonk', travel: 'skip', strike: 'bonk' },
  fisherman: { name: 'Net Cast', travel: 'hop', strike: 'net' },
  kenkey: { name: 'Wrap Up', travel: 'hop', strike: 'wrap' },
  tailor: { name: 'Stitch Up', travel: 'skip', strike: 'stitch' },
  // Chop Bar pack
  waakye: { name: 'Shito Splash', travel: 'hop', strike: 'splash', color: '#b8322a' },
  bofrot: { name: 'Sugar Dust', travel: 'skip', strike: 'dust', color: '#fffaf0' },
  kenkeywrap: { name: 'Husk Wrap', travel: 'hop', strike: 'wrap' },
  chichinga: { name: 'Skewer Spin', travel: 'hop', strike: 'skewer' },
  plantain: { name: 'Roasted!', travel: 'hop', strike: 'flames' },
  pito: { name: 'Calabash Splash', travel: 'hop', strike: 'splash', color: '#c88b4f' },
  // Wildlife pack
  mona: { name: 'Vine Swing', travel: 'swing', strike: 'toss' },
  hornbill: { name: 'Beak Peck', travel: 'fly', strike: 'peck' },
  pangolin: { name: 'Ball Roll', travel: 'roll', strike: 'spinout' },
  grasscutter: { name: 'Nibble Nibble', travel: 'scuttle', strike: 'nibble' },
  riverhog: { name: 'Snout Charge', travel: 'charge', strike: 'blown' },
  elephant: { name: 'Trunk Stomp', travel: 'stomp', strike: 'stomp' },
  // Seasonal placeholders
  harmattan: { name: 'Dust Devil', travel: 'swing', strike: 'dust', color: '#ead9b8' },
  rainfrog: { name: 'Puddle Jump', travel: 'leap', strike: 'splash', color: '#5aa2d8' },
  masquerader: { name: 'Fancy Twirl', travel: 'skip', strike: 'spinout' },
  caroler: { name: 'High Note', travel: 'hop', strike: 'boom' },
};
const DEFAULT = { name: 'Big Jump', travel: 'hop', strike: 'spinout' };
export const skillOf = (key) => SKILLS[key] || DEFAULT;

// ---------- travel: the hopper's keyframes for one leg of a move ----------

/** Keyframes for the piece's inner "hopper" while it travels one diagonal leg. */
export function travelFrames(style, dist) {
  const lift = 28 + dist * 7;
  switch (style) {
    case 'roll': return {
      frames: [{ transform: 'translateY(0) rotate(0)' }, { transform: `translateY(-${lift * 0.45}%) rotate(180deg)`, offset: 0.5 }, { transform: 'translateY(0) rotate(360deg)' }],
      mul: 1.1, easing: 'ease-in-out' };
    case 'slither': return {
      frames: [{ transform: 'translateY(0) rotate(0) scaleX(1)' }, { transform: 'translateY(4%) rotate(-9deg) scaleX(1.12)', offset: 0.25 }, { transform: 'translateY(4%) rotate(9deg) scaleX(1.12)', offset: 0.5 }, { transform: 'translateY(4%) rotate(-7deg) scaleX(1.1)', offset: 0.75 }, { transform: 'translateY(0) rotate(0) scaleX(1)' }],
      mul: 1.15, easing: 'linear' };
    case 'fly': return {
      frames: [{ transform: 'translateY(0) rotate(0)' }, { transform: `translateY(-${lift * 1.7}%) rotate(-12deg) scale(1.08)`, offset: 0.35 }, { transform: `translateY(-${lift * 1.5}%) rotate(10deg) scale(1.08)`, offset: 0.6 }, { transform: 'translateY(0) rotate(0) scale(1.1,.9)', offset: 0.9 }, { transform: 'translateY(0) scale(1)' }],
      mul: 1.25, easing: 'ease-in-out' };
    case 'leap': return {
      frames: [{ transform: 'translateY(0) scale(1.1,.85)' }, { transform: `translateY(-${lift * 2}%) rotate(-8deg) scale(.92,1.1)`, offset: 0.45 }, { transform: 'translateY(0) scale(1.15,.82)', offset: 0.88 }, { transform: 'translateY(0) scale(1)' }],
      mul: 1.15, easing: 'ease-in-out' };
    case 'scuttle': return {
      frames: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ transform: `translateY(${i % 2 ? -8 : 0}%) rotate(${i % 2 ? 6 : -6}deg)` })).concat([{ transform: 'none' }]),
      mul: 0.75, easing: 'linear' };
    case 'pounce': return {
      frames: [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(6%) scale(1.15,.75)', offset: 0.25 }, { transform: `translateY(-${lift * 1.3}%) rotate(-14deg) scale(.9,1.15)`, offset: 0.6 }, { transform: 'translateY(0) scale(1.15,.85)', offset: 0.9 }, { transform: 'none' }],
      mul: 1.05, easing: 'ease-in' };
    case 'charge': return {
      frames: [{ transform: 'skewX(0) translateY(0)' }, { transform: 'skewX(-14deg) translateY(-6%)', offset: 0.2 }, { transform: 'skewX(-16deg) translateY(-3%)', offset: 0.8 }, { transform: 'skewX(6deg) translateY(0)', offset: 0.92 }, { transform: 'none' }],
      mul: 0.7, easing: 'cubic-bezier(.6,0,.4,1)' };
    case 'swing': return {
      frames: [{ transform: 'translateY(0) rotate(0)' }, { transform: `translateY(-${lift * 2.1}%) rotate(-25deg)`, offset: 0.4 }, { transform: `translateY(-${lift * 1.6}%) rotate(20deg)`, offset: 0.7 }, { transform: 'translateY(0) rotate(0)' }],
      mul: 1.25, easing: 'ease-in-out' };
    case 'skip': return {
      frames: [{ transform: 'translateY(0)' }, { transform: `translateY(-${lift * 0.7}%)`, offset: 0.25 }, { transform: 'translateY(0) scale(1.08,.92)', offset: 0.5 }, { transform: `translateY(-${lift * 0.6}%)`, offset: 0.75 }, { transform: 'translateY(0)' }],
      mul: 1.1, easing: 'ease-in-out' };
    case 'stomp': return {
      frames: [{ transform: 'translateY(0) scale(1)' }, { transform: `translateY(-${lift * 0.8}%) scale(1.05)`, offset: 0.55 }, { transform: 'translateY(0) scale(1.22,.74)', offset: 0.85 }, { transform: 'none' }],
      mul: 1.3, easing: 'ease-in' };
    default: return {
      frames: [
        { transform: 'translateY(0) scale(1,1)' },
        { transform: 'translateY(-3%) scale(1.07,.9)', offset: 0.1 },
        { transform: `translateY(-${lift}%) scale(.95,1.06)`, offset: 0.5 },
        { transform: 'translateY(0) scale(1.14,.84)', offset: 0.88 },
        { transform: 'translateY(0) scale(1,1)' },
      ],
      mul: 1, easing: 'linear' };
  }
}

// ---------- capture effects ----------

const svgNS = 'http://www.w3.org/2000/svg';
const box = (fx, r, c) => {
  const d = document.createElement('div');
  d.className = 'spark strike';
  d.style.setProperty('--r', r);
  d.style.setProperty('--c', c);
  d.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"></svg>';
  fx.appendChild(d);
  return d;
};
const add = (svg, markup) => {
  const g = document.createElementNS(svgNS, 'g');
  g.innerHTML = markup;
  g.style.transformBox = 'fill-box';
  g.style.transformOrigin = 'center';
  svg.appendChild(g);
  return g;
};
const anim = (el, frames, opts) => el.animate(frames, { fill: 'forwards', ...opts }).finished.catch(() => {});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const word = (svg, text, color = '#d62828', y = 2) => {
  const g = add(svg, `<text x="50" y="${y}" text-anchor="middle" font-family="Caveat, cursive" font-weight="700" font-size="22" fill="${color}" stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${text}</text>`);
  anim(g, [{ transform: 'scale(.2) rotate(-12deg)', opacity: 0 }, { transform: 'scale(1.15) rotate(4deg)', opacity: 1, offset: 0.3 }, { transform: 'scale(1) rotate(-3deg)', opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 900 });
};
const drawIn = (g, ms = 260, delay = 0) => {
  for (const p of g.querySelectorAll('path,circle,polyline')) {
    p.setAttribute('pathLength', '1');
    p.style.strokeDasharray = '1.02 1.02';
    anim(p, [{ strokeDashoffset: 1.02 }, { strokeDashoffset: 0 }], { duration: ms, delay });
  }
};

// Ways for the captured piece to leave the board.
function exit(victim, base, kind, dir = 1) {
  const frames = {
    eaten: [{ transform: base }, { transform: `${base} scale(.15)`, opacity: 0 }],
    toss: [{ transform: base }, { transform: `${base} translate(${dir * 60}%, -160%) rotate(${dir * 280}deg) scale(.7)`, offset: 0.5 }, { transform: `${base} translate(${dir * 140}%, -60%) rotate(${dir * 540}deg) scale(.2)`, opacity: 0 }],
    blown: [{ transform: base }, { transform: `${base} translate(${dir * 30}%, -10%) rotate(${dir * 30}deg)`, offset: 0.2 }, { transform: `${base} translate(${dir * 420}%, -40%) rotate(${dir * 720}deg) scale(.5)`, opacity: 0 }],
    lift: [{ transform: base }, { transform: `${base} translateY(-20%)`, offset: 0.3 }, { transform: `${base} translateY(-420%) scale(.6)`, opacity: 0 }],
    sink: [{ transform: base, opacity: 1 }, { transform: `${base} translateY(45%) scaleY(.2)`, opacity: 0 }],
    melt: [{ transform: base }, { transform: `${base} translateY(35%) scale(1.3,.05)`, opacity: 0.2 }],
    squash: [{ transform: base }, { transform: `${base} translateY(38%) scale(1.5,.12)`, offset: 0.25 }, { transform: `${base} translateY(38%) scale(1.5,.12)`, opacity: 0 }],
    fade: [{ transform: base, opacity: 1 }, { transform: `${base} scale(.6) rotate(-20deg)`, opacity: 0 }],
    spin: [{ transform: base, opacity: 1 }, { transform: `${base} translateY(-22%) rotate(-10deg) scale(1.1)`, opacity: 1, offset: 0.35 }, { transform: `${base} translateY(35%) rotate(170deg) scale(0)`, opacity: 0 }],
  }[kind];
  return anim(victim, frames, { duration: kind === 'squash' ? 900 : 650, easing: 'ease-in' }).then(() => victim.remove());
}

const STRIKES = {
  async chomp({ svg, victim, base, mover }) {
    const up = add(svg, `<path d="M14 26Q50 0 86 26V44L80 52L74 44L68 52L62 44L56 52L50 44L44 52L38 44L32 52L26 44L20 52L14 44Z" fill="#5e9a4a" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M20 44L26 52L32 44L38 52L44 44L50 52L56 44L62 52L68 44L74 52L80 44Z" fill="#fff" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="34" cy="20" r="3" fill="${INK}"/>`);
    const down = add(svg, `<path d="M14 80Q50 104 86 80V60L80 52L74 60L68 52L62 60L56 52L50 60L44 52L38 60L32 52L26 60L20 52L14 60Z" fill="#7dbb5f" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M20 60L26 52L32 60L38 52L44 60L50 52L56 60L62 52L68 60L74 52L80 60Z" fill="#fff" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`);
    mover?.animate([{ transform: 'none' }, { transform: 'scale(1.15) rotate(-6deg)' }, { transform: 'none' }], 420);
    const open = [{ transform: 'translateY(-34px)', opacity: 0 }, { transform: 'translateY(-30px)', opacity: 1, offset: 0.3 }, { transform: 'translateY(0)', offset: 0.55 }, { transform: 'translateY(-4px)', offset: 0.7 }, { transform: 'translateY(0)', opacity: 1, offset: 0.85 }, { transform: 'translateY(0)', opacity: 0 }];
    anim(up, open, { duration: 900 });
    anim(down, open.map((f) => ({ ...f, transform: f.transform.replace(/-?(\d+)px/, (m, n) => `${m.startsWith('-') ? '' : '-'}${n}px`) })), { duration: 900 });
    await wait(470);
    word(svg, 'CHOMP!');
    return exit(victim, base, 'eaten');
  },
  async web({ svg, victim, base }) {
    let lines = '';
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; lines += `M50 50L${50 + Math.cos(a) * 34} ${50 + Math.sin(a) * 34}`; }
    const ring = (r) => Array.from({ length: 9 }, (_, k) => { const a = (k / 8) * Math.PI * 2; return `${k ? 'L' : 'M'}${(50 + Math.cos(a) * r).toFixed(1)} ${(50 + Math.sin(a) * r).toFixed(1)}`; }).join('');
    const g = add(svg, `<path d="${lines}${ring(12)}${ring(22)}${ring(32)}" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/><path d="${lines}${ring(12)}${ring(22)}${ring(32)}" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`);
    drawIn(g, 380);
    await wait(420);
    const thread = add(svg, `<path d="M50 -60V40" stroke="#fff" stroke-width="1.6"/>`);
    anim(thread, [{ opacity: 0 }, { opacity: 1 }], { duration: 120 });
    anim(g, [{ transform: 'none' }, { transform: 'translateY(-120px) scale(.6)', opacity: 0 }], { duration: 650, easing: 'ease-in' });
    anim(thread, [{ transform: 'none' }, { transform: 'translateY(-120px)', opacity: 0 }], { duration: 650, easing: 'ease-in' });
    return exit(victim, base, 'lift');
  },
  async net({ svg, victim, base, dir }) {
    let d = '';
    for (let k = 0; k <= 6; k++) d += `M${20 + k * 10} 18L${20 + k * 10} 82M20 ${18 + k * 10.6}L80 ${18 + k * 10.6}`;
    const g = add(svg, `<rect x="18" y="16" width="64" height="68" rx="14" fill="rgba(201,163,106,.25)" stroke="#8a6a3b" stroke-width="3"/><path d="${d}" stroke="#8a6a3b" stroke-width="1.6"/>`);
    anim(g, [{ transform: 'translateY(-70px) scale(.5)', opacity: 0 }, { transform: 'translateY(0) scale(1.05)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'ease-out' });
    await wait(450);
    anim(g, [{ transform: 'none' }, { transform: `translateX(${dir * 140}px)`, opacity: 0 }], { duration: 600, easing: 'ease-in' });
    return exit(victim, base, 'blown', dir);
  },
  async basin({ svg, victim, base }) {
    const g = add(svg, `<path d="M16 76L28 34H72L84 76Z" fill="#c9cfd5" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M12 78H88" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M34 44H66" stroke="#eef1f4" stroke-width="3"/>`);
    await anim(g, [{ transform: 'translateY(-110px)', opacity: 0 }, { transform: 'translateY(4px)', opacity: 1, offset: 0.8 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'ease-in' });
    victim.style.opacity = '0';
    word(svg, 'SCOOP!', '#22408f');
    await wait(260);
    anim(g, [{ transform: 'none' }, { transform: 'translateY(-120px) rotate(10deg)', opacity: 0 }], { duration: 500, easing: 'ease-in' });
    return exit(victim, base, 'eaten');
  },
  async claws({ svg, victim, base, dir }) {
    const g = add(svg, `<path d="M26 18L56 70M40 14L70 66M54 10L84 62" stroke="#d62828" stroke-width="5" stroke-linecap="round"/><path d="M26 18L56 70M40 14L70 66M54 10L84 62" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`);
    drawIn(g, 200);
    victim.animate([{ transform: base }, { transform: `${base} translateX(-6%)` }, { transform: `${base} translateX(6%)` }, { transform: base }], 260);
    await wait(320);
    anim(g, [{ opacity: 1 }, { opacity: 0 }], { duration: 500, delay: 200 });
    return exit(victim, base, 'spin', dir);
  },
  async honk({ svg, victim, base, dir }) {
    word(svg, 'POM POM!', '#22408f');
    const puffs = add(svg, [20, 34, 48].map((x, i) => `<circle cx="${50 - dir * x}" cy="${70 - i * 4}" r="${7 + i * 2}" fill="#e6e1d6" stroke="${INK}" stroke-width="1.6"/>`).join(''));
    anim(puffs, [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.4 }, { transform: 'scale(1.4)', opacity: 0 }], { duration: 800 });
    await wait(200);
    return exit(victim, base, 'blown', dir);
  },
  async boom({ svg, victim, base, dir }) {
    for (let k = 0; k < 3; k++) {
      const ring = add(svg, `<circle cx="50" cy="56" r="14" fill="none" stroke="#e3901b" stroke-width="3.4"/>`);
      anim(ring, [{ transform: 'scale(.4)', opacity: 1 }, { transform: 'scale(3)', opacity: 0 }], { duration: 650, delay: k * 120, easing: 'ease-out' });
    }
    word(svg, 'BOOM!', '#e3622d');
    await wait(150);
    return exit(victim, base, 'toss', dir);
  },
  async sink({ svg, victim, base }) {
    const g = add(svg, `<path d="M8 10Q60 -10 84 44" fill="none" stroke="#a87442" stroke-width="5" stroke-linecap="round"/><path d="M84 44L96 40L92 54Z" fill="#9aa3ab" stroke="${INK}" stroke-width="2"/>`);
    drawIn(g, 220);
    await wait(240);
    const dirt = add(svg, [0, 1, 2, 3, 4].map((k) => `<circle cx="${30 + k * 10}" cy="78" r="3" fill="#8a6a3b"/>`).join(''));
    anim(dirt, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-14px)', opacity: 1, offset: 0.4 }, { transform: 'translateY(6px)', opacity: 0 }], { duration: 600 });
    anim(g, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: 200 });
    return exit(victim, base, 'sink');
  },
  async bonk({ svg, victim, base }) {
    const book = add(svg, `<rect x="34" y="6" width="32" height="22" rx="2" fill="#d23a2a" stroke="${INK}" stroke-width="2.4"/><path d="M38 12H62" stroke="#fff" stroke-width="2"/>`);
    await anim(book, [{ transform: 'translateY(-80px) rotate(-30deg)' }, { transform: 'translateY(6px) rotate(8deg)', offset: 0.85 }, { transform: 'none' }], { duration: 300, easing: 'ease-in' });
    word(svg, 'BONK!', '#d23a2a', 0);
    const stars = add(svg, [0, 1, 2].map((k) => { const a = (k / 3) * Math.PI * 2; return `<path d="M${50 + Math.cos(a) * 18} ${22 + Math.sin(a) * 6}l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffd34d" stroke="${INK}" stroke-width="1"/>`; }).join(''));
    stars.style.transformOrigin = '50% 30%';
    anim(stars, [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)', opacity: 0 }], { duration: 800 });
    anim(book, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: 200 });
    victim.classList.add('shocked');
    await wait(350);
    return exit(victim, base, 'fade');
  },
  async spinout({ victim, base, mover, dir }) {
    mover?.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], 450);
    return exit(victim, base, 'spin', dir);
  },
  async toss({ svg, victim, base, dir }) {
    word(svg, 'WHEE!', '#4f74d0');
    return exit(victim, base, 'toss', dir);
  },
  async blown({ svg, victim, base, dir }) {
    word(svg, 'OINK!', '#c25a2a');
    return exit(victim, base, 'blown', dir);
  },
  async feathers({ svg, victim, base, dir }) {
    const g = add(svg, Array.from({ length: 7 }, (_, k) => {
      const a = (k / 7) * Math.PI * 2;
      return `<ellipse cx="${50 + Math.cos(a) * 10}" cy="${48 + Math.sin(a) * 10}" rx="9" ry="3.4" transform="rotate(${(a * 180) / Math.PI} ${50 + Math.cos(a) * 10} ${48 + Math.sin(a) * 10})" fill="${k % 2 ? '#d6372a' : '#b4bac0'}" stroke="${INK}" stroke-width="1.2"/>`;
    }).join(''));
    anim(g, [{ transform: 'scale(.3) rotate(0)', opacity: 1 }, { transform: 'scale(2.4) rotate(90deg)', opacity: 0 }], { duration: 800, easing: 'ease-out' });
    return exit(victim, base, 'blown', dir);
  },
  async wrap({ svg, victim, base }) {
    for (let k = 0; k < 3; k++) {
      const band = add(svg, `<rect x="24" y="${30 + k * 14}" width="52" height="11" rx="4" fill="#dcc48d" stroke="${INK}" stroke-width="1.8"/>`);
      anim(band, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 160, delay: k * 120 });
      anim(band, [{ opacity: 1 }, { opacity: 0, transform: 'scale(.3)' }], { duration: 300, delay: 600 });
    }
    await wait(450);
    word(svg, 'WRAPPED!', '#8a6a3b');
    return exit(victim, base, 'eaten');
  },
  async stitch({ svg, victim, base }) {
    const g = add(svg, `<circle cx="50" cy="50" r="30" fill="none" stroke="#4f74d0" stroke-width="3" stroke-dasharray="6 5"/><path d="M28 38l8 8m0-8l-8 8M64 38l8 8m0-8l-8 8M46 66l8 8m0-8l-8 8" stroke="#4f74d0" stroke-width="3" stroke-linecap="round"/>`);
    anim(g, [{ transform: 'rotate(-90deg) scale(.4)', opacity: 0 }, { transform: 'rotate(0) scale(1)', opacity: 1 }], { duration: 380 });
    await wait(420);
    anim(g, [{ opacity: 1 }, { opacity: 0, transform: 'scale(.2)' }], { duration: 400 });
    return exit(victim, base, 'eaten');
  },
  async splash({ svg, victim, base, color = '#5aa2d8' }) {
    const g = add(svg, Array.from({ length: 9 }, (_, k) => {
      const a = (k / 9) * Math.PI * 2;
      return `<path d="M${50 + Math.cos(a) * 8} ${54 + Math.sin(a) * 8}c-3 5 3 9 5 4c1-3-3-6-5-4z" fill="${color}" stroke="${INK}" stroke-width="1"/>`;
    }).join(''));
    anim(g, [{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(3.2)', opacity: 0 }], { duration: 700, easing: 'ease-out' });
    word(svg, 'SPLASH!', color === '#fffaf0' ? '#8a6a3b' : color);
    return exit(victim, base, 'melt');
  },
  async dust({ svg, victim, base, color = '#fffaf0' }) {
    const g = add(svg, [[40, 50, 12], [60, 46, 14], [50, 34, 11], [34, 36, 8], [66, 32, 9]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="#c9c1b2" stroke-width="1.6"/>`).join(''));
    anim(g, [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1.1)', opacity: 1, offset: 0.4 }, { transform: 'scale(1.6)', opacity: 0 }], { duration: 900 });
    await wait(300);
    return exit(victim, base, 'fade');
  },
  async skewer({ svg, victim, base }) {
    const g = add(svg, `<path d="M-10 50H110" stroke="#a87442" stroke-width="4" stroke-linecap="round"/><path d="M110 50l-8-5v10z" fill="#a87442"/>`);
    await anim(g, [{ transform: 'translateX(-120px)' }, { transform: 'none' }], { duration: 240, easing: 'ease-out' });
    word(svg, 'SKEWERED!', '#a0572a');
    anim(g, [{ transform: 'none' }, { transform: 'translateY(-120px) rotate(-20deg)', opacity: 0 }], { duration: 600, delay: 150, easing: 'ease-in' });
    await wait(150);
    return exit(victim, base, 'lift');
  },
  async flames({ svg, victim, base }) {
    const g = add(svg, [30, 50, 70].map((x, k) => `<path d="M${x} 82C${x - 12} 66 ${x - 4} 56 ${x} ${44 - k * 4}C${x + 4} 56 ${x + 12} 66 ${x} 82Z" fill="${k === 1 ? '#f6c431' : '#f08a24'}" stroke="#d2531f" stroke-width="1.8"/>`).join(''));
    anim(g, [{ transform: 'scaleY(.2)', opacity: 0 }, { transform: 'scaleY(1.15)', opacity: 1, offset: 0.4 }, { transform: 'scaleY(.9)', opacity: 1, offset: 0.7 }, { transform: 'scaleY(1.3)', opacity: 0 }], { duration: 900 });
    victim.animate([{ filter: 'none' }, { filter: 'brightness(.35)' }], { duration: 450, fill: 'forwards' });
    word(svg, 'ROASTED!', '#d2531f');
    await wait(450);
    return exit(victim, base, 'eaten');
  },
  async peck({ svg, victim, base, dir }) {
    const beak = add(svg, `<path d="M${50 - dir * 44} 30L${50 - dir * 8} 40L${50 - dir * 44} 48Z" fill="#f2b33a" stroke="${INK}" stroke-width="2"/>`);
    anim(beak, [0, 1, 2, 3, 4, 5].map((k) => ({ transform: `translateX(${k % 2 ? dir * 12 : 0}px)` })), { duration: 420 });
    word(svg, 'PECK!', '#e3622d');
    victim.animate([{ transform: base }, { transform: `${base} translateX(${dir * 5}%)` }, { transform: base }], { duration: 140, iterations: 3 });
    await wait(430);
    anim(beak, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
    return exit(victim, base, 'toss', dir);
  },
  async nibble({ svg, victim, base }) {
    const paper = getComputedStyle(document.body).getPropertyValue('--paper').trim() || '#fdfbf3';
    for (let k = 0; k < 3; k++) {
      const a = -0.6 + k * 0.9;
      const bite = add(svg, `<circle cx="${50 + Math.cos(a) * 24}" cy="${42 + Math.sin(a) * 24}" r="10" fill="${paper}" stroke="${INK}" stroke-width="1.6" stroke-dasharray="3 2"/>`);
      anim(bite, [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 120, delay: k * 160 });
      anim(bite, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 700 });
      victim.animate([{ transform: base }, { transform: `${base} scale(${1 - (k + 1) * 0.15})` }], { duration: 120, delay: k * 160, fill: 'forwards' });
    }
    word(svg, 'NOM NOM', '#6b4f30');
    await wait(520);
    return exit(victim, base, 'eaten');
  },
  async stomp({ svg, victim, base, board }) {
    board?.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-3px,2px)' }, { transform: 'translate(3px,-2px)' }, { transform: 'translate(-2px,1px)' }, { transform: 'none' }], 320);
    const ring = add(svg, `<ellipse cx="50" cy="74" rx="30" ry="9" fill="none" stroke="#9aa2a8" stroke-width="3"/>`);
    anim(ring, [{ transform: 'scale(.4)', opacity: 1 }, { transform: 'scale(1.8)', opacity: 0 }], { duration: 600 });
    word(svg, 'STOMP!', '#5a5a5a');
    return exit(victim, base, 'squash');
  },
};

/**
 * Play a character's capture skill on the piece it just jumped.
 * @returns {Promise<void>} resolves once the captured piece has left the board
 */
export function strike(key, { fx, victim, base, r, c, mover, board, dir = 1 }) {
  const skill = skillOf(key);
  const holder = box(fx, r, c);
  const svg = holder.querySelector('svg');
  const run = STRIKES[skill.strike] || STRIKES.spinout;
  const done = run({ svg, victim, base, mover, board, dir, color: skill.color }).catch(() => victim.remove());
  setTimeout(() => holder.remove(), 1600);
  return done;
}
