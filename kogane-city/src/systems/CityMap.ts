import * as Phaser from 'phaser';
import { TILE_SIZE as TS, MAP_TILES_W as W, MAP_TILES_H as H } from '../data/config';
import { MAP, DISTRICTS, DistrictStyle, GRAIN } from '../data/map';
import { SHEET } from './sprites';
import { INTERIORS, DOORS, INTERIOR, InteriorDef } from '../data/interiors';

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
export interface Plot extends Rect { district: string; block: string; roof?: string; height?: number; /** top and side colours (interior walls and furniture) */ tint?: string[]; /** in the block's original corner (story places look here first) */ home?: boolean }
export interface Block extends Rect { id: string; district: string }
export interface Place { x: number; y: number; sx: number; sy: number; label: string; rect: Rect | null }
export interface Light { x: number; y: number; color: number; scale: number; alpha: number }
/** A piece of street furniture. Posts (trees, lamps, vending machines) stop cars; loose things get knocked flying. */
export interface Furniture { x: number; y: number; key: string; h: number; solid?: 'post' | 'loose'; roof?: Roof; gone?: boolean }
/** Something drawn above the street: a rooftop (with its building's footprint, for walls), a sign, the gate... */
export interface Roof { img: Phaser.GameObjects.Image | Phaser.GameObjects.Text; x: number; y: number; h: number; rect?: Rect; wall?: number; sway?: boolean; smoke?: boolean; beacon?: boolean; awn?: number[]; dead?: boolean;
  /** Rooftops only: the picture's name, how to paint it, and whether it is painted right now. */
  /** no windows on its walls (fences, containers, interior walls) */ noWin?: boolean;
  key?: string; paint?: () => void; made?: boolean; /** near the screen this frame */ seen?: boolean }
export interface Junction { id: number; x: number; y: number; lit: boolean; offset: number; /** half its width and height, px */ hw: number; hh: number }
/** A room you can walk into: where it is kept (px), and its named spots. */
export interface Interior { id: string; def: InteriorDef; x: number; y: number; w: number; h: number; spots: Record<string, { x: number; y: number }> }
/** A way between two places: a street door, the way out of a room, or stairs. `to` is null for a way out (it leads back to the door you came in by). */
export interface Door { x: number; y: number; to: { x: number; y: number } | null; kind: 'in' | 'out' | 'stairs'; interior: string; label: string }
/** One road of the grid: first tile, width in tiles, and which avenue it is (-1 = a side street). */
interface RoadLine { t: number; w: number; main: number }

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
const T = { wood: 160, tatami: 161, lino: 162, carpet: 163, concrete: 164, marble: 165, mat: 166, stairs: 167, grass: 24, path: 25, rail: 22, arcade: 23, wall: 0, road: 1, roadDash: 4, kroad: 8, kDash: 9, crossV: 13, crossH: 14, lot: 15, bay: 16, alley: 17, water: 18, planks: 20, bridge: 21, walk: 32 };
const SHEET_COLS = 16, SHEET_ROWS = 11; // sidewalk tiles: 16 kerb variants for each of 8 districts, from tile 32

/**
 * The city: which tiles are road / sidewalk / building / water, the lanes traffic follows,
 * the story's named places, and helper questions like "is this a wall?" and "can A see B?".
 */
export class CityMap {
  readonly tiles = new Uint8Array(W * H);
  readonly buildings: Plot[] = []; // in pixels
  readonly lots: Plot[] = [];
  /** Parks and the castle garden, in pixels. */
  readonly parks: Plot[] = [];
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
  readonly interiors: Interior[] = [];
  /** The railway loop: its four corners (px, clockwise from the north-west), its length, and its stations. */
  readonly railCorners: { x: number; y: number }[] = [];
  railLength = 0;
  readonly stations: { x: number; y: number; at: number; name: string; horizontal: boolean }[] = [];
  readonly doors: Door[] = [];
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
    this.buildRail();
    this.buildInteriors();
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

  /** Every north-south and east-west road, avenues and side streets together, in order. */
  private rv: RoadLine[] = [];
  private rh: RoadLine[] = [];

  private build(): void {
    const rw = MAP.roadWidth, sw = MAP.sideWidth;
    const lines = (main: readonly number[], side: readonly number[]): RoadLine[] =>
      [...main.map((t, i) => ({ t, w: rw, main: i })), ...side.map((t) => ({ t, w: sw, main: -1 }))].sort((a, b) => a.t - b.t);
    const RV = (this.rv = lines(MAP.vRoads, MAP.vSide)), RH = (this.rh = lines(MAP.hRoads, MAP.hSide));
    const nv = RV.length, nh = RH.length;
    // which gap between avenues each road sits in (an avenue starts its own gap)
    const gapOf = (L: RoadLine[]) => { let g = -1; return L.map((r) => (r.main >= 0 ? (g = r.main) : g)); };
    const gv = gapOf(RV), gh = gapOf(RH);
    // a side street's number within its gap (0 = the first after the avenue)
    const nth = (L: RoadLine[]) => { let k = -1; return L.map((r) => (r.main >= 0 ? (k = -1) : ++k)); };
    const kv = nth(RV), kh = nth(RH);
    const blockName = (Gi: number, Gj: number) => { const east = Gi - MAP.port.v0; return Gj >= MAP.port.h0 ? `p${east}` : east >= 0 ? `${east}-${Gj}` : `w${Gi}-${Gj}`; };
    /**
     * What a side street does inside one big block: a real street, a lane for people on foot, or
     * nothing (the small blocks either side join up). Decided per district, the same every time.
     */
    const span = (axis: 'v' | 'h', Gi: number, Gj: number, k: number): 'road' | 'lane' | 'none' => {
      if ((axis === 'v' ? MAP.rail.v : MAP.rail.h).some(([g, n]) => g === (axis === 'v' ? Gi : Gj) && n === k)) return 'road'; // a street under the railway
      if (blockName(Gi, Gj) === MAP.castle.block) return k === 0 ? 'road' : 'none';
      const d = GRAIN[MAP.districtAt((MAP.vRoads[Gi] + MAP.vRoads[Gi + 1]) / 2, (MAP.hRoads[Gj] + MAP.hRoads[Gj + 1]) / 2)];
      const r = seeded((axis === 'v' ? 7919 : 104729) + Gi * 131 + Gj * 977 + k * 31337);
      r(); // (the first number of a seed is weak)
      return r() < d.streets ? 'road' : r() < d.lanes ? 'lane' : 'none';
    };
    const V = MAP.vRoads, Hh = MAP.hRoads;
    const R = MAP.river, P = MAP.port, bayY = MAP.bay.y;
    const riverGap = V.findIndex((v, i) => i < V.length - 1 && R.x > v && R.x < V[i + 1]);
    this.tiles.fill(Tile.Building); // outer wall
    const CH = MAP.cityH;
    this.fill(V[0] - 2, 2, W - V[0], CH - 4, Tile.Walk); // (the strip west of the first road stays solid)
    // water: the river, then the whole bay...
    this.fill(R.x, 2, R.w, CH - 4, Tile.Water);
    this.fill(2, bayY, W - 4, CH - 2 - bayY, Tile.Water);
    // ...except the port island
    const ix0 = V[P.v0] - 2, ix1 = V[P.v1] + rw + 2, iy0 = Hh[P.h0] - 2, iy1 = Hh[P.h1] + rw + 2;
    this.fill(ix0, iy0, ix1 - ix0, iy1 - iy0, Tile.Walk);
    this.fill(MAP.pier[0], MAP.pier[1], MAP.pier[2], MAP.pier[3], Tile.Walk); // the river-cruise pier

    // which road pieces exist. City rows: every avenue (east-west ones cross the river as bridges) and
    // every side street (they stop at the river). The bay is crossed only by the Bay Bridge; the port
    // island has its own small grid of avenues.
    for (let i = 0; i < nv; i++) this.segV.push(Array.from({ length: nh - 1 }, (_, j) => {
      const g = gh[j], m = RV[i].main;
      if (m < 0) return g < P.h0 - 1 && span('v', gv[i], g, kv[i]) === 'road';
      return g < P.h0 - 1 ? true : g === P.h0 - 1 ? m === P.bridge : m >= P.v0 && m <= P.v1;
    }));
    for (let j = 0; j < nh; j++) this.segH.push(Array.from({ length: nv - 1 }, (_, i) => {
      const g = gv[i], m = RH[j].main;
      if (m < 0) return g !== riverGap && span('h', g, gh[j], kh[j]) === 'road';
      return m < P.h0 ? true : g >= P.v0 && g < P.v1;
    }));
    const markBridge = (x: number, y: number, w: number, h: number) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.bridgeAt[yy * W + xx] = 1; };
    for (let i = 0; i < nv; i++) for (let j = 0; j < nh - 1; j++) {
      if (!this.segV[i][j]) continue;
      const v = RV[i], y = RH[j].t, h = RH[j + 1].t + RH[j + 1].w - y;
      if (gh[j] === P.h0 - 1) { // the Bay Bridge: a deck over the water with a footway each side
        this.fill(v.t - 1, bayY, 1, iy0 - bayY, Tile.Walk); this.fill(v.t + v.w, bayY, 1, iy0 - bayY, Tile.Walk);
        markBridge(v.t, bayY, v.w, iy0 - bayY);
      }
      this.fill(v.t, y, v.w, h, Tile.Road); this.roads.push({ x: v.t * TS, y: y * TS, w: v.w * TS, h: h * TS });
    }
    for (let j = 0; j < nh; j++) for (let i = 0; i < nv - 1; i++) {
      if (!this.segH[j][i]) continue;
      const hr = RH[j], x = RV[i].t, w = RV[i + 1].t + RV[i + 1].w - x;
      if (R.x > RV[i].t && R.x < RV[i + 1].t) { // a river bridge
        this.fill(R.x, hr.t - 1, R.w, 1, Tile.Walk); this.fill(R.x, hr.t + hr.w, R.w, 1, Tile.Walk);
        markBridge(R.x, hr.t, R.w, hr.w);
      }
      this.fill(x, hr.t, w, hr.w, Tile.Road); this.roads.push({ x: x * TS, y: hr.t * TS, w: w * TS, h: hr.w * TS });
    }

    // junctions; where two avenues cross there are traffic lights and zebra crossings
    for (let i = 0; i < nv; i++) for (let j = 0; j < nh; j++) {
      const arms = (j > 0 && this.segV[i][j - 1] ? 1 : 0) + (j < nh - 1 && this.segV[i][j] ? 1 : 0) + (i > 0 && this.segH[j][i - 1] ? 1 : 0) + (i < nv - 1 && this.segH[j][i] ? 1 : 0);
      if (!arms) continue;
      const lit = arms === 4 && RV[i].main >= 0 && RH[j].main >= 0, v = RV[i].t, h = RH[j].t, vw = RV[i].w, hw = RH[j].w;
      this.junctions.push({ id: i + j * nv, x: (v + vw / 2) * TS, y: (h + hw / 2) * TS, lit, offset: ((i * 5 + j * 3) % 7) * 2.3, hw: (vw * TS) / 2, hh: (hw * TS) / 2 });
      if (!lit) continue;
      this.fill(v, h - 1, vw, 1, Tile.Crossing); this.fill(v, h + hw, vw, 1, Tile.Crossing);
      this.fill(v - 1, h, 1, hw, Tile.Crossing); this.fill(v + vw, h, 1, hw, Tile.Crossing);
    }

    // City blocks. The avenues cut the city into big blocks: west side "wC-R", east bank "C-R", port
    // island "pN" (these are the turf zones, and what story places name). Side streets and lanes cut
    // each big block into small ones; the one in the north-west corner is the "home" corner.
    const rnd = seeded(1207);
    const c = MAP.canal;
    for (let Gj = 0; Gj < Hh.length - 1; Gj++) for (let Gi = 0; Gi < V.length - 1; Gi++) {
      const port = Gj >= P.h0;
      if (Gi === riverGap || Gj === P.h0 - 1 || (port && !(Gi >= P.v0 && Gi < P.v1))) continue; // water, not a block
      const base = blockName(Gi, Gj);
      const cuts = (L: RoadLine[], g: number[], G: number, axis: 'v' | 'h', ks: number[]) =>
        L.filter((r, i) => (r.main === G || r.main === G + 1) || (!port && r.main < 0 && g[i] === G && span(axis, Gi, Gj, ks[i]) !== 'none'));
      const xs = cuts(RV, gv, Gi, 'v', kv), ys = cuts(RH, gh, Gj, 'h', kh);
      const canal = !port && Gi - P.v0 === 3 && (c.rows as readonly number[]).includes(Gj);
      for (let b = 0; b < ys.length - 1; b++) for (let a = 0; a < xs.length - 1; a++) {
        const x0 = xs[a].t + xs[a].w + 1, x1 = xs[a + 1].t - 1, y0 = ys[b].t + ys[b].w + 1, y1 = ys[b + 1].t - 1; // x1,y1 exclusive
        const home = a === 0 && b === 0;
        if (base === MAP.castle.block && a === xs.length - 2 && b === ys.length - 2) { this.buildCastle({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, base); continue; }
        if (canal && c.x > x0 && c.x < x1) {
          this.fill(c.x, y0 - 1, c.w, y1 - y0 + 2, Tile.Water);
          const la = home ? MAP.layouts[base + 'a'] : undefined, lh = la ? Math.min(y1 - y0, Math.max(...la.map((it) => it.r[1] + it.r[3]))) : y1 - y0;
          this.buildBlock(base + 'a', { x: x0, y: y0, w: c.x - 1 - x0, h: lh }, rnd, home, false);
          if (y1 - y0 - lh - 2 >= 4) this.buildBlock(base + 'a', { x: x0, y: y0 + lh + 2, w: c.x - 1 - x0, h: y1 - y0 - lh - 2 }, rnd, false, false);
          this.buildBlock(base + 'b', { x: c.x + c.w + 1, y: y0, w: x1 - (c.x + c.w + 1), h: y1 - y0 }, rnd, home, false);
        } else {
          const id = canal ? base + (x0 < c.x ? 'a' : 'b') : base, lay = home ? MAP.layouts[id] : undefined;
          if (lay) { // a hand-built block keeps its own size; ordinary buildings fill whatever is left over beside and below it
            const lw = Math.min(x1 - x0, Math.max(...lay.map((it) => it.r[0] + it.r[2]))), lh = Math.min(y1 - y0, Math.max(...lay.map((it) => it.r[1] + it.r[3])));
            this.buildBlock(id, { x: x0, y: y0, w: lw, h: lh }, rnd, true, false);
            if (x1 - x0 - lw - 2 >= 4) this.buildBlock(id, { x: x0 + lw + 2, y: y0, w: x1 - x0 - lw - 2, h: y1 - y0 }, rnd, false, false);
            if (y1 - y0 - lh - 2 >= 4) this.buildBlock(id, { x: x0, y: y0 + lh + 2, w: lw, h: y1 - y0 - lh - 2 }, rnd, false, false);
          } else this.buildBlock(id, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, rnd, home, !port && !canal);
        }
      }
      // the big block itself (a turf zone)
      const zx0 = V[Gi] + rw + 1, zx1 = V[Gi + 1] - 1, zy0 = Hh[Gj] + rw + 1, zy1 = Hh[Gj + 1] - 1;
      const zone = (id: string, xa: number, xb: number) => this.blocks.push({ id, district: MAP.districtAt((xa + xb) / 2, (zy0 + zy1) / 2), x: xa * TS, y: zy0 * TS, w: (xb - xa) * TS, h: (zy1 - zy0) * TS });
      if (canal) { zone(base + 'a', zx0, c.x - 1); zone(base + 'b', c.x + c.w + 1, zx1); } else zone(base, zx0, zx1);
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
  private buildBlock(id: string, r: Rect, rnd: () => number, home: boolean, mayBePark: boolean): void {
    const district = MAP.districtAt(r.x + r.w / 2, r.y + r.h / 2), st = DISTRICTS[district];
    this.fill(r.x, r.y, r.w, r.h, Tile.Lot);
    if (mayBePark && !home && r.w >= 10 && r.h >= 10 && rnd() < GRAIN[district].parks) { this.buildPark(r, district, id, rnd); return; }
    const layout = home ? MAP.layouts[id] : undefined;
    if (layout) { // a hand-designed landmark block
      for (const it of layout) {
        const [x, y, w, h] = [r.x + it.r[0], r.y + it.r[1], it.r[2], it.r[3]];
        const plot: Plot = { x: x * TS, y: y * TS, w: w * TS, h: h * TS, district, block: id, roof: it.roof, height: it.height, home: true };
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
    if (home && !isLot.some(Boolean)) { // every big block gets at least one car park in its home corner: the leaf nearest the middle
      let best = 0, bd = 1e9;
      leaves.forEach((l, i) => { const d = Math.abs(l.x + l.w / 2 - r.x - r.w / 2) + Math.abs(l.y + l.h / 2 - r.y - r.h / 2); if (d < bd) { bd = d; best = i; } });
      isLot[best] = true;
    }
    leaves.forEach((l, i) => {
      const px = { x: l.x * TS, y: l.y * TS, w: l.w * TS, h: l.h * TS, district, block: id, home };
      if (isLot[i]) this.lots.push(px);
      else { this.fill(l.x, l.y, l.w, l.h, Tile.Building); this.buildings.push(px); }
    });
  }

  private setFloor(x: number, y: number, w: number, h: number, t: number): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < W && j < H) this.floors[j * W + i] = t;
  }
  /** Trees to plant once the map is finished: [tile x, tile y] (see decorate). */
  private greenery: number[][] = [];

  /** A neighbourhood park: grass, two crossing paths, trees, and in the bigger ones a pond. */
  private buildPark(r: Rect, district: string, block: string, rnd: () => number): void {
    this.parks.push({ x: r.x * TS, y: r.y * TS, w: r.w * TS, h: r.h * TS, district, block });
    this.setFloor(r.x, r.y, r.w, r.h, T.grass);
    const mx = r.x + (r.w >> 1) - 1, my = r.y + (r.h >> 1) - 1;
    this.setFloor(mx, r.y, 2, r.h, T.path); this.setFloor(r.x, my, r.w, 2, T.path);
    if (r.w >= 14 && r.h >= 12 && rnd() < 0.7) { // a pond in one quarter
      const qx = rnd() < 0.5 ? r.x + 2 : mx + 4, qy = rnd() < 0.5 ? r.y + 2 : my + 4, pw = (r.w >> 1) - 5, ph = (r.h >> 1) - 5;
      for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) {
        const u = (i + 0.5) / pw * 2 - 1, v = (j + 0.5) / ph * 2 - 1;
        if (u * u + v * v < 1) this.tiles[(qy + j) * W + qx + i] = Tile.Water;
      }
    }
    for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) {
      if (this.tiles[j * W + i] !== Tile.Lot || this.floors[j * W + i] !== T.grass) continue;
      if (rnd() < 0.16) this.greenery.push([i, j]);
    }
  }

  /** Kogane Castle: a square moat with two causeways, lawns, and the keep in the middle. */
  private buildCastle(r: Rect, block: string): void {
    const district = MAP.districtAt(r.x + r.w / 2, r.y + r.h / 2), rnd = seeded(404);
    this.fill(r.x, r.y, r.w, r.h, Tile.Lot);
    this.parks.push({ x: r.x * TS, y: r.y * TS, w: r.w * TS, h: r.h * TS, district, block });
    this.setFloor(r.x, r.y, r.w, r.h, T.path); // a gravel walk round the outside of the moat
    const m = 2, mw = 3; // the moat: this far in from the edge, this wide
    const ox = r.x + m, oy = r.y + m, ow = r.w - 2 * m, oh = r.h - 2 * m;
    this.fill(ox, oy, ow, oh, Tile.Water);
    const ix = ox + mw, iy = oy + mw, iw = ow - 2 * mw, ih = oh - 2 * mw;
    this.fill(ix, iy, iw, ih, Tile.Lot); this.setFloor(ix, iy, iw, ih, T.grass);
    const cx = r.x + (r.w >> 1) - 1, cy = r.y + (r.h >> 1) - 1;
    // causeways on the south and west sides (towards the avenues), and gravel paths from them to the keep
    this.fill(cx, iy + ih, 2, mw, Tile.Lot); this.fill(ox, cy, mw, 2, Tile.Lot);
    this.setFloor(cx, cy, 2, iy + ih - cy, T.path); this.setFloor(ix, cy, cx - ix, 2, T.path);
    // the keep, on a gravel court
    const kw = Math.min(10, iw - 12), kh = Math.min(8, ih - 12), kx = cx + 1 - (kw >> 1), ky = cy - 3 - kh;
    this.setFloor(kx - 2, ky - 2, kw + 4, kh + 5, T.path);
    this.fill(kx, ky, kw, kh, Tile.Building);
    const keep: Plot = { x: kx * TS, y: ky * TS, w: kw * TS, h: kh * TS, district, block, roof: 'room', height: 6, tint: ['#4f7f6c', '#ece6d6'] }; // white walls, a green copper roof
    this.buildings.push(keep);
    this.laid.push({ id: 'castle', plot: keep, door: 's', label: 'KOGANE\nCASTLE' });
    for (let j = iy; j < iy + ih; j++) for (let i = ix; i < ix + iw; i++) {
      if (this.tiles[j * W + i] !== Tile.Lot || this.floors[j * W + i] !== T.grass) continue;
      if (rnd() < 0.2) this.greenery.push([i, j]);
    }
  }

  /** Builds the left-hand-traffic lane network from the road grid. */
  private buildLanes(): void {
    const RV = this.rv, RH = this.rh, nv = RV.length, E = MAP.eastRing;
    const add = (ax: number, ay: number, bx: number, by: number, fromJ: number, toJ: number, ring: boolean) => {
      const len = Math.hypot(bx - ax, by - ay);
      this.lanes.push({ ax, ay, bx, by, dx: (bx - ax) / len, dy: (by - ay) / len, len, axis: ax === bx ? 'v' : 'h', fromJ, toJ, next: [], ring });
    };
    const J = (i: number, j: number) => i + j * nv;
    const inEast = (t: number) => t >= E.west && t <= E.east, inCity = (t: number) => t >= E.north && t <= E.south;
    // each road has one lane each way, a quarter of its width in from either kerb (left-hand traffic)
    for (let i = 0; i < nv; i++) for (let j = 0; j < RH.length - 1; j++) {
      if (!this.segV[i][j]) continue;
      const v = RV[i], x = v.t * TS, q = (v.w * TS) / 4, top = (RH[j].t + RH[j].w) * TS, bottom = RH[j + 1].t * TS;
      const ring = (v.t === E.west || v.t === E.east) && inCity(RH[j].t) && inCity(RH[j + 1].t); // the east-bank K-Route loop
      add(x + q, bottom, x + q, top, J(i, j + 1), J(i, j), ring); // northbound, west side
      add(x + 3 * q, top, x + 3 * q, bottom, J(i, j), J(i, j + 1), ring); // southbound, east side
    }
    for (let j = 0; j < RH.length; j++) for (let i = 0; i < nv - 1; i++) {
      if (!this.segH[j][i]) continue;
      const h = RH[j], y = h.t * TS, q = (h.w * TS) / 4, left = (RV[i].t + RV[i].w) * TS, right = RV[i + 1].t * TS;
      const ring = (h.t === E.north || h.t === E.south) && inEast(RV[i].t) && inEast(RV[i + 1].t);
      add(left, y + q, right, y + q, J(i, j), J(i + 1, j), ring); // eastbound, north side
      add(right, y + 3 * q, left, y + 3 * q, J(i + 1, j), J(i, j), ring); // westbound, south side
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
      if (spec.tile) { // written on the old small plan: move it, and off any wall the new streets put there
        let x = MAP.tx(spec.tile[0]) * TS, y = MAP.ty(spec.tile[1]) * TS;
        for (let r = 1; r < 12 && this.isSolid(x, y); r++) for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          const nx = MAP.tx(spec.tile[0]) * TS + dx * r * TS, ny = MAP.ty(spec.tile[1]) * TS + dy * r * TS;
          if (!this.isSolid(nx, ny)) { x = nx; y = ny; break; }
        }
        this.places[id] = { x, y, sx: 0, sy: 0, label: '', rect: null }; continue;
      }
      // the block's home corner first (where the story was staged), biggest first
      const pool = (spec.kind === 'lot' ? this.lots : this.buildings).filter((p) => p.block === spec.block).sort((a, b) => (b.home ? 1 : 0) - (a.home ? 1 : 0) || b.w * b.h - a.w * a.h);
      const r = pool[Math.min(spec.pick ?? 0, pool.length - 1)];
      if (!r) throw new Error('No plot for place ' + id);
      if ((spec.pick ?? 0) >= pool.length) console.warn(`Place ${id}: block ${spec.block} has only ${pool.length} ${spec.kind}s, so it got the last one (which another place may use too).`);
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

  /** Works out where the railway loop runs (over the side streets named in MAP.rail). */
  private buildRail(): void {
    const sideOf = (L: RoadLine[], gap: number, n: number) => { let g = -1, k = -1; for (const r of L) { if (r.main >= 0) { g = r.main; k = -1; } else if (g === gap && ++k === n) return (r.t + r.w / 2) * TS; } return 0; };
    const R = MAP.rail, x0 = sideOf(this.rv, R.v[0][0], R.v[0][1]), x1 = sideOf(this.rv, R.v[1][0], R.v[1][1]), y0 = sideOf(this.rh, R.h[0][0], R.h[0][1]), y1 = sideOf(this.rh, R.h[1][0], R.h[1][1]);
    this.railCorners.push({ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 });
    const w = x1 - x0, h = y1 - y0;
    this.railLength = 2 * (w + h);
    for (const s of R.stations) {
      const side = s.side as string;
      const at = side === 'n' ? w * s.at : side === 'e' ? w + h * s.at : side === 's' ? w + h + w * (1 - s.at) : 2 * w + h + h * (1 - s.at);
      const q = this.railPoint(at);
      this.stations.push({ x: q.x, y: q.y, at, name: s.name, horizontal: q.horizontal });
    }
  }
  /** The point this far round the loop (px, clockwise from the north-west corner). */
  railPoint(d: number): { x: number; y: number; horizontal: boolean } {
    const c = this.railCorners, w = c[1].x - c[0].x, h = c[2].y - c[1].y;
    d = ((d % this.railLength) + this.railLength) % this.railLength;
    if (d < w) return { x: c[0].x + d, y: c[0].y, horizontal: true };
    if (d < w + h) return { x: c[1].x, y: c[1].y + d - w, horizontal: false };
    if (d < 2 * w + h) return { x: c[2].x - (d - w - h), y: c[2].y, horizontal: true };
    return { x: c[3].x, y: c[3].y - (d - 2 * w - h), horizontal: false };
  }

  /** Which interior the point is in, or null on the street. */
  interiorAt(px: number, py: number): Interior | null {
    if (py < MAP.interiorBand.y * TS) return null;
    for (const i of this.interiors) if (px >= i.x && px < i.x + i.w && py >= i.y && py < i.y + i.h) return i;
    return null;
  }

  /** Stamps every interior's text map into the band south of the city, and wires up the doors. */
  private buildInteriors(): void {
    // a konbini in every big block: the first ordinary building whose door opens onto a pavement
    const used = new Set<Rect>();
    for (const p of Object.values(this.places)) if (p.rect) used.add(p.rect);
    const konbini: string[] = [];
    for (const b of this.blocks) {
      const pick = this.buildings.find((r) => r.block === b.id && !r.roof && !used.has(r) && r.w >= 4 * TS && r.h >= 4 * TS && r.w <= 10 * TS && r.h <= 10 * TS
        && this.tileAt(r.x + r.w / 2, r.y + r.h + 20) === Tile.Walk);
      if (!pick) continue;
      const id = 'konbini:' + b.id;
      this.places[id] = { x: pick.x + pick.w / 2, y: pick.y + pick.h + 20, sx: pick.x + pick.w / 2, sy: pick.y + pick.h / 2, label: INTERIOR.konbiniLabel, rect: pick };
      konbini.push(id);
    }

    // a capsule inn in each district: in the district's last big block, a building with a street door
    const inns: string[] = [];
    for (const d of DIST_IDS) {
      if (INTERIOR.innSkip.includes(d)) continue;
      const zone = [...this.blocks].reverse().find((b) => b.district === d);
      const pick = zone && this.buildings.find((r) => r.block === zone.id && !r.roof && !used.has(r) && !konbini.some((k) => this.places[k].rect === r) && r.w >= 4 * TS && r.h >= 4 * TS && r.w <= 12 * TS && r.h <= 12 * TS
        && this.tileAt(r.x + r.w / 2, r.y + r.h + 20) === Tile.Walk);
      if (!pick) continue;
      this.places['inn:' + d] = { x: pick.x + pick.w / 2, y: pick.y + pick.h + 20, sx: pick.x + pick.w / 2, sy: pick.y + pick.h / 2, label: INTERIOR.innLabel, rect: pick };
      inns.push('inn:' + d);
    }

    const B = MAP.interiorBand;
    let cx = 6, cy = B.y, rowH = 0;
    for (const [id, def] of Object.entries(INTERIORS)) {
      const w = Math.max(...def.map.map((l) => l.length)), h = def.map.length;
      if (cx + w + 4 > W - 4) { cx = 6; cy += rowH + 6; rowH = 0; }
      if (cy + h > B.y + B.rows) { console.warn(`No room left for interior ${id}: make MAP.interiorBand taller.`); continue; }
      const spots: Record<string, number[]> = {}; // character -> [sum x, sum y, count]
      const floor = T[def.floor];
      const solid = (ch: string) => INTERIOR.heights[ch] !== undefined;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const ch = def.map[j][i] ?? ' ', x = cx + i, y = cy + j;
        if (ch === ' ' || solid(ch)) continue; // (the band is solid to begin with)
        this.tiles[y * W + x] = Tile.Lot; this.floors[y * W + x] = floor;
        if (ch === '.') continue;
        if (ch === 'V') { this.furniture.push({ x: (x + 0.5) * TS, y: (y + 0.5) * TS, key: 'prop_vending' + ((i + j) % 3), h: 0 }); continue; }
        if (ch === 'D') this.decals[y * W + x] = T.mat;
        if (ch === '<' || ch === '>') this.decals[y * W + x] = T.stairs;
        const s = spots[ch] ?? (spots[ch] = [0, 0, 0]);
        s[0] += (x + 0.5) * TS; s[1] += (y + 0.5) * TS; s[2]++;
      }
      // walls and furniture: runs of the same character along a row, stacked into rectangles
      const open: Record<string, { x: number; y: number; w: number; h: number; ch: string }> = {};
      const plots: { x: number; y: number; w: number; h: number; ch: string }[] = [];
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const ch = def.map[j][i] ?? ' ';
        if (!solid(ch)) continue;
        let n = 1; while (i + n < w && def.map[j][i + n] === ch) n++;
        const key = `${ch}:${i}:${n}`, above = open[key];
        if (above && above.y + above.h === j) above.h++;
        else { const r = { x: i, y: j, w: n, h: 1, ch }; open[key] = r; plots.push(r); }
        i += n - 1;
      }
      for (const r of plots) {
        const tint = r.ch === '#' && def.wall ? [def.wall, INTERIOR.colors['#'][1]] : INTERIOR.colors[r.ch];
        this.buildings.push({ x: (cx + r.x) * TS, y: (cy + r.y) * TS, w: r.w * TS, h: r.h * TS, district: 'asagiri', block: 'in:' + id, roof: 'room', height: INTERIOR.heights[r.ch], tint });
      }
      const inn: Interior = { id, def, x: cx * TS, y: cy * TS, w: w * TS, h: h * TS, spots: {} };
      for (const [ch, s] of Object.entries(spots)) {
        inn.spots[ch] = { x: s[0] / s[2], y: s[1] / s[2] };
        this.places[`${id}:${ch}`] = { x: s[0] / s[2], y: s[1] / s[2], sx: 0, sy: 0, label: '', rect: null };
      }
      this.interiors.push(inn);
      cx += w + 6; rowH = Math.max(rowH, h);
    }
    // doors: from the street in, the way out, and stairs
    const find = (id: string) => this.interiors.find((i) => i.id === id);
    const street = (place: string, to: string) => {
      const p = this.places[place], inn = find(to);
      if (!p || !inn || !inn.spots.D) return;
      this.doors.push({ x: p.x, y: p.y, to: inn.spots.D, kind: 'in', interior: to, label: inn.def.name });
    };
    for (const d of DOORS) street(d.place, d.to);
    for (const k of konbini) street(k, 'konbini');
    for (const k of inns) street(k, 'inn');
    for (const inn of this.interiors) {
      if (inn.spots.D) this.doors.push({ x: inn.spots.D.x, y: inn.spots.D.y, to: null, kind: 'out', interior: inn.id, label: '' });
      for (const [ch, target] of Object.entries(inn.def.stairs ?? {})) {
        const [tid, tch] = target.split(':'), t = find(tid);
        if (inn.spots[ch] && t?.spots[tch]) this.doors.push({ x: inn.spots[ch].x, y: inn.spots[ch].y, to: t.spots[tch], kind: 'stairs', interior: tid, label: t.def.name });
      }
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
    // park and castle trees (cherry trees in the old town and at the castle)
    for (const [x, y] of this.greenery) {
      const d = MAP.districtAt(x, y), roll = rnd();
      this.furniture.push({ x: (x + 0.5) * TS, y: (y + 0.5) * TS, key: 'prop_tree' + ((d === 'asagiri' || d === 'marukane') && roll < 0.45 ? 2 : roll < 0.7 ? 0 : 1), h: 0.05 });
    }
    // side streets: fewer lamps, one side only
    const sw = MAP.sideWidth, yEnd = Hh[MAP.port.h0 - 1];
    for (const v of MAP.vSide) for (let y = Hh[0] + rw + 5; y < yEnd; y += MAP.lampSpacing * 2) lampAt(v + sw, y);
    for (const h of MAP.hSide) for (let x = V[0] + rw + 5; x < V[V.length - 1]; x += MAP.lampSpacing * 2) lampAt(x, h - 1);
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
    for (const j of this.junctions) if (j.lit && Math.abs(px - j.x) < j.hw && Math.abs(py - j.y) < j.hh) return j;
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
    for (const [k, col] of Object.entries(INTERIOR.floors)) put(T[k as keyof typeof T], () => {
      g.fillStyle = col; g.fillRect(0, 0, TS, TS);
      g.fillStyle = 'rgba(0,0,0,0.16)';
      if (k === 'wood') { for (let y = 0; y < TS; y += 8) g.fillRect(0, y, TS, 1); g.fillRect(10, 0, 1, 8); g.fillRect(24, 8, 1, 8); g.fillRect(6, 16, 1, 8); g.fillRect(20, 24, 1, 8); }
      else if (k === 'tatami') { g.fillRect(0, 0, TS, 1); g.fillRect(0, 0, 1, TS); g.fillStyle = 'rgba(0,0,0,0.05)'; for (let y = 3; y < TS; y += 3) g.fillRect(1, y, TS - 1, 1); }
      else if (k === 'lino' || k === 'marble') { g.fillRect(0, 0, TS, 1); g.fillRect(0, 0, 1, TS); g.fillRect(16, 0, 1, TS); g.fillRect(0, 16, TS, 1); }
      else if (k === 'carpet') { for (let n = 0; n < 40; n++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,220,150,0.10)' : 'rgba(0,0,0,0.14)'; g.fillRect(rnd() * 31, rnd() * 31, 1, 1); } g.fillStyle = 'rgba(232,185,35,0.18)'; g.fillRect(15, 15, 2, 2); }
      else for (let n = 0; n < 14; n++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)'; g.fillRect(rnd() * 30, rnd() * 30, 2, 2); }
    });
    put(T.mat, () => { g.fillStyle = '#3a3a3a'; g.fillRect(2, 6, TS - 4, TS - 12); g.fillStyle = '#e8b923'; g.fillRect(4, 8, TS - 8, 2); g.fillRect(4, TS - 10, TS - 8, 2); });
    put(T.stairs, () => { for (let y = 0; y < TS; y += 6) { g.fillStyle = y % 12 ? '#8a8378' : '#6f695f'; g.fillRect(2, y, TS - 4, 6); } });
    put(T.grass, () => { g.fillStyle = '#4f6f3c'; g.fillRect(0, 0, TS, TS); for (let k = 0; k < 26; k++) { g.fillStyle = rnd() < 0.5 ? 'rgba(160,200,110,0.22)' : 'rgba(20,50,20,0.25)'; g.fillRect(rnd() * 31, rnd() * 31, 1, 2); } });
    put(T.path, () => { g.fillStyle = '#b3a78c'; g.fillRect(0, 0, TS, TS); for (let k = 0; k < 30; k++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.14)' : 'rgba(60,50,30,0.18)'; g.fillRect(rnd() * 31, rnd() * 31, 1, 1); } });
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
    const colV = new Int16Array(W).fill(-1), rowH = new Int16Array(H).fill(-1); // which avenue a column / row of tiles belongs to (side streets: -2)
    for (const r of this.rv) for (let k = 0; k < r.w; k++) colV[r.t + k] = r.main >= 0 ? r.t : -2;
    for (const r of this.rh) for (let k = 0; k < r.w; k++) rowH[r.t + k] = r.main >= 0 ? r.t : -2;
    void rw;
    const inV = (x: number) => (colV[x] === -1 ? undefined : colV[x]), inH = (y: number) => (rowH[y] === -1 ? undefined : rowH[y]);
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
      const plain = r.tint ? r.tint[0] : r.roof ? kinds[r.roof][i % kinds[r.roof].length] : special.get(r);
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
        const mat = r.roof ? (r.roof === 'fence' || r.roof === 'room' ? null : mats.metal) : special.has(r) ? mats.flat : mats[st.kind];
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
        if (r.roof === 'room') { // interior walls and furniture: a plain top with a soft edge, and a few details by kind
          const kind = Object.keys(INTERIOR.colors).find((k) => INTERIOR.colors[k][0] === r.tint![0]);
          if (kind === 'P') for (let x = 4; x < w - 8; x += 16) for (let y = 4; y < h - 8; y += 16) { g.fillStyle = ['#ffe36a', '#6ad8ff', '#ff8ad0'][((x + y) >> 4) % 3]; g.fillRect(x + 2, y + 2, 10, 8); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + 4, y + 11, 6, 3); }
          if (kind === 'S') { g.fillStyle = 'rgba(0,0,0,0.22)'; for (let x = 3; x < w; x += 8) g.fillRect(x, 3, 5, h - 6); }
          if (kind === 'B') { g.fillStyle = '#f4f0e6'; g.fillRect(4, 4, w - 8, Math.min(14, h - 8)); g.fillStyle = '#5a6f9a'; g.fillRect(4, 22, w - 8, Math.max(0, h - 28)); }
          if (kind === 'L') { g.fillStyle = 'rgba(0,0,0,0.3)'; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 1, h); }
          g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
          g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, h - 2, w, 2); g.fillRect(w - 2, 0, 2, h);
          tex.refresh();
          return;
        }
        g.fillStyle = st.trim; g.fillRect(0, 0, w, 4); g.fillRect(0, 0, 4, h); // parapet: light top/left, dark bottom/right
        g.fillStyle = 'rgba(0,0,0,0.38)'; g.fillRect(0, h - 4, w, 4); g.fillRect(w - 4, 0, 4, h);
        tex.refresh();
      };
      out.push({ img: scene.add.image(r.x + r.w / 2, r.y + r.h / 2, 'dot').setDepth(20).setVisible(false), x: r.x + r.w / 2, y: r.y + r.h / 2, h: hgt, rect: r, wall: r.tint ? parseInt(r.tint[1].slice(1), 16) : D.walls[i % D.walls.length], noWin: !!r.roof,
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
    // the railway viaduct: deck pieces floating above the street, each with a shadow on the road below
    {
      const R = MAP.rail, piece = 256, dw = 40;
      for (const [key, w, h] of [['railH', piece, dw], ['railV', dw, piece]] as [string, number, number][]) {
        const t = scene.textures.createCanvas(key, w, h)!, g = t.getContext(), hz = w > h;
        g.fillStyle = '#6d6a64'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#4a4742'; for (let k = 2; k < piece; k += 8) hz ? g.fillRect(k, 3, 3, h - 6) : g.fillRect(3, k, w - 6, 3); // sleepers
        g.fillStyle = '#b9bdc2'; for (const o of [8, 14, 25, 31]) hz ? g.fillRect(0, o, w, 1) : g.fillRect(o, 0, 1, h); // two tracks
        g.fillStyle = '#8d8a84'; hz ? (g.fillRect(0, 0, w, 2), g.fillRect(0, h - 2, w, 2)) : (g.fillRect(0, 0, 2, h), g.fillRect(w - 2, 0, 2, h)); // parapets
        t.refresh();
      }
      const pt = scene.textures.createCanvas('platform', 220, 64)!, pg = pt.getContext();
      pg.fillStyle = '#e6e0d2'; pg.fillRect(0, 0, 220, 64); pg.fillStyle = '#7fbf4f'; pg.fillRect(0, 0, 220, 5); pg.fillRect(0, 59, 220, 5);
      pg.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = 0; x < 220; x += 22) pg.fillRect(x, 5, 1, 54);
      pt.refresh();
      const c = this.railCorners;
      for (let side = 0; side < 4; side++) {
        const a = c[side], b = c[(side + 1) % 4], len = Math.abs(b.x - a.x) + Math.abs(b.y - a.y), hz = a.y === b.y;
        const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y), key = hz ? 'railH' : 'railV';
        for (let d = piece / 2 - 20; d < len + 20; d += piece - 24) { // (pieces overlap a little, so no gaps open up as they slide)
          const x = a.x + dx * Math.min(d, len - piece / 2 + 20), y = a.y + dy * Math.min(d, len - piece / 2 + 20);
          out.push({ img: scene.add.image(x, y + 10, key).setTint(0x000000).setAlpha(0.28).setDepth(2), x, y: y + 10, h: 0 });
          out.push({ img: scene.add.image(x, y, key).setDepth(20.5), x, y, h: R.height });
        }
      }
      for (const s of this.stations) {
        out.push({ img: scene.add.image(s.x, s.y, 'platform').setDepth(20.6), x: s.x, y: s.y, h: R.height + 0.004 });
        const sign = scene.add.text(s.x, s.y, s.name + '\nSTATION', { fontFamily: 'monospace', fontSize: '11px', color: '#22331a', align: 'center' }).setOrigin(0.5).setDepth(20.7);
        out.push({ img: sign, x: s.x, y: s.y, h: R.height + 0.004 });
        this.lights.push({ x: s.x, y: s.y, color: 0xdfffd0, scale: 2, alpha: 0.4 });
      }
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
