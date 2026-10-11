/* PixelForge Looks — one-tap film / cinematic grades built as code (3D LUT + spatial effects). */
'use strict';
const LOOKS = [
  // id, label, params
  ['teal-orange', 'Teal & Orange', { temp: .06, contrast: .28, sat: 1.08, skin: .35, sh: [-.07, .015, .07], hl: [.07, .025, -.06], fade: .015, vignette: .22, bloom: .06 }],
  ['moody', 'Moody Cinema', { exposure: -.18, contrast: .22, sat: .72, sh: [-.035, .02, .045], hl: [.035, .015, -.02], fade: .055, whites: .96, vignette: .42, grain: .12 }],
  ['blockbuster', 'Blockbuster', { contrast: .45, sat: 1.12, skin: .3, sh: [-.09, .0, .1], hl: [.1, .04, -.08], vignette: .32, bloom: .14 }],
  ['warm-film', 'Warm Portrait Film', { temp: .14, contrast: .06, sat: .9, vib: .1, skin: .2, sh: [.0, .012, .028], hl: [.035, .02, -.012], fade: .04, whites: .97, chan: { r: [.96, 0, 1], g: [1, 0, 1], b: [1.04, .01, .98] }, grain: .16, halation: .08 }],
  ['green-film', 'Cool Green Film', { temp: -.05, tint: .08, contrast: .14, sat: .92, sh: [-.025, .03, .04], hl: [.01, .02, -.03], fade: .035, chan: { r: [1.03, 0, .99], g: [.97, .01, 1], b: [1, .02, .97] }, grain: .18 }],
  ['tungsten', 'Tungsten Night Film', { temp: -.28, tint: -.02, contrast: .2, sat: 1.05, sh: [-.03, .0, .06], hl: [.02, .0, -.02], fade: .02, halation: .7, grain: .26 }],
  ['70s', 'Retro 70s', { temp: .22, contrast: -.04, sat: .78, sh: [.035, .012, -.04], hl: [.05, .03, -.05], fade: .11, whites: .92, chan: { b: [1.08, .03, .9] }, grain: .3, vignette: .3 }],
  ['instant', 'Instant Photo', { temp: .05, contrast: .12, sat: .8, sh: [-.03, .03, .06], hl: [.045, .035, -.01], fade: .1, whites: .93, vignette: .38, grain: .1, bloom: .08 }],
  ['bw', 'Classic B&W', { bw: [.32, .58, .1], contrast: .18, fade: .015, grain: .18, vignette: .15 }],
  ['noir', 'Noir', { bw: [.45, .48, .07], exposure: -.08, contrast: .72, vignette: .5, grain: .25 }],
  ['matte', 'Faded Matte', { contrast: -.06, sat: .78, fade: .14, whites: .94, sh: [.0, .01, .02], hl: [.01, .005, -.005] }],
  ['golden', 'Golden Hour', { temp: .32, exposure: .04, sat: 1.06, vib: .15, sh: [.02, .0, -.03], hl: [.06, .03, -.045], contrast: .1, bloom: .3, vignette: .16 }],
  ['neon', 'Neon Night', { tint: -.14, temp: -.08, contrast: .3, sat: 1.28, sh: [.03, -.04, .12], hl: [.07, -.02, .07], bloom: .28, vignette: .3 }],
  ['pastel', 'Pastel Dream', { exposure: .14, contrast: -.16, sat: .7, sh: [.04, .0, .05], hl: [.02, .01, .03], fade: .09, bloom: .12 }],
  ['clean', 'Clean Bright', { exposure: .2, temp: -.06, contrast: .05, sat: 1.04, vib: .12, skin: .15, hl: [0, .01, .02], fade: .015, bloom: .12 }],
  ['vivid', 'Vivid Pop', { contrast: .3, sat: 1.2, vib: .35, exposure: .02 }],
  ['winter', 'Cold Winter', { temp: -.34, sat: .8, contrast: .1, sh: [-.02, .0, .03], hl: [-.02, .01, .04], fade: .035, bloom: .06 }],
  ['desert', 'Desert Warm', { temp: .28, tint: .03, sat: .92, contrast: .16, sh: [.045, .015, -.03], hl: [.06, .03, -.05], fade: .02, vignette: .2 }],
  ['cross', 'Cross Process', { chan: { r: [.82, 0, 1.02], g: [.9, 0, 1.02], b: [1.35, .12, .82] }, contrast: .28, sat: 1.18, vignette: .6, grain: .12 }],
  ['sepia', 'Sepia Memory', { bw: [.3, .59, .11], sh: [.06, .015, -.06], hl: [.11, .055, -.07], contrast: .1, fade: .07, whites: .95, grain: .22, vignette: .35 }],
];
const LOOK = Object.fromEntries(LOOKS.map(([id, name, p]) => [id, Object.assign({ name }, p)]));
ADJ.look = { name: 'Look', params: [['amount', 0, 100, 100, 1]] };

const sC = (x, k) => { if (!k) return x; const e = k > 0 ? 1 + k * 1.6 : 1 / (1 - k * 1.2); return x < .5 ? .5 * Math.pow(2 * x, e) : 1 - .5 * Math.pow(2 * (1 - x), e); };
const cl1 = v => v < 0 ? 0 : v > 1 ? 1 : v;
// Soft highlight shoulder so warm/bright looks never clip harshly.
const shoulder = v => v <= .85 ? v : .85 + .15 * (1 - Math.exp(-(v - .85) / .15));
function lookColor(P, r, g, b) {
  if (P.exposure) { const m = Math.pow(2, P.exposure); r *= m; g *= m; b *= m; }
  if (P.temp || P.tint) { const t = P.temp || 0, n = P.tint || 0; r *= 1 + t * .16 - n * .03; g *= 1 + n * .1; b *= 1 - t * .18 - n * .03; }
  r = shoulder(r); g = shoulder(g); b = shoulder(b);
  if (P.bw) { const y = r * P.bw[0] + g * P.bw[1] + b * P.bw[2]; r = g = b = y; }
  if (P.chan) for (const [c, [gm, lo, hi]] of Object.entries(P.chan)) { const f = v => lo + Math.pow(cl1(v), gm) * (hi - lo); if (c === 'r') r = f(r); else if (c === 'g') g = f(g); else b = f(b); }
  // Contrast on luma (keeps hue stable), then per-channel mix-in for a filmic bite.
  if (P.contrast) { const y = .2126 * r + .7152 * g + .0722 * b, y2 = sC(cl1(y), P.contrast), k = y > 1e-4 ? y2 / y : 1; r = .65 * r * k + .35 * sC(cl1(r), P.contrast); g = .65 * g * k + .35 * sC(cl1(g), P.contrast); b = .65 * b * k + .35 * sC(cl1(b), P.contrast); }
  let y = .2126 * r + .7152 * g + .0722 * b;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), s0 = mx - mn;
  let sat = P.sat ?? 1; if (P.vib) sat += P.vib * (1 - Math.min(1, s0 * 2));
  // Protect skin tones (orange hues) from heavy grading.
  let skinW = 0; if (P.skin && s0 > .04 && r > g && g > b) { const hh = (g - b) / s0; skinW = P.skin * Math.max(0, 1 - Math.abs(hh - .45) * 2.2) * Math.min(1, s0 * 4); }
  r = y + (r - y) * sat; g = y + (g - y) * sat; b = y + (b - y) * sat;
  if (P.sh || P.hl) {
    const yy = cl1(y), ws = Math.pow(1 - yy, 2) * (1 - skinW), wh = Math.pow(yy, 1.6) * (1 - skinW * .5), sh = P.sh || [0, 0, 0], hl = P.hl || [0, 0, 0];
    r += sh[0] * ws + hl[0] * wh; g += sh[1] * ws + hl[1] * wh; b += sh[2] * ws + hl[2] * wh;
  }
  const fd = P.fade || 0, wt = P.whites ?? 1;
  r = fd + cl1(r) * (wt - fd); g = fd + cl1(g) * (wt - fd); b = fd + cl1(b) * (wt - fd);
  return [r, g, b];
}
const LN = 33, lutCache = {};
function lookLUT(id) {
  if (lutCache[id]) return lutCache[id];
  const P = LOOK[id], L = new Float32Array(LN * LN * LN * 3); let i = 0;
  for (let b = 0; b < LN; b++) for (let g = 0; g < LN; g++) for (let r = 0; r < LN; r++) { const o = lookColor(P, r / (LN - 1), g / (LN - 1), b / (LN - 1)); L[i++] = o[0] * 255; L[i++] = o[1] * 255; L[i++] = o[2] * 255; }
  return (lutCache[id] = L);
}
function applyLUT(c, L) {
  const x = cx2(c), id = x.getImageData(0, 0, c.width, c.height), d = id.data, n = d.length, S = (LN - 1) / 255, N = LN, N2 = LN * LN;
  for (let j = 0; j < n; j += 4) {
    const fr = d[j] * S, fg = d[j + 1] * S, fb = d[j + 2] * S;
    const r0 = fr | 0, g0 = fg | 0, b0 = fb | 0, r1 = r0 < N - 1 ? r0 + 1 : r0, g1 = g0 < N - 1 ? g0 + 1 : g0, b1 = b0 < N - 1 ? b0 + 1 : b0;
    const dr = fr - r0, dg = fg - g0, db = fb - b0;
    const i000 = (b0 * N2 + g0 * N + r0) * 3, i100 = (b0 * N2 + g0 * N + r1) * 3, i010 = (b0 * N2 + g1 * N + r0) * 3, i110 = (b0 * N2 + g1 * N + r1) * 3;
    const i001 = (b1 * N2 + g0 * N + r0) * 3, i101 = (b1 * N2 + g0 * N + r1) * 3, i011 = (b1 * N2 + g1 * N + r0) * 3, i111 = (b1 * N2 + g1 * N + r1) * 3;
    for (let k = 0; k < 3; k++) {
      const c00 = L[i000 + k] + (L[i100 + k] - L[i000 + k]) * dr, c10 = L[i010 + k] + (L[i110 + k] - L[i010 + k]) * dr;
      const c01 = L[i001 + k] + (L[i101 + k] - L[i001 + k]) * dr, c11 = L[i011 + k] + (L[i111 + k] - L[i011 + k]) * dr;
      const c0 = c00 + (c10 - c00) * dg, c1 = c01 + (c11 - c01) * dg; d[j + k] = c0 + (c1 - c0) * db;
    }
  }
  x.putImageData(id, 0, 0);
}
// Smooth blur without ctx.filter (not reliable on older iOS Safari): halve down, then upscale.
function softBlur(src, radius) {
  let c = src, w = src.width, h = src.height;
  while (radius > 1.5 && w > 8 && h > 8) { w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); const t = mk(w, h), x = t.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, w, h); c = t; radius /= 2; }
  const t = mk(w, h), x = t.getContext('2d'); for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { x.globalAlpha = dx || dy ? .5 : 1; x.drawImage(c, dx, dy); } return t;
}
function glow(c, amt, tint, thr, rad) {
  const w = c.width, h = c.height, s = Math.min(1, 512 / Math.max(w, h)), hc = mk(w * s, h * s), hx = cx2(hc); hx.drawImage(c, 0, 0, hc.width, hc.height);
  const id = hx.getImageData(0, 0, hc.width, hc.height), d = id.data;
  for (let j = 0; j < d.length; j += 4) { const y = (.2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2]) / 255, k = Math.max(0, (y - thr) / (1 - thr)); const v = k * k * 255; d[j] = v * tint[0]; d[j + 1] = v * tint[1]; d[j + 2] = v * tint[2]; d[j + 3] = 255; }
  hx.putImageData(id, 0, 0);
  const b = softBlur(hc, rad * Math.max(hc.width, hc.height)), x = c.getContext('2d');
  x.save(); x.globalCompositeOperation = 'screen'; x.globalAlpha = Math.min(1, amt); x.imageSmoothingQuality = 'high'; x.drawImage(b, 0, 0, w, h); x.drawImage(b, 0, 0, w, h); x.restore();
}
let grainTile = null;
function grain(c, amt) {
  if (!grainTile) { grainTile = mk(256, 256); const x = grainTile.getContext('2d'), id = x.createImageData(256, 256), d = id.data; let s = 1234567; for (let j = 0; j < d.length; j += 4) { s = (s * 1103515245 + 12345) >>> 0; const a = (s >>> 16) & 255; s = (s * 1103515245 + 12345) >>> 0; const v = 128 + ((a + ((s >>> 16) & 255)) / 2 - 128) * 1.6; d[j] = d[j + 1] = d[j + 2] = v; d[j + 3] = 255; } x.putImageData(id, 0, 0); }
  const x = c.getContext('2d'), sc = Math.max(1, Math.max(c.width, c.height) / 2400);
  x.save(); x.globalCompositeOperation = 'overlay'; x.globalAlpha = amt * .42 * Math.min(1, Math.max(c.width, c.height) / 1200); x.scale(sc, sc); x.fillStyle = x.createPattern(grainTile, 'repeat'); x.fillRect(0, 0, c.width / sc, c.height / sc); x.restore();
}
function vignette(c, amt) {
  const w = c.width, h = c.height, x = c.getContext('2d'), R = Math.hypot(w, h) / 2, g = x.createRadialGradient(w / 2, h / 2, R * .35, w / 2, h / 2, R);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.6, `rgba(0,0,0,${amt * .25})`); g.addColorStop(1, `rgba(0,0,0,${amt * .75})`);
  x.save(); x.globalCompositeOperation = 'multiply'; x.fillStyle = g; x.fillRect(0, 0, w, h); x.restore();
}
function renderLook(src, id) {
  const P = LOOK[id], c = clone(src); if (!P) return c;
  applyLUT(c, lookLUT(id));
  if (P.halation) glow(c, P.halation * .9, [1, .28, .08], .72, .012);
  if (P.bloom) glow(c, P.bloom, [1, .96, .9], .62, .03);
  if (P.vignette) vignette(c, P.vignette);
  if (P.grain) grain(c, P.grain);
  const x = c.getContext('2d'); x.globalCompositeOperation = 'destination-in'; x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-over';
  return c;
}
// --- integrate as an adjustment-layer type ---
let docVer = 0, lookFull = false; const lookMemo = new Map();
const _commit = commit, _restore = restore, _applyAdj = applyAdj, _exportBlob = exportBlob;
commit = function (l) { docVer++; return _commit(l); };
restore = function (i) { docVer++; return _restore(i); };
function baseSig(c) { const t = mk(8, 8), x = cx2(t); x.drawImage(c, 0, 0, 8, 8); const d = x.getImageData(0, 0, 8, 8).data; let h = 0; for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) | 0; return h; }
applyAdj = function (c, t, p) {
  if (t !== 'look') return _applyAdj(c, t, p);
  const s = lookFull ? 1 : Math.min(1, 2048 / Math.max(c.width, c.height)), key = [p.look, s, c.width, c.height, docVer, live ? 'L' : '', baseSig(c)].join('|');
  let F = lookMemo.get(key);
  if (!F) { let src = c; if (s < 1) { src = mk(c.width * s, c.height * s); const sx = src.getContext('2d'); sx.imageSmoothingQuality = 'high'; sx.drawImage(c, 0, 0, src.width, src.height); } F = renderLook(src, p.look); lookMemo.set(key, F); if (lookMemo.size > 6) lookMemo.delete(lookMemo.keys().next().value); }
  const x = c.getContext('2d'); x.save(); x.globalAlpha = clamp((p.amount ?? 100) / 100, 0, 1); x.imageSmoothingQuality = 'high'; x.drawImage(F, 0, 0, c.width, c.height); x.restore();
};
exportBlob = async function (f, q) { lookFull = true; try { return await _exportBlob(f, q); } finally { lookFull = false; } };

const isLook = l => l && l.type === 'adjust' && l.adj === 'look';
function curLook() { if (!doc) return null; if (isLook(act())) return act(); for (let i = doc.layers.length - 1; i >= 0; i--) if (isLook(doc.layers[i])) return doc.layers[i]; return null; }
function setLook(id) {
  if (!doc) return toast('Open a photo first');
  const cur = curLook(), amt = +$('#lookAmt').value;
  if (!id) { if (cur) { doc.layers.splice(doc.layers.indexOf(cur), 1); doc.active = clamp(doc.active, 0, doc.layers.length - 1); commit('Remove Look'); } return; }
  if (cur) { if (cur.p.look === id) return; cur.p.look = id; cur.name = 'Look: ' + LOOK[id].name; doc.active = doc.layers.indexOf(cur); commit('Look: ' + LOOK[id].name); return; }
  const l = newLayer({ type: 'adjust', adj: 'look', p: { look: id, amount: amt || 100 }, name: 'Look: ' + LOOK[id].name, canvas: mk(1, 1) });
  doc.layers.push(l); doc.active = doc.layers.length - 1; commit('Look: ' + LOOK[id].name);
}
function setLookAmount(v, final) { const l = curLook(); $('#lookAmtV').textContent = Math.round(v) + '%'; if (!l) return; l.p.amount = +v; R(); if (final) commit('Look Intensity'); }

// --- strip UI ---
const strip = $('#looksStrip'); let thumbVer = -1, thumbBase = null;
function buildStrip() {
  strip.innerHTML = '';
  const mkItem = (id, name) => { const b = document.createElement('button'); b.className = 'look'; b.dataset.look = id; const c = mk(1, 1); b.append(c, Object.assign(document.createElement('span'), { textContent: name })); b.onclick = () => setLook(id); strip.appendChild(b); };
  mkItem('', 'Original'); LOOKS.forEach(([id, n]) => mkItem(id, n));
}
buildStrip();
function refreshLooks() {
  const cur = curLook(); strip.querySelectorAll('.look').forEach(b => b.classList.toggle('on', (cur ? cur.p.look : '') === b.dataset.look));
  if (cur) { $('#lookAmt').value = cur.p.amount; $('#lookAmtV').textContent = Math.round(cur.p.amount) + '%'; }
  if (!doc || strip.offsetParent === null) return;
  const base = composite(mk(doc.w, doc.h), doc.layers.filter(l => !isLook(l)));
  const sig = baseSig(base) + 'x' + doc.w + 'x' + doc.h; if (sig === thumbBase) return; thumbBase = sig;
  const T0 = strip.querySelector('.look canvas'), px = Math.round((T0.clientWidth || 64) * (devicePixelRatio || 1)), sz = Math.max(48, Math.min(240, px));
  const s = Math.max(sz / doc.w, sz / doc.h), t = mk(sz, sz), tx = t.getContext('2d'); tx.imageSmoothingQuality = 'high'; tx.drawImage(base, (sz - doc.w * s) / 2, (sz - doc.h * s) / 2, doc.w * s, doc.h * s);
  const items = [...strip.querySelectorAll('.look')]; let k = 0;
  const step = () => { const t0 = performance.now(); while (k < items.length && performance.now() - t0 < 12) { const b = items[k++], c = b.querySelector('canvas'), r = b.dataset.look ? renderLook(t, b.dataset.look) : t; c.width = sz; c.height = sz; c.getContext('2d').drawImage(r, 0, 0); } if (k < items.length) requestAnimationFrame(step); };
  step();
}
let looksT = null; const _refreshAll = refreshAll;
refreshAll = function () { _refreshAll(); clearTimeout(looksT); looksT = setTimeout(refreshLooks, 120); if (window.onDocChanged) window.onDocChanged(); };
$('#lookAmt').oninput = e => setLookAmount(e.target.value, false);
$('#lookAmt').onchange = e => setLookAmount(e.target.value, true);
MENUS.Filter.push('-', ...LOOKS.map(([id, n]) => ['Look ▸ ' + n, '', need(() => setLook(id))]), ['Remove Look', '', need(() => setLook(''))]);
Object.assign(window.PF, { LOOKS, setLook, setLookAmount, refreshLooks, renderLook });
