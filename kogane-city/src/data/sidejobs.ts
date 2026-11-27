// Side jobs and lucky cats (bible: "Side activities", "Collectibles", "Income").
// Every number and every word the repeatable jobs use is in this file.
//   (bible)      taken from the game bible
//   (script)     already used by the story missions, reused here unchanged
//   PLACEHOLDER  a first guess: change it to tune the game
// Distances are in pixels (one tile = 32), speeds in pixels per second, times in seconds.
import { MISSION_BARKS, MISSION_TUNING } from './missions';

export const SIDE_JOBS = {
  /** Rules every job shares. */
  common: {
    startRadius: 30, // PLACEHOLDER: how close to a teal ring's centre starts a job on foot
    startRadiusCar: 44, // PLACEHOLDER: the same, in a vehicle
    startMaxSpeed: 80, // PLACEHOLDER: a vehicle must be slower than this to start a job (pull up, don't drive through)
    labelRange: 150, // PLACEHOLDER: the job's name shows on the hint line this close to its ring
    cooldown: 4, // PLACEHOLDER: seconds after a job ends before another can start
    leaveTime: 10, // PLACEHOLDER: seconds out of the job's vehicle before the job fails
    cardTime: 3.2, // seconds the result card stays up (script: same as mission cards)
  },

  /** Ramen delivery (bible: "Scooter runs; every bump spills soup and cuts the tip"). */
  ramen: {
    unlockAfter: 2, // (script) missions finished: HOT SOUP ends with "Side job unlocked: Ramen delivery"
    startOffset: [30, 64], // PLACEHOLDER: the start ring, from the shop door (beside it, clear of the mission ring)
    deliveries: 3, // (script) mission 2 has three
    /** Where customers can be: place ids from data/map.ts. PLACEHOLDER list. The words for each are in SIDE_TEXT.ramen.places. */
    places: ['arcade', 'bathhouse', 'policeBox', 'hospital', 'temple', 'garage', 'hideout', 'prison'],
    minDistance: 400, // PLACEHOLDER: customers are at least this far from the shop
    dropRadius: 40, // (script) as mission 2
    dropMaxSpeed: 140, // (script) as mission 2: slow down to hand the soup over
    returnRadius: 40, // (script) as mission 2
    tip: MISSION_TUNING.deliveryTip, // yen for a delivery with nothing spilled (shared with mission 2; PLACEHOLDER there)
    spillPerImpact: MISSION_TUNING.spillPerImpact, // the soup rules are mission 2's
    spillPerSlip: MISSION_TUNING.spillPerSlip,
    spillSlipMin: MISSION_TUNING.spillSlipMin,
    spillMinImpact: 40, // (script) as mission 2: bumps softer than this spill nothing
    tipGoodBelow: 0.1, // (script) as mission 2: spilled less than this -> the "not a drop" line
    tipOkBelow: 0.5, // (script) as mission 2: up to this -> "bit of a splash"; more -> "wet bowl"
    customerStays: 5, // PLACEHOLDER: seconds a customer stands there after being served
  },

  /** Taxi (bible: "Timed fares with quirky passengers"; side jobs pay ¥1,000-15,000 per run, with streak bonuses). */
  taxi: {
    unlockAfter: 1, // PLACEHOLDER: missions finished (1 = as soon as the city opens up)
    /** Taxi ranks: each is put on the stretch of road nearest this place (ids from data/map.ts). PLACEHOLDER list. */
    ranks: ['asagiri', 'catArcade', 'garage', 'pachinko', 'scramble', 'centralStation', 'rokkakuTower'],
    rankSpan: [0.25, 0.75], // PLACEHOLDER: a rank sits in this middle part of its road, clear of the junctions
    /** Which vehicles can be a taxi (the `shape` in data/vehicles.ts): anything with four wheels. PLACEHOLDER */
    vehicles: ['car', 'sports', 'police', 'truck'],
    riverOpensAfter: 8, // (script) the ankle tag dies in mission 8: before that, fares and ranks stay on the east bank
    faresPerRun: 5, // PLACEHOLDER: fares in one run
    pickupDistance: [300, 1000], // PLACEHOLDER: how far away the next passenger waits
    fareDistance: [1200, 3200], // PLACEHOLDER: how far a passenger wants to go
    laneStops: [0.25, 0.5, 0.75], // PLACEHOLDER: where along a road people can be picked up or dropped
    kerbOffset: 46, // PLACEHOLDER: from the middle of the lane to where the passenger stands on the pavement
    stopRadius: 44, // PLACEHOLDER: stop this close to the marker...
    stopSpeed: 60, // PLACEHOLDER: ...going slower than this
    baseTime: 10, // PLACEHOLDER: seconds on the clock for every leg...
    pace: 160, // PLACEHOLDER: ...plus one second for each `pace` px of road to cover
    baseFare: 1000, // (bible) the least a run pays
    farePerPx: 0.2, // PLACEHOLDER: yen added per px of the trip
    tipShare: 0.3, // PLACEHOLDER: the tip is up to this share of the fare, by how much of the clock is left
    bumpMin: 140, // PLACEHOLDER: a crash harder than this upsets the passenger
    bumpTipLoss: 0.25, // PLACEHOLDER: each crash costs this share of the tip
    bumpGap: 1, // PLACEHOLDER: seconds before the next crash counts
    streakBonus: 0.1, // PLACEHOLDER: each fare in a row pays this much more (bible: "streak bonuses")
    runMax: 15000, // (bible) the most a run pays (with the numbers above, five perfect fares come to a little under this)
    passengerStays: 5, // PLACEHOLDER: seconds a passenger stands at the kerb after getting out
  },

  /** K-Route time trial: one lap of the east-bank ring, the mission 4 circuit. */
  race: {
    unlockAfter: 4, // (script) missions finished: THUNDER ROAD ends with "Side job unlocked: Expressway races"
    targetTime: 60, // PLACEHOLDER: seconds to beat
    prize: 6000, // PLACEHOLDER: yen for beating it
    bonusPerSecond: 200, // PLACEHOLDER: yen for each whole second left on the clock
    checkpointRadius: MISSION_TUNING.raceCheckpointRadius, // (script) as mission 4
    markerRadius: 60, // (script) as mission 4
  },

  /** Lucky cats (bible: 100 of them; every 10 found gives a reward). */
  cats: {
    count: 100, // (bible)
    seed: 2207, // PLACEHOLDER: the same seed always gives the same 100 places; change it to move them all (saves remember cats by number, so settle it before release)
    reward: 500, // PLACEHOLDER: yen for each cat
    rewardEvery: 10, // (bible) "every 10 found gives a reward"
    rewardBonus: 5000, // PLACEHOLDER: that reward, in yen
    allBonus: 100000, // PLACEHOLDER: yen for all of them (bible: the real prize is the Golden Kitsune pistol)
    collectRadius: 18, // PLACEHOLDER: walk this close to pick one up
    /** How the cats are shared between kinds of hiding place. PLACEHOLDER */
    share: { alley: 0.5, carPark: 0.3, sidewalk: 0.2 },
    roadClear: 2, // PLACEHOLDER: alley and car-park cats are at least this many tiles from any road
    spacing: 6, // PLACEHOLDER: tiles between two cats, at least
    glintRange: 240, // PLACEHOLDER: a sparkle shows above a cat (even through a building) when you are this close
    /** PLACEHOLDER art: the cat is drawn from plain shapes in these colours until it has a sprite. */
    colors: { body: 0xf4f0e6, line: 0x2a231f, collar: 0xd8343a, coin: 0xe8b923, glow: 0xe8b923 },
  },
} as const;

/** Words on screen. NEW = written for the side jobs, not yet in the script doc. */
export const SIDE_TEXT = {
  common: {
    complete: '{job} — COMPLETE', // (script) UI_MISSION_PASS
    failed: '{job} — FAILED', // NEW
    needCar: '{job}: bring a car.', // NEW: hint when you stand in a ring that needs a car
    paid: '+¥{amount}', // NEW: floats over the taxi
    failTime: 'Out of time.', // NEW
    failVehicle: 'Vehicle lost.', // NEW
    failLeft: 'You left the vehicle.', // NEW
    clock: 'TIME', // NEW: the countdown's label (taxi, time trial)
  },
  ramen: {
    name: 'Ramen delivery', // (script) HOT SOUP card
    /** The objective for each place in SIDE_JOBS.ramen.places. */
    places: {
      arcade: 'Deliver to the arcade.', // (script) mission 2
      bathhouse: 'Deliver to the bathhouse.', // (script) mission 2
      policeBox: 'Deliver to the police box.', // (script) mission 2
      hospital: 'Deliver to the hospital.', // NEW
      temple: 'Deliver to the old temple.', // NEW
      garage: "Deliver to Goro's Garage.", // NEW
      hideout: 'Deliver to the capsule hotel.', // NEW
      prison: 'Deliver to the detention center.', // NEW
    } as Record<string, string>,
    hint: 'The spill meter fills with bumps, crashes and hard turns.', // (script) mission 2
    back: 'Return to the shop.', // (script) mission 2
    meter: 'SOUP SPILLED', // (script) the mission 2 meter's label
    tipGood: MISSION_BARKS.m02TipGood, // (script) the customer's line, by how much was spilled
    tipOk: MISSION_BARKS.m02TipOk,
    tipBad: MISSION_BARKS.m02TipBad,
    result: 'Tips ¥{amount}', // NEW
  },
  taxi: {
    name: 'Taxi', // (bible)
    pickUp: 'Pick up the fare.', // NEW
    dropOff: 'Drop off the fare.', // NEW
    count: 'Fare {n} of {max}', // NEW
    result: '{n} fares · ¥{amount}', // NEW
    // Passengers say the script's pedestrian lines (data/ai.ts): "calm" getting in, "panic" in a crash, "react" when time runs out.
  },
  race: {
    name: 'K-Route time trial', // NEW (the script's card calls the unlock "Expressway races")
    objective: 'Lap the K-Route in {time}s.', // NEW
    checkpoint: 'CHECKPOINT {n}/{max}', // (script) mission 4's wording
    result: '{time}s · ¥{amount}', // NEW
  },
  cats: {
    found: 'Lucky cat {n}/{max}  +¥{amount}', // NEW: floats over Jun
    milestone: 'LUCKY CATS {n}/{max}', // NEW: card every 10 cats
    all: 'ALL {max} LUCKY CATS FOUND', // NEW: card for the last one
    bonus: '+¥{amount}', // NEW: the card's second line
  },
} as const;

/** Fills the {words} in a line of SIDE_TEXT. */
export function sideText(line: string, vars: Record<string, string | number> = {}): string {
  return line.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
