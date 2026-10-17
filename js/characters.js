// Original hand-drawn characters, built as inline SVG strings (viewBox 0 -14 100 114).
// Every piece shares the same rig: a team-coloured base, a bobbing body, a face that can
// blink / be shocked / cheer, and a hidden crown for kings.

const INK = '#2b2622';
const L = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
const THIN = `stroke="${INK}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"`;

export const TEAMS = {
  forest: { name: 'Forest Friends', short: 'Forest', color: '#e3a23b', ink: '#9a5f0c' },
  market: { name: 'Market Crew', short: 'Market', color: '#4f74d0', ink: '#22408f' },
};

function face(x, y, { s = 1, gap = 7, mouth = 9, noMouth = false, cheeks = true } = {}) {
  const g = gap;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    ${cheeks ? `<ellipse cx="${-g - 4}" cy="5" rx="3.4" ry="2.2" fill="#f07a7a" opacity=".55"/><ellipse cx="${g + 4}" cy="5" rx="3.4" ry="2.2" fill="#f07a7a" opacity=".55"/>` : ''}
    <g class="eyes"><ellipse cx="${-g}" cy="0" rx="3" ry="3.8" fill="${INK}"/><ellipse cx="${g}" cy="0" rx="3" ry="3.8" fill="${INK}"/>
      <circle cx="${-g + 1}" cy="-1.4" r="1.1" fill="#fff"/><circle cx="${g + 1}" cy="-1.4" r="1.1" fill="#fff"/></g>
    <path class="eyes-x" d="M${-g - 3} -3l6 6m0-6l-6 6M${g - 3} -3l6 6m0-6l-6 6" fill="none" ${THIN}/>
    <path class="eyes-happy" d="M${-g - 3.5} 1q3.5-5.5 7 0M${g - 3.5} 1q3.5-5.5 7 0" fill="none" ${THIN} stroke-width="2.2"/>
    ${noMouth ? '' : `<path class="m-smile" d="M-4 ${mouth}q4 4 8 0" fill="none" ${THIN} stroke-width="2"/>
    <ellipse class="m-oh" cx="0" cy="${mouth + 1}" rx="2.6" ry="3.3" fill="#5a1f1f" ${THIN} stroke-width="1.4"/>
    <path class="m-grin" d="M-5.5 ${mouth - 1}q5.5 8.5 11 0z" fill="#b8322a" ${THIN} stroke-width="1.6"/>`}
  </g>`;
}

const kenteStrip = (d) => `<path d="${d}" fill="url(#kente)" ${L}/>`;

// ---------- Team 1: forest animals, each with a little kente accessory ----------

const tortoise = () => `
  <ellipse cx="27" cy="82" rx="8" ry="6" fill="#9cc26a" ${L}/><ellipse cx="73" cy="82" rx="8" ry="6" fill="#9cc26a" ${L}/>
  <path d="M12 72C12 40 33 24 50 24S88 40 88 72Z" fill="#8a6a3b" ${L}/>
  <path d="M38 50L50 42L62 50L60 62H40Z" fill="#b08a4e" ${THIN}/>
  <path d="M38 50L24 56M62 50L76 56M50 42V27M40 62L30 71M60 62L70 71" fill="none" ${THIN}/>
  <path d="M9 72Q50 84 91 72" fill="none" ${L}/>
  <circle cx="50" cy="66" r="15" fill="#a9cd78" ${L}/>
  ${kenteStrip('M36 77Q50 86 64 77L65 84Q50 93 35 84Z')}
  <path d="M60 83L66 95L71 90Z" fill="url(#kente)" ${THIN}/>
  ${face(50, 64, { s: 0.9, gap: 6.5, mouth: 8 })}`;

const antelope = () => `
  <path d="M40 34C33 22 31 12 37 2M60 34C67 22 69 12 63 2" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <path d="M40 34C33 22 31 12 37 2M60 34C67 22 69 12 63 2" fill="none" stroke="#6b4a2a" stroke-width="3.6" stroke-linecap="round"/>
  <path d="M35 18l5-2M33 25l5-1.5M65 18l-5-2M67 25l-5-1.5" ${THIN} stroke="#f3e2c2"/>
  <ellipse cx="22" cy="42" rx="12" ry="5.5" transform="rotate(-24 22 42)" fill="#c98a4b" ${L}/>
  <ellipse cx="78" cy="42" rx="12" ry="5.5" transform="rotate(24 78 42)" fill="#c98a4b" ${L}/>
  <ellipse cx="22" cy="42" rx="6" ry="2.2" transform="rotate(-24 22 42)" fill="#f2b5a0"/>
  <ellipse cx="78" cy="42" rx="6" ry="2.2" transform="rotate(24 78 42)" fill="#f2b5a0"/>
  ${kenteStrip('M33 80Q50 90 67 80L66 89Q50 98 34 89Z')}
  <path d="M30 42C30 28 70 28 70 42C72 60 62 80 50 82C38 80 28 60 30 42Z" fill="#c98a4b" ${L}/>
  <path d="M42 41Q50 36 58 41" fill="none" stroke="#f3e2c2" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="50" cy="70" rx="11" ry="8.5" fill="#f0d7b0" ${L}/>
  <path d="M46 68h.1M54 68h.1" ${L} stroke-width="3.4"/>
  ${face(50, 51, { s: 0.95, gap: 9, mouth: 26, cheeks: false })}`;

const spider = () => `
  <path d="M38 58L20 44L11 54M37 62L15 60L7 72M39 66L21 75L16 87M42 70L30 84L28 95M62 58L80 44L89 54M63 62L85 60L93 72M61 66L79 75L84 87M58 70L70 84L72 95" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
  <ellipse cx="50" cy="68" rx="20" ry="17" fill="#7a4f2c" ${L}/>
  <path d="M38 70Q50 76 62 70M40 78Q50 83 60 78" fill="none" stroke="#c58a52" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="50" cy="46" r="15" fill="#946236" ${L}/>
  <circle cx="45" cy="38" r="2" fill="${INK}"/><circle cx="55" cy="38" r="2" fill="${INK}"/>
  ${kenteStrip('M35 38Q50 18 65 38Q50 33 35 38Z')}
  <circle cx="50" cy="24" r="3" fill="#d23a2a" ${THIN}/>
  ${face(50, 48, { s: 0.95, gap: 6.5, mouth: 7 })}`;

const crocodile = () => `
  <path d="M30 30l5-8 5 8M45 27l5-8 5 8M60 30l5-8 5 8" fill="#4f8a3d" ${THIN}/>
  <path d="M16 60C16 40 33 30 50 30S84 40 84 60C84 75 70 85 50 85S16 75 16 60Z" fill="#5e9a4a" ${L}/>
  <circle cx="35" cy="37" r="10" fill="#5e9a4a" ${L}/><circle cx="65" cy="37" r="10" fill="#5e9a4a" ${L}/>
  <circle cx="35" cy="37" r="6.5" fill="#f6f0d8"/><circle cx="65" cy="37" r="6.5" fill="#f6f0d8"/>
  <ellipse cx="50" cy="66" rx="25" ry="13" fill="#7dbb5f" ${L}/>
  <path d="M43 60h.1M57 60h.1" ${L} stroke-width="3.6"/>
  <path d="M29 70L33 75L37 71L41 76L45 72L50 77L55 72L59 76L63 71L67 75L71 70" fill="#fff" ${THIN}/>
  <path d="M38 87L50 92L38 98ZM62 87L50 92L62 98Z" fill="url(#kente)" ${L}/>
  <circle cx="50" cy="92" r="3.2" fill="#d23a2a" ${THIN}/>
  ${face(50, 37, { gap: 15, noMouth: true, cheeks: false })}`;

const parrot = () => `
  <path d="M41 80L35 97L50 90L65 97L59 80Z" fill="#d6372a" ${L}/>
  <path d="M30 88l4 6M70 88l-4 6" stroke="#e98d2f" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="50" cy="62" rx="23" ry="26" fill="#9ca3aa" ${L}/>
  <path d="M28 58C24 70 30 82 40 84C34 74 34 64 36 56Z" fill="#7b828a" ${THIN}/>
  <path d="M72 58C76 70 70 82 60 84C66 74 66 64 64 56Z" fill="#7b828a" ${THIN}/>
  <path d="M42 66q4 3 8 0q4 3 8 0M44 74q3 2.5 6 0q3 2.5 6 0" fill="none" stroke="#e7eaee" stroke-width="2" stroke-linecap="round"/>
  <circle cx="50" cy="38" r="18" fill="#b4bac0" ${L}/>
  <ellipse cx="50" cy="38" rx="13" ry="8" fill="#eef0f2"/>
  ${kenteStrip('M32 30Q50 16 68 30L67 37Q50 24 33 37Z')}
  <path d="M45 43C49 38 59 40 57 52C55 48 51 47 45 47Z" fill="${INK}" ${THIN}/>
  ${face(50, 37, { gap: 8, noMouth: true, cheeks: false })}`;

const bushcat = () => `
  <path d="M26 20L22 46L42 36Z" fill="#d9a24f" ${L}/><path d="M74 20L78 46L58 36Z" fill="#d9a24f" ${L}/>
  <path d="M27 28L26 40L35 36Z" fill="#f2b5a0"/><path d="M73 28L74 40L65 36Z" fill="#f2b5a0"/>
  ${kenteStrip('M27 74Q50 88 73 74L50 97Z')}
  <ellipse cx="50" cy="55" rx="28" ry="25" fill="#d9a24f" ${L}/>
  <path d="M30 48h.1M27 58h.1M34 40h.1M70 48h.1M73 58h.1M66 40h.1M44 34h.1M56 34h.1M50 31h.1" stroke="#7a4a1a" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="50" cy="66" rx="13" ry="9" fill="#fbf1de" ${L}/>
  <path d="M46 61L54 61L50 65Z" fill="#e36f7a" ${THIN}/>
  <path d="M36 64L20 61M36 68L21 70M64 64L80 61M64 68L79 70" ${THIN} stroke-width="1.4"/>
  ${face(50, 52, { gap: 9, mouth: 15, cheeks: false })}`;

// ---------- Team 2: market-day people ----------

const SKIN = ['#7b4a2a', '#5c3a21', '#8d5a34', '#6a4024', '#a06a3f', '#4e301b'];
const head = (cx, cy, r, skin) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${skin}" ${L}/>`;
const torso = (fill, extra = '') => `<path d="M22 97C24 76 35 68 50 68S76 76 78 97Z" fill="${fill}" ${L}/>${extra}`;
const ears = (cy, skin, dx = 16) => `<circle cx="${50 - dx}" cy="${cy}" r="4" fill="${skin}" ${L}/><circle cx="${50 + dx}" cy="${cy}" r="4" fill="${skin}" ${L}/>`;

const trader = () => {
  const k = SKIN[0];
  return `
  <path d="M30 74L25 34M70 74L75 34" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
  <path d="M30 74L25 34M70 74L75 34" stroke="${k}" stroke-width="4.6" stroke-linecap="round"/>
  ${torso('#3d5fb8', '<path d="M34 80h.1M44 76h.1M56 78h.1M66 82h.1M40 90h.1M52 88h.1M62 92h.1" stroke="#f4d36b" stroke-width="4.5" stroke-linecap="round"/>')}
  ${head(50, 54, 15, k)}
  <path d="M33 50C31 36 69 36 67 50C61 44 39 44 33 50Z" fill="#e0a020" ${L}/>
  <circle cx="38" cy="24" r="6.5" fill="#d8352a" ${THIN}/><circle cx="50" cy="21" r="7.5" fill="#f08a24" ${THIN}/><circle cx="62" cy="24" r="6.5" fill="#d8352a" ${THIN}/>
  <path d="M48 14q2-4 5-3" fill="none" stroke="#3f8f3a" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M21 28H79L71 39H29Z" fill="#c9cfd5" ${L}/>
  <path d="M30 33H70" stroke="#eef1f4" stroke-width="2"/>
  ${face(50, 56, { s: 0.9, gap: 6, mouth: 8 })}`;
};

const driver = () => {
  const k = SKIN[1];
  return `
  ${torso('#e9e2d0', '<path d="M43 69L50 80L57 69" fill="#3d5fb8" ' + L + '/><path d="M50 80V97" ' + THIN + '/>')}
  ${ears(48, k)}${head(50, 47, 17, k)}
  <path d="M32 41C32 23 68 23 68 41Z" fill="#3d5fb8" ${L}/>
  <path d="M30 41H70Q80 43 74 47H30Z" fill="#2c4690" ${L}/>
  <circle cx="50" cy="31" r="3" fill="#f4d36b" ${THIN}/>
  <path d="M42 58q4-3 8 0q4-3 8 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="50" cy="86" r="15" fill="none" stroke="${INK}" stroke-width="6"/>
  <circle cx="50" cy="86" r="15" fill="none" stroke="#5a5a5a" stroke-width="3"/>
  <path d="M50 86V72M50 86L37 93M50 86L63 93" ${THIN}/>
  <circle cx="36" cy="80" r="5" fill="${k}" ${L}/><circle cx="64" cy="80" r="5" fill="${k}" ${L}/>
  ${face(50, 49, { s: 0.95, gap: 6.5, mouth: 12 })}`;
};

const drummer = () => {
  const k = SKIN[2];
  return `
  ${torso('#3d5fb8', '<path d="M34 76V97M42 71V97M50 70V97M58 71V97M66 76V97" stroke="#f3efe4" stroke-width="2.4"/>')}
  <path d="M28 76L18 56" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M28 76L18 56" stroke="${k}" stroke-width="4.6" stroke-linecap="round"/>
  <path d="M18 56Q24 46 32 50" fill="none" stroke="#6b4a2a" stroke-width="3.2" stroke-linecap="round"/>
  ${ears(42, k)}${head(50, 41, 16, k)}
  <path d="M35 36C36 24 64 24 65 36C58 30 42 30 35 36Z" fill="${INK}"/>
  <path d="M34 70H66L60 98H40Z" fill="#9a612f" ${L}/>
  <ellipse cx="50" cy="70" rx="16" ry="5" fill="#f2e3c4" ${L}/>
  <path d="M36 76L44 96M44 75L52 97M52 75L60 96M64 76L56 96" ${THIN} stroke-width="1.3"/>
  <circle cx="68" cy="72" r="5" fill="${k}" ${L}/>
  ${face(50, 43, { s: 0.92, gap: 6.5, mouth: 8 })}`;
};

const farmer = () => {
  const k = SKIN[3];
  return `
  <path d="M80 98L88 34" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M80 98L88 34" stroke="#a87442" stroke-width="3" stroke-linecap="round"/>
  <path d="M87 36L99 30L97 40Z" fill="#9aa3ab" ${THIN}/>
  ${torso('#3d5fb8', `<path d="M36 72L40 97M64 72L60 97" stroke="#6b4a2a" stroke-width="4"/><path d="M30 96Q50 86 70 96" fill="none" ${THIN}/>`)}
  <circle cx="74" cy="80" r="5" fill="${k}" ${L}/>
  ${ears(50, k)}${head(50, 49, 16, k)}
  <path d="M34 39C34 25 66 25 66 39Z" fill="#e8c86e" ${L}/>
  <ellipse cx="50" cy="40" rx="30" ry="7" fill="#efd27a" ${L}/>
  <path d="M30 40l4-3M40 42l4-3M52 42l4-3M62 41l4-3" ${THIN} stroke="#b8933a"/>
  <path d="M35 36H65" stroke="#c0392b" stroke-width="3"/>
  ${face(50, 51, { s: 0.92, gap: 6.5, mouth: 8 })}`;
};

const schoolchild = () => {
  const k = SKIN[4];
  return `
  ${torso('#e6a35c', `<path d="M40 69L50 77L60 69" fill="#8a4f1d" ${L}/><path d="M33 74L36 97M67 74L64 97" stroke="#3d5fb8" stroke-width="5"/>`)}
  <path d="M60 80L76 77L78 93L62 96Z" fill="#d23a2a" ${L}/><path d="M64 84L74 82" ${THIN}/>
  ${ears(47, k, 17)}${head(50, 46, 17, k)}
  <path d="M33 42C32 26 68 26 67 42C62 34 38 34 33 42Z" fill="${INK}"/>
  ${face(50, 48, { gap: 7, mouth: 9 })}`;
};

const fisherman = () => {
  const k = SKIN[5];
  return `
  ${torso('#3d5fb8', '<path d="M24 86H76M26 78H74M30 72H70" stroke="#f3efe4" stroke-width="2.6"/>')}
  <path d="M28 70L36 97M36 70L28 97M24 80L40 88" ${THIN} stroke="#d8c7a0" stroke-width="1.6"/>
  <path d="M74 66C86 62 96 70 92 78C88 86 76 84 72 78L64 84L66 72L60 64Z" fill="#9fc2d8" ${L}/>
  <circle cx="84" cy="70" r="1.8" fill="${INK}"/><path d="M78 74q4 3 8 0" fill="none" ${THIN} stroke-width="1.3"/>
  <circle cx="68" cy="80" r="5" fill="${k}" ${L}/>
  ${ears(47, k)}${head(50, 46, 16, k)}
  <path d="M33 42C31 24 69 24 67 42Z" fill="#d23a2a" ${L}/>
  <path d="M33 40H67" stroke="#f4d36b" stroke-width="4"/><path d="M33 40H67" stroke="#3f8f3a" stroke-width="1.5"/>
  <circle cx="50" cy="24" r="4.2" fill="#f4d36b" ${THIN}/>
  <path d="M41 58q9 7 18 0" fill="#d9d4cc" ${THIN} stroke-width="1.4" opacity=".9"/>
  ${face(50, 48, { s: 0.92, gap: 6.5, mouth: 8 })}`;
};

export const CHARACTERS = {
  tortoise: { team: 'forest', name: 'Nana Kwaku', kind: 'tortoise', draw: tortoise, crownY: 27 },
  antelope: { team: 'forest', name: 'Abena', kind: 'antelope', draw: antelope, crownY: 31 },
  spider: { team: 'forest', name: 'Kofi', kind: 'spider', draw: spider, crownY: 23 },
  crocodile: { team: 'forest', name: 'Kwabena', kind: 'crocodile', draw: crocodile, crownY: 25 },
  parrot: { team: 'forest', name: 'Akua', kind: 'parrot', draw: parrot, crownY: 23 },
  bushcat: { team: 'forest', name: 'Esi', kind: 'bush cat', draw: bushcat, crownY: 32 },
  trader: { team: 'market', name: 'Auntie Ama', kind: 'trader', draw: trader, crownY: 16 },
  driver: { team: 'market', name: 'Uncle Kojo', kind: 'tro-tro driver', draw: driver, crownY: 28 },
  drummer: { team: 'market', name: 'Kwame', kind: 'drummer', draw: drummer, crownY: 27 },
  farmer: { team: 'market', name: 'Afua', kind: 'farmer', draw: farmer, crownY: 31 },
  schoolchild: { team: 'market', name: 'Adwoa', kind: 'schoolchild', draw: schoolchild, crownY: 31 },
  fisherman: { team: 'market', name: 'Papa Yaw', kind: 'fisherman', draw: fisherman, crownY: 22 },
};

export const TEAM_ROSTER = {
  forest: Object.keys(CHARACTERS).filter((k) => CHARACTERS[k].team === 'forest'),
  market: Object.keys(CHARACTERS).filter((k) => CHARACTERS[k].team === 'market'),
};

const crown = (y) => `<g transform="translate(0 ${y - 16})"><g class="crown">
  <path d="M33 16L36 2L44 9L50 -1L56 9L64 2L67 16Z" fill="#f6c431" ${L}/>
  <circle cx="36" cy="2" r="2.4" fill="#d23a2a" ${THIN}/><circle cx="50" cy="-1" r="2.6" fill="#3f8f3a" ${THIN}/><circle cx="64" cy="2" r="2.4" fill="#d23a2a" ${THIN}/>
  <path d="M38 12H62" stroke="#c9890f" stroke-width="2"/></g></g>`;

/** Full piece SVG for a character. */
export function characterSVG(key, { withBase = true } = {}) {
  const ch = CHARACTERS[key];
  const team = TEAMS[ch.team];
  const base = withBase
    ? `<ellipse class="base" cx="50" cy="91" rx="35" ry="9" fill="${team.color}" opacity=".6"/>
       <path class="base-ring" d="M16 91C17 82 84 80 85 90C86 99 15 101 16 90" fill="none" stroke="${team.ink}" stroke-width="2.2" stroke-linecap="round"/>
       <path class="king-ring" d="M10 91C12 78 89 77 91 90C92 104 9 105 11 89" fill="none" stroke="#e0a800" stroke-width="2.4" stroke-dasharray="5 4" stroke-linecap="round"/>`
    : '';
  return `<svg viewBox="0 -14 100 114" aria-hidden="true">${base}<g class="bob">${ch.draw()}${crown(ch.crownY)}</g></svg>`;
}

/** Shared pattern definitions referenced by every piece (kente cloth). */
export const DEFS_SVG = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <pattern id="kente" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
    <rect width="12" height="12" fill="#f2b81f"/>
    <rect x="0" width="4" height="12" fill="#2f8a3b"/>
    <rect y="5" width="12" height="3" fill="#cf2e26"/>
    <rect x="8" y="0" width="1.4" height="12" fill="#1d1a17"/>
    <rect x="4" y="9.5" width="4" height="1.2" fill="#1d1a17"/>
    <rect x="9.4" y="1" width="2.6" height="2.6" fill="#2f8a3b"/>
  </pattern>
</defs></svg>`;
