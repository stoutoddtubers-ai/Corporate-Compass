// Building interiors. Each one is drawn as a small text map, one character per tile (32 px):
//
//   #  wall                      .  floor                    (space) nothing
//   D  the way out (a doormat)   <  >  stairs (see `stairs`)
//   C  counter    T  table       S  shelving     P  pachinko / arcade machine
//   B  bed        K  crate       L  lockers      V  vending machine (sells drinks)
//   $  the till: stand here to open the shop menu (see `till`)
//   z  where Jun sleeps: heals and saves
//   n  where the shopkeeper stands
//   1-9  named spots a mission can use. The game calls them "<interior id>:<character>",
//        e.g. the place "pachinko:2". "D", "$", "z", "n", "<" and ">" get names the same way.
//
// Counters, tables, machines and shelves stop people and bullets, so they work as cover.
// Rooms are stored out of sight south of the bay; a door moves Jun between street and room.

import { INTERIORS_ACT1, DOORS_ACT1 } from './interiors_act1';
import { INTERIORS_ACT2, DOORS_ACT2 } from './interiors_act2';
import { INTERIORS_ACT3, DOORS_ACT3 } from './interiors_act3';
import { INTERIORS_SIDE, DOORS_SIDE } from './interiors_side';

export type FloorKind = 'wood' | 'tatami' | 'lino' | 'carpet' | 'concrete' | 'marble';

export interface InteriorDef {
  /** Shown when you walk in. */
  name: string;
  floor: FloorKind;
  /** Wall colour (plaster by default). */
  wall?: string;
  map: string[];
  /** Where each staircase leads: "<" or ">" -> "<interior id>:<character>". */
  stairs?: Record<string, string>;
  /** What the till sells: 'hardware' = the Hachiman Hardware menu. */
  till?: 'hardware';
  /** A room with a 'z' bed is a place to sleep: it heals and saves. What a night costs (Jun's own room is free), and the name in the "Saved at ..." message. */
  bedPrice?: number;
  saveName?: string;
  /** Who stands at 'n' (a look from data/characters.ts; default: a shopkeeper). */
  keeper?: string;
  /** Colour and strength of the room's light (default: warm white). */
  light?: { color: number; alpha: number };
}

export const INTERIORS: Record<string, InteriorDef> = {
  // Sakamaki Ramen: the counter, four tables, and the stairs up to Jun's room
  ramen: {
    name: 'SAKAMAKI RAMEN', floor: 'wood', keeper: 'mika',
    map: [
      '################',
      '#CCCCCCCCC#...>#',
      '#n........#....#',
      '#..............#',
      '#.TT..TT.......#',
      '#.TT..TT..#..1.#',
      '#.........#....#',
      '######DD########',
    ],
    stairs: { '>': 'junRoom:<' },
  },
  // the room above the shop: the safehouse
  junRoom: {
    name: "JUN'S ROOM", floor: 'tatami', saveName: 'Sakamaki Ramen',
    map: [
      '###########',
      '#BB....LL<#',
      '#BB.......#',
      '#z....TT..#',
      '#.....TT.1#',
      '###########',
    ],
    stairs: { '<': 'ramen:>' },
  },
  // every konbini in the city is the same konbini
  konbini: {
    name: 'KONBINI', floor: 'lino', light: { color: 0xeaf4ff, alpha: 0.02 },
    map: [
      '##################',
      '#SSSSSS..SSSSSS.V#',
      '#...............V#',
      '#SSSSSS..SSSSSS..#',
      '#................#',
      '#SSSSSS..CCCCC...#',
      '#........n...C.1.#',
      '#######DD#########',
    ],
  },
  // Hachiman Hardware: tools in front, guns under the counter
  hardware: {
    name: 'HACHIMAN HARDWARE', floor: 'concrete', till: 'hardware',
    map: [
      '##################',
      '#LLLLLLLLLLLLLLLL#',
      '#................#',
      '#.SSSSS....SSSSS.#',
      '#................#',
      '#.SSSSS....SSSSS.#',
      '#................#',
      '#CCCCCCC.........#',
      '#n.....C.......1.#',
      '#...$............#',
      '########DD########',
    ],
  },
  // Golden Ball Pachinko: four double rows of machines and the cash office in the corner
  pachinko: {
    name: 'GOLDEN BALL PACHINKO', floor: 'carpet', light: { color: 0xffd0e8, alpha: 0.05 },
    map: [
      '##############################',
      '#LL....................#CCCCC#',
      '#......................#n...4#',
      '#..PPPPPPPP....PPPPPPPP......#',
      '#..PPPPPPPP....PPPPPPPP#######',
      '#............................#',
      '#..PPPPPPPP....PPPPPPPP......#',
      '#..PPPPPPPP....PPPPPPPP....1.#',
      '#............................#',
      '#..PPPPPPPP....PPPPPPPP......#',
      '#..PPPPPPPP....PPPPPPPP......#',
      '#2..........................3#',
      '#############DD###############',
    ],
  },
  // game arcades (Asagiri Arcade, the cat arcade, Lucky 7)
  arcade: {
    name: 'ARCADE', floor: 'carpet', light: { color: 0xc8b0ff, alpha: 0.08 },
    map: [
      '####################',
      '#PP.PP.PP.PP.PP.PPV#',
      '#.................V#',
      '#..PPPP....PPPP....#',
      '#..................#',
      '#..PPPP....PPPP..1.#',
      '#..................#',
      '#CCCC..............#',
      '#n..C..............#',
      '########DD##########',
    ],
  },
  // a small bar: Mama Rei's
  bar: {
    name: "MAMA REI'S", floor: 'wood', keeper: 'mama', light: { color: 0xffc090, alpha: 0.1 },
    map: [
      '############',
      '#LLLLLLLLLL#',
      '#n.........#',
      '#CCCCCCCC..#',
      '#..........#',
      '#.TT....1..#',
      '####DD######',
    ],
  },
  // capsule inns: a bed for the night in every district, so there is somewhere to save far from home
  inn: {
    name: 'CAPSULE INN', floor: 'lino', bedPrice: 2000, saveName: 'the capsule inn', light: { color: 0xfff0c8, alpha: 0.06 },
    map: [
      '##############',
      '#BB.BB.BB.BB.#',
      '#............#',
      '#BB.BB.BB..z.#',
      '#............#',
      '#CCCC......1.#',
      '#n..C........#',
      '#####DD#######',
    ],
  },
  // the capsule hotel the Glitch hide in: capsules down both sides, their desks at the back
  capsule: {
    name: 'CAPSULE HOTEL', floor: 'lino', light: { color: 0xb0f0ff, alpha: 0.08 },
    map: [
      '################',
      '#TTTT....TTTT.L#',
      '#.............L#',
      '#BB.BB....BB.BB#',
      '#..............#',
      '#BB.BB....BB.BB#',
      '#............1.#',
      '#CCC...........#',
      '#n.C...........#',
      '######DD########',
    ],
  },
  // the missions' own rooms (data/interiors_act1.ts and so on)
  ...INTERIORS_ACT1, ...INTERIORS_ACT2, ...INTERIORS_ACT3, ...INTERIORS_SIDE,
};

/** Which street doors lead where: a story place (its door) -> an interior above. Several doors may share one interior. */
export const DOORS: { place: string; to: string }[] = [
  { place: 'ramen', to: 'ramen' },
  { place: 'pachinko', to: 'pachinko' },
  { place: 'arcade', to: 'arcade' },
  { place: 'catArcade', to: 'arcade' },
  { place: 'lucky7', to: 'arcade' },
  { place: 'mamaRei', to: 'bar' },
  { place: 'hideout', to: 'capsule' },
  { place: 'hardwareAsagiri', to: 'hardware' }, { place: 'hardwareDenpa', to: 'hardware' }, { place: 'hardwareTetsugawa', to: 'hardware' },
  { place: 'hardwareHanabi', to: 'hardware' }, { place: 'hardwareMirai', to: 'hardware' }, { place: 'hardwareMarukane', to: 'hardware' },
  { place: 'hardwareRokkaku', to: 'hardware' }, { place: 'hardwareShiokaze', to: 'hardware' },
  ...DOORS_ACT1, ...DOORS_ACT2, ...DOORS_ACT3, ...DOORS_SIDE,
];

/** Numbers for the rooms. */
export const INTERIOR = {
  /** A konbini in every big block of the city (bible: "konbini on every corner"). */
  konbiniLabel: '24H\nKONBINI',
  /** One capsule inn in each district except Asagiri (home). */
  innLabel: 'CAPSULE\nINN',
  innSkip: ['asagiri'] as readonly string[],
  doorReach: 30, // px: how close to a door to use it
  /** Doors stay shut while the police are looking for you. */
  lockedAtHeat: 1,
  /** Heights, as multiples of a low fence (see MAP.roofHeight). */
  heights: { '#': 2.2, C: 0.7, T: 0.5, S: 1.5, P: 1.5, B: 0.3, K: 0.8, L: 1.8 } as Record<string, number>,
  /** Colours: [top, side]. */
  colors: {
    '#': ['#d9d0c0', '#a89f90'], C: ['#8a6844', '#5c4329'], T: ['#9a7a54', '#6a5238'], S: ['#7d8791', '#555d66'],
    P: ['#c8405e', '#7a2438'], B: ['#d8d4c8', '#8f8a7e'], K: ['#9a7a4c', '#6a5230'], L: ['#5f6f7c', '#3f4a54'],
  } as Record<string, string[]>,
  floors: { wood: '#7a5a3e', tatami: '#b5ae74', lino: '#c9cdd0', carpet: '#5a2f44', concrete: '#77787a', marble: '#d6d2ca' } as Record<FloorKind, string>,
  defaultLight: { color: 0xfff0d8, alpha: 0.04 },
} as const;
