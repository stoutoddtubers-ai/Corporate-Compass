import type { InteriorDef } from './interiors';

// Rooms used by the act2 missions. Same text-map format as data/interiors.ts (the legend is at the top of that file).
// The numbered spots are where the missions put people and point their markers (see systems/hooks_act2.ts).
// Mama Rei's bar, the Lucky 7 arcade, Golden Ball's hall and the Glitch hideout are the shared rooms in data/interiors.ts.

export const INTERIORS_ACT2: Record<string, InteriorDef> = {
  // ---------------------------------------------------------------- M09 Welcome to Hanabi-chō
  // Hanabi Florist: Mrs. Hana behind the counter, buckets of flowers on the shelves
  florist: {
    name: 'HANABI FLORIST', floor: 'wood', keeper: 'grandmother', light: { color: 0xffe0f0, alpha: 0.05 },
    map: [
      '##############',
      '#SSSSS..SSSSS#',
      '#............#',
      '#.TT..TT.....#',
      '#.TT..TT.CCCC#',
      '#...........n#',
      '#.....1......#',
      '#............#',
      '######DD######',
    ],
  },
  // Club Mirage: kitchen (top left), the bar, the dance floor with its speakers and booths, Kaz's office (top right)
  //   1 just inside the door   2 Kaz   3 kitchen   4 office   5, 6 the booths
  clubMirage: {
    name: 'CLUB MIRAGE', floor: 'carpet', wall: '#4a3a5a', light: { color: 0xe060ff, alpha: 0.1 },
    map: [
      '################################',
      '#KK.S.#.LLLLLLLLLL.....#.LL...K#',
      '#.....#.n..............#......K#',
      '#..3..#.CCCCCCCCCC.....#..TT.4.#',
      '#.........TT......TT...#..TT...#',
      '#.....#...TT......TT...##..#####',
      '#######........................#',
      '#.TT......................TT...#',
      '#.TT...PP....2.....PP.....TT...#',
      '#...5..PP..........PP....6.....#',
      '#.TT......................TT...#',
      '#.TT........1.............TT...#',
      '#..............................#',
      '#..............................#',
      '##############DD################',
    ],
  },
  // The Kurogane office: desks downstairs, and the rooftop where Saeko takes the envelope
  kuroganeOffice: {
    name: 'KUROGANE OFFICE', floor: 'wood',
    map: [
      '################',
      '#LLLL.....#...>#',
      '#.........#....#',
      '#.TT..TT.......#',
      '#.TT..TT..#....#',
      '#.........#..1.#',
      '#.........#....#',
      '######DD########',
    ],
    stairs: { '>': 'kuroganeRoof:<' },
  },
  kuroganeRoof: {
    name: 'A ROOFTOP ABOVE HANABI-CHŌ', floor: 'concrete', wall: '#6a6a70', light: { color: 0xff5a78, alpha: 0.1 },
    map: [
      '##################',
      '#<...........KK..#',
      '#............KK..#',
      '#.....1..........#',
      '#................#',
      '#..KK............#',
      '#................#',
      '##################',
    ],
    stairs: { '<': 'kuroganeOffice:>' },
  },

  // ---------------------------------------------------------------- M14 The Wakagashira
  // Voice Cave, ground floor: the front desk, room 1, and the stairs up
  //   1, 2 where the extra bodyguards wait
  voiceCave: {
    name: 'VOICE CAVE KARAOKE', floor: 'carpet', wall: '#3a3a5a', light: { color: 0x80a0ff, alpha: 0.08 },
    map: [
      '########################',
      '#LLLL....#......#.....>#',
      '#n.......#..TT..#......#',
      '#CCCCC...#..TT..#......#',
      '#........#......#......#',
      '#....1...##..####......#',
      '#......................#',
      '#.TT................2..#',
      '#.TT...................#',
      '#......................#',
      '##########DD############',
    ],
    stairs: { '>': 'voiceCave2:<' },
  },
  // the middle floor: both staircases at the west end, a long corridor, rooms 3 to 5 off it, and room 6 at the far end
  //   1 the landing   2 outside room 6   6 just inside room 6   7 Fujita
  voiceCave2: {
    name: 'VOICE CAVE — ROOMS 3 TO 6', floor: 'carpet', wall: '#3a3a5a', light: { color: 0x80a0ff, alpha: 0.08 },
    map: [
      '################################',
      '#<..#..TT....#..TT....#..TT....#',
      '#...#..TT....#..TT....#..TT....#',
      '#...#........#........#.....7..#',
      '#...###.########.######........#',
      '#.....................#........#',
      '#..1.................2..6......#',
      '#...###.########.######........#',
      '#...#........#........#..CCCC..#',
      '#...#..TT....#..KK.LL.#........#',
      '#>..#..TT....#..KK....#........#',
      '#...#........#........#........#',
      '################################',
    ],
    stairs: { '<': 'voiceCave:>', '>': 'voiceCaveTop:<' },
  },
  // the top floor: the stairs, a short corridor, and the VIP room (the couch along the back wall)
  //   1 Jun   2 the corridor   3 Mibu   4 the bodyguards at the door
  voiceCaveTop: {
    name: 'VOICE CAVE — VIP ROOM', floor: 'carpet', wall: '#5a2a3a', light: { color: 0xff5090, alpha: 0.1 },
    map: [
      '##########################',
      '#<..#.V..CCCCCCCC...LL...#',
      '#...#.......3...C........#',
      '#...#....TTTT...C....TT..#',
      '#.2...4..TTTT........TT..#',
      '#...#.........1..........#',
      '#...#....................#',
      '#...#....................#',
      '##########################',
    ],
    stairs: { '<': 'voiceCave2:>' },
  },

  // ---------------------------------------------------------------- M15 Fork in the Road
  // Tsukuyomi Tower, ground floor: the service corridor and kitchen down the west side (the service door is the way out),
  // the gala hall, and the service elevator in the top right corner (drawn as stairs; it goes to floor 9)
  //   1 just inside the service door   3, 4, 5 the three guests Jun serves
  tsukuGala: {
    name: 'TSUKUYOMI TOWER — GALA', floor: 'marble', light: { color: 0xfff0c0, alpha: 0.06 },
    map: [
      '##################################',
      '#LLLL.#....................#....>#',
      '#.....#....................#.....#',
      '#.KK..#..TT....TT....TT....#.....#',
      '#.KK..#..TT....TT....TT....##.####',
      '#.....#..........................#',
      '#.....#...........3..............#',
      '#SSS..#..........................#',
      '#.....#..TT....TT....TT....TT....#',
      '#.....#..TT....TT....TT....TT....#',
      '#.CC..#..........................#',
      '#.CC..#......4.............5.....#',
      '#.....#..........................#',
      '#..1.....TT....TT....TT....TT....#',
      '#.....#..TT....TT....TT....TT....#',
      '#.....#..........................#',
      '#.....#.....CCCCCCCCCCCC.........#',
      '#.....#..........................#',
      '##DD##############################',
    ],
    stairs: { '>': 'tsuku9:<' },
  },
  // Floor 9, executive archives: a corridor all the way round; inside it an office (west), a meeting room, the elevator
  // (bottom left), a second office (south) and the archive (east), whose only door is on the north corridor
  //   1 the landing outside the elevator   2-5 the corners the guards walk between   9 the safe behind the painting
  tsuku9: {
    name: 'TSUKUYOMI TOWER — FLOOR 9', floor: 'carpet', wall: '#c8c4bc', light: { color: 0xd8e4ff, alpha: 0.05 },
    map: [
      '##################################',
      '#2..............................3#',
      '#................................#',
      '#..############.########.######..#',
      '#..#LL......#.....#SSSS...SSSS#..#',
      '#..#........#.TTT.#...........#..#',
      '#..#..TT..S.#.TTT.#.SSSS.SSSS.#..#',
      '#.....TT..S.#.TTT.#...........#..#',
      '#..#........#.....#.SSSS.SSSS.#..#',
      '#..#.CCCC...#.....#..........9#..#',
      '#..#........#.LLL.#.SSSS.SSSS.#..#',
      '#..################...........#..#',
      '#..#...#.TT....S..#.LLLL.KK...#..#',
      '#.1..<.#.TT....S..#...........#..#',
      '#..#...#..........#.TT....LLL.#..#',
      '#..#########.##################..#',
      '#................................#',
      '#5..............................4#',
      '#................................#',
      '##################################',
    ],
    stairs: { '<': 'tsukuGala:>' },
  },

  // ---------------------------------------------------------------- M10 and M16: the Kurogane mansion
  // Top: the stairs to the roof, Genzō's room (futon, the garden window), a store room. A corridor runs under them.
  // Middle: a reception room (west) and the garden, with rocks to shelter behind, out to the east wall.
  // Bottom: the entrance hall.
  //   4 the entrance hall   5, 6 the east wall   7 outside Genzō's door   8 Genzō   9 where Jun stands in his room
  mansion: {
    name: 'KUROGANE MANSION', floor: 'tatami', wall: '#e0d8c4',
    map: [
      '##################################',
      '#>...#.LL....BB.....TT.#SS..KK..S#',
      '#....#.......BB.....TT.#........S#',
      '#....#...9.............#..TT....S#',
      '#....#.............8...#..TT.....#',
      '#....#.................#.........#',
      '##.########.##############.#######',
      '#.........7......................#',
      '#................................#',
      '#########....KK.......KK.........#',
      '#.TT....#....KK.......KK........5#',
      '#.TT.............................#',
      '#.......#..........TT............#',
      '#.CCCC..#....KK....TT...KK......6#',
      '#LLLL...#....KK.........KK.......#',
      '#########........................#',
      '#................................#',
      '#.SS.........4..............LLLL.#',
      '#................................#',
      '################DD################',
    ],
    stairs: { '>': 'mansionRoof:<' },
  },
  mansionRoof: {
    name: 'KUROGANE MANSION — ROOF', floor: 'concrete', wall: '#6a6a70', light: { color: 0x8090b0, alpha: 0.12 },
    map: [
      '####################',
      '#<.................#',
      '#.....KK...........#',
      '#.....KK......1....#',
      '#..................#',
      '#..................#',
      '####################',
    ],
    stairs: { '<': 'mansion:>' },
  },
};

/** Street doors into those rooms: a story place (its door) -> a room above. */
export const DOORS_ACT2: { place: string; to: string }[] = [
  { place: 'florist', to: 'florist' },
  { place: 'clubMirage', to: 'clubMirage' },
  { place: 'saekoOffice', to: 'kuroganeOffice' },
  { place: 'karaoke', to: 'voiceCave' },
  { place: 'towerService', to: 'tsukuGala' },
  { place: 'mansion', to: 'mansion' },
];
