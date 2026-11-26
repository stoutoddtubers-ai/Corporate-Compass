import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../data/config';
import { t } from '../data/strings';

/**
 * The city. Step 1 only proves the project runs: a tile grid, the title,
 * and a square that follows the mouse. The test map arrives in step 2.
 */
export class WorldScene extends Phaser.Scene {
  private marker!: Phaser.GameObjects.Rectangle;
  private info!: Phaser.GameObjects.Text;

  constructor() {
    super('World');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x1a1a22);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x2a2a36, 1);
    for (let x = 0; x <= GAME_WIDTH; x += TILE_SIZE) grid.lineBetween(x, 0, x, GAME_HEIGHT);
    for (let y = 0; y <= GAME_HEIGHT; y += TILE_SIZE) grid.lineBetween(0, y, GAME_WIDTH, y);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, t('GAME_TITLE_JA'), {
        fontFamily: 'sans-serif',
        fontSize: '64px',
        color: '#e8b923',
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, t('GAME_TITLE'), {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.marker = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0xd8343a, 0.6);
    this.info = this.add.text(8, 8, '', { fontFamily: 'monospace', fontSize: '12px', color: '#9aa0b4' });
  }

  update(): void {
    const p = this.input.activePointer;
    const tx = Math.floor(p.worldX / TILE_SIZE);
    const ty = Math.floor(p.worldY / TILE_SIZE);
    this.marker.setPosition(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2);
    this.info.setText(
      `Milestone 1 · step 1 · Phaser ${Phaser.VERSION} · ${Math.round(this.game.loop.actualFps)} fps · tile ${tx},${ty} · zoom ${this.scale.zoom}x`,
    );
  }
}
