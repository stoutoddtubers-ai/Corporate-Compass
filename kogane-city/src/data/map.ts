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
  roofHeight: 0.045,
  lampSpacing: 7, // tiles between street lamps
  /**
   * Story places. `block` is "column-row" of the city block (0-0 is top left; the two
   * canal blocks split into "3-1a"/"3-1b"). `pick` chooses the Nth biggest building or
   * car park in that block. `tile` pins a place to an exact spot instead.
   */
  places: {
    prison: { block: '2-3', kind: 'building', pick: 0, label: 'KOGANE\nDETENTION CENTER' },
    asagiri: { tile: [46, 79] }, // Hozuki-mon gate, over the road into the old town
    ramen: { block: '0-3', kind: 'building', pick: 1, label: 'SAKAMAKI\nRAMEN' },
    shop1: { block: '0-3', kind: 'building', pick: 2, label: 'CERAMICS' },
    shop2: { block: '0-3', kind: 'building', pick: 3, label: 'TEA' },
    shop3: { block: '0-3', kind: 'building', pick: 4, label: 'TOFU' },
    shotengai: { block: '0-3', kind: 'lot', pick: 0 },
    arcade: { block: '1-3', kind: 'building', pick: 0, label: 'ARCADE' },
    bathhouse: { block: '0-2', kind: 'building', pick: 0, label: 'BATHHOUSE' },
    hospital: { block: '1-2', kind: 'building', pick: 0, label: '病院\nHOSPITAL', color: '#b04a4a' },
    policeBox: { block: '1-2', kind: 'building', pick: 3, label: '交番\nKŌBAN', color: '#2f5fa8' },
    garage: { block: '2-2', kind: 'building', pick: 0, label: "GORO'S\nGARAGE" },
    spray: { block: '2-2', kind: 'lot', pick: 0 },
    railyard: { block: '3-1a', kind: 'lot', pick: 0, label: 'RAIL YARD' },
    raceStart: { tile: [100, 5.5] }, // K-Route, north side
    catArcade: { block: '0-0', kind: 'building', pick: 0, label: 'ARCADE\n=^.x.^=' },
    hideout: { block: '1-1', kind: 'building', pick: 0, label: 'CAPSULE HOTEL' },
    ambush: { tile: [47, 22] },
    canalLot: { block: '3-1b', kind: 'lot', pick: 0 }, // Sawada's canal-side lot, two blocks from the container yard
    containerYard: { block: '3-3', kind: 'lot', pick: 0, label: 'CONTAINER YARD' },
    warehouse: { block: '2-0', kind: 'lot', pick: 0, label: 'KMPD EVIDENCE' },
    truck: { block: '3-0', kind: 'lot', pick: 0 },
    pier: { tile: [10.5, 108] },
  } as Record<string, { block?: string; kind?: 'building' | 'lot'; pick?: number; tile?: number[]; label?: string; color?: string }>,
  colors: {
    wall: '#2a231f', road: '#2b2a2e', kroad: '#38373c', bridge: '#4a4640', lot: '#3d3a3a', alley: '#353232',
    water: '#1d3a4a', waterLight: '#2a4f62', planks: '#6e5a48',
    laneLine: '#c9a84a', kLine: '#e8e8e8', crossing: '#d8d2c4', lanternRed: '#d8343a',
  },
} as const;
