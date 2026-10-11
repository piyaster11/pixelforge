/* PixelForge "My Looks": learn a colour grade from reference photos. Stores only small statistics, never the photos. */
'use strict';
const MYKEY = 'pf.myLooks', NQ = 33;
let MY = []; try { MY = JSON.parse(localStorage.getItem(MYKEY) || '[]').filter(v => v && v.id && v.q); } catch (e) { MY = []; }
const saveMy = () => { try { localStorage.setItem(MYKEY, JSON.stringify(MY)); } catch (e) { toast('Could not save look (storage full?)'); } };
function small(c, n = 256) { const s = Math.min(1, n / Math.max(c.width, c.height)), t = mk(c.width * s, c.height * s), x = cx2(t); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, t.width, t.height); return t; }
function stats(c) {
  const t = small(c), w = t.width, h = t.height, d = cx2(t).getImageData(0, 0, w, h).data, H = [new Float64Array(256), new Float64Array(256), new Float64Array(256)];
  let n = 0, ch = 0, ctr = 0, cn = 0, cor = 0, kn = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (d[i + 3] < 128) continue; const r = d[i], g = d[i + 1], b = d[i + 2]; H[0][r]++; H[1][g]++; H[2][b]++; n++; ch += Math.max(r, g, b) - Math.min(r, g, b);
    const rr = Math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2)), L = .2126 * r + .7152 * g + .0722 * b; if (rr < .45) { ctr += L; cn++; } else if (rr > 1.15) { cor += L; kn++; }
  }
  const cdf = H.map(hh => { const o = new Float64Array(256); let a = 0; for (let v = 0; v < 256; v++) { a += hh[v]; o[v] = (a - hh[v] / 2) / Math.max(1, n); } return o; });
  const q = cdf.map(o => { const out = []; for (let k = 0; k < NQ; k++) { const p = Math.min(.999, Math.max(.001, k / (NQ - 1))); let v = 0; while (v < 255 && o[v] < p) v++; const lo = v ? o[v - 1] : 0, f = o[v] > lo ? (p - lo) / (o[v] - lo) : 0; out.push(+(Math.max(0, v - 1 + f)).toFixed(2)); } return out; });
  return { cdf, q, chroma: ch / Math.max(1, n), vig: cn && kn ? Math.max(0, 1 - (cor / kn) / Math.max(1, ctr / cn)) : 0 };
}
async function learnFromFiles(files) {
  const S = []; for (const f of files) { try { S.push(stats(await fileToCanvas(f))); } catch (e) { console.warn(e); } }
  if (!S.length) return toast('Could not read those photos');
  const q = [0, 1, 2].map(c => Array.from({ length: NQ }, (_, k) => +(S.reduce((a, s) => a + s.q[c][k], 0) / S.length).toFixed(2)));
  const look = { id: 'my-' + Date.now().toString(36), name: 'My Look ' + (MY.length + 1), q, chroma: +(S.reduce((a, s) => a + s.chroma, 0) / S.length).toFixed(2), vig: +(S.reduce((a, s) => a + s.vig, 0) / S.length).toFixed(3), refs: S.length, v: 1 };
  addMy(look); setLook(look.id); toast(`Look learned from ${S.length} photo${S.length > 1 ? 's' : ''}`); return look;
}
// Adaptive transfer: histogram-match each channel of the target photo to the reference quantiles, then match colourfulness.
function curvesFor(P, srcCdf) {
  return [0, 1, 2].map(c => { const Q = P.q[c], o = new Float32Array(256); for (let v = 0; v < 256; v++) { const p = srcCdf[c][v] * (NQ - 1), k = Math.min(NQ - 2, Math.floor(p)), f = p - k; o[v] = Q[k] + (Q[k + 1] - Q[k]) * f; }
    const s = new Float32Array(256); for (let v = 0; v < 256; v++) { let a = 0, m = 0; for (let j = -4; j <= 4; j++) { const u = v + j; if (u >= 0 && u < 256) { a += o[u]; m++; } } s[v] = a / m; }
    for (let v = 1; v < 256; v++) if (s[v] < s[v - 1]) s[v] = s[v - 1]; return s; });
}
function renderLearned(src, P) {
  const st = stats(src), C = curvesFor(P, st.cdf), c = clone(src), x = cx2(c), id = x.getImageData(0, 0, c.width, c.height), d = id.data;
  // estimate chroma after curves on the small stats image
  const t = small(src, 128), td = cx2(t).getImageData(0, 0, t.width, t.height).data; let cs = 0, cn = 0;
  for (let i = 0; i < td.length; i += 4) { const r = C[0][td[i]], g = C[1][td[i + 1]], b = C[2][td[i + 2]]; cs += Math.max(r, g, b) - Math.min(r, g, b); cn++; }
  const sat = clamp(P.chroma / Math.max(1, cs / cn), .55, 1.7);
  for (let j = 0; j < d.length; j += 4) { const r = C[0][d[j]], g = C[1][d[j + 1]], b = C[2][d[j + 2]], y = .2126 * r + .7152 * g + .0722 * b; d[j] = y + (r - y) * sat; d[j + 1] = y + (g - y) * sat; d[j + 2] = y + (b - y) * sat; }
  x.putImageData(id, 0, 0);
  if (P.vig > .12) vignette(c, Math.min(.6, (P.vig - .1) * 1.5));
  x.globalCompositeOperation = 'destination-in'; x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-over';
  return c;
}
const _renderLook = renderLook;
renderLook = function (src, id) { const P = LOOK[id]; return P && P.q ? renderLearned(src, P) : _renderLook(src, id); };
function addMy(l) { MY = MY.filter(m => m.id !== l.id); MY.push(l); saveMy(); LOOK[l.id] = l; rebuildStrip(); }
MY.forEach(l => LOOK[l.id] = l);
// .cube export: bake assuming a neutral source (identity CDF), so it works in other apps (Lightroom, CapCut, LumaFusion…).
function cubeText(P) {
  const id = Array.from({ length: 256 }, (_, v) => (v + .5) / 256), C = curvesFor(P, [id, id, id]), N = 33, sat = clamp(P.chroma / 40, .7, 1.4), L = [`TITLE "${P.name.replace(/"/g, '')}"`, `LUT_3D_SIZE ${N}`, 'DOMAIN_MIN 0 0 0', 'DOMAIN_MAX 1 1 1'];
  for (let b = 0; b < N; b++) for (let g = 0; g < N; g++) for (let r = 0; r < N; r++) { const m = k => C[k][Math.round([r, g, b][k] / (N - 1) * 255)]; let R = m(0), G = m(1), B = m(2); const y = .2126 * R + .7152 * G + .0722 * B; R = y + (R - y) * sat; G = y + (G - y) * sat; B = y + (B - y) * sat; L.push([R, G, B].map(v => (clamp(v, 0, 255) / 255).toFixed(5)).join(' ')); }
  return L.join('\n') + '\n';
}
const safeName = n => n.replace(/[^\w\- ]+/g, '').trim() || 'look';
function exportLook(id, kind) { const P = MY.find(m => m.id === id); if (!P) return; if (kind === 'cube') download(new Blob([cubeText(P)], { type: 'text/plain' }), safeName(P.name) + '.cube'); else download(new Blob([JSON.stringify({ app: 'PixelForge', kind: 'looks', looks: [P] })], { type: 'application/json' }), safeName(P.name) + '.pflook.json'); }
function exportAll() { if (!MY.length) return toast('No saved looks yet'); download(new Blob([JSON.stringify({ app: 'PixelForge', kind: 'looks', looks: MY })], { type: 'application/json' }), 'my-looks.pflook.json'); }
async function importLooks(file) {
  try { const d = JSON.parse(await file.text()), arr = Array.isArray(d) ? d : d.looks || [d]; let n = 0;
    for (const l of arr) { if (!l || !Array.isArray(l.q) || l.q.length !== 3 || l.q.some(a => !Array.isArray(a) || a.length !== NQ || a.some(v => typeof v !== 'number'))) continue; addMy({ id: typeof l.id === 'string' && /^my-[\w]+$/.test(l.id) ? l.id : 'my-' + Date.now().toString(36) + n, name: String(l.name || 'Imported look').slice(0, 40), q: l.q, chroma: +l.chroma || 30, vig: +l.vig || 0, refs: l.refs || 1, v: 1 }); n++; }
    toast(n ? `Imported ${n} look${n > 1 ? 's' : ''}` : 'No looks found in that file'); return n;
  } catch (e) { toast('Not a PixelForge looks file'); return 0; }
}
function renameLook(id, name) { const P = MY.find(m => m.id === id); if (!P || !name) return; P.name = String(name).slice(0, 40); LOOK[id] = P; saveMy(); rebuildStrip(); doc && doc.layers.forEach(l => { if (l.p && l.p.look === id) l.name = 'Look: ' + P.name; }); refreshAll(); }
function deleteLook(id) { MY = MY.filter(m => m.id !== id); delete LOOK[id]; saveMy(); if (doc) { const had = doc.layers.some(l => l.p && l.p.look === id); if (had) { doc.layers = doc.layers.filter(l => !(l.p && l.p.look === id)); doc.active = clamp(doc.active, 0, doc.layers.length - 1); commit('Delete Look'); } } rebuildStrip(); }
// UI
const bar = document.createElement('div'); bar.id = 'myBar';
bar.innerHTML = '<button id="learnBtn" class="primary">＋ Create look from photos</button><button id="impBtn">Import</button><button id="expAllBtn">Export all</button><div id="myTools" hidden><span id="myName"></span><button data-a="ren">Rename</button><button data-a="json">Export</button><button data-a="cube">.cube</button><button data-a="del">Delete</button></div>';
$('#looksStrip').after(bar);
document.body.insertAdjacentHTML('beforeend', '<input type="file" id="learnIn" accept="image/*" multiple hidden><input type="file" id="lookImpIn" accept=".json,application/json" hidden>');
$('#learnBtn').onclick = () => $('#learnIn').click(); $('#impBtn').onclick = () => $('#lookImpIn').click(); $('#expAllBtn').onclick = exportAll;
$('#learnIn').onchange = async e => { const f = [...e.target.files]; e.target.value = ''; if (!f.length) return; if (!doc) toast('Look will be ready once you open a photo'); toast('Learning style…'); const l = await learnFromFiles(f); if (l) { const n = prompt('Name this look', l.name); if (n) renameLook(l.id, n); } };
$('#lookImpIn').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) importLooks(f); };
$('#myTools').onclick = e => { const a = e.target.dataset.a, l = curLook(), id = l && l.p.look; if (!a || !id || !id.startsWith('my-')) return;
  if (a === 'ren') { const n = prompt('Rename look', LOOK[id].name); if (n) renameLook(id, n); } else if (a === 'del') { if (confirm('Delete “' + LOOK[id].name + '”?')) deleteLook(id); } else exportLook(id, a); };
function rebuildStrip() {
  buildStrip(); thumbBase = null;
  const first = strip.querySelector('.look'); if (MY.length) { const h = Object.assign(document.createElement('div'), { className: 'lhead', textContent: 'My Looks' }); first.after(h); let at = h;
    MY.forEach(m => { const b = document.createElement('button'); b.className = 'look mine'; b.dataset.look = m.id; b.append(mk(1, 1), Object.assign(document.createElement('span'), { textContent: m.name })); b.onclick = () => setLook(m.id); at.after(b); at = b; });
    const h2 = Object.assign(document.createElement('div'), { className: 'lhead', textContent: 'Presets' }); at.after(h2); }
  refreshLooks();
}
const _refreshLooks = refreshLooks;
refreshLooks = function () { _refreshLooks(); const l = curLook(), id = l && l.p.look, mine = !!(id && id.startsWith('my-') && LOOK[id]); $('#myTools').hidden = !mine; if (mine) $('#myName').textContent = LOOK[id].name; };
rebuildStrip();
Object.assign(window.PF, { learnFromFiles, importLooks, exportLook, renameLook, deleteLook, cubeText });
Object.defineProperty(window.PF, 'myLooks', { get: () => MY });
