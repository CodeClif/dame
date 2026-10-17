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
    el, dir, victim,
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
        await m.travel(0.42, 120, 'ease-in');
        grow.cancel(); rear.cancel(); low.cancel(); up.cancel();
        play(m.q('rig'), [{ sx: 1.18, sy: 1.18 }, {}], 260, { fill: 'none' });
        play(m.q('head'), [{ r: -12 }, {}], 90, { at: [56, 66], fill: 'none', easing: 'ease-in' });
        play(m.q('jaw-low'), [{ r: 40 }, {}], 90, { at: [58, 66], fill: 'none', easing: 'ease-in' });
        play(m.q('jaw-up'), [{ r: -18 }, {}], 90, { at: [58, 62], fill: 'none', easing: 'ease-in' });
        await wait(90);
        m.shake(2);
        const out = m.hit('bite');
        await done(play(m.q('jaw-low'), [{}, { r: 12 }, {}, { r: 10 }, {}], 420, { at: [58, 66], fill: 'none' }));
        crawl();
        await m.travel(1, 650);
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
};

export const RIGGED = Object.keys(RIGS);
export const hasRig = (key) => key in RIGS;

/** The character's drawing wrapped in its moving parts (rig > gait > turn > parts). */
export const rigMarkup = (key) => `<g class="p-rig"><g class="p-gait"><g class="p-turn">${RIGS[key].draw()}</g></g></g>`;

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
