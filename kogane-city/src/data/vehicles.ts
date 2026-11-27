// Vehicle numbers. The 1-10 ratings are from the bible's roster; the px values are
// PLACEHOLDER tuning derived from them. Change these to change how cars feel.
export interface VehicleDef {
  id: string;
  name: string;
  rating: { speed: number; handling: number; toughness: number };
  maxSpeed: number; // px/s
  accel: number; // px/s^2
  brake: number;
  reverseSpeed: number;
  turnRate: number; // radians/s at full lock
  grip: number; // how fast sideways sliding is killed (higher = grippier)
  driftGrip: number; // grip while the handbrake is held
  hp: number;
  mass: number; // heavier shoves lighter
  length: number;
  width: number;
  colors: number[];
  /** Which placeholder drawing to use. */
  shape: 'car' | 'sports' | 'police' | 'scooter' | 'bike' | 'truck';
  desc: string;
}

export const VEHICLES: Record<string, VehicleDef> = {
  sedan: {
    id: 'sedan', name: 'Hoshi Sedan', rating: { speed: 5, handling: 6, toughness: 5 },
    maxSpeed: 330, accel: 260, brake: 520, reverseSpeed: 120, turnRate: 2.6, grip: 9, driftGrip: 1.4,
    hp: 250, mass: 1.0, length: 46, width: 22,
    colors: [0x8fa3b8, 0xb8b08f, 0x7d9c84, 0xa98f8f, 0xd9d9d9, 0x17171c], shape: 'car',
    desc: "The most stolen car in Kogane, because it's the most parked.",
  },
  sports: {
    id: 'sports', name: 'Raiden Zenki', rating: { speed: 8, handling: 7, toughness: 4 },
    maxSpeed: 440, accel: 380, brake: 600, reverseSpeed: 130, turnRate: 3.0, grip: 10, driftGrip: 1.6,
    hp: 200, mass: 0.9, length: 44, width: 21,
    colors: [0xd8343a, 0xe8b923, 0x3aa0d8, 0x7a4ad8, 0x17171c], shape: 'sports',
    desc: '90s twin-turbo legend. Every owner swears theirs is the fast one.',
  },
  police: {
    id: 'police', name: 'KMPD Panda', rating: { speed: 7, handling: 7, toughness: 7 },
    maxSpeed: 410, accel: 340, brake: 600, reverseSpeed: 130, turnRate: 3.0, grip: 10, driftGrip: 1.6,
    hp: 350, mass: 1.1, length: 46, width: 22,
    colors: [0xf2f2f2], shape: 'police',
    desc: 'Black and white and fast all over.',
  },
};

VEHICLES.scooter = {
  id: 'scooter', name: 'Gensuki 50', rating: { speed: 3, handling: 9, toughness: 1 },
  maxSpeed: 215, accel: 240, brake: 480, reverseSpeed: 60, turnRate: 3.6, grip: 12, driftGrip: 3,
  hp: 70, mass: 0.3, length: 22, width: 10, colors: [0xe9e3d2], shape: 'scooter',
  desc: 'Fifty cc, one soup rack, infinite patience.',
};
VEHICLES.bike = {
  id: 'bike', name: 'Zokusha', rating: { speed: 7, handling: 7, toughness: 2 },
  maxSpeed: 400, accel: 360, brake: 560, reverseSpeed: 70, turnRate: 3.1, grip: 10, driftGrip: 2,
  hp: 90, mass: 0.4, length: 28, width: 10, colors: [0x5b2a8a], shape: 'bike',
  desc: 'Tall fairing, loud pipes, louder rider.',
};

VEHICLES.truck = {
  id: 'truck', name: 'Kotobuki Box Truck', rating: { speed: 4, handling: 3, toughness: 8 },
  maxSpeed: 290, accel: 200, brake: 420, reverseSpeed: 90, turnRate: 2.0, grip: 8, driftGrip: 2.5,
  hp: 420, mass: 1.7, length: 56, width: 24, colors: [0xe8e8e8, 0xd8b02a], shape: 'truck',
  desc: 'Delivers everything. Stops for nothing.',
};

/** Colour slots with a meaning. Random traffic never uses the black ones. */
export const BLACK_SEDAN = 5;
export const BLACK_SPORTS = 4;
export const WHITE_SEDAN = 4;

export const NITRO = {
  fillPerSecond: 0.35, // bar fills in about 3 s of drifting
  drainPerSecond: 0.4,
  speedMult: 1.3,
  accelMult: 1.8,
  driftMinSlip: 90, // sideways px/s that counts as a drift
  driftMinSpeed: 110,
};

export const CAR_DAMAGE = {
  smokeAt: 0.5, // smoke below 50% HP
  burnTime: 4, // fire, then explosion 4 s later (bible)
  explosionRadius: 120,
  explosionDamage: 150,
  crashMinSpeed: 140, // impacts slower than this do no damage
  crashScale: 0.15, // damage per px/s above that
  runOverMinSpeed: 70,
  runOverScale: 0.5, // damage to a person per px/s above 50
  wreckTime: 15, // seconds a burnt-out wreck stays
};

/** Fake speedometer: km/h shown per px/s. */
export const KMH_PER_PX = 0.4;
