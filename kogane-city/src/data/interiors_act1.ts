import type { InteriorDef } from './interiors';

// Rooms used by the act1 missions. Same text-map format as data/interiors.ts (the legend is at the top of that file).

export const INTERIORS_ACT1: Record<string, InteriorDef> = {};

/** Street doors into those rooms: a story place (its door) -> a room above. */
export const DOORS_ACT1: { place: string; to: string }[] = [];
