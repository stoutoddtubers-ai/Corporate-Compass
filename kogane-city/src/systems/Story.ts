import { MISSIONS, SIDE_MISSIONS, Mission, Step, Line, AMBIENCE } from '../data/missions';
import { MAP } from '../data/map';
import { TILE_SIZE } from '../data/config';
import { MISSION_BARKS } from '../data/missions';
import { HOOKS, CHECKS } from './missionHooks';
import type { Place } from './CityMap';
import type { Actor } from '../entities/Actor';
import type { Car } from '../entities/Car';
import type { WorldScene } from '../scenes/WorldScene';

const SAVE_KEY = 'kogane.save.v1';

/**
 * Runs the story: plays each mission's steps in order (cutscene, objective, title card,
 * phone text...). The words come from data/missions.ts; this only decides what shows when.
 */
export class Story {
  index = 0;
  step = 0;
  active = false;
  objective = '';
  hint = '';
  marker: { x: number; y: number; r: number; need?: string; car?: Car } | null = null;
  /** The next mission's marker only works once you have stepped away from it. */
  private armed = true;
  cut: { lines: Line[]; i: number; chars: number } | null = null;
  card: { title: string; sub: string; t: number } | null = null;
  phone: { from: string; text: string; t: number }[] = [];
  radio: { station: string; text: string; x: number } | null = null;
  /** District title stamp timer. */
  stamp = 0;
  flags: Record<string, boolean> = {};
  /** Mission-specific things: the scooter, the Zenki, timers... */
  vars: Record<string, unknown> = {};
  actors: Actor[] = [];
  cars: Car[] = [];
  spill = 0;
  showSpill = false;
  /** A countdown or meter shown on the HUD by some missions. */
  timer: { label: string; value: number; max: number; kind: 'time' | 'bar' } | null = null;
  /** If set, Jun says this the next time he takes a car (then it clears). */
  junCarLine: string | null = null;
  /** Choices the player has made, remembered for the whole game: path = 'yakuza' | 'police', ending, and anything a mission sets. */
  keep: Record<string, string> = {};
  /** A choice waiting for the player (the game is paused while it shows). */
  choice: { prompt: string; set: string; options: { label: string; value: string }[] } | null = null;
  /** The side story being played, if any (otherwise the main mission at `index`). */
  side: Mission | null = null;
  sideDone: string[] = [];
  /** Side stories that can be started right now, with where to go. */
  sideMarkers: { x: number; y: number; r: number; m: Mission; armed?: boolean }[] = [];
  /** Step index of the last checkpoint passed in this mission (0 = none). */
  private cp = 0;
  private failT = 0;

  constructor(private world: WorldScene) {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}');
      this.index = Math.min(MISSIONS.length, d.mission ?? 0);
      this.keep = d.keep ?? {}; this.sideDone = d.sideDone ?? [];
    } catch { this.index = 0; }
  }

  get mission(): Mission | null { return this.side ?? MISSIONS[this.index] ?? null; }
  /** Every mission, for the test scripts and the playtime estimate. */
  get allMissions(): readonly Mission[] { return MISSIONS; }
  get allSide(): readonly Mission[] { return SIDE_MISSIONS; }

  /** Is a condition true? See the note on `Line` in data/missions.ts. */
  cond(c?: string): boolean {
    if (!c) return true;
    if (c.startsWith('!')) return !this.cond(c.slice(1));
    return !!this.flags[c] || !!this.keep[c] || Object.values(this.keep).includes(c);
  }

  /** A mission's place, which may depend on the Act 2 path. */
  private pathPlace(p: string | { yakuza: string; police: string }): string {
    return typeof p === 'string' ? p : this.keep.path === 'police' ? p.police : p.yakuza;
  }

  place(id: string): Place {
    return this.world.map.places[id];
  }

  private save(): void {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ mission: this.index, keep: this.keep, sideDone: this.sideDone })); } catch { /* saving is optional */ }
    this.world.saveGame?.();
  }

  /** Called once when the world is ready. */
  begin(): void {
    const m = this.mission;
    if (m && m.giver === null) this.startMission(false, null);
    else { this.freeRoam(); const home = this.place(this.index > 0 ? 'ramen' : 'prison'); this.world.player.actor.body.reset(home.x, home.y + 20); }
  }

  private freeRoam(): void {
    this.active = false; this.objective = ''; this.hint = ''; this.showSpill = false; this.timer = null; this.flags.incognito = false;
    this.world.dayCycle = true; // free roam: the time of day moves on
    this.world.traffic.blockRing = false;
    this.side = null;
    const m = this.mission;
    const g = m && m.giver ? this.place(this.pathPlace(m.giver)) : null;
    this.marker = g ? { x: g.x, y: g.y, r: 34 } : null;
    this.armed = false;
    // side stories on offer: their main-story mission is done, and so is the previous part of the chain
    const doneMain = new Set(MISSIONS.slice(0, this.index).map((x) => x.id));
    this.sideMarkers = SIDE_MISSIONS.filter((x) => !this.sideDone.includes(x.id) && (!x.after || doneMain.has(x.after)) && (!x.afterSide || this.sideDone.includes(x.afterSide)) && x.giver)
      .map((x) => { const q = this.place(this.pathPlace(x.giver!)); return { x: q.x, y: q.y, r: 34, m: x }; });
  }

  /** Starts the current mission. On a retry the opening cutscene is skipped. */
  startMission(retry = false, side: Mission | null = this.side): void {
    this.side = side;
    const m = this.mission, w = this.world;
    if (!m) return;
    this.sideMarkers = [];
    if (!retry) this.cp = 0;
    w.traffic.blockRing = false;
    w.turf.abort();
    w.side.abort();
    this.cleanup();
    this.active = true; this.step = 0; this.flags = {}; this.vars = {}; this.timer = null; this.spill = 0; this.showSpill = false; this.failT = 0; this.junCarLine = null;
    const s = this.place(this.pathPlace(m.start));
    if (w.player.car) w.player.exitCar();
    w.player.actor.body.reset(s.x, s.y + (m.giver ? 22 : 0));
    w.player.heal();
    w.dayCycle = false; // missions happen at their scripted time of day
    w.setAmbience(AMBIENCE[m.ambience]);
    HOOKS[m.setup]?.(w, this);
    if (retry && this.cp > 0) { // resume from the last checkpoint
      const c = m.steps[this.cp] as Extract<Step, { t: 'checkpoint' }>;
      if (c.setup) HOOKS[c.setup]?.(w, this);
      if (c.place) { const r = this.place(c.place); w.player.actor.body.reset(r.x, r.y); }
      this.step = this.cp + 1;
    } else if (retry) {
      while (m.steps[this.step]?.t === 'cut') this.step++;
      if (m.retryAt) { const r = this.place(m.retryAt); w.player.actor.body.reset(r.x, r.y); }
    }
    this.enterStep();
  }

  /** Removes everything the current mission created and calms the city down. */
  private cleanup(): void {
    const w = this.world;
    for (const c of this.cars) if (!c.removed && c !== w.player.car) c.destroy();
    if (w.player.car && this.cars.includes(w.player.car)) { const c = w.player.car; w.player.exitCar(); c.destroy(); }
    for (const a of this.actors) a.destroy();
    this.cars = []; this.actors = [];
    w.gang.clear();
    w.heat.clear(false);
    w.police.standDown(true);
  }

  private enterStep(): void {
    const m = this.mission!, w = this.world;
    while (this.step < m.steps.length) {
      const st: Step = m.steps[this.step];
      if (!this.cond(st.if)) { this.step++; continue; } // this step belongs to the other path
      if (st.t === 'cut') {
        const lines = st.lines.filter((l) => this.cond(l.if));
        if (!lines.length) { this.step++; continue; }
        this.cut = { lines, i: 0, chars: 0 };
        w.mode = 'cut';
        return;
      }
      if (st.t === 'choice') { this.choice = { prompt: st.prompt, set: st.set, options: st.options }; w.mode = 'cut'; return; }
      if (st.t === 'checkpoint') { this.cp = this.step; this.step++; continue; }
      if (st.t === 'obj') {
        this.objective = st.text; this.hint = st.hint ?? '';
        this.marker = st.marker ? { x: this.place(st.marker).x, y: this.place(st.marker).y, r: st.radius ?? 40, need: st.need } : null;
        if (st.enter) HOOKS[st.enter]?.(w, this);
        return;
      }
      if (st.t === 'card') {
        this.card = { title: st.title, sub: st.sub, t: 3.2 }; this.objective = ''; this.hint = ''; this.marker = null; this.timer = null;
        if (st.pay) w.player.cash += st.pay; // the mission's payout
        return;
      }
      if (st.t === 'text') this.phone.push({ from: st.from, text: st.text, t: 6 });
      else if (st.t === 'call') { for (const l of st.lines) if (this.cond(l.if)) this.phone.push({ from: l.who, text: l.text, t: 3.2 }); }
      else if (st.t === 'radio') this.radio = { station: st.station ?? 'KOGANE FM', text: st.text, x: 0 };
      else if (st.t === 'run') HOOKS[st.hook]?.(w, this);
      this.step++;
    }
    // mission complete
    for (const a of this.actors) a.destroy();
    for (const c of this.cars) c.story = false; // mission cars become ordinary cars
    this.actors = []; this.cars = [];
    w.gang.clear();
    if (this.side) this.sideDone.push(this.side.id); else this.index++;
    this.side = null;
    this.save();
    this.freeRoam();
  }

  /** Click / Space during a cutscene: finish the line, or go to the next one. */
  advanceCut(): void {
    const c = this.cut;
    if (!c) return;
    if (c.chars < c.lines[c.i].text.length) { c.chars = 999; return; }
    c.i++; c.chars = 0;
    if (c.i >= c.lines.length) { this.cut = null; this.world.mode = 'play'; this.step++; this.enterStep(); }
  }

  /** The player picks option i of the choice on screen. */
  choose(i: number): void {
    const c = this.choice;
    if (!c || !c.options[i]) return;
    this.keep[c.set] = c.options[i].value;
    this.choice = null; this.world.mode = 'play';
    this.step++; this.enterStep();
  }

  /** After the death / arrest screen: missions restart from their beginning. Returns true if it handled the respawn. */
  onRespawn(): boolean {
    // waking up at a hospital or police box that stands on a mission's ring must not start that mission
    this.armed = false;
    for (const sm of this.sideMarkers) sm.armed = false;
    if (!this.active) return false;
    this.startMission(true);
    return true;
  }

  fail(line?: Line): void {
    if (this.failT > 0) return;
    if (line) this.phone.push({ from: line.who, text: line.text, t: 4 });
    this.failT = 3.5;
    this.objective = 'MISSION FAILED'; this.hint = (this.vars.failHint as string) ?? ''; this.marker = null; this.timer = null;
  }

  /** Debug / tests: start a mission by its id, main ('M12') or side ('S-R1'). */
  jumpToId(id: string): void {
    const i = MISSIONS.findIndex((m) => m.id === id);
    if (i >= 0) { this.jumpTo(i); return; }
    const side = SIDE_MISSIONS.find((m) => m.id === id);
    if (!side) return;
    this.cut = null; this.card = null; this.choice = null; this.world.mode = 'play';
    this.cleanup();
    this.startMission(false, side);
  }

  /** Debug: jump to a mission (F4 = next, F6 = start over). */
  jumpTo(i: number): void {
    this.cut = null; this.card = null; this.choice = null; this.side = null; this.world.mode = 'play';
    this.cleanup();
    this.index = Math.max(0, Math.min(MISSIONS.length, i));
    this.save();
    const m = this.mission;
    if (m) this.startMission(false, null); else this.freeRoam();
  }

  update(dt: number): void {
    const w = this.world, p = w.player;
    this.stamp = Math.max(0, this.stamp - dt);
    if (this.phone.length) { this.phone[0].t -= dt; if (this.phone[0].t <= 0) this.phone.shift(); }
    if (this.radio) { this.radio.x += 70 * dt; if (this.radio.x > 960 + this.radio.text.length * 7.3) this.radio = null; }
    if (this.cut) { this.cut.chars += 55 * dt; return; }
    if (this.choice) return;
    if (this.card && !this.active) { this.card.t -= dt; if (this.card.t <= 0) this.card = null; } // turf banners
    if (w.mode !== 'play') return;

    // The ankle tag: until mission 8 is done, crossing the river means instant 3 lanterns (bible)
    if (this.index < 8 && !this.flags.tagDead && !w.indoors && p.pos.x < (MAP.river.x + MAP.river.w) * TILE_SIZE) {
      if (!this.flags.overRiver) { this.flags.overRiver = true; this.phone.push({ from: 'SAWADA', text: MISSION_BARKS.riverCall, t: 4 }); }
      w.heat.crime('river');
      w.heat.timer = 0; w.heat.lastKnown.x = p.pos.x; w.heat.lastKnown.y = p.pos.y;
    } else if (p.pos.x > (MAP.river.x + MAP.river.w + 4) * TILE_SIZE) this.flags.overRiver = false;

    if (!this.active) {
      // walk into the marker to start the next mission
      const m = this.marker;
      const dm = m ? Math.hypot(p.pos.x - m.x, p.pos.y - m.y) : 0;
      if (m && dm > m.r + 40) this.armed = true;
      if (m && this.armed && dm < m.r && w.heat.level === 0 && (!p.car || p.car.speed < 120)) { this.startMission(false, null); return; }
      // side stories start the same way; like the main marker, a ring only works once you have been outside it,
      // so a mission that ends on top of the next one's ring does not start it by itself
      for (const sm of this.sideMarkers) {
        const d = Math.hypot(p.pos.x - sm.x, p.pos.y - sm.y);
        if (d > sm.r + 40) sm.armed = true;
        if (sm.armed && !p.car && w.heat.level === 0 && d < sm.r) { this.startMission(false, sm.m); return; }
      }
      return;
    }
    if (this.failT > 0) { this.failT -= dt; if (this.failT <= 0) this.startMission(true); return; }
    const m = this.mission!;
    if (m.failCheck && CHECKS[m.failCheck]?.(w, this, dt)) { this.fail(m.failCall); return; }
    const st = m.steps[this.step];
    if (!st) return;
    if (st.t === 'card') {
      if (this.card) { this.card.t -= dt; if (this.card.t <= 0) this.card = null; }
      if (!this.card) { this.step++; this.enterStep(); }
    } else if (st.t === 'obj' && CHECKS[st.done]?.(w, this, dt)) {
      if (st.after) HOOKS[st.after]?.(w, this);
      this.step++; this.enterStep();
    }
    if (this.card) { this.card.t -= 0; }
  }
}

// the mission logic for Acts 2-3 and the side stories registers itself into HOOKS / CHECKS
import './hooks_act2';
import './hooks_act3';
import './hooks_side';
