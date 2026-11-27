// Weapon numbers. damage / rate / mag come straight from the game bible's weapons table.
// Everything marked PLACEHOLDER is not in the bible yet and is a first guess to tune.
export interface WeaponDef {
  id: string;
  name: string;
  weaponClass: 'melee' | 'pistol' | 'smg' | 'shotgun' | 'rifle';
  /** Story missions that must be complete before shops stock it (bible "Unlock": Start 0, Act 1 = 1, Act 2 = 8, Act 3 = 16). */
  unlock?: number;
  /** PLACEHOLDER: shop price in yen (0 = not for sale). */
  price?: number;
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

// The rest of the bible's weapon table that the engine can express today. damage / rate / mag
// are the bible's; everything else is PLACEHOLDER. Not built yet: the Hachi .38's pierce,
// the katana's bullet deflect, the DMR's zoom, and the "special" class (taser, launchers).
Object.assign(WEAPONS, {
  bat: { id: 'bat', name: 'Metal bat', weaponClass: 'melee', damage: 25, pellets: 1, rate: 2, mag: 0, startReserve: 0, reloadTime: 0, bulletSpeed: 0, range: 36, spread: 0, noise: 0, unlock: 1, price: 3000, desc: 'Sold for baseball. Rarely used for baseball.' },
  katana: { id: 'katana', name: 'Katana', weaponClass: 'melee', damage: 45, pellets: 1, rate: 2, mag: 0, startReserve: 0, reloadTime: 0, bulletSpeed: 0, range: 44, spread: 0, noise: 0, unlock: 8, price: 50000, desc: 'Older than the city, sharper than its politics.' },
  hachi38: { id: 'hachi38', name: 'Hachi .38', weaponClass: 'pistol', damage: 40, pellets: 1, rate: 1.5, mag: 6, startReserve: 36, reloadTime: 1.6, bulletSpeed: 950, range: 680, spread: 1, noise: 460, unlock: 1, price: 12000, desc: 'Six rounds. Each one a decision.' },
  tora: { id: 'tora', name: 'Tora SMG', weaponClass: 'smg', damage: 16, pellets: 1, rate: 11, mag: 40, startReserve: 200, reloadTime: 1.7, bulletSpeed: 880, range: 560, spread: 4, noise: 440, unlock: 8, price: 35000, desc: "The Kurogane lieutenant's favourite. Comes with a reputation." },
  typhoon: { id: 'typhoon', name: 'Typhoon', weaponClass: 'shotgun', damage: 9, pellets: 8, rate: 1.2, mag: 8, startReserve: 40, reloadTime: 2.2, bulletSpeed: 820, range: 340, spread: 11, noise: 480, unlock: 8, price: 40000, desc: 'A pump-action weather event.' },
  kazeAR: { id: 'kazeAR', name: 'Kaze AR', weaponClass: 'rifle', damage: 22, pellets: 1, rate: 9, mag: 30, startReserve: 180, reloadTime: 1.8, bulletSpeed: 1000, range: 720, spread: 2.5, noise: 500, unlock: 8, price: 60000, desc: 'Boring, right up until it saves your life.' },
  karasu: { id: 'karasu', name: 'Karasu DMR', weaponClass: 'rifle', damage: 70, pellets: 1, rate: 2, mag: 10, startReserve: 50, reloadTime: 2, bulletSpeed: 1200, range: 900, spread: 0.4, noise: 520, unlock: 16, price: 90000, desc: 'Corporate marksman rifle. Shoots further than most people can see.' },
} as Record<string, WeaponDef>);
WEAPONS.kitsune9.price = 5000; WEAPONS.kitsune9.unlock = 0;
WEAPONS.suzume.price = 18000; WEAPONS.suzume.unlock = 1;
WEAPONS.sawnoff.price = 15000; WEAPONS.sawnoff.unlock = 1;

/** One weapon per class (bible "Slots"), in number-key order 1-5. */
export const WEAPON_SLOTS: WeaponDef['weaponClass'][] = ['melee', 'pistol', 'smg', 'shotgun', 'rifle'];

/** Fists: the 3rd hit in a row knocks the target down (bible). Stun length is a PLACEHOLDER. */
export const MELEE = { comboHits: 3, comboWindow: 1.2, knockdownTime: 1.5, arcDegrees: 70 };

/** Bible performance budget: at most 200 projectiles on screen. */
export const MAX_PROJECTILES = 200;
