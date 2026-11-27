// Heat (wanted level) numbers, lanterns 1-3 for Milestone 1. From the bible's Heat table
// unless marked PLACEHOLDER.
export const HEAT = {
  maxLevel: 4,
  /** Killing this many officers in one chase brings the riot police (4 lanterns). */
  copKillsForRiot: 3,
  lanternSlots: 5, // the full game has 5 lanterns
  /** Lantern level each crime raises you to. (bible "Triggered by") */
  crimes: { river: 3, tagDead: 4, copKiller: 4, runRed: 1, punch: 1, breakIn: 1, carjack: 2, assault: 2, hitOfficer: 2, kill: 3, sustainedFire: 3 },
  sustainedFire: { shots: 12, window: 6 }, // PLACEHOLDER: 12 witnessed shots in 6 s
  witnessRadius: 380, // PLACEHOLDER
  /** How to lose each level. (bible "How to lose it") needZone = must also be outside the circle. */
  lose: {
    1: { time: 15, needZone: false },
    2: { time: 25, needZone: false },
    3: { time: 40, needZone: true },
    4: { time: 60, needZone: true },
  } as Record<number, { time: number; needZone: boolean }>,
  searchRadius: { 1: 260, 2: 340, 3: 420, 4: 520 } as Record<number, number>, // PLACEHOLDER
  /** Who comes. (bible "Who comes"; exact counts are PLACEHOLDER) */
  response: {
    1: { foot: 2, cars: 0, armed: false, roadblock: false },
    2: { foot: 1, cars: 2, armed: true, roadblock: false },
    3: { foot: 1, cars: 4, armed: true, roadblock: true },
    4: { foot: 3, cars: 5, armed: true, roadblock: true }, // riot police: SMGs (riot buses and shields come later)
  } as Record<number, { foot: number; cars: number; armed: boolean; roadblock: boolean }>,
  cop: {
    hp: 60, // "street grunts have 60 HP" (bible)
    speed: 138, // PLACEHOLDER, a touch slower than the player
    visionRange: 420,
    arrestRange: 26,
    arrestTime: 0.8,
    fireRange: 300,
    fireInterval: 0.7, // PLACEHOLDER: seconds between shots (uses Kitsune 9 damage)
    aimError: 7, // degrees
    weapon: 'kitsune9',
    riotWeapon: 'suzume', // 4 lanterns: SMGs (bible)
    riotFireInterval: 0.22,
    dropChance: 0.3, // "grunts drop their weapon 30% of the time" (bible)
  },
  spawnInterval: 1.5,
  spawnMinDist: 520,
  maxPoliceCars: 7,
  roadblockInterval: 20,
  roadblockDist: [450, 850],
} as const;
