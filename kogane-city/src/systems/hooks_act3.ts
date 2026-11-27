import * as Phaser from 'phaser';
import { ACT3_BARKS as B, ACT3_TUNING as T, ACT3_HUD as L, KOGANE_TALK } from '../data/missions_act3';
import { AMBIENCE, DAY } from '../data/missions';
import { MAP } from '../data/map';
import { TILE_SIZE as TS } from '../data/config';
import { TRAFFIC } from '../data/ai';
import { PLAYER } from '../data/player';
import { WEAPONS } from '../data/weapons';
import { VEHICLES, CAR_DAMAGE, BLACK_SEDAN, WHITE_SEDAN } from '../data/vehicles';
import { HOOKS, CHECKS, free, npc, near, storyCar, laneCar, dist } from './missionHooks';
import type { Hook, Check } from './missionHooks';
import type { Actor } from '../entities/Actor';
import type { Car } from '../entities/Car';
import type { WorldScene } from '../scenes/WorldScene';
import type { Story } from './Story';

// The set pieces for Act 3 (missions 17-24 and the endings). The words are in
// data/missions_act3.ts; this is only what each mission does.
//
// Indoor scenes happen in real rooms (drawn in data/interiors_act3.ts): the harbour office, the
// fish market hall, Rokkaku Tower and its rooftop party, Mibu Tower from lobby to helipad, Tsukuyomi
// Tower floor by floor, and the bridge deck and hold of the Amaterasu Maru.
//
// What the engine can't do yet, and how it is staged here:
//  - no boats: chases on water are car chases along the shore (bible cut list); the ship is a
//    drawing in the water beside the north quay, and its open "deck" is the quay next to it;
//  - no helicopter: one is drawn over an invisible truck, which is what the bullets hit.

type Pt = { x: number; y: number };
type Graphics = Phaser.GameObjects.Graphics;

/** Colours of floating lines, by who speaks. */
const COL = { jun: '#e8b923', goro: '#b8c0cc', foe: '#ffd0a0', ally: '#f0f0f0', tetsu: '#a8c080', mibu: '#e06a80', guest: '#ffe9c0', hachiro: '#6ad0c8', ogata: '#f0e8c8' };
/** Bosses carry this much spare health, so nothing can kill them outright: the story needs them alive afterwards. */
const BOSS_PAD = 100000;

const pick = <X>(list: readonly X[]): X => list[Math.floor(Math.random() * list.length)];
const num = (s: Story, k: string): number => (s.vars[k] as number) || 0;
/** The mission's enemies with this tag who are still standing. */
const foes = (w: WorldScene, tag: string): Actor[] => w.gang.thugs.filter((t) => t.alive && t.data.tag === tag);

function foe(w: WorldScene, at: Pt, look: string, tag: string, state: 'wait' | 'guard' | 'chase' | 'idle' = 'chase', gun = false, bark = ''): Actor {
  const f = free(w, at.x, at.y), t = w.gang.spawnThug(f.x, f.y, look, state);
  t.data.tag = tag;
  if (gun) t.data.gun = true;
  if (bark) t.data.bark = bark;
  return t;
}

/** A numbered spot in a room (the digits in the room's map), e.g. spot(s, 'mibuLobby', '2'). */
const spot = (s: Story, room: string, ch: string): Pt => s.place(`${room}:${ch}`);
/** A tile of a room, counted across and down from its top-left corner. */
function tile(w: WorldScene, room: string, tx: number, ty: number): Pt {
  const r = w.map.interiors.find((i) => i.id === room)!;
  return { x: r.x + (tx + 0.5) * TS, y: r.y + (ty + 0.5) * TS };
}
/**
 * The story puts Jun inside a room. When he walks out, he comes out of the street door of
 * `street` (the building's ground-floor room; the room itself unless given).
 */
function goIn(w: WorldScene, room: string, ch: string, street = room): void {
  w.enterRoom(room, ch);
  const d = w.map.doors.find((o) => o.kind === 'in' && o.interior === street);
  w.lastDoor = d ? { x: d.x, y: d.y } : null;
}
/** Guards posted in a room, one per numbered spot (`at` lists the spots). They stand there until Jun walks in; every other one carries a gun. */
function post(w: WorldScene, s: Story, room: string, at: string, n: number, look: string, tag: string, bark = ''): Actor[] {
  const out: Actor[] = [];
  for (let i = 0; i < n; i++) {
    const q = spot(s, room, at[i % at.length]), lap = Math.floor(i / at.length);
    const t = foe(w, { x: q.x + lap * 26, y: q.y + lap * 20 }, look, tag, 'guard', i % 2 === 0, bark);
    t.data.room = room;
    out.push(t);
  }
  return out;
}
/** The guards in the room Jun has just walked into go for him. Returns the ones who have only now noticed. */
function wake(w: WorldScene, tag: string): Actor[] {
  const here = w.indoors?.id, out: Actor[] = [];
  if (here) for (const t of foes(w, tag)) if (t.data.room === here && t.state === 'guard') { t.state = 'chase'; out.push(t); }
  return out;
}
/** Enemies still to deal with: the marker shows the way to the first of them (through the right door or up the right stairs). */
function hunt(s: Story, left: Actor[]): void {
  s.marker = left.length ? { x: left[0].x, y: left[0].y, r: 0 } : null;
}

/** A pavement spot near a point, out of view if there is one: where reinforcements run in from. */
function arrive(w: WorldScene, around: Pt, min = 220, max = 420): Pt {
  let pos = w.map.randomWalkNear(around.x, around.y, min, max);
  for (let k = 0; k < 8 && pos && w.onScreen(pos.x, pos.y, 20); k++) pos = w.map.randomWalkNear(around.x, around.y, min, max);
  return pos ?? free(w, around.x + min, around.y);
}

/** A wave of enemies who run in toward a point; every other one carries a gun. */
function wave(w: WorldScene, n: number, around: Pt, look: string, tag: string, bark = ''): Actor[] {
  const out: Actor[] = [];
  for (let i = 0; i < n; i++) out.push(foe(w, arrive(w, around), look, tag, 'chase', i % 2 === 0, bark));
  return out;
}

/** Puts a gun in Jun's hand (with at least a starting load of ammunition). */
function arm(w: WorldScene, id: string): void {
  const p = w.player, def = WEAPONS[id];
  if (!def) return;
  const have = p.weapons.find((x) => x.def.id === id);
  if (have) have.reserve = Math.max(have.reserve, def.startReserve); else p.giveWeapon(id);
  p.switchTo(p.weapons.findIndex((x) => x.def.id === id));
}
const vest = (w: WorldScene): void => { w.player.armour = Math.max(w.player.armour, Math.min(PLAYER.maxArmour, T.armour)); };

/** Runs a little later, unless the mission has ended or been restarted since. */
function later(w: WorldScene, s: Story, ms: number, fn: () => void): void {
  const v = s.vars;
  w.time.delayedCall(ms, () => { if (s.active && s.vars === v) fn(); });
}

/** Now and then, one of these people (if on screen) says one of these lines. */
function chatter(w: WorldScene, who: Actor[], lines: readonly string[], color: string, key: string, gap: number): void {
  if (Math.random() > 0.03) return;
  const seen = who.filter((t) => t.alive && w.onScreen(t.x, t.y, 0));
  if (seen.length) w.fx.bark(pick(seen).sprite, pick(lines), color, key, gap);
}

/**
 * The "have I been seen?" meter (as in mission 7): it fills while any watcher has a clear
 * line to Jun inside `reach`, faster up close, and drains otherwise. True when it is full.
 */
function noticed(w: WorldScene, s: Story, watchers: Pt[], reach: number, dt: number): boolean {
  const p = w.player.pos;
  let rate = -T.noticeDrain;
  for (const o of watchers) {
    const d = dist(o, p);
    if (d < reach && w.map.los(o.x, o.y, p.x, p.y)) rate = Math.max(rate, d < reach * 0.45 ? T.noticeNear : T.noticeFar);
  }
  const eye = Phaser.Math.Clamp(num(s, 'eye') + rate * dt, 0, 1);
  s.vars.eye = eye;
  s.timer = { label: L.noticed, value: eye, max: 1, kind: 'bar' };
  return eye >= 1;
}

/** Something drawn for one mission (the helicopter, the ship): it is removed with the mission, like its characters. */
function prop<G extends Phaser.GameObjects.GameObject>(s: Story, obj: G): G {
  s.actors.push({ alive: false, x: 0, y: 0, sprite: obj, animate() { /* nothing to animate */ }, destroy() { obj.destroy(); } } as unknown as Actor);
  return obj;
}

/** A story vehicle goes down in a fireball that hurts nobody, leaving a burnt wreck. */
function scuttle(w: WorldScene, c: Car): void {
  w.fx.explosion(c.x, c.y, 80);
  c.hp = 0; c.burning = false; c.wreck = true; c.wreckTimer = CAR_DAMAGE.wreckTime; c.driver = 'none';
  c.sprite.setVisible(true).setTint(0x2a2a2a);
}
/** Keeps a story vehicle in one piece until the story is ready to lose it. */
function afloat(c: Car): void { if (!c.wreck) { c.hp = Math.max(c.hp, c.maxHp * 0.6); c.burning = false; } }

/** The ally's people hold the street outside: the police stay out of this fight. */
function noPolice(w: WorldScene): void {
  if (w.heat.level > 0) { w.heat.clear(false); w.police.standDown(true); }
}
/** The finale is between Jun and the ship: no police, and no through traffic on the quay. */
function calm(w: WorldScene, at: Pt): void {
  noPolice(w);
  for (const c of w.cars) if (c.driver === 'traffic' && !c.story && dist(c, at) < 1300 && !w.onScreen(c.x, c.y, 60)) c.destroy();
}
/** A yard the story is using as a stage (a rooftop, a courtyard): nobody's car is parked there. */
function clearLot(w: WorldScene, r: { x: number; y: number; w: number; h: number }): void {
  for (const c of w.cars) if (c.driver === 'none' && !c.story && !c.unlocked && !c.removed && c.x > r.x - 8 && c.x < r.x + r.w + 8 && c.y > r.y - 8 && c.y < r.y + r.h + 8) c.destroy();
}

/** Someone Jun is leading out (Mika): she keeps up on foot, rides along in a car, and is never left behind. */
function escort(w: WorldScene, s: Story, a: Actor, dt: number): void {
  const p = w.player, at = p.pos;
  if (p.car) { a.body.reset(p.car.x, p.car.y); a.sprite.setVisible(false); return; }
  const d = dist(a, at);
  const stuck = d > 60 && (a.body.speed < 20 || !w.map.los(a.x, a.y, at.x, at.y)) ? num(s, 'stuckT') + dt : 0;
  s.vars.stuckT = stuck;
  if (!a.sprite.visible || d > 320 || stuck > 1.5) {
    const f = free(w, at.x - 16, at.y + 14);
    a.body.reset(f.x, f.y); a.sprite.setVisible(true); s.vars.stuckT = 0;
    return;
  }
  if (d > 34) a.moveTo(at.x, at.y, 165); else a.body.setVelocity(0, 0);
}

/** Plays a radio line once whatever is on the ticker now has finished. */
function radioLater(w: WorldScene, s: Story, station: string, text: string): void {
  const tick = (): void => { if (s.radio) w.time.delayedCall(1000, tick); else s.radio = { station, text, x: 0 }; };
  w.time.delayedCall(1000, tick);
}

// =====================================================================================
// M17 Low Tide
// =====================================================================================

/** The dockhands' eyes, and the fire Saeko's men light. With the manifest in hand, being noticed is the end. */
function m17Watch(w: WorldScene, s: Story, dt: number): void {
  const docks = foes(w, 'dock'), fire = s.vars.fire as Pt | undefined;
  if (fire && Math.random() < 0.6) w.fx.puff(fire.x + (Math.random() - 0.5) * 44, fire.y + (Math.random() - 0.5) * 16, Math.random() < 0.5 ? 0xff7a1a : 0xffc233, 12, 0.45, 0, -30, 1.2);
  const full = noticed(w, s, docks, T.m17See, dt);
  if (full && s.flags.manifest) s.flags.spotted = true;
  if (full && !s.flags.alarm) { // the alarm: every dockhand comes running
    s.flags.alarm = true;
    for (const t of docks) t.state = 'chase';
    const a = docks.find((t) => w.onScreen(t.x, t.y, 0)) ?? docks[0];
    if (a) w.fx.bark(a.sprite, B.m17Dock[0], COL.foe);
  }
  if (!s.flags.alarm) chatter(w, docks, B.m17Dock.slice(1), COL.foe, 'dock', 9);
}

Object.assign(HOOKS, {
  m17Setup(w, s) {
    const gate = s.place('portGate'), lot = s.place('containerPort').rect!, door = s.place('harbourOffice');
    const car = storyCar(w, VEHICLES.sedan, gate.x + 76, gate.y + 14, 0, 1); // Jun's car, just over the bridge
    car.unlocked = true; s.cars.push(car);
    if (s.keep.path === 'police') { // Sawada and a tactical officer; she lends Jun her old revolver
      npc(w, s, 'sawada', gate.x - 22, gate.y - 12); npc(w, s, 'riot', gate.x + 16, gate.y - 16);
      arm(w, T.sidearm);
    } else { // Saeko with three soldiers
      npc(w, s, 'saeko', gate.x - 22, gate.y - 12);
      for (let i = 0; i < 3; i++) npc(w, s, 'thug', gate.x + 14 + i * 18, gate.y - 16);
    }
    const posts: Pt[] = [
      { x: lot.x + lot.w / 2, y: lot.y + 40 }, // the north gate
      { x: lot.x + 60, y: lot.y + lot.h * 0.55 }, // the left stack
      { x: lot.x + lot.w - 60, y: lot.y + lot.h * 0.5 }, // the right stack
      { x: door.x - 150, y: door.y - 4 }, // the alley behind the harbour office
      spot(s, 'harbourOffice', '1'), // inside the harbour office, by the stairs
    ];
    s.vars.docks = posts.slice(0, T.m17Guards).map((p) => foe(w, p, 'umibozu', 'dock', 'idle'));
    s.vars.eye = 0;
  },
  /** Inside the port: each ally helps in their own way. */
  m17Inside(w, s) {
    const lot = s.place('containerPort').rect!, docks = s.vars.docks as Actor[];
    if (s.keep.path === 'police') { // Sawada's sniper drops the guard on the left stack
      const g = docks[1];
      if (g?.alive) { w.fx.spark(g.x, g.y, 0xd8343a); w.hurtActor(g, 999, false, 'bullet'); }
      return;
    }
    // Saeko's men light a fire at the north gate, and the dockhands nearest it run over
    const fire = { x: lot.x + lot.w / 2, y: lot.y - 22 };
    s.vars.fire = fire;
    w.fx.bark(npc(w, s, 'thug', fire.x + 60, fire.y - 8).sprite, B.m17Soldier, COL.ally);
    [docks[0], docks[2]].forEach((g, i) => { if (g?.alive && g.state === 'idle') { g.state = 'smash'; g.tx = fire.x - 30 + i * 60; g.ty = fire.y + 30; } });
  },
  /** "Harbour office, second floor": the manifest is in the records room upstairs. */
  m17ManifestSpot(_w, s) {
    const at = spot(s, 'harbourRecords', '1');
    s.marker = { x: at.x, y: at.y, r: 30 };
  },
  m17Manifest(_w, s) { s.flags.manifest = true; s.vars.eye = 0; },
  m17Unlock(_w, s) { s.keep.inspectorRevolver = 'inspectorRevolver'; },
} as Record<string, Hook>);

Object.assign(CHECKS, {
  /** An outro phone call plays out before the title card. */
  a3CallOver: (_w, s) => { s.timer = null; s.marker = null; return s.phone.length === 0; },

  m17Sneak: (w, s, dt) => { m17Watch(w, s, dt); return near(w, s); },
  m17Out: (w, s, dt) => {
    m17Watch(w, s, dt);
    if (!near(w, s)) return false;
    s.flags.safe = true;
    return true;
  },
  m17Spotted: (_w, s) => !!s.flags.spotted && !s.flags.safe,
} as Record<string, Check>);

// =====================================================================================
// M18 Fish Market
// =====================================================================================

/** The brawl: the tuna knife's bite, and everyone shouting. */
function m18Fight(w: WorldScene, s: Story, who: Actor[]): void {
  for (const t of w.gang.thugs) { // with the knife, each of Jun's punches lands as a tuna-knife hit
    if (!t.alive) continue;
    const was = t.data.hpWas as number | undefined;
    if (s.flags.knife && was !== undefined && Math.abs(was - t.hp - WEAPONS.fists.damage) < 0.01) w.hurtActor(t, T.m18KnifeDamage - WEAPONS.fists.damage, true, 'melee');
    t.data.hpWas = t.hp;
  }
  chatter(w, who.filter((t) => t.data.tag === 'crew'), B.m18Dock, COL.foe, 'dock', 4);
  const bell = s.vars.auctioneer as Actor;
  if (Math.random() < 0.02) w.fx.bark(bell.sprite, B.m18Auctioneer, COL.guest, 'bell', 7);
}

Object.assign(HOOKS, {
  m18Setup(w, s) {
    // the market hall: Jun is just inside the door, Hachirō in the middle of the floor among the tuna
    goIn(w, 'fishHall', '4');
    const mid = spot(s, 'fishHall', '1'), cx = mid.x, cy = mid.y;
    const boss = foe(w, { x: cx, y: cy }, 'hachiro', 'boss', 'wait');
    boss.hp = BOSS_PAD + T.m18BossHp;
    boss.sprite.setScale(boss.sprite.scaleX * 1.25); // "huge in rubber boots"
    s.vars.boss = boss;
    for (let i = 0; i < T.m18Crew; i++) { // his crew, in a half circle behind him
      const a = -0.4 + (i / Math.max(1, T.m18Crew - 1)) * (Math.PI + 0.8);
      foe(w, { x: cx + Math.cos(a) * 150, y: cy - Math.sin(a) * 45 }, 'umibozu', 'crew', 'wait');
    }
    const bell = spot(s, 'fishHall', '2');
    s.vars.auctioneer = npc(w, s, 'shopkeeper', bell.x, bell.y);
    s.vars.knife = spot(s, 'fishHall', '3');
  },
  /** "Not enough cash forces the fight." */
  m18Chosen(w, s) { if (s.keep.hachiro === 'hachiroPaid' && w.player.cash < T.m18Price) s.keep.hachiro = 'hachiroFought'; },
  m18Brawl(w, s) {
    s.flags.brawl = true;
    for (const t of foes(w, 'crew')) t.state = 'chase';
  },
  m18Boss(_w, s) { (s.vars.boss as Actor).state = 'chase'; s.marker = null; s.hint = ''; },
  m18Unlock(_w, s) { s.keep.umibozuHook = 'umibozuHook'; },
} as Record<string, Hook>);

Object.assign(CHECKS, {
  m18Pay: (w, s) => {
    const boss = s.vars.boss as Actor, p = w.player;
    s.marker = { x: boss.x, y: boss.y, r: 40 };
    if (p.car || dist(p.pos, boss) > 44) return false;
    p.cash -= T.m18Price;
    return true;
  },
  m18Crew: (w, s) => {
    const crew = foes(w, 'crew'), knife = s.vars.knife as Pt, p = w.player;
    if (!s.flags.knife) { // the tuna knife lies on the ice: E picks it up
      s.marker = { x: knife.x, y: knife.y, r: 18 };
      if (Math.random() < 0.3) w.fx.puff(knife.x, knife.y, 0xdfe8f0, 4, 0.3, 0, -12, 0, 0.9);
      if (!p.car && dist(p.pos, knife) < 34 && w.keys.E.isDown) { s.flags.knife = true; s.marker = null; s.hint = ''; }
    }
    m18Fight(w, s, crew);
    return crew.length === 0;
  },
  m18BossDown: (w, s) => {
    const boss = s.vars.boss as Actor, hp = boss.hp - BOSS_PAD;
    m18Fight(w, s, []);
    if (boss.state !== 'chase') boss.state = 'chase';
    s.timer = { label: 'HACHIRŌ', value: Math.max(0, hp), max: T.m18BossHp, kind: 'bar' };
    if (dist(boss, w.player.pos) < 90 && Math.random() < 0.03) w.fx.bark(boss.sprite, B.m18Hachiro, COL.hachiro, 'hachiro', 5);
    if (hp > 0) return false;
    boss.state = 'wait'; // flat on the ice, laughing
    s.flags.brawl = false; s.timer = null;
    return true;
  },
  /** "Jun is knocked out": the brawl stops before it kills him. */
  m18KnockedOut: (w, s) => {
    if (!s.flags.brawl || w.player.hp > T.m18KoHp) return false;
    for (const t of w.gang.thugs) if (t.alive) t.state = 'wait';
    s.flags.brawl = false;
    return true;
  },
} as Record<string, Check>);

// =====================================================================================
// M19 Sea Legs (a car chase along the shore: the "boats" are Goro's car and a smuggler's truck)
// =====================================================================================

function m19Truck(s: Story): Car {
  const truck = s.vars.truck as Car;
  afloat(truck);
  s.marker = { x: truck.x, y: truck.y, r: 0 };
  return truck;
}

Object.assign(HOOKS, {
  m19Setup(w, s) {
    const pier = s.place('pier');
    arm(w, T.sidearm);
    s.vars.goro = npc(w, s, 'goro', pier.x + 22, pier.y - 4);
    const car = storyCar(w, VEHICLES.sports, pier.x + 128, pier.y + 30, Math.PI / 2, 1); // Goro's "speedboat"
    car.unlocked = true; s.cars.push(car); s.vars.boat = car;
  },
  m19Go(w, s) {
    const car = s.vars.boat as Car, ship = s.place('pier9');
    (s.vars.goro as Actor).sprite.setVisible(false); // he's aboard
    w.player.putInCar(car);
    // the smuggler comes over the river on the shore road, bound for the ship at Pier 9
    const row = MAP.hRoads[MAP.port.h0 - 1] * TS + 32;
    const truck = laneCar(w, s, VEHICLES.truck, 1, { x: (MAP.river.x + 3) * TS, y: row }, 0, T.m19TruckSpeed / TRAFFIC.panicMult);
    truck.panic = 9999; // he doesn't stop for lights
    truck.route = w.map.route(truck.seg!, ship.x, ship.y).slice(1);
    s.vars.truck = truck; s.vars.boardT = 0;
  },
  /** Jun jumps across: the truck stops, and its crew pile out. */
  m19Deck(w, s) {
    const truck = s.vars.truck as Car, p = w.player;
    s.flags.boarded = true; s.timer = null;
    truck.driver = 'none'; truck.route = [];
    if (p.car) p.exitCar();
    const side = w.sidePoint(truck, 1);
    p.actor.body.reset(side.x, side.y);
    for (let i = 0; i < T.m19Smugglers; i++) {
      const a = 1 + i * ((Math.PI * 2) / T.m19Smugglers);
      const t = foe(w, { x: truck.x + Math.cos(a) * 110, y: truck.y + Math.sin(a) * 110 }, 'umibozu', 'smuggler', 'chase', i % 2 === 0, B.m19Smuggler);
      if (i === 0) w.fx.bark(t.sprite, B.m19Smuggler, COL.foe);
    }
  },
  /** The ID card in the wheelhouse, then down she goes. */
  m19Sunk(w, s) {
    w.fx.bark(w.player.pos, B.m19JunCard, COL.jun);
    scuttle(w, s.vars.truck as Car);
  },
  m19GoroWaits(w, s) {
    const goro = s.vars.goro as Actor, at = w.sidePoint(s.vars.boat as Car, -1);
    goro.body.reset(at.x, at.y); goro.sprite.setVisible(true);
  },
} as Record<string, Hook>);

Object.assign(CHECKS, {
  m19Catch: (w, s) => {
    const truck = m19Truck(s), car = s.vars.boat as Car;
    if (w.player.car === car && (Math.max(car.lastImpact, car.bump) > 60 || Math.random() < 0.003)) w.fx.bark(car, B.m19Goro, COL.goro, 'goro', 6);
    car.bump = 0;
    return dist(w.player.pos, truck) < T.m19CatchDist;
  },
  m19Board: (w, s, dt) => {
    const truck = m19Truck(s), p = w.player, close = dist(p.pos, truck) < T.m19BoardDist;
    if (close && !s.flags.jump) { // lining up the jump
      s.flags.jump = true;
      w.fx.bark(p.pos, B.m19JunJump, COL.jun);
      later(w, s, 1100, () => w.fx.bark(s.vars.boat as Car, B.m19GoroJump, COL.goro));
    }
    const t = Math.max(0, num(s, 'boardT') + (close ? dt : -dt * 0.5));
    s.vars.boardT = t;
    s.timer = { label: L.board, value: t, max: T.m19BoardTime, kind: 'bar' };
    return t >= T.m19BoardTime;
  },
  m19Clear: (w, s) => { m19Truck(s); return foes(w, 'smuggler').length === 0; },
  m19Sink: (w, s) => {
    const truck = m19Truck(s), p = w.player;
    s.marker = { x: truck.x, y: truck.y, r: 36 };
    return !p.car && dist(p.pos, truck) < 48;
  },
  m19Back: (w, s) => {
    const goro = s.vars.goro as Actor;
    s.marker = { x: goro.x, y: goro.y, r: 40 };
    return dist(w.player.pos, goro) < 46;
  },
  /** "The smuggler reaches the ship." */
  m19Missed: (_w, s) => {
    const truck = s.vars.truck as Car | undefined;
    return !!truck && !s.flags.boarded && dist(truck, s.place('pier9')) < 320;
  },
} as Record<string, Check>);

// =====================================================================================
// M20 Penthouse
// =====================================================================================

interface Valet { car: Car; bay: Pt; clean: boolean; hp: number }

/** The next guest pulls up at the curb, and a bay in the valet lot is marked for their car. */
function m20Guest(w: WorldScene, s: Story): void {
  const lot = s.place('rokkakuValet').rect!, n = num(s, 'tries'), curb = { x: lot.x + lot.w / 2, y: lot.y - 18 };
  const def = n % 2 === 0 ? VEHICLES.sports : VEHICLES.sedan; // every other one is a supercar
  const car = storyCar(w, def, curb.x, curb.y, Math.PI, n % (def.colors.length - 1));
  car.unlocked = true; s.cars.push(car);
  const bay = { x: lot.x + 52 + (n % 3) * 90, y: n % 6 < 3 ? lot.y + lot.h - 46 : lot.y + 50 };
  for (const c of s.cars) if (c !== car && c !== w.player.car && !c.removed && dist(c, bay) < 40) c.destroy(); // an earlier guest has left
  const guest = (s.vars.guest as Actor | undefined) ?? npc(w, s, 'salaryman', curb.x + 44, curb.y + 6);
  s.vars.guest = guest;
  later(w, s, 600, () => w.fx.bark(guest.sprite, B.m20Guest[n % B.m20Guest.length], COL.guest));
  s.vars.valet = { car, bay, clean: true, hp: car.hp } as Valet;
  s.vars.tries = n + 1;
}

/**
 * Amane at the rooftop party. She paces along the rail and sees what is in front of her; once the bug
 * is planted she stops and looks out over the rail. If she notices Jun, the bug is found.
 */
function m20Amane(w: WorldScene, s: Story, dt: number, pace: boolean): { a: Actor; d: number; unseen: boolean } {
  const a = s.vars.amane as Actor, north = spot(s, 'rokkakuTop', '3'), south = spot(s, 'rokkakuTop', '4'), p = w.player.pos;
  let face = num(s, 'face'); // the way she is walking: south (+) or north (-)
  if (pace) {
    if (a.moveTo(north.x, face > 0 ? south.y : north.y, 42) < 4) { face = -face; s.vars.face = face; }
  } else { a.body.setVelocity(0, 0); a.sprite.rotation = Math.PI; }
  const look = pace ? face : Math.PI;
  const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(p.y - a.y, p.x - a.x) - look));
  const unseen = off > Phaser.Math.DegToRad(T.m20Cone);
  if (noticed(w, s, unseen ? [] : [a], T.m20See, dt)) s.flags.bugSeen = true;
  const guests = s.vars.guests as Actor[];
  if (guests.some((g) => dist(g, p) < 110)) chatter(w, guests, B.m20Party, COL.guest, 'party', 6);
  s.marker = { x: a.x, y: a.y, r: 0 };
  return { a, d: dist(a, p), unseen };
}

Object.assign(HOOKS, {
  m20Setup(w, s) {
    // the party on the roof of Rokkaku Tower: guests among the tables, and Amane by the rail
    const mid = spot(s, 'rokkakuTop', '2'), rail = spot(s, 'rokkakuTop', '3'), looks = ['salaryman', 'customer', 'elder', 'student', 'mama'];
    s.vars.guests = Array.from({ length: T.m20Guests }, (_, i) => { const f = free(w, mid.x - 50 + (i % 3) * 50, mid.y - 40 + Math.floor(i / 3) * 70 + (i % 2) * 16); return npc(w, s, looks[i % looks.length], f.x, f.y); });
    const amane = npc(w, s, 'amane', rail.x, (rail.y + spot(s, 'rokkakuTop', '4').y) / 2);
    amane.body.setImmovable(false);
    s.vars.amane = amane; s.vars.face = Math.PI / 2; s.vars.eye = 0;
  },
  m20Valet(w, s) { m20Guest(w, s); },
  /** The bug is in: Kirishima joins her at the rail, his back to the party. */
  m20Kirishima(w, s) {
    const a = s.vars.amane as Actor, f = free(w, a.x + 2, a.y - 30), k = npc(w, s, 'tetsu', f.x, f.y);
    k.sprite.rotation = Math.PI;
  },
  /** "A service stairwell. JUN leans against the wall." */
  m20Stairwell(w) { goIn(w, 'rokkakuStairs', '1', 'rokkakuLobby'); },
} as Record<string, Hook>);

Object.assign(CHECKS, {
  m20Parked: (w, s) => {
    const v = s.vars.valet as Valet, car = v.car, p = w.player, done = num(s, 'parked');
    if (car.wreck || car.burning || car.removed) { s.flags.wrecked = true; return false; }
    const driving = p.car === car;
    s.marker = driving ? { x: v.bay.x, y: v.bay.y, r: 30 } : { x: car.x, y: car.y, r: 0 };
    if (v.clean && (Math.max(car.lastImpact, car.bump) > T.m20Scratch || car.hp < v.hp - 0.5)) { // a scratch: this one won't count, and it costs
      v.clean = false;
      p.cash = Math.max(0, p.cash - T.m20Excess);
    }
    car.bump = 0;
    s.timer = { label: `${L.parked} ${done}/${T.m20Cars}`, value: done, max: T.m20Cars, kind: 'bar' };
    if (!driving || dist(car, v.bay) > 30 || car.speed > 25) return false;
    p.exitCar();
    if (v.clean) {
      s.vars.parked = done + 1;
      if (car.def.id === 'sports') w.fx.bark(p.pos, B.m20JunPark, COL.jun);
    }
    if (num(s, 'parked') >= T.m20Cars) { s.timer = null; return true; }
    m20Guest(w, s);
    return false;
  },
  m20Close: (w, s, dt) => m20Amane(w, s, dt, true).d < T.m20Close,
  m20Plant: (w, s, dt) => {
    const r = m20Amane(w, s, dt, true);
    const t = r.d < T.m20Plant && r.unseen ? num(s, 'plantT') + dt : 0; // right behind her, unseen, for a moment
    s.vars.plantT = t;
    return t >= T.m20PlantTime;
  },
  /** Through the bug: the lines arrive on the phone while Jun stays in range. */
  m20Listen: (w, s, dt) => {
    const r = m20Amane(w, s, dt, false), said = num(s, 'said');
    if (r.d > T.m20ListenDist) return false;
    const t = num(s, 'listenT') + dt;
    s.vars.listenT = t;
    if (said < B.m20Bug.length && t >= said * T.m20LineTime) {
      const [who, line] = B.m20Bug[said];
      s.phone.push({ from: who, text: line, t: T.m20LineTime });
      s.vars.said = said + 1;
    }
    return said >= B.m20Bug.length && s.phone.length === 0;
  },
  /** "A valet car is wrecked, or Amane spots the bug." */
  m20Failed: (_w, s) => !!s.flags.wrecked || !!s.flags.bugSeen,
} as Record<string, Check>);

// =====================================================================================
// M21 Ghost
// =====================================================================================

/** The stalls burn; the flames creep toward Mika's bench as time runs out (k = 0..1). */
function m21Burn(w: WorldScene, s: Story, k: number): void {
  const from = s.vars.stalls as Pt, to = s.vars.bench as Pt;
  for (let i = 0; i < 2; i++) {
    const u = Math.random() * Phaser.Math.Clamp(k, 0.15, 1);
    w.fx.puff(from.x + (to.x - from.x) * u + (Math.random() - 0.5) * 30, from.y + (to.y - from.y) * u + (Math.random() - 0.5) * 24, Math.random() < 0.5 ? 0xff7a1a : 0xffc233, 12, 0.4, (Math.random() - 0.5) * 20, -30, 1.2);
  }
  if (Math.random() < 0.15) w.fx.puff(from.x, from.y - 8, 0x222222, 10, 0.9, 0, -45, 2);
}

Object.assign(HOOKS, {
  m21Setup(w, s) {
    const home = s.place('ramen'), yard = s.place('temple').rect!;
    arm(w, T.sidearm);
    // Jun is in the ramen shop when the phone rings; Mika is not behind her counter tonight
    goIn(w, 'ramen', '1');
    const counter = w.map.interiors.find((i) => i.id === 'ramen')?.spots.n;
    const mikaAtWork = counter && (w as unknown as { keepers: Actor[] }).keepers.find((k) => dist(k, counter) < 8);
    if (mikaAtWork) {
      mikaAtWork.sprite.setVisible(false);
      s.actors.push({ alive: false, x: 0, y: 0, sprite: mikaAtWork.sprite, animate() { /* nothing to animate */ }, destroy() { mikaAtWork.sprite.setVisible(true); } } as unknown as Actor); // she is back when the mission ends
    }
    // Yatagarasu are already hunting Jun through the arcade
    [-230, 230, 300, -300].slice(0, T.m21ArcadeGuards).forEach((dy, i) => foe(w, { x: home.x + 40, y: home.y + dy }, 'yatagarasu', 'arcade', 'guard', i === 0, B.m21Yata[0]));
    // the temple courtyard: Mika tied to a bench, Tetsu with his teacup
    s.vars.mika = npc(w, s, 'mika', yard.x + 26, yard.y + 30);
    s.vars.tetsu = npc(w, s, 'tetsu', yard.x + yard.w - 30, yard.y + 70);
    s.vars.bench = { x: yard.x + 26, y: yard.y + 30 };
    s.vars.stalls = { x: yard.x + yard.w - 26, y: yard.y + 26 }; // the food stalls beside the bench
  },
  /** At the temple gate: the guards close in, and Tetsu has a loudspeaker. */
  m21Guards(w, s) {
    const gate = s.place('asagiri');
    wave(w, T.m21GateGuards, gate, 'yatagarasu', 'gate', B.m21Yata[1]);
    later(w, s, 3500, () => w.fx.bark(gate, B.m21Tetsu, COL.tetsu));
  },
  /** Tetsu steps into the SUV and is gone; his guards stay, and the stalls catch. */
  m21Fire(w, s) {
    const yard = s.place('temple').rect!, mika = s.vars.mika as Actor, tetsu = s.vars.tetsu as Actor, far = s.place('raceStart');
    tetsu.sprite.setVisible(false);
    const suv = laneCar(w, s, VEHICLES.sedan, WHITE_SEDAN, { x: yard.x + yard.w + 60, y: yard.y + yard.h / 2 }, -60, 230);
    suv.panic = 9999;
    suv.route = w.map.route(suv.seg!, far.x, far.y).slice(1);
    for (let i = 0; i < T.m21FireGuards; i++) foe(w, { x: yard.x + 40 + i * 34, y: yard.y + 96 + (i % 2) * 30 }, 'yatagarasu', 'fire', 'chase', i > 0, B.m21Yata[1]);
    s.vars.fireT = T.m21FireTime;
    s.marker = { x: mika.x, y: mika.y, r: 22 };
  },
  m21Run(w, s) {
    wave(w, T.m21ChaseGuards, s.place('temple'), 'yatagarasu', 'chase', B.m21Yata[1]);
  },
  /** "The temple grounds at dawn." */
  m21Dawn(w, s) {
    const dawn = DAY.keys.find((k) => k[0] > 0.2 && k[0] < 0.36);
    if (dawn) w.setAmbience(dawn[1]);
    (s.vars.mika as Actor).body.setVelocity(0, 0);
  },
} as Record<string, Hook>);

Object.assign(CHECKS, {
  m21Reach: (w, s) => {
    clearLot(w, s.place('temple').rect!);
    if (!s.flags.hunted) { // "Target in the arcade."
      const a = foes(w, 'arcade').find((t) => t.state === 'chase');
      if (a) { s.flags.hunted = true; w.fx.bark(a.sprite, B.m21Yata[0], COL.foe); }
    }
    return near(w, s);
  },
  m21Fight: (w, s) => { clearLot(w, s.place('temple').rect!); return foes(w, 'gate').length === 0; },
  m21Free: (w, s, dt) => {
    const mika = s.vars.mika as Actor, p = w.player, t = num(s, 'fireT') - dt;
    s.vars.fireT = t;
    m21Burn(w, s, 1 - t / T.m21FireTime);
    s.timer = { label: L.fire, value: t, max: T.m21FireTime, kind: 'time' };
    s.marker = { x: mika.x, y: mika.y, r: 22 };
    if (t <= 0) { s.flags.burned = true; s.vars.failHint = B.m21Late; return false; } // the fire reaches Mika
    if (p.car || dist(p.pos, mika) > 30) return false;
    s.timer = null;
    mika.body.setImmovable(false); // the rope is off: she can run
    return true;
  },
  m21Safe: (w, s, dt) => {
    const mika = s.vars.mika as Actor;
    m21Burn(w, s, 1);
    escort(w, s, mika, dt);
    return near(w, s) && dist(mika, w.player.pos) < 140;
  },
  m21TooLate: (_w, s) => !!s.flags.burned,
} as Record<string, Check>);

// =====================================================================================
// M22 Last Stand
// =====================================================================================

/** The helicopter, drawn over the invisible truck that takes the bullets. */
function drawChopper(g: Graphics, x: number, y: number, spin: number): void {
  g.clear();
  g.fillStyle(0x15171c, 1).fillRect(x - 60, y - 3, 40, 6).fillRect(x - 64, y - 11, 6, 22); // tail boom and fin
  g.fillCircle(x - 6, y, 16).fillCircle(x + 8, y, 15).fillRect(x - 8, y - 15, 18, 30); // body
  g.fillStyle(0x9fb6c8, 1).fillCircle(x + 14, y, 9); // canopy
  g.lineStyle(2, 0x15171c, 1).lineBetween(x - 14, y + 20, x + 18, y + 20).lineBetween(x - 14, y - 20, x + 18, y - 20); // skids
  g.lineStyle(3, 0xd8dce4, 0.8);
  for (const a of [spin, spin + Math.PI / 2]) g.lineBetween(x - Math.cos(a) * 48, y - Math.sin(a) * 48, x + Math.cos(a) * 48, y + Math.sin(a) * 48); // rotor
}

Object.assign(HOOKS, {
  m22Setup(w, s) {
    const base = s.place('mibuStaging'), lot = base.rect!;
    arm(w, T.sidearm); vest(w);
    s.flags.doorsOpen = true; // the tower's doors are not shut to Jun tonight
    if (s.keep.path === 'police') { // a police command van, Sawada and her unit
      s.cars.push(storyCar(w, VEHICLES.truck, lot.x + 80, lot.y + 34, 0, 0));
      npc(w, s, 'sawada', base.x - 30, base.y - 20);
      for (let i = 0; i < 3; i++) npc(w, s, 'riot', base.x + 16 + i * 24, base.y - 20);
    } else { // black sedans, Saeko and her men
      for (let i = 0; i < 2; i++) s.cars.push(storyCar(w, VEHICLES.sedan, lot.x + 60 + i * 110, lot.y + 34, 0, BLACK_SEDAN));
      npc(w, s, 'saeko', base.x - 30, base.y - 20);
      for (let i = 0; i < 4; i++) npc(w, s, 'thug', base.x + 16 + i * 24, base.y - 20);
    }
  },
  /** Mibu's men hold the lobby of his tower, and the office floors above it. */
  m22Lobby(w, s) {
    post(w, s, 'mibuLobby', '1234', T.m22Waves[0], 'thug', 'floor');
    post(w, s, 'mibuOffices', '12345', T.m22Waves[1], 'thug', 'floor');
    hunt(s, foes(w, 'floor'));
  },
  /** Phase 1, pistol duel: Mibu is behind his desk in the penthouse. */
  m22Mibu(w, s) {
    const m = foe(w, spot(s, 'mibuPenthouse', '2'), 'mibu', 'mibu', 'chase', true);
    m.hp = BOSS_PAD + T.m22MibuHp; m.data.rate = T.m22Rate1;
    s.vars.mibu = m; s.vars.phase = 1;
    w.fx.bark(m.sprite, B.m22Phase1, COL.mibu);
  },
  /** Phase 3, the helipad on the roof: Mibu is aboard and the rotor is turning. */
  m22Heli(w, s) {
    const m = s.vars.mibu as Actor, at = spot(s, 'mibuRoof', '1');
    w.gang.thugs = w.gang.thugs.filter((t) => t !== m);
    m.destroy();
    const body = storyCar(w, VEHICLES.truck, at.x, at.y, 0, 0); // what bullets hit; the helicopter is drawn over it
    body.sprite.setVisible(false);
    body.hp = body.maxHp = T.m22HeliHp * (s.keep.umibozuHook ? T.m22HookFactor : 1); // the Hook does half the work
    s.cars.push(body);
    s.vars.heli = body; s.vars.heliAt = at; s.vars.heliT = T.m22HeliTime;
    s.vars.rotor = prop(s, w.add.graphics().setDepth(25));
  },
  m22Unlock(_w, s) { s.keep.blackIron = 'blackIron'; },
} as Record<string, Hook>);

Object.assign(CHECKS, {
  /** The lobby, then the office floors: each room's guards go for Jun when he walks in. */
  m22Floors: (w, s) => {
    const left = foes(w, 'floor');
    noPolice(w);
    wake(w, 'floor');
    hunt(s, left);
    if (!s.flags.intercom && w.indoors?.id === 'mibuLobby') { // Mibu, over the intercom at the reception desk
      s.flags.intercom = true;
      w.fx.bark(spot(s, 'mibuLobby', '5'), B.m22Intercom, COL.mibu);
    }
    return left.length === 0;
  },
  m22Boss: (w, s) => {
    const m = s.vars.mibu as Actor, hp = m.hp - BOSS_PAD, max = T.m22MibuHp;
    noPolice(w);
    s.timer = { label: 'MIBU', value: Math.max(0, hp), max, kind: 'bar' };
    if (hp <= (max * 2) / 3 && num(s, 'phase') < 2) { // phase 2, bodyguards
      s.vars.phase = 2; m.data.rate = T.m22Rate2;
      w.fx.bark(m.sprite, B.m22Phase2, COL.mibu);
      for (let i = 0; i < T.m22Bodyguards; i++) foe(w, spot(s, 'mibuPenthouse', '345'[i % 3]), 'thug', 'bodyguard', 'chase', i % 2 === 0); // they come in through the side doors
    }
    if (hp > max / 3) return false;
    w.fx.bark({ x: m.x, y: m.y }, B.m22Phase3, COL.mibu); // phase 3: he runs for the helicopter
    s.timer = null;
    return true;
  },
  m22HeliDown: (w, s, dt) => {
    const h = s.vars.heli as Car, at = s.vars.heliAt as Pt, g = s.vars.rotor as Graphics, p = w.player;
    const t = num(s, 'heliT') - dt, now = w.time.now / 1000;
    s.vars.heliT = t;
    s.marker = { x: at.x, y: at.y, r: 0 }; // up the stairs to the roof
    noPolice(w);
    if (p.entering?.car === h) p.entering = null; // nobody steals a helicopter
    h.x = at.x + Math.sin(now * 1.3) * 14; h.y = at.y + Math.cos(now * 0.9) * 8; h.vx = h.vy = 0; // it sways on the pad as it spools up
    drawChopper(g, h.x, h.y - 8, now * (12 + 30 * (1 - t / T.m22HeliTime))); // drawn right over what the bullets hit; the rotor spins up as it gets ready to leave
    s.timer = { label: L.helicopter, value: t, max: T.m22HeliTime, kind: 'time' };
    if (h.hp <= 0 || h.burning || h.wreck) { // down it comes
      g.clear(); scuttle(w, h); s.timer = null; s.marker = null;
      const knees = free(w, h.x - 30, h.y + 56), door = spot(s, 'mibuRoof', '<'); // Mibu crawls out of the wreck; the ally comes up the stairs
      npc(w, s, 'mibu', knees.x, knees.y);
      npc(w, s, s.keep.path === 'police' ? 'sawada' : 'saeko', door.x + 34, door.y - 6);
      return true;
    }
    if (t <= 0) s.flags.escaped = true; // "Mibu's helicopter escapes."
    return false;
  },
  m22Escaped: (_w, s) => !!s.flags.escaped,
} as Record<string, Check>);

// =====================================================================================
// M23 Tsukuyomi
// =====================================================================================

/** The room where the current wave is fought: each stretch of ten floors is two rooms (tsuku1a, tsuku1b, tsuku2a ...). */
function m23Room(s: Story): string {
  return `tsuku${Math.floor(num(s, 'floor') / T.m23PerCheckpoint) + 1}${'ab'[num(s, 'wave')] ?? 'b'}`;
}
/** The floor Jun has fought up to: every guard down is another step up the stretch of ten. */
function m23Floor(w: WorldScene, s: Story): number {
  const total = T.m23Waves.reduce((a, b) => a + b, 0), sent = T.m23Waves.slice(0, num(s, 'wave') + 1).reduce((a, b) => a + b, 0);
  const down = sent - foes(w, 'floor').length;
  return Math.min(T.m23Floors, num(s, 'floor') + 1 + Math.floor(((T.m23PerCheckpoint - 1) * down) / total));
}
/** The Yatagarasu holding the next room up: they are at their posts before Jun gets there. */
function m23Wave(w: WorldScene, s: Story): void {
  post(w, s, m23Room(s), '1234', T.m23Waves[num(s, 'wave')], 'yatagarasu', 'floor', B.m23Yata[1]);
}
/**
 * Five lanterns, and every cop in the city on the way; but the allies hold the streets, so only
 * a few officers reach the tower at a time (and none while the Raijin block the ramps).
 */
function m23Hold(w: WorldScene, s: Story, dt: number): void {
  if (w.heat.level < 5) w.heat.crime('story5');
  const ramps = num(s, 'rampsT'), allow = ramps > 0 ? 0 : T.m23CopsThrough, p = w.player.pos;
  if (ramps > 0) s.vars.rampsT = ramps - dt;
  const cops = w.police.cops.filter((a) => a.alive && a.state !== 'leave').sort((a, b) => dist(a, p) - dist(b, p));
  for (const a of cops.slice(allow)) if (!w.onScreen(a.x, a.y, 40)) { a.state = 'leave'; a.timer = 0; }
  let cars = 0;
  for (const c of w.cars) if (c.driver === 'cop' && !c.removed && ++cars > allow && !w.onScreen(c.x, c.y, 80)) { c.driver = 'none'; c.destroy(); }
}
/** Restarting from a floor checkpoint: the assault is still on. */
function m23Resume(w: WorldScene, s: Story, floor: number): void {
  s.vars.floor = floor;
  w.heat.crime('story5');
  const d = w.map.doors.find((o) => o.kind === 'in' && o.interior === 'tsukuLobby'); // (the way out is still the tower's front door)
  w.lastDoor = d ? { x: d.x, y: d.y } : null;
}

Object.assign(HOOKS, {
  m23Setup(w, s) {
    arm(w, T.sidearm); arm(w, T.longGun); vest(w);
    // inside the Glitch hideout: the crew crowd round the desks at the back
    goIn(w, 'capsule', '1');
    ['hikari', 'pip', 'kenta', 'goro'].forEach((look, i) => { const at = tile(w, 'capsule', [3, 5, 9, 11][i], 2); npc(w, s, look, at.x, at.y); });
    // Amane is at her window on the top floor the whole time
    const win = spot(s, 'tsukuTop', '2');
    npc(w, s, 'amane', win.x, win.y).sprite.rotation = -Math.PI / 2;
    s.vars.floor = 0;
    s.flags.doorsOpen = true; // five lanterns or not, Jun is going through that door
  },
  m23Lobby(w, s) {
    post(w, s, 'tsukuLobby', '234', T.m23Lobby, 'yatagarasu', 'lobby').forEach((t, i) => { t.data.gun = i === 1; });
  },
  /** A 5-lantern assault: every cop in the city comes. */
  m23BreakIn(w) {
    w.heat.crime('story5');
    for (const t of foes(w, 'lobby')) t.state = 'chase';
  },
  m23Floors(w, s) { s.vars.wave = 0; m23Wave(w, s); },
  m23Floor10(w, s) { m23Resume(w, s, 10); },
  m23Floor20(w, s) { m23Resume(w, s, 20); },
  m23Floor30(w, s) { m23Resume(w, s, 30); },
  /** "Raijin's blocking the ramps. Cops are stuck in traffic." The police fall back, and none get through for a while. */
  m23Raijin(w, s) { w.police.standDown(false); s.vars.rampsT = T.m23RaijinTime; },
  /** Floor 20: Ogata, hiding under a desk. */
  m23Ogata(w, s) {
    const at = spot(s, 'tsuku2b', '5'), o = npc(w, s, 'ogata', at.x, at.y);
    w.fx.bark(o.sprite, B.m23Ogata, COL.ogata);
    later(w, s, 2200, () => w.fx.bark(w.player.pos, B.m23Jun, COL.jun));
  },
  /** The top floor: the assault is over, and the city is watching. */
  m23Office(w, s) {
    const door = spot(s, 'tsukuTop', '3'); // the ally comes in from the stairs
    w.heat.clear(false); w.police.standDown(true);
    s.timer = null;
    npc(w, s, s.keep.path === 'police' ? 'sawada' : 'saeko', door.x, door.y);
  },
} as Record<string, Hook>);

Object.assign(CHECKS, {
  /** Ten floors at a time: two rooms of Yatagarasu, one above the other, then a floor checkpoint on the next landing. */
  m23Climb: (w, s, dt) => {
    const floor = m23Floor(w, s), left = [...foes(w, 'lobby'), ...foes(w, 'floor')];
    m23Hold(w, s, dt);
    s.timer = { label: `${L.floor} ${floor} / ${T.m23Floors}`, value: floor, max: T.m23Floors, kind: 'bar' };
    wake(w, 'lobby');
    const seen = wake(w, 'floor');
    if (seen.length) w.fx.bark(seen[0].sprite, B.m23Yata[0].replace('{n}', String(floor)), COL.foe);
    hunt(s, left);
    if (left.length) return false;
    const next = num(s, 'wave') + 1;
    if (next < T.m23Waves.length) { s.vars.wave = next; m23Wave(w, s); return false; }
    s.vars.floor = num(s, 'floor') + T.m23PerCheckpoint;
    w.player.heal(); // a floor checkpoint: catch your breath
    if (num(s, 'floor') >= T.m23Floors) s.timer = null;
    return true;
  },
} as Record<string, Check>);

// =====================================================================================
// M24 Amaterasu Maru, and the endings
// =====================================================================================

const SHIP = { len: 832, beam: 150 };

/** The ship: a hull in the water along the north quay, bow to the west, the bridge at the stern. */
function m24BuildShip(w: WorldScene, s: Story): Graphics {
  const g = prop(s, w.add.graphics().setDepth(1.2)), l = SHIP.len / 2, b = SHIP.beam / 2;
  g.fillStyle(0x14161b, 1).fillRect(-l + 46, -b, SHIP.len - 46, SHIP.beam).fillTriangle(-l, 0, -l + 46, -b, -l + 46, b); // hull
  g.fillStyle(0x7a1f1f, 1).fillRect(-l + 46, b - 8, SHIP.len - 46, 8); // waterline
  g.fillStyle(0x39404a, 1).fillRect(-l + 56, -b + 12, SHIP.len - 76, SHIP.beam - 32); // deck
  const paint = [0x2f7f86, 0xb5562e, 0xd8b02a, 0x3a5f9a];
  for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) g.fillStyle(paint[(i + j * 3) % 4], 1).fillRect(-l + 76 + i * 64, -b + 20 + j * 50, 56, 42); // containers
  g.fillStyle(0xe6e6ea, 1).fillRect(l - 150, -b + 16, 124, SHIP.beam - 40); // the bridge
  g.fillStyle(0x16212e, 1).fillRect(l - 150, -b + 26, 8, SHIP.beam - 60);
  return g;
}
/** Puts the ship where it has got to: u = 0 is far off to the east, 1 is alongside the quay. */
function m24MoveShip(s: Story): void {
  const q = s.place('amaterasuQuay');
  (s.vars.ship as Graphics).setPosition(q.x - 64 + SHIP.len / 2 + (1 - num(s, 'u')) * T.m24ShipRun, q.y - 38 - SHIP.beam / 2);
}
/** The ship slides west along the quay, keeping pace with Jun on the shore road. */
function m24Sail(w: WorldScene, s: Story, dt: number): void {
  const q = s.place('amaterasuQuay'), d0 = num(s, 'd0') || 1;
  s.vars.u = Math.min(1, Math.max(num(s, 'u') + (T.m24ShipSpeed / T.m24ShipRun) * dt, 1 - dist(w.player.pos, q) / d0));
  m24MoveShip(s);
}
/** The container deck is fought from the bow toward the stern, a wave at a time. */
function m24Wave(w: WorldScene, s: Story): Actor[] {
  const q = s.place('amaterasuQuay'), i = num(s, 'wave'), cx = q.x + 260 + i * 260, out: Actor[] = [];
  for (let k = 0; k < T.m24Waves[i]; k++) out.push(foe(w, { x: cx + (k % 3) * 46, y: q.y + 20 + Math.floor(k / 3) * 60 + (k % 2) * 24 }, 'yatagarasu', 'deck', 'chase', k % 2 === 0, B.m24Yata[1]));
  s.marker = { x: cx + 40, y: q.y + 60, r: 0 };
  return out;
}
const m24Stern = (s: Story): Pt => { const q = s.place('amaterasuQuay'); return { x: q.x + 700, y: q.y + 50 }; };

/** Phase 2: fireworks from the deck launchers. Each shell shows where it will land, then bursts. */
function m24Fireworks(w: WorldScene, s: Story, dt: number): void {
  const shells = s.vars.shells as { x: number; y: number; t: number }[], p = w.player, R = T.m24FireworkRadius;
  s.vars.shellT = num(s, 'shellT') - dt;
  if (num(s, 'shellT') <= 0) {
    s.vars.shellT = T.m24FireworkGap;
    shells.push({ x: p.pos.x + (Math.random() - 0.5) * 80, y: p.pos.y + (Math.random() - 0.5) * 80, t: T.m24FireworkFuse });
  }
  for (let i = shells.length - 1; i >= 0; i--) {
    const sh = shells[i];
    sh.t -= dt;
    const a = Math.random() * Math.PI * 2;
    w.fx.puff(sh.x + Math.cos(a) * R, sh.y + Math.sin(a) * R, 0xff5aa0, 4, 0.12, 0, 0, 0, 0.9); // a ring of sparks where it will land
    if (sh.t > 0) continue;
    shells.splice(i, 1);
    w.fx.explosion(sh.x, sh.y, R);
    for (let k = 0; k < 6; k++) w.fx.puff(sh.x, sh.y, pick([0xff5aa0, 0x5ad0ff, 0xffe05a]), 6, 0.6, (Math.random() - 0.5) * 260, (Math.random() - 0.5) * 260, 0.5);
    if (!p.car && dist(p.pos, sh) < R) p.takeDamage(T.m24FireworkDamage, false);
  }
}

Object.assign(HOOKS, {
  m24Setup(w, s) {
    const pier = s.place('pier9'), lot = pier.rect!;
    arm(w, T.sidearm); arm(w, T.longGun); vest(w);
    const car = storyCar(w, VEHICLES.sports, lot.x + lot.w - 40, pier.y + 70, -Math.PI / 2, 1); // Goro's "speedboat"
    car.unlocked = true; s.cars.push(car); s.vars.boat = car;
    s.vars.goro = npc(w, s, 'goro', car.x - 28, car.y);
    npc(w, s, 'kenta', pier.x - 60, pier.y - 30); // Kenta and the Raijin line the pier
    for (let i = 0; i < 3; i++) npc(w, s, 'raijin', pier.x - 104 + i * 24, pier.y - 62);
    s.vars.ship = m24BuildShip(w, s); s.vars.u = 0;
    m24MoveShip(s);
  },
  m24Go(w, s) {
    (s.vars.goro as Actor).sprite.setVisible(false); // he's at the wheel
    w.player.putInCar(s.vars.boat as Car);
    s.vars.d0 = dist(w.player.pos, s.place('amaterasuQuay'));
  },
  /** Restarting "from the climb aboard": the ship is already alongside. */
  m24Alongside(_w, s) { s.vars.u = 1; m24MoveShip(s); },
  m24Aboard(w, s) {
    const q = s.place('amaterasuQuay');
    s.vars.wave = 0;
    const made = m24Wave(w, s);
    w.fx.bark(made[0].sprite, B.m24Yata[0], COL.foe);
    later(w, s, 2000, () => w.fx.bark({ x: q.x + 140, y: q.y - 50 }, B.m24Loudspeaker, COL.tetsu)); // the ship's loudspeaker
  },
  m24BridgeDeck(_w, s) { const at = m24Stern(s); s.marker = { x: at.x, y: at.y, r: 40 }; },
  /** Phase 1: the cane-sword duel. Jun goes in through the door under the bridge; Tetsu is waiting inside. */
  m24Tetsu(w, s) {
    goIn(w, 'shipBridge', '1');
    const t = foe(w, spot(s, 'shipBridge', '2'), 'tetsu', 'tetsu', 'chase');
    t.hp = BOSS_PAD + T.m24TetsuHp;
    s.vars.tetsu = t; s.vars.phase = 1; s.vars.shells = []; s.vars.shellT = 1; s.vars.talkT = 1.5; s.vars.said = 0;
  },
  /** Sets the scene for the chosen ending: where it happens, the light, and who stands beside Jun. */
  m24Ending(w, s) {
    const end = s.keep.ending, police = s.keep.path === 'police', p = w.player;
    if (end === 'cleanslate') s.flags[police ? 'cleanPolice' : 'cleanYakuza'] = true;
    const ally = police ? 'sawada' : 'saeko';
    if (p.car) p.exitCar();
    w.setAmbience(AMBIENCE[end === 'oldtown' ? 'day' : 'night']);
    if (end === 'shogun') { // "A Rokkaku Hills penthouse": the top of Rokkaku Tower (Sawada is only on the phone)
      goIn(w, 'rokkakuTop', '2', 'rokkakuLobby');
      const at = free(w, p.pos.x - 30, p.pos.y - 6);
      if (!police) npc(w, s, ally, at.x, at.y);
    } else if (end === 'oldtown') { // in the ramen shop: Mika is behind her counter as always, the ally at the end of it
      goIn(w, 'ramen', '1');
      const at = tile(w, 'ramen', 8, 2);
      npc(w, s, ally, at.x, at.y).sprite.rotation = -Math.PI / 2;
    } else { // the station forecourt, with Mika
      const where = s.place('centralStation'), at = free(w, where.x, where.y + 22);
      p.actor.body.reset(at.x, at.y);
      npc(w, s, 'mika', at.x + 24, at.y - 6);
    }
  },
  /** After the credits, Clean Slate only: one more line on the ticker. */
  m24Fishermen(w, s) { radioLater(w, s, KOGANE_TALK, B.endFishermen); },
} as Record<string, Hook>);

Object.assign(CHECKS, {
  m24Catch: (w, s, dt) => {
    const car = s.vars.boat as Car;
    m24Sail(w, s, dt);
    if (w.player.car === car && (Math.max(car.lastImpact, car.bump) > 60 || Math.random() < 0.004)) w.fx.bark(car, B.m24Goro, COL.goro, 'goro', 6);
    car.bump = 0;
    return near(w, s);
  },
  m24Climb: (w, s, dt) => {
    m24Sail(w, s, dt);
    return !w.player.car && near(w, s) && num(s, 'u') >= 1;
  },
  m24Deck: (w, s) => {
    calm(w, s.place('amaterasuQuay'));
    if (foes(w, 'deck').length) return false;
    const next = num(s, 'wave') + 1;
    if (next >= T.m24Waves.length) return true;
    s.vars.wave = next;
    m24Wave(w, s);
    return false;
  },
  m24AtBridge: (w, s) => { calm(w, s.place('amaterasuQuay')); return near(w, s); },
  /** Tetsu, in three phases by his health: cane-sword, fireworks, then a gun among the gold crates. */
  m24Boss: (w, s, dt) => {
    const t = s.vars.tetsu as Actor, p = w.player, hp = t.hp - BOSS_PAD, max = T.m24TetsuHp;
    calm(w, s.place('amaterasuQuay'));
    s.timer = { label: 'TETSU', value: Math.max(0, hp), max, kind: 'bar' };
    const phase = hp > (max * 2) / 3 ? 1 : hp > max / 3 ? 2 : 3;
    if (phase > num(s, 'phase')) {
      s.vars.phase = phase;
      if (phase === 2) w.fx.bark(t.sprite, B.m24Phase2, COL.tetsu);
      if (phase === 3) { // he goes below, to make his stand among the gold crates in the hold
        w.fx.bark({ x: t.x, y: t.y }, B.m24Phase3, COL.tetsu);
        const hold = spot(s, 'shipHold', '2');
        t.body.reset(hold.x, hold.y);
        t.data.gun = true; t.data.rate = T.m24Rate3; t.data.bark = B.m24Phase3;
      }
    }
    s.marker = { x: t.x, y: t.y, r: 0 }; // (shows the stairs down when he is in the hold)
    if (phase === 1) {
      s.vars.talkT = num(s, 'talkT') - dt;
      if (num(s, 'talkT') <= 0) { s.vars.talkT = 4.5; w.fx.bark(t.sprite, B.m24Phase1[num(s, 'said') % B.m24Phase1.length], COL.tetsu); s.vars.said = num(s, 'said') + 1; }
    }
    if (phase < 3) { // the cane-sword bites harder than a fist
      s.vars.swordT = num(s, 'swordT') - dt;
      if (!p.car && t.stun <= 0 && dist(t, p.pos) < 30 && num(s, 'swordT') <= 0) { s.vars.swordT = T.m24SwordGap; p.takeDamage(T.m24Sword, false); w.fx.spark(p.pos.x, p.pos.y, 0xffffff); }
    }
    if (phase === 2) m24Fireworks(w, s, dt);
    if (hp > 0) return false;
    // beaten: back out on the container deck in the rain, he sits against a split crate, alive for what comes next
    const stern = m24Stern(s), at = free(w, stern.x + 44, stern.y), jun = free(w, stern.x - 10, stern.y + 6);
    w.gang.thugs = w.gang.thugs.filter((x) => x !== t);
    t.destroy();
    npc(w, s, 'tetsu', at.x, at.y);
    w.moveJun(jun.x, jun.y);
    w.lastDoor = null;
    s.timer = null; s.marker = null;
    return true;
  },
} as Record<string, Check>);
