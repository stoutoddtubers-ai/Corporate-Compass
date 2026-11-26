import * as Phaser from 'phaser';
import { GAME_WIDTH as GW, GAME_HEIGHT as GH, BUDGET, TILE_SIZE } from '../data/config';
import { PLAYER } from '../data/player';
import { HEAT } from '../data/heat';
import { MAP } from '../data/map';
import { KMH_PER_PX } from '../data/vehicles';
import { MAX_PROJECTILES } from '../data/weapons';
import { t } from '../data/strings';
import type { WorldScene } from './WorldScene';

const FONT = { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 };
const MM = { x: 10 + 56, y: GH - 10 - 56, r: 52, scale: 0.085 };

/** Everything drawn on top of the game: bars, lanterns, ammo, cash, minimap, end screens, debug. */
export class HudScene extends Phaser.Scene {
  private world!: WorldScene;
  private g!: Phaser.GameObjects.Graphics;
  private mm!: Phaser.GameObjects.Graphics;
  private lanterns: Phaser.GameObjects.Image[] = [];
  private objective!: Phaser.GameObjects.Text;
  private weapon!: Phaser.GameObjects.Text;
  private cash!: Phaser.GameObjects.Text;
  private speed!: Phaser.GameObjects.Text;
  private debug!: Phaser.GameObjects.Text;
  private help!: Phaser.GameObjects.Text;
  private shade!: Phaser.GameObjects.Rectangle;
  private big!: Phaser.GameObjects.Text;
  private sub!: Phaser.GameObjects.Text;
  private shownCash = 0;

  constructor() {
    super('Hud');
  }

  create(): void {
    this.world = this.scene.get('World') as WorldScene;
    this.lanterns = [];
    this.mm = this.add.graphics();
    this.add.image(MM.x, MM.y, 'minimapFrame');
    this.g = this.add.graphics();
    for (let i = 0; i < HEAT.lanternSlots; i++)
      this.lanterns.push(this.add.image(GW / 2 + (i - (HEAT.lanternSlots - 1) / 2) * 22, 20, 'lantern'));
    this.objective = this.add.text(GW / 2, 36, '', FONT).setOrigin(0.5, 0);
    this.weapon = this.add.text(GW - 12, 8, '', FONT).setOrigin(1, 0);
    this.cash = this.add.text(GW - 12, 26, '', { ...FONT, color: '#e8b923' }).setOrigin(1, 0);
    this.speed = this.add.text(GW - 12, GH - 40, '', FONT).setOrigin(1, 0);
    this.debug = this.add.text(12, 40, '', { ...FONT, fontSize: '10px', color: '#9fe0a8' });
    this.help = this.add.text(GW / 2, GH - 8, '', { ...FONT, fontSize: '10px', color: '#c8c8d4' }).setOrigin(0.5, 1);
    this.shade = this.add.rectangle(0, 0, GW, GH, 0x000000, 0.78).setOrigin(0).setVisible(false);
    this.big = this.add.text(GW / 2, GH / 2 - 30, '', { fontFamily: 'sans-serif', fontSize: '64px', color: '#d8343a', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setVisible(false);
    this.sub = this.add.text(GW / 2, GH / 2 + 34, '', { ...FONT, fontSize: '16px' }).setOrigin(0.5).setVisible(false);
    this.shownCash = this.world.player.cash;
  }

  update(_t: number, delta: number): void {
    const w = this.world, p = w.player, heat = w.heat, g = this.g;
    const now = this.time.now / 1000;
    g.clear();

    // health (red) over armour (grey), top left
    g.fillStyle(0x000000, 0.6).fillRect(10, 10, 124, 14).fillRect(10, 26, 124, 8);
    g.fillStyle(0xd8343a, 1).fillRect(12, 12, 120 * (p.hp / PLAYER.maxHp), 10);
    g.fillStyle(0xa9adb8, 1).fillRect(12, 28, 120 * (p.armour / PLAYER.maxArmour), 4);

    // Heat lanterns, top centre: flash when gained, dim while a search is on
    this.lanterns.forEach((l, i) => {
      const lit = i < heat.level;
      const blink = heat.searching ? 0.45 + 0.2 * Math.sin(now * 5) : 1;
      l.setTint(lit ? 0xff3b30 : 0x8a8a98).setAlpha(lit ? blink : i < HEAT.maxLevel ? 0.7 : 0.3);
      l.setScale(lit && heat.flash > 0 ? 1 + 0.5 * Math.abs(Math.sin(heat.flash * 12)) : 1);
    });
    this.objective.setText(heat.level > 0 ? t('OBJ_LOSE_POLICE') : heat.cleanT > 0 ? t('UI_HEAT_CLEAR') : '');
    this.objective.setColor(heat.level > 0 ? '#ffffff' : '#7fe08a');
    if (heat.level > 0 && heat.searching) {
      // how close the search is to being called off
      g.fillStyle(0x000000, 0.6).fillRect(GW / 2 - 51, 53, 102, 5);
      g.fillStyle(heat.insideZone && HEAT.lose[heat.level].needZone ? 0x8a3a3a : 0x7fe08a, 1).fillRect(GW / 2 - 50, 54, 100 * Math.min(1, heat.timer / heat.timeNeeded), 3);
    }

    // weapon + ammo and cash, top right
    const s = p.weapon;
    this.weapon.setText(s.def.mag === 0 ? s.def.name : `${s.def.name}  ${p.reloadT > 0 ? 'RELOADING' : `${s.mag} / ${s.reserve}`}`);
    this.shownCash += (p.cash - this.shownCash) * Math.min(1, delta / 150);
    if (Math.abs(p.cash - this.shownCash) < 1) this.shownCash = p.cash;
    this.cash.setText('¥' + Math.round(this.shownCash).toLocaleString('en-US'));

    // speed and nitro, bottom right, only while driving
    const car = p.car;
    this.speed.setVisible(!!car);
    if (car) {
      this.speed.setText(`${Math.round(car.speed * KMH_PER_PX)} km/h   NITRO`);
      g.fillStyle(0x000000, 0.6).fillRect(GW - 114, GH - 22, 104, 10);
      g.fillStyle(car.nitroOn ? 0xffffff : car.drifting ? 0x7ff0ff : 0x35b8e0, 1).fillRect(GW - 112, GH - 20, 100 * car.nitro, 6);
    }
    this.help.setText(car
      ? 'W/S drive · A/D steer · Space handbrake (drift fills nitro) · Shift nitro · E get out'
      : 'WASD move · mouse aim · click fire · Space roll · 1-4 / wheel weapon · R reload · E steal car · F3 debug');

    this.drawMinimap();

    // death / arrest screens
    const over = w.mode !== 'play';
    this.shade.setVisible(over); this.big.setVisible(over); this.sub.setVisible(over);
    if (over) {
      const amount = w.bill.toLocaleString('en-US');
      this.big.setText(t(w.mode === 'dead' ? 'UI_DEATH_BIG' : 'UI_ARREST_BIG')).setColor(w.mode === 'dead' ? '#d8343a' : '#4a8cff');
      this.sub.setText(t(w.mode === 'dead' ? 'UI_DEATH' : 'UI_ARREST', { amount }));
    }

    // debug overlay (F3)
    this.debug.setVisible(w.debugOn);
    if (w.debugOn) {
      const vehicles = w.cars.length, hostile = w.police.aliveCount + w.cars.reduce((n, c) => n + (c.driver === 'cop' ? 1 : 0), 0);
      this.debug.setText([
        `FPS ${Math.round(this.game.loop.actualFps)} (target ${BUDGET.targetFps})`,
        `Pedestrians ${w.peds.aliveCount} / ${BUDGET.pedestrians}`,
        `Vehicles ${vehicles} / ${BUDGET.vehicles}`,
        `Police ${hostile} / ${BUDGET.hostileAi}`,
        `Projectiles ${w.projectiles.active} / ${MAX_PROJECTILES}`,
        `Effects ${w.fx.activeCount}`,
        `Heat ${heat.level}  ${heat.level ? (heat.seen ? 'SEEN' : `unseen ${heat.timer.toFixed(1)} / ${heat.timeNeeded}s${heat.insideZone ? ' (in zone)' : ''}`) : ''}`,
        car ? `${car.def.name}  HP ${Math.max(0, Math.round(car.hp))}${car.burning ? `  FIRE ${car.burnTimer.toFixed(1)}s` : ''}` : '',
      ]);
    }
  }

  /** Round minimap, bottom left: roads as lines, police as dots, the search circle. */
  private drawMinimap(): void {
    const w = this.world, m = this.mm, p = w.player.pos, S = MM.scale, R = MM.r;
    m.clear();
    m.fillStyle(0x14141c, 0.92).fillRect(MM.x - R, MM.y - R, R * 2, R * 2);
    const rect = (x: number, y: number, rw: number, rh: number, color: number) => {
      const x0 = Math.max(MM.x - R, MM.x + (x - p.x) * S), y0 = Math.max(MM.y - R, MM.y + (y - p.y) * S);
      const x1 = Math.min(MM.x + R, MM.x + (x + rw - p.x) * S), y1 = Math.min(MM.y + R, MM.y + (y + rh - p.y) * S);
      if (x1 > x0 && y1 > y0) m.fillStyle(color, 1).fillRect(x0, y0, x1 - x0, y1 - y0);
    };
    const lo = MAP.roadBands[0] * TILE_SIZE, hi = (MAP.roadBands[2] + MAP.roadWidth) * TILE_SIZE;
    for (const b of MAP.roadBands) {
      const c = (b + MAP.roadWidth / 2) * TILE_SIZE;
      rect(c - 30, lo, 60, hi - lo, 0x6f7386);
      rect(lo, c - 30, hi - lo, 60, 0x6f7386);
    }
    const dot = (x: number, y: number, color: number, size: number) => {
      const dx = (x - p.x) * S, dy = (y - p.y) * S;
      if (dx * dx + dy * dy < (R - 4) * (R - 4)) m.fillStyle(color, 1).fillRect(MM.x + dx - size / 2, MM.y + dy - size / 2, size, size);
    };
    dot(MAP.policeBox.spawn[0] * TILE_SIZE, MAP.policeBox.spawn[1] * TILE_SIZE, 0x2f5fa8, 6);
    dot(MAP.hospital.spawn[0] * TILE_SIZE, MAP.hospital.spawn[1] * TILE_SIZE, 0xb04a4a, 6);
    const heat = w.heat;
    if (heat.level > 0 && heat.searching) {
      // the search circle, drawn as short strokes so it stays inside the round map
      m.lineStyle(2, 0xff3b30, 0.9);
      const cx = (heat.lastKnown.x - p.x) * S, cy = (heat.lastKnown.y - p.y) * S, r = heat.searchRadius * S, lim = (R - 2) * (R - 2);
      for (let i = 0; i < 40; i++) {
        const a0 = (i / 40) * Math.PI * 2, a1 = ((i + 1) / 40) * Math.PI * 2;
        const x0 = cx + Math.cos(a0) * r, y0 = cy + Math.sin(a0) * r, x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
        if (x0 * x0 + y0 * y0 < lim && x1 * x1 + y1 * y1 < lim) m.lineBetween(MM.x + x0, MM.y + y0, MM.x + x1, MM.y + y1);
      }
    }
    const blink = Math.floor(this.time.now / 200) % 2 ? 0xff4040 : 0x4a8cff;
    for (const c of w.cars) if (c.isPolice && !c.wreck && (c.driver === 'cop' || c.roadblock)) dot(c.x, c.y, blink, 5);
    for (const a of w.police.cops) if (a.alive) dot(a.x, a.y, 0x4a8cff, 3);
    // the player: a gold arrow in the middle
    const ang = w.player.car ? w.player.car.heading : w.player.aim;
    m.fillStyle(0xe8b923, 1).fillTriangle(
      MM.x + Math.cos(ang) * 6, MM.y + Math.sin(ang) * 6,
      MM.x + Math.cos(ang + 2.5) * 5, MM.y + Math.sin(ang + 2.5) * 5,
      MM.x + Math.cos(ang - 2.5) * 5, MM.y + Math.sin(ang - 2.5) * 5,
    );
  }
}
