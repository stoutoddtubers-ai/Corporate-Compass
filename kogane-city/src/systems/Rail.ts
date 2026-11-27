import * as Phaser from 'phaser';
import { MAP } from '../data/map';
import type { CityMap } from './CityMap';

/**
 * The Wa-sen Loop Line: trains running round the elevated loop (the city's Yamanote Line).
 * They are scenery: they stop at each station, then move on. Nothing collides with them.
 */
export class Rail {
  /** Every carriage: where it is on the map (before any 2.5D lean) and which way it points (read by the 3D view). */
  readonly cars: { img: Phaser.GameObjects.Image; train: number; n: number; x: number; y: number; heading: number }[] = [];
  /** How far round the loop each train is (px), and how long it still waits at a station (s). */
  private at: number[] = [];
  private wait: number[] = [];
  private nextStop: number[] = [];
  private length: number;
  private stops: number[];

  constructor(scene: Phaser.Scene, private map: CityMap) {
    const R = MAP.rail;
    this.length = map.railLength;
    this.stops = map.stations.map((s) => s.at).sort((a, b) => a - b);
    // one carriage picture each way: silver with the line's green stripe
    for (const [key, w, h] of [['trainH', R.carLength, 18], ['trainV', 18, R.carLength]] as [string, number, number][]) {
      const t = scene.textures.createCanvas(key, w, h)!, g = t.getContext();
      g.fillStyle = '#c9ced4'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#7fbf4f'; if (w > h) { g.fillRect(0, 2, w, 3); g.fillRect(0, h - 5, w, 3); } else { g.fillRect(2, 0, 3, h); g.fillRect(w - 5, 0, 3, h); }
      g.fillStyle = '#8f969e'; if (w > h) g.fillRect(3, 7, w - 6, 4); else g.fillRect(7, 3, 4, h - 6); // roof vents
      g.fillStyle = '#3a3f46'; if (w > h) { g.fillRect(0, 0, 1, h); g.fillRect(w - 1, 0, 1, h); } else { g.fillRect(0, 0, w, 1); g.fillRect(0, h - 1, w, 1); }
      t.refresh();
    }
    for (let tr = 0; tr < R.trains; tr++) {
      this.at.push((this.length * tr) / R.trains); this.wait.push(0);
      this.nextStop.push(this.stopAfter(this.at[tr]));
      for (let n = 0; n < R.cars; n++) this.cars.push({ img: scene.add.image(0, 0, 'trainH').setDepth(21), train: tr, n, x: 0, y: 0, heading: 0 });
    }
  }

  private stopAfter(d: number): number {
    return this.stops.find((s) => s > d + 1) ?? this.stops[0] + this.length;
  }

  update(dt: number, mid: { x: number; y: number }): void {
    const R = MAP.rail, k = R.height + 0.012, ps = k * MAP.perspective, lean = k * MAP.heightScale * MAP.tilt;
    for (let tr = 0; tr < this.at.length; tr++) {
      if (this.wait[tr] > 0) { this.wait[tr] -= dt; continue; }
      // slow into the station, stop, pull away
      const left = this.nextStop[tr] - this.at[tr];
      const speed = Math.max(40, Math.min(R.speed, left * 1.2 + 40));
      this.at[tr] += speed * dt;
      if (this.at[tr] >= this.nextStop[tr]) {
        this.at[tr] = this.nextStop[tr] % this.length;
        this.wait[tr] = R.stopTime;
        this.nextStop[tr] = this.stopAfter(this.at[tr]);
      }
    }
    for (const c of this.cars) {
      const d = this.at[c.train] - c.n * (R.carLength + 3), q = this.map.railPoint(d), ahead = this.map.railPoint(d + 2);
      c.x = q.x; c.y = q.y; c.heading = Math.atan2(ahead.y - q.y, ahead.x - q.x);
      c.img.setTexture(q.horizontal ? 'trainH' : 'trainV');
      c.img.setPosition(q.x + (q.x - mid.x) * ps, q.y + (q.y - mid.y) * ps - lean);
    }
  }
}
