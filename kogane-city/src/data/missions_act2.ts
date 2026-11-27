import type { Mission, Line, Step } from './missions';

// Missions 9-16, copied line for line from the Script and Writing doc ("Act 2 script" tab).
// Text lives here; the game logic each mission needs is in src/systems/hooks_act2.ts.
// Lines marked _A in the script are `if: 'yakuza'`, lines marked _B are `if: 'police'`.

const D = (text: string): Line => ({ who: '', text }); // stage direction

/** PLACEHOLDER numbers the script does not give. Change these to tune Act 2. */
export const ACT2_TUNING = {
  // Payouts in yen. The bible only gives a range for story missions (¥20,000–¥500,000, rising by act).
  pay: { M09: 60000, M10: 80000, M11: 70000, M12: 150000, M13: 90000, M14: 100000, M15: 120000, M16: 200000 },

  // M09 Welcome to Hanabi-chō
  m09Take: 8000, // yen Jun keeps per business when he takes it all; "Take half" pays half
  m09Boys: 2, // Kaz's "boys" in the Club Mirage brawl (plus Kaz)

  // M10 Pachinko Panic
  m10Waves: [4, 5, 6, 7], // raiders per wave (script: 4 waves)
  m10MaxLost: 20, // machines destroyed = mission failed (script)
  m10MachineHits: 3, // seconds a raider needs to smash one machine
  m10OfficeHits: 6, // seconds a raider needs at the cash-office door
  m10SpillTime: 8, // seconds spilled steel balls stay slippery
  m10SpillRadius: 30,
  m10SlipStun: 1.2, // seconds an enemy is down after slipping
  m10SlideTime: 0.45, m10SlideSpeed: 240, // Jun's own slide
  m10SaekoReach: 46, m10SaekoDamage: 45, m10SaekoGap: 0.8, // Saeko's katana (bible: katana 45 damage)
  m10VanCruise: 70, // the van's speed before its driver panics (x1.7)
  m10VanStopHp: 0.55, // the van gives up below this share of its health
  m10LeaderSpeed: 128, // the raid leader on foot (Jun runs at 150)

  // M11 Scramble
  m11Crowd: 14, // extra people on the crossing
  m11ThiefSpeed: 146, m11ThiefFast: 170, m11ThiefSlow: 110, // he sprints when Jun is close, dawdles when Jun is far behind
  m11LoseDist: 560, m11LoseTime: 4, // this far behind for this long = lost him
  m11ScooterCruise: 110, // x1.7 while fleeing
  m11ScooterStopHp: 0.5,

  // M12 Gold Rush
  m12ConvoyTime: 60, // seconds to get the dump truck across the tunnel before the convoy shows up
  m12ConvoyWait: 25, // if the convoy has not reached the tunnel by then, it is stopped where it is
  m12StopShort: 110, // the convoy stops this far from the dump truck
  m12ArmourMult: 3, // the armoured truck has this many times a box truck's health
  m12HoldTime: 90, // (script)
  m12HoldExtra: 20, // "Call it a hundred and ten." (script)
  m12ReinforceEvery: 22, m12Reinforce: 2, // more escort guards arrive while the lock is being opened

  // M13 Ink
  m13TagTime: 2.5, // seconds to tag one control box
  m13PerTag: 2, // soldiers who come running after each tag (plus one who goes to paint over a tag)
  m13WipeHits: 10, // seconds a soldier needs to paint over a tag
  m13Final: 5, // soldiers in "Survive Mibu's soldiers."

  // M14 The Wakagashira
  m14MibuHp: 200,
  m14FujitaHp: 30,
  m14Guards: 2, // extra bodyguards who join the two from the VIP room if Fujita is spared

  // M15 Fork in the Road
  m15RunJump: 0.4, // suspicion added by a dodge roll ("running") in front of a guard
  m15OgataDist: 60, m15OgataTime: 1.2, m15OgataJump: 0.4, // lingering near Ogata
  m15SeeDist: 150, // floor 9: the guard notices Jun inside this distance (with a clear line of sight)
  m15FillNear: 1.4, m15FillFar: 0.55, m15Drain: 0.12, // suspicion per second
  m15PatrolSpeed: 70, m15PatrolRush: 140, // the floor 9 guard; he hurries once the safe is open
  m15SafeTime: 1.5, m15PhotoTime: 4.5, // seconds

  // M16 Typhoon
  /** Flooded streets, in tiles [x, y, width, height]. The K-Route (the "high roads") stays dry. */
  m16Floods: [[16, 94, 124, 4], [108, 68, 4, 52], [76, 68, 4, 42]],
  m16FloodSpeed: 70, // a car in flood water is held to about this speed
  m16BlockDist: 520, // Mibu's roadblock opens fire inside this distance
  m16Blockers: 4,
  m16Waves: [5, 6, 7], // Mibu's soldiers per wave (script: 3 waves)
  m16RoomHits: 6, // seconds a soldier needs at Genzō's door before "The house fell."
  m16Squad: 3, // allies beside Saeko / Sawada
  m16AllyReach: 230, m16AllyDamage: 14, m16AllyGap: 0.9,
};
const T = ACT2_TUNING;

/** M09: one protection stop — the owner's line, the mercy-or-menace choice, and the answer. */
function collect(text: string, place: string, who: string, line: string, set: string, mercy: string, menace: string): Step[] {
  const key = set.slice(3); // 'm09rei' -> 'rei'
  return [
    { t: 'obj', text, marker: place, radius: 34, done: 'atMarker' },
    { t: 'cut', lines: [{ who, text: line }] },
    { t: 'choice', prompt: 'Take it all (menace: full cash) or Take half (mercy: locals like you more).', set, options: [{ label: 'Take it all', value: key + 'Menace' }, { label: 'Take half', value: key + 'Mercy' }] },
    { t: 'cut', lines: [{ who, text: mercy, if: key + 'Mercy' }, { who, text: menace, if: key + 'Menace' }] },
  ];
}

export const MISSIONS_ACT2: Mission[] = [
  {
    id: 'M09', title: 'WELCOME TO HANABI-CHŌ', giver: 'hanabiGate', start: 'hanabiGate', ambience: 'night', setup: 'm09Setup',
    failCheck: 'm09OwnerDead', failCall: { who: 'SAEKO', text: 'I wanted their money, Sakamaki-san. Not their funerals.' },
    steps: [
      { t: 'cut', lines: [
        D("Hanabi-chō's red neon gate. Touts call out. Four KUROGANE SOLDIERS step into JUN's path."),
        { who: 'SOLDIER', text: 'Wrong side of the river, driver.' },
        { who: 'JUN', text: "I'm looking for Mibu." },
        { who: 'SOLDIER', text: "Everybody's looking for something. Most of them end up in the canal." },
        D('A white car rolls up. SAEKO steps out. The soldiers bow.'),
        { who: 'SAEKO', text: "Leave him. (to JUN) Sakamaki-san. You beat Ōga's boy and robbed Tsukuyomi in one week." },
        { who: 'SAEKO', text: "My father's men take a month to do nothing." },
        { who: 'JUN', text: "You're Saeko." },
        { who: 'SAEKO', text: "And you're looking for Mibu-san. So am I, in a manner of speaking." },
        { who: 'SAEKO', text: 'Four businesses here used to pay my father. Now they pay Mibu. Collect from them for me tonight.' },
        { who: 'JUN', text: 'Why me?' },
        { who: 'SAEKO', text: "Mibu-san collects from these streets too. Let's see who they fear more." },
      ] },
      ...collect("Collect from Mama Rei's bar.", 'mamaRei', 'MAMA REI', "Genzō's girl sends a parolee now? Fine. Tell her the ice machine's broken too.", 'm09rei',
        "Half? You're either kind or stupid. Come back for a drink sometime.", "Take it. Tell Saeko I'll remember."),
      ...collect('Collect from the Lucky 7 arcade.', 'lucky7', 'LUCKY 7 MANAGER', "Mibu's men came Monday! I can't pay twice!", 'm09lucky',
        "Thank you. Thank you. Don't tell Mibu.", 'Fine! Rob me! Everybody else does!'),
      ...collect('Collect from Hanabi Florist.', 'florist', 'MRS. HANA', 'I sell flowers to every club on this street. Funerals too. Lately, mostly funerals.', 'm09hana',
        "Kind. Kindness doesn't last long in Hanabi-chō.", "I'll save you a wreath."),
      { t: 'obj', text: 'Collect from Club Mirage.', marker: 'clubMirage', radius: 34, done: 'atMarker' },
      { t: 'cut', lines: [{ who: 'KAZ', text: 'We pay Mibu-san. Only Mibu-san. Boys!' }] },
      { t: 'obj', text: 'Collect from Club Mirage.', enter: 'm09Brawl', done: 'm09BrawlDone' }, // (brawl)
      { t: 'cut', lines: [
        { who: 'KAZ', text: '(on the floor) Mibu-san is going to hear about this.' },
        { who: 'JUN', text: 'Good.' },
      ] },
      { t: 'obj', text: 'Report to Saeko.', marker: 'saekoOffice', radius: 34, done: 'atMarker' },
      { t: 'run', hook: 'm09Tally' },
      { t: 'cut', lines: [
        D('A rooftop above Hanabi-chō. SAEKO weighs the envelope without opening it.'),
        { who: 'SAEKO', text: "You took less than you could have. The street will love you. My accountants won't.", if: 'mostlyMercy' },
        { who: 'SAEKO', text: "Every yen. My father would approve. I'm not sure I do.", if: '!mostlyMercy' },
        { who: 'SAEKO', text: "Club Mirage hasn't paid my family in two years. Tonight it did. Mibu-san will notice." },
        { who: 'JUN', text: "That's the idea." },
        { who: 'SAEKO', text: "You collect for me now, Sakamaki-san. My father thinks it's a favour." },
        { who: 'JUN', text: 'What is it?' },
        { who: 'SAEKO', text: "A test. (turns to go) Don't fail it. I'd hate to clean up after you." },
      ] },
      { t: 'card', title: 'WELCOME TO HANABI-CHŌ — COMPLETE', sub: 'Safehouse for sale: Hanabi-chō walk-up', pay: T.pay.M09 },
      { t: 'text', from: 'UNKNOWN NUMBER', text: "Jun! We haven't met, and I've heard so much. Let's fix that soon. — R. Mibu" },
    ],
  },
  {
    id: 'M10', title: 'PACHINKO PANIC', giver: 'pachinko', start: 'pachinko', ambience: 'night', setup: 'm10Setup',
    failCheck: 'm10Lost', // the fail line is a bark from Saeko (ACT2_BARKS.m10Fail)
    steps: [
      { t: 'cut', lines: [
        D('Golden Ball: a wall of noise, lights and steel balls. SAEKO reads a message on her phone, then pockets it.'),
        { who: 'SAEKO', text: "Mibu's men are coming here tonight. Jackpot night. Full house." },
        { who: 'JUN', text: 'Clear the floor.' },
        { who: 'SAEKO', text: "And tell four hundred gamblers to stop? They'd riot before Mibu arrived." },
        { who: 'SAEKO', text: "Keep them playing. Keep Mibu's men out. Break as few machines as you can." },
        { who: 'JUN', text: 'How few?' },
        { who: 'SAEKO', text: 'Each one costs more than your car.' },
        D('Outside, black vans screech to a stop.'),
      ] },
      { t: 'obj', text: 'Defend Golden Ball. (4 waves)', hint: 'Shot machines spill steel balls. Enemies slip on them. So do you.', enter: 'm10Start', done: 'm10Waves', after: 'm10Van' },
      { t: 'obj', text: 'Stop the van at the back door.', done: 'm10VanStopped', after: 'm10Leader' },
      { t: 'obj', text: 'Catch the raid leader.', done: 'm10Caught' },
      { t: 'cut', lines: [
        D('The back alley. The RAID LEADER is pinned against a van.'),
        { who: 'RAID LEADER', text: 'Okay! Okay! Mibu-san pays double what the old man pays! Everybody knows!' },
        { who: 'SAEKO', text: 'Everybody except my father.' },
      ] },
      { t: 'cut', lines: [
        D('The Kurogane mansion. A quiet tatami room. GENZŌ, thin and pale, sits by a garden window. SAEKO kneels. JUN stands.'),
        { who: 'GENZŌ', text: 'So. The driver. (long pause) You did six years without a word.' },
        { who: 'JUN', text: 'Yes.' },
        { who: 'GENZŌ', text: 'Do you know how rare that is? Silence. My own men talk more than television.' },
        { who: 'SAEKO', text: 'Father, Mibu sent men into Golden Ball tonight.' },
        { who: 'GENZŌ', text: 'Mibu has been loyal for twenty years.' },
        { who: 'SAEKO', text: 'Mibu has been loyal to money for twenty years.' },
        { who: 'GENZŌ', text: "(to JUN) A family is a house, young man. Termites don't knock." },
        { who: 'GENZŌ', text: 'Bring me proof. I am too old to act on rumours, and too sick to wait for them.' },
      ] },
      { t: 'card', title: 'PACHINKO PANIC — COMPLETE', sub: 'Side activity unlocked: Pachinko', pay: T.pay.M10 },
      { t: 'text', from: 'HIKARI', text: "found something on the money trail. a courier's bringing it. mirai-zaka crossing, 9pm. don't be late." },
    ],
  },
  {
    id: 'M11', title: 'SCRAMBLE', giver: 'scrambleCorner', start: 'scrambleCorner', ambience: 'night', setup: 'm11Setup',
    failCheck: 'm11Lost', failCall: { who: 'HIKARI', text: "And he's on a train. Great. Love that for us." },
    steps: [
      { t: 'cut', lines: [
        D('The scramble crossing at night under giant screens. JUN waits on the corner, phone to his ear.'),
        { who: 'HIKARI', text: "(on the phone) Courier's name is Pip. Pink jacket. She's carrying the decrypted bank trail on a drive." },
        { who: 'JUN', text: 'Where is she?' },
        { who: 'HIKARI', text: 'Crossing toward you right now. Light changes in three, two—' },
        D('The all-way signal chimes. The crowd floods the crossing. A KUROGANE STREET KID shoves PIP and snatches her bag.'),
        { who: 'PIP', text: 'Hey! Hey!' },
        { who: 'HIKARI', text: "…Okay, that's bad. That's the drive. Chase him!" },
      ] },
      { t: 'obj', text: 'Chase the thief.', done: 'm11Chase', after: 'm11Up' },
      { t: 'call', lines: [{ who: 'HIKARI', text: "He's heading for the station roof. Why do they always go up? Nobody escapes by going up." }] },
      { t: 'obj', text: "Don't lose him in the crowd.", done: 'm11Crowd', after: 'm11Toss' },
      { t: 'call', lines: [{ who: 'HIKARI', text: 'Scooter, heading for the park. Borrow something with wheels.' }] },
      { t: 'obj', text: 'Stop the scooter.', done: 'm11Stopped' },
      { t: 'obj', text: 'Get the drive to Hikari.', marker: 'hideout', radius: 60, done: 'atMarker' },
      { t: 'cut', lines: [
        D('The Glitch hideout. HIKARI plugs in the drive. PIP sits nearby with an ice pack on her elbow.'),
        { who: 'HIKARI', text: 'The ¥200 million went through four shell companies, two banks and one very sad cat-café chain.' },
        { who: 'JUN', text: 'And?' },
        { who: 'HIKARI', text: 'And it lands in Mibu Trading. Same company that phoned in your tip.' },
        { who: 'PIP', text: 'So the guy who sold you out also paid himself for it?' },
        { who: 'HIKARI', text: 'No. Somebody paid him. Tsukuyomi.' },
        { who: 'HIKARI', text: "Two hundred million yen, Parole. That's what you were worth to them. I'd be insulted." },
        { who: 'JUN', text: 'I am.' },
      ] },
      { t: 'card', title: 'SCRAMBLE — COMPLETE', sub: 'Safehouse for sale: Mirai-zaka apartment', pay: T.pay.M11 },
      { t: 'text', from: 'GORO', text: 'Got a tip on a Tsukuyomi truck. Marukane, once a month. Come see me.' },
    ],
  },
  {
    id: 'M12', title: 'GOLD RUSH', giver: 'garage', start: 'garage', ambience: 'dawnRain', setup: 'm12Setup', retryAt: 'marukaneLot',
    failCheck: 'm12Failed', failCall: { who: 'GORO', text: "Truck's out. We're done. Scatter." },
    steps: [
      { t: 'cut', lines: [
        D("Goro's Garage. A map of Marukane on the wall, red string between pins. HIKARI on a laptop. KENTA leans on his bike."),
        { who: 'GORO', text: 'Once a month, Tsukuyomi moves "collateral" from the tower to Kogane Mutual Bank. One armoured truck, two escort SUVs.' },
        { who: 'KENTA', text: 'They use Tōmon Tunnel. One way in, one way out. The Raijin block the exit with bikes.' },
        { who: 'GORO', text: 'Jun drops a dump truck across the entrance. The escorts are boxed in.' },
        { who: 'HIKARI', text: 'I open the truck. Ninety seconds.' },
        { who: 'JUN', text: 'Ninety seconds again.' },
        { who: 'HIKARI', text: "It's my number. I'm attached to it." },
        { who: 'GORO', text: "Then we split. Raijin takes the cash. Glitch takes the data. Jun takes whatever's left." },
        { who: 'JUN', text: "What's left?" },
        { who: 'GORO', text: "(beat) We'll find out." },
      ] },
      { t: 'obj', text: 'Steal the dump truck.', marker: 'marukaneLot', radius: 0, done: 'm12InDump', after: 'm12Clock' },
      { t: 'obj', text: 'Block Tōmon Tunnel.', marker: 'tomonTunnel', radius: 70, done: 'm12Block' },
      { t: 'call', lines: [{ who: 'KENTA', text: "Exit's blocked! Thunder, thunder!" }] },
      { t: 'obj', text: 'Hold off the escort. (90 seconds)', enter: 'm12Escort', done: 'm12Hold' },
      { t: 'call', lines: [{ who: 'HIKARI', text: "Lock's harder than I thought. Ninety seconds was optimistic. Call it a hundred and ten." }] },
      { t: 'run', hook: 'm12Longer' },
      { t: 'obj', text: 'Hold off the escort. (90 seconds)', done: 'm12Hold', after: 'm12Open' },
      { t: 'obj', text: 'Grab the cargo.', done: 'm12Grab' },
      { t: 'obj', text: 'Escape in the Zenki.', marker: 'tomonTunnel', radius: 0, done: 'inZenki', after: 'm12Cops' },
      { t: 'call', lines: [{ who: 'GORO', text: 'Cops on the ramp. Take the canal road, kid.' }] },
      { t: 'obj', text: 'Lose the police.', done: 'heatClear' },
      { t: 'cut', lines: [
        D('The garage at dawn. Cash on a tarp. GORO holds up a single gold bar, turning it in the light.'),
        { who: 'KENTA', text: "That's a lot of yen." },
        { who: 'GORO', text: "That's not yen. Kogane Mutual Bank stamp. Serial number." },
        { who: 'HIKARI', text: 'The Marukane bars.' },
        { who: 'GORO', text: "That stamp's six years old, kid. This is your gold." },
        { who: 'JUN', text: "(takes the bar) It's been in Tsukuyomi's hands the whole time." },
        { who: 'KENTA', text: '(quiet) Daigo died for that.' },
        D('Silence.'),
        { who: 'JUN', text: "Then let's make it expensive for them." },
      ] },
      { t: 'card', title: 'GOLD RUSH — COMPLETE', sub: 'Tsukuyomi standing: Hostile · Yatagarasu patrols now appear in Marukane', pay: T.pay.M12 },
      { t: 'radio', station: 'KOGANE TALK 1260', text: "An armoured truck was robbed in a Marukane tunnel. Tsukuyomi won't say what was inside, but asks the public to return 'anything shiny.'" },
    ],
  },
  {
    id: 'M13', title: 'INK', giver: 'miraiLot', start: 'miraiLot', ambience: 'afternoon', setup: 'm13Setup',
    failCheck: 'm13Wiped', failCall: { who: 'HIKARI', text: 'They painted over us. Painted over us! Start again.' },
    steps: [
      { t: 'cut', lines: [
        D('A Mirai-zaka rooftop over the crossing. A crate of spray cans. PIP shakes a can. HIKARI points at the giant screens.'),
        { who: 'HIKARI', text: 'Mirai-zaka has five big screens. Whoever controls them controls what this city looks at.' },
        { who: 'PIP', text: "Right now that's Tsukuyomi ads and Mibu's club ads." },
        { who: 'HIKARI', text: "Tag each screen's control box. Glitch does the rest." },
        { who: 'JUN', text: 'Graffiti.' },
        { who: 'HIKARI', text: 'Nobody reads graffiti anymore. Everybody reads a forty-metre screen.' },
        { who: 'PIP', text: "Mibu's guys patrol up here. They'll come running." },
        { who: 'JUN', text: 'Let them.' },
      ] },
      { t: 'obj', text: 'Tag the screen control boxes. (0/5)', done: 'm13Tag', after: 'm13Done' }, // the count goes up as boxes are tagged
      { t: 'obj', text: "Survive Mibu's soldiers.", enter: 'm13Wave', done: 'thugsDone' },
      { t: 'obj', text: 'Hijack the crossing screen.', marker: 'scramble', radius: 70, done: 'atMarker', after: 'm13Screen' },
      { t: 'card', title: 'WHERE IS THE GOLD, MIBU?', sub: '' }, // the crossing screen switches to this
      { t: 'radio', text: "DJ ŌKAMI: Mirai-zaka's big screen just asked Ryūji Mibu where the gold is! Bold! Possibly fatal!" },
      { t: 'cut', lines: [
        D('The rooftop. The message fades from the screen below. Phones are out all over the crossing.'),
        { who: 'PIP', text: 'Ten seconds on screen. Two million views already.' },
        { who: 'HIKARI', text: "He'll see it. Everyone he owes money to will see it." },
        { who: 'JUN', text: 'Good.' },
        D('JUN\'s phone buzzes. TEXT: "Jun. Let\'s talk like adults. Voice Cave, top floor, tomorrow night. — R. Mibu"'),
        { who: 'HIKARI', text: "Is that him? Don't go." },
        { who: 'JUN', text: "I'm going." },
        { who: 'HIKARI', text: 'Of course you are.' },
      ] },
      { t: 'card', title: 'INK — COMPLETE', sub: 'Turf unlocked: Mirai-zaka zones (contested)', pay: T.pay.M13 },
    ],
  },
  {
    id: 'M14', title: 'THE WAKAGASHIRA', giver: 'karaoke', start: 'karaoke', ambience: 'night', setup: 'm14Setup',
    failCheck: 'm14Failed', // fail card: ACT2_BARKS.m14Card
    steps: [
      { t: 'cut', lines: [
        D("Voice Cave's VIP room on the top floor. Leather, neon, a love ballad playing on mute. MIBU sits with his arms spread along the couch. A bodyguard takes JUN's gun at the door."),
        { who: 'MIBU', text: 'Jun! The legend himself. Sit, sit. Drink? No? Prison habits.' },
        { who: 'JUN', text: 'You made the call that night.' },
        { who: 'MIBU', text: 'I make many calls. Most of them are karaoke bookings.' },
        { who: 'MIBU', text: "Let's be friends, Jun. Enemies are so expensive." },
        { who: 'JUN', text: 'What do you want?' },
        { who: 'MIBU', text: "Fujita. The family's accountant. He's been talking to Saeko, and accountants should never talk." },
        { who: 'MIBU', text: "He's downstairs in room 6, singing badly. Make him stop. Permanently." },
        { who: 'JUN', text: 'And then?' },
        { who: 'MIBU', text: 'Then we forget about gold and the past, and you leave this city rich.' },
        D('JUN says nothing.'),
        { who: 'MIBU', text: '(smiles) Silence. Genzō loves that about you. I find it rude.' },
      ] },
      { t: 'obj', text: 'Go to room 6.', hint: 'No weapons inside.', marker: 'room6', radius: 40, done: 'm14Corridor' },
      { t: 'cut', lines: [
        D('Room 6. FUJITA, a nervous man in glasses, holds a microphone. He drops it when JUN walks in.'),
        { who: 'FUJITA', text: 'Oh no. Oh no, no. Mibu sent you.' },
        { who: 'JUN', text: 'Mibu sent me.' },
        { who: 'FUJITA', text: 'I just do the numbers. I never hurt anyone.' },
      ] },
      // The player may act (attack Fujita) or walk up to him, which offers the choice.
      { t: 'obj', text: 'Deal with Fujita.', done: 'm14Fujita' },
      { t: 'choice', prompt: 'Deal with Fujita.', set: 'fujita', options: [{ label: 'Let him go', value: 'fujitaSpared' }, { label: 'Make him stop. Permanently.', value: 'fujitaDead' }], if: '!acted' },
      { t: 'run', hook: 'm14Dealt' },
      { t: 'cut', lines: [
        { who: 'FUJITA', text: "Thank you. Listen — the real ledger isn't here. It's in Tsukuyomi Tower, floor 9.", if: 'fujitaSpared' },
        { who: 'FUJITA', text: "Amane keeps everyone's sins on paper. Mibu thinks I don't know. I always know.", if: 'fujitaSpared' },
        { ...D('His phone holds an unsent text to Saeko: "The ledger is on Tsukuyomi Tower 9F. Keep me alive and I\'ll tell you where."'), if: 'fujitaDead' },
      ] },
      { t: 'obj', text: 'Get out of Voice Cave.', marker: 'voiceCaveStreet', radius: 40, enter: 'm14Guards', done: 'atMarker', after: 'm14Out' },
      { t: 'cut', lines: [
        D("The street outside Voice Cave, in the rain. SAEKO's white car is waiting."),
        { who: 'SAEKO', text: 'You went to see Mibu alone. Brave or stupid?' },
        { who: 'JUN', text: 'He was on the phone with Amane.' },
        { who: 'SAEKO', text: "(very still) Tsukuyomi's CEO, calling my family's second-in-command." },
        { who: 'JUN', text: "There's a ledger. Tsukuyomi Tower, floor 9." },
        { who: 'SAEKO', text: 'Then we need someone who can walk into a tower full of security.' },
        D("JUN's phone buzzes: SAWADA."),
        { who: 'SAWADA', text: "(on the phone) Tsukuyomi's throwing a gala Saturday. Caterers use the back door. Just saying." },
      ] },
      { t: 'card', title: 'THE WAKAGASHIRA — COMPLETE', sub: '', pay: T.pay.M14 },
      { t: 'text', from: 'FUJITA', text: 'On a train to anywhere. Thank you. Floor 9: the safe behind the painting of a bridge.', if: 'fujitaSpared' },
    ],
  },
  {
    id: 'M15', title: 'FORK IN THE ROAD', giver: 'ramen', start: 'ramen', ambience: 'night', setup: 'm15Setup', retryAt: 'towerService',
    failCheck: 'm15Caught', // fail card: ACT2_BARKS.m15Card
    steps: [
      { t: 'cut', lines: [
        D("Sakamaki Ramen after closing. A caterer's uniform hangs on a chair. HIKARI types on her laptop. MIKA frowns."),
        { who: 'MIKA', text: "You're dressing up as a waiter to rob the richest company in the city." },
        { who: 'JUN', text: 'Caterer.' },
        { who: 'MIKA', text: "Oh, well. That's fine, then." },
        { who: 'HIKARI', text: 'Floor 9 is executive archives. Paper, because Amane trusts paper. I loop the cameras, you photograph everything.' },
        { who: 'HIKARI', text: "The safe's behind a painting of a bridge. Classic. Very rich-person." },
        { who: 'MIKA', text: 'And if they catch you?' },
        { who: 'JUN', text: "They won't." },
        { who: 'MIKA', text: 'They caught you last time.' },
        { who: 'JUN', text: "(beat) Last time it wasn't my plan." },
        { who: 'MIKA', text: '(sighs, straightens his collar) At least you look nice.' },
      ] },
      { t: 'obj', text: 'Enter through the service door.', marker: 'towerService', radius: 36, done: 'atMarker', after: 'm15In' },
      { t: 'obj', text: 'Serve drinks on your way to the elevator.', hint: "Guards ignore you while you carry a tray. Don't run. Caterers don't run.", done: 'm15Serve', after: 'm15Lift' },
      { t: 'call', lines: [{ who: 'HIKARI', text: "Elevator's yours. Floor 9. Don't touch the art. Actually, touch one specific art." }] },
      { t: 'obj', text: 'Reach floor 9.', enter: 'm15ToLanding', done: 'm15At' },
      { t: 'obj', text: 'Open the safe.', enter: 'm15ToSafe', done: 'm15Open', after: 'm15Bridge' },
      { t: 'obj', text: 'Photograph the ledger.', enter: 'm15ToSafe', done: 'm15Photo' }, // the ledger pages show under the objective, one per photo
      { t: 'obj', text: 'Get back to the service elevator.', enter: 'm15Back', done: 'm15At' },
      { t: 'cut', lines: [
        D('A Tsukuyomi Tower service elevator. JUN holds the ledger drive. His phone buzzes twice: SAEKO on one line, SAWADA on the other. Split screen.'),
        { who: 'SAEKO', text: "Sakamaki-san. You're holding my family's future." },
        { who: 'SAWADA', text: "Sakamaki. Whatever you're holding is evidence. Don't be an idiot." },
        { who: 'SAEKO', text: 'Give it to me, and Mibu answers to the family by morning. Our way. Quietly.' },
        { who: 'SAWADA', text: "Give it to her and it's a private war with the gold as the prize. Give it to me and it's a court case." },
        { who: 'SAEKO', text: "A court case the inspector's own colleagues buried once already." },
        { who: 'SAWADA', text: "(beat) She's not wrong. That's why I need you on the arrests, not just the evidence." },
        { who: 'SAEKO', text: "The police will use you and drop you. Family doesn't drop its own." },
        { who: 'SAWADA', text: 'Family tried to stuff you in a trunk at the prison gate.' },
      ] },
      // The game's big choice. The stage direction that ends the scene is the heading of the choice box.
      { t: 'choice', prompt: 'The elevator dings. The doors open.', set: 'path', options: [{ label: 'Give it to Saeko', value: 'yakuza' }, { label: 'Give it to Sawada', value: 'police' }] },
      { t: 'cut', lines: [
        { who: 'JUN', text: 'Saeko. Your way.', if: 'yakuza' },
        { who: 'SAEKO', text: "You won't regret it. (beat) Much.", if: 'yakuza' },
        { who: 'JUN', text: 'Sawada. Your way.', if: 'police' },
        { who: 'SAWADA', text: "Good. Don't make me regret it.", if: 'police' },
      ] },
      { t: 'card', title: 'FORK IN THE ROAD — COMPLETE', sub: 'Path set: Yakuza', pay: T.pay.M15, if: 'yakuza' },
      { t: 'card', title: 'FORK IN THE ROAD — COMPLETE', sub: 'Path set: Police', pay: T.pay.M15, if: 'police' },
      { t: 'text', from: 'SAEKO', text: 'The family meets tomorrow. Wear black.', if: 'yakuza' },
      { t: 'text', from: 'SAWADA', text: 'Taking this to the one prosecutor I trust. Keep your phone on.', if: 'police' },
    ],
  },
  {
    id: 'M16', title: 'TYPHOON', giver: { yakuza: 'saekoOffice', police: 'canalLot' }, start: { yakuza: 'saekoOffice', police: 'canalLot' }, ambience: 'storm', setup: 'm16Setup',
    failCheck: 'm16Fell', // fail card: ACT2_BARKS.m16Card
    steps: [
      { t: 'cut', lines: [D("Night. Typhoon Nagi lashes the city. Signs swing; streets run like rivers. JUN's phone rings.")] },
      { t: 'call', lines: [
        { who: 'SAEKO', text: "Mibu knows about the ledger. He's moving on the mansion tonight.", if: 'yakuza' },
        { who: 'SAEKO', text: 'My father refuses to leave. My men are holding the gate.', if: 'yakuza' },
        { who: 'SAWADA', text: "Mibu found out about the ledger. He's going after Genzō tonight, under cover of the storm.", if: 'police' },
        { who: 'SAWADA', text: "My riot unit's rolling, off the books. Meet us at the mansion.", if: 'police' },
        { who: 'JUN', text: 'On my way.' },
      ] },
      { t: 'radio', station: 'KOGANE TALK 1260', text: 'Typhoon Nagi has closed the Kogane Bay Bridge. Stay indoors, and away from any yakuza mansions.' },
      { t: 'obj', text: 'Get to the Kurogane mansion.', hint: 'Flooded streets kill your speed. Stay on high roads.', marker: 'mansionGate', radius: 70, done: 'm16Drive' },
      { t: 'obj', text: "Break through Mibu's roadblock.", hint: 'Flooded streets kill your speed. Stay on high roads.', marker: 'mansionGate', radius: 70, enter: 'm16Block', done: 'atMarker' },
      { t: 'checkpoint', place: 'mansionGate', setup: 'm16AtGate' },
      { t: 'obj', text: 'Defend the mansion. (3 waves, with the ally squad)', enter: 'm16Defend', done: 'm16Waves', after: 'm16Held' },
      { t: 'obj', text: 'Reach Genzō.', marker: 'mansion', radius: 30, done: 'atMarker' },
      { t: 'obj', text: 'Get to the roof.', enter: 'm16ToRoof', done: 'atMarker' },
      { t: 'cut', lines: [
        D('The mansion roof. Rain flies sideways. A helicopter lifts off. MIBU leans out of the open door, smiling.'),
        { who: 'MIBU', text: "Sorry, Jun! I'd stay, but the weather!" },
        D('He fires down into the garden. The helicopter vanishes into the storm.'),
      ] },
      { t: 'cut', lines: [
        D('The tatami room, its windows shattered, rain blowing in. GENZŌ lies wounded. SAEKO kneels beside him. JUN stands.'),
        { who: 'GENZŌ', text: 'Young man. Come closer.' },
        { who: 'GENZŌ', text: 'The gold never left the city. Amane ships it out by sea.' },
        { who: 'GENZŌ', text: 'And Hayami is alive. I saw him behind her chair, smiling like a ghost.' },
        { who: 'JUN', text: 'Tetsu.' },
        { who: 'GENZŌ', text: 'Termites, Saeko. I should have listened. (beat) The house is yours now.' },
        { who: 'SAEKO', text: 'Father—' },
        D("GENZŌ's eyes close. The storm roars."),
        { who: 'SAEKO', text: "(without turning) Find Hayami, Sakamaki-san. Then find Mibu. I'll be busy burying my father." },
        { who: 'SAEKO', text: "(lifts the katana from its stand and hands it to JUN) He'd want it used, not hung on a wall.", if: 'yakuza' },
      ] },
      { t: 'run', hook: 'm16Blade', if: 'yakuza' },
      { t: 'card', title: 'TYPHOON — COMPLETE', sub: "Unlocked: Genzō's Blade (Legendary)", pay: T.pay.M16, if: 'yakuza' },
      { t: 'card', title: 'TYPHOON — COMPLETE', sub: '', pay: T.pay.M16, if: 'police' },
      { t: 'card', title: 'ACT 2 COMPLETE', sub: 'ACT 3 — GOLD' },
    ],
  },
];

/** In-play lines for missions 9-16 (the script's "In play" sections, BARK lines and fail cards). */
export const ACT2_BARKS = {
  m10Gamblers: ["Not now, I'm on a streak!", 'Is this part of the show?', 'Somebody watch my machine!'],
  m10Raiders: ['Mibu-san sends his love!', 'Smash the machines!'],
  m10Saeko: 'Not that row. That row is new.',
  m10Fail: "They're in the cash office. We've lost the night.",
  m11Thief: ['Back off, grandpa!', "Can't catch me!"],
  m11Peds: ['Hey, watch it!', 'Is this a flash mob?', 'My coffee!'],
  m11Accomplice: 'Got it! Go, go!',
  m12JunTruck: 'This handles like a building.',
  m12Escort: ['Ambush! Tunnel ambush!', 'Protect the cargo!'],
  m12JunNumber: 'Your number.',
  m13Soldiers: ['Glitch rats on the roofs!', 'Mibu-san wants those screens clean!'],
  m13Tags: ['One down.', "Two. You're a natural vandal.", "Three. I'm proud of you. Don't make it weird.", 'Four.', 'Five. Okay. Showtime.'], // calls from Hikari, one per tag
  m13Crowd: ['Whoa—', 'What gold?', 'Is this an ad?'],
  /** Overheard in the corridor, Mibu on the phone. One line in the script; said a sentence at a time because a bark holds 60 characters. */
  m14Mibu: ["Yes, Amane-san. He's handled.", "No, the driver won't be a problem."],
  m14Bodyguard: "Fujita's gone! Stop the driver!",
  m14Card: "Mibu's bodyguards had the room covered.",
  m15Guests: ['Champagne! Finally.', 'Is the canapé gluten-free?', 'Amane says Kogane 2040 will double my land value.'],
  m15Ogata: 'You look familiar. Have we met?',
  m15JunSafe: 'A bridge.',
  m15Pages: ['PAYMENT — MIBU TRADING — ¥200,000,000', 'COUNCIL "CONSULTING" — 14 MEMBERS', 'COLLATERAL HELD: SUB-BASEMENT 3, BULLION, KMB STAMP'],
  m15Security: 'Who sent a caterer to the ninth floor?',
  m15Card: "Security found a caterer where caterers don't go.",
  m16JunFlood: 'Not this street.',
  m16Soldiers: ['For the new family!', 'Mibu-san is the future!'],
  m16Squad: { yakuza: 'For the oyabun!', police: 'Shields up! Hold the gate!' },
  m16Leader: { yakuza: 'The east wall, Sakamaki-san! Now!', police: "I'm too old for storms and yakuza on the same night." },
  m16Card: 'The house fell.',
} as const;
