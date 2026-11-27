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
import type { Interior } from './CityMap';

// The game logic for Act 2 (missions 9-16). The words and numbers are in data/missions_act2.ts.
// Indoor scenes are played in real rooms (data/interiors_act2.ts and the shared rooms in data/interiors.ts).
// A room's numbered spots are written "room:number", e.g. spot(s, 'mansion', '7').

type Pt = { x: number; y: number };
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

// ---------- rooms ----------

/** A numbered spot in a room, optionally moved a few tiles right (dx) and down (dy). */
function spot(s: Story, room: string, ch: string, dx = 0, dy = 0): Pt {
  const p = s.place(`${room}:${ch}`);
  return { x: p.x + dx * TS, y: p.y + dy * TS };
}

/** Puts Jun at a spot inside a room. `door` is the story place whose street door the way out then leads to. */
function putInside(w: WorldScene, s: Story, room: string, ch: string, door: string): void {
  const d = s.place(door);
  w.lastDoor = { x: d.x, y: d.y };
  w.enterRoom(room, ch);
}

const roomOf = (w: WorldScene, id: string): Interior => w.map.interiors.find((i) => i.id === id)!;
/** Is this person in the same space as Jun (the same room, or both out on the street)? */
const withJun = (w: WorldScene, a: Pt): boolean => w.map.interiorAt(a.x, a.y) === w.map.interiorAt(w.player.pos.x, w.player.pos.y);

/** Where an enemy comes into a room: one of the given ways in, preferring those Jun cannot see from where he stands. */
function comeIn(w: WorldScene, ways: Pt[]): Pt {
  const p = w.player.pos;
  const hidden = ways.filter((q) => dist(q, p) > 200 || !w.map.los(q.x, q.y, p.x, p.y));
  const q = pick(hidden.length ? hidden : ways);
  return free(w, q.x + (Math.random() - 0.5) * 40, q.y + (Math.random() - 0.5) * 24);
}

/** Runs something when the mission ends or restarts (the game tidies up a mission's people; this rides along with them). */
function onCleanup(s: Story, fn: () => void): void {
  s.actors.push({ alive: false, x: 0, y: 0, animate() { /* nothing to animate */ }, destroy: fn } as unknown as Actor);
}

/**
 * A shop's owner for a mission scene: stands where the shopkeeper usually stands (the room's "n").
 * The everyday shopkeeper is tucked away while the mission runs, so there are not two of them.
 * Owners can be hurt, so they are made like gang members who never fight.
 */
function ownerAt(w: WorldScene, s: Story, room: string, look: string): Actor {
  const at = spot(s, room, 'n');
  const keeper = (w as unknown as { keepers: Actor[] }).keepers.find((k) => dist(k, at) < 8);
  if (keeper) {
    keeper.sprite.setVisible(false); keeper.body.enable = false;
    onCleanup(s, () => { keeper.sprite.setVisible(true); keeper.body.enable = true; });
  }
  const o = thug(w, at, look, 'idle');
  o.sprite.rotation = Math.PI / 2;
  return o;
}

// =====================================================================================
// M10 Pachinko Panic: machines, waves
// =====================================================================================

/** One pachinko machine: a 2 x 2 block of the hall's machine tiles. (x, y) is its middle; (sx, sy) is where someone stands to play or smash it. */
interface Machine { x: number; y: number; sx: number; sy: number; dead: boolean; spill: number; field: Int16Array | null }

/** Finds the machines in the Golden Ball hall from its map: every 2 x 2 block of "P" tiles is one machine. */
function m10Machines(w: WorldScene): Machine[] {
  const inn = roomOf(w, 'pachinko'), map = inn.def.map, used = new Set<string>(), out: Machine[] = [];
  const isP = (i: number, j: number) => map[j]?.[i] === 'P' && !used.has(i + ',' + j);
  for (let j = 0; j < map.length; j++) for (let i = 0; i < map[j].length; i++) {
    if (!(isP(i, j) && isP(i + 1, j) && isP(i, j + 1) && isP(i + 1, j + 1))) continue;
    for (const k of [[0, 0], [1, 0], [0, 1], [1, 1]]) used.add(i + k[0] + ',' + (j + k[1]));
    // people stand in the aisle below the machine; for the last row (the aisle by the front wall is hard to see), the aisle above
    const below = j + 3 < map.length - 1;
    out.push({ x: inn.x + (i + 1) * TS, y: inn.y + (j + 1) * TS, sx: inn.x + (i + 1) * TS, sy: inn.y + (below ? j + 2.5 : j - 0.5) * TS, dead: false, spill: 0, field: null });
  }
  return out;
}

/** The ways into the hall: the front door, the two front corners, and the back door by the lockers. */
function m10Ways(w: WorldScene, s: Story): Pt[] {
  const inn = roomOf(w, 'pachinko');
  return [spot(s, 'pachinko', 'D', 0, -1), spot(s, 'pachinko', '2'), spot(s, 'pachinko', '3'), { x: inn.x + 4.5 * TS, y: inn.y + 1.5 * TS }];
}

function m10Wave(w: WorldScene, s: Story): void {
  const ways = m10Ways(w, s);
  for (let i = 0; i < T.m10Waves[s.vars.wave as number]; i++) {
    // most raiders come for Jun; some smash machines; one goes for the cash office
    const job = i % 3 === 1 ? 'smash' : i === 3 ? 'office' : 'chase';
    const t = thug(w, comeIn(w, ways), 'thug', job === 'chase' ? 'chase' : 'smash', false, i < 2 ? B.m10Raiders[i] : '');
    t.data.job = job; t.data.m = -1;
  }
}

/** A machine is wrecked. A shot one spills its steel balls across the aisles beside it. */
function m10Break(w: WorldScene, s: Story, m: Machine, shot: boolean): void {
  m.dead = true;
  s.vars.lost = (s.vars.lost as number) + 1;
  w.fx.spark(m.x, m.y);
  for (let k = 0; k < 4; k++) w.fx.puff(m.x + (Math.random() - 0.5) * 40, m.y + (Math.random() - 0.5) * 40, 0x2a2622, 22, 0.9, 0, -30, 1.6, 0.8);
  if (!shot) return;
  m.spill = T.m10SpillTime;
  for (let k = 0; k < 14; k++) w.fx.mark(m.x + (Math.random() - 0.5) * 84, m.y + (k % 2 ? 1 : -1) * (TS * 1.5 + (Math.random() - 0.5) * 22), 'dot', 0, 0.22, 0.22, 0xd8dce4, 0.9, T.m10SpillTime);
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

/** A floor 9 guard: `leg` is the corner of the corridor he is walking to. */
interface Patrol { a: Actor; leg: number }

/** The gala floor: guards ignore a caterer with a tray unless he runs (a dodge roll); and Ogata has met Jun. */
function m15Gala(w: WorldScene, s: Story, dt: number): void {
  const p = w.player.pos, ogata = s.vars.ogata as Actor;
  const seen = (s.vars.guards as Actor[]).some((g) => dist(g, p) < 260 && w.map.los(g.x, g.y, p.x, p.y));
  let add = -T.m15Drain * dt;
  if (seen && w.player.rolling && !s.flags.rolled) add = T.m15RunJump;
  s.flags.rolled = w.player.rolling;
  const t = s.vars.linger as number;
  s.vars.linger = dist(ogata, p) < T.m15OgataDist ? t + dt : Math.min(0, t + dt);
  if ((s.vars.linger as number) > T.m15OgataTime) { s.vars.linger = -5; add = T.m15OgataJump; w.fx.bark(ogata.sprite, B.m15Ogata, '#f0e8c8'); }
  m15Sus(s, add);
}

/** Floor 9: no excuse for being here. Two guards walk the corridor round the floor, one behind the other; each notices Jun by distance and line of sight. */
function m15Floor9(w: WorldScene, s: Story, dt: number): void {
  const p = w.player.pos, loop = s.vars.loop as Pt[], guards = s.vars.patrols as Patrol[];
  if (!s.flags.up) { // the elevator doors open: one guard is at the far corner walking away, the other is on his way round
    s.flags.up = true;
    guards.forEach((g, i) => { const c = loop[i * 2 % loop.length]; g.a.body.reset(c.x, c.y); g.leg = (i * 2 + 1) % loop.length; });
  }
  let add = -T.m15Drain * dt;
  for (const g of guards) {
    const to = loop[g.leg];
    if (g.a.moveTo(to.x, to.y, s.flags.rush ? T.m15PatrolRush : T.m15PatrolSpeed) < 8) g.leg = (g.leg + 1) % loop.length;
    const d = dist(g.a, p);
    if (d < T.m15SeeDist && w.map.los(g.a.x, g.a.y, p.x, p.y)) add = Math.max(add, (d < T.m15SeeDist * 0.45 ? T.m15FillNear : T.m15FillFar) * dt);
  }
  if (s.flags.tray) add = T.m15FillNear * dt; // up here before Hikari has the elevator: a caterer and his tray, where caterers don't go
  m15Sus(s, add);
}

// =====================================================================================
// M16 Typhoon: waves
// =====================================================================================

function m16Wave(w: WorldScene, s: Story): void {
  const gate = s.place('mansionGate'), path = s.keep.path === 'police' ? 'police' : 'yakuza';
  const wave = s.vars.wave as number, allies = s.vars.allies as Actor[], n = T.m16Waves[wave];
  // the first soldiers of each wave come at the gate; the rest get over the east wall into the garden (and, in the last wave, in through the hall)
  const ways = [spot(s, 'mansion', '5'), spot(s, 'mansion', '6'), ...(wave >= 2 ? [spot(s, 'mansion', '4')] : [])];
  for (let i = 0; i < n; i++) { // every fourth soldier goes for Genzō's room; every third has a gun
    const indoors = i >= n - T.m16Inside[wave];
    const t = thug(w, indoors ? comeIn(w, ways) : arrive(w, gate, 330, 560), 'thug', i % 4 === 3 ? 'smash' : 'chase', i % 3 === 0, i < 2 ? B.m16Soldiers[i] : '');
    t.data.indoors = indoors;
  }
  w.fx.bark(allies[1 + (wave % T.m16Squad)].sprite, B.m16Squad[path], WARM);
  if (wave === 1) w.time.delayedCall(2500, () => s.active && allies[0].alive && w.fx.bark(allies[0].sprite, B.m16Leader[path], PALE));
}

// =====================================================================================
// Hooks
// =====================================================================================

Object.assign(HOOKS, {
  // ----- M09 Welcome to Hanabi-chō -----
  m09Setup(w, s) {
    s.flags.doorsOpen = true; // a scuffle on the way must not lock Jun out of the shops
    const gate = s.place('hanabiGate'), roof = spot(s, 'kuroganeRoof', '1');
    for (const [dx, dy] of [[-34, -6], [-16, -12], [16, -12], [34, -6]]) npc(w, s, 'thug', gate.x + dx, gate.y + dy); // the four soldiers
    s.cars.push(storyCar(w, VEHICLES.sedan, gate.x + 72, gate.y + 2, 0, WHITE_SEDAN)); // Saeko's white car
    npc(w, s, 'saeko', roof.x + 22, roof.y - 6); // she waits for the envelope on the rooftop above her office
    // each owner is behind their own counter (the mission fails if one dies)
    s.vars.owners = [ownerAt(w, s, 'bar', 'mama'), ownerAt(w, s, 'arcade', 'shopkeeper'), ownerAt(w, s, 'florist', 'grandmother')];
    const k = spot(s, 'clubMirage', '2');
    s.vars.kaz = thug(w, k, 'salaryman', 'idle'); // Kaz, on his dance floor
  },
  m09Brawl(w, s) {
    s.flags.brawl = true;
    const kaz = s.vars.kaz as Actor, boys = [kaz];
    if (kaz.alive) kaz.state = 'chase';
    // his boys come off the booths, then out of the kitchen and the office
    const from = ['5', '6', '3', '4'];
    for (let i = 0; i < T.m09Boys; i++) { const q = spot(s, 'clubMirage', from[i % from.length]); boys.push(thug(w, free(w, q.x + (i >= from.length ? 20 : 0), q.y), 'thug', 'chase')); }
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
    s.flags.doorsOpen = true;
    putInside(w, s, 'pachinko', '1', 'pachinko'); // the mission plays on the hall floor
    const hall = roomOf(w, 'pachinko'), machines = m10Machines(w);
    s.vars.machines = machines;
    s.vars.saeko = npc(w, s, 'saeko', hall.x + hall.w / 2, hall.y + hall.h / 2); // in the middle of the floor, katana drawn
    // gamblers at the back row of machines (the wide aisle, so nobody's way is blocked)
    const back = machines.filter((m) => m.y === machines[0].y);
    s.vars.gamblers = back.slice(0, 6).map((m, k) => npc(w, s, ['salaryman', 'elder', 'customer', 'grandmother'][k % 4], m.x + (k % 2 ? 12 : -12), m.y - TS * 1.45));
    s.vars.office = fieldTo(w, spot(s, 'pachinko', '4')); // the cash office, in the corner
    s.vars.lost = 0; s.vars.wave = 0; s.vars.slipT = 0;
  },
  m10Start(w, s) { m10Wave(w, s); },
  m10Van(_w, s) {
    s.timer = null; s.hint = '';
    const b = s.place('pachinko').rect!;
    s.vars.back = { x: b.x + b.w / 2, y: b.y - 60 }; // the street behind the hall
    s.vars.stopT = 0; s.vars.outT = 0;
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
  /** The scene moves to the mansion: Genzō by his garden window, Saeko kneeling, Jun standing. */
  m10Mansion(w, s) {
    if (w.player.car) w.player.exitCar();
    putInside(w, s, 'mansion', '9', 'mansion');
    const g = spot(s, 'mansion', '8');
    npc(w, s, 'genzo', g.x, g.y).sprite.rotation = Math.PI / 2;
    npc(w, s, 'saeko', g.x - 3 * TS, g.y + 10);
  },

  // ----- M11 Scramble -----
  m11Setup(w, s) {
    const x = s.place('scramble');
    npc(w, s, 'pip', x.x + 26, x.y - 20);
    const kid = npc(w, s, 'student', x.x - 4, x.y + 8);
    kid.body.setImmovable(false);
    s.vars.thief = kid; s.vars.leg = 0; s.vars.lostT = 0;
    s.flags.doorsOpen = true; // the hideout lets Jun in even with the police about
    const den = spot(s, 'capsule', '1'); // Hikari waits inside the hideout
    npc(w, s, 'hikari', den.x - 40, den.y - 8);
    npc(w, s, 'pip', den.x + 34, den.y + 10); // (and Pip, later, with an ice pack on her elbow)
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
    s.flags.doorsOpen = true;
    putInside(w, s, 'voiceCaveTop', '1', 'karaoke'); // the meeting is in the VIP room on the top floor
    const m = spot(s, 'voiceCaveTop', '3'), f = spot(s, 'voiceCave2', '7');
    s.vars.mibu = w.gang.spawnThug(m.x, m.y, 'mibu', 'idle', T.m14MibuHp);
    (s.vars.mibu as Actor).sprite.rotation = Math.PI / 2;
    s.vars.guards = [-1, 1].map((k) => thug(w, spot(s, 'voiceCaveTop', '4', 0, k), 'thug', 'idle')); // the two at the VIP room's door
    s.vars.fujita = w.gang.spawnThug(f.x, f.y, 'fujita', 'idle', T.m14FujitaHp); // downstairs, in room 6
    s.flags.inside = true;
  },
  m14Dealt(w, s) {
    const f = s.vars.fujita as Actor;
    if (s.keep.fujita === 'fujitaDead') { if (f.alive) w.hurtActor(f, 999, true, 'melee'); return; }
    // he runs down the corridor for the stairs (and the train)
    const stairs = spot(s, 'voiceCave2', '<');
    const i = w.gang.thugs.indexOf(f); // from here he is a bystander, not an enemy
    if (i >= 0) w.gang.thugs.splice(i, 1);
    s.actors.push(f);
    s.vars.runTo = stairs; s.vars.run = fieldTo(w, stairs); s.vars.runT = 0;
  },
  /** Fujita spared: the two bodyguards from the VIP room come down the stairs, and more wait in the lobby. */
  m14Guards(_w, s) { s.flags.hunted = s.keep.fujita === 'fujitaSpared'; },
  m14Out(w, s) {
    s.flags.inside = false; // Jun gets his gun back at the door
    w.setAmbience({ ...AMBIENCE.night, rain: true }); // "in the rain"
    const out = s.place('karaoke'); // the street door
    s.cars.push(storyCar(w, VEHICLES.sedan, out.x + 70, out.y + 14, 0, WHITE_SEDAN)); // Saeko's white car is waiting
    npc(w, s, 'saeko', out.x + 32, out.y + 8);
  },

  // ----- M15 Fork in the Road -----
  m15Setup(w, s) {
    s.flags.doorsOpen = true;
    putInside(w, s, 'ramen', '1', 'ramen'); // the plan is made in the ramen shop after closing
    const r = spot(s, 'ramen', '1');
    npc(w, s, 'hikari', r.x - 2 * TS, r.y + 6);
    // the gala hall: three guests to serve (in this order), more guests, three guards, and Ogata beside the second guest
    const G = (ch: string, dx = 0, dy = 0) => spot(s, 'tsukuGala', ch, dx, dy);
    s.vars.guests = ['4', '5', '3'].map((ch, i) => npc(w, s, ['salaryman', 'elder', 'customer'][i], G(ch).x, G(ch).y));
    [G('4', -5, -6), G('3', 4, 0), G('5', -5, 1), G('4', 3, 4), G('5', 3, -6)].forEach((q, i) => npc(w, s, ['grandmother', 'salaryman', 'elder', 'student', 'customer'][i], q.x, q.y));
    s.vars.guards = [G('3', 9, -1), G('4', -5, 1), G('5', -8, 4)].map((q) => npc(w, s, 'yatagarasu', q.x, q.y)); // by the elevator, by the kitchen door, by the long bar
    s.vars.ogata = npc(w, s, 'ogata', G('5', 1, 1).x, G('5', 1, 1).y);
    s.vars.lift = G('>'); // the service elevator
    // floor 9: two guards walk the corridor round the floor (its four corners, clockwise from the top left)
    const loop = ['2', '3', '4', '5'].map((ch) => spot(s, 'tsuku9', ch));
    s.vars.loop = loop;
    s.vars.patrols = [0, 1].map((i): Patrol => {
      const a = npc(w, s, 'yatagarasu', loop[i * 2].x, loop[i * 2].y);
      a.body.setImmovable(false);
      return { a, leg: i * 2 + 1 };
    });
    s.vars.sus = 0; s.vars.served = 0; s.vars.linger = 0;
  },
  m15In(_w, s) { s.flags.tray = true; },
  m15Lift(_w, s) { s.flags.tray = false; s.hint = ''; }, // the tray stays downstairs
  m15ToSafe(_w, s) { s.vars.workT = 0; },
  m15Bridge(w) { w.fx.bark(w.player.pos, B.m15JunSafe, GOLD); },
  m15Back(w, s) {
    s.flags.rush = true; // security is on its way round
    const p = w.player.pos, guards = (s.vars.patrols as Patrol[]).map((g) => g.a);
    shout(w, guards.reduce((a, c) => (dist(c, p) < dist(a, p) ? c : a)), B.m15Security, '#9cc0ff');
  },
  m15Done(_w, s) { s.flags.done = true; s.timer = null; },

  // ----- M16 Typhoon -----
  m16Setup(w, s) {
    armed(w);
    s.flags.doorsOpen = true; // the mansion's door stays open to Jun through the fight
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
    // the ally squad at the gate: Saeko and her loyalists, or Sawada and her riot officers...
    const allies = [[70, -44], [70, 46], [76, -76], [76, 78]].slice(0, T.m16Squad + 1)
      .map(([dx, dy], i) => npc(w, s, i === 0 ? (cop ? 'sawada' : 'saeko') : cop ? 'riot' : 'courier', gate.x + dx, gate.y + dy));
    // ...and the last of them inside the house, in the corridor outside Genzō's door
    for (let i = 0; i < T.m16HouseGuards; i++) { const q = spot(s, 'mansion', '7', i * 5 - 2, 1); allies.push(npc(w, s, cop ? 'riot' : 'courier', q.x, q.y)); }
    s.vars.allies = allies;
    const g = spot(s, 'mansion', '8');
    npc(w, s, 'genzo', g.x, g.y).sprite.rotation = Math.PI / 2; // Genzō refuses to leave his room
    s.vars.room = fieldTo(w, s.place('mansion')); // from the street, the way to Genzō is the mansion's front door
    s.vars.inRoom = fieldTo(w, spot(s, 'mansion', '7')); // inside the house, it is the door of his room
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
  /** After the roof: back in the tatami room, Saeko kneeling beside her father. */
  m16Room(w, s) {
    putInside(w, s, 'mansion', '9', 'mansion');
    const g = spot(s, 'mansion', '8');
    npc(w, s, 'saeko', g.x - 3 * TS, g.y + 10);
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
    const machines = s.vars.machines as Machine[], office = spot(s, 'pachinko', '4'), p = w.player.actor;
    // a shot that finds a machine instead of a raider
    const gun = w.player.weapon;
    if (gun.def.id === s.vars.gunId && gun.mag < (s.vars.gunMag as number)) {
      const dx = Math.cos(w.player.aim), dy = Math.sin(w.player.aim);
      const along = (o: Pt, half: number) => { const a = (o.x - p.x) * dx + (o.y - p.y) * dy; return a > 0 && Math.abs((o.x - p.x) * dy - (o.y - p.y) * dx) < half ? a - half : 1e9; };
      let hit: Machine | null = null, bd: number = gun.def.range;
      for (const m of machines) if (along(m, TS - 4) < bd) { bd = along(m, TS - 4); hit = m.dead ? null : m; } // a wrecked machine still stops the bullet
      if (hit && !w.gang.thugs.some((t) => t.alive && along(t, 9) < bd)) m10Break(w, s, hit, true);
    }
    s.vars.gunId = gun.def.id; s.vars.gunMag = gun.mag;
    // raiders with a job: smash machines, or get to the cash office
    for (const t of w.gang.thugs) {
      if (!t.alive || t.state !== 'smash') continue;
      const hits = (t.data.hit as number) || 0;
      if (t.data.job === 'office') { steer(w, t, s.vars.office as Int16Array, office); if (hits >= T.m10OfficeHits) s.flags.office = true; continue; }
      let m = machines[t.data.m as number];
      if (!m || m.dead) {
        const open = machines.filter((x) => !x.dead);
        if (!open.length) continue;
        m = open.reduce((a, c) => (dist(c, t) < dist(a, t) ? c : a));
        t.data.m = machines.indexOf(m); t.data.hit = 0;
      } else if (hits >= T.m10MachineHits) { m10Break(w, s, m, false); t.data.hit = 0; }
      const at = { x: m.sx, y: m.sy };
      steer(w, t, (m.field ??= fieldTo(w, at)), at);
    }
    // wrecked machines smoke
    for (const m of machines) if (m.dead && Math.random() < 0.03) w.fx.puff(m.x + (Math.random() - 0.5) * 30, m.y + (Math.random() - 0.5) * 30, 0x3a3632, 14, 1.1, 0, -26, 1.8, 0.6);
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
    const slip = onBalls(p);
    if (slip && !s.flags.onBalls) { const v = p.body.velocity, l = Math.hypot(v.x, v.y) || 1; s.vars.slipT = T.m10SlideTime; s.vars.slipX = v.x / l; s.vars.slipY = v.y / l; }
    s.flags.onBalls = slip;
    if ((s.vars.slipT as number) > 0) {
      s.vars.slipT = (s.vars.slipT as number) - dt;
      const nx = p.x + (s.vars.slipX as number) * T.m10SlideSpeed * dt, ny = p.y + (s.vars.slipY as number) * T.m10SlideSpeed * dt;
      if (![[0, 0], [8, 0], [-8, 0], [0, 8], [0, -8]].some(([ex, ey]) => w.map.isSolid(nx + ex, ny + ey))) p.body.reset(nx, ny);
    }
    alliesFight(w, [s.vars.saeko as Actor], dt, T.m10SaekoReach, T.m10SaekoDamage, T.m10SaekoGap);
    if (Math.random() < 0.006) w.fx.bark(pick(s.vars.gamblers as Actor[]).sprite, pick(B.m10Gamblers), WARM, 'gambler', 4);
    const lost = s.vars.lost as number, wave = s.vars.wave as number;
    s.timer = { label: `WAVE ${wave + 1}/${T.m10Waves.length} · MACHINES LOST ${lost}/${T.m10MaxLost}`, value: lost, max: T.m10MaxLost, kind: 'bar' };
    // raiders only come while Jun is on the floor; if he steps outside, the marker brings him back to the door
    s.marker = w.indoors?.id === 'pachinko' ? null : { x: office.x, y: office.y, r: 0 };
    if (w.gang.activeThugs > 0) return false;
    s.vars.wave = wave + 1;
    if (wave + 1 >= T.m10Waves.length) return true;
    m10Wave(w, s);
    return false;
  },
  m10Lost: (w, s) => {
    if (!s.vars.machines) return false;
    if ((s.vars.lost as number) < T.m10MaxLost && !s.flags.office) return false;
    w.fx.bark((s.vars.saeko as Actor).sprite, B.m10Fail, PALE);
    return true;
  },
  m10VanStopped: (w, s, dt) => {
    if (!s.vars.van) { // the van pulls out once Jun is outside and coming round to the back (or has taken too long about it)
      const back = s.vars.back as Pt;
      s.marker = { x: back.x, y: back.y, r: 0 };
      if (w.indoors) return false;
      s.vars.outT = (s.vars.outT as number) + dt;
      if (dist(w.player.pos, back) > T.m10VanNear && (s.vars.outT as number) < T.m10VanWait) return false;
      const van = laneCar(w, s, VEHICLES.truck, 0, back, 0, T.m10VanCruise);
      van.panic = 9999; // he is not stopping for lights
      s.vars.van = van;
    }
    return stopped(w, s, s.vars.van as Car, T.m10VanStopHp, dt);
  },
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
  m14Failed: (w, s, dt) => {
    const mibu = s.vars.mibu as Actor | undefined;
    if (!mibu) return false;
    // Fujita, spared, runs for the stairs; once he is gone (or after a few seconds) the bodyguards come for Jun
    const f = s.vars.fujita as Actor, run = s.vars.run as Int16Array | null;
    if (run) {
      s.vars.runT = (s.vars.runT as number) + dt;
      if (walk(w, f, run, s.vars.runTo as Pt, T.m14FujitaSpeed) < 24 || (s.vars.runT as number) > T.m14FujitaTime) { // down the stairs and gone
        s.vars.run = null;
        f.body.setVelocity(0, 0); f.body.enable = false; f.sprite.setVisible(false);
      }
    } else if (s.flags.hunted && !s.flags.loosed) {
      s.flags.loosed = true;
      const guards = s.vars.guards as Actor[];
      guards.forEach((g, i) => { if (g.alive) { const q = free(w, spot(s, 'voiceCave2', '>', 1, -1 - i).x, spot(s, 'voiceCave2', '>', 1, -1 - i).y); g.body.reset(q.x, q.y); } }); // down the stairs from the VIP room
      for (let i = 0; i < T.m14Guards; i++) guards.push(thug(w, spot(s, 'voiceCave', i % 2 ? '2' : '1', i >> 1, 0), 'thug', 'chase')); // and more in the lobby, between Jun and the door
      for (const g of guards) if (g.alive) g.state = 'chase';
      const first = guards.find((g) => g.alive);
      if (first) shout(w, first, B.m14Bodyguard, RED);
    }
    if (!s.flags.inside) return false;
    if (w.player.current !== 0) w.player.switchTo(0); // a bodyguard took Jun's gun at the door: no weapons inside
    if (mibu.alive && mibu.state !== 'idle') mibu.state = 'idle';
    if (mibu.hp >= T.m14MibuHp) return false;
    s.vars.failHint = B.m14Card; // Jun attacked Mibu
    return true;
  },
  m14Corridor: (w, s) => {
    const mibu = s.vars.mibu as Actor;
    if (!s.flags.heard && w.indoors?.id === 'voiceCaveTop' && w.player.pos.x < spot(s, 'voiceCaveTop', '4', -1.5).x) { // overheard through the door, on the way down the corridor
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
    if (!s.vars.patrols || s.flags.done) return false;
    const room = w.indoors?.id;
    if (room === 'tsuku9') m15Floor9(w, s, dt);
    else if (room === 'tsukuGala' && s.flags.tray) m15Gala(w, s, dt);
    else if (s.timer) m15Sus(s, -T.m15Drain * dt);
    return !!s.flags.caught;
  },
  m15Serve: (w, s) => {
    const guests = s.vars.guests as Actor[], i = s.vars.served as number, lift = s.vars.lift as Pt;
    if (i >= guests.length) { s.marker = { x: lift.x, y: lift.y, r: 28 }; return near(w, s); }
    s.marker = { x: guests[i].x, y: guests[i].y, r: 28 };
    if (near(w, s)) { w.fx.bark(guests[i].sprite, B.m15Guests[i], WARM); s.vars.served = i + 1; }
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
    const door = s.place('mansion'), room = spot(s, 'mansion', '7'), wave = s.vars.wave as number;
    let far: Actor | null = null, here = false; // is anyone left to fight where Jun is? If not, the marker points at the others
    for (const t of w.gang.thugs) {
      if (!t.alive || t.state === 'flee') continue;
      if (withJun(w, t)) here = true; else far = t;
      if (t.state !== 'smash') continue; // the ones heading for Genzō's room
      if (t.data.indoors) { steer(w, t, s.vars.inRoom as Int16Array, room); if (((t.data.hit as number) || 0) >= T.m16RoomHitsInside) s.flags.fell = true; }
      else { steer(w, t, s.vars.room as Int16Array, door); if (((t.data.hit as number) || 0) >= T.m16RoomHits) s.flags.fell = true; }
    }
    s.marker = !here && far ? { x: far.x, y: far.y, r: 0 } : null;
    s.hint = `Wave ${wave + 1} of ${T.m16Waves.length}`;
    if (w.gang.activeThugs > 0) return false;
    s.marker = null;
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
    if (w.indoors?.id === 'mansionRoof') { // the storm on the roof: rain flying sideways
      const r = w.indoors;
      for (let k = 0; k < 3; k++) w.fx.puff(r.x + Math.random() * r.w, r.y + Math.random() * r.h, 0xb8d0f0, 3, 0.35, 420, 60, 1, 0.6);
    }
    if (!s.flags.fell) return false;
    s.vars.failHint = B.m16Card;
    return true;
  },
} as Record<string, Check>);
