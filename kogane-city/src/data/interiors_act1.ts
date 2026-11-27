import type { InteriorDef } from './interiors';

// Rooms used by the act1 missions. Same text-map format as data/interiors.ts (the legend is at the top of that file).
// (Act 1 also uses the shared rooms: the ramen shop, the arcade and the capsule hotel.)

export const INTERIORS_ACT1: Record<string, InteriorDef> = {
  // Goro's Garage (missions 3 and 8 open here): two bays of car parts, tool racks, a workbench.
  // 1 = Goro at his bench, 2 = the toolbox (Hikari's laptop in mission 8), 3 = where Jun stands
  goroGarage: {
    name: "GORO'S GARAGE", floor: 'concrete', wall: '#8f8a80', light: { color: 0xffc070, alpha: 0.07 },
    map: [
      '####################',
      '#LLLL..SSSSSS...TTT#',
      '#..............1...#',
      '#.KK...........TT..#',
      '#.KK..........2....#',
      '#..................#',
      '#.KK.....3.........#',
      '#.KK...........KK..#',
      '#..................#',
      '#########DD#########',
    ],
  },
  // The KMPD evidence warehouse (mission 8). South end: a locker room, the lobby and the desk
  // sergeant's office. North: the hall, with aisles of shelving.
  // 1 = shelf 14-C (the heist file), 2 = the box with the tip tape, 3 and 4 = the two guards,
  // 5 = the desk sergeant, 6 = just inside the door
  evidence: {
    name: 'KMPD EVIDENCE', floor: 'concrete', wall: '#9aa3ad', light: { color: 0xd8e8ff, alpha: 0.06 },
    map: [
      '##################################',
      '#SSSSSSSSSSSS...SSSSSSSSSSSSSSS.2#',
      '#................................#',
      '#.SSSSSSSSSS...SSSSSSSSSS..KK....#',
      '#................................#',
      '#.SSSSSSSSSS...SSSSSSSSSS..KK....#',
      '#.....4..........................#',
      '#.SSSSSSSSSS...SSSSSSSSSS..SSSSS.#',
      '#.1..............................#',
      '#.SSSSSSSSSS...SSSSSSSSSS..SSSSS.#',
      '#................................#',
      '#.SSSSSSSSSS...SSSSSSSSSS..SSSSS.#',
      '#......................3.........#',
      '############..####################',
      '#LLLL......#.......#CCCCCC.......#',
      '#..........#.......#.5...C.......#',
      '#..TT..............#.....C..TT...#',
      '#..TT......#.................TT..#',
      '#..........#...6...#.............#',
      '############..DD..################',
    ],
  },
};

/** Street doors into those rooms: a story place (its door) -> a room above. */
export const DOORS_ACT1: { place: string; to: string }[] = [
  { place: 'garage', to: 'goroGarage' },
  { place: 'evidence', to: 'evidence' },
];
