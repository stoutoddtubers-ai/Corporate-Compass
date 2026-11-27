import * as Phaser from 'phaser';
import { Car } from '../entities/Car';
import { TRAFFIC } from '../data/ai';
import { VEHICLES, VehicleDef } from '../data/vehicles';
import { Junction, LaneSeg } from './CityMap';
import type { WorldScene } from '../scenes/WorldScene';

/**
 * AI traffic: cars follow the left-hand lanes, pick a turn at each junction, stop at
 * traffic lights, queue behind each other and panic at gunfire. Cars only exist in a
 * "bubble" around the player: they appear out of sight and are removed when far away.
 */
export class TrafficSystem {
  private spawnT = 0;
  /** During the K-Route race the ring is kept clear of traffic. */
  blockRing = false;
  private lamps: { r: Phaser.GameObjects.Rectangle; seg: LaneSeg }[] = [];
  private byId = new Map<number, Junction>();

  constructor(private world: WorldScene) {
    for (const j of world.map.junctions) this.byId.set(j.id, j);
    for (const s of world.map.lanes) {
      if (!this.byId.get(s.toJ)!.lit) continue;
      // a lamp on the kerb at each stop line (left side of the lane)
      const lx = s.bx - s.dx * TRAFFIC.stopBeforeLine + s.dy * 40, ly = s.by - s.dy * TRAFFIC.stopBeforeLine - s.dx * 40;
      world.add.rectangle(lx, ly, 12, 12, 0x111111).setDepth(31.9);
      this.lamps.push({ r: world.add.rectangle(lx, ly, 8, 8, 0xff0000).setDepth(32), seg: s });
    }
    for (let i = 0; i < TRAFFIC.count; i++) this.spawn(false);
  }

  /** 0 = north-south green, 1 = N-S yellow, 2 = all red, 3 = east-west green, 4 = E-W yellow, 5 = all red */
  phase(j: Junction): number {
    const L = TRAFFIC.light, half = L.green + L.yellow + L.allRed;
    const t = (this.world.time.now / 1000 + j.offset) % (half * 2), u = t % half;
    return (t >= half ? 3 : 0) + (u < L.green ? 0 : u < L.green + L.yellow ? 1 : 2);
  }

  canGo(j: Junction, axis: 'v' | 'h'): boolean {
    return this.phase(j) === (axis === 'v' ? 0 : 3);
  }

  get count(): number { return this.world.cars.reduce((n, c) => n + (c.driver === 'traffic' && !c.story ? 1 : 0), 0); }

  /** Put an AI-driven car on a lane. Story cars pass their own vehicle and stay out of the bubble rules. */
  addOnLane(def: VehicleDef, s: LaneSeg, k: number, colorIndex = -1): Car {
    const x = s.ax + s.dx * s.len * k, y = s.ay + s.dy * s.len * k;
    const car = this.world.addCar(def, x, y, Math.atan2(s.dy, s.dx), false, colorIndex);
    car.driver = 'traffic'; car.seg = s; car.crossing = false;
    car.vx = s.dx * TRAFFIC.cruiseSpeed * 0.6; car.vy = s.dy * TRAFFIC.cruiseSpeed * 0.6;
    return car;
  }

  spawn(offscreenOnly: boolean): void {
    const w = this.world, p = w.player.pos;
    for (let n = 0; n < 25; n++) {
      const s = Phaser.Utils.Array.GetRandom(w.map.lanes) as LaneSeg;
      if (this.blockRing && s.ring) continue;
      const k = 0.1 + Math.random() * 0.8;
      const x = s.ax + s.dx * s.len * k, y = s.ay + s.dy * s.len * k, d = Math.hypot(x - p.x, y - p.y);
      if (d > TRAFFIC.bubbleSpawn[1] || (offscreenOnly ? d < TRAFFIC.bubbleSpawn[0] || w.onScreen(x, y, 80) : d < 200)) continue;
      if (w.cars.some((c) => Math.hypot(c.x - x, c.y - y) < 110)) continue;
      this.addOnLane(Math.random() < TRAFFIC.sportsChance ? VEHICLES.sports : VEHICLES.sedan, s, k);
      return;
    }
  }

  /** Gunfire nearby: drivers floor it. */
  scare(x: number, y: number, radius: number): void {
    for (const c of this.world.cars) if (c.driver === 'traffic' && !c.story && Math.hypot(c.x - x, c.y - y) < radius) c.panic = TRAFFIC.panicTime;
  }

  update(dt: number): void {
    const w = this.world, p = w.player.pos;
    for (const l of this.lamps) {
      if (!w.onScreen(l.r.x, l.r.y, 40)) continue;
      const ph = this.phase(this.byId.get(l.seg.toJ)!), base = l.seg.axis === 'v' ? 0 : 3;
      l.r.setFillStyle(ph === base ? 0x35d05a : ph === base + 1 ? 0xf2c230 : 0xe03030);
    }
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = TRAFFIC.spawnInterval;
      if (this.count < TRAFFIC.count && w.cars.length < TRAFFIC.vehicleCap) this.spawn(true);
    }
    for (const c of w.cars) {
      if (c.driver !== 'traffic') continue;
      if (!c.story && (Math.hypot(c.x - p.x, c.y - p.y) > TRAFFIC.bubbleRemove || (this.blockRing && c.seg?.ring && !w.onScreen(c.x, c.y, 60)))) { c.destroy(); continue; } // left the bubble
      this.drive(c, dt);
    }
  }

  private drive(c: Car, dt: number): void {
    const w = this.world, inp = c.input;
    const s = c.seg!;
    c.panic = Math.max(0, c.panic - dt);
    let tx: number, ty: number, want: number = c.cruise || TRAFFIC.cruiseSpeed;

    if (c.crossing && c.nextSeg) {
      const n = c.nextSeg;
      tx = n.ax + n.dx * 30; ty = n.ay + n.dy * 30;
      want = Math.min(want, TRAFFIC.junctionSpeed);
      const along = (c.x - n.ax) * n.dx + (c.y - n.ay) * n.dy;
      if (along > 4 || Math.hypot(c.x - n.ax, c.y - n.ay) < 34) { c.seg = n; c.nextSeg = null; c.crossing = false; }
    } else {
      const along = (c.x - s.ax) * s.dx + (c.y - s.ay) * s.dy;
      const ahead = Math.min(s.len, along + 60);
      tx = s.ax + s.dx * ahead; ty = s.ay + s.dy * ahead;
      const left = s.len - along;
      if (left < 150) want = Math.min(want, TRAFFIC.junctionSpeed);
      const j = this.byId.get(s.toJ)!;
      const red = j.lit && !this.canGo(j, s.axis) && c.panic <= 0;
      if (red && left > TRAFFIC.stopBeforeLine - 14 && left < 170) want = left < TRAFFIC.stopBeforeLine + 6 ? 0 : Math.min(want, (left - TRAFFIC.stopBeforeLine) * 1.6 + 20);
      if (left <= 8 && want > 0) {
        // story cars follow their planned route; everyone else picks a turn at random
        const planned = c.route.length ? c.route.shift()! : null;
        c.nextSeg = planned && s.next.includes(planned) ? planned : (Phaser.Utils.Array.GetRandom(s.next) as LaneSeg);
        c.crossing = true;
      }
    }
    if (c.panic > 0) want *= TRAFFIC.panicMult;

    // don't drive into whatever is right in front (cars, people); creep through if stuck too long
    const fx = Math.cos(c.heading), fy = Math.sin(c.heading);
    let blocked = false;
    const sense = (ox: number, oy: number, pad: number) => {
      const dx = ox - c.x, dy = oy - c.y, f = dx * fx + dy * fy, side = Math.abs(-dx * fy + dy * fx);
      if (f > 0 && f < TRAFFIC.lookAhead + c.speed * 0.25 && side < pad) blocked = true;
    };
    for (const o of w.cars) if (o !== c && !o.removed && Math.abs(o.x - c.x) < 200 && Math.abs(o.y - c.y) < 200) sense(o.x, o.y, 26);
    if (c.panic <= 0) {
      for (const p of w.peds.list) if (p.alive) sense(p.x, p.y, 16);
      if (!w.player.car) sense(w.player.actor.x, w.player.actor.y, 16);
    }
    if (blocked) { c.waitT += dt; if (c.waitT < 5 || c.waitT > 6.5) want = 0; if (c.waitT > 6.5) c.waitT = 0; else if (c.waitT >= 5) want = 60; }
    else c.waitT = Math.max(0, c.waitT - dt * 2);

    const diff = Phaser.Math.Angle.Wrap(Math.atan2(ty - c.y, tx - c.x) - c.heading);
    inp.steer = Phaser.Math.Clamp(diff * 2.5, -1, 1);
    const v = c.forwardSpeed;
    inp.throttle = v < want ? (c.panic > 0 || want > 200 ? 1 : 0.6) : 0;
    inp.brake = v > want + 15 || want === 0;
    inp.handbrake = false; inp.nitro = false;
  }
}
