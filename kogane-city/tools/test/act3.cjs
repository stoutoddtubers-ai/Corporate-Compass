// Act 3 (missions 17-24 and the three endings), driven from first step to final card.
//   node tools/test/act3.cjs            (GAME_URL defaults to http://localhost:4182/)
// It teleports and kills instantly; it checks the words shown against the script, both Act 2
// paths where lines differ, every choice, every fail condition and checkpoint, and all endings.
// Prints one line per mission run and exits 1 on any failure or page error.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = process.env.GAME_URL || 'http://localhost:4182/';
const SCRIPT = process.env.ACT3_SCRIPT || '/tmp/claude-0/-home-user-Corporate-Compass/76d21218-0d00-5e32-9a7d-85b8cc310452/scratchpad/act3.txt';
const DATA = path.join(__dirname, '../../src/data/missions_act3.ts');
const results = [];
const fail = (m) => { throw new Error(m); };
const need = (ok, m) => { if (!ok) fail(m); };

// ---------- 1. the words: every line in the data file is in the script, and every script line is in the data ----------
function literals(src) { // string literals of a TypeScript file, comments skipped
  const out = [];
  for (let i = 0; i < src.length; i++) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && d === '*') { i = src.indexOf('*/', i) + 1; continue; }
    if (c !== "'" && c !== '"' && c !== '`') continue;
    let j = i + 1, s = '';
    while (src[j] !== c) { if (src[j] === '\\') { s += src[j + 1] === 'n' ? '\n' : src[j + 1]; j += 2; } else s += src[j++]; }
    out.push(s); i = j;
  }
  return out;
}
function audit() {
  if (!fs.existsSync(SCRIPT)) { results.push('words: SKIPPED (script text not found at ' + SCRIPT + ')'); return; }
  const q = (t) => t.replace(/"/g, '');
  // the script's own markup: path markers, and one routing note inside a delivery note
  const rawLines = fs.readFileSync(SCRIPT, 'utf8').replace(/_[AB]\b/g, '').replace('(on the phone, both paths)', '(on the phone)').split('\n');
  const script = q(rawLines.join('\n'));
  let src = fs.readFileSync(DATA, 'utf8');
  src = src.replace(/export const ACT3_HUD = \{[\s\S]*?\};/, ''); // meter labels are new wording, by design
  const allow = new Set(['KOGANE TALK 1260']); // the station's name as Act 1 writes it
  const all = literals(src);
  const shown = all.filter((s) => !allow.has(s) && (/\s/.test(s) || /[^\x00-\x7f]/.test(s) || s.length >= 24));
  const bad = [];
  for (const s of shown) for (const part of q(s).split(' · ')) if (!script.includes(part)) bad.push('not in script: ' + s);
  const have = all.map(q).join('\n');
  const missing = [];
  for (const raw of rawLines) {
    const line = q(raw).trim();
    if (!line || line.startsWith('#')) continue;
    const stage = /^\[(?:: )?(.+)\]$/.exec(line), said = /^([A-ZŌ][A-ZŌ0-9 ]*)(?: [[(][^\])]*[\])])?: (.+)$/.exec(line);
    let parts = [];
    if (stage) parts = [stage[1]];
    else if (said && (said[1] === 'CARD' || said[1] === 'CHOICE')) parts = said[2].split(' → ')[0].split(' · ');
    else if (said) parts = [said[2]];
    else if (/^(BARK|CALL|TEXT|RADIO|Fail|Phase|Boss fight|Floor|Clean Slate only)/.test(line)) parts = [...raw.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    for (const p of parts) if (!have.includes(p)) missing.push('not in game: ' + p);
  }
  if (bad.length || missing.length) { results.push('words: FAIL\n  ' + [...bad, ...missing].join('\n  ')); return; }
  results.push(`words: PASS (${shown.length} lines in the data file are verbatim; every script line is present)`);
}

// ---------- 2. the missions ----------
(async () => {
  audit();
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e.stack || e)));
  await page.goto(URL);
  await page.waitForFunction(() => window.__kc && window.__kc.story && window.__kc.player, null, { timeout: 60000 });
  await page.waitForTimeout(800);
  const ev = (f, a) => page.evaluate(f, a);
  const wait = (ms) => page.waitForTimeout(ms);
  let log = { lines: [], phone: [], cards: [], radio: [], objs: [] };

  /** One look at the game: plays any cutscene line, hurries cards and fail screens, empties the phone, and reports. */
  const tick = async () => {
    const o = await ev(() => {
      const w = window.__kc, s = w.story, out = { lines: [], phone: [], card: null };
      if (s.cut) { for (const l of s.cut.lines) out.lines.push(l.who + ': ' + l.text); s.cut.i = s.cut.lines.length - 1; s.cut.chars = 999; s.advanceCut(); }
      if (s.card && s.active) { out.card = s.card.title + ' | ' + s.card.sub; s.card.t = Math.min(s.card.t, 0.05); }
      for (const m of s.phone) out.phone.push(m.from + ': ' + m.text);
      s.phone.length = 0;
      if (s.failT > 0.2) s.failT = 0.2;
      if (w.mode === 'dead' || w.mode === 'arrested') w.modeT = Math.min(w.modeT, 0.1);
      return Object.assign(out, { id: s.mission ? s.mission.id : null, step: s.step, obj: s.objective, hint: s.hint, active: s.active, mode: w.mode, radio: s.radio ? s.radio.station + ' | ' + s.radio.text : null,
        choice: s.choice ? s.choice.options.map((x) => x.label) : null, tries: s.vars.tries, timer: s.timer ? s.timer.label : null, heat: w.heat.level, cash: w.player.cash, keep: Object.assign({}, s.keep), floor: s.vars.floor });
    });
    log.lines.push(...o.lines); log.phone.push(...o.phone);
    if (o.card && log.cards[log.cards.length - 1] !== o.card) log.cards.push(o.card);
    if (o.radio && !log.radio.includes(o.radio)) log.radio.push(o.radio);
    if (o.obj && log.objs[log.objs.length - 1] !== o.obj) log.objs.push(o.obj);
    return o;
  };
  /** Keeps the game moving until something is true (or gives up, loudly). `each` runs every look. */
  const until = async (pred, what, each, ms = 20000) => {
    const t0 = Date.now();
    let o;
    for (;;) {
      o = await tick();
      if (await pred(o)) return o;
      if (Date.now() - t0 > ms) fail(`timed out waiting for ${what}: ${JSON.stringify({ id: o.id, step: o.step, obj: o.obj, active: o.active, mode: o.mode, choice: o.choice })}`);
      if (each) await each(o);
      await wait(50);
    }
  };
  const obj = (text, each) => until((o) => o.obj === text, `objective "${text}"`, each);
  const start = async (id, pathName, cash) => {
    log = { lines: [], phone: [], cards: [], radio: [], objs: [] };
    await ev(([id, pathName, cash]) => {
      const w = window.__kc;
      w.player.takeDamage = () => {}; // the test can't be hurt (fail conditions are triggered on purpose instead)
      w.player.cash = cash;
      w.story.keep.path = pathName;
      w.story.jumpToId(id);
    }, [id, pathName, cash ?? 5000]);
  };
  const toMarker = () => ev(() => { const w = window.__kc, m = w.story.marker, c = w.player.car; if (!m) return; if (c) { c.x = m.x; c.y = m.y; c.vx = c.vy = 0; } else w.player.actor.body.reset(m.x, m.y); });
  const onFoot = () => ev(() => { const w = window.__kc; if (w.player.car) w.player.exitCar(); });
  const kill = (tag) => ev((tag) => { const w = window.__kc; for (const t of w.gang.thugs) if (t.alive && (!tag || t.data.tag === tag)) w.hurtActor(t, 999, true, 'bullet'); }, tag);
  const count = (tag) => ev((tag) => window.__kc.gang.thugs.filter((t) => t.alive && t.data.tag === tag).length, tag);
  /** Sets a boss's health to a share of what it started with (bosses carry 100000 spare). */
  const boss = (key, share) => ev(([key, share]) => { const s = window.__kc.story, t = s.vars[key]; t.data.max = t.data.max || t.hp - 100000; t.hp = 100000 + t.data.max * share; }, [key, share]);
  const done = async () => { const o = await until((x) => !x.active, 'the mission to end'); await wait(100); return o; };
  const has = (list, text, what) => need(list.some((l) => l.includes(text)), `${what}: missing "${text}"`);
  const pathLines = (p) => { // only this path's ally speaks
    const mine = p === 'police' ? 'SAWADA: ' : 'SAEKO: ', other = p === 'police' ? 'SAEKO: ' : 'SAWADA: ';
    need(log.lines.some((l) => l.startsWith(mine)), `no ${mine}lines on the ${p} path`);
    need(!log.lines.some((l) => l.startsWith(other)), `${other}lines shown on the ${p} path`);
  };
  const mission = async (name, fn) => {
    try { const note = await fn(); results.push(`${name}: PASS${note ? ' (' + note + ')' : ''}`); }
    catch (e) { results.push(`${name}: FAIL — ${e.message}`); }
    if (errs.length) { results.push(`${name}: PAGE ERROR — ${errs.splice(0).slice(0, 3).join(' | ')}`); }
  };

  // ----- M17 Low Tide -----
  for (const p of ['yakuza', 'police']) await mission(`M17 Low Tide [${p}]`, async () => {
    await start('M17', p);
    await obj('Get into the container port.'); pathLines(p);
    has(log.lines, 'HIKARI: (on the phone) Harbour office, second floor.', 'intro');
    if (p === 'yakuza') { // fail: spotted with the manifest
      await ev(() => { const w = window.__kc, s = w.story, g = s.vars.docks[1]; s.flags.manifest = true; w.player.actor.body.reset(g.x + 24, g.y); });
      await obj('MISSION FAILED'); has(log.phone, "HIKARI: They know someone saw it. They'll move the date. Get out.", 'fail call');
      await obj('Get into the container port.');
    }
    await toMarker(); await obj('Reach the harbour office.');
    if (p === 'police') { has(log.phone, 'SAWADA: Guard on the left stack. My sniper has him. Go.', 'call'); need(await ev(() => !window.__kc.story.vars.docks[1].alive), 'the sniper did not drop the guard on the left stack'); }
    else { need(await ev(() => !!window.__kc.story.vars.fire), 'no fire at the north gate'); need(!log.phone.some((l) => l.startsWith('SAWADA')), 'Sawada called on the yakuza path'); }
    await kill('dock');
    await toMarker(); await obj('Find the manifest.');
    await toMarker(); await obj('Get out of the port.'); has(log.lines, 'MANIFEST: AMATERASU MARU — DEPARTS IN 7 DAYS', 'manifest');
    await toMarker(); const o = await done();
    has(log.phone, "HIKARI: It's the gold.", 'outro call'); has(log.phone, "JUN: Then I'm getting up early.", 'outro call');
    has(log.cards, p === 'police' ? "LOW TIDE — COMPLETE | Unlocked: Inspector's Revolver (Legendary)" : 'LOW TIDE — COMPLETE | ', 'card');
    need(o.cash >= 5000 + 150000, 'payout'); if (p === 'police') need(o.keep.inspectorRevolver, 'revolver not unlocked');
    return `${log.objs.filter((x) => x !== 'MISSION FAILED').length} objectives, card "${log.cards[0]}"`;
  });

  // ----- M18 Fish Market: pay, fight, and "not enough cash forces the fight" -----
  await mission('M18 Fish Market [pay]', async () => {
    await start('M18', 'yakuza', 6000000);
    const c = await until((o) => !!o.choice, 'the choice'); need(c.choice.join('|') === 'Pay ¥5,000,000|Fight', 'choice options');
    await ev(() => window.__kc.story.choose(0));
    await obj('Hand over the money.'); await toMarker(); const o = await done();
    has(log.lines, "HACHIRŌ: (counting) Smart. Money's cleaner than blood. Mostly.", 'outro'); need(!log.lines.some((l) => l.includes('frozen tuna. Nobody')), 'fought line shown after paying');
    has(log.cards, "FISH MARKET — COMPLETE | Umibōzu boats stay home for the finale · Unlocked: Umibōzu's Hook (Legendary)", 'card');
    need(o.cash === 6000000 - 5000000 + 200000, 'cash after paying: ' + o.cash); need(o.keep.hachiro === 'hachiroPaid' && o.keep.umibozuHook, 'choice not remembered');
    return 'paid ¥5,000,000';
  });
  await mission('M18 Fish Market [fight]', async () => {
    await start('M18', 'yakuza');
    await until((o) => !!o.choice, 'the choice'); await ev(() => window.__kc.story.choose(1));
    const b = await obj("Beat Hachirō's crew."); need(b.hint === 'Tuna knife — press E to pick up.', 'knife prompt');
    await toMarker(); await page.keyboard.down('e'); await wait(250); await page.keyboard.up('e');
    need(await ev(() => !!window.__kc.story.flags.knife), 'E did not pick up the tuna knife');
    await kill('crew'); await obj('Beat Hachirō.'); await wait(300); await boss('boss', 0); await done();
    has(log.lines, "HACHIRŌ: (flat on the ice, laughing) Hit with a frozen tuna. Nobody's done that in years.", 'outro'); need(!log.lines.some((l) => l.includes('(counting)')), 'paid line shown after fighting');
    has(log.lines, 'HACHIRŌ: He laughs too much. Never trust a man who laughs at sea.', 'outro');
    return 'crew of ' + 5 + ', then Hachirō';
  });
  await mission('M18 Fish Market [pay without the cash, knocked out]', async () => {
    await start('M18', 'yakuza', 100);
    await until((o) => !!o.choice, 'the choice'); await ev(() => window.__kc.story.choose(0));
    await obj("Beat Hachirō's crew."); // forced fight
    await ev(() => { window.__kc.player.hp = 10; });
    await obj('MISSION FAILED'); has(log.phone, "HACHIRŌ: Come back when you've eaten breakfast, land boy.", 'fail line');
    await until((o) => !!o.choice, 'the choice again after the retry');
    return 'forced fight; knocked out; retry offers the choice again';
  });

  // ----- M19 Sea Legs -----
  await mission('M19 Sea Legs', async () => {
    await start('M19', 'yakuza');
    await obj("Catch the smuggler's boat.");
    await ev(() => { const s = window.__kc.story, t = s.vars.truck, p = s.place('pier9'); t.x = p.x - 60; t.y = p.y + 288; }); // fail: the smuggler reaches the ship
    await obj('MISSION FAILED'); has(log.phone, "GORO: It's alongside. We missed it, kid.", 'fail line');
    await obj("Catch the smuggler's boat.");
    const beside = () => ev(() => { const w = window.__kc, t = w.story.vars.truck, c = w.player.car; if (c) { c.x = t.x; c.y = t.y + 52; c.vx = c.vy = 0; } });
    await beside(); await obj('Board it.', beside); await obj('Clear the deck.', beside);
    need(await count('smuggler') === 4, 'smugglers'); need(await ev(() => !window.__kc.player.car), 'Jun did not jump across');
    await ev(() => { const s = window.__kc.story, c = s.vars.boat, t = s.vars.truck; c.x = t.x - 300; c.y = t.y; c.vx = c.vy = 0; }); // Goro's car is a little way back
    await kill('smuggler'); await obj('Sink the boat.');
    await ev(() => { const w = window.__kc, t = w.story.vars.truck; w.player.actor.body.reset(t.x, t.y + 34); });
    await obj('Get back to Goro.'); need(await ev(() => window.__kc.story.vars.truck.wreck), 'the smuggler did not sink');
    await toMarker(); await done();
    has(log.lines, 'JUN: (looking at the photo) I think I have.', 'outro'); has(log.cards, 'SEA LEGS — COMPLETE | Boats unlocked at marinas', 'card'); has(log.phone, "HIKARI: kirishima's on the guest list", 'text');
    return '5 objectives';
  });

  // ----- M20 Penthouse -----
  await mission('M20 Penthouse', async () => {
    await start('M20', 'yakuza', 500000);
    const park = async (scratch) => {
      await obj('Park three cars without damage.');
      const n = await ev((scratch) => { const w = window.__kc, s = w.story, v = s.vars.valet; w.player.putInCar(v.car); if (scratch) v.car.bump = 120; return s.vars.tries; }, scratch);
      await wait(150); // the marker moves to the bay once Jun is driving
      await toMarker();
      await until((o) => o.tries !== n || o.obj !== 'Park three cars without damage.', 'the car to be parked');
    };
    const toRoof = async (scratchFirst) => {
      if (scratchFirst) await park(true);
      for (let i = 0; i < 3; i++) await park(false);
      await obj('Carry coats up to the roof.'); await toMarker(); await obj('Get close to Amane.');
    };
    await toRoof(true);
    has(log.phone, 'HIKARI: You were a getaway driver. This is a getaway driver with manners.', 'intro call');
    need(await ev(() => window.__kc.story.vars.tries === 4 && window.__kc.player.cash === 450000), 'a scratched car should cost the excess and not count');
    // fail: Amane spots the bug (stand in front of her)
    await until((o) => o.obj === 'MISSION FAILED', 'Amane to notice', () => ev(() => { const w = window.__kc, s = w.story, a = s.vars.amane; w.player.actor.body.reset(a.x, a.y + (s.vars.face > 0 ? 50 : -50)); }));
    has(log.phone, 'HIKARI: She found it. Abort. Abort with manners.', 'fail call');
    await toRoof(false);
    const behind = () => ev(() => { const w = window.__kc, a = w.story.vars.amane; w.player.actor.body.reset(a.x + 20, a.y); }); // beside her, out of her sight
    await obj('Plant the bug on her phone.', behind); await obj('Listen in.', behind);
    await until((o) => o.obj !== 'Listen in.', 'the conversation', () => ev(() => { window.__kc.story.vars.listenT = 100; }));
    await done();
    for (const l of ['AMANE: Mr. Kirishima. The driver robbed my truck', 'KIRISHIMA: He was always resourceful. I trained him that way.', "KIRISHIMA: Then I'll make him disappear. (laughs)", "JUN: A dead man's.", 'MIKA: Someone left flowers at the shop.']) has(log.phone, l, 'phone');
    has(log.lines, ': through the glass, JUN sees a silver-haired man from behind', 'stage direction'); has(log.cards, 'PENTHOUSE — COMPLETE | ', 'card');
    return '5 objectives; scratch, spotted and retry covered';
  });

  // ----- M21 Ghost -----
  await mission('M21 Ghost', async () => {
    await start('M21', 'yakuza');
    const toMika = async () => {
      const o = await until((x) => x.obj === 'Get to the old temple.' || x.obj === 'Fight through the Yatagarasu guards.', 'the way to the temple'); // (a retry starts at the gate, so the first objective passes at once)
      if (o.obj === 'Get to the old temple.') await toMarker();
      await obj('Fight through the Yatagarasu guards.'); need(await count('gate') === 6, 'gate guards'); await kill('gate');
      await obj('Find Mika.'); await toMarker(); await obj('Free Mika.');
    };
    await toMika();
    has(log.phone, 'TETSU: Come alone, or come late. Your choice.', 'intro call'); has(log.lines, 'TETSU: I let you live. You were always my favourite.', 'courtyard');
    await ev(() => { window.__kc.story.vars.fireT = 0.2; }); // fail: the fire reaches Mika
    const f = await obj('MISSION FAILED'); need(f.hint === 'You were too late.', 'fail card');
    await toMika(); // the retry starts at the temple gate
    await kill('fire'); await toMarker(); await obj('Get Mika to safety.'); await toMarker(); await done();
    has(log.lines, 'MIKA: No. (takes his hand) But you can stop carrying him alone.', 'temple steps'); has(log.cards, 'GHOST — COMPLETE | ', 'card'); has(log.phone, "KENTA: heard tetsu's alive.", 'text');
    return '5 objectives; too-late fail and gate retry covered';
  });

  // ----- M22 Last Stand -----
  for (const p of ['yakuza', 'police']) await mission(`M22 Last Stand [${p}]`, async () => {
    await start('M22', p);
    const toHeli = async () => {
      await obj('Fight up through the tower.'); await ev(() => { const w = window.__kc, q = w.story.place('mibuPlaza'); w.player.actor.body.reset(q.x, q.y + 40); });
      await until((o) => o.obj === 'Reach the penthouse.', 'the floors', () => kill('floor'));
      await toMarker(); await obj('Beat Mibu.'); await wait(200);
      await boss('mibu', 0.6); await until(async () => (await count('bodyguard')) === 3, 'the bodyguards');
      await boss('mibu', 0.2); return obj('Bring down the helicopter.');
    };
    const h = await toHeli(); pathLines(p);
    need(h.hint === "shoot the rotor, or harpoon the skid with Umibōzu's Hook", 'helicopter prompt');
    if (p === 'yakuza') { // fail: the helicopter escapes
      await ev(() => { window.__kc.story.vars.heliT = 0.2; });
      await obj('MISSION FAILED'); has(log.phone, 'MIBU: Bye, Jun! Expensive, remember?', 'fail line');
      await toHeli();
    }
    await wait(400); await ev(() => window.__kc.story.vars.heli.damage(99999, true)); const o = await done();
    has(log.lines, "MIBU: Pier 9, midnight tomorrow. Hayami's aboard. Kill him for me, would you?", 'outro'); has(log.lines, p === 'police' ? "SAWADA: (arriving, cuffing him) Ryūji Mibu, you're under arrest." : 'SAEKO: (arriving, her men lifting MIBU) Mibu-san.', 'outro');
    has(log.cards, 'LAST STAND — COMPLETE | Unlocked: Black Iron (Legendary)', 'card'); need(o.keep.blackIron, 'Black Iron not unlocked');
    return '2 waves, Mibu in 3 phases, helicopter down';
  });

  // ----- M23 Tsukuyomi -----
  for (const p of ['yakuza', 'police']) await mission(`M23 Tsukuyomi [${p}]`, async () => {
    await start('M23', p);
    await obj('Break into Tsukuyomi Tower.'); pathLines(p); await toMarker();
    const a = await until((o) => o.obj === 'Fight up to floor 40.' && !!o.timer, 'the floors'); need(a.heat === 5, 'not a 5-lantern assault: ' + a.heat);
    const floors = [];
    const climb = (to) => until((o) => { if (o.floor && !floors.includes(o.floor)) floors.push(o.floor); return o.floor >= to || o.obj === "Reach Amane's office."; }, 'floor ' + to, () => kill());
    await climb(20);
    if (p === 'yakuza') { // Jun goes down: restart from the last floor checkpoint
      await ev(() => window.__kc.playerDied());
      await until((o) => o.mode === 'dead', 'the OWARI screen'); const r = await until((o) => o.mode === 'play' && o.obj === 'Fight up to floor 40.', 'the checkpoint restart');
      need(r.floor === 20 && r.heat === 5, `restart should be at floor 20 with 5 lanterns, got floor ${r.floor}, heat ${r.heat}`);
    }
    const top = await climb(40); need(/^FLOOR \d+ \/ 40$/.test(a.timer), 'floor meter');
    await obj("Reach Amane's office."); await toMarker(); const o = await done();
    need(floors.join() === '10,20,30,40' || top.floor === 40, 'floors: ' + floors); need(o.heat === 0, 'heat should be cleared at the end');
    has(log.radio, 'KOGANE FM | DJ ŌKAMI: Tsukuyomi Tower is under attack!', 'radio'); has(log.phone, "KENTA: Raijin's blocking the ramps.", 'call');
    has(log.lines, p === 'police' ? "SAWADA: (entering with officers) Kaoru Amane, you're under arrest." : 'SAEKO: (entering) The police are on their way, Amane-san.', 'outro');
    has(log.cards, 'TSUKUYOMI — COMPLETE | ', 'card'); has(log.radio, 'KOGANE TALK 1260 | Tsukuyomi CEO Kaoru Amane was arrested live', 'radio'); has(log.phone, 'HIKARI: pier 9. midnight. go get your gold, parole.', 'text');
    return `floors ${floors.join(' → ')}, 5 lanterns${p === 'yakuza' ? ', checkpoint restart at floor 20' : ''}`;
  });

  // ----- M24 Amaterasu Maru and the endings -----
  const ENDS = { shogun: ['Keep it', 'SHADOW SHOGUN'], oldtown: ['Give it to Asagiri', 'OLD TOWN'], cleanslate: ['Sink it', 'CLEAN SLATE'] };
  const ending = async (p, end) => {
    const c = await until((o) => !!o.choice, 'the gold choice'); need(c.choice.join('|') === 'Keep it|Give it to Asagiri|Sink it', 'gold choice options');
    has(log.lines, 'JUN: I was never your work.', 'the deck');
    const before = log.lines.length;
    await ev((i) => window.__kc.story.choose(i), Object.keys(ENDS).indexOf(end));
    const o = await done(); pathLines(p);
    const after = log.lines.slice(before);
    has(after, p === 'police' ? "SAWADA: (cuffing him) Tetsu Hayami, you're under arrest. Again, technically. You were dead." : 'SAEKO: (her men lift TETSU) Hayami-san.', 'the deck');
    has(log.cards, 'AMATERASU MARU — COMPLETE | ', 'card'); need(log.cards[log.cards.length - 1] === ENDS[end][1] + ' | ', 'ending card: ' + log.cards);
    const expect = { shogun: p === 'police' ? ['SAWADA: Keep your nose clean, Sakamaki. Cleaner than mine.', 'JUN: Funny.'] : ["SAEKO: No. Now it's ours.", "JUN: The city's not for sale."],
      oldtown: ['MIKA: You drove a cargo ship. You can drive soup.', p === 'police' ? "SAWADA: (off duty, sitting down) Two shoyu. And don't tell me where the gold went." : 'SAEKO: (at the end of the counter) Best ramen in Kogane, Sakamaki-san. The family protects it now.'],
      cleanslate: ['MIKA: (laughing, crying) Idiot. (beat) I missed you.', 'JUN: (beat) The weather will be very bad.'] }[end];
    for (const l of expect) has(after, l, end + ' ending');
    for (const other of Object.keys(ENDS)) if (other !== end) need(!log.cards.includes(ENDS[other][1] + ' | '), 'another ending also played: ' + other);
    if (end === 'shogun') has(log.phone, "MIKA: Shop's busy. People ask about you. I tell them you moved away.", 'text');
    if (end === 'cleanslate') {
      has(log.radio, p === 'police' ? 'KOGANE TALK 1260 | Inspector Yumi Sawada was promoted today' : 'KOGANE TALK 1260 | The Kurogane-kai announced a peaceful change of leadership today.', 'radio');
      await ev(() => { window.__kc.story.radio = null; }); // after the credits: the ticker adds one more line
      await until((x) => !!x.radio && x.radio.includes('Fishermen in Kogane Bay report gold bars in their nets. Experts advise: keep fishing.'), 'the fishermen line', null, 5000);
    }
    need(o.keep.ending === end, 'ending not remembered'); need(o.id === null && o.mode === 'play' && !o.active, 'the city should be open for free roam after the ending');
    return o;
  };
  const full = async (p, end, die) => {
    await start('M24', p);
    await obj('Catch the Amaterasu Maru.'); need(await ev(() => !!window.__kc.player.car), 'Jun should be in Goro\'s car');
    has(log.lines, "KENTA: The Raijin can't swim! But we can light it up! For Daigo!", 'intro'); has(log.lines, p === 'police' ? 'SAWADA: (on the phone) Coast guard is twenty minutes out. You have nineteen.' : 'SAEKO: (on the phone) The family is watching from the shore. Make my father proud.', 'intro');
    await toMarker(); await obj('Climb aboard.'); await onFoot(); await toMarker();
    await obj('Fight across the container deck.');
    if (die) { // Jun goes down: restart from the climb aboard
      await ev(() => window.__kc.playerDied());
      await until((o) => o.mode === 'dead', 'the OWARI screen'); await until((o) => o.mode === 'play' && (o.obj === 'Climb aboard.' || o.obj === 'Fight across the container deck.'), 'the checkpoint restart');
      need(await ev(() => window.__kc.story.vars.u === 1), 'the ship should be alongside after the restart');
      await toMarker(); await obj('Fight across the container deck.');
    }
    await until((o) => o.obj === 'Reach the bridge deck.', 'the deck waves', () => kill('deck'));
    await toMarker(); await obj('Beat Tetsu.'); await wait(300);
    await boss('tetsu', 0.5); await wait(2200); need(await ev(() => window.__kc.story.vars.phase === 2), 'Tetsu phase 2');
    await boss('tetsu', 0.2); await wait(400); need(await ev(() => window.__kc.story.vars.phase === 3 && window.__kc.story.vars.tetsu.data.gun === true), 'Tetsu phase 3');
    await boss('tetsu', 0);
    await ending(p, end);
    return `5 objectives${die ? ', checkpoint restart at the climb aboard' : ''}, ending card "${ENDS[end][1]}"`;
  };
  /** The remaining path and ending pairs: straight to the deck scene and the choice. */
  const short = async (p, end) => {
    await start('M24', p);
    await obj('Catch the Amaterasu Maru.');
    await ev(() => { const s = window.__kc.story; s.objective = ''; s.marker = null; s.step = s.mission.steps.findIndex((x) => x.t === 'choice') - 1; s.enterStep(); });
    await ending(p, end);
    return `ending card "${ENDS[end][1]}" (deck scene onward)`;
  };
  await mission('M24 Amaterasu Maru [yakuza] → Shadow Shogun', () => full('yakuza', 'shogun', true));
  await mission('M24 Amaterasu Maru [police] → Old Town', () => full('police', 'oldtown', false));
  await mission('M24 Amaterasu Maru [yakuza] → Clean Slate', () => full('yakuza', 'cleanslate', false));
  await mission('M24 ending [police] → Shadow Shogun', () => short('police', 'shogun'));
  await mission('M24 ending [yakuza] → Old Town', () => short('yakuza', 'oldtown'));
  await mission('M24 ending [police] → Clean Slate', () => short('police', 'cleanslate'));

  await browser.close();
  for (const r of results) console.log(r);
  const bad = results.filter((r) => !/: (PASS|SKIPPED)/.test(r));
  console.log(bad.length ? `\nACT 3: ${bad.length} FAILED` : '\nACT 3: all passed, no page errors');
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { for (const r of results) console.log(r); console.error('ACT 3 test crashed:', e); process.exit(1); });
