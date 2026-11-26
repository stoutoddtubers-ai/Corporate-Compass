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
  | { t: 'radio'; text: string }
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
} as const;

/** District title card (script "District cards"). */
export const DISTRICT_CARD = { kanji: '朝霧', name: 'ASAGIRI', tagline: 'Old town. Old grudges.' } as const;

/** Light and weather for each time of day. PLACEHOLDER art direction (bible: Asagiri night light is warm amber). */
export const AMBIENCE = {
  dawnRain: { color: 0x1a2440, alpha: 0.34, lights: 0.8, rain: true },
  day: { color: 0xfff2d0, alpha: 0.0, lights: 0, rain: false },
  afternoon: { color: 0x5a2a10, alpha: 0.16, lights: 0.25, rain: false },
  night: { color: 0x0a0f2a, alpha: 0.46, lights: 1, rain: false },
} as const;
