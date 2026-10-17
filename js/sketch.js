// Hand-drawn helpers: wobbly pen lines, the pencil-hatched board, margin doodles and title lettering.

export function seeded(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => Math.round(n * 10) / 10;

// Smooth path through points using midpoints as anchors.
function smooth(pts) {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += `Q${f(pts[i][0])} ${f(pts[i][1])} ${f(mx)} ${f(my)}`;
  }
  const last = pts[pts.length - 1];
  return `${d}L${f(last[0])} ${f(last[1])}`;
}

/** A slightly wobbly pen line from (x1,y1) to (x2,y2). */
export function wobblyLine(x1, y1, x2, y2, rand, amp = 2.2, segments = 5) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const o = i === 0 || i === segments ? (rand() - 0.5) * amp : (rand() - 0.5) * 2 * amp;
    pts.push([x1 + (x2 - x1) * t + nx * o, y1 + (y2 - y1) * t + ny * o]);
  }
  return smooth(pts);
}

/** A hand-drawn loop: slightly uneven radius, overshooting the start like a real pen circle. */
export function wobblyCircle(cx, cy, r, rand, amp = 0.08, turns = 1.12) {
  const pts = [];
  const steps = 18;
  const start = rand() * Math.PI * 2;
  for (let i = 0; i <= steps * turns; i++) {
    const a = start + (i / steps) * Math.PI * 2;
    const rr = r * (1 + (rand() - 0.5) * 2 * amp + (i / steps) * 0.06);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.96]);
  }
  return smooth(pts);
}

// Pencil hatching for one square (local 0..100), a dense "/" layer plus a lighter "\" layer.
function hatch(x0, y0, rand) {
  let a = '';
  let b = '';
  for (let t = 4 + rand() * 4; t < 200; t += 7 + rand() * 3) {
    const p = [Math.max(0, t - 100), 0];
    p[1] = t - p[0];
    const q = [0, Math.max(0, t - 100)];
    q[0] = t - q[1];
    const s1 = 1 + rand() * 5;
    const s2 = 1 + rand() * 5;
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (len < 8) continue;
    const ux = (q[0] - p[0]) / len;
    const uy = (q[1] - p[1]) / len;
    const x1 = x0 + p[0] + ux * s1;
    const y1 = y0 + p[1] + uy * s1;
    const x2 = x0 + q[0] - ux * s2;
    const y2 = y0 + q[1] - uy * s2;
    const bend = (rand() - 0.5) * 3;
    a += `M${f(x1)} ${f(y1)}Q${f((x1 + x2) / 2 + bend)} ${f((y1 + y2) / 2 + bend)} ${f(x2)} ${f(y2)}`;
  }
  for (let t = 10 + rand() * 10; t < 190; t += 14 + rand() * 8) {
    if (rand() < 0.35) continue;
    const u = t - 100; // x - y = u
    const x1 = Math.max(0, u) + 4;
    const y1 = x1 - u;
    const x2 = Math.min(100, 100 + u) - 4;
    const y2 = x2 - u;
    if (x2 - x1 < 10) continue;
    b += `M${f(x0 + x1)} ${f(y0 + y1)}L${f(x0 + x2)} ${f(y0 + y2)}`;
  }
  return { a, b };
}

/** Board SVG (viewBox -8 -8 816 816; one square = 100). Lines and hatching animate in via CSS. */
export function boardSVG(seed = 7) {
  const rand = seeded(seed);
  let squares = '';
  let n = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 0) continue;
      const { a, b } = hatch(c * 100, r * 100, rand);
      squares += `<g class="sq" style="--d:${n++}">
        <rect class="sq-bg" x="${c * 100 + 2}" y="${r * 100 + 2}" width="96" height="96"/>
        <path class="h-a" d="${a}" stroke-width="3.2" stroke-linecap="round" fill="none" opacity=".8"/>
        <path class="h-b" d="${b}" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".55"/></g>`;
    }
  }
  let lines = '';
  let i = 0;
  for (let k = 0; k <= 8; k++) {
    const edge = k === 0 || k === 8;
    const w = edge ? 4.2 : 2.6;
    lines += `<path pathLength="1" style="--i:${i++}" stroke-width="${w}" d="${wobblyLine(-4 - rand() * 4, k * 100, 804 + rand() * 4, k * 100, rand)}"/>`;
    lines += `<path pathLength="1" style="--i:${i++}" stroke-width="${w}" d="${wobblyLine(k * 100, -4 - rand() * 4, k * 100, 804 + rand() * 4, rand)}"/>`;
  }
  // A second, offset outline like a pen that went round twice.
  lines += `<path pathLength="1" style="--i:${i++}" stroke-width="1.6" opacity=".6" d="${wobblyLine(-9, -6, 809, -9, rand, 3)}${wobblyLine(809, -9, 806, 809, rand, 3).replace('M', 'L')}${wobblyLine(806, 809, -6, 806, rand, 3).replace('M', 'L')}${wobblyLine(-6, 806, -9, -6, rand, 3).replace('M', 'L')}"/>`;
  return `<svg class="board-svg" viewBox="-12 -12 824 824" aria-hidden="true">
    <rect class="paper" x="0" y="0" width="800" height="800"/>
    <rect class="kente-frame" x="-9" y="-9" width="818" height="818" fill="none" stroke="url(#kente)" stroke-width="10"/>
    <g class="hatch">${squares}</g>
    <g class="grid" fill="none" stroke-linecap="round">${lines}</g></svg>`;
}

// ---------- Title lettering: "Dame" as single pen strokes ----------

export const TITLE_STROKES = [
  'M34 24C32 48 34 76 31 98',
  'M18 30C62 8 104 36 98 64C92 92 54 104 22 96',
  'M146 64C136 52 116 56 114 74C112 92 134 96 144 76',
  'M146 62C145 76 144 90 154 96',
  'M160 66C162 76 162 86 161 96',
  'M161 76C166 58 182 58 182 74L182 96',
  'M182 76C187 58 203 58 203 74C203 84 202 92 210 96',
  'M218 82C236 82 246 72 240 64C234 56 216 62 216 80C216 96 234 100 252 88',
  'M30 112C90 104 170 106 262 110',
];

export function titleSVG() {
  const paths = TITLE_STROKES.map((d, i) => `<path pathLength="1" style="--i:${i}" d="${d}"/>`).join('');
  return `<svg class="title-svg" viewBox="0 0 280 124" role="img" aria-label="Dame">
    <g fill="none" stroke="#1f2d6b" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
}

// ---------- Margin doodles ----------

const INK = '#2b2622';
const pen = `fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`;

export function doodle(name, seed = 3) {
  const rand = seeded(seed);
  switch (name) {
    case 'sun': {
      let rays = '';
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        rays += wobblyLine(40 + Math.cos(a) * 21, 40 + Math.sin(a) * 21, 40 + Math.cos(a) * 33, 40 + Math.sin(a) * 33, rand, 1.5, 2);
      }
      return `<svg viewBox="0 0 80 80"><g class="spin">
        <path d="${wobblyCircle(40, 40, 15, rand, 0.05)}" fill="#ffd34d" stroke="${INK}" stroke-width="2.4"/>
        <path d="${rays}" ${pen} stroke="#e3901b"/></g>
        <path d="M34 38h.1M46 38h.1" ${pen} stroke-width="3.5"/><path d="M34 45q6 5 12 0" ${pen}/></svg>`;
    }
    case 'moon':
      return `<svg viewBox="0 0 80 80">
        <path d="M48 10C30 14 22 32 28 48C34 64 52 70 66 62C50 62 38 50 38 34C38 24 42 16 48 10Z" fill="#fbeaa6" ${pen}/>
        <path d="M41 36h.1" ${pen} stroke-width="3.5"/><path d="M40 44q4 3 7 0" ${pen}/>
        <g class="twinkle"><path d="M66 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffd34d" ${pen} stroke-width="1.6"/>
        <path d="M16 62l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4z" fill="#ffd34d" ${pen} stroke-width="1.4"/></g></svg>`;
    case 'fish':
      return `<svg viewBox="0 0 110 60"><g class="wiggle">
        <path d="M12 30C26 8 62 8 78 30C62 52 26 52 12 30Z" fill="#8fd0e6" ${pen}/>
        <path d="M78 30L100 14L96 30L100 46Z" fill="#5fb0cf" ${pen}/>
        <path d="M40 22q6 8 0 16M52 20q6 10 0 20M64 23q5 7 0 14" ${pen} stroke-width="1.6"/>
        <circle cx="26" cy="27" r="3" fill="${INK}"/><path d="M15 34q4 2 7 0" ${pen} stroke-width="1.6"/></g>
        <path d="M3 22c-3 0-3 -5 0-5M6 12c-2 0-2-3 0-3" ${pen} stroke-width="1.4"/></svg>`;
    case 'snail':
      return `<svg viewBox="0 0 90 60">
        <path d="M8 50H72C80 50 84 44 82 40L76 40" fill="#cde6a8" ${pen}/>
        <path d="${wobblyCircle(44, 32, 17, rand, 0.04, 1)}" fill="#e8a65a" ${pen}/>
        <path d="M44 32c0-4 6-4 6 0c0 7-12 7-12 0c0-10 18-10 18 0" ${pen} stroke-width="1.8"/>
        <path d="M76 40L80 22M82 40L90 24" ${pen} stroke-width="1.8"/><circle cx="80" cy="21" r="2.4" fill="${INK}"/><circle cx="90" cy="23" r="2.4" fill="${INK}"/></svg>`;
    case 'bird':
      return `<svg viewBox="0 0 70 50"><g class="flap">
        <path d="M10 30C14 14 40 12 48 26C44 38 20 42 10 30Z" fill="#f08a5d" ${pen}/>
        <path d="M24 26C30 14 40 14 42 22" fill="#f6b48f" ${pen}/>
        <path d="M48 24L60 22L50 30Z" fill="#f6c431" ${pen}/><circle cx="42" cy="24" r="2" fill="${INK}"/></g>
        <path d="M24 38v8M32 38v8" ${pen} stroke-width="1.6"/></svg>`;
    case 'ladybug':
      return `<svg viewBox="0 0 50 50">
        <path d="${wobblyCircle(25, 28, 15, rand, 0.04, 1)}" fill="#e24a3b" ${pen}/>
        <path d="M25 13V43M18 21h.1M32 21h.1M17 33h.1M33 33h.1" ${pen} stroke-width="3"/>
        <path d="M16 14C18 8 32 8 34 14Z" fill="${INK}"/><path d="M20 9L16 3M30 9L34 3" ${pen} stroke-width="1.6"/></svg>`;
    case 'bunting': {
      const colors = ['#d23a2a', '#f6c431', '#3f8f3a', '#4f74d0', '#f08a24'];
      let flags = '';
      const n = 11;
      for (let k = 0; k < n; k++) {
        const x = 10 + k * (380 / n);
        const y = 10 + Math.sin((k / (n - 1)) * Math.PI) * 14;
        flags += `<path class="flag" style="--k:${k}" d="M${f(x)} ${f(y)}L${f(x + 28)} ${f(y + (k < n / 2 ? 1.5 : -1.5))}L${f(x + 14)} ${f(y + 30)}Z" fill="${colors[k % colors.length]}" ${pen} stroke-width="1.8"/>`;
      }
      return `<svg viewBox="0 0 410 50" preserveAspectRatio="none">
        <path d="M2 8Q205 40 408 8" ${pen} stroke-width="1.8"/>${flags}</svg>`;
    }
    case 'star':
      return `<svg viewBox="0 0 40 40"><path d="M20 4l4.5 10 11 1-8.2 7.4 2.5 10.8L20 27.6 10.2 33.2l2.5-10.8L4.5 15l11-1z" fill="#ffe27a" ${pen} stroke-width="1.8"/></svg>`;
    default:
      return '';
  }
}

// Little previews for the shop's locked character packs.
export function packIcon(name) {
  const p = `fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`;
  switch (name) {
    case 'crab':
      return `<svg viewBox="0 0 60 50"><path d="M14 30C14 18 46 18 46 30C46 40 14 40 14 30Z" fill="#f07a5a" ${p}/>
        <path d="M14 26L6 16M46 26L54 16M6 16l-3-6 7 2zM54 16l3-6-7 2zM18 38l-6 8M26 40l-3 8M34 40l3 8M42 38l6 8" ${p}/>
        <path d="M24 20V14M36 20V14" ${p}/><circle cx="24" cy="13" r="2.4" fill="${INK}"/><circle cx="36" cy="13" r="2.4" fill="${INK}"/></svg>`;
    case 'jelly':
      return `<svg viewBox="0 0 60 60"><path d="M10 30C10 8 50 8 50 30Z" fill="#d6a6ef" ${p}/>
        <path d="M16 30c2 8-2 14 0 22M26 30c2 8-2 14 0 24M36 30c2 8-2 14 0 22M46 30c2 8-2 12 0 18" ${p} stroke-width="1.8"/>
        <path d="M24 22h.1M36 22h.1" ${p} stroke-width="3.6"/></svg>`;
    case 'starfish':
      return `<svg viewBox="0 0 60 60"><path d="M30 4l7 17 19 2-14 12 5 19-17-10-17 10 5-19L4 23l19-2z" fill="#f6b04a" ${p}/>
        <path d="M25 28h.1M35 28h.1" ${p} stroke-width="3.6"/><path d="M26 34q4 3 8 0" ${p} stroke-width="1.8"/></svg>`;
    case 'kite':
      return `<svg viewBox="0 0 60 60"><path d="M30 4L50 24L30 44L10 24Z" fill="#f6c431" ${p}/><path d="M30 4V44M10 24H50" ${p} stroke-width="1.6"/>
        <path d="M30 44c-4 4 4 6 0 10" ${p} stroke-width="1.8"/></svg>`;
    case 'lantern':
      return `<svg viewBox="0 0 60 60"><path d="M22 14H38L42 46H18Z" fill="#d23a2a" ${p}/><path d="M26 8H34V14H26Z" fill="#555" ${p}/>
        <path d="M30 22c-5 6-5 14 0 18c5-4 5-12 0-18z" fill="#ffd34d" ${p} stroke-width="1.6"/></svg>`;
    case 'pot':
      return `<svg viewBox="0 0 60 60"><path d="M20 14H40L44 22C54 30 50 50 30 52C10 50 6 30 16 22Z" fill="#b5703f" ${p}/>
        <path d="M18 30Q30 36 42 30" ${p} stroke-width="1.8"/><path d="M22 10H38" ${p}/></svg>`;
    case 'owl':
      return `<svg viewBox="0 0 60 60"><path d="M14 18L18 8L26 14H34L42 8L46 18C52 40 42 54 30 54S8 40 14 18Z" fill="#a47a52" ${p}/>
        <circle cx="23" cy="26" r="6" fill="#fff" ${p}/><circle cx="37" cy="26" r="6" fill="#fff" ${p}/><path d="M23 26h.1M37 26h.1" ${p} stroke-width="4"/>
        <path d="M27 34L30 40L33 34Z" fill="#f6c431" ${p} stroke-width="1.6"/></svg>`;
    case 'hen':
      return `<svg viewBox="0 0 60 60"><path d="M14 30C14 16 30 12 36 22C44 18 52 24 50 34C48 48 18 52 14 30Z" fill="#fff6e6" ${p}/>
        <path d="M30 14c0-6 6-6 6 0c2-4 6-2 4 2" fill="#d23a2a" ${p} stroke-width="1.8"/><path d="M14 28L6 30L14 33" fill="#f6c431" ${p} stroke-width="1.8"/><path d="M22 26h.1" ${p} stroke-width="3.6"/></svg>`;
    case 'goat':
      return `<svg viewBox="0 0 60 60"><path d="M18 14C10 8 8 16 14 20M42 14C50 8 52 16 46 20" ${p}/>
        <path d="M16 22C16 12 44 12 44 22C46 36 38 48 30 48C22 48 14 36 16 22Z" fill="#e9e2d6" ${p}/>
        <path d="M24 28h.1M36 28h.1" ${p} stroke-width="3.6"/><path d="M28 48c0 6 4 6 4 0" fill="#cfc6b6" ${p} stroke-width="1.8"/></svg>`;
    default:
      return '';
  }
}

/** Hand-drawn UI icons. */
export function icon(name) {
  const p = `fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"`;
  switch (name) {
    case 'menu': return `<svg viewBox="0 0 32 32"><path d="M6 9.5Q16 8 26 9.8M6 16.2Q16 15 26.4 16M6 22.6Q15 21.6 25.6 22.8" ${p}/></svg>`;
    case 'undo': return `<svg viewBox="0 0 32 32"><path d="M11 8L5 14L11 20" ${p}/><path d="M5.5 14C14 13 26 13 26 21C26 26 20 27 15 26" ${p}/></svg>`;
    case 'sound': return `<svg viewBox="0 0 32 32"><path d="M5 12.5H10L17 6.5V25.5L10 19.5H5Z" ${p}/><path d="M21 11.5C23.5 14 23.5 18 21 20.5M24.5 8C29 12 29 20 24.5 24" ${p}/></svg>`;
    case 'mute': return `<svg viewBox="0 0 32 32"><path d="M5 12.5H10L17 6.5V25.5L10 19.5H5Z" ${p}/><path d="M21 12L28 20M28 12L21 20" ${p}/></svg>`;
    case 'gear': return `<svg viewBox="0 0 32 32"><path d="M16 4.5V8.5M16 23.5V27.5M4.5 16H8.5M23.5 16H27.5M7.8 7.8L10.6 10.6M21.4 21.4L24.2 24.2M7.8 24.2L10.6 21.4M21.4 10.6L24.2 7.8" ${p}/><circle cx="16" cy="16" r="6.5" ${p}/></svg>`;
    case 'back': return `<svg viewBox="0 0 32 32"><path d="M19 7L9.5 16L19 25" ${p}/></svg>`;
    case 'chat': return `<svg viewBox="0 0 32 32"><path d="M6 8.5C6 6.5 8 5.5 16 5.5S26 6.5 26 8.5V18C26 20 24 21 16 21L10 26V21C7 21 6 20 6 18Z" ${p}/><path d="M11 12H21M11 16H18" ${p}/></svg>`;
    case 'bulb': return `<svg viewBox="0 0 32 32"><path d="M11 20C7 16 8 6 16 6S25 16 21 20V23H11Z" ${p}/><path d="M12 27H20" ${p}/></svg>`;
    default: return '';
  }
}
