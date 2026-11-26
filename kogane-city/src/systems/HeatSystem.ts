import { HEAT } from '../data/heat';
import { BARKS, pick } from '../data/strings';
import type { WorldScene } from '../scenes/WorldScene';

/**
 * Heat = the wanted level, shown as red lanterns.
 * Crimes raise it. It never drops while an officer can see you.
 * Once they lose sight, a search circle appears around where you were last seen.
 */
export class HeatSystem {
  level = 0;
  seen = false;
  searching = false;
  /** Seconds unseen that count toward losing the Heat. */
  timer = 0;
  lastKnown = { x: 0, y: 0 };
  /** Counts down after a lantern is gained (HUD flashes). */
  flash = 0;
  /** Counts down after Heat is cleared (HUD shows CLEAN). */
  cleanT = 0;
  private shots: number[] = [];

  constructor(private world: WorldScene) {}

  get searchRadius(): number { return HEAT.searchRadius[this.level] ?? 0; }
  get timeNeeded(): number { return HEAT.lose[this.level]?.time ?? 0; }
  get insideZone(): boolean {
    const p = this.world.player.pos;
    return Math.hypot(p.x - this.lastKnown.x, p.y - this.lastKnown.y) < this.searchRadius;
  }

  /** Report a crime. Raises Heat to that crime's level if it is higher than now. */
  crime(kind: keyof typeof HEAT.crimes): void {
    const to = Math.min(HEAT.maxLevel, HEAT.crimes[kind]);
    const p = this.world.player.pos;
    if (to > this.level) { this.level = to; this.flash = 1; }
    // a fresh witnessed crime tells the police where you are
    if (!this.seen) { this.lastKnown.x = p.x; this.lastKnown.y = p.y; this.timer = 0; this.searching = true; }
  }

  /** A gunshot someone witnessed. Enough of them in a short time is "sustained gunfire". */
  witnessedShot(): void {
    const now = this.world.time.now / 1000;
    this.shots.push(now);
    while (this.shots.length && this.shots[0] < now - HEAT.sustainedFire.window) this.shots.shift();
    if (this.shots.length >= HEAT.sustainedFire.shots) { this.shots.length = 0; this.crime('sustainedFire'); }
  }

  clear(announce: boolean): void {
    if (announce && this.level > 0) {
      this.cleanT = 2.5;
      this.world.fx.bark(this.world.player.pos, pick(BARKS.junHeatLost), '#e8b923');
    }
    this.level = 0; this.searching = false; this.timer = 0; this.seen = false; this.shots.length = 0;
  }

  update(dt: number): void {
    this.flash = Math.max(0, this.flash - dt);
    this.cleanT = Math.max(0, this.cleanT - dt);
    if (this.level === 0) { this.seen = false; return; }
    const p = this.world.player.pos;
    this.seen = this.world.police.anyoneSees();
    if (this.seen) {
      this.searching = false; this.timer = 0;
      this.lastKnown.x = p.x; this.lastKnown.y = p.y;
      return;
    }
    if (!this.searching) {
      this.searching = true; this.timer = 0;
      this.world.police.barkAny(pick(BARKS.policeSearch));
    }
    const rule = HEAT.lose[this.level];
    if (!rule.needZone || !this.insideZone) this.timer += dt;
    if (this.timer >= rule.time) this.clear(true);
  }
}
