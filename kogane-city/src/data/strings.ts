// All on-screen text lives here, copied from the Script and Writing doc.
// IDs match the doc's string-table style so they can be exported/translated later.
export const STRINGS = {
  GAME_TITLE: 'KOGANE CITY',
  GAME_TITLE_JA: '黄金市',
  UI_DEATH_BIG: '終 OWARI',
  UI_DEATH: 'Hospital bill: ¥{amount}',
  UI_ARREST_BIG: '逮捕 TAIHO',
  UI_ARREST: 'Fine: ¥{amount}. Weapons confiscated.',
  UI_HEAT_CLEAR: 'CLEAN',
  UI_CONTINUE: 'Continue', // UI_TITLE_MENU in the script doc: Continue · New game · Settings
  UI_NEW_GAME: 'New game',
  UI_SAVED: 'Saved at {safehouse}.',
  UI_BED_NO_CASH: 'A night here is ¥{price}. Not tonight.', // NEW: at a capsule inn without the money
  OBJ_LOSE_POLICE: 'Lose the police.',
  PROMPT_STEAL: 'E — Steal',
  PROMPT_DRINK: 'E — Drink ¥{price}', // new wording, not yet in the script doc
  PROMPT_ENTER: 'E — {name}', // NEW: at a door you can go through
  PROMPT_LEAVE: 'E — Leave', // NEW
  UI_CLICK_TO_LOOK: 'Click to look around with the mouse · C switches camera', // NEW: third-person view
  PROMPT_LOCKED: 'Locked. The police are looking for you.', // NEW: shops shut their doors on a wanted man
} as const;

export type StringId = keyof typeof STRINGS;

/** Look up a string and fill in {variables}. */
export function t(id: StringId, vars: Record<string, string | number> = {}): string {
  return STRINGS[id].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

/** Street barks: floating lines above characters, 60 characters max. */
export const BARKS = {
  police: {
    1: ['Stop right there!', 'Hey! I saw that!', 'Halt!'],
    2: ['Suspect is armed!', 'Pull over! Now!', 'Hands where I can see them!'],
    3: ['All units, suspect heading for {district}!', 'Deploy the spikes!', "Roadblock's set!"],
  } as Record<number, string[]>,
  policeSearch: ['Lost visual. Sweep the area.', "Where'd he go?", 'Check the karaoke booths!'],
  roadblock: "Roadblock's set!",
  junSteal: ["I'll bring it back.", 'Sorry. Emergency.', 'Nice car. Mine now.'],
  junLowHealth: ['Need a drink.', 'Not like this.'],
  junHitByCar: ['Watch it.'],
  junHeatLost: ['Clean.'],
} as const;

export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
