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

  /** Street lamps and glowing vending machines, filled in by bake(). */
  readonly lamps: { x: number; y: number }[] = [];
  readonly vending: { x: number; y: number; color: number }[] = [];

  /** Paints the ground of the whole city once into a single picture, so it costs one draw per frame. */
  bake(scene: Phaser.Scene, key: string): void {
    const tex = scene.textures.createCanvas(key, this.widthPx, this.heightPx)!;
    const g = tex.getContext();
    const C = MAP.colors;
    const rnd = seeded(7);
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? Tile.Building : this.tiles[y * W + x]);
    const isRoad = (t: number) => t === Tile.Road || t === Tile.Crossing;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const t = at(x, y), px = x * TS, py = y * TS;
        g.fillStyle = isRoad(t) ? C.road : t === Tile.Walk ? C.walk : t === Tile.Lot ? C.lot : C.wall;
        g.fillRect(px, py, TS, TS);
        if (isRoad(t) || t === Tile.Lot) { // asphalt speckle and the odd patch
          for (let k = 0; k < 5; k++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.10)'; g.fillRect(px + rnd() * 30, py + rnd() * 30, 2, 2); }
          if (rnd() < 0.04) { g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(px + 4, py + 6, 20, 14); }
        }
        if (t === Tile.Walk) { // paving slabs, and a pale kerb where it meets the road
          g.fillStyle = C.walkLine;
          g.fillRect(px, py, TS, 1); g.fillRect(px, py + 16, TS, 1); g.fillRect(px + ((y & 1) ? 8 : 0), py, 1, 16); g.fillRect(px + ((y & 1) ? 24 : 16), py + 16, 1, 16);
          g.fillStyle = C.kerb;
          if (isRoad(at(x - 1, y))) g.fillRect(px, py, 3, TS);
          if (isRoad(at(x + 1, y))) g.fillRect(px + TS - 3, py, 3, TS);
          if (isRoad(at(x, y - 1))) g.fillRect(px, py, TS, 3);
          if (isRoad(at(x, y + 1))) g.fillRect(px, py + TS - 3, TS, 3);
        }
        if (t === Tile.Crossing) {
          g.fillStyle = C.crossing;
          const vertical = at(x - 1, y) !== Tile.Crossing && at(x + 1, y) !== Tile.Crossing;
          for (let k = 2; k < TS; k += 8) vertical ? g.fillRect(px + 4, py + k, TS - 8, 4) : g.fillRect(px + k, py + 4, 4, TS - 8);
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
    g.fillStyle = 'rgba(255,255,255,0.22)';
    for (const l of this.lots) for (let x = l.x + 32; x < l.x + l.w; x += 48) g.fillRect(x, l.y + 24, 2, l.h - 48);

    // street lamps along the kerbs
    const sp = MAP.lampSpacing * TS;
    for (const band of b) for (let j = 0; j < 2; j++)
      for (let p = b[j] + rw + sp / 2; p < b[j + 1] - 16; p += sp)
        for (const side of [-12, rw + 12]) { this.lamps.push({ x: band + side, y: p }); this.lamps.push({ x: p, y: band + side }); }
    for (const l of this.lamps) { g.fillStyle = '#1c1a18'; g.beginPath(); g.arc(l.x, l.y, 3.5, 0, 7); g.fill(); g.fillStyle = '#ffd9a0'; g.beginPath(); g.arc(l.x, l.y, 1.5, 0, 7); g.fill(); }

    // building shadows on the ground, then the wall footprints
    g.fillStyle = 'rgba(0,0,0,0.30)';
    for (const r of this.buildings) g.fillRect(r.x + 10, r.y + 12, r.w, r.h);
    for (const r of this.buildings) {
      g.fillStyle = C.wall; g.fillRect(r.x, r.y, r.w, r.h);
      g.fillStyle = 'rgba(255,220,170,0.10)'; g.fillRect(r.x, r.y, r.w, 3); g.fillRect(r.x, r.y, 3, r.h);
    }
    // shop awnings and vending machines where a building faces a sidewalk
    for (const r of this.buildings) {
      const tx0 = r.x / TS, ty0 = r.y / TS, tw = r.w / TS, th = r.h / TS;
      const sides: [number, number, number, number, boolean][] = [];
      for (let i = 0; i < tw; i++) { sides.push([tx0 + i, ty0 - 1, 0, 1, true]); sides.push([tx0 + i, ty0 + th, 0, -1, true]); }
      for (let i = 0; i < th; i++) { sides.push([tx0 - 1, ty0 + i, 1, 0, false]); sides.push([tx0 + tw, ty0 + i, -1, 0, false]); }
      let run = 0, color: string = C.awnings[0];
      for (const [x, y, dx, dy, horiz] of sides) {
        if (at(x, y) !== Tile.Walk) { run = 0; continue; }
        if (run <= 0) { run = 2 + Math.floor(rnd() * 3); color = rnd() < 0.3 ? '' : C.awnings[Math.floor(rnd() * C.awnings.length)]; }
        run--;
        const px = x * TS, py = y * TS;
        if (color) {
          const ax = dx > 0 ? px + TS - 7 : px, ay = dy > 0 ? py + TS - 7 : py;
          g.fillStyle = color; horiz ? g.fillRect(px + 1, ay, TS - 2, 7) : g.fillRect(ax, py + 1, 7, TS - 2);
          g.fillStyle = 'rgba(255,255,255,0.22)';
          for (let k = 3; k < TS - 3; k += 6) horiz ? g.fillRect(px + k, ay, 2, 7) : g.fillRect(ax, py + k, 7, 2);
        } else if (rnd() < 0.45) {
          const vc = [0xe04a4a, 0x4a9ae0, 0xf2f2f2][Math.floor(rnd() * 3)];
          const vx = dx > 0 ? px + TS - 10 : dx < 0 ? px + 1 : px + 10, vy = dy > 0 ? py + TS - 10 : dy < 0 ? py + 1 : py + 10;
          g.fillStyle = '#' + vc.toString(16).padStart(6, '0'); g.fillRect(vx, vy, horiz ? 12 : 9, horiz ? 9 : 12);
          g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(vx + 2, vy + 2, horiz ? 8 : 5, horiz ? 5 : 8);
          this.vending.push({ x: vx + 5, y: vy + 5, color: vc });
        }
      }
    }
    // Hozuki-mon temple gate pillars on the sidewalks (the beam and lantern float above, see makeRoofs)
    const gate = MAP.places.asagiri.door;
    g.fillStyle = C.lanternRed;
    for (const tx of [MAP.roadBands[1] - 1, MAP.roadBands[1] + MAP.roadWidth]) g.fillRect(tx * TS + 8, (gate[1] - 6) * TS, 16, 16);
    tex.refresh();
  }

  /**
   * One rooftop picture per building. The world slides them slightly away from the
   * middle of the screen, which makes flat buildings look tall (the GTA 2 trick).
   */
  makeRoofs(scene: Phaser.Scene): { img: Phaser.GameObjects.Image; x: number; y: number; h: number }[] {
    const C = MAP.colors, out: { img: Phaser.GameObjects.Image; x: number; y: number; h: number }[] = [];
    const rnd = seeded(21);
    this.buildings.forEach((r, i) => {
      const key = 'roof' + i;
      const tex = scene.textures.createCanvas(key, r.w, r.h)!;
      const g = tex.getContext();
      const st = C.roofs[Math.floor(rnd() * C.roofs.length)], kind = C.roofs.indexOf(st);
      g.fillStyle = st.base; g.fillRect(0, 0, r.w, r.h);
      g.fillStyle = st.line;
      if (kind === 0 || kind === 3) { // tiled roof: rows of tiles and a ridge beam
        for (let y = 4; y < r.h; y += 5) g.fillRect(0, y, r.w, 1);
        for (let x = 6; x < r.w; x += 12) g.fillRect(x, 0, 1, r.h);
        g.fillStyle = st.trim; r.w > r.h ? g.fillRect(6, r.h / 2 - 3, r.w - 12, 6) : g.fillRect(r.w / 2 - 3, 6, 6, r.h - 12);
      } else if (kind === 2) { // wooden planks
        for (let x = 0; x < r.w; x += 7) g.fillRect(x, 0, 1, r.h);
      }
      if (kind === 1 || kind === 2) { // flat roofs get clutter: AC units, a water tank
        for (let n = 0; n < Math.round((r.w * r.h) / 14000); n++) {
          const x = 14 + rnd() * (r.w - 50), y = 14 + rnd() * (r.h - 50);
          if (rnd() < 0.3) { g.fillStyle = '#6f7f8a'; g.beginPath(); g.arc(x + 12, y + 12, 12, 0, 7); g.fill(); g.fillStyle = '#8fa0aa'; g.beginPath(); g.arc(x + 11, y + 11, 8, 0, 7); g.fill(); }
          else { g.fillStyle = '#8f9498'; g.fillRect(x, y, 22, 16); g.fillStyle = '#5a5f63'; g.beginPath(); g.arc(x + 11, y + 8, 5, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 2, y + 16, 22, 3); }
        }
      }
      // parapet: light on the top/left edges, dark on the bottom/right
      g.fillStyle = st.trim; g.fillRect(0, 0, r.w, 4); g.fillRect(0, 0, 4, r.h);
      g.fillStyle = 'rgba(0,0,0,0.38)'; g.fillRect(0, r.h - 4, r.w, 4); g.fillRect(r.w - 4, 0, 4, r.h);
      for (const [spot, color] of [[MAP.policeBox, C.policeBox], [MAP.hospital, C.hospital]] as const) {
        const [tx, ty, tw, th] = spot.tile;
        const x = tx * TS - r.x, y = ty * TS - r.y;
        if (x >= 0 && y >= 0 && x < r.w && y < r.h) { g.fillStyle = color; g.fillRect(x + 4, y + 4, tw * TS - 8, th * TS - 8); }
      }
      tex.refresh();
      out.push({ img: scene.add.image(r.x + r.w / 2, r.y + r.h / 2, key).setDepth(20), x: r.x + r.w / 2, y: r.y + r.h / 2, h: MAP.roofHeight });
    });
    // the temple gate: a red beam across the road with one giant lantern
    const gate = MAP.places.asagiri.door, gw = (MAP.roadWidth + 2) * TS;
    const tex = scene.textures.createCanvas('gate', gw, 40)!;
    const g = tex.getContext();
    g.fillStyle = '#3a2a22'; g.fillRect(0, 8, gw, 8);
    g.fillStyle = C.lanternRed; g.fillRect(0, 12, gw, 12); g.fillStyle = '#8a1f22'; g.fillRect(0, 22, gw, 3);
    g.fillStyle = '#1c1a18'; g.fillRect(4, 6, 20, 24); g.fillRect(gw - 24, 6, 20, 24);
    g.fillStyle = C.lanternRed; g.beginPath(); g.ellipse(gw / 2, 20, 22, 19, 0, 0, 7); g.fill();
    g.fillStyle = '#1c1a18'; g.fillRect(gw / 2 - 12, 0, 24, 4); g.fillRect(gw / 2 - 12, 36, 24, 4);
    g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 8; y < 34; y += 6) g.fillRect(gw / 2 - 20, y, 40, 1);
    tex.refresh();
    const gx = (MAP.roadBands[1] + MAP.roadWidth / 2) * TS, gy = (gate[1] - 5.75) * TS;
    out.push({ img: scene.add.image(gx, gy, 'gate').setDepth(20), x: gx, y: gy, h: MAP.roofHeight * 0.6 });
    return out;
  }
}

/** Small repeatable random number generator, so the city looks the same every time. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
