/* PixelForge Looks — one-tap film / cinematic grades built as code (3D LUT + spatial effects). */
'use strict';
const LOOKS = [
  // id, label, params
  ['teal-orange', 'Teal & Orange', { temp: .06, contrast: .28, sat: 1.08, skin: .35, sh: [-.07, .015, .07], hl: [.07, .025, -.06], fade: .015, vignette: .22, bloom: .06 }, 'cine'],
  ['moody', 'Moody Cinema', { exposure: -.18, contrast: .22, sat: .72, sh: [-.035, .02, .045], hl: [.035, .015, -.02], fade: .055, whites: .96, vignette: .42, grain: .12 }, 'cine'],
  ['blockbuster', 'Blockbuster', { contrast: .45, sat: 1.12, skin: .3, sh: [-.09, .0, .1], hl: [.1, .04, -.08], vignette: .32, bloom: .14 }, 'cine'],
  ['warm-film', 'Warm Portrait Film', { temp: .14, contrast: .06, sat: .9, vib: .1, skin: .2, sh: [.0, .012, .028], hl: [.035, .02, -.012], fade: .04, whites: .97, chan: { r: [.96, 0, 1], g: [1, 0, 1], b: [1.04, .01, .98] }, grain: .16, halation: .08 }, 'film'],
  ['green-film', 'Cool Green Film', { temp: -.05, tint: .08, contrast: .14, sat: .92, sh: [-.025, .03, .04], hl: [.01, .02, -.03], fade: .035, chan: { r: [1.03, 0, .99], g: [.97, .01, 1], b: [1, .02, .97] }, grain: .18 }, 'film'],
  ['tungsten', 'Tungsten Night Film', { temp: -.28, tint: -.02, contrast: .2, sat: 1.05, sh: [-.03, .0, .06], hl: [.02, .0, -.02], fade: .02, halation: .7, grain: .26 }, 'film'],
  ['70s', 'Retro 70s', { temp: .22, contrast: -.04, sat: .78, sh: [.035, .012, -.04], hl: [.05, .03, -.05], fade: .11, whites: .92, chan: { b: [1.08, .03, .9] }, grain: .3, vignette: .3 }, 'vint'],
  ['instant', 'Instant Photo', { temp: .05, contrast: .12, sat: .8, sh: [-.03, .03, .06], hl: [.045, .035, -.01], fade: .1, whites: .93, vignette: .38, grain: .1, bloom: .08 }, 'vint'],
  ['bw', 'Classic B&W', { bw: [.32, .58, .1], contrast: .18, fade: .015, grain: .18, vignette: .15 }, 'bw'],
  ['noir', 'Noir', { bw: [.45, .48, .07], exposure: -.08, contrast: .72, vignette: .5, grain: .25 }, 'bw'],
  ['matte', 'Faded Matte', { contrast: -.06, sat: .78, fade: .14, whites: .94, sh: [.0, .01, .02], hl: [.01, .005, -.005] }, 'film'],
  ['golden', 'Golden Hour', { temp: .32, exposure: .04, sat: 1.06, vib: .15, sh: [.02, .0, -.03], hl: [.06, .03, -.045], contrast: .1, bloom: .3, vignette: .16 }, 'cine'],
  ['neon', 'Neon Night', { tint: -.14, temp: -.08, contrast: .3, sat: 1.28, sh: [.03, -.04, .12], hl: [.07, -.02, .07], bloom: .28, vignette: .3 }, 'crea'],
  ['pastel', 'Pastel Dream', { exposure: .14, contrast: -.16, sat: .7, sh: [.04, .0, .05], hl: [.02, .01, .03], fade: .09, bloom: .12 }, 'crea'],
  ['clean', 'Clean Bright', { exposure: .2, temp: -.06, contrast: .05, sat: 1.04, vib: .12, skin: .15, hl: [0, .01, .02], fade: .015, bloom: .12 }, 'film'],
  ['vivid', 'Vivid Pop', { contrast: .3, sat: 1.2, vib: .35, exposure: .02 }, 'crea'],
  ['winter', 'Cold Winter', { temp: -.34, sat: .8, contrast: .1, sh: [-.02, .0, .03], hl: [-.02, .01, .04], fade: .035, bloom: .06 }, 'cine'],
  ['desert', 'Desert Warm', { temp: .28, tint: .03, sat: .92, contrast: .16, sh: [.045, .015, -.03], hl: [.06, .03, -.05], fade: .02, vignette: .2 }, 'cine'],
  ['cross', 'Cross Process', { chan: { r: [.82, 0, 1.02], g: [.9, 0, 1.02], b: [1.35, .12, .82] }, contrast: .28, sat: 1.18, vignette: .6, grain: .12 }, 'vint'],
  ['sepia', 'Sepia Memory', { bw: [.3, .59, .11], sh: [.06, .015, -.06], hl: [.11, .055, -.07], contrast: .1, fade: .07, whites: .95, grain: .22, vignette: .35 }, 'bw'],
  // --- v2: cinematic / film / creative styles ---
  ['blue-hour', 'Blue Hour Sci-Fi', { temp: -.3, tint: -.03, contrast: .3, sat: .85, sh: [-.05, .0, .09], hl: [-.01, .03, .05], fade: .02, bloom: .18, vignette: .3 }, 'cine'],
  ['bleach', 'Bleach Bypass', { contrast: .55, sat: .42, sh: [-.01, .0, .015], hl: [.015, .01, .0], clarity: .5, grain: .18, vignette: .3 }, 'cine'],
  ['pastel-sym', 'Storybook Pastel', { exposure: .08, temp: .1, contrast: .05, sat: .95, sh: [.06, .02, .03], hl: [.05, .02, -.02], hue: -6, fade: .07, whites: .96, chan: { g: [1, .02, .97] } }, 'cine'],
  ['code-green', 'Digital Code Green', { tint: .26, temp: -.08, contrast: .35, sat: .7, sh: [-.04, .05, -.02], hl: [-.03, .05, -.04], fade: .03, vignette: .38, grain: .1 }, 'cine'],
  ['amber', 'Amber Dunes', { temp: .4, contrast: .26, sat: .82, sh: [.03, .0, -.05], hl: [.08, .04, -.07], fade: .045, haze: .25, vignette: .22, grain: .08 }, 'cine'],
  ['diffusion', 'Soft Diffusion', { contrast: -.12, sat: .95, fade: .04, mist: .45, bloom: .2 }, 'cine'],
  ['starlight', 'Rainbow Starlight', { contrast: .18, sat: 1.1, sh: [.0, -.01, .04], bloom: .22, star: 1 }, 'cine'],
  ['liquid-gold', 'Liquid Gold', { temp: .25, contrast: .1, sat: 1.02, hl: [.05, .03, -.04], mist: .2, leak: 'gold' }, 'cine'],
  ['film-grain', 'Film Grain', { contrast: .14, sat: .86, sh: [.0, .01, .015], fade: .05, whites: .96, grain: .75 }, 'film'],
  ['90s', '90s Point & Shoot', { exposure: .06, temp: .1, tint: .05, contrast: .24, sat: 1.12, sh: [-.02, .03, .01], hl: [.04, .02, -.03], fade: .04, vignette: .25, grain: .32, bloom: .08 }, 'film'],
  ['leak', 'Light Leak', { temp: .08, contrast: .08, sat: .92, fade: .05, leak: 'warm', grain: .2 }, 'film'],
  ['retro-print', 'Retro Print', { temp: .12, contrast: -.04, sat: .7, sh: [.04, .02, -.02], hl: [.05, .03, -.04], fade: .13, whites: .9, dust: 1, grain: .3, vignette: .35 }, 'vint'],
  ['burn', 'Light Burn', { temp: .15, contrast: .22, sat: .9, fade: .03, leak: 'burn', vignette: .3, grain: .15 }, 'vint'],
  ['vhs', 'VHS Tape', { contrast: .1, sat: 1.18, temp: .03, sh: [.0, .0, .04], fade: .07, whites: .93, split: .35, scan: 1, grain: .35 }, 'vint'],
  ['cyanotype', 'Cyanotype', { bw: [.3, .59, .11], contrast: .2, duo: [[.03, .12, .3], [.88, .94, .98]], grain: .15, vignette: .2 }, 'bw'],
  ['photocopy', 'Photocopy', { bw: [.3, .59, .11], contrast: 1, exposure: .1, fade: .06, whites: .95, dust: .6, grain: .8 }, 'bw'],
  ['mirror-mono', 'Mirror Mono', { bw: [.35, .55, .1], contrast: .3, mirror: 1, vignette: .25 }, 'bw'],
  ['hdr', 'HDR Clarity', { contrast: .08, sat: 1.06, vib: .2, clarity: 1, vignette: .15 }, 'crea'],
  ['cyberpunk', 'Cyberpunk', { tint: -.2, temp: -.12, contrast: .35, sat: 1.25, sh: [.06, -.04, .14], hl: [.1, -.03, .06], bloom: .3, split: .2, vignette: .35 }, 'crea'],
  ['anaglyph', 'Anaglyph 3D', { contrast: .12, sat: .9, split: 1 }, 'crea'],
  ['glitch', 'Glitch', { contrast: .2, sat: 1.15, split: .6, glitch: 1, scan: .5 }, 'crea'],
  ['neg-neon', 'Neon Negative', { invert: 1, contrast: .35, sat: 1.9, sh: [.1, -.02, .16], hl: [-.04, .05, .08], bloom: .25, vignette: .3 }, 'crea'],
  ['acid', 'Acid Trip', { hue: -70, contrast: .32, sat: 1.8, vib: .3, sh: [.08, -.04, .1], bloom: .18 }, 'crea'],
  ['infrared', 'Infrared Pink', { mix: [[.05, 1.15, -.15], [.6, .25, .15], [.35, -.05, .75]], contrast: .2, sat: 1.15, bloom: .15 }, 'crea'],
  ['duotone', 'Duotone Pink Blue', { bw: [.3, .59, .11], contrast: .2, duo: [[.12, .1, .45], [1, .45, .62]] }, 'crea'],
  ['comic', 'Comic Halftone', { contrast: .35, sat: 1.35, post: 5, halftone: 1 }, 'crea'],
];
const LOOK = Object.fromEntries(LOOKS.map(([id, name, p, cat]) => [id, Object.assign({ name, cat }, p)]));
const LOOK_CATS = [['all', 'All'], ['cine', 'Cinematic'], ['film', 'Film'], ['vint', 'Vintage'], ['bw', 'B&W'], ['crea', 'Creative'], ['my', 'My Looks']];
ADJ.look = { name: 'Look', params: [['amount', 0, 100, 100, 1]] };

const sC = (x, k) => { if (!k) return x; const e = k > 0 ? 1 + k * 1.6 : 1 / (1 - k * 1.2); return x < .5 ? .5 * Math.pow(2 * x, e) : 1 - .5 * Math.pow(2 * (1 - x), e); };
const cl1 = v => v < 0 ? 0 : v > 1 ? 1 : v;
// Soft highlight shoulder so warm/bright looks never clip harshly.
const shoulder = v => v <= .85 ? v : .85 + .15 * (1 - Math.exp(-(v - .85) / .15));
function lookColor(P, r, g, b) {
  if (P.exposure) { const m = Math.pow(2, P.exposure); r *= m; g *= m; b *= m; }
  if (P.temp || P.tint) { const t = P.temp || 0, n = P.tint || 0; r *= 1 + t * .16 - n * .03; g *= 1 + n * .1; b *= 1 - t * .18 - n * .03; }
  r = shoulder(r); g = shoulder(g); b = shoulder(b);
  if (P.mix) { const M = P.mix; [r, g, b] = [M[0][0] * r + M[0][1] * g + M[0][2] * b, M[1][0] * r + M[1][1] * g + M[1][2] * b, M[2][0] * r + M[2][1] * g + M[2][2] * b]; }
  if (P.invert) { r = 1 - cl1(r); g = 1 - cl1(g); b = 1 - cl1(b); }
  if (P.hue) { const a = P.hue * Math.PI / 180, co = Math.cos(a), si = Math.sin(a), k = (1 - co) / 3, q = Math.sqrt(1 / 3) * si; [r, g, b] = [r * (co + k) + g * (k - q) + b * (k + q), r * (k + q) + g * (co + k) + b * (k - q), r * (k - q) + g * (k + q) + b * (co + k)]; }
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
  if (P.duo) { const t = cl1(.2126 * r + .7152 * g + .0722 * b), [A, B] = P.duo; r = A[0] + (B[0] - A[0]) * t; g = A[1] + (B[1] - A[1]) * t; b = A[2] + (B[2] - A[2]) * t; }
  if (P.post) { const n = P.post - 1; r = Math.round(cl1(r) * n) / n; g = Math.round(cl1(g) * n) / n; b = Math.round(cl1(b) * n) / n; }
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
// --- procedural spatial effects (no textures; everything generated in code) ---
const rng = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
function mirrorFx(c) { const w = c.width, h = c.height, x = c.getContext('2d'), hw = Math.ceil(w / 2); x.save(); x.translate(w, 0); x.scale(-1, 1); x.drawImage(c, 0, 0, hw, h, 0, 0, hw, h); x.restore(); }
function clarityFx(c, amt) {
  const w = c.width, h = c.height, b = softBlur(c, Math.max(w, h) * .025), t = mk(w, h), tx = cx2(t); tx.imageSmoothingQuality = 'high'; tx.drawImage(b, 0, 0, w, h);
  const x = cx2(c), id = x.getImageData(0, 0, w, h), d = id.data, e = tx.getImageData(0, 0, w, h).data, k = amt * .9;
  for (let j = 0; j < d.length; j += 4) for (let i = 0; i < 3; i++) { const v = d[j + i], df = v - e[j + i]; d[j + i] = v + df * k * (1 - Math.abs(v - 128) / 200); }
  x.putImageData(id, 0, 0);
}
function splitFx(c, amt, gl) {
  const w = c.width, h = c.height, x = cx2(c), id = x.getImageData(0, 0, w, h), d = id.data, s = new Uint8ClampedArray(d), o = Math.max(1, Math.round(w * .008 * amt));
  const rows = new Int32Array(h); if (gl) { const R = rng(77); let y = 0; while (y < h) { const bh = Math.max(2, (R() * h * .06) | 0), sh = R() < .35 ? ((R() - .5) * w * .08) | 0 : 0; for (let k = y; k < Math.min(h, y + bh); k++) rows[k] = sh; y += bh; } }
  for (let y = 0; y < h; y++) { const sh = rows[y]; for (let X = 0; X < w; X++) { const j = (y * w + X) * 4, xr = Math.min(w - 1, Math.max(0, X - sh + o)), xb = Math.min(w - 1, Math.max(0, X - sh - o)), xg = Math.min(w - 1, Math.max(0, X - sh)); d[j] = s[(y * w + xr) * 4]; d[j + 1] = s[(y * w + xg) * 4 + 1]; d[j + 2] = s[(y * w + xb) * 4 + 2]; } }
  x.putImageData(id, 0, 0);
}
function hazeFx(c, amt) { const w = c.width, h = c.height, x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, `rgba(255,190,120,${amt * .5})`); g.addColorStop(.55, `rgba(255,170,90,${amt * .15})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.save(); x.globalCompositeOperation = 'screen'; x.fillStyle = g; x.fillRect(0, 0, w, h); x.restore(); }
function leakFx(c, kind) {
  const w = c.width, h = c.height, x = c.getContext('2d'), M = Math.max(w, h), R = rng(kind.length * 991);
  const pal = { warm: [[255, 90, 20], [255, 170, 40], [255, 40, 80]], burn: [[255, 70, 0], [255, 140, 0], [200, 20, 0]], gold: [[255, 190, 60], [255, 220, 120], [230, 150, 30]] }[kind];
  x.save(); x.globalCompositeOperation = 'screen';
  const spots = kind === 'gold' ? [[.05, .9, .5], [.95, .1, .45], [.9, .95, .35], [.1, .05, .3]] : kind === 'burn' ? [[0, .5, .75], [1, .3, .55], [.5, 1.05, .5]] : [[-.05, .25, .7], [.08, .85, .5], [1.02, .1, .35]];
  spots.forEach(([px, py, r], i) => { const col = pal[i % 3], cx = px * w + (R() - .5) * w * .05, cy = py * h, rr = r * M, g = x.createRadialGradient(cx, cy, 0, cx, cy, rr); g.addColorStop(0, `rgba(${col},.9)`); g.addColorStop(.35, `rgba(${col},.45)`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  if (kind === 'gold') for (let i = 0; i < 26; i++) { const ex = R() < .5, px = ex ? (R() < .5 ? R() * .2 : .8 + R() * .2) * w : R() * w, py = ex ? R() * h : (R() < .5 ? R() * .2 : .8 + R() * .2) * h, rr = M * (.01 + R() * .05), g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, 'rgba(255,230,150,.7)'); g.addColorStop(.6, 'rgba(255,200,80,.25)'); g.addColorStop(1, 'rgba(255,180,60,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, rr, 0, 7); x.fill(); }
  x.restore();
  if (kind === 'burn') { const g = x.createRadialGradient(w / 2, h / 2, M * .3, w / 2, h / 2, M * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,10,0,.85)'); x.save(); x.globalCompositeOperation = 'multiply'; x.fillStyle = g; x.fillRect(0, 0, w, h); x.restore(); }
}
function starFx(c, amt) {
  const w = c.width, h = c.height, s = Math.min(1, 160 / Math.max(w, h)), sw = Math.max(1, Math.round(w * s)), sh = Math.max(1, Math.round(h * s)), t = mk(sw, sh), tx = cx2(t); tx.drawImage(c, 0, 0, sw, sh);
  const d = tx.getImageData(0, 0, sw, sh).data, pts = [];
  for (let y = 1; y < sh - 1; y++) for (let X = 1; X < sw - 1; X++) { const j = (y * sw + X) * 4, v = .2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2]; if (v > 225) pts.push([v, X, y]); }
  pts.sort((a, b) => b[0] - a[0]); const pick = []; for (const p of pts) { if (pick.length >= 10) break; if (pick.every(q => Math.hypot(q[1] - p[1], q[2] - p[2]) > sw * .12)) pick.push(p); }
  const x = c.getContext('2d'), M = Math.max(w, h); x.save(); x.globalCompositeOperation = 'screen';
  for (const [, px, py] of pick) { const cx = px / s, cy = py / s, L = M * .12 * amt;
    for (let a = 0; a < 6; a++) { const an = a * Math.PI / 3 + .3, ex = Math.cos(an) * L, ey = Math.sin(an) * L, g = x.createLinearGradient(cx, cy, cx + ex, cy + ey); g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(.25, 'rgba(255,80,80,.45)'); g.addColorStop(.45, 'rgba(255,230,60,.35)'); g.addColorStop(.65, 'rgba(60,255,120,.28)'); g.addColorStop(.85, 'rgba(70,120,255,.2)'); g.addColorStop(1, 'rgba(160,60,255,0)'); x.strokeStyle = g; x.lineWidth = Math.max(1, M * .0035); x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + ex, cy + ey); x.stroke(); }
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, M * .03); g.addColorStop(0, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(cx - M * .03, cy - M * .03, M * .06, M * .06); }
  x.restore();
}
function halftoneFx(c) {
  const w = c.width, h = c.height, cs = Math.max(3, Math.round(Math.max(w, h) / 110)), sw = Math.ceil(w / cs), sh = Math.ceil(h / cs), t = mk(sw, sh), tx = cx2(t); tx.drawImage(c, 0, 0, sw, sh);
  const d = tx.getImageData(0, 0, sw, sh).data, L = mk(w, h), lx = L.getContext('2d'); lx.fillStyle = '#fff'; lx.fillRect(0, 0, w, h); lx.fillStyle = '#000';
  for (let y = 0; y < sh; y++) for (let X = 0; X < sw; X++) { const j = (y * sw + X) * 4, v = (.2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2]) / 255, r = cs * .62 * Math.sqrt(1 - v); if (r > .3) { lx.beginPath(); lx.arc(X * cs + cs / 2 + (y & 1) * cs / 2, y * cs + cs / 2, r, 0, 7); lx.fill(); } }
  const x = c.getContext('2d'); x.save(); x.globalCompositeOperation = 'multiply'; x.globalAlpha = .55; x.drawImage(L, 0, 0); x.restore();
}
function scanFx(c, amt) {
  const w = c.width, h = c.height, x = c.getContext('2d'), p = Math.max(2, Math.round(h / 240)); x.save(); x.fillStyle = `rgba(0,0,0,${.22 * amt})`; for (let y = 0; y < h; y += p * 2) x.fillRect(0, y, w, p); x.globalAlpha = .25 * amt; x.globalCompositeOperation = 'lighten'; x.drawImage(c, Math.max(1, w * .004), 0); x.restore();
  if (amt >= 1) { const R = rng(5), y0 = h * (.75 + R() * .15), bh = h * .02; x.save(); x.globalAlpha = .5; x.drawImage(c, 0, y0, w, bh, w * .015, y0, w, bh); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(0, y0, w, bh * .3); x.restore(); }
}
function dustFx(c, amt) {
  const w = c.width, h = c.height, x = c.getContext('2d'), M = Math.max(w, h), R = rng(4242), n = Math.round(140 * amt); x.save();
  for (let i = 0; i < n; i++) { const px = R() * w, py = R() * h, r = M * (.0008 + R() * R() * .004), lt = R() < .7; x.fillStyle = lt ? `rgba(255,250,235,${.25 + R() * .45})` : `rgba(20,15,10,${.2 + R() * .4})`; x.beginPath(); x.ellipse(px, py, r, r * (.4 + R() * .6), R() * 3, 0, 7); x.fill(); }
  for (let i = 0; i < Math.round(9 * amt); i++) { const px = R() * w, py = R() * h, L = M * (.05 + R() * .3); x.strokeStyle = `rgba(255,250,235,${.15 + R() * .25})`; x.lineWidth = Math.max(.5, M * .0007); x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + (R() - .5) * M * .03, py + L / 2, px + (R() - .5) * M * .02, py + L); x.stroke(); }
  for (let i = 0; i < Math.round(5 * amt); i++) { const px = R() * w, py = R() * h, L = M * (.02 + R() * .06); x.strokeStyle = `rgba(40,30,20,${.15 + R() * .2})`; x.lineWidth = Math.max(.5, M * .001); x.beginPath(); x.moveTo(px, py); x.bezierCurveTo(px + L * (R() - .5), py + L * (R() - .5), px + L * (R() - .5), py + L * (R() - .5), px + L * (R() - .5), py + L * (R() - .5)); x.stroke(); }
  x.restore();
}
function renderLook(src, id) {
  const P = LOOK[id], c = clone(src); if (!P) return c;
  applyLUT(c, lookLUT(id));
  if (P.mirror) mirrorFx(c);
  if (P.clarity) clarityFx(c, P.clarity);
  if (P.split) splitFx(c, P.split, P.glitch);
  if (P.mist) glow(c, P.mist, [1, 1, 1], .3, .045);
  if (P.haze) hazeFx(c, P.haze);
  if (P.halation) glow(c, P.halation * .9, [1, .28, .08], .72, .012);
  if (P.bloom) glow(c, P.bloom, [1, .96, .9], .62, .03);
  if (P.star) starFx(c, P.star);
  if (P.leak) leakFx(c, P.leak);
  if (P.halftone) halftoneFx(c);
  if (P.vignette) vignette(c, P.vignette);
  if (P.scan) scanFx(c, P.scan);
  if (P.dust) dustFx(c, P.dust);
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
const strip = $('#looksStrip'); let thumbBase = null, thumbSrc = null, lookCat = 'all';
const chips = document.createElement('div'); chips.id = 'lookCats';
LOOK_CATS.forEach(([k, n]) => { const c = document.createElement('button'); c.dataset.cat = k; c.textContent = n; c.onclick = () => setLookCat(k); chips.appendChild(c); });
strip.before(chips);
function setLookCat(k) {
  lookCat = k; chips.querySelectorAll('button').forEach(c => c.classList.toggle('on', c.dataset.cat === k));
  strip.querySelectorAll('.look,.lhead').forEach(b => { const c = b.dataset.cat || (b.classList.contains('mine') ? 'my' : ''); b.hidden = k !== 'all' && c !== k && b.dataset.look !== '' ; if (b.classList.contains('lhead')) b.hidden = k !== 'all'; });
  strip.scrollLeft = 0; queueVisible();
}
// Lazy thumbnails: only items scrolled into view get rendered, a few per frame.
const thumbQ = new Set(); let thumbRAF = 0;
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { if (es.some(e => e.isIntersecting && e.target._sig !== thumbBase)) queueVisible(); }, { root: strip, rootMargin: '0px 120px' }) : null;
function pumpThumbs() {
  if (thumbRAF || !thumbSrc) return;
  const step = () => { thumbRAF = 0; const t0 = performance.now();
    for (const b of thumbQ) { if (performance.now() - t0 > 12) break; thumbQ.delete(b); if (!b.isConnected || b.hidden || b._sig === thumbBase || !LOOK[b.dataset.look] && b.dataset.look) continue; const c = b.querySelector('canvas'), r = b.dataset.look ? renderLook(thumbSrc, b.dataset.look) : thumbSrc; c.width = thumbSrc.width; c.height = thumbSrc.height; c.getContext('2d').drawImage(r, 0, 0); b._sig = thumbBase; }
    if (thumbQ.size) thumbRAF = requestAnimationFrame(step); };
  thumbRAF = requestAnimationFrame(step);
}
function queueVisible() { const sr = strip.getBoundingClientRect(), vis = [], rest = []; strip.querySelectorAll('.look').forEach(b => { if (b.hidden || b._sig === thumbBase) return; const r = b.getBoundingClientRect(); (r.right > sr.left - 120 && r.left < sr.right + 120 ? vis : rest).push(b); }); thumbQ.clear(); vis.concat(rest).forEach(b => thumbQ.add(b)); pumpThumbs(); }
function buildStrip() {
  strip.innerHTML = ''; thumbQ.clear(); io && io.disconnect();
  const mkItem = (id, name, cat) => { const b = document.createElement('button'); b.className = 'look'; b.dataset.look = id; if (cat) b.dataset.cat = cat; const c = mk(1, 1); b.append(c, Object.assign(document.createElement('span'), { textContent: name })); b.onclick = () => setLook(id); strip.appendChild(b); io && io.observe(b); };
  mkItem('', 'Original'); LOOKS.forEach(([id, n, , cat]) => mkItem(id, n, cat));
}
buildStrip(); setLookCat('all');
function refreshLooks() {
  const cur = curLook(); strip.querySelectorAll('.look').forEach(b => b.classList.toggle('on', (cur ? cur.p.look : '') === b.dataset.look));
  if (cur) { $('#lookAmt').value = cur.p.amount; $('#lookAmtV').textContent = Math.round(cur.p.amount) + '%'; }
  if (!doc || strip.offsetParent === null) return;
  const base = composite(mk(doc.w, doc.h), doc.layers.filter(l => !isLook(l)));
  const sig = baseSig(base) + 'x' + doc.w + 'x' + doc.h;
  if (sig !== thumbBase) { thumbBase = sig;
    const T0 = strip.querySelector('.look canvas'), px = Math.round((T0.clientWidth || 64) * (devicePixelRatio || 1)), sz = Math.max(48, Math.min(240, px));
    const s = Math.max(sz / doc.w, sz / doc.h), t = mk(sz, sz), tx = t.getContext('2d'); tx.imageSmoothingQuality = 'high'; tx.drawImage(base, (sz - doc.w * s) / 2, (sz - doc.h * s) / 2, doc.w * s, doc.h * s); thumbSrc = t; }
  queueVisible();
}
strip.addEventListener('scroll', () => { clearTimeout(strip._t); strip._t = setTimeout(queueVisible, 60); }, { passive: true });
let looksT = null; const _refreshAll = refreshAll;
refreshAll = function () { _refreshAll(); clearTimeout(looksT); looksT = setTimeout(refreshLooks, 120); if (window.onDocChanged) window.onDocChanged(); };
$('#lookAmt').oninput = e => setLookAmount(e.target.value, false);
$('#lookAmt').onchange = e => setLookAmount(e.target.value, true);
MENUS.Filter.push('-', ...LOOKS.map(([id, n]) => ['Look ▸ ' + n, '', need(() => setLook(id))]), ['Remove Look', '', need(() => setLook(''))]);
Object.assign(window.PF, { LOOKS, LOOK_CATS, setLookCat, setLook, setLookAmount, refreshLooks, renderLook });
