import type { WorldScene } from '../scenes/WorldScene';

/**
 * Repeatable side jobs and collectibles in free roam (ramen delivery, taxi fares, K-Route
 * races, lucky cats). The world and HUD already show whatever this system puts in its
 * display fields, so a job only has to set them:
 *  - `starts`: where jobs can be started (drawn as teal rings and minimap dots)
 *  - `objective`, `hint`, `marker`, `timer`: shown while a job is running
 */
export class SideJobs {
  starts: { x: number; y: number; label: string }[] = [];
  objective = '';
  hint = '';
  marker: { x: number; y: number; r: number } | null = null;
  timer: { label: string; value: number; max: number; kind: 'time' | 'bar' } | null = null;
  /** True while a job is running. */
  active = false;

  constructor(protected world: WorldScene) {}

  /** Called every frame in free roam (never during a story mission). */
  update(_dt: number): void { /* filled in by the side-job implementation */ }

  /** Called when a story mission starts, or the player dies or is arrested: stop any job. */
  abort(): void { this.active = false; this.objective = ''; this.hint = ''; this.marker = null; this.timer = null; }
}
