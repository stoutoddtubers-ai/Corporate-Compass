import type { InteriorDef } from './interiors';

// Rooms used by the act3 missions. Same text-map format as data/interiors.ts (the legend is at the top of that file).
// The numbers in each map are spots the missions use; what each one is for is noted beside the room.

// Tsukuyomi Tower has forty floors. Each room below stands for five of them, and the eight rooms are
// drawn from three floor plans. On every plan Jun arrives at "<" and the way up is ">";
// 1-4 are where the guards stand, 5 is a spot beside a desk.

/** An open-plan office: rows of desks. */
const OFFICE_FLOOR = [
  '########################',
  '#<.....................#',
  '#....TT..TT..TT..TT....#',
  '#....TT..TT..TT..TT....#',
  '#..........1.........2.#',
  '#................5.....#',
  '#....TT..TT..TT..TT....#',
  '#....TT..TT..TT..TT....#',
  '#.3..................4.#',
  '#..LLLL........SSSS...>#',
  '#......................#',
  '########################',
];
/** A corridor with meeting rooms off it. */
const MEETING_FLOOR = [
  '########################',
  '#>..#......#.....#.....#',
  '#...#..TT..#.TT..#..1..#',
  '#...#..TT..#.TT..#.....#',
  '#...##.#####.#####.##..#',
  '#......................#',
  '#..5......2.....3......#',
  '#...##.#####.#####.##..#',
  '#...#..CC..#.SS..#.....#',
  '#<..#......#.SS..#..4..#',
  '#...#......#.....#.....#',
  '########################',
];
/** Server racks and archive shelves. */
const SERVER_FLOOR = [
  '########################',
  '#.....................>#',
  '#..SS.SS.SS..SS.SS.SS..#',
  '#..SS.SS.SS..SS.SS.SS..#',
  '#......1.....2.........#',
  '#..SS.SS.SS..SS.SS.SS..#',
  '#..SS.SS.SS..SS.SS.SS..#',
  '#..........3.........4.#',
  '#..KK...5.......KK.....#',
  '#<.....................#',
  '#......................#',
  '########################',
];
const TSUKUYOMI_LIGHT = { color: 0xd8e8ff, alpha: 0.05 };

export const INTERIORS_ACT3: Record<string, InteriorDef> = {
  // ---------------------------------------------------------------- Mission 17: the harbour office
  // Ground floor. 1: a dockhand keeps an eye on the stairs. The stairs up are in the far corner.
  harbourOffice: {
    name: 'HARBOUR OFFICE', floor: 'lino',
    map: [
      '####################',
      '#LLLL....#SSSSSS..>#',
      '#........#.........#',
      '#..TT.......SSSSS..#',
      '#..TT....#.........#',
      '#........#..SSSSS..#',
      '#CCCCC...#.........#',
      '#....C...#.....1...#',
      '#..................#',
      '####DD##############',
    ],
    stairs: { '>': 'harbourRecords:<' },
  },
  // Second floor: the records room. 1: where the paper manifests are kept.
  harbourRecords: {
    name: 'HARBOUR OFFICE', floor: 'wood',
    map: [
      '################',
      '#SSSSSS..SSSSS<#',
      '#..............#',
      '#.TT..SS..SS...#',
      '#.TT..SS..SS...#',
      '#..............#',
      '#1.LLLL...TT...#',
      '#..............#',
      '################',
    ],
    stairs: { '<': 'harbourOffice:>' },
  },

  // ---------------------------------------------------------------- Mission 18: the fish market hall
  // Rows of frozen tuna on trestles under hard white lights. 1: Hachirō. 2: the auctioneer. 3: the tuna knife, on the ice. 4: where Jun stands, just inside the door.
  fishHall: {
    name: 'FISH MARKET', floor: 'concrete', wall: '#c9d4d8', light: { color: 0xe8f6ff, alpha: 0.07 },
    map: [
      '############################',
      '#KK......................KK#',
      '#K...TTTT...TTTT...TTTT...3#',
      '#..........................#',
      '#.2..TTTT...TTTT...TTTT....#',
      '#..........................#',
      '#.............1............#',
      '#..........................#',
      '#....TTTT...TTTT...TTTT....#',
      '#..........................#',
      '#K...TTTT...TTTT...TTTT...K#',
      '#KK...4..................KK#',
      '#..........................#',
      '######DD####################',
    ],
  },

  // ---------------------------------------------------------------- Mission 20: Rokkaku Tower
  // The lobby. The service stairs are behind the partition on the right.
  rokkakuLobby: {
    name: 'ROKKAKU TOWER', floor: 'marble',
    map: [
      '######################',
      '#................#..>#',
      '#..TT....CCCC....#...#',
      '#..TT....C..C....#...#',
      '#....................#',
      '#................#...#',
      '#..LL........TT..#LL.#',
      '#............TT..#...#',
      '#....................#',
      '#########DD###########',
    ],
    stairs: { '>': 'rokkakuStairs:<' },
  },
  // The service stairwell. 1: where Jun leans against the wall after the party.
  rokkakuStairs: {
    name: 'SERVICE STAIRWELL', floor: 'concrete', light: { color: 0xd0d8e0, alpha: 0.03 },
    map: [
      '#########',
      '#>..#...#',
      '#...#.1.#',
      '#.......#',
      '#...#...#',
      '#<..#KK.#',
      '#...#...#',
      '#########',
    ],
    stairs: { '<': 'rokkakuLobby:>', '>': 'rokkakuTop:<' },
  },
  // The rooftop party. Jun comes up behind the coat racks on the right; the rail is the left side.
  // 1: where the coats go. 2: the middle of the party (the guests stand around it). 3 and 4: the two ends of Amane's walk along the rail.
  rokkakuTop: {
    name: 'ROKKAKU TOWER ROOFTOP', floor: 'wood', light: { color: 0xffd9a0, alpha: 0.08 },
    map: [
      '##########################',
      '#3...................#..<#',
      '#....CCCC....TT......#L..#',
      '#............TT......#L..#',
      '#.....................1..#',
      '#....TT..................#',
      '#....TT......2....TT.....#',
      '#.................TT.....#',
      '#....TT..................#',
      '#4...TT......CCCC........#',
      '#........................#',
      '##########################',
    ],
    stairs: { '<': 'rokkakuStairs:>' },
  },

  // ---------------------------------------------------------------- Mission 22: Mibu Tower
  // The lobby. 1-4: Mibu's men. 5: the reception desk (the intercom).
  mibuLobby: {
    name: 'MIBU TOWER', floor: 'marble', light: { color: 0xffe2b0, alpha: 0.05 },
    map: [
      '##########################',
      '#.......................>#',
      '#..1.....CCCCCC.....2....#',
      '#........C.5..C..........#',
      '#...##..........##.......#',
      '#...##..........##...LL..#',
      '#........................#',
      '#..TT....3.....4....TT...#',
      '#..TT...............TT...#',
      '#...##..........##.......#',
      '#........................#',
      '###########DD#############',
    ],
    stairs: { '>': 'mibuOffices:<' },
  },
  // The floors in between: Mibu Trading's offices. 1-5: Mibu's men.
  mibuOffices: {
    name: 'MIBU TRADING', floor: 'carpet', light: { color: 0xffe2b0, alpha: 0.05 },
    map: [
      '##########################',
      '#<...#.........#........>#',
      '#....#..TT.....#..TT.....#',
      '#....#..TT..1.....TT..2..#',
      '#..............#.........#',
      '#....#####..####..####...#',
      '#........................#',
      '#..3.......4.............#',
      '#....#####..####..####...#',
      '#....#..SS.....#..CC.....#',
      '#.......SS.....#......5..#',
      '#....#.........#.........#',
      '##########################',
    ],
    stairs: { '<': 'mibuLobby:>', '>': 'mibuPenthouse:<' },
  },
  // The penthouse. 1: where Jun walks in. 2: Mibu, behind his desk. 3, 4, 5: where his bodyguards come in.
  mibuPenthouse: {
    name: 'MIBU PENTHOUSE', floor: 'wood', light: { color: 0xffd090, alpha: 0.08 },
    map: [
      '##########################',
      '#<..#...............#...>#',
      '#...#...CCCC...TT...#....#',
      '#..3................5....#',
      '#...#...............#....#',
      '#...#..BB......KK...######',
      '#......BB......KK........#',
      '#..1.................2...#',
      '#...#.............CCCC...#',
      '#...#..TT....LL..........#',
      '#...#..TT....LL......4...#',
      '#...#....................#',
      '##########################',
    ],
    stairs: { '<': 'mibuOffices:>', '>': 'mibuRoof:<' },
  },
  // The roof. 1: the helicopter, on its pad. The crates by the stairs are the only cover.
  mibuRoof: {
    name: 'MIBU TOWER HELIPAD', floor: 'concrete', wall: '#8d9299', light: { color: 0x8090c0, alpha: 0.12 },
    map: [
      '######################',
      '#....................#',
      '#....................#',
      '#..KK................#',
      '#..KK................#',
      '#.............1......#',
      '#....................#',
      '#..KK................#',
      '#....................#',
      '#<...KK..............#',
      '#....................#',
      '######################',
    ],
    stairs: { '<': 'mibuPenthouse:>' },
  },

  // ---------------------------------------------------------------- Mission 23: Tsukuyomi Tower
  // The lobby. 1: just inside the doors. 2, 3, 4: the Yatagarasu on the door.
  tsukuLobby: {
    name: 'TSUKUYOMI TOWER', floor: 'marble', light: TSUKUYOMI_LIGHT,
    map: [
      '############################',
      '#.........................>#',
      '#...CCCCCCCC...............#',
      '#...C..2...C......##...4...#',
      '#.................##.......#',
      '#..........................#',
      '#..TT...##..........TT.....#',
      '#..TT...##....3.....TT.....#',
      '#..........................#',
      '#............1.............#',
      '#..........................#',
      '############DD##############',
    ],
    stairs: { '>': 'tsuku1a:<' },
  },
  // Floors 1-10 (the checkpoint for floor 10 is the landing where the next room begins)
  tsuku1a: { name: 'TSUKUYOMI TOWER · FLOORS 1-5', floor: 'carpet', light: TSUKUYOMI_LIGHT, map: OFFICE_FLOOR, stairs: { '<': 'tsukuLobby:>', '>': 'tsuku1b:<' } },
  tsuku1b: { name: 'TSUKUYOMI TOWER · FLOORS 6-10', floor: 'carpet', light: TSUKUYOMI_LIGHT, map: MEETING_FLOOR, stairs: { '<': 'tsuku1a:>', '>': 'tsuku2a:<' } },
  // Floors 11-20
  tsuku2a: { name: 'TSUKUYOMI TOWER · FLOORS 11-15', floor: 'concrete', light: TSUKUYOMI_LIGHT, map: SERVER_FLOOR, stairs: { '<': 'tsuku1b:>', '>': 'tsuku2b:<' } },
  tsuku2b: { name: 'TSUKUYOMI TOWER · FLOORS 16-20', floor: 'carpet', light: TSUKUYOMI_LIGHT, map: OFFICE_FLOOR, stairs: { '<': 'tsuku2a:>', '>': 'tsuku3a:<' } }, // 5: Ogata, under a desk
  // Floors 21-30
  tsuku3a: { name: 'TSUKUYOMI TOWER · FLOORS 21-25', floor: 'carpet', light: TSUKUYOMI_LIGHT, map: MEETING_FLOOR, stairs: { '<': 'tsuku2b:>', '>': 'tsuku3b:<' } },
  tsuku3b: { name: 'TSUKUYOMI TOWER · FLOORS 26-30', floor: 'concrete', light: TSUKUYOMI_LIGHT, map: SERVER_FLOOR, stairs: { '<': 'tsuku3a:>', '>': 'tsuku4a:<' } },
  // Floors 31-40
  tsuku4a: { name: 'TSUKUYOMI TOWER · FLOORS 31-35', floor: 'carpet', light: TSUKUYOMI_LIGHT, map: OFFICE_FLOOR, stairs: { '<': 'tsuku3b:>', '>': 'tsuku4b:<' } },
  tsuku4b: { name: 'TSUKUYOMI TOWER · FLOORS 36-40', floor: 'marble', light: TSUKUYOMI_LIGHT, map: MEETING_FLOOR, stairs: { '<': 'tsuku4a:>', '>': 'tsukuTop:<' } },
  // The top floor: Amane's office. 1: where Jun stops. 2: Amane, at the window. 3: where the ally comes in.
  tsukuTop: {
    name: 'TSUKUYOMI TOWER · TOP FLOOR', floor: 'marble', light: { color: 0xc0d8ff, alpha: 0.08 },
    map: [
      '########################',
      '#..........2...........#',
      '#......................#',
      '#.......CCCCCCCC.......#',
      '#......................#',
      '#..TT..............TT..#',
      '#..TT......1.......TT..#',
      '#......................#',
      '#<..3..........LLLL....#',
      '#......................#',
      '########################',
    ],
    stairs: { '<': 'tsuku4b:>' },
  },

  // ---------------------------------------------------------------- Mission 24: inside the Amaterasu Maru
  // (No street door: the story puts Jun aboard, and takes him back out on deck when the fight is over.)
  // The bridge deck. 1: where Jun comes in. 2: Tetsu. The stairs lead down to the hold.
  shipBridge: {
    name: 'AMATERASU MARU · BRIDGE DECK', floor: 'lino', wall: '#c8ccd2', light: { color: 0x90a8d0, alpha: 0.1 },
    map: [
      '##########################',
      '#......CCCCCCCCCCCC......#',
      '#........................#',
      '#..LL................LL..#',
      '#........................#',
      '#.1....TT........TT...2..#',
      '#......TT........TT......#',
      '#........................#',
      '#..KK................KK..#',
      '#..KK.......<........KK..#',
      '#........................#',
      '##########################',
    ],
    stairs: { '<': 'shipHold:>' },
  },
  // Below decks: the hold, stacked with the gold crates. 2: where Tetsu makes his stand.
  shipHold: {
    name: 'AMATERASU MARU · HOLD', floor: 'concrete', wall: '#5a6068', light: { color: 0xffd060, alpha: 0.07 },
    map: [
      '##########################',
      '#>......KK......KK.......#',
      '#.......KK......KK....KK.#',
      '#...KK................KK.#',
      '#...KK......KK...........#',
      '#...........KK......2....#',
      '#...KK...................#',
      '#...KK......KK....KK.....#',
      '#.......KK..KK....KK.....#',
      '#.......KK...............#',
      '#........................#',
      '##########################',
    ],
    stairs: { '>': 'shipBridge:<' },
  },
};

/** Street doors into those rooms: a story place (its door) -> a room above. */
export const DOORS_ACT3: { place: string; to: string }[] = [
  { place: 'harbourOffice', to: 'harbourOffice' },
  { place: 'fishMarket', to: 'fishHall' },
  { place: 'rokkakuTower', to: 'rokkakuLobby' },
  { place: 'mibuTower', to: 'mibuLobby' },
  { place: 'tsukuyomiTower', to: 'tsukuLobby' },
];
