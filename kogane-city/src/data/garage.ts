// Goro's Garage (bible "Goro's Garage" table). The upgrade names and effects are from the
// bible; every price and percentage is a PLACEHOLDER to tune.
// Not built yet: run-flat tyres (there is no tyre damage yet) and the surprise package.
export const GARAGE = {
  respray: { name: 'Respray', price: 2000, note: 'New colour; clears Heat at 3 lanterns or fewer' },
  engine: { name: 'Engine', prices: [8000, 15000, 25000], speedPerTier: 0.08, accelPerTier: 0.1, note: 'Top speed and acceleration (3 tiers)' },
  nitro: { name: 'Nitro', price: 10000, capacity: 0.5, note: 'Bigger boost bar' },
  armour: { name: 'Armour plating', price: 12000, hp: 0.4, mass: 0.15, note: 'More HP, heavier rams' },
} as const;
