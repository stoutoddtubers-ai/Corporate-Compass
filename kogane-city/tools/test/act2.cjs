// Act 2 (missions 9-16): plays every mission from its first step to its final card, both
// branches of every choice, and prints one line per run. Teleports and instant kills are
// used to keep it short. Fails loudly (exit code 1) on a page error or a stuck mission.
//   GAME_URL=http://localhost:4181/ node tools/test/act2.cjs
const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [], lines = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e.stack || e)));
  await p.goto(process.env.GAME_URL || 'http://localhost:4181/');
  await p.waitForFunction(() => window.__kc && window.__kc.story && window.__kc.player, null, { timeout: 60000 });
  await p.mouse.move(1100, 360); // aim east
  const wait = (ms) => p.waitForTimeout(ms);
  /** Runs code in the game with w = world, s = story, t = the test helpers below. */
  const run = (code) => p.evaluate(`(() => { const w = window.__kc, s = w.story, t = window.__t; ${code} })()`);
  await p.evaluate(() => {
    const w = window.__kc, s = w.story;
    w.player.takeDamage = () => {}; // Jun cannot be hurt
    window.__t = {
      cards: [], picks: [], i0: 0, cash0: 0,
      /** Skips cutscenes, answers choices (from `picks`), notes title cards and hurries them along. */
      tick() {
        for (let n = 0; n < 300 && (s.cut || s.choice); n++) { if (s.cut) s.advanceCut(); else s.choose(this.picks.length ? this.picks.shift() : 0); }
        if (s.card && s.active) { if (this.cards[this.cards.length - 1] !== s.card.title) this.cards.push(s.card.title); s.card.t = Math.min(s.card.t, 0.15); }
      },
      go(x, y) { const c = w.player.car; if (c) { c.x = x; c.y = y; c.vx = c.vy = 0; } else w.player.actor.body.reset(x, y); },
      toMarker() { if (s.marker) this.go(s.marker.x, s.marker.y); },
      killAll() { for (const a of [...w.gang.thugs]) if (a.alive && a.state !== 'idle') w.hurtActor(a, 9999, true, 'bullet'); },
    };
  });

  let cur = '';
  /** Waits until an expression (using w, s, t) is true in the game. `each` is run on every poll. */
  async function until(expr, ms = 15000, each = '', mayFail = false) {
    const t0 = Date.now();
    for (;;) {
      const r = await run(`t.tick(); ${each}; if (s.objective === 'MISSION FAILED' && ${!mayFail}) return 'FAILED'; return !!(${expr});`);
      if (r === true) return;
      const where = await run('return `objective "${s.objective}", step ${s.step}`');
      if (r === 'FAILED') throw new Error(`${cur}: MISSION FAILED (${where}) while waiting for: ${expr}`);
      if (Date.now() - t0 > ms) throw new Error(`${cur}: timed out waiting for: ${expr} (${where})`);
      await wait(50);
    }
  }
  const obj = (text, ms, each) => until(`s.active && s.objective === ${JSON.stringify(text)}`, ms, each);
  const start = (id, picks = [], path = '') => { cur = id; return run(`${path ? `s.keep.path = '${path}';` : ''} t.cards = []; t.picks = ${JSON.stringify(picks)}; s.phone.length = 0; w.player.resetWeapons(['fists']); s.jumpToId('${id}'); t.i0 = s.index; t.cash0 = w.player.cash; if (!s.mission || s.mission.id !== '${id}') throw new Error('no mission ${id}');`); };
  /** The mission must end (story moves on) having shown its COMPLETE card. Returns what to print. */
  async function finish(card, note = '') {
    await until('!s.active', 30000);
    const r = await run('return { ok: s.index === t.i0 + 1, cards: t.cards, cash: w.player.cash - t.cash0 };');
    if (!r.ok) throw new Error(`${cur}: the story did not move on`);
    if (!r.cards.includes(card)) throw new Error(`${cur}: never showed the card "${card}" (saw ${JSON.stringify(r.cards)})`);
    return `cards [${r.cards.join(' | ')}], cash +¥${r.cash.toLocaleString('en-US')}${note ? ', ' + note : ''}`;
  }
  const check = async (expr, what) => { if (!(await run(`return !!(${expr});`))) throw new Error(`${cur}: expected ${what}`); };
  const waves = async (n) => { for (let i = 0; i < n; i++) { await until(`s.vars.wave === ${i} && w.gang.activeThugs > 0`); await wait(250); await run('t.killAll();'); } };

  const missions = {
    // ---------------- M09: once taking it all, once taking half (and one owner dies first: fail, retry) ----------------
    async M09(pick) {
      await start('M09', [pick, pick, pick]);
      let note = pick ? 'mercy' : 'menace';
      if (pick) { // the fail line and the retry
        await obj("Collect from Mama Rei's bar.");
        await run('w.hurtActor(s.vars.owners[1], 9999, true, "bullet");');
        await until(`s.objective === 'MISSION FAILED' && s.phone.some((m) => m.from === 'SAEKO')`, 5000, '', true);
        await until(`s.objective === "Collect from Mama Rei's bar." && s.vars.owners.every((o) => o.alive)`, 8000, '', true);
        note += ', owner-dies fail + retry ok';
      }
      for (const o of ["Collect from Mama Rei's bar.", 'Collect from the Lucky 7 arcade.', 'Collect from Hanabi Florist.', 'Collect from Club Mirage.']) { await obj(o); await run('t.toMarker();'); await wait(150); }
      await until('s.vars.boys && s.vars.boys.some((a) => a.alive)'); // the brawl
      await run('t.killAll();');
      await obj('Report to Saeko.'); await run('t.toMarker();');
      const out = await finish('WELCOME TO HANABI-CHŌ — COMPLETE', note);
      await check(`s.flags.mostlyMercy === ${!!pick} && s.keep.m09rei === '${pick ? 'reiMercy' : 'reiMenace'}'`, 'the choices to be remembered');
      return out;
    },
    // ---------------- M10 ----------------
    async M10() {
      await start('M10');
      await obj('Defend Golden Ball. (4 waves)');
      // one stray shot along a row of machines: it must break a machine and spill its steel balls
      await run('const m = s.vars.machines[8]; t.go(m.x - 40, m.y); w.player.switchTo(w.player.weapons.findIndex((x) => x.def.id === "kitsune9"));');
      await wait(400);
      await run('s.vars.gunMag = w.player.weapon.mag + 1; s.vars.gunId = w.player.weapon.def.id;');
      await until('s.vars.lost >= 1 && s.vars.machines.some((m) => m.spill > 0)', 3000);
      await waves(4);
      await obj('Stop the van at the back door.');
      await run('const v = s.vars.van; v.damage(v.def.hp * 0.6, true);');
      await obj('Catch the raid leader.'); await wait(1500);
      await check('Math.hypot(s.vars.boss.body.velocity.x, s.vars.boss.body.velocity.y) > 50', 'the raid leader to be running');
      await run('t.go(s.vars.boss.x, s.vars.boss.y);');
      return finish('PACHINKO PANIC — COMPLETE', 'machine shot + spill ok');
    },
    // ---------------- M11: the thief really runs both legs; Jun is kept on his heels ----------------
    async M11() {
      await start('M11');
      await obj('Chase the thief.');
      await until(`s.objective === "Don't lose him in the crowd."`, 40000, 't.go(s.vars.thief.x, s.vars.thief.y)');
      await until(`s.objective === 'Stop the scooter.'`, 40000, 't.go(s.vars.thief.x, s.vars.thief.y)');
      await wait(1200);
      await check('s.vars.bag.speed > 40 && s.vars.bag.route.length >= 0', 'the scooter to be riding off');
      await run('const c = s.vars.bag; c.damage(c.def.hp * 0.6, true);');
      await obj('Get the drive to Hikari.'); await run('t.toMarker();');
      return finish('SCRAMBLE — COMPLETE');
    },
    // ---------------- M12 ----------------
    async M12() {
      await start('M12');
      await obj('Steal the dump truck.'); await run('w.player.putInCar(s.vars.dump);');
      await obj('Block Tōmon Tunnel.'); await run('t.toMarker(); s.timer.value = 1;'); // park across the tunnel, skip the wait
      await obj('Hold off the escort. (90 seconds)', 45000); // the convoy drives in and is boxed in
      await check('s.vars.convoy.every((c) => c.driver === "none") && w.gang.activeThugs >= 4', 'a stopped convoy and its guards');
      await run('t.killAll(); s.timer.value = 45.5;');
      await until('s.flags.late && s.timer.value > 60', 8000, 't.killAll()'); // "Call it a hundred and ten."
      await run('s.timer.value = 0.5;');
      await obj('Grab the cargo.'); await run('w.player.exitCar(); const c = s.vars.convoy[1]; t.go(c.x + 36, c.y);');
      await obj('Escape in the Zenki.'); await run('w.player.putInCar(s.vars.zenki);');
      await obj('Lose the police.'); await check('w.heat.level >= 3', '3 lanterns');
      await run('w.heat.clear(true);');
      return finish('GOLD RUSH — COMPLETE');
    },
    // ---------------- M13 ----------------
    async M13() {
      await start('M13');
      await obj('Tag the screen control boxes. (0/5)');
      for (let i = 1; i <= 4; i++) { await until(`s.vars.tags === ${i}`, 10000, 't.toMarker()'); await run('t.killAll();'); }
      await check('s.objective === "Tag the screen control boxes. (4/5)" && s.phone.some((m) => m.text === "Four.")', 'the tag count to read 4/5 and Hikari to call');
      await until('s.vars.tags === 5', 10000, 't.toMarker()');
      await obj("Survive Mibu's soldiers."); await until('w.gang.activeThugs > 0'); await run('t.killAll();');
      await obj('Hijack the crossing screen.'); await run('t.toMarker();');
      const out = await finish('INK — COMPLETE');
      await check('t.cards.includes("WHERE IS THE GOLD, MIBU?")', 'the screen message card');
      return out;
    },
    // ---------------- M14: spare by choice, kill by choice, kill by acting ----------------
    async M14(how) {
      await start('M14', [how === 'spare' ? 0 : 1]);
      await obj('Go to room 6.');
      await run('w.player.giveWeapon("kitsune9"); w.player.switchTo(1);'); await wait(200);
      await check('w.player.current === 0', 'no guns inside Voice Cave');
      await run('t.toMarker();');
      await obj('Deal with Fujita.');
      if (how === 'act') await run('w.hurtActor(s.vars.fujita, 9999, true, "melee");');
      else await run('const f = s.vars.fujita; t.go(f.x, f.y + 20);');
      await obj('Get out of Voice Cave.'); await wait(300);
      await check(how === 'spare' ? 's.keep.fujita === "fujitaSpared" && w.gang.activeThugs >= 3' : 's.keep.fujita === "fujitaDead" && !s.vars.fujita.alive', how === 'spare' ? 'Fujita spared and bodyguards chasing' : 'Fujita dead');
      await run('t.toMarker();');
      const out = await finish('THE WAKAGASHIRA — COMPLETE', how);
      await check(`s.phone.some((m) => m.from === 'FUJITA') === ${how === 'spare'}`, "Fujita's text only if spared");
      return out;
    },
    // ---------------- M15: the big choice, both ways ----------------
    async M15(path) {
      await start('M15', [path === 'yakuza' ? 0 : 1]);
      await run('delete s.keep.path;');
      const calm = 'const g = s.vars.patrol, c = s.vars.loop[1]; g.body.reset(c.x, c.y); s.vars.leg = 2; s.vars.sus = 0;'; // the guard is kept at the far corner
      await obj('Enter through the service door.'); await run('t.toMarker();');
      await obj('Serve drinks on your way to the elevator.');
      await until(`s.objective === 'Reach floor 9.'`, 10000, 't.toMarker()');
      await check('s.vars.served === 3 && s.flags.floor9', 'three guests served');
      await run(calm + 't.toMarker();');
      await obj('Open the safe.', 5000, calm); await run('t.toMarker();');
      await obj('Photograph the ledger.', 6000, calm);
      await until(`s.hint.startsWith('COLLATERAL HELD')`, 9000, calm);
      await obj('Get back to the service elevator.', 6000, calm); await run(calm + 't.toMarker();');
      const out = await finish('FORK IN THE ROAD — COMPLETE', 'path = ' + path);
      await check(`s.keep.path === '${path}' && s.phone.some((m) => m.from === '${path === 'yakuza' ? 'SAEKO' : 'SAWADA'}')`, 'the path to be set and the right text sent');
      return out;
    },
    // ---------------- M16 on each path ----------------
    async M16(path) {
      await start('M16', [], path);
      await obj('Get to the Kurogane mansion.');
      await check(`Math.hypot(w.player.pos.x - s.place('${path === 'police' ? 'canalLot' : 'saekoOffice'}').x, w.player.pos.y - s.place('${path === 'police' ? 'canalLot' : 'saekoOffice'}').y) < 120`, 'the start place for this path');
      await run('w.player.putInCar(s.cars[0]); t.go(100 * 32, 96 * 32); const c = w.player.car; c.heading = 0; c.vx = 300;'); // onto a flooded street
      await wait(1200);
      await check('w.player.car.speed < 130', 'flood water to slow the car');
      await run('t.go(78 * 32, 122 * 32);'); // the high road, just south of the roadblock
      await obj("Break through Mibu's roadblock."); await run('t.toMarker();');
      await obj('Defend the mansion. (3 waves, with the ally squad)');
      let note = 'path = ' + path;
      if (path === 'police') { // fail here: the retry must resume from the checkpoint at the gate
        await run('s.fail();');
        await until(`s.objective === 'Defend the mansion. (3 waves, with the ally squad)' && s.vars.wave === 0 && w.gang.activeThugs > 0 && !w.player.car`, 9000, '', true);
        note += ', checkpoint retry ok';
      }
      await waves(3);
      await obj('Reach Genzō.'); await run('if (w.player.car) w.player.exitCar(); t.toMarker();');
      await obj('Get to the roof.'); await run('t.toMarker();');
      const out = await finish('TYPHOON — COMPLETE', note);
      await check('t.cards.includes("ACT 2 COMPLETE")', 'the ACT 2 COMPLETE card');
      await check(`w.player.weapons.some((x) => x.def.id === 'katana') === ${path === 'yakuza'}`, "Genzō's blade only on the yakuza path");
      return out;
    },
  };

  const plan = [['M09', 0], ['M09', 1], ['M10'], ['M11'], ['M12'], ['M13'], ['M14', 'spare'], ['M14', 'kill'], ['M14', 'act'], ['M15', 'yakuza'], ['M16', 'yakuza'], ['M15', 'police'], ['M16', 'police']];
  let bad = 0;
  for (const [id, arg] of plan) {
    const t0 = Date.now();
    let line;
    try { line = `${id} PASS  ${await missions[id](arg)}`; } catch (e) { bad++; line = `${id} FAIL  ${e.message}`; }
    if (errs.length) { bad++; line += `\n    page errors: ${errs.splice(0).slice(0, 4).join(' || ')}`; }
    lines.push(line);
    console.log(`${line}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
  console.log(bad ? `ACT 2: ${bad} problem(s)` : `ACT 2: all ${plan.length} runs passed, no page errors`);
  await b.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
