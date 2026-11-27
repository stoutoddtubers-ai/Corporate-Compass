import * as Phaser from 'phaser';
import { ACT2_BARKS as B, ACT2_TUNING as T } from '../data/missions_act2';
import { AMBIENCE } from '../data/missions';
import { VEHICLES, BLACK_SEDAN, WHITE_SEDAN } from '../data/vehicles';
import { WEAPONS } from '../data/weapons';
import { MAP } from '../data/map';
import { MAP_TILES_W, MAP_TILES_H, TILE_SIZE as TS } from '../data/config';
import type { Actor } from '../entities/Actor';
import type { Car } from '../entities/Car';
import type { WorldScene } from '../scenes/WorldScene';
import type { Story } from './Story';
import type { Hook, Check } from './missionHooks';
import { HOOKS, CHECKS, free, npc, near, storyCar, laneCar, dist, nearestLot } from './missionHooks';

// The game logic for Act 2 (missions 9-16). The words and numbers are in data/missions_act2.ts.
// The engine has no interiors, so indoor scenes are staged in the nearest yard or alley:
// "rooms" and "floors" are marked spots, "rooftops" are spots at building doors.

type Pt = { x: number; y: number };
type Box = { x: number; y: number; w: number; h: number };
const pick = <X>(list: readonly X[]): X => list[Math.floor(Math.random() * list.length)];
const RED = '#ff9a9a', WARM = '#ffe9c0', GOLD = '#e8b923', PALE = '#f0f0f0', CROWD = '#d9e2ff';

// =====================================================================================
// Shared helpers
// =====================================================================================

/** Jun needs a gun for the fights in this act (the story handed him a pistol in mission 5). */
function armed(w: WorldScene): void {
  if (w.player.weapons.every((x) => x.def.mag === 0)) w.player.giveWeapon('kitsune9');
}

/** A walker's map to one fixed spot, so people can find their way there round buildings. */
function fieldTo(w: WorldScene, p: Pt): Int16Array {
  const f = new Int16Array(MAP_TILES_W * MAP_TILES_H);
  w.map.flow(p.x, p.y, false, f);
  return f;
}

/** Walks a story character toward a spot along its field. Returns the distance left. */
function walk(w: WorldScene, a: Actor, f: Int16Array, to: Pt, speed: number): number {
  const d = dist(a, to);
  if (d < 6) { a.body.setVelocity(0, 0); return d; }
  const st = d < 48 && w.map.los(a.x, a.y, to.x, to.y) ? to : w.map.flowStep(f, a.x, a.y);
  if (st) a.moveTo(st.x, st.y, speed); else a.body.setVelocity(0, 0);
  return d;
}

/** Points a 'smash' enemy at his target: straight at it when he can see it, otherwise along the field. */
function steer(w: WorldScene, a: Actor, f: Int16Array, to: Pt): void {
  if (dist(a, to) < 200 && w.map.los(a.x, a.y, to.x, to.y)) { a.tx = to.x; a.ty = to.y; return; }
  const st = w.map.flowStep(f, a.x, a.y);
  if (!st) return;
  const d = dist(a, st) || 1;
  a.tx = a.x + ((st.x - a.x) / d) * 60; a.ty = a.y + ((st.y - a.y) / d) * 60; // always a little way ahead, so he keeps walking
}

/** A pavement spot out of sight near a place, for enemies to arrive from. */
function arrive(w: WorldScene, at: Pt, min = 300, max = 520): Pt {
  let pos = w.map.randomWalkNear(at.x, at.y, min, max);
  for (let k = 0; k < 6 && pos && w.onScreen(pos.x, pos.y, 20); k++) pos = w.map.randomWalkNear(at.x, at.y, min, max);
  return pos ?? free(w, at.x + min, at.y);
}

/** One enemy, optionally armed, who says a line a moment after he appears. */
function thug(w: WorldScene, at: Pt, look: string, state: 'chase' | 'smash' | 'wait' | 'idle', gun = false, line = ''): Actor {
  const t = w.gang.spawnThug(at.x, at.y, look, state);
  t.tx = at.x; t.ty = at.y;
  if (gun) t.data.gun = true;
  if (line) w.time.delayedCall(1200 + Math.random() * 2500, () => t.alive && w.fx.bark(t.sprite, line, RED));
  return t;
}

/** A plain coloured box on the ground (pachinko machines, control boxes, flood water). It goes when the mission ends. */
function prop(w: WorldScene, s: Story, x: number, y: number, wd: number, ht: number, color: number, alpha = 1): Phaser.GameObjects.Rectangle {
  const r = w.add.rectangle(x, y, wd, ht, color, alpha).setDepth(1.6);
  s.actors.push({ alive: false, sprite: r, x, y, animate() { /* nothing to animate */ }, destroy() { r.destroy(); } } as unknown as Actor);
  return r;
}

/** Allies who fight beside Jun: each hits the nearest enemy in reach every so often. They cannot be hurt. */
function alliesFight(w: WorldScene, list: Actor[], dt: number, reach: number, dmg: number, gap: number): void {
  for (const a of list) {
    a.timer -= dt;
    if (a.timer > 0) continue;
    let best: Actor | null = null, bd = reach;
    for (const t of w.gang.thugs) {
      if (!t.alive) continue;
      const d = dist(a, t);
      if (d < bd && w.map.los(a.x, a.y, t.x, t.y)) { bd = d; best = t; }
    }
    if (!best) { a.timer = 0.2; continue; }
    const ang = Math.atan2(best.y - a.y, best.x - a.x);
    a.timer = gap * (0.8 + Math.random() * 0.4);
    a.sprite.rotation = ang;
    a.punch();
    if (reach > 80) w.fx.puff(a.x + Math.cos(ang) * 12, a.y + Math.sin(ang) * 12, 0xfff2a0, 7, 0.06, 0, 0, 0, 0.9); // a shot, not a blade
    w.fx.spark(best.x, best.y, 0xd8343a);
    w.hurtActor(best, dmg, false, 'bullet');
  }
}

/** A line shouted by someone who may be out of view: it shows toward them, near the edge of the screen. */
function shout(w: WorldScene, from: Pt, text: string, color: string): void {
  const p = w.player.pos, d = dist(p, from);
  w.fx.bark(d < 200 ? from : { x: p.x + ((from.x - p.x) / d) * 200, y: p.y + ((from.y - p.y) / d) * 200 }, text, color);
}

/** "Stop that car": true once it is wrecked, hijacked, badly damaged or held up beside Jun. */
function stopped(w: WorldScene, s: Story, car: Car, hpShare: number, dt: number): boolean {
  s.marker = { x: car.x, y: car.y, r: 0 };
  s.vars.stopT = car.speed < 15 && dist(car, w.player.pos) < 170 ? (s.vars.stopT as number) + dt : 0;
  if (!(car.wreck || car.removed || car.driver !== 'traffic' || car.hp < car.def.hp * hpShare || (s.vars.stopT as number) > 1.5)) return false;
  if (car.driver === 'traffic') car.driver = 'none';
  return true;
}

/** Keeps parked cars out of a car park the mission is using as a room. */
function clearLot(w: WorldScene, r: Box): void {
  for (const c of w.cars) if (!c.story && !c.unlocked && !c.removed && c.driver === 'none' && c.x > r.x && c.x < r.x + r.w && c.y > r.y && c.y < r.y + r.h) c.destroy();
}

// =====================================================================================
// M10 Pachinko Panic: machines, waves
// =====================================================================================

interface Machine { x: number; y: number; dead: boolean; spill: number; box: Phaser.GameObjects.Rectangle }

function m10Wave(w: WorldScene, s: Story): void {
  const floor = s.place('pachinkoFloor');
  for (let i = 0; i < T.m10Waves[s.vars.wave as number]; i++) {
    // most raiders come for Jun; some smash machines; one goes for the cash office
    const job = i % 3 === 1 ? 'smash' : i === 3 ? 'office' : 'chase';
    const t = thug(w, arrive(w, floor), 'thug', job === 'chase' ? 'chase' : 'smash', false, i < 2 ? B.m10Raiders[i] : '');
    t.data.job = job; t.data.m = -1;
  }
}

/** A machine is wrecked. A shot one spills its steel balls across the floor. */
function m10Break(w: WorldScene, s: Story, m: Machine, shot: boolean): void {
  m.dead = true;
  m.box.setFillStyle(0x2a2622);
  s.vars.lost = (s.vars.lost as number) + 1;
  w.fx.spark(m.x, m.y);
  if (!shot) return;
  m.spill = T.m10SpillTime;
  for (let k = 0; k < 12; k++) w.fx.mark(m.x + (Math.random() - 0.5) * 50, m.y + (Math.random() - 0.5) * 50, 'dot', 0, 0.22, 0.22, 0xd8dce4, 0.9, T.m10SpillTime);
  w.fx.bark((s.vars.saeko as Actor).sprite, B.m10Saeko, PALE, 'saeko', 6);
}

// =====================================================================================
// M11 Scramble: the thief on foot
// =====================================================================================

/** The thief runs his current leg; he sprints when Jun is close and dawdles when Jun falls behind. Returns how far he has left. */
function m11Run(w: WorldScene, s: Story, dt: number): number {
  const kid = s.vars.thief as Actor, goal = (s.vars.legs as Pt[])[s.vars.leg as number], p = w.player.pos, d = dist(p, kid);
  const left = walk(w, kid, s.vars.field as Int16Array, goal, d < 90 ? T.m11ThiefFast : d < 300 ? T.m11ThiefSpeed : T.m11ThiefSlow);
  s.marker = { x: kid.x, y: kid.y, r: 0 };
  s.vars.lostT = d > T.m11LoseDist ? (s.vars.lostT as number) + dt : 0;
  if (d < 90) w.fx.bark(kid.sprite, B.m11Thief[0], RED, 'thief', 7);
  for (const o of w.peds.list) if (o.alive && dist(o, p) < 30) w.fx.bark(o.sprite, pick(B.m11Peds), CROWD, 'm11ped', 2.5); // people Jun barges past
  return left;
}

// =====================================================================================
// M12 Gold Rush
// =====================================================================================

/** Jun's Zenki waits beside the tunnel (and is put back if it gets wrecked in the fight). */
function m12Zenki(w: WorldScene, s: Story): void {
  const at = s.vars.zenkiAt as Pt, z = storyCar(w, VEHICLES.sports, at.x, at.y, -Math.PI / 2, 1);
  z.unlocked = true;
  s.cars.push(z); s.vars.zenki = z;
}

// =====================================================================================
// M13 Ink
// =====================================================================================

interface Screen { x: number; y: number; tagged: boolean; box: Phaser.GameObjects.Rectangle; field: Int16Array | null }

// =====================================================================================
// M15 Fork in the Road: the suspicion meter
// =====================================================================================

function m15Sus(s: Story, add: number): void {
  const v = Phaser.Math.Clamp((s.vars.sus as number) + add, 0, 1);
  s.vars.sus = v;
  s.timer = { label: 'SUSPICION', value: v, max: 1, kind: 'bar' };
  if (v >= 1) { s.flags.caught = true; s.vars.failHint = B.m15Card; }
}

/** The floor 9 guard walks his round (the four corners of the archive building). */
function m15Patrol(s: Story): Actor {
  const g = s.vars.patrol as Actor, loop = s.vars.loop as Pt[], to = loop[s.vars.leg as number];
  if (g.moveTo(to.x, to.y, s.flags.rush ? T.m15PatrolRush : T.m15PatrolSpeed) < 8) s.vars.leg = ((s.vars.leg as number) + 1) % loop.length;
  return g;
}

/** The gala floor: guards ignore a caterer with a tray unless he runs (a dodge roll) or drives in; and Ogata has met Jun. */
function m15Gala(w: WorldScene, s: Story, dt: number): void {
  const p = w.player.pos, ogata = s.vars.ogata as Actor;
  const seen = (s.vars.guards as Actor[]).some((g) => dist(g, p) < 260 && w.map.los(g.x, g.y, p.x, p.y));
  let add = -T.m15Drain * dt;
  if (seen && w.player.car) add = T.m15FillFar * dt;
  if (seen && w.player.rolling && !s.flags.rolled) add = T.m15RunJump;
  s.flags.rolled = w.player.rolling;
  const t = s.vars.linger as number;
  s.vars.linger = dist(ogata, p) < T.m15OgataDist ? t + dt : Math.min(0, t + dt);
  if ((s.vars.linger as number) > T.m15OgataTime) { s.vars.linger = -5; add = T.m15OgataJump; w.fx.bark(ogata.sprite, B.m15Ogata, '#f0e8c8'); }
  m15Sus(s, add);
}

/** Floor 9: no tray, no excuse. The patrolling guard notices Jun by distance and line of sight. */
function m15Floor9(w: WorldScene, s: Story, dt: number): void {
  const g = m15Patrol(s), p = w.player.pos, d = dist(g, p);
  const sees = d < T.m15SeeDist && w.map.los(g.x, g.y, p.x, p.y);
  m15Sus(s, (sees ? (d < T.m15SeeDist * 0.45 ? T.m15FillNear : T.m15FillFar) : -T.m15Drain) * dt);
}

// =====================================================================================
// M16 Typhoon: waves
// =====================================================================================

function m16Wave(w: WorldScene, s: Story): void {
  const gate = s.place('mansionGate'), path = s.keep.path === 'police' ? 'police' : 'yakuza';
  const wave = s.vars.wave as number, allies = s.vars.allies as Actor[];
  for (let i = 0; i < T.m16Waves[wave]; i++) // every fourth soldier goes for Genzō's room; every third has a gun
    thug(w, arrive(w, gate, 330, 560), 'thug', i % 4 === 3 ? 'smash' : 'chase', i % 3 === 0, i < 2 ? B.m16Soldiers[i] : '');
  w.fx.bark(allies[1 + (wave % (allies.length - 1))].sprite, B.m16Squad[path], WARM);
  if (wave === 1) w.time.delayedCall(2500, () => s.active && allies[0].alive && w.fx.bark(allies[0].sprite, B.m16Leader[path], PALE));
}

// =====================================================================================
// Hooks
// =====================================================================================

Object.assign(HOOKS, {
  // ----- M09 Welcome to Hanabi-chō -----
  m09Setup(w, s) {
    const gate = s.place('hanabiGate'), office = s.place('saekoOffice');
    for (const [dx, dy] of [[-34, -6], [-16, -12], [16, -12], [34, -6]]) npc(w, s, 'thug', gate.x + dx, gate.y + dy); // the four soldiers
    s.cars.push(storyCar(w, VEHICLES.sedan, gate.x + 72, gate.y + 2, 0, WHITE_SEDAN)); // Saeko's white car
    npc(w, s, 'saeko', office.x + 18, office.y); // she waits for the envelope at her office (the "rooftop")
    // The shop owners can be hurt (the mission fails if one dies), so they are made like gang members who never fight.
    const owner = (id: string, look: string) => { const p = s.place(id); return thug(w, free(w, p.x + 18, p.y), look, 'idle'); };
    s.vars.owners = [owner('mamaRei', 'mama'), owner('lucky7', 'shopkeeper'), owner('florist', 'grandmother')];
    s.vars.kaz = owner('clubMirage', 'salaryman');
  },
  m09Brawl(w, s) {
    s.flags.brawl = true;
    const kaz = s.vars.kaz as Actor, boys = [kaz];
    if (kaz.alive) kaz.state = 'chase';
    for (let i = 0; i < T.m09Boys; i++) boys.push(thug(w, free(w, kaz.x + Math.cos(i * 2.4 + 1) * 44, kaz.y + Math.sin(i * 2.4 + 1) * 44), 'thug', 'chase'));
    s.vars.boys = boys;
  },
  m09Tally(w, s) {
    const mercy = ['reiMercy', 'luckyMercy', 'hanaMercy'].filter((v) => s.cond(v)).length;
    s.flags.mostlyMercy = mercy >= 2;
    w.player.cash += T.m09Take * (4 - mercy / 2); // Jun's cut: three shops (half from those shown mercy) and Club Mirage
  },

  // ----- M10 Pachinko Panic -----
  m10Setup(w, s) {
    armed(w);
    const lot = s.place('pachinkoFloor').rect!, door = s.place('pachinko');
    const machines: Machine[] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) { // three rows of machines on the hall floor
      const x = lot.x + 23 + c * 30, y = lot.y + 40 + r * 56;
      machines.push({ x, y, dead: false, spill: 0, box: prop(w, s, x, y, 20, 12, [0xd8343a, 0xe8b923, 0x3aa0d8][r]).setStrokeStyle(1, 0x000000) });
    }
    s.vars.machines = machines;
    s.vars.saeko = npc(w, s, 'saeko', lot.x + lot.w / 2, lot.y + lot.h - 26); // on the floor, katana drawn
    s.vars.gamblers = [2, 5, 11, 12, 17, 22].map((i, k) => npc(w, s, ['salaryman', 'elder', 'customer', 'grandmother'][k % 4], machines[i].x, machines[i].y + 15));
    s.vars.office = fieldTo(w, door); // the cash office is the hall's door
    s.vars.floor = fieldTo(w, s.place('pachinkoFloor'));
    s.vars.lost = 0; s.vars.wave = 0; s.vars.slipT = 0;
  },
  m10Start(w, s) { m10Wave(w, s); },
  m10Van(w, s) {
    s.timer = null; s.hint = '';
    const b = s.place('pachinko').rect!;
    const van = laneCar(w, s, VEHICLES.truck, 0, { x: b.x + b.w / 2, y: b.y - 60 }, 0, T.m10VanCruise); // on the street behind the hall
    van.panic = 9999; // he is not stopping for lights
    s.vars.van = van; s.vars.stopT = 0;
  },
  m10Leader(w, s) {
    const van = s.vars.van as Car, at = w.sidePoint(van, -1), p = w.player.pos;
    const boss = npc(w, s, 'thug', at.x, at.y);
    boss.body.setImmovable(false); // he runs, so walls must stop him
    // he bolts for whichever nearby yard is furthest from Jun
    const yards = ['hanabiLot', 'miraiLot', 'marukaneLot', 'mansionYard'].map((id) => s.place(id) as Pt).filter((c) => dist(c, boss) < 1800);
    const to = yards.reduce((a, c) => (dist(c, p) > dist(a, p) ? c : a), yards[0] ?? s.place('hanabiLot'));
    s.vars.boss = boss; s.vars.bossTo = to; s.vars.run = fieldTo(w, to);
  },

  // ----- M11 Scramble -----
  m11Setup(w, s) {
    const x = s.place('scramble');
    npc(w, s, 'pip', x.x + 26, x.y - 20);
    const kid = npc(w, s, 'student', x.x - 4, x.y + 8);
    kid.body.setImmovable(false);
    s.vars.thief = kid; s.vars.leg = 0; s.vars.lostT = 0;
    s.vars.legs = [s.place('scrambleYard'), s.place('miraiStation')]; // through the crowd to a back yard, then up to the station
    s.vars.field = fieldTo(w, s.place('scrambleYard'));
    for (let i = 0; i < T.m11Crowd; i++) { // the crowd floods the crossing
      const r = 40 + ((i * 37) % 90);
      w.peds.spawn(false, free(w, x.x + Math.cos(i * 2.4) * r, x.y + Math.sin(i * 2.4) * r));
    }
  },
  m11Up(w, s) {
    s.vars.leg = 1; s.vars.field = fieldTo(w, s.place('miraiStation'));
    w.fx.bark((s.vars.thief as Actor).sprite, B.m11Thief[1], RED);
  },
  m11Toss(w, s) {
    const kid = s.vars.thief as Actor, park = s.place('midoriPark');
    kid.body.setVelocity(0, 0);
    const sc = laneCar(w, s, VEHICLES.scooter, 0, kid, 0, T.m11ScooterCruise); // the accomplice, on the nearest street
    sc.panic = 9999;
    sc.route = w.map.route(sc.seg!, park.x, park.y).slice(1);
    s.vars.bag = sc; s.vars.stopT = 0; s.flags.tossed = true;
    shout(w, sc, B.m11Accomplice, RED);
  },

  // ----- M12 Gold Rush -----
  m12Setup(w, s) {
    armed(w);
    const lot = s.place('marukaneLot'), tun = s.place('tomonTunnel');
    const dump = storyCar(w, VEHICLES.truck, lot.x, lot.y, -Math.PI / 2, 1); // a yellow box truck stands in for the dump truck
    s.cars.push(dump); s.vars.dump = dump;
    s.vars.zenkiAt = free(w, tun.x + 150, tun.y + 20);
    m12Zenki(w, s);
    s.flags.quietBreakIn = true; // nobody is watching a dump truck at dawn
  },
  m12Clock(_w, s) { s.timer = { label: 'CONVOY', value: T.m12ConvoyTime, max: T.m12ConvoyTime, kind: 'time' }; },
  m12Escort(w, s) {
    const convoy = s.vars.convoy as Car[], rear = convoy[2], h = rear.heading;
    for (const side of [-1, 1]) { // the Raijin close the road behind the convoy with their bikes
      const bx = rear.x - Math.cos(h) * 90 - Math.sin(h) * 26 * side, by = rear.y - Math.sin(h) * 90 + Math.cos(h) * 26 * side;
      s.cars.push(storyCar(w, VEHICLES.bike, bx, by, h + Math.PI / 2, 0));
      npc(w, s, 'raijin', bx - Math.cos(h) * 24, by - Math.sin(h) * 24);
    }
    [convoy[0], convoy[2]].forEach((car, k) => { // two guards out of each escort
      for (const side of [-1, 1]) thug(w, w.sidePoint(car, side), 'yatagarasu', 'chase', true).data.bark = B.m12Escort[(k + (side + 1) / 2) % 2];
    });
    s.timer = { label: 'LOCK', value: T.m12HoldTime, max: T.m12HoldTime, kind: 'time' };
    s.vars.reinT = T.m12ReinforceEvery;
  },
  m12Longer(w, s) {
    s.flags.late = true;
    if (s.timer) s.timer.value += T.m12HoldExtra;
    w.fx.bark(w.player.pos, B.m12JunNumber, GOLD);
  },
  m12Open(_w, s) { s.timer = null; },
  m12Cops(w) { w.heat.crime('sustainedFire'); }, // 3 lanterns: "Cops on the ramp."

  // ----- M13 Ink -----
  m13Setup(w, s) {
    armed(w);
    const here = s.place('miraiLot');
    npc(w, s, 'hikari', here.x - 18, here.y - 12); npc(w, s, 'pip', here.x + 16, here.y - 8);
    s.vars.boxes = [1, 2, 3, 4, 5].map((i): Screen => { const p = s.place('screen' + i); return { x: p.x, y: p.y, tagged: false, box: prop(w, s, p.x, p.y, 14, 10, 0x8a8f98).setStrokeStyle(1, 0x000000), field: null }; });
    s.vars.tags = 0; s.vars.tagT = 0;
  },
  m13Done(w, s) {
    s.timer = null;
    for (const t of w.gang.thugs) if (t.state === 'smash') t.state = 'chase'; // the set is complete: nothing left to wipe
  },
  m13Wave(w) {
    for (let i = 0; i < T.m13Final; i++) thug(w, arrive(w, w.player.pos), 'thug', 'chase', i % 2 === 1, i < 2 ? B.m13Soldiers[i] : '');
  },
  m13Screen(w, s) {
    const x = s.place('scramble');
    B.m13Crowd.forEach((line, i) => { // people on the crossing look up
      const o = w.peds.spawn(false, free(w, x.x + (i - 1) * 64, x.y + 74));
      if (o) w.time.delayedCall(300 + i * 900, () => o.alive && w.fx.bark(o.sprite, line, CROWD));
    });
  },

  // ----- M14 The Wakagashira -----
  m14Setup(w, s) {
    const vip = s.place('karaoke'), room = s.place('room6').rect!;
    const here = free(w, vip.x, vip.y - 6);
    w.player.actor.body.reset(here.x, here.y);
    const m = free(w, vip.x - 52, vip.y - 12);
    s.vars.mibu = w.gang.spawnThug(m.x, m.y, 'mibu', 'idle', T.m14MibuHp);
    s.vars.guards = [-1, 1].map((k) => thug(w, free(w, m.x + k * 28, m.y - 18), 'thug', 'idle'));
    s.vars.fujita = w.gang.spawnThug(room.x + room.w / 2, room.y + 24, 'fujita', 'idle', T.m14FujitaHp);
    s.flags.inside = true;
  },
  m14Dealt(w, s) {
    const f = s.vars.fujita as Actor;
    if (s.keep.fujita === 'fujitaDead') { if (f.alive) w.hurtActor(f, 999, true, 'melee'); }
    else f.state = 'flee'; // he runs for the train
  },
  m14Guards(w, s) {
    if (s.keep.fujita !== 'fujitaSpared') return;
    const guards = s.vars.guards as Actor[], out = s.place('voiceCaveStreet');
    for (let i = 0; i < T.m14Guards; i++) guards.push(thug(w, arrive(w, out, 120, 260), 'thug', 'chase'));
    for (const g of guards) if (g.alive) g.state = 'chase';
    const first = guards.find((g) => g.alive);
    if (first) shout(w, first, B.m14Bodyguard, RED);
  },
  m14Out(w, s) {
    s.flags.inside = false; // Jun gets his gun back at the door
    w.setAmbience({ ...AMBIENCE.night, rain: true }); // "in the rain"
    const out = s.place('voiceCaveStreet');
    s.cars.push(storyCar(w, VEHICLES.sedan, out.x + 64, out.y, 0, WHITE_SEDAN)); // Saeko's white car is waiting
    npc(w, s, 'saeko', out.x + 30, out.y - 4);
  },

  // ----- M15 Fork in the Road -----
  m15Setup(w, s) {
    const plaza = s.place('towerPlaza').rect!, arch = s.place('towerArchive').rect!;
    const at = (fx: number, fy: number): Pt => ({ x: plaza.x + plaza.w * fx, y: plaza.y + plaza.h * fy });
    // the gala, on the tower's plaza: three guests to serve, more guests, three guards, and Ogata beside the second guest
    s.vars.guests = [at(0.72, 0.3), at(0.3, 0.55), at(0.7, 0.8)].map((p, i) => npc(w, s, ['salaryman', 'elder', 'customer'][i], p.x, p.y));
    [at(0.2, 0.25), at(0.52, 0.42), at(0.84, 0.6), at(0.25, 0.86), at(0.5, 0.95)].forEach((p, i) => npc(w, s, ['grandmother', 'salaryman', 'elder', 'student', 'customer'][i], p.x, p.y));
    s.vars.guards = [at(0.5, 0.1), at(0.92, 0.45), at(0.08, 0.7)].map((p) => npc(w, s, 'yatagarasu', p.x, p.y));
    s.vars.ogata = npc(w, s, 'ogata', at(0.3, 0.55).x + 34, at(0.3, 0.55).y + 30);
    s.vars.lift = at(0.12, 0.05); // the service elevator
    // "floor 9" is the walk round the archive building: landing, north-west corner, the safe, south-east corner
    const x0 = arch.x - TS, x1 = arch.x + arch.w + TS, y0 = arch.y - TS / 2, y1 = arch.y + arch.h + TS;
    s.vars.loop = [{ x: x0, y: y1 }, { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }];
    const patrol = npc(w, s, 'yatagarasu', x1, y1);
    patrol.body.setImmovable(false);
    s.vars.patrol = patrol; s.vars.leg = 0; s.vars.sus = 0; s.vars.served = 0; s.vars.linger = 0;
  },
  m15In(_w, s) { s.flags.tray = true; },
  m15Lift(_w, s) {
    s.flags.tray = false; s.flags.floor9 = true; s.hint = ''; // the tray stays downstairs
    const loop = s.vars.loop as Pt[], g = s.vars.patrol as Actor;
    if (dist(g, loop[0]) < 320) { g.body.reset(loop[2].x, loop[2].y); s.vars.leg = 3; } // the guard is never right at the doors as they open
  },
  m15ToLanding(_w, s) { const p = (s.vars.loop as Pt[])[0]; s.marker = { x: p.x, y: p.y, r: 30 }; },
  m15ToSafe(_w, s) { const p = (s.vars.loop as Pt[])[2]; s.marker = { x: p.x, y: p.y, r: 30 }; s.vars.workT = 0; },
  m15Bridge(w) { w.fx.bark(w.player.pos, B.m15JunSafe, GOLD); },
  m15Back(w, s) {
    const p = (s.vars.loop as Pt[])[0];
    s.marker = { x: p.x, y: p.y, r: 30 };
    s.flags.rush = true; // security is on its way round
    shout(w, s.vars.patrol as Actor, B.m15Security, '#9cc0ff');
  },
  m15Done(_w, s) { s.flags.floor9 = false; s.timer = null; },

  // ----- M16 Typhoon -----
  m16Setup(w, s) {
    armed(w);
    const cop = s.keep.path === 'police', p = w.player.actor;
    const here = free(w, p.x, p.y - 26);
    p.body.reset(here.x, here.y);
    const lot = nearestLot(w, here.x, here.y);
    const car = storyCar(w, VEHICLES.sedan, lot.x + lot.w / 2 + 44, lot.y + lot.h / 2, 0, cop ? 0 : WHITE_SEDAN); // a car to brave the storm in
    car.unlocked = true;
    s.cars.push(car);
    for (const [x, y, wd, ht] of T.m16Floods) prop(w, s, (x + wd / 2) * TS, (y + ht / 2) * TS, wd * TS, ht * TS, 0x3a78b8, 0.3).setDepth(1.2); // flood water on the low streets
    const rb = s.place('mibuRoadblock'), gate = s.place('mansionGate');
    for (const dx of [-27, 27]) s.cars.push(storyCar(w, VEHICLES.sedan, rb.x + dx, rb.y, 0, BLACK_SEDAN)); // Mibu's roadblock
    s.vars.block = Array.from({ length: T.m16Blockers }, (_, i) => thug(w, free(w, rb.x - 54 + i * 36, rb.y - 34), 'thug', 'wait', true));
    // the ally squad at the gate: Saeko and her loyalists, or Sawada and her riot officers
    s.vars.allies = [[70, -44], [70, 46], [76, -76], [76, 78]].slice(0, T.m16Squad + 1)
      .map(([dx, dy], i) => npc(w, s, i === 0 ? (cop ? 'sawada' : 'saeko') : cop ? 'riot' : 'courier', gate.x + dx, gate.y + dy));
    s.vars.room = fieldTo(w, s.place('mansion')); // Genzō's room is the mansion's door
    s.vars.wave = 0;
  },
  m16Block(w, s) {
    (s.vars.block as Actor[]).forEach((t, i) => { if (!t.alive) return; t.state = 'chase'; if (i < 2) w.fx.bark(t.sprite, B.m16Soldiers[i], RED); });
  },
  m16AtGate(_w, s) { for (const t of s.vars.block as Actor[]) t.destroy(); }, // a retry starts with the roadblock already broken
  m16Defend(w, s) {
    for (const t of w.gang.thugs) if (t.alive && t.state === 'wait') t.state = 'chase'; // anyone left at the roadblock joins in
    m16Wave(w, s);
  },
  m16Held(_w, s) { s.hint = ''; },
  m16ToRoof(w, s) {
    const r = s.place('mansion').rect!, f = free(w, r.x + r.w + TS, r.y + r.h / 2);
    s.marker = { x: f.x, y: f.y, r: 30 };
  },
  m16Blade(w) { if (WEAPONS.katana) w.player.giveWeapon('katana'); }, // Genzō's Blade (the plain katana until the Legendary one exists)
} as Record<string, Hook>);

// =====================================================================================
// Checks
// =====================================================================================

Object.assign(CHECKS, {
  // ----- M09 -----
  m09OwnerDead: (_w, s) => {
    const owners = s.vars.owners as Actor[] | undefined;
    if (!owners) return false;
    for (const o of s.flags.brawl ? owners : [...owners, s.vars.kaz as Actor]) if (o.alive && o.state !== 'idle') o.state = 'idle'; // shop owners never fight back
    return owners.some((o) => !o.alive);
  },
  m09BrawlDone: (_w, s) => (s.vars.boys as Actor[]).every((t) => !t.alive || t.state === 'flee'),

  // ----- M10 -----
  m10Waves: (w, s, dt) => {
    const machines = s.vars.machines as Machine[], door = s.place('pachinko'), p = w.player.actor;
    // a shot that finds a machine instead of a raider
    const gun = w.player.weapon;
    if (!w.player.car && gun.def.id === s.vars.gunId && gun.mag < (s.vars.gunMag as number)) {
      const dx = Math.cos(w.player.aim), dy = Math.sin(w.player.aim);
      const along = (o: Pt) => { const a = (o.x - p.x) * dx + (o.y - p.y) * dy; return a > 0 && Math.abs((o.x - p.x) * dy - (o.y - p.y) * dx) < 9 ? a : 1e9; };
      let hit: Machine | null = null, bd: number = gun.def.range;
      for (const m of machines) if (!m.dead && along(m) < bd) { bd = along(m); hit = m; }
      if (hit && !w.gang.thugs.some((t) => t.alive && along(t) < bd)) m10Break(w, s, hit, true);
    }
    s.vars.gunId = gun.def.id; s.vars.gunMag = gun.mag;
    // raiders with a job: smash machines, or get to the cash office
    for (const t of w.gang.thugs) {
      if (!t.alive || t.state !== 'smash') continue;
      const hits = (t.data.hit as number) || 0;
      if (t.data.job === 'office') { steer(w, t, s.vars.office as Int16Array, door); if (hits >= T.m10OfficeHits) s.flags.office = true; continue; }
      let m = machines[t.data.m as number];
      if (!m || m.dead) {
        const open = machines.filter((x) => !x.dead);
        if (!open.length) continue;
        m = open.reduce((a, c) => (dist(c, t) < dist(a, t) ? c : a));
        t.data.m = machines.indexOf(m); t.data.hit = 0;
      } else if (hits >= T.m10MachineHits) { m10Break(w, s, m, false); t.data.hit = 0; }
      steer(w, t, s.vars.floor as Int16Array, m);
    }
    // spilled steel balls: enemies slip on them, and so does Jun
    const wet = machines.filter((m) => m.spill > 0);
    for (const m of wet) m.spill -= dt;
    const onBalls = (o: Pt) => wet.some((m) => dist(m, o) < T.m10SpillRadius);
    for (const t of w.gang.thugs) {
      if (!t.alive) continue;
      const on = onBalls(t);
      if (on && !t.data.onBalls) t.stun = T.m10SlipStun;
      t.data.onBalls = on;
    }
    const slip = !w.player.car && onBalls(p);
    if (slip && !s.flags.onBalls) { const v = p.body.velocity, l = Math.hypot(v.x, v.y) || 1; s.vars.slipT = T.m10SlideTime; s.vars.slipX = v.x / l; s.vars.slipY = v.y / l; }
    s.flags.onBalls = slip;
    if ((s.vars.slipT as number) > 0) {
      s.vars.slipT = (s.vars.slipT as number) - dt;
      const nx = p.x + (s.vars.slipX as number) * T.m10SlideSpeed * dt, ny = p.y + (s.vars.slipY as number) * T.m10SlideSpeed * dt;
      if (!w.map.isSolid(nx, ny)) p.body.reset(nx, ny);
    }
    alliesFight(w, [s.vars.saeko as Actor], dt, T.m10SaekoReach, T.m10SaekoDamage, T.m10SaekoGap);
    if (Math.random() < 0.006) w.fx.bark(pick(s.vars.gamblers as Actor[]).sprite, pick(B.m10Gamblers), WARM, 'gambler', 4);
    const lost = s.vars.lost as number, wave = s.vars.wave as number;
    s.timer = { label: `WAVE ${wave + 1}/${T.m10Waves.length} · MACHINES LOST ${lost}/${T.m10MaxLost}`, value: lost, max: T.m10MaxLost, kind: 'bar' };
    if (w.gang.activeThugs > 0) return false;
    s.vars.wave = wave + 1;
    if (wave + 1 >= T.m10Waves.length) return true;
    m10Wave(w, s);
    return false;
  },
  m10Lost: (w, s) => {
    if (!s.vars.machines) return false;
    clearLot(w, s.place('pachinkoFloor').rect!);
    if ((s.vars.lost as number) < T.m10MaxLost && !s.flags.office) return false;
    w.fx.bark((s.vars.saeko as Actor).sprite, B.m10Fail, PALE);
    return true;
  },
  m10VanStopped: (w, s, dt) => stopped(w, s, s.vars.van as Car, T.m10VanStopHp, dt),
  m10Caught: (w, s) => {
    const boss = s.vars.boss as Actor;
    s.marker = { x: boss.x, y: boss.y, r: 0 };
    if (dist(w.player.pos, boss) < (w.player.car ? 46 : 26)) { boss.body.setVelocity(0, 0); return true; }
    walk(w, boss, s.vars.run as Int16Array, s.vars.bossTo as Pt, T.m10LeaderSpeed);
    return false;
  },

  // ----- M11 -----
  m11Chase: (w, s, dt) => m11Run(w, s, dt) < 40,
  m11Crowd: (w, s, dt) => m11Run(w, s, dt) < 40 && dist(w.player.pos, s.vars.thief as Actor) < T.m11LoseDist, // at the station: the bag goes to the scooter
  m11Lost: (_w, s) => !!s.vars.thief && !s.flags.tossed && (s.vars.lostT as number) > T.m11LoseTime,
  m11Stopped: (w, s, dt) => stopped(w, s, s.vars.bag as Car, T.m11ScooterStopHp, dt),

  // ----- M12 -----
  m12InDump: (w, s) => {
    const dump = s.vars.dump as Car;
    if (s.marker) { s.marker.x = dump.x; s.marker.y = dump.y; }
    s.junCarLine = !w.player.car && dist(w.player.pos, dump) < 120 ? B.m12JunTruck : null;
    return w.player.car === dump;
  },
  m12Block: (w, s, dt) => {
    const tun = s.place('tomonTunnel'), dump = s.vars.dump as Car;
    let convoy = s.vars.convoy as Car[] | undefined;
    if (!convoy) {
      if (s.timer) s.timer.value -= dt;
      if (s.timer && s.timer.value > 6 && dist(dump, tun) < 80 && dump.speed < 20) s.timer.value = 6; // the road is blocked: the convoy is nearly here
      if (s.timer && s.timer.value > 0) return false;
      // time's up: the armoured truck comes round the corner from the tower, an escort in front and behind
      s.timer = null; s.vars.waitT = 0;
      convoy = [0, 1, 2].map((i) => {
        const c = laneCar(w, s, i === 1 ? VEHICLES.truck : VEHICLES.sedan, i === 1 ? 0 : BLACK_SEDAN, { x: tun.x + 230 + i * 110, y: 7 * TS }, 0, 110);
        c.route = w.map.route(c.seg!, tun.x + TS, MAP.hRoads[1] * TS).slice(1); // down through the tunnel
        return c;
      });
      convoy[1].hp = convoy[1].maxHp = VEHICLES.truck.hp * T.m12ArmourMult;
      s.vars.convoy = convoy;
      return false;
    }
    s.vars.waitT = (s.vars.waitT as number) + dt;
    const lead = convoy[0];
    if (!(Math.abs(lead.x - tun.x) < 90 && lead.y > tun.y - T.m12StopShort) && (s.vars.waitT as number) < T.m12ConvoyWait) return false;
    if (dist(dump, tun) > 110) { s.flags.truckOut = true; return false; } // nothing in the way: the truck drives straight through
    for (const c of convoy) c.driver = 'none'; // boxed in
    return true;
  },
  m12Hold: (w, s, dt) => {
    const t = s.timer, truck = (s.vars.convoy as Car[])[1];
    if (!t) return true;
    t.value -= dt;
    s.marker = { x: truck.x, y: truck.y, r: 0 };
    s.vars.reinT = (s.vars.reinT as number) - dt;
    if ((s.vars.reinT as number) <= 0 && t.value > 10) { // more guards arrive
      s.vars.reinT = T.m12ReinforceEvery;
      for (let i = 0; i < T.m12Reinforce; i++) thug(w, arrive(w, truck), 'yatagarasu', 'chase', true).data.bark = B.m12Escort[i % 2];
    }
    return t.value <= (s.flags.late ? 0 : T.m12HoldTime / 2);
  },
  m12Grab: (w, s) => {
    const truck = (s.vars.convoy as Car[])[1];
    s.marker = { x: truck.x, y: truck.y, r: 30 };
    if (w.player.car || dist(w.player.pos, truck) > 46) return false;
    s.flags.cargo = true;
    return true;
  },
  m12Failed: (w, s) => {
    const z = s.vars.zenki as Car | undefined, dump = s.vars.dump as Car | undefined, truck = (s.vars.convoy as Car[] | undefined)?.[1];
    if (z && (z.wreck || z.removed)) m12Zenki(w, s);
    if (s.flags.cargo) return false;
    // the truck got through, the cargo burned, or the dump truck was lost before it could block the road
    return !!s.flags.truckOut || (!!truck && (truck.wreck || truck.removed || truck.burning)) || (!truck && !!dump && (dump.wreck || dump.removed));
  },

  // ----- M13 -----
  m13Tag: (w, s, dt) => {
    const boxes = s.vars.boxes as Screen[], p = w.player.pos;
    const next = boxes.filter((b) => !b.tagged).reduce((a, c) => (dist(c, p) < dist(a, p) ? c : a));
    s.marker = { x: next.x, y: next.y, r: 30 };
    s.vars.tagT = !w.player.car && dist(p, next) < 30 ? (s.vars.tagT as number) + dt : 0;
    s.timer = { label: 'TAG', value: s.vars.tagT as number, max: T.m13TagTime, kind: 'bar' };
    for (const t of w.gang.thugs) { // soldiers sent to paint over a tag
      if (!t.alive || t.state !== 'smash') continue;
      const b = boxes[t.data.box as number];
      steer(w, t, (b.field ??= fieldTo(w, b)), b);
      if (((t.data.hit as number) || 0) >= T.m13WipeHits) s.flags.wiped = true;
    }
    if ((s.vars.tagT as number) < T.m13TagTime) return false;
    next.tagged = true;
    next.box.setFillStyle(0x28d8e8);
    const tags = (s.vars.tags as number) + 1;
    s.vars.tags = tags; s.vars.tagT = 0;
    s.objective = s.objective.replace(/\d+\/5/, tags + '/5');
    s.phone.push({ from: 'HIKARI', text: B.m13Tags[tags - 1], t: 3.2 });
    if (tags >= boxes.length) return true;
    // Mibu's soldiers come running, and one goes to wipe a tag (not the one Jun is standing at, if there is another)
    for (let i = 0; i < T.m13PerTag; i++) thug(w, arrive(w, p), 'thug', 'chase', false, i === 0 ? B.m13Soldiers[0] : '');
    const others = boxes.filter((b) => b.tagged && b !== next);
    thug(w, arrive(w, p), 'thug', 'smash', false, B.m13Soldiers[1]).data.box = boxes.indexOf(others.length ? pick(others) : next);
    return false;
  },
  m13Wiped: (_w, s) => !!s.flags.wiped,

  // ----- M14 -----
  m14Failed: (w, s) => {
    const mibu = s.vars.mibu as Actor | undefined;
    if (!mibu || !s.flags.inside) return false;
    if (w.player.current !== 0) w.player.switchTo(0); // a bodyguard took Jun's gun at the door: no weapons inside
    if (mibu.alive && mibu.state !== 'idle') mibu.state = 'idle';
    if (mibu.hp >= T.m14MibuHp) return false;
    s.vars.failHint = B.m14Card; // Jun attacked Mibu
    return true;
  },
  m14Corridor: (w, s) => {
    const mibu = s.vars.mibu as Actor;
    if (!s.flags.heard && dist(w.player.pos, s.place('karaoke')) > 110) { // overheard on the way down the corridor
      s.flags.heard = true;
      B.m14Mibu.forEach((line, i) => w.time.delayedCall(i * 1900, () => mibu.alive && w.fx.bark(mibu.sprite, line, '#e06a80')));
    }
    return near(w, s);
  },
  m14Fujita: (w, s) => {
    const f = s.vars.fujita as Actor;
    if (f.alive && f.state !== 'idle') f.state = 'idle';
    s.marker = { x: f.x, y: f.y, r: 0 };
    if (!f.alive) { s.keep.fujita = 'fujitaDead'; s.flags.acted = true; return true; } // the player acted
    return dist(w.player.pos, f) < 26; // close enough to talk: the choice comes up
  },

  // ----- M15 -----
  m15Caught: (w, s, dt) => {
    if (!s.vars.patrol) return false;
    if (s.flags.floor9) m15Floor9(w, s, dt);
    else { m15Patrol(s); if (s.flags.tray) m15Gala(w, s, dt); }
    return !!s.flags.caught;
  },
  m15Serve: (w, s) => {
    const guests = s.vars.guests as Actor[], i = s.vars.served as number, lift = s.vars.lift as Pt;
    if (i >= guests.length) { s.marker = { x: lift.x, y: lift.y, r: 28 }; return near(w, s); }
    s.marker = { x: guests[i].x, y: guests[i].y, r: 28 };
    if (!w.player.car && near(w, s)) { w.fx.bark(guests[i].sprite, B.m15Guests[i], WARM); s.vars.served = i + 1; }
    return false;
  },
  m15At: (w, s) => near(w, s),
  m15Open: (w, s, dt) => {
    s.vars.workT = near(w, s) ? (s.vars.workT as number) + dt : 0;
    return (s.vars.workT as number) >= T.m15SafeTime;
  },
  m15Photo: (w, s, dt) => {
    if (!near(w, s)) return false;
    s.vars.workT = (s.vars.workT as number) + dt;
    const page = B.m15Pages[Math.min(2, Math.floor(((s.vars.workT as number) / T.m15PhotoTime) * 3))];
    if (s.hint !== page) { s.hint = page; w.fx.puff(w.player.pos.x, w.player.pos.y, 0xffffff, 70, 0.15, 0, 0, 0, 0.7); } // a camera flash, and the page on screen
    return (s.vars.workT as number) >= T.m15PhotoTime;
  },

  // ----- M16 -----
  m16Drive: (w, s) => dist(w.player.pos, s.place('mibuRoadblock')) < T.m16BlockDist || near(w, s),
  m16Waves: (w, s, dt) => {
    alliesFight(w, s.vars.allies as Actor[], dt, T.m16AllyReach, T.m16AllyDamage, T.m16AllyGap);
    const room = s.place('mansion'), wave = s.vars.wave as number;
    for (const t of w.gang.thugs) { // the ones heading for Genzō's room
      if (!t.alive || t.state !== 'smash') continue;
      steer(w, t, s.vars.room as Int16Array, room);
      if (((t.data.hit as number) || 0) >= T.m16RoomHits) s.flags.fell = true;
    }
    s.hint = `Wave ${wave + 1} of ${T.m16Waves.length}`;
    if (w.gang.activeThugs > 0) return false;
    s.vars.wave = wave + 1;
    if (wave + 1 >= T.m16Waves.length) return true;
    m16Wave(w, s);
    return false;
  },
  m16Fell: (w, s, dt) => {
    const c = w.player.car; // flood water holds a car back
    if (c && T.m16Floods.some(([x, y, wd, ht]) => c.x >= x * TS && c.x < (x + wd) * TS && c.y >= y * TS && c.y < (y + ht) * TS)) {
      if (c.speed > T.m16FloodSpeed) { const k = Math.max(0, 1 - 4 * dt); c.vx *= k; c.vy *= k; }
      if (Math.random() < 0.3) w.fx.puff(c.x + (Math.random() - 0.5) * 30, c.y + (Math.random() - 0.5) * 30, 0xa8d0f0, 7, 0.45, 0, -20, 1.6, 0.5);
      w.fx.bark(c, B.m16JunFlood, GOLD, 'flood', 14);
    }
    if (!s.flags.fell) return false;
    s.vars.failHint = B.m16Card;
    return true;
  },
} as Record<string, Check>);
