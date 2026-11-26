// Pedestrian and traffic numbers. All PLACEHOLDER tuning unless noted.
// Bark lines are copied from the Script and Writing doc ("World text" tab).
export const PEDS = {
  count: 14,
  hp: 60,
  walkSpeed: 45,
  fleeSpeed: 135,
  fleeTime: 5,
  respawnDelay: 6,
  calmBarkChance: 0.004, // per pedestrian, per second-ish tick
  cashDrop: [200, 1500],
  archetypes: [
    { id: 'salaryman', color: 0x9aa7c7, calm: 'Late again…', panic: 'Not on a Tuesday!', react: 'My boss will never believe this.' },
    { id: 'student', color: 0xc79ac2, calm: 'Is that a real gun?', panic: 'Run, run, run!', react: 'This is going viral.' },
    { id: 'grandmother', color: 0xc7b89a, calm: 'Young people these days.', panic: 'Not my groceries!', react: "I'll tell your mother!" },
    { id: 'rider', color: 0x9ac7a4, calm: 'Coming through!', panic: 'My order!', react: 'Five stars if you stop shooting.' },
    { id: 'builder', color: 0xd6b25a, calm: 'Hard hats save lives.', panic: 'Everybody down!', react: 'Want some? Come on!' },
    { id: 'shopkeeper', color: 0x8fc0c9, calm: 'Welcome! Come in!', panic: 'Not the window!', react: "I'm calling the police! …Or the Kurogane." },
  ],
} as const;

export const TRAFFIC = {
  count: 8,
  cruiseSpeed: 150,
  junctionSpeed: 95,
  panicMult: 1.7, // "panics at gunfire" (bible)
  panicTime: 4,
  spawnInterval: 2,
  lookAhead: 70,
  stopBeforeLine: 44,
  /** Traffic light timings in seconds. */
  light: { green: 6, yellow: 1.5, allRed: 1 },
  sportsChance: 0.2,
} as const;

export const PARKED = { perLot: 2 } as const;

export const PICKUPS = {
  weaponRespawn: 20,
  ammoMags: 4, // magazines of ammo a weapon pickup gives
} as const;
