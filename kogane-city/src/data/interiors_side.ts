import type { InteriorDef } from './interiors';

// Rooms used by the side missions. Same text-map format as data/interiors.ts (the legend is at the top of that file).

export const INTERIORS_SIDE: Record<string, InteriorDef> = {};

/** Street doors into those rooms: a story place (its door) -> a room above. */
export const DOORS_SIDE: { place: string; to: string }[] = [];
