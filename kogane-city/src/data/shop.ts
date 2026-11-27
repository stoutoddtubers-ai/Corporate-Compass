// Hachiman Hardware: one per district, with the black-market gun counter behind the tool
// aisle (bible). Weapon prices are on each weapon in data/weapons.ts. All prices PLACEHOLDER.
export const SHOP = {
  name: 'HACHIMAN HARDWARE',
  ammoPrice: 1500, // refills the gun in your hands by `ammoMags` magazines
  ammoMags: 4,
  armourPrice: 8000, // armour back to full (bible: up to 100 armour)
  /** One shop per district: the place ids in data/map.ts. */
  places: ['hardwareAsagiri', 'hardwareDenpa', 'hardwareTetsugawa', 'hardwareHanabi', 'hardwareMirai', 'hardwareMarukane', 'hardwareRokkaku', 'hardwareShiokaze'],
} as const;
