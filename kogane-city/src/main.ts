import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './data/config';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { installIntegerScaling } from './systems/IntegerScaler';

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0b0b10',
  pixelArt: true,
  scale: { mode: Phaser.Scale.NONE },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scene: [BootScene, WorldScene],
});

installIntegerScaling(game);
