// How each character looks from above (placeholder pixel art drawn in code) and
// the colour of their name in text boxes. Looks follow the bible's "Look from above" column.
export interface Look { jacket: string; hair: string; skin?: string; accent?: string; accentAt?: 'back' | 'head' | 'chest' }

export const LOOKS: Record<string, Look> = {
  jun: { jacket: '#17171c', hair: '#2a2622', accent: '#e8b923', accentAt: 'back' }, // black bomber, gold koi
  mika: { jacket: '#f0ece2', hair: '#3a2a22', accent: '#d8343a', accentAt: 'head' }, // white apron, red bandana
  goro: { jacket: '#7d8088', hair: '#9a9a9a', accent: '#3a3a3a', accentAt: 'head' }, // grey overalls, goggles
  sawada: { jacket: '#b9a37e', hair: '#1c1a1a' }, // trench coat
  cop: { jacket: '#27408f', hair: '#f2f2f2', accent: '#e8c84a', accentAt: 'chest' }, // navy uniform, white cap
  thug: { jacket: '#101014', hair: '#0c0c0c', accent: '#8a1c1c', accentAt: 'chest' }, // Kurogane black suit
  raijin: { jacket: '#5b2a8a', hair: '#e8d24a', accent: '#f2f2f2', accentAt: 'back' }, // Raijin bōsōzoku jacket
  kenta: { jacket: '#f2f2f2', hair: '#e8d24a', accent: '#5b2a8a', accentAt: 'back' }, // white tokkō-fuku coat
  hikari: { jacket: '#3a3f55', hair: '#28d8e8', accent: '#f040a0', accentAt: 'chest' }, // cyan hair, hoodie
  ogata: { jacket: '#f4f4f0', hair: '#2a2622', accent: '#c9a84a', accentAt: 'chest' }, // white suit
  windbreaker: { jacket: '#2f6f8a', hair: '#1c1a1a', accent: '#f2f2f2', accentAt: 'back' }, // Ogata's hired men
  guard: { jacket: '#5a5f66', hair: '#22242a', accent: '#d8b02a', accentAt: 'chest' }, // rent-a-cops
  courier: { jacket: '#3a2f2a', hair: '#0c0c0c', accent: '#8a1c1c', accentAt: 'chest' },
  customer: { jacket: '#4f7f8a', hair: '#55504a' },
  elder: { jacket: '#8a7f6a', hair: '#d8d8d8' },
  salaryman: { jacket: '#3d4a6a', hair: '#1c1a1a', accent: '#f2f2f2', accentAt: 'chest' },
  student: { jacket: '#c9c9d6', hair: '#2a2622', accent: '#3a5aa8', accentAt: 'back' },
  grandmother: { jacket: '#a8788f', hair: '#d8d8d8' },
  rider: { jacket: '#3f9a5a', hair: '#e04a3a', accent: '#f2f2f2', accentAt: 'back' },
  builder: { jacket: '#c98a2a', hair: '#f2d02a' }, // hard hat
  shopkeeper: { jacket: '#35607a', hair: '#3a2a22', accent: '#f0ece2', accentAt: 'chest' },
};

/** Speakers in cutscenes: display name, name colour, and which look to use as a portrait. */
export const SPEAKERS: Record<string, { name: string; color: string; look: string }> = {
  JUN: { name: 'JUN', color: '#e8b923', look: 'jun' },
  SAWADA: { name: 'SAWADA', color: '#d8c6a0', look: 'sawada' },
  MIKA: { name: 'MIKA', color: '#ff8a8a', look: 'mika' },
  GORO: { name: 'GORO', color: '#b8c0cc', look: 'goro' },
  'THUG 1': { name: 'THUG 1', color: '#c06060', look: 'thug' },
  'THUG 2': { name: 'THUG 2', color: '#c06060', look: 'thug' },
  KENTA: { name: 'KENTA', color: '#d9a0ff', look: 'kenta' },
  HIKARI: { name: 'HIKARI', color: '#28d8e8', look: 'hikari' },
  OGATA: { name: 'OGATA', color: '#f0e8c8', look: 'ogata' },
  TAPE: { name: 'TAPE', color: '#9a9aa8', look: 'courier' },
  'DJ ŌKAMI': { name: 'DJ ŌKAMI', color: '#7fe0ff', look: 'customer' },
  'UNKNOWN NUMBER': { name: 'UNKNOWN NUMBER', color: '#c9a0ff', look: 'raijin' },
};
