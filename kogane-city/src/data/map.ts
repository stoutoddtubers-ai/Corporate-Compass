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
  playerStart: [34.5, 17.5],
  colors: {
    building: '#3a3d4d', roof: '#4b4f63', roofEdge: '#2b2d3a',
    road: '#24252b', walk: '#6d707b', lot: '#34363e',
    laneLine: '#8a7a3a', crossing: '#c9c9c9', policeBox: '#2f5fa8', hospital: '#b04a4a',
  },
} as const;
