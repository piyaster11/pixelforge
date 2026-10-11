/* PixelForge mobile layout, gestures and one-tap saving. */
'use strict';
const mq = matchMedia('(max-width: 899px)'), isMob = () => mq.matches;
const sheet = $('#sheet'), sec = t => sheet.querySelector(`section[data-tab="${t}"]`);
let sheetTab = null, editSub = 'adjust';
function layout() {
  if (isMob()) {
    sec('looks').appendChild($('#pLooks')); sec('tools').append($('#options'), $('#tools')); sec('layers').appendChild($('#pLayers')); sec('adjust').appendChild($('#pProps'));
  } else {
    const p = $('#panels'); p.prepend($('#pLooks')); $('#pLooks').after($('#pLayers')); $('#pLayers').after($('#pProps'));
    $('#main').prepend($('#tools')); $('#menubar').after($('#options')); sheet.hidden = true; sheetTab = null; tabState();
  }
  requestAnimationFrame(() => { resizeView(); if (doc) fit(); });
}
function tabState() { document.querySelectorAll('#tabbar [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === sheetTab)); }
function openSheet(t) {
  if (!isMob()) return;
  if (t === null || (t === sheetTab && t !== 'looks')) { sheet.hidden = true; sheetTab = null; tabState(); return; }
  sheetTab = t; sheet.hidden = false; sheet.dataset.tab = t;
  sheet.querySelectorAll('section').forEach(s => s.hidden = !(s.dataset.tab === t || (t === 'edit' && s.dataset.tab === editSub)));
  $('#editSeg').hidden = t !== 'edit'; $('#editSeg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.sub === editSub));
  tabState(); if (t === 'looks') refreshLooks(); if (t === 'save') prepSave();
}
document.querySelectorAll('#tabbar [data-tab]').forEach(b => b.onclick = () => openSheet(b.dataset.tab === sheetTab && b.dataset.tab === 'looks' ? null : b.dataset.tab));
$('#editSeg').querySelectorAll('button').forEach(b => b.onclick = () => { editSub = b.dataset.sub; openSheet('edit'); });
sheet.querySelector('.grab').onclick = () => openSheet(null);
mq.addEventListener('change', layout);

// Adjust buttons (adjustment layers + filters)
const adjBox = $('#adjBtns');
Object.keys(ADJ).filter(k => k !== 'look').forEach(k => { const b = document.createElement('button'); b.textContent = '＋ ' + ADJ[k].name; b.onclick = need(() => addAdjLayer(k)); adjBox.appendChild(b); });
Object.keys(FILTERS).forEach(k => { const b = document.createElement('button'); b.textContent = FILTERS[k].name; b.onclick = need(() => runFilter(k)); adjBox.appendChild(b); });

// Top bar
$('#mUndo').onclick = undo; $('#mRedo').onclick = redo;
$('#mMenu').onclick = e => {
  e.stopPropagation(); if (!dd.hidden) return hideMenu(); dd.innerHTML = ''; dd.classList.add('msheet');
  for (const name of Object.keys(MENUS)) { dd.insertAdjacentHTML('beforeend', `<div class="mh">${name}</div>`); for (const it of MENUS[name]) { if (it === '-') continue; const d = document.createElement('div'); d.className = 'it'; d.textContent = it[0]; d.onclick = () => { hideMenu(); it[2](); }; dd.appendChild(d); } }
  dd.style.left = ''; dd.style.top = ''; dd.hidden = false;
};
new MutationObserver(() => { if (dd.hidden) dd.classList.remove('msheet'); }).observe(dd, { attributes: true, attributeFilter: ['hidden'] });

// Open photo
const pickPhoto = () => $('#photoIn').click();
$('#btnPhoto').onclick = pickPhoto; $('#nextBtn').onclick = pickPhoto;
$('#photoIn').onchange = e => { const f = e.target.files[0]; if (f) openFile(f, false); e.target.value = ''; };
let lastDoc = null;
window.onDocChanged = () => {
  if (doc !== lastDoc) { lastDoc = doc; $('#nextBtn').classList.remove('pulse'); if (isMob()) { setTool('hand'); openSheet('looks'); } }
  clearTimeout(prepT); prepT = setTimeout(() => { if (isMob() && doc) prepSave(); }, 900);
};

// Compare (hold to see original)
const cmp = $('#cmpBtn'); let hiddenLooks = null;
const cmpOn = e => { e.preventDefault(); if (!doc || hiddenLooks) return; hiddenLooks = doc.layers.filter(l => l.type === 'adjust' && l.adj === 'look' && l.visible); hiddenLooks.forEach(l => l.visible = false); cmp.classList.add('on'); R(); };
const cmpOff = () => { if (!hiddenLooks) return; hiddenLooks.forEach(l => l.visible = true); hiddenLooks = null; cmp.classList.remove('on'); R(); };
cmp.addEventListener('pointerdown', cmpOn); ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => cmp.addEventListener(t, cmpOff));
cmp.addEventListener('contextmenu', e => e.preventDefault());

// Pinch zoom / two-finger pan
const pts = new Map(); let gest = null;
const stage = $('#stage');
const loc = e => { const r = V.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
stage.addEventListener('pointerdown', e => {
  if (e.target !== V || e.pointerType === 'mouse') return; pts.set(e.pointerId, loc(e));
  if (pts.size === 2 && doc) {
    if (pointerTool) { pointerTool = null; drag = null; if (live) live = null; R(); }
    const [a, b] = [...pts.values()]; gest = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, z0: view.zoom, px: view.px, py: view.py };
  }
  if (gest) e.stopPropagation();
}, true);
stage.addEventListener('pointermove', e => {
  if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, loc(e)); if (!gest) return; e.stopPropagation(); if (pts.size < 2) return;
  const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const z = clamp(gest.z0 * d / gest.d0, 0.02, 64), dx = (gest.m0.x - gest.px) / gest.z0, dy = (gest.m0.y - gest.py) / gest.z0;
  view.zoom = z; view.px = m.x - dx * z; view.py = m.y - dy * z; R(); status();
}, true);
const ptrEnd = e => { if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); if (gest) { e.stopPropagation(); if (!pts.size) gest = null; } };
stage.addEventListener('pointerup', ptrEnd, true); stage.addEventListener('pointercancel', ptrEnd, true);
let lastTap = 0; V.addEventListener('pointerup', e => { if (e.pointerType !== 'touch' || tool !== 'hand') return; const t = Date.now(); if (t - lastTap < 300 && doc) fit(); lastTap = t; });
['gesturestart', 'gesturechange'].forEach(t => document.addEventListener(t, e => e.preventDefault()));
document.addEventListener('touchmove', e => { if (e.touches.length > 1 || e.target === V) e.preventDefault(); }, { passive: false });

// Saving
const prefs = Object.assign({ fmt: 'jpeg', q: 92 }, JSON.parse(localStorage.getItem('pf.save') || '{}'));
const savePrefs = () => { localStorage.setItem('pf.save', JSON.stringify(prefs)); fmtUI(); prepSave(); };
function fmtUI() {
  $('#saveFmtBtn').textContent = (prefs.fmt === 'png' ? 'PNG' : 'JPG') + ' ▾';
  $('#fmtSeg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.f === prefs.fmt));
  $('#qRow').hidden = prefs.fmt === 'png'; $('#saveQ').value = prefs.q; $('#saveQV').textContent = prefs.q + '%';
}
$('#fmtSeg').querySelectorAll('button').forEach(b => b.onclick = () => { prefs.fmt = b.dataset.f; savePrefs(); });
$('#saveQ').oninput = e => { $('#saveQV').textContent = e.target.value + '%'; }; $('#saveQ').onchange = e => { prefs.q = +e.target.value; savePrefs(); };
$('#mExport').onclick = need(exportDialog); $('#mProject').onclick = need(saveProject);
const fileName = () => (doc.name || 'image').replace(/[^\w\- ]+/g, '').trim().slice(0, 60) + '-pixelforge.' + (prefs.fmt === 'png' ? 'png' : 'jpg');
let prepared = null, prepT = null, prepBusy = null;
const sigNow = () => [docVer, prefs.fmt, prefs.q, doc && doc.w, doc && doc.h].join('|');
function prepSave() {
  if (!doc) return Promise.resolve(null); const sig = sigNow();
  if (prepared && prepared.sig === sig) return Promise.resolve(prepared);
  if (prepBusy && prepBusy.sig === sig) return prepBusy.p;
  $('#saveInfo').textContent = 'Preparing full-resolution image…';
  const p = exportBlob(prefs.fmt, prefs.q / 100).then(blob => { const f = new File([blob], fileName(), { type: blob.type || 'image/' + prefs.fmt }); prepared = { sig, file: f }; if (prepBusy && prepBusy.sig === sig) prepBusy = null; $('#saveInfo').textContent = `${doc.w}×${doc.h} · ${(f.size / 1048576).toFixed(1)} MB`; return prepared; });
  prepBusy = { sig, p }; return p;
}
const canShareFiles = f => isMob() && navigator.canShare && navigator.share && navigator.canShare({ files: [f] });
async function doShare(file) {
  try { await navigator.share({ files: [file] }); afterSave(); }
  catch (e) { if (e.name === 'AbortError') return; if (e.name === 'NotAllowedError') { toast('Ready — tap Save again'); return; } download(file, file.name); afterSave(); }
}
function afterSave() { toast('Saved ✓  Tap “New photo” for the next one'); $('#nextBtn').classList.add('pulse'); }
function saveImage() {
  if (!doc) return toast('Open a photo first');
  if (isMob() && prepared && prepared.sig === sigNow()) { const f = prepared.file; if (canShareFiles(f)) return doShare(f); download(f, f.name); return afterSave(); }
  toast('Preparing…');
  prepSave().then(pr => { if (!pr) return; if (canShareFiles(pr.file)) return doShare(pr.file); download(pr.file, pr.file.name); afterSave(); });
}
$('#saveBtn').onclick = saveImage; $('#shareBtn').onclick = saveImage;
$('#saveFmtBtn').onclick = () => {
  if (isMob()) return openSheet('save');
  dialog('Save format', [['format', 'Format', 'select', prefs.fmt === 'png' ? 'PNG' : 'JPG', ['JPG', 'PNG']], ['quality', 'JPG quality %', 'range', prefs.q, 50, 100, 1]], null, v => { prefs.fmt = v.format === 'PNG' ? 'png' : 'jpeg'; prefs.q = +v.quality; savePrefs(); });
};
fmtUI(); layout();
Object.assign(window.PF, { saveImage, openSheet, prefs }); Object.defineProperty(window.PF, "prepared", { get: () => prepared });
// Fit the photo into the area above an open bottom sheet on phones.
fit = function () {
  if (!doc) return; const r = V.getBoundingClientRect(), sh = isMob() && !sheet.hidden ? sheet.getBoundingClientRect().height : 0, H = r.height - sh, pad = isMob() ? 16 : 40;
  view.zoom = Math.min((r.width - pad) / doc.w, (H - pad) / doc.h, 1) || 1; view.px = (r.width - doc.w * view.zoom) / 2; view.py = (H - doc.h * view.zoom) / 2; R(); status();
};
const _openSheet = openSheet; openSheet = function (t) { const was = sheet.hidden; _openSheet(t); if (doc && was !== sheet.hidden) requestAnimationFrame(fit); };
