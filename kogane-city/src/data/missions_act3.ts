import type { Mission, Line } from './missions';

// Missions 17-24 and the three endings, copied line for line from the Script and Writing doc
// ("Act 3 script" tab). Text lives here; the game logic each mission needs is the named
// "hooks" in src/systems/hooks_act3.ts.
//
// Lines the script marks _A are the yakuza path, _B the police path. Where the script has a
// CALL with a stage direction, the stage direction is a one-line cutscene and the rest is the call.

const D = (text: string, cond?: string): Line => (cond ? { who: '', text, if: cond } : { who: '', text }); // stage direction
const A = (who: string, text: string): Line => ({ who, text, if: 'yakuza' }); // lines marked _A
const P = (who: string, text: string): Line => ({ who, text, if: 'police' }); // lines marked _B

/** "The Act 2 ally" as mission giver: Saeko's office, or Sawada's canal-side lot (where she met Jun in mission 7). */
const ALLY = { yakuza: 'saekoOffice', police: 'canalLot' };
const TALK = 'KOGANE TALK 1260';

/** PLACEHOLDER numbers the script does not give. */
export const ACT3_TUNING = {
  /** Mission payouts in yen (bible: story missions pay ¥20,000–¥500,000, scaling by act). */
  pay: { M17: 150000, M18: 200000, M19: 220000, M20: 250000, M21: 300000, M22: 400000, M23: 450000, M24: 500000 },
  /** Weapons that stand in for ones the game does not have yet. */
  sidearm: 'kitsune9', // Inspector's Revolver; also handed out where a mission needs a gun
  longGun: 'suzume', // Black Iron; the tower assault and the finale
  armour: 100, // vest worn for the last three missions

  // the "noticed" meter (missions 17 and 20), per second
  noticeFar: 0.35, noticeNear: 1.2, noticeDrain: 0.2,

  // M17 Low Tide
  m17Guards: 5,
  m17See: 170, // px a dockhand can see

  // M18 Fish Market
  m18Price: 5000000, // (script)
  m18Crew: 5,
  m18BossHp: 220,
  m18KoHp: 15, // Jun is "knocked out" at this health
  m18KnifeDamage: 40, // tuna knife (bible)

  // M19 Sea Legs
  m19TruckSpeed: 135, // px/s
  m19CatchDist: 230,
  m19BoardDist: 95, m19BoardTime: 2,
  m19Smugglers: 4,

  // M20 Penthouse
  m20Cars: 3, // (script)
  m20Scratch: 45, // bump speed that counts as a scratch
  m20Excess: 50000, // yen taken for a scratched car
  m20See: 150, m20Cone: 75, // Amane's sight: px and degrees either side of where she faces
  m20Close: 70, m20Plant: 28, m20PlantTime: 0.8,
  m20ListenDist: 210, m20LineTime: 3.4,
  m20Guests: 5,

  // M21 Ghost
  m21ArcadeGuards: 3, m21GateGuards: 6, m21FireGuards: 3, m21ChaseGuards: 2,
  m21FireTime: 24, // seconds until the fire reaches Mika

  // M22 Last Stand
  m22Waves: [4, 5], // Mibu's men per "floor"
  m22MibuHp: 450,
  m22Rate1: 0.8, m22Rate2: 1.3, // seconds between Mibu's shots in phases 1 and 2
  m22Bodyguards: 3,
  m22HeliHp: 320, m22HeliTime: 35, // seconds before the helicopter is away
  m22HookFactor: 0.5, // with Umibōzu's Hook the helicopter takes half as much to bring down

  // M23 Tsukuyomi
  m23Floors: 40, m23PerCheckpoint: 10, // (script)
  m23Waves: [4, 4], // Yatagarasu per wave; each stretch of ten floors is this many waves
  m23Lobby: 3,

  // M24 Amaterasu Maru
  m24ShipSpeed: 60, m24ShipRun: 1500, // px/s and px the ship slides along the quay
  m24Waves: [4, 5],
  m24TetsuHp: 600,
  m24Sword: 12, m24SwordGap: 1.2, // cane-sword: extra damage per hit, seconds between hits
  m24FireworkGap: 1.5, m24FireworkFuse: 0.9, m24FireworkRadius: 70, m24FireworkDamage: 22,
  m24Rate3: 0.45,
};
const T = ACT3_TUNING;

/** Meter labels on the HUD. New wording, not in the script doc. */
export const ACT3_HUD = {
  noticed: 'NOTICED', parked: 'PARKED', board: 'BOARD IT', fire: 'FIRE', floor: 'FLOOR', helicopter: 'HELICOPTER',
};

/** In-play barks and other lines the hooks show (script "In play" sections). */
export const ACT3_BARKS = {
  m17Dock: ['Wrong pier, land boy.', "Sea's hungry tonight."],
  m17Soldier: 'Fire at the north gate!',
  m18Dock: ['Mind the tuna!', 'That fish is worth more than you!'],
  m18Auctioneer: 'Bidding continues! Bidding continues!',
  m18Hachiro: 'Ha! You hit like a sardine!',
  m19Goro: "Waves aren't potholes! Waves aren't potholes!",
  m19Smuggler: 'Kirishima says no witnesses!',
  m19JunJump: 'Hold it steady.',
  m19GoroJump: 'This is steady!',
  m19JunCard: 'K. Kirishima. Head of Security.',
  m20Guest: ["Careful with her. She's temperamental.", 'Keep the change. There is no change.'],
  m20JunPark: 'Nice.',
  m20Party: ['The old town? Gone by spring.', "Amane says we'll triple our money."],
  /** Through the bug (text in the phone's listening app). */
  m20Bug: [
    ['AMANE', 'Mr. Kirishima. The driver robbed my truck, hijacked my screens and copied my ledger.'],
    ['KIRISHIMA', 'He was always resourceful. I trained him that way.'],
    ['AMANE', 'I pay you to make problems disappear. Mr. Sakamaki is a problem.'],
    ['KIRISHIMA', "Then I'll make him disappear. (laughs)"],
  ],
  m21Yata: ['Target in the arcade.', 'Contain and neutralise.'],
  m21Tetsu: "You're slow, my boy! Prison made you slow!",
  m21Late: 'You were too late.',
  m22Intercom: "Jun! You came all this way. I'd have sent a car.",
  m22Phase1: "I hear prison ruined your aim. Let's find out.",
  m22Phase2: 'Boys! Our guest is leaving!',
  m22Phase3: 'Not this time, Jun! I have a—',
  m23Yata: ['All teams, intruder on floor {n}.', 'Company property. Leave.'],
  m23Ogata: "I'm in real estate! I'm just in real estate!",
  m23Jun: 'The parking space says hi.',
  m24Goro: "Waves aren't potholes! Still not potholes!",
  m24Yata: ['Intruder on the hull!', 'Mr. Kirishima wants him alive. Mostly.'],
  m24Loudspeaker: "Welcome aboard, my boy! Mind the gold, it's slippery!",
  m24Phase1: ['Still slow!', 'I taught you that!'],
  m24Phase2: 'A finale for my favourite student!',
  m24Phase3: 'You always turned left too early, Jun!',
  /** After the credits, Clean Slate only. */
  endFishermen: 'Fishermen in Kogane Bay report gold bars in their nets. Experts advise: keep fishing.',
} as const;

export const MISSIONS_ACT3: Mission[] = [
  // ===================================================================================
  {
    id: 'M17', title: 'LOW TIDE', giver: ALLY, start: 'portGate', ambience: 'night', setup: 'm17Setup',
    failCheck: 'm17Spotted', failCall: { who: 'HIKARI', text: "They know someone saw it. They'll move the date. Get out." },
    steps: [
      { t: 'cut', lines: [
        D("The Kogane Bay Bridge, reopened, gulls circling storm debris. JUN's car crosses toward the port lights."),
        D('A container stack. SAEKO, in black mourning clothes, with three soldiers.', 'yakuza'),
        A('SAEKO', 'The family buried my father this morning. Mibu sent flowers.'),
        A('JUN', 'Brave.'),
        A('SAEKO', "Dead. He doesn't know it yet. (points) The harbour office keeps the manifests. My men will start a fire at the north gate."),
        D('A crane cab. SAWADA with binoculars and a canned coffee, a tactical officer beside her.', 'police'),
        P('SAWADA', "Officially, I'm surveying storm damage. Unofficially, I have a crane and a sniper."),
        P('SAWADA', "(hands him an old revolver) My first service weapon. Don't tell anyone I gave it to you."),
        P('JUN', 'Why?'),
        P('SAWADA', 'It has never fired at the wrong person. Keep it that way.'),
        { who: 'HIKARI', text: '(on the phone) Harbour office, second floor. The manifests are on paper too. Rich people and paper, I swear.' },
      ] },
      { t: 'obj', text: 'Get into the container port.', marker: 'containerPort', radius: 170, done: 'm17Sneak', after: 'm17Inside' },
      { t: 'call', lines: [P('SAWADA', 'Guard on the left stack. My sniper has him. Go.')] },
      { t: 'obj', text: 'Reach the harbour office.', marker: 'harbourOffice', radius: 36, done: 'm17Sneak' },
      { t: 'obj', text: 'Find the manifest.', enter: 'm17ManifestSpot', done: 'm17Sneak', after: 'm17Manifest' },
      { t: 'cut', lines: [
        { who: 'MANIFEST', text: 'AMATERASU MARU — DEPARTS IN 7 DAYS — 48 TONNES FROZEN TUNA — SHIPPER: UMIBŌZU SEAFOOD LOGISTICS — CONSIGNEE: TSUKUYOMI OVERSEAS' },
      ] },
      { t: 'obj', text: 'Get out of the port.', marker: 'portGate', radius: 110, done: 'm17Out' },
      { t: 'call', lines: [
        { who: 'HIKARI', text: 'Forty-eight tonnes of frozen tuna. Shipping out.' },
        { who: 'JUN', text: 'So?' },
        { who: 'HIKARI', text: 'Nobody ships tuna out of Kogane, Parole. We eat all of it.' },
        { who: 'HIKARI', text: "It's the gold. And the shipper's Umibōzu. Hachirō runs the fish market at 4 a.m." },
        { who: 'JUN', text: "Then I'm getting up early." },
      ] },
      { t: 'obj', text: '', done: 'a3CallOver' }, // the card waits for the call to finish
      { t: 'run', hook: 'm17Unlock', if: 'police' },
      { t: 'card', title: 'LOW TIDE — COMPLETE', sub: '', pay: T.pay.M17, if: '!police' },
      { t: 'card', title: 'LOW TIDE — COMPLETE', sub: "Unlocked: Inspector's Revolver (Legendary)", pay: T.pay.M17, if: 'police' },
    ],
  },
  // ===================================================================================
  {
    id: 'M18', title: 'FISH MARKET', giver: 'fishMarket', start: 'fishMarket', ambience: 'night', setup: 'm18Setup',
    failCheck: 'm18KnockedOut', failCall: { who: 'HACHIRŌ', text: "Come back when you've eaten breakfast, land boy." },
    steps: [
      { t: 'cut', lines: [
        D("The fish market at 4 a.m. Steam, ice, frozen tuna laid in rows under hard white lights. HACHIRŌ, huge in rubber boots, checks a tuna's tail with a flashlight."),
        { who: 'HACHIRŌ', text: 'Land boy. You smell like the city.' },
        { who: 'JUN', text: 'You ship for Tsukuyomi.' },
        { who: 'HACHIRŌ', text: "I ship fish. What's inside the fish is the fish's business." },
        { who: 'JUN', text: 'The Amaterasu Maru.' },
        { who: 'HACHIRŌ', text: '(spits) Bad ship. Bad name. Sails on a dark moon. The sea hates it already.' },
        { who: 'JUN', text: 'Then keep your boats home.' },
        { who: 'HACHIRŌ', text: 'The sea takes what it\'s owed, land boy. So do I.' },
        { who: 'HACHIRŌ', text: 'Pay me five million and my boats stay home that night. Or—' },
        D('His crew picks up hooks and crates.'),
        { who: 'HACHIRŌ', text: '—swim.' },
      ] },
      { t: 'choice', prompt: '', set: 'hachiro', options: [{ label: 'Pay ¥5,000,000', value: 'hachiroPaid' }, { label: 'Fight', value: 'hachiroFought' }] },
      { t: 'run', hook: 'm18Chosen' }, // not enough cash forces the fight
      { t: 'obj', text: 'Hand over the money.', done: 'm18Pay', if: 'hachiroPaid' },
      { t: 'obj', text: "Beat Hachirō's crew.", hint: 'Tuna knife — press E to pick up.', enter: 'm18Brawl', done: 'm18Crew', if: 'hachiroFought' },
      { t: 'obj', text: 'Beat Hachirō.', enter: 'm18Boss', done: 'm18BossDown', if: 'hachiroFought' },
      { t: 'cut', lines: [
        { who: 'HACHIRŌ', text: "(counting) Smart. Money's cleaner than blood. Mostly.", if: 'hachiroPaid' },
        { who: 'HACHIRŌ', text: "(flat on the ice, laughing) Hit with a frozen tuna. Nobody's done that in years.", if: 'hachiroFought' },
        { who: 'HACHIRŌ', text: '(hands over a harpoon gun) Take my hook. If that ship sinks, I want it said an Umibōzu weapon helped.' },
        { who: 'HACHIRŌ', text: 'One more thing. Security on that ship is a man called Kirishima.' },
        { who: 'HACHIRŌ', text: 'He laughs too much. Never trust a man who laughs at sea.' },
      ] },
      { t: 'run', hook: 'm18Unlock' },
      { t: 'card', title: 'FISH MARKET — COMPLETE', sub: "Umibōzu boats stay home for the finale · Unlocked: Umibōzu's Hook (Legendary)", pay: T.pay.M18 },
    ],
  },
  // ===================================================================================
  // No boats in the game yet: per the bible's cut list this is a car chase along the shore.
  // The smuggler's "boat" is a box truck, Goro's "speedboat" is his car, and the marina is the river pier.
  {
    id: 'M19', title: 'SEA LEGS', giver: 'pier', start: 'pier', ambience: 'afternoon', setup: 'm19Setup',
    failCheck: 'm19Missed', failCall: { who: 'GORO', text: "It's alongside. We missed it, kid." },
    steps: [
      { t: 'cut', lines: [
        D("A marina at dusk. GORO stands stiffly at a speedboat's wheel, a life jacket over his overalls."),
        { who: 'GORO', text: "Hikari says a smuggler's boat runs the first crates out to the Amaterasu tonight." },
        { who: 'JUN', text: "You're driving that?" },
        { who: 'GORO', text: 'Boats are just cars that gave up on roads.' },
        { who: 'JUN', text: "You're wearing a life jacket." },
        { who: 'GORO', text: "I said I'd drive it. I didn't say I trusted it." },
        { who: 'GORO', text: 'Get alongside, jump across, sink it. Simple.' },
        { who: 'JUN', text: "Nothing's simple on water." },
        { who: 'GORO', text: "(revs the engine; the boat lurches) …Yeah. I'm learning that." },
      ] },
      { t: 'obj', text: "Catch the smuggler's boat.", enter: 'm19Go', done: 'm19Catch' },
      { t: 'obj', text: 'Board it.', done: 'm19Board', after: 'm19Deck' },
      { t: 'obj', text: 'Clear the deck.', done: 'm19Clear' },
      { t: 'obj', text: 'Sink the boat.', done: 'm19Sink', after: 'm19Sunk' },
      { t: 'obj', text: 'Get back to Goro.', enter: 'm19GoroWaits', done: 'm19Back' },
      { t: 'cut', lines: [
        D("GORO's boat bobs beside the sinking smuggler. Gold bars slide off the deck into the water. JUN studies the ID card: a man in a suit, his face turned away from the camera."),
        { who: 'GORO', text: "That's half a million yen sinking every second." },
        { who: 'JUN', text: 'Let it sink.' },
        { who: 'GORO', text: 'Kirishima. Never heard of him.' },
        { who: 'JUN', text: '(looking at the photo) I think I have.' },
        { who: 'GORO', text: "What's that mean?" },
        { who: 'JUN', text: "Don't know yet." },
      ] },
      { t: 'card', title: 'SEA LEGS — COMPLETE', sub: 'Boats unlocked at marinas', pay: T.pay.M19 },
      { t: 'text', from: 'HIKARI', text: "kirishima's on the guest list for amane's investor party. rokkaku hills, tomorrow night. you're parking cars." },
    ],
  },
  // ===================================================================================
  {
    id: 'M20', title: 'PENTHOUSE', giver: 'rokkakuValet', start: 'rokkakuValet', ambience: 'night', setup: 'm20Setup',
    failCheck: 'm20Failed', failCall: { who: 'HIKARI', text: 'She found it. Abort. Abort with manners.' },
    steps: [
      { t: 'cut', lines: [D('A Rokkaku Hills tower. JUN, in a red valet vest, stands at the curb. HIKARI is in his earpiece.')] },
      { t: 'call', lines: [
        { who: 'HIKARI', text: "Kogane 2040 investor party. Amane's up top. You park cars until you're close enough to her phone." },
        { who: 'JUN', text: 'Parking cars.' },
        { who: 'HIKARI', text: 'You were a getaway driver. This is a getaway driver with manners.' },
        { who: 'HIKARI', text: "Park three without a scratch and they'll rotate you upstairs to carry coats. Then it's my bug, her phone, done." },
        { who: 'JUN', text: 'And if I scratch one?' },
        { who: 'HIKARI', text: 'Then you learn what the insurance excess is on a ¥40 million car.' },
      ] },
      { t: 'obj', text: 'Park three cars without damage.', enter: 'm20Valet', done: 'm20Parked' },
      { t: 'obj', text: 'Carry coats up to the roof.', marker: 'rokkakuRoof', radius: 120, done: 'atMarker' },
      { t: 'obj', text: 'Get close to Amane.', done: 'm20Close' },
      { t: 'obj', text: 'Plant the bug on her phone.', done: 'm20Plant', after: 'm20Kirishima' },
      { t: 'obj', text: 'Listen in.', done: 'm20Listen' },
      { t: 'cut', lines: [D('through the glass, JUN sees a silver-haired man from behind, shoulders shaking with laughter')] },
      { t: 'cut', lines: [D('A service stairwell. JUN leans against the wall.')] },
      { t: 'call', lines: [
        { who: 'HIKARI', text: 'Parole? You went quiet. Quieter.' },
        { who: 'JUN', text: 'I know that laugh.' },
        { who: 'HIKARI', text: 'Whose?' },
        { who: 'JUN', text: "A dead man's." },
      ] },
      { t: 'obj', text: '', done: 'a3CallOver' }, // the card waits for the call to finish
      { t: 'card', title: 'PENTHOUSE — COMPLETE', sub: '', pay: T.pay.M20 },
      { t: 'text', from: 'MIKA', text: 'Someone left flowers at the shop. Expensive ones. No card. Weird.' },
    ],
  },
  // ===================================================================================
  {
    id: 'M21', title: 'GHOST', giver: 'ramen', start: 'ramen', ambience: 'night', setup: 'm21Setup', retryAt: 'asagiri', // retry from the temple gate
    failCheck: 'm21TooLate',
    steps: [
      { t: 'cut', lines: [D("Night. Sakamaki Ramen's door hangs open; the counter is overturned. Expensive flowers lie scattered on the floor. JUN's phone rings. The screen says MIKA.")] },
      { t: 'call', lines: [
        { who: 'TETSU', text: 'Jun, my boy. You never could leave a thing alone.' },
        { who: 'JUN', text: '…Tetsu.' },
        { who: 'TETSU', text: 'You went to my funeral, I hear. Touching. Your flowers were cheap.' },
        { who: 'JUN', text: "Where's Mika?" },
        { who: 'TETSU', text: 'Safe, with me, at the old temple. She makes excellent tea. Better than her ramen.' },
        { who: 'TETSU', text: 'Come alone, or come late. Your choice.' },
      ] },
      { t: 'obj', text: 'Get to the old temple.', marker: 'asagiri', radius: 120, done: 'm21Reach', after: 'm21Guards' },
      { t: 'obj', text: 'Fight through the Yatagarasu guards.', done: 'm21Fight' },
      { t: 'obj', text: 'Find Mika.', marker: 'temple', radius: 150, done: 'atMarker' },
      { t: 'cut', lines: [
        D('The courtyard under the giant red lantern. MIKA is tied to a bench. TETSU, silver-haired in a black tactical coat, holds a teacup.'),
        { who: 'TETSU', text: 'Jun! Look at you. Taller, somehow.' },
        { who: 'JUN', text: 'Let her go.' },
        { who: 'TETSU', text: "She's free to go. She just can't walk with that rope on. (laughs)" },
        { who: 'TETSU', text: 'You know why you\'re alive? I told Mibu to leave the driver. "The driver never talks."' },
        { who: 'TETSU', text: "And you never did. Six years. I've never been prouder." },
        { who: 'JUN', text: 'You changed the route.' },
        { who: 'TETSU', text: 'I changed my life. Daigo and Shin were the price. You were the receipt.' },
        { who: 'JUN', text: 'You let me do six years.' },
        { who: 'TETSU', text: 'I let you live. You were always my favourite.' },
        D("A Yatagarasu SUV skids into the courtyard. A guard tosses a flare into the food stalls beside MIKA's bench. Flames catch."),
        { who: 'TETSU', text: '(stepping into the SUV) The ship sails soon. Come and wave goodbye.' },
      ] },
      { t: 'obj', text: 'Free Mika.', enter: 'm21Fire', done: 'm21Free' },
      { t: 'obj', text: 'Get Mika to safety.', marker: 'asagiri', radius: 70, enter: 'm21Run', done: 'm21Safe' },
      { t: 'run', hook: 'm21Dawn' },
      { t: 'cut', lines: [
        D('The temple grounds at dawn. Smoke from the burned stalls. MIKA sits on the steps, shaking. JUN sits beside her.'),
        { who: 'MIKA', text: 'He kept talking about you. Like he was proud.' },
        { who: 'JUN', text: 'He trained me.' },
        { who: 'MIKA', text: 'He said you brought Daigo onto the crew. That you owe him.' },
        { who: 'JUN', text: '(long pause) I did. Daigo needed money for his mother. I said I knew a job.' },
        { who: 'MIKA', text: 'Is that why you never talked? Six years?' },
        { who: 'JUN', text: "Talking wouldn't bring him back." },
        { who: 'MIKA', text: 'No. (takes his hand) But you can stop carrying him alone.' },
      ] },
      { t: 'card', title: 'GHOST — COMPLETE', sub: '', pay: T.pay.M21 },
      { t: 'text', from: 'KENTA', text: "heard tetsu's alive. heard he's on that ship. raijin's coming. don't argue." },
    ],
  },
  // ===================================================================================
  {
    id: 'M22', title: 'LAST STAND', giver: ALLY, start: 'mibuStaging', ambience: 'night', setup: 'm22Setup',
    failCheck: 'm22Escaped', failCall: { who: 'MIBU', text: 'Bye, Jun! Expensive, remember?' },
    steps: [
      { t: 'cut', lines: [
        D('A Rokkaku Hills street at night, lined with black sedans. SAEKO, now head of the family, stands with fifty men.', 'yakuza'),
        A('SAEKO', "Mibu hasn't left his penthouse since the storm. He's afraid of the family."),
        A('SAEKO', 'He should be. My men take the lobby. The top floor is yours, Sakamaki-san.'),
        A('JUN', 'And Mibu?'),
        A('SAEKO', "Bring him to me alive. My father's house has rules."),
        D('A police command van. SAWADA hands JUN a vest.', 'police'),
        P('SAWADA', "I finally have a warrant. Problem: half the officers who'd serve it are on Mibu's payroll."),
        P('SAWADA', 'My unit takes the lobby. You reach the top before someone tips him off.'),
        P('JUN', 'And Mibu?'),
        P('SAWADA', 'Alive. I want him in a courtroom, not a morgue.'),
      ] },
      { t: 'obj', text: 'Fight up through the tower.', enter: 'm22Lobby', done: 'm22Floors' },
      { t: 'obj', text: 'Reach the penthouse.', marker: 'mibuTower', radius: 40, done: 'atMarker' },
      { t: 'obj', text: 'Beat Mibu.', enter: 'm22Mibu', done: 'm22Boss' },
      { t: 'obj', text: 'Bring down the helicopter.', hint: "shoot the rotor, or harpoon the skid with Umibōzu's Hook", enter: 'm22Heli', done: 'm22HeliDown' },
      { t: 'cut', lines: [
        D('The helipad. Wreckage smokes. MIBU kneels in a torn suit, his gold watch cracked.'),
        { who: 'MIBU', text: 'I told you enemies were expensive, Jun.' },
        { who: 'JUN', text: 'I can afford it.' },
        { who: 'MIBU', text: "(laughs, winces) You don't understand. Amane made me. Hayami made her. I'm a middle manager." },
        { who: 'JUN', text: "Where's the ship?" },
        { who: 'MIBU', text: "Pier 9, midnight tomorrow. Hayami's aboard. Kill him for me, would you?" },
        A('SAEKO', '(arriving, her men lifting MIBU) Mibu-san. The family will hear your apology now.'),
        P('SAWADA', "(arriving, cuffing him) Ryūji Mibu, you're under arrest. Try not to bleed on my car."),
      ] },
      { t: 'run', hook: 'm22Unlock' },
      { t: 'card', title: 'LAST STAND — COMPLETE', sub: 'Unlocked: Black Iron (Legendary)', pay: T.pay.M22 },
    ],
  },
  // ===================================================================================
  {
    id: 'M23', title: 'TSUKUYOMI', giver: ALLY, start: 'hideout', ambience: 'afternoon', setup: 'm23Setup',
    steps: [
      { t: 'cut', lines: [
        D('The Glitch hideout. Every monitor shows Tsukuyomi Tower. HIKARI, PIP, KENTA and GORO crowd around; the ally is on a video call.'),
        { who: 'HIKARI', text: "Mibu's gone. Amane knows it. She's in the tower clearing out her office before the ship sails." },
        { who: 'KENTA', text: 'So we hit the tower.' },
        { who: 'GORO', text: 'Every cop in the city will come.' },
        { who: 'HIKARI', text: 'Good. I want an audience. When Parole reaches Amane, the ledger goes on every screen in Mirai-zaka.' },
        A('SAEKO', '(on the call) The family will hold the streets around Marukane. Tonight the Kurogane-kai works for the city.'),
        P('SAWADA', "(on the call) I can't stop the cops coming. I can make sure the right ones get there first."),
        { who: 'JUN', text: 'Floor by floor.' },
        { who: 'HIKARI', text: "Forty floors. …I didn't say it was a good plan." },
      ] },
      { t: 'obj', text: 'Break into Tsukuyomi Tower.', marker: 'towerPlaza', radius: 150, done: 'm23Break', after: 'm23BreakIn' },
      { t: 'radio', text: 'DJ ŌKAMI: Tsukuyomi Tower is under attack! Folks, this is the most exciting Tuesday in Kogane history.' },
      // "Fight up to floor 40. (checkpoints at floors 10, 20 and 30)"
      { t: 'obj', text: 'Fight up to floor 40.', enter: 'm23Floors', done: 'm23Climb' },
      { t: 'checkpoint', place: 'towerPlaza', setup: 'm23Floor10' },
      { t: 'call', lines: [{ who: 'KENTA', text: "Raijin's blocking the ramps. Cops are stuck in traffic. Thunder!" }] },
      { t: 'run', hook: 'm23Raijin' },
      { t: 'obj', text: 'Fight up to floor 40.', enter: 'm23Floors', done: 'm23Climb', after: 'm23Ogata' },
      { t: 'checkpoint', place: 'towerPlaza', setup: 'm23Floor20' },
      { t: 'obj', text: 'Fight up to floor 40.', enter: 'm23Floors', done: 'm23Climb' },
      { t: 'checkpoint', place: 'towerPlaza', setup: 'm23Floor30' },
      { t: 'obj', text: 'Fight up to floor 40.', enter: 'm23Floors', done: 'm23Climb' },
      { t: 'obj', text: "Reach Amane's office.", marker: 'tsukuyomiTower', radius: 40, done: 'atMarker', after: 'm23Office' },
      { t: 'cut', lines: [
        D("The top floor. Glass walls, the whole city below. AMANE stands calmly at the window. In the distance, Mirai-zaka's screens glow."),
        { who: 'AMANE', text: "Mr. Sakamaki. You're late. Mr. Kirishima predicted eleven minutes." },
        { who: 'JUN', text: "Where's the gold?" },
        { who: 'AMANE', text: 'Leaving. Kogane 2040 will happen with or without me.' },
        { who: 'AMANE', text: "You can't stop a city becoming the future, Mr. Sakamaki." },
        { who: 'JUN', text: "I'm not stopping the city. Just you." },
        D('Every screen in Mirai-zaka switches to the ledger: PAYMENT — MIBU TRADING — ¥200,000,000. COUNCIL "CONSULTING." BULLION, SUB-BASEMENT 3.'),
        { who: 'HIKARI', text: "(on the phone) Smile, Amane. You're on forty-metre television." },
        D('AMANE looks at the screens. For the first time, she has nothing to say.'),
        P('SAWADA', "(entering with officers) Kaoru Amane, you're under arrest. Bribery, corruption, and that ugly building."),
        A('SAEKO', "(entering) The police are on their way, Amane-san. The family thought you'd rather meet them than us."),
      ] },
      { t: 'card', title: 'TSUKUYOMI — COMPLETE', sub: '', pay: T.pay.M23 },
      { t: 'radio', station: TALK, text: 'Tsukuyomi CEO Kaoru Amane was arrested live on forty-metre screens today. Shares are down. Morale is up.' },
      { t: 'text', from: 'HIKARI', text: 'pier 9. midnight. go get your gold, parole.' },
    ],
  },
  // ===================================================================================
  // "Giver: none — everyone shows up": Hikari's text sends Jun to Pier 9, so the mission starts there.
  // No boats: Jun and Goro chase the ship by car along the shore until it is alongside the north quay.
  {
    id: 'M24', title: 'AMATERASU MARU', giver: 'pier9', start: 'pier9', ambience: 'storm', setup: 'm24Setup',
    steps: [
      { t: 'cut', lines: [
        D("Pier 9 at midnight. The Amaterasu Maru pulls away from the dock, horn booming. JUN skids to a stop at the edge. GORO is already at a speedboat's wheel, life jacket on."),
        { who: 'GORO', text: "Get in, kid. I've been practising." },
        { who: 'JUN', text: 'You hate boats.' },
        { who: 'GORO', text: 'I hate boats. I hate Tetsu more.' },
        D('Engines roar behind them. KENTA and forty Raijin bikes line the pier, headlights on the ship.'),
        { who: 'KENTA', text: "The Raijin can't swim! But we can light it up! For Daigo!" },
        { who: 'HIKARI', text: "(on the phone) The crew's all Yatagarasu. Tetsu's on the bridge deck. Go get your gold, Parole." },
        A('SAEKO', '(on the phone) The family is watching from the shore. Make my father proud.'),
        P('SAWADA', '(on the phone) Coast guard is twenty minutes out. You have nineteen.'),
      ] },
      { t: 'obj', text: 'Catch the Amaterasu Maru.', marker: 'amaterasuQuay', radius: 80, enter: 'm24Go', done: 'm24Catch' },
      { t: 'checkpoint', place: 'amaterasuQuay', setup: 'm24Alongside' }, // "Restart from the climb aboard."
      { t: 'obj', text: 'Climb aboard.', marker: 'amaterasuQuay', radius: 34, done: 'm24Climb', after: 'm24Aboard' },
      { t: 'obj', text: 'Fight across the container deck.', done: 'm24Deck' },
      { t: 'obj', text: 'Reach the bridge deck.', enter: 'm24BridgeDeck', done: 'm24AtBridge' },
      { t: 'obj', text: 'Beat Tetsu.', enter: 'm24Tetsu', done: 'm24Boss' },
      { t: 'cut', lines: [
        D('The container deck in the rain. TETSU sits against a split crate, laughing through blood. Gold glints around him.'),
        { who: 'TETSU', text: "Look at it, my boy. Two billion yen, and still the ugliest colour I've ever seen." },
        { who: 'JUN', text: 'Daigo had a mother. Shin had a family.' },
        { who: 'TETSU', text: 'And I had a pension plan. (coughs) So. What does a driver do with all this gold?' },
        D("Sirens on the water: the ally's boats close in."),
        { who: 'TETSU', text: "Keep it, give it away, drown it. Whatever you pick, you'll still be my best work." },
        { who: 'JUN', text: 'I was never your work.' },
      ] },
      { t: 'choice', prompt: '', set: 'ending', options: [{ label: 'Keep it', value: 'shogun' }, { label: 'Give it to Asagiri', value: 'oldtown' }, { label: 'Sink it', value: 'cleanslate' }] },
      { t: 'cut', lines: [
        A('SAEKO', "(her men lift TETSU) Hayami-san. The family has questions. You'll have a long time to answer them."),
        P('SAWADA', "(cuffing him) Tetsu Hayami, you're under arrest. Again, technically. You were dead."),
      ] },
      { t: 'card', title: 'AMATERASU MARU — COMPLETE', sub: '', pay: T.pay.M24 },
      { t: 'run', hook: 'm24Ending' }, // sets the scene for the chosen ending

      // ---- Shadow Shogun — keep it
      { t: 'cut', if: 'shogun', lines: [
        D('A Rokkaku Hills penthouse, months later. Kogane City glitters below. JUN wears a black suit with a gold koi on the back.'),
        A('SAEKO', "The council voted Kogane 2040 down this morning. Unanimously. Funny how generous you've made them."),
        A('JUN', "The city's not for sale."),
        A('SAEKO', "No. Now it's ours."),
        P('SAWADA', '(on the phone) The commissioner says the gold was "never recovered." Funny how that works.'),
        P('JUN', 'Funny.'),
        P('SAWADA', 'Keep your nose clean, Sakamaki. Cleaner than mine.'),
      ] },
      { t: 'text', from: 'MIKA', text: "Shop's busy. People ask about you. I tell them you moved away.", if: 'shogun' },
      { t: 'card', title: 'SHADOW SHOGUN', sub: '', if: 'shogun' },

      // ---- Old Town — give it to Asagiri
      { t: 'cut', if: 'oldtown', lines: [
        D('Asagiri in spring. Cherry blossoms over a freshly painted shōtengai. A banner: ASAGIRI COMMUNITY TRUST — NOT FOR SALE.'),
        { who: 'MIKA', text: 'An anonymous donor bought out every lease on the street. In gold bars. Left in a ramen pot.' },
        { who: 'JUN', text: 'Weird donor.' },
        { who: 'MIKA', text: "Very weird. (sets down a bowl) Eat. You're working the lunch rush." },
        { who: 'JUN', text: 'Deliveries?' },
        { who: 'MIKA', text: 'You drove a cargo ship. You can drive soup.' },
        A('SAEKO', '(at the end of the counter) Best ramen in Kogane, Sakamaki-san. The family protects it now.'),
        P('SAWADA', "(off duty, sitting down) Two shoyu. And don't tell me where the gold went."),
      ] },
      { t: 'card', title: 'OLD TOWN', sub: '', if: 'oldtown' },

      // ---- Clean Slate — sink it
      { t: 'cut', if: 'cleanslate', lines: [
        D('JUN kicks the last crate over the rail. Gold vanishes into Kogane Bay. Cut to Kogane Central Station, the last train of the night. JUN holds a paper bag, as on the day he got out.'),
        { who: 'MIKA', text: "You're really going." },
        { who: 'JUN', text: 'Everyone wanted that gold. Now they want me.' },
        { who: 'MIKA', text: 'Write to me. Not about the weather.' },
        { who: 'JUN', text: '(beat) The weather will be very bad.' },
        { who: 'MIKA', text: '(laughing, crying) Idiot. (beat) I missed you.' },
      ] },
      { t: 'radio', station: TALK, text: 'The Kurogane-kai announced a peaceful change of leadership today. Very peaceful. Extremely peaceful.', if: 'cleanYakuza' },
      { t: 'radio', station: TALK, text: 'Inspector Yumi Sawada was promoted today after the biggest corruption case in city history.', if: 'cleanPolice' },
      { t: 'card', title: 'CLEAN SLATE', sub: '', if: 'cleanslate' },
      { t: 'run', hook: 'm24Fishermen', if: 'cleanslate' }, // after the credits
    ],
  },
];
