import * as Phaser from 'phaser';
import { GAME_WIDTH as GW, GAME_HEIGHT as GH, BUDGET } from '../data/config';
import { PLAYER } from '../data/player';
import { HEAT } from '../data/heat';
import { DISTRICTS } from '../data/map';
import { KMH_PER_PX } from '../data/vehicles';
import { MAX_PROJECTILES } from '../data/weapons';
import { t } from '../data/strings';
import { SPEAKERS } from '../data/characters';
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
  // story
  private hint!: Phaser.GameObjects.Text;
  private dlgBox!: Phaser.GameObjects.Graphics;
  private dlgName!: Phaser.GameObjects.Text;
  private dlgText!: Phaser.GameObjects.Text;
  private dlgNext!: Phaser.GameObjects.Text;
  private portrait!: Phaser.GameObjects.Image;
  private cardTitle!: Phaser.GameObjects.Text;
  private cardSub!: Phaser.GameObjects.Text;
  private phoneFrom!: Phaser.GameObjects.Text;
  private phoneText!: Phaser.GameObjects.Text;
  private radio!: Phaser.GameObjects.Text;
  private stampKanji!: Phaser.GameObjects.Text;
  private stampName!: Phaser.GameObjects.Text;
  private spillLabel!: Phaser.GameObjects.Text;
  private rain: { x: number; y: number; v: number }[] = [];
  private rainG!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Hud');
  }

  create(): void {
    this.world = this.scene.get('World') as WorldScene;
    this.lanterns = [];
    this.rainG = this.add.graphics();
    this.rain = Array.from({ length: 90 }, () => ({ x: Math.random() * GW, y: Math.random() * GH, v: 500 + Math.random() * 300 }));
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

    // --- story elements ---
    this.hint = this.add.text(GW / 2, 60, '', { ...FONT, fontSize: '10px', color: '#e8d9a8' }).setOrigin(0.5, 0);
    this.spillLabel = this.add.text(GW - 12, GH - 62, 'SOUP SPILLED', { ...FONT, fontSize: '10px' }).setOrigin(1, 0);
    this.radio = this.add.text(GW, GH - 22, '', { ...FONT, fontSize: '11px', color: '#7fe0ff' });
    this.phoneFrom = this.add.text(GW - 300, GH - 132, '', { ...FONT, fontSize: '11px', color: '#e8b923' });
    this.phoneText = this.add.text(GW - 300, GH - 116, '', { ...FONT, fontSize: '11px', wordWrap: { width: 280 } });
    this.stampKanji = this.add.text(GW / 2, 150, '', { fontFamily: 'sans-serif', fontSize: '72px', color: '#d8343a', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    this.stampName = this.add.text(GW / 2, 208, '', { ...FONT, fontSize: '14px', align: 'center' }).setOrigin(0.5, 0);
    this.cardTitle = this.add.text(GW / 2, GH / 2 - 24, '', { fontFamily: 'monospace', fontSize: '34px', color: '#e8b923', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    this.cardSub = this.add.text(GW / 2, GH / 2 + 20, '', { ...FONT, fontSize: '14px' }).setOrigin(0.5);
    this.dlgBox = this.add.graphics();
    this.portrait = this.add.image(96, GH - 78, 'f_jun').setScale(3);
    this.dlgName = this.add.text(160, GH - 128, '', { ...FONT, fontSize: '14px' });
    this.dlgText = this.add.text(160, GH - 106, '', { fontFamily: 'monospace', fontSize: '15px', color: '#ffffff', wordWrap: { width: 740 }, lineSpacing: 4 });
    this.dlgNext = this.add.text(GW - 60, GH - 36, 'click ▶', { ...FONT, fontSize: '10px', color: '#c8c8d4' }).setOrigin(1, 0);
    // click, Space, Enter or E moves a cutscene on
    const next = () => this.world.story.advanceCut();
    this.input.on('pointerdown', next);
    this.input.keyboard!.on('keydown-SPACE', next);
    this.input.keyboard!.on('keydown-ENTER', next);
    this.input.keyboard!.on('keydown-E', next);
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
    const story = w.story;
    // objective line: the mission's, or "Lose the police." when you are just wanted
    this.objective.setText(story.objective || (heat.level > 0 ? t('OBJ_LOSE_POLICE') : heat.cleanT > 0 ? t('UI_HEAT_CLEAR') : ''));
    this.objective.setColor(story.objective || heat.level > 0 ? '#ffffff' : '#7fe08a');
    this.hint.setText(story.hint);
    this.drawStory(delta / 1000);
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
      this.speed.setText(car.def.shape === 'scooter' ? `${Math.round(car.speed * KMH_PER_PX)} km/h` : `${Math.round(car.speed * KMH_PER_PX)} km/h   NITRO`);
      g.fillStyle(0x000000, 0.6).fillRect(GW - 114, GH - 22, 104, 10);
      g.fillStyle(car.nitroOn ? 0xffffff : car.drifting ? 0x7ff0ff : 0x35b8e0, 1).fillRect(GW - 112, GH - 20, 100 * car.nitro, 6);
    }
    this.help.setVisible(!story.radio && !story.cut);
    this.help.setText(car
      ? 'W/S drive · A/D steer · Space handbrake (drift fills nitro) · Shift nitro · E get out'
      : 'WASD move · mouse aim · click fire · V punch · Space roll · 1-4 / wheel weapon · R reload · E steal car · F3 debug');

    this.drawMinimap();

    // death / arrest screens
    const over = w.mode === 'dead' || w.mode === 'arrested';
    this.shade.setVisible(over); this.big.setVisible(over); this.sub.setVisible(over);
    if (over) {
      const amount = w.bill.toLocaleString('en-US');
      this.big.setText(t(w.mode === 'dead' ? 'UI_DEATH_BIG' : 'UI_ARREST_BIG')).setColor(w.mode === 'dead' ? '#d8343a' : '#4a8cff');
      this.sub.setText(t(w.mode === 'dead' ? 'UI_DEATH' : 'UI_ARREST', { amount }));
    }

    // debug overlay (F3)
    this.debug.setVisible(w.debugOn);
    if (w.debugOn) {
      const vehicles = w.cars.length, hostile = w.police.aliveCount + w.gang.count + w.cars.reduce((n, c) => n + (c.driver === 'cop' ? 1 : 0), 0);
      this.debug.setText([
        `FPS ${Math.round(this.game.loop.actualFps)} (target ${BUDGET.targetFps})`,
        `Pedestrians ${w.peds.aliveCount} / ${BUDGET.pedestrians}`,
        `Vehicles ${vehicles} / ${BUDGET.vehicles}`,
        `Police ${hostile} / ${BUDGET.hostileAi}`,
        `Projectiles ${w.projectiles.active} / ${MAX_PROJECTILES}`,
        `Effects ${w.fx.activeCount}`,
        `Heat ${heat.level}  ${heat.level ? (heat.seen ? 'SEEN' : `unseen ${heat.timer.toFixed(1)} / ${heat.timeNeeded}s${heat.insideZone ? ' (in zone)' : ''}`) : ''}`,
        `Mission ${story.mission ? story.mission.id : 'none left'}${story.active ? ' step ' + story.step : ' (free roam)'}   F4 skip · F6 restart story`,
        car ? `${car.def.name}  HP ${Math.max(0, Math.round(car.hp))}${car.burning ? `  FIRE ${car.burnTimer.toFixed(1)}s` : ''}` : '',
      ]);
    }
  }

  /** Cutscene text box, title cards, phone messages, radio ticker, district stamp, spill meter, rain. */
  private drawStory(dt: number): void {
    const w = this.world, s = w.story, g = this.g;

    // rain
    this.rainG.clear();
    if (w.ambience.rain) {
      this.rainG.lineStyle(1, 0xaec8e8, 0.35);
      for (const r of this.rain) {
        r.y += r.v * dt; r.x -= r.v * 0.25 * dt;
        if (r.y > GH) { r.y = -10; r.x = Math.random() * (GW + 140); }
        this.rainG.lineBetween(r.x, r.y, r.x - 3, r.y + 12);
      }
    }

    // district stamp, 2-3 s at the start
    const st = s.stamp > 0 && !s.cut && !!DISTRICTS[w.districtId];
    if (st) { const d = DISTRICTS[w.districtId]; this.stampKanji.setText(d.kanji); this.stampName.setText(`${d.name}\n${d.tagline}`); }
    this.stampKanji.setVisible(st).setAlpha(Math.min(1, s.stamp)); this.stampName.setVisible(st).setAlpha(Math.min(1, s.stamp));

    // soup spill meter (mission 2)
    if (s.showSpill) {
      g.fillStyle(0x000000, 0.6).fillRect(GW - 114, GH - 48, 104, 8);
      g.fillStyle(s.spill < 0.1 ? 0x7fe08a : s.spill <= 0.5 ? 0xf2c230 : 0xe04a3a, 1).fillRect(GW - 112, GH - 46, 100 * Math.min(1, s.spill), 4);
    }

    // mission countdown or meter (camera timer, detection eye, shops left...)
    this.spillLabel.setVisible(s.showSpill || !!s.timer);
    this.spillLabel.setText(s.timer ? (s.timer.kind === 'time' ? `${s.timer.label} ${Math.max(0, Math.ceil(s.timer.value))}s` : s.timer.label) : 'SOUP SPILLED');
    if (s.timer && s.timer.kind === 'bar') {
      const k = Math.max(0, Math.min(1, s.timer.value / s.timer.max));
      g.fillStyle(0x000000, 0.6).fillRect(GW - 114, GH - 48, 104, 8);
      g.fillStyle(k < 0.5 ? 0x7fe08a : k < 0.8 ? 0xf2c230 : 0xe04a3a, 1).fillRect(GW - 112, GH - 46, 100 * k, 4);
    }

    // radio ticker scrolling along the bottom
    this.radio.setVisible(!!s.radio && !s.cut);
    if (s.radio) {
      g.fillStyle(0x000000, 0.55).fillRect(130, GH - 26, GW - 260, 20);
      this.radio.setText(`♪ ${s.radio.station} · ${s.radio.text}`).setX(GW - 130 - s.radio.x);
      this.radio.setCrop(Math.max(0, 130 - this.radio.x), 0, Math.max(0, GW - 130 - Math.max(130, this.radio.x)), 20);
    }

    // phone message / call line
    const ph = s.phone[0];
    this.phoneFrom.setVisible(!!ph && !s.cut); this.phoneText.setVisible(!!ph && !s.cut);
    if (ph && !s.cut) {
      const sp = SPEAKERS[ph.from];
      this.phoneFrom.setText('✆ ' + (sp?.name ?? ph.from)).setColor(sp?.color ?? '#e8b923');
      this.phoneText.setText(ph.text);
      g.fillStyle(0x0b0b10, 0.85).fillRect(GW - 310, GH - 138, 300, 30 + this.phoneText.height);
      g.lineStyle(1, 0xe8b923, 0.8).strokeRect(GW - 310, GH - 138, 300, 30 + this.phoneText.height);
    }

    // mission title card
    this.cardTitle.setVisible(!!s.card); this.cardSub.setVisible(!!s.card);
    if (s.card) {
      g.fillStyle(0x000000, 0.7).fillRect(0, GH / 2 - 60, GW, 110);
      this.cardTitle.setText(s.card.title); this.cardSub.setText(s.card.sub);
    }

    // cutscene text box with a portrait
    const c = s.cut, d = this.dlgBox;
    d.clear();
    for (const o of [this.dlgName, this.dlgText, this.dlgNext, this.portrait]) o.setVisible(!!c);
    if (!c) return;
    const line = c.lines[c.i], sp = SPEAKERS[line.who];
    d.fillStyle(0x000000, 0.45).fillRect(0, 0, GW, GH);
    d.fillStyle(0x0b0b10, 0.94).fillRect(30, GH - 140, GW - 60, 124);
    d.lineStyle(2, 0xe8b923, 1).strokeRect(30, GH - 140, GW - 60, 124);
    this.portrait.setVisible(!!sp);
    if (sp) {
      d.fillStyle(0x24202a, 1).fillRect(44, GH - 130, 104, 104);
      d.lineStyle(1, Phaser.Display.Color.HexStringToColor(sp.color).color, 1).strokeRect(44, GH - 130, 104, 104);
      this.portrait.setTexture('f_' + sp.look);
    }
    const x = sp ? 164 : 60;
    this.dlgName.setText(sp ? sp.name : '').setColor(sp?.color ?? '#fff').setX(x);
    this.dlgText.setX(x).setY(sp ? GH - 106 : GH - 112).setColor(sp ? '#ffffff' : '#b8b4c8').setFontStyle(sp ? 'normal' : 'italic');
    this.dlgText.setWordWrapWidth(sp ? 740 : 840);
    this.dlgText.setText(line.text.slice(0, Math.floor(c.chars)));
    this.dlgNext.setAlpha(c.chars >= line.text.length ? 1 : 0.3);
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
    for (const r of w.map.water) rect(r.x, r.y, r.w, r.h, 0x2a5a78);
    for (const r of w.map.roads) { const thin = r.w < r.h; rect(r.x + (thin ? 34 : 0), r.y + (thin ? 0 : 34), r.w - (thin ? 68 : 0), r.h - (thin ? 0 : 68), 0x6f7386); }
    const dot = (x: number, y: number, color: number, size: number) => {
      const dx = (x - p.x) * S, dy = (y - p.y) * S;
      if (dx * dx + dy * dy < (R - 4) * (R - 4)) m.fillStyle(color, 1).fillRect(MM.x + dx - size / 2, MM.y + dy - size / 2, size, size);
    };
    dot(w.map.places.policeBox.x, w.map.places.policeBox.y, 0x2f5fa8, 6);
    dot(w.map.places.hospital.x, w.map.places.hospital.y, 0xb04a4a, 6);
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
    for (const a of w.gang.thugs) if (a.alive) dot(a.x, a.y, 0xc060ff, 3);
    for (const c of w.gang.activeChasers) dot(c.x, c.y, 0xc060ff, 5);
    const mk = w.story.marker;
    if (mk) { // mission marker: a gold diamond, pinned to the rim when it is far away
      let dx = (mk.x - p.x) * S, dy = (mk.y - p.y) * S;
      const d = Math.hypot(dx, dy), lim = R - 7;
      if (d > lim) { dx *= lim / d; dy *= lim / d; }
      m.fillStyle(0xe8b923, 1).fillTriangle(MM.x + dx, MM.y + dy - 5, MM.x + dx + 5, MM.y + dy, MM.x + dx, MM.y + dy + 5).fillTriangle(MM.x + dx, MM.y + dy - 5, MM.x + dx - 5, MM.y + dy, MM.x + dx, MM.y + dy + 5);
    }
    // the player: a gold arrow in the middle
    const ang = w.player.car ? w.player.car.heading : w.player.aim;
    m.fillStyle(0xe8b923, 1).fillTriangle(
      MM.x + Math.cos(ang) * 6, MM.y + Math.sin(ang) * 6,
      MM.x + Math.cos(ang + 2.5) * 5, MM.y + Math.sin(ang + 2.5) * 5,
      MM.x + Math.cos(ang - 2.5) * 5, MM.y + Math.sin(ang - 2.5) * 5,
    );
  }
}
