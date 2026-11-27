import { HOOKS, CHECKS, free, npc, near, storyCar, laneCar, aiDrive, dist, goInside } from './missionHooks';
import type { Hook, Check } from './missionHooks';
import { SIDE_BARKS as B, SIDE_TUNING as T, SIDE_LABELS as L, DAIGO_ZOKUSHA, SIDE_LIGHT } from '../data/missions_side';
import { VEHICLES, BLACK_SEDAN } from '../data/vehicles';
import { MAP } from '../data/map';
import { TILE_SIZE as TS } from '../data/config';
import type { Actor } from '../entities/Actor';
import type { Car } from '../entities/Car';
import type { WorldScene } from '../scenes/WorldScene';
import type { Story } from './Story';
import type { Rect } from './CityMap';

// The game logic for the twelve side stories (text and numbers: src/data/missions_side.ts).
// Hook names start with the mission: sr1… (Daigo's Road), sg… (Building 41), sk… (Old Debts),
// su… (Sea Spirit); "side…" hooks are shared.

type P = { x: number; y: number };
const GOLD = '#e8b923', RED = '#ff9a9a', WARM = '#ffe9c0', BLUE = '#9cc0ff', PURPLE = '#d9a0ff', TAN = '#ffd0a0';
/** A speech bubble holds this many characters (Fx.bark cuts the rest off). */
const BUBBLE = 60;

const V = <X>(s: Story, k: string): X => s.vars[k] as X;
const spot = (r: Rect, kx: number, ky: number): P => ({ x: r.x + r.w * kx, y: r.y + r.h * ky });
const onFootAt = (w: WorldScene, s: Story): boolean => !w.player.car && near(w, s);
/** Is Jun inside this room? */
const inRoom = (w: WorldScene, id: string): boolean => w.map.interiorAt(w.player.pos.x, w.player.pos.y)?.id === id;
const call = (s: Story, from: string, text: string): void => { s.phone.push({ from, text, t: 3.2 }); };
const gone = (c: Car | undefined): boolean => !!c && (c.wreck || c.removed);
/** An AI car stops where it is and stays there. */
const hold = (c: Car): void => { c.input.throttle = 0; c.input.steer = 0; c.input.brake = true; };
const park = (c: Car): void => { c.driver = 'none'; c.roadblock = false; c.input.throttle = 0; c.input.steer = 0; };

/** Runs a little later, unless the mission has ended or restarted in the meantime. */
function later(w: WorldScene, s: Story, ms: number, fn: () => void): void {
  const run = s.vars;
  w.time.delayedCall(ms, () => { if (s.active && s.vars === run) fn(); });
}
/** A speech bubble. A line too long for one bubble carries on in a second one. */
function say(w: WorldScene, s: Story, who: P, text: string, colour: string): void {
  if (text.length <= BUBBLE) { w.fx.bark(who, text, colour); return; }
  const cut = text.lastIndexOf(' ', BUBBLE);
  w.fx.bark(who, text.slice(0, cut), colour);
  later(w, s, 1900, () => w.fx.bark(who, text.slice(cut + 1), colour));
}
/** A plain unlocked car for Jun to use. */
function ownCar(w: WorldScene, s: Story, def: (typeof VEHICLES)[string], at: P, color: number, heading = 0): Car {
  const c = storyCar(w, def, at.x, at.y, heading, color);
  c.unlocked = true; s.cars.push(c);
  return c;
}
/** The "have I been noticed?" meter (as mission 7): fills while `from` can see Jun. Returns the distance. */
function watch(w: WorldScene, s: Story, from: P, dt: number): number {
  const p = w.player, d = dist(p.pos, from), t = T.tail, reach = p.car ? t.seeDist : t.footDist;
  const sees = d < reach && w.map.los(from.x, from.y, p.pos.x, p.pos.y);
  const eye = Math.max(0, V<number>(s, 'eye') + (sees ? (d < reach * 0.45 ? t.fillNear : t.fillFar) : -t.drain) * dt);
  if (eye >= 1) s.flags.spotted = true;
  s.vars.eye = eye;
  if (s.timer) s.timer.value = eye;
  return d;
}
/** Gang cars that arrive on the nearest stretches of road that are out of view, and chase Jun. */
function chasersNear(w: WorldScene, n: number, color: number, bark: string): void {
  const p = w.player.pos;
  const lanes = [...w.map.lanes].sort((a, b) => Math.hypot(a.ax - p.x, a.ay - p.y) - Math.hypot(b.ax - p.x, b.ay - p.y));
  let made = 0;
  for (const l of lanes) {
    if (made >= n) break;
    const x = l.ax + l.dx * 60, y = l.ay + l.dy * 60;
    if (w.onScreen(x, y, 60) || w.cars.some((c) => Math.hypot(c.x - x, c.y - y) < 90)) continue;
    const c = w.gang.spawnChaser(VEHICLES.sedan, x, y, Math.atan2(l.dy, l.dx), color);
    if (bark && !made) c.data_bark = bark;
    made++;
  }
}
/** True once the chasing cars are wrecked or have been left behind for a few seconds. */
function shookOff(w: WorldScene, s: Story, dt: number): boolean {
  const live = w.gang.activeChasers, p = w.player.pos;
  const close = live.some((c) => dist(c, p) < T.lose.dist);
  s.vars.loseT = close ? 0 : ((s.vars.loseT as number) || 0) + dt;
  if (live.length && (s.vars.loseT as number) < T.lose.time) return false;
  for (const c of live) c.destroy();
  return true;
}
/** Guards who are standing about notice Jun from further away than their usual few steps. */
function wake(w: WorldScene, range: number): void {
  const p = w.player.pos;
  for (const g of w.gang.thugs) if (g.alive && g.state === 'guard' && dist(g, p) < range && w.map.los(g.x, g.y, p.x, p.y)) g.state = 'chase';
}
const fire = (w: WorldScene, at: P): void => {
  if (Math.random() < 0.5) w.fx.puff(at.x + (Math.random() - 0.5) * 16, at.y, Math.random() < 0.5 ? 0xff7a1a : 0xffc233, 10, 0.4, (Math.random() - 0.5) * 30, -24, 1.2);
  if (Math.random() < 0.15) w.fx.puff(at.x, at.y - 6, 0x222222, 9, 0.9, (Math.random() - 0.5) * 20, -40, 1.8);
};

Object.assign(HOOKS, {
  /** The mission's cars go home (everything except the one Jun is sitting in). */
  sideTidy(w, s) {
    for (const c of s.cars) if (!c.removed && c !== w.player.car) c.destroy();
    s.cars = s.cars.filter((c) => !c.removed);
  },
} as Record<string, Hook>);
Object.assign(CHECKS, {
  sideOnFoot: (w, s) => onFootAt(w, s),
} as Record<string, Check>);

// =====================================================================================
// S-R1 Borrowed Thunder: three chop shops, a part in each, workers who object
// =====================================================================================

function shopAlarm(w: WorldScene, s: Story, shop: number, line: string): void {
  const crew = w.gang.thugs.filter((t) => t.alive && t.data.shop === shop);
  for (const t of crew) if (t.state === 'guard') t.state = 'chase';
  const worker = crew.find((t) => t !== s.vars.bones);
  if (line && worker) say(w, s, worker.sprite, line, RED);
}

Object.assign(HOOKS, {
  sr1Setup(w, s) {
    // each chop shop is a room: the part is at its spot 1, the workers at spots 2 and 3
    ['chopCanal', 'chopRail', 'bonesGarage'].forEach((room, i) => {
      for (let k = 0; k < T.sr1.workers; k++) {
        const q = s.place(`${room}:${2 + (k % 2)}`), f = free(w, q.x + 24 * (k >> 1), q.y);
        w.gang.spawnThug(f.x, f.y, 'builder', 'guard').data.shop = i;
      }
    });
    const q = s.place('bonesGarage:4');
    const bones = w.gang.spawnThug(q.x, q.y, 'courier', 'guard', T.sr1.bonesHp); // Bones Tamura himself
    bones.data.shop = 2; s.vars.bones = bones;
    // the scenes with Kenta play inside the clubhouse
    const k = s.place('raijinClub:1'); npc(w, s, 'kenta', k.x, k.y);
    goInside(w, s, 'raijinClub', '2', 'raijinClubhouse');
    s.flags.doorsOpen = true;
  },
  sr1Engine(w, s) { shopAlarm(w, s, 0, B.sr1Worker[0]); },
  sr1Frame(w, s) { shopAlarm(w, s, 1, B.sr1Worker[1]); },
  sr1Tank(w, s) {
    shopAlarm(w, s, 2, '');
    const bones = V<Actor>(s, 'bones');
    if (bones.alive) say(w, s, bones.sprite, B.sr1Bones, RED);
    later(w, s, 1900, () => say(w, s, w.player.pos, B.sr1Jun, GOLD));
  },
} as Record<string, Hook>);

// =====================================================================================
// S-R2 Ghost Lap: thirty riders follow Jun's car round the whole K-Route
// =====================================================================================

interface Rider { car: Car; back: number }
interface Hunter { car: Car; live: boolean; took: number; cool: number; aim: number; said: boolean; age: number; cp: number }

/** One clockwise lap of the whole K-Route (both banks, over the two river bridges), as checkpoints. */
function ringLap(startX: number): P[] {
  const X = MAP.vRoads, Y = MAP.hRoads, rw = MAP.roadWidth, R = MAP.river;
  const N = Y[0] * TS + 32, S = (Y[4] + rw) * TS - 32, W = X[0] * TS + 32, E = (X[X.length - 1] + rw) * TS - 32;
  const bE = (R.x + R.w + 8) * TS, bW = (R.x - 8) * TS; // either end of the river bridges
  return [[E, N], [E, (N + S) / 2], [E, S], [(E + bE) / 2, S], [bE, S], [bW, S], [(bW + W) / 2, S], [W, S], [W, (N + S) / 2], [W, N], [(bW + W) / 2, N], [bW, N], [bE, N], [startX, N]].map(([x, y]) => ({ x, y }));
}
/** Lays a straight trail behind a point, for the pack to form up on. */
function seedTrail(trail: P[], at: P, dir: P): void {
  trail.length = 0;
  for (let d = T.sr2.trailLen; d > 0; d -= 24) trail.push({ x: at.x - dir.x * d, y: at.y - dir.y * d });
}
/** The point `back` px behind the leader along the trail he left, and which way the trail runs there. */
function trailAt(trail: P[], head: P, back: number): { x: number; y: number; dx: number; dy: number } {
  let ax = head.x, ay = head.y, left = back;
  for (let i = trail.length - 1; i >= 0; i--) {
    const b = trail[i], seg = Math.hypot(ax - b.x, ay - b.y);
    if (seg > 0.01 && seg >= left) { const k = left / seg; return { x: ax + (b.x - ax) * k, y: ay + (b.y - ay) * k, dx: (ax - b.x) / seg, dy: (ay - b.y) / seg }; }
    left -= seg; ax = b.x; ay = b.y;
  }
  const b = trail[0], c = trail[1] ?? head, l = Math.hypot(c.x - b.x, c.y - b.y) || 1;
  return { x: b.x, y: b.y, dx: (c.x - b.x) / l, dy: (c.y - b.y) / l };
}
function dropRider(w: WorldScene, s: Story, i: number, hit: boolean): void {
  const pack = V<Rider[]>(s, 'pack'), c = pack.splice(i, 1)[0].car;
  if (!c.removed) c.driver = 'none';
  if (!hit) return;
  w.fx.spark(c.x, c.y);
  w.fx.puff(c.x, c.y, 0x9a9a9a, 14, 0.6, 0, -20, 1.6);
  const other = pack[Math.min(pack.length - 1, i)];
  if (other) w.fx.bark(other.car, B.sr2Riders[1], PURPLE, 'ridersDown', 2);
}
/** Police cars that drive at the pack from the next checkpoint. */
function sendPolice(w: WorldScene, s: Story, n: number): void {
  const cps = V<P[]>(s, 'cps'), pi = Math.min(V<number>(s, 'pi'), cps.length - 1), at = cps[pi], lead = w.player.pos;
  const d = dist(at, lead) || 1, dx = (at.x - lead.x) / d, dy = (at.y - lead.y) / d;
  for (let j = 0; j < n; j++) {
    const x = at.x + dx * 70 * j - dy * T.sr2.flank, y = at.y + dy * 70 * j + dx * T.sr2.flank; // in the oncoming lane (the inside of the ring)
    for (const c of w.cars) if (!c.story && c !== w.player.car && Math.hypot(c.x - x, c.y - y) < 90) c.destroy();
    const c = w.addCar(VEHICLES.police, x, y, Math.atan2(-dy, -dx), true);
    c.story = true; c.driver = 'gang'; c.roadblock = true; // 'gang': ramming it is no crime, and the Heat system leaves it alone; `roadblock` keeps its lights flashing
    s.cars.push(c);
    V<Hunter[]>(s, 'cops').push({ car: c, live: true, took: 0, cool: 0, aim: 2 + Math.floor(Math.random() * 10), said: j > 0, age: 0, cp: pi - 1 });
  }
}
/** One frame of the memorial ride. Returns how many checkpoints Jun has passed. */
function packTick(w: WorldScene, s: Story, dt: number): number {
  const t = T.sr2, lead = w.player.pos, trail = V<P[]>(s, 'trail'), pack = V<Rider[]>(s, 'pack'), cps = V<P[]>(s, 'cps'), was = V<P>(s, 'leadAt');
  let moved = dist(lead, was);
  if (moved > t.jump) { // Jun was put somewhere else (a respawn): the pack forms up behind him again
    seedTrail(trail, lead, { x: (lead.x - was.x) / moved, y: (lead.y - was.y) / moved });
    pack.forEach((r, i) => { r.back = t.gap + (i >> 1) * t.rowGap; });
    moved = 0;
  } else if (dist(lead, trail[trail.length - 1]) >= 24) {
    trail.push({ x: lead.x, y: lead.y });
    if (trail.length > t.trailLen / 24 + 8) trail.shift();
  }
  s.vars.leadAt = { x: lead.x, y: lead.y };

  // the riders: two columns that follow exactly where Jun drove
  for (let i = pack.length - 1; i >= 0; i--) {
    const r = pack[i], c = r.car, want = t.gap + (i >> 1) * t.rowGap, before = r.back;
    if (c.removed || c.wreck) { dropRider(w, s, i, false); continue; }
    r.back = Math.max(want, r.back + moved - t.riderSpeed * dt);
    if (r.back - want > t.loseDist) { dropRider(w, s, i, false); continue; } // Jun left him behind
    const q = trailAt(trail, lead, r.back), side = i % 2 ? t.colGap : -t.colGap, v = dt > 0 ? Math.max(0, (moved - (r.back - before)) / dt) : 0;
    c.x = q.x - q.dy * side; c.y = q.y + q.dx * side; c.heading = Math.atan2(q.dy, q.dx); c.vx = q.dx * v; c.vy = q.dy * v;
    c.hp = c.maxHp; c.burning = false; // riders only leave the pack by the rules above and below
  }

  // the police: each car heads for a rider and knocks down a couple, unless Jun gets in its way
  const pc = w.player.car;
  for (const k of V<Hunter[]>(s, 'cops')) {
    const c = k.car;
    if (!k.live) continue;
    if (c.removed || c.wreck) { k.live = false; continue; }
    // Jun stops it by getting in front of it: his car ahead of the police car, in its lane
    const hx = Math.cos(c.heading), hy = Math.sin(c.heading), ahead = pc ? (pc.x - c.x) * hx + (pc.y - c.y) * hy : -1, across = pc ? Math.abs(-(pc.x - c.x) * hy + (pc.y - c.y) * hx) : 0;
    k.age += dt;
    if ((ahead > -20 && ahead < t.blockAhead && across < t.blockSide) || c.hp < c.def.hp * t.copStopHp || k.age > t.copLife) { k.live = false; park(c); c.vx = c.vy = 0; continue; }
    const target = pack[Math.min(pack.length - 1, k.aim)];
    if (!target) continue;
    // it comes up the oncoming lane beside the column, then cuts in at the rider it has picked
    const th = target.car.heading, off = dist(c, target.car) > t.cutIn ? t.flank : 0;
    if (w.map.los(c.x, c.y, target.car.x, target.car.y)) aiDrive(c, target.car.x - Math.sin(th) * off, target.car.y + Math.cos(th) * off, t.copSpeed, dt);
    else { // the pack is still round the corner: follow the ring back toward it
      const via = cps[Math.max(0, k.cp)];
      aiDrive(c, via.x, via.y, t.copSpeed, dt);
      if (k.cp > 0 && dist(c, via) < 140) k.cp--;
    }
    if (!k.said && dist(c, lead) < 460) { k.said = true; say(w, s, c, B.sr2Police, BLUE); }
    k.cool -= dt;
    if (k.cool > 0) continue;
    const i = pack.findIndex((r) => dist(r.car, c) < t.hitDist);
    if (i < 0) continue;
    dropRider(w, s, i, true);
    k.cool = t.copCooldown;
    if (++k.took >= t.copTakes) { k.live = false; park(c); }
  }

  // the lap
  let pi = V<number>(s, 'pi');
  if (pi < cps.length && dist(lead, cps[pi]) < t.checkpointRadius) {
    s.vars.pi = ++pi;
    const wave = t.waves.find(([at]) => at === pi);
    if (wave && pi < cps.length) sendPolice(w, s, wave[1]);
  }
  if (pi < cps.length) s.marker = { x: cps[pi].x, y: cps[pi].y, r: 60 };
  s.timer = { label: `${L.riders} ${pack.length}/${t.riders}`, value: t.riders - pack.length, max: t.riders - t.ridersMin + 1, kind: 'bar' };
  s.vars.cheerT = V<number>(s, 'cheerT') - dt;
  if (V<number>(s, 'cheerT') <= 0 && pack.length) { s.vars.cheerT = t.cheerEvery; w.fx.bark(pack[Math.floor(Math.random() * Math.min(8, pack.length))].car, B.sr2Riders[0], PURPLE); }
  return pi;
}

Object.assign(HOOKS, {
  sr2Setup(w, s) {
    const st = s.place('raceStart'), cps = ringLap(st.x), N = cps[0].y, t = T.sr2;
    for (const c of [...w.cars]) if (c !== w.player.car && Math.abs(c.y - N) < 220 && c.x > st.x - 1100 && c.x < st.x + 400) c.destroy(); // clear the on-ramp
    const lead = ownCar(w, s, VEHICLES.sports, { x: st.x, y: N }, 1);
    lead.maxHp = lead.hp = t.leadHp;
    const pack: Rider[] = [];
    for (let i = 0; i < t.riders; i++) {
      const back = t.gap + (i >> 1) * t.rowGap;
      const c = storyCar(w, VEHICLES.bike, st.x - back, N + (i % 2 ? t.colGap : -t.colGap), 0, 0);
      c.driver = 'gang'; s.cars.push(c);
      pack.push({ car: c, back });
    }
    const trail: P[] = [];
    seedTrail(trail, { x: st.x, y: N }, { x: 1, y: 0 });
    Object.assign(s.vars, { lead, pack, cps, trail, pi: 0, cops: [], cheerT: 3, leadAt: { x: st.x, y: N } });
  },
  sr2Go(w, s) { w.player.putInCar(V<Car>(s, 'lead')); w.traffic.blockRing = true; },
  /** The roadblock: police cars parked side by side across the bridge deck. */
  sr2Roadblock(w, s) {
    const R = MAP.river, n = T.sr2.roadblockCars, x = (R.x + R.w / 2) * TS, top = (MAP.hRoads[4] - 1) * TS, deck = (MAP.roadWidth + 2) * TS;
    for (const c of w.cars) if (!c.story && c !== w.player.car && Math.abs(c.x - x) < 200 && c.y > top && c.y < top + deck) c.destroy();
    for (let j = 0; j < n; j++) {
      const c = w.addCar(VEHICLES.police, x, top + (deck * (j + 0.5)) / n, Math.PI / 2, true);
      c.story = true; c.driver = 'gang'; c.roadblock = true; hold(c);
      s.cars.push(c);
    }
  },
} as Record<string, Hook>);

Object.assign(CHECKS, {
  sr2Lead: (w, s, dt) => packTick(w, s, dt) >= T.sr2.phaseLead,
  sr2Keep: (w, s, dt) => packTick(w, s, dt) >= T.sr2.phaseKeep,
  sr2Break: (w, s, dt) => packTick(w, s, dt) >= T.sr2.phaseRoadblock,
  sr2Finish: (w, s, dt) => packTick(w, s, dt) >= V<P[]>(s, 'cps').length,
  sr2PackLost: (_w, s) => { const pack = s.vars.pack as Rider[] | undefined; return !!pack && pack.length < T.sr2.ridersMin; },
} as Record<string, Check>);

// =====================================================================================
// S-R3 Last Run: Kenta rides the east-bank ring against the clock; Jun clears his lane
// =====================================================================================

interface Block { car: Car | null; police: boolean; seg: number; k: number; line: P; home: P; from: P; state: 'wait' | 'coming' | 'on' | 'clearing' | 'clear'; t: number }

/** One clockwise lap of the east-bank ring (the mission 4 circuit). */
function eastLap(startX: number): P[] {
  const R = MAP.eastRing, rw = MAP.roadWidth;
  const N = R.north * TS + 32, S = (R.south + rw) * TS - 32, W = R.west * TS + 32, E = (R.east + rw) * TS - 32;
  return [[E, N], [E, (N + S) / 2], [E, S], [(W + E) / 2, S], [W, S], [W, (N + S) / 2], [W, N], [startX, N]].map(([x, y]) => ({ x, y }));
}
/** A point part-way along one leg of the lap, and the direction of travel there. */
function legPoint(cps: P[], start: P, seg: number, k: number): { p: P; dir: P } {
  const a = seg ? cps[seg - 1] : start, b = cps[seg], l = dist(a, b) || 1;
  return { p: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, dir: { x: (b.x - a.x) / l, y: (b.y - a.y) / l } };
}
/** Which leg of the lap a point on the racing line is on, and how far along. */
function locate(cps: P[], start: P, p: P): { seg: number; k: number } {
  for (let i = 0; i < cps.length; i++) {
    const a = i ? cps[i - 1] : start, b = cps[i], l = dist(a, b);
    if (Math.abs(dist(a, p) + dist(p, b) - l) < 2) return { seg: i, k: dist(a, p) / (l || 1) };
  }
  return { seg: 0, k: 0 };
}
/** One frame of the record attempt. Returns how many checkpoints Kenta has passed. */
function lastRun(w: WorldScene, s: Story, dt: number): number {
  const t = T.sr3, cps = V<P[]>(s, 'cps'), k = V<Car>(s, 'kenta'), start = V<P>(s, 'start'), pc = w.player.car;
  let ki = V<number>(s, 'ki');
  if (ki >= cps.length) return ki;
  const clock = V<number>(s, 'clock') + dt * t.clockScale;
  s.vars.clock = clock;
  const a = ki ? cps[ki - 1] : start, b = cps[ki], frac = 1 - dist(k, b) / (dist(a, b) || 1);
  const passed = (o: Block) => ki > o.seg || (ki === o.seg && frac > o.k + 0.02);

  // traffic and police: they move over when Jun's car reaches them
  let next: Block | null = null;
  for (const o of V<Block[]>(s, 'obs')) {
    if (o.state === 'wait' && !passed(o) && dist(k, o.line) < t.policeTrigger) { // a patrol car comes down the on-ramp
      const c = w.addCar(VEHICLES.police, o.from.x, o.from.y, Math.atan2(o.line.y - o.from.y, o.line.x - o.from.x), true);
      c.story = true; c.driver = 'gang'; c.roadblock = true;
      s.cars.push(c); o.car = c; o.state = 'coming';
    }
    const c = o.car;
    if (c && !c.removed && !c.wreck) {
      if (o.state === 'coming') {
        aiDrive(c, o.line.x, o.line.y, t.policeSpeed, dt);
        if (dist(c, o.line) < 30) { o.state = 'on'; hold(c); }
        if (w.onScreen(c.x, c.y, 0)) w.fx.bark(c, B.sr3Police, BLUE, 'sr3police', 8);
      }
      if ((o.state === 'coming' || o.state === 'on') && pc && dist(pc, c) < t.clearDist) {
        if (dist(c, o.line) > 70) { o.state = 'clear'; park(c); } else { o.state = 'clearing'; o.t = 3; }
      }
      if (o.state === 'clearing') {
        aiDrive(c, o.home.x, o.home.y, 150, dt);
        o.t -= dt;
        if (o.t <= 0 || dist(c, o.home) < 26) { o.state = 'clear'; park(c); }
      }
    }
    if (!next && !passed(o) && (o.state === 'wait' || o.state === 'coming' || o.state === 'on')) next = o;
  }
  const mk = next ? (next.car && !next.car.removed ? next.car : next.line) : b;
  s.marker = { x: mk.x, y: mk.y, r: 40 };

  // Kenta: flat out along the racing line, slowing and swerving for anything in his lane
  const corner = ki % 2 === 0 && ki < cps.length - 1;
  // he holds the racing line: aims at a point a little further along this leg, not straight at the far checkpoint
  const leg = dist(a, b) || 1, ux = (b.x - a.x) / leg, uy = (b.y - a.y) / leg, on = Math.max(0, Math.min(leg, (k.x - a.x) * ux + (k.y - a.y) * uy + t.lineAhead));
  let want = corner && dist(k, b) < 380 ? t.cornerSpeed : t.kentaSpeed, tx = a.x + ux * on, ty = a.y + uy * on;
  const fx = Math.cos(k.heading), fy = Math.sin(k.heading);
  const rel = (c: Car) => ({ f: (c.x - k.x) * fx + (c.y - k.y) * fy, side: -(c.x - k.x) * fy + (c.y - k.y) * fx });
  let blocker = s.vars.blocker as Car | undefined;
  if (blocker) { const q = rel(blocker); if (blocker.removed || q.f < -30 || q.f > t.lookAhead + 60 || Math.abs(q.side) > 110) blocker = undefined; } // he is past it
  if (!blocker) blocker = w.cars.find((c) => { if (c === k || c.removed) return false; const q = rel(c); return q.f > 0 && q.f <= t.lookAhead && Math.abs(q.side) <= t.laneHalf; });
  s.vars.blocker = blocker;
  if (blocker) { // something is in his lane: he brakes hard and squeezes past it on the inside
    want = t.blockedSpeed; tx -= uy * t.dodge; ty += ux * t.dodge;
    if (blocker === pc && rel(blocker).f < t.taillights && !s.flags.taillights) { s.flags.taillights = true; call(s, 'KENTA', B.sr3Taillights); }
  }
  aiDrive(k, tx, ty, want, dt);
  if (dist(k, b) < t.checkpointRadius) s.vars.ki = ++ki;
  if (ki >= cps.length) { s.flags.lapDone = true; park(k); }

  const m = Math.floor(clock / 60), sec = Math.floor(clock % 60);
  s.timer = { label: L.lap(`${m}:${sec < 10 ? '0' : ''}${sec}`), value: clock, max: t.record, kind: 'bar' };
  return ki;
}

Object.assign(HOOKS, {
  sr3Setup(w, s) {
    w.setAmbience(SIDE_LIGHT.dawn);
    goInside(w, s, 'raijinClub', '2', 'raijinClubhouse'); // the opening scene is in the clubhouse; the run starts from the on-ramp
    const st = s.place('raceStart'), cps = eastLap(st.x), start = { x: st.x, y: cps[0].y }, t = T.sr3;
    for (const c of [...w.cars]) if (c !== w.player.car && dist(c, st) < 300) c.destroy(); // clear the start line
    const car = ownCar(w, s, VEHICLES.sports, { x: start.x + 120, y: start.y }, 1);
    const kenta = storyCar(w, DAIGO_ZOKUSHA, start.x - 30, start.y, 0, 0); // Daigo's bike, rebuilt
    kenta.driver = 'gang'; s.cars.push(kenta);
    const obs: Block[] = [];
    const add = (police: boolean, line: P, from: P): void => {
      const { seg, k } = locate(cps, start, line), dir = legPoint(cps, start, seg, k).dir;
      // cleared cars pull over toward the inside of the ring, a little further on
      const home = { x: line.x - dir.y * t.pullOver + dir.x * 120, y: line.y + dir.x * t.pullOver + dir.y * 120 };
      obs.push({ car: null, police, seg, k, line, home, from, state: police ? 'wait' : 'on', t: 0 });
    };
    for (const [seg, k, def] of t.traffic) {
      const { p, dir } = legPoint(cps, start, seg, k);
      add(false, p, p);
      const c = storyCar(w, VEHICLES[def], p.x, p.y, Math.atan2(dir.y, dir.x), 0);
      c.driver = 'gang'; hold(c); s.cars.push(c);
      obs[obs.length - 1].car = c;
    }
    const N = cps[0].y, S = cps[2].y, W = cps[4].x;
    for (const [side, i] of t.police) {
      const x = MAP.vRoads[i] * TS + 64, y = MAP.hRoads[i] * TS + 64;
      if (side === 'S') add(true, { x, y: S }, { x, y: S - t.rampDist });
      else if (side === 'N') add(true, { x, y: N }, { x, y: N + t.rampDist });
      else add(true, { x: W, y }, { x: W + t.rampDist, y });
    }
    obs.sort((p, q) => p.seg - q.seg || p.k - q.k);
    Object.assign(s.vars, { car, kenta, cps, start, obs, ki: 0, clock: 0 });
  },
  sr3Go(w, s) { w.player.putInCar(V<Car>(s, 'car')); w.traffic.blockRing = true; s.flags.running = true; },
  /** "He'd want you to have it": Daigo's Zokusha is left beside Jun, unlocked, and stays in the world. */
  sr3Reward(w, s) {
    const k = V<Car>(s, 'kenta'), p = w.player.pos;
    for (const c of s.cars) if (!c.removed && c !== w.player.car && c !== k) c.destroy();
    s.cars = s.cars.filter((c) => !c.removed);
    if (k.removed) return;
    const f = free(w, p.x + 44, p.y + 36);
    park(k); k.unlocked = true; k.hp = k.maxHp; k.burning = false; k.vx = k.vy = 0; k.x = f.x; k.y = f.y;
  },
} as Record<string, Hook>);

Object.assign(CHECKS, {
  sr3Ahead: (w, s, dt) => lastRun(w, s, dt) >= T.sr3.phaseAhead,
  sr3Traffic: (w, s, dt) => lastRun(w, s, dt) >= T.sr3.phaseTraffic,
  sr3Police: (w, s, dt) => lastRun(w, s, dt) >= T.sr3.phasePolice,
  sr3Finish: (w, s, dt) => lastRun(w, s, dt) >= V<P[]>(s, 'cps').length,
  /** Kenta crashes, or the clock passes 4:02. */
  sr3Failed: (_w, s) => {
    const k = s.vars.kenta as Car | undefined;
    if (!k || !s.flags.running || s.flags.lapDone) return false;
    return k.wreck || k.removed || k.burning || k.hp < k.def.hp * T.sr3.crashHp || V<number>(s, 'clock') > T.sr3.record;
  },
} as Record<string, Check>);

// =====================================================================================
// S-G1 Dead Pixels: fix four cameras, then tail the white van
// =====================================================================================

Object.assign(HOOKS, {
  sg1Setup(w, s) {
    s.vars.cams = ['sgCam1', 'sgCam2', 'sgCam3', 'sgCam4'].map((id) => s.place(id)); s.vars.fixed = 0; s.vars.eye = 0;
    goInside(w, s, 'capsule', '1', 'hideout'); // the opening scene is inside the Glitch hideout
  },
  sg1Van(w, s) {
    const van = laneCar(w, s, VEHICLES.truck, 0, s.place('sgVan'), 0, T.tail.cruise);
    van.driver = 'none'; van.vx = van.vy = 0; // parked with the engine running until Jun finds it
    s.vars.van = van;
    s.marker = { x: van.x, y: van.y, r: 0 };
  },
  sg1Tail(w, s) {
    const van = V<Car>(s, 'van'), yard = s.place('sgKurodaYard');
    van.seg ??= w.map.nearestLane(van.x, van.y);
    van.driver = 'traffic';
    van.route = w.map.route(van.seg, yard.x, yard.y).slice(1);
    s.timer = { label: L.noticed, value: 0, max: 1, kind: 'bar' };
  },
} as Record<string, Hook>);

Object.assign(CHECKS, {
  sg1Fix: (w, s) => {
    const cams = V<P[]>(s, 'cams'), text = (s.vars.objText ??= s.objective) as string;
    let n = V<number>(s, 'fixed');
    const c = cams[Math.min(n, cams.length - 1)];
    s.marker = { x: c.x, y: c.y, r: T.reach };
    if (n < cams.length && onFootAt(w, s)) {
      s.vars.fixed = ++n;
      say(w, s, w.player.pos, B.sg1Jun, GOLD);
      if (n === 3) call(s, 'HIKARI', B.sg1Hikari);
      s.objective = text.replace('0/4', `${n}/4`);
    }
    return n >= cams.length;
  },
  sg1Found: (w, s) => {
    const van = V<Car>(s, 'van'), p = w.player.pos;
    s.marker = { x: van.x, y: van.y, r: 0 };
    return w.player.car !== van && dist(p, van) < T.sg1.findDist && w.map.los(van.x, van.y, p.x, p.y);
  },
  sg1Follow: (w, s, dt) => {
    const c = V<Car>(s, 'van'), yard = s.place('sgKurodaYard'), d = watch(w, s, c, dt);
    s.marker = { x: c.x, y: c.y, r: 0 };
    if (c.driver !== 'traffic' || !c.seg) { s.flags.spotted = true; return false; } // Jun stopped the van himself: so much for not being spotted
    c.cruise = d > T.tail.farBehind ? T.tail.dawdle : T.tail.cruise; // it dawdles if Jun falls far behind
    if (dist(c, yard) > 320 && !(c.route.length === 0 && !c.crossing && dist(c, { x: c.seg.bx, y: c.seg.by }) < 200)) return false;
    c.driver = 'none'; // he parks and walks into the yard
    const r = yard.rect!;
    s.vars.driver = npc(w, s, 'builder', r.x + r.w * 0.5, r.y + r.h * 0.3);
    s.vars.photoT = 0;
    return true;
  },
  sg1Photo: (w, s, dt) => {
    const man = V<Actor>(s, 'driver'), p = w.player.pos;
    watch(w, s, man, dt);
    s.marker = { x: man.x, y: man.y, r: T.sg1.photoDist };
    if (!(dist(p, man) < T.sg1.photoDist && w.map.los(man.x, man.y, p.x, p.y))) return false;
    if (!s.flags.heard) { s.flags.heard = true; say(w, s, man.sprite, B.sg1Contractor, TAN); } // overheard: he is on the phone
    s.vars.photoT = V<number>(s, 'photoT') + dt;
    if (V<number>(s, 'photoT') < T.sg1.photoTime) return false;
    w.fx.puff(p.x, p.y, 0xffffff, 60, 0.12, 0, 0, 0, 0.8); // the camera flash
    return true;
  },
  sg1Spotted: (_w, s) => !!s.flags.spotted,
} as Record<string, Check>);

// =====================================================================================
// S-G2 Building 41: drive Mr. Endō to the station lockers and keep Kuroda's men off him
// =====================================================================================

/** Endō, the passenger: complains about bumps and hard turns. */
function endoRide(w: WorldScene, car: Car): void {
  const hit = Math.max(car.lastImpact, car.bump);
  car.bump = 0;
  if (hit > 60) w.fx.bark(car, B.sg2Endo[1], WARM, 'endo', 5);
  else if (car.slip > 70) w.fx.bark(car, B.sg2Endo[0], WARM, 'endo', 5);
}
/** Kuroda's men come into the locker hall: by the street door and from the far end. */
function kurodaWave(w: WorldScene, s: Story): void {
  const endo = V<Actor>(s, 'endo'), n = T.sg2.waves[V<number>(s, 'wave')], ways = [s.place('stationHall:D'), s.place('stationHall:3')];
  for (let i = 0; i < n; i++) {
    const at = ways[i % 2], f = free(w, at.x + 26 * ((i >> 1) % 3) - 26, at.y - (i % 2 ? 0 : 40));
    const forEndo = i % 2 === 0 && w.map.los(f.x, f.y, endo.x, endo.y); // half of them go for the old man, the rest for Jun
    const t = w.gang.spawnThug(f.x, f.y, 'builder', forEndo ? 'smash' : 'chase');
    if (forEndo) { t.tx = endo.x; t.ty = endo.y; }
    if (i === 0) later(w, s, 1200, () => { if (t.alive) say(w, s, t.sprite, B.sg2Thug, RED); });
  }
}

Object.assign(HOOKS, {
  sg2Setup(w, s) {
    const iz = s.place('sgIzakaya').rect!, st = s.place('sgStation');
    const car = ownCar(w, s, VEHICLES.sedan, spot(iz, 0.5, 0.8), 0);
    const by = free(w, car.x + 40, car.y - 10); // Endō waits by the car outside
    s.vars.endo = npc(w, s, 'elder', by.x, by.y);
    Object.assign(s.vars, { lockers: { x: st.x, y: st.y }, hits: 0, rideT: 0, wave: 0 }); // `lockers`: the station door, where the car pulls up
    goInside(w, s, 'izakaya', '1', 'sgIzakayaDoor'); // the opening scene is inside the izakaya
    s.flags.doorsOpen = true;
  },
} as Record<string, Hook>);

Object.assign(CHECKS, {
  sg2Drive: (w, s, dt) => {
    const endo = V<Actor>(s, 'endo'), p = w.player, lk = V<P>(s, 'lockers');
    if (!s.flags.endoIn) {
      s.marker = { x: endo.x, y: endo.y, r: 0 };
      if (!p.car || p.car.speed > 80 || dist(p.car, endo) > T.sg2.pickup) return false;
      s.flags.endoIn = true; s.vars.endoCar = p.car; // he gets in
      endo.sprite.setVisible(false); endo.body.enable = false;
    }
    const car = V<Car>(s, 'endoCar');
    if (p.car !== car) { s.marker = { x: car.x, y: car.y, r: 30 }; return false; } // Endō is waiting in the car
    s.marker = { x: lk.x, y: lk.y, r: 0 };
    endoRide(w, car);
    s.vars.rideT = V<number>(s, 'rideT') + dt;
    if (!s.flags.tailed && V<number>(s, 'rideT') > T.sg2.chaseAfter) { s.flags.tailed = true; chasersNear(w, T.sg2.chasers, BLACK_SEDAN, B.sg2Thug); }
    return !!s.flags.tailed && dist(car, lk) < T.sg2.nearStation;
  },
  sg2Lose: (w, s, dt) => {
    const car = V<Car>(s, 'endoCar'), lk = V<P>(s, 'lockers');
    s.marker = { x: lk.x, y: lk.y, r: 0 };
    if (w.player.car === car) endoRide(w, car);
    return shookOff(w, s, dt);
  },
  sg2Protect: (w, s) => {
    const car = V<Car>(s, 'endoCar'), lk = V<P>(s, 'lockers'), endo = V<Actor>(s, 'endo');
    if (!s.flags.atLockers) {
      if (w.player.car !== car) { s.marker = { x: car.x, y: car.y, r: 30 }; return false; }
      s.marker = { x: lk.x, y: lk.y, r: 60 };
      if (dist(car, lk) > T.sg2.dropOff || car.speed > 60) return false;
      s.flags.atLockers = true; // Endō gets out and goes in to his locker
      const at = s.place('stationHall:1');
      endo.body.enable = true; endo.body.reset(at.x, at.y); endo.sprite.setVisible(true);
      return false;
    }
    if (!s.flags.inHall) { // Jun follows him inside
      const by = s.place('stationHall:2');
      s.marker = { x: by.x, y: by.y, r: T.roomReach };
      if (!inRoom(w, 'stationHall')) return false;
      s.flags.inHall = true;
      say(w, s, endo.sprite, B.sg2EndoLocker, WARM);
      later(w, s, 1500, () => kurodaWave(w, s));
      s.flags.waveDue = true;
      later(w, s, 1600, () => { s.flags.waveDue = false; });
      return false;
    }
    s.marker = { x: endo.x, y: endo.y, r: 0 };
    let hits = V<number>(s, 'hits');
    for (const t of w.gang.thugs) if (t.data.hit) { hits += t.data.hit as number; t.data.hit = 0; }
    s.vars.hits = hits;
    s.timer = { label: L.endo, value: hits, max: T.sg2.endoHits, kind: 'bar' };
    if (s.flags.waveDue || w.gang.activeThugs > 0) return false;
    s.vars.wave = V<number>(s, 'wave') + 1;
    if (V<number>(s, 'wave') >= T.sg2.waves.length) { s.timer = null; s.flags.safe = true; return true; }
    kurodaWave(w, s);
    return false;
  },
  /** Endō is beaten down at the lockers, or his ride is wrecked on the way there. */
  sg2Failed: (_w, s) => {
    if (s.flags.safe) return false;
    return ((s.vars.hits as number) || 0) >= T.sg2.endoHits || (!!s.flags.endoIn && !s.flags.atLockers && gone(s.vars.endoCar as Car | undefined));
  },
} as Record<string, Check>);

// =====================================================================================
// S-G3 Broadcast: the site yard on the Building 41 lot, then up through the half-built tower
// (rooms towerF1-towerF3 and towerTop in data/interiors_side.ts)
// =====================================================================================

const TOWER = ['towerF1', 'towerF2', 'towerF3', 'towerTop'];
/** Site security waiting on one floor of the tower (at its spots 2 and 3). */
function towerGuards(w: WorldScene, s: Story, floor: number): void {
  for (let i = 0; i < T.sg3.floorGuards; i++) {
    const q = s.place(`${TOWER[floor]}:${2 + (i % 2)}`), f = free(w, q.x + 24 * (i >> 1), q.y);
    w.gang.spawnThug(f.x, f.y, 'guard', 'guard');
  }
}

Object.assign(HOOKS, {
  sg3Setup(w, s) {
    const lot = s.place('sgLot41').rect!, t = T.sg3;
    for (let i = 0; i < t.gateGuards; i++) {
      const f = free(w, lot.x + lot.w * (0.25 + 0.5 * (i % 2)), lot.y + lot.h * (0.1 + 0.12 * (i >> 1)));
      w.gang.spawnThug(f.x, f.y, 'guard', 'guard'); // site security
    }
    s.vars.floorSpots = Array.from({ length: t.floors }, (_, i) => s.place(`${TOWER[i]}:1`)); // the foot of the stairs up, on each floor
    s.vars.kurodaSpots = ['1', '2', '3'].map((k) => s.place('towerTop:' + k));
    s.vars.floor = 0; s.vars.run = 0;
    towerGuards(w, s, 0);
    s.flags.doorsOpen = true;
  },
  sg3Kuroda(w, s) { const p = V<P[]>(s, 'kurodaSpots')[0]; s.vars.kuroda = npc(w, s, 'builder', p.x, p.y); },
  sg3Stream(w, s) {
    const at = s.place('towerTop:5'), t = T.sg3; // more security comes up the stairs
    s.timer = { label: L.onCamera, value: t.streamTime, max: t.streamTime, kind: 'time' };
    for (let i = 0; i < t.streamGuards; i++) { const f = free(w, at.x + 28 * i, at.y); w.gang.spawnThug(f.x, f.y, 'guard', 'chase'); }
  },
  /** The closing scene is back in the Glitch hideout. */
  sg3Home(w, s) { goInside(w, s, 'capsule', '1', 'hideout'); },
} as Record<string, Hook>);

Object.assign(CHECKS, {
  sg3Inside: (w, s) => {
    const p = w.player.pos, g = w.gang.thugs.find((t) => t.alive && dist(t, p) < 230);
    if (g && !s.flags.siteBark) { s.flags.siteBark = true; say(w, s, g.sprite, B.sg3Security, TAN); }
    return near(w, s);
  },
  sg3Climb: (w, s) => {
    const spots = V<P[]>(s, 'floorSpots');
    let n = V<number>(s, 'floor');
    const at = spots[Math.min(n, spots.length - 1)];
    s.marker = { x: at.x, y: at.y, r: T.reach };
    wake(w, 300);
    if (n < spots.length && onFootAt(w, s)) {
      s.vars.floor = ++n;
      if (n === 2) call(s, 'HIKARI', B.sg3Hikari);
      if (n < spots.length) towerGuards(w, s, n); // more security on the next floor
    }
    return n >= spots.length;
  },
  /** Kuroda backs away to another corner each time Jun gets close, until he has nowhere left to go. */
  sg3Corner: (w, s) => {
    const k = V<Actor>(s, 'kuroda'), pts = V<P[]>(s, 'kurodaSpots'), p = w.player.pos, t = T.sg3;
    let run = V<number>(s, 'run');
    s.marker = { x: k.x, y: k.y, r: 0 };
    const left = k.moveTo(pts[run].x, pts[run].y, t.kurodaSpeed);
    if (left >= 6) return false;
    k.body.setVelocity(0, 0);
    if (run < t.kurodaRuns && run < pts.length - 1) { if (dist(p, k) < t.scareDist) s.vars.run = ++run; return false; }
    return !w.player.car && dist(p, k) < t.cornerDist;
  },
  sg3Hold: (w, s, dt) => {
    const k = V<Actor>(s, 'kuroda'), p = w.player.pos;
    k.body.setVelocity(0, 0);
    s.marker = { x: k.x, y: k.y, r: 40 };
    if (s.timer && dist(p, k) < T.sg3.cameraDist && w.map.los(k.x, k.y, p.x, p.y)) s.timer.value -= dt; // the stream only counts while he is in shot
    return !!s.timer && s.timer.value <= 0;
  },
} as Record<string, Check>);

// =====================================================================================
// S-K1 Ice Machine
// =====================================================================================

/** Carrying the ice machine: no dodge roll, a slow walk, and no getting into cars. */
function carry(w: WorldScene): void {
  const p = w.player, body = p.actor.body, lose = 1 - T.sk1.carrySpeed;
  p.rollCooldown = 1;
  if (p.car) p.exitCar();
  // give back part of the step the physics just took (it reaches the picture on screen after this)
  body.position.x -= (body.position.x - body.prevFrame.x) * lose;
  body.position.y -= (body.position.y - body.prevFrame.y) * lose;
}

Object.assign(HOOKS, {
  sk1Setup(w, s) {
    const door = s.place('clubMirage'), t = T.sk1;
    const k = s.place('clubMirage:3'); // the club's kitchen
    s.vars.machine = free(w, k.x + t.machine[0] * TS, k.y + t.machine[1] * TS); // the ice machine
    s.vars.cook = npc(w, s, 'shopkeeper', k.x + t.cook[0] * TS, k.y + t.cook[1] * TS);
    for (let i = 0; i < t.hosts; i++) { const q = s.place('clubMirage:' + t.hostSpots[i % t.hostSpots.length]), f = free(w, q.x, q.y + 28 * Math.floor(i / t.hostSpots.length)); w.gang.spawnThug(f.x, f.y, 'thug', 'guard'); } // Mirage hosts, out on the club floor
    const kerb = free(w, door.x - 116, door.y); // a truck left on the pavement at the mouth of the kitchen alley
    s.vars.truck = ownCar(w, s, VEHICLES.truck, kerb, 1, Math.PI / 2);
    goInside(w, s, 'bar', '1', 'mamaRei'); // the opening scene is inside Mama Rei's
    s.flags.doorsOpen = true;
  },
  /** The closing scene is back inside Mama Rei's. */
  sk1Home(w, s) { goInside(w, s, 'bar', '1', 'mamaRei'); },
  sk1MachineSpot(_w, s) { const p = V<P>(s, 'machine'); s.marker = { x: p.x, y: p.y, r: 22 }; },
  sk1Steal(w, s) {
    const cook = V<Actor>(s, 'cook');
    s.flags.carrying = true;
    say(w, s, cook.sprite, B.sk1Cook, WARM);
    later(w, s, 1900, () => say(w, s, w.player.pos, B.sk1Jun, GOLD));
    later(w, s, 3800, () => {
      const host = w.gang.thugs.find((t) => t.alive);
      if (host) say(w, s, host.sprite, B.sk1Host, RED);
      for (const t of w.gang.thugs) if (t.alive && t.state === 'guard') t.state = 'chase';
    });
  },
  sk1Loaded(w, s) {
    const truck = V<Car>(s, 'truck');
    s.flags.carrying = false;
    w.fx.puff(truck.x, truck.y, 0xffffff, 30, 0.4, 0, 0, 2, 0.5);
    chasersNear(w, T.sk1.chasers, BLACK_SEDAN, ''); // Mirage's boys come after the truck
  },
} as Record<string, Hook>);

Object.assign(CHECKS, {
  sk1Load: (w, s) => {
    const truck = V<Car>(s, 'truck');
    carry(w);
    s.marker = { x: truck.x, y: truck.y, r: 30 };
    return !w.player.car && dist(w.player.pos, truck) < T.loadDist;
  },
  sk1Deliver: (w, s) => {
    const truck = V<Car>(s, 'truck'), bar = s.place('mamaRei');
    if (w.player.car !== truck) { s.marker = { x: truck.x, y: truck.y, r: 30 }; return false; }
    s.marker = { x: bar.x, y: bar.y, r: T.sk1.deliverRadius };
    return near(w, s) && truck.speed < 140;
  },
  sk1Failed: (_w, s) => gone(s.vars.truck as Car | undefined),
} as Record<string, Check>);

// =====================================================================================
// S-K2 Funeral Money
// =====================================================================================

Object.assign(HOOKS, {
  sk2Setup(w, s) { const d = s.place('skTsuda'); s.vars.tsuda = npc(w, s, 'grandmother', d.x + 18, d.y - 4); s.vars.waitT = 0; s.vars.burnT = 0; },
  sk2Deliver(w, s) { say(w, s, V<Actor>(s, 'tsuda').sprite, B.sk2Tsuda, WARM); },
  sk2Fight(w, s) { say(w, s, w.player.pos, B.sk2Jun, GOLD); },
  /** The closing scene is in Mrs. Tsuda's apartment: she goes in, and Jun sits at her table. */
  sk2Home(w, s) {
    const at = s.place('tsudaFlat:1');
    V<Actor>(s, 'tsuda').body.reset(at.x, at.y);
    goInside(w, s, 'tsudaFlat', '2', 'skTsuda');
  },
  /** The sharks have run: their ledger lies where the boss dropped it, and one of them watches from a distance. */
  sk2Ledger(w, s) {
    const at = (s.vars.ledger as P | undefined) ?? s.place('skTsuda'), f = free(w, at.x, at.y);
    s.vars.ledger = f;
    const far = w.map.randomWalkNear(f.x, f.y, 110, 200) ?? free(w, f.x + 150, f.y);
    s.vars.watcher = npc(w, s, 'thug', far.x, far.y);
  },
} as Record<string, Hook>);

Object.assign(CHECKS, {
  sk2Wait: (w, s, dt) => {
    const d = s.place('skTsuda'), p = w.player.pos, t = T.sk2;
    s.marker = { x: d.x, y: d.y, r: 0 };
    if (!s.flags.sharks) {
      if (dist(p, d) < t.stayDist) s.vars.waitT = V<number>(s, 'waitT') + dt;
      if (V<number>(s, 'waitT') < t.wait) return false;
      s.flags.sharks = true; s.vars.waitT = 0;
      const crew: Actor[] = [];
      for (let i = 0; i < t.sharks; i++) {
        let pos = w.map.randomWalkNear(d.x, d.y, 320, 520);
        for (let k = 0; k < 6 && pos && w.onScreen(pos.x, pos.y, 20); k++) pos = w.map.randomWalkNear(d.x, d.y, 320, 520);
        const f = pos ?? free(w, d.x + 340, d.y);
        const g = w.gang.spawnThug(f.x, f.y, 'thug', 'chase', i ? 60 : t.leaderHp);
        g.data.fleeAt = t.fleeAt; // they run rather than die
        crew.push(g);
      }
      s.vars.boss = crew[0];
      later(w, s, 900, () => { if (crew[0].alive) say(w, s, crew[0].sprite, B.sk2Sharks[0], RED); });
      later(w, s, 3300, () => { const g = crew[1] ?? crew[0]; if (g.alive) say(w, s, g.sprite, B.sk2Sharks[1], RED); });
      return false;
    }
    s.vars.waitT = V<number>(s, 'waitT') + dt;
    return V<number>(s, 'waitT') > 10 || w.gang.thugs.some((g) => g.alive && dist(g, p) < 240);
  },
  sk2Run: (w, s) => {
    const boss = V<Actor>(s, 'boss');
    if (boss.alive && boss.state !== 'flee') s.vars.ledger = { x: boss.x, y: boss.y };
    s.marker = null;
    return w.gang.activeThugs === 0;
  },
  sk2Burn: (w, s, dt) => {
    const at = V<P>(s, 'ledger');
    s.marker = { x: at.x, y: at.y, r: 24 };
    if (!s.flags.burning && onFootAt(w, s)) { s.flags.burning = true; say(w, s, V<Actor>(s, 'watcher').sprite, B.sk2Ledger, RED); }
    if (!s.flags.burning) return false;
    fire(w, at);
    s.vars.burnT = V<number>(s, 'burnT') + dt;
    return V<number>(s, 'burnT') >= T.sk2.burnTime;
  },
} as Record<string, Check>);

// =====================================================================================
// S-K3 The Temple Bell
// =====================================================================================

Object.assign(HOOKS, {
  sk3Setup(w, s) {
    const yard = s.place('skMibuYard').rect!, temple = s.place('temple').rect!, t = T.sk3, door = s.place('skMibuWarehouse');
    for (let i = 0; i < t.guards; i++) { // Mibu's guards: every other one out in the yard, the rest inside among the crates (spots 4 and 5)
      const q = s.place('mibuWarehouse:' + (4 + ((i >> 1) % 2)));
      const f = i % 2 ? free(w, q.x + 24 * (i >> 2), q.y) : free(w, yard.x + yard.w * (0.2 + (0.5 * i) / Math.max(1, t.guards - 1)), yard.y + yard.h * 0.45);
      const g = w.gang.spawnThug(f.x, f.y, 'thug', 'guard');
      if (i < t.gunmen) { g.data.gun = true; g.data.bark = B.sk3Guard; }
    }
    for (let i = 0; i < t.bellGuards; i++) { const q = s.place('mibuWarehouse:' + (6 + (i % 2))), f = free(w, q.x + 24 * (i >> 1), q.y); w.gang.spawnThug(f.x, f.y, 'thug', 'guard'); }
    s.vars.bell = s.place('mibuWarehouse:2'); // the bell, in the strongroom at the back
    s.vars.loadAt = { x: door.x, y: door.y }; // the warehouse door: the truck backs up to it
    s.vars.ringAt = spot(temple, 0.5, 0.3);
    s.vars.monk = npc(w, s, 'priest', temple.x + temple.w + 14, temple.y + temple.h * 0.5); // at the temple gate
    s.flags.doorsOpen = true;
  },
  sk3BellSpot(_w, s) { const p = V<P>(s, 'bell'); s.marker = { x: p.x, y: p.y, r: T.reach }; },
  sk3Truck(w, s) {
    const yard = s.place('skMibuYard').rect!;
    s.vars.truck = ownCar(w, s, VEHICLES.truck, spot(yard, 0.15, 0.2), 1); // Goro's tow truck
  },
  sk3Loaded(w, s) {
    const truck = V<Car>(s, 'truck');
    w.fx.puff(truck.x, truck.y, 0xe8c84a, 30, 0.4, 0, 0, 2, 0.5);
    chasersNear(w, T.sk3.chasers, BLACK_SEDAN, '');
  },
  sk3RingSpot(_w, s) { const p = V<P>(s, 'ringAt'); s.marker = { x: p.x, y: p.y, r: T.reach }; },
  sk3Ring(w, s) { const p = V<P>(s, 'ringAt'); for (let i = 0; i < 3; i++) w.fx.puff(p.x, p.y, 0xe8c84a, 30 + i * 30, 1.2 + i * 0.3, 0, 0, 2.5, 0.35); },
} as Record<string, Hook>);

Object.assign(CHECKS, {
  sk3Inside: (w, s) => {
    const p = w.player.pos, g = w.gang.thugs.find((t) => t.alive && dist(t, p) < 260);
    if (g && !s.flags.guardBark) { s.flags.guardBark = true; say(w, s, g.sprite, B.sk3Guard, RED); }
    wake(w, 300);
    return near(w, s);
  },
  /** Back Goro's truck up to the warehouse door. */
  sk3Load: (w, s) => {
    const truck = V<Car>(s, 'truck'), at = V<P>(s, 'loadAt');
    if (w.player.car !== truck) { s.marker = { x: truck.x, y: truck.y, r: 30 }; return false; }
    s.marker = { x: at.x, y: at.y, r: 40 };
    return dist(truck, at) < T.sk3.loadDist && truck.speed < 80;
  },
  sk3Temple: (w, s) => {
    const truck = V<Car>(s, 'truck'), temple = s.place('temple'), monk = V<Actor>(s, 'monk');
    if (w.player.car !== truck) { s.marker = { x: truck.x, y: truck.y, r: 30 }; return false; }
    s.marker = { x: temple.x, y: temple.y, r: T.sk3.templeRadius };
    if (!s.flags.monk && dist(truck, monk) < 260) { s.flags.monk = true; say(w, s, monk.sprite, B.sk3Monk, WARM); }
    if (!(near(w, s) && truck.speed < 140)) return false;
    s.flags.atTemple = true;
    return true;
  },
  sk3Failed: (_w, s) => !s.flags.atTemple && gone(s.vars.truck as Car | undefined),
} as Record<string, Check>);

// =====================================================================================
// Sea Spirit. Boats are on the cut list: Jun "sails" a car along the port island's shore roads.
// =====================================================================================

/** The centre lines of the shore roads round the port island. */
function shore(): { w: number; e: number; n: number; s: number } {
  const Q = MAP.port, half = (MAP.roadWidth * TS) / 2;
  return { w: MAP.vRoads[Q.v0] * TS + half, e: MAP.vRoads[Q.v1] * TS + half, n: MAP.hRoads[Q.h0] * TS + half, s: MAP.hRoads[Q.h1] * TS + half };
}
/** Something vast and dark over the water, that fades. */
const shape = (w: WorldScene, at: P): void => w.fx.puff(at.x, at.y, 0x0b1014, T.su3.shapeSize, T.su3.shapeTime, 0, 0, 0.05, 0.6);

// ----- S-U1 Bad Omen -----
Object.assign(HOOKS, {
  su1Setup(w, s) {
    const dock = s.place('suDock').rect!, sh = shore();
    s.vars.boat = ownCar(w, s, VEHICLES.sedan, spot(dock, 0.3, 0.25), 0);
    const pts = [{ x: sh.w, y: (sh.n + sh.s) / 2 + 200 }, { x: (sh.w + sh.e) / 2 - 300, y: sh.s }, { x: sh.e - 500, y: sh.s }];
    const skiff = laneCar(w, s, VEHICLES.sedan, 2, pts[2], 0, T.su1.fleeCruise); // the thieves' "skiff"
    skiff.driver = 'none'; skiff.vx = skiff.vy = 0; // waiting, lights off, until Jun turns up
    Object.assign(s.vars, { whistle: pts, skiff, wi: 0, stopT: 0, cargo: { x: skiff.x, y: skiff.y } });
  },
  su1BoatMarker(_w, s) { const c = V<Car>(s, 'boat'); s.marker = { x: c.x, y: c.y, r: 30 }; },
  su1Thieves(w, s) {
    const c = V<Car>(s, 'skiff');
    say(w, s, c, B.su1Thief, TAN);
    if (c.driver !== 'none') return;
    c.seg ??= w.map.nearestLane(c.x, c.y);
    c.driver = 'traffic'; c.panic = 9999; // they run, and do not stop for lights
  },
} as Record<string, Hook>);

Object.assign(CHECKS, {
  su1Whistle: (w, s) => {
    const pts = V<P[]>(s, 'whistle'), car = V<Car>(s, 'skiff');
    let i = V<number>(s, 'wi');
    if (i < pts.length) { s.marker = { x: pts[i].x, y: pts[i].y, r: T.su1.whistleRadius }; if (near(w, s)) s.vars.wi = ++i; } // the whistling moves on
    if (i >= pts.length) s.marker = { x: car.x, y: car.y, r: T.su1.whistleRadius };
    return dist(w.player.pos, car) < T.su1.spotDist;
  },
  su1Catch: (w, s, dt) => {
    const car = V<Car>(s, 'skiff'), p = w.player.pos;
    if (s.flags.caught) return w.gang.activeThugs === 0;
    s.marker = { x: car.x, y: car.y, r: 0 };
    if (!car.removed) s.vars.cargo = { x: car.x, y: car.y };
    s.vars.stopT = car.speed < 15 && dist(car, p) < 170 ? V<number>(s, 'stopT') + dt : 0;
    if (!(car.wreck || car.removed || car.driver !== 'traffic' || car.hp < car.def.hp * T.su1.stopHp || V<number>(s, 'stopT') > 1.5)) return false;
    if (car.driver === 'traffic') car.driver = 'none';
    s.flags.caught = true;
    const at = V<P>(s, 'cargo');
    for (let i = 0; i < T.su1.thieves; i++) { const f = free(w, at.x + (i ? 34 : -34), at.y + 30); w.gang.spawnThug(f.x, f.y, 'courier', 'chase'); } // they get out and fight
    say(w, s, p, B.su1Jun, GOLD);
    return false;
  },
  /** Pick the crates up from the thieves' car, then take them back to the market. */
  su1Cargo: (w, s) => {
    const car = V<Car>(s, 'skiff'), p = w.player.pos;
    if (!car.removed) s.vars.cargo = { x: car.x, y: car.y };
    const at = V<P>(s, 'cargo');
    if (!s.flags.cargo) {
      s.marker = { x: at.x, y: at.y, r: 40 };
      if (dist(p, at) < 50) { s.flags.cargo = true; w.fx.puff(at.x, at.y, 0xffffff, 26, 0.4, 0, 0, 2, 0.5); }
      return false;
    }
    const dock = s.place('suDock');
    s.marker = { x: dock.x, y: dock.y, r: 70 };
    return near(w, s);
  },
} as Record<string, Check>);

// ----- S-U2 The Lucky Catch -----
Object.assign(HOOKS, {
  su2Setup(w, s) {
    const dock = s.place('suDock').rect!, bridge = s.place('bayBridge'), yard = s.place('fishMarketYard').rect!, far = s.place('raceStart');
    ownCar(w, s, VEHICLES.sports, spot(dock, 0.3, 0.25), 0);
    const truck = laneCar(w, s, VEHICLES.truck, 0, { x: bridge.x - 20, y: bridge.y }, 0, T.su2.truckCruise); // the refrigerated truck, heading over the bridge into the city
    truck.route = w.map.route(truck.seg!, far.x, far.y).slice(1);
    s.vars.truck = truck; s.vars.stopT = 0;
    s.vars.auctioneer = npc(w, s, 'shopkeeper', yard.x + yard.w * 0.5, yard.y + 22);
  },
  su2Go(_w, s) { s.timer = { label: L.auction, value: T.su2.auctionTime, max: T.su2.auctionTime, kind: 'time' }; s.flags.clock = true; },
  su2Caught(w, s) { say(w, s, V<Car>(s, 'truck'), B.su2Driver, TAN); },
  su2Sold(w, s) {
    s.flags.clock = false; s.timer = null;
    say(w, s, V<Actor>(s, 'auctioneer').sprite, B.su2Auctioneer, WARM);
  },
  /** "Less for every dent": takes the truck's damage off the ¥900,000 the card is about to pay. */
  su2Dents(w, s) {
    const truck = V<Car>(s, 'truck'), t = T.su2;
    const share = Math.max(t.minShare, t.share - Math.round(Math.max(0, truck.maxHp - truck.hp) * t.yenPerHp));
    s.vars.share = share;
    w.player.cash -= t.share - share;
  },
} as Record<string, Hook>);

Object.assign(CHECKS, {
  su2Catch: (w, s) => {
    const tr = V<Car>(s, 'truck');
    s.marker = { x: tr.x, y: tr.y, r: 0 };
    return dist(w.player.pos, tr) < T.su2.catchDist;
  },
  /** Get in front of it and it stops (traffic stops for what is in its way); batter it and the driver gives up, but that costs money. */
  su2Stop: (w, s, dt) => {
    const tr = V<Car>(s, 'truck');
    s.marker = { x: tr.x, y: tr.y, r: 0 };
    s.vars.stopT = tr.speed < 12 && dist(tr, w.player.pos) < 240 ? V<number>(s, 'stopT') + dt : 0;
    if (tr.driver === 'traffic' && tr.hp >= tr.def.hp * T.su2.stopHp && V<number>(s, 'stopT') <= 1.5) return false;
    if (tr.driver === 'traffic') { // the driver runs for it
      tr.driver = 'none';
      const q = w.sidePoint(tr, -1);
      w.gang.spawnThug(q.x, q.y, 'courier', 'chase').data.fleeAt = 999;
    }
    return true;
  },
  su2Drive: (w, s) => {
    const tr = V<Car>(s, 'truck'), yard = s.place('fishMarketYard');
    if (w.player.car !== tr) { s.marker = { x: tr.x, y: tr.y, r: 30 }; return false; }
    s.marker = { x: yard.x, y: yard.y, r: 0 };
    return tr.y > MAP.hRoads[MAP.port.h0] * TS; // back on the port island
  },
  su2Arrive: (w, s) => {
    const tr = V<Car>(s, 'truck'), yard = s.place('fishMarketYard');
    if (w.player.car !== tr) { s.marker = { x: tr.x, y: tr.y, r: 30 }; return false; }
    s.marker = { x: yard.x, y: yard.y, r: 80 };
    return near(w, s) && tr.speed < 140;
  },
  /** The truck is wrecked, or the auction starts without the tuna. */
  su2Failed: (_w, s, dt) => {
    const tr = s.vars.truck as Car | undefined;
    if (!tr || !s.flags.clock) return false;
    if (s.timer) s.timer.value -= dt;
    return tr.wreck || tr.removed || tr.burning || (!!s.timer && s.timer.value <= 0);
  },
} as Record<string, Check>);

// ----- S-U3 Umibōzu -----
Object.assign(HOOKS, {
  su3Setup(w, s) {
    w.setAmbience(SIDE_LIGHT.fog);
    const dock = s.place('suDock').rect!, quay = s.place('suSalvage').rect!, t = T.su3, sh = shore();
    ownCar(w, s, VEHICLES.sedan, spot(dock, 0.3, 0.25), 0);
    const barge = storyCar(w, VEHICLES.truck, quay.x + quay.w * 0.5, quay.y + quay.h * 0.3, Math.PI / 2, 0); // the salvage "barge"
    s.cars.push(barge);
    for (let i = 0; i < t.mercs; i++) {
      const f = free(w, barge.x + Math.cos(i * 1.3) * 64, barge.y + 60 + Math.sin(i * 1.3) * 40);
      const g = w.gang.spawnThug(f.x, f.y, 'yatagarasu', 'guard'); // ex-Yatagarasu mercenaries
      if (i < t.gunmen) g.data.gun = true;
    }
    Object.assign(s.vars, { barge, fog: { x: (sh.w + sh.e) / 2, y: sh.s } });
  },
  su3FogMarker(_w, s) { const p = V<P>(s, 'fog'); s.marker = { x: p.x, y: p.y, r: 120 }; },
  /** A vast dark silhouette looms on the horizon, then fades. */
  su3Shape(w, s) {
    const p = V<P>(s, 'fog');
    shape(w, { x: p.x, y: p.y + 420 });
    later(w, s, 1400, () => say(w, s, w.player.pos, B.su3Jun, GOLD));
  },
  /** Something enormous rises out of the water west of the quay, then sinks again. */
  su3Rise(w, s) { const b = V<Car>(s, 'barge'); shape(w, { x: (MAP.vRoads[MAP.port.v0] - 14) * TS, y: b.y }); },
} as Record<string, Hook>);

Object.assign(CHECKS, {
  su3Find: (w, s) => {
    const b = V<Car>(s, 'barge'), p = w.player.pos;
    s.marker = { x: b.x, y: b.y, r: 0 };
    return dist(p, b) < T.su3.revealDist && w.map.los(b.x, b.y, p.x, p.y);
  },
  su3Deal: (w, s) => {
    const b = V<Car>(s, 'barge'), g = w.gang.thugs.find((t) => t.alive);
    s.marker = { x: b.x, y: b.y, r: 0 };
    if (g && !s.flags.mercBark) { s.flags.mercBark = true; say(w, s, g.sprite, B.su3Merc, RED); }
    wake(w, T.su3.wakeDist);
    return w.gang.activeThugs === 0;
  },
  su3Home: (w, s) => {
    const b = V<Car>(s, 'barge');
    if (!b.removed && w.onScreen(b.x, b.y, 60)) fire(w, b); // the barge burns quietly
    return near(w, s);
  },
} as Record<string, Check>);
