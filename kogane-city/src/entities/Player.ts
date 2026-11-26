import * as Phaser from 'phaser';
import { Actor } from './Actor';
import type { Car } from './Car';
import { PLAYER } from '../data/player';
import { WEAPONS, WeaponDef, MELEE } from '../data/weapons';
import { PICKUPS } from '../data/ai';
import { BARKS, pick } from '../data/strings';
import type { WorldScene } from '../scenes/WorldScene';

export interface WeaponSlot { def: WeaponDef; mag: number; reserve: number }

/** Jun: on-foot movement, dodge roll, shooting, health and armour, and getting in and out of cars. */
export class Player {
  readonly actor: Actor;
  hp: number = PLAYER.maxHp;
  armour: number = PLAYER.startArmour;
  cash: number = PLAYER.startCash;
  car: Car | null = null;
  weapons: WeaponSlot[] = [];
  current = 1;
  reloadT = 0;
  aim = 0;
  /** Seconds since the current roll started, or -1 when not rolling. */
  rollT = -1;
  rollCooldown = 0;
  /** Car being broken into / driver being dragged out, with progress. */
  entering: { car: Car; t: number; need: number } | null = null;
  private fireT = 0;
  private rollDir = { x: 1, y: 0 };
  private combo = 0;
  private comboT = 0;
  private lowBarked = false;

  constructor(private world: WorldScene, x: number, y: number) {
    this.actor = new Actor(world, 'player', x, y, 0xe8b923, PLAYER.maxHp);
    this.actor.sprite.setDepth(4.5);
    this.resetWeapons(PLAYER.startWeapons);
  }

  resetWeapons(ids: readonly string[]): void {
    this.weapons = ids.map((id) => ({ def: WEAPONS[id], mag: WEAPONS[id].mag, reserve: WEAPONS[id].startReserve }));
    this.current = Math.min(1, this.weapons.length - 1);
    this.reloadT = 0;
  }

  giveWeapon(id: string): void {
    const def = WEAPONS[id];
    const have = this.weapons.find((w) => w.def.id === id);
    if (have) have.reserve += def.mag * PICKUPS.ammoMags;
    else this.weapons.push({ def, mag: def.mag, reserve: def.startReserve });
  }

  get weapon(): WeaponSlot { return this.weapons[this.current]; }
  get rolling(): boolean { return this.rollT >= 0; }
  get invulnerable(): boolean { return this.rollT >= 0 && this.rollT < PLAYER.roll.invulnerable; }
  /** Where the player is, whether walking or driving. */
  get pos(): { x: number; y: number } { return this.car ?? this.actor.sprite; }

  takeDamage(amount: number, isBullet: boolean): void {
    if (this.world.mode !== 'play' || this.invulnerable) return;
    if (isBullet && this.armour > 0) {
      const soaked = Math.min(this.armour, amount * PLAYER.armourAbsorb);
      this.armour -= soaked; amount -= soaked;
    }
    this.hp -= amount;
    this.world.cameras.main.shake(80, 0.004);
    if (this.hp <= 0) { this.hp = 0; this.world.playerDied(); }
    else if (this.hp <= PLAYER.lowHp && !this.lowBarked) { this.lowBarked = true; this.world.fx.bark(this.pos, pick(BARKS.junLowHealth), '#e8b923'); }
  }

  heal(): void { this.hp = PLAYER.maxHp; this.lowBarked = false; }

  switchTo(i: number): void {
    if (i < 0 || i >= this.weapons.length || i === this.current) return;
    this.current = i; this.reloadT = 0; this.fireT = Math.max(this.fireT, 0.15);
  }

  private startReload(): void {
    const w = this.weapon;
    if (this.reloadT > 0 || w.def.mag === 0 || w.mag >= w.def.mag || w.reserve <= 0) return;
    this.reloadT = w.def.reloadTime;
  }

  update(dt: number): void {
    const w = this.world, k = w.keys;
    this.fireT -= dt; this.rollCooldown -= dt; this.comboT -= dt;
    this.actor.carHitCooldown -= dt;
    if (this.comboT <= 0) this.combo = 0;
    const eDown = Phaser.Input.Keyboard.JustDown(k.E);
    const spaceDown = Phaser.Input.Keyboard.JustDown(k.SPACE);

    if (this.car) {
      const c = this.car;
      c.input.throttle = (k.W.isDown ? 1 : 0) - (k.S.isDown ? 1 : 0);
      c.input.steer = (k.D.isDown ? 1 : 0) - (k.A.isDown ? 1 : 0);
      c.input.handbrake = k.SPACE.isDown;
      c.input.nitro = k.SHIFT.isDown;
      c.input.brake = false;
      this.actor.sprite.setPosition(c.x, c.y);
      if (eDown || c.wreck) this.exitCar();
      return;
    }

    // --- on foot ---
    const a = this.actor;
    let mx = (k.D.isDown ? 1 : 0) - (k.A.isDown ? 1 : 0), my = (k.S.isDown ? 1 : 0) - (k.W.isDown ? 1 : 0);
    const ml = Math.hypot(mx, my);
    if (ml) { mx /= ml; my /= ml; }
    const ptr = w.input.activePointer;
    const wp = ptr.positionToCamera(w.cameras.main) as Phaser.Math.Vector2;
    this.aim = Math.atan2(wp.y - a.y, wp.x - a.x);

    if (this.rolling) {
      this.rollT += dt;
      a.body.setVelocity(this.rollDir.x * PLAYER.roll.speed, this.rollDir.y * PLAYER.roll.speed);
      a.sprite.setAlpha(this.invulnerable ? 0.45 : 0.8).setScale(0.8);
      a.sprite.rotation += 20 * dt;
      if (this.rollT >= PLAYER.roll.duration) { this.rollT = -1; a.sprite.setAlpha(1).setScale(1); }
      return;
    }
    if (spaceDown && this.rollCooldown <= 0) {
      this.rollT = 0;
      this.rollCooldown = PLAYER.roll.duration + PLAYER.roll.cooldown;
      this.rollDir = ml ? { x: mx, y: my } : { x: Math.cos(this.aim), y: Math.sin(this.aim) };
      this.entering = null;
      return;
    }
    a.body.setVelocity(mx * PLAYER.walkSpeed, my * PLAYER.walkSpeed);
    a.sprite.rotation = this.aim;

    // weapons
    const numKeys = [k.ONE, k.TWO, k.THREE, k.FOUR];
    numKeys.forEach((key, i) => { if (Phaser.Input.Keyboard.JustDown(key)) this.switchTo(i); });
    if (Phaser.Input.Keyboard.JustDown(k.R)) this.startReload();
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        const s = this.weapon, n = Math.min(s.def.mag - s.mag, s.reserve);
        s.mag += n; s.reserve -= n;
      }
    }
    if (ptr.leftButtonDown() && this.fireT <= 0 && this.reloadT <= 0 && !this.entering) this.fire();

    // cars: E to steal / enter
    if (this.entering) {
      const e = this.entering;
      e.t += dt;
      if (e.car.removed || e.car.wreck || Math.hypot(e.car.x - a.x, e.car.y - a.y) > PLAYER.enterRange + 14) this.entering = null;
      else if (e.t >= e.need) { this.entering = null; this.enterCar(e.car); }
    } else if (eDown) {
      const c = w.nearestCar(a.x, a.y, PLAYER.enterRange);
      if (c) {
        const occupied = c.driver === 'traffic' || c.driver === 'cop';
        this.entering = { car: c, t: 0, need: occupied ? PLAYER.dragOutTime : c.unlocked ? 0 : PLAYER.breakInTime };
      }
    }
  }

  private fire(): void {
    const w = this.world, s = this.weapon, d = s.def, a = this.actor;
    const ox = a.x + Math.cos(this.aim) * 12, oy = a.y + Math.sin(this.aim) * 12;
    if (d.weaponClass === 'melee') {
      this.fireT = 1 / d.rate;
      w.fx.puff(a.x + Math.cos(this.aim) * 16, a.y + Math.sin(this.aim) * 16, 0xffffff, 8, 0.12, 0, 0, 2, 0.6);
      let best: Actor | null = null, bd = d.range + PLAYER.radius;
      for (const t of [...w.peds.list, ...w.police.cops]) {
        if (!t.alive) continue;
        const dist = Math.hypot(t.x - a.x, t.y - a.y);
        const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - a.y, t.x - a.x) - this.aim));
        if (dist < bd && off < Phaser.Math.DegToRad(MELEE.arcDegrees)) { bd = dist; best = t; }
      }
      if (best) {
        this.combo++; this.comboT = MELEE.comboWindow;
        if (this.combo >= MELEE.comboHits) { best.stun = MELEE.knockdownTime; this.combo = 0; }
        w.hurtActor(best, d.damage, true, 'melee');
        w.fx.spark(best.x, best.y, 0xffffff);
      }
      return;
    }
    if (s.mag <= 0) { this.startReload(); return; }
    s.mag--;
    this.fireT = 1 / d.rate;
    for (let i = 0; i < d.pellets; i++) {
      const ang = this.aim + Phaser.Math.DegToRad((Math.random() * 2 - 1) * d.spread);
      w.projectiles.fire(ox, oy, ang, d, 'player');
    }
    w.fx.puff(ox, oy, 0xfff2a0, 7, 0.06, 0, 0, 0, 0.9);
    w.onGunshot(a.x, a.y, d.noise);
    if (s.mag <= 0) this.startReload();
  }

  private enterCar(c: Car): void {
    const w = this.world;
    if (c.driver === 'traffic') {
      w.heat.crime('carjack');
      const ped = w.peds.spawn(false, w.sidePoint(c, -1));
      if (ped) { ped.state = 'flee'; ped.timer = 6; ped.tx = c.x; ped.ty = c.y; }
    } else if (c.driver === 'cop') {
      w.heat.crime('hitOfficer');
      w.police.spawnCopAt(w.sidePoint(c, -1), false);
    } else if (!c.unlocked && w.witnessed(c.x, c.y)) w.heat.crime('breakIn'); // the alarm
    c.driver = 'player'; c.unlocked = true; c.seg = null; c.roadblock = false;
    this.car = c;
    this.reloadT = 0;
    this.actor.body.setVelocity(0, 0);
    this.actor.body.enable = false;
    this.actor.sprite.setVisible(false);
    w.fx.bark(c, pick(BARKS.junSteal), '#e8b923', 'jun', 4);
  }

  exitCar(): void {
    const c = this.car;
    if (!c) return;
    const p = this.world.sidePoint(c, 1);
    c.driver = 'none';
    c.input.throttle = 0; c.input.steer = 0;
    this.car = null;
    this.actor.body.enable = true;
    this.actor.body.reset(p.x, p.y);
    this.actor.sprite.setVisible(true);
  }
}
