import type { InteriorDef } from './interiors';

// Rooms used by the side missions. Same text-map format as data/interiors.ts (the legend is at the top of that file).
// (The side stories also use the shared rooms, the capsule hotel and Mama Rei's bar, and Act 2's Club Mirage.)

export const INTERIORS_SIDE: Record<string, InteriorDef> = {
  // ----- Daigo's Road -----
  // The Raijin clubhouse: rows of bikes (crates), one bay left empty. 1 = Kenta, 2 = where Jun stands / lays the parts out
  raijinClub: {
    name: 'RAIJIN CLUBHOUSE', floor: 'concrete', wall: '#6a4a8a', light: { color: 0xd9a0ff, alpha: 0.06 },
    map: [
      '######################',
      '#LLLL....TT....SSSSSS#',
      '#....................#',
      '#.KK..KK..KK.....1...#',
      '#................2...#',
      '#.KK..KK.............#',
      '#....................#',
      '#.TT.................#',
      '#....................#',
      '##########DD##########',
    ],
  },
  // Bones Tamura's three chop shops. In each: 1 = the part, 2 and 3 = the workers (4 = Bones himself)
  chopCanal: {
    name: 'CHOP SHOP', floor: 'concrete', light: { color: 0xffb060, alpha: 0.07 },
    map: [
      '################',
      '#SSSS....KK..LL#',
      '#........KK....#',
      '#.TT.2.........#',
      '#.TT......1....#',
      '#......3.......#',
      '#..KK..........#',
      '#..............#',
      '######DD########',
    ],
  },
  chopRail: {
    name: 'CHOP SHOP', floor: 'concrete', light: { color: 0xffb060, alpha: 0.07 },
    map: [
      '##################',
      '#LL..KKKK....SSSS#',
      '#................#',
      '#..2....TT.......#',
      '#.......TT..1....#',
      '#..3.............#',
      '#............KK..#',
      '#................#',
      '#######DD#########',
    ],
  },
  bonesGarage: {
    name: "BONES'S GARAGE", floor: 'concrete', light: { color: 0xffb060, alpha: 0.07 },
    map: [
      '####################',
      '#SSSS....1.....LLLL#',
      '#..................#',
      '#.KK....4......TT..#',
      '#.KK...........TT..#',
      '#......2....3......#',
      '#.TT...............#',
      '#.TT.......KK......#',
      '#..................#',
      '#########DD#########',
    ],
  },

  // ----- Building 41 -----
  // The quiet izakaya in Asagiri where Mr. Endō waits. 1 = Jun's table
  izakaya: {
    name: 'IZAKAYA', floor: 'wood', light: { color: 0xffc090, alpha: 0.1 },
    map: [
      '################',
      '#CCCCCCCCCC..LL#',
      '#n.............#',
      '#..............#',
      '#.TT..TT..TT...#',
      '#.TT..TT..TT.1.#',
      '#..............#',
      '######DD########',
    ],
  },
  // Tetsugawa station's locker hall. 1 = Endō's locker, 2 = where Jun stands by him,
  // 3 = the far end of the hall (Kuroda's men come in there and by the door)
  stationHall: {
    name: 'TETSUGAWA STATION', floor: 'lino', light: { color: 0xe0ecff, alpha: 0.05 },
    map: [
      '############################',
      '#LLLLLLLL....LLLLLLLL..TTTT#',
      '#....1.....................#',
      '#....2.....................#',
      '#..........................#',
      '#.TT....TT....KK....TT.....#',
      '#..........................#',
      '#.......................3..#',
      '#..........................#',
      '######DD####################',
    ],
  },
  // The half-built Kogane 2040 tower: three floors of bare concrete and building materials, then the open top floor.
  // On each floor 1 = the foot of the stairs up, 2 and 3 = site security.
  towerF1: {
    name: 'TOWER SITE · FLOOR 1', floor: 'concrete', wall: '#8a8d92', light: { color: 0xffe0a0, alpha: 0.05 },
    map: [
      '########################',
      '#>.....#......KK....SSS#',
      '#.1....#......KK.......#',
      '#..KK..#...............#',
      '#..KK......TT......KK..#',
      '#..........TT......KK..#',
      '#......#...............#',
      '#......#....2.....3....#',
      '#......#...............#',
      '###########DD###########',
    ],
    stairs: { '>': 'towerF2:<' },
  },
  towerF2: {
    name: 'TOWER SITE · FLOOR 2', floor: 'concrete', wall: '#8a8d92', light: { color: 0xffe0a0, alpha: 0.05 },
    map: [
      '########################',
      '#SSS....KK.....#.....>.#',
      '#.......KK.....#....1..#',
      '#..............#.......#',
      '#...TT.....2...........#',
      '#...TT.................#',
      '#..............#..KK...#',
      '#.<.......3....#..KK...#',
      '#..............#.......#',
      '########################',
    ],
    stairs: { '<': 'towerF1:>', '>': 'towerF3:<' },
  },
  towerF3: {
    name: 'TOWER SITE · FLOOR 3', floor: 'concrete', wall: '#8a8d92', light: { color: 0xffe0a0, alpha: 0.05 },
    map: [
      '########################',
      '#.<....#...KK......SSS.#',
      '#......#...KK..........#',
      '#......#.......2.......#',
      '#..............TT......#',
      '#..KK..........TT......#',
      '#..KK..#...............#',
      '#......#....3.....1.>..#',
      '#......#...............#',
      '########################',
    ],
    stairs: { '<': 'towerF2:>', '>': 'towerTop:<' },
  },
  // The bare top floor ("no walls yet"). Kuroda backs away 1 -> 2 -> 3 and is cornered at 3;
  // 5 = where more security comes up the stairs. Keep the straight lines 1-2 and 2-3 clear of crates.
  towerTop: {
    name: 'TOWER SITE · TOP FLOOR', floor: 'concrete', wall: '#5a6068', light: { color: 0x90a8d8, alpha: 0.1 },
    map: [
      '##########################',
      '#3.......KK...........1..#',
      '#........KK..............#',
      '#.................TT.....#',
      '#........................#',
      '#....SS..................#',
      '#............KK..........#',
      '#.<..5.......KK.......2..#',
      '#........................#',
      '##########################',
    ],
    stairs: { '<': 'towerF3:>' },
  },

  // ----- Old Debts -----
  // (Ice Machine plays in Act 2's Club Mirage room, data/interiors_act2.ts: its kitchen is spot 3)
  // Mrs. Tsuda's small apartment. 1 = Mrs. Tsuda, 2 = Jun at the table
  tsudaFlat: {
    name: "MRS. TSUDA'S APARTMENT", floor: 'tatami',
    map: [
      '############',
      '#BB....LLL.#',
      '#BB........#',
      '#....TT..1.#',
      '#.2..TT....#',
      '#..........#',
      '####DD######',
    ],
  },
  // Mibu's canal warehouse: his "collection" in crates, and the bell in the strongroom at the back.
  // 1 = just inside, 2 = the bell, 4 and 5 = guards on the floor, 6 and 7 = the bell's own guards
  mibuWarehouse: {
    name: "MIBU'S WAREHOUSE", floor: 'concrete', wall: '#7a4a52', light: { color: 0xffd0a0, alpha: 0.06 },
    map: [
      '##############################',
      '#KK....SSSS....KK.....#......#',
      '#KK...................#..2...#',
      '#......4.......KK.....#......#',
      '#..SSSS........KK............#',
      '#.....................#..6...#',
      '#..........KK....5....#..7...#',
      '#..SSSS....KK.........#KK....#',
      '#.....................#KK....#',
      '#.KK......1...........########',
      '#.KK.........................#',
      '#............................#',
      '############DD################',
    ],
  },
};

/** Street doors into those rooms: a story place (its door) -> a room above. */
export const DOORS_SIDE: { place: string; to: string }[] = [
  { place: 'raijinClubhouse', to: 'raijinClub' },
  { place: 'srChopCanal', to: 'chopCanal' },
  { place: 'srChopRail', to: 'chopRail' },
  { place: 'srBones', to: 'bonesGarage' },
  { place: 'sgIzakayaDoor', to: 'izakaya' },
  { place: 'sgStation', to: 'stationHall' },
  { place: 'sgTower', to: 'towerF1' },
  { place: 'skTsuda', to: 'tsudaFlat' },
  { place: 'skMibuWarehouse', to: 'mibuWarehouse' },
];
