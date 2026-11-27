import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './data/config';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { HudScene } from './scenes/HudScene';
import { TitleScene } from './scenes/TitleScene';
import { installIntegerScaling } from './systems/IntegerScaler';

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0b0b10',
  transparent: true, // the 3D view (src/view3d) is drawn on a canvas underneath this one
  pixelArt: true,
  scale: { mode: Phaser.Scale.NONE },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scene: [BootScene, TitleScene, WorldScene, HudScene],
});

installIntegerScaling(game);
