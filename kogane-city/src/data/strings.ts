// All on-screen text lives here, copied from the Script and Writing doc.
// IDs match the doc's string-table IDs so they can be exported/translated later.
export const STRINGS = {
  GAME_TITLE: 'KOGANE CITY',
  GAME_TITLE_JA: '黄金市',
  UI_DEATH: '終 OWARI — Hospital bill: ¥{amount}',
  UI_ARREST: '逮捕 TAIHO — Fine: ¥{amount}. Weapons confiscated.',
  UI_HEAT_CLEAR: 'CLEAN',
} as const;

export type StringId = keyof typeof STRINGS;

/** Look up a string and fill in {variables}. */
export function t(id: StringId, vars: Record<string, string | number> = {}): string {
  return STRINGS[id].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
