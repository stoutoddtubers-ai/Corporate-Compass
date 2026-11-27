// Core display and world numbers. Balancing numbers live in src/data, never in game code.
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const TILE_SIZE = 32;

// Whole-city map size (in tiles): both river banks and the bay. The bible's long-term target is 1,024 x 1,024.
export const MAP_TILES_W = 658;
export const MAP_TILES_H = 442; // the city is 362 rows; the rest holds building interiors (see MAP.interiorBand)

// Performance budget from the game bible ("Performance budgets").
export const BUDGET = {
  targetFps: 60,
  floorFps: 30,
  pedestrians: 60,
  vehicles: 30,
  hostileAi: 20,
  projectiles: 200,
  drawCalls: 100,
} as const;
