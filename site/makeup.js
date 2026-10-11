// PixelForge Makeup — client-side virtual makeup try-on. Nothing leaves the device.
const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const $ = s => document.querySelector(s);
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.random() * a.length | 0];
const status = t => { $('#status').textContent = t; };

// ---------- landmark indices (MediaPipe face mesh) ----------
const LIPS_OUT = [61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185];
const LIPS_IN = [78,95,88,178,87,14,317,402,318,324,308,415,310,311,312,13,82,81,80,191];
const EYE_R = [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246];
const EYE_L = [263,249,390,373,374,380,381,382,362,398,384,385,386,387,388,466];
const LID_R = [33,246,161,160,159,158,157,173,133];
const LID_L = [263,466,388,387,386,385,384,398,362];
const BROW_R = [70,63,105,66,107,55,65,52,53,46];
const BROW_L = [300,293,334,296,336,285,295,282,283,276];
const OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];

// ---------- face landmarker ----------
let landmarker = null, lmLoading = null;
async function getLandmarker() {
  if (landmarker) return landmarker;
  if (!lmLoading) lmLoading = (async () => {
    status('Loading face model (first time ~4 MB)…');
    const v = await import(MP + '/vision_bundle.mjs');
    const fs = await v.FilesetResolver.forVisionTasks(MP + '/wasm');
    landmarker = await v.FaceLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' }, runningMode: 'IMAGE', numFaces: 1 });
    return landmarker;
  })().catch(e => { lmLoading = null; throw e; });
  return lmLoading;
}
async function detect(canvas) {
  const L = await getLandmarker();
  const s = Math.min(1, 1280 / Math.max(canvas.width, canvas.height));
  let src = canvas; if (s < 1) { src = mk(canvas.width * s, canvas.height * s); src.getContext('2d').drawImage(canvas, 0, 0, src.width, src.height); }
  const r = L.detect(src);
  const lm = r.faceLandmarks && r.faceLandmarks[0];
  return lm ? lm.map(p => [p.x * canvas.width, p.y * canvas.height]) : null;
}
async function fileToCanvas(file, max = 4096) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch { bmp = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }); }
  const w = bmp.width, h = bmp.height, s = Math.min(1, max / Math.max(w, h));
  const c = mk(w * s, h * s); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); return c;
}

// ---------- geometry helpers ----------
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const cen = pts => pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);
function poly(ctx, pts) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
function blurCanvas(c, r) { // portable blur (works on iOS Safari without ctx.filter)
  if (r < 0.8) return c;
  const s = clamp(1 / (r / 2), 0.02, 1), w = mk(c.width * s, c.height * s), x = w.getContext('2d');
  x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, w.width, w.height);
  let t = w; if (s < 0.5) { const w2 = mk(w.width, w.height); const x2 = w2.getContext('2d'); x2.drawImage(w, -1, 0); x2.globalAlpha = .5; x2.drawImage(w, 1, 0); x2.globalAlpha = .33; x2.drawImage(w, 0, -1); x2.drawImage(w, 0, 1); t = w2; }
  const o = mk(c.width, c.height), ox = o.getContext('2d'); ox.imageSmoothingQuality = 'high'; ox.drawImage(t, 0, 0, o.width, o.height); return o;
}
function warpTri(ctx, img, s, d) {
  const [a, b, c] = d, cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3;
  const e = p => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * .8, p[1] + dy / l * .8]; };
  const sx1 = s[1][0] - s[0][0], sy1 = s[1][1] - s[0][1], sx2 = s[2][0] - s[0][0], sy2 = s[2][1] - s[0][1];
  const det = sx1 * sy2 - sx2 * sy1; if (Math.abs(det) < 1e-6) return;
  const dx1 = b[0] - a[0], dy1 = b[1] - a[1], dx2 = c[0] - a[0], dy2 = c[1] - a[1];
  const m00 = (dx1 * sy2 - dx2 * sy1) / det, m01 = (dx2 * sx1 - dx1 * sx2) / det, m10 = (dy1 * sy2 - dy2 * sy1) / det, m11 = (dy2 * sx1 - dy1 * sx2) / det;
  const tx = a[0] - m00 * s[0][0] - m01 * s[0][1], ty = a[1] - m10 * s[0][0] - m11 * s[0][1];
  ctx.save(); ctx.beginPath(); poly(ctx, [e(a), e(b), e(c)]); ctx.clip();
  ctx.setTransform(m00, m10, m01, m11, tx, ty);
  const xs = s.map(p => p[0]), ys = s.map(p => p[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs)) - 2), y0 = Math.max(0, Math.floor(Math.min(...ys)) - 2);
  const x1 = Math.min(img.width, Math.ceil(Math.max(...xs)) + 2), y1 = Math.min(img.height, Math.ceil(Math.max(...ys)) + 2);
  if (x1 > x0 && y1 > y0) ctx.drawImage(img, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
}
function delaunay(pts) { // Bowyer–Watson
  const n = pts.length; let mx = Infinity, my = Infinity, Mx = -Infinity, My = -Infinity;
  for (const p of pts) { mx = Math.min(mx, p[0]); my = Math.min(my, p[1]); Mx = Math.max(Mx, p[0]); My = Math.max(My, p[1]); }
  const d = Math.max(Mx - mx, My - my) * 20, P = pts.concat([[mx - d, my - d], [mx + d * 2, my - d], [mx - d, my + d * 2]]);
  const circ = (i, j, k) => { const [ax, ay] = P[i], [bx, by] = P[j], [cx, cy] = P[k]; const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)); if (!D) return { x: 0, y: 0, r: Infinity }; const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy; const x = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / D, y = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / D; return { x, y, r: (x - ax) ** 2 + (y - ay) ** 2 }; };
  let T = [[n, n + 1, n + 2, circ(n, n + 1, n + 2)]];
  for (let i = 0; i < n; i++) {
    const [px, py] = P[i], bad = [], keep = [];
    for (const t of T) ((px - t[3].x) ** 2 + (py - t[3].y) ** 2 < t[3].r ? bad : keep).push(t);
    const edges = new Map();
    for (const t of bad) for (const [a, b] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) { const k = a < b ? a + ',' + b : b + ',' + a; edges.set(k, edges.has(k) ? null : [a, b]); }
    for (const e of edges.values()) if (e) keep.push([e[0], e[1], i, circ(e[0], e[1], i)]);
    T = keep;
  }
  return T.filter(t => t[0] < n && t[1] < n && t[2] < n).map(t => [t[0], t[1], t[2]]);
}
function meshWarp(src, sPts, dPts, W, H, tris) {
  const o = mk(W, H), x = o.getContext('2d');
  for (const t of tris) warpTri(x, src, [sPts[t[0]], sPts[t[1]], sPts[t[2]]], [dPts[t[0]], dPts[t[1]], dPts[t[2]]]);
  return o;
}

// ---------- presets ----------
const PRESETS = {
  'Natural':   { lips: '#b5655f', blush: '#e08a7d', shadow: '#a7826c', liner: '#3a2a24', brows: '#4a3428', contour: '#7a5240', highlight: '#fff1e0' },
  'Glam red':  { lips: '#b0102a', blush: '#d9746b', shadow: '#7a4a3a', liner: '#0b0b0b', brows: '#2e211b', contour: '#6e4535', highlight: '#fff0dc' },
  'K-beauty':  { lips: '#e0607e', blush: '#f49ab0', shadow: '#e9a2a0', liner: '#5a3a35', brows: '#5a4234', contour: '#8a6050', highlight: '#fff4f4' },
  'Smoky':     { lips: '#9c5e5a', blush: '#c98575', shadow: '#2e2a33', liner: '#000000', brows: '#251b17', contour: '#5e3e30', highlight: '#f4ece4' },
  'Coral':     { lips: '#f2614f', blush: '#f79a7a', shadow: '#d98b5f', liner: '#3b2b22', brows: '#4a3428', contour: '#7a5240', highlight: '#fff0d8' },
  'Nude':      { lips: '#c08a7a', blush: '#d9a090', shadow: '#b99580', liner: '#4a3a30', brows: '#4a3a30', contour: '#80604c', highlight: '#fff3e6' },
  'Bold berry':{ lips: '#6e1a3d', blush: '#c4687a', shadow: '#6b3a5e', liner: '#1a0d14', brows: '#2b1f1a', contour: '#5e3a34', highlight: '#fbe9f0' },
  'Gold':      { lips: '#b86a4f', blush: '#e09a70', shadow: '#c9962f', liner: '#2a1d10', brows: '#3a2a1c', contour: '#7a5236', highlight: '#ffe2a8' },
};
const PARTS = [ // key, label, default on, opacity, softness, blend
  ['contour', 'Contour', false, .22, .7, 'multiply'],
  ['blush', 'Blush', true, .35, .6, 'multiply'],
  ['highlight', 'Highlight', false, .25, .7, 'screen'],
  ['shadow', 'Eyeshadow', true, .45, .6, 'multiply'],
  ['liner', 'Eyeliner', true, .8, .25, 'source-over'],
  ['brows', 'Brow tint', true, .3, .4, 'multiply'],
  ['lips', 'Lipstick', true, .6, .25, 'multiply'],
];
const BLENDS = [['multiply', 'Multiply'], ['soft-light', 'Soft light'], ['overlay', 'Overlay'], ['color', 'Color'], ['source-over', 'Normal'], ['screen', 'Screen']];
const SENSIBLE = { lips: ['multiply', 'color', 'soft-light', 'multiply'], blush: ['multiply', 'soft-light', 'color'], shadow: ['multiply', 'soft-light', 'color', 'overlay'], liner: ['source-over', 'multiply'], brows: ['multiply', 'color'], contour: ['multiply', 'soft-light'], highlight: ['screen', 'soft-light', 'overlay'] };
const defJit = () => ({ blushT: .3, blushS: 1, blushDy: 0, shadowH: .55, linerW: 1, wing: 1 });

let state = freshState('Natural');
function freshState(name) {
  const p = PRESETS[name], parts = {};
  for (const [k, , on, op, soft, blend] of PARTS) parts[k] = { on, color: p[k], op, soft, blend };
  return { preset: name, parts, jit: defJit(), ovs: {} };
}

// ---------- face ----------
let face = null; // {img, lm, W, H, masks}
async function setFace(file) {
  try {
    status('Reading photo…');
    const img = await fileToCanvas(file);
    const lm = await (status('Finding face…'), detect(img));
    if (!lm) { status('No face found — try a clear, front-facing photo.'); alert('No face found in that photo. Try a clear, well-lit, front-facing photo.'); return; }
    face = { img, lm, W: img.width, H: img.height };
    face.fs = dist(lm[33], lm[263]);
    buildMasks();
    $('#empty').hidden = true;
    for (const o of Object.values(OV)) if (o.kind === 'face') o.warped = null;
    render(); pushHist();
    status(`Face found · ${img.width}×${img.height} · press R for a random look`);
  } catch (e) { console.error(e); status('Could not load the face model: ' + e.message); }
}
function buildMasks() {
  const { W, H, lm, fs } = face, P = i => lm[i];
  const m = (fn, blur) => { const c = mk(W, H), x = c.getContext('2d'); x.fillStyle = '#fff'; fn(x); return blurCanvas(c, blur); };
  const holes = x => { x.globalCompositeOperation = 'destination-out'; x.beginPath(); poly(x, EYE_R.map(P)); poly(x, EYE_L.map(P)); poly(x, LIPS_IN.map(P)); x.fill(); };
  face.faceMask = m(x => { x.beginPath(); poly(x, OVAL.map(P)); x.fill(); holes(x); }, fs * .04);
  face.lipMask = m(x => { x.beginPath(); poly(x, LIPS_OUT.map(P)); poly(x, LIPS_IN.map(P)); x.fill('evenodd'); }, fs * .012);
  face.eyeHoles = m(x => { x.beginPath(); poly(x, OVAL.map(P)); x.fill(); x.globalCompositeOperation = 'destination-out'; x.beginPath(); poly(x, EYE_R.map(P)); poly(x, EYE_L.map(P)); x.fill(); }, fs * .008);
}

// ---------- procedural parts ----------
function drawPart(k, cfg, J) {
  const { W, H, lm, fs } = face, P = i => lm[i];
  const L = mk(W, H), x = L.getContext('2d'); x.fillStyle = cfg.color; x.strokeStyle = cfg.color;
  const ang = Math.atan2(P(263)[1] - P(33)[1], P(263)[0] - P(33)[0]);
  const soft = cfg.soft;
  const sides = [{ lid: LID_R, eye: EYE_R, brow: BROW_R, cheek: 50, bone: 123, temple: 234, hl: 117 }, { lid: LID_L, eye: EYE_L, brow: BROW_L, cheek: 280, bone: 352, temple: 454, hl: 346 }];
  let blur = fs * .02 * soft, holeEyes = false;
  const radial = (c, r, sy) => { x.save(); x.translate(c[0], c[1]); x.rotate(ang); x.scale(1, sy); const g = x.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, cfg.color); g.addColorStop(.55, cfg.color + 'aa'); g.addColorStop(1, cfg.color + '00'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, 7); x.fill(); x.restore(); };
  if (k === 'lips') { x.beginPath(); poly(x, LIPS_OUT.map(P)); poly(x, LIPS_IN.map(P)); x.fill('evenodd'); blur = fs * .015 * soft; }
  else if (k === 'blush') { for (const s of sides) { const c = lerp(P(s.cheek), P(s.bone), J.blushT); c[1] += J.blushDy * fs; radial(c, fs * .3 * J.blushS, .72); } blur = fs * .05 * soft; }
  else if (k === 'contour') { for (const s of sides) { const c = lerp(lerp(P(s.temple), P(s.cheek), .4), P(s.temple === 234 ? 132 : 361), .35); radial(c, fs * .32, .45); } blur = fs * .07 * soft; }
  else if (k === 'highlight') { x.lineCap = 'round'; x.lineWidth = fs * .06; x.beginPath(); [168, 6, 197, 195].map(P).forEach((p, i) => i ? x.lineTo(...p) : x.moveTo(...p)); x.stroke(); for (const s of sides) radial(P(s.hl), fs * .14, .5); radial(P(151), fs * .12, .7); blur = fs * .05 * soft; }
  else if (k === 'shadow') {
    for (const s of sides) {
      const lid = s.lid.map(P), up = [cen(s.brow.map(P))[0] - cen(s.eye.map(P))[0], cen(s.brow.map(P))[1] - cen(s.eye.map(P))[1]];
      const top = lid.map((p, i) => { const t = i / (lid.length - 1), w = J.shadowH * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.25))); return [p[0] + up[0] * w, p[1] + up[1] * w]; });
      const outer = lid[0], away = [outer[0] - lid[lid.length - 1][0], outer[1] - lid[lid.length - 1][1]], al = Math.hypot(...away);
      const wingPt = [outer[0] + away[0] / al * fs * .07 + up[0] * .25, outer[1] + away[1] / al * fs * .07 + up[1] * .25];
      x.beginPath(); poly(x, [wingPt, ...top, ...lid.slice().reverse()]); x.fill();
    }
    blur = fs * .035 * soft; holeEyes = true;
  } else if (k === 'liner') {
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (const s of sides) {
      const lid = s.lid.map(P), outer = lid[0], inner = lid[lid.length - 1], up = [cen(s.brow.map(P))[0] - cen(s.eye.map(P))[0], cen(s.brow.map(P))[1] - cen(s.eye.map(P))[1]], ul = Math.hypot(...up);
      const away = [outer[0] - inner[0], outer[1] - inner[1]], al = Math.hypot(...away);
      const wing = [outer[0] + (away[0] / al * .9 + up[0] / ul * .45) * fs * .08 * J.wing, outer[1] + (away[1] / al * .9 + up[1] / ul * .45) * fs * .08 * J.wing];
      const w = fs * .014 * J.linerW;
      // tapered liner: filled shape from inner corner (thin) to outer (thick) + wing
      const thick = lid.map((p, i) => { const t = 1 - i / (lid.length - 1); return [p[0] + up[0] / ul * w * (0.3 + 1.4 * t), p[1] + up[1] / ul * w * (0.3 + 1.4 * t)]; });
      x.beginPath(); poly(x, [wing, ...thick, ...lid.slice().reverse()]); x.fill();
      x.lineWidth = w * .5; x.beginPath(); lid.forEach((p, i) => i ? x.lineTo(...p) : x.moveTo(...p)); x.stroke();
    }
    blur = fs * .004 * (0.5 + soft); holeEyes = true;
  } else if (k === 'brows') { x.beginPath(); poly(x, BROW_R.map(P)); poly(x, BROW_L.map(P)); x.fill(); blur = fs * .012 * (0.5 + soft); }
  let out = blurCanvas(L, blur);
  if (holeEyes) { const ox = out.getContext('2d'); ox.globalCompositeOperation = 'destination-in'; ox.drawImage(face.eyeHoles, 0, 0); }
  return out;
}

// ---------- overlays (uploaded) ----------
const OV = {}; let ovSeq = 1;
async function addOverlay(file) {
  const id = 'o' + ovSeq++;
  const src = await fileToCanvas(file, 1600);
  const o = OV[id] = { id, name: file.name, src, tol: 40, strokes: [], kind: 'image', mode: 'auto' };
  state.ovs[id] = { on: true, type: 'full', op: .85, blend: 'source-over', dx: 0, dy: 0, sc: 1 };
  status('Cleaning overlay…');
  await analyzeOverlay(o);
  if (o.kind === 'face') { state.ovs[id].type = 'face'; state.ovs[id].blend = 'source-over'; }
  else if (o.bgWhite) state.ovs[id].blend = 'multiply';
  renderOvList(); if (face) { render(); pushHist(); }
  status(`Overlay "${file.name}": ${o.note}`);
}
function hasAlpha(c) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] < 245) n++; return n / (d.length / 16) > .02; }
async function analyzeOverlay(o) {
  if (hasAlpha(o.src)) { o.kind = 'image'; o.method = 'alpha'; o.note = 'already transparent'; return cleanOverlay(o); }
  let lm = null; try { lm = await detect(o.src); } catch (e) { console.warn(e); }
  if (lm) { o.kind = 'face'; o.lm = lm; o.note = 'face photo detected — makeup extracted'; return extractFaceMakeup(o); }
  // border sampling
  const { width: w, height: h } = o.src, d = o.src.getContext('2d').getImageData(0, 0, w, h).data, B = [];
  const step = Math.max(1, Math.round((w + h) / 400));
  for (let x = 0; x < w; x += step) B.push(px(d, w, x, 0), px(d, w, x, h - 1));
  for (let y = 0; y < h; y += step) B.push(px(d, w, 0, y), px(d, w, w - 1, y));
  const med = [0, 1, 2].map(k => B.map(p => p[k]).sort((a, b) => a - b)[B.length >> 1]);
  const close = B.filter(p => cdist(p, med) < 40).length / B.length;
  o.bg = med; o.bgWhite = med.every(v => v > 220) && Math.max(...med) - Math.min(...med) < 20;
  if (o.bgWhite) { o.method = 'white'; o.note = 'white background → transparent (luminance)'; }
  else if (close > .7) { o.method = 'flood'; o.note = 'solid background removed'; }
  else { o.method = 'seg'; o.note = 'complex background — AI cut-out'; try { await segment(o); } catch (e) { console.warn('segmentation failed', e); o.method = 'flood'; o.tol = 60; o.note = 'complex background — edge flood fill (AI cut-out unavailable)'; } }
  cleanOverlay(o);
}
const px = (d, w, x, y) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
const cdist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
let segmenter = null;
async function segment(o) {
  if (!segmenter) {
    status('Loading background-removal model…');
    const v = await import(MP + '/vision_bundle.mjs'), fs = await v.FilesetResolver.forVisionTasks(MP + '/wasm');
    segmenter = await v.InteractiveSegmenter.createFromOptions(fs, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/1/magic_touch.tflite', delegate: 'CPU' }, outputCategoryMask: false, outputConfidenceMasks: true });
  }
  // the subject is assumed near the center of the sheet
  const r = segmenter.segment(o.src, { keypoint: { x: .5, y: .5 } });
  const m = r.confidenceMasks[0], arr = m.getAsFloat32Array(), w = m.width, h = m.height;
  const c = mk(w, h), x = c.getContext('2d'), id = x.createImageData(w, h);
  for (let i = 0; i < arr.length; i++) { id.data[i * 4 + 3] = clamp(arr[i] * 255, 0, 255); }
  x.putImageData(id, 0, 0); r.close?.();
  o.segMask = c;
}
function cleanOverlay(o) {
  const { width: w, height: h } = o.src, out = mk(w, h), x = out.getContext('2d');
  x.drawImage(o.src, 0, 0);
  if (o.method === 'white' || o.method === 'flood') {
    const id = x.getImageData(0, 0, w, h), d = id.data, bg = o.bg, tol = o.tol;
    if (o.method === 'white') { // colour-to-alpha against bg: keeps soft makeup strokes semi-transparent
      const k = tol / 40;
      for (let i = 0; i < d.length; i += 4) {
        let a = 0; for (let c = 0; c < 3; c++) a = Math.max(a, (bg[c] - d[i + c]) / Math.max(1, bg[c]));
        a = clamp((a - .03 * k) / (1 - .03 * k), 0, 1); a = clamp(a * (1.6 / k), 0, 1);
        if (a > 0) for (let c = 0; c < 3; c++) d[i + c] = clamp(bg[c] - (bg[c] - d[i + c]) / a, 0, 255);
        d[i + 3] = a * 255;
      }
    } else { // flood fill from the border with tolerance + feathered alpha
      const seen = new Uint8Array(w * h), q = new Int32Array(w * h); let qh = 0, qt = 0, hi = tol * 1.5;
      const push = p => { if (seen[p]) return; const i = p * 4, dd = cdist([d[i], d[i + 1], d[i + 2]], bg); if (dd > hi) return; seen[p] = 1; q[qt++] = p; };
      for (let X = 0; X < w; X++) { push(X); push((h - 1) * w + X); } for (let Y = 0; Y < h; Y++) { push(Y * w); push(Y * w + w - 1); }
      while (qh < qt) { const p = q[qh++], X = p % w; if (X > 0) push(p - 1); if (X < w - 1) push(p + 1); if (p >= w) push(p - w); if (p < w * (h - 1)) push(p + w); }
      for (let p = 0; p < w * h; p++) if (seen[p]) { const i = p * 4; d[i + 3] = 255 * smooth(tol * .6, hi, cdist([d[i], d[i + 1], d[i + 2]], bg)); }
    }
    x.putImageData(id, 0, 0);
  } else if (o.method === 'seg' && o.segMask) {
    const m = mk(w, h), mx = m.getContext('2d'); mx.drawImage(o.segMask, 0, 0, w, h);
    // tolerance slider shifts the cut threshold
    const md = mx.getImageData(0, 0, w, h), t = o.tol / 80;
    for (let i = 3; i < md.data.length; i += 4) md.data[i] = 255 * smooth(t * .5, t * .5 + .35, md.data[i] / 255);
    mx.putImageData(md, 0, 0);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(m, 0, 0); x.globalCompositeOperation = 'source-over';
  }
  applyStrokes(o, x);
  o.clean = out; o.warped = null;
}
function extractFaceMakeup(o) {
  const { src, lm } = o, { width: w, height: h } = src, fs = dist(lm[33], lm[263]), P = i => lm[i];
  const sd = src.getContext('2d').getImageData(0, 0, w, h).data;
  const samp = [50, 280, 151, 205, 425, 4].map(i => px(sd, w, clamp(P(i)[0] | 0, 0, w - 1), clamp(P(i)[1] | 0, 0, h - 1)));
  const skin = [0, 1, 2].map(k => samp.map(p => p[k]).sort((a, b) => a - b)[3]);
  o.skin = skin;
  // regions where makeup lives
  const R = mk(w, h), rx = R.getContext('2d'); rx.fillStyle = '#fff';
  rx.beginPath(); poly(rx, LIPS_OUT.map(P)); rx.fill();
  for (const [lid, eye, brow, cheek] of [[LID_R, EYE_R, BROW_R, 50], [LID_L, EYE_L, BROW_L, 280]]) {
    rx.beginPath(); poly(rx, [...lid.map(P), ...brow.map(P).reverse()]); rx.fill();
    rx.beginPath(); poly(rx, eye.map(P)); rx.lineWidth = fs * .05; rx.strokeStyle = '#fff'; rx.stroke();
    rx.beginPath(); poly(rx, brow.map(P)); rx.fill();
    rx.beginPath(); rx.arc(...P(cheek), fs * .3, 0, 7); rx.fill();
  }
  rx.globalCompositeOperation = 'destination-out'; rx.beginPath(); poly(rx, EYE_R.map(P)); poly(rx, EYE_L.map(P)); poly(rx, LIPS_IN.map(P)); rx.fill();
  const Rb = blurCanvas(R, fs * .03).getContext('2d').getImageData(0, 0, w, h).data;
  const out = mk(w, h), x = out.getContext('2d'), id = x.createImageData(w, h), d = id.data, lo = o.tol * .3, hi = o.tol * 1.6;
  for (let i = 0; i < d.length; i += 4) {
    const p = [sd[i], sd[i + 1], sd[i + 2]], a = smooth(lo, hi, cdist(p, skin)) * Rb[i + 3] / 255;
    d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = a * 255;
  }
  x.putImageData(id, 0, 0); applyStrokes(o, x);
  o.clean = out; o.warped = null; o.tris = null;
}
function applyStrokes(o, x) {
  for (const s of o.strokes) {
    x.save(); x.beginPath(); x.arc(s.x * o.src.width, s.y * o.src.height, s.r * o.src.width, 0, 7);
    if (s.mode === 'erase') { x.globalCompositeOperation = 'destination-out'; x.fill(); }
    else { x.clip(); x.clearRect(0, 0, o.src.width, o.src.height); x.drawImage(o.src, 0, 0); }
    x.restore();
  }
}
function alphaBox(c) {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) if (d[(y * c.width + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 > x0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : { x: 0, y: 0, w: c.width, h: c.height };
}
function drawOverlay(o, cfg) {
  const { W, H, lm, fs } = face, P = i => lm[i], L = mk(W, H), x = L.getContext('2d');
  const ang = Math.atan2(P(263)[1] - P(33)[1], P(263)[0] - P(33)[0]);
  const place = (c, cx, cy, wTarget, flip, box) => { x.save(); x.translate(cx + cfg.dx * fs, cy + cfg.dy * fs); x.rotate(ang); if (flip) x.scale(-1, 1); const s = wTarget * cfg.sc / box.w; x.scale(s, s); x.drawImage(c, box.x, box.y, box.w, box.h, -box.w / 2, -box.h / 2, box.w, box.h); x.restore(); };
  let mask = face.faceMask;
  if (o.kind === 'face') {
    if (!o.warped) { const tris = o.tris || (o.tris = delaunay(o.lm)); o.warped = meshWarp(o.clean, o.lm, lm, W, H, tris); }
    x.drawImage(o.warped, cfg.dx * fs, cfg.dy * fs);
    mask = face.eyeHoles;
  } else if (cfg.type === 'full') {
    // assume a front-facing template: eyes at 33%/67% width, 40% height; mouth centre at 75%
    const c = o.clean, b = alphaBox(c); const isTemplate = o.method !== 'alpha' || b.w > c.width * .6;
    const box = isTemplate ? { x: 0, y: 0, w: c.width, h: c.height } : b;
    const s = [[box.x + box.w * .33, box.y + box.h * .40], [box.x + box.w * .67, box.y + box.h * .40], [box.x + box.w * .5, box.y + box.h * .75]];
    const j = p => [p[0] + cfg.dx * fs, p[1] + cfg.dy * fs], e1 = cen(EYE_R.map(P)), e2 = cen(EYE_L.map(P)), mc = lerp(P(61), P(291), .5), m0 = cen([e1, e2]);
    const sc = q => [m0[0] + (q[0] - m0[0]) * cfg.sc, m0[1] + (q[1] - m0[1]) * cfg.sc];
    warpTri(x, c, s, [j(sc(e1)), j(sc(e2)), j(sc(mc))]);
    // extend over the whole canvas: second triangle set using the same affine
    x.save(); x.globalCompositeOperation = 'destination-over';
    const [a, bq, cc] = s, D = [j(sc(e1)), j(sc(e2)), j(sc(mc))];
    const sx1 = bq[0] - a[0], sy1 = bq[1] - a[1], sx2 = cc[0] - a[0], sy2 = cc[1] - a[1], det = sx1 * sy2 - sx2 * sy1;
    const dx1 = D[1][0] - D[0][0], dy1 = D[1][1] - D[0][1], dx2 = D[2][0] - D[0][0], dy2 = D[2][1] - D[0][1];
    const m00 = (dx1 * sy2 - dx2 * sy1) / det, m01 = (dx2 * sx1 - dx1 * sx2) / det, m10 = (dy1 * sy2 - dy2 * sy1) / det, m11 = (dy2 * sx1 - dy1 * sx2) / det;
    x.setTransform(m00, m10, m01, m11, D[0][0] - m00 * a[0] - m01 * a[1], D[0][1] - m10 * a[0] - m11 * a[1]); x.drawImage(c, 0, 0); x.restore();
  } else if (cfg.type === 'lips') {
    const b = alphaBox(o.clean), mc = cen(LIPS_OUT.map(P)); place(o.clean, mc[0], mc[1], dist(P(61), P(291)) * 1.05, false, b); mask = face.lipMask;
  } else if (cfg.type === 'eyes') {
    const b = alphaBox(o.clean);
    for (const [eye, brow, flip] of [[EYE_R, BROW_R, false], [EYE_L, BROW_L, true]]) { const e = cen(eye.map(P)), br = cen(brow.map(P)), c = lerp(e, br, .35); place(o.clean, c[0], c[1], fs * .55, flip, b); }
    mask = face.eyeHoles;
  } else if (cfg.type === 'cheeks') {
    const b = alphaBox(o.clean);
    for (const [i, flip] of [[50, false], [280, true]]) place(o.clean, P(i)[0], P(i)[1], fs * .55, flip, b);
  }
  x.globalCompositeOperation = 'destination-in'; x.drawImage(mask, 0, 0);
  return L;
}

// ---------- render ----------
const out = $('#out'), before = $('#before');
function render() {
  if (!face) return;
  const { W, H } = face;
  if (out.width !== W || out.height !== H) { out.width = W; out.height = H; before.width = W; before.height = H; before.getContext('2d').drawImage(face.img, 0, 0); }
  const x = out.getContext('2d'); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.drawImage(face.img, 0, 0);
  for (const [k] of PARTS) { const c = state.parts[k]; if (!c.on || c.op <= 0) continue; x.globalCompositeOperation = c.blend; x.globalAlpha = c.op; x.drawImage(drawPart(k, c, state.jit), 0, 0); }
  for (const id in state.ovs) { const c = state.ovs[id], o = OV[id]; if (!o || !c.on) continue; x.globalCompositeOperation = c.blend; x.globalAlpha = c.op; x.drawImage(drawOverlay(o, c), 0, 0); }
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  fit(); syncUI();
}
function fit() {
  const st = $('#stage'), r = st.getBoundingClientRect(); if (!face) return;
  const s = Math.min(r.width / face.W, r.height / face.H), w = face.W * s, h = face.H * s;
  for (const c of [out, before]) Object.assign(c.style, { width: w + 'px', height: h + 'px', left: (r.width - w) / 2 + 'px', top: (r.height - h) / 2 + 'px' });
  const v = +$('#cmp').value; before.style.clipPath = `inset(0 ${v}% 0 0)`;
  const hd = $('#handle'); hd.style.display = v < 100 && v > 0 ? 'block' : 'none'; hd.style.left = (r.width - w) / 2 + w * (100 - v) / 100 + 'px';
}
addEventListener('resize', fit);

// ---------- random + history ----------
function randomLook() {
  if (!face) return;
  const name = pick(Object.keys(PRESETS)), s = freshState(name), p = PRESETS[name];
  const jitter = (hex, dh, ds, dl) => { let [h, sa, l] = hexToHsl(hex); return hslToHex(h + rnd(-dh, dh), clamp(sa + rnd(-ds, ds), 0, 1), clamp(l + rnd(-dl, dl), .03, .97)); };
  const ranges = { lips: [.45, .8], blush: [.2, .45], shadow: [.3, .6], liner: [.6, .95], brows: [.2, .45], contour: [.12, .3], highlight: [.15, .35] };
  const onP = { lips: .95, blush: .85, shadow: .8, liner: .7, brows: .6, contour: .35, highlight: .35 };
  for (const [k] of PARTS) { const c = s.parts[k]; c.on = Math.random() < onP[k]; c.color = jitter(p[k], 12, .12, .06); c.op = rnd(...ranges[k]); c.soft = rnd(.35, .9); c.blend = pick(SENSIBLE[k]); }
  s.parts.liner.soft = rnd(.15, .4);
  s.jit = { blushT: rnd(0, .6), blushS: rnd(.8, 1.2), blushDy: rnd(-.04, .04), shadowH: rnd(.35, .8), linerW: rnd(.6, 1.5), wing: rnd(0, 1.6) };
  const ids = Object.keys(state.ovs);
  if (ids.length) { const chosen = pick(ids); for (const id of ids) { const c = Object.assign({}, state.ovs[id]); c.on = id === chosen || Math.random() < .25; c.op = rnd(.55, .95); c.dx = rnd(-.02, .02); c.dy = rnd(-.02, .02); c.sc = rnd(.95, 1.05); c.blend = OV[id].bgWhite ? pick(['multiply', 'multiply', 'color']) : pick(['source-over', 'multiply', 'soft-light']); s.ovs[id] = c; } }
  state = s; render(); pushHist();
  status(`Random look: ${name}-based`);
}
const hist = []; let hi = -1;
function pushHist() {
  const snap = JSON.parse(JSON.stringify(state));
  hist.splice(hi + 1); hist.push(snap); if (hist.length > 10) hist.shift(); hi = hist.length - 1;
  const t = mk(96, 96 * face.H / face.W); t.getContext('2d').drawImage(out, 0, 0, t.width, t.height); snap.thumb = t; drawHist();
}
function drawHist() { const h = $('#hist'); h.innerHTML = ''; hist.forEach((s, i) => { const c = s.thumb; c.style.outline = i === hi ? '2px solid #ff7a3d' : ''; c.title = 'Look ' + (i + 1); c.onclick = () => { hi = i; restore(); }; h.appendChild(c); }); }
function restore() { const s = JSON.parse(JSON.stringify(hist[hi], (k, v) => k === 'thumb' ? undefined : v)); state = s; render(); drawHist(); }
function undo() { if (hi > 0) { hi--; restore(); status('Undo — look ' + (hi + 1)); } }

// ---------- UI ----------
function hexToHsl(h) { const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255, M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2; let H = 0, S = 0; if (M !== m) { const d = M - m; S = l > .5 ? d / (2 - M - m) : d / (M + m); H = M === r ? (g - b) / d + (g < b ? 6 : 0) : M === g ? (b - r) / d + 2 : (r - g) / d + 4; H *= 60; } return [H, S, l]; }
function hslToHex(h, s, l) { h = ((h % 360) + 360) % 360; const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); }; return '#' + f(0) + f(8) + f(4); }
const blendSel = v => `<select>${BLENDS.map(([k, n]) => `<option value="${k}"${k === v ? ' selected' : ''}>${n}</option>`).join('')}</select>`;
let deb; const rerender = (push = true) => { clearTimeout(deb); deb = setTimeout(() => { render(); if (push && face) pushHist(); }, 120); };
function buildUI() {
  $('#presets').innerHTML = ''; for (const n in PRESETS) { const b = document.createElement('button'); b.textContent = n; b.style.borderLeft = `10px solid ${PRESETS[n].lips}`; b.onclick = () => { const ovs = state.ovs; state = freshState(n); state.ovs = ovs; rerender(); }; $('#presets').appendChild(b); }
  const P = $('#parts'); P.innerHTML = '';
  for (const [k, label] of PARTS) {
    const d = document.createElement('div'); d.className = 'part'; d.dataset.k = k;
    d.innerHTML = `<div class="row"><input type="checkbox" class="on"><b style="flex:1">${label}</b><input type="color" class="col">${blendSel('')}</div>
      <div class="row"><span>Opacity</span><input type="range" class="op" min="0" max="1" step=".01"></div>
      <div class="row"><span>Softness</span><input type="range" class="soft" min="0" max="1.5" step=".01"></div>`;
    d.oninput = e => { const c = state.parts[k]; c.on = d.querySelector('.on').checked; c.color = d.querySelector('.col').value; c.blend = d.querySelector('select').value; c.op = +d.querySelector('.op').value; c.soft = +d.querySelector('.soft').value; rerender(); };
    P.appendChild(d);
  }
}
function syncUI() {
  for (const b of $('#presets').children) b.classList.toggle('on', b.textContent === state.preset);
  for (const d of $('#parts').children) { const c = state.parts[d.dataset.k]; d.querySelector('.on').checked = c.on; d.querySelector('.col').value = c.color; d.querySelector('select').value = c.blend; d.querySelector('.op').value = c.op; d.querySelector('.soft').value = c.soft; }
  for (const d of $('#ovList').children) { const c = state.ovs[d.dataset.id]; if (!c) continue; d.querySelector('.on').checked = c.on; d.querySelector('.op').value = c.op; d.querySelector('.bl').value = c.blend; d.querySelector('.ty').value = c.type; }
}
function renderOvList() {
  const L = $('#ovList'); L.innerHTML = '';
  for (const id in OV) {
    const o = OV[id], c = state.ovs[id], d = document.createElement('div'); d.className = 'ov'; d.dataset.id = id;
    const types = o.kind === 'face' ? [['face', 'Face photo (auto)']] : [['full', 'Full face'], ['lips', 'Lips'], ['eyes', 'Eyes'], ['cheeks', 'Cheeks']];
    d.innerHTML = `<div class="top"><canvas class="pv" width="128" height="128" style="width:64px;height:64px;border-radius:4px;background:repeating-conic-gradient(#333 0 25%,#222 0 50%) 0 0/10px 10px;touch-action:none"></canvas>
      <div style="flex:1;min-width:0"><div class="row"><input type="checkbox" class="on"><b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${o.name.replace(/</g, '&lt;')}</b><button class="rm" title="Remove">✕</button></div>
      <div class="row"><select class="ty">${types.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select>${blendSel(c.blend).replace('<select>', '<select class="bl">')}</div>
      <div class="hint">${o.note}</div></div></div>
      <div class="row"><span>Opacity</span><input type="range" class="op" min="0" max="1" step=".01"></div>
      <div class="row"><span>Tolerance</span><input type="range" class="tol" min="5" max="120" value="${o.tol}"></div>
      <div class="row"><span>Brush</span><label><input type="radio" name="b${id}" value="" checked>off</label><label><input type="radio" name="b${id}" value="erase">erase</label><label><input type="radio" name="b${id}" value="restore">restore</label><button class="clr">reset</button></div>`;
    const pv = d.querySelector('.pv'), drawPv = () => { const x = pv.getContext('2d'), s = Math.min(128 / o.clean.width, 128 / o.clean.height); x.clearRect(0, 0, 128, 128); x.drawImage(o.clean, (128 - o.clean.width * s) / 2, (128 - o.clean.height * s) / 2, o.clean.width * s, o.clean.height * s); };
    drawPv(); pv.onclick = () => { if (mode()) return; const w = open(); if (w) { w.document.body.style.cssText = 'margin:0;background:#222'; const i = w.document.createElement('img'); i.src = o.clean.toDataURL(); i.style.maxWidth = '100%'; w.document.body.appendChild(i); } };
    const reclean = () => { if (o.kind === 'face') extractFaceMakeup(o); else cleanOverlay(o); drawPv(); rerender(); };
    d.querySelector('.tol').onchange = e => { o.tol = +e.target.value; reclean(); };
    d.querySelector('.clr').onclick = () => { o.strokes = []; reclean(); };
    d.querySelector('.rm').onclick = () => { delete OV[id]; delete state.ovs[id]; renderOvList(); rerender(); };
    d.querySelector('.on').onchange = e => { c.on = e.target.checked; rerender(); };
    d.querySelector('.op').oninput = e => { c.op = +e.target.value; rerender(); };
    d.querySelector('.bl').onchange = e => { c.blend = e.target.value; rerender(); };
    d.querySelector('.ty').onchange = e => { c.type = e.target.value; rerender(); };
    // erase / restore brush on the preview
    let painting = false;
    const mode = () => d.querySelector(`input[name=b${id}]:checked`).value;
    const at = e => { const r = pv.getBoundingClientRect(), s = Math.min(64 / o.clean.width, 64 / o.clean.height), ox = (64 - o.clean.width * s) / 2, oy = (64 - o.clean.height * s) / 2; return { x: (e.clientX - r.left - ox) / (o.clean.width * s), y: (e.clientY - r.top - oy) / (o.clean.height * s) }; };
    pv.onpointerdown = e => { if (!mode()) return; e.preventDefault(); painting = true; pv.setPointerCapture(e.pointerId); stroke(e); };
    const stroke = e => { if (!painting) return; const p = at(e); o.strokes.push({ ...p, r: .05, mode: mode() }); const x = o.clean.getContext('2d'); applyStrokes({ src: o.src, strokes: [o.strokes.at(-1)] }, x); o.warped = null; drawPv(); };
    pv.onpointermove = stroke; pv.onpointerup = () => { if (painting) { painting = false; rerender(); } };
    L.appendChild(d);
  }
  syncUI();
}

$('#faceIn').onchange = e => e.target.files[0] && setFace(e.target.files[0]);
$('#faceIn2').onchange = e => e.target.files[0] && setFace(e.target.files[0]);
$('#ovIn').onchange = async e => { for (const f of e.target.files) { try { await addOverlay(f); } catch (er) { console.error(er); status('Could not read ' + f.name); } } e.target.value = ''; };
$('#rand').onclick = randomLook; $('#undo').onclick = undo;
$('#cmp').oninput = fit;
$('#dl').onclick = () => { if (!face) return; out.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'makeup-look.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4e3); }, 'image/png'); };
$('#toEd').onclick = () => {
  if (!face) return;
  const proj = { app: 'PixelForge', version: 1, w: face.W, h: face.H, name: 'Makeup look', active: 1, layers: [
    { name: 'Original', type: 'raster', canvas: face.img.toDataURL(), visible: true, locked: false, opacity: 1, blend: 'source-over', mask: null, maskOn: true, editMask: false },
    { name: 'Makeup look', type: 'raster', canvas: out.toDataURL(), visible: true, locked: false, opacity: 1, blend: 'source-over', mask: null, maskOn: true, editMask: false }] };
  const r = indexedDB.open('pf-xfer', 1); r.onupgradeneeded = () => r.result.createObjectStore('x');
  r.onsuccess = () => { const t = r.result.transaction('x', 'readwrite'); t.objectStore('x').put(proj, 'project'); t.oncomplete = () => { location.href = './#makeup-import'; }; };
};
addEventListener('keydown', e => { if (e.target.matches('input,select,textarea')) return; if (e.key === 'r' || e.key === 'R') randomLook(); if ((e.key === 'z' && !e.ctrlKey && !e.metaKey) || ((e.ctrlKey || e.metaKey) && e.key === 'z')) { e.preventDefault(); undo(); } });
buildUI(); syncUI();
window.MK = { get state() { return state; }, get face() { return face; }, OV, setFace, addOverlay, randomLook, undo, render, hist };
