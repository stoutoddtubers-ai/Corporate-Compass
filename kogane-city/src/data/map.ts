// The east bank of Kogane City (Act 1): Asagiri, Denpa-chō and Tetsugawa, the Kurokawa
// River on the west edge with two bridges, and the K-Route expressway ring around it all.
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

export const MAP = {
  /** Water tiles along the west edge: the Kurokawa River. */
  riverWidth: 10,
  /** First tile of each north-south and east-west road. The outermost ones form the K-Route ring. */
  vRoads: [12, 44, 76, 110, 152],
  hRoads: [4, 34, 64, 94, 120],
  roadWidth: 4,
  /** East-west roads that carry on west over the river as bridges. */
  bridges: [34, 94],
  /** A canal through the industrial blocks: first tile, width, and which block rows it cuts. */
  canal: { x: 131, w: 3, rows: [1, 2] },
  /** Which district a tile is in. */
  districtAt(tx: number, ty: number): string {
    return tx >= 76 ? 'tetsugawa' : ty < 64 ? 'denpa' : 'asagiri';
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
   * Story places. `block` is "column-row" of the city block (0-0 is top left; the two
   * canal blocks split into "3-1a"/"3-1b"). `pick` chooses the Nth biggest building or
   * car park in that block. `tile` pins a place to an exact spot instead.
   */
  places: {
    prison: { block: '2-3', kind: 'building', pick: 0, label: 'KOGANE\nDETENTION CENTER' },
    asagiri: { tile: [46, 79] }, // Hozuki-mon gate, over the road into the old town
    arcade: { block: '1-3', kind: 'building', pick: 0, label: 'ARCADE' },
    bathhouse: { block: '0-2', kind: 'building', pick: 0, label: 'BATHHOUSE' },
    hospital: { block: '1-2', kind: 'building', pick: 0, label: '病院\nHOSPITAL', color: '#b04a4a' },
    policeBox: { block: '1-2', kind: 'building', pick: 3, label: '交番\nKŌBAN', color: '#2f5fa8' },
    garage: { block: '2-2', kind: 'building', pick: 0, label: "GORO'S\nGARAGE" },
    spray: { block: '2-2', kind: 'lot', pick: 0 },
    raceStart: { tile: [100, 5.5] }, // K-Route, north side
    catArcade: { block: '0-0', kind: 'building', pick: 0, label: 'ARCADE\n=^.x.^=' },
    hideout: { block: '1-1', kind: 'building', pick: 0, label: 'CAPSULE HOTEL' },
    ambush: { tile: [47, 22] },
    canalLot: { block: '3-1b', kind: 'lot', pick: 0 }, // Sawada's canal-side lot, two blocks from the container yard
    truck: { block: '3-0', kind: 'lot', pick: 0 },
    pier: { tile: [7, 108.5] },
    warehouseGate: { tile: [95, 31.6] }, // just outside the evidence compound's gate
  } as Record<string, { block?: string; kind?: 'building' | 'lot'; pick?: number; tile?: number[]; label?: string; color?: string }>,
  /** The river-cruise pier: planks out over the water [x, y, w, h]. */
  pier: [4, 107, 6, 3],
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
