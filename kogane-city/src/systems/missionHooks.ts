import { MISSION_BARKS as B, MISSION_TUNING as T } from '../data/missions';
import * as Phaser from 'phaser';
import { VEHICLES, BLACK_SEDAN, BLACK_SPORTS, WHITE_SEDAN } from '../data/vehicles';
import { MAP } from '../data/map';
import { TILE_SIZE as TS } from '../data/config';
import { Actor } from '../entities/Actor';
import type { Car } from '../entities/Car';
import type { WorldScene } from '../scenes/WorldScene';
import type { Story } from './Story';

// The "code hooks for set pieces" (bible, Architecture): the few things each mission
// needs that plain text can't describe. Named so data/missions.ts can refer to them.
export type Hook = (w: WorldScene, s: Story) => void;
export type Check = (w: WorldScene, s: Story, dt: number) => boolean;

export const npc = (w: WorldScene, s: Story, look: string, x: number, y: number): Actor => {
  const f = free(w, x, y);
  const a = new Actor(w, 'ped', f.x, f.y, look, 999);
  a.body.setImmovable(true);
  s.actors.push(a);
  return a;
};
/** The nearest point to (x, y) that isn't inside a wall or water. */
export function free(w: WorldScene, x: number, y: number): { x: number; y: number } {
  for (let r = 0; r < 200; r += 12) for (let a = 0; a < 8; a++) {
    const px = x + Math.cos(a * 0.785) * r, py = y + Math.sin(a * 0.785) * r;
    if (![[0, 0], [10, 0], [-10, 0], [0, 10], [0, -10]].some(([dx, dy]) => w.map.isSolid(px + dx, py + dy))) return { x: px, y: py };
  }
  return { x, y };
}
export function nearestLot(w: WorldScene, x: number, y: number) {
  return w.map.lots.reduce((b, l) => (Math.hypot(l.x + l.w / 2 - x, l.y + l.h / 2 - y) < Math.hypot(b.x + b.w / 2 - x, b.y + b.h / 2 - y) ? l : b));
}
/** A car that belongs to the mission: the city's tidy-up rules leave it alone. */
export function storyCar(w: WorldScene, def: (typeof VEHICLES)[string], x: number, y: number, heading: number, color: number): Car {
  for (const c of w.cars) if (!c.story && c.driver === 'none' && Math.hypot(c.x - x, c.y - y) < 60) c.destroy(); // clear the parking space
  const c = w.addCar(def, x, y, heading, false, color);
  c.story = true;
  return c;
}
export const near = (w: WorldScene, s: Story): boolean => {
  const m = s.marker, p = w.player;
  if (!m) return false;
  if (m.need === 'car' && !p.car) return false;
  if (m.need === 'scooter' && p.car !== s.vars.scooter) return false;
  if (m.need === 'zenki' && p.car !== s.vars.zenki) return false;
  return Math.hypot(p.pos.x - m.x, p.pos.y - m.y) < m.r;
};

export const HOOKS: Record<string, Hook> = {
  // ----- M01 Gate Out -----
  m01Setup(w, s) {
    const door = s.place('prison'), lot = nearestLot(w, door.x, door.y);
    const lx = lot.x + lot.w / 2, ly = lot.y + lot.h / 2, d = Math.hypot(lx - door.x, ly - door.y) || 1;
    // the thugs wait a little way toward their car
    const tx = door.x + ((lx - door.x) / d) * Math.min(90, d * 0.5), ty = door.y + ((ly - door.y) / d) * Math.min(90, d * 0.5);
    const a = free(w, tx - 12, ty - 8), b = free(w, tx + 14, ty + 10);
    const t1 = w.gang.spawnThug(a.x, a.y, 'thug', 'wait');
    const t2 = w.gang.spawnThug(b.x, b.y, 'thug', 'wait');
    t1.data.fleeAt = 24; t1.data.fleeBark = B.m01ThugFlee;
    t2.data.downBark = B.m01ThugDown;
    s.cars.push(storyCar(w, VEHICLES.sedan, lx, ly, Math.PI, BLACK_SEDAN)); // the Kurogane sedan
    s.flags.quietBreakIn = true; // the tutorial car doesn't set off Heat
    s.junCarLine = B.m01JunCar;
  },
  m01Fight(w) { for (const t of w.gang.thugs) if (t.state === 'wait') t.state = 'chase'; },

  // ----- M02 Hot Soup -----
  m02Setup(w, s) {
    const home = s.place('ramen'), spot = free(w, home.x + 36, home.y + 10);
    const sc = storyCar(w, VEHICLES.scooter, spot.x, spot.y, -Math.PI / 2, 0);
    sc.unlocked = true;
    s.cars.push(sc); s.vars.scooter = sc;
    s.vars.taba = npc(w, s, 'customer', s.place('arcade').x + 14, s.place('arcade').y + 0);
    s.vars.ueda = npc(w, s, 'elder', s.place('bathhouse').x + -16, s.place('bathhouse').y + 0);
    s.vars.noda = npc(w, s, 'cop', s.place('policeBox').x + -14, s.place('policeBox').y + -14);
    s.vars.ishii = npc(w, s, 'cop', s.place('policeBox').x + 4, s.place('policeBox').y + -18);
    s.showSpill = true;
    s.marker = null;
  },
  m02Arcade(w, s) { deliver(w, s, s.vars.taba as Actor, B.m02Taba); },
  m02Bath(w, s) { deliver(w, s, s.vars.ueda as Actor, B.m02Ueda); },
  m02Police(w, s) {
    const noda = s.vars.noda as Actor, ishii = s.vars.ishii as Actor;
    deliver(w, s, noda, B.m02Noda, 6200);
    w.time.delayedCall(2200, () => ishii.alive && w.fx.bark(ishii.sprite, B.m02Ishii, '#9cc0ff'));
    w.time.delayedCall(4200, () => noda.alive && w.fx.bark(noda.sprite, B.m02Noda2, '#9cc0ff'));
    s.showSpill = false;
  },

  // ----- M03 Wheels -----
  m03Setup(w, s) {
    const y = s.place('railyard');
    const z = storyCar(w, VEHICLES.sports, y.x, y.y, -Math.PI / 2, BLACK_SPORTS);
    s.cars.push(z); s.vars.zenki = z;
    for (const [dx, dy] of [[-70, 30], [60, -34]]) { const f = free(w, y.x + dx, y.y + dy); w.gang.spawnThug(f.x, f.y, 'raijin', 'guard'); }
    s.junCarLine = B.m03JunCar;
    s.flags.quietBreakIn = true; // the alarm is handled by the mission itself
    s.vars.loseT = 0;
  },
  m03Alarm(w, s) {
    const z = s.vars.zenki as Car;
    for (const t of w.gang.thugs) t.state = 'chase';
    // two Raijin riders arrive on the nearest stretches of road that are out of view
    const lanes = [...w.map.lanes].sort((a, b) => Math.hypot(a.ax - z.x, a.ay - z.y) - Math.hypot(b.ax - z.x, b.ay - z.y));
    let made = 0;
    for (const l of lanes) {
      if (made >= 2) break;
      const x = l.ax + l.dx * 60, y = l.ay + l.dy * 60;
      if (w.onScreen(x, y, 60) || w.cars.some((c) => Math.hypot(c.x - x, c.y - y) < 90)) continue;
      const c = w.gang.spawnChaser(VEHICLES.bike, x, y, Math.atan2(l.dy, l.dx));
      c.data_bark = made ? B.m03Biker2 : B.m03Biker1;
      made++;
    }
    w.heat.crime('breakIn'); // "That's cops on top of bikers."
  },
  m03Respray(w, s) {
    const z = s.vars.zenki as Car;
    z.respray();
    w.fx.puff(z.x, z.y, 0xffffff, 40, 0.5, 0, 0, 2, 0.6);
    if (w.heat.level <= 3) w.heat.clear(true); // respray clears 3 lanterns or fewer (bible)
  },
};

/** A customer takes their soup: their line, a tip line by how much spilled, and the tip. */
function deliver(w: WorldScene, s: Story, who: Actor, line: string, tipDelay = 2400): void {
  w.fx.bark(who.sprite, line, '#ffe9c0');
  const spill = Math.min(1, s.spill);
  const tipLine = spill < 0.1 ? B.m02TipGood : spill <= 0.5 ? B.m02TipOk : B.m02TipBad;
  w.time.delayedCall(tipDelay, () => who.alive && w.fx.bark(who.sprite, tipLine, '#ffe9c0'));
  w.player.cash += Math.round(T.deliveryTip * (1 - spill));
  s.spill = 0;
}

export const CHECKS: Record<string, Check> = {
  atMarker: (w, s) => near(w, s),
  inCar: (w) => !!w.player.car,
  thugsDone: (w) => w.gang.activeThugs === 0,
  inZenki: (w, s) => {
    const z = s.vars.zenki as Car;
    if (s.marker) { s.marker.x = z.x; s.marker.y = z.y; }
    return w.player.car === z;
  },
  zenkiDestroyed: (_w, s) => { const z = s.vars.zenki as Car | undefined; return !!z && (z.wreck || z.removed); },
  raijinLost: (w, s, dt) => {
    const live = w.gang.activeChasers, p = w.player.pos;
    const close = live.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < T.raijinLoseDist);
    s.vars.loseT = close ? 0 : (s.vars.loseT as number) + dt;
    if (live.length && (s.vars.loseT as number) < T.raijinLoseTime) return false;
    for (const c of live) c.destroy();
    return true;
  },
  /** Soup delivery: the spill meter, the red-light lesson, then "are we there yet". */
  m02Deliver: (w, s, dt) => {
    const sc = s.vars.scooter as Car;
    if (w.player.car === sc) {
      const hit = Math.max(sc.lastImpact, sc.bump);
      if (hit > 40) s.spill += hit * T.spillPerImpact;
      if (hit > 140) s.flags.crashed = true;
      if (sc.slip > T.spillSlipMin) s.spill += sc.slip * T.spillPerSlip * dt;
      s.spill = Math.min(1, s.spill);
      // running a red light: 1 lantern (once)
      const j = w.map.litJunctionAt(sc.x, sc.y), inBox = !!j;
      if (j && !s.flags.wasInBox && sc.speed > 40 && !s.flags.redDone) {
        const axis = Math.abs(Math.cos(sc.heading)) > Math.abs(Math.sin(sc.heading)) ? 'h' : 'v';
        if (!w.traffic.canGo(j, axis)) {
          s.flags.redDone = true;
          w.heat.crime('runRed');
          w.fx.bark((s.vars.noda as Actor).sprite, B.m02RedLight, '#9cc0ff');
          s.hint = B.m02HeatHint;
        }
      }
      s.flags.wasInBox = inBox;
    }
    sc.bump = 0;
    return near(w, s) && sc.speed < 140;
  },
};

// =====================================================================================
// Missions 4-8
// =====================================================================================

export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

/** Simple AI driver: steer at a point, hold a speed, back out if stuck. */
export function aiDrive(c: Car, tx: number, ty: number, want: number, dt: number): void {
  const inp = c.input;
  inp.nitro = false; inp.handbrake = false; inp.brake = false;
  if (c.reverseT > 0) { c.reverseT -= dt; inp.throttle = -1; inp.steer = c.panic; return; }
  const diff = Phaser.Math.Angle.Wrap(Math.atan2(ty - c.y, tx - c.x) - c.heading);
  inp.steer = Phaser.Math.Clamp(diff * 2.5, -1, 1);
  const target = Math.abs(diff) > 0.8 ? Math.min(want, 150) : want, v = c.forwardSpeed;
  inp.throttle = v < target ? 1 : 0;
  inp.brake = v > target + 30;
  if (c.speed < 14) c.stuck += dt; else c.stuck = 0;
  if (c.stuck > 1) { c.stuck = 0; c.reverseT = 0.8; c.panic = diff > 0 ? -1 : 1; }
}

/** A story car driven by the traffic AI along the lanes (optionally to a destination). */
export function laneCar(w: WorldScene, s: Story, def: (typeof VEHICLES)[string], color: number, near: { x: number; y: number }, back: number, cruise: number): Car {
  const lane = w.map.nearestLane(near.x, near.y);
  const along = (near.x - lane.ax) * lane.dx + (near.y - lane.ay) * lane.dy;
  const k = Phaser.Math.Clamp((along - back) / lane.len, 0.03, 0.97);
  for (const c of w.cars) if (!c.story && c !== w.player.car && dist(c, { x: lane.ax + lane.dx * lane.len * k, y: lane.ay + lane.dy * lane.len * k }) < 120) c.destroy();
  const car = w.traffic.addOnLane(def, lane, k, color);
  car.story = true; car.cruise = cruise;
  s.cars.push(car);
  return car;
}

Object.assign(HOOKS, {
  // ----- M04 Thunder Road -----
  m04Setup(w, s) {
    const st = s.place('raceStart'), R = MAP.eastRing, rw = MAP.roadWidth;
    const N = R.north * TS + 32, S = (R.south + rw) * TS - 32, Wx = R.west * TS + 32, E = (R.east + rw) * TS - 32; // the clockwise lane of the east-bank ring
    for (const c of [...w.cars]) if (c !== w.player.car && dist(c, st) < 260) c.destroy(); // clear the start line
    const z = storyCar(w, VEHICLES.sports, st.x, N - 14, 0, 1); // the Zenki, in its new paint
    const k = storyCar(w, VEHICLES.bike, st.x, N + 16, 0, 0);
    k.driver = 'gang';
    s.cars.push(z, k); s.vars.zenki = z; s.vars.kenta = k;
    // one lap: corners and the middle of each side, then back to the start line
    s.vars.cps = [[E, N], [E, (N + S) / 2], [E, S], [(Wx + E) / 2, S], [Wx, S], [Wx, (N + S) / 2], [Wx, N], [st.x, N]].map(([x, y]) => ({ x, y }));
    s.vars.pi = 0; s.vars.ki = 0; s.vars.barkT = 6;
    for (const i of [1, 3, 5]) { const c = (s.vars.cps as { x: number; y: number }[])[i]; npc(w, s, 'raijin', c.x + (i === 3 ? 0 : i === 1 ? 110 : -110), c.y + (i === 3 ? 110 : 0)); }
  },
  m04Go(w, s) { w.player.putInCar(s.vars.zenki as Car); w.traffic.blockRing = true; },

  // ----- M05 Signal Lost -----
  m05Setup(w) { w.player.giveWeapon('kitsune9'); w.player.switchTo(w.player.weapons.findIndex((x) => x.def.id === 'kitsune9')); },
  m05Van(w, s) {
    const van = laneCar(w, s, VEHICLES.truck, 0, s.place('ambush'), 800, 120);
    s.vars.van = van; s.vars.stopT = 0;
    s.timer = { label: 'CAMERAS', value: T.vanCameraTime, max: T.vanCameraTime, kind: 'time' };
  },
  m05Guards(w, s) {
    const van = s.vars.van as Car;
    if (van.driver === 'traffic') van.driver = 'none';
    for (let i = 0; i < T.guardCount; i++) {
      const f = free(w, van.x + Math.cos(i * 2.1) * 34, van.y + Math.sin(i * 2.1) * 34);
      const g = w.gang.spawnThug(f.x, f.y, 'guard', 'chase');
      g.data.gun = true; g.data.bark = B.m05Guards[i % B.m05Guards.length];
    }
  },

  // ----- M06 Eviction Notice -----
  m06Setup(w, s) {
    s.vars.keepers = [1, 2, 3].map((i) => npc(w, s, 'shopkeeper', s.place('shop' + i).x, s.place('shop' + i).y));
    s.vars.shops = [0, 0, 0];
  },
  m06Start(w, s) { s.vars.wave = 0; spawnWave(w, s); },
  m06Ogata(w, s) {
    const car = laneCar(w, s, VEHICLES.sedan, WHITE_SEDAN, s.place('ramen'), -260, 250);
    car.panic = 9999; // he is not stopping for lights
    s.vars.ogata = car; s.vars.stopT = 0;
    s.timer = null; s.hint = '';
  },

  // ----- M07 Old Friends -----
  m07Start(w, s) {
    const here = s.place('canalLot'), yard = s.place('containerYard');
    const car = laneCar(w, s, VEHICLES.sedan, BLACK_SEDAN, here, 0, T.tailCruise);
    car.route = w.map.route(car.seg!, yard.x, yard.y).slice(1);
    s.vars.courier = car; s.vars.routeLen = car.route.length; s.vars.eye = 0;
    const mine = free(w, here.x + 40, here.y + 30); // a plain car to follow in
    const own = storyCar(w, VEHICLES.sedan, mine.x, mine.y, 0, 0); own.unlocked = true; s.cars.push(own);
    s.timer = { label: 'NOTICED', value: 0, max: 1, kind: 'bar' };
    w.fx.bark(car, B.m07Phone, '#ffd0a0');
  },

  // ----- M08 Evidence -----
  m08Setup(w, s) {
    const lot = s.place('warehouse').rect!, tr = s.place('truck');
    s.vars.guards = [0.3, 0.7].map((k) => { const g = w.police.spawnCopAt(free(w, lot.x + lot.w * k, lot.y + lot.h * 0.5), false); g.state = 'guard'; return g; });
    s.vars.fileP = { x: lot.x + 40, y: lot.y + 40 }; s.vars.tapeP = { x: lot.x + lot.w - 40, y: lot.y + lot.h - 40 };
    const truck = storyCar(w, VEHICLES.truck, tr.x, tr.y, 0, 1); truck.unlocked = true; // Goro's tow truck
    s.cars.push(truck);
  },
  m08FileMarker(_w, s) { const p = s.vars.fileP as { x: number; y: number }; s.marker = { x: p.x, y: p.y, r: 28 }; },
  m08File(w) { w.fx.bark(w.player.pos, B.m08JunFile, '#e8b923'); },
  m08TapeMarker(_w, s) { const p = s.vars.tapeP as { x: number; y: number }; s.marker = { x: p.x, y: p.y, r: 28 }; },
  m08Tape(w, s) {
    s.flags.tagDead = true; // the ankle tag is dead: the river no longer matters, but every cop is coming
    w.heat.crime('tagDead');
    B.m08Police.forEach((line, i) => w.time.delayedCall(2500 + i * 5000, () => w.police.barkAny(line)));
  },
  m08Swap(w, s) {
    const tr = s.place('truck'), f = free(w, tr.x + 20, tr.y + 46);
    const clean = storyCar(w, VEHICLES.sedan, f.x, f.y, 0, 2);
    s.cars.push(clean);
    w.player.putInCar(clean);
    s.flags.incognito = true; // a clean car: the police have to get much closer to recognise you
  },
} as Record<string, Hook>);

function spawnWave(w: WorldScene, s: Story): void {
  const home = s.place('ramen'), n = T.waves[s.vars.wave as number];
  for (let i = 0; i < n; i++) {
    let pos = w.map.randomWalkNear(home.x, home.y, 300, 520);
    for (let k = 0; k < 6 && pos && w.onScreen(pos.x, pos.y, 20); k++) pos = w.map.randomWalkNear(home.x, home.y, 300, 520);
    const f = pos ?? free(w, home.x + 300, home.y);
    const smash = i % 2 === 1;
    const t = w.gang.spawnThug(f.x, f.y, 'windbreaker', smash ? 'smash' : 'chase');
    if (smash) { const shop = s.place('shop' + ((i >> 1) % 3 + 1)); t.tx = shop.x; t.ty = shop.y; t.data.shop = (i >> 1) % 3; }
    if (i < 2) w.time.delayedCall(1500 + i * 2500, () => t.alive && w.fx.bark(t.sprite, B.m06Thugs[i], '#ff9a9a'));
  }
}

/** Mission 7: the courier's "have I seen that car before?" meter. `from` is who is looking. */
function tail(w: WorldScene, s: Story, from: { x: number; y: number }, dt: number): number {
  const p = w.player, d = dist(p.pos, from);
  const reach = p.car ? T.tailSeeDist : T.tailFootDist;
  const sees = d < reach && w.map.los(from.x, from.y, p.pos.x, p.pos.y);
  let eye = (s.vars.eye as number) + (sees ? (d < reach * 0.45 ? T.tailFillNear : T.tailFillFar) : -T.tailDrain) * dt;
  eye = Math.max(0, eye);
  if (eye > 0.5 && !s.flags.half) { s.flags.half = true; w.fx.bark(from, B.m07Half, '#ffd0a0'); }
  if (eye >= 1) { s.flags.spotted = true; s.vars.failHint = B.m07Card; }
  s.vars.eye = eye;
  if (s.timer) s.timer.value = eye;
  return d;
}
function m08Watch(w: WorldScene, s: Story): void {
  if (s.flags.alarm) return;
  for (const g of s.vars.guards as Actor[]) {
    if (g.alive && dist(g, w.player.pos) < T.guardSeeDist && w.map.los(g.x, g.y, w.player.pos.x, w.player.pos.y)) { s.flags.alarm = true; w.heat.crime('assault'); }
  }
}

Object.assign(CHECKS, {
  heatClear: (w) => w.heat.level === 0,

  // ----- M04 -----
  m04Race: (w, s, dt) => {
    const cps = s.vars.cps as { x: number; y: number }[], z = s.vars.zenki as Car, k = s.vars.kenta as Car;
    let pi = s.vars.pi as number, ki = s.vars.ki as number;
    const R = T.raceCheckpointRadius;
    if (w.player.car === z && dist(z, cps[pi]) < R) {
      pi++;
      for (const a of s.actors) if (dist(a, z) < 420) w.fx.bark(a.sprite, B.m04Bikers, '#d9a0ff', 'bikers', 2);
    }
    if (pi >= cps.length) return true;
    if (!k.wreck) {
      const t = cps[Math.min(ki, cps.length - 1)], corner = ki % 2 === 0 && ki < cps.length - 1;
      aiDrive(k, t.x, t.y, corner && dist(k, t) < 380 ? 175 : k.def.maxSpeed * T.raceKentaSpeed, dt);
      if (dist(k, t) < R) ki++;
      if (ki >= cps.length) s.flags.kentaWon = true;
    }
    if (z.wreck || z.removed) s.flags.kentaWon = true;
    // Kenta talks: a jab now and then, and a wail when he is overtaken
    const ahead = pi > ki || (pi === ki && dist(z, cps[pi]) < dist(k, cps[Math.min(ki, cps.length - 1)]));
    if (ahead && s.flags.wasBehind) w.fx.bark(k, B.m04Passed, '#d9a0ff');
    s.flags.wasBehind = !ahead;
    s.vars.barkT = (s.vars.barkT as number) - dt;
    if ((s.vars.barkT as number) <= 0) { s.vars.barkT = 9; w.fx.bark(k, B.m04Kenta[Math.floor(Math.random() * B.m04Kenta.length)], '#d9a0ff'); }
    s.vars.pi = pi; s.vars.ki = ki;
    s.marker = { x: cps[pi].x, y: cps[pi].y, r: 60 };
    s.timer = { label: `CHECKPOINT ${pi + 1}/${cps.length}`, value: 0, max: 1, kind: 'bar' };
    return false;
  },
  m04Lost: (_w, s) => !!s.flags.kentaWon,

  // ----- M05 -----
  m05Stopped: (w, s, dt) => {
    const van = s.vars.van as Car;
    s.marker = { x: van.x, y: van.y, r: 0 };
    if (van.driver !== 'traffic' || van.hp < van.def.hp * T.vanStopHp) return true;
    s.vars.stopT = van.speed < 12 && dist(van, w.player.pos) < 240 ? (s.vars.stopT as number) + dt : 0;
    return (s.vars.stopT as number) > 1.5;
  },
  m05GuardsDone: (w, s) => { const van = s.vars.van as Car; s.marker = { x: van.x, y: van.y, r: 0 }; return w.gang.activeThugs === 0; },
  m05Grab: (w, s) => {
    const van = s.vars.van as Car;
    s.marker = { x: van.x, y: van.y, r: 30 };
    if (w.player.car !== van && dist(w.player.pos, van) > 44) return false;
    s.flags.rack = true; s.timer = null;
    return true;
  },
  m05Failed: (_w, s, dt) => {
    const van = s.vars.van as Car | undefined;
    if (!van || s.flags.rack) return false;
    if (s.timer) s.timer.value -= dt;
    return van.wreck || van.removed || (!!s.timer && s.timer.value <= 0);
  },

  // ----- M06 -----
  m06Waves: (w, s) => {
    const shops = s.vars.shops as number[];
    for (const t of w.gang.thugs) if (t.data.hit) { shops[t.data.shop as number] += t.data.hit as number; t.data.hit = 0; }
    const wrecked = shops.filter((h) => h >= T.shopHits).length;
    s.timer = { label: `SHOPS WRECKED ${wrecked}/3`, value: Math.max(...shops), max: T.shopHits, kind: 'bar' };
    s.hint = `Wave ${(s.vars.wave as number) + 1} of ${T.waves.length}`;
    if (Math.random() < 0.004) { const k = (s.vars.keepers as Actor[])[Math.floor(Math.random() * 3)]; w.fx.bark(k.sprite, B.m06Shops[Math.floor(Math.random() * B.m06Shops.length)], '#ffe9c0', 'keeper', 5); }
    if (w.gang.activeThugs > 0) return false;
    s.vars.wave = (s.vars.wave as number) + 1;
    if ((s.vars.wave as number) >= T.waves.length) return true;
    spawnWave(w, s);
    return false;
  },
  m06ShopsLost: (_w, s) => !!s.vars.shops && (s.vars.shops as number[]).filter((h) => h >= T.shopHits).length >= 3,
  m06Stopped: (w, s, dt) => {
    const car = s.vars.ogata as Car;
    s.marker = { x: car.x, y: car.y, r: 0 };
    s.vars.stopT = car.speed < 15 && dist(car, w.player.pos) < 170 ? (s.vars.stopT as number) + dt : 0;
    if (!(car.wreck || car.driver !== 'traffic' || car.hp < car.def.hp * T.ogataStopHp || (s.vars.stopT as number) > 1.5)) return false;
    if (car.driver === 'traffic') car.driver = 'none';
    return true;
  },

  // ----- M07 -----
  m07Moving: (w, s, dt) => {
    const c = s.vars.courier as Car, d = tail(w, s, c, dt);
    c.cruise = d > 700 ? 45 : T.tailCruise; // he dawdles if you fall far behind
    s.marker = { x: c.x, y: c.y, r: 0 };
    return c.route.length <= (s.vars.routeLen as number) - 2 || dist(c, s.place('containerYard')) < 320;
  },
  m07Arrived: (w, s, dt) => {
    const c = s.vars.courier as Car, yard = s.place('containerYard'), d = tail(w, s, c, dt);
    c.cruise = d > 700 ? 45 : T.tailCruise;
    s.marker = { x: c.x, y: c.y, r: 0 };
    if (dist(c, yard) > 320 && !(c.route.length === 0 && !c.crossing && dist(c, { x: c.seg!.bx, y: c.seg!.by }) < 200)) return false;
    c.driver = 'none'; // he parks and walks into the yard to meet Sasaki
    s.vars.man = npc(w, s, 'courier', yard.x - 12, yard.y);
    s.vars.sasaki = npc(w, s, 'thug', yard.x + 14, yard.y + 6);
    s.vars.listenT = 0; s.vars.said = 0;
    return true;
  },
  m07Listen: (w, s, dt) => {
    const man = s.vars.man as Actor;
    tail(w, s, man, dt);
    if (!near(w, s)) return false;
    s.vars.listenT = (s.vars.listenT as number) + dt;
    const i = Math.floor((s.vars.listenT as number) / T.listenTime);
    if (i >= B.m07Overheard.length) return true;
    if (i >= (s.vars.said as number)) {
      s.vars.said = i + 1;
      const [who, line] = B.m07Overheard[i];
      w.fx.bark((who === 'SASAKI' ? (s.vars.sasaki as Actor) : man).sprite, line, '#ffd0a0');
    }
    return false;
  },
  m07Leave: (w, s, dt) => tail(w, s, s.vars.man as Actor, dt) > 460,
  m07Spotted: (_w, s) => !!s.flags.spotted,

  // ----- M08 -----
  m08Inside: (w, s) => { m08Watch(w, s); return near(w, s); },
  m08AtPoint: (w, s) => { m08Watch(w, s); return near(w, s); },
  m08Out: (w, s) => { const l = s.place('warehouse').rect!; return dist(w.player.pos, { x: l.x + l.w / 2, y: l.y + l.h / 2 }) > Math.max(l.w, l.h) / 2 + 140; },
} as Record<string, Check>);
