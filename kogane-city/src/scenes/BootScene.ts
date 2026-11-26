import * as Phaser from 'phaser';

/** First scene. Later it will load art and audio; for now it goes straight to the world. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('World');
  }
}
