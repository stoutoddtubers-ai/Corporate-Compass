// Player numbers. Bible values are marked (bible); the rest are PLACEHOLDERS to tune.
export const PLAYER = {
  maxHp: 100, // (bible)
  maxArmour: 100, // (bible)
  armourAbsorb: 0.7, // armour soaks 70% of bullet damage (bible)
  startArmour: 50, // PLACEHOLDER so the armour bar can be tested
  walkSpeed: 150, // px/s PLACEHOLDER
  radius: 7,
  roll: { duration: 0.4, invulnerable: 0.2, cooldown: 1.2, speed: 380 }, // times (bible), speed PLACEHOLDER
  startCash: 5000, // PLACEHOLDER
  deathCashLoss: 0.1, // 10% hospital bill (bible)
  arrestCashLoss: 0.05, // 5% fine (bible)
  startWeapons: ['fists'], // the story starts you with nothing; guns are pickups in the car parks
  enterRange: 52, // px from a car to use E
  breakInTime: 1.5, // seconds to break into a parked car (bible)
  dragOutTime: 0.5, // PLACEHOLDER: seconds to drag a driver out
  screenTime: 3, // seconds the OWARI / TAIHO screen stays up
  lowHp: 30,
} as const;

// Camera (bible "Camera" section).
export const CAMERA = {
  footZoom: 1.0,
  aimLead: 0.25, // lead the aim by up to 25% of the screen
  carZoomAtTopSpeed: 0.6,
  followLerp: 6, // PLACEHOLDER: higher = snappier
  zoomLerp: 2.5,
  carLead: 0.35, // PLACEHOLDER: seconds of velocity to look ahead while driving
} as const;
