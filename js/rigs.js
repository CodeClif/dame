// Moving-parts versions of the characters ("rigs"). At rest each one looks exactly like its
// drawing in js/characters.js, but its wings, legs, tail, jaws and load are separate groups,
// so a move can be acted out: the parrot flies, the crocodile crawls and bites, the waakye
// seller walks with her bowl, the elephant stomps. Cosmetic only — the rules never change.
//
// Every animated part is a <g class="p-name">. Transforms are written around a pivot point in
// the drawing's own units (see pose()), so they behave the same in every browser.
import { PARTS } from './characters.js';
import { strike, shout } from './moves.js';

const { INK, L, THIN, SKIN, face, kenteStrip, head, torso, ears, arm } = PARTS;

// ---------- drawings ----------

const WING = `<path d="M34 52C24 40 10 34-4 36C0 40 4 42 6 43C0 45-2 48-1 50C4 50 8 50 10 50C6 54 6 57 7 59C12 58 16 57 19 56C18 60 19 63 21 64C26 62 30 60 34 62Z" fill="#9ca3aa" ${L}/>
  <path d="M8 43C16 44 24 48 30 54M10 50C17 51 24 54 30 57" fill="none" stroke="#7b828a" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M-4 36C0 40 4 42 6 43C0 45-2 48-1 50" fill="#d6372a" ${THIN}/>`;

const parrot = () => `
  <g class="p-spread-l" style="opacity:0">${WING}</g>
  <g class="p-spread-r" style="opacity:0"><g transform="matrix(-1 0 0 1 100 0)">${WING}</g></g>
  <g class="p-tail"><path d="M41 80L35 97L50 90L65 97L59 80Z" fill="#d6372a" ${L}/></g>
  <g class="p-feet"><path d="M30 88l4 6M70 88l-4 6" stroke="#e98d2f" stroke-width="3" stroke-linecap="round"/></g>
  <g class="p-body"><ellipse cx="50" cy="62" rx="23" ry="26" fill="#9ca3aa" ${L}/>
    <path d="M42 66q4 3 8 0q4 3 8 0M44 74q3 2.5 6 0q3 2.5 6 0" fill="none" stroke="#e7eaee" stroke-width="2" stroke-linecap="round"/></g>
  <g class="p-wing-l"><path d="M28 58C24 70 30 82 40 84C34 74 34 64 36 56Z" fill="#7b828a" ${THIN}/></g>
  <g class="p-wing-r"><path d="M72 58C76 70 70 82 60 84C66 74 66 64 64 56Z" fill="#7b828a" ${THIN}/></g>
  <g class="p-head"><circle cx="50" cy="38" r="18" fill="#b4bac0" ${L}/>
    <ellipse cx="50" cy="38" rx="13" ry="8" fill="#eef0f2"/>
    ${kenteStrip('M32 30Q50 16 68 30L67 37Q50 24 33 37Z')}
    <path d="M45 43C49 38 59 40 57 52C55 48 51 47 45 47Z" fill="${INK}" ${THIN}/>
    ${face(50, 37, { gap: 8, noMouth: true, cheeks: false })}</g>`;

const crocodile = () => `
  <g class="p-tail"><path d="M32 74C18 77 7 70 3 57C11 64 20 66 32 63Z" fill="#5e9a4a" ${L}/>
    <path d="M9 61l2-5 3 4M16 64l2-5 3 4" fill="#467a37" ${THIN}/></g>
  <g class="p-leg-b"><path d="M28 84V90H34V84" fill="#5e9a4a" ${L}/></g>
  <g class="p-leg-f"><path d="M48 84V90H54V84" fill="#5e9a4a" ${L}/></g>
  <g class="p-body"><ellipse cx="42" cy="74" rx="23" ry="12.5" fill="#5e9a4a" ${L}/>
    <path d="M24 79C32 86 52 86 62 79" fill="#a9d68a" ${THIN}/>
    <path d="M24 66l3-7 4 6M32 63l3-7 4 6M40 62l3-7 4 6M48 63l3-7 4 6" fill="#467a37" ${THIN}/></g>
  <g class="p-head">
    <path d="M58 66L94 64L91 69L67 72Z" fill="#8a2c2c"/>
    <g class="p-jaw-low"><path d="M53 61L55 66L66 66L95 63C99 63.5 99 66 96 67L67 74C59 75 52 69 53 61Z" fill="#5e9a4a"/>
      <path d="M95 63C99 63.5 99 66 96 67L67 74C59 75 52 69 53 61" fill="none" ${L}/></g>
    <g class="p-jaw-up"><path d="M53 61C56 53 63 48 72 50L96 58C100 60 100 63 95 63L66 66L55 66Z" fill="#5e9a4a"/>
      <path d="M53 61C56 53 63 48 72 50L96 58C100 60 100 63 95 63" fill="none" ${L}/>
      <path d="M66 66L95 63" fill="none" ${THIN}/>
      <path d="M69 66l2 3.4 2-3.6M75 65.5l2 3.4 2-3.6M81 65l2 3.4 2-3.6M87 64.4l2 3.4 2-3.6" fill="#fff" ${THIN} stroke-width="1.2"/>
      <circle cx="94" cy="60" r="1.4" fill="${INK}"/></g>
    <circle cx="64" cy="50" r="6" fill="#5e9a4a" ${L}/><circle cx="74" cy="50" r="6" fill="#5e9a4a" ${L}/>
    <circle cx="64" cy="50" r="4.2" fill="#f6f0d8"/><circle cx="74" cy="50" r="4.2" fill="#f6f0d8"/>
    <path d="M55 62C59 64 61 71 59 77L53 77C55 71 53 65 50 63Z" fill="url(#kente)" ${THIN}/>
    ${face(69, 50, { s: 0.8, gap: 6.2, noMouth: true, cheeks: false })}</g>`;

const leg = (x, skin) => `${arm(x, 84, x, 110, skin)}<path d="M${x - 5} 112h10" stroke="#b8322a" stroke-width="3.6" stroke-linecap="round"/>`;
const waakye = () => {
  const k = SKIN[1];
  return `
  <g class="p-legs" style="opacity:0"><g class="p-leg-l">${leg(43, k)}</g><g class="p-leg-r">${leg(57, k)}</g></g>
  <g class="p-torso">${torso('#3d5fb8', `<path d="M36 74H64V97H36Z" fill="#f4efe4" ${THIN}/>`)}</g>
  <g class="p-head">${ears(48, k)}${head(50, 47, 16, k)}
    <path d="M32 44C30 26 70 26 68 44C62 38 38 38 32 44Z" fill="#e2502a" ${L}/>
    <g class="p-knot"><path d="M44 28C40 18 50 14 52 22C56 14 64 20 58 28Z" fill="#e2502a" ${L}/></g>
    <path d="M38 34h24" stroke="#f6c431" stroke-width="2.4"/>
    ${face(50, 49, { s: 0.92, gap: 6.5, mouth: 8 })}</g>
  <g class="p-load">${arm(28, 76, 30, 86, k)}${arm(72, 76, 70, 86, k)}
    <path d="M22 84C36 82 64 82 78 84" fill="none" stroke="#3f8f3a" stroke-width="5" stroke-linecap="round"/>
    <path d="M26 84Q50 100 74 84Z" fill="#e9e2d0" ${L}/>
    <path d="M30 84Q50 66 70 84Z" fill="#7a3b2a" ${L}/>
    <path d="M38 78q3-4 6 0t6 0 6 0" fill="none" stroke="#f3e6c8" stroke-width="1.8" stroke-linecap="round"/>
    <ellipse cx="60" cy="76" rx="5" ry="3.6" fill="#fff" ${THIN}/><circle cx="60" cy="76" r="1.8" fill="#f6b33c"/>
    <g class="p-steam" style="opacity:0"><path d="M28 78q-3-4 0-8t0-8M72 78q-3-4 0-8t0-8" fill="none" stroke="#b9b2a4" stroke-width="2" stroke-linecap="round"/></g></g>`;
};

const stump = (x, w, fill) => `<rect x="${x}" y="60" width="${w}" height="40" rx="4" fill="${fill}" ${L}/>
  <path d="M${x + 2} 99q${w / 6} -3 ${w / 3} 0M${x + w / 3 + 1} 99q${w / 6} -3 ${w / 3} 0" fill="#fffdf4" ${THIN} stroke-width="1.2"/>`;
const elephant = () => `
  <g class="p-legs" style="opacity:0">
    <g class="p-leg-bl">${stump(22, 10, '#8f979d')}</g><g class="p-leg-br">${stump(68, 10, '#8f979d')}</g>
    <g class="p-leg-fl">${stump(30, 12, '#aab2b8')}</g><g class="p-leg-fr">${stump(58, 12, '#aab2b8')}</g></g>
  <g class="p-ear-l"><path d="M10 44C6 24 30 18 36 34C38 50 30 66 18 64C12 62 10 54 10 44Z" fill="#9aa2a8" ${L}/>
    <path d="M16 44C14 32 26 28 30 38" fill="none" stroke="#c6a3a8" stroke-width="3" stroke-linecap="round"/></g>
  <g class="p-ear-r"><path d="M90 44C94 24 70 18 64 34C62 50 70 66 82 64C88 62 90 54 90 44Z" fill="#9aa2a8" ${L}/>
    <path d="M84 44C86 32 74 28 70 38" fill="none" stroke="#c6a3a8" stroke-width="3" stroke-linecap="round"/></g>
  <path d="M36 62C30 68 28 74 31 78M64 62C70 68 72 74 69 78" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <path d="M36 62C30 68 28 74 31 78M64 62C70 68 72 74 69 78" fill="none" stroke="#fffdf4" stroke-width="4" stroke-linecap="round"/>
  <g class="p-head"><ellipse cx="50" cy="48" rx="22" ry="21" fill="#aab2b8" ${L}/>
    ${kenteStrip('M38 30Q50 24 62 30L60 36Q50 30 40 36Z')}
    ${face(50, 48, { gap: 9, noMouth: true })}</g>
  <g class="p-trunk"><path d="M43 60C42 74 44 86 52 90C58 92 64 88 62 82C60 78 56 80 56 84C52 82 51 74 57 60Z" fill="#aab2b8" ${L}/>
    <path d="M45 70q5 2 10 0M46 77q4 2 8 0" fill="none" stroke="#7d868c" stroke-width="1.6" stroke-linecap="round"/></g>`;

// Forest Friends.

const tortoise = () => `
  <g class="p-foot-l"><ellipse cx="27" cy="82" rx="8" ry="6" fill="#9cc26a" ${L}/></g>
  <g class="p-foot-r"><ellipse cx="73" cy="82" rx="8" ry="6" fill="#9cc26a" ${L}/></g>
  <g class="p-shell"><path d="M12 72C12 40 33 24 50 24S88 40 88 72Z" fill="#8a6a3b" ${L}/>
    <path d="M38 50L50 42L62 50L60 62H40Z" fill="#b08a4e" ${THIN}/>
    <path d="M38 50L24 56M62 50L76 56M50 42V27M40 62L30 71M60 62L70 71" fill="none" ${THIN}/>
    <path d="M9 72Q50 84 91 72" fill="none" ${L}/></g>
  <g class="p-head"><circle cx="50" cy="66" r="15" fill="#a9cd78" ${L}/>
    ${kenteStrip('M36 77Q50 86 64 77L65 84Q50 93 35 84Z')}
    <path d="M60 83L66 95L71 90Z" fill="url(#kente)" ${THIN}/>
    ${face(50, 64, { s: 0.9, gap: 6.5, mouth: 8 })}</g>`;

const HORNS = 'M43 34C35 24 27 13 30 1C32 -7 37 -10 40 -12M57 34C65 24 73 13 70 1C68 -7 63 -10 60 -12';
const antelope = () => `
  <g class="p-legs" style="opacity:0"><path d="M43 80L38 112M57 80L62 112" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
    <path d="M43 80L38 112M57 80L62 112" stroke="#b97a3f" stroke-width="3.8" stroke-linecap="round"/>
    <path d="M34 113h8M58 113h8" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/></g>
  <g class="p-horns"><path d="${HORNS}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
    <path d="${HORNS}" fill="none" stroke="#5a3d22" stroke-width="3.8" stroke-linecap="round"/>
    <path d="M33 21l5-2M30 13l5-1M30 5l5 0M67 21l-5-2M70 13l-5-1M70 5l-5 0" stroke="#e9d6b0" stroke-width="1.8" stroke-linecap="round"/></g>
  <g class="p-ear-l"><path d="M35 41C24 32 13 33 7 37C13 45 26 47 35 45Z" fill="#c98a4b" ${L}/><path d="M31 40C23 36 16 36 12 38C17 42 25 43 31 42Z" fill="#f2c3b0"/></g>
  <g class="p-ear-r"><path d="M65 41C76 32 87 33 93 37C87 45 74 47 65 45Z" fill="#c98a4b" ${L}/><path d="M69 40C77 36 84 36 88 38C83 42 75 43 69 42Z" fill="#f2c3b0"/></g>
  <g class="p-head">${kenteStrip('M36 86Q50 94 64 86L63 94Q50 101 37 94Z')}
    <path d="M33 39C33 30 67 30 67 39C68 54 60 72 55 81C53 85 47 85 45 81C40 72 32 54 33 39Z" fill="#c98a4b" ${L}/>
    <path d="M50 36V70" stroke="#8a5a2c" stroke-width="6" stroke-linecap="round" opacity=".45"/>
    <ellipse cx="41" cy="48" rx="6.5" ry="4.5" fill="#f6ead2"/><ellipse cx="59" cy="48" rx="6.5" ry="4.5" fill="#f6ead2"/>
    <ellipse cx="50" cy="78" rx="6" ry="4.4" fill="#3a2a20" ${THIN}/>
    <path d="M41 86Q50 91 59 86" fill="none" stroke="#fbf3e4" stroke-width="3" stroke-linecap="round"/>
    ${face(50, 48, { gap: 9, mouth: 34, cheeks: false })}</g>`;

const SPIDER_LEGS = [['38 58', '20 44', '11 54'], ['37 62', '15 60', '7 72'], ['39 66', '21 75', '16 87'], ['42 70', '30 84', '28 95'],
  ['62 58', '80 44', '89 54'], ['63 62', '85 60', '93 72'], ['61 66', '79 75', '84 87'], ['58 70', '70 84', '72 95']];
const spider = () => `
  ${SPIDER_LEGS.map(([a, b, c], i) => `<g class="p-leg-${i < 4 ? 'l' : 'r'}${i % 4}"><path d="M${a}L${b}L${c}" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></g>`).join('')}
  <g class="p-body"><ellipse cx="50" cy="68" rx="20" ry="17" fill="#7a4f2c" ${L}/>
    <path d="M38 70Q50 76 62 70M40 78Q50 83 60 78" fill="none" stroke="#c58a52" stroke-width="2.6" stroke-linecap="round"/></g>
  <g class="p-head"><circle cx="50" cy="46" r="15" fill="#946236" ${L}/>
    <circle cx="45" cy="38" r="2" fill="${INK}"/><circle cx="55" cy="38" r="2" fill="${INK}"/>
    ${kenteStrip('M35 38Q50 18 65 38Q50 33 35 38Z')}
    <circle cx="50" cy="24" r="3" fill="#d23a2a" ${THIN}/>
    ${face(50, 48, { s: 0.95, gap: 6.5, mouth: 7 })}</g>`;

const bushcat = () => `
  <g class="p-tail" style="opacity:0"><path d="M64 86C84 90 94 74 88 56" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
    <path d="M64 86C84 90 94 74 88 56" fill="none" stroke="#d9a24f" stroke-width="6.4" stroke-linecap="round"/>
    <path d="M76 87h.1M86 78h.1M89 66h.1" stroke="#7a4a1a" stroke-width="4" stroke-linecap="round"/></g>
  <g class="p-ear-l"><path d="M26 20L22 46L42 36Z" fill="#d9a24f" ${L}/><path d="M27 28L26 40L35 36Z" fill="#f2b5a0"/></g>
  <g class="p-ear-r"><path d="M74 20L78 46L58 36Z" fill="#d9a24f" ${L}/><path d="M73 28L74 40L65 36Z" fill="#f2b5a0"/></g>
  <g class="p-head">${kenteStrip('M27 74Q50 88 73 74L50 97Z')}
    <ellipse cx="50" cy="55" rx="28" ry="25" fill="#d9a24f" ${L}/>
    <path d="M30 48h.1M27 58h.1M34 40h.1M70 48h.1M73 58h.1M66 40h.1M44 34h.1M56 34h.1M50 31h.1" stroke="#7a4a1a" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="50" cy="66" rx="13" ry="9" fill="#fbf1de" ${L}/>
    <path d="M46 61L54 61L50 65Z" fill="#e36f7a" ${THIN}/>
    <path d="M36 64L20 61M36 68L21 70M64 64L80 61M64 68L79 70" ${THIN} stroke-width="1.4"/>
    ${face(50, 52, { gap: 9, mouth: 15, cheeks: false })}</g>
  <g class="p-paws" style="opacity:0"><ellipse cx="36" cy="90" rx="8" ry="5.5" fill="#d9a24f" ${L}/><ellipse cx="64" cy="90" rx="8" ry="5.5" fill="#d9a24f" ${L}/>
    <path d="M33 88v3M36 88v3M39 88v3M61 88v3M64 88v3M67 88v3" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/></g>`;

const OWL_WING = `<path d="M34 52C24 40 10 34-4 36C0 40 4 42 6 43C0 45-2 48-1 50C4 50 8 50 10 50C6 54 6 57 7 59C12 58 16 57 19 56C18 60 19 63 21 64C26 62 30 60 34 62Z" fill="#8a5a33" ${L}/>
  <path d="M8 43C16 44 24 48 30 54M10 50C17 51 24 54 30 57" fill="none" stroke="#e6c79a" stroke-width="1.8" stroke-linecap="round"/>`;
const owl = () => `
  <g class="p-spread-l" style="opacity:0"><g transform="translate(-8 4)">${OWL_WING}</g></g>
  <g class="p-spread-r" style="opacity:0"><g transform="matrix(-1 0 0 1 108 4)">${OWL_WING}</g></g>
  <g class="p-tufts"><path d="M28 30L22 14L38 24ZM72 30L78 14L62 24Z" fill="#8a5a33" ${L}/></g>
  <g class="p-body"><path d="M20 58C20 30 80 30 80 58C82 82 66 92 50 92C34 92 18 82 20 58Z" fill="#9b6a3d" ${L}/>
    <path d="M34 66q4 4 8 0M46 72q4 4 8 0M58 66q4 4 8 0M40 80q4 4 8 0M52 80q4 4 8 0" fill="none" stroke="#e6c79a" stroke-width="2.2" stroke-linecap="round"/></g>
  <g class="p-talons" style="opacity:0"><path d="M42 90l-3 7M45 90v8M48 90l3 7M52 90l-3 7M55 90v8M58 90l3 7" stroke="#f6b33c" stroke-width="2.8" stroke-linecap="round"/></g>
  <g class="p-head"><circle cx="38" cy="46" r="11" fill="#fbf1de" ${L}/><circle cx="62" cy="46" r="11" fill="#fbf1de" ${L}/>
    <path d="M46 52L50 60L54 52Z" fill="#f6b33c" ${THIN}/>
    ${kenteStrip('M30 30Q50 22 70 30L69 36Q50 28 31 36Z')}
    ${face(50, 46, { gap: 12, noMouth: true, cheeks: false })}</g>`;

const BALL = Array.from({ length: 28 }, (_, k) => {
  const a = (k / 28) * Math.PI * 2;
  const r = k % 2 ? 20 : 29;
  return `${k ? 'L' : 'M'}${(52 + Math.cos(a) * r).toFixed(1)} ${(66 + Math.sin(a) * r).toFixed(1)}`;
}).join('') + 'Z';
const hedgehog = () => `
  <g class="p-foot-b"><path d="M34 88V94" ${L}/></g><g class="p-foot-f"><path d="M62 88V94" ${L}/></g>
  <g class="p-body"><g class="p-spikes"><path d="M14 78L10 68L18 66L14 56L24 56L22 44L32 46L34 34L42 40L48 28L54 38L62 30L64 42L74 38L74 50L84 50L80 60L90 64L84 72L90 80Z" fill="#6b4a2a" ${L}/></g>
    <ellipse cx="54" cy="70" rx="26" ry="18" fill="#e9c99a" ${L}/>
    <g class="p-nose"><ellipse cx="80" cy="74" rx="6" ry="4.6" fill="#2b2622"/></g>
    <path d="M38 40L46 46L38 52ZM54 40L46 46L54 52Z" fill="url(#kente)" ${THIN}/><circle cx="46" cy="46" r="2.6" fill="#d23a2a" ${THIN}/>
    ${face(58, 66, { gap: 8, mouth: 9 })}</g>
  <g class="p-ball" style="opacity:0"><path d="${BALL}" fill="#6b4a2a" ${L}/><circle cx="52" cy="66" r="13" fill="#7d5733" ${THIN}/>
    <path d="M44 62q8-6 16 0M46 70q6 5 12 0" fill="none" stroke="#9b7448" stroke-width="2" stroke-linecap="round"/></g>`;

// ---------- animation helpers ----------

let slow = 1;
/** Slow-motion factor for the sample page (1 = normal speed). */
export const setSlow = (f) => { slow = f; };
const T = (ms) => ms * slow;
const wait = (ms) => new Promise((r) => setTimeout(r, T(ms)));

/** A transform around a pivot (cx, cy) in drawing units. Same function list every time, so frames blend smoothly. */
const pose = ({ x = 0, y = 0, r = 0, sx = 1, sy = 1 } = {}, cx = 50, cy = 90) =>
  `translate(${x}px, ${y}px) translate(${cx}px, ${cy}px) rotate(${r}deg) scale(${sx}, ${sy}) translate(${-cx}px, ${-cy}px)`;

function play(el, list, ms, { at = [50, 90], fill = 'forwards', ...opts } = {}) {
  if (!el) return { finished: Promise.resolve(), cancel() {}, pause() {}, play() {} };
  const frames = list.map(({ offset, opacity, ...o }) => ({ transform: pose(o, ...at), ...(offset != null && { offset }), ...(opacity != null && { opacity }) }));
  return el.animate(frames, { duration: T(ms), fill, ...opts });
}
const loop = (el, list, ms, opts = {}) => play(el, list, ms, { iterations: Infinity, fill: 'none', ...opts });
const show = (el, on, ms = 120) => el?.animate([{ opacity: on ? 0 : 1 }, { opacity: on ? 1 : 0 }], { duration: T(ms), fill: 'forwards' });
const done = (a) => a.finished.catch(() => {});

/** Everything a move needs: the piece, its parts, the squares and the effects layer. */
function context(el, from, to, victim, opts) {
  const dir = to[1] >= from[1] ? 1 : -1;
  const cell = (f) => `translate(calc(${from[1] + (to[1] - from[1]) * f} * 100%), calc(${from[0] + (to[0] - from[0]) * f} * 100%))`;
  let at = 0;
  const running = [];
  return {
    el, dir, victim, fx: opts.fx,
    q: (name) => el.querySelector(`.p-${name}`),
    /** Slide the whole piece along its path, from where it is now to fraction f. */
    travel(f, ms, easing = 'ease-in-out') {
      const a = el.animate([{ transform: cell(at) }, { transform: cell(f) }], { duration: T(ms), easing, fill: 'forwards' });
      at = f;
      return done(a);
    },
    keep(...anims) { running.push(...anims); return anims; },
    stop() { running.splice(0).forEach((a) => a.cancel()); },
    hit(type) {
      const { el: v, r, c } = victim;
      return strike(opts.key, { fx: opts.fx, victim: v, base: `translate(calc(${c} * 100%), calc(${r} * 100%))`, r, c, board: opts.board, dir, type });
    },
    shout: (text, color) => shout(opts.fx, victim.r, victim.c, text, color),
    shake: (px = 3) => opts.board?.animate([{ transform: 'none' }, { transform: `translate(${-px}px, ${px * 0.6}px)` }, { transform: `translate(${px}px, ${-px * 0.6}px)` }, { transform: 'none' }], T(260)),
  };
}

// ---------- the spider's web line ----------

/** A silk line shot from the spider's mouth to a piece, drawn in the effects layer. */
function webLine(fx, from, to) {
  const box = fx.getBoundingClientRect();
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const [x1, y1] = [a.left + a.width / 2 - box.left, a.top + a.height * 0.3 - box.top];
  const [x2, y2] = [b.left + b.width / 2 - box.left, b.top + b.height * 0.35 - box.top];
  const holder = document.createElement('div');
  holder.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  const d = `M${x1} ${y1}Q${(x1 + x2) / 2} ${Math.min(y1, y2) - a.height * 0.25} ${x2} ${y2}`;
  holder.innerHTML = `<svg width="${box.width}" height="${box.height}" style="position:absolute;left:0;top:0;overflow:visible" aria-hidden="true">
    <path d="${d}" pathLength="1" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-dasharray="1.02 1.02"/>
    <path d="${d}" pathLength="1" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="1.02 1.02"/></svg>`;
  fx.appendChild(holder);
  for (const p of holder.querySelectorAll('path')) p.animate([{ strokeDashoffset: 1.02 }, { strokeDashoffset: 0 }], { duration: T(200), easing: 'ease-out', fill: 'forwards' });
  return {
    snap() {
      holder.animate([{ opacity: 1 }, { opacity: 1, transform: 'translateY(-4px)', offset: 0.3 }, { opacity: 0, transform: 'translateY(6px)' }], { duration: T(320), fill: 'forwards' })
        .finished.then(() => holder.remove(), () => holder.remove());
    },
  };
}

/** Wrap a piece in silk: strands drawn on over the character. */
function cocoon(piece) {
  const holder = piece.firstElementChild || piece;
  holder.insertAdjacentHTML('beforeend', `<svg viewBox="0 -14 100 114" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible" aria-hidden="true">
    <path d="M24 30L76 52M76 30L24 52M22 50L78 72M78 50L22 72M24 70L76 90M76 70L24 90M50 18V96M30 40Q50 30 70 40M28 62Q50 52 72 62M28 82Q50 74 72 82"
      pathLength="1" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-dasharray="1.02 1.02" stroke-dashoffset="1.02"/>
    <path d="M24 30L76 52M76 30L24 52M22 50L78 72M78 50L22 72M24 70L76 90M76 70L24 90M50 18V96M30 40Q50 30 70 40M28 62Q50 52 72 62M28 82Q50 74 72 82"
      pathLength="1" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-dasharray="1.02 1.02" stroke-dashoffset="1.02"/></svg>`);
  for (const p of holder.lastElementChild.querySelectorAll('path')) p.animate([{ strokeDashoffset: 1.02 }, { strokeDashoffset: 0 }], { duration: T(380), easing: 'ease-out', fill: 'forwards' });
}

/** Yank a wrapped piece up and sling it right off the nearest side of the board. */
function sling(victim, spider, fx) {
  const cols = Math.max(1, Math.round(fx.clientWidth / spider.offsetWidth));
  const side = victim.c < cols / 2 ? -1 : 1;
  const out = side < 0 ? -(victim.c + 2) * 100 : (cols - victim.c + 1) * 100;
  const base = `translate(calc(${victim.c} * 100%), calc(${victim.r} * 100%))`;
  victim.el.style.zIndex = 60;
  return victim.el.animate([
    { transform: base },
    { transform: `${base} translate(${-side * 10}%, -70%) rotate(${-side * 20}deg) scale(1.05)`, offset: 0.22 },
    { transform: `${base} translate(${out * 0.55}%, -230%) rotate(${side * 400}deg) scale(.85)`, offset: 0.6 },
    { transform: `${base} translate(${out}%, -40%) rotate(${side * 760}deg) scale(.6)`, opacity: 0 },
  ], { duration: T(1000), easing: 'ease-in', fill: 'forwards' }).finished.then(() => victim.el.remove(), () => victim.el.remove());
}

// ---------- choreography ----------

const RIGS = {
  parrot: {
    draw: parrot,
    async move(m) {
      const rig = m.q('rig');
      const spreadL = m.q('spread-l');
      const spreadR = m.q('spread-r');
      // Take off: crouch, open the wings, lift.
      show(m.q('wing-l'), false); show(m.q('wing-r'), false); show(spreadL, true); show(spreadR, true);
      m.keep(
        loop(spreadL, [{ r: 32 }, { r: -24 }], 150, { at: [32, 54], direction: 'alternate', easing: 'ease-in-out' }),
        loop(spreadR, [{ r: -32 }, { r: 24 }], 150, { at: [68, 54], direction: 'alternate', easing: 'ease-in-out' }),
        loop(m.q('tail'), [{ r: -8 }, { r: 8 }], 300, { at: [50, 80], direction: 'alternate' }),
        play(m.q('feet'), [{ sy: 1 }, { sy: 0.3 }], 200, { at: [50, 88] }),
        play(m.q('head'), [{ r: 0 }, { r: m.dir * 10 }], 300, { at: [50, 46] }),
      );
      await done(play(rig, [{}, { y: 4, sx: 1.12, sy: 0.86, offset: 0.4 }, { y: -40, r: m.dir * 8 }], 260, { easing: 'ease-out' }));
      if (!m.victim) {
        play(rig, [{ y: -40, r: m.dir * 8 }, { y: -52, r: m.dir * 10 }, { y: -40, r: m.dir * 8 }], 700);
        await m.travel(1, 700);
      } else {
        // Glide over, dive at the piece, flurry, climb away.
        play(rig, [{ y: -40, r: m.dir * 8 }, { y: -52, r: m.dir * 12 }], 520);
        await m.travel(0.5, 520);
        await done(play(rig, [{ y: -52, r: m.dir * 12 }, { y: -10, r: m.dir * 24 }], 180, { easing: 'ease-in' }));
        play(m.q('feet'), [{ sy: 0.3 }, { sy: 1.2 }], 120, { at: [50, 88] });
        const out = m.hit('feathers');
        await wait(260);
        play(rig, [{ y: -10, r: m.dir * 24 }, { y: -48, r: m.dir * 8 }, { y: -40, r: m.dir * 6 }], 600, { easing: 'ease-out' });
        play(m.q('feet'), [{ sy: 1.2 }, { sy: 0.3 }], 160, { at: [50, 88] });
        await m.travel(1, 600);
        await out;
      }
      // Land: brake with the wings, feet down, squash, fold up.
      play(m.q('feet'), [{ sy: 0.3 }, { sy: 1 }], 160, { at: [50, 88] });
      await done(play(rig, [{ y: -40, r: m.dir * 6 }, { y: 2, r: 0, sx: 1.12, sy: 0.88, offset: 0.75 }, {}], 320, { easing: 'ease-in' }));
      show(spreadL, false); show(spreadR, false); show(m.q('wing-l'), true); show(m.q('wing-r'), true);
      play(m.q('head'), [{ r: m.dir * 10 }, { r: 0 }], 200, { at: [50, 46] });
    },
    fidgets: [
      (q) => play(q('head'), [{}, { r: 16, offset: 0.3 }, { r: 16, offset: 0.7 }, {}], 1000, { at: [50, 46], fill: 'none' }),
      (q) => play(q('head'), [{}, { r: -14, offset: 0.25 }, { r: 10, offset: 0.6 }, {}], 1000, { at: [50, 46], fill: 'none' }),
      (q) => play(q('tail'), [{}, { r: -10 }, { r: 8 }, {}], 500, { at: [50, 80], fill: 'none' }),
    ],
  },

  crocodile: {
    draw: crocodile,
    async move(m) {
      const turn = m.q('turn');
      if (m.dir < 0) await done(play(turn, [{}, { sx: -1 }], 180));
      const crawl = () => m.keep(
        loop(m.q('gait'), [{ y: 2, r: -2 }, { y: 3, r: 2 }], 180, { at: [50, 88], direction: 'alternate' }),
        loop(m.q('leg-b'), [{ r: -28 }, { r: 28 }], 180, { at: [31, 84], direction: 'alternate' }),
        loop(m.q('leg-f'), [{ r: 28 }, { r: -28 }], 180, { at: [51, 84], direction: 'alternate' }),
        loop(m.q('tail'), [{ r: -12 }, { r: 12 }], 360, { at: [32, 68], direction: 'alternate', easing: 'ease-in-out' }),
        loop(m.q('head'), [{ r: -3 }, { r: 3 }], 360, { at: [56, 66], direction: 'alternate', easing: 'ease-in-out' }),
      );
      crawl();
      if (!m.victim) {
        await m.travel(1, 950);
      } else {
        // Creep up, open wide, lunge and snap.
        await m.travel(0.28, 450);
        m.stop();
        const grow = play(m.q('rig'), [{}, { sx: 1.18, sy: 1.18 }], 260, { easing: 'ease-out' });
        const rear = play(m.q('head'), [{}, { r: -12 }], 260, { at: [56, 66], easing: 'ease-out' });
        const low = play(m.q('jaw-low'), [{}, { r: 40 }], 260, { at: [58, 66], easing: 'ease-out' });
        const up = play(m.q('jaw-up'), [{}, { r: -18 }], 260, { at: [58, 62], easing: 'ease-out' });
        await wait(420);
        // Lunge right onto the piece: the body stops short so the jaws land on it.
        const reach = -m.dir * 28;
        play(m.q('rig'), [{ sx: 1.18, sy: 1.18 }, { x: reach, sx: 1.18, sy: 1.18 }], 140, { easing: 'ease-in' });
        await m.travel(0.5, 140, 'ease-in');
        grow.cancel(); rear.cancel(); low.cancel(); up.cancel();
        const back = play(m.q('rig'), [{ x: reach, sx: 1.18, sy: 1.18 }, { x: reach }], 260);
        play(m.q('head'), [{ r: -12 }, {}], 90, { at: [56, 66], fill: 'none', easing: 'ease-in' });
        play(m.q('jaw-low'), [{ r: 40 }, {}], 90, { at: [58, 66], fill: 'none', easing: 'ease-in' });
        play(m.q('jaw-up'), [{ r: -18 }, {}], 90, { at: [58, 62], fill: 'none', easing: 'ease-in' });
        await wait(90);
        m.shake(2);
        const out = m.hit('bite');
        await done(play(m.q('jaw-low'), [{}, { r: 12 }, {}, { r: 10 }, {}], 420, { at: [58, 66], fill: 'none' }));
        back.cancel();
        play(m.q('rig'), [{ x: reach }, {}], 600);
        crawl();
        await m.travel(1, 600);
        await out;
      }
      m.stop();
      if (m.dir < 0) await done(play(turn, [{ sx: -1 }, {}], 180));
    },
    fidgets: [
      (q) => play(q('tail'), [{}, { r: -18 }, { r: 10 }, {}], 700, { at: [32, 68], fill: 'none' }),
      (q) => { // a slow yawn
        play(q('jaw-low'), [{}, { r: 26, offset: 0.4 }, { r: 26, offset: 0.7 }, {}], 1500, { at: [58, 66], fill: 'none' });
        return play(q('jaw-up'), [{}, { r: -10, offset: 0.4 }, { r: -10, offset: 0.7 }, {}], 1500, { at: [58, 62], fill: 'none' });
      },
    ],
  },

  waakye: {
    draw: waakye,
    async move(m) {
      const rig = m.q('rig');
      // Stand up on her feet.
      show(m.q('legs'), true);
      await done(play(rig, [{}, { y: -16 }], 200, { easing: 'ease-out' }));
      const stride = 560;
      const walk = m.keep(
        loop(m.q('gait'), [{ r: -5 }, { y: -4 }, { r: 5 }, { y: -4 }, { r: -5 }], stride, { at: [50, 110] }),
        loop(m.q('leg-l'), [{}, { y: -6, r: -10 }, {}, {}, {}], stride, { at: [43, 84] }),
        loop(m.q('leg-r'), [{}, {}, {}, { y: -6, r: 10 }, {}], stride, { at: [57, 84] }),
        loop(m.q('load'), [{ r: 2 }, { r: -1, y: -1 }, { r: -2 }, { r: 1, y: -1 }, { r: 2 }], stride, { at: [50, 90] }),
        loop(m.q('knot'), [{ r: -8 }, { r: 8 }, { r: -8 }], stride / 2, { at: [51, 28] }),
        loop(m.q('steam'), [{ opacity: 0 }, { y: -5, opacity: 0.9, offset: 0.3 }, { y: -14, opacity: 0 }], 700, { at: [50, 70] }),
      );
      if (!m.victim) {
        await m.travel(1, 1000, 'linear');
      } else {
        // Walk up, lean in and fling a spoonful of shito.
        await m.travel(0.3, 420, 'linear');
        walk.forEach((a) => a.pause());
        const lean = play(m.q('gait'), [{}, { r: m.dir * 8 }], 200, { at: [50, 110] });
        const tip = play(m.q('load'), [{}, { y: -6, r: m.dir * 26 }], 220, { at: [50, 84], easing: 'ease-out' });
        await wait(240);
        const out = m.hit('splash');
        await wait(420);
        lean.cancel(); tip.cancel();
        walk.forEach((a) => a.play());
        await m.travel(1, 720, 'linear');
        await out;
      }
      m.stop();
      await done(play(rig, [{ y: -16 }, { y: 1, sx: 1.06, sy: 0.95, offset: 0.7 }, {}], 220, { easing: 'ease-in' }));
      show(m.q('legs'), false);
    },
    fidgets: [
      (q) => play(q('steam'), [{ opacity: 0 }, { y: -5, opacity: 0.9, offset: 0.3 }, { y: -14, opacity: 0 }], 900, { at: [50, 70], fill: 'none', iterations: 2 }),
      (q) => play(q('load'), [{}, { y: -3, r: -3, offset: 0.4 }, {}], 700, { fill: 'none' }),
      (q) => play(q('knot'), [{}, { r: -10 }, { r: 8 }, {}], 600, { at: [51, 28], fill: 'none' }),
    ],
  },

  elephant: {
    draw: elephant,
    async move(m) {
      const rig = m.q('rig');
      show(m.q('legs'), true);
      await done(play(rig, [{}, { y: -8 }], 220, { easing: 'ease-out' }));
      const stride = 760;
      const walk = m.keep(
        loop(m.q('gait'), [{ r: -4 }, { y: -3 }, { r: 4 }, { y: -3 }, { r: -4 }], stride, { at: [50, 100] }),
        loop(m.q('leg-fl'), [{}, { y: -7 }, {}, {}, {}], stride, { at: [36, 60] }),
        loop(m.q('leg-br'), [{}, { y: -5 }, {}, {}, {}], stride, { at: [73, 60] }),
        loop(m.q('leg-fr'), [{}, {}, {}, { y: -7 }, {}], stride, { at: [64, 60] }),
        loop(m.q('leg-bl'), [{}, {}, {}, { y: -5 }, {}], stride, { at: [27, 60] }),
        loop(m.q('ear-l'), [{}, { sx: 0.78 }, {}], stride / 2, { at: [36, 40] }),
        loop(m.q('ear-r'), [{}, { sx: 0.78 }, {}], stride / 2, { at: [64, 40] }),
        loop(m.q('trunk'), [{ r: -10 }, { r: 10 }], stride / 2, { at: [50, 60], direction: 'alternate', easing: 'ease-in-out' }),
      );
      if (!m.victim) {
        await m.travel(1, 1300, 'linear');
      } else {
        // Plod up, rear back with the trunk high — TOOT! — and stomp.
        await m.travel(0.32, 520, 'linear');
        walk.forEach((a) => a.pause());
        const rear = play(m.q('rig'), [{ y: -8 }, { y: -24, r: -m.dir * 9 }], 320, { easing: 'ease-out' });
        const trunk = play(m.q('trunk'), [{}, { r: -m.dir * 115 }], 320, { at: [50, 60], easing: 'ease-out' });
        await wait(330);
        m.shout('TOOT!', '#5a5a5a');
        await wait(420);
        rear.cancel(); trunk.cancel();
        await done(play(rig, [{ y: -24, r: -m.dir * 9 }, { y: 2, sx: 1.08, sy: 0.92 }], 130, { easing: 'ease-in' }));
        const out = m.hit('stomp');
        play(m.q('trunk'), [{ r: -m.dir * 115 }, {}], 260, { at: [50, 60], fill: 'none' });
        await done(play(rig, [{ y: 2, sx: 1.08, sy: 0.92 }, { y: -8 }], 260, { easing: 'ease-out' }));
        walk.forEach((a) => a.play());
        await m.travel(1, 880, 'linear');
        await out;
      }
      m.stop();
      await done(play(rig, [{ y: -8 }, { y: -14, offset: 0.4 }, { y: 2, sx: 1.06, sy: 0.94, offset: 0.8 }, {}], 360, { easing: 'ease-in' }));
      m.shake(2);
      show(m.q('legs'), false);
    },
    fidgets: [
      (q) => { play(q('ear-l'), [{}, { sx: 0.75 }, {}, { sx: 0.75 }, {}], 900, { at: [36, 40], fill: 'none' }); return play(q('ear-r'), [{}, { sx: 0.75 }, {}, { sx: 0.75 }, {}], 900, { at: [64, 40], fill: 'none' }); },
      (q) => play(q('trunk'), [{}, { r: 14 }, { r: -10 }, {}], 1200, { at: [50, 60], fill: 'none' }),
    ],
  },
  tortoise: {
    draw: tortoise,
    async move(m) {
      const stride = 640;
      const plod = () => m.keep(
        loop(m.q('gait'), [{ r: -3 }, { y: -2 }, { r: 3 }, { y: -2 }, { r: -3 }], stride, { at: [50, 88] }),
        loop(m.q('foot-l'), [{}, { y: -6 }, {}, {}, {}], stride, { at: [27, 82] }),
        loop(m.q('foot-r'), [{}, {}, {}, { y: -6 }, {}], stride, { at: [73, 82] }),
        loop(m.q('head'), [{}, { y: -3, sx: 1.05, sy: 1.05 }, {}], stride / 2, { at: [50, 80] }),
      );
      plod();
      if (!m.victim) {
        await m.travel(1, 1250, 'linear');
      } else {
        // Tuck in, spin like a top across the board and knock the piece flying.
        await m.travel(0.22, 420, 'linear');
        m.stop();
        const hide = [
          play(m.q('head'), [{}, { y: 10, sx: 0.4, sy: 0.4 }], 180, { at: [50, 70] }),
          play(m.q('foot-l'), [{}, { sx: 0.2, sy: 0.2 }], 180, { at: [30, 78] }),
          play(m.q('foot-r'), [{}, { sx: 0.2, sy: 0.2 }], 180, { at: [70, 78] }),
        ];
        await wait(200);
        play(m.q('rig'), [{}, { r: 720 }], 380, { at: [50, 58], easing: 'ease-in' });
        await m.travel(0.5, 380, 'ease-in');
        const out = m.hit('spinout');
        m.shake(2);
        play(m.q('rig'), [{ r: 720 }, { r: 1260 }], 560, { at: [50, 58], easing: 'ease-out' });
        await m.travel(1, 560, 'ease-out');
        hide.forEach((a) => a.cancel());
        play(m.q('head'), [{ y: 10, sx: 0.4, sy: 0.4 }, { y: -4, sx: 1.1, sy: 1.1, offset: 0.7 }, {}], 260, { at: [50, 70], fill: 'none' });
        await out;
      }
      m.stop();
    },
    fidgets: [
      (q) => play(q('head'), [{}, { y: 9, sx: 0.6, sy: 0.6, offset: 0.25 }, { y: 9, sx: 0.6, sy: 0.6, offset: 0.65 }, {}], 1500, { at: [50, 70], fill: 'none' }),
      (q) => play(q('foot-l'), [{}, { y: -4 }, {}, { y: -4 }, {}], 700, { at: [27, 82], fill: 'none' }),
    ],
  },

  antelope: {
    draw: antelope,
    async move(m) {
      const rig = m.q('rig');
      const leap = (f, ms, height) => {
        play(m.q('legs'), [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { sy: 0.75, opacity: 1, offset: 0.5 }, { opacity: 1, offset: 0.72 }, { opacity: 0, offset: 0.85 }, { opacity: 0 }], ms, { at: [50, 80] });
        play(m.q('ear-l'), [{}, { r: 28, offset: 0.4 }, { r: -10, offset: 0.85 }, {}], ms, { at: [35, 42] });
        play(m.q('ear-r'), [{}, { r: -28, offset: 0.4 }, { r: 10, offset: 0.85 }, {}], ms, { at: [65, 42] });
        play(rig, [{ y: 4, sx: 1.1, sy: 0.86 }, { y: -height, r: -m.dir * 6, sx: 0.94, sy: 1.08, offset: 0.5 }, { y: 2, sx: 1.12, sy: 0.88, offset: 0.9 }, {}], ms, { easing: 'ease-in-out' });
        return m.travel(f, ms);
      };
      await done(play(rig, [{}, { y: 4, sx: 1.1, sy: 0.86 }], 140));
      if (!m.victim) {
        await leap(1, 720, 52);
      } else {
        // A little hop up, horns down, and toss the piece away — WHEE!
        await leap(0.28, 440, 22);
        const charge = play(rig, [{}, { r: m.dir * 24, y: 2 }], 160, { easing: 'ease-in' });
        await m.travel(0.42, 160, 'ease-in');
        const out = m.hit('toss');
        charge.cancel();
        play(rig, [{ r: m.dir * 24, y: 2 }, { r: -m.dir * 10, y: -6 }, {}], 320, { fill: 'none' });
        await wait(340);
        await done(play(rig, [{}, { y: 4, sx: 1.1, sy: 0.86 }], 120));
        await leap(1, 600, 40);
        await out;
      }
    },
    fidgets: [
      (q) => play(q('ear-l'), [{}, { r: 22 }, {}, { r: 14 }, {}], 500, { at: [35, 42], fill: 'none' }),
      (q) => play(q('ear-r'), [{}, { r: -22 }, {}, { r: -14 }, {}], 500, { at: [65, 42], fill: 'none' }),
      (q) => play(q('gait'), [{}, { r: -5 }, { r: 5 }, {}], 700, { at: [50, 92], fill: 'none' }),
    ],
  },

  spider: {
    draw: spider,
    async move(m) {
      const legs = (on) => m.keep(...[0, 1, 2, 3].flatMap((i) => [
        loop(m.q(`leg-l${i}`), [{ r: -12 }, { r: 12 }], 150, { at: SPIDER_LEGS[i][0].split(' ').map(Number), direction: 'alternate', delay: -i * 40 }),
        loop(m.q(`leg-r${i}`), [{ r: 12 }, { r: -12 }], 150, { at: SPIDER_LEGS[i + 4][0].split(' ').map(Number), direction: 'alternate', delay: -i * 40 - 75 }),
      ]), loop(m.q('gait'), [{}, { y: -3 }], 150, { at: [50, 90], direction: 'alternate' }));
      legs();
      if (!m.victim) {
        await m.travel(1, 820, 'linear');
      } else {
        // Rear up, shoot a web line at the piece (THWIP!), wrap it, then yank and sling it off the board.
        m.stop();
        const rear = [
          play(m.q('rig'), [{}, { y: -10, r: -m.dir * 10 }], 220),
          play(m.q('leg-l0'), [{}, { r: 40 }], 220, { at: [38, 58] }),
          play(m.q('leg-r0'), [{}, { r: -40 }], 220, { at: [62, 58] }),
          play(m.q('leg-l1'), [{}, { r: 20 }], 220, { at: [37, 62] }),
          play(m.q('leg-r1'), [{}, { r: -20 }], 220, { at: [63, 62] }),
        ];
        await wait(240);
        const line = webLine(m.fx, m.el, m.victim.el);
        m.shout('THWIP!', '#4f74d0');
        await wait(200);
        cocoon(m.victim.el);
        await wait(420);
        // The yank: lean back hard, the line goes taut, and the piece flies.
        rear.forEach((a) => a.cancel());
        const tug = play(m.q('rig'), [{ y: -10, r: -m.dir * 10 }, { y: -4, r: -m.dir * 22 }, { y: -6, r: -m.dir * 12 }], 300, { easing: 'ease-out' });
        const out = sling(m.victim, m.el, m.fx);
        line.snap();
        await wait(380);
        tug.cancel();
        legs();
        await m.travel(1, 820, 'linear');
        await out;
      }
      m.stop();
    },
    fidgets: [
      (q) => play(q('leg-l0'), [{}, { r: 34 }, { r: 18 }, { r: 34 }, {}], 900, { at: [38, 58], fill: 'none' }),
      (q) => play(q('leg-r0'), [{}, { r: -34 }, { r: -18 }, { r: -34 }, {}], 900, { at: [62, 58], fill: 'none' }),
      (q) => play(q('gait'), [{}, { y: -5, sy: 1.04 }, {}, { y: -3 }, {}], 600, { at: [50, 92], fill: 'none' }),
    ],
  },

  bushcat: {
    draw: bushcat,
    async move(m) {
      const rig = m.q('rig');
      // Crouch low, ears flat, tail up, a wiggle… then pounce.
      show(m.q('tail'), true);
      m.keep(loop(m.q('tail'), [{ r: -14 }, { r: 14 }], 260, { at: [64, 86], direction: 'alternate', easing: 'ease-in-out' }));
      const ears = [
        play(m.q('ear-l'), [{}, { r: -28 }], 160, { at: [32, 40] }),
        play(m.q('ear-r'), [{}, { r: 28 }], 160, { at: [68, 40] }),
      ];
      await done(play(rig, [{}, { y: 6, sx: 1.06, sy: 0.86 }], 180));
      await done(play(m.q('gait'), [{}, { x: -3 }, { x: 3 }, { x: -3 }, { x: 3 }, {}], 380, { at: [50, 92], fill: 'none' }));
      const pounce = (f, ms, height) => {
        play(m.q('paws'), [{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1, offset: 0.5 }, { opacity: 1 }], ms, { at: [50, 90] });
        play(rig, [{ y: 6, sx: 1.06, sy: 0.86 }, { y: -height, r: m.dir * 10, sx: 0.95, sy: 1.08, offset: 0.45 }, { y: 2, sx: 1.12, sy: 0.88, offset: 0.88 }, {}], ms);
        return m.travel(f, ms);
      };
      if (!m.victim) {
        await pounce(1, 560, 44);
      } else {
        await pounce(0.5, 460, 40);
        const out = m.hit('claws');
        await done(play(m.q('gait'), [{}, { r: m.dir * 12 }, { r: -m.dir * 8 }, {}], 360, { at: [50, 92], fill: 'none' }));
        await done(play(rig, [{}, { y: 6, sx: 1.06, sy: 0.86 }], 120));
        await pounce(1, 420, 26);
        await out;
      }
      ears.forEach((a) => a.cancel());
      m.stop();
      show(m.q('tail'), false);
      show(m.q('paws'), false);
    },
    fidgets: [
      (q) => play(q('ear-r'), [{}, { r: 14 }, {}, { r: 10 }, {}], 420, { at: [68, 40], fill: 'none' }),
      (q) => play(q('ear-l'), [{}, { r: -14 }, {}, { r: -10 }, {}], 420, { at: [32, 40], fill: 'none' }),
      (q) => play(q('gait'), [{}, { r: 9, offset: 0.3 }, { r: 9, offset: 0.7 }, {}], 1100, { at: [50, 92], fill: 'none' }),
    ],
  },

  owl: {
    draw: owl,
    async move(m) {
      const rig = m.q('rig');
      const spreadL = m.q('spread-l');
      const spreadR = m.q('spread-r');
      // Look first (owls turn their heads), then a few big wingbeats and a silent glide.
      await done(play(m.q('head'), [{}, { x: m.dir * 5 }], 200, { at: [50, 46] }));
      show(spreadL, true); show(spreadR, true);
      const beats = (ms) => {
        const f = [{ r: 34 }, { r: -18 }, { r: 34 }, { r: -18 }, { r: 8, offset: 0.55 }, { r: 8 }];
        play(spreadL, f, ms, { at: [26, 56] });
        play(spreadR, f.map((k) => ({ ...k, r: -k.r })), ms, { at: [74, 56] });
      };
      beats(1100);
      play(m.q('tufts'), [{}, { r: -m.dir * 8 }], 300, { at: [50, 30] });
      await done(play(rig, [{}, { y: 3, sx: 1.08, sy: 0.9, offset: 0.35 }, { y: -38, r: m.dir * 6 }], 260, { easing: 'ease-out' }));
      if (!m.victim) {
        play(rig, [{ y: -38, r: m.dir * 6 }, { y: -46, r: m.dir * 8 }, { y: -36, r: m.dir * 5 }], 720);
        await m.travel(1, 720);
      } else {
        // Glide over, then swoop down with talons out.
        play(rig, [{ y: -38, r: m.dir * 6 }, { y: -48, r: m.dir * 8 }], 420);
        await m.travel(0.45, 420);
        show(m.q('talons'), true, 100);
        await done(play(rig, [{ y: -48, r: m.dir * 8 }, { y: -6, r: m.dir * 16 }], 200, { easing: 'ease-in' }));
        await m.travel(0.5, 60);
        const out = m.hit('feathers');
        beats(700);
        await wait(240);
        show(m.q('talons'), false, 160);
        play(rig, [{ y: -6, r: m.dir * 16 }, { y: -40, r: m.dir * 6 }, { y: -36, r: m.dir * 5 }], 560, { easing: 'ease-out' });
        await m.travel(1, 560);
        await out;
      }
      await done(play(rig, [{ y: -36, r: m.dir * 5 }, { y: 2, sx: 1.1, sy: 0.9, offset: 0.75 }, {}], 320, { easing: 'ease-in' }));
      show(spreadL, false); show(spreadR, false);
      play(m.q('head'), [{ x: m.dir * 5 }, {}], 240, { at: [50, 46] });
    },
    fidgets: [
      (q) => play(q('head'), [{}, { x: -5, offset: 0.2 }, { x: -5, offset: 0.4 }, { x: 5, offset: 0.6 }, { x: 5, offset: 0.8 }, {}], 1800, { at: [50, 46], fill: 'none' }),
      (q) => play(q('tufts'), [{}, { y: -3 }, {}, { y: -2 }, {}], 500, { at: [50, 30], fill: 'none' }),
    ],
  },

  hedgehog: {
    draw: hedgehog,
    async move(m) {
      const turn = m.q('turn');
      if (m.dir < 0) await done(play(turn, [{}, { sx: -1 }], 180));
      const scurry = () => m.keep(
        loop(m.q('foot-b'), [{ r: -28 }, { r: 28 }], 120, { at: [34, 88], direction: 'alternate' }),
        loop(m.q('foot-f'), [{ r: 28 }, { r: -28 }], 120, { at: [62, 88], direction: 'alternate' }),
        loop(m.q('gait'), [{}, { y: -2 }], 120, { at: [50, 92], direction: 'alternate' }),
        loop(m.q('nose'), [{}, { sx: 1.2, sy: 1.2 }], 240, { at: [80, 74], direction: 'alternate' }),
      );
      scurry();
      if (!m.victim) {
        await m.travel(1, 900, 'linear');
      } else {
        // Curl into a spiky ball, roll straight through the piece, uncurl.
        await m.travel(0.2, 260, 'linear');
        m.stop();
        const ball = m.q('ball');
        show(m.q('body'), false, 120); show(m.q('foot-b'), false, 120); show(m.q('foot-f'), false, 120); show(ball, true, 120);
        await done(play(ball, [{ sx: 0.6, sy: 0.6 }, { sx: 1.1, sy: 1.1, offset: 0.7 }, {}], 200, { at: [52, 66] }));
        play(ball, [{}, { r: 300 }], 320, { at: [52, 66], easing: 'ease-in' });
        await m.travel(0.5, 320, 'ease-in');
        const out = m.hit('spinout');
        m.shake(2);
        play(ball, [{ r: 300 }, { r: 720 }], 460, { at: [52, 66], easing: 'ease-out' });
        await m.travel(1, 460, 'ease-out');
        show(ball, false, 120); show(m.q('body'), true, 120); show(m.q('foot-b'), true, 120); show(m.q('foot-f'), true, 120);
        await wait(140);
        play(m.q('spikes'), [{}, { sx: 1.06, sy: 1.08 }, {}], 260, { at: [50, 80], fill: 'none' });
        await out;
      }
      m.stop();
      if (m.dir < 0) await done(play(turn, [{ sx: -1 }, {}], 180));
    },
    fidgets: [
      (q) => play(q('nose'), [{}, { sx: 1.25, sy: 1.25 }, {}, { sx: 1.25, sy: 1.25 }, {}], 520, { at: [80, 74], fill: 'none' }),
      (q) => play(q('spikes'), [{}, { sx: 1.05, sy: 1.08 }, {}], 420, { at: [50, 80], fill: 'none' }),
    ],
  },
};

export const RIGGED = Object.keys(RIGS);
export const hasRig = (key) => key in RIGS;

/** The character's drawing wrapped in its moving parts (rig > gait > turn > parts); the crown rides along. */
export const rigMarkup = (key) => `<g class="p-rig"><g class="p-gait"><g class="p-turn">${RIGS[key].draw()}<!--crown--></g></g></g>`;

/**
 * Act out a move. `el` is the piece (positioned on its square with --r/--c), `from`/`to` are
 * [row, col], and `victim` ({ el, r, c }) is the piece being captured, if any.
 */
export async function act(key, el, from, to, victim, { fx, board } = {}) {
  const m = context(el, from, to, victim, { key, fx, board });
  el.classList.add('acting');
  try {
    await RIGS[key].move(m);
  } finally {
    m.stop();
    el.style.setProperty('--r', to[0]);
    el.style.setProperty('--c', to[1]);
    // Drop this move's leftovers, but leave the CSS idle animations (bobbing, blinking) alone.
    el.getAnimations({ subtree: true }).forEach((a) => { if (!(a instanceof CSSAnimation)) a.cancel(); });
    el.classList.remove('acting');
  }
}

/** A small idle gesture (head tilt, yawn, ear flap…) for a piece waiting on the board. */
export function fidget(key, el) {
  if (el.classList.contains('acting')) return;
  const list = RIGS[key]?.fidgets;
  if (!list) return;
  list[Math.floor(Math.random() * list.length)]((name) => el.querySelector(`.p-${name}`));
}
