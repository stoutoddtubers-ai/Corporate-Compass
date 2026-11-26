import * as Phaser from 'phaser';
import { TILE_SIZE as TS, MAP_TILES_W as W, MAP_TILES_H as H } from '../data/config';
import { MAP } from '../data/map';

export const Tile = { Lot: 0, Road: 1, Walk: 2, Building: 3, Crossing: 4 } as const;

/** One stretch of lane that AI traffic follows, from A to B. */
export interface LaneSeg {
  ax: number; ay: number; bx: number; by: number;
  dx: number; dy: number; len: number;
  axis: 'v' | 'h';
  fromJ: number; toJ: number;
  next: LaneSeg[];
}

export interface Rect { x: number; y: number; w: number; h: number }

/** The junction in the middle of the map: the one with the traffic light. */
export const CENTER_JUNCTION = 4;

/**
 * The test city: which tiles are road / sidewalk / building, the lanes traffic follows,
 * and helper questions like "is this spot a wall?" and "can A see B?".
 */
export class CityMap {
  readonly tiles = new Uint8Array(W * H);
  readonly buildings: Rect[] = []; // in pixels
  readonly lots: Rect[] = []; // in pixels
  readonly lanes: LaneSeg[] = [];
  readonly widthPx = W * TS;
  readonly heightPx = H * TS;
  private carPass = new Uint8Array(W * H);
  private queue = new Int32Array(W * H);

  constructor() {
    this.build();
    this.buildLanes();
  }

  private fill(x: number, y: number, w: number, h: number, t: number): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.tiles[j * W + i] = t;
  }

  private build(): void {
    this.tiles.fill(Tile.Building); // outer wall
    this.fill(2, 2, W - 4, H - 4, Tile.Walk);
    for (const b of MAP.roadBands) {
      this.fill(3, b, W - 6, MAP.roadWidth, Tile.Road);
      this.fill(b, 3, MAP.roadWidth, H - 6, Tile.Road);
    }
    // zebra crossings around the centre junction
    const c = MAP.roadBands[1];
    this.fill(c, c - 1, 4, 1, Tile.Crossing);
    this.fill(c, c + 4, 4, 1, Tile.Crossing);
    this.fill(c - 1, c, 1, 4, Tile.Crossing);
    this.fill(c + 4, c, 1, 4, Tile.Crossing);

    const S = MAP.blockSize;
    MAP.blockOrigins.forEach((oy, by) => {
      MAP.blockOrigins.forEach((ox, bx) => {
        this.fill(ox, oy, S, S, Tile.Lot);
        const place = (r: readonly number[]): Rect => {
          const x = bx ? S - r[0] - r[2] : r[0];
          const y = by ? S - r[1] - r[3] : r[1];
          return { x: ox + x, y: oy + y, w: r[2], h: r[3] };
        };
        for (const r of MAP.blockBuildings) {
          const p = place(r);
          this.fill(p.x, p.y, p.w, p.h, Tile.Building);
          this.buildings.push({ x: p.x * TS, y: p.y * TS, w: p.w * TS, h: p.h * TS });
        }
        const l = place(MAP.blockLot);
        this.lots.push({ x: l.x * TS, y: l.y * TS, w: l.w * TS, h: l.h * TS });
      });
    });

    // Tiles a police car is allowed to plan a route through: not a building, not hugging one.
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        let ok = 1;
        for (let j = -1; j <= 1 && ok; j++)
          for (let i = -1; i <= 1; i++) if (this.tiles[(y + j) * W + x + i] === Tile.Building) { ok = 0; break; }
        this.carPass[y * W + x] = ok;
      }
    }
  }

  /** Builds the left-hand-traffic lane network from the road bands. */
  private buildLanes(): void {
    const b = MAP.roadBands.map((t) => t * TS);
    const rw = MAP.roadWidth * TS;
    const add = (ax: number, ay: number, bx: number, by: number, fromJ: number, toJ: number) => {
      const len = Math.hypot(bx - ax, by - ay);
      this.lanes.push({
        ax, ay, bx, by, dx: (bx - ax) / len, dy: (by - ay) / len, len,
        axis: ax === bx ? 'v' : 'h', fromJ, toJ, next: [],
      });
    };
    const J = (i: number, j: number) => i + j * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        // vertical road i, between horizontal roads j and j+1
        add(b[i] + 32, b[j + 1], b[i] + 32, b[j] + rw, J(i, j + 1), J(i, j)); // northbound, west side
        add(b[i] + 96, b[j] + rw, b[i] + 96, b[j + 1], J(i, j), J(i, j + 1)); // southbound, east side
        // horizontal road i, between vertical roads j and j+1
        add(b[j] + rw, b[i] + 32, b[j + 1], b[i] + 32, J(j, i), J(j + 1, i)); // eastbound, north side
        add(b[j + 1], b[i] + 96, b[j] + rw, b[i] + 96, J(j + 1, i), J(j, i)); // westbound, south side
      }
    }
    for (const s of this.lanes) s.next = this.lanes.filter((n) => n.fromJ === s.toJ && n.toJ !== s.fromJ);
  }

  tileAt(px: number, py: number): number {
    const x = (px / TS) | 0, y = (py / TS) | 0;
    if (px < 0 || py < 0 || x >= W || y >= H) return Tile.Building;
    return this.tiles[y * W + x];
  }

  isSolid(px: number, py: number): boolean {
    return this.tileAt(px, py) === Tile.Building;
  }

  /** True if nothing solid is between the two points. */
  los(x0: number, y0: number, x1: number, y1: number): boolean {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.ceil(d / 12);
    for (let i = 1; i < n; i++) {
      const k = i / n;
      if (this.isSolid(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k)) return false;
    }
    return true;
  }

  /** Random spot a person can stand on. Prefers sidewalks. */
  randomWalkPoint(preferWalk = true): { x: number; y: number } {
    for (let n = 0; n < 200; n++) {
      const x = 2 + Math.floor(Math.random() * (W - 4));
      const y = 2 + Math.floor(Math.random() * (H - 4));
      const t = this.tiles[y * W + x];
      if (t === Tile.Walk || (!preferWalk && t === Tile.Lot) || (n > 150 && t !== Tile.Building))
        return { x: (x + 0.5) * TS, y: (y + 0.5) * TS };
    }
    return { x: MAP.playerStart[0] * TS, y: MAP.playerStart[1] * TS };
  }

  /**
   * "Flow field": for every tile, how many steps it is from the target.
   * Police follow the numbers downhill to find their way around buildings.
   */
  flow(tx: number, ty: number, forCars: boolean, out: Int16Array): void {
    out.fill(-1);
    const pass = (i: number) => (forCars ? this.carPass[i] === 1 : this.tiles[i] !== Tile.Building);
    let sx = Phaser.Math.Clamp((tx / TS) | 0, 1, W - 2), sy = Phaser.Math.Clamp((ty / TS) | 0, 1, H - 2);
    if (!pass(sy * W + sx)) {
      let best = -1, bd = 1e9;
      for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) {
        const x = sx + i, y = sy + j;
        if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
        const d = i * i + j * j;
        if (d < bd && pass(y * W + x)) { bd = d; best = y * W + x; }
      }
      if (best < 0) return;
      sx = best % W; sy = (best / W) | 0;
    }
    const q = this.queue;
    let head = 0, tail = 0;
    q[tail++] = sy * W + sx;
    out[sy * W + sx] = 0;
    while (head < tail) {
      const c = q[head++];
      const d = out[c] + 1;
      const cx = c % W;
      if (cx > 0 && out[c - 1] < 0 && pass(c - 1)) { out[c - 1] = d; q[tail++] = c - 1; }
      if (cx < W - 1 && out[c + 1] < 0 && pass(c + 1)) { out[c + 1] = d; q[tail++] = c + 1; }
      if (c >= W && out[c - W] < 0 && pass(c - W)) { out[c - W] = d; q[tail++] = c - W; }
      if (c < W * (H - 1) && out[c + W] < 0 && pass(c + W)) { out[c + W] = d; q[tail++] = c + W; }
    }
  }

  /** From a position, the centre of the neighbouring tile that is closer to the flow target. */
  flowStep(field: Int16Array, px: number, py: number, steps = 1): { x: number; y: number } | null {
    let x = (px / TS) | 0, y = (py / TS) | 0;
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return null;
    let cur = field[y * W + x];
    if (cur < 0) {
      // standing on a tile the field does not cover (e.g. car on a sidewalk): find a covered neighbour
      let best = 1e9, bx = -1, by = -1;
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
        const v = field[(y + j) * W + x + i];
        if (v >= 0 && v < best && x + i > 0 && x + i < W && y + j > 0 && y + j < H) { best = v; bx = x + i; by = y + j; }
      }
      if (bx < 0) return null;
      return { x: (bx + 0.5) * TS, y: (by + 0.5) * TS };
    }
    for (let s = 0; s < steps && cur > 0; s++) {
      let best = cur, nx = x, ny = y;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        if (!i && !j) continue;
        const v = field[(y + j) * W + x + i];
        if (v < 0 || v >= best) continue;
        if (i && j && (field[y * W + x + i] < 0 || field[(y + j) * W + x] < 0)) continue; // no corner cutting
        best = v; nx = x + i; ny = y + j;
      }
      if (nx === x && ny === y) break;
      x = nx; y = ny; cur = best;
    }
    return { x: (x + 0.5) * TS, y: (y + 0.5) * TS };
  }

  /** Paints the whole city once into a single picture, so it costs one draw per frame. */
  bake(scene: Phaser.Scene, key: string): void {
    const tex = scene.textures.createCanvas(key, this.widthPx, this.heightPx)!;
    const g = tex.getContext();
    const C = MAP.colors;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const t = this.tiles[y * W + x];
        g.fillStyle = t === Tile.Road || t === Tile.Crossing ? C.road : t === Tile.Walk ? C.walk : t === Tile.Lot ? C.lot : C.building;
        g.fillRect(x * TS, y * TS, TS, TS);
        if (t === Tile.Walk) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x * TS, y * TS, TS, 1); g.fillRect(x * TS, y * TS, 1, TS); }
        if (t === Tile.Crossing) {
          g.fillStyle = C.crossing;
          const vertical = this.tiles[y * W + x - 1] !== Tile.Crossing && this.tiles[y * W + x + 1] !== Tile.Crossing;
          for (let k = 2; k < TS; k += 8) vertical ? g.fillRect(x * TS + 4, y * TS + k, TS - 8, 4) : g.fillRect(x * TS + k, y * TS + 4, 4, TS - 8);
        }
      }
    }
    // dashed centre lines between the junctions
    const b = MAP.roadBands.map((t) => t * TS), rw = MAP.roadWidth * TS;
    g.fillStyle = C.laneLine;
    for (const band of b) for (let j = 0; j < 2; j++)
      for (let p = b[j] + rw + 40; p < b[j + 1] - 48; p += 32) {
        g.fillRect(band + rw / 2 - 1, p, 2, 16);
        g.fillRect(p, band + rw / 2 - 1, 16, 2);
      }
    // parking bays
    g.fillStyle = 'rgba(255,255,255,0.18)';
    for (const l of this.lots) for (let x = l.x + 32; x < l.x + l.w; x += 48) g.fillRect(x, l.y + 24, 2, l.h - 48);
    // rooftops
    for (const r of this.buildings) {
      g.fillStyle = C.roofEdge; g.fillRect(r.x, r.y, r.w, r.h);
      g.fillStyle = C.roof; g.fillRect(r.x + 5, r.y + 5, r.w - 10, r.h - 10);
      g.fillStyle = 'rgba(255,255,255,0.05)';
      for (let y = r.y + 20; y < r.y + r.h - 20; y += 36) for (let x = r.x + 20; x < r.x + r.w - 20; x += 36) g.fillRect(x, y, 14, 14);
    }
    for (const [spot, color] of [[MAP.policeBox, C.policeBox], [MAP.hospital, C.hospital]] as const) {
      const [x, y, w, h] = spot.tile;
      g.fillStyle = color; g.fillRect(x * TS + 5, y * TS + 5, w * TS - 10, h * TS - 10);
    }
    tex.refresh();
  }
}
