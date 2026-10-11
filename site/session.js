/* PixelForge crash recovery: autosaves the open photo + look to IndexedDB so a
   tab that iOS reloads (e.g. under memory pressure) comes back where it was. */
'use strict';
(() => {
  const DB = 'pixelforge', ST = 'session';
  const db = () => new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = (mode, fn) => db().then(d => new Promise((res, rej) => { const t = d.transaction(ST, mode), s = t.objectStore(ST), out = fn(s); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }));
  const put = (k, v) => tx('readwrite', s => s.put(v, k)), get = k => tx('readonly', s => s.get(k));
  const clear = () => { sessionStorage.removeItem('pf.live'); return tx('readwrite', s => s.clear()).catch(() => {}); };
  const toBlob = (c, q = .95) => new Promise(r => c.toBlob(r, 'image/jpeg', q));
  let restoring = false, t = null, origSnap = null;
  const isLook = l => l.type === 'adjust' && l.adj === 'look';
  window.onDocLoaded = async label => {
    if (restoring || label !== 'Open' || !doc || !doc.orig || doc.orig.layers.length !== 1) { origSnap = null; return; }
    origSnap = doc.orig.layers[0].canvas; const name = doc.name;
    try { const blob = await toBlob(origSnap); await put('orig', { blob, name, w: doc.w, h: doc.h, at: Date.now() }); await put('state', { look: null, amount: 100, base: null }); sessionStorage.setItem('pf.live', '1'); } catch (e) { console.warn('autosave', e); }
  };
  async function saveState() {
    if (!doc || !origSnap || !origSnap.width) return;
    const look = doc.layers.find(isLook), rest = doc.layers.filter(l => !isLook(l));
    let base = null;
    const same = rest.length === 1 && rest[0].visible && rest[0].opacity === 1 && !rest[0].mask && doc.w === origSnap.width && doc.h === origSnap.height && !rest[0].canvas._dirty && snapOf.get(rest[0].canvas) === origSnap;
    if (!same) { const c = composite(mk(doc.w, doc.h), rest); base = await toBlob(c, .92); releaseCanvas(c); }
    try { await put('state', { look: look ? look.p.look : null, amount: look ? look.p.amount : 100, base }); } catch (e) { console.warn('autosave', e); }
  }
  window.onCommitted = () => { if (restoring || !origSnap) return; clearTimeout(t); t = setTimeout(saveState, 1200); };
  async function restore(o, st) {
    restoring = true;
    try {
      const c = await fileToCanvas(new File([o.blob], 'restore.jpg', { type: 'image/jpeg' }));
      doc = { w: c.width, h: c.height, layers: [], active: 0, name: o.name }; uid = 1; doc.layers.push(newLayer({ name: 'Background', canvas: c })); afterDocLoad('Open');
      origSnap = doc.orig.layers[0].canvas;
      if (st && st.base) { const b = await fileToCanvas(new File([st.base], 'b.jpg', { type: 'image/jpeg' })); doc.w = b.width; doc.h = b.height; doc.layers = [newLayer({ name: 'Background', canvas: b })]; doc.active = 0; releaseCanvas(comp); comp = mk(doc.w, doc.h); commit('Restored edits'); fit(); }
      if (st && st.look && LOOK[st.look]) { $('#lookAmt').value = st.amount; setLook(st.look); setLookAmount(st.amount, true); }
      window.onDocChanged && window.onDocChanged();
      toast('Restored your last photo');
    } catch (e) { console.warn('restore', e); clear(); }
    finally { restoring = false; sessionStorage.setItem('pf.live', '1'); }
  }
  async function boot() {
    let o, st; try { o = await get('orig'); st = await get('state'); } catch (e) { return; }
    if (!o || !o.blob || doc) return;
    if (sessionStorage.getItem('pf.live')) return restore(o, st);   // tab was reloaded/killed mid-session
    dialog('Restore your last photo?', [], null, () => restore(o, st), () => clear());
    $('#dlgBody').innerHTML = `<p style="margin:0">“${(o.name || 'photo').replace(/[<>&]/g, '')}” from ${new Date(o.at).toLocaleString()} wasn’t closed. Pick up where you left off?</p>`; $('#dlgOk').textContent = 'Restore'; $('#dlgCancel').textContent = 'Discard';
  }
  const dc = $('#dlgCancel'), dcText = dc.textContent; new MutationObserver(() => { if ($('#modal').hidden) dc.textContent = dcText; }).observe($('#modal'), { attributes: true, attributeFilter: ['hidden'] });
  $('#nextBtn').addEventListener('click', () => { origSnap = null; clear(); });
  window.PF.session = { clear, get, saveState, flush: () => { clearTimeout(t); return saveState(); } };
  boot();
})();
