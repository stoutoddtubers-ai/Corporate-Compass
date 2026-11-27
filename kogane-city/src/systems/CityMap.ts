import * as Phaser from 'phaser';
import { TILE_SIZE as TS, MAP_TILES_W as W, MAP_TILES_H as H } from '../data/config';
import { MAP, DISTRICTS, DistrictStyle } from '../data/map';
import { SHEET } from './sprites';

export const Tile = { Lot: 0, Road: 1, Walk: 2, Building: 3, Crossing: 4, Water: 5 } as const;

/** One stretch of lane that AI traffic follows, from A to B. */
export interface LaneSeg {
  ax: number; ay: number; bx: number; by: number;
  dx: number; dy: number; len: number;
  axis: 'v' | 'h';
  fromJ: number; toJ: number;
  next: LaneSeg[];
  /** True for lanes on the K-Route ring. */
  ring: boolean;
}
export interface Rect { x: number; y: number; w: number; h: number }
export interface Plot extends Rect { district: string; block: string; roof?: string; height?: number }
export interface Block extends Rect { id: string; district: string }
export interface Place { x: number; y: number; sx: number; sy: number; label: string; rect: Rect | null }
export interface Light { x: number; y: number; color: number; scale: number; alpha: number }
/** A piece of street furniture. Posts (trees, lamps, vending machines) stop cars; loose things get knocked flying. */
export interface Furniture { x: number; y: number; key: string; h: number; solid?: 'post' | 'loose'; roof?: Roof; gone?: boolean }
/** Something drawn above the street: a rooftop (with its building's footprint, for walls), a sign, the gate... */
export interface Roof { img: Phaser.GameObjects.Image | Phaser.GameObjects.Text; x: number; y: number; h: number; rect?: Rect; wall?: number; sway?: boolean; smoke?: boolean; beacon?: boolean; awn?: number[]; dead?: boolean;
  /** Rooftops only: the picture's name, how to paint it, and whether it is painted right now. */
  key?: string; paint?: () => void; made?: boolean }
export interface Junction { id: number; x: number; y: number; lit: boolean; offset: number }

/** Small repeatable random number generator, so the city is the same every time. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const css = (n: number) => '#' + n.toString(16).padStart(6, '0');
const DIST_IDS = Object.keys(DISTRICTS);

// Where each kind of ground tile sits in the generated tile sheet.
const T = { rail: 22, arcade: 23, wall: 0, road: 1, roadDash: 4, kroad: 8, kDash: 9, crossV: 13, crossH: 14, lot: 15, bay: 16, alley: 17, water: 18, planks: 20, bridge: 21, walk: 32 };
const SHEET_COLS = 16, SHEET_ROWS = 10; // sidewalk tiles: 16 kerb variants for each of 8 districts, from tile 32

/**
 * The city: which tiles are road / sidewalk / building / water, the lanes traffic follows,
 * the story's named places, and helper questions like "is this a wall?" and "can A see B?".
 */
export class CityMap {
  readonly tiles = new Uint8Array(W * H);
  readonly buildings: Plot[] = []; // in pixels
  readonly lots: Plot[] = [];
  /** City blocks (the turf zones), in pixels. */
  readonly blocks: Block[] = [];
  private floors = new Int16Array(W * H).fill(-1);
  private laid: { id: string; plot: Plot; door?: string; label?: string }[] = [];
  readonly water: Rect[] = [];
  readonly roads: Rect[] = []; // for the minimap
  readonly lanes: LaneSeg[] = [];
  readonly junctions: Junction[] = [];
  readonly lights: Light[] = [];
  readonly places: Record<string, Place> = {};
  readonly widthPx = W * TS;
  readonly heightPx = H * TS;
  private carPass = new Uint8Array(W * H);
  private queue = new Int32Array(W * H);
  private decals = new Int16Array(W * H).fill(-1);
  private groundLayer: Phaser.Tilemaps.TilemapLayer | null = null;

  /** Swaps the two water pictures, so the river and canal shimmer. */
  shimmer(): void { this.groundLayer?.swapByIndex(T.water, T.water + 1); }
  /** Street furniture drawn as sprites: trees, benches, bins, crates, cones. `h` > 0 makes it stand up (2.5D). */
  readonly furniture: Furniture[] = [];

  constructor() {
    this.build();
    this.buildLanes();
    this.resolvePlaces();
    this.decorate();
  }

  private fill(x: number, y: number, w: number, h: number, t: number): void {
    for (let j = Math.max(0, y); j < Math.min(H, y + h); j++) for (let i = Math.max(0, x); i < Math.min(W, x + w); i++) this.tiles[j * W + i] = t;
  }
  private at(x: number, y: number): number {
    return x < 0 || y < 0 || x >= W || y >= H ? Tile.Building : this.tiles[y * W + x];
  }

  /** Which stretches of road exist: [column][row] for north-south pieces, [row][column] for east-west pieces. */
  private segV: boolean[][] = [];
  private segH: boolean[][] = [];
  private bridgeAt = new Uint8Array(W * H);

  private build(): void {
    const V = MAP.vRoads, Hh = MAP.hRoads, rw = MAP.roadWidth, nv = V.length, nh = Hh.length;
    const R = MAP.river, P = MAP.port, bayY = MAP.bay.y;
    this.tiles.fill(Tile.Building); // outer wall
    this.fill(V[0] - 2, 2, W - V[0], H - 4, Tile.Walk); // (the strip west of the first road stays solid)
    // water: the river, then the whole bay...
    this.fill(R.x, 2, R.w, H - 4, Tile.Water);
    this.fill(2, bayY, W - 4, H - 2 - bayY, Tile.Water);
    // ...except the port island
    const ix0 = V[P.v0] - 2, ix1 = V[P.v1] + rw + 2, iy0 = Hh[P.h0] - 2, iy1 = Hh[P.h1] + rw + 2;
    this.fill(ix0, iy0, ix1 - ix0, iy1 - iy0, Tile.Walk);
    this.fill(MAP.pier[0], MAP.pier[1], MAP.pier[2], MAP.pier[3], Tile.Walk); // the river-cruise pier

    // which road pieces exist. City rows: everything (east-west roads cross the river as bridges).
    // The bay is crossed only by the Bay Bridge; the port island has its own small grid.
    for (let i = 0; i < nv; i++) this.segV.push(Array.from({ length: nh - 1 }, (_, j) => (j < P.h0 - 1 ? true : j === P.h0 - 1 ? i === P.bridge : i >= P.v0 && i <= P.v1)));
    for (let j = 0; j < nh; j++) this.segH.push(Array.from({ length: nv - 1 }, (_, i) => (j < P.h0 ? true : i >= P.v0 && i < P.v1)));
    const markBridge = (x: number, y: number, w: number, h: number) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.bridgeAt[yy * W + xx] = 1; };
    for (let i = 0; i < nv; i++) for (let j = 0; j < nh - 1; j++) {
      if (!this.segV[i][j]) continue;
      const y = Hh[j], h = Hh[j + 1] + rw - Hh[j];
      if (j === P.h0 - 1) { // the Bay Bridge: a deck over the water with a footway each side
        this.fill(V[i] - 1, bayY, 1, iy0 - bayY, Tile.Walk); this.fill(V[i] + rw, bayY, 1, iy0 - bayY, Tile.Walk);
        markBridge(V[i], bayY, rw, iy0 - bayY);
      }
      this.fill(V[i], y, rw, h, Tile.Road); this.roads.push({ x: V[i] * TS, y: y * TS, w: rw * TS, h: h * TS });
    }
    for (let j = 0; j < nh; j++) for (let i = 0; i < nv - 1; i++) {
      if (!this.segH[j][i]) continue;
      const x = V[i], w = V[i + 1] + rw - V[i];
      if (R.x > V[i] && R.x < V[i + 1]) { // a river bridge
        this.fill(R.x, Hh[j] - 1, R.w, 1, Tile.Walk); this.fill(R.x, Hh[j] + rw, R.w, 1, Tile.Walk);
        markBridge(R.x, Hh[j], R.w, rw);
      }
      this.fill(x, Hh[j], w, rw, Tile.Road); this.roads.push({ x: x * TS, y: Hh[j] * TS, w: w * TS, h: rw * TS });
    }

    // junctions; the four-way ones get traffic lights and zebra crossings
    for (let i = 0; i < nv; i++) for (let j = 0; j < nh; j++) {
      const arms = (j > 0 && this.segV[i][j - 1] ? 1 : 0) + (j < nh - 1 && this.segV[i][j] ? 1 : 0) + (i > 0 && this.segH[j][i - 1] ? 1 : 0) + (i < nv - 1 && this.segH[j][i] ? 1 : 0);
      if (!arms) continue;
      const lit = arms === 4, v = V[i], h = Hh[j];
      this.junctions.push({ id: i + j * nv, x: (v + rw / 2) * TS, y: (h + rw / 2) * TS, lit, offset: ((i * 5 + j * 3) % 7) * 2.3 });
      if (!lit) continue;
      this.fill(v, h - 1, rw, 1, Tile.Crossing); this.fill(v, h + rw, rw, 1, Tile.Crossing);
      this.fill(v - 1, h, 1, rw, Tile.Crossing); this.fill(v + rw, h, 1, rw, Tile.Crossing);
    }

    // city blocks between the roads. West side blocks are "wC-R", east bank "C-R", port island "pN".
    const rnd = seeded(1207);
    for (let cj = 0; cj < nh - 1; cj++) for (let ci = 0; ci < nv - 1; ci++) {
      const river = R.x > V[ci] && R.x < V[ci + 1], port = cj >= P.h0;
      if (river || cj === P.h0 - 1 || (port && !(ci >= P.v0 && ci < P.v1))) continue; // water, not a block
      const x0 = V[ci] + rw + 1, x1 = V[ci + 1] - 1, y0 = Hh[cj] + rw + 1, y1 = Hh[cj + 1] - 1; // x1,y1 exclusive
      const east = ci - P.v0, base = port ? `p${east}` : east >= 0 ? `${east}-${cj}` : `w${ci}-${cj}`;
      const parts: { id: string; r: Rect }[] = [];
      const c = MAP.canal;
      if (!port && east === 3 && (c.rows as readonly number[]).includes(cj)) {
        this.fill(c.x, y0, c.w, y1 - y0, Tile.Water);
        parts.push({ id: base + 'a', r: { x: x0, y: y0, w: c.x - 1 - x0, h: y1 - y0 } });
        parts.push({ id: base + 'b', r: { x: c.x + c.w + 1, y: y0, w: x1 - (c.x + c.w + 1), h: y1 - y0 } });
      } else parts.push({ id: base, r: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } });
      for (const p of parts) this.buildBlock(p.id, p.r, rnd);
    }

    // water as a few big rectangles (for collisions and the minimap): merge runs row by row
    const open: Rect[] = [];
    for (let y = 0; y < H; y++) {
      const runs: number[][] = [];
      for (let x = 0; x < W; x++) if (this.tiles[y * W + x] === Tile.Water) { const x0 = x; while (x < W && this.tiles[y * W + x] === Tile.Water) x++; runs.push([x0, x - x0]); }
      for (const [x0, len] of runs) {
        const prev = open.find((r) => r.x === x0 * TS && r.w === len * TS && r.y + r.h === y * TS);
        if (prev) prev.h += TS; else { const r = { x: x0 * TS, y: y * TS, w: len * TS, h: TS }; open.push(r); this.water.push(r); }
      }
    }

    // tiles a car is allowed to plan a route through: not solid, and not hugging a building
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      let ok = this.tiles[y * W + x] !== Tile.Water ? 1 : 0;
      for (let j = -1; j <= 1 && ok; j++) for (let i = -1; i <= 1; i++) if (this.tiles[(y + j) * W + x + i] === Tile.Building) { ok = 0; break; }
      this.carPass[y * W + x] = ok;
    }
  }

  /** Cuts one city block into buildings, alleys and car parks, in the district's style. */
  private buildBlock(id: string, r: Rect, rnd: () => number): void {
    const district = MAP.districtAt(r.x + r.w / 2, r.y + r.h / 2), st = DISTRICTS[district];
    this.fill(r.x, r.y, r.w, r.h, Tile.Lot);
    this.blocks.push({ id, district, x: r.x * TS, y: r.y * TS, w: r.w * TS, h: r.h * TS });
    const layout = MAP.layouts[id];
    if (layout) { // a hand-designed landmark block
      for (const it of layout) {
        const [x, y, w, h] = [r.x + it.r[0], r.y + it.r[1], it.r[2], it.r[3]];
        const plot: Plot = { x: x * TS, y: y * TS, w: w * TS, h: h * TS, district, block: id, roof: it.roof, height: it.height };
        if (it.kind === 'f') { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.floors[j * W + i] = it.floor === 'rail' ? T.rail : T.arcade; continue; }
        if (it.kind === 'l') this.lots.push(plot); else { this.fill(x, y, w, h, Tile.Building); this.buildings.push(plot); }
        if (it.place) this.laid.push({ id: it.place, plot, door: it.door, label: it.label });
      }
      return;
    }
    const leaves: Rect[] = [];
    const split = (q: Rect) => {
      const canW = q.w >= 2 * st.minSize + 2, canH = q.h >= 2 * st.minSize + 2;
      if ((q.w <= st.maxSize && q.h <= st.maxSize) || (!canW && !canH)) { leaves.push(q); return; }
      if (canW && (!canH || q.w >= q.h)) {
        const cut = st.minSize + Math.floor(rnd() * (q.w - 2 * st.minSize - 1));
        split({ x: q.x, y: q.y, w: cut, h: q.h }); split({ x: q.x + cut + 2, y: q.y, w: q.w - cut - 2, h: q.h });
      } else {
        const cut = st.minSize + Math.floor(rnd() * (q.h - 2 * st.minSize - 1));
        split({ x: q.x, y: q.y, w: q.w, h: cut }); split({ x: q.x, y: q.y + cut + 2, w: q.w, h: q.h - cut - 2 });
      }
    };
    split(r);
    const isLot = leaves.map(() => rnd() < st.lotChance);
    if (!isLot.some(Boolean)) { // every block gets at least one car park: the leaf nearest the middle
      let best = 0, bd = 1e9;
      leaves.forEach((l, i) => { const d = Math.abs(l.x + l.w / 2 - r.x - r.w / 2) + Math.abs(l.y + l.h / 2 - r.y - r.h / 2); if (d < bd) { bd = d; best = i; } });
      isLot[best] = true;
    }
    leaves.forEach((l, i) => {
      const px = { x: l.x * TS, y: l.y * TS, w: l.w * TS, h: l.h * TS, district, block: id };
      if (isLot[i]) this.lots.push(px);
      else { this.fill(l.x, l.y, l.w, l.h, Tile.Building); this.buildings.push(px); }
    });
  }

  /** Builds the left-hand-traffic lane network from the road grid. */
  private buildLanes(): void {
    const V = MAP.vRoads.map((t) => t * TS), Hh = MAP.hRoads.map((t) => t * TS), rw = MAP.roadWidth * TS, nv = V.length, E = MAP.eastRing;
    const add = (ax: number, ay: number, bx: number, by: number, fromJ: number, toJ: number, ring: boolean) => {
      const len = Math.hypot(bx - ax, by - ay);
      this.lanes.push({ ax, ay, bx, by, dx: (bx - ax) / len, dy: (by - ay) / len, len, axis: ax === bx ? 'v' : 'h', fromJ, toJ, next: [], ring });
    };
    const J = (i: number, j: number) => i + j * nv;
    const inEast = (t: number) => t >= E.west && t <= E.east, inCity = (t: number) => t >= E.north && t <= E.south;
    for (let i = 0; i < V.length; i++) for (let j = 0; j < Hh.length - 1; j++) {
      if (!this.segV[i][j]) continue;
      const ring = (MAP.vRoads[i] === E.west || MAP.vRoads[i] === E.east) && inCity(MAP.hRoads[j]) && inCity(MAP.hRoads[j + 1]); // the east-bank K-Route loop
      add(V[i] + 32, Hh[j + 1], V[i] + 32, Hh[j] + rw, J(i, j + 1), J(i, j), ring); // northbound, west side
      add(V[i] + 96, Hh[j] + rw, V[i] + 96, Hh[j + 1], J(i, j), J(i, j + 1), ring); // southbound, east side
    }
    for (let j = 0; j < Hh.length; j++) for (let i = 0; i < V.length - 1; i++) {
      if (!this.segH[j][i]) continue;
      const ring = (MAP.hRoads[j] === E.north || MAP.hRoads[j] === E.south) && inEast(MAP.vRoads[i]) && inEast(MAP.vRoads[i + 1]);
      add(V[i] + rw, Hh[j] + 32, V[i + 1], Hh[j] + 32, J(i, j), J(i + 1, j), ring); // eastbound, north side
      add(V[i + 1], Hh[j] + 96, V[i] + rw, Hh[j] + 96, J(i + 1, j), J(i, j), ring); // westbound, south side
    }
    for (const s of this.lanes) s.next = this.lanes.filter((n) => n.fromJ === s.toJ && n.toJ !== s.fromJ);
    for (const s of this.lanes) if (!s.next.length) s.next = this.lanes.filter((n) => n.fromJ === s.toJ); // dead end: turn back
  }

  /** Shortest chain of lanes from one lane to a point (used by story cars that must drive somewhere). */
  route(from: LaneSeg, tx: number, ty: number): LaneSeg[] {
    const goal = this.lanes.reduce((b, l) => (Math.hypot(l.bx - tx, l.by - ty) < Math.hypot(b.bx - tx, b.by - ty) ? l : b));
    const prev = new Map<LaneSeg, LaneSeg | null>([[from, null]]);
    const q = [from];
    while (q.length) {
      const c = q.shift()!;
      if (c === goal) break;
      for (const n of c.next) if (!prev.has(n)) { prev.set(n, c); q.push(n); }
    }
    const out: LaneSeg[] = [];
    for (let c: LaneSeg | null | undefined = goal; c; c = prev.get(c)) out.unshift(c);
    return out[0] === from ? out : [from];
  }

  nearestLane(x: number, y: number): LaneSeg {
    let best = this.lanes[0], bd = 1e9;
    for (const l of this.lanes) {
      const k = Phaser.Math.Clamp(((x - l.ax) * l.dx + (y - l.ay) * l.dy) / l.len, 0, 1);
      const d = Math.hypot(l.ax + l.dx * l.len * k - x, l.ay + l.dy * l.len * k - y);
      if (d < bd) { bd = d; best = l; }
    }
    return best;
  }

  /** Pins the story's named places to actual buildings and car parks. */
  private resolvePlaces(): void {
    for (const l of this.laid) { // places pinned by a hand-designed layout
      const r = l.plot, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      const d = l.door, x = d === 'e' ? r.x + r.w + 22 : d === 'w' ? r.x - 22 : cx, y = d === 's' ? r.y + r.h + 22 : d === 'n' ? r.y - 22 : cy;
      this.places[l.id] = { x, y, sx: cx, sy: cy, label: l.label ?? '', rect: r };
    }
    for (const [id, spec] of Object.entries(MAP.places)) {
      if (spec.tile) { this.places[id] = { x: spec.tile[0] * TS, y: spec.tile[1] * TS, sx: 0, sy: 0, label: '', rect: null }; continue; }
      const pool = (spec.kind === 'lot' ? this.lots : this.buildings).filter((p) => p.block === spec.block).sort((a, b) => b.w * b.h - a.w * a.h);
      const r = pool[Math.min(spec.pick ?? 0, pool.length - 1)];
      if (!r) throw new Error('No plot for place ' + id);
      if ((spec.pick ?? 0) >= pool.length) console.warn(`Place ${id}: block ${spec.block} has only ${pool.length} ${spec.kind}s, so it shares one with another place.`);
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      let x = cx, y = cy;
      if (spec.kind === 'building') {
        // the door: the middle of whichever wall faces open ground (a car park or alley if possible)
        const sides = [[cx, r.y - 20], [cx, r.y + r.h + 20], [r.x - 20, cy], [r.x + r.w + 20, cy]];
        const score = (p: number[]) => { const t = this.tileAt(p[0], p[1]); return t === Tile.Lot ? 3 : t === Tile.Walk ? 2 : t === Tile.Building || t === Tile.Water ? -1 : 0; };
        const best = sides.sort((a, b) => score(b) - score(a))[0];
        x = best[0]; y = best[1];
      }
      this.places[id] = { x, y, sx: cx, sy: cy, label: spec.label ?? '', rect: r };
    }
  }

  /** Street lamps, shop awnings, vending machines: picks where they go. */
  private decorate(): void {
    const rnd = seeded(77), V = MAP.vRoads, Hh = MAP.hRoads, rw = MAP.roadWidth;
    const lampAt = (x: number, y: number) => {
      if (this.at(x, y) !== Tile.Walk) return;
      this.decals[y * W + x] = -2; // nothing else on this tile
      this.furniture.push({ x: (x + 0.5) * TS, y: (y + 0.5) * TS, key: 'prop_lamp', h: 0 });
      this.lights.push({ x: (x + 0.5) * TS, y: (y + 0.5) * TS, color: DISTRICTS[MAP.districtAt(x, y)].lamp, scale: 1.7, alpha: 0.55 });
    };
    // street trees between the lamps: cherry and green in Asagiri, a few in Denpa-chō, none in the industrial east
    const treeAt = (x: number, y: number) => {
      if (this.at(x, y) !== Tile.Walk || this.decals[y * W + x] >= 0) return;
      const d = MAP.districtAt(x, y), roll = rnd();
      if (d === 'tetsugawa' || (d === 'denpa' && roll > 0.35) || roll > 0.8) return;
      this.furniture.push({ x: (x + 0.5) * TS, y: (y + 0.5) * TS, key: 'prop_tree' + (d === 'asagiri' && roll < 0.25 ? 2 : roll < 0.5 ? 0 : 1), h: 0.05 });
      this.decals[y * W + x] = -2; // keep awnings off this tile
    };
    for (const v of V.slice(1, -1)) for (let y = Hh[0] + rw + 6; y < Hh[Hh.length - 1]; y += MAP.lampSpacing) { treeAt(v - 1, y + 1); treeAt(v + rw, y + 4); }
    for (const h of Hh.slice(1, -1)) for (let x = V[0] + rw + 6; x < V[V.length - 1]; x += MAP.lampSpacing) { treeAt(x + 1, h - 1); treeAt(x + 4, h + rw); }
    for (const v of V) for (let y = Hh[0] + rw + 3; y < Hh[Hh.length - 1]; y += MAP.lampSpacing) { lampAt(v - 1, y); lampAt(v + rw, y + 3); }
    for (const h of Hh) for (let x = V[0] + rw + 3; x < V[V.length - 1]; x += MAP.lampSpacing) { lampAt(x, h - 1); lampAt(x + 3, h + rw); }
    this.furniture.push({ x: this.places.asagiri.x, y: this.places.asagiri.y, key: 'prop_gate', h: 0 }); // Hozuki-mon
    // crates and traffic cones scattered round the industrial yards
    for (const l of this.lots) {
      if (l.district !== 'tetsugawa') continue;
      for (let n = 0; n < 5; n++) {
        const x = l.x + 14 + rnd() * (l.w - 28), y = rnd() < 0.5 ? l.y + 12 + rnd() * 10 : l.y + l.h - 22 + rnd() * 10;
        if (!this.isSolid(x, y)) this.furniture.push({ x, y, key: rnd() < 0.6 ? 'prop_crate' : 'prop_cone', h: 0 });
      }
    }
    // awnings / vending machines on sidewalk tiles that touch a building
    const side = [[0, -1], [0, 1], [-1, 0], [1, 0]]; // building is above, below, left, right of the tile
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      if (this.at(x, y) !== Tile.Walk || this.decals[y * W + x] !== -1) continue;
      const s = side.findIndex(([dx, dy]) => this.at(x + dx, y + dy) === Tile.Building);
      if (s < 0 || x < V[0] || x > V[V.length - 1] + rw) continue;
      const st = DISTRICTS[MAP.districtAt(x, y)], roll = rnd();
      // colour changes every few tiles so it reads as a row of different shops
      const shop = Math.floor((s < 2 ? x : y) / 3) + s * 7;
      if (roll < st.awningChance) { /* awnings are drawn on the building's wall, not on the pavement */ }
      else if (roll > 0.955) this.furniture.push({ x: (x + 0.5 - side[s][0] * 0.2) * TS, y: (y + 0.5 - side[s][1] * 0.2) * TS, key: roll > 0.98 && st !== DISTRICTS.tetsugawa ? 'prop_bench' : 'prop_bin', h: 0 });
      else if (roll < st.awningChance + 0.05) {
        const c = Math.floor(rnd() * 3);
        void shop;
        this.furniture.push({ x: (x + 0.5 + side[s][0] * 0.28) * TS, y: (y + 0.5 + side[s][1] * 0.28) * TS, key: 'prop_vending' + c, h: 0 });
        this.lights.push({ x: (x + 0.5 + side[s][0] * 0.3) * TS, y: (y + 0.5 + side[s][1] * 0.3) * TS, color: [0xe04a4a, 0x4a9ae0, 0xf2f2f2][c], scale: 0.6, alpha: 0.7 });
      }
    }
  }

  // ---------- questions the game asks ----------

  tileAt(px: number, py: number): number {
    const x = (px / TS) | 0, y = (py / TS) | 0;
    if (px < 0 || py < 0 || x >= W || y >= H) return Tile.Building;
    return this.tiles[y * W + x];
  }
  /** Blocks movement: buildings and water. */
  isSolid(px: number, py: number): boolean { const t = this.tileAt(px, py); return t === Tile.Building || t === Tile.Water; }
  /** Blocks bullets and sight: buildings only. */
  isWall(px: number, py: number): boolean { return this.tileAt(px, py) === Tile.Building; }
  districtAt(px: number, py: number): DistrictStyle { return DISTRICTS[MAP.districtAt(px / TS, py / TS)]; }

  /** True if no building is between the two points. */
  los(x0: number, y0: number, x1: number, y1: number): boolean {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 12);
    for (let i = 1; i < n; i++) { const k = i / n; if (this.isWall(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k)) return false; }
    return true;
  }

  /** Is this point inside a junction with traffic lights? Returns the junction or null. */
  litJunctionAt(px: number, py: number): Junction | null {
    const half = (MAP.roadWidth * TS) / 2;
    for (const j of this.junctions) if (j.lit && Math.abs(px - j.x) < half && Math.abs(py - j.y) < half) return j;
    return null;
  }

  /** Random sidewalk spot between `min` and `max` px from a point (for spawning people nearby). */
  randomWalkNear(x: number, y: number, min: number, max: number): { x: number; y: number } | null {
    for (let n = 0; n < 30; n++) {
      const a = Math.random() * Math.PI * 2, d = min + Math.random() * (max - min);
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      if (this.tileAt(px, py) === Tile.Walk) return { x: (((px / TS) | 0) + 0.5) * TS, y: (((py / TS) | 0) + 0.5) * TS };
    }
    return null;
  }

  /**
   * "Flow field": for every tile, how many steps it is from the target.
   * Police and gangs follow the numbers downhill to find their way around buildings.
   */
  flow(tx: number, ty: number, forCars: boolean, out: Int16Array): void {
    out.fill(-1);
    const tiles = this.tiles, cp = this.carPass;
    const pass = (i: number) => (forCars ? cp[i] === 1 : tiles[i] !== Tile.Building && tiles[i] !== Tile.Water);
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
      const c = q[head++], d = out[c] + 1;
      if (d > 90) continue; // nobody needs directions from further away than this
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
    if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) return null;
    let cur = field[y * W + x];
    if (cur < 0) {
      let best = 1e9, bx = -1, by = -1;
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
        const v = field[(y + j) * W + x + i];
        if (v >= 0 && v < best) { best = v; bx = x + i; by = y + j; }
      }
      return bx < 0 ? null : { x: (bx + 0.5) * TS, y: (by + 0.5) * TS };
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

  // ---------- drawing ----------

  /** Paints the sheet of ground tiles (placeholder art, drawn in code). */
  private paintSheet(scene: Phaser.Scene): void {
    const C = MAP.colors, P = TS + 2;
    const tex = scene.textures.createCanvas('tiles', SHEET_COLS * P, SHEET_ROWS * P)!;
    const sheet = tex.getContext();
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = TS;
    const g = tmp.getContext('2d')!;
    const rnd = seeded(5);
    const put = (index: number, draw: () => void) => {
      g.clearRect(0, 0, TS, TS); draw();
      const x = (index % SHEET_COLS) * P + 1, y = Math.floor(index / SHEET_COLS) * P + 1;
      // copy with a 1 px border of repeated edge pixels, so tiles don't show seams when zoomed
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [0, 0]]) sheet.drawImage(tmp, x + dx, y + dy);
    };
    // Blender-rendered ground textures are grey; they are laid over the tile's colour
    const img = (k: string) => (scene.textures.exists(k) ? (scene.textures.get(k).getSourceImage() as CanvasImageSource) : null);
    const relief = (key: string, lift = 0.1): boolean => {
      const im = img(key);
      if (!im) return false;
      g.globalCompositeOperation = 'overlay'; g.drawImage(im, 0, 0, TS, TS);
      g.globalCompositeOperation = 'screen'; g.globalAlpha = lift; g.drawImage(im, 0, 0, TS, TS);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      return true;
    };
    /** Draws a rendered decal turned to face one side: 0 = as rendered, then quarter turns. */
    const turned = (im: CanvasImageSource, quarter: number) => { g.save(); g.translate(16, 16); g.rotate((quarter * Math.PI) / 2); g.drawImage(im, -16, -16, TS, TS); g.restore(); };
    let variant = 0;
    const asphalt = (base: string) => {
      g.fillStyle = base; g.fillRect(0, 0, TS, TS);
      if (relief('ground_asphalt' + (variant % 3))) return;
      for (let k = 0; k < 7; k++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.11)'; g.fillRect(rnd() * 30, rnd() * 30, 2, 2); }
    };
    const dash = (i: number, color: string) => { g.fillStyle = color; if (i === 0) g.fillRect(31, 8, 1, 16); if (i === 1) g.fillRect(0, 8, 1, 16); if (i === 2) g.fillRect(8, 31, 16, 1); if (i === 3) g.fillRect(8, 0, 16, 1); };
    put(T.wall, () => { g.fillStyle = C.wall; g.fillRect(0, 0, TS, TS); });
    for (let i = 0; i < 3; i++) put(T.road + i, () => { variant = i; asphalt(C.road); variant = i === 2 ? 0 : i; });
    for (let i = 0; i < 4; i++) put(T.roadDash + i, () => { asphalt(C.road); dash(i, C.laneLine); });
    put(T.kroad, () => asphalt(C.kroad));
    for (let i = 0; i < 4; i++) put(T.kDash + i, () => { asphalt(C.kroad); dash(i, C.kLine); });
    put(T.crossV, () => { asphalt(C.road); g.fillStyle = C.crossing; for (let k = 2; k < TS; k += 8) g.fillRect(k, 4, 4, TS - 8); });
    put(T.crossH, () => { asphalt(C.road); g.fillStyle = C.crossing; for (let k = 2; k < TS; k += 8) g.fillRect(4, k, TS - 8, 4); });
    put(T.lot, () => asphalt(C.lot));
    put(T.bay, () => { asphalt(C.lot); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(0, 0, 2, TS); });
    put(T.alley, () => { asphalt(C.alley); if (rnd() < 2) { g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(0, 14, TS, 2); } });
    for (let i = 0; i < 2; i++) put(T.water + i, () => { g.fillStyle = C.water; g.fillRect(0, 0, TS, TS); if (relief('ground_water' + i, 0.22)) return; g.fillStyle = C.waterLight; for (let k = 0; k < 3; k++) g.fillRect((k * 11 + i * 7) % 26, 5 + k * 10 + i * 3, 7, 1); });
    put(T.planks, () => { g.fillStyle = C.planks; g.fillRect(0, 0, TS, TS); if (relief('ground_planks', 0.05)) return; g.fillStyle = 'rgba(0,0,0,0.22)'; for (let k = 0; k < TS; k += 8) g.fillRect(0, k, TS, 1); });
    put(T.rail, () => { asphalt('#4a4540'); g.fillStyle = '#3a2f28'; for (let k = 2; k < TS; k += 8) g.fillRect(3, k, TS - 6, 3); g.fillStyle = '#9a9a9a'; g.fillRect(8, 0, 2, TS); g.fillRect(22, 0, 2, TS); });
    put(T.arcade, () => { g.fillStyle = '#b9a58a'; g.fillRect(0, 0, TS, TS); g.fillStyle = '#a3906f'; g.fillRect(0, 0, TS, 1); g.fillRect(0, 16, TS, 1); g.fillRect(0, 0, 1, TS); g.fillRect(16, 0, 1, TS); g.fillStyle = '#c9b89e'; g.fillRect(4, 4, 8, 8); g.fillRect(20, 20, 8, 8); });
    put(T.bridge, () => { asphalt(C.bridge); g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(0, 0, TS, 1); });
    DIST_IDS.forEach((id, d) => {
      const st = DISTRICTS[id];
      for (let m = 0; m < 16; m++) put(T.walk + d * 16 + m, () => {
        g.fillStyle = st.walk; g.fillRect(0, 0, TS, TS);
        const kerb = img('ground_kerb');
        if (relief('ground_paver', 0.06) && kerb) { // rendered paving, with a raised kerb stone on each side that meets the road
          if (m & 1) turned(kerb, 0); if (m & 2) turned(kerb, 2); if (m & 4) turned(kerb, 1); if (m & 8) turned(kerb, 3);
          return;
        }
        g.fillStyle = st.walkLine; g.fillRect(0, 0, TS, 1); g.fillRect(0, 16, TS, 1); g.fillRect(8, 0, 1, 16); g.fillRect(24, 16, 1, 16);
        g.fillStyle = st.kerb; // a pale kerb on the sides that meet the road: bits = left, right, up, down
        if (m & 1) g.fillRect(0, 0, 3, TS); if (m & 2) g.fillRect(TS - 3, 0, 3, TS); if (m & 4) g.fillRect(0, 0, TS, 3); if (m & 8) g.fillRect(0, TS - 3, TS, 3);
      });
    });
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  /** Builds the ground as a tile layer (only the tiles on screen are drawn), plus a layer of decals. */
  makeGround(scene: Phaser.Scene): void {
    this.paintSheet(scene);
    const V = MAP.vRoads, Hh = MAP.hRoads, rw = MAP.roadWidth, P = MAP.port;
    const kV = new Set([V[0], V[P.v0 - 1], V[P.v0], V[V.length - 1]]), kH = new Set([Hh[0], Hh[P.h0 - 1]]); // the K-Route: the loop round each bank
    const inV = (x: number) => V.find((v) => x >= v && x < v + rw), inH = (y: number) => Hh.find((h) => y >= h && y < h + rw);
    const isRoad = (t: number) => t === Tile.Road || t === Tile.Crossing;
    const lotAt = new Uint8Array(W * H);
    for (const l of this.lots) for (let y = l.y / TS; y < (l.y + l.h) / TS; y++) for (let x = l.x / TS; x < (l.x + l.w) / TS; x++) lotAt[y * W + x] = 1;
    const ground: number[][] = [];
    for (let y = 0; y < H; y++) {
      const row: number[] = [];
      for (let x = 0; x < W; x++) {
        const t = this.at(x, y);
        let i = T.wall;
        if (t === Tile.Water) i = T.water + ((x * 7 + y * 3) % 2);
        else if (this.floors[y * W + x] >= 0 && t !== Tile.Building) i = this.floors[y * W + x];
        else if (t === Tile.Lot) i = lotAt[y * W + x] ? (x % 3 === 1 && y % 6 > 0 && y % 6 < 5 ? T.bay : T.lot) : T.alley;
        else if (t === Tile.Crossing) i = this.at(x - 1, y) === Tile.Crossing || this.at(x + 1, y) === Tile.Crossing ? T.crossV : T.crossH;
        else if (t === Tile.Walk) {
          if ([[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => this.at(x + dx, y + dy) === Tile.Water)) i = T.planks; // walkways and piers by the water
          else i = T.walk + DIST_IDS.indexOf(MAP.districtAt(x, y)) * 16 + (isRoad(this.at(x - 1, y)) ? 1 : 0) + (isRoad(this.at(x + 1, y)) ? 2 : 0) + (isRoad(this.at(x, y - 1)) ? 4 : 0) + (isRoad(this.at(x, y + 1)) ? 8 : 0);
        } else if (t === Tile.Road) {
          const v = inV(x), h = inH(y);
          const ring = (v !== undefined && kV.has(v) && y < MAP.bay.y) || (h !== undefined && kH.has(h)); // the K-Route
          if (this.bridgeAt[y * W + x]) i = T.bridge;
          else {
            let d = -1; // which edge the centre-line dash sits on
            if (v !== undefined && h === undefined && this.at(x, y - 1) !== Tile.Crossing && this.at(x, y + 1) !== Tile.Crossing) d = x === v + 1 ? 0 : x === v + 2 ? 1 : -1;
            if (h !== undefined && v === undefined && this.at(x - 1, y) !== Tile.Crossing && this.at(x + 1, y) !== Tile.Crossing) d = y === h + 1 ? 2 : y === h + 2 ? 3 : -1;
            i = ring ? (d >= 0 ? T.kDash + d : T.kroad) : d >= 0 ? T.roadDash + d : T.road + ((x * 13 + y * 7) % 23 === 0 ? 2 : (x + y) % 2);
          }
        }
        row.push(i);
      }
      ground.push(row);
    }
    for (let i = 0; i < this.decals.length; i++) if (this.decals[i] < -1) this.decals[i] = -1;
    const map = scene.make.tilemap({ data: ground, tileWidth: TS, tileHeight: TS });
    const set = map.addTilesetImage('tiles', 'tiles', TS, TS, 1, 2)!;
    this.groundLayer = map.createLayer(0, set, 0, 0) as Phaser.Tilemaps.TilemapLayer;
    this.groundLayer.setDepth(0);
    const dec = map.createBlankLayer('decals', set, 0, 0)!.setDepth(1);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (this.decals[y * W + x] >= 0) dec.putTileAt(this.decals[y * W + x], x, y);
  }

  /**
   * One rooftop picture per building, built from Blender-rendered materials and props.
   * The world slides and grows each roof away from the middle of the screen and draws
   * walls down to the footprint, so buildings have real height (2.5D).
   */
  makeRoofs(scene: Phaser.Scene): Roof[] {
    const out: Roof[] = [];
    const rnd = seeded(21);
    const special = new Map<Rect, string>();
    for (const [id, spec] of Object.entries(MAP.places)) if (spec.color && this.places[id].rect) special.set(this.places[id].rect!, spec.color);
    const has = (k: string) => scene.textures.exists(k);
    const src = (k: string) => scene.textures.get(k).getSourceImage() as CanvasImageSource;
    // roof materials rendered in Blender, shrunk to game size so they can be tiled
    const mats: Record<string, CanvasPattern | null> = {};
    for (const k of ['tile', 'flat', 'plank', 'metal']) {
      if (!has('roof_' + k)) { mats[k] = null; continue; }
      const c = document.createElement('canvas'); c.width = c.height = 32;
      c.getContext('2d')!.drawImage(src('roof_' + k), 0, 0, 32, 32);
      mats[k] = c.getContext('2d')!.createPattern(c, 'repeat');
    }
    const props = ['ac', 'ac', 'tank', 'vent', 'skylight', 'dish', 'solar'].filter((k) => has('prop_' + k));
    this.buildings.forEach((r, i) => {
      const key = 'roof' + i, w = r.w, h = r.h;
      const D = DISTRICTS[r.district];
      const st = D.roofs[Math.floor(rnd() * D.roofs.length)];
      const kinds: Record<string, string[]> = { container: ['#2f7f86', '#b5562e', '#d8b02a', '#3a5f9a'], boxcar: ['#6b3a2a', '#4a4f55'], fence: ['#5a5e63'], shelf: ['#8a7a5a'] };
      const plain = r.roof ? kinds[r.roof][i % kinds[r.roof].length] : special.get(r);
      // a glowing billboard on some roofs (decided now so its light exists; drawn when the roof is painted)
      const neon = !plain && D.neon.length && rnd() < 0.6 && w > 60 && h > 60 ? { c: D.neon[Math.floor(rnd() * D.neon.length)], bx: 12 + rnd() * (w - 60), by: 12 + rnd() * (h - 44) } : null;
      if (neon) this.lights.push({ x: r.x + neon.bx + 18, y: r.y + neon.by + 8, color: neon.c, scale: 1.1, alpha: 0.6 });
      const hgt = r.roof ? MAP.roofHeight * (r.height ?? 1) : D.height[0] + rnd() * (D.height[1] - D.height[0]);
      // The picture itself is only painted when the building first comes into view, and thrown
      // away again when it is far behind, so memory does not grow with the size of the city.
      const paint = () => {
        const pr = seeded(i * 7919 + 13);
        const tex = scene.textures.createCanvas(key, w, h)!;
        const g = tex.getContext();
        g.fillStyle = plain ?? st.base; g.fillRect(0, 0, w, h);
        const mat = r.roof ? (r.roof === 'fence' ? null : mats.metal) : special.has(r) ? mats.flat : mats[st.kind];
        if (mat) { // lay the rendered material over the base colour (overlay keeps the colour, adds the relief)
          g.globalCompositeOperation = 'overlay'; g.fillStyle = mat; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over';
        }
        if (!r.roof && st.kind === 'tile') { g.fillStyle = st.trim; w > h ? g.fillRect(8, h / 2 - 4, w - 16, 7) : g.fillRect(w / 2 - 4, 8, 7, h - 16); } // ridge beam
        if (r.roof === 'shelf') { g.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = 6; x < w; x += 16) g.fillRect(x, 6, 10, h - 12); }
        if (!plain && props.length && st.kind !== 'tile') { // rooftop clutter: rendered AC units, tanks, vents...
          for (let n = 0; n < Math.round((w * h) / 9000); n++) {
            const im = src('prop_' + props[Math.floor(pr() * props.length)]) as HTMLCanvasElement, pw = im.width / 2, ph = im.height / 2;
            g.drawImage(im, 8 + pr() * (w - pw - 16), 8 + pr() * (h - ph - 16), pw, ph);
          }
        }
        if (neon) {
          g.fillStyle = '#111'; g.fillRect(neon.bx - 2, neon.by - 2, 40, 20); g.fillStyle = css(neon.c); g.fillRect(neon.bx, neon.by, 36, 16);
          g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(neon.bx + 4, neon.by + 4, 18, 2); g.fillRect(neon.bx + 4, neon.by + 10, 26, 2);
        }
        g.fillStyle = st.trim; g.fillRect(0, 0, w, 4); g.fillRect(0, 0, 4, h); // parapet: light top/left, dark bottom/right
        g.fillStyle = 'rgba(0,0,0,0.38)'; g.fillRect(0, h - 4, w, 4); g.fillRect(w - 4, 0, 4, h);
        tex.refresh();
      };
      out.push({ img: scene.add.image(r.x + r.w / 2, r.y + r.h / 2, 'dot').setDepth(20).setVisible(false), x: r.x + r.w / 2, y: r.y + r.h / 2, h: hgt, rect: r, wall: D.walls[i % D.walls.length],
        smoke: !r.roof && r.district === 'tetsugawa' && i % 3 === 0, beacon: !r.roof && hgt > 0.14,
        awn: plain ? undefined : D.awnings.map((c) => parseInt(c.slice(1), 16)), key, paint });
    });
    // street furniture rendered in Blender; trees stand up a little, the rest sits on the ground
    for (const f of this.furniture) {
      if (!SHEET[f.key]) continue;
      // standing things are drawn in the same depth order as people and cars: lower on screen = in front
      const roof: Roof = { img: scene.add.image(f.x, f.y, SHEET[f.key], f.key).setScale(0.5).setDepth(4 + f.y * 1e-5), x: f.x, y: f.y, h: 0, sway: f.key.startsWith('prop_tree') };
      out.push(roof);
      f.roof = roof;
      f.solid = /tree|lamp|vending/.test(f.key) ? 'post' : /bench|bin|cone|crate/.test(f.key) ? 'loose' : undefined;
    }
    const gate = this.places.asagiri; // the temple gate itself is a standing sprite (see decorate)
    this.lights.push({ x: gate.x, y: gate.y, color: 0xff5040, scale: 1.4, alpha: 0.8 });
    // the shōtengai's canopy: a see-through striped roof over the shopping street
    for (const b of this.blocks) for (const it of MAP.layouts[b.id] ?? []) {
      if (it.floor !== 'arcade') continue;
      const cw = it.r[2] * TS, ch = it.r[3] * TS, key = 'canopy' + b.id;
      const ct = scene.textures.createCanvas(key, cw / 2, ch / 2)!, cg = ct.getContext();
      for (let y = 0; y < ch / 2; y += 8) { cg.fillStyle = (y / 8) % 2 ? 'rgba(216,52,58,0.30)' : 'rgba(240,232,208,0.30)'; cg.fillRect(0, y, cw / 2, 8); }
      cg.fillStyle = 'rgba(60,40,30,0.7)'; cg.fillRect(0, 0, 2, ch / 2); cg.fillRect(cw / 2 - 2, 0, 2, ch / 2);
      for (let y = 0; y < ch / 2; y += 32) cg.fillRect(0, y, cw / 2, 1);
      ct.refresh(); ct.setFilter(Phaser.Textures.FilterMode.NEAREST);
      const x = b.x + it.r[0] * TS + cw / 2, y = b.y + it.r[1] * TS + ch / 2;
      out.push({ img: scene.add.image(x, y, key).setScale(2).setDepth(20), x, y, h: MAP.roofHeight * 0.6 });
      for (let ly = b.y + 80; ly < b.y + ch; ly += 128) this.lights.push({ x, y: ly, color: 0xffc070, scale: 1.2, alpha: 0.5 }); // lanterns under the canopy
    }
    // a river-cruise boat moored at the pier
    const bt = scene.textures.createCanvas('boat', 46, 22)!, bg = bt.getContext();
    bg.fillStyle = '#e8e2d0'; bg.beginPath(); bg.moveTo(0, 11); bg.lineTo(8, 1); bg.lineTo(40, 1); bg.lineTo(46, 11); bg.lineTo(40, 21); bg.lineTo(8, 21); bg.fill();
    bg.fillStyle = '#b3312f'; bg.fillRect(10, 5, 26, 12); bg.fillStyle = '#16212e'; for (let x = 12; x < 34; x += 6) bg.fillRect(x, 7, 4, 8);
    bt.refresh(); bt.setFilter(Phaser.Textures.FilterMode.NEAREST);
    const bx = (MAP.pier[0] - 1.2) * TS, by = (MAP.pier[1] + MAP.pier[3] + 1.4) * TS;
    out.push({ img: scene.add.image(bx, by, 'boat').setScale(2).setDepth(2), x: bx, y: by, h: 0 });
    return out;
  }
}
