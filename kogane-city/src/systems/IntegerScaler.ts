import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../data/config';

/**
 * Keeps the 960x540 game at a whole-number zoom (1x, 2x, 3x...) so pixels stay crisp.
 * Picks the biggest zoom that fits the browser window. If the window is smaller than
 * 960x540, it shrinks to fit instead so the whole screen stays visible.
 */
export function installIntegerScaling(game: Phaser.Game): void {
  const apply = () => {
    const fit = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT);
    const zoom = fit >= 1 ? Math.floor(fit) : Math.max(0.25, fit);
    if (game.scale.zoom !== zoom) game.scale.setZoom(zoom);
  };
  window.addEventListener('resize', apply);
  apply();
}
