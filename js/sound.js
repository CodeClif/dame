// Tiny synthesized sound effects (Web Audio) — no audio files to download.
// Everything is a soft wooden "xylophone" note (a little like a gyil) on a pentatonic
// scale, through one quiet master channel with the harsh highs rolled off.

let ctx = null;
let out = null;
let enabled = true;

export function setSoundEnabled(on) { enabled = on; }

function audio() {
  if (!enabled) return null;
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const soften = ctx.createBiquadFilter();
      soften.type = 'lowpass';
      soften.frequency.value = 2600;
      out = ctx.createGain();
      out.gain.value = 0.55;
      out.connect(soften).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// A struck wooden bar: a round fundamental plus a quick, quiet overtone that dies first.
function wood(freq, { vol = 0.12, dur = 0.35, at = 0 } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  for (const [mult, amp, len] of [[1, 1, dur], [3.9, 0.18, dur * 0.25]]) {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * mult, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * amp, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + len + 0.03);
  }
}

// A very soft shaker, used only to dress up captures.
function shaker({ vol = 0.025, dur = 0.12, at = 0 } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const band = a.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1800;
  band.Q.value = 0.7;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(band).connect(g).connect(out);
  src.start(t);
}

// C major pentatonic, C4 upwards.
const N = { C4: 262, D4: 294, E4: 330, G4: 392, A4: 440, C5: 523, D5: 587, E5: 659, G5: 784, A5: 880, C6: 1047 };
const tune = (notes, gap, opts) => notes.forEach((n, i) => wood(N[n], { ...opts, at: i * gap }));

export const sfx = {
  tap: () => wood(N.G5, { vol: 0.04, dur: 0.12 }),
  select: () => wood(N.E5, { vol: 0.08, dur: 0.25 }),
  hop: () => wood(N.C5, { vol: 0.06, dur: 0.2 }),
  land: () => wood(N.G4, { vol: 0.07, dur: 0.22 }),
  capture: () => { tune(['E5', 'G5'], 0.07, { vol: 0.09, dur: 0.3 }); shaker({ at: 0.02 }); },
  king: () => tune(['C5', 'D5', 'E5', 'G5', 'C6'], 0.09, { vol: 0.09, dur: 0.45 }),
  error: () => tune(['E4', 'C4'], 0.09, { vol: 0.07, dur: 0.3 }),
  win: () => tune(['C5', 'E5', 'G5', 'A5', 'G5', 'C6'], 0.13, { vol: 0.1, dur: 0.5 }),
  lose: () => tune(['A4', 'G4', 'E4', 'D4'], 0.16, { vol: 0.08, dur: 0.5 }),
  scribble: () => wood(N.A4, { vol: 0.05, dur: 0.18 }),
};
