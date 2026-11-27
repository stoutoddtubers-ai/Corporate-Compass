// Missions 1-3, copied line for line from the Script and Writing doc ("Act 1 script" tab).
// Text lives here; the small bits of game logic each mission needs are the named
// "hooks" in src/systems/missionHooks.ts.
export interface Line { who: string; text: string; /** only show if this flag is set ("!flag" = not set) */ if?: string }

export type Step =
  | { t: 'cut'; lines: Line[] }
  | { t: 'obj'; text: string; hint?: string; marker?: string; radius?: number; need?: 'car' | 'scooter' | 'zenki'; enter?: string; done: string; after?: string }
  | { t: 'card'; title: string; sub: string }
  | { t: 'text'; from: string; text: string }
  | { t: 'call'; lines: Line[] }
  | { t: 'radio'; text: string; station?: string }
  | { t: 'run'; hook: string };

export interface Mission {
  id: string;
  title: string;
  /** Place where the mission starts (walk into the marker). null = starts by itself. */
  giver: string | null;
  /** Where Jun is put when the mission (re)starts. */
  start: string;
  ambience: 'dawnRain' | 'day' | 'afternoon' | 'night';
  setup: string;
  failCheck?: string;
  failCall?: Line;
  steps: Step[];
}

const D = (text: string): Line => ({ who: '', text }); // stage direction

/** PLACEHOLDER numbers the script does not give. */
export const MISSION_TUNING = {
  deliveryTip: 1200, // yen for a perfect delivery
  spillPerImpact: 1 / 350, // spill added per px/s of impact
  spillPerSlip: 1 / 260, // spill per second per px/s of sideways slide
  spillSlipMin: 55,
  raijinLoseDist: 620,
  raijinLoseTime: 5,
  thugDamage: 10,
  thugAttackGap: 0.9,
  raceKentaSpeed: 0.93, // Kenta's top speed as a share of his bike's maximum
  raceCheckpointRadius: 180,
  vanCameraTime: 90, // seconds (script)
  vanStopHp: 0.6, // the van gives up below this share of its health
  guardCount: 3,
  waves: [4, 5, 6], // thugs per wave (script: 3 waves)
  shopHits: 8, // seconds of smashing that wrecks one shop
  ogataStopHp: 0.5,
  tailSeeDist: 300, // courier can notice you inside this distance
  tailFootDist: 120,
  tailFillFar: 0.14, tailFillNear: 0.45, tailDrain: 0.12, // detection meter per second
  tailCruise: 125,
  listenTime: 2.6, // seconds per overheard line
  guardSeeDist: 190, // evidence warehouse guards
};

export const MISSIONS: Mission[] = [
  {
    id: 'M01', title: 'GATE OUT', giver: null, start: 'prison', ambience: 'dawnRain', setup: 'm01Setup',
    steps: [
      { t: 'cut', lines: [
        D('The steel gate grinds open. JUN walks out with a paper bag of belongings. SAWADA leans on an unmarked car, canned coffee in hand.'),
        { who: 'SAWADA', text: 'Six years. You look good. Prison food agrees with you.' },
        { who: 'JUN', text: 'Inspector.' },
        { who: 'SAWADA', text: 'No "thanks for coming"? I got up early for this.' },
        { who: 'JUN', text: "You're not giving me a ride." },
        { who: 'SAWADA', text: "No. (taps his ankle tag with her shoe) That's your ride. East bank only." },
        { who: 'SAWADA', text: 'Cross the river and every patrol car in Kogane gets your location. And I get a reason.' },
        { who: 'JUN', text: 'A reason for what?' },
        { who: 'SAWADA', text: "To finish what I started. Two billion yen in gold doesn't evaporate, Sakamaki." },
        { who: 'JUN', text: "I was the driver. Drivers don't count the money." },
        { who: 'SAWADA', text: "Then you won't mind me watching. (gets in her car) Your sister didn't come, by the way." },
        D('She drives off. Across the road, a black sedan switches on its headlights.'),
      ] },
      { t: 'cut', lines: [
        D('Two KUROGANE THUGS climb out of the sedan.'),
        { who: 'THUG 1', text: 'Sakamaki! Somebody wants a word.' },
        { who: 'THUG 2', text: 'Get in the car, or get in the trunk.' },
        { who: 'JUN', text: 'Is there a third option?' },
        { who: 'THUG 1', text: '(cracks his knuckles) Sure. Hospital.' },
      ] },
      { t: 'obj', text: 'Fight off the thugs.', hint: 'Move W A S D · Punch V · Roll Space', enter: 'm01Fight', done: 'thugsDone' },
      { t: 'obj', text: 'Steal a car.', hint: 'Press E near a car to break in', done: 'inCar' },
      { t: 'radio', text: "DJ ŌKAMI: Good morning, Kogane! Rain's clearing, traffic's crawling, and word is a certain famous getaway driver walks free today. Lock up your gold, folks!" },
      { t: 'obj', text: 'Drive to Asagiri.', marker: 'asagiri', radius: 110, need: 'car', done: 'atMarker' },
      { t: 'obj', text: 'Go home.', marker: 'ramen', radius: 34, done: 'atMarker' },
      { t: 'cut', lines: [
        D('Sakamaki Ramen. A CLOSED sign. MIKA wipes the counter with her back to the door.'),
        { who: 'MIKA', text: "We're closed." },
        { who: 'JUN', text: 'Mika.' },
        { who: 'MIKA', text: "Six years. You couldn't write?" },
        { who: 'JUN', text: 'I wrote.' },
        { who: 'MIKA', text: 'Three letters. Two were about the weather.' },
        { who: 'JUN', text: 'The weather was very bad.' },
        { who: 'MIKA', text: "(turns) Mom's funeral was in March. It rained then too." },
        D('Beat.'),
        { who: 'JUN', text: "They wouldn't let me out." },
        { who: 'MIKA', text: '(sets down a bowl) Eat. The room upstairs is yours, until you do something stupid.' },
        { who: 'JUN', text: 'Define stupid.' },
        { who: 'MIKA', text: 'Anything you were already planning.' },
        D('On the counter, a letter with a red stamp: TSUKUYOMI HOLDINGS — FINAL OFFER.'),
        { who: 'MIKA', text: "And don't touch that." },
      ] },
      { t: 'card', title: 'GATE OUT — COMPLETE', sub: 'Safehouse unlocked: Sakamaki Ramen' },
      { t: 'text', from: 'GORO', text: "Heard you're out. Come by the garage, kid. I kept something for you." },
    ],
  },
  {
    id: 'M02', title: 'HOT SOUP', giver: 'ramen', start: 'ramen', ambience: 'day', setup: 'm02Setup',
    steps: [
      { t: 'cut', lines: [
        D('Lunch rush at Sakamaki Ramen. MIKA ladles broth into three lidded bowls and points at a battered delivery scooter.'),
        { who: 'MIKA', text: "You're living here, so you're working here. Deliveries." },
        { who: 'JUN', text: 'On that?' },
        { who: 'MIKA', text: 'You drove getaway cars. You can drive soup.' },
        { who: 'JUN', text: "Getaway cars don't have soup." },
        { who: 'MIKA', text: 'Every bump spills broth. Every spill comes out of the tip.' },
        { who: 'MIKA', text: 'Every lost tip comes out of your rent.' },
        { who: 'JUN', text: 'I pay rent?' },
        { who: 'MIKA', text: 'You do now. Arcade, bathhouse, police box. In that order.' },
        { who: 'JUN', text: 'Police box.' },
        { who: 'MIKA', text: "They tip well. Don't be weird." },
      ] },
      { t: 'obj', text: 'Deliver to the arcade.', hint: 'The spill meter fills with bumps, crashes and hard turns.', marker: 'arcade', radius: 40, need: 'scooter', done: 'm02Deliver', after: 'm02Arcade' },
      { t: 'obj', text: 'Deliver to the bathhouse.', marker: 'bathhouse', radius: 40, need: 'scooter', done: 'm02Deliver', after: 'm02Bath' },
      { t: 'obj', text: 'Deliver to the police box.', marker: 'policeBox', radius: 44, need: 'scooter', done: 'm02Deliver', after: 'm02Police' },
      { t: 'obj', text: 'Return to the shop.', marker: 'ramen', radius: 40, done: 'atMarker' },
      { t: 'cut', lines: [
        D('Back at the shop. MIKA counts the tips into a jar.'),
        { who: 'MIKA', text: "That's… actually decent." },
        { who: 'JUN', text: 'I have a gentle touch.' },
        { who: 'MIKA', text: 'Mrs. Okada called. You hit her vending machine.', if: 'crashed' },
        { who: 'MIKA', text: 'Mrs. Okada called. She says you drive like an old man. It was a compliment.', if: '!crashed' },
        { who: 'MIKA', text: "A man from Tsukuyomi is coming Thursday. If you're going to be around, look scary." },
        { who: 'JUN', text: "I'll try." },
        { who: 'MIKA', text: "Don't try too hard." },
      ] },
      { t: 'card', title: 'HOT SOUP — COMPLETE', sub: 'Side job unlocked: Ramen delivery' },
    ],
  },
  {
    id: 'M03', title: 'WHEELS', giver: 'garage', start: 'garage', ambience: 'afternoon', setup: 'm03Setup',
    failCheck: 'zenkiDestroyed', failCall: { who: 'GORO', text: 'That was the car, kid. That was the whole plan.' },
    steps: [
      { t: 'cut', lines: [
        D("Goro's Garage. Sparks. GORO lifts his welding mask."),
        { who: 'GORO', text: "Look at you. Skinny. They don't feed you in there?" },
        { who: 'JUN', text: "They feed you. It just doesn't taste like anything." },
        { who: 'GORO', text: "(tosses him a ring of lock picks) Kept your tools. Figured you'd want them, or want them in the river." },
        { who: 'JUN', text: 'Undecided.' },
        { who: 'GORO', text: "I can't make rent fixing scooters. I need a real car. The black Raiden Zenki the Raijin keep at the rail yard." },
        { who: 'GORO', text: "Bring it in, I fix it up, it's yours. We split whatever you earn with it." },
        { who: 'JUN', text: "The Raijin. Kenta's crew." },
        { who: 'GORO', text: "Kenta's crew. (beat) He still blames you. For Daigo." },
        { who: 'JUN', text: 'So do I.' },
        { who: 'GORO', text: 'Then steal his car politely.' },
      ] },
      { t: 'obj', text: 'Steal the black Raiden Zenki.', marker: 'railyard', radius: 0, done: 'inZenki', after: 'm03Alarm' },
      { t: 'call', lines: [
        { who: 'GORO', text: "Alarm's tripped, kid. That's cops on top of bikers." },
        { who: 'JUN', text: 'Noticed.' },
        { who: 'GORO', text: "Bring it in. I'll give it a new face." },
      ] },
      { t: 'obj', text: 'Lose the Raijin.', done: 'raijinLost' },
      { t: 'obj', text: "Bring it to Goro's Garage.", marker: 'garage', radius: 60, need: 'zenki', done: 'atMarker' },
      { t: 'obj', text: 'Respray the car.', marker: 'spray', radius: 30, need: 'zenki', done: 'atMarker', after: 'm03Respray' },
      { t: 'cut', lines: [
        D('The Zenki rolls out of the spray booth in a new colour.'),
        { who: 'GORO', text: 'New paint, new plates. Nobody in the world has seen this car.' },
        { who: 'JUN', text: 'Kenta has.' },
        { who: 'GORO', text: "Kenta's going to see it a lot more. (holds up his phone) He just called." },
        { who: 'GORO', text: 'He wants a race.' },
      ] },
      { t: 'card', title: 'WHEELS — COMPLETE', sub: 'Garage unlocked: respray and upgrades' },
      { t: 'text', from: 'UNKNOWN NUMBER', text: 'You took my car. Tonight. K-Route on-ramp, Tetsugawa. Come alone. — K' },
    ],
  },
  {
    id: 'M04', title: 'THUNDER ROAD', giver: 'raceStart', start: 'raceStart', ambience: 'night', setup: 'm04Setup',
    failCheck: 'm04Lost', failCall: { who: 'KENTA', text: "Car's mine. Come back when you remember how to drive." },
    steps: [
      { t: 'cut', lines: [
        D('A K-Route on-ramp at midnight. Forty bikes rev under the expressway lights. KENTA steps forward, coat snapping in the wind.'),
        { who: 'KENTA', text: 'The famous Jun Sakamaki. Six years inside, and you come out to steal my car.' },
        { who: 'JUN', text: 'Goro called it a loan.' },
        { who: 'KENTA', text: 'Goro lies the way he paints. Thick.' },
        { who: 'KENTA', text: 'You know where I was the night of the heist? At the noodle stand under this ramp. Waiting for my brother.' },
        { who: 'KENTA', text: 'All night.' },
        { who: 'JUN', text: 'Kenta—' },
        { who: 'KENTA', text: 'One lap of the ring. You win, you keep the car, and I tell you something nobody else knows.' },
        { who: 'KENTA', text: "I win, the car's mine, and you walk home on that ankle tag." },
        { who: 'JUN', text: "And if I don't race?" },
        { who: 'KENTA', text: '(the bikers laugh) Then you walk home now. Slowly.' },
      ] },
      { t: 'obj', text: 'Win the race.', hint: 'Drift to fill your nitro bar. Press Shift to boost.', enter: 'm04Go', done: 'm04Race' },
      { t: 'cut', lines: [
        D('Under the ramp. KENTA pulls off his helmet and spits.'),
        { who: 'KENTA', text: 'Tch. You still corner like a ghost.' },
        { who: 'JUN', text: 'What did you want to tell me?' },
        { who: 'KENTA', text: 'Daigo called me that night. Ten minutes before.' },
        { who: 'KENTA', text: 'He said, "Tetsu changed the route." Last minute. The Kurokawa underpass, not the expressway.' },
        { who: 'JUN', text: 'Tetsu never changed a plan in his life.' },
        { who: 'KENTA', text: "He changed that one. And now he's dead too. Convenient, right?" },
        { who: 'KENTA', text: '(turns away) Keep the car, old man. Find out who sold my brother.' },
      ] },
      { t: 'card', title: 'THUNDER ROAD — COMPLETE', sub: 'Raijin standing: Friendly · Side job unlocked: Expressway races' },
      { t: 'text', from: 'HIKARI', text: "hey parole. heard you can drive. we need a driver who doesn't ask questions. denpa-cho, the arcade with the broken cat sign. — h" },
    ],
  },
  {
    id: 'M05', title: 'SIGNAL LOST', giver: 'catArcade', start: 'catArcade', ambience: 'night', setup: 'm05Setup',
    failCheck: 'm05Failed', failCall: { who: 'HIKARI', text: "And that's ninety seconds of my life I'm not getting back." },
    steps: [
      { t: 'cut', lines: [
        D('A multi-floor arcade under a broken neon cat sign. HIKARI plays a rhythm machine without looking at it.'),
        { who: 'HIKARI', text: "You're older than your mugshot." },
        { who: 'JUN', text: "Mugshots don't age." },
        { who: 'HIKARI', text: "That's the joke, Parole. Keep up." },
        { who: 'HIKARI', text: "Tsukuyomi drives a server van through here every Thursday. Physical backups. They don't trust the cloud." },
        { who: 'JUN', text: "What's on it?" },
        { who: 'HIKARI', text: 'Kogane 2040. Every building they\'re buying, and everyone they\'re "encouraging" to leave.' },
        { who: 'HIKARI', text: "My grandma's building was number 41. They called it an electrical fire." },
        { who: 'JUN', text: "Wasn't it?" },
        { who: 'HIKARI', text: 'Sure. A very organised fire. (slides him a pistol) Glitch kills the cameras for ninety seconds.' },
        { who: 'HIKARI', text: 'Stop the van, grab the rack, drive. The guards are rent-a-cops. Rent-a-cops with guns.' },
        { who: 'JUN', text: "I'm on parole." },
        { who: 'HIKARI', text: "So don't get caught. That's what parole means, right?" },
      ] },
      { t: 'obj', text: 'Wait for the van.', marker: 'ambush', radius: 110, done: 'atMarker', after: 'm05Van' },
      { t: 'call', lines: [{ who: 'HIKARI', text: "Cameras down. Ninety seconds. Eighty-nine. Eighty-eight. I'll stop counting, it's annoying." }] },
      { t: 'obj', text: 'Stop the van.', hint: 'Fire with left click, focus aim with right click. Roll to dodge bullets.', done: 'm05Stopped', after: 'm05Guards' },
      { t: 'obj', text: 'Deal with the guards.', done: 'm05GuardsDone' },
      { t: 'obj', text: 'Grab the server rack.', done: 'm05Grab' },
      { t: 'call', lines: [{ who: 'HIKARI', text: "Drive like you're carrying a bomb. You're not. Probably." }] },
      { t: 'obj', text: 'Get it to the Glitch hideout.', marker: 'hideout', radius: 60, done: 'atMarker' },
      { t: 'cut', lines: [
        D('The Glitch hideout: a capsule-hotel floor full of monitors. HIKARI types while code scrolls.'),
        { who: 'HIKARI', text: "We're in. Oh, look at you." },
        { who: 'HIKARI', text: '¥200 million from a Tsukuyomi shell company. The day after the Marukane heist.' },
        { who: 'JUN', text: 'To who?' },
        { who: 'HIKARI', text: "Account's scrubbed. Somebody paid somebody a lot of money to forget about you, Parole." },
        D('JUN stares at the screen.'),
        { who: 'JUN', text: 'Find out who.' },
        { who: 'HIKARI', text: "That's going to cost you." },
        { who: 'JUN', text: "I don't have money." },
        { who: 'HIKARI', text: "You have a car and no fear of guns. We'll work something out." },
      ] },
      { t: 'card', title: 'SIGNAL LOST — COMPLETE', sub: 'Glitch standing: Friendly · App unlocked: CamMap' },
      { t: 'radio', station: 'KOGANE TALK 1260', text: "A Tsukuyomi Holdings vehicle was robbed in Denpa-chō tonight. A spokesperson called it 'a minor data inconvenience' and 'absolutely nothing to worry about.' Twice." },
    ],
  },
  {
    id: 'M06', title: 'EVICTION NOTICE', giver: 'ramen', start: 'ramen', ambience: 'afternoon', setup: 'm06Setup',
    failCheck: 'm06ShopsLost', failCall: { who: 'MIKA', text: "They're winning, Jun. Get up!" },
    steps: [
      { t: 'cut', lines: [
        D('The covered shōtengai. Shopkeepers pull down their shutters. OGATA, in a white suit, smiles beside six men in matching windbreakers.'),
        { who: 'OGATA', text: 'Miss Sakamaki! Thursday, as promised. Tsukuyomi has raised its offer by three percent.' },
        { who: 'OGATA', text: 'Generous, in this economy.' },
        { who: 'MIKA', text: "It's not for sale." },
        { who: 'OGATA', text: 'Everything is for sale. The only question is whether you sell before or after the accident.' },
        { who: 'JUN', text: '(stepping out of the kitchen) What accident?' },
        { who: 'OGATA', text: 'Ah, the famous brother. Accidents happen in older neighbourhoods. Gas leaks. Falling signs.' },
        { who: 'JUN', text: 'Falling men.' },
        { who: 'OGATA', text: '(to his men) Help the neighbourhood understand.' },
      ] },
      { t: 'obj', text: 'Defend the shōtengai.', enter: 'm06Start', done: 'm06Waves', after: 'm06Ogata' },
      { t: 'obj', text: "Stop Ogata's car.", done: 'm06Stopped' },
      { t: 'cut', lines: [
        D("OGATA's white sedan sits crumpled against a lamppost. He dabs a split lip."),
        { who: 'OGATA', text: 'You think this changes anything? Tsukuyomi owns the council. We own the police.' },
        { who: 'OGATA', text: "We're building the future, Mr. Sakamaki. You're a parking space." },
        { who: 'JUN', text: 'Tell your boss the parking space says no.' },
      ] },
      { t: 'obj', text: 'Return to the shop.', hint: 'Turf defended. Asagiri Arcade is yours — owned turf pays daily and sends you recruits.', marker: 'ramen', radius: 44, done: 'atMarker' },
      { t: 'cut', lines: [
        D("Sakamaki Ramen, after closing. MIKA bandages JUN's knuckles."),
        { who: 'MIKA', text: 'You looked scary.' },
        { who: 'JUN', text: 'I tried.' },
        { who: 'MIKA', text: 'You tried too hard. (beat) Thank you.' },
        { who: 'JUN', text: "They'll come back." },
        { who: 'MIKA', text: "Then we'll still be here. (drops the red-stamped letter in the bin)" },
        { who: 'MIKA', text: 'Now go wash. You smell like a fight.' },
      ] },
      { t: 'card', title: 'EVICTION NOTICE — COMPLETE', sub: 'Turf unlocked: Asagiri Arcade' },
      { t: 'text', from: 'MIKA', text: "Mrs. Okada left you a free drink on the counter. Don't get used to it." },
    ],
  },
  {
    id: 'M07', title: 'OLD FRIENDS', giver: 'canalLot', start: 'canalLot', ambience: 'dawnRain', setup: 'm07Setup',
    failCheck: 'm07Spotted', failCall: { who: 'COURIER', text: "Tail! I've got a tail!" },
    steps: [
      { t: 'cut', lines: [
        D("A canal-side lot. SAWADA's unmarked car. She hands JUN a canned coffee without asking."),
        { who: 'SAWADA', text: "You've been busy. A Tsukuyomi van got robbed in Denpa-chō." },
        { who: 'JUN', text: 'Sounds like Denpa-chō.' },
        { who: 'SAWADA', text: "Sounds like a parole violation. (sips) Relax. I don't like Tsukuyomi either." },
        { who: 'SAWADA', text: "There's a Kurogane bagman who runs cash out of Tetsugawa. I want to know where he takes it." },
        { who: 'SAWADA', text: 'My face is too famous. Yours is just infamous.' },
        { who: 'JUN', text: 'Why would I help you?' },
        { who: 'SAWADA', text: "Because I'm the only one in this city who thinks you didn't plan that ambush." },
        { who: 'SAWADA', text: "And because I'm the only one who can make that van go away." },
        { who: 'JUN', text: "That's blackmail." },
        { who: 'SAWADA', text: "That's policing. Stay back. Stay in traffic. Don't get made." },
      ] },
      { t: 'obj', text: 'Tail the courier.', hint: "The eye icon fills when the courier notices you. Break line of sight before it's full.", enter: 'm07Start', done: 'm07Moving' },
      { t: 'obj', text: 'Stay out of sight.', done: 'm07Arrived' },
      { t: 'obj', text: 'Get close enough to listen.', marker: 'containerYard', radius: 190, done: 'm07Listen' },
      { t: 'obj', text: 'Leave without being seen.', done: 'm07Leave' },
      { t: 'cut', lines: [
        D('Back at the canal. Rain on the windshield.'),
        { who: 'JUN', text: 'They know you. They said you\'ve been "handled" before.' },
        { who: 'SAWADA', text: '(quiet) My old partner, Kōno, retired the year after your trial. Beach house in Okinawa.' },
        { who: 'JUN', text: 'Nice pension.' },
        { who: 'SAWADA', text: "On a detective's salary? Very nice." },
        { who: 'SAWADA', text: "There's a tape in the evidence warehouse. The anonymous call that sent us to you that night." },
        { who: 'SAWADA', text: "Kōno logged it. Then it vanished into a box I've never been allowed to open." },
        { who: 'JUN', text: 'So open it.' },
        { who: 'SAWADA', text: "Officially, I can't touch it. (beat) Unofficially, the warehouse is in Tetsugawa, and Sunday's night shift is thin." },
        { who: 'JUN', text: 'Are you asking me to rob a police station?' },
        { who: 'SAWADA', text: "I'm a police officer, Sakamaki. I would never ask that. (starts the car)" },
      ] },
      { t: 'card', title: 'OLD FRIENDS — COMPLETE', sub: 'Contact unlocked: Sawada' },
      { t: 'text', from: 'SAWADA', text: "Sunday. Thin shift. I'll be at a very public dinner with my captain. Unrelated." },
    ],
  },
  {
    id: 'M08', title: 'EVIDENCE', giver: 'garage', start: 'garage', ambience: 'night', setup: 'm08Setup',
    steps: [
      { t: 'cut', lines: [
        D("Goro's Garage, midnight. HIKARI's laptop sits on a toolbox. GORO leans on a tow truck with a clean car strapped to its bed."),
        { who: 'HIKARI', text: 'Evidence warehouse. Two guards, sixty cameras, one very bored desk sergeant.' },
        { who: 'GORO', text: 'And one parolee with a tag that screams every time he sneezes.' },
        { who: 'HIKARI', text: "Which I kill, permanently, once you're inside. The second it dies, the system flags it." },
        { who: 'JUN', text: 'So I go in tagged, come out untagged, and every cop in Kogane comes looking.' },
        { who: 'HIKARI', text: 'Exciting, right?' },
        { who: 'GORO', text: "My truck's two blocks east with a clean car on the back. Reach it, swap, and you're a ghost." },
        { who: 'JUN', text: "Last time someone said I'd be a ghost, I did six years." },
        { who: 'GORO', text: "(quietly) Last time, it wasn't my plan." },
      ] },
      { t: 'obj', text: 'Get into the warehouse.', marker: 'warehouse', radius: 70, done: 'm08Inside' },
      { t: 'call', lines: [{ who: 'HIKARI', text: 'Cameras looping. Five minutes. Shelf 14-C, cold cases. Cold, like your personality.' }] },
      { t: 'obj', text: 'Find the heist file.', enter: 'm08FileMarker', done: 'm08AtPoint', after: 'm08File' },
      { t: 'obj', text: 'Find the tip tape.', enter: 'm08TapeMarker', done: 'm08AtPoint', after: 'm08Tape' },
      { t: 'call', lines: [{ who: 'HIKARI', text: "Got it? Good. Tag's dead. Run." }] },
      { t: 'obj', text: 'Get out.', done: 'm08Out' },
      { t: 'obj', text: "Reach Goro's tow truck.", marker: 'truck', radius: 70, done: 'atMarker', after: 'm08Swap' },
      { t: 'call', lines: [{ who: 'GORO', text: "In. Swap's done. Drive normal. Normal, kid!" }] },
      { t: 'obj', text: 'Lose the police.', done: 'heatClear' },
      { t: 'call', lines: [{ who: 'HIKARI', text: "Fun fact: your tag now thinks you're asleep in a capsule hotel in Denpa-chō. The whole city's open, Parole." }] },
      { t: 'cut', lines: [
        D("A bridge over the Kurokawa at dawn. To the west, Hanabi-chō's neon flickers off. HIKARI plays the tape on her laptop. A distorted voice crackles."),
        { who: 'TAPE', text: "(distorted) Kurokawa underpass. Grey van. The driver's still inside. Hurry." },
        { who: 'HIKARI', text: "Voice is scrubbed. The call log isn't." },
        { who: 'HIKARI', text: 'The tip came from a business line. Mibu Trading Company.' },
        { who: 'JUN', text: 'Mibu.' },
        { who: 'GORO', text: 'Ryūji Mibu. Number two in the Kurogane-kai. Runs half of Hanabi-chō.' },
        { who: 'HIKARI', text: 'So the guy who sold you out has the most guns on the other side of this bridge.' },
        { who: 'JUN', text: "(starts the car) Then that's where I'm going." },
      ] },
      { t: 'card', title: 'ACT 1 COMPLETE', sub: 'ACT 2 — TURF' },
      { t: 'radio', station: 'KOGANE TALK 1260', text: 'Police report a break-in at the Tetsugawa evidence facility. A spokesperson said nothing of value was taken, then declined to say what was taken.' },
      { t: 'text', from: 'SAWADA', text: 'Heard there was a break-in. Shocking. Tell me if you hear anything about a tape.' },
    ],
  },
];

/** In-play barks for the missions (script "In play" sections). */
export const MISSION_BARKS = {
  m01ThugDown: 'Everyone knows you hid it. Everyone.',
  m01ThugFlee: "You won't make it a block!",
  m01JunCar: "I'll bring it back. Probably.",
  m02Taba: "Is it hot? It better be hot. I'm forty hours into a high score.",
  m02Ueda: "The Sakamaki boy! You're out! …Did you bring the gold? I'm joking. Unless?",
  m02Noda: 'Two shoyu, one miso, and… oh. Oh, you\'re him.',
  m02Ishii: 'Relax. We just want the noodles. And maybe the gold.',
  m02Noda2: 'Ishii!',
  m02TipGood: "Not a drop. You've done this before.",
  m02TipOk: 'Bit of a splash. Still counts.',
  m02TipBad: 'Is this ramen or a wet bowl?',
  m02RedLight: 'Hey! Red means stop! Even for soup!',
  m02HeatHint: 'Break line of sight to lose Heat.',
  m03Biker1: "That's Kenta's car, you dead man!",
  m03Biker2: 'Pull over, grandpa!',
  m03JunCar: 'Still drives like a dream.',
  riverCall: 'That was quick. Turn around, or I stop being friendly.',
  m04Kenta: ['Daigo taught me this corner!', "You drive like you're still cuffed!"],
  m04Passed: 'No, no, no!',
  m04Bikers: 'Thunder! Thunder!',
  m05Guards: ['Hostile at the van!', 'Who hired this guy?!', "I don't get paid enough for this!"],
  m06Thugs: ["Nothing personal, it's real estate!", 'Smash the signs!'],
  m06Shops: ["Get 'em, Sakamaki boy!", 'Not the ceramics!', 'My shutters are new!'],
  m07Phone: "Yeah, I'm moving. Nobody's following me. Who'd follow me?",
  m07Half: 'Huh. Same car again?',
  m07Card: 'The courier spotted you.',
  m07Overheard: [
    ['SASAKI', "The driver's out. The boss wants him kept on the east side."],
    ['COURIER', 'The tag does that.'],
    ['SASAKI', "Tags break. If he crosses the river, he doesn't come back."],
    ['COURIER', 'And the cop?'],
    ['SASAKI', "She's been handled before. She'll be handled again."],
  ],
  m08JunFile: 'Case 2207. Marukane vault.',
  m08Police: ['Suspect on foot, east exit!', 'All units, Tetsugawa evidence facility!', "He's heading for the river!"],
} as const;

/** Light and weather for each time of day. PLACEHOLDER art direction (bible: Asagiri night light is warm amber). */
export const AMBIENCE = {
  dawnRain: { color: 0x1a2440, alpha: 0.34, lights: 0.8, rain: true },
  day: { color: 0xfff2d0, alpha: 0.0, lights: 0, rain: false },
  afternoon: { color: 0x5a2a10, alpha: 0.16, lights: 0.25, rain: false },
  night: { color: 0x0a0f2a, alpha: 0.46, lights: 1, rain: false },
} as const;
