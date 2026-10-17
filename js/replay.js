// Replay clip: redraws the last moves of a game on a canvas (with the real board art and
// characters) and records it with MediaRecorder, so it can be shared as a short video.
// Loaded only when a player asks for a clip.
import { characterSVG, DEFS_SVG } from './characters.js';

const W = 480;
const H = 640;
const BS = 440; // board size on the canvas
const BX = (W - BS) / 2;
const BY = 118;
const CELL = BS / 8;
const SEG_MS = 380;
const PAUSE_MS = 260;
const HOLD_MS = 1300;

const DEFS = DEFS_SVG.match(/<defs>([\s\S]*)<\/defs>/)[1];
const FACE_CSS = '.eyes-x,.eyes-happy,.m-oh,.m-grin,.crown,.king-ring{display:none}.king .crown,.king .king-ring{display:inline}'
  + '.shocked .eyes,.shocked .m-smile{display:none}.shocked .eyes-x,.shocked .m-oh{display:inline}';

function svgImage(text) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('could not draw a picture')); };
    img.src = url;
  });
}

// The on-screen board takes its colours from CSS variables; bake them into a standalone SVG.
function boardImage(svgEl) {
  const cs = getComputedStyle(document.body);
  const v = (n) => cs.getPropertyValue(n).trim();
  const kente = getComputedStyle(svgEl.querySelector('.kente-frame')).display !== 'none';
  const css = `.paper{fill:${v('--b-paper')};opacity:${v('--b-paper-o')}}.sq-bg{fill:${v('--b-sq')};opacity:${v('--b-sq-o')}}`
    + `.h-a{stroke:${v('--b-ha')}}.h-b{stroke:${v('--b-hb')}}.grid{stroke:${v('--b-grid')}}.kente-frame{display:${kente ? 'inline' : 'none'}}`;
  const size = Math.round((BS * 824) / 800);
  let text = new XMLSerializer().serializeToString(svgEl);
  text = text.replace(/^<svg([^>]*)>/, (m, attrs) => `<svg${attrs.includes('xmlns=') ? attrs : `${attrs} xmlns="http://www.w3.org/2000/svg"`} width="${size}" height="${size}"><defs>${DEFS}</defs><style>${css}</style>`);
  return svgImage(text);
}

const charCache = new Map();
function charImage(key, king, shocked) {
  const id = `${key}|${king}|${shocked}`;
  if (!charCache.has(id)) {
    const inner = characterSVG(key).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    const cls = `${king ? 'king ' : ''}${shocked ? 'shocked' : ''}`;
    // Inline markup may repeat an attribute (fine in HTML, fatal in a standalone SVG file),
    // so let the HTML parser tidy it before serialising.
    const box = document.createElement('div');
    box.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -14 100 114" width="200" height="228"><defs>${DEFS}</defs><style>${FACE_CSS}</style><g class="${cls}">${inner}</g></svg>`;
    charCache.set(id, svgImage(new XMLSerializer().serializeToString(box.firstElementChild)));
  }
  return charCache.get(id);
}

const piecesOf = (snap) => {
  const info = new Map(snap.pieces);
  const out = [];
  snap.ids.forEach((id, s) => { if (id && info.get(id)) out.push({ id, s, ...info.get(id) }); });
  return out;
};

function pickMime() {
  const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return types.find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
}

export async function recordClip({ canvas, boardSvg, timeline, finalSnap, flip, title }) {
  if (!timeline.length) throw new Error('no moves to show');
  const mime = pickMime();
  if (!mime) throw new Error('no supported video format');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const view = (s) => (flip ? 63 - s : s);
  const cellXY = (s) => [BX + (view(s) & 7) * CELL, BY + (view(s) >> 3) * CELL];
  const cs = getComputedStyle(document.body);
  const paper = cs.getPropertyValue('--paper').trim() || '#fdfbf3';
  const rule = cs.getPropertyValue('--rule').trim() || '#c4dbf2';
  const ink = cs.getPropertyValue('--pen').trim() || '#1f2d6b';
  const red = cs.getPropertyValue('--red').trim() || '#d62828';
  await document.fonts?.ready;
  const board = await boardImage(boardSvg);

  // Load every character face we might need before recording starts.
  const loads = [];
  for (const { snap } of timeline) for (const p of piecesOf(snap)) for (const k of [false, true]) for (const sh of [false, true]) loads.push(charImage(p.char, k, sh));
  for (const p of piecesOf(finalSnap)) loads.push(charImage(p.char, p.king, false));
  await Promise.all(loads);
  const img = new Map();
  for (const [id, pr] of charCache) img.set(id, await pr);

  // Timeline of scenes: each move's segments, then a pause.
  let t = 600;
  const scenes = timeline.map(({ snap, move }) => {
    const start = t;
    t += (move.path.length - 1) * SEG_MS + PAUSE_MS;
    return { snap, move, start, end: t };
  });
  const total = t + HOLD_MS;

  const drawPiece = (p, x, y, { shocked = false, scale = 1, rot = 0, alpha = 1 } = {}) => {
    const im = img.get(`${p.char}|${p.king}|${shocked}`);
    if (!im) return;
    const w = CELL * 1.2;
    const h = CELL * 1.368;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x + CELL / 2, y + CELL * 0.88);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.drawImage(im, -w / 2, -CELL * 1.248, w, h);
    ctx.restore();
  };

  const frame = (now) => {
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = rule;
    ctx.lineWidth = 1;
    for (let y = 31; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.font = '700 52px Caveat, "Comic Sans MS", cursive';
    ctx.fillText('Dame', W / 2, 58);
    ctx.font = '26px Caveat, "Comic Sans MS", cursive';
    ctx.fillText(title, W / 2, 92);
    const bs = (BS * 824) / 800;
    ctx.drawImage(board, BX - (BS * 12) / 800, BY - (BS * 12) / 800, bs, bs);

    const sceneIdx = scenes.findIndex((sc) => now < sc.end);
    const scene = scenes[sceneIdx === -1 ? scenes.length - 1 : sceneIdx];
    const finished = sceneIdx === -1;
    if (finished) {
      for (const p of piecesOf(finalSnap).sort((a, b) => view(a.s) - view(b.s))) drawPiece(p, ...cellXY(p.s));
    } else {
      const { snap, move } = scene;
      const lt = Math.max(0, now - scene.start);
      const segs = move.path.length - 1;
      const seg = Math.min(segs - 1, Math.floor(lt / SEG_MS));
      const f = lt >= segs * SEG_MS ? 1 : (lt - seg * SEG_MS) / SEG_MS;
      const movingDone = lt >= segs * SEG_MS;
      // the red-pen route of this move
      ctx.save();
      ctx.strokeStyle = red;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.setLineDash([0.1, 10]);
      ctx.beginPath();
      move.path.forEach((s, i) => { const [x, y] = cellXY(s); ctx[i ? 'lineTo' : 'moveTo'](x + CELL / 2, y + CELL / 2); });
      ctx.stroke();
      ctx.restore();
      const list = piecesOf(snap).sort((a, b) => view(a.s) - view(b.s));
      let mover = null;
      for (const p of list) {
        if (p.s === move.from) { mover = p; continue; }
        const ci = move.captures.indexOf(p.s);
        if (ci !== -1) {
          const hitAt = (ci + 1) * SEG_MS;
          const k = (lt - hitAt) / 420;
          if (k >= 1) continue;
          if (k > 0) {
            drawPiece(p, ...cellXY(p.s), { shocked: true, scale: 1 - k, rot: k * 2.6, alpha: 1 - k * 0.6 });
            const [x, y] = cellXY(p.s);
            ctx.save();
            ctx.strokeStyle = '#f6c431';
            ctx.lineWidth = 3;
            for (let r = 0; r < 8; r++) {
              const a = (r / 8) * Math.PI * 2;
              ctx.beginPath();
              ctx.moveTo(x + CELL / 2 + Math.cos(a) * CELL * (0.3 + k * 0.3), y + CELL / 2 + Math.sin(a) * CELL * (0.3 + k * 0.3));
              ctx.lineTo(x + CELL / 2 + Math.cos(a) * CELL * (0.5 + k * 0.4), y + CELL / 2 + Math.sin(a) * CELL * (0.5 + k * 0.4));
              ctx.stroke();
            }
            ctx.restore();
            continue;
          }
        }
        drawPiece(p, ...cellXY(p.s));
      }
      if (mover) {
        const [ax, ay] = cellXY(move.path[seg]);
        const [bx, by] = cellXY(move.path[seg + 1]);
        const e = f < 0.5 ? 2 * f * f : 1 - ((-2 * f + 2) ** 2) / 2;
        const lift = movingDone ? 0 : Math.sin(Math.PI * f) * CELL * 0.45;
        const king = mover.king || (movingDone && move.promote);
        drawPiece({ ...mover, king }, ax + (bx - ax) * e, ay + (by - ay) * e - lift);
      }
    }
    ctx.fillStyle = ink;
    ctx.font = '22px Caveat, "Comic Sans MS", cursive';
    const shown = finished ? scenes.length : Math.max(1, sceneIdx + 1);
    ctx.fillText(`last ${scenes.length} move${scenes.length > 1 ? 's' : ''} · ${shown}/${scenes.length}`, W / 2, BY + BS + 40);
    ctx.font = '20px Caveat, "Comic Sans MS", cursive';
    ctx.fillText(location.host + location.pathname.replace(/\/$/, ''), W / 2, H - 18);
  };

  frame(0);
  const stream = canvas.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1500000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise((resolve) => { rec.onstop = resolve; });
  rec.start(250);
  const t0 = performance.now();
  await new Promise((resolve) => {
    const loop = () => {
      const now = performance.now() - t0;
      frame(now);
      if (now < total) requestAnimationFrame(loop);
      else resolve();
    };
    requestAnimationFrame(loop);
  });
  rec.stop();
  await stopped;
  stream.getTracks().forEach((tr) => tr.stop());
  return { blob: new Blob(chunks, { type: mime.split(';')[0] }), ext: mime.includes('mp4') ? 'mp4' : 'webm' };
}
