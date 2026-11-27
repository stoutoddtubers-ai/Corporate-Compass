import * as Phaser from 'phaser';
import { SideJobs } from './SideJobs';
import { SIDE_JOBS as J, SIDE_TEXT as X, sideText as say } from '../data/sidejobs';
import { PEDS } from '../data/ai';
import { MAP } from '../data/map';
import { TILE_SIZE as TS, MAP_TILES_W as W, MAP_TILES_H as H } from '../data/config';
import { VEHICLES } from '../data/vehicles';
import { Tile } from './CityMap';
import { free, storyCar, dist } from './missionHooks';
import { Actor } from '../entities/Actor';
import type { Car } from '../entities/Car';
import type { WorldScene } from '../scenes/WorldScene';

const CATS_KEY = 'kogane.cats.v1';

export type JobId = 'ramen' | 'taxi' | 'race';
export interface LuckyCat { x: number; y: number; found: boolean }
interface Point { x: number; y: number }
/** A teal ring that starts a job. */
interface Start extends Point { label: string; job: JobId }
/** A place a taxi can stop: the spot on the road, and where the passenger stands on the pavement. */
interface Kerb extends Point { kx: number; ky: number }
/** Someone standing in the street for a job (a customer, a passenger). `ttl` = seconds until they go. */
interface Extra { a: Actor; ttl: number }

/** Small repeatable random number generator (the same one the city is built with), so the cats are always in the same places. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const yen = (n: number) => n.toLocaleString('en-US');
const pickOne = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

/**
 * The repeatable jobs and the lucky cats. All numbers and words are in data/sidejobs.ts.
 *  - Ramen delivery: walk into the ring by Sakamaki Ramen. You get the scooter and three
 *    customers; bumps and hard turns spill soup and cut each tip; bring the scooter home.
 *  - Taxi: pull up at a taxi rank in any car. Pick up a fare, drop them off before the
 *    clock runs out, and the next fare appears. Each fare in a row pays more.
 *  - K-Route time trial: pull up at the start line in any vehicle and lap the ring in time.
 *  - Lucky cats: 100 of them in alleys, car parks and on pavements. Walk over one to take it.
 * A job tidies up after itself however it ends: its vehicle, its people, its marker and clock.
 */
export class CityJobs extends SideJobs {
  /** Which job is running. */
  job: JobId | null = null;
  /** The vehicle the running job uses. */
  car: Car | null = null;
  /** Seconds left on the running job's clock (taxi, time trial). */
  clock = 0;
  /** The lucky cats, in a fixed order. */
  cats: LuckyCat[] = [];

  /** True if the job made its vehicle (and so must remove it). */
  private ownCar = false;
  private clockMax = 0;
  private cooldown = 0;
  /** A ring only works once you have been outside it, so a finished job does not start again at once. */
  private away = false;
  /** Seconds the player has been out of the job's vehicle. */
  private outT = 0;
  private spots: Start[] = [];
  private spotsFor = -1;
  private ranks: Point[] = [];
  private extras: Extra[] = [];
  /** The story's own "next mission" marker, put aside while a job shows its marker. */
  private held: { marker: WorldScene['story']['marker']; index: number } | null = null;

  // ramen delivery
  private stops: { id: string; x: number; y: number }[] = [];
  private stop = 0;
  private spill = 0;
  private tips = 0;
  private base: Point = { x: 0, y: 0 };
  private customer: Extra | null = null;

  // taxi
  private fare = 0;
  private faresDone = 0;
  private earned = 0;
  private riding = false;
  private who = 0;
  private trip = 0;
  private tipKeep = 1;
  private bumpT = 0;
  private dest: Kerb | null = null;
  private passenger: Extra | null = null;

  // time trial
  private cps: Point[] = [];
  private cp = 0;

  // lucky cats
  private catG: Phaser.GameObjects.Graphics;
  private glintG: Phaser.GameObjects.Graphics;

  constructor(world: WorldScene) {
    super(world);
    this.catG = world.add.graphics().setDepth(3.5); // on the ground, under people and cars
    this.glintG = world.add.graphics().setDepth(31.5); // the sparkle shows over rooftops and the night
    this.cats = this.placeCats();
    try {
      const saved = JSON.parse(localStorage.getItem(CATS_KEY) ?? '{}') as { found?: number[] };
      for (const i of saved.found ?? []) if (this.cats[i]) this.cats[i].found = true;
    } catch { /* saving is optional */ }
    for (const id of J.taxi.ranks) {
      const q = world.map.places[id];
      if (!q) continue;
      const l = world.map.nearestLane(q.x, q.y); // a rank is on the road nearest its landmark
      const k = Phaser.Math.Clamp(((q.x - l.ax) * l.dx + (q.y - l.ay) * l.dy + J.taxi.rankShift) / l.len, J.taxi.rankSpan[0], J.taxi.rankSpan[1]);
      this.ranks.push({ x: l.ax + l.dx * l.len * k, y: l.ay + l.dy * l.len * k });
    }
  }

  get catsFound(): number { return this.cats.reduce((n, c) => n + (c.found ? 1 : 0), 0); }

  // ---------- every frame (free roam only) ----------

  update(dt: number): void {
    this.listStarts();
    this.updateCats();
    for (let i = this.extras.length - 1; i >= 0; i--) {
      const e = this.extras[i];
      e.a.animate(dt);
      e.ttl -= dt;
      if (e.ttl <= 0) { e.a.destroy(); this.extras.splice(i, 1); }
    }
    if (this.job === 'ramen') this.runRamen(dt);
    else if (this.job === 'taxi') this.runTaxi(dt);
    else if (this.job === 'race') this.runRace(dt);
    else this.lookForStart(dt);
  }

  /** A story mission started, or the player died or was arrested: drop the job, pay nothing. */
  abort(): void {
    this.endJob();
    this.away = false; // a mission that ends on top of a job's ring must not start the job: drive off and come back
    for (const e of this.extras) e.a.destroy();
    this.extras = [];
    this.catG.clear(); this.glintG.clear(); // cats are only out in free roam
  }

  // ---------- starting and ending ----------

  /** Which rings exist depends on how far the story has got. */
  private listStarts(): void {
    const w = this.world, i = w.story.index;
    if (i === this.spotsFor) return;
    this.spotsFor = i;
    const out: Start[] = [], P = w.map.places;
    if (i >= J.ramen.unlockAfter && P.ramen) out.push({ x: P.ramen.x + J.ramen.startOffset[0], y: P.ramen.y + J.ramen.startOffset[1], label: X.ramen.name, job: 'ramen' });
    if (i >= J.race.unlockAfter && P.raceStart) out.push({ x: P.raceStart.x, y: P.raceStart.y, label: X.race.name, job: 'race' });
    const bank = (MAP.river.x + MAP.river.w) * TS; // west of this needs the ankle tag gone
    if (i >= J.taxi.unlockAfter) for (const r of this.ranks) if (i >= J.taxi.riverOpensAfter || r.x > bank) out.push({ x: r.x, y: r.y, label: X.taxi.name, job: 'taxi' });
    this.spots = out;
    this.starts = out;
  }

  private lookForStart(dt: number): void {
    const w = this.world, p = w.player, C = J.common, car = p.car;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.hint = '';
    const r = car ? C.startRadiusCar : C.startRadius;
    let at: Start | null = null, close = false;
    for (const s of this.spots) {
      const d = dist(p.pos, s);
      if (d < C.labelRange) this.hint = s.label; // say what this ring is
      if (d < r + 20) close = true;
      if (d < r) at = s;
    }
    if (!close) this.away = true;
    if (!at) return;
    if (at.job === 'ramen' ? !!car : !car || (at.job === 'taxi' && !(J.taxi.vehicles as readonly string[]).includes(car.def.shape))) {
      if (at.job !== 'ramen') this.hint = say(X.common.needCar, { job: at.label });
      return;
    }
    if (!this.away || this.cooldown > 0 || w.heat.level > 0 || w.turf.objective || (car && car.speed > C.startMaxSpeed)) return;
    if (at.job === 'ramen') this.startRamen(at);
    else if (at.job === 'taxi') this.startTaxi();
    else this.startRace();
  }

  private begin(job: JobId, car: Car, own: boolean): void {
    const s = this.world.story;
    this.job = job; this.active = true; this.car = car; this.ownCar = own; this.outT = 0; this.hint = '';
    car.bump = 0;
    // The world shows the story's marker ahead of a job's. Put the "next mission" marker aside
    // while the job runs (so the gold ring and the minimap point at the job), and put it back after.
    if (s.marker) { this.held = { marker: s.marker, index: s.index }; s.marker = null; }
    if (job === 'race') this.world.traffic.blockRing = true;
  }

  /** Stops the running job and removes what it made. Safe to call when nothing is running. */
  private endJob(): void {
    const w = this.world, p = w.player, s = w.story, c = this.car;
    if (this.job) {
      if (c && this.ownCar && !c.removed) {
        if (p.car === c) p.exitCar();
        w.fx.puff(c.x, c.y, 0xffffff, 26, 0.4, 0, 0, 2, 0.5);
        c.destroy();
      }
      if (this.job === 'race') w.traffic.blockRing = false;
      this.cooldown = J.common.cooldown; this.away = false;
    }
    // people still waiting for the job go with it; those already walking off finish on their own
    for (const e of this.extras) if (e.ttl === Infinity) e.ttl = 0;
    this.customer = null; this.passenger = null; this.dest = null;
    if (this.held) {
      if (!s.active && !s.marker && s.index === this.held.index) s.marker = this.held.marker;
      this.held = null;
    }
    this.job = null; this.car = null; this.ownCar = false; this.clock = 0;
    super.abort(); // clears the objective, hint, marker and meter
  }

  /** The job is over: show how it went. */
  private finish(won: boolean, sub: string): void {
    const w = this.world, name = X[this.job!].name.toUpperCase();
    w.story.card = { title: say(won ? X.common.complete : X.common.failed, { job: name }), sub, t: J.common.cardTime };
    this.endJob();
    w.saveGame?.();
  }

  /** Why the job's vehicle can no longer be used ('' while all is well): wrecked, or left behind too long. */
  private rideLost(dt: number): string {
    const c = this.car!;
    if (c.wreck || c.removed) return X.common.failVehicle;
    this.outT = this.world.player.car === c ? 0 : this.outT + dt;
    return this.outT > J.common.leaveTime ? X.common.failLeft : '';
  }

  /** Someone standing in the street for the job. */
  private extra(look: string, x: number, y: number, ttl = Infinity): Extra {
    const w = this.world, f = free(w, x, y);
    const a = new Actor(w, 'ped', f.x, f.y, look, 999);
    a.body.setImmovable(true);
    const e = { a, ttl };
    this.extras.push(e);
    return e;
  }

  // ---------- ramen delivery ----------

  private startRamen(at: Start): void {
    const w = this.world, R = J.ramen, home = w.map.places.ramen;
    const pool = R.places.filter((id) => w.map.places[id] && X.ramen.places[id] && dist(w.map.places[id], home) > R.minDistance);
    this.stops = Phaser.Utils.Array.Shuffle([...pool]).slice(0, R.deliveries).map((id) => ({ id, x: w.map.places[id].x, y: w.map.places[id].y }));
    if (!this.stops.length) return;
    const spot = free(w, at.x, at.y);
    const sc = storyCar(w, VEHICLES.scooter, spot.x, spot.y, -Math.PI / 2, 0); // Mika's delivery scooter
    sc.unlocked = true;
    w.player.putInCar(sc);
    this.begin('ramen', sc, true);
    this.base = { x: at.x, y: at.y };
    this.stop = 0; this.spill = 0; this.tips = 0;
    this.nextStop();
  }

  private nextStop(): void {
    const R = J.ramen, s = this.stops[this.stop];
    if (!s) { // all served: take the scooter home
      this.objective = X.ramen.back; this.hint = ''; this.timer = null;
      this.marker = { x: this.base.x, y: this.base.y, r: R.returnRadius };
      return;
    }
    this.objective = X.ramen.places[s.id]; this.hint = X.ramen.hint;
    this.marker = { x: s.x, y: s.y, r: R.dropRadius };
    this.customer = this.extra(pickOne(PEDS.archetypes).id, s.x + 14, s.y);
  }

  private runRamen(dt: number): void {
    const w = this.world, p = w.player, R = J.ramen, sc = this.car!, m = this.marker!;
    const served = this.stop >= this.stops.length, lost = this.rideLost(dt);
    if (lost) { served ? this.finishRamen() : this.finish(false, lost); return; }
    const on = p.car === sc;
    if (on) { // the soup: mission 2's rules
      const hit = Math.max(sc.lastImpact, sc.bump);
      if (hit > R.spillMinImpact) this.spill += hit * R.spillPerImpact;
      if (sc.slip > R.spillSlipMin) this.spill += sc.slip * R.spillPerSlip * dt;
      this.spill = Math.min(1, this.spill);
    }
    sc.bump = 0;
    if (served) { if (dist(p.pos, m) < m.r) this.finishRamen(); return; }
    this.timer = { label: X.ramen.meter, value: this.spill, max: 1, kind: 'bar' };
    if (!on || dist(sc, m) > m.r || sc.speed > R.dropMaxSpeed) return;
    // handed over: the customer says how it looks, and tips by how much is left in the bowl
    const who = this.customer;
    if (who) {
      w.fx.bark(who.a.sprite, this.spill < R.tipGoodBelow ? X.ramen.tipGood : this.spill <= R.tipOkBelow ? X.ramen.tipOk : X.ramen.tipBad, '#ffe9c0');
      who.ttl = R.customerStays;
    }
    const tip = Math.round(R.tip * (1 - this.spill));
    p.cash += tip; this.tips += tip;
    this.customer = null; this.spill = 0; this.stop++;
    this.nextStop();
  }

  private finishRamen(): void {
    this.finish(true, say(X.ramen.result, { amount: yen(this.tips) }));
  }

  // ---------- taxi ----------

  private startTaxi(): void {
    this.begin('taxi', this.world.player.car!, false);
    this.fare = 0; this.faresDone = 0; this.earned = 0; this.bumpT = 0;
    this.nextFare();
  }

  /** Every spot a taxi may stop at, between two distances from a point. If there is none, the nearest one beyond. */
  private kerb(from: Point, range: readonly number[]): Kerb | null {
    const w = this.world, map = w.map, T = J.taxi;
    const eastOnly = w.story.index < T.riverOpensAfter, bank = (MAP.river.x + MAP.river.w) * TS, bay = MAP.bay.y * TS;
    const ok: Kerb[] = [];
    let spare: Kerb | null = null, sd = 1e9;
    for (const l of map.lanes) for (const k of T.laneStops) {
      const x = l.ax + l.dx * l.len * k, y = l.ay + l.dy * l.len * k;
      if (y > bay || (eastOnly && x < bank)) continue; // fares stay in the city, and on the east bank while the tag is on
      const kx = x + l.dy * T.kerbOffset, ky = y - l.dx * T.kerbOffset; // traffic drives on the left, so the kerb is on the left
      if (map.tileAt(kx, ky) !== Tile.Walk || map.tileAt(kx + l.dy * TS, ky - l.dx * TS) === Tile.Water) continue; // nobody waits on a bridge
      const d = Math.hypot(x - from.x, y - from.y), spot = { x, y, kx, ky };
      if (d >= range[0] && d <= range[1]) ok.push(spot);
      else if (d > range[1] && d < sd) { sd = d; spare = spot; }
    }
    return ok.length ? pickOne(ok) : spare;
  }

  /** Points the marker at the next stop and sets the clock by how far it is. */
  private leg(to: Kerb): void {
    const c = this.car!, T = J.taxi;
    this.dest = to;
    this.trip = Math.abs(to.x - c.x) + Math.abs(to.y - c.y); // roads run north-south and east-west
    this.clock = this.clockMax = T.baseTime + this.trip / T.pace;
    this.marker = { x: to.x, y: to.y, r: T.stopRadius };
  }

  private nextFare(): void {
    const at = this.kerb(this.car!, J.taxi.pickupDistance);
    if (!at) { this.finishTaxi(true); return; }
    this.fare++; this.riding = false;
    this.who = Math.floor(Math.random() * PEDS.archetypes.length);
    this.passenger = this.extra(PEDS.archetypes[this.who].id, at.kx, at.ky);
    this.leg(at);
  }

  private runTaxi(dt: number): void {
    const w = this.world, p = w.player, T = J.taxi, c = this.car!, person = PEDS.archetypes[this.who];
    const lost = this.rideLost(dt);
    if (lost) { this.finishTaxi(false, lost); return; }
    this.clock -= dt;
    if (this.clock <= 0) {
      if (this.riding) { const out = w.sidePoint(c, -1); w.fx.bark(this.extra(person.id, out.x, out.y, T.passengerStays).a.sprite, person.react, '#ffd9d9'); } // the passenger gets out, unimpressed
      this.finishTaxi(false, X.common.failTime);
      return;
    }
    this.objective = this.riding ? X.taxi.dropOff : X.taxi.pickUp;
    this.hint = say(X.taxi.count, { n: this.fare, max: T.faresPerRun });
    this.timer = { label: X.common.clock, value: this.clock, max: this.clockMax, kind: 'time' };
    // a crash with a passenger aboard costs some of the tip
    this.bumpT -= dt;
    const hit = Math.max(c.lastImpact, c.bump);
    c.bump = 0;
    if (this.riding && hit > T.bumpMin && this.bumpT <= 0) { this.bumpT = T.bumpGap; this.tipKeep *= 1 - T.bumpTipLoss; w.fx.bark(c, person.panic, '#ffd9d9'); }

    const to = this.dest!;
    if (p.car !== c || dist(c, to) > T.stopRadius || c.speed > T.stopSpeed) return;
    if (!this.riding) { // the passenger gets in and says where to
      if (this.passenger) this.passenger.ttl = 0;
      this.passenger = null;
      w.fx.bark(c, person.calm, '#d9e2ff');
      const next = this.kerb(c, T.fareDistance);
      if (!next) { this.finishTaxi(true); return; }
      this.riding = true; this.tipKeep = 1;
      this.leg(next);
      return;
    }
    // dropped off: the fare by distance, a tip by the time left, and more for each fare in a row
    const fare = T.baseFare + this.trip * T.farePerPx, tip = fare * T.tipShare * (this.clock / this.clockMax) * this.tipKeep;
    const pay = Math.max(0, Math.min(T.runMax - this.earned, Math.round(((fare + tip) * (1 + T.streakBonus * this.faresDone)) / 10) * 10));
    p.cash += pay; this.earned += pay; this.faresDone++;
    w.fx.bark(c, say(X.common.paid, { amount: yen(pay) }), '#e8b923');
    this.extra(person.id, to.kx, to.ky, T.passengerStays);
    if (this.faresDone >= T.faresPerRun || this.earned >= T.runMax) this.finishTaxi(true);
    else this.nextFare();
  }

  private finishTaxi(won: boolean, why = ''): void {
    const sum = this.faresDone ? say(this.faresDone === 1 ? X.taxi.resultOne : X.taxi.result, { n: this.faresDone, amount: yen(this.earned) }) : '';
    this.finish(won, [why, sum].filter(Boolean).join(' '));
  }

  // ---------- K-Route time trial ----------

  private startRace(): void {
    const w = this.world, E = MAP.eastRing, rw = MAP.roadWidth, st = w.map.places.raceStart;
    // one clockwise lap of the east-bank ring, as in mission 4: the corners and the middle of each side, then the start line
    const N = E.north * TS + TS, S = (E.south + rw) * TS - TS, Wx = E.west * TS + TS, Ex = (E.east + rw) * TS - TS;
    this.cps = [[Ex, N], [Ex, (N + S) / 2], [Ex, S], [(Wx + Ex) / 2, S], [Wx, S], [Wx, (N + S) / 2], [Wx, N], [st.x, N]].map(([x, y]) => ({ x, y }));
    this.cp = 0;
    this.begin('race', w.player.car!, false);
    this.clock = this.clockMax = J.race.targetTime;
    this.objective = say(X.race.objective, { time: J.race.targetTime });
  }

  private runRace(dt: number): void {
    const p = this.world.player, R = J.race, c = this.car!;
    const lost = this.rideLost(dt);
    if (lost) { this.finish(false, lost); return; }
    this.clock -= dt;
    if (this.clock <= 0) { this.finish(false, X.common.failTime); return; }
    if (p.car === c && dist(c, this.cps[this.cp]) < R.checkpointRadius) this.cp++;
    if (this.cp >= this.cps.length) { // home in time
      const pay = R.prize + Math.floor(this.clock) * R.bonusPerSecond;
      p.cash += pay;
      this.finish(true, say(X.race.result, { time: (R.targetTime - this.clock).toFixed(1), amount: yen(pay) }));
      return;
    }
    const next = this.cps[this.cp];
    this.marker = { x: next.x, y: next.y, r: R.markerRadius };
    this.hint = say(X.race.checkpoint, { n: this.cp + 1, max: this.cps.length });
    this.timer = { label: X.common.clock, value: this.clock, max: this.clockMax, kind: 'time' };
  }

  // ---------- lucky cats ----------

  /**
   * Chooses where the cats go: the same places every time, spread over every block of the city.
   * A cat sits on a tile you can walk to that is not road: an alley, a car park (off the row
   * where cars park) or a pavement, and never on a lamp, tree or other street furniture.
   */
  private placeCats(): LuckyCat[] {
    const K = J.cats, map = this.world.map, tiles = map.tiles, rnd = seeded(K.seed);
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? Tile.Building : tiles[y * W + x]);
    // tiles Jun can reach on foot from the street
    const reach = new Uint8Array(W * H), queue: number[] = [];
    const first = map.lanes[0], start = ((first.ay / TS) | 0) * W + ((first.ax / TS) | 0);
    reach[start] = 1; queue.push(start);
    for (let head = 0; head < queue.length; head++) {
      const c = queue[head], cx = c % W, cy = (c / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = cx + dx, y = cy + dy, t = at(x, y);
        if (t === Tile.Building || t === Tile.Water || reach[y * W + x]) continue;
        reach[y * W + x] = 1; queue.push(y * W + x);
      }
    }
    // tiles to leave alone: street furniture, and the middle row of each car park (where cars are parked)
    const taken = new Uint8Array(W * H), park = new Uint8Array(W * H);
    for (const f of map.furniture) taken[((f.y / TS) | 0) * W + ((f.x / TS) | 0)] = 1;
    for (const l of map.lots) for (let y = l.y / TS; y < (l.y + l.h) / TS; y++) for (let x = l.x / TS; x < (l.x + l.w) / TS; x++) {
      park[y * W + x] = 1;
      if (Math.abs((y + 0.5) * TS - (l.y + l.h / 2)) < 40) taken[y * W + x] = 1;
    }
    // hand-laid floors outside the car parks (the covered shopping street) are open street, not a back alley
    const street = new Uint8Array(W * H);
    for (const b of map.blocks) for (const it of MAP.layouts[b.id] ?? []) {
      if (it.kind !== 'f') continue;
      for (let y = b.y / TS + it.r[1]; y < b.y / TS + it.r[1] + it.r[3]; y++) for (let x = b.x / TS + it.r[0]; x < b.x / TS + it.r[0] + it.r[2]; x++) street[y * W + x] = 1;
    }
    const nearRoad = (x: number, y: number) => {
      for (let j = -K.roadClear; j <= K.roadClear; j++) for (let i = -K.roadClear; i <= K.roadClear; i++) { const t = at(x + i, y + j); if (t === Tile.Road || t === Tile.Crossing) return true; }
      return false;
    };
    // each block's hiding places, by kind (the pavement round a block counts as part of it)
    const kinds = ['alley', 'carPark', 'sidewalk'] as const;
    const blocks = map.blocks.map((b) => {
      const pool: Record<(typeof kinds)[number], number[]> = { alley: [], carPark: [], sidewalk: [] };
      for (let y = b.y / TS - 1; y <= (b.y + b.h) / TS; y++) for (let x = b.x / TS - 1; x <= (b.x + b.w) / TS; x++) {
        const i = y * W + x, t = at(x, y);
        if (!reach[i] || taken[i]) continue;
        if (t === Tile.Walk || (t === Tile.Lot && street[i] && !park[i])) pool.sidewalk.push(i);
        else if (t === Tile.Lot && !nearRoad(x, y)) (park[i] ? pool.carPark : pool.alley).push(i);
      }
      return pool;
    });
    // deal the cats out one block at a time, in a shuffled order, until there are enough
    const order = blocks.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const out: LuckyCat[] = [], chosen: number[] = [];
    const clear = (i: number, gap: number) => chosen.every((c) => Math.max(Math.abs((c % W) - (i % W)), Math.abs(((c / W) | 0) - ((i / W) | 0))) >= gap);
    for (let gap: number = K.spacing; out.length < K.count && gap >= 1; gap--) {
      for (let added = true; added && out.length < K.count;) {
        added = false;
        for (const b of order) {
          if (out.length >= K.count) break;
          const roll = rnd(), want = roll < K.share.alley ? 0 : roll < K.share.alley + K.share.carPark ? 1 : 2;
          for (let n = 0; n < kinds.length; n++) { // the kind rolled, or failing that the next kind
            const list = blocks[b][kinds[(want + n) % kinds.length]].filter((i) => clear(i, gap));
            if (!list.length) continue;
            const i = list[Math.floor(rnd() * list.length)];
            chosen.push(i);
            out.push({ x: ((i % W) + 0.5) * TS, y: (((i / W) | 0) + 0.5) * TS, found: false });
            added = true;
            break;
          }
        }
      }
    }
    return out;
  }

  /** Draws the cats near the camera and picks up any the player walks over. */
  private updateCats(): void {
    const w = this.world, p = w.player, K = J.cats, g = this.catG, s = this.glintG, now = w.time.now;
    g.clear(); s.clear();
    for (let i = 0; i < this.cats.length; i++) {
      const c = this.cats[i];
      if (c.found || !w.onScreen(c.x, c.y, 48)) continue;
      const d = dist(p.pos, c);
      if (!p.car && w.mode === 'play' && d < K.collectRadius) { this.collectCat(i); continue; }
      this.drawCat(g, c.x, c.y, now / 1000 + i);
      if (d < K.glintRange) { // a sparkle above it, so a cat behind a building can still be found
        const k = 0.5 + 0.5 * Math.sin(now / 160 + i), y = c.y - 34 / MAP.squash, r = 3 + 3 * k;
        s.fillStyle(0xfff2a0, 0.35 + 0.6 * k).fillTriangle(c.x - r, y, c.x + r, y, c.x, y - r * 2).fillTriangle(c.x - r, y, c.x + r, y, c.x, y + r * 2);
        s.fillStyle(0xffffff, 0.9 * k).fillRect(c.x - r * 1.6, y - 0.5, r * 3.2, 1);
      }
    }
  }

  /** A maneki-neko from plain shapes: white cat, red collar, gold coin, one paw waving. */
  private drawCat(g: Phaser.GameObjects.Graphics, x: number, y: number, t: number): void {
    const C = J.cats.colors, k = 1 / MAP.squash; // the view squashes the world top-to-bottom; standing things are drawn taller to match
    const up = (h: number) => y - (h + Math.sin(t * 2.2) * 1.2) * k; // it bobs
    g.fillStyle(C.glow, 0.16 + 0.08 * Math.sin(t * 3)).fillEllipse(x, y, 34, 34 * k * 0.8);
    g.fillStyle(0x000000, 0.3).fillEllipse(x, y, 15, 9);
    g.fillStyle(C.line, 1).fillEllipse(x, up(6.5), 14.5, 14.5 * k).fillEllipse(x, up(15), 13, 11.5 * k);
    g.fillTriangle(x - 6.5, up(16.5), x - 4.5, up(24), x - 0.5, up(19)).fillTriangle(x + 6.5, up(16.5), x + 4.5, up(24), x + 0.5, up(19));
    g.fillStyle(C.body, 1).fillEllipse(x, up(6.5), 12, 12 * k).fillEllipse(x, up(15), 10.5, 9 * k);
    g.fillTriangle(x - 5, up(17), x - 4.3, up(22), x - 1.5, up(18.5)).fillTriangle(x + 5, up(17), x + 4.3, up(22), x + 1.5, up(18.5));
    const wave = Math.sin(t * 5) * 1.5; // the lucky paw
    g.fillStyle(C.line, 1).fillEllipse(x + 6.5, up(16 + wave), 5.5, 7 * k);
    g.fillStyle(C.body, 1).fillEllipse(x + 6.5, up(16 + wave), 3.5, 5 * k);
    g.fillStyle(C.collar, 1).fillRect(x - 4.5, up(11.5), 9, 2 * k);
    g.fillStyle(C.coin, 1).fillEllipse(x, up(8), 5, 5 * k);
    g.fillStyle(C.line, 1).fillRect(x - 3, up(16), 1.5, 1.5 * k).fillRect(x + 1.5, up(16), 1.5, 1.5 * k);
  }

  /** Takes cat number `i`: pays for it, remembers it, and says so. */
  collectCat(i: number): void {
    const w = this.world, p = w.player, K = J.cats, c = this.cats[i];
    if (!c || c.found) return;
    c.found = true;
    try { localStorage.setItem(CATS_KEY, JSON.stringify({ found: this.cats.map((q, n) => (q.found ? n : -1)).filter((n) => n >= 0) })); } catch { /* saving is optional */ }
    const n = this.catsFound, max = this.cats.length;
    p.cash += K.reward;
    for (let j = 0; j < 6; j++) w.fx.puff(c.x, c.y - 8, j % 2 ? 0xfff2a0 : 0xe8b923, 4, 0.45, Math.cos(j * 1.05) * 70, Math.sin(j * 1.05) * 70 - 20, 0);
    w.fx.bark(p.pos, say(X.cats.found, { n, max, amount: yen(K.reward) }), '#e8b923');
    const bonus = n >= max ? K.allBonus : n % K.rewardEvery === 0 ? K.rewardBonus : 0;
    if (bonus) {
      p.cash += bonus;
      w.story.card = { title: say(n >= max ? X.cats.all : X.cats.milestone, { n, max }), sub: say(X.cats.bonus, { amount: yen(bonus) }), t: J.common.cardTime };
    }
    w.saveGame?.();
  }
}

/** Builds the side-job system. */
export function createSideJobs(world: WorldScene): SideJobs {
  return new CityJobs(world);
}
