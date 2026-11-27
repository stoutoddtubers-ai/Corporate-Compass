// Kogane City: the east bank (Asagiri, Denpa-chō, Tetsugawa), the Kurokawa River with five
// bridges, the west side (Hanabi-chō, Mirai-zaka, Marukane, Rokkaku Hills) and, over the
// Bay Bridge to the south, the Shiokaze Port island.
// Everything is in tiles (32 px). Roads are 4 tiles wide with a sidewalk either side.
// City blocks are filled in by a repeatable generator (same city every time), then the
// story's named places are pinned to particular buildings and car parks below.

export interface DistrictStyle {
  name: string; kanji: string; tagline: string;
  /** Building size range in tiles, and how often a plot is left open as a car park / yard. */
  minSize: number; maxSize: number; lotChance: number;
  walk: string; walkLine: string; kerb: string;
  roofs: { base: string; line: string; trim: string; kind: 'tile' | 'flat' | 'plank' | 'metal' }[];
  awnings: string[]; awningChance: number;
  /** Colours of glowing signs on rooftops (empty = none). */
  neon: number[];
  /** How tall buildings look (0.1 = roof slides 10% of its distance from screen centre), and wall colours. */
  height: number[]; walls: number[];
  /** Street-lamp colour: the bible's "night light" for the district. */
  lamp: number;
}

export const DISTRICTS: Record<string, DistrictStyle> = {
  asagiri: {
    name: 'ASAGIRI', kanji: '朝霧', tagline: 'Old town. Old grudges.',
    minSize: 4, maxSize: 8, lotChance: 0.12,
    walk: '#8d8478', walkLine: '#766d62', kerb: '#b3aa9c',
    roofs: [
      { base: '#4a5661', line: '#3a444d', trim: '#6b7884', kind: 'tile' },
      { base: '#cdbf9f', line: '#b3a586', trim: '#e6dcc2', kind: 'flat' },
      { base: '#7b5a41', line: '#644733', trim: '#9a765a', kind: 'plank' },
      { base: '#5a4a45', line: '#4a3c38', trim: '#7a6a62', kind: 'tile' },
    ],
    awnings: ['#b3312f', '#2f4a6b', '#d8c9a3', '#3f6b4a'], awningChance: 0.7,
    neon: [], lamp: 0xffb860, // warm amber
    height: [0.07, 0.11], walls: [0x8a6a4c, 0xcbbd9d, 0x6e5a48], // wood and cream plaster
  },
  denpa: {
    name: 'DENPA-CHŌ', kanji: '電波町', tagline: "Everything's for sale. Especially your data.",
    minSize: 5, maxSize: 10, lotChance: 0.1,
    walk: '#a5a8ac', walkLine: '#8b8e93', kerb: '#d4d6d8',
    roofs: [
      { base: '#d9d9d2', line: '#bfbfb8', trim: '#f0f0ea', kind: 'flat' },
      { base: '#2b2d33', line: '#1e2025', trim: '#454851', kind: 'flat' },
      { base: '#8d939c', line: '#767c85', trim: '#aab0b8', kind: 'metal' },
    ],
    awnings: ['#19b7c9', '#e8d02a', '#e0408a', '#f2f2f2'], awningChance: 0.8,
    neon: [0x28e0f0, 0xf0e030, 0xf040a0], lamp: 0x9fe8ff, // electric cyan
    height: [0.11, 0.16], walls: [0xc9c9c2, 0x4a4d57, 0x8b9199], // off-white tile, dark glass
  },
  tetsugawa: {
    name: 'TETSUGAWA', kanji: '鉄川', tagline: 'Iron, rust and engines.',
    minSize: 8, maxSize: 15, lotChance: 0.3,
    walk: '#7c7d7f', walkLine: '#67686a', kerb: '#a3a4a5',
    roofs: [
      { base: '#6f7478', line: '#5b6064', trim: '#8a8f93', kind: 'metal' },
      { base: '#8a5a3c', line: '#734a30', trim: '#a8704e', kind: 'metal' },
      { base: '#4d5157', line: '#3e4247', trim: '#666b72', kind: 'flat' },
    ],
    awnings: ['#d8b02a', '#5a5a5a'], awningChance: 0.15,
    neon: [], lamp: 0xff9a40, // sodium orange
    height: [0.08, 0.13], walls: [0x7a7f84, 0x8a5c40, 0x5a5e64], // concrete and rust
  },
};

Object.assign(DISTRICTS, {
  hanabi: {
    name: 'HANABI-CHŌ', kanji: '花火町', tagline: 'The night never ends. Neither do the debts.',
    minSize: 4, maxSize: 9, lotChance: 0.1,
    walk: '#5f5458', walkLine: '#4e4448', kerb: '#8a7c80',
    roofs: [
      { base: '#3a2a2c', line: '#2c2022', trim: '#58444a', kind: 'flat' },
      { base: '#1f1c22', line: '#16141a', trim: '#3a3540', kind: 'flat' },
      { base: '#5a3038', line: '#48262c', trim: '#7a4650', kind: 'tile' },
    ],
    awnings: ['#e0408a', '#c81e5a', '#f0b030', '#7a2ad0'], awningChance: 0.85,
    neon: [0xff3aa0, 0xff3030, 0xffb020], lamp: 0xff6aa8, // pink and red neon
    height: [0.09, 0.14], walls: [0x4a3034, 0x2a2428, 0x6a3a44], // dark brick, black
  },
  mirai: {
    name: 'MIRAI-ZAKA', kanji: '未来坂', tagline: "Everyone's watching. Everyone's filming.",
    minSize: 5, maxSize: 11, lotChance: 0.1,
    walk: '#b8bcc2', walkLine: '#9da1a8', kerb: '#e0e2e6',
    roofs: [
      { base: '#e8e8e8', line: '#cfcfcf', trim: '#ffffff', kind: 'flat' },
      { base: '#b8d0e0', line: '#9fb8c8', trim: '#d8ecf6', kind: 'metal' },
      { base: '#d0d4dc', line: '#b8bcc4', trim: '#eef0f4', kind: 'flat' },
    ],
    awnings: ['#f04a4a', '#30b0f0', '#f0d030', '#40c870'], awningChance: 0.8,
    neon: [0xff4040, 0x30b0ff, 0xf0e030, 0x40e080, 0xe040f0], lamp: 0xffffff, // billboard rainbow, white light
    height: [0.11, 0.17], walls: [0xe0e0e0, 0x9fc0d6, 0xc8ccd4], // clean white, glass
  },
  marukane: {
    name: 'MARUKANE', kanji: '丸金', tagline: 'Where the money sleeps.',
    minSize: 7, maxSize: 13, lotChance: 0.08,
    walk: '#9aa2ac', walkLine: '#828a94', kerb: '#c8d0d8',
    roofs: [
      { base: '#5f7286', line: '#4e6074', trim: '#8296aa', kind: 'flat' },
      { base: '#7f8e9c', line: '#6c7a88', trim: '#a2b0be', kind: 'metal' },
      { base: '#44505e', line: '#38424e', trim: '#66727f', kind: 'flat' },
    ],
    awnings: ['#c9a84a', '#2a3a52'], awningChance: 0.25,
    neon: [0xf0c850], lamp: 0xdfeaff, // gold accents, cool white light
    height: [0.16, 0.24], walls: [0x6a7c90, 0x90a8c0, 0x4a5868], // steel blue-grey, glass
  },
  rokkaku: {
    name: 'ROKKAKU HILLS', kanji: '六角ヒルズ', tagline: 'The view is better from the top.',
    minSize: 6, maxSize: 12, lotChance: 0.18,
    walk: '#7e8488', walkLine: '#696f73', kerb: '#aab0b4',
    roofs: [
      { base: '#3d444c', line: '#30363d', trim: '#5c646e', kind: 'flat' },
      { base: '#4a5a4c', line: '#3c4a3e', trim: '#6a7c6c', kind: 'flat' },
      { base: '#55505e', line: '#46424e', trim: '#777080', kind: 'tile' },
    ],
    awnings: ['#d8c9a3', '#7a5ad0'], awningChance: 0.2,
    neon: [0xa070ff], lamp: 0xc8a8ff, // champagne and violet uplighting
    height: [0.13, 0.2], walls: [0x4a525c, 0xd8cdb0, 0x5a5466], // dark slate
  },
  shiokaze: {
    name: 'SHIOKAZE PORT', kanji: '潮風港', tagline: 'What comes in by sea leaves by sea.',
    minSize: 8, maxSize: 16, lotChance: 0.4,
    walk: '#70787a', walkLine: '#5c6466', kerb: '#9aa2a4',
    roofs: [
      { base: '#2f7f86', line: '#266a70', trim: '#4a9ea6', kind: 'metal' },
      { base: '#b5562e', line: '#964626', trim: '#d0704a', kind: 'metal' },
      { base: '#5a6266', line: '#4a5256', trim: '#7a8286', kind: 'flat' },
    ],
    awnings: ['#d8702a', '#2f7f86'], awningChance: 0.1,
    neon: [], lamp: 0x9affb0, // green harbour lights
    height: [0.06, 0.1], walls: [0x3f7f84, 0x9a5a3a, 0x5c6468], // container teal, rust
  },
} as Record<string, DistrictStyle>);

// ---------------------------------------------------------------------------------------
// The street plan, after Tokyo: a few wide avenues (the grid the story was written on) with
// two narrow side streets in every gap, so each big block is a knot of small ones.
// ---------------------------------------------------------------------------------------

/** The first, small city's avenues. Story places written as tiles were measured on this plan; `MAP.tx/ty` moves them. */
const OLD_V = [12, 44, 76, 108, 140, 160, 192, 224, 258, 300], OLD_H = [4, 34, 64, 94, 120, 148, 178];
/** Width of a side street, in tiles (avenues are `roadWidth`). */
const SIDE_W = 2;
/**
 * What fills each gap between two avenues. A pair [a, b] = two side streets, with new blocks
 * a and b tiles wide after them (the first block of every gap keeps its old size, so the
 * story's hand-built blocks still fit). A single number = no side streets, the gap is that wide
 * (the river, the bay, the port island).
 */
const GAPS_V: (number[] | number)[] = [[20, 18], [18, 22], [22, 18], [18, 20], 24, [20, 20], [18, 22], [22, 18], [20, 18]];
const GAPS_H: (number[] | number)[] = [[20, 18], [18, 20], [22, 18], [18, 18], 36, 30];
function layOut(old: number[], gaps: (number[] | number)[]): { main: number[]; side: number[] } {
  const main = [old[0]], side: number[] = [];
  gaps.forEach((g, i) => {
    if (typeof g === 'number') { main.push(main[i] + g); return; }
    const s1 = main[i] + old[i + 1] - old[i], s2 = s1 + SIDE_W + g[0];
    side.push(s1, s2); main.push(s2 + SIDE_W + g[1]);
  });
  return { main, side };
}
const LV = layOut(OLD_V, GAPS_V), LH = layOut(OLD_H, GAPS_H);
/** Moves a tile coordinate from the old plan to this one: it keeps its distance from the avenue it was beside. */
function moveTile(v: number, old: number[], main: number[]): number {
  let i = 0;
  while (i < old.length - 1 && v >= old[i + 1] - 3.5) i++; // a spot on the kerb just before an avenue stays with that avenue
  if (i < old.length - 1 && main[i + 1] - main[i] <= old[i + 1] - old[i] + 16 && v - old[i] > (old[i + 1] - old[i]) / 2) return main[i + 1] - (old[i + 1] - v); // river / bay: stay with the nearer bank
  return main[i] + (v - old[i]);
}
const tx = (x: number): number => moveTile(x, OLD_V, LV.main), ty = (y: number): number => moveTile(y, OLD_H, LH.main);

/**
 * How each district's backstreets behave, after the part of Tokyo it is modelled on.
 *  - `streets`: chance that a side street actually runs through a big block. Low = superblocks.
 *  - `lanes`: when it does not, the chance it is a shopping lane for people on foot instead of nothing.
 *  - `parks`: chance that a small block is a park (grass, trees, sometimes a pond).
 */
export const GRAIN: Record<string, { streets: number; lanes: number; parks: number }> = {
  asagiri: { streets: 0.8, lanes: 0.9, parks: 0.1 }, // Asakusa, Ueno, Yanaka: tight old streets, Nakamise-style lanes, temple greens
  denpa: { streets: 0.75, lanes: 0.7, parks: 0.03 }, // Akihabara: a dense grid with covered electronics lanes
  tetsugawa: { streets: 0.4, lanes: 0, parks: 0.02 }, // the Keihin industrial belt: big yards, few through streets
  hanabi: { streets: 0.9, lanes: 0.9, parks: 0.02 }, // Kabukichō and Golden Gai: the finest grain in the city
  mirai: { streets: 0.7, lanes: 0.85, parks: 0.1 }, // Shibuya and Harajuku: Center-gai, Takeshita-dōri, Yoyogi's green
  marukane: { streets: 0.5, lanes: 0.2, parks: 0.07 }, // Marunouchi and Ginza: office superblocks, Hibiya's park
  rokkaku: { streets: 0.6, lanes: 0.3, parks: 0.12 }, // Roppongi and Azabu: towers on big plots, embassy gardens
  shiokaze: { streets: 0, lanes: 0, parks: 0 }, // the port island has no side streets
};

export const MAP = {
  /**
   * First tile of each north-south and east-west avenue. One grid covers the whole city:
   * columns 0-4 are the west side, 5-9 the east bank, with the river between columns 4 and 5.
   * Rows 0-4 are the city; rows 5-6 are the port island, across the bay.
   */
  vRoads: LV.main,
  hRoads: LH.main,
  roadWidth: 4,
  /** Side streets: first tile of each. They run the length of the city but do not cross the river or the bay. */
  vSide: LV.side,
  hSide: LH.side,
  sideWidth: SIDE_W,
  /** The city ends at this row. Below it, out of sight, is a band of tiles where building interiors are kept (data/interiors.ts). */
  cityH: LH.main[6] + 8,
  interiorBand: { y: LH.main[6] + 18, rows: 124 },
  /** Old-plan tile -> this plan (see `places`). */
  tx, ty,
  /** The Kurokawa River: first water tile and width. Every east-west avenue crosses it on a bridge (5 bridges, bible). */
  river: { x: LV.main[4] + 6, w: LV.main[5] - LV.main[4] - 8 },
  /** Kogane Bay: everything from this row south is sea, except the port island. */
  bay: { y: LH.main[4] + 6 },
  /** The port island: which avenue columns and rows it uses, and the one road that reaches it (the Bay Bridge). */
  port: { v0: 5, v1: 8, h0: 5, h1: 6, bridge: 7 },
  /** The east bank's K-Route loop (the mission 4 race circuit), as first tiles of its four roads. */
  eastRing: { west: LV.main[5], east: LV.main[9], north: LH.main[0], south: LH.main[4] },
  /** A canal through the industrial blocks: first tile, width, and which block rows it cuts (east column 3). */
  canal: { x: tx(279), w: 3, rows: [1, 2] },
  /** Kogane Castle: a moated garden in the middle of the west side, as the Imperial Palace sits in Tokyo. It takes the south-east corner of this big block. */
  castle: { block: 'w3-1' },
  /**
   * The Kanjō Line: an elevated railway loop over four side streets (Tokyo's Yamanote Line).
   * `v` and `h` name the side streets it runs above, as [gap between avenues, which side street in it].
   * Those streets always exist, so there is a road under the viaduct, as in Tokyo.
   */
  rail: {
    v: [[1, 0], [6, 1]], h: [[0, 1], [2, 1]],
    height: 0.09, // how high the deck is (the same scale as building heights)
    trains: 3, cars: 5, carLength: 54, // px
    speed: 300, stopTime: 5, // px/s, and seconds at each station
    /** Stations: which side of the loop (n/e/s/w), how far along it (0-1), and the name on the platform. */
    stations: [
      { side: 'n', at: 0.12, name: 'ROKKAKU HILLS' }, { side: 'n', at: 0.42, name: 'MARUKANE' }, { side: 'n', at: 0.8, name: 'DENPA-CHŌ' },
      { side: 's', at: 0.14, name: 'MIRAI-ZAKA' }, { side: 's', at: 0.42, name: 'HANABI-CHŌ' }, { side: 's', at: 0.82, name: 'ASAGIRI' },
    ],
  },
  /** Which district a tile is in. */
  districtAt(x: number, y: number): string {
    if (y >= LH.main[4] + 6) return 'shiokaze';
    if (x >= LV.main[7]) return 'tetsugawa';
    if (x >= (LV.main[4] + LV.main[5]) / 2 + 2) return y < LH.main[2] ? 'denpa' : 'asagiri';
    if (x >= LV.main[2]) return y < LH.main[2] ? 'marukane' : 'hanabi';
    return y < LH.main[2] ? 'rokkaku' : 'mirai';
  },
  /** How strongly rooftops slide away from the screen centre to fake height (the GTA 2 trick). */
  roofHeight: 0.05, // used for low things: fences, containers, the gate
  /**
   * The camera angle. The view is a three-quarter one, about 45 degrees: halfway between
   * overhead and behind the shoulder. Two numbers make it:
   *  - `squash`: the whole world is drawn this much shorter top-to-bottom, so the ground recedes;
   *  - `tilt`: anything with height leans up the screen by this many pixels per pixel of height.
   * For a true camera angle A from overhead: squash = cos(A), tilt = tan(A). 45 degrees = 0.7 and 1.
   * `tilt` must equal TILT in tools/blender/render_assets.py (re-render the sprites after changing it).
   */
  tilt: 1.0,
  squash: 0.7,
  /** Building height in pixels for a height value of 1 (so 0.1 = 33 px tall). */
  heightScale: 330,
  /** How much of the old "slide away from the screen centre" perspective to keep. */
  perspective: 0.6,
  lampSpacing: 7, // tiles between street lamps
  /**
   * Story places. `block` names a city block: east bank "column-row" (0-0 is its top left; the
   * two canal blocks split into "3-1a"/"3-1b"), west side "wColumn-row", port island "p0"-"p2". `pick` chooses the Nth biggest building or
   * car park in that block (the block's original corner first, then the rest). `tile` pins a place
   * to an exact spot instead, written on the OLD small plan; the game moves it with `tx/ty`.
   */
  places: {
    prison: { block: '2-3', kind: 'building', pick: 0, label: 'KOGANE\nDETENTION CENTER' },
    asagiri: { tile: [194, 79] }, // Hozuki-mon gate, over the road into the old town
    arcade: { block: '1-3', kind: 'building', pick: 0, label: 'ARCADE' },
    bathhouse: { block: '0-2', kind: 'building', pick: 0, label: 'BATHHOUSE' },
    hospital: { block: '1-2', kind: 'building', pick: 0, label: '病院\nHOSPITAL', color: '#b04a4a' },
    policeBox: { block: '1-2', kind: 'building', pick: 3, label: '交番\nKŌBAN', color: '#2f5fa8' },
    garage: { block: '2-2', kind: 'building', pick: 0, label: "GORO'S\nGARAGE" },
    spray: { block: '2-2', kind: 'lot', pick: 0 },
    raceStart: { tile: [248, 5.5] }, // K-Route, north side
    catArcade: { block: '0-0', kind: 'building', pick: 0, label: 'ARCADE\n=^.x.^=' },
    hideout: { block: '1-1', kind: 'building', pick: 0, label: 'CAPSULE HOTEL' },
    ambush: { tile: [195, 22] },
    canalLot: { block: '3-1b', kind: 'lot', pick: 0 }, // Sawada's canal-side lot, two blocks from the container yard
    truck: { block: '3-0', kind: 'lot', pick: 0 },
    pier: { tile: [155, 108.5] },
    warehouseGate: { tile: [243, 31.6] }, // just outside the evidence compound's gate
    temple: { block: '1-2', kind: 'lot', pick: 0, label: 'OLD TEMPLE' },
    // ---- more hospitals and police boxes, so you wake up near where you fell ----
    hospitalWest: { block: 'w1-2', kind: 'building', pick: 2, label: '病院\nHOSPITAL', color: '#b04a4a' },
    policeBoxWest: { block: 'w2-1', kind: 'building', pick: 2, label: '交番\nKŌBAN', color: '#2f5fa8' },
    hospitalPort: { block: 'p0', kind: 'building', pick: 1, label: '病院\nHOSPITAL', color: '#b04a4a' },
    // ---- Hachiman Hardware, one per district ----
    hardwareAsagiri: { block: '1-3', kind: 'building', pick: 2, label: 'HACHIMAN\nHARDWARE' },
    hardwareDenpa: { block: '0-1', kind: 'building', pick: 1, label: 'HACHIMAN\nHARDWARE' },
    hardwareTetsugawa: { block: '2-1', kind: 'building', pick: 1, label: 'HACHIMAN\nHARDWARE' },
    hardwareHanabi: { block: 'w2-2', kind: 'building', pick: 2, label: 'HACHIMAN\nHARDWARE' },
    hardwareMirai: { block: 'w1-3', kind: 'building', pick: 1, label: 'HACHIMAN\nHARDWARE' },
    hardwareMarukane: { block: 'w3-1', kind: 'building', pick: 1, label: 'HACHIMAN\nHARDWARE' },
    hardwareRokkaku: { block: 'w1-1', kind: 'building', pick: 1, label: 'HACHIMAN\nHARDWARE' },
    hardwareShiokaze: { block: 'p2', kind: 'building', pick: 1, label: 'HACHIMAN\nHARDWARE' },
    // ---- ACT 2 PLACES (west side) ----
    saekoOffice: { block: 'w3-2', kind: 'building', pick: 0, label: 'KUROGANE\nOFFICE' },
    hanabiLot: { block: 'w3-2', kind: 'lot', pick: 0 },
    pachinko: { block: 'w2-2', kind: 'building', pick: 0, label: 'GOLDEN BALL\nPACHINKO' },
    karaoke: { block: 'w3-3', kind: 'building', pick: 0, label: 'VOICE CAVE\nKARAOKE' },
    mansion: { block: 'w2-3', kind: 'building', pick: 0, label: 'KUROGANE\nMANSION' },
    mansionYard: { block: 'w2-3', kind: 'lot', pick: 0 },
    scramble: { tile: [46, 96] }, // the Mirai-zaka scramble crossing
    miraiLot: { block: 'w1-2', kind: 'lot', pick: 0 },
    midoriPark: { block: 'w0-3', kind: 'lot', pick: 0, label: 'MIDORI PARK' },
    tsukuyomiTower: { block: 'w2-0', kind: 'building', pick: 0, label: 'TSUKUYOMI\nTOWER' },
    towerPlaza: { block: 'w2-0', kind: 'lot', pick: 0 },
    tomonTunnel: { tile: [110, 20] }, // on the road through Marukane
    centralStation: { block: 'w3-0', kind: 'building', pick: 0, label: 'KOGANE\nCENTRAL' },
    marukaneLot: { block: 'w2-1', kind: 'lot', pick: 0 },
    hanabiGate: { tile: [136.5, 93.4] }, // M09: Hanabi-chō's neon gate, where the bridge road comes in
    mamaRei: { block: 'w3-2', kind: 'building', pick: 6, label: "MAMA REI'S\nBAR" }, // a tiny bar in the alley
    lucky7: { block: 'w2-2', kind: 'building', pick: 1, label: 'LUCKY 7\nARCADE' },
    florist: { block: 'w2-3', kind: 'building', pick: 1, label: 'HANABI\nFLORIST' },
    clubMirage: { block: 'w3-3', kind: 'building', pick: 1, label: 'CLUB\nMIRAGE' },
    pachinkoFloor: { block: 'w2-2', kind: 'lot', pick: 0 }, // M10: the car park at Golden Ball's door stands in for the hall floor
    scrambleCorner: { tile: [48.5, 93.5] }, // M11: the corner Jun waits on
    scrambleYard: { block: 'w1-3', kind: 'lot', pick: 0 }, // M11: the thief's first dash
    miraiStation: { block: 'w1-2', kind: 'building', pick: 0, label: 'STATION' }, // M11: "the station roof"
    screen1: { block: 'w1-2', kind: 'building', pick: 3 }, // M13: the five screen control boxes (at these buildings' doors)
    screen2: { block: 'w1-2', kind: 'building', pick: 2 },
    screen3: { block: 'w1-3', kind: 'building', pick: 0 },
    screen4: { block: 'w0-3', kind: 'building', pick: 0 },
    screen5: { block: 'w0-2', kind: 'building', pick: 0 },
    room6: { block: 'w3-3', kind: 'lot', pick: 0 }, // M14: Voice Cave's room 6 (the yard along the alley)
    voiceCaveStreet: { tile: [123, 119.5] }, // M14: the street outside Voice Cave
    towerService: { tile: [105, 21] }, // M15: the tower's service door (alley off the east street)
    towerArchive: { block: 'w2-0', kind: 'building', pick: 4 }, // M15: "floor 9" is the walk round this building
    mansionGate: { tile: [78, 112] }, // M16: the street at the mansion's alley
    mibuRoadblock: { tile: [78, 116.5] }, // M16
    // ---- ACT 3 PLACES (the bay, Rokkaku Hills) ----
    rokkakuTower: { block: 'w0-0', kind: 'building', pick: 0, label: 'ROKKAKU\nTOWER' },
    rokkakuValet: { block: 'w0-0', kind: 'lot', pick: 0 },
    mibuTower: { block: 'w1-0', kind: 'building', pick: 0, label: 'MIBU\nTOWER' },
    mibuPlaza: { block: 'w1-0', kind: 'lot', pick: 0 },
    containerPort: { block: 'p0', kind: 'lot', pick: 0, label: 'SHIOKAZE\nCONTAINER PORT' },
    fishMarket: { block: 'p1', kind: 'building', pick: 0, label: 'FISH MARKET' },
    fishMarketYard: { block: 'p1', kind: 'lot', pick: 0 },
    pier9: { block: 'p2', kind: 'lot', pick: 0, label: 'PIER 9' },
    bayBridge: { tile: [226, 136] },
    portGate: { tile: [229.5, 146.6] }, // the port end of the Bay Bridge (mission 17 starts and ends here)
    harbourOffice: { block: 'p0', kind: 'building', pick: 0, label: 'HARBOUR\nOFFICE' },
    rokkakuRoof: { block: 'w0-0', kind: 'lot', pick: 1 }, // stands in for the rooftop party (mission 20)
    mibuStaging: { block: 'w1-0', kind: 'lot', pick: 1 }, // where the ally's people gather before mission 22
    amaterasuQuay: { tile: [232, 147] }, // north quay, where Jun boards the ship (mission 24)
    glitchAlley: { tile: [209, 52.3] }, // outside the Glitch hideout's door (mission 23 starts here)
    // ---- SIDE STORY PLACES ----
    raijinClubhouse: { block: '3-0', kind: 'building', pick: 0, label: 'RAIJIN\nCLUBHOUSE' },
    // Daigo's Road (S-R): Bones Tamura's three chop shops in Tetsugawa
    srChopCanal: { block: '3-1b', kind: 'lot', pick: 1 }, // the canal-side shop
    srChopRail: { block: '3-1a', kind: 'building', pick: 0 }, // the shed at the south end of the rail yard
    srBones: { block: '3-2a', kind: 'building', pick: 0, label: "BONES'S\nGARAGE" },
    // Building 41 (S-G)
    sgYard: { block: '1-1', kind: 'lot', pick: 0 }, // the yard beside the Glitch hideout: Hikari's side stories start here
    sgLot41: { block: '1-0', kind: 'lot', pick: 0 }, // the empty lot where Building 41 stood (later the tower site)
    sgCam1: { tile: [223.5, 33.5] }, sgCam2: { tile: [223.5, 8.5] }, sgCam3: { tile: [196.5, 8.5] }, sgCam4: { tile: [196.5, 33.5] }, // Hikari's cameras, at the corners of the 41 block
    sgVan: { tile: [210, 35.5] }, // where the white van waits
    sgKurodaYard: { block: '2-3', kind: 'lot', pick: 0 }, // Kuroda Construction's yard
    sgIzakaya: { block: '0-2', kind: 'lot', pick: 0 }, // the izakaya in Asagiri where Mr. Endō waits
    sgStation: { block: '2-1', kind: 'building', pick: 0, label: 'TETSUGAWA\nSTATION' },
    sgLockers: { block: '2-1', kind: 'lot', pick: 1 }, // the station forecourt, where the lockers are
    // Old Debts (S-K)
    // (S-K1 uses Act 2's `mamaRei` and `clubMirage`)
    skSaeko: { tile: [88, 116] }, // the side gate of the Kurogane mansion: Saeko's side stories start here
    skTsuda: { block: '1-3', kind: 'building', pick: 4 }, // Mrs. Tsuda's apartment in Asagiri
    skMibuYard: { block: '3-2b', kind: 'lot', pick: 0 }, // the yard of Mibu's canal warehouse
    skMibuRoad: { tile: [299.5, 75] }, // the street outside it (retry point)
    // Sea Spirit (S-U)
    suDock: { block: 'p1', kind: 'lot', pick: 1 }, // the fish market's dock: Hachirō's side stories start here
    suSalvage: { block: 'p0', kind: 'lot', pick: 1 }, // the quay where the salvage "barge" works
  } as Record<string, { block?: string; kind?: 'building' | 'lot'; pick?: number; tile?: number[]; label?: string; color?: string }>,
  /** The river-cruise pier: planks out over the water [x, y, w, h]. */
  pier: [tx(152), ty(107), 6, 3],
  /**
   * Hand-designed landmark blocks. Each item is [x, y, w, h] in tiles from the block's
   * top-left corner. kind: 'b' building, 'l' car park / yard, 'f' special floor.
   * `place` pins a story place to it; `door` says which wall the door is on.
   */
  layouts: {
    // Asagiri shōtengai: a covered shopping street with Sakamaki Ramen on it
    '0-3': [
      { r: [0, 0, 11, 5], kind: 'b', place: 'shop1', door: 'e', label: 'CERAMICS' },
      { r: [0, 5, 11, 6], kind: 'b', place: 'ramen', door: 'e', label: 'SAKAMAKI\nRAMEN' },
      { r: [0, 11, 11, 4], kind: 'b', place: 'shop2', door: 'e', label: 'TEA' },
      { r: [0, 15, 11, 5], kind: 'b', place: 'shop3', door: 'e', label: 'TOFU' },
      { r: [11, 0, 3, 20], kind: 'f', floor: 'arcade' },
      { r: [14, 0, 12, 6], kind: 'b' },
      { r: [14, 7, 12, 6], kind: 'l', place: 'shotengai' },
      { r: [14, 14, 12, 6], kind: 'b' },
    ],
    // Tetsugawa rail yard: tracks and boxcars; the Raijin keep their cars here
    '3-1a': [
      { r: [0, 0, 15, 17], kind: 'l', place: 'railyard', label: 'RAIL YARD' },
      { r: [9, 0, 2, 17], kind: 'f', floor: 'rail' }, { r: [12, 0, 2, 17], kind: 'f', floor: 'rail' },
      { r: [9, 1, 2, 6], kind: 'b', roof: 'boxcar', height: 0.5 }, { r: [12, 9, 2, 6], kind: 'b', roof: 'boxcar', height: 0.5 },
      { r: [0, 19, 15, 5], kind: 'b' },
    ],
    // Tetsugawa container yard
    '3-3': [
      { r: [0, 0, 18, 20], kind: 'l', place: 'containerYard', label: 'CONTAINER YARD' },
      { r: [1, 1, 4, 2], kind: 'b', roof: 'container', height: 0.5 }, { r: [1, 4, 4, 2], kind: 'b', roof: 'container', height: 0.5 },
      { r: [13, 1, 2, 4], kind: 'b', roof: 'container', height: 0.5 }, { r: [13, 15, 4, 2], kind: 'b', roof: 'container', height: 0.5 },
      { r: [1, 16, 4, 2], kind: 'b', roof: 'container', height: 0.5 }, { r: [8, 16, 2, 3], kind: 'b', roof: 'container', height: 0.5 },
      { r: [20, 0, 16, 9], kind: 'b' }, { r: [20, 11, 16, 9], kind: 'b' },
    ],
    // KMPD evidence facility: a fenced compound with one gate (south) and shelving inside
    '2-0': [
      { r: [4, 4, 20, 16], kind: 'l', place: 'warehouse', label: 'KMPD EVIDENCE' },
      { r: [3, 3, 22, 1], kind: 'b', roof: 'fence', height: 0.25 }, { r: [3, 4, 1, 16], kind: 'b', roof: 'fence', height: 0.25 }, { r: [24, 4, 1, 16], kind: 'b', roof: 'fence', height: 0.25 },
      { r: [3, 20, 9, 1], kind: 'b', roof: 'fence', height: 0.25 }, { r: [16, 20, 9, 1], kind: 'b', roof: 'fence', height: 0.25 },
      { r: [7, 7, 6, 1], kind: 'b', roof: 'shelf', height: 0.3 }, { r: [7, 10, 6, 1], kind: 'b', roof: 'shelf', height: 0.3 },
      { r: [15, 7, 6, 1], kind: 'b', roof: 'shelf', height: 0.3 }, { r: [15, 10, 6, 1], kind: 'b', roof: 'shelf', height: 0.3 },
      { r: [15, 14, 6, 1], kind: 'b', roof: 'shelf', height: 0.3 }, { r: [7, 14, 6, 1], kind: 'b', roof: 'shelf', height: 0.3 },
    ],
  } as Record<string, { r: number[]; kind: 'b' | 'l' | 'f'; place?: string; door?: 'n' | 's' | 'e' | 'w'; label?: string; roof?: string; height?: number; floor?: 'arcade' | 'rail' }[]>,
  colors: {
    wall: '#2a231f', road: '#2b2a2e', kroad: '#38373c', bridge: '#4a4640', lot: '#3d3a3a', alley: '#353232',
    water: '#1d3a4a', waterLight: '#2a4f62', planks: '#6e5a48',
    laneLine: '#c9a84a', kLine: '#e8e8e8', crossing: '#d8d2c4', lanternRed: '#d8343a',
  },
} as const;
