import type { Mission, Line } from './missions';
import { VEHICLES, VehicleDef } from './vehicles';

// The twelve side stories, copied line for line from the Script and Writing doc ("Side stories" tab).
// Four chains of three: Daigo's Road (S-R), Building 41 (S-G), Old Debts (S-K), Sea Spirit (S-U).
// Text lives here; the game logic each mission needs is in src/systems/hooks_side.ts.
//
// Title cards: the script gives each side story a "Reward:" line instead of a CARD line, so the
// card is the mission's name + " — COMPLETE" (as in Act 1) with the Reward line under it.
// Times of day the script does not give are marked PLACEHOLDER.

const D = (text: string): Line => ({ who: '', text }); // stage direction

/** PLACEHOLDER numbers the script does not give (numbers the script does give are marked "script"). */
export const SIDE_TUNING = {
  reach: 28, // how close counts as "at the spot" on foot, px
  roomReach: 40, // the same, for a marked spot inside a room
  loadDist: 46, // how close to a truck to load something onto it
  /** Following without being spotted (same numbers as mission 7's courier). */
  tail: { seeDist: 300, footDist: 120, fillFar: 0.14, fillNear: 0.45, drain: 0.12, cruise: 125, dawdle: 45, farBehind: 700 },
  /** Shaking off cars that chase you. */
  lose: { dist: 620, time: 5 },

  // ----- S-R1 Borrowed Thunder -----
  sr1: { workers: 2, bonesHp: 120 },

  // ----- S-R2 Ghost Lap -----
  sr2: {
    riders: 30, // script: "Thirty Raijin bikes"
    ridersMin: 20, // script: "Keep at least 20 riders in the pack."
    leadHp: 400, // Jun's point car is tougher than a normal Zenki
    checkpointRadius: 180,
    gap: 70, rowGap: 46, colGap: 13, // the formation: distance behind Jun, between rows, and either side of his line
    riderSpeed: 330, // how fast riders can close up, px/s
    loseDist: 700, // a rider this far behind his place has lost the pack
    trailLen: 2400,
    jump: 300, // a bigger step than this in one frame means Jun was moved (respawn)
    /** Police cars sent at the pack: [checkpoint number that triggers them, how many]. With the roadblock that makes 11 (script: "Eleven cars"). */
    waves: [[1, 2], [3, 2], [7, 2], [10, 2]],
    roadblockCars: 3,
    copSpeed: 250,
    copTakes: 2, // riders one police car can knock down
    copCooldown: 0.5,
    hitDist: 34,
    flank: 64, // police come up the next lane over, this far from the pack's line
    cutIn: 170, // and turn into the column this close to the rider they picked
    blockAhead: 320, blockSide: 30, // a police car stops when Jun's car is this far ahead of it, in its lane
    copLife: 14, // seconds before a police car that missed gives up
    copStopHp: 0.6,
    cheerEvery: 8, // seconds between "For Daigo!"
    /** Checkpoint numbers that end each objective (of 14 round the ring). */
    phaseLead: 2, phaseKeep: 4, phaseRoadblock: 6,
  },

  // ----- S-R3 Last Run -----
  sr3: {
    record: 242, // script: Daigo's lap record, 4:02
    /**
     * The ring takes over two minutes at racing speed, so the lap clock runs faster than real
     * time: this many clock seconds per real second. A clean lap reads about 3:20, and each
     * thing left in Kenta's lane costs him about 8 seconds on the clock.
     */
    clockScale: 1.55,
    kentaSpeed: 300, cornerSpeed: 175,
    blockedSpeed: 90, // Kenta's speed while something is in his lane
    lineAhead: 160, // how far ahead on the racing line Kenta aims
    lookAhead: 230, laneHalf: 30, dodge: 48,
    checkpointRadius: 180,
    clearDist: 80, // traffic pulls over / police stop when Jun's car gets this close
    pullOver: 84, // how far off the racing line a cleared car goes
    policeSpeed: 200, rampDist: 520, policeTrigger: 1300,
    crashHp: 0.3, // Kenta has crashed below this share of his bike's health
    taillights: 190,
    /** Traffic on the racing line: [lap leg 0-7, how far along it 0-1, vehicle]. */
    traffic: [[1, 0.5, 'truck'], [2, 0.45, 'sedan'], [3, 0.5, 'sedan'], [7, 0.7, 'sedan']] as [number, number, string][],
    /** Police at the on-ramps: [side of the ring, road number from the map's road lists]. */
    police: [['S', 7], ['S', 6], ['W', 3], ['W', 1], ['N', 6]] as ['S' | 'W' | 'N', number][],
    /** Checkpoint numbers (Kenta's) that end each objective (of 8 round the ring). */
    phaseAhead: 1, phaseTraffic: 4, phasePolice: 7,
  },

  // ----- S-G1 Dead Pixels -----
  sg1: { findDist: 260, photoDist: 170, photoTime: 2.4 },

  // ----- S-G2 Building 41 -----
  sg2: {
    pickup: 80, // Endō gets in when Jun's car stops this close
    chaseAfter: 5, // seconds of driving before Kuroda's men show up
    chasers: 2,
    nearStation: 420,
    waves: [3, 4], // Kuroda thugs per wave at the lockers
    endoHits: 14, // blows Endō can take
    dropOff: 170, // Endō gets out when Jun's car stops this close to the station door
  },

  // ----- S-G3 Broadcast -----
  sg3: {
    gateGuards: 4,
    floors: 3, // floors of the tower below the open top floor (the rooms towerF1-towerF3)
    floorGuards: 2,
    kurodaRuns: 2, kurodaSpeed: 125, scareDist: 100, cornerDist: 40,
    streamTime: 20, // seconds to keep him on camera
    streamGuards: 3,
    cameraDist: 150,
  },

  // ----- S-K1 Ice Machine -----
  sk1: { hosts: 3, carrySpeed: 0.6, chasers: 1, deliverRadius: 170 }, // the bar is down an alley: the truck only has to reach the end of it

  // ----- S-K2 Funeral Money -----
  sk2: { wait: 6, stayDist: 260, sharks: 4, leaderHp: 90, fleeAt: 25, burnTime: 2.2 },

  // ----- S-K3 The Temple Bell -----
  sk3: { guards: 4, gunmen: 2, bellGuards: 2, chasers: 1, templeRadius: 80, loadDist: 90 }, // loadDist: how close to the warehouse door the truck must back up

  // ----- S-U1 Bad Omen -----
  su1: { whistleRadius: 110, spotDist: 300, fleeCruise: 150, stopHp: 0.5, thieves: 2 },

  // ----- S-U2 The Lucky Catch -----
  su2: {
    share: 900000, // script: "up to ¥900,000", one percent of ninety million
    yenPerHp: 3000, // taken off for each point of damage to the truck ("less for every dent")
    minShare: 90000,
    auctionTime: 360, // seconds until the auction starts
    truckCruise: 170,
    catchDist: 260,
    stopHp: 0.5, // the driver gives up below this share of the truck's health
  },

  // ----- S-U3 Umibōzu -----
  su3: { mercs: 5, gunmen: 3, wakeDist: 320, revealDist: 340, shapeSize: 640, shapeTime: 4.5 },
};

/** In-play barks and phone lines for the side stories (script "In play" sections). */
export const SIDE_BARKS = {
  // S-R1
  sr1Worker: ["That's a collector's piece!", 'Bones paid good money for that!'],
  sr1Bones: 'Six years that tank hung on my wall! Six years!',
  sr1Jun: "Rent's due.",
  // S-R2
  sr2Police: 'Unauthorised gathering on the K-Route! Disperse!',
  sr2Riders: ['For Daigo!', 'Riders down on the left!'],
  // S-R3
  sr3Taillights: "I can see your taillights, old man. That means you're too slow!",
  sr3Police: 'Motorcycle at extreme speed! Units, intercept!',
  // S-G1
  sg1Jun: 'Plugged in. Probably.',
  sg1Hikari: "Camera three's live. Oh, hi, it's you. You climb weird.",
  sg1Contractor: 'Ogata says smash every camera on the 41 block. Every one.',
  // S-G2
  sg2Endo: ['Left! No, my left!', "I'm sixty-eight. I don't bounce."],
  sg2Thug: 'Get the old man!',
  sg2EndoLocker: "Thirty years in the fire service, and now I'm robbing my own locker.",
  // S-G3
  sg3Security: "Site's closed! Hard hats only!",
  sg3Hikari: "Viewer count's climbing. So are you. Coincidence? Yes.",
  // S-K1
  sk1Cook: 'Where are you going with the ice machine?!',
  sk1Jun: 'Inspection.',
  sk1Host: "Kaz! Someone's stealing the ice!",
  // S-K2
  sk2Tsuda: 'Thirty years he gave them. And they send men to my door.',
  sk2Sharks: ['Interest is due, grandma!', "Who's this, her nephew?"],
  sk2Jun: 'Collections.',
  sk2Ledger: "That's six months of interest!",
  // S-K3
  sk3Guard: "Mibu-san's collection is off limits!",
  sk3Monk: 'Is that… is that our bell?',
  // S-U1
  su1Thief: 'Whistle again! The old fools think it\'s spirits!',
  su1Jun: 'Found your ghost.',
  // S-U2
  su2Driver: 'This fish is spoken for!',
  su2Auctioneer: 'And here comes lot one! Bidding starts now!',
  // S-U3
  su3Jun: '…Huh.',
  su3Merc: "The bay's full of gold and nobody's watching! Keep digging!",
} as const;

/** Small labels on the HUD meters. Not from the script: PLACEHOLDER wording. */
export const SIDE_LABELS = {
  noticed: 'NOTICED', // as in mission 7
  riders: 'RIDERS',
  lap: (kenta: string) => `DAIGO 4:02 · KENTA ${kenta}`,
  endo: 'ENDŌ',
  onCamera: 'ON CAMERA',
  auction: 'AUCTION',
} as const;

/**
 * Daigo's Zokusha, the reward for S-R3. Script: "unique: the fastest Zokusha, purple tank, one dent".
 * It is the Zokusha with a higher top speed and acceleration (PLACEHOLDER numbers); the standard
 * Zokusha is already purple. The dent is not drawn.
 */
export const DAIGO_ZOKUSHA: VehicleDef = {
  ...VEHICLES.bike,
  name: "Daigo's Zokusha",
  rating: { speed: 9, handling: 7, toughness: 2 },
  maxSpeed: 460, accel: 420,
  desc: 'The fastest Zokusha, purple tank, one dent.',
};

/** Light the missions' usual times of day do not cover. PLACEHOLDER art direction. */
export const SIDE_LIGHT = {
  dawn: { color: 0x1a2440, alpha: 0.3, lights: 0.7, rain: false }, // dawn without rain (S-R3)
  fog: { color: 0x8c979d, alpha: 0.42, lights: 0.8, rain: false }, // Kogane Bay in fog (S-U3)
};

export const MISSIONS_SIDE: Mission[] = [
  // =====================================================================================
  // Daigo's Road — Raijin Speed Tribe
  // =====================================================================================
  {
    id: 'S-R1', title: 'BORROWED THUNDER', giver: 'raijinClubhouse', start: 'raijinClubhouse', after: 'M04',
    ambience: 'afternoon', // PLACEHOLDER: the script gives no time of day
    setup: 'sr1Setup',
    steps: [
      { t: 'cut', lines: [
        D('The Raijin clubhouse under the K-Route, full of bikes. One bay sits empty except for a faded photo of DAIGO taped to the wall.'),
        { who: 'KENTA', text: "That bay was Daigo's. His bike was the fastest thing on the ring." },
        { who: 'KENTA', text: 'Cops impounded it after the heist and sold it at auction. Bones Tamura bought it and parted it out.' },
        { who: 'JUN', text: 'Bones.' },
        { who: 'KENTA', text: "Runs three chop shops in Tetsugawa. Engine's in one, frame in another, tank in the third." },
        { who: 'KENTA', text: "Get them back, old man. All of them. I'll do the rebuild myself." },
        { who: 'JUN', text: 'And Bones?' },
        { who: 'KENTA', text: 'Bones gets to keep his teeth. Probably.' },
      ] },
      { t: 'obj', text: 'Get the engine from the canal-side shop.', marker: 'chopCanal:1', radius: 28, done: 'sideOnFoot', after: 'sr1Engine' }, // each part is inside its shop
      { t: 'obj', text: 'Get the frame from the rail-yard shop.', marker: 'chopRail:1', radius: 28, done: 'sideOnFoot', after: 'sr1Frame' },
      { t: 'obj', text: "Get the fuel tank from Bones's garage.", marker: 'bonesGarage:1', radius: 28, done: 'sideOnFoot', after: 'sr1Tank' },
      { t: 'obj', text: 'Bring the parts to the clubhouse.', marker: 'raijinClub:2', radius: 40, done: 'atMarker' }, // inside, by Kenta
      { t: 'cut', lines: [
        D('The clubhouse. The parts lie on a sheet. KENTA runs a hand over the dented purple tank.'),
        { who: 'KENTA', text: 'Still has the dent from when he hit a vending machine in Asagiri.' },
        { who: 'JUN', text: 'I was driving behind him. He blamed the machine.' },
        { who: 'KENTA', text: '(laughs, then stops) …Give me a few weeks with this.' },
      ] },
      { t: 'card', title: 'BORROWED THUNDER — COMPLETE', sub: 'Reward: ¥30,000, Raijin standing +20', pay: 30000 },
    ],
  },
  {
    id: 'S-R2', title: 'GHOST LAP', giver: 'raijinClubhouse', start: 'raceStart', after: 'M08', afterSide: 'S-R1',
    ambience: 'night', setup: 'sr2Setup',
    failCheck: 'sr2PackLost', failCall: { who: 'KENTA', text: 'Too many down. Pull over. We go home.' },
    steps: [
      { t: 'cut', lines: [
        D('A K-Route on-ramp at midnight. Thirty Raijin bikes idle in formation, every rider wearing a black armband.'),
        { who: 'KENTA', text: 'Every year on his birthday, we ride one lap for Daigo. Every year the cops shut us down before the bridge.' },
        { who: 'KENTA', text: 'This year you drive point. Keep the road clear. Keep the formation whole.' },
        { who: 'JUN', text: 'How many cops?' },
        { who: 'KENTA', text: 'Last year? Eleven cars and a helicopter. (beat) Daigo would have loved that.' },
        { who: 'RAIJIN BIKER', text: 'Thunder!' },
      ] },
      { t: 'radio', text: 'DJ ŌKAMI: Thirty bikes on the K-Route at midnight! Wave if you see them, Kogane. From the sidewalk.' },
      { t: 'obj', text: 'Lead the formation around the K-Route.', enter: 'sr2Go', done: 'sr2Lead' },
      { t: 'obj', text: 'Keep at least 20 riders in the pack.', done: 'sr2Keep' },
      { t: 'call', lines: [{ who: 'KENTA', text: 'Roadblock at the bridge! Go through it, old man. Not around. Through.' }] },
      { t: 'obj', text: 'Break the roadblock at the bridge.', enter: 'sr2Roadblock', done: 'sr2Break' },
      { t: 'obj', text: 'Finish the lap.', done: 'sr2Finish' },
      { t: 'cut', lines: [
        D('The far end of the ring at dawn. The riders cut their engines. Silence.'),
        { who: 'KENTA', text: 'First time in six years we finished.' },
        { who: 'JUN', text: "He'd have wanted a faster lap." },
        { who: 'KENTA', text: "(grins) He'd have wanted to lead it. (beat) The bike's almost done." },
      ] },
      { t: 'run', hook: 'sideTidy' },
      { t: 'card', title: 'GHOST LAP — COMPLETE', sub: 'Reward: Raijin standing +20; Raijin riders now escort you in K-Route chases' },
    ],
  },
  {
    id: 'S-R3', title: 'LAST RUN', giver: 'raijinClubhouse', start: 'raceStart', after: 'M12', afterSide: 'S-R2',
    ambience: 'dawnRain', // "dawn": the setup swaps this for a dawn without rain (SIDE_LIGHT.dawn)
    setup: 'sr3Setup',
    failCheck: 'sr3Failed', failCall: { who: 'KENTA', text: 'Again. Again! He never quit after one lap.' },
    steps: [
      { t: 'cut', lines: [
        D("The clubhouse at dawn. DAIGO's bike stands rebuilt, the purple tank polished, the dent still there. KENTA tapes Daigo's photo to the tank."),
        { who: 'KENTA', text: "Daigo's lap record: four minutes, two seconds. Nobody's touched it in seven years." },
        { who: 'KENTA', text: "I'm going to break it. On his bike." },
        { who: 'JUN', text: 'And me?' },
        { who: 'KENTA', text: 'You run ahead and clear the road. Traffic, cops, idiots. Anything in my way is in your way first.' },
        { who: 'JUN', text: 'If you crash?' },
        { who: 'KENTA', text: "Then I crash on his bike. (beat) I won't crash." },
      ] },
      { t: 'obj', text: 'Stay ahead of Kenta.', enter: 'sr3Go', done: 'sr3Ahead' },
      { t: 'call', lines: [{ who: 'KENTA', text: 'Truck in the left lane! Move it, move it!' }] },
      { t: 'obj', text: 'Clear traffic from the racing line.', done: 'sr3Traffic' },
      { t: 'obj', text: 'Block the police at the on-ramps.', done: 'sr3Police' },
      { t: 'obj', text: 'Get Kenta round in under 4:02.', done: 'sr3Finish' },
      { t: 'cut', lines: [
        D('The finish under the ramp. The timer freezes at 4:01. KENTA pulls off his helmet, laughing and crying at once.'),
        { who: 'KENTA', text: 'One second. One second, Daigo!' },
        { who: 'KENTA', text: "(holding out the key) He'd want you to have it. He always said you were the only driver worth losing to." },
        { who: 'JUN', text: "…I'll keep it fast." },
      ] },
      { t: 'run', hook: 'sr3Reward' },
      { t: 'card', title: 'LAST RUN — COMPLETE', sub: "Reward: Daigo's Zokusha (unique: the fastest Zokusha, purple tank, one dent);\nRaijin riders join your turf fights" },
    ],
  },

  // =====================================================================================
  // Building 41 — Glitch
  // =====================================================================================
  {
    id: 'S-G1', title: 'DEAD PIXELS', giver: 'sgYard', start: 'sgYard', after: 'M05',
    ambience: 'night', // PLACEHOLDER: the script gives no time of day
    setup: 'sg1Setup', failCheck: 'sg1Spotted',
    steps: [
      { t: 'cut', lines: [
        D('The Glitch hideout. Half the CamMap monitors show static. HIKARI kicks a desk.'),
        { who: 'HIKARI', text: "Someone's smashing my cameras. Four in Denpa-chō, last night alone." },
        { who: 'PIP', text: 'Same white van every time. No plates.' },
        { who: 'HIKARI', text: 'Fix the cameras, then follow the van. I want to know who hates my cameras this much.' },
        { who: 'JUN', text: 'Maybe they hate being filmed.' },
        { who: 'HIKARI', text: "Everybody hates being filmed, Parole. Most people don't bring a hammer." },
      ] },
      { t: 'obj', text: 'Fix the four cameras. (0/4)', done: 'sg1Fix' },
      { t: 'obj', text: 'Find the white van.', enter: 'sg1Van', done: 'sg1Found', after: 'sg1Tail' },
      { t: 'obj', text: 'Follow it without being spotted.', done: 'sg1Follow' },
      { t: 'obj', text: 'Photograph the driver.', done: 'sg1Photo' },
      { t: 'call', lines: [
        { who: 'HIKARI', text: "The driver works for Kuroda Construction. Tsukuyomi's demolition contractor." },
        { who: 'HIKARI', text: 'Every camera they smashed pointed at the empty lot where Building 41 used to be.' },
        { who: 'JUN', text: "What's on the lot now?" },
        { who: 'HIKARI', text: "Nothing. That's what bugs me. Why guard nothing?" },
      ] },
      { t: 'card', title: 'DEAD PIXELS — COMPLETE', sub: 'Reward: ¥20,000, Glitch standing +20', pay: 20000 },
    ],
  },
  {
    id: 'S-G2', title: 'BUILDING 41', giver: 'sgYard', start: 'sgIzakaya', after: 'M11', afterSide: 'S-G1',
    ambience: 'night', // PLACEHOLDER: the script gives no time of day
    setup: 'sg2Setup', failCheck: 'sg2Failed',
    steps: [
      { t: 'cut', lines: [
        D('A quiet izakaya in Asagiri. HIKARI sits across from an old man in a fire-service jacket, MR. ENDŌ. He keeps glancing at the door.'),
        { who: 'HIKARI', text: 'Mr. Endō inspected the fire at Building 41. Officially, an electrical fault.' },
        { who: 'ENDŌ', text: 'Officially. (lowers his voice) I found three accelerant points. Petrol. I filed it. The next day my report was rewritten.' },
        { who: 'ENDŌ', text: 'I kept a copy. Photos, samples, everything. In a locker at Tetsugawa station.' },
        { who: 'JUN', text: 'So we get it.' },
        { who: 'ENDŌ', text: "Kuroda's men have followed me for a week. I won't make it alone." },
        { who: 'HIKARI', text: "You won't be alone. Parole is very annoying to kill." },
      ] },
      { t: 'obj', text: 'Drive Mr. Endō to Tetsugawa station.', done: 'sg2Drive' },
      { t: 'obj', text: "Lose Kuroda's men.", done: 'sg2Lose' },
      { t: 'obj', text: 'Protect Endō at the lockers.', done: 'sg2Protect' }, // the lockers are inside the station
      { t: 'obj', text: 'Get the evidence to the Glitch hideout.', marker: 'capsule:1', radius: 40, done: 'atMarker' }, // inside the capsule hotel
      { t: 'cut', lines: [
        D('The hideout. Photos cover a table: scorched floors, a red can. Behind HIKARI, a small grey-haired woman knits in an armchair: GRANDMA NISHINO.'),
        { who: 'HIKARI', text: 'It was arson. I always knew. Now I can prove it.' },
        { who: 'GRANDMA NISHINO', text: '(not looking up) I told you that the day it happened, Hikari.' },
        { who: 'HIKARI', text: 'Grandma, you told me the toaster did it.' },
        { who: 'GRANDMA NISHINO', text: "I was being polite. (to JUN) You're the driver. You're thinner than she said." },
        { who: 'JUN', text: 'She talks about me?' },
        { who: 'GRANDMA NISHINO', text: 'Constantly. (beat) Who do you think taught her to hack? Forty years at the telephone company.' },
      ] },
      { t: 'card', title: 'BUILDING 41 — COMPLETE', sub: 'Reward: Glitch standing +20; Grandma Nishino joins the hideout (one Glitch tip a day)' },
    ],
  },
  {
    id: 'S-G3', title: 'BROADCAST', giver: 'sgYard', start: 'sgYard', after: 'M13', afterSide: 'S-G2',
    ambience: 'night', setup: 'sg3Setup',
    steps: [
      { t: 'cut', lines: [
        D('A Mirai-zaka rooftop. HIKARI points across the skyline at a half-built tower wrapped in Tsukuyomi banners.'),
        { who: 'HIKARI', text: "Kuroda's building the first Kogane 2040 tower. Right where Building 41 stood." },
        { who: 'HIKARI', text: "He's up there tonight for an inspection photo. Top floor, no walls yet." },
        { who: 'JUN', text: 'You want him arrested.' },
        { who: 'HIKARI', text: 'I want him to say it. Out loud. On my stream. The arrest comes after.' },
        { who: 'PIP', text: 'Twelve thousand people already watching. We promised them "a construction update."' },
        { who: 'HIKARI', text: "And don't throw him off. That would be a very different stream." },
      ] },
      { t: 'obj', text: 'Get into the construction site.', marker: 'sgLot41', radius: 50, done: 'sg3Inside' },
      { t: 'obj', text: 'Climb the tower.', done: 'sg3Climb' },
      { t: 'obj', text: 'Corner Kuroda.', enter: 'sg3Kuroda', done: 'sg3Corner' },
      { t: 'cut', lines: [
        D('The bare top floor, wind howling. KURODA, in a white hard hat, backs toward the edge.'),
        { who: 'KURODA', text: 'Who are you? This is a Tsukuyomi site!' },
        { who: 'JUN', text: 'Building 41.' },
        { who: 'KURODA', text: 'That was an electrical—' },
        { who: 'JUN', text: 'Three accelerant points. Petrol.' },
        { who: 'KURODA', text: '(beat) Ogata said nobody would get hurt! Everyone was supposed to be out!' },
        { who: 'KURODA', text: "The old lady was still inside. We pulled her out ourselves. That's all I know!" },
        D("On HIKARI's laptop, the viewer count passes 200,000."),
      ] },
      { t: 'obj', text: 'Keep him on camera.', enter: 'sg3Stream', done: 'sg3Hold', after: 'sg3Home' },
      { t: 'cut', lines: [
        D("The hideout. Sirens on every screen. GRANDMA NISHINO wraps a hand-knitted scarf around JUN's neck."),
        { who: 'GRANDMA NISHINO', text: 'They pulled me out themselves. After they set the fire. Imagine.' },
        { who: 'HIKARI', text: "Kuroda's arrested. Ogata's name is trending. Tsukuyomi's stock is doing a little dance." },
        { who: 'GRANDMA NISHINO', text: "(to JUN) Gold and black. Your colours, I'm told." },
        { who: 'JUN', text: 'Thank you.' },
        { who: 'HIKARI', text: "Don't cry, Parole. It's a scarf." },
        { who: 'JUN', text: "I'm not." },
      ] },
      { t: 'card', title: 'BROADCAST — COMPLETE', sub: "Reward: Signal+ app (hack every traffic light in a district for 30 s),\nGrandma's scarf (cosmetic), Glitch standing to max" },
    ],
  },

  // =====================================================================================
  // Old Debts — Kurogane-kai (plays the same on both Act 2 paths: the script has no _A / _B lines here)
  // =====================================================================================
  {
    id: 'S-K1', title: 'ICE MACHINE', giver: 'mamaRei', start: 'mamaRei', after: 'M09',
    ambience: 'night', // PLACEHOLDER: the script gives no time of day
    setup: 'sk1Setup', failCheck: 'sk1Failed',
    steps: [
      { t: 'cut', lines: [
        D("Mama Rei's bar: eight stools, one bare bulb, a dead ice machine. MAMA REI pours a warm whisky."),
        { who: 'MAMA REI', text: "Ice machine's still broken. Saeko said you'd fix it." },
        { who: 'JUN', text: "I'm not a repairman." },
        { who: 'MAMA REI', text: 'No repairman comes into Hanabi-chō since Mibu\'s boys started "inspecting" their vans.' },
        { who: 'MAMA REI', text: 'Club Mirage got a brand-new machine last week. Makes little round cubes.' },
        { who: 'JUN', text: 'You want me to steal an ice machine.' },
        { who: 'MAMA REI', text: 'I want you to liberate one. Warm whisky is a crime too.' },
      ] },
      { t: 'obj', text: "Get into Club Mirage's kitchen.", marker: 'mirageKitchen:1', radius: 30, done: 'sideOnFoot' }, // just inside the kitchen door
      { t: 'obj', text: 'Steal the ice machine.', enter: 'sk1MachineSpot', done: 'sideOnFoot', after: 'sk1Steal' },
      { t: 'obj', text: 'Load it onto a truck.', hint: "The ice machine is heavy. You can't run while carrying it.", done: 'sk1Load', after: 'sk1Loaded' },
      { t: 'obj', text: "Deliver it to Mama Rei's.", marker: 'mamaRei', radius: 170, done: 'sk1Deliver', after: 'sk1Home' },
      { t: 'cut', lines: [
        D("Mama Rei's. The new machine hums. A perfect round cube drops into a glass."),
        { who: 'MAMA REI', text: 'Look at that. Round. Like a little moon.' },
        { who: 'MAMA REI', text: "First drink's free. Every drink after that is also free. Don't tell Saeko." },
      ] },
      { t: 'card', title: 'ICE MACHINE — COMPLETE', sub: "Reward: Mama Rei's bar becomes a hangout (one free drink a day heals fully)" },
    ],
  },
  {
    id: 'S-K2', title: 'FUNERAL MONEY', giver: 'skSaeko', start: 'skSaeko', after: 'M10', afterSide: 'S-K1',
    ambience: 'afternoon', // PLACEHOLDER: the script gives no time of day
    setup: 'sk2Setup', retryAt: 'skTsuda',
    steps: [
      { t: 'cut', lines: [
        D('The Kurogane mansion. SAEKO hands JUN a white condolence envelope tied with black and white string.'),
        { who: 'SAEKO', text: 'A soldier named Tsuda died last month. Thirty years loyal to my father.' },
        { who: 'SAEKO', text: "Mibu's loan sharks are squeezing his widow for a debt her husband never had." },
        { who: 'SAEKO', text: "Bring her this. It's what the family owes her. Then make sure the sharks stop swimming." },
        { who: 'JUN', text: 'How?' },
        { who: 'SAEKO', text: 'However you like, Sakamaki-san. Except quietly. I want them remembered.' },
      ] },
      { t: 'obj', text: 'Deliver the condolence money to Mrs. Tsuda.', marker: 'skTsuda', radius: 34, done: 'sideOnFoot', after: 'sk2Deliver' },
      { t: 'obj', text: 'Wait for the loan sharks.', done: 'sk2Wait' },
      { t: 'obj', text: 'Run them out of Asagiri.', enter: 'sk2Fight', done: 'sk2Run', after: 'sk2Ledger' },
      { t: 'obj', text: 'Burn their ledger.', done: 'sk2Burn', after: 'sk2Home' },
      { t: 'cut', lines: [
        D("Mrs. Tsuda's small apartment. She sets a cup of tea in front of JUN."),
        { who: 'MRS. TSUDA', text: "My husband always said the old man's family paid its debts." },
        { who: 'MRS. TSUDA', text: 'I stopped believing him. (beat) Tell Saeko-san I believe him again.' },
      ] },
      { t: 'card', title: 'FUNERAL MONEY — COMPLETE', sub: 'Reward: Kurogane standing +25; loan-shark street events stop in Asagiri' },
    ],
  },
  {
    id: 'S-K3', title: 'THE TEMPLE BELL', giver: 'skSaeko', start: 'skSaeko', after: 'M16', afterSide: 'S-K2',
    ambience: 'night', setup: 'sk3Setup', failCheck: 'sk3Failed', retryAt: 'skMibuRoad',
    steps: [
      { t: 'cut', lines: [
        D('The tatami room, repaired. SAEKO kneels with a small leather notebook.'),
        { who: 'SAEKO', text: 'My father kept a book of promises. The ones he kept are crossed out.' },
        { who: 'SAEKO', text: "One isn't. Forty years ago his men stole the bronze bell from the old temple in Asagiri and sold it." },
        { who: 'SAEKO', text: "He promised the head priest he'd bring it back. He never did." },
        { who: 'SAEKO', text: "Mibu bought it for his collection. It's in his warehouse by the canal." },
        { who: 'JUN', text: 'You want me to steal a temple bell.' },
        { who: 'SAEKO', text: "I want you to finish my father's sentence." },
      ] },
      { t: 'obj', text: "Break into Mibu's canal warehouse.", marker: 'mibuWarehouse:1', radius: 40, done: 'sk3Inside' }, // inside the warehouse door
      { t: 'obj', text: 'Find the bell.', enter: 'sk3BellSpot', done: 'sideOnFoot' },
      { t: 'call', lines: [{ who: 'GORO', text: "A bell? Kid, my truck's rated for cars, not religion." }] },
      { t: 'obj', text: "Load it onto Goro's tow truck.", enter: 'sk3Truck', done: 'sk3Load', after: 'sk3Loaded' },
      { t: 'obj', text: 'Get it to the Asagiri temple.', marker: 'temple', radius: 80, done: 'sk3Temple' },
      { t: 'obj', text: 'Ring it.', enter: 'sk3RingSpot', done: 'sideOnFoot', after: 'sk3Ring' },
      { t: 'cut', lines: [
        D('The temple courtyard at midnight. The bell hangs again. The old HEAD PRIEST, MIKA and the neighbours gather. JUN pulls back the striking beam.'),
        { who: 'HEAD PRIEST', text: 'Forty years. I was a young monk when it went.' },
        { who: 'SAEKO', text: 'My father was sorry. He just never said so.' },
        D("JUN swings the beam. The bell's deep note rolls across Asagiri."),
        { who: 'MIKA', text: '(quietly) Mom always said this temple sounded wrong. Like something was missing.' },
        { who: 'HEAD PRIEST', text: 'Ring it whenever trouble follows you, young man. Old bells keep bad luck away.' },
      ] },
      { t: 'card', title: 'THE TEMPLE BELL — COMPLETE', sub: 'Reward: the temple bell (ring it once per in-game day to clear up to 3 lanterns);\nKurogane soldiers can join your crew' },
    ],
  },

  // =====================================================================================
  // Sea Spirit — Umibōzu Syndicate
  // (boats are on the bible's cut list: every boat sequence is a car sequence along the shore)
  // =====================================================================================
  {
    id: 'S-U1', title: 'BAD OMEN', giver: 'suDock', start: 'suDock', after: 'M18',
    ambience: 'night', setup: 'su1Setup',
    steps: [
      { t: 'cut', lines: [
        D("The fish market at dusk. HACHIRŌ's crew sits on crates with folded arms. Nobody is at the boats."),
        { who: 'HACHIRŌ', text: "My crews won't sail. Three nights now." },
        { who: 'JUN', text: 'Why?' },
        { who: 'HACHIRŌ', text: 'Someone whistles out on the water. Long, low whistles. Whistling at sea calls the storm.' },
        { who: 'HACHIRŌ', text: "And every night there's whistling, one of my boats comes back lighter than it left." },
        { who: 'JUN', text: "So someone's stealing your cargo, and you think it's a ghost." },
        { who: 'HACHIRŌ', text: "I think it's both, land boy. Go find out which." },
      ] },
      { t: 'obj', text: 'Take a boat out at night.', enter: 'su1BoatMarker', done: 'inCar' },
      { t: 'obj', text: 'Follow the whistling.', hint: 'Low whistles show as a pulsing sound marker on the minimap.', done: 'su1Whistle', after: 'su1Thieves' },
      { t: 'obj', text: 'Catch the thieves.', done: 'su1Catch' },
      { t: 'obj', text: 'Bring back the stolen cargo.', done: 'su1Cargo' },
      { t: 'cut', lines: [
        D('The market. Recovered crates stacked on the dock. HACHIRŌ holds up a tin whistle in disgust.'),
        { who: 'HACHIRŌ', text: 'A tin whistle. Twenty yen at any toy shop.' },
        { who: 'HACHIRŌ', text: '(throws it into the bay) Never whistle at sea, land boy. Somebody might be listening.' },
      ] },
      { t: 'card', title: 'BAD OMEN — COMPLETE', sub: 'Reward: ¥40,000, Umibōzu standing +20', pay: 40000 },
    ],
  },
  {
    id: 'S-U2', title: 'THE LUCKY CATCH', giver: 'suDock', start: 'suDock', after: 'M19', afterSide: 'S-U1',
    ambience: 'night', setup: 'su2Setup', failCheck: 'su2Failed',
    steps: [
      { t: 'cut', lines: [
        D('The fish market at 3 a.m. A crowd around an empty display stand. A sign: RECORD TUNA — 312 KG.'),
        { who: 'HACHIRŌ', text: 'The biggest tuna in twenty years. Gone. Stolen out of my market.' },
        { who: 'JUN', text: "It's a fish." },
        { who: 'HACHIRŌ', text: "It's a lucky fish. Sell it at auction and the whole year is lucky. Lose it, and the sea remembers." },
        { who: 'HACHIRŌ', text: 'A refrigerated truck left twenty minutes ago for the bridge. The auction starts at five.' },
        { who: 'JUN', text: 'So I steal back a fish.' },
        { who: 'HACHIRŌ', text: "You return a fish. Gently. It's worth more than your car." },
      ] },
      { t: 'obj', text: 'Catch the refrigerated truck.', enter: 'su2Go', done: 'su2Catch', after: 'su2Caught' },
      { t: 'obj', text: 'Stop it without wrecking it.', hint: "Damage to the truck lowers the tuna's price.", done: 'su2Stop' },
      { t: 'obj', text: 'Drive it back to the market.', done: 'su2Drive' },
      { t: 'obj', text: 'Make it before the auction.', marker: 'fishMarketYard', radius: 80, done: 'su2Arrive', after: 'su2Sold' },
      { t: 'cut', lines: [
        D('The auction floor. The tuna lies under the lights. A hammer bangs.'),
        { who: 'AUCTIONEER', text: 'Sold! Ninety million yen!' },
        { who: 'HACHIRŌ', text: "(slaps JUN's back, hard) A lucky year, land boy! Here's your share." },
        { who: 'JUN', text: 'My share?' },
        { who: 'HACHIRŌ', text: 'One percent. The sea takes what it\'s owed. So do you.' },
      ] },
      { t: 'run', hook: 'su2Dents' }, // takes the dents off the ¥900,000 the card pays
      { t: 'card', title: 'THE LUCKY CATCH — COMPLETE', sub: 'Reward: up to ¥900,000 (less for every dent in the truck), Umibōzu standing +20', pay: 900000 },
    ],
  },
  {
    id: 'S-U3', title: 'UMIBŌZU', giver: 'suDock', start: 'suDock', after: 'M24', afterSide: 'S-U2',
    ambience: 'night', // "in fog": the setup swaps this for SIDE_LIGHT.fog
    setup: 'su3Setup',
    steps: [
      { t: 'cut', lines: [
        D('A fog-bound pier at night. HACHIRŌ stares into the grey, a flashlight in his fist.'),
        { who: 'HACHIRŌ', text: 'Three crews saw it this week. A shape in the fog, taller than a container ship. Bald head. No face.' },
        { who: 'JUN', text: 'Umibōzu.' },
        { who: 'HACHIRŌ', text: 'My grandfather saw it once. He never sailed again.' },
        { who: 'HACHIRŌ', text: "I'm not asking you to fight a sea spirit, land boy. I'm asking you to look." },
        { who: 'JUN', text: 'And if it is a spirit?' },
        { who: 'HACHIRŌ', text: 'Then come back and tell me. Quickly.' },
      ] },
      { t: 'obj', text: 'Sail into the fog.', enter: 'su3FogMarker', done: 'atMarker', after: 'su3Shape' },
      { t: 'obj', text: 'Find the shape.', done: 'su3Find' },
      { t: 'cut', lines: [
        D('The "shape" is a salvage barge under an inflated grey dome, crewed by ex-Yatagarasu mercenaries dredging for the gold bars that sank in M19.'),
      ] },
      { t: 'obj', text: "Deal with what's there.", done: 'su3Deal' },
      { t: 'cut', lines: [
        D("The barge burns quietly behind Jun's boat. As he turns for home, something enormous rises out of the water without a sound, then sinks again. JUN looks back. Nothing but fog."),
      ] },
      { t: 'obj', text: 'Get back to the pier.', marker: 'suDock', radius: 70, enter: 'su3Rise', done: 'su3Home' },
      { t: 'cut', lines: [
        D('The pier. HACHIRŌ is waiting.'),
        { who: 'JUN', text: 'Salvage barge. Ex-Yatagarasu, digging for sunken gold.' },
        { who: 'HACHIRŌ', text: '(relieved) Men. Just men. Good.' },
        { who: 'JUN', text: 'Mostly.' },
        { who: 'HACHIRŌ', text: '…Mostly?' },
        { who: 'JUN', text: "(looking back at the fog) Don't sail tonight." },
      ] },
      { t: 'card', title: 'UMIBŌZU — COMPLETE', sub: 'Reward: Ghost Tide (unique black speedboat), the Umibōzu boat taxi between piers,\nUmibōzu standing to max' },
    ],
  },
];
