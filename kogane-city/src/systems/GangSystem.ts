import * as Phaser from 'phaser';
import { Actor } from '../entities/Actor';
import { Car } from '../entities/Car';
import { VehicleDef } from '../data/vehicles';
import { MISSION_TUNING } from '../data/missions';
import { WEAPONS } from '../data/weapons';
import { MAP_TILES_W, MAP_TILES_H } from '../data/config';
import type { WorldScene } from '../scenes/WorldScene';

/**
 * Gang enemies used by missions: thugs on foot who punch, and riders/drivers who chase and ram.
 * Hurting them is not a crime (the police don't care about gangsters).
 */
export class GangSystem {
  thugs: Actor[] = [];
  chasers: Car[] = [];
  private field = new Int16Array(MAP_TILES_W * MAP_TILES_H);
  private fieldT = 0;

  constructor(private world: WorldScene) {}

  spawnThug(x: number, y: number, look: string, state: 'wait' | 'guard' | 'chase' | 'smash' | 'idle', hp = 60): Actor {
    const a = new Actor(this.world, 'thug', x, y, look, hp);
    a.state = state; a.timer = 0.6;
    this.thugs.push(a);
    return a;
  }

  spawnChaser(def: VehicleDef, x: number, y: number, heading: number, color = 0): Car {
    const c = this.world.addCar(def, x, y, heading, false, color);
    c.driver = 'gang';
    this.chasers.push(c);
    return c;
  }

  /** Thugs still in the fight (not dead, not run away). */
  get activeThugs(): number { return this.thugs.reduce((n, a) => n + (a.alive && a.state !== 'flee' ? 1 : 0), 0); }
  /** Thugs a bullet can hit are also tracked by the 20-hostile budget. */
  get count(): number { return this.thugs.reduce((n, a) => n + (a.alive ? 1 : 0), 0) + this.activeChasers.length; }
  get activeChasers(): Car[] { return this.chasers.filter((c) => !c.wreck && !c.removed && c.driver === 'gang'); }

  clear(): void {
    for (const a of this.thugs) a.destroy();
    for (const c of this.chasers) if (!c.removed && c !== this.world.player.car) c.destroy();
    this.thugs = []; this.chasers = [];
  }

  update(dt: number): void {
    const w = this.world, p = w.player.pos;
    for (let i = this.thugs.length - 1; i >= 0; i--) {
      const a = this.thugs[i];
      const d = Math.hypot(p.x - a.x, p.y - a.y);
      if (!a.alive) { a.timer -= dt; if (a.timer <= 0) { a.destroy(); this.thugs.splice(i, 1); } continue; }
      a.carHitCooldown -= dt;
      if (a.stun > 0) {
        a.stun -= dt; a.body.setVelocity(0, 0);
        if (a.data.downBark && !a.data.saidDown) { a.data.saidDown = true; w.fx.bark(a.sprite, a.data.downBark as string, '#ff9a9a'); }
        continue;
      }
      if (a.state === 'idle') { a.body.setVelocity(0, 0); continue; } // hanging around their turf
      if (a.state === 'wait') { a.body.setVelocity(0, 0); a.sprite.rotation = Math.atan2(p.y - a.y, p.x - a.x); continue; }
      if (a.state === 'guard') { a.body.setVelocity(0, 0); if (d < 120) a.state = 'chase'; continue; }
      if (a.state === 'chase' && a.data.fleeAt && a.hp <= (a.data.fleeAt as number)) {
        a.state = 'flee';
        if (a.data.fleeBark) w.fx.bark(a.sprite, a.data.fleeBark as string, '#ff9a9a');
      }
      if (a.state === 'flee') {
        let dx = (a.x - p.x) / (d || 1), dy = (a.y - p.y) / (d || 1);
        if (a.body.blocked.left || a.body.blocked.right) { dx = 0; dy = dy >= 0 ? 1 : -1; }
        else if (a.body.blocked.up || a.body.blocked.down) { dy = 0; dx = dx >= 0 ? 1 : -1; }
        a.setVelocity(dx * 150, dy * 150);
        if (d > 420 && !w.onScreen(a.x, a.y, 20)) { a.destroy(); this.thugs.splice(i, 1); }
        continue;
      }
      if (a.state === 'smash') { // go and wreck a shop front (mission 6); a.data.shop says which
        if (a.moveTo(a.tx, a.ty, 120) < 26) { a.body.setVelocity(0, 0); a.timer -= dt; if (a.timer <= 0) { a.timer = 1; a.data.hit = ((a.data.hit as number) || 0) + 1; w.fx.spark(a.tx, a.ty, 0xffe08a); } }
        continue;
      }
      if (a.data.gun) { // armed guard: keep some distance and shoot
        const sees = d < 320 && w.map.los(a.x, a.y, p.x, p.y);
        if (sees && d < 170) a.body.setVelocity(0, 0);
        else if (sees) a.moveTo(p.x, p.y, 110);
        else { const st = w.map.flowStep(this.field, a.x, a.y); if (st) a.moveTo(st.x, st.y, 110); }
        a.timer -= dt;
        if (sees) {
          const ang = Math.atan2(p.y - a.y, p.x - a.x);
          a.sprite.rotation = ang;
          if (a.timer <= 0) {
            a.timer = ((a.data.rate as number) || 0.8) + Math.random() * 0.4 * ((a.data.rate as number) ? 0.3 : 1);
            w.projectiles.fire(a.x + Math.cos(ang) * 12, a.y + Math.sin(ang) * 12, ang + (Math.random() - 0.5) * 0.28, WEAPONS.kitsune9, 'cop');
            if (a.data.bark) w.fx.bark(a.sprite, a.data.bark as string, '#ffd0a0', 'guard', 3);
          }
        }
        continue;
      }
      // chase and punch
      if (d > 20) {
        if (w.map.los(a.x, a.y, p.x, p.y)) a.moveTo(p.x, p.y, 128);
        else { const st = w.map.flowStep(this.field, a.x, a.y); if (st) a.moveTo(st.x, st.y, 128); }
      } else a.body.setVelocity(0, 0);
      a.timer -= dt;
      if (d < 26 && a.timer <= 0 && !w.player.car) {
        a.timer = MISSION_TUNING.thugAttackGap;
        a.punch();
        w.player.takeDamage(MISSION_TUNING.thugDamage, false);
        w.fx.spark(p.x, p.y, 0xffffff);
      }
    }

    const chasing = this.activeChasers;
    if (chasing.length || this.thugs.length) {
      this.fieldT -= dt;
      if (this.fieldT <= 0) { this.fieldT = 0.4; w.map.flow(p.x, p.y, chasing.length > 0, this.field); }
    }
    for (const c of chasing) {
      const inp = c.input;
      inp.nitro = false; inp.brake = false; inp.handbrake = false;
      if (c.reverseT > 0) { c.reverseT -= dt; inp.throttle = -1; inp.steer = c.panic; continue; }
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      let tx = p.x, ty = p.y;
      if (!(d < 340 && w.map.los(c.x, c.y, p.x, p.y))) { const st = w.map.flowStep(this.field, c.x, c.y, 3); if (st) { tx = st.x; ty = st.y; } }
      else if (w.player.car) { tx += w.player.car.vx * 0.3; ty += w.player.car.vy * 0.3; }
      const diff = Phaser.Math.Angle.Wrap(Math.atan2(ty - c.y, tx - c.x) - c.heading);
      inp.steer = Phaser.Math.Clamp(diff * 2.5, -1, 1);
      inp.throttle = Math.abs(diff) > 1 ? 0.5 : 1;
      if (c.speed < 14) c.stuck += dt; else c.stuck = 0;
      if (c.stuck > 1) { c.stuck = 0; c.reverseT = 0.9; c.panic = diff > 0 ? -1 : 1; }
      if (c.data_bark && d < 260) w.fx.bark(c, c.data_bark, '#d9a0ff', 'raijin', 4);
    }
  }
}
