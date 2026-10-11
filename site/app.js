/* PixelForge — original browser image editor. MIT License. */
'use strict';
const $ = s => document.querySelector(s);
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
const cx2 = c => c.getContext('2d', { willReadFrequently: true });
const clone = c => { const d = mk(c.width, c.height); d.getContext('2d').drawImage(c, 0, 0); return d; };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const BLENDS = [['Normal','source-over'],['Multiply','multiply'],['Screen','screen'],['Overlay','overlay'],['Darken','darken'],['Lighten','lighten'],['Color Dodge','color-dodge'],['Color Burn','color-burn'],['Hard Light','hard-light'],['Soft Light','soft-light'],['Difference','difference'],['Exclusion','exclusion'],['Hue','hue'],['Saturation','saturation'],['Color','color'],['Luminosity','luminosity']];
const toPsdBlend = b => (BLENDS.find(x => x[1] === b) || BLENDS[0])[0].toLowerCase();
const fromPsdBlend = b => (BLENDS.find(x => x[0].toLowerCase() === b) || BLENDS[0])[1];
const FONTS = ['Arial','Helvetica','Georgia','Times New Roman','Courier New','Verdana','Trebuchet MS','Impact','Comic Sans MS','system-ui','serif','sans-serif','monospace'];

let doc = null, uid = 1, live = null, sel = null, tool = 'move';
let fg = '#000000', bg = '#ffffff';
const view = { zoom: 1, px: 0, py: 0 };
const opt = { size: 30, hardness: 0.8, opacity: 1, tolerance: 32, contiguous: true, font: 'Arial', fontSize: 64, bold: false, italic: false, sampleAll: true };
let hist = [], hi = -1;
let comp = mk(1, 1);
const V = $('#view'), vx = V.getContext('2d');

const ADJ = {
  'brightness-contrast': { name: 'Brightness/Contrast', params: [['brightness', -150, 150, 0, 1], ['contrast', -100, 100, 0, 1]] },
  'hue-saturation': { name: 'Hue/Saturation', params: [['hue', -180, 180, 0, 1], ['saturation', -100, 100, 0, 1], ['lightness', -100, 100, 0, 1]] },
  levels: { name: 'Levels', params: [['inBlack', 0, 254, 0, 1], ['inWhite', 1, 255, 255, 1], ['gamma', 0.1, 9.99, 1, 0.01], ['outBlack', 0, 255, 0, 1], ['outWhite', 0, 255, 255, 1]] },
  exposure: { name: 'Exposure', params: [['exposure', -5, 5, 0, 0.01], ['offset', -0.5, 0.5, 0, 0.01]] },
  invert: { name: 'Invert', params: [] },
  grayscale: { name: 'Black & White', params: [] },
};
const adjDefaults = t => { const p = {}; for (const [k, , , v] of ADJ[t].params) p[k] = v; return p; };
function lutFor(t, p) {
  const l = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    let v = i;
    if (t === 'brightness-contrast') { const C = p.contrast * 2.55, f = (259 * (C + 255)) / (255 * (259 - C)); v = f * (i - 128) + 128 + p.brightness; }
    else if (t === 'levels') { let x = clamp((i - p.inBlack) / Math.max(1, p.inWhite - p.inBlack), 0, 1); x = Math.pow(x, 1 / p.gamma); v = p.outBlack + x * (p.outWhite - p.outBlack); }
    else if (t === 'exposure') v = ((i / 255) * Math.pow(2, p.exposure) + p.offset) * 255;
    else if (t === 'invert') v = 255 - i;
    l[i] = v;
  }
  return l;
}
function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), L = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = L > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, L]; }
function h2r(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }
function applyAdj(c, t, p) {
  const x = cx2(c), id = x.getImageData(0, 0, c.width, c.height), d = id.data, n = d.length;
  if (t === 'hue-saturation') {
    const dh = p.hue / 360, sf = 1 + p.saturation / 100, lf = p.lightness / 100;
    for (let j = 0; j < n; j += 4) {
      if (!d[j + 3]) continue;
      let [h, s, L] = rgb2hsl(d[j], d[j + 1], d[j + 2]);
      h = (h + dh + 1) % 1; s = clamp(s * sf, 0, 1); L = lf > 0 ? L + (1 - L) * lf : L * (1 + lf);
      if (s === 0) { d[j] = d[j + 1] = d[j + 2] = L * 255; continue; }
      const q = L < .5 ? L * (1 + s) : L + s - L * s, pp = 2 * L - q;
      d[j] = h2r(pp, q, h + 1 / 3) * 255; d[j + 1] = h2r(pp, q, h) * 255; d[j + 2] = h2r(pp, q, h - 1 / 3) * 255;
    }
  } else if (t === 'grayscale') {
    for (let j = 0; j < n; j += 4) { const y = .299 * d[j] + .587 * d[j + 1] + .114 * d[j + 2]; d[j] = d[j + 1] = d[j + 2] = y; }
  } else {
    const l = lutFor(t, p);
    for (let j = 0; j < n; j += 4) { d[j] = l[d[j]]; d[j + 1] = l[d[j + 1]]; d[j + 2] = l[d[j + 2]]; }
  }
  x.putImageData(id, 0, 0);
}

const FILTERS = {
  blur: { name: 'Gaussian Blur', params: [['radius', 0, 100, 4, 0.5]], fn(c, p) { const t = clone(c), x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.filter = `blur(${p.radius}px)`; x.drawImage(t, 0, 0); x.filter = 'none'; } },
  sharpen: { name: 'Sharpen', params: [['amount', 0, 5, 1, 0.1]], fn(c, p) {
    const x = cx2(c), w = c.width, h = c.height, src = x.getImageData(0, 0, w, h), s = src.data, out = x.createImageData(w, h), o = out.data, a = p.amount;
    for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) {
      const i = (y * w + X) * 4, up = (Math.max(0, y - 1) * w + X) * 4, dn = (Math.min(h - 1, y + 1) * w + X) * 4, lf = (y * w + Math.max(0, X - 1)) * 4, rt = (y * w + Math.min(w - 1, X + 1)) * 4;
      for (let k = 0; k < 3; k++) o[i + k] = s[i + k] * (1 + 4 * a) - a * (s[up + k] + s[dn + k] + s[lf + k] + s[rt + k]);
      o[i + 3] = s[i + 3];
    }
    x.putImageData(out, 0, 0);
  } },
  noise: { name: 'Add Noise', params: [['amount', 0, 100, 20, 1], ['monochrome', 0, 1, 1, 1]], fn(c, p) {
    const x = cx2(c), id = x.getImageData(0, 0, c.width, c.height), d = id.data, a = p.amount * 2.55;
    for (let j = 0; j < d.length; j += 4) { if (!d[j + 3]) continue; if (p.monochrome) { const r = (Math.random() - .5) * 2 * a; d[j] += r; d[j + 1] += r; d[j + 2] += r; } else { d[j] += (Math.random() - .5) * 2 * a; d[j + 1] += (Math.random() - .5) * 2 * a; d[j + 2] += (Math.random() - .5) * 2 * a; } }
    x.putImageData(id, 0, 0);
  } },
  pixelate: { name: 'Pixelate', params: [['size', 2, 100, 10, 1]], fn(c, p) { const s = mk(Math.ceil(c.width / p.size), Math.ceil(c.height / p.size)), sx = s.getContext('2d'); sx.drawImage(c, 0, 0, s.width, s.height); const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.imageSmoothingEnabled = false; x.drawImage(s, 0, 0, s.width * p.size, s.height * p.size); x.imageSmoothingEnabled = true; } },
};

function newLayer(o = {}) { const id = uid++; return Object.assign({ id, name: 'Layer ' + id, type: 'raster', canvas: mk(doc.w, doc.h), visible: true, locked: false, opacity: 1, blend: 'source-over', mask: null, maskOn: true, editMask: false }, o); }
function newDoc(w, h, fill, name) {
  doc = { w, h, layers: [], active: 0, name: name || 'Untitled' }; uid = 1;
  const l = newLayer({ name: 'Background' });
  if (fill && fill !== 'transparent') { const x = l.canvas.getContext('2d'); x.fillStyle = fill; x.fillRect(0, 0, w, h); }
  doc.layers.push(l); afterDocLoad('New document');
}
function afterDocLoad(label) {
  comp = mk(doc.w, doc.h); sel = null; live = null; hist = []; hi = -1; $('#start').hidden = true;
  commit(label); fit(); refreshAll();
}
const act = () => doc && doc.layers[doc.active];
const target = (l = act()) => l.editMask && l.mask ? l.mask : l.canvas;
function renderText(l) {
  const c = l.canvas.width === doc.w && l.canvas.height === doc.h ? l.canvas : (l.canvas = mk(doc.w, doc.h));
  const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height);
  x.font = `${l.italic ? 'italic ' : ''}${l.bold ? 'bold ' : ''}${l.size}px "${l.font}"`; x.fillStyle = l.color; x.textBaseline = 'top';
  const lines = l.text.split('\n'), lh = l.size * 1.2; let w = 0;
  lines.forEach((s, i) => { x.fillText(s, l.x, l.y + i * lh); w = Math.max(w, x.measureText(s).width); });
  l.bw = Math.max(w, 10); l.bh = lines.length * lh;
}
function makeEditable(l) {
  if (l.locked) { toast('Layer is locked'); return false; }
  if (l.type === 'adjust' && !l.editMask) { if (!l.mask) addMask(true); l.editMask = true; toast('Painting on the adjustment mask'); refreshLayers(); }
  if (l.type === 'text' && !l.editMask) { l.type = 'raster'; toast('Text layer rasterized'); }
  return true;
}
function maskApply(c, m) { const x = c.getContext('2d'); x.globalCompositeOperation = 'destination-in'; x.drawImage(m, 0, 0); x.globalCompositeOperation = 'source-over'; }
function layerSrc(l) { return (live && live.id === l.id && live.canvas) || l.canvas; }
function layerMask(l) { return (live && live.id === l.id && live.mask) || l.mask; }
function drawLayerOnto(ctx, l, base) {
  if (l.type === 'adjust') {
    const t = clone(base); applyAdj(t, l.adj, l.p);
    const m = layerMask(l); if (m && l.maskOn) maskApply(t, m);
    ctx.save(); ctx.globalAlpha = l.opacity; ctx.drawImage(t, 0, 0); ctx.restore(); return;
  }
  let src = layerSrc(l); const m = layerMask(l);
  if (m && l.maskOn) { src = clone(src); maskApply(src, m); }
  ctx.save(); ctx.globalAlpha = l.opacity; ctx.globalCompositeOperation = l.blend; ctx.drawImage(src, 0, 0); ctx.restore();
}
function composite(out = comp, layers = doc.layers) {
  const x = out.getContext('2d'); x.clearRect(0, 0, out.width, out.height);
  for (const l of layers) if (l.visible) drawLayerOnto(x, l, out);
  return out;
}

function snapLayer(l) { return Object.assign({}, l, { canvas: clone(l.canvas), mask: l.mask && clone(l.mask), p: l.p && Object.assign({}, l.p) }); }
function commit(label) {
  hist = hist.slice(0, hi + 1);
  hist.push({ label, w: doc.w, h: doc.h, active: doc.active, layers: doc.layers.map(snapLayer) });
  if (hist.length > 60) hist.shift();
  hi = hist.length - 1; refreshAll();
}
function restore(i) {
  if (i < 0 || i >= hist.length) return;
  hi = i; const s = hist[i]; cancelTools();
  const resized = s.w !== doc.w || s.h !== doc.h;
  doc.w = s.w; doc.h = s.h; doc.active = s.active; doc.layers = s.layers.map(snapLayer);
  if (resized) { comp = mk(doc.w, doc.h); sel = null; }
  refreshAll();
}
const undo = () => restore(hi - 1), redo = () => restore(hi + 1);
function setSelFromPath(path) {
  const m = mk(doc.w, doc.h), x = m.getContext('2d'); x.fillStyle = '#fff'; x.fill(path);
  sel = { mask: m, path, edge: null }; R();
}
function selEdge() {
  if (sel.edge) return sel.edge;
  const w = doc.w, h = doc.h, d = cx2(sel.mask).getImageData(0, 0, w, h).data, e = mk(w, h), ex = e.getContext('2d'), id = ex.createImageData(w, h), o = id.data;
  for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) {
    const i = (y * w + X) * 4; if (d[i + 3] < 128) continue;
    if (X === 0 || y === 0 || X === w - 1 || y === h - 1 || d[i - 1] < 128 || d[i + 7] < 128 || d[i - w * 4 + 3] < 128 || d[i + w * 4 + 3] < 128) { o[i] = o[i + 1] = o[i + 2] = ((X + y) >> 2) & 1 ? 255 : 0; o[i + 3] = 255; }
  }
  ex.putImageData(id, 0, 0); return (sel.edge = e);
}
function selectAll() { if (!doc) return; const p = new Path2D(); p.rect(0, 0, doc.w, doc.h); setSelFromPath(p); }
function deselect() { sel = null; R(); }
function invertSel() {
  if (!doc) return; if (!sel) return selectAll();
  const m = mk(doc.w, doc.h), x = m.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, doc.w, doc.h); x.globalCompositeOperation = 'destination-out'; x.drawImage(sel.mask, 0, 0);
  sel = { mask: m, path: null, edge: null }; R();
}
function applied(t, fn) {
  const out = clone(t); fn(out);
  if (!sel) return out;
  const res = clone(t), rx = res.getContext('2d'); maskApply(out, sel.mask);
  rx.globalCompositeOperation = 'destination-out'; rx.drawImage(sel.mask, 0, 0); rx.globalCompositeOperation = 'source-over'; rx.drawImage(out, 0, 0);
  return res;
}
function setTarget(l, c) { if (l.editMask && l.mask) l.mask = c; else l.canvas = c; }
function setLive(l, c) { live = l.editMask && l.mask ? { id: l.id, mask: c } : { id: l.id, canvas: c }; R(); }
function commitLive(label) { const l = act(); if (live) { if (live.mask) l.mask = live.mask; else if (live.canvas) l.canvas = live.canvas; } live = null; commit(label); }
function clearSel() {
  const l = act(); if (!l || !makeEditable(l)) return;
  const isMask = l.editMask && l.mask;
  setTarget(l, applied(target(l), c => { const x = c.getContext('2d'); if (isMask) { x.globalCompositeOperation = 'destination-out'; x.fillRect(0, 0, c.width, c.height); } else x.clearRect(0, 0, c.width, c.height); }));
  commit('Clear');
}
function fillSel(color) {
  const l = act(); if (!l || !makeEditable(l)) return;
  setTarget(l, applied(target(l), c => { const x = c.getContext('2d'); x.fillStyle = l.editMask ? '#fff' : color; x.fillRect(0, 0, c.width, c.height); }));
  commit('Fill');
}
function floodMask(src, sx, sy, tol, contiguous) {
  const w = src.width, h = src.height, d = cx2(src).getImageData(0, 0, w, h).data, out = new Uint8Array(w * h);
  sx |= 0; sy |= 0; if (sx < 0 || sy < 0 || sx >= w || sy >= h) return out;
  const i0 = (sy * w + sx) * 4, r = d[i0], g = d[i0 + 1], b = d[i0 + 2], a = d[i0 + 3], T = tol * 4;
  const ok = p => { const i = p * 4; return Math.abs(d[i] - r) + Math.abs(d[i + 1] - g) + Math.abs(d[i + 2] - b) + Math.abs(d[i + 3] - a) <= T; };
  if (!contiguous) { for (let p = 0; p < w * h; p++) if (ok(p)) out[p] = 1; return out; }
  const st = [sy * w + sx];
  while (st.length) {
    const p = st.pop(); if (out[p] || !ok(p)) continue; out[p] = 1; const x = p % w, y = (p / w) | 0;
    if (x > 0) st.push(p - 1); if (x < w - 1) st.push(p + 1); if (y > 0) st.push(p - w); if (y < h - 1) st.push(p + w);
  }
  return out;
}
function maskCanvasFrom(arr, w, h, color) {
  const c = mk(w, h), x = c.getContext('2d'), id = x.createImageData(w, h), o = id.data;
  const v = parseInt(color.slice(1), 16), R0 = v >> 16, G0 = (v >> 8) & 255, B0 = v & 255;
  for (let p = 0; p < arr.length; p++) if (arr[p]) { o[p * 4] = R0; o[p * 4 + 1] = G0; o[p * 4 + 2] = B0; o[p * 4 + 3] = 255; }
  x.putImageData(id, 0, 0); return c;
}

let needR = false;
const R = () => { if (!needR) { needR = true; requestAnimationFrame(render); } };
const checker = (() => { const c = mk(16, 16), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#d6d6d6'; x.fillRect(0, 0, 8, 8); x.fillRect(8, 8, 8, 8); return c; })();
let checkerPat = null, hover = null, antsOff = 0;
function resizeView() { const r = V.getBoundingClientRect(), dpr = devicePixelRatio || 1; V.width = r.width * dpr; V.height = r.height * dpr; R(); }
function fit() { if (!doc) return; const r = V.getBoundingClientRect(); view.zoom = Math.min((r.width - 40) / doc.w, (r.height - 40) / doc.h, 1) || 1; center(); }
function center() { const r = V.getBoundingClientRect(); view.px = (r.width - doc.w * view.zoom) / 2; view.py = (r.height - doc.h * view.zoom) / 2; R(); status(); }
function zoomAt(z, sx, sy) { z = clamp(z, 0.02, 64); const dx = (sx - view.px) / view.zoom, dy = (sy - view.py) / view.zoom; view.zoom = z; view.px = sx - dx * z; view.py = sy - dy * z; R(); status(); }
function toDoc(e) { const r = V.getBoundingClientRect(); return { x: (e.clientX - r.left - view.px) / view.zoom, y: (e.clientY - r.top - view.py) / view.zoom, sx: e.clientX - r.left, sy: e.clientY - r.top }; }
function render() {
  needR = false; const dpr = devicePixelRatio || 1;
  vx.setTransform(1, 0, 0, 1, 0, 0); vx.fillStyle = '#1b1b20'; vx.fillRect(0, 0, V.width, V.height);
  if (!doc) return;
  composite();
  const z = view.zoom;
  vx.setTransform(dpr * z, 0, 0, dpr * z, dpr * view.px, dpr * view.py);
  vx.shadowColor = '#0009'; vx.shadowBlur = 20; vx.fillStyle = '#fff'; vx.fillRect(0, 0, doc.w, doc.h); vx.shadowBlur = 0;
  if (!checkerPat) checkerPat = vx.createPattern(checker, 'repeat');
  vx.save(); vx.setTransform(dpr, 0, 0, dpr, dpr * view.px, dpr * view.py); vx.fillStyle = checkerPat; vx.fillRect(0, 0, doc.w * z, doc.h * z); vx.restore();
  vx.imageSmoothingEnabled = z < 2; vx.drawImage(comp, 0, 0);
  const lw = 1 / z;
  if (sel) {
    if (sel.path) { vx.lineWidth = lw; vx.setLineDash([]); vx.strokeStyle = '#fff'; vx.stroke(sel.path); vx.setLineDash([4 * lw, 4 * lw]); vx.lineDashOffset = antsOff * lw; vx.strokeStyle = '#000'; vx.stroke(sel.path); vx.setLineDash([]); }
    else { vx.imageSmoothingEnabled = false; vx.drawImage(selEdge(), 0, 0); }
  }
  T[tool].overlay && T[tool].overlay(vx, lw);
  if (tf) drawTransformBox(vx, lw);
  if (hover && (tool === 'brush' || tool === 'eraser')) { vx.lineWidth = lw; vx.strokeStyle = '#fff8'; vx.beginPath(); vx.arc(hover.x, hover.y, opt.size / 2, 0, 7); vx.stroke(); vx.strokeStyle = '#0008'; vx.beginPath(); vx.arc(hover.x, hover.y, opt.size / 2 + lw, 0, 7); vx.stroke(); }
}
setInterval(() => { if (sel && sel.path) { antsOff = (antsOff + 1) % 8; R(); } }, 120);

let drag = null, tf = null;
const T = {};
function brushDab(ctx, p, color) {
  const r = opt.size / 2, hd = opt.hardness;
  if (hd >= 0.99) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill(); return; }
  const g = ctx.createRadialGradient(p.x, p.y, r * hd, p.x, p.y, r); g.addColorStop(0, color); g.addColorStop(1, color + '00');
  ctx.fillStyle = g; ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
}
function lum(hex) { const v = parseInt(hex.slice(1), 16); return .299 * (v >> 16) + .587 * ((v >> 8) & 255) + .114 * (v & 255); }
function paintTool(erase) {
  return {
    cursor: 'crosshair',
    down(p) {
      const l = act(); if (!makeEditable(l)) return;
      const onMask = l.editMask && l.mask;
      let op = erase ? 'destination-out' : 'source-over', color = fg;
      if (onMask) { color = '#ffffff'; if (!erase && lum(fg) < 128) op = 'destination-out'; }
      drag = { stroke: mk(doc.w, doc.h), last: p, op, color, base: target(l) };
      brushDab(drag.stroke.getContext('2d'), p, color); this.upd();
    },
    move(p) {
      if (!drag) return; const sx = drag.stroke.getContext('2d'), d = Math.hypot(p.x - drag.last.x, p.y - drag.last.y), step = Math.max(1, opt.size * 0.12);
      for (let t = step; t <= d; t += step) brushDab(sx, { x: drag.last.x + (p.x - drag.last.x) * t / d, y: drag.last.y + (p.y - drag.last.y) * t / d }, drag.color);
      if (d >= step) drag.last = p; this.upd();
    },
    upd() { let s = drag.stroke; if (sel) { s = clone(s); maskApply(s, sel.mask); } const out = clone(drag.base), x = out.getContext('2d'); x.globalAlpha = opt.opacity; x.globalCompositeOperation = drag.op; x.drawImage(s, 0, 0); setLive(act(), out); },
    up() { if (!drag) return; drag = null; commitLive(erase ? 'Eraser' : 'Brush'); },
    opts: ['size', 'hardness', 'opacity'],
  };
}
T.brush = paintTool(false); T.eraser = paintTool(true);
T.move = {
  cursor: 'move',
  down(p) { const l = act(); if (l.locked) return toast('Layer is locked'); drag = { p, l, base: target(l), tx: l.x, ty: l.y }; },
  move(p) {
    if (!drag) return; const dx = Math.round(p.x - drag.p.x), dy = Math.round(p.y - drag.p.y), l = drag.l;
    if (l.type === 'text') { l.x = drag.tx + dx; l.y = drag.ty + dy; renderText(l); drag.moved = true; R(); return; }
    if (l.type === 'adjust' && !l.editMask) return;
    const out = mk(doc.w, doc.h), x = out.getContext('2d');
    if (l.editMask) { x.fillStyle = '#fff'; x.fillRect(0, 0, doc.w, doc.h); x.clearRect(dx, dy, doc.w, doc.h); }
    x.drawImage(drag.base, dx, dy); setLive(l, out);
  },
  up() { if (!drag) return; const moved = live || drag.moved; drag = null; if (moved) commitLive('Move'); },
};
function marquee(kind) {
  return {
    cursor: 'crosshair',
    down(p) { drag = { a: p, b: p }; },
    move(p, e) { if (!drag) return; let b = { x: p.x, y: p.y }; if (e.shiftKey) { const s = Math.max(Math.abs(b.x - drag.a.x), Math.abs(b.y - drag.a.y)); b = { x: drag.a.x + Math.sign(b.x - drag.a.x) * s, y: drag.a.y + Math.sign(b.y - drag.a.y) * s }; } drag.b = b; R(); },
    up() {
      if (!drag) return; const { a, b } = drag; drag = null;
      const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(a.x - b.x), h = Math.abs(a.y - b.y);
      if (w < 2 || h < 2) return deselect();
      const path = new Path2D(); if (kind === 'rect') path.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); else path.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      setSelFromPath(path);
    },
    overlay(c, lw) {
      if (!drag) return; const { a, b } = drag; c.lineWidth = lw; c.strokeStyle = '#ff7a3d'; c.setLineDash([4 * lw, 3 * lw]); c.beginPath();
      if (kind === 'rect') c.rect(a.x, a.y, b.x - a.x, b.y - a.y); else c.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, 7);
      c.stroke(); c.setLineDash([]);
    },
  };
}
T.marquee = marquee('rect'); T.ellipse = marquee('ellipse');
T.lasso = {
  cursor: 'crosshair',
  down(p) { drag = { pts: [p] }; },
  move(p) { if (drag) { drag.pts.push(p); R(); } },
  up() { if (!drag) return; const pts = drag.pts; drag = null; if (pts.length < 3) return deselect(); const path = new Path2D(); path.moveTo(pts[0].x, pts[0].y); pts.forEach(q => path.lineTo(q.x, q.y)); path.closePath(); setSelFromPath(path); },
  overlay(c, lw) { if (!drag) return; c.lineWidth = lw; c.strokeStyle = '#ff7a3d'; c.beginPath(); drag.pts.forEach((q, i) => i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)); c.stroke(); },
};
T.wand = {
  cursor: 'crosshair',
  down(p) { const src = opt.sampleAll ? composite(mk(doc.w, doc.h)) : layerSrc(act()); const m = floodMask(src, p.x, p.y, opt.tolerance, opt.contiguous); sel = { mask: maskCanvasFrom(m, doc.w, doc.h, '#ffffff'), path: null, edge: null }; R(); },
  opts: ['tolerance', 'contiguous', 'sampleAll'],
};
T.bucket = {
  cursor: 'crosshair',
  down(p) {
    const l = act(); if (!makeEditable(l)) return;
    const t = target(l), m = floodMask(opt.sampleAll ? composite(mk(doc.w, doc.h)) : t, p.x, p.y, opt.tolerance, opt.contiguous);
    const dark = lum(fg) < 128, fillC = maskCanvasFrom(m, doc.w, doc.h, l.editMask ? '#ffffff' : fg);
    setTarget(l, applied(t, c => { const x = c.getContext('2d'); if (l.editMask && dark) x.globalCompositeOperation = 'destination-out'; x.globalAlpha = opt.opacity; x.drawImage(fillC, 0, 0); }));
    commit('Paint Bucket');
  },
  opts: ['tolerance', 'contiguous', 'sampleAll', 'opacity'],
};
T.gradient = {
  cursor: 'crosshair',
  down(p) { const l = act(); if (!makeEditable(l)) return; drag = { a: p, b: p, base: target(l) }; },
  move(p) {
    if (!drag) return; drag.b = p; const { a, b } = drag, l = act(), onMask = l.editMask && l.mask;
    setLive(l, applied(drag.base, c => {
      const x = c.getContext('2d'), g = x.createLinearGradient(a.x, a.y, b.x, b.y);
      if (onMask) { x.clearRect(0, 0, c.width, c.height); g.addColorStop(0, `rgba(255,255,255,${lum(fg) / 255})`); g.addColorStop(1, `rgba(255,255,255,${lum(bg) / 255})`); }
      else { g.addColorStop(0, fg); g.addColorStop(1, bg); x.globalAlpha = opt.opacity; }
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    }));
  },
  up() { if (!drag) return; drag = null; if (live) commitLive('Gradient'); },
  overlay(c, lw) { if (!drag) return; c.lineWidth = 2 * lw; c.strokeStyle = '#fff'; c.beginPath(); c.moveTo(drag.a.x, drag.a.y); c.lineTo(drag.b.x, drag.b.y); c.stroke(); },
  opts: ['opacity'],
};
T.eyedropper = {
  cursor: 'crosshair',
  down(p) { this.pick(p); drag = 1; }, move(p) { if (drag) this.pick(p); }, up() { drag = null; },
  pick(p) { const d = cx2(comp).getImageData(clamp(p.x | 0, 0, doc.w - 1), clamp(p.y | 0, 0, doc.h - 1), 1, 1).data; setFg('#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('')); },
};
T.hand = { cursor: 'grab', down(p) { drag = { sx: p.sx, sy: p.sy, px: view.px, py: view.py }; }, move(p) { if (!drag) return; view.px = drag.px + p.sx - drag.sx; view.py = drag.py + p.sy - drag.sy; R(); }, up() { drag = null; } };
T.zoom = { cursor: 'zoom-in', down(p, e) { zoomAt(view.zoom * (e.altKey ? 1 / 1.5 : 1.5), p.sx, p.sy); } };
T.crop = {
  cursor: 'crosshair',
  down(p) { drag = { a: p, b: p }; this.rect = null; },
  move(p) { if (!drag) return; drag.b = p; const a = drag.a; this.rect = { x: Math.round(Math.min(a.x, p.x)), y: Math.round(Math.min(a.y, p.y)), w: Math.round(Math.abs(a.x - p.x)), h: Math.round(Math.abs(a.y - p.y)) }; R(); },
  up() { drag = null; if (this.rect && (this.rect.w < 2 || this.rect.h < 2)) this.rect = null; },
  apply() { if (!this.rect && sel) { const b = maskBounds(sel.mask); if (b) this.rect = b; } if (!this.rect) return toast('Drag a crop rectangle first'); const r = this.rect; this.rect = null; cropTo(r.x, r.y, r.w, r.h); },
  overlay(c, lw) { const r = this.rect; if (!r) return; c.fillStyle = '#0008'; c.beginPath(); c.rect(-1e5, -1e5, 2e5, 2e5); c.rect(r.x + r.w, r.y, -r.w, r.h); c.fill('evenodd'); c.strokeStyle = '#fff'; c.lineWidth = lw; c.strokeRect(r.x, r.y, r.w, r.h); },
};
T.text = {
  cursor: 'text',
  down(p) {
    const hit = [...doc.layers].reverse().find(l => l.type === 'text' && l.visible && p.x >= l.x && p.x <= l.x + l.bw && p.y >= l.y && p.y <= l.y + l.bh);
    if (hit) { doc.active = doc.layers.indexOf(hit); refreshAll(); return openTextEditor(hit, false); }
    const l = newLayer({ type: 'text', name: 'Text', text: '', font: opt.font, size: opt.fontSize, color: fg, bold: opt.bold, italic: opt.italic, x: Math.round(p.x), y: Math.round(p.y) });
    renderText(l); doc.layers.splice(doc.active + 1, 0, l); doc.active++; refreshLayers(); openTextEditor(l, true);
  },
  opts: ['font', 'fontSize', 'bold', 'italic'],
};
let textEd = null;
function openTextEditor(l, isNew) {
  closeTextEditor();
  const ta = document.createElement('textarea'); ta.id = 'textEdit'; ta.value = l.text; $('#stage').appendChild(ta);
  const place = () => { const z = view.zoom; Object.assign(ta.style, { left: view.px + l.x * z + 'px', top: view.py + l.y * z + 'px', width: (l.bw + l.size) * z + 'px', height: (l.bh + 4) * z + 'px', fontSize: l.size * z + 'px', fontFamily: l.font }); };
  place(); textEd = { ta, l, isNew, orig: l.text };
  ta.addEventListener('input', () => { l.text = ta.value; renderText(l); place(); R(); });
  ta.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); closeTextEditor(); } });
  ta.addEventListener('blur', () => setTimeout(() => { if (textEd && textEd.ta === ta) closeTextEditor(); }, 0));
  setTimeout(() => ta.focus(), 0);
}
function closeTextEditor() {
  if (!textEd) return; const { ta, l, isNew, orig } = textEd; textEd = null; ta.remove();
  if (!l.text.trim() && isNew) { doc.layers.splice(doc.layers.indexOf(l), 1); doc.active = clamp(doc.active - 1, 0, doc.layers.length - 1); refreshAll(); return; }
  l.name = l.text.split('\n')[0].slice(0, 24) || 'Text';
  if (isNew || l.text !== orig) commit(isNew ? 'Text' : 'Edit Text'); R();
}
function maskBounds(c) {
  const w = c.width, h = c.height, d = cx2(c).getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
function startTransform() {
  const l = act(); if (!l || !makeEditable(l)) return; if (l.type === 'adjust' && !l.editMask) return;
  let src = target(l); if (sel) { src = clone(src); maskApply(src, sel.mask); }
  const b = maskBounds(src); if (!b) return toast('Layer is empty');
  const rest = sel ? applied(target(l), c => c.getContext('2d').clearRect(0, 0, c.width, c.height)) : mk(doc.w, doc.h);
  tf = { l, src, rest, b, tx: b.x + b.w / 2, ty: b.y + b.h / 2, sx: 1, sy: 1, rot: 0 };
  tfLive(); buildOptions();
}
function tfLive() {
  const out = clone(tf.rest), x = out.getContext('2d'); x.translate(tf.tx, tf.ty); x.rotate(tf.rot); x.scale(tf.sx, tf.sy); x.drawImage(tf.src, -(tf.b.x + tf.b.w / 2), -(tf.b.y + tf.b.h / 2)); setLive(tf.l, out);
}
function tfCorners() { const { b, sx, sy, rot, tx, ty } = tf, c = Math.cos(rot), s = Math.sin(rot); return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => { const x = u * b.w / 2 * sx, y = v * b.h / 2 * sy; return { x: tx + x * c - y * s, y: ty + x * s + y * c }; }); }
function drawTransformBox(c, lw) { const pts = tfCorners(); c.lineWidth = lw; c.strokeStyle = '#ff7a3d'; c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)); c.closePath(); c.stroke(); c.fillStyle = '#fff'; pts.forEach(q => { c.fillRect(q.x - 4 * lw, q.y - 4 * lw, 8 * lw, 8 * lw); c.strokeRect(q.x - 4 * lw, q.y - 4 * lw, 8 * lw, 8 * lw); }); }
function tfLocal(p) { const dx = p.x - tf.tx, dy = p.y - tf.ty, c = Math.cos(-tf.rot), s = Math.sin(-tf.rot); return { x: dx * c - dy * s, y: dx * s + dy * c }; }
const TF = {
  down(p) {
    const corner = tfCorners().findIndex(q => Math.hypot(q.x - p.x, q.y - p.y) < 10 / view.zoom);
    const lp = tfLocal(p), inside = Math.abs(lp.x) <= tf.b.w / 2 * Math.abs(tf.sx) && Math.abs(lp.y) <= tf.b.h / 2 * Math.abs(tf.sy);
    drag = { mode: corner >= 0 ? 'scale' : inside ? 'move' : 'rotate', p, tx: tf.tx, ty: tf.ty, rot: tf.rot, a0: Math.atan2(p.y - tf.ty, p.x - tf.tx) };
  },
  move(p, e) {
    if (!drag) return;
    if (drag.mode === 'move') { tf.tx = drag.tx + p.x - drag.p.x; tf.ty = drag.ty + p.y - drag.p.y; }
    else if (drag.mode === 'rotate') { tf.rot = drag.rot + Math.atan2(p.y - tf.ty, p.x - tf.tx) - drag.a0; if (e.shiftKey) tf.rot = Math.round(tf.rot / (Math.PI / 12)) * Math.PI / 12; }
    else { const lp = tfLocal(p); let sx = Math.abs(lp.x) / (tf.b.w / 2), sy = Math.abs(lp.y) / (tf.b.h / 2); if (e.shiftKey) { const m = Math.max(sx, sy); sx = sy = m; } tf.sx = Math.sign(tf.sx) * Math.max(sx, 0.01); tf.sy = Math.sign(tf.sy) * Math.max(sy, 0.01); }
    tfLive(); buildOptionsValues();
  },
  up() { drag = null; },
};
function applyTransform() { if (!tf) return; tf = null; commitLive('Free Transform'); buildOptions(); }
function cancelTransform() { if (!tf) return; tf = null; live = null; R(); buildOptions(); }
function cancelTools() { tf = null; live = null; drag = null; if (T.crop) T.crop.rect = null; closeTextEditor(); }

function remap(nw, nh, fn, label) {
  for (const l of doc.layers) {
    if (l.type === 'text') { if (fn.text) fn.text(l); else l.type = 'raster'; }
    if (l.type === 'raster') { const c = mk(nw, nh); fn(c.getContext('2d'), l.canvas); l.canvas = c; }
    if (l.mask) { const inv = mk(doc.w, doc.h), ix = inv.getContext('2d'); ix.fillStyle = '#fff'; ix.fillRect(0, 0, doc.w, doc.h); ix.globalCompositeOperation = 'destination-out'; ix.drawImage(l.mask, 0, 0); const m = mk(nw, nh), x = m.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, nw, nh); x.globalCompositeOperation = 'destination-out'; fn(x, inv); l.mask = m; }
  }
  doc.w = nw; doc.h = nh; for (const l of doc.layers) if (l.type === 'text') renderText(l);
  comp = mk(nw, nh); sel = null; commit(label); fit();
}
function cropTo(x, y, w, h) { const f = (c, s) => c.drawImage(s, -x, -y); f.text = l => { l.x -= x; l.y -= y; }; remap(w, h, f, 'Crop'); }
function rotateCanvas(dir) { const W = doc.w, H = doc.h; remap(H, W, (c, s) => { if (dir > 0) { c.translate(H, 0); c.rotate(Math.PI / 2); } else { c.translate(0, W); c.rotate(-Math.PI / 2); } c.drawImage(s, 0, 0); }, 'Rotate Canvas'); }
function flipCanvas(h) { const W = doc.w, H = doc.h; remap(W, H, (c, s) => { if (h) { c.translate(W, 0); c.scale(-1, 1); } else { c.translate(0, H); c.scale(1, -1); } c.drawImage(s, 0, 0); }, h ? 'Flip Canvas Horizontal' : 'Flip Canvas Vertical'); }
function flipLayer(h) { const l = act(); if (!makeEditable(l)) return; const t = target(l), c = mk(doc.w, doc.h), x = c.getContext('2d'); if (h) { x.translate(doc.w, 0); x.scale(-1, 1); } else { x.translate(0, doc.h); x.scale(1, -1); } x.drawImage(t, 0, 0); setTarget(l, c); commit(h ? 'Flip Layer Horizontal' : 'Flip Layer Vertical'); }
function imageSize() {
  dialog('Image Size', [['width', 'Width (px)', 'number', doc.w], ['height', 'Height (px)', 'number', doc.h], ['keep', 'Keep ratio', 'check', true]], null, v => {
    let w = +v.width, h = +v.height; if (v.keep) { if (w !== doc.w) h = Math.round(doc.h * w / doc.w); else if (h !== doc.h) w = Math.round(doc.w * h / doc.h); }
    if (w < 1 || h < 1 || w > 16384 || h > 16384) return toast('Invalid size');
    const W = doc.w, H = doc.h, f = (c, s) => { c.imageSmoothingQuality = 'high'; c.drawImage(s, 0, 0, w, h); }; f.text = l => { l.x *= w / W; l.y *= h / H; l.size *= w / W; }; remap(w, h, f, 'Image Size');
  });
}
function canvasSize() {
  dialog('Canvas Size', [['width', 'Width (px)', 'number', doc.w], ['height', 'Height (px)', 'number', doc.h]], null, v => {
    const w = +v.width, h = +v.height, ox = Math.round((w - doc.w) / 2), oy = Math.round((h - doc.h) / 2); if (w < 1 || h < 1) return;
    const f = (c, s) => c.drawImage(s, ox, oy); f.text = l => { l.x += ox; l.y += oy; }; remap(w, h, f, 'Canvas Size');
  });
}

function addLayer(l, label) { doc.layers.splice(doc.active + 1, 0, l); doc.active = doc.layers.indexOf(l); commit(label); }
function delLayer() { if (!doc || doc.layers.length < 2) return toast("Can't delete the only layer"); doc.layers.splice(doc.active, 1); doc.active = clamp(doc.active - 1, 0, doc.layers.length - 1); commit('Delete Layer'); }
function dupLayer() { const l = act(); const c = snapLayer(l); c.id = uid++; c.name = l.name + ' copy'; addLayer(c, 'Duplicate Layer'); }
function addMask(silent) { const l = act(); if (!l || l.mask) return; l.mask = mk(doc.w, doc.h); const x = l.mask.getContext('2d'); x.fillStyle = '#fff'; if (sel) x.drawImage(sel.mask, 0, 0); else x.fillRect(0, 0, doc.w, doc.h); l.editMask = true; if (!silent) { setFg('#000000'); setBg('#ffffff'); commit('Add Layer Mask'); } }
function deleteMask() { const l = act(); if (!l.mask) return; l.mask = null; l.editMask = false; commit('Delete Layer Mask'); }
function applyMask() { const l = act(); if (!l.mask || l.type === 'adjust') return; if (l.type === 'text') l.type = 'raster'; const c = clone(l.canvas); maskApply(c, l.mask); l.canvas = c; l.mask = null; l.editMask = false; commit('Apply Layer Mask'); }
function addAdjLayer(t) { if (!doc) return; const l = newLayer({ type: 'adjust', adj: t, p: adjDefaults(t), name: ADJ[t].name, canvas: mk(1, 1) }); doc.layers.splice(doc.active + 1, 0, l); doc.active++; addMask(true); l.editMask = false; commit('New ' + ADJ[t].name + ' Layer'); }
function mergeDown() {
  const i = doc.active; if (i < 1) return toast('No layer below');
  const up = doc.layers[i], lo = doc.layers[i - 1];
  if (lo.type === 'adjust') return toast('Cannot merge onto an adjustment layer');
  const base = mk(doc.w, doc.h); if (lo.visible) drawLayerOnto(base.getContext('2d'), Object.assign({}, lo, { blend: 'source-over' }), base);
  if (up.visible) drawLayerOnto(base.getContext('2d'), up, base);
  const n = newLayer({ name: lo.name, canvas: base, blend: lo.blend });
  doc.layers.splice(i - 1, 2, n); doc.active = i - 1; commit('Merge Down');
}
function flatten() { const c = composite(mk(doc.w, doc.h)); const l = newLayer({ name: 'Background', canvas: c }); doc.layers = [l]; doc.active = 0; commit('Flatten Image'); }
function rasterize() { const l = act(); if (l.type === 'text') { l.type = 'raster'; commit('Rasterize'); } else if (l.type === 'adjust') toast('Use Merge Down to bake an adjustment layer'); }

function runFilter(key) {
  const l = act(); if (!l || !makeEditable(l)) return;
  const f = FILTERS[key], base = target(l);
  const fields = f.params.map(([k, a, b, v, s]) => [k, k[0].toUpperCase() + k.slice(1), 'range', v, a, b, s]);
  const prev = vals => setLive(l, applied(base, c => f.fn(c, vals)));
  dialog(f.name, fields, prev, vals => { prev(vals); commitLive(f.name); }, () => { live = null; R(); });
}
function destructiveAdj(t) {
  const l = act(); if (!l) return; if (l.type === 'adjust' && !l.editMask) return toast('Select a pixel layer'); if (!makeEditable(l)) return;
  const base = target(l), a = ADJ[t];
  const prev = vals => setLive(l, applied(base, c => applyAdj(c, t, vals)));
  if (!a.params.length) { setTarget(l, applied(base, c => applyAdj(c, t, {}))); return commit(a.name); }
  dialog(a.name, a.params.map(([k, mn, mx, v, s]) => [k, k[0].toUpperCase() + k.slice(1), 'range', v, mn, mx, s]), prev, vals => { prev(vals); commitLive(a.name); }, () => { live = null; R(); });
}

function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
async function fileToCanvas(file) { const url = URL.createObjectURL(file); try { const img = await loadImg(url); const c = mk(img.naturalWidth, img.naturalHeight); c.getContext('2d').drawImage(img, 0, 0); return c; } finally { URL.revokeObjectURL(url); } }
async function openFile(file, asLayer) {
  try {
    const n = file.name.toLowerCase();
    if (n.endsWith('.pforge') || n.endsWith('.json')) return await loadProject(JSON.parse(await file.text()));
    if (n.endsWith('.psd')) return importPsd(await file.arrayBuffer(), file.name);
    const c = await fileToCanvas(file);
    if (asLayer && doc) { const l = newLayer({ name: file.name.replace(/\.\w+$/, '') }); l.canvas.getContext('2d').drawImage(c, Math.round((doc.w - c.width) / 2), Math.round((doc.h - c.height) / 2)); addLayer(l, 'Place Image'); }
    else { doc = { w: c.width, h: c.height, layers: [], active: 0, name: file.name.replace(/\.\w+$/, '') }; uid = 1; doc.layers.push(newLayer({ name: 'Background', canvas: c })); afterDocLoad('Open'); }
  } catch (e) { console.warn(e); toast('Could not open ' + file.name); }
}
function exportBlob(format, quality) {
  return new Promise(res => {
    const c = composite(mk(doc.w, doc.h)); let out = c;
    if (format === 'jpeg') { out = mk(doc.w, doc.h); const x = out.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, doc.w, doc.h); x.drawImage(c, 0, 0); }
    out.toBlob(res, 'image/' + format, quality);
  });
}
function exportDialog() {
  if (!doc) return;
  dialog('Export Image', [['name', 'File name', 'text', doc.name], ['format', 'Format', 'select', 'png', ['png', 'jpeg', 'webp']], ['quality', 'Quality (JPG/WebP)', 'range', 0.92, 0.1, 1, 0.01]], null, async v => {
    const b = await exportBlob(v.format, +v.quality); download(b, `${v.name || 'image'}.${v.format === 'jpeg' ? 'jpg' : v.format}`);
  });
}
function projectData() { return { app: 'PixelForge', version: 1, w: doc.w, h: doc.h, name: doc.name, active: doc.active, layers: doc.layers.map(l => { const o = Object.assign({}, l); o.canvas = l.type === 'raster' ? l.canvas.toDataURL() : null; o.mask = l.mask && l.mask.toDataURL(); o.editMask = false; return o; }) }; }
function saveProject() { if (!doc) return; download(new Blob([JSON.stringify(projectData())], { type: 'application/json' }), (doc.name || 'project') + '.pforge'); toast('Project saved'); }
async function loadProject(d) {
  if (d.app !== 'PixelForge') return toast('Not a PixelForge project');
  doc = { w: d.w, h: d.h, layers: [], active: d.active || 0, name: d.name || 'Project' }; uid = 1;
  for (const o of d.layers) {
    const l = Object.assign({}, o); l.id = uid++;
    l.canvas = mk(d.w, d.h); if (o.canvas) l.canvas.getContext('2d').drawImage(await loadImg(o.canvas), 0, 0);
    if (o.mask) { l.mask = mk(d.w, d.h); l.mask.getContext('2d').drawImage(await loadImg(o.mask), 0, 0); }
    if (l.type === 'adjust') l.canvas = mk(1, 1);
    doc.layers.push(l);
  }
  for (const l of doc.layers) if (l.type === 'text') renderText(l);
  afterDocLoad('Open Project');
}
function importPsd(buf, name) {
  if (!window.agPsd) return toast('PSD support failed to load');
  const psd = agPsd.readPsd(buf, { skipThumbnail: true });
  doc = { w: psd.width, h: psd.height, layers: [], active: 0, name: name.replace(/\.psd$/i, '') }; uid = 1;
  const walk = (arr, hidden) => {
    for (const ch of arr || []) {
      if (ch.children) { walk(ch.children, hidden || ch.hidden); continue; }
      const l = newLayer({ name: ch.name || 'Layer', opacity: ch.opacity ?? 1, blend: fromPsdBlend(ch.blendMode), visible: !(hidden || ch.hidden) });
      if (ch.canvas) l.canvas.getContext('2d').drawImage(ch.canvas, ch.left || 0, ch.top || 0);
      if (ch.mask && ch.mask.canvas) {
        const m = mk(doc.w, doc.h), mx = m.getContext('2d'); if ((ch.mask.defaultColor ?? 255) > 127) { mx.fillStyle = '#fff'; mx.fillRect(0, 0, doc.w, doc.h); }
        const mc = ch.mask.canvas, id = cx2(mc).getImageData(0, 0, mc.width, mc.height);
        for (let j = 0; j < id.data.length; j += 4) { id.data[j + 3] = id.data[j]; id.data[j] = id.data[j + 1] = id.data[j + 2] = 255; }
        const t = mk(mc.width, mc.height); t.getContext('2d').putImageData(id, 0, 0); mx.clearRect(ch.mask.left || 0, ch.mask.top || 0, mc.width, mc.height); mx.drawImage(t, ch.mask.left || 0, ch.mask.top || 0); l.mask = m;
      }
      doc.layers.push(l);
    }
  };
  walk(psd.children);
  if (!doc.layers.length && psd.canvas) { const l = newLayer({ name: 'Background' }); l.canvas.getContext('2d').drawImage(psd.canvas, 0, 0); doc.layers.push(l); }
  doc.active = doc.layers.length - 1; afterDocLoad('Open PSD');
}
function psdBuffer() {
  let skipped = 0; const children = [];
  for (const l of doc.layers) {
    if (l.type === 'adjust') { skipped++; continue; }
    const ch = { name: l.name, canvas: l.canvas, opacity: l.opacity, blendMode: toPsdBlend(l.blend), hidden: !l.visible, left: 0, top: 0 };
    if (l.mask) { const m = mk(doc.w, doc.h), x = m.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, doc.w, doc.h); x.drawImage(l.mask, 0, 0); ch.mask = { canvas: m, left: 0, top: 0, defaultColor: 0, disabled: !l.maskOn }; }
    children.push(ch);
  }
  return { buf: agPsd.writePsd({ width: doc.w, height: doc.h, children, canvas: composite(mk(doc.w, doc.h)) }), skipped };
}
function exportPsd() {
  if (!doc || !window.agPsd) return;
  const { buf, skipped } = psdBuffer();
  download(new Blob([buf]), (doc.name || 'image') + '.psd'); if (skipped) toast(`${skipped} adjustment layer(s) not exported to PSD — merge them down first`);
}
let toastT;
function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }
let dlgCb = null;
function dialog(title, fields, onInput, onOk, onCancel) {
  $('#dlgTitle').textContent = title; const body = $('#dlgBody'); body.innerHTML = '';
  const get = () => { const v = {}; body.querySelectorAll('[data-k]').forEach(e => v[e.dataset.k] = e.type === 'checkbox' ? e.checked : e.type === 'range' || e.type === 'number' ? +e.value : e.value); return v; };
  for (const [k, label, type, val, a, b, s] of fields) {
    const f = document.createElement('div'); f.className = 'f'; f.innerHTML = `<label>${label}</label>`;
    let el;
    if (type === 'select') { el = document.createElement('select'); a.forEach(o => el.add(new Option(o, o))); el.value = val; }
    else if (type === 'check') { el = document.createElement('input'); el.type = 'checkbox'; el.checked = val; }
    else { el = document.createElement('input'); el.type = type; if (type === 'range') { el.min = a; el.max = b; el.step = s; } el.value = val; }
    el.dataset.k = k; f.appendChild(el);
    if (type === 'range') { const n = document.createElement('input'); n.type = 'number'; n.value = val; n.step = s; n.oninput = () => { el.value = n.value; el.dispatchEvent(new Event('input')); }; el.addEventListener('input', () => n.value = el.value); f.appendChild(n); }
    el.addEventListener('input', () => onInput && onInput(get()));
    body.appendChild(f);
  }
  $('#dlgCancel').hidden = !fields.length;
  $('#modal').hidden = false; dlgCb = { ok: () => onOk(get()), cancel: onCancel };
  if (onInput) onInput(get());
  const first = body.querySelector('input,select'); (first || $('#dlgOk')).focus();
}
function closeDlg(ok) { const cb = dlgCb; dlgCb = null; $('#modal').hidden = true; document.activeElement && document.activeElement.blur(); if (!cb) return; ok ? cb.ok() : cb.cancel && cb.cancel(); }
$('#dlgOk').onclick = () => closeDlg(true); $('#dlgCancel').onclick = () => closeDlg(false);
$('#modal').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); closeDlg(true); } if (e.key === 'Escape') closeDlg(false); });
function newDocDialog() { dialog('New Document', [['width', 'Width (px)', 'number', 1920], ['height', 'Height (px)', 'number', 1080], ['bg', 'Background', 'select', 'white', ['white', 'black', 'transparent']]], null, v => { const w = clamp(+v.width | 0, 1, 16384), h = clamp(+v.height | 0, 1, 16384); newDoc(w, h, v.bg === 'white' ? '#ffffff' : v.bg === 'black' ? '#000000' : 'transparent'); }); }
function info(title, html) { dialog(title, [], null, () => {}); $('#dlgBody').innerHTML = html; }

const need = f => () => { if (!doc) return toast('Open or create a document first'); f(); };
const zc = f => need(() => zoomAt(f(view.zoom), V.clientWidth / 2, V.clientHeight / 2));
const MENUS = {
  File: [['New…', 'Alt+N', newDocDialog], ['Open…', 'Ctrl+O', () => $('#fileIn').click()], ['Place Image as Layer…', 'Shift+Ctrl+P', need(() => $('#placeIn').click())], '-', ['Save Project (.pforge)', 'Shift+Ctrl+S', need(saveProject)], ['Export Image (PNG/JPG/WebP)…', 'Ctrl+S', need(exportDialog)], ['Export PSD', '', need(exportPsd)]],
  Edit: [['Undo', 'Ctrl+Z', undo], ['Redo', 'Shift+Ctrl+Z', redo], '-', ['Free Transform', 'Ctrl+T', need(startTransform)], ['Flip Layer Horizontal', '', need(() => flipLayer(true))], ['Flip Layer Vertical', '', need(() => flipLayer(false))], '-', ['Fill with Foreground', 'Alt+Backspace', need(() => fillSel(fg))], ['Clear', 'Delete', need(clearSel)]],
  Image: [...Object.keys(ADJ).map(k => ['Adjustments ▸ ' + ADJ[k].name + (ADJ[k].params.length ? '…' : ''), { 'hue-saturation': 'Ctrl+U', levels: 'Ctrl+L', invert: 'Ctrl+I', grayscale: 'Shift+Ctrl+U' }[k] || '', need(() => destructiveAdj(k))]), '-', ['Image Size…', 'Alt+Ctrl+I', need(imageSize)], ['Canvas Size…', '', need(canvasSize)], ['Crop to Selection', '', need(() => T.crop.apply())], '-', ['Rotate Canvas 90° CW', '', need(() => rotateCanvas(1))], ['Rotate Canvas 90° CCW', '', need(() => rotateCanvas(-1))], ['Flip Canvas Horizontal', '', need(() => flipCanvas(true))], ['Flip Canvas Vertical', '', need(() => flipCanvas(false))]],
  Layer: [['New Layer', 'Shift+Ctrl+N', need(() => addLayer(newLayer(), 'New Layer'))], ['Duplicate Layer', 'Ctrl+J', need(dupLayer)], ['Delete Layer', '', need(delLayer)], '-', ...Object.keys(ADJ).map(k => ['New Adjustment Layer ▸ ' + ADJ[k].name, '', need(() => addAdjLayer(k))]), '-', ['Add Layer Mask', '', need(() => addMask())], ['Apply Layer Mask', '', need(applyMask)], ['Delete Layer Mask', '', need(deleteMask)], '-', ['Rasterize Layer', '', need(rasterize)], ['Merge Down', 'Ctrl+E', need(mergeDown)], ['Flatten Image', '', need(flatten)]],
  Select: [['All', 'Ctrl+A', need(selectAll)], ['Deselect', 'Ctrl+D', deselect], ['Inverse', 'Shift+Ctrl+I', need(invertSel)], ['Select Layer Pixels', '', need(() => { sel = { mask: clone(layerSrc(act())), path: null, edge: null }; R(); })]],
  Filter: Object.keys(FILTERS).map(k => [FILTERS[k].name + '…', '', need(() => runFilter(k))]),
  View: [['Zoom In', 'Ctrl++', zc(z => z * 1.25)], ['Zoom Out', 'Ctrl+-', zc(z => z / 1.25)], ['Fit on Screen', 'Ctrl+0', need(fit)], ['Actual Pixels', 'Ctrl+1', need(() => { view.zoom = 1; center(); })]],
  Help: [['Keyboard Shortcuts', '', showShortcuts], ['About PixelForge', '', () => info('About PixelForge', '<p>PixelForge is a free, open-source image editor that runs 100% in your browser. Nothing is uploaded.</p><p>PSD support uses <a style="color:#ff7a3d" href="https://github.com/Agamnentzar/ag-psd" target="_blank" rel="noopener">ag-psd</a> (MIT).</p>')]],
};
function showShortcuts() { info('Keyboard Shortcuts', '<div style="columns:2;font-size:12px;line-height:1.8">' + TOOLS.map(t => `<div><b>${t[3]}</b> ${t[2]}</div>`).join('') + '<div><b>X</b> swap colors</div><div><b>D</b> default colors</div><div><b>[ ]</b> brush size</div><div><b>Space</b> pan</div><div><b>Ctrl+Z</b> undo</div><div><b>Shift+Ctrl+Z</b> redo</div><div><b>Ctrl+T</b> transform</div><div><b>Enter / Esc</b> apply / cancel</div><div><b>Ctrl+S</b> export</div><div><b>Shift+Ctrl+S</b> save project</div><div><b>Ctrl+J</b> duplicate</div><div><b>Ctrl+E</b> merge down</div><div><b>Ctrl+A / Ctrl+D</b> select all / none</div><div><b>Del</b> clear</div><div><b>Wheel</b> zoom</div><div><b>Ctrl+0 / Ctrl+1</b> fit / 100%</div></div>'); }
const menusEl = $('#menus'), dd = $('#dropdown'); let openMenu = null;
for (const name of Object.keys(MENUS)) {
  const m = document.createElement('div'); m.textContent = name; m.dataset.menu = name; menusEl.appendChild(m);
  const show = () => { openMenu && openMenu.classList.remove('open'); openMenu = m; m.classList.add('open'); dd.innerHTML = ''; for (const it of MENUS[name]) { if (it === '-') { dd.insertAdjacentHTML('beforeend', '<div class="sep"></div>'); continue; } const d = document.createElement('div'); d.className = 'it'; d.innerHTML = `<b style="font-weight:400"></b><span></span>`; d.firstChild.textContent = it[0]; d.lastChild.textContent = it[1]; d.onclick = () => { hideMenu(); it[2](); }; dd.appendChild(d); } const r = m.getBoundingClientRect(); dd.style.left = r.left + 'px'; dd.style.top = r.bottom + 'px'; dd.hidden = false; };
  m.onclick = e => { e.stopPropagation(); openMenu === m ? hideMenu() : show(); };
  m.onmouseenter = () => { if (openMenu && openMenu !== m) show(); };
}
function hideMenu() { dd.hidden = true; openMenu && openMenu.classList.remove('open'); openMenu = null; }
document.addEventListener('pointerdown', e => { if (!dd.contains(e.target) && !menusEl.contains(e.target)) hideMenu(); });

const TOOLS = [['move', '✥', 'Move', 'V'], ['marquee', '⬚', 'Rectangular Marquee', 'M'], ['ellipse', '◯', 'Elliptical Marquee', 'Shift+M'], ['lasso', '➰', 'Lasso', 'L'], ['wand', '✨', 'Magic Wand', 'W'], ['crop', '⌗', 'Crop', 'C'], ['eyedropper', '💧', 'Eyedropper', 'I'], ['brush', '🖌', 'Brush', 'B'], ['eraser', '⌫', 'Eraser', 'E'], ['bucket', '🪣', 'Paint Bucket', 'Shift+G'], ['gradient', '▤', 'Gradient', 'G'], ['text', 'T', 'Text', 'T'], ['hand', '✋', 'Hand', 'H'], ['zoom', '🔍', 'Zoom (Alt = out)', 'Z']];
const toolsEl = $('#tools');
for (const [id, ic, name, key] of TOOLS) { const b = document.createElement('button'); b.className = 'tool'; b.dataset.tool = id; b.textContent = ic; b.title = `${name} (${key})`; b.onclick = () => setTool(id); toolsEl.appendChild(b); }
toolsEl.insertAdjacentHTML('beforeend', '<div class="swatches"><div id="fgSw" title="Foreground color"></div><div id="bgSw" title="Background color"></div><input type="color" id="fgIn"><input type="color" id="bgIn"></div>');
$('#fgSw').onclick = () => $('#fgIn').click(); $('#bgSw').onclick = () => $('#bgIn').click();
$('#fgIn').oninput = e => setFg(e.target.value); $('#bgIn').oninput = e => setBg(e.target.value);
function setFg(c) { fg = c; $('#fgSw').style.background = c; $('#fgIn').value = c; }
function setBg(c) { bg = c; $('#bgSw').style.background = c; $('#bgIn').value = c; }
setFg(fg); setBg(bg);
function setTool(id) { if (tf) applyTransform(); closeTextEditor(); if (tool === 'crop' && id !== 'crop') T.crop.rect = null; tool = id; toolsEl.querySelectorAll('.tool').forEach(b => b.classList.toggle('on', b.dataset.tool === id)); V.style.cursor = T[id].cursor || 'default'; buildOptions(); R(); }
const OPTDEF = {
  size: ['Size', 'range', 1, 500, 1], hardness: ['Hardness', 'range', 0, 1, 0.01], opacity: ['Opacity', 'range', 0.01, 1, 0.01], tolerance: ['Tolerance', 'range', 0, 255, 1],
  contiguous: ['Contiguous', 'check'], sampleAll: ['Sample all layers', 'check'], font: ['Font', 'select', FONTS], fontSize: ['Size', 'number', 4, 1000, 1], bold: ['Bold', 'check'], italic: ['Italic', 'check'],
};
function hint(t) { $('#options').insertAdjacentHTML('beforeend', `<span style="color:#888">${t}</span>`); }
function buildOptions() {
  const o = $('#options'); o.innerHTML = '';
  const name = (TOOLS.find(t => t[0] === tool) || [])[2];
  o.insertAdjacentHTML('beforeend', `<span class="tname">${tf ? 'Free Transform' : name}</span>`);
  if (tf) {
    o.insertAdjacentHTML('beforeend', `<label>W <input id="tfW" type="number">%</label><label>H <input id="tfH" type="number">%</label><label>Angle <input id="tfR" type="number">°</label><button id="tfOk" class="primary">✓ Apply (Enter)</button><button id="tfNo">✕ Cancel (Esc)</button>`);
    hint('Drag inside to move · corners to scale (Shift = proportional) · outside to rotate');
    const upd = () => { tf.sx = (+$('#tfW').value || 100) / 100; tf.sy = (+$('#tfH').value || 100) / 100; tf.rot = (+$('#tfR').value || 0) * Math.PI / 180; tfLive(); };
    ['#tfW', '#tfH', '#tfR'].forEach(s => $(s).oninput = upd); $('#tfOk').onclick = applyTransform; $('#tfNo').onclick = cancelTransform; buildOptionsValues(); return;
  }
  for (const k of T[tool].opts || []) {
    const [lab, type, a, b, s] = OPTDEF[k]; const L = document.createElement('label'); L.textContent = lab + ' '; let el;
    if (type === 'select') { el = document.createElement('select'); a.forEach(f => el.add(new Option(f, f))); el.value = opt[k]; el.onchange = () => { opt[k] = el.value; textProp(k, el.value); }; }
    else if (type === 'check') { el = document.createElement('input'); el.type = 'checkbox'; el.checked = opt[k]; el.onchange = () => { opt[k] = el.checked; textProp(k, el.checked); }; }
    else { el = document.createElement('input'); el.type = type; el.min = a; el.max = b; el.step = s; el.value = opt[k]; el.dataset.opt = k; const out = document.createElement('span'); out.style.minWidth = '34px'; const show = () => out.textContent = type === 'range' ? (s < 1 ? Math.round(opt[k] * 100) + '%' : opt[k]) : ''; show(); el.oninput = () => { opt[k] = +el.value; show(); R(); }; if (k === 'fontSize') el.onchange = () => textProp('size', +el.value); L.appendChild(el); L.appendChild(out); o.appendChild(L); continue; }
    L.appendChild(el); o.appendChild(L);
  }
  if (tool === 'crop') { o.insertAdjacentHTML('beforeend', '<button id="cropOk" class="primary">✓ Crop (Enter)</button>'); $('#cropOk').onclick = () => T.crop.apply(); hint('Drag a rectangle, then Enter. With an active selection, Enter crops to it.'); }
  if (tool === 'move') hint('Drag to move the active layer · Ctrl+T free transform');
  if (tool === 'text') hint('Click to add text, click existing text to edit · Ctrl+Enter / Esc to finish');
  if (tool === 'brush' || tool === 'eraser') hint('[ ] change size · on a mask: black hides, white reveals');
  if (tool === 'gradient') hint('Drag from foreground to background color');
}
function textProp(k, v) { const l = act(); if (!l || l.type !== 'text' || tool !== 'text') return; l[k] = v; renderText(l); commit('Text Style'); }
function buildOptionsValues() { if (!tf || !$('#tfW')) return; $('#tfW').value = Math.round(tf.sx * 100); $('#tfH').value = Math.round(tf.sy * 100); $('#tfR').value = Math.round(tf.rot * 180 / Math.PI); }

const blendSel = $('#blend'); BLENDS.forEach(([n, v]) => blendSel.add(new Option(n, v)));
blendSel.onchange = () => { const l = act(); if (l) { l.blend = blendSel.value; commit('Blend Mode: ' + blendSel.selectedOptions[0].text); } };
$('#opacity').oninput = () => { const l = act(); if (l) { l.opacity = clamp(+$('#opacity').value, 0, 100) / 100; R(); } };
$('#opacity').onchange = () => act() && commit('Opacity');
$('#opacity').onkeydown = e => e.stopPropagation();
document.querySelectorAll('.lbtns button').forEach(b => b.onclick = e => {
  if (!doc) return; const a = b.dataset.a;
  if (a === 'newLayer') addLayer(newLayer(), 'New Layer'); else if (a === 'dupLayer') dupLayer(); else if (a === 'delLayer') delLayer(); else if (a === 'mergeDown') mergeDown(); else if (a === 'addMask') { if (act().mask) toast('Layer already has a mask'); else addMask(); }
  else if (a === 'adjMenu') { hideMenu(); dd.innerHTML = ''; Object.keys(ADJ).forEach(k => { const d = document.createElement('div'); d.className = 'it'; d.textContent = ADJ[k].name; d.onclick = () => { hideMenu(); addAdjLayer(k); }; dd.appendChild(d); }); dd.hidden = false; const r = b.getBoundingClientRect(); dd.style.left = Math.min(r.left, innerWidth - 240) + 'px'; dd.style.top = (r.top - dd.offsetHeight - 4) + 'px'; e.stopPropagation(); }
});
function thumb(c, src, mask) { const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); if (mask) { x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height); } const s = Math.min(c.width / doc.w, c.height / doc.h); x.drawImage(src, (c.width - doc.w * s) / 2, (c.height - doc.h * s) / 2, doc.w * s, doc.h * s); }
let dragIdx = null;
function refreshLayers() {
  const list = $('#layerList'); list.innerHTML = ''; if (!doc) return;
  for (let i = doc.layers.length - 1; i >= 0; i--) {
    const l = doc.layers[i], row = document.createElement('div'); row.className = 'layer' + (i === doc.active ? ' sel' : ''); row.draggable = true; row.dataset.i = i;
    const eye = document.createElement('span'); eye.className = 'eye' + (l.visible ? '' : ' off'); eye.textContent = '👁'; eye.title = 'Toggle visibility';
    eye.onclick = e => { e.stopPropagation(); l.visible = !l.visible; commit(l.visible ? 'Show Layer' : 'Hide Layer'); };
    row.appendChild(eye);
    if (l.type === 'adjust') { const ic = document.createElement('div'); ic.className = 'ico'; ic.textContent = '◐'; ic.onclick = () => { l.editMask = false; }; if (!l.editMask) ic.style.outline = '2px solid #ff7a3d'; row.appendChild(ic); }
    else { const c = mk(36, 28); c.className = 'lt'; thumb(c, l.canvas); if (!(l.editMask && l.mask)) c.classList.add('tgt'); c.onclick = () => { l.editMask = false; }; row.appendChild(c); }
    if (l.mask) { const m = mk(36, 28); m.className = 'mk' + (l.editMask ? ' tgt' : ''); thumb(m, l.mask, true); if (!l.maskOn) m.style.opacity = .35; m.title = 'Click: edit mask · Shift+click: enable/disable'; m.onclick = e => { if (e.shiftKey) { e.stopPropagation(); l.maskOn = !l.maskOn; commit(l.maskOn ? 'Enable Mask' : 'Disable Mask'); return; } l.editMask = true; }; row.appendChild(m); }
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = (l.type === 'text' ? 'T  ' : '') + l.name; nm.title = 'Double-click to rename';
    nm.ondblclick = () => { const n = prompt('Layer name', l.name); if (n) { l.name = n; commit('Rename Layer'); } };
    row.appendChild(nm);
    const lk = document.createElement('span'); lk.className = 'lock'; lk.textContent = l.locked ? '🔒' : '🔓'; lk.style.opacity = l.locked ? 1 : .3; lk.title = 'Lock layer'; lk.onclick = e => { e.stopPropagation(); l.locked = !l.locked; commit(l.locked ? 'Lock Layer' : 'Unlock Layer'); }; row.appendChild(lk);
    row.onclick = () => { doc.active = i; refreshAll(); };
    row.ondragstart = () => { dragIdx = i; }; row.ondragover = e => { e.preventDefault(); row.classList.add('dragover'); }; row.ondragleave = () => row.classList.remove('dragover');
    row.ondrop = e => { e.preventDefault(); e.stopPropagation(); row.classList.remove('dragover'); if (dragIdx === null || dragIdx === i) return; const [m] = doc.layers.splice(dragIdx, 1); doc.layers.splice(i, 0, m); doc.active = i; dragIdx = null; commit('Reorder Layers'); };
    list.appendChild(row);
  }
  const l = act(); blendSel.value = l.blend; $('#opacity').value = Math.round(l.opacity * 100); blendSel.disabled = l.type === 'adjust';
}
function field(p, label, el) { const f = document.createElement('div'); f.className = 'f'; const L = document.createElement('label'); L.textContent = label; f.append(L, ...[].concat(el)); p.appendChild(f); }
function refreshProps() {
  const p = $('#props'); p.innerHTML = ''; const l = act(); if (!l) return;
  const title = document.createElement('div'); title.style.cssText = 'color:#fff;margin-bottom:4px'; p.appendChild(title);
  if (l.type === 'adjust') {
    const a = ADJ[l.adj]; title.textContent = a.name + ' (adjustment layer)';
    for (const [k, mn, mx, , s] of a.params) {
      const r = document.createElement('input'); r.type = 'range'; r.min = mn; r.max = mx; r.step = s; r.value = l.p[k]; r.dataset.p = k; const n = document.createElement('input'); n.type = 'number'; n.step = s; n.value = l.p[k];
      r.oninput = () => { l.p[k] = +r.value; n.value = r.value; R(); }; n.oninput = () => { l.p[k] = +n.value; r.value = n.value; R(); }; r.onchange = n.onchange = () => commit('Edit ' + a.name); n.onkeydown = e => e.stopPropagation();
      field(p, k, [r, n]);
    }
    if (!a.params.length) p.insertAdjacentHTML('beforeend', '<div style="color:#888">No settings.</div>');
    p.insertAdjacentHTML('beforeend', '<div style="color:#888;margin-top:6px">Affects all layers below. Paint on its mask to limit where it applies.</div>');
  } else if (l.type === 'text') {
    title.textContent = 'Text layer';
    const ta = document.createElement('textarea'); ta.value = l.text; p.appendChild(ta);
    const font = document.createElement('select'); FONTS.forEach(f => font.add(new Option(f, f))); font.value = l.font; field(p, 'Font', font);
    const size = document.createElement('input'); size.type = 'number'; size.min = 4; size.max = 1000; size.value = l.size; field(p, 'Size', size);
    const col = document.createElement('input'); col.type = 'color'; col.value = l.color; field(p, 'Color', col);
    const bold = document.createElement('input'); bold.type = 'checkbox'; bold.checked = l.bold; const it = document.createElement('input'); it.type = 'checkbox'; it.checked = l.italic; field(p, 'Bold / Italic', [bold, it]);
    const upd = () => { l.text = ta.value; l.font = font.value; l.size = +size.value || 12; l.color = col.value; l.bold = bold.checked; l.italic = it.checked; renderText(l); R(); };
    [ta, font, size, col, bold, it].forEach(e => { e.oninput = upd; e.onchange = () => { upd(); l.name = l.text.split('\n')[0].slice(0, 24) || 'Text'; commit('Edit Text'); }; e.onkeydown = ev => ev.stopPropagation(); });
  } else { title.textContent = l.name; p.insertAdjacentHTML('beforeend', `<div style="color:#888">Pixel layer · ${doc.w}×${doc.h}</div>`); }
  const btns = document.createElement('div'); btns.className = 'btns'; p.appendChild(btns);
  const btn = (t, f) => { const b = document.createElement('button'); b.textContent = t; b.onclick = f; btns.appendChild(b); };
  if (l.mask) {
    btn(l.editMask ? 'Edit layer' : 'Edit mask', () => { l.editMask = !l.editMask; if (l.editMask) { setFg('#000000'); setBg('#ffffff'); } refreshAll(); });
    btn(l.maskOn ? 'Disable mask' : 'Enable mask', () => { l.maskOn = !l.maskOn; commit('Toggle Mask'); });
    if (l.type !== 'adjust') btn('Apply mask', applyMask);
    btn('Delete mask', deleteMask);
    p.insertAdjacentHTML('beforeend', `<div style="color:#888;margin-top:4px">${l.editMask ? 'Editing MASK: paint black to hide, white to reveal.' : 'Editing layer pixels.'}</div>`);
  } else if (l.type !== 'adjust') btn('Add mask', () => addMask());
  if (l.type === 'raster') { btn('Flip H', () => flipLayer(true)); btn('Flip V', () => flipLayer(false)); btn('Transform', startTransform); }
}
function refreshHistory() { const h = $('#history'); h.innerHTML = ''; hist.forEach((s, i) => { const d = document.createElement('div'); d.textContent = s.label; d.className = i === hi ? 'cur' : i > hi ? 'fut' : ''; d.onclick = () => restore(i); h.appendChild(d); }); const c = h.querySelector('.cur'); c && c.scrollIntoView({ block: 'nearest' }); }
function status() { if (!doc) return; $('#stZoom').textContent = Math.round(view.zoom * 100) + '%'; $('#stSize').textContent = `${doc.w} × ${doc.h} px`; $('#docname').textContent = doc.name; }
function refreshAll() { if (!doc) return; refreshLayers(); refreshProps(); refreshHistory(); status(); R(); }
$('#layerList').addEventListener('click', () => setTimeout(refreshAll), true);

let spaceHand = false, pointerTool = null;
V.addEventListener('pointerdown', e => {
  if (!doc || e.button > 1) return; V.setPointerCapture(e.pointerId); const p = toDoc(e);
  pointerTool = tf ? TF : (spaceHand || e.button === 1) ? T.hand : T[tool];
  pointerTool.down && pointerTool.down(p, e);
});
V.addEventListener('pointermove', e => {
  if (!doc) return; const p = toDoc(e); hover = p; $('#stPos').textContent = `x ${Math.floor(p.x)}, y ${Math.floor(p.y)}`;
  if (pointerTool) pointerTool.move && pointerTool.move(p, e);
  if (tool === 'brush' || tool === 'eraser') R();
});
const endPtr = e => { if (!pointerTool) return; const t = pointerTool; pointerTool = null; t.up && t.up(toDoc(e), e); };
V.addEventListener('pointerup', endPtr); V.addEventListener('pointercancel', endPtr);
V.addEventListener('pointerleave', () => { hover = null; R(); });
V.addEventListener('wheel', e => { if (!doc) return; e.preventDefault(); const r = V.getBoundingClientRect(); if (e.shiftKey && !e.ctrlKey) { view.px -= e.deltaY; R(); } else zoomAt(view.zoom * Math.pow(1.0015, -e.deltaY), e.clientX - r.left, e.clientY - r.top); if (textEd) closeTextEditor(); }, { passive: false });
new ResizeObserver(resizeView).observe(V);
const KEYTOOLS = { v: ['move'], m: ['marquee', 'ellipse'], l: ['lasso'], w: ['wand'], c: ['crop'], i: ['eyedropper'], b: ['brush'], e: ['eraser'], g: ['gradient', 'bucket'], t: ['text'], h: ['hand'], z: ['zoom'] };
document.addEventListener('keydown', e => {
  if (e.target.matches('input,textarea,select') || !$('#modal').hidden) return;
  const k = e.key.toLowerCase(), c = e.ctrlKey || e.metaKey;
  const run = f => { e.preventDefault(); f(); };
  if (c) {
    if (k === 'z' && e.shiftKey) return run(redo); if (k === 'z') return run(undo); if (k === 'y') return run(redo);
    if (k === 's' && e.shiftKey) return run(need(saveProject)); if (k === 's') return run(need(exportDialog));
    if (k === 'o') return run(() => $('#fileIn').click()); if (k === 'p' && e.shiftKey) return run(need(() => $('#placeIn').click()));
    if (!doc) return;
    if (k === 't') return run(startTransform); if (k === 'a') return run(selectAll); if (k === 'd') return run(deselect);
    if (k === 'i' && e.shiftKey) return run(invertSel); if (k === 'i' && e.altKey) return run(imageSize); if (k === 'i') return run(() => destructiveAdj('invert'));
    if (k === 'u' && e.shiftKey) return run(() => destructiveAdj('grayscale')); if (k === 'u') return run(() => destructiveAdj('hue-saturation')); if (k === 'l') return run(() => destructiveAdj('levels'));
    if (k === 'j') return run(dupLayer); if (k === 'e') return run(mergeDown); if (k === 'n' && e.shiftKey) return run(() => addLayer(newLayer(), 'New Layer'));
    if (k === '0') return run(fit); if (k === '1') return run(() => { view.zoom = 1; center(); });
    if (k === '=' || k === '+') return run(zc(z => z * 1.25)); if (k === '-') return run(zc(z => z / 1.25));
    return;
  }
  if (e.altKey && k === 'n') return run(newDocDialog);
  if (!doc) return;
  if (e.altKey && k === 'backspace') return run(() => fillSel(fg));
  if (k === ' ') { spaceHand = true; V.style.cursor = 'grab'; e.preventDefault(); return; }
  if (k === 'enter') { if (tf) return run(applyTransform); if (tool === 'crop') return run(() => T.crop.apply()); }
  if (k === 'escape') { if (tf) return run(cancelTransform); if (T.crop.rect) { T.crop.rect = null; R(); return; } return run(deselect); }
  if (k === 'delete' || k === 'backspace') return run(clearSel);
  if (k === 'x') return run(() => { const t = fg; setFg(bg); setBg(t); });
  if (k === 'd') return run(() => { setFg('#000000'); setBg('#ffffff'); });
  if (k === '[') return run(() => { opt.size = Math.max(1, Math.round(opt.size / 1.2)); buildOptions(); R(); });
  if (k === ']') return run(() => { opt.size = Math.min(500, Math.round(opt.size * 1.2) + 1); buildOptions(); R(); });
  if (KEYTOOLS[k]) { const list = KEYTOOLS[k], i = list.indexOf(tool); return run(() => setTool(e.shiftKey ? list[(Math.max(i, 0) + 1) % list.length] : i >= 0 ? tool : list[0])); }
});
document.addEventListener('keyup', e => { if (e.key === ' ') { spaceHand = false; V.style.cursor = T[tool].cursor || 'default'; } });

$('#fileIn').onchange = e => { const f = e.target.files[0]; if (f) openFile(f, false); e.target.value = ''; };
$('#placeIn').onchange = e => { const f = e.target.files[0]; if (f) openFile(f, true); e.target.value = ''; };
$('#btnNew').onclick = newDocDialog; $('#btnOpen').onclick = () => $('#fileIn').click();
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) openFile(f, !!doc && f.type.startsWith('image/')); });
document.addEventListener('paste', e => { if (e.target.matches('input,textarea')) return; const it = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/')); if (it) { const f = it.getAsFile(); openFile(new File([f], 'Pasted', { type: f.type }), !!doc); } });
window.addEventListener('beforeunload', e => { if (doc && hist.length > 1) { e.preventDefault(); e.returnValue = ''; } });

setTool('move'); resizeView();
window.PF = { get doc() { return doc; }, get hist() { return hist; }, get hi() { return hi; }, get sel() { return sel; }, newDoc, openFile, addAdjLayer, addMask, runFilter, destructiveAdj, setTool, setFg, undo, redo, composite, mergeDown, flatten, closeDlg, startTransform, applyTransform, rotateCanvas, exportBlob, psdBuffer, importPsd, projectData, loadProject, opt, view, selectAll };
