import { WEAPONS } from '../data/weapons';
import type { WorldScene } from '../scenes/WorldScene';

const KEY = 'kogane.player.v1';

/** What is saved about the player. (Story progress, turf and collectibles save themselves under their own kogane.* keys.) */
interface PlayerSave { cash: number; armour: number; weapons: { id: string; mag: number; reserve: number }[]; current: number }

export const SaveGame = {
  /** Writes cash, armour and weapons. Called after every mission, at the safehouse and when shopping. */
  save(w: WorldScene): void {
    const p = w.player;
    const d: PlayerSave = { cash: p.cash, armour: p.armour, weapons: p.weapons.map((x) => ({ id: x.def.id, mag: x.mag, reserve: x.reserve })), current: p.current };
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* saving is optional */ }
  },

  /** Puts a saved player back as they were. */
  load(w: WorldScene): void {
    let d: PlayerSave | null = null;
    try { d = JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { d = null; }
    if (!d) return;
    const p = w.player;
    p.cash = d.cash; p.armour = d.armour;
    const ws = d.weapons.filter((x) => WEAPONS[x.id]).map((x) => ({ def: WEAPONS[x.id], mag: x.mag, reserve: x.reserve }));
    if (ws.length) { p.weapons = ws; p.current = Math.min(d.current, ws.length - 1); }
  },

  /** Is there a game to continue? */
  exists(): boolean {
    try { return !!localStorage.getItem(KEY) || !!localStorage.getItem('kogane.save.v1'); } catch { return false; }
  },

  /** New game: forget everything this game has stored. */
  clearAll(): void {
    try { for (const k of Object.keys(localStorage)) if (k.startsWith('kogane.')) localStorage.removeItem(k); } catch { /* nothing stored */ }
  },
};
