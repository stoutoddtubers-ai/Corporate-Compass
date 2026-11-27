import { TURF, FACTIONS } from '../data/turf';
import { DISTRICTS } from '../data/map';
import { VEHICLES, BLACK_SEDAN } from '../data/vehicles';
import type { Block } from './CityMap';
import type { Actor } from '../entities/Actor';
import type { WorldScene } from '../scenes/WorldScene';

const SAVE_KEY = 'kogane.turf.v1';

/**
 * Turf: every city block is a zone owned by a faction. Kill 5 of the owners inside
 * their zone to start a turf war, survive 3 waves (grunts, a car squad, a lieutenant)
 * and the zone turns gold. Owned zones pay income each in-game day, collected at home.
 */
export class TurfSystem {
  owners: Record<string, string> = {};
  /** What to show under the lanterns while a turf war is on. */
  objective = '';
  /** Income waiting to be collected at the safehouse. */
  pending = 0;
  private kills: Record<string, number> = {};
  private war: { zone: Block; wave: number; away: number } | null = null;
  private dayT = 0;
  private tick = 0;

  constructor(private world: WorldScene) {
    let saved: { owners?: Record<string, string>; pending?: number } = {};
    try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}'); } catch { /* saving is optional */ }
    for (const b of world.map.blocks) this.owners[b.id] = saved.owners?.[b.id] ?? TURF.startOwner[b.district];
    this.pending = saved.pending ?? 0;
  }

  private save(): void {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ owners: this.owners, pending: this.pending })); } catch { /* saving is optional */ }
  }

  name(b: Block): string {
    if (TURF.names[b.id]) return TURF.names[b.id];
    const same = this.world.map.blocks.filter((o) => o.district === b.district);
    return `${DISTRICTS[b.district].name} ${same.indexOf(b) + 1}`;
  }

  /** How much a zone pays per day: fixed per zone, inside the bible's range. */
  private value(b: Block): number {
    const i = this.world.map.blocks.indexOf(b);
    return TURF.income[0] + ((i * 37) % 9) * ((TURF.income[1] - TURF.income[0]) / 8);
  }

  zoneAt(x: number, y: number, margin = 80): Block | null {
    for (const b of this.world.map.blocks) if (x > b.x - margin && x < b.x + b.w + margin && y > b.y - margin && y < b.y + b.h + margin) return b;
    return null;
  }

  get ownedCount(): number { return Object.values(this.owners).filter((o) => o === 'jun').length; }

  /** Called when a gang member dies. Enough kills in their own zone starts a turf war. */
  onThugKilled(a: Actor): void {
    const id = a.data.turf as string | undefined;
    if (!id || this.war || this.owners[id] === 'jun') return;
    this.kills[id] = (this.kills[id] ?? 0) + 1;
    if (this.kills[id] >= TURF.killsToProvoke) {
      this.war = { zone: this.world.map.blocks.find((b) => b.id === id)!, wave: 1, away: 0 };
      this.spawnWave();
    }
  }

  /** Dying, being arrested or starting a mission ends any turf war. */
  abort(): void {
    this.war = null; this.kills = {}; this.objective = '';
  }

  private spot(z: Block): { x: number; y: number } {
    const w = this.world;
    for (let n = 0; n < 40; n++) {
      const x = z.x + Math.random() * z.w, y = z.y + Math.random() * z.h;
      if (!w.map.isSolid(x, y) && !w.map.isSolid(x + 10, y) && !w.map.isSolid(x - 10, y) && !w.map.isSolid(x, y + 10) && !w.map.isSolid(x, y - 10) && (n > 25 || !w.onScreen(x, y, 20))) return { x, y };
    }
    return { x: z.x - 16, y: z.y - 16 };
  }

  private member(z: Block, state: 'idle' | 'chase', gun: boolean, hp = 60): Actor {
    const f = FACTIONS[this.owners[z.id]], p = this.spot(z);
    const a = this.world.gang.spawnThug(p.x, p.y, f.look, state, hp);
    a.data.turf = z.id; a.data.gun = gun;
    return a;
  }

  private spawnWave(): void {
    const w = this.world, war = this.war!, z = war.zone, f = FACTIONS[this.owners[z.id]];
    if (war.wave === 1) for (let i = 0; i < TURF.waveGrunts; i++) this.member(z, 'chase', false);
    else if (war.wave === 2) { // a car squad
      for (let i = 0; i < TURF.squadSize; i++) this.member(z, 'chase', true);
      const lane = w.map.nearestLane(z.x + z.w / 2, z.y + z.h / 2);
      if (!w.onScreen(lane.ax, lane.ay, 60)) w.gang.spawnChaser(f.ride === 'bike' ? VEHICLES.bike : VEHICLES.sedan, lane.ax + lane.dx * 40, lane.ay + lane.dy * 40, Math.atan2(lane.dy, lane.dx), f.ride === 'bike' ? 0 : BLACK_SEDAN);
    } else { // the lieutenant and two bodyguards
      const boss = this.member(z, 'chase', true, TURF.lieutenantHp);
      boss.data.rate = TURF.lieutenantFireGap;
      boss.sprite.setScale(boss.sprite.scaleX * 1.25);
      this.member(z, 'chase', false); this.member(z, 'chase', false);
    }
  }

  update(dt: number): void {
    const w = this.world, s = w.story, p = w.player;
    // zones the story hands over
    for (const [id, need] of Object.entries(TURF.storyZones)) if (s.index >= need && this.owners[id] !== 'jun') { this.owners[id] = 'jun'; this.save(); }
    // income: once per in-game day, collected at the safehouse
    this.dayT += dt;
    if (this.dayT >= TURF.dayMinutes * 60) {
      this.dayT = 0;
      for (const b of w.map.blocks) if (this.owners[b.id] === 'jun') this.pending += this.value(b);
      this.save();
    }
    const home = w.map.places.ramen;
    if (this.pending > 0 && !s.active && !p.car && Math.hypot(p.actor.x - home.x, p.actor.y - home.y) < 44) {
      p.cash += this.pending;
      s.phone.push({ from: 'MIKA', text: `Turf income: ¥${this.pending.toLocaleString('en-US')}`, t: 4 });
      this.pending = 0; this.save();
    }
    if (s.active || w.mode !== 'play') { if (this.war) this.abort(); return; }

    const here = this.zoneAt(p.pos.x, p.pos.y);
    if (this.war) {
      const war = this.war, z = war.zone;
      const m = TURF.leaveDist, far = p.pos.x < z.x - m || p.pos.x > z.x + z.w + m || p.pos.y < z.y - m || p.pos.y > z.y + z.h + m;
      war.away = far ? war.away + dt : 0;
      this.objective = `Turf war — ${this.name(z)} — wave ${war.wave} of 3`;
      if (war.away > TURF.leaveTime) { s.card = { title: `TURF LOST — ${this.name(z)}`, sub: '', t: 3 }; w.gang.clear(); this.abort(); return; }
      if (w.gang.activeThugs === 0) {
        war.wave++;
        if (war.wave > 3) { // claimed: the zone turns gold
          this.owners[z.id] = 'jun'; this.save();
          s.card = { title: `TURF TAKEN — ${this.name(z)}`, sub: '', t: 3.5 };
          for (const c of w.gang.activeChasers) c.driver = 'none';
          this.abort();
        } else this.spawnWave();
      }
      return;
    }
    // gang members hang around their own zones while you are nearby
    this.tick -= dt;
    if (this.tick > 0) return;
    this.tick = 1.5;
    for (const t of w.gang.thugs) if (t.data.turf && t.alive && Math.hypot(t.x - p.pos.x, t.y - p.pos.y) > 1500) t.destroy();
    w.gang.thugs = w.gang.thugs.filter((t) => t.sprite.active);
    if (!here || this.owners[here.id] === 'jun') return;
    const have = w.gang.thugs.reduce((n, t) => n + (t.alive && t.data.turf === here.id ? 1 : 0), 0);
    if (have < TURF.ambientMembers) this.member(here, 'idle', false);
  }
}
