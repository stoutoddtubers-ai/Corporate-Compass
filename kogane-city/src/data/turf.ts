// Turf (bible "Turf control"). Bible numbers are marked; the rest are PLACEHOLDERS.
// The bible wants 6 zones per district; for now each city block is one zone
// (4 in Asagiri, 4 in Denpa-chō, 10 in Tetsugawa).
export const FACTIONS: Record<string, { name: string; color: number; look: string; ride: 'bike' | 'sedan' }> = {
  glitch: { name: 'Glitch', color: 0x28d8e8, look: 'glitch', ride: 'sedan' },
  raijin: { name: 'Raijin', color: 0x9a4ae0, look: 'raijin', ride: 'bike' },
  tsukuyomi: { name: 'Tsukuyomi', color: 0xd8d8d8, look: 'windbreaker', ride: 'sedan' },
  kurogane: { name: 'Kurogane-kai', color: 0xc9a84a, look: 'thug', ride: 'sedan' }, // black and gold (bible)
  yatagarasu: { name: 'Yatagarasu', color: 0xe8e8f0, look: 'guard', ride: 'sedan' }, // Tsukuyomi's security: white and silver
  umibozu: { name: 'Umibōzu', color: 0x2f9f96, look: 'windbreaker', ride: 'sedan' }, // teal and rust orange
  jun: { name: 'Jun', color: 0xe8b923, look: 'jun', ride: 'sedan' }, // "Jun's crew colour is gold" (bible)
};

export const TURF = {
  /** Who holds each district's zones at the start. PLACEHOLDER: the bible calls Asagiri neutral with Tsukuyomi moving in. */
  startOwner: { denpa: 'glitch', tetsugawa: 'raijin', asagiri: 'tsukuyomi', hanabi: 'kurogane', mirai: 'kurogane', marukane: 'yatagarasu', rokkaku: 'yatagarasu', shiokaze: 'umibozu' } as Record<string, string>,
  /** Zones the story hands you: zone id -> owned once this many missions are complete. */
  storyZones: { '0-3': 6 } as Record<string, number>, // Asagiri Arcade, after Eviction Notice
  names: { '0-3': 'Asagiri Arcade' } as Record<string, string>,
  killsToProvoke: 5, // (bible)
  waveGrunts: 5,
  squadSize: 3, // wave 2: a car squad
  lieutenantHp: 120, // (bible)
  lieutenantFireGap: 0.3,
  ambientMembers: 3, // gang members hanging around a rival zone
  leaveDist: 380, // step this far outside the zone...
  leaveTime: 10, // ...for this long and the turf war is lost
  dayMinutes: 24, // one in-game day is 24 real minutes (bible)
  income: [2000, 10000], // yen per zone per in-game day (bible)
} as const;
