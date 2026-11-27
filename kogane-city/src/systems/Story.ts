import { MISSIONS, Mission, Step, Line, AMBIENCE } from '../data/missions';
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
  private failT = 0;

  constructor(private world: WorldScene) {
    try { this.index = Math.min(MISSIONS.length, JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}').mission ?? 0); } catch { this.index = 0; }
  }

  get mission(): Mission | null { return MISSIONS[this.index] ?? null; }

  place(id: string): Place {
    return this.world.map.places[id];
  }

  private save(): void {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ mission: this.index })); } catch { /* saving is optional */ }
  }

  /** Called once when the world is ready. */
  begin(): void {
    const m = this.mission;
    if (m && m.giver === null) this.startMission();
    else { this.freeRoam(); const home = this.place(this.index > 0 ? 'ramen' : 'prison'); this.world.player.actor.body.reset(home.x, home.y + 20); }
  }

  private freeRoam(): void {
    this.active = false; this.objective = ''; this.hint = ''; this.showSpill = false; this.timer = null; this.flags.incognito = false;
    this.world.setAmbience(AMBIENCE.night);
    this.world.traffic.blockRing = false;
    const m = this.mission;
    this.marker = m && m.giver ? { x: this.place(m.giver).x, y: this.place(m.giver).y, r: 34 } : null;
    this.armed = false;
  }

  /** Starts the current mission. On a retry the opening cutscene is skipped. */
  startMission(retry = false): void {
    const m = this.mission, w = this.world;
    if (!m) return;
    w.traffic.blockRing = false;
    w.turf.abort();
    this.cleanup();
    this.active = true; this.step = 0; this.flags = {}; this.vars = {}; this.timer = null; this.spill = 0; this.showSpill = false; this.failT = 0; this.junCarLine = null;
    const s = this.place(m.start);
    if (w.player.car) w.player.exitCar();
    w.player.actor.body.reset(s.x, s.y + (m.giver ? 22 : 0));
    w.player.heal();
    w.setAmbience(AMBIENCE[m.ambience]);
    HOOKS[m.setup]?.(w, this);
    if (retry) {
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
      if (st.t === 'cut') {
        const lines = st.lines.filter((l) => !l.if || (l.if.startsWith('!') ? !this.flags[l.if.slice(1)] : this.flags[l.if]));
        this.cut = { lines, i: 0, chars: 0 };
        w.mode = 'cut';
        return;
      }
      if (st.t === 'obj') {
        this.objective = st.text; this.hint = st.hint ?? '';
        this.marker = st.marker ? { x: this.place(st.marker).x, y: this.place(st.marker).y, r: st.radius ?? 40, need: st.need } : null;
        if (st.enter) HOOKS[st.enter]?.(w, this);
        return;
      }
      if (st.t === 'card') { this.card = { title: st.title, sub: st.sub, t: 3.2 }; this.objective = ''; this.hint = ''; this.marker = null; return; }
      if (st.t === 'text') this.phone.push({ from: st.from, text: st.text, t: 6 });
      else if (st.t === 'call') for (const l of st.lines) this.phone.push({ from: l.who, text: l.text, t: 3.2 });
      else if (st.t === 'radio') this.radio = { station: st.station ?? 'KOGANE FM', text: st.text, x: 0 };
      else if (st.t === 'run') HOOKS[st.hook]?.(w, this);
      this.step++;
    }
    // mission complete
    for (const a of this.actors) a.destroy();
    for (const c of this.cars) c.story = false; // mission cars become ordinary cars
    this.actors = []; this.cars = [];
    w.gang.clear();
    this.index++;
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

  /** After the death / arrest screen: missions restart from their beginning. Returns true if it handled the respawn. */
  onRespawn(): boolean {
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

  /** Debug: jump to a mission (F4 = next, F6 = start over). */
  jumpTo(i: number): void {
    this.cut = null; this.card = null; this.world.mode = 'play';
    this.cleanup();
    this.index = Math.max(0, Math.min(MISSIONS.length, i));
    this.save();
    const m = this.mission;
    if (m) this.startMission(); else this.freeRoam();
  }

  update(dt: number): void {
    const w = this.world, p = w.player;
    this.stamp = Math.max(0, this.stamp - dt);
    if (this.phone.length) { this.phone[0].t -= dt; if (this.phone[0].t <= 0) this.phone.shift(); }
    if (this.radio) { this.radio.x += 70 * dt; if (this.radio.x > 960 + this.radio.text.length * 7.3) this.radio = null; }
    if (this.cut) { this.cut.chars += 55 * dt; return; }
    if (this.card && !this.active) { this.card.t -= dt; if (this.card.t <= 0) this.card = null; } // turf banners
    if (w.mode !== 'play') return;

    // The ankle tag: until mission 8 is done, crossing the river means instant 3 lanterns (bible)
    if (this.index < 8 && !this.flags.tagDead && p.pos.x < MAP.riverWidth * TILE_SIZE) {
      if (!this.flags.overRiver) { this.flags.overRiver = true; this.phone.push({ from: 'SAWADA', text: MISSION_BARKS.riverCall, t: 4 }); }
      w.heat.crime('river');
      w.heat.timer = 0; w.heat.lastKnown.x = p.pos.x; w.heat.lastKnown.y = p.pos.y;
    } else if (p.pos.x > (MAP.riverWidth + 4) * TILE_SIZE) this.flags.overRiver = false;

    if (!this.active) {
      // walk into the marker to start the next mission
      const m = this.marker;
      const dm = m ? Math.hypot(p.pos.x - m.x, p.pos.y - m.y) : 0;
      if (m && dm > m.r + 40) this.armed = true;
      if (m && this.armed && dm < m.r && w.heat.level === 0 && (!p.car || p.car.speed < 120)) { this.startMission(); return; }
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
