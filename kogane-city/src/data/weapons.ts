// Weapon numbers. damage / rate / mag come straight from the game bible's weapons table.
// Everything marked PLACEHOLDER is not in the bible yet and is a first guess to tune.
export interface WeaponDef {
  id: string;
  name: string;
  weaponClass: 'melee' | 'pistol' | 'smg' | 'shotgun';
  /** Damage per hit, or per pellet. (bible) */
  damage: number;
  /** Pellets per shot. (bible) */
  pellets: number;
  /** Shots per second. (bible; Fists is PLACEHOLDER) */
  rate: number;
  /** Magazine size; 0 = no ammo needed. (bible) */
  mag: number;
  /** PLACEHOLDER: spare rounds the player starts with. */
  startReserve: number;
  /** PLACEHOLDER: seconds to reload. */
  reloadTime: number;
  /** PLACEHOLDER: bullet speed in px/s. */
  bulletSpeed: number;
  /** PLACEHOLDER: how far a bullet (or punch) reaches, in px. */
  range: number;
  /** PLACEHOLDER: random spread in degrees, either side of the aim. */
  spread: number;
  /** PLACEHOLDER: how far away people hear it, in px. */
  noise: number;
  /** One-line description from the script doc. */
  desc: string;
}

export const WEAPONS: Record<string, WeaponDef> = {
  fists: {
    id: 'fists', name: 'Fists', weaponClass: 'melee', damage: 10, pellets: 1, rate: 2.5, mag: 0,
    startReserve: 0, reloadTime: 0, bulletSpeed: 0, range: 30, spread: 0, noise: 0,
    desc: 'Free, always loaded, never jams.',
  },
  kitsune9: {
    id: 'kitsune9', name: 'Kitsune 9', weaponClass: 'pistol', damage: 18, pellets: 1, rate: 4, mag: 12,
    startReserve: 96, reloadTime: 1.1, bulletSpeed: 900, range: 620, spread: 1.5, noise: 380,
    desc: 'Compact, reliable, and happy to wear a suppressor.',
  },
  suzume: {
    id: 'suzume', name: 'Suzume', weaponClass: 'smg', damage: 12, pellets: 1, rate: 14, mag: 30,
    startReserve: 180, reloadTime: 1.5, bulletSpeed: 850, range: 520, spread: 5, noise: 420,
    desc: 'Small, loud, and happiest out of a car window.',
  },
  sawnoff: {
    id: 'sawnoff', name: 'Sawn-off', weaponClass: 'shotgun', damage: 8, pellets: 10, rate: 1, mag: 2,
    startReserve: 24, reloadTime: 1.6, bulletSpeed: 800, range: 300, spread: 14, noise: 460,
    desc: 'Two barrels. Zero subtlety.',
  },
};

/** Fists: the 3rd hit in a row knocks the target down (bible). Stun length is a PLACEHOLDER. */
export const MELEE = { comboHits: 3, comboWindow: 1.2, knockdownTime: 1.5, arcDegrees: 70 };

/** Bible performance budget: at most 200 projectiles on screen. */
export const MAX_PROJECTILES = 200;
