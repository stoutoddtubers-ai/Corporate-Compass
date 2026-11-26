// Core display and world numbers. Balancing numbers live in src/data, never in game code.
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const TILE_SIZE = 32;

// Test map size for Milestone 1 (in tiles).
export const MAP_TILES_W = 64;
export const MAP_TILES_H = 64;

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
