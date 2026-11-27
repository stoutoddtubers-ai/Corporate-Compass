// Plays the twelve side stories from first step to final card, one line per mission.
//   node tools/test/side.cjs            (game served at GAME_URL, default http://localhost:4183/)
//   node tools/test/side.cjs S-R2 S-U1  (only those missions)
// It cheats (teleports, kills enemies at once, moves story cars) but every step has to be
// reached and completed by the game's own checks. Old Debts (S-K) is played on both Act 2 paths.
// Exits with code 1 on a page error, a failed mission, a missed objective or a wrong payout.
const { chromium } = require('playwright');

const PAY = { 'S-R1': 30000, 'S-G1': 20000, 'S-U1': 40000, 'S-U2': 750000 }; // S-U2: ¥900,000 less 50 points of damage the test gives the truck
const only = process.argv.slice(2);

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e.stack || e)));
  await p.goto(process.env.GAME_URL || 'http://localhost:4183/');
  await p.waitForFunction(() => !!window.__kc && !!window.__kc.story && !!window.__kc.player, null, { timeout: 90000 });
  await p.waitForTimeout(1500);
  const ev = (f, a) => p.evaluate(f, a);

  // ---- helpers that live in the page ----
  await ev(() => {
    const w = window.__kc, s = w.story, P = w.player;
    P.takeDamage = () => {}; // Jun cannot be hurt
    window.__log = { steps: [], fails: 0 };
    const enter = s.enterStep.bind(s), fail = s.fail.bind(s), begin = s.startMission.bind(s);
    s.enterStep = () => { enter(); if (s.active) window.__log.steps.push(s.step); };
    s.fail = (l) => { window.__log.fails++; fail(l); };
    s.startMission = (retry, side) => { window.__log.starts++; if (side === undefined) begin(retry); else begin(retry, side); };
    window.__start = (id, path, after) => {
      window.__id = id;
      s.keep.path = path; w.heat.clear(false);
      s.sideDone = [1, 2, 3].filter((n) => n < +id[3]).map((n) => id.slice(0, 3) + n); // the earlier parts of this chain are done
      s.index = parseInt(after.slice(1), 10); // the main story is as far along as when this side story opens (so, for one, the ankle tag is off once it should be)
      window.__log = { steps: [], fails: 0, starts: 0, cash: P.cash, t0: performance.now() };
      s.jumpToId(id);
      return s.mission && s.mission.id;
    };
    /** One cheat for whatever the current objective is. */
    window.__drive = () => {
      const m = s.mission;
      if (!s.active || !m || s.sideDone.includes(window.__id)) return { over: true };
      if (s.cut) return { cut: true };
      const st = m.steps[s.step];
      if (!st) return {};
      if (st.t === 'card') return { card: s.card ? s.card.title : '', sub: s.card ? s.card.sub : '' };
      if (st.t !== 'obj' || s.objective === 'MISSION FAILED') return {};
      const v = s.vars, k = s.marker;
      const tp = (x, y) => { if (P.car) { const c = P.car; c.x = x; c.y = y; c.vx = c.vy = 0; } else P.actor.body.reset(x, y); };
      const foot = () => { if (P.car) P.exitCar(); };
      const toMk = () => { if (s.marker) tp(s.marker.x, s.marker.y); };
      const kill = () => { for (const t of [...w.gang.thugs]) if (t.alive) w.hurtActor(t, 9999, true, 'bullet'); };
      const sit = (c) => { if (P.car !== c) P.putInCar(c); };
      const noChase = () => { for (const c of w.gang.activeChasers) c.destroy(); };
      const jn = w.map.junctions.filter((j) => j.lit).sort((a, b) => b.x + b.y - a.x - a.y)[3], road = { x: jn.x, y: jn.y }; // a junction a long way from everything
      switch (st.done) {
        case 'sideOnFoot': foot(); toMk(); break;
        case 'atMarker': toMk(); break;
        case 'inCar': sit(v.boat); break;
        // Daigo's Road
        case 'sr2Lead': case 'sr2Keep': case 'sr2Break': case 'sr2Finish': { // get in front of each police car, then on to the next checkpoint
          sit(v.lead);
          const h = v.cops.find((c) => c.live);
          if (h) tp(h.car.x + Math.cos(h.car.heading) * 100, h.car.y + Math.sin(h.car.heading) * 100); else toMk();
          break;
        }
        case 'sr3Ahead': case 'sr3Traffic': case 'sr3Police': case 'sr3Finish': { const c = v.cps[Math.min(v.ki, v.cps.length - 1)]; v.kenta.x = c.x; v.kenta.y = c.y; v.kenta.vx = v.kenta.vy = 0; break; }
        // Building 41
        case 'sg1Fix': foot(); toMk(); break;
        case 'sg1Found': foot(); tp(v.van.x - 150, v.van.y); break;
        case 'sg1Follow': { foot(); tp(road.x, road.y); const y = s.place('sgKurodaYard'); v.van.x = y.x; v.van.y = y.y - 180; v.van.vx = v.van.vy = 0; break; }
        case 'sg1Photo': foot(); tp(v.driver.x + 140, v.driver.y); break;
        case 'sg2Drive': sit(s.cars[0]); if (!s.flags.endoIn) tp(v.endo.x + 40, v.endo.y); else if (s.flags.tailed) tp(v.lockers.x, v.lockers.y); break;
        case 'sg2Lose': noChase(); break;
        case 'sg2Protect': if (!s.flags.atLockers) { sit(v.endoCar); tp(v.lockers.x, v.lockers.y); } else kill(); break;
        case 'sg3Inside': foot(); toMk(); break;
        case 'sg3Climb': foot(); toMk(); kill(); break;
        case 'sg3Corner': foot(); tp(v.kuroda.x + 20, v.kuroda.y); kill(); break;
        case 'sg3Hold': foot(); tp(v.kuroda.x + 40, v.kuroda.y); kill(); break;
        // Old Debts
        case 'sk1Load': foot(); tp(v.truck.x + 34, v.truck.y); break;
        case 'sk1Deliver': sit(v.truck); toMk(); noChase(); break;
        case 'sk2Wait': { foot(); const g = w.gang.thugs.find((t) => t.alive); if (g) tp(g.x + 60, g.y); else { const d = s.place('skTsuda'); tp(d.x, d.y); } break; }
        case 'sk2Run': kill(); break;
        case 'sk2Burn': foot(); toMk(); break;
        case 'sk3Inside': toMk(); kill(); break;
        case 'sk3Load': sit(v.truck); toMk(); break;
        case 'sk3Temple': sit(v.truck); toMk(); noChase(); break;
        // Sea Spirit
        case 'su1Whistle': sit(v.boat); toMk(); break;
        case 'su1Catch': if (!s.flags.caught) v.skiff.damage(v.skiff.def.hp * 0.6, true); else kill(); break;
        case 'su1Cargo': toMk(); break;
        case 'su2Catch': { sit(s.cars[0]); const t = v.truck; tp(t.x - Math.cos(t.heading) * 200, t.y - Math.sin(t.heading) * 200); break; }
        case 'su2Stop': { const t = v.truck, c = s.cars[0]; sit(c); c.heading = t.heading; tp(t.x + Math.cos(t.heading) * 60, t.y + Math.sin(t.heading) * 60); break; } // park right in front of it: it has to stop by itself
        case 'su2Drive': if (!v.dented) { v.dented = true; v.truck.damage(50, false); } sit(v.truck); toMk(); break;
        case 'su2Arrive': sit(v.truck); toMk(); break;
        case 'su3Find': tp(v.barge.x, v.barge.y + 180); break;
        case 'su3Deal': kill(); break;
        case 'su3Home': toMk(); break;
        default: return { unknown: st.done };
      }
      return { obj: st.text };
    };
  });

  const missions = await ev(() => {
    // the side missions as the game has them (via the story's own lookup)
    const s = window.__kc.story, out = [];
    for (const id of ['S-R1', 'S-R2', 'S-R3', 'S-G1', 'S-G2', 'S-G3', 'S-K1', 'S-K2', 'S-K3', 'S-U1', 'S-U2', 'S-U3']) {
      s.jumpToId(id);
      const m = s.mission;
      out.push(m && m.id === id ? { id, title: m.title, after: m.after, afterSide: m.afterSide || '', giver: m.giver, objs: m.steps.map((x, i) => (x.t === 'obj' ? i : -1)).filter((i) => i >= 0), n: m.steps.length, last: m.steps[m.steps.length - 1].t } : { id, missing: true });
    }
    return out;
  });

  let bad = 0;
  const runs = [];
  for (const m of missions) for (const path of m.id.startsWith('S-K') ? ['yakuza', 'police'] : ['yakuza']) runs.push({ m, path });
  for (const { m, path } of runs) {
    if (only.length && !only.includes(m.id)) continue;
    const tag = m.id + (m.id.startsWith('S-K') ? ` [${path}]` : '');
    if (m.missing) { console.log(`${tag} FAIL: not in the game`); bad++; continue; }
    const errs0 = errs.length;
    await ev(([id, path, after]) => window.__start(id, path, after), [m.id, path, m.after]);
    let card = '', sub = '', why = '', unknown = '';
    const t0 = Date.now();
    for (;;) {
      if (Date.now() - t0 > 120000) { why = 'timed out at "' + (await ev(() => window.__kc.story.objective)) + '"'; break; }
      const r = await ev(() => window.__drive());
      if (r.over) break;
      if (r.cut) { await p.mouse.click(640, 300); await p.waitForTimeout(40); continue; }
      if (r.card) { card = r.card; sub = r.sub; }
      if (r.unknown) { unknown = r.unknown; break; }
      await p.waitForTimeout(110);
    }
    const end = await ev((id) => { const w = window.__kc, s = w.story, L = window.__log; return { done: s.sideDone.includes(id), steps: L.steps, fails: L.fails, starts: L.starts, cash: w.player.cash - L.cash, secs: (performance.now() - L.t0) / 1000, daigo: w.cars.some((c) => !c.removed && c.def.name === "Daigo's Zokusha" && c.driver === 'none' && c.unlocked), cars: w.cars.length }; }, m.id);
    const missed = m.objs.filter((i) => !end.steps.includes(i));
    const pay = PAY[m.id] || 0, paid = end.cash >= pay && end.cash <= pay + 30000; // a little slack: dropped cash Jun happens to walk over
    const problems = [];
    if (unknown) problems.push('test has no cheat for ' + unknown);
    if (why) problems.push(why);
    if (!end.done) problems.push('did not complete');
    if (card !== `${m.title} — COMPLETE`) problems.push(`final card was "${card}"`);
    if (m.last !== 'card') problems.push('last step is not a card');
    if (missed.length) problems.push('objectives never reached: steps ' + missed.join(','));
    if (end.fails) problems.push(`MISSION FAILED shown ${end.fails}x`);
    if (end.starts !== 1) problems.push(`mission was started ${end.starts}x (Jun died or was arrested?)`);
    if (!paid) problems.push(`cash changed by ${end.cash}, expected ${pay}`);
    if (m.id === 'S-R3' && !end.daigo) problems.push("Daigo's Zokusha was not left for Jun");
    if (errs.length > errs0) problems.push('page errors');
    if (problems.length) bad++;
    console.log(`${tag} ${problems.length ? 'FAIL: ' + problems.join('; ') : 'PASS'} | ${m.objs.length - missed.length}/${m.objs.length} objectives | card "${card}" | cash ${end.cash >= 0 ? '+' : ''}${end.cash} | ${end.secs.toFixed(0)}s${m.id === 'S-R3' ? ' | reward bike in world: ' + end.daigo : ''}`);
    await ev(() => { const s = window.__kc.story; if (s.active) s.jumpToId(s.mission.id); }); // (leave nothing half-run)
    await p.waitForTimeout(200);
  }

  // ---- the violet rings in free roam: a side story is offered once its main mission is done, and starts when Jun walks in ----
  if (!only.length) {
    const offer = await ev(async () => {
      const w = window.__kc, s = w.story, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      window.__log = { steps: [], fails: 0, starts: 0, cash: 0, t0: 0 };
      s.cut = null; s.card = null; w.mode = 'play'; s.cleanup(); s.side = null; s.active = false;
      s.index = 5; s.sideDone = ['S-R1']; s.freeRoam(); // main story up to M05 done; S-R1 done
      const on = s.sideMarkers.map((x) => x.m.id).sort().join(',');
      const g = s.sideMarkers.find((x) => x.m.id === 'S-G1');
      if (w.player.car) w.player.exitCar();
      w.heat.clear(false);
      // a ring only works once Jun has been outside it: stand well away for a moment, then walk in
      if (g) w.player.actor.body.reset(g.x + 200, g.y + 22);
      await wait(300);
      const early = s.active;
      if (g && !early) w.player.actor.body.reset(g.x, g.y);
      await wait(600);
      return { on, started: s.active && s.side ? s.side.id : '' };
    });
    const ok = offer.on === 'S-G1' && offer.started === 'S-G1'; // S-R2 needs M08, so only S-G1 is on offer
    if (!ok) bad++;
    console.log(`free roam ${ok ? 'PASS' : 'FAIL'} | after M05 with S-R1 done the rings offered: [${offer.on}] | walking into Hikari's ring started: ${offer.started || 'nothing'}`);
  }

  console.log('page errors:', errs.length ? errs.slice(0, 8) : 'none');
  await b.close();
  if (bad || errs.length) { console.log(`FAILED (${bad} problem${bad === 1 ? '' : 's'}, ${errs.length} page error${errs.length === 1 ? '' : 's'})`); process.exit(1); }
  console.log('ALL SIDE STORIES PASS');
})().catch((e) => { console.error(e); process.exit(1); });
