const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.goto((process.env.GAME_URL || 'http://localhost:4173/'));
  await p.waitForTimeout(3500);
  const ev = (f, a) => p.evaluate(f, a);
  const st = async (tag) => console.log(tag, JSON.stringify(await ev(() => { const w = window.__kc, s = w.story; return { m: s.index, step: s.step, act: s.active, obj: s.objective, mode: w.mode, heat: w.heat.level, hp: Math.round(w.player.hp), thugs: w.gang.activeThugs, cars: w.cars.length, fps: Math.round(w.game.loop.actualFps) }; })));
  const cuts = async () => { for (let i = 0; i < 80; i++) { if (!(await ev(() => !!window.__kc.story.cut))) break; await p.mouse.click(900, 300); await p.waitForTimeout(50); } };
  const wait = (ms) => p.waitForTimeout(ms);
  const god = () => ev(() => { window.__kc.player.takeDamage = () => {}; });
  const toMarker = (dy = 0) => ev((dy) => { const w = window.__kc, m = w.story.marker, c = w.player.car; if (!m) return; if (c) { c.x = m.x; c.y = m.y + dy; c.vx = c.vy = 0; } else w.player.actor.body.reset(m.x, m.y + dy); }, dy);
  await god();
  // M01-M03 quickly via real flow
  await cuts(); await cuts(); await st('m1 fight');
  await ev(() => { const w = window.__kc; for (const t of w.gang.thugs) w.hurtActor(t, 999, true, 'melee'); }); await wait(300);
  await ev(() => { const w = window.__kc; w.player.putInCar(w.story.cars[0]); }); await wait(400); await st('m1 car');
  await toMarker(); await wait(400); await ev(() => window.__kc.player.exitCar()); await toMarker(); await wait(400); await cuts(); await wait(4000); await st('m1 done');
  
  // M02: step away then back
  await ev(() => { const w = window.__kc; w.player.actor.body.reset(w.story.marker.x + 120, w.story.marker.y + 60); }); await wait(300); await toMarker(); await wait(400); await cuts(); await st('m2 start');
  for (let i = 0; i < 3; i++) { await ev(() => { const w = window.__kc; w.player.putInCar(w.story.vars.scooter); }); await toMarker(); await wait(500); }
  await toMarker(); await wait(500); await cuts(); await wait(4000); await st('m2 done');
  await toMarker(); await wait(500); await cuts(); await st('m3 start');
  await ev(() => { const w = window.__kc; w.player.putInCar(w.story.vars.zenki); }); await wait(600); await st('m3 alarm');
  await ev(() => { for (const c of window.__kc.gang.activeChasers) c.destroy(); window.__kc.heat.clear(false); }); await wait(500);
  await toMarker(); await wait(400); await toMarker(); await wait(400); await cuts(); await wait(4000); await st('m3 done');
  // M04 race
  await toMarker(); await wait(500); await cuts(); await wait(500); await st('m4 start');
  
  await wait(6000); console.log('kenta', JSON.stringify(await ev(() => { const s = window.__kc.story, k = s.vars.kenta; return { ki: s.vars.ki, x: Math.round(k.x), y: Math.round(k.y), sp: Math.round(k.speed), hp: Math.round(k.hp) }; })));
  await wait(14000); console.log('kenta', JSON.stringify(await ev(() => { const s = window.__kc.story, k = s.vars.kenta; return { ki: s.vars.ki, x: Math.round(k.x), y: Math.round(k.y), sp: Math.round(k.speed), hp: Math.round(k.hp) }; })));
  for (let i = 0; i < 8; i++) { await toMarker(); await wait(250); }
  await wait(300); await cuts(); await wait(4000); await st('m4 done');
  // M05
  await toMarker(); await wait(500); await cuts(); await st('m5 start');
  await toMarker(); await wait(1500); await st('m5 van');
  await ev(() => { const w = window.__kc, v = w.story.vars.van; v.damage(v.def.hp * 0.5, true); }); await wait(1500); await st('m5 guards');
  
  await ev(() => { const w = window.__kc; for (const t of w.gang.thugs) w.hurtActor(t, 999, true, 'bullet'); }); await wait(500);
  await ev(() => { const w = window.__kc, v = w.story.vars.van; w.player.actor.body.reset(v.x + 30, v.y); }); await wait(500); await st('m5 rack');
  await ev(() => window.__kc.heat.clear(false)); await toMarker(); await wait(500); await cuts(); await wait(4000); await st('m5 done');
  // M06
  await toMarker(); await wait(500); await cuts(); await st('m6 start');
  for (let wv = 0; wv < 3; wv++) { await wait(2500); await ev(() => { const w = window.__kc; for (const t of w.gang.thugs) w.hurtActor(t, 999, true, 'bullet'); }); await wait(600); await st('m6 wave' + wv); }
  await wait(800); await st('m6 ogata');
  await ev(() => { const c = window.__kc.story.vars.ogata; c.damage(c.def.hp * 0.6, true); }); await wait(600); await cuts(); await toMarker(); await wait(500); await cuts(); await wait(4000); await st('m6 done');
  // M07
  await toMarker(); await wait(600); await cuts(); await st('m7 start');
  await wait(1000);
  console.log('courier', JSON.stringify(await ev(() => { const s = window.__kc.story, c = s.vars.courier; return { route: c.route.length, x: Math.round(c.x), y: Math.round(c.y), yard: [Math.round(s.place('containerYard').x), Math.round(s.place('containerYard').y)] }; })));
  // hide player far away (no LOS) and let him drive
  for (let i = 0; i < 12; i++) { await wait(5000); const r = await ev(() => { const s = window.__kc.story, c = s.vars.courier; c.cruise = 125; return { step: s.step, route: c.route.length, d: Math.round(Math.hypot(c.x - s.place('containerYard').x, c.y - s.place('containerYard').y)), eye: +(s.vars.eye || 0).toFixed(2), sp: Math.round(c.speed) }; }); console.log('  tail', JSON.stringify(r)); if (r.step >= 3) break; await ev(() => { const w = window.__kc, c = w.story.vars.courier; if (w.player.car) w.player.exitCar(); w.player.actor.body.reset(c.x - Math.cos(c.heading) * 500, c.y - Math.sin(c.heading) * 500); }); }
  await st('m7 arrived');
  await ev(() => { const w = window.__kc, m = w.story.marker; w.player.actor.body.reset(m.x + 150, m.y + 60); }); await wait(15000); await st('m7 listened');
  await ev(() => { const w = window.__kc; w.player.actor.body.reset(w.player.actor.x + 700, w.player.actor.y); }); await wait(800); await cuts(); await wait(4000); await st('m7 done');
  // M08
  await toMarker(); await wait(600); await cuts(); await st('m8 start');
  await toMarker(); await wait(600); await st('m8 inside'); await toMarker(); await wait(600); await toMarker(); await wait(1000); await st('m8 tape');
  
  await ev(() => { const w = window.__kc, t = w.story.place('truck'); w.player.actor.body.reset(t.x, t.y + 60); }); await wait(1500); await st('m8 swap');
  await ev(() => window.__kc.heat.clear(true)); await wait(800); await cuts(); await wait(4500); await st('m8 done');
  console.log('errors:', errs.slice(0, 8));
  await b.close();
})();
