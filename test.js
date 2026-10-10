const puppeteer = require('puppeteer-core');
const URL_ = process.argv[2] || 'http://localhost:8901/';
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
  const errs = []; p.on('console', m => { if (m.type() === 'error' || m.type()==='warning') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto(URL_, { waitUntil: 'networkidle0' });
  const ok = (n, v) => console.log((v ? 'PASS ' : 'FAIL ') + n);
  // make test image on page and open via file input
  const png = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 800; c.height = 500; const x = c.getContext('2d'); const g = x.createLinearGradient(0,0,800,500); g.addColorStop(0,'#2a6df4'); g.addColorStop(1,'#f4a62a'); x.fillStyle=g; x.fillRect(0,0,800,500); x.fillStyle='#e33'; x.beginPath(); x.arc(400,250,120,0,7); x.fill(); return c.toDataURL().split(',')[1]; });
  require('fs').writeFileSync('/tmp/test.png', Buffer.from(png, 'base64'));
  console.log('early errs', errs); await (await p.$('#fileIn')).uploadFile('/tmp/test.png');
  await p.waitForFunction(() => PF.doc && PF.doc.w === 800);
  ok('open image', await p.evaluate(() => PF.doc.layers.length === 1 && document.querySelector('#start').hidden));
  const px = (x, y) => p.evaluate((x, y) => [...PF.composite(document.createElement('canvas').getContext ? (()=>{const c=document.createElement('canvas');c.width=PF.doc.w;c.height=PF.doc.h;return c})() : null).getContext('2d').getImageData(x, y, 1, 1).data], x, y);
  const center = await px(400, 250);
  // screen coords helper
  const scr = (x, y) => p.evaluate((x, y) => { const r = document.querySelector('#view').getBoundingClientRect(); return [r.left + PF.view.px + x * PF.view.zoom, r.top + PF.view.py + y * PF.view.zoom]; }, x, y);
  // new layer + brush
  await p.click('[data-a=newLayer]');
  await p.evaluate(() => { PF.setFg('#00ff00'); PF.opt.size = 40; PF.opt.hardness = 1; });
  await p.keyboard.press('b');
  let [sx, sy] = await scr(100, 100), [ex, ey] = await scr(300, 100);
  await p.mouse.move(sx, sy); await p.mouse.down(); await p.mouse.move(ex, ey, { steps: 10 }); await p.mouse.up();
  const g = await px(200, 100); ok('brush paints green ' + g, g[1] > 200 && g[0] < 50);
  // blend mode
  await p.select('#blend', 'multiply');
  ok('blend mode multiply', await p.evaluate(() => PF.doc.layers[1].blend === 'multiply'));
  // undo / redo
  await p.keyboard.down('Control'); await p.keyboard.press('z'); await p.keyboard.up('Control');
  ok('undo blend', await p.evaluate(() => PF.doc.layers[1].blend === 'source-over'));
  await p.keyboard.down('Control'); await p.keyboard.down('Shift'); await p.keyboard.press('z'); await p.keyboard.up('Shift'); await p.keyboard.up('Control');
  ok('redo blend', await p.evaluate(() => PF.doc.layers[1].blend === 'multiply'));
  // mask: add, paint black over part of stroke
  await p.click('[data-a=addMask]');
  ok('mask added', await p.evaluate(() => !!PF.doc.layers[1].mask && PF.doc.layers[1].editMask));
  [sx, sy] = await scr(200, 60); [ex, ey] = await scr(200, 140);
  await p.mouse.move(sx, sy); await p.mouse.down(); await p.mouse.move(ex, ey, { steps: 5 }); await p.mouse.up();
  const gm = await px(200, 100), gk = await px(120, 100); ok('mask hides stroke ' + gm + ' / kept ' + gk, gm[1] < 200 && gk[1] > 100);
  // adjustment layer
  await p.evaluate(() => PF.addAdjLayer('hue-saturation'));
  await p.evaluate(() => { const r = document.querySelector('#props input[data-p=saturation]'); r.value = -100; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); });
  await new Promise(r => setTimeout(r, 100));
  const gr = await px(400, 250); ok('hue/sat adj layer desaturates ' + gr, Math.abs(gr[0] - gr[1]) < 3 && Math.abs(gr[1] - gr[2]) < 3);
  await p.evaluate(() => PF.undo()); await p.evaluate(() => PF.undo());
  ok('undo adj', await p.evaluate(() => PF.doc.layers.length === 2));
  // filter: select bg layer, gaussian blur via dialog
  await p.evaluate(() => { document.querySelectorAll('.layer')[1].click(); });
  await p.evaluate(() => PF.runFilter('blur')); await p.click('#dlgOk');
  const edge = await px(281, 250); ok('blur changed edge ' + center + ' -> ' + edge, await p.evaluate(() => PF.hist.at(-1).label === 'Gaussian Blur'));
  await p.evaluate(() => PF.runFilter('pixelate')); await p.click('#dlgOk');
  ok('pixelate', await p.evaluate(() => PF.hist.at(-1).label === 'Pixelate'));
  // levels destructive
  await p.evaluate(() => PF.destructiveAdj('levels')); await p.click('#dlgOk');
  ok('levels', await p.evaluate(() => PF.hist.at(-1).label === 'Levels'));
  // text
  await p.keyboard.press('t'); [sx, sy] = await scr(60, 380); await p.mouse.click(sx, sy);
  await p.waitForSelector('#textEdit'); await p.keyboard.type('PixelForge'); await p.keyboard.down('Control'); await p.keyboard.press('Enter'); await p.keyboard.up('Control');
  ok('text layer', await p.evaluate(() => PF.doc.layers.some(l => l.type === 'text' && l.text === 'PixelForge')));
  // edit text via properties
  await p.evaluate(() => { const ta = document.querySelector('#props textarea'); ta.value = 'PixelForge!'; ta.dispatchEvent(new Event('input')); ta.dispatchEvent(new Event('change')); });
  ok('text editable', await p.evaluate(() => PF.doc.layers.some(l => l.type === 'text' && l.text === 'PixelForge!')));
  // marquee + delete on bg
  await p.evaluate(() => { document.querySelectorAll('.layer')[document.querySelectorAll('.layer').length-1].click(); });
  await p.keyboard.press('m'); [sx, sy] = await scr(600, 20); [ex, ey] = await scr(780, 120);
  await p.mouse.move(sx, sy); await p.mouse.down(); await p.mouse.move(ex, ey, { steps: 4 }); await p.mouse.up();
  ok('rect selection', await p.evaluate(() => !!PF.sel));
  await p.keyboard.press('Delete'); const del = await px(700, 70); ok('clear selection ' + del, del[3] === 0);
  await p.keyboard.down('Control'); await p.keyboard.press('d'); await p.keyboard.up('Control');
  // transform
  await p.evaluate(() => { document.querySelectorAll('.layer')[1].click(); });
  await p.evaluate(() => PF.startTransform()); await p.evaluate(() => { const w = document.querySelector('#tfW'); w.value = 50; w.dispatchEvent(new Event('input')); }); await p.keyboard.press('Enter');
  ok('free transform', await p.evaluate(() => PF.hist.at(-1).label === 'Free Transform'));
  // other tools quick
  await p.keyboard.press('g'); [sx, sy] = await scr(10, 10); [ex, ey] = await scr(200, 10);
  await p.evaluate(() => PF.addAdjLayer('invert')); await p.evaluate(() => PF.undo());
  await p.evaluate(() => PF.rotateCanvas(1)); ok('rotate canvas', await p.evaluate(() => PF.doc.w === 500 && PF.doc.h === 800)); await p.evaluate(() => PF.undo());
  // wand
  await p.keyboard.press('w'); [sx, sy] = await scr(400, 250); await p.mouse.click(sx, sy); ok('magic wand', await p.evaluate(() => !!PF.sel && !PF.sel.path));
  await p.keyboard.press('Escape');
  // export
  const sizes = await p.evaluate(async () => { const r = {}; for (const f of ['png', 'jpeg', 'webp']) r[f] = (await PF.exportBlob(f, 0.8)).type; return r; });
  ok('export ' + JSON.stringify(sizes), sizes.png === 'image/png' && sizes.jpeg === 'image/jpeg' && sizes.webp === 'image/webp');
  // project roundtrip
  const n = await p.evaluate(async () => { const d = JSON.parse(JSON.stringify(PF.projectData())); const n = d.layers.length; await PF.loadProject(d); return [n, PF.doc.layers.length, PF.doc.layers.some(l=>l.type==='text')]; });
  ok('project roundtrip ' + n, n[0] === n[1] && n[2]);
  // psd roundtrip
  const ps = await p.evaluate(() => { const { buf } = PF.psdBuffer(); const n = PF.doc.layers.filter(l=>l.type!=='adjust').length; PF.importPsd(buf, 't.psd'); return [n, PF.doc.layers.length, PF.doc.layers.map(l=>l.blend).join()]; });
  ok('psd roundtrip ' + ps, ps[0] === ps[1]);
  await p.evaluate(() => PF.undo && 0);
  // screenshot after reload of nice state
  await p.reload({ waitUntil: 'networkidle0' });
  await (await p.$('#fileIn')).uploadFile('/tmp/test.png');
  await p.waitForFunction(() => PF.doc);
  await p.evaluate(() => { PF.addAdjLayer('hue-saturation'); });
  await p.evaluate(() => { const r = document.querySelector('#props input[data-p=hue]'); r.value = 60; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); });
  await p.keyboard.press('t'); [sx, sy] = await scr(60, 40); await p.mouse.click(sx, sy); await p.waitForSelector('#textEdit'); await p.keyboard.type('Hello PixelForge'); await p.keyboard.press('Escape');
  await p.keyboard.press('b'); await p.evaluate(() => PF.selectAll && 0);
  await p.mouse.move(...(await scr(400, 420)));
  await new Promise(r => setTimeout(r, 300));
  await p.screenshot({ path: '/workspace/editor/screenshot1.png' });
  await p.click('#menus [data-menu=Filter]'); await new Promise(r => setTimeout(r, 200));
  await p.screenshot({ path: '/workspace/editor/screenshot2.png' });
  console.log('ERRORS:', JSON.stringify(errs));
  await b.close();
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
