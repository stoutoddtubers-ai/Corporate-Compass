import * as Phaser from 'phaser';
import { Actor } from '../entities/Actor';
import { Car } from '../entities/Car';
import { HEAT } from '../data/heat';
import { WEAPONS } from '../data/weapons';
import { VEHICLES } from '../data/vehicles';
import { MAP } from '../data/map';
import { BARKS, DISTRICT, pick } from '../data/strings';
import { TILE_SIZE, MAP_TILES_W, MAP_TILES_H } from '../data/config';
import type { WorldScene } from '../scenes/WorldScene';

/**
 * The police response for each Heat level:
 *  1 lantern: officers on foot who try to grab (arrest) you
 *  2 lanterns: patrol cars; officers draw pistols
 *  3 lanterns: more cars and a roadblock
 */
export class PoliceSystem {
  cops: Actor[] = [];
  private footField = new Int16Array(MAP_TILES_W * MAP_TILES_H);
  private carField = new Int16Array(MAP_TILES_W * MAP_TILES_H);
  private fieldT = 0;
  private spawnT = 0;
  private roadblockT = 0;
  private arrestT = 0;
  private sees = false;

  constructor(private world: WorldScene) {}

  anyoneSees(): boolean { return this.sees; }
  get aliveCount(): number { return this.cops.reduce((n, a) => n + (a.alive ? 1 : 0), 0); }
  get policeCars(): Car[] { return this.world.cars.filter((c) => c.isPolice && !c.wreck && !c.removed); }

  private canSee(x: number, y: number): boolean {
    const p = this.world.player.pos;
    return Math.hypot(p.x - x, p.y - y) < HEAT.cop.visionRange && this.world.map.los(x, y, p.x, p.y);
  }

  barkAny(text: string): void {
    const c = this.cops.find((a) => a.alive && this.world.onScreen(a.x, a.y, 0));
    if (c) this.world.fx.bark(c.sprite, text, '#9cc0ff', 'cop', 1);
  }

  private levelBark(from: { x: number; y: number }): void {
    const line = pick(BARKS.police[this.world.heat.level] ?? BARKS.police[1]).replace('{district}', DISTRICT.name);
    this.world.fx.bark(from, line, '#9cc0ff', 'cop', 3.5);
  }

  spawnCopAt(p: { x: number; y: number }, footPatrol: boolean): Actor {
    const a = new Actor(this.world, 'cop', p.x, p.y, 'cop', HEAT.cop.hp);
    a.data.foot = footPatrol;
    a.state = 'chase'; a.timer = 0.5 + Math.random() * 0.5;
    this.cops.push(a);
    return a;
  }

  private spawnFoot(): void {
    const w = this.world, p = w.player.pos;
    const box = { x: MAP.policeBox.spawn[0] * TILE_SIZE, y: MAP.policeBox.spawn[1] * TILE_SIZE };
    if (!w.onScreen(box.x, box.y, 40)) { this.spawnCopAt(box, true); return; }
    for (let n = 0; n < 40; n++) {
      const c = w.map.randomWalkPoint();
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (!w.onScreen(c.x, c.y, 40) && d > HEAT.spawnMinDist * 0.7 && d < 1100) { this.spawnCopAt(c, true); return; }
    }
  }

  private spawnCar(): void {
    const w = this.world, p = w.player.pos;
    for (let n = 0; n < 30; n++) {
      const s = Phaser.Utils.Array.GetRandom(w.map.lanes);
      const x = s.ax + s.dx * 40, y = s.ay + s.dy * 40;
      if (w.onScreen(x, y, 80) || Math.hypot(x - p.x, y - p.y) < HEAT.spawnMinDist) continue;
      if (w.cars.some((c) => Math.hypot(c.x - x, c.y - y) < 110)) continue;
      const car = w.addCar(VEHICLES.police, x, y, Math.atan2(s.dy, s.dx), true);
      car.driver = 'cop'; car.vx = s.dx * 150; car.vy = s.dy * 150;
      return;
    }
  }

  /** Two police cars parked across a road somewhere ahead of the player, with two officers. */
  private placeRoadblock(): boolean {
    const w = this.world, p = w.player.pos, pc = w.player.car;
    let best: { x: number; y: number; dx: number; dy: number } | null = null, bestScore = -1e9;
    for (const s of w.map.lanes) for (const k of [0.3, 0.5, 0.7]) {
      const x = s.ax + s.dx * s.len * k, y = s.ay + s.dy * s.len * k;
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < HEAT.roadblockDist[0] || d > HEAT.roadblockDist[1] || w.onScreen(x, y, 120)) continue;
      if (w.cars.some((c) => Math.hypot(c.x - x, c.y - y) < 150)) continue;
      let score = Math.random() * 0.4;
      if (pc && pc.speed > 60) score += ((x - p.x) * pc.vx + (y - p.y) * pc.vy) / (d * pc.speed);
      if (score > bestScore) { bestScore = score; best = { x, y, dx: s.dx, dy: s.dy }; }
    }
    if (!best) return false;
    // the centre line of the road is on the driver's right (we drive on the left)
    const rx = -best.dy, ry = best.dx;
    const cx = best.x + rx * 32, cy = best.y + ry * 32;
    for (const side of [-1, 1]) {
      const car = w.addCar(VEHICLES.police, cx + rx * 27 * side, cy + ry * 27 * side, Math.atan2(ry, rx), true);
      car.roadblock = true;
      const cop = this.spawnCopAt({ x: cx + rx * 40 * side + best.dx * 34, y: cy + ry * 40 * side + best.dy * 34 }, false);
      cop.state = 'guard';
    }
    return true;
  }

  /** Called when Heat is cleared, or the player dies / is arrested: everyone goes home. */
  standDown(removeAll: boolean): void {
    for (const a of this.cops) if (a.alive) { a.state = 'leave'; a.timer = removeAll ? 0 : 5; }
    for (const c of this.world.cars) {
      if (!c.isPolice || c === this.world.player.car) continue;
      if (c.driver === 'cop') c.driver = 'none';
      c.roadblock = false;
      if (removeAll && !c.wreck) c.destroy();
    }
  }

  update(dt: number): void {
    const w = this.world, heat = w.heat, lvl = heat.level, p = w.player.pos;

    // corpses fade out; officers who are leaving walk off
    for (let i = this.cops.length - 1; i >= 0; i--) {
      const a = this.cops[i];
      if (a.alive && a.state !== 'leave') continue;
      a.timer -= dt;
      if (a.alive) a.body.setVelocity(0, 0);
      if (a.timer <= 0 || (a.alive && !w.onScreen(a.x, a.y, 30))) { a.destroy(); this.cops.splice(i, 1); }
    }

    this.sees = false;
    if (lvl === 0) {
      // tidy away empty police cars the player can't see
      for (const c of w.cars) if (c.isPolice && c.driver === 'none' && !c.wreck && !w.onScreen(c.x, c.y, 200) && c.age > 20) c.destroy();
      this.arrestT = 0;
      return;
    }
    const resp = HEAT.response[lvl];
    const target = heat.seen ? p : heat.lastKnown;

    this.fieldT -= dt;
    if (this.fieldT <= 0) {
      this.fieldT = 0.4;
      w.map.flow(target.x, target.y, false, this.footField);
      w.map.flow(target.x, target.y, true, this.carField);
    }

    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = HEAT.spawnInterval;
      const foot = this.cops.reduce((n, a) => n + (a.alive && a.data.foot ? 1 : 0), 0);
      const cars = w.cars.reduce((n, c) => n + (c.driver === 'cop' ? 1 : 0), 0);
      if (foot < resp.foot) this.spawnFoot();
      if (cars < resp.cars && this.policeCars.length < HEAT.maxPoliceCars) this.spawnCar();
    }
    if (resp.roadblock) {
      this.roadblockT -= dt;
      if (this.roadblockT <= 0) {
        for (const c of w.cars) if (c.isPolice && c.roadblock && c.driver === 'none' && !w.onScreen(c.x, c.y, 300) && c.age > 25) c.destroy();
        this.roadblockT = this.policeCars.length + 2 <= HEAT.maxPoliceCars + 2 && this.placeRoadblock() ? HEAT.roadblockInterval : 2;
      }
    } else this.roadblockT = 0;

    let touching = false;
    const onFoot = !w.player.car;
    for (const a of this.cops) {
      if (!a.alive || a.state === 'leave') continue;
      a.carHitCooldown -= dt;
      if (a.stun > 0) { a.stun -= dt; a.body.setVelocity(0, 0); continue; }
      const d = Math.hypot(p.x - a.x, p.y - a.y);
      const sees = this.canSee(a.x, a.y);
      if (sees) this.sees = true;
      if (a.state === 'guard') {
        if (!sees) { a.body.setVelocity(0, 0); continue; }
        a.state = 'chase';
        w.fx.bark(a.sprite, BARKS.roadblock, '#9cc0ff', 'cop', 3.5);
      }
      if (sees) {
        this.levelBark(a.sprite);
        const ang = Math.atan2(p.y - a.y, p.x - a.x);
        if (resp.armed && d < HEAT.cop.fireRange) {
          a.timer -= dt;
          if (a.timer <= 0) {
            a.timer = HEAT.cop.fireInterval * (0.8 + Math.random() * 0.4);
            const err = Phaser.Math.DegToRad((Math.random() * 2 - 1) * HEAT.cop.aimError);
            w.projectiles.fire(a.x + Math.cos(ang) * 12, a.y + Math.sin(ang) * 12, ang + err, WEAPONS[HEAT.cop.weapon], 'cop');
          }
        }
        if (!onFoot && resp.armed && d < HEAT.cop.fireRange * 0.8) a.body.setVelocity(0, 0); // stand and shoot at the car
        else a.moveTo(p.x, p.y, HEAT.cop.speed);
        a.sprite.rotation = ang;
      } else if (Math.hypot(target.x - a.x, target.y - a.y) < 60) {
        // reached the last known position: sweep around
        a.data.wander = ((a.data.wander as number) || 0) - dt;
        if ((a.data.wander as number) <= 0 || a.body.blocked.none === false) {
          a.data.wander = 1 + Math.random() * 1.5;
          const r = Math.random() * Math.PI * 2;
          a.setVelocity(Math.cos(r) * HEAT.cop.speed * 0.6, Math.sin(r) * HEAT.cop.speed * 0.6);
        }
      } else {
        const step = w.map.flowStep(this.footField, a.x, a.y);
        if (step) a.moveTo(step.x, step.y, HEAT.cop.speed); else a.body.setVelocity(0, 0);
      }
      // close enough to grab the player?
      if (onFoot ? d < HEAT.cop.arrestRange : w.player.car!.speed < 30 && w.player.car!.contains(a.x, a.y, 16)) touching = true;
    }
    for (const c of w.cars) if (c.driver === 'cop') this.drive(c, dt, target);

    // arrest: an officer holds on to you for a moment
    if (touching && !w.player.rolling) this.arrestT += dt; else this.arrestT = Math.max(0, this.arrestT - dt * 2);
    if (this.arrestT >= HEAT.cop.arrestTime) { this.arrestT = 0; w.arrest(); }
  }

  get arrestProgress(): number { return this.arrestT / HEAT.cop.arrestTime; }

  private drive(c: Car, dt: number, target: { x: number; y: number }): void {
    const w = this.world, p = w.player.pos, inp = c.input;
    inp.nitro = false; inp.brake = false; inp.handbrake = false;
    if (c.reverseT > 0) { // backing out after getting stuck (c.panic holds the steering direction)
      c.reverseT -= dt; inp.throttle = -1; inp.steer = c.panic;
      return;
    }
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    const sees = this.canSee(c.x, c.y);
    if (sees) { this.sees = true; this.levelBark(c); }
    const onFoot = !w.player.car;
    if (onFoot && ((sees && d < 170 && c.speed < 140) || d < 80)) {
      c.driver = 'none';
      this.spawnCopAt(w.sidePoint(c, 1), false);
      return;
    }
    let tx = target.x, ty = target.y;
    if (sees && d < 340) {
      const pc = w.player.car;
      tx = p.x + (pc ? pc.vx * 0.3 : 0); ty = p.y + (pc ? pc.vy * 0.3 : 0);
    } else {
      const step = w.map.flowStep(this.carField, c.x, c.y, 3);
      if (step) { tx = step.x; ty = step.y; }
    }
    const diff = Phaser.Math.Angle.Wrap(Math.atan2(ty - c.y, tx - c.x) - c.heading);
    const sharp = Math.abs(diff) > 1.0;
    inp.steer = Phaser.Math.Clamp(diff * 2.5, -1, 1);
    inp.throttle = sharp ? 0.5 : 1;
    inp.handbrake = sharp && c.speed > 220;
    if (c.speed < 14) c.stuck += dt; else c.stuck = 0;
    if (c.stuck > 1.0) { c.stuck = 0; c.reverseT = 0.9; c.panic = diff > 0 ? -1 : 1; }
  }
}
