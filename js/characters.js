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
  <path d="M43 34C35 24 27 13 30 1C32 -7 37 -10 40 -12M57 34C65 24 73 13 70 1C68 -7 63 -10 60 -12" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <path d="M43 34C35 24 27 13 30 1C32 -7 37 -10 40 -12M57 34C65 24 73 13 70 1C68 -7 63 -10 60 -12" fill="none" stroke="#5a3d22" stroke-width="3.8" stroke-linecap="round"/>
  <path d="M33 21l5-2M30 13l5-1M30 5l5 0M67 21l-5-2M70 13l-5-1M70 5l-5 0" stroke="#e9d6b0" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M35 41C24 32 13 33 7 37C13 45 26 47 35 45Z" fill="#c98a4b" ${L}/><path d="M65 41C76 32 87 33 93 37C87 45 74 47 65 45Z" fill="#c98a4b" ${L}/>
  <path d="M31 40C23 36 16 36 12 38C17 42 25 43 31 42Z" fill="#f2c3b0"/><path d="M69 40C77 36 84 36 88 38C83 42 75 43 69 42Z" fill="#f2c3b0"/>
  ${kenteStrip('M36 86Q50 94 64 86L63 94Q50 101 37 94Z')}
  <path d="M33 39C33 30 67 30 67 39C68 54 60 72 55 81C53 85 47 85 45 81C40 72 32 54 33 39Z" fill="#c98a4b" ${L}/>
  <path d="M50 36V70" stroke="#8a5a2c" stroke-width="6" stroke-linecap="round" opacity=".45"/>
  <ellipse cx="41" cy="48" rx="6.5" ry="4.5" fill="#f6ead2"/><ellipse cx="59" cy="48" rx="6.5" ry="4.5" fill="#f6ead2"/>
  <ellipse cx="50" cy="78" rx="6" ry="4.4" fill="#3a2a20" ${THIN}/>
  <path d="M41 86Q50 91 59 86" fill="none" stroke="#fbf3e4" stroke-width="3" stroke-linecap="round"/>
  ${face(50, 48, { gap: 9, mouth: 34, cheeks: false })}`;

const spider = () => `
  <path d="M38 58L20 44L11 54M37 62L15 60L7 72M39 66L21 75L16 87M42 70L30 84L28 95M62 58L80 44L89 54M63 62L85 60L93 72M61 66L79 75L84 87M58 70L70 84L72 95" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
  <ellipse cx="50" cy="68" rx="20" ry="17" fill="#7a4f2c" ${L}/>
  <path d="M38 70Q50 76 62 70M40 78Q50 83 60 78" fill="none" stroke="#c58a52" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="50" cy="46" r="15" fill="#946236" ${L}/>
  <circle cx="45" cy="38" r="2" fill="${INK}"/><circle cx="55" cy="38" r="2" fill="${INK}"/>
  ${kenteStrip('M35 38Q50 18 65 38Q50 33 35 38Z')}
  <circle cx="50" cy="24" r="3" fill="#d23a2a" ${THIN}/>
  ${face(50, 48, { s: 0.95, gap: 6.5, mouth: 7 })}`;

// Side-on crocodile facing right: long toothy snout, ridged back and a curling tail.
const crocodile = () => `
  <path d="M32 74C18 77 7 70 3 57C11 64 20 66 32 63Z" fill="#5e9a4a" ${L}/>
  <path d="M9 61l2-5 3 4M16 64l2-5 3 4" fill="#467a37" ${THIN}/>
  <path d="M28 84V90H34V84M48 84V90H54V84" fill="#5e9a4a" ${L}/>
  <ellipse cx="42" cy="74" rx="23" ry="12.5" fill="#5e9a4a" ${L}/>
  <path d="M24 79C32 86 52 86 62 79" fill="#a9d68a" ${THIN}/>
  <path d="M24 66l3-7 4 6M32 63l3-7 4 6M40 62l3-7 4 6M48 63l3-7 4 6" fill="#467a37" ${THIN}/>
  <path d="M53 61C56 53 63 48 72 50L96 58C100 60 100 66 96 67L67 74C59 75 52 69 53 61Z" fill="#5e9a4a" ${L}/>
  <path d="M66 66L95 63" fill="none" ${THIN}/>
  <path d="M69 66l2 3.4 2-3.6M75 65.5l2 3.4 2-3.6M81 65l2 3.4 2-3.6M87 64.4l2 3.4 2-3.6" fill="#fff" ${THIN} stroke-width="1.2"/>
  <circle cx="94" cy="60" r="1.4" fill="${INK}"/>
  <circle cx="64" cy="50" r="6" fill="#5e9a4a" ${L}/><circle cx="74" cy="50" r="6" fill="#5e9a4a" ${L}/>
  <circle cx="64" cy="50" r="4.2" fill="#f6f0d8"/><circle cx="74" cy="50" r="4.2" fill="#f6f0d8"/>
  <path d="M55 62C59 64 61 71 59 77L53 77C55 71 53 65 50 63Z" fill="url(#kente)" ${THIN}/>
  ${face(69, 50, { s: 0.8, gap: 6.2, noMouth: true, cheeks: false })}`;

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

// ---------- Unlockable friends (cosmetic only) ----------

const owl = () => `
  <path d="M28 30L22 14L38 24ZM72 30L78 14L62 24Z" fill="#8a5a33" ${L}/>
  <path d="M20 58C20 30 80 30 80 58C82 82 66 92 50 92C34 92 18 82 20 58Z" fill="#9b6a3d" ${L}/>
  <path d="M34 66q4 4 8 0M46 72q4 4 8 0M58 66q4 4 8 0M40 80q4 4 8 0M52 80q4 4 8 0" fill="none" stroke="#e6c79a" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="38" cy="46" r="11" fill="#fbf1de" ${L}/><circle cx="62" cy="46" r="11" fill="#fbf1de" ${L}/>
  <path d="M46 52L50 60L54 52Z" fill="#f6b33c" ${THIN}/>
  ${kenteStrip('M30 30Q50 22 70 30L69 36Q50 28 31 36Z')}
  ${face(50, 46, { gap: 12, noMouth: true, cheeks: false })}`;

const hedgehog = () => `
  <path d="M14 78L10 68L18 66L14 56L24 56L22 44L32 46L34 34L42 40L48 28L54 38L62 30L64 42L74 38L74 50L84 50L80 60L90 64L84 72L90 80Z" fill="#6b4a2a" ${L}/>
  <ellipse cx="54" cy="70" rx="26" ry="18" fill="#e9c99a" ${L}/>
  <ellipse cx="80" cy="74" rx="6" ry="4.6" fill="#2b2622"/>
  <path d="M34 88V94M62 88V94" ${L}/>
  <path d="M38 40L46 46L38 52ZM54 40L46 46L54 52Z" fill="url(#kente)" ${THIN}/><circle cx="46" cy="46" r="2.6" fill="#d23a2a" ${THIN}/>
  ${face(58, 66, { gap: 8, mouth: 9 })}`;

const kenkey = () => {
  const k = SKIN[2];
  return `
  <path d="M30 74L24 32M70 74L76 32" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
  <path d="M30 74L24 32M70 74L76 32" stroke="${k}" stroke-width="4.6" stroke-linecap="round"/>
  ${torso('#3d5fb8', `<path d="M34 76H66V97H34Z" fill="#f4efe4" ${THIN}/><path d="M38 84H62" stroke="#d23a2a" stroke-width="2"/>`)}
  ${head(50, 54, 15, k)}
  <path d="M33 50C31 36 69 36 67 50C61 44 39 44 33 50Z" fill="#3f8f3a" ${L}/>
  <path d="M20 30H80L74 38H26Z" fill="#b9874f" ${L}/>
  <ellipse cx="34" cy="24" rx="7" ry="5" fill="#d9c08a" ${THIN}/><ellipse cx="48" cy="21" rx="7" ry="5.5" fill="#cdb27a" ${THIN}/><ellipse cx="62" cy="23" rx="7" ry="5" fill="#d9c08a" ${THIN}/>
  <path d="M30 22l8 4M44 19l8 4M58 21l8 4" stroke="#8a6a3b" stroke-width="1.4"/>
  ${face(50, 56, { s: 0.9, gap: 6, mouth: 8 })}`;
};

const tailor = () => {
  const k = SKIN[0];
  return `
  ${torso('#3d5fb8', '<path d="M40 70C42 82 44 90 42 98M60 70C58 82 56 90 58 98" fill="none" stroke="#f4d36b" stroke-width="5"/><path d="M41 76h3M42 82h3M43 88h3M58 76h-3M57 82h-3M56 88h-3" stroke="#2b2622" stroke-width="1.2"/>')}
  <path d="M72 64L86 78M86 64L72 78" stroke="#9aa3ab" stroke-width="3.4" stroke-linecap="round"/>
  <circle cx="70" cy="80" r="4" fill="none" ${THIN}/><circle cx="88" cy="80" r="4" fill="none" ${THIN}/>
  ${ears(46, k)}${head(50, 46, 16, k)}
  <path d="M34 42C32 28 68 28 66 42C62 36 38 36 34 42Z" fill="${INK}"/>
  <circle cx="50" cy="28" r="7" fill="${INK}"/><path d="M45 26L41 20M55 26L59 20" stroke="#f4d36b" stroke-width="2" stroke-linecap="round"/>
  ${face(50, 48, { s: 0.92, gap: 6.5, mouth: 8 })}`;
};

// ---------- Seasonal placeholders (shown locked until their season) ----------

const harmattan = () => `
  <path d="M18 70C10 54 22 40 36 44C38 28 62 26 66 40C82 36 92 54 82 66C88 80 72 92 60 86C52 96 32 94 28 84C16 86 12 78 18 70Z" fill="#ead9b8" ${L}/>
  <path d="M26 62q10-6 18 0t18 0 16 0M30 76q10-6 18 0t18 0" fill="none" stroke="#c9ad7e" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M84 30q6 0 6 6M10 42q-4 0-4 4M90 44q4 0 4 4" fill="none" stroke="#c9ad7e" stroke-width="2" stroke-linecap="round"/>
  <path d="M70 26C76 22 82 26 80 32C76 30 72 30 70 26Z" fill="#c7843f" ${THIN}/>
  ${kenteStrip('M40 40L60 40L58 46L42 46Z')}
  ${face(50, 58, { gap: 9, mouth: 9 })}`;

const rainfrog = () => `
  <path d="M50 4V44" stroke="${INK}" stroke-width="2.6"/>
  <path d="M14 26C20 4 80 4 86 26C76 20 66 22 60 26C56 20 44 20 40 26C34 22 24 20 14 26Z" fill="#3f8f3a" ${L}/>
  <path d="M22 84C14 84 12 78 18 74M78 84C86 84 88 78 82 74" fill="#78b85a" ${L}/>
  <path d="M20 66C20 46 80 46 80 66C80 84 66 90 50 90S20 84 20 66Z" fill="#78b85a" ${L}/>
  <circle cx="36" cy="48" r="9" fill="#78b85a" ${L}/><circle cx="64" cy="48" r="9" fill="#78b85a" ${L}/>
  <circle cx="36" cy="48" r="6" fill="#fff"/><circle cx="64" cy="48" r="6" fill="#fff"/>
  <ellipse cx="50" cy="76" rx="16" ry="8" fill="#d6ecb0"/>
  ${kenteStrip('M38 86L50 82L62 86L50 92Z')}
  <path d="M40 34l-2 6M60 34l2 6" stroke="#5aa2d8" stroke-width="2.4" stroke-linecap="round"/>
  ${face(50, 48, { gap: 14, mouth: 16 })}`;

const masquerader = () => {
  const k = SKIN[3];
  return `
  ${torso('#d23a2a', '<path d="M24 86H76M28 76H72" stroke="#f6c431" stroke-width="4"/><path d="M34 70L40 97M66 70L60 97" stroke="#3d5fb8" stroke-width="4"/><circle cx="50" cy="84" r="3" fill="#fff"/>')}
  ${ears(50, k)}${head(50, 50, 15, k)}
  <path d="M30 42L50 0L70 42Z" fill="#3d5fb8" ${L}/>
  <path d="M38 26H62M34 34H66" stroke="#f6c431" stroke-width="3"/>
  <circle cx="50" cy="0" r="4.4" fill="#f6c431" ${THIN}/>
  <path d="M34 46C40 42 60 42 66 46L64 52C58 48 42 48 36 52Z" fill="#f4efe4" ${THIN}/>
  ${face(50, 52, { s: 0.9, gap: 6, mouth: 8 })}`;
};

const caroler = () => {
  const k = SKIN[4];
  return `
  ${torso('#3d5fb8', '<path d="M38 74H62V94H38Z" fill="#7a2d22" ' + THIN + '/><path d="M50 74V94" stroke="#f6c431" stroke-width="2"/>')}
  ${ears(48, k)}${head(50, 48, 16, k)}
  <path d="M32 42C34 22 60 16 72 26L80 42Z" fill="#d23a2a" ${L}/>
  <path d="M30 42H72" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
  <circle cx="80" cy="42" r="5" fill="#fff" ${THIN}/>
  <path d="M44 58q6 6 12 0" fill="none" ${THIN}/>
  ${face(50, 50, { s: 0.92, gap: 6.5, mouth: 10 })}`;
};

// ---------- Chop Bar pack (market) ----------

const arm = (x1, y1, x2, y2, skin) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="${skin}" stroke-width="4.6" stroke-linecap="round"/>`;

const waakye = () => {
  const k = SKIN[1];
  return `
  ${torso('#3d5fb8', `<path d="M36 74H64V97H36Z" fill="#f4efe4" ${THIN}/>`)}
  ${ears(48, k)}${head(50, 47, 16, k)}
  <path d="M32 44C30 26 70 26 68 44C62 38 38 38 32 44Z" fill="#e2502a" ${L}/>
  <path d="M44 28C40 18 50 14 52 22C56 14 64 20 58 28Z" fill="#e2502a" ${L}/>
  <path d="M38 34h24" stroke="#f6c431" stroke-width="2.4"/>
  ${arm(28, 76, 30, 86, k)}${arm(72, 76, 70, 86, k)}
  <path d="M22 84C36 82 64 82 78 84" fill="none" stroke="#3f8f3a" stroke-width="5" stroke-linecap="round"/>
  <path d="M26 84Q50 100 74 84Z" fill="#e9e2d0" ${L}/>
  <path d="M30 84Q50 66 70 84Z" fill="#7a3b2a" ${L}/>
  <path d="M38 78q3-4 6 0t6 0 6 0" fill="none" stroke="#f3e6c8" stroke-width="1.8" stroke-linecap="round"/>
  <ellipse cx="60" cy="76" rx="5" ry="3.6" fill="#fff" ${THIN}/><circle cx="60" cy="76" r="1.8" fill="#f6b33c"/>
  ${face(50, 49, { s: 0.92, gap: 6.5, mouth: 8 })}`;
};

const kenkeyWrap = () => {
  const k = SKIN[4];
  return `
  ${torso('#3d5fb8', '<path d="M30 80H70M28 88H72" stroke="#f6c431" stroke-width="2.4"/>')}
  ${ears(46, k)}${head(50, 45, 16, k)}
  <path d="M33 42C31 24 69 24 67 42C62 36 38 36 33 42Z" fill="#3f8f3a" ${L}/>
  <path d="M60 30L72 22L70 34Z" fill="#3f8f3a" ${THIN}/>
  ${arm(30, 76, 40, 80, k)}${arm(70, 76, 60, 80, k)}
  <path d="M38 70C38 62 62 62 62 70L64 90C64 96 36 96 36 90Z" fill="#dcc48d" ${L}/>
  <path d="M42 66L40 92M50 64V95M58 66L60 92" stroke="#b59a5c" stroke-width="1.8"/>
  <path d="M46 62C48 56 52 56 54 62" fill="none" stroke="#8a6a3b" stroke-width="2.4" stroke-linecap="round"/>
  ${face(50, 47, { s: 0.92, gap: 6.5, mouth: 8 })}`;
};

const chichinga = () => {
  const k = SKIN[5];
  return `
  ${torso('#3d5fb8', '<path d="M44 69L50 76L56 69" fill="#f4efe4"/>')}
  ${ears(48, k)}${head(50, 47, 16, k)}
  <path d="M32 40C32 24 68 24 68 40Z" fill="#2b2622" ${L}/><path d="M30 40H70" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
  ${arm(68, 78, 76, 62, k)}
  <path d="M74 64L92 20M78 64L98 28M70 64L82 16" stroke="#a87442" stroke-width="2.2" stroke-linecap="round"/>
  <rect x="83" y="28" width="7" height="7" rx="2" fill="#8a4a24" ${THIN} transform="rotate(20 86 31)"/>
  <rect x="78" y="40" width="7" height="7" rx="2" fill="#a0572a" ${THIN} transform="rotate(20 81 43)"/>
  <rect x="88" y="38" width="7" height="7" rx="2" fill="#8a4a24" ${THIN} transform="rotate(25 91 41)"/>
  <rect x="76" y="24" width="6" height="6" rx="2" fill="#a0572a" ${THIN} transform="rotate(15 79 27)"/>
  <path d="M86 12q-4-4 0-8M94 18q-4-4 0-8" fill="none" stroke="#c9c1b2" stroke-width="2" stroke-linecap="round"/>
  ${face(50, 49, { s: 0.92, gap: 6.5, mouth: 8 })}`;
};

const bofrot = () => {
  const k = SKIN[3];
  return `
  ${arm(30, 74, 26, 36, k)}${arm(70, 74, 74, 36, k)}
  ${torso('#3d5fb8', '<path d="M30 76Q50 90 70 76" fill="none" stroke="#f4efe4" stroke-width="3"/>')}
  ${head(50, 54, 15, k)}
  <path d="M33 50C31 36 69 36 67 50C61 44 39 44 33 50Z" fill="#c0392b" ${L}/>
  <path d="M22 18H78V38H22Z" fill="#dff1fa" opacity=".85" ${L}/>
  <circle cx="34" cy="31" r="5.5" fill="#d99a3a" ${THIN}/><circle cx="46" cy="30" r="6" fill="#e3a648" ${THIN}/><circle cx="58" cy="31" r="5.5" fill="#d99a3a" ${THIN}/><circle cx="68" cy="30" r="5" fill="#e3a648" ${THIN}/>
  <circle cx="40" cy="23" r="5" fill="#e3a648" ${THIN}/><circle cx="52" cy="23" r="5.5" fill="#d99a3a" ${THIN}/><circle cx="63" cy="23" r="5" fill="#e3a648" ${THIN}/>
  <path d="M26 21l6-1M70 21l4 0" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
  ${face(50, 56, { s: 0.9, gap: 6, mouth: 8 })}`;
};

const pito = () => {
  const k = SKIN[0];
  return `
  ${torso('#3d5fb8', '<path d="M32 76V97M40 71V97M48 70V97M56 70V97M64 72V97" stroke="#f3efe4" stroke-width="2.2"/>')}
  ${ears(46, k)}${head(50, 45, 16, k)}
  <path d="M36 54C40 66 60 66 64 54C58 58 42 58 36 54Z" fill="#eeeeea" ${THIN}/>
  <path d="M36 36C38 30 62 30 64 36" fill="none" stroke="#eeeeea" stroke-width="4" stroke-linecap="round"/>
  <path d="M34 38C34 26 66 26 66 38Q50 32 34 38Z" fill="#b5703f" ${L}/>
  ${arm(30, 78, 36, 82, k)}${arm(70, 78, 64, 82, k)}
  <path d="M30 80H70C70 96 30 96 30 80Z" fill="#9a5b2c" ${L}/>
  <ellipse cx="50" cy="80" rx="20" ry="4" fill="#c88b4f" ${THIN}/>
  <path d="M34 79q4-3 8 0t8 0 8 0 8 0" fill="#f7efd8" stroke="#f7efd8" stroke-width="2" stroke-linecap="round"/>
  ${face(50, 46, { s: 0.92, gap: 6.5, mouth: 11, cheeks: false })}`;
};

const plantain = () => {
  const k = SKIN[2];
  return `
  ${torso('#3d5fb8', '<path d="M26 82H74" stroke="#f6c431" stroke-width="3"/>')}
  ${ears(42, k)}${head(50, 41, 15, k)}
  <ellipse cx="50" cy="31" rx="24" ry="5" fill="#d9c08a" ${L}/>
  <path d="M38 30C38 18 62 18 62 30Z" fill="#cdb27a" ${L}/>
  ${arm(30, 74, 30, 70, k)}
  <path d="M26 72H74L68 96H32Z" fill="#3b3b3b" ${L}/>
  <path d="M30 72q4-6 8 0t8 0 8 0 8 0 8 0 8 0" fill="#f08a24" stroke="#d2531f" stroke-width="1.6"/>
  <path d="M30 66C38 60 50 60 60 64" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <path d="M30 66C38 60 50 60 60 64" fill="none" stroke="#e0b048" stroke-width="4" stroke-linecap="round"/>
  <path d="M40 70C48 64 60 64 70 68" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <path d="M40 70C48 64 60 64 70 68" fill="none" stroke="#b9862e" stroke-width="4" stroke-linecap="round"/>
  <path d="M44 66h.1M56 66h.1" stroke="#5a3a1a" stroke-width="2.6" stroke-linecap="round"/>
  ${face(50, 43, { s: 0.9, gap: 6.5, mouth: 8 })}`;
};

// ---------- Wildlife pack (forest) ----------

const mona = () => `
  <path d="M70 82C88 82 94 64 86 54C82 48 76 52 80 58C84 64 80 74 70 74" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
  <path d="M70 82C88 82 94 64 86 54C82 48 76 52 80 58C84 64 80 74 70 74" fill="none" stroke="#7a5230" stroke-width="3" stroke-linecap="round"/>
  <path d="M30 96C30 74 70 74 70 96Z" fill="#7a5230" ${L}/>
  <path d="M40 96C40 82 60 82 60 96Z" fill="#f4ecd8"/>
  <circle cx="26" cy="48" r="8" fill="#5a3a20" ${L}/><circle cx="74" cy="48" r="8" fill="#5a3a20" ${L}/>
  <circle cx="50" cy="50" r="22" fill="#7a5230" ${L}/>
  <path d="M30 56C30 68 42 74 50 74S70 68 70 56C66 62 58 62 50 62S34 62 30 56Z" fill="#f4ecd8"/>
  <ellipse cx="50" cy="52" rx="13" ry="11" fill="#3a2a22"/>
  <path d="M36 36C42 32 58 32 64 36" fill="none" stroke="#f4ecd8" stroke-width="4" stroke-linecap="round"/>
  ${kenteStrip('M36 76L64 76L62 82L38 82Z')}
  <circle cx="44" cy="51" r="4" fill="#f6ead2"/><circle cx="56" cy="51" r="4" fill="#f6ead2"/>
  ${face(50, 51, { gap: 6, mouth: 9, cheeks: false })}`;

const hornbill = () => `
  <path d="M34 96C30 76 34 56 50 56S70 76 66 96Z" fill="#2b2622" ${L}/>
  <path d="M42 92C42 78 46 70 50 70S58 78 58 92Z" fill="#f4f1ea"/>
  <path d="M30 70C24 80 26 90 34 94" fill="#1d1a17" ${L}/>
  <circle cx="44" cy="44" r="16" fill="#2b2622" ${L}/>
  <path d="M54 36C66 30 84 34 92 44C80 44 68 46 58 50Z" fill="#f2b33a" ${L}/>
  <path d="M56 36C62 26 78 24 84 32C76 32 66 34 58 38Z" fill="#e3622d" ${L}/>
  <path d="M58 46C70 48 82 50 90 46" fill="none" ${THIN}/>
  <circle cx="40" cy="42" r="5" fill="#f6ead2"/><circle cx="50" cy="42" r="5" fill="#f6ead2"/>
  ${kenteStrip('M34 58Q44 64 56 58L55 64Q44 70 35 64Z')}
  ${face(45, 42, { gap: 5, noMouth: true, cheeks: false })}`;

const elephant = () => `
  <path d="M10 44C6 24 30 18 36 34C38 50 30 66 18 64C12 62 10 54 10 44Z" fill="#9aa2a8" ${L}/>
  <path d="M90 44C94 24 70 18 64 34C62 50 70 66 82 64C88 62 90 54 90 44Z" fill="#9aa2a8" ${L}/>
  <path d="M16 44C14 32 26 28 30 38" fill="none" stroke="#c6a3a8" stroke-width="3" stroke-linecap="round"/>
  <path d="M84 44C86 32 74 28 70 38" fill="none" stroke="#c6a3a8" stroke-width="3" stroke-linecap="round"/>
  <path d="M36 62C30 68 28 74 31 78M64 62C70 68 72 74 69 78" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <path d="M36 62C30 68 28 74 31 78M64 62C70 68 72 74 69 78" fill="none" stroke="#fffdf4" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="50" cy="48" rx="22" ry="21" fill="#aab2b8" ${L}/>
  <path d="M43 60C42 74 44 86 52 90C58 92 64 88 62 82C60 78 56 80 56 84C52 82 51 74 57 60Z" fill="#aab2b8" ${L}/>
  <path d="M45 70q5 2 10 0M46 77q4 2 8 0" fill="none" stroke="#7d868c" stroke-width="1.6" stroke-linecap="round"/>
  ${kenteStrip('M38 30Q50 24 62 30L60 36Q50 30 40 36Z')}
  ${face(50, 48, { gap: 9, noMouth: true })}`;

const pangolin = () => `
  <path d="M74 84C92 84 96 64 84 56" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
  <path d="M74 84C92 84 96 64 84 56" fill="none" stroke="#a87442" stroke-width="5" stroke-linecap="round"/>
  <path d="M20 84C14 58 36 34 56 36C76 38 86 60 78 84Z" fill="#a87442" ${L}/>
  <path d="M28 70q6-8 12 0q6-8 12 0q6-8 12 0M34 58q6-8 12 0q6-8 12 0q6-8 10 0M30 82q6-8 12 0q6-8 12 0q6-8 12 0M44 46q6-8 12 0q4-6 8 0" fill="none" stroke="#7a5230" stroke-width="2" stroke-linecap="round"/>
  <path d="M14 76C10 64 16 54 28 56C32 66 30 76 24 80Z" fill="#e9c99a" ${L}/>
  <path d="M30 88V94M64 88V94" ${L}/>
  ${kenteStrip('M24 56L34 52L36 58L26 62Z')}
  ${face(22, 66, { s: 0.7, gap: 4.5, mouth: 8, cheeks: false })}`;

const grasscutter = () => `
  <path d="M18 84C12 60 30 40 50 40S88 60 82 84Z" fill="#8a6a44" ${L}/>
  <path d="M30 62q4-2 6 0M58 54q4-2 6 0M66 70q4-2 6 0M40 76q4-2 6 0" fill="none" stroke="#6b4f30" stroke-width="2" stroke-linecap="round"/>
  <circle cx="32" cy="42" r="6" fill="#8a6a44" ${L}/><circle cx="68" cy="42" r="6" fill="#8a6a44" ${L}/>
  <ellipse cx="50" cy="66" rx="16" ry="12" fill="#c9a77a" ${L}/>
  <path d="M44 74H56V82H44Z" fill="#f0b043" ${THIN}/><path d="M50 74V82" ${THIN}/>
  <path d="M46 64L54 64L50 68Z" fill="#3a2a22"/>
  <path d="M36 66L20 62M36 70L20 72M64 66L80 62M64 70L80 72" ${THIN} stroke-width="1.2"/>
  ${kenteStrip('M26 86L74 86L72 92L28 92Z')}
  ${face(50, 54, { gap: 10, noMouth: true })}`;

const riverhog = () => `
  <path d="M26 46L14 24L40 38ZM74 46L86 24L60 38Z" fill="#c25a2a" ${L}/>
  <path d="M14 24l-4-7M14 24l-7-2M86 24l4-7M86 24l7-2" stroke="#f4f1ea" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M20 60C18 34 82 34 80 60C80 80 66 92 50 92S20 80 20 60Z" fill="#c25a2a" ${L}/>
  <path d="M50 36V58" stroke="#2b2622" stroke-width="5" stroke-linecap="round" opacity=".7"/>
  <path d="M30 50C36 46 40 46 42 50M70 50C64 46 60 46 58 50" fill="none" stroke="#f4f1ea" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="50" cy="74" rx="14" ry="10" fill="#e88c6a" ${L}/>
  <ellipse cx="45" cy="74" rx="2.4" ry="3" fill="${INK}"/><ellipse cx="55" cy="74" rx="2.4" ry="3" fill="${INK}"/>
  <path d="M30 70L20 74M30 76L22 82M70 70L80 74M70 76L78 82" stroke="#f4f1ea" stroke-width="2" stroke-linecap="round"/>
  ${kenteStrip('M30 88Q50 98 70 88L68 94Q50 102 32 94Z')}
  ${face(50, 56, { gap: 10, mouth: 30, cheeks: false })}`;

export const CHARACTERS = {
  tortoise: { team: 'forest', name: 'Nana Kwaku', kind: 'tortoise', draw: tortoise, crownY: 27 },
  antelope: { team: 'forest', name: 'Abena', kind: 'antelope', draw: antelope, crownY: 32 },
  spider: { team: 'forest', name: 'Kofi', kind: 'spider', draw: spider, crownY: 23 },
  crocodile: { team: 'forest', name: 'Kwabena', kind: 'crocodile', draw: crocodile, crownY: 45, crownX: 19 },
  parrot: { team: 'forest', name: 'Akua', kind: 'parrot', draw: parrot, crownY: 23 },
  bushcat: { team: 'forest', name: 'Esi', kind: 'bush cat', draw: bushcat, crownY: 32 },
  trader: { team: 'market', name: 'Auntie Ama', kind: 'trader', draw: trader, crownY: 16 },
  driver: { team: 'market', name: 'Uncle Kojo', kind: 'tro-tro driver', draw: driver, crownY: 28 },
  drummer: { team: 'market', name: 'Kwame', kind: 'drummer', draw: drummer, crownY: 27 },
  farmer: { team: 'market', name: 'Afua', kind: 'farmer', draw: farmer, crownY: 31 },
  schoolchild: { team: 'market', name: 'Adwoa', kind: 'schoolchild', draw: schoolchild, crownY: 31 },
  fisherman: { team: 'market', name: 'Papa Yaw', kind: 'fisherman', draw: fisherman, crownY: 22 },
  // Unlocked by playing well. Purely cosmetic: every piece follows the same rules.
  owl: { team: 'forest', name: 'Nana Yaa', kind: 'owl', draw: owl, crownY: 30, unlock: { type: 'wins', n: 3, text: 'Win 3 games in a row' } },
  hedgehog: { team: 'forest', name: 'Kwesi', kind: 'hedgehog', draw: hedgehog, crownY: 30, unlock: { type: 'puzzles', n: 3, text: '3-day puzzle streak' } },
  kenkey: { team: 'market', name: 'Maame Esi', kind: 'kenkey seller', draw: kenkey, crownY: 15, unlock: { type: 'wins', n: 5, text: 'Win 5 games in a row' } },
  tailor: { team: 'market', name: 'Aunty Efua', kind: 'tailor', draw: tailor, crownY: 22, unlock: { type: 'puzzles', n: 7, text: '7-day puzzle streak' } },
  // Chop Bar pack (market): unlocked by win and puzzle streaks. Cosmetic only.
  waakye: { team: 'market', pack: 'Chop Bar', name: 'Auntie Akosua', kind: 'waakye seller', draw: waakye, crownY: 18, unlock: { type: 'wins', n: 2, text: 'Win 2 games in a row' }, quip: 'Waakye with extra shito — and extra pieces for me.' },
  bofrot: { team: 'market', pack: 'Chop Bar', name: 'Maame Ekua', kind: 'bofrot seller', draw: bofrot, crownY: 16, unlock: { type: 'puzzles', n: 2, text: '2-day puzzle streak' }, quip: 'Sweet and round, like a double jump.' },
  kenkeywrap: { team: 'market', pack: 'Chop Bar', name: 'Sister Aba', kind: 'kenkey wrapper', draw: kenkeyWrap, crownY: 26, unlock: { type: 'wins', n: 4, text: 'Win 4 games in a row' }, quip: 'Wrapped tight, like your pieces in my corner.' },
  chichinga: { team: 'market', pack: 'Chop Bar', name: 'Brother Kobina', kind: 'chichinga seller', draw: chichinga, crownY: 26, unlock: { type: 'puzzles', n: 5, text: '5-day puzzle streak' }, quip: 'Hot off the grill — just like this move.' },
  plantain: { team: 'market', pack: 'Chop Bar', name: 'Kofi Brokeman', kind: 'plantain roaster', draw: plantain, crownY: 24, unlock: { type: 'wins', n: 6, text: 'Win 6 games in a row' }, quip: 'Roasted! Next customer, please.' },
  pito: { team: 'market', pack: 'Chop Bar', name: 'Agya Kwamena', kind: 'pito brewer', draw: pito, crownY: 26, unlock: { type: 'puzzles', n: 14, text: '14-day puzzle streak' }, quip: 'Slow brew, strong finish.' },
  // Wildlife pack (forest): unlocked by win and puzzle streaks. Cosmetic only.
  mona: { team: 'forest', pack: 'Wildlife', name: 'Kwadwo', kind: 'mona monkey', draw: mona, crownY: 30, unlock: { type: 'puzzles', n: 2, text: '2-day puzzle streak' }, quip: 'Swing, jump, jump again!' },
  hornbill: { team: 'forest', pack: 'Wildlife', name: 'Afia', kind: 'hornbill', draw: hornbill, crownY: 30, crownX: -6, unlock: { type: 'wins', n: 2, text: 'Win 2 games in a row' }, quip: 'I saw that move from the treetops.' },
  pangolin: { team: 'forest', pack: 'Wildlife', name: 'Abenaa', kind: 'pangolin', draw: pangolin, crownY: 38, unlock: { type: 'puzzles', n: 4, text: '4-day puzzle streak' }, quip: 'Curl up, roll in, take one.' },
  grasscutter: { team: 'forest', pack: 'Wildlife', name: 'Ekow', kind: 'grasscutter', draw: grasscutter, crownY: 38, unlock: { type: 'wins', n: 4, text: 'Win 4 games in a row' }, quip: 'Small teeth, big appetite for pieces.' },
  riverhog: { team: 'forest', pack: 'Wildlife', name: 'Kweku', kind: 'red river hog', draw: riverhog, crownY: 38, unlock: { type: 'puzzles', n: 10, text: '10-day puzzle streak' }, quip: 'Snout down, straight through the middle.' },
  elephant: { team: 'forest', pack: 'Wildlife', name: 'Nana Kwasi', kind: 'elephant', draw: elephant, crownY: 30, unlock: { type: 'wins', n: 8, text: 'Win 8 games in a row' }, quip: 'An elephant never forgets a missed jump.' },
  // Seasonal placeholders: drawn and listed, switched on in a later update.
  harmattan: { team: 'forest', name: 'Harmattan', kind: 'dusty breeze', draw: harmattan, crownY: 30, seasonal: 'Dec – Feb' },
  rainfrog: { team: 'forest', name: 'Nsuo', kind: 'rainy-season frog', draw: rainfrog, crownY: 40, seasonal: 'May – Jul' },
  masquerader: { team: 'market', name: 'Fancy Dress', kind: 'masquerader', draw: masquerader, crownY: 6, seasonal: 'New Year' },
  caroler: { team: 'market', name: 'Kofi Carols', kind: 'caroler', draw: caroler, crownY: 22, seasonal: 'December' },
};

/** The starting six of each team (always available). */
export const BASE_ROSTER = {
  forest: Object.keys(CHARACTERS).filter((k) => CHARACTERS[k].team === 'forest' && !CHARACTERS[k].unlock && !CHARACTERS[k].seasonal),
  market: Object.keys(CHARACTERS).filter((k) => CHARACTERS[k].team === 'market' && !CHARACTERS[k].unlock && !CHARACTERS[k].seasonal),
};
/** Every character of each team, including locked and seasonal ones (so a friend's picks always draw). */
export const TEAM_ROSTER = {
  forest: Object.keys(CHARACTERS).filter((k) => CHARACTERS[k].team === 'forest'),
  market: Object.keys(CHARACTERS).filter((k) => CHARACTERS[k].team === 'market'),
};

const crown = (y, x = 0) => `<g transform="translate(${x} ${y - 16})"><g class="crown">
  <path d="M33 16L36 2L44 9L50 -1L56 9L64 2L67 16Z" fill="#f6c431" ${L}/>
  <circle cx="36" cy="2" r="2.4" fill="#d23a2a" ${THIN}/><circle cx="50" cy="-1" r="2.6" fill="#3f8f3a" ${THIN}/><circle cx="64" cy="2" r="2.4" fill="#d23a2a" ${THIN}/>
  <path d="M38 12H62" stroke="#c9890f" stroke-width="2"/></g></g>`;

/** Full piece SVG for a character. */
export function characterSVG(key, { withBase = true, drawing = null } = {}) {
  const ch = CHARACTERS[key];
  const team = TEAMS[ch.team];
  // Every piece stands on a ring: a faint light halo, a thick dark outline and the team colour.
  // Forest rings carry a solid inner line, Market rings a dashed "stitched" one, so the
  // teams differ by pattern as well as colour.
  const inner = ch.team === 'forest'
    ? `<ellipse cx="50" cy="91" rx="27" ry="5.6" fill="none" stroke="${team.ink}" stroke-width="2.4"/>`
    : `<ellipse cx="50" cy="91" rx="28" ry="6" fill="none" stroke="#fff" stroke-width="2.6" stroke-dasharray="4.5 3.5"/>
       <ellipse cx="50" cy="91" rx="39.5" ry="12" fill="none" stroke="#1d1a17" stroke-width="1.6"/>`;
  const base = withBase
    ? `<ellipse class="halo" cx="50" cy="91" rx="43" ry="14" fill="#fff" opacity=".55"/>
       <ellipse class="base" cx="50" cy="91" rx="35" ry="9.5" fill="${team.color}" stroke="#1d1a17" stroke-width="3.6"/>
       ${inner}
       <path class="king-ring" d="M10 91C12 78 89 77 91 90C92 104 9 105 11 89" fill="none" stroke="#e0a800" stroke-width="2.4" stroke-dasharray="5 4" stroke-linecap="round"/>`
    : '';
  return `<svg viewBox="0 -14 100 114" aria-hidden="true">${base}<g class="bob">${drawing ? drawing.replace('<!--crown-->', crown(ch.crownY, ch.crownX)) : ch.draw() + crown(ch.crownY, ch.crownX)}</g></svg>`;
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
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="6" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs></svg>`;

/** Drawing helpers, shared with the moving-parts versions in js/rigs.js. */
export const PARTS = { INK, L, THIN, SKIN, face, kenteStrip, head, torso, ears, arm };
