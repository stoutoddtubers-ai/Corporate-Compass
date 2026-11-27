import * as Phaser from 'phaser';
import { WeaponDef, MAX_PROJECTILES } from '../data/weapons';
import type { WorldScene } from '../scenes/WorldScene';
import type { Actor } from '../entities/Actor';
import type { Car } from '../entities/Car';

interface Bullet {
  img: Phaser.GameObjects.Image;
  x: number; y: number; vx: number; vy: number;
  left: number; dmg: number; owner: 'player' | 'cop'; active: boolean; skip: Car | null;
}

/**
 * Bullets are real moving objects with tracers, not instant hits.
 * Each frame every bullet is swept along its path so fast shots can't skip through people.
 */
export class Projectiles {
  /** Every bullet, flying or not (the 3D view draws the flying ones). */
  readonly pool: Bullet[] = [];
  active = 0;

  constructor(private world: WorldScene) {}

  fire(x: number, y: number, angle: number, def: WeaponDef, owner: 'player' | 'cop', skip: Car | null = null): void {
    let b = this.pool.find((q) => !q.active);
    if (!b) {
      if (this.pool.length >= MAX_PROJECTILES) return;
      b = { img: this.world.add.image(0, 0, 'bullet').setDepth(32), x: 0, y: 0, vx: 0, vy: 0, left: 0, dmg: 0, owner, active: false, skip: null };
      this.pool.push(b);
    }
    b.x = x; b.y = y;
    b.vx = Math.cos(angle) * def.bulletSpeed; b.vy = Math.sin(angle) * def.bulletSpeed;
    b.left = def.range; b.dmg = def.damage; b.owner = owner; b.active = true; b.skip = skip;
    b.img.setPosition(x, y).setRotation(angle).setVisible(true).setTint(owner === 'player' ? 0xfff0a0 : 0xff9a9a);
  }

  private end(b: Bullet, spark: boolean): void {
    b.active = false;
    b.img.setVisible(false);
    if (spark) this.world.fx.spark(b.x, b.y);
  }

  update(dt: number): void {
    const w = this.world;
    this.active = 0;
    for (const b of this.pool) {
      if (!b.active) continue;
      this.active++;
      const step = Math.hypot(b.vx, b.vy) * dt;
      const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;

      // walls (check the middle and the end of this frame's travel)
      if (w.map.isWall((b.x + nx) / 2, (b.y + ny) / 2) || w.map.isWall(nx, ny)) { b.x = nx; b.y = ny; this.end(b, true); continue; }

      // people
      let hit: Actor | null = null, best = 1e9;
      const test = (a: Actor) => {
        if (!a.alive) return;
        const dx = a.x - b.x, dy = a.y - b.y;
        const along = Phaser.Math.Clamp((dx * b.vx + dy * b.vy) / (step / dt * step), 0, 1); // 0..1 along this frame's path
        const cx = b.x + (nx - b.x) * along, cy = b.y + (ny - b.y) * along;
        if ((a.x - cx) ** 2 + (a.y - cy) ** 2 < 81 && along < best) { best = along; hit = a; }
      };
      if (b.owner === 'player') { for (const a of w.npcs()) test(a); }
      else if (!w.player.car && !w.player.invulnerable) test(w.player.actor);

      // cars
      let carHit: Car | null = null;
      for (const c of w.cars) {
        if (c === b.skip || c.removed) continue;
        if (c.contains(nx, ny) || c.contains((b.x + nx) / 2, (b.y + ny) / 2)) { carHit = c; break; }
      }

      if (hit) {
        b.x = nx; b.y = ny;
        w.hurtActor(hit, b.dmg, b.owner === 'player', 'bullet');
        this.end(b, false);
        w.fx.spark(b.x, b.y, 0xd8343a);
        continue;
      }
      if (carHit) {
        b.x = nx; b.y = ny;
        carHit.damage(b.dmg, b.owner === 'player');
        if (b.owner === 'player' && carHit.driver === 'cop') w.heat.crime('hitOfficer');
        this.end(b, true);
        continue;
      }
      b.x = nx; b.y = ny; b.left -= step;
      if (b.left <= 0) { this.end(b, false); continue; }
      b.img.setPosition(b.x, b.y);
    }
  }
}
