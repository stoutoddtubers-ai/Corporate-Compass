import { Actor } from '../entities/Actor';
import { PEDS } from '../data/ai';
import { Tile } from './CityMap';
import type { WorldScene } from '../scenes/WorldScene';

/** Pedestrians: they wander the sidewalks, and run from gunfire. */
export class PedSystem {
  list: Actor[] = [];
  private respawnT = 0;

  constructor(private world: WorldScene) {
    for (let i = 0; i < PEDS.count; i++) this.spawn(false);
  }

  get aliveCount(): number { return this.list.reduce((n, a) => n + (a.alive ? 1 : 0), 0); }

  spawn(offscreenOnly: boolean, at?: { x: number; y: number }): Actor | null {
    let p = at;
    for (let n = 0; !p && n < 20; n++) {
      const c = this.world.map.randomWalkPoint();
      if (!offscreenOnly || !this.world.onScreen(c.x, c.y, 60)) p = c;
    }
    if (!p) return null;
    const arch = Math.floor(Math.random() * PEDS.archetypes.length);
    const a = new Actor(this.world, 'ped', p.x, p.y, PEDS.archetypes[arch].color, PEDS.hp);
    a.data.arch = arch;
    a.state = 'wander'; a.timer = 0;
    this.list.push(a);
    return a;
  }

  /** Everyone who hears this runs away from it. */
  scare(x: number, y: number, radius: number): void {
    for (const a of this.list) {
      if (!a.alive) continue;
      const d = Math.hypot(a.x - x, a.y - y);
      if (d > radius) continue;
      const first = a.state !== 'flee';
      a.state = 'flee'; a.timer = PEDS.fleeTime; a.tx = x; a.ty = y;
      if (first && Math.random() < 0.5) {
        const arch = PEDS.archetypes[a.data.arch as number];
        this.world.fx.bark(a.sprite, Math.random() < 0.7 ? arch.panic : arch.react, '#ffd9d9', 'pedbark', 0.6);
      }
    }
  }

  update(dt: number): void {
    const w = this.world;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const a = this.list[i];
      if (!a.alive) {
        a.timer -= dt;
        if (a.timer <= 0) { a.destroy(); this.list.splice(i, 1); }
        continue;
      }
      a.carHitCooldown -= dt;
      if (a.stun > 0) { a.stun -= dt; a.body.setVelocity(0, 0); continue; }
      if (a.state === 'flee') {
        a.timer -= dt;
        let dx = a.x - a.tx, dy = a.y - a.ty;
        const d = Math.hypot(dx, dy) || 1;
        dx /= d; dy /= d;
        // if running straight into a wall, slide sideways instead
        if (a.body.blocked.left || a.body.blocked.right) { dx = 0; dy = dy >= 0 ? 1 : -1; }
        else if (a.body.blocked.up || a.body.blocked.down) { dy = 0; dx = dx >= 0 ? 1 : -1; }
        a.setVelocity(dx * PEDS.fleeSpeed, dy * PEDS.fleeSpeed);
        if (a.timer <= 0) { a.state = 'wander'; a.timer = 0; }
        continue;
      }
      // wander: walk to a nearby spot, pause, repeat
      a.timer -= dt;
      if (a.state === 'wander') {
        const blocked = a.body.blocked.none === false;
        if (a.timer <= 0 || blocked) {
          for (let n = 0; n < 8; n++) {
            const ang = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 220;
            const tx = a.x + Math.cos(ang) * dist, ty = a.y + Math.sin(ang) * dist;
            const road = (x: number, y: number) => w.map.tileAt(x, y) === Tile.Road;
            // stay off the road: the target and the halfway point must be sidewalk, crossing or car park
            if (!w.map.isSolid(tx, ty) && !road(tx, ty) && !road((a.x + tx) / 2, (a.y + ty) / 2) && w.map.los(a.x, a.y, tx, ty)) { a.tx = tx; a.ty = ty; break; }
          }
          a.timer = 3 + Math.random() * 5; a.state = 'walk';
        } else a.body.setVelocity(0, 0);
      } else if (a.moveTo(a.tx, a.ty, PEDS.walkSpeed) < 6 || a.timer <= 0 || a.body.blocked.none === false) {
        a.state = 'wander'; a.timer = Math.random() * 2.5;
      }
      if (Math.random() < PEDS.calmBarkChance * dt * 60 && w.onScreen(a.x, a.y, 0) && w.heat.level === 0)
        w.fx.bark(a.sprite, PEDS.archetypes[a.data.arch as number].calm, '#d9e2ff', 'pedcalm', 6);
    }
    this.respawnT -= dt;
    if (this.aliveCount < PEDS.count && this.respawnT <= 0) { this.respawnT = PEDS.respawnDelay; this.spawn(true); }
  }
}
