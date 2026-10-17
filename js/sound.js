// Tiny synthesized sound effects (Web Audio) — no audio files to download.

let ctx = null;
let enabled = true;

export function setSoundEnabled(on) { enabled = on; }

function audio() {
  if (!enabled) return null;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, dur, { type = 'triangle', vol = 0.18, to = null, at = 0 } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, { vol = 0.12, freq = 2500, q = 1.2, at = 0 } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(filter).connect(g).connect(a.destination);
  src.start(t);
}

export const sfx = {
  tap: () => noise(0.06, { vol: 0.25, freq: 3800, q: 0.8 }),           // pencil tick
  select: () => { noise(0.18, { vol: 0.18, freq: 2600, q: 0.6 }); tone(660, 0.08, { vol: 0.06 }); },
  hop: () => tone(420, 0.14, { to: 760, vol: 0.14 }),
  land: () => tone(190, 0.09, { type: 'sine', to: 120, vol: 0.22 }),
  capture: () => {
    noise(0.16, { vol: 0.25, freq: 1400 });
    tone(880, 0.12, { vol: 0.1, at: 0.04 });
    tone(1320, 0.18, { vol: 0.08, at: 0.1 });
  },
  king: () => [523, 659, 784, 1047].forEach((n, i) => tone(n, 0.22, { vol: 0.12, at: i * 0.09 })),
  error: () => tone(160, 0.18, { type: 'square', vol: 0.06, to: 110 }),
  win: () => [523, 587, 659, 784, 659, 784, 1047].forEach((n, i) => tone(n, 0.24, { vol: 0.12, at: i * 0.12 })),
  lose: () => [440, 392, 349, 294].forEach((n, i) => tone(n, 0.3, { vol: 0.1, at: i * 0.16 })),
  scribble: () => { for (let i = 0; i < 4; i++) noise(0.05, { vol: 0.15, freq: 3000 + i * 300, at: i * 0.07 }); },
};
