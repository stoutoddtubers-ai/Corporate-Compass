// Side jobs and lucky cats: starts and finishes every job, checks they tidy up, and checks
// the cats (100 fixed places, collected by walking over them, remembered after a reload).
//
//   npx vite build --outDir <folder> --emptyOutDir
//   python3 -m http.server 4184 -d <folder>
//   node tools/test/sidejobs.cjs            (GAME_URL=http://... to test another address)
//
// Exits with code 1 on any failed check or any error in the page.
const { chromium } = require('playwright');

const URL = process.env.GAME_URL || 'http://localhost:4184/';
const CATS_KEY = 'kogane.cats.v1';
let checks = 0;
const fails = [];
const ok = (cond, what, detail) => {
  checks++;
  if (cond) console.log('  ok   ' + what);
  else { fails.push(what); console.log('  FAIL ' + what + (detail !== undefined ? '  -> ' + JSON.stringify(detail) : '')); }
};

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e.stack || e)));
  const ev = (f, a) => page.evaluate(f, a);
  const wait = (ms) => page.waitForTimeout(ms);
  const until = async (f, what, a, ms = 8000) => {
    try { await page.waitForFunction(f, a, { timeout: ms, polling: 50 }); return true; } catch { ok(false, 'timed out waiting: ' + what, await state()); return false; }
  };
  /** Title screen -> the street (Enter picks "New game" on a fresh browser, "Continue" once there is a save). */
  const enterGame = async () => {
    for (let i = 0; i < 60 && !(await ev(() => !!(window.__kc && window.__kc.side && window.__kc.traffic))); i++) { await page.keyboard.press('Enter'); await wait(500); }
    await wait(800);
  };
  const state = () => ev(() => {
    const w = window.__kc, s = w.side, c = w.player.car;
    return { active: s.active, job: s.job, objective: s.objective, hint: s.hint, marker: s.marker && { ...s.marker }, timer: s.timer && { ...s.timer }, cash: w.player.cash,
      car: c ? c.def.id : null, card: w.story.card && { title: w.story.card.title, sub: w.story.card.sub }, ring: w.traffic.blockRing, heat: w.heat.level, mode: w.mode,
      scooters: w.cars.filter((k) => k.def.id === 'scooter' && !k.removed).length, extras: s.extras.length, storyMarker: w.story.marker && { x: w.story.marker.x, y: w.story.marker.y } };
  });
  /** Put the player (or the car they are driving) somewhere, standing still. */
  const tp = (x, y) => ev(([x, y]) => { const w = window.__kc, c = w.player.car; if (c) { c.x = x; c.y = y; c.vx = c.vy = 0; } else w.player.actor.body.reset(x, y); }, [x, y]);
  const toMarker = async () => { const m = (await state()).marker; if (m) await tp(m.x, m.y); return m; };
  const calm = () => ev(() => { const w = window.__kc; w.heat.clear(false); w.police.standDown(true); w.player.heal(); });
  const start = (job, n = 0) => ev(([job, n]) => { const s = window.__kc.side.spots.filter((q) => q.job === job)[n]; return s ? { x: s.x, y: s.y, label: s.label } : null; }, [job, n]);
  /** A stretch of road well away from every start ring: standing here re-arms the rings. */
  const neutral = () => ev(() => {
    const w = window.__kc;
    for (const l of w.map.lanes) { const x = l.ax + l.dx * l.len * 0.5, y = l.ay + l.dy * l.len * 0.5; if (x > 11000 && y < 8500 && w.side.spots.every((q) => Math.hypot(q.x - x, q.y - y) > 500)) return { x, y }; }
    return null;
  });
  /** Leave the rings, wait out the cooldown, then pull up in the ring. */
  const begin = async (job, away, n = 0) => {
    await calm();
    await tp(away.x, away.y);
    await wait(300);
    await ev(() => { window.__kc.side.cooldown = 0; });
    const s = await start(job, n);
    await tp(s.x, s.y);
    return until((job) => window.__kc.side.job === job, job + ' job starts in its ring', job);
  };

  await page.goto(URL);
  await enterGame();
  await ev(() => { const w = window.__kc; w.story.jumpTo(100); w.player.takeDamage = () => {}; }); // free roam, the whole story done; traffic can't hurt the tester
  await wait(600);

  // ------------------------------------------------------------------ what is on offer
  console.log('\nSTARTS');
  const info = await ev(() => {
    const w = window.__kc, s = w.side, names = ['Lot', 'Road', 'Walk', 'Building', 'Crossing', 'Water'];
    const list = (i) => { w.story.index = i; s.update(0); return s.starts.map((q) => q.label + '@' + Math.round(q.x)).sort(); };
    const done = w.story.index, by = {};
    for (const i of [1, 2, 3, 4, 7, 8]) by[i] = list(i);
    w.story.index = done; s.update(0);
    const ranks = s.spots.filter((q) => q.job === 'taxi');
    let gap = 1e9;
    for (const a of ranks) for (const b of ranks) if (a !== b) gap = Math.min(gap, Math.hypot(a.x - b.x, a.y - b.y));
    return { done, by, ranks: ranks.length, gap: Math.round(gap), rankTiles: ranks.map((q) => names[w.map.tileAt(q.x, q.y)]), free: !w.story.active, labels: s.starts.map((q) => q.label) };
  });
  const has = (i, word) => info.by[i].some((q) => q.startsWith(word));
  ok(info.free && info.done >= 8, 'jumpTo(100) gives free roam with the story done', info.done);
  ok(has(1, 'Taxi') && !has(1, 'Ramen') && !has(1, 'K-Route'), 'after mission 1: taxi ranks only', info.by[1]);
  ok(has(2, 'Ramen') && !has(3, 'K-Route'), 'ramen delivery opens after mission 2, not the time trial', info.by[3]);
  ok(has(4, 'K-Route'), 'K-Route time trial opens after mission 4', info.by[4]);
  ok(info.by[7].every((q) => Number(q.split("@")[1]) > 10688), 'before mission 8 every start is on the east bank', info.by[7]);
  ok(info.by[8].some((q) => Number(q.split("@")[1]) < 9984), 'after mission 8 there are ranks west of the river', info.by[8]);
  ok(info.ranks >= 4 && info.gap > 300 && info.rankTiles.every((q) => q === 'Road'), 'taxi ranks are on the road and apart', info);

  // ------------------------------------------------------------------ ramen delivery
  console.log('\nRAMEN DELIVERY');
  const shop = await start('ramen'), aside = { x: shop.x, y: shop.y + 120 };
  await calm();
  await tp(aside.x, aside.y);
  await wait(300);
  await page.keyboard.down('KeyW'); // really walk north into the ring
  const walked = await until(() => window.__kc.side.job === 'ramen', 'walking into the ring starts the job');
  await page.keyboard.up('KeyW');
  ok(walked, 'walking into the ring (W key) starts the job, nothing else to press');
  let s = await state();
  ok(s.active && s.car === 'scooter' && s.scooters === 1, 'spawns the scooter with Jun on it', s);
  ok(/^Deliver to /.test(s.objective) && !!s.marker, 'gives a delivery with a marker', s.objective);
  await wait(150);
  ok((await state()).timer?.label === 'SOUP SPILLED', 'shows the spill meter');
  let cash = s.cash;
  const tips = [];
  for (let i = 0; i < 3; i++) {
    if (i === 1) { // a hard bump before the second customer
      await ev(() => { window.__kc.side.car.bump = 175; });
      await wait(150);
      const spilled = (await state()).timer.value;
      ok(spilled > 0.45 && spilled < 0.55, 'a bump fills the spill meter', spilled);
    }
    const before = (await state()).objective;
    await toMarker();
    await until((before) => window.__kc.side.objective !== before, 'delivery ' + (i + 1) + ' handed over', before);
    const now = (await state()).cash;
    tips.push(now - cash); cash = now;
  }
  ok(tips[0] === 1200 && tips[2] === 1200, 'a clean delivery pays the full tip', tips);
  ok(tips[1] > 0 && tips[1] < 1200, 'spilled soup cuts the tip', tips);
  s = await state();
  ok(s.objective === 'Return to the shop.' && s.timer === null && s.active, 'then sends the scooter home', s);
  await toMarker();
  await until(() => !window.__kc.side.active, 'ramen run ends at the shop');
  s = await state();
  ok(s.card?.title === 'RAMEN DELIVERY — COMPLETE' && s.card?.sub === 'Tips ¥' + (tips[0] + tips[1] + tips[2]).toLocaleString('en-US'), 'result card shows the tips', s.card);
  ok(s.car === null && s.scooters === 0 && !s.marker && !s.timer && s.objective === '' && s.job === null, 'cleans up: scooter gone, marker and meter cleared', s);
  await wait(4600); // longer than the cooldown, still standing in the ring
  ok(!(await state()).active, 'does not start again while Jun stays in the ring');
  await ev(() => { window.__kc.story.card = null; });

  await begin('ramen', aside);
  await ev(() => window.__kc.side.abort());
  await wait(200);
  s = await state();
  ok(!s.active && s.scooters === 0 && s.car === null && !s.marker && !s.timer && s.extras === 0, 'abort() removes the scooter and the customer', s);

  await begin('ramen', aside);
  await ev(() => { const w = window.__kc; window.__jobCar = w.side.car; w.story.jumpTo(1); }); // a story mission starts in the middle of a run
  await wait(300);
  s = await state();
  ok(!s.active && s.extras === 0 && (await ev(() => window.__jobCar.removed === true)), 'a story mission starting stops the run and removes its scooter', s);
  await ev(() => window.__kc.story.jumpTo(100));
  await wait(400);

  // ------------------------------------------------------------------ the story's marker, mid-story
  console.log('\nMID-STORY');
  await ev(() => { const st = window.__kc.story; st.index = 5; st.freeRoam(); });
  await wait(200);
  const giver = (await state()).storyMarker;
  ok(!!giver, 'mid-story there is a next-mission marker');
  await begin('ramen', aside);
  s = await state();
  ok(s.storyMarker === null && !!s.marker, "while a job runs, its marker replaces the story's", s);
  const east = await ev(() => { const k = window.__kc.side, wt = window.__kc.map.water; const riv = wt.filter((r) => r.h > r.w * 2).sort((a, b) => b.w - a.w)[0], sea = wt.slice().sort((a, b) => b.w - a.w)[0], bank = riv.x + riv.w, bay = sea.y; let n = 0; for (let i = 0; i < 60; i++) { const q = k.kerb({ x: bank + 3000, y: 2000 }, [0, 1e6]); if (!q || q.x < bank || q.y > bay) n++; } return n; });
  ok(east === 0, 'before mission 8 taxi stops stay on the east bank', east);
  await ev(() => window.__kc.side.abort());
  await wait(200);
  s = await state();
  ok(s.storyMarker && s.storyMarker.x === giver.x && s.storyMarker.y === giver.y, "and the story's marker comes back afterwards", s.storyMarker);
  await ev(() => window.__kc.story.jumpTo(100));
  await wait(400);

  // ------------------------------------------------------------------ taxi
  console.log('\nTAXI');
  const rank = await start('taxi'), road = await neutral();
  await calm();
  await tp(rank.x, rank.y);
  await wait(300);
  s = await state();
  ok(!s.active && s.hint === 'Taxi: bring a car.', 'on foot at a rank: asks for a car', s.hint);
  const carId = await ev((road) => {
    const w = window.__kc, defs = w.cars.map((c) => c.def), def = defs.find((d) => d.shape === 'car') || defs.find((d) => ['sports', 'truck', 'police'].includes(d.shape));
    if (!def) return null;
    w.player.putInCar(w.addCar(def, road.x, road.y, 0));
    return def.id;
  }, road);
  ok(!!carId, 'found a car to drive', carId);
  await begin('taxi', road);
  s = await state();
  ok(s.active && s.objective === 'Pick up the fare.' && !!s.marker && s.extras === 1, 'starts with a passenger to pick up', s);
  await wait(150);
  s = await state();
  ok(s.timer?.kind === 'time' && s.timer.label === 'TIME' && s.timer.value > 5 && s.hint === 'Fare 1 of 5', 'runs against a clock', s);
  cash = s.cash;
  const pays = [];
  for (let i = 0; i < 5; i++) {
    await toMarker();
    await until(() => window.__kc.side.objective === 'Drop off the fare.', 'fare ' + (i + 1) + ' picked up');
    const before = (await state()).cash;
    await toMarker();
    await until((before) => window.__kc.player.cash > before, 'fare ' + (i + 1) + ' dropped off and paid', before);
    pays.push((await state()).cash - before);
  }
  await until(() => !window.__kc.side.active, 'taxi run ends after its fares');
  s = await state();
  const total = pays.reduce((a, b) => a + b, 0);
  ok(pays.every((q) => q >= 1000) && total <= 15000, 'each fare pays, and a run stays in the bible range', pays);
  ok(s.card?.title === 'TAXI — COMPLETE' && s.card?.sub === '5 fares · ¥' + total.toLocaleString('en-US') && s.cash === cash + total, 'result card shows the fares', s.card);
  ok(s.car === carId && !s.marker && !s.timer && s.job === null, "keeps the player's own car, clears marker and clock", s);
  await wait(5600);
  ok((await state()).extras === 0, 'the last passenger walks off');

  await begin('taxi', road);
  await ev(() => { window.__kc.side.clock = 0.05; });
  await until(() => !window.__kc.side.active, 'taxi run fails when the clock runs out');
  s = await state();
  ok(s.card?.title === 'TAXI — FAILED' && s.card?.sub === 'Out of time.' && !s.marker && !s.timer, 'out of time: failed, cleaned up', s.card);
  await wait(300);
  ok((await state()).extras === 0, 'the waiting passenger is removed');

  // ------------------------------------------------------------------ K-Route time trial
  console.log('\nK-ROUTE TIME TRIAL');
  await begin('race', road);
  await wait(150);
  s = await state();
  ok(s.active && s.ring === true, 'starts and clears traffic off the ring (blockRing)', s);
  ok(s.objective === 'Lap the K-Route in 135s.' && s.timer?.label === 'TIME' && s.hint === 'CHECKPOINT 1/8', 'shows the target and the checkpoint', s);
  cash = s.cash;
  for (let i = 0; i < 8; i++) {
    const before = (await state()).hint;
    await toMarker();
    await until((before) => window.__kc.side.hint !== before || !window.__kc.side.active, 'checkpoint ' + (i + 1), before);
  }
  await until(() => !window.__kc.side.active, 'time trial ends at the line');
  s = await state();
  ok(s.card?.title === 'K-ROUTE TIME TRIAL — COMPLETE' && /^\d+\.\ds · ¥[\d,]+$/.test(s.card?.sub || '') && s.cash >= cash + 6000, 'beating the time pays', s);
  ok(s.ring === false && !s.marker && !s.timer && s.car === carId, 'ring reopened (blockRing false), marker and clock cleared', s);

  await begin('race', road);
  await ev(() => { window.__kc.side.clock = 0.05; });
  await until(() => !window.__kc.side.active, 'time trial fails when the clock runs out');
  s = await state();
  ok(s.card?.title === 'K-ROUTE TIME TRIAL — FAILED' && s.card?.sub === 'Out of time.' && s.ring === false, 'out of time: failed, ring reopened', s);

  await begin('race', road);
  await ev(() => { const w = window.__kc; w.player.exitCar(); w.side.outT = 9.9; });
  await until(() => !window.__kc.side.active, 'time trial fails when the car is left');
  s = await state();
  ok(s.card?.sub === 'You left the vehicle.' && s.ring === false, 'leaving the car: failed, ring reopened', s);
  await ev(() => { const w = window.__kc; w.player.putInCar(w.cars.filter((c) => !c.removed && c.driver === 'none').sort((a, b) => Math.hypot(a.x - w.player.pos.x, a.y - w.player.pos.y) - Math.hypot(b.x - w.player.pos.x, b.y - w.player.pos.y))[0]); });

  await begin('race', road);
  await ev(() => window.__kc.playerDied()); // dying in the middle of a job
  await until(() => !window.__kc.side.active, 'dying stops the job');
  s = await state();
  ok(s.ring === false && !s.marker && !s.timer, 'dying: ring reopened, marker and clock cleared', s);
  await until(() => window.__kc.mode === 'play', 'respawn');
  await ev(() => { window.__kc.story.card = null; });

  // ------------------------------------------------------------------ lucky cats
  console.log('\nLUCKY CATS');
  const cats = await ev(() => {
    const w = window.__kc, s = w.side, names = ['Lot', 'Road', 'Walk', 'Building', 'Crossing', 'Water'], tiles = {}, districts = {}, seen = new Set();
    for (const c of s.cats) { const t = names[w.map.tileAt(c.x, c.y)]; tiles[t] = (tiles[t] || 0) + 1; const d = w.map.districtAt(c.x, c.y).name; districts[d] = (districts[d] || 0) + 1; seen.add(c.x + ',' + c.y); }
    const empty = w.map.blocks.filter((b) => !s.cats.some((c) => c.x > b.x - 32 && c.x < b.x + b.w + 32 && c.y > b.y - 32 && c.y < b.y + b.h + 32)).length;
    return { n: s.cats.length, unique: seen.size, tiles, districts, empty, found: s.catsFound, where: JSON.stringify(s.cats.map((c) => [c.x, c.y])) };
  });
  ok(cats.n === 100 && cats.unique === 100, '100 cats in 100 different places', cats.n);
  ok(!cats.tiles.Road && !cats.tiles.Crossing && !cats.tiles.Building && !cats.tiles.Water, 'all on walkable ground off the road', cats.tiles);
  ok(Object.keys(cats.districts).length === 8 && cats.empty === 0, 'spread over all 8 districts and every block', cats.districts);
  if (await ev(() => !!window.__kc.player.car)) await ev(() => window.__kc.player.exitCar());
  const foundNow = () => ev(() => window.__kc.side.cats.map((c, i) => (c.found ? i : -1)).filter((i) => i >= 0));
  const pre = await foundNow(), three = [];
  for (let i = 0; three.length < 3; i++) if (!pre.includes(i)) three.push(i);
  cash = (await state()).cash;
  for (const i of three) {
    await ev((i) => { const w = window.__kc, c = w.side.cats[i]; w.player.actor.body.reset(c.x, c.y); }, i);
    await until((i) => window.__kc.side.cats[i].found, 'walking over cat ' + i + ' collects it', i);
  }
  const mine = [...pre, ...three].sort((a, b) => a - b);
  s = await state();
  ok(s.cash === cash + 1500, 'each cat pays its reward', s.cash - cash);
  ok((await ev((k) => localStorage.getItem(k), CATS_KEY)) === JSON.stringify({ found: mine }), 'saved under its own key ' + CATS_KEY, mine);

  await page.reload();
  await enterGame();
  const after = await ev(() => ({ where: JSON.stringify(window.__kc.side.cats.map((c) => [c.x, c.y])), free: !window.__kc.story.active }));
  ok(after.free && JSON.stringify(await foundNow()) === JSON.stringify(mine), 'after a reload the same cats are still collected', await foundNow());
  ok(after.where === cats.where, 'and all 100 are in the same places as before');

  cash = (await state()).cash;
  const need = 10 - mine.length;
  await ev((need) => { const s = window.__kc.side; for (let i = 0, n = 0; n < need; i++) if (!s.cats[i].found) { s.collectCat(i); n++; } }, need);
  s = await state();
  ok(s.card?.title === 'LUCKY CATS 10/100' && s.card?.sub === '+¥5,000' && s.cash === cash + need * 500 + 5000, 'every 10th cat gives a reward', s.card);
  await ev(() => { const s = window.__kc.side; for (let i = 0; i < 100; i++) s.collectCat(i); });
  s = await state();
  const all = await ev((k) => ({ found: window.__kc.side.catsFound, saved: JSON.parse(localStorage.getItem(k)).found.length }), CATS_KEY);
  ok(s.card?.title === 'ALL 100 LUCKY CATS FOUND' && all.found === 100 && all.saved === 100, 'finding all 100 shows the message', s.card);
  await wait(500);

  console.log('\n' + (checks - fails.length) + ' of ' + checks + ' checks passed; page errors: ' + errs.length);
  for (const e of errs.slice(0, 10)) console.log('  PAGE ERROR ' + e);
  await browser.close();
  if (fails.length || errs.length) { console.log('SIDE JOBS TEST FAILED'); process.exit(1); }
  console.log('SIDE JOBS TEST PASSED');
})().catch((e) => { console.error('SIDE JOBS TEST FAILED (test crashed)\n', e); process.exit(1); });
