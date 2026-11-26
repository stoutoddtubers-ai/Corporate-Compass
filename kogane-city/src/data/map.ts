// Layout of the Milestone 1 test block, in tiles (32 px each). 64 x 64 tiles.
// Roads are 4 tiles wide (one lane each way) with a 1-tile sidewalk on both sides.
// Traffic drives on the LEFT.
export const MAP = {
  /** First tile of each road band, used for both the vertical and the horizontal roads. */
  roadBands: [3, 30, 57],
  roadWidth: 4,
  /** First tile of each city block (blocks are blockSize x blockSize tiles). */
  blockOrigins: [8, 35],
  blockSize: 21,
  /** Buildings inside one block, as [x, y, width, height] in block tiles. Mirrored per block. */
  blockBuildings: [
    [0, 0, 9, 9],
    [11, 0, 10, 7],
    [0, 11, 7, 10],
    [9, 12, 12, 9],
  ],
  /** Open car park inside each block, same format. */
  blockLot: [11, 7, 10, 5],
  /** Tile coordinates (can be fractional) of special places. */
  policeBox: { tile: [27, 27, 2, 2], spawn: [29.5, 29.5], label: '交番 KŌBAN' },
  hospital: { tile: [35, 35, 2, 2], spawn: [34.5, 34.5], label: '病院 HOSPITAL' },
  /** How strongly rooftops slide away from the screen centre to fake height (the GTA 2 trick). */
  roofHeight: 0.045,
  lampSpacing: 7, // tiles between street lamps
  playerStart: [17.5, 11.5],
  /** Named places for the story, in tiles. `door` is where the marker sits; `sign` labels a roof. */
  places: {
    prison: { door: [17.5, 11.5], sign: [12.5, 12.5], label: 'KOGANE\nDETENTION CENTER' },
    asagiri: { door: [32, 46.5], sign: null, label: '' },
    ramen: { door: [40, 48.2], sign: [40, 52], label: 'SAKAMAKI\nRAMEN' },
    arcade: { door: [48, 23.5], sign: [52.5, 23.5], label: 'ARCADE' },
    bathhouse: { door: [15.6, 39.5], sign: [11.5, 39.5], label: 'BATHHOUSE' },
    policeBox: { door: [29.5, 29.5], sign: null, label: '' },
    garage: { door: [23.5, 48.2], sign: [23.5, 52], label: "GORO'S\nGARAGE" },
    spray: { door: [27, 46], sign: null, label: '' },
    railyard: { door: [42, 17], sign: [40, 11], label: 'RAIL YARD' },
  } as Record<string, { door: number[]; sign: number[] | null; label: string }>,
  colors: {
    // Asagiri palette (bible): warm wood, cream plaster, lantern red, warm amber light.
    wall: '#2a231f', road: '#2b2a2e', walk: '#8d8478', walkLine: '#766d62', lot: '#3d3a3a', kerb: '#b3aa9c',
    laneLine: '#c9a84a', crossing: '#d8d2c4', policeBox: '#2f5fa8', hospital: '#b04a4a',
    roofs: [
      { base: '#4a5661', line: '#3a444d', trim: '#6b7884' }, // grey kawara tiles
      { base: '#cdbf9f', line: '#b3a586', trim: '#e6dcc2' }, // cream plaster
      { base: '#7b5a41', line: '#644733', trim: '#9a765a' }, // warm wood
      { base: '#5a4a45', line: '#4a3c38', trim: '#7a6a62' }, // dark tile
    ],
    awnings: ['#b3312f', '#2f4a6b', '#d8c9a3', '#3f6b4a'],
    lanternRed: '#d8343a',
  },
} as const;
