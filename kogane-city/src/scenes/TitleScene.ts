import * as Phaser from 'phaser';
import { GAME_WIDTH as GW } from '../data/config';
import { t } from '../data/strings';
import { SaveGame } from '../systems/SaveGame';

/** Title screen: two clicks from here to the street (bible "Flow"). */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0b0b10);
    // a few neon bars behind the title, in the districts' colours
    const g = this.add.graphics();
    [0xd8343a, 0x28e0f0, 0xff3aa0, 0xe8b923, 0x9affb0].forEach((c, i) => g.fillStyle(c, 0.12).fillRect(0, 120 + i * 62, GW, 34));
    this.add.text(GW / 2, 150, t('GAME_TITLE_JA'), { fontFamily: 'sans-serif', fontSize: '120px', color: '#e8b923', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5);
    this.add.text(GW / 2, 250, t('GAME_TITLE'), { fontFamily: 'monospace', fontSize: '40px', color: '#ffffff', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    const hasSave = SaveGame.exists();
    const items = [
      { label: t('UI_CONTINUE'), enabled: hasSave, go: () => this.scene.start('World') },
      { label: t('UI_NEW_GAME'), enabled: true, go: () => { SaveGame.clearAll(); this.scene.start('World'); } },
    ];
    let cursor = hasSave ? 0 : 1;
    const texts = items.map((it, i) => {
      const tx = this.add.text(GW / 2, 350 + i * 44, it.label, { fontFamily: 'monospace', fontSize: '26px', color: '#ffffff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
      if (it.enabled) tx.setInteractive({ useHandCursor: true }).on('pointerdown', () => it.go()).on('pointerover', () => { cursor = i; paint(); });
      return tx;
    });
    const paint = () => texts.forEach((tx, i) => tx.setColor(!items[i].enabled ? '#555560' : i === cursor ? '#e8b923' : '#ffffff').setText((i === cursor ? '▶ ' : '  ') + items[i].label));
    paint();
    const move = (d: number) => { do { cursor = (cursor + d + items.length) % items.length; } while (!items[cursor].enabled); paint(); };
    this.input.keyboard!.on('keydown-UP', () => move(-1)).on('keydown-W', () => move(-1)).on('keydown-DOWN', () => move(1)).on('keydown-S', () => move(1));
    this.input.keyboard!.on('keydown-ENTER', () => items[cursor].go()).on('keydown-SPACE', () => items[cursor].go());
  }
}
