import { MISSION_BARKS as B, MISSION_TUNING as T } from '../data/missions';
import { VEHICLES, BLACK_SEDAN, BLACK_SPORTS } from '../data/vehicles';
import { MAP } from '../data/map';
import { TILE_SIZE as TS } from '../data/config';
import { Actor } from '../entities/Actor';
import type { Car } from '../entities/Car';
import type { WorldScene } from '../scenes/WorldScene';
import type { Story } from './Story';

// The "code hooks for set pieces" (bible, Architecture): the few things each mission
// needs that plain text can't describe. Named so data/missions.ts can refer to them.
type Hook = (w: WorldScene, s: Story) => void;
type Check = (w: WorldScene, s: Story, dt: number) => boolean;

const npc = (w: WorldScene, s: Story, look: string, x: number, y: number): Actor => {
  const a = new Actor(w, 'ped', x, y, look, 999);
  a.body.setImmovable(true);
  s.actors.push(a);
  return a;
};
const near = (w: WorldScene, s: Story): boolean => {
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
    const t1 = w.gang.spawnThug(21 * TS, 16.6 * TS, 'thug', 'wait');
    const t2 = w.gang.spawnThug(22.4 * TS, 17.6 * TS, 'thug', 'wait');
    t1.data.fleeAt = 24; t1.data.fleeBark = B.m01ThugFlee;
    t2.data.downBark = B.m01ThugDown;
    s.cars.push(w.addCar(VEHICLES.sedan, 24.5 * TS, 16.5 * TS, Math.PI, false, BLACK_SEDAN)); // the Kurogane sedan
    s.flags.quietBreakIn = true; // the tutorial car doesn't set off Heat
    s.junCarLine = B.m01JunCar;
  },
  m01Fight(w) { for (const t of w.gang.thugs) if (t.state === 'wait') t.state = 'chase'; },

  // ----- M02 Hot Soup -----
  m02Setup(w, s) {
    const home = s.place('ramen');
    const sc = w.addCar(VEHICLES.scooter, home.x + 44, home.y - 14, -Math.PI / 2, false, 0);
    sc.unlocked = true;
    s.cars.push(sc); s.vars.scooter = sc;
    s.vars.taba = npc(w, s, 'customer', s.place('arcade').x + 14, s.place('arcade').y);
    s.vars.ueda = npc(w, s, 'elder', s.place('bathhouse').x - 16, s.place('bathhouse').y);
    s.vars.noda = npc(w, s, 'cop', s.place('policeBox').x - 14, s.place('policeBox').y - 14);
    s.vars.ishii = npc(w, s, 'cop', s.place('policeBox').x + 4, s.place('policeBox').y - 18);
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
    const z = w.addCar(VEHICLES.sports, y.x, y.y, -Math.PI / 2, false, BLACK_SPORTS);
    s.cars.push(z); s.vars.zenki = z;
    w.gang.spawnThug(y.x - 70, y.y + 30, 'raijin', 'guard');
    w.gang.spawnThug(y.x + 60, y.y - 34, 'raijin', 'guard');
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
      // running the red light at the junction by the police box: 1 lantern
      const c0 = MAP.roadBands[1] * TS, c1 = c0 + MAP.roadWidth * TS;
      const inBox = sc.x > c0 && sc.x < c1 && sc.y > c0 && sc.y < c1;
      if (inBox && !s.flags.wasInBox && sc.speed > 40) {
        const axis = Math.abs(Math.cos(sc.heading)) > Math.abs(Math.sin(sc.heading)) ? 'h' : 'v';
        if (!w.traffic.canGo(axis) && !s.flags.redDone) {
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
