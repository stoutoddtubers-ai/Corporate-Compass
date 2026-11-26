import * as Phaser from 'phaser';
import { Car } from '../entities/Car';
import { TRAFFIC } from '../data/ai';
import { VEHICLES } from '../data/vehicles';
import { CENTER_JUNCTION, LaneSeg } from './CityMap';
import type { WorldScene } from '../scenes/WorldScene';

/**
 * AI traffic: cars follow the left-hand lanes, pick a turn at each junction,
 * stop for the one traffic light, queue behind each other and panic at gunfire.
 */
export class TrafficSystem {
  /** 0 = north-south green, 1 = N-S yellow, 2 = all red, 3 = east-west green, 4 = E-W yellow, 5 = all red */
  lightPhase = 0;
  private lightT: number = TRAFFIC.light.green;
  private spawnT = 0;
  private lamps: { r: Phaser.GameObjects.Rectangle; axis: 'v' | 'h' }[] = [];

  constructor(private world: WorldScene) {
    for (const s of world.map.lanes) {
      if (s.toJ !== CENTER_JUNCTION) continue;
      // a lamp on the kerb at each stop line (left side of the lane)
      const lx = s.bx - s.dx * TRAFFIC.stopBeforeLine + s.dy * 40, ly = s.by - s.dy * TRAFFIC.stopBeforeLine - s.dx * 40;
      world.add.rectangle(lx, ly, 12, 12, 0x111111).setDepth(31.9);
      this.lamps.push({ r: world.add.rectangle(lx, ly, 8, 8, 0xff0000).setDepth(32), axis: s.axis });
    }
    for (let i = 0; i < TRAFFIC.count; i++) this.spawn(false);
    this.paintLamps();
  }

  canGo(axis: 'v' | 'h'): boolean {
    return axis === 'v' ? this.lightPhase === 0 : this.lightPhase === 3;
  }

  private paintLamps(): void {
    for (const l of this.lamps) {
      const base = l.axis === 'v' ? 0 : 3;
      l.r.setFillStyle(this.lightPhase === base ? 0x35d05a : this.lightPhase === base + 1 ? 0xf2c230 : 0xe03030);
    }
  }

  get count(): number { return this.world.cars.reduce((n, c) => n + (c.driver === 'traffic' ? 1 : 0), 0); }

  spawn(offscreenOnly: boolean): void {
    const w = this.world;
    for (let n = 0; n < 12; n++) {
      const s = Phaser.Utils.Array.GetRandom(w.map.lanes) as LaneSeg;
      const k = offscreenOnly ? 0.1 : 0.15 + Math.random() * 0.7;
      const x = s.ax + s.dx * s.len * k, y = s.ay + s.dy * s.len * k;
      if (offscreenOnly && w.onScreen(x, y, 80)) continue;
      if (w.cars.some((c) => Math.hypot(c.x - x, c.y - y) < 110)) continue;
      const def = Math.random() < TRAFFIC.sportsChance ? VEHICLES.sports : VEHICLES.sedan;
      const car = w.addCar(def, x, y, Math.atan2(s.dy, s.dx));
      car.driver = 'traffic'; car.seg = s; car.crossing = false;
      car.vx = s.dx * TRAFFIC.cruiseSpeed * 0.6; car.vy = s.dy * TRAFFIC.cruiseSpeed * 0.6;
      return;
    }
  }

  /** Gunfire nearby: drivers floor it. */
  scare(x: number, y: number, radius: number): void {
    for (const c of this.world.cars) if (c.driver === 'traffic' && Math.hypot(c.x - x, c.y - y) < radius) c.panic = TRAFFIC.panicTime;
  }

  update(dt: number): void {
    const L = TRAFFIC.light;
    this.lightT -= dt;
    if (this.lightT <= 0) {
      this.lightPhase = (this.lightPhase + 1) % 6;
      this.lightT = this.lightPhase % 3 === 0 ? L.green : this.lightPhase % 3 === 1 ? L.yellow : L.allRed;
      this.paintLamps();
    }
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.count < TRAFFIC.count) { this.spawnT = TRAFFIC.spawnInterval; this.spawn(true); }
    for (const c of this.world.cars) if (c.driver === 'traffic') this.drive(c, dt);
  }

  private drive(c: Car, dt: number): void {
    const w = this.world, inp = c.input;
    const s = c.seg!;
    c.panic = Math.max(0, c.panic - dt);
    let tx: number, ty: number, want: number = TRAFFIC.cruiseSpeed;

    if (c.crossing && c.nextSeg) {
      const n = c.nextSeg;
      tx = n.ax + n.dx * 30; ty = n.ay + n.dy * 30;
      want = TRAFFIC.junctionSpeed;
      const along = (c.x - n.ax) * n.dx + (c.y - n.ay) * n.dy;
      if (along > 4 || Math.hypot(c.x - n.ax, c.y - n.ay) < 34) { c.seg = n; c.nextSeg = null; c.crossing = false; }
    } else {
      const along = (c.x - s.ax) * s.dx + (c.y - s.ay) * s.dy;
      const ahead = Math.min(s.len, along + 60);
      tx = s.ax + s.dx * ahead; ty = s.ay + s.dy * ahead;
      const left = s.len - along;
      if (left < 150) want = TRAFFIC.junctionSpeed;
      const red = s.toJ === CENTER_JUNCTION && !this.canGo(s.axis) && c.panic <= 0;
      if (red && left > TRAFFIC.stopBeforeLine - 14 && left < 170) want = left < TRAFFIC.stopBeforeLine + 6 ? 0 : Math.min(want, (left - TRAFFIC.stopBeforeLine) * 1.6 + 20);
      if (left <= 8 && want > 0) { c.nextSeg = Phaser.Utils.Array.GetRandom(s.next) as LaneSeg; c.crossing = true; }
    }
    if (c.panic > 0) want *= TRAFFIC.panicMult;

    // don't drive into whatever is right in front (cars, people); creep through if stuck too long
    const fx = Math.cos(c.heading), fy = Math.sin(c.heading);
    let blocked = false;
    const sense = (ox: number, oy: number, pad: number) => {
      const dx = ox - c.x, dy = oy - c.y, f = dx * fx + dy * fy, side = Math.abs(-dx * fy + dy * fx);
      if (f > 0 && f < TRAFFIC.lookAhead + c.speed * 0.25 && side < pad) blocked = true;
    };
    for (const o of w.cars) if (o !== c && !o.removed) sense(o.x, o.y, 26);
    if (c.panic <= 0) {
      for (const p of w.peds.list) if (p.alive) sense(p.x, p.y, 16);
      if (!w.player.car) sense(w.player.actor.x, w.player.actor.y, 16);
    }
    if (blocked) { c.waitT += dt; if (c.waitT < 5 || c.waitT > 6.5) want = 0; if (c.waitT > 6.5) c.waitT = 0; else if (c.waitT >= 5) want = 60; }
    else c.waitT = Math.max(0, c.waitT - dt * 2);

    const diff = Phaser.Math.Angle.Wrap(Math.atan2(ty - c.y, tx - c.x) - c.heading);
    inp.steer = Phaser.Math.Clamp(diff * 2.5, -1, 1);
    const v = c.forwardSpeed;
    inp.throttle = v < want ? (c.panic > 0 ? 1 : 0.6) : 0;
    inp.brake = v > want + 15 || want === 0;
    inp.handbrake = false; inp.nitro = false;
  }
}
