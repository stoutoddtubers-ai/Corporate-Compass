import * as Phaser from 'phaser';
import { VehicleDef, NITRO, CAR_DAMAGE } from '../data/vehicles';
import { GARAGE } from '../data/garage';
import { SHEET } from '../systems/sprites';
import type { CityMap, LaneSeg } from '../systems/CityMap';

export interface CarInput { throttle: number; steer: number; handbrake: boolean; nitro: boolean; brake: boolean }
export const NO_INPUT: CarInput = { throttle: 0, steer: 0, handbrake: false, nitro: false, brake: false };

const approach = (v: number, target: number, step: number) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));

/**
 * A car with a simple arcade handling model:
 *  - the engine pushes it along the way it points,
 *  - "tyre grip" kills sideways sliding; the handbrake drops grip so it drifts,
 *  - drifting fills the nitro bar.
 */
export class Car {
  readonly sprite: Phaser.GameObjects.Image;
  readonly lightbar: Phaser.GameObjects.Rectangle | null = null;
  private shadow: Phaser.GameObjects.Image;
  private glowBrake: Phaser.GameObjects.Image;
  /** Name of this car's set of 16 direction pictures on the sprite sheet ('' = old single picture). */
  private dirBase = '';
  private dir = 0;
  private battered = false;
  /** True while the brakes are on (brake lights). */
  braking = false;
  private beam: Phaser.GameObjects.Image;
  colorIndex: number;
  /** Sideways slide in px/s (used for drifting and for spilling soup). */
  slip = 0;
  /** Hardest bump against another car this frame. */
  bump = 0;
  x: number; y: number; heading: number;
  vx = 0; vy = 0;
  hp: number;
  nitro = 0;
  driver: 'none' | 'player' | 'traffic' | 'cop' | 'gang' = 'none';
  /** True once the player has broken in, so getting back in is instant. */
  unlocked = false;
  burning = false;
  burnTimer = 0;
  wreck = false;
  wreckTimer = 0;
  removed = false;
  drifting = false;
  nitroOn = false;
  lastImpact = 0;
  hurtByPlayer = false;
  // AI bookkeeping (used by the traffic and police systems)
  seg: LaneSeg | null = null;
  nextSeg: LaneSeg | null = null;
  crossing = false;
  panic = 0;
  stuck = 0;
  reverseT = 0;
  waitT = 0;
  roadblock = false;
  /** Line this car's driver shouts while chasing (mission riders). */
  data_bark = '';
  /** Story cars are not removed or steered by the normal traffic rules. */
  story = false;
  /** Garage upgrades bought for this car. */
  up = { engine: 0, nitro: 0, armour: 0 };
  maxHp: number;
  /** Lanes a story car has been told to follow, in order. */
  route: LaneSeg[] = [];
  /** Cruising speed override for AI drivers (0 = default). */
  cruise = 0;
  age = 0;
  input: CarInput = { ...NO_INPUT };
  private fxT = 0;
  private safe = { x: 0, y: 0, h: 0 };

  constructor(scene: Phaser.Scene, readonly def: VehicleDef, x: number, y: number, heading: number, readonly isPolice = false, colorIndex = -1) {
    this.x = x; this.y = y; this.heading = heading;
    this.hp = def.hp;
    this.maxHp = def.hp;
    // random traffic avoids the last (black) colour slot, which the story uses
    this.colorIndex = colorIndex >= 0 ? colorIndex : Math.floor(Math.random() * Math.max(1, def.colors.length - (def.colors.length > 2 ? 1 : 0)));
    this.shadow = scene.add.image(x, y, 'carShadow').setDepth(2.8).setDisplaySize(def.length, def.width);
    const base = `car_${def.id}_${this.colorIndex}`;
    if (SHEET[base + '_d0']) {
      this.dirBase = base; // Blender renders: one picture per direction, at twice game size
      this.sprite = scene.add.image(x, y, SHEET[base + '_d0'], base + '_d0').setScale(0.5).setDepth(3);
    } else this.sprite = scene.add.image(x, y, base).setDepth(3);
    this.glowBrake = scene.add.image(x, y, 'glow').setTint(0xff2020).setScale(0.3).setDepth(31).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.beam = scene.add.image(x, y, 'beam').setOrigin(0, 0.5).setDepth(31).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    if (isPolice) this.lightbar = scene.add.rectangle(x, y, 4, def.width - 8, 0xff2a2a).setDepth(32);
    this.safe = { x, y, h: heading };
    this.sync();
  }

  get speed(): number { return Math.hypot(this.vx, this.vy); }
  get forwardSpeed(): number { return this.vx * Math.cos(this.heading) + this.vy * Math.sin(this.heading); }

  /** The two circles used for bumping into other cars and people. */
  circle(i: 0 | 1): { x: number; y: number; r: number } {
    const o = (i ? -1 : 1) * this.def.length * 0.25;
    return { x: this.x + Math.cos(this.heading) * o, y: this.y + Math.sin(this.heading) * o, r: this.def.width / 2 + 2 };
  }

  /** Is a world point inside the car's body? */
  contains(px: number, py: number, pad = 0): boolean {
    const dx = px - this.x, dy = py - this.y, c = Math.cos(this.heading), s = Math.sin(this.heading);
    return Math.abs(dx * c + dy * s) <= this.def.length / 2 + pad && Math.abs(-dx * s + dy * c) <= this.def.width / 2 + pad;
  }

  private hitsWall(map: CityMap, x: number, y: number, h: number): boolean {
    const c = Math.cos(h), s = Math.sin(h), hl = this.def.length / 2, hw = this.def.width / 2;
    return (
      map.isSolid(x + c * hl - s * hw, y + s * hl + c * hw) || map.isSolid(x + c * hl + s * hw, y + s * hl - c * hw) ||
      map.isSolid(x - c * hl - s * hw, y - s * hl + c * hw) || map.isSolid(x - c * hl + s * hw, y - s * hl - c * hw) ||
      map.isSolid(x + c * hl, y + s * hl) || map.isSolid(x - c * hl, y - s * hl)
    );
  }

  update(dt: number, map: CityMap, inp: CarInput): void {
    this.age += dt;
    this.lastImpact = 0;
    const d = this.def;
    const fx = Math.cos(this.heading), fy = Math.sin(this.heading);
    let vf = this.vx * fx + this.vy * fy; // speed along the car
    let vl = -this.vx * fy + this.vy * fx; // sideways slide

    if (this.wreck || this.driver === 'none') {
      vf = approach(vf, 0, 220 * dt);
      vl -= vl * Math.min(1, 6 * dt);
      this.drifting = this.nitroOn = this.braking = false;
    } else {
      this.nitroOn = inp.nitro && this.nitro > 0 && inp.throttle > 0;
      const max = d.maxSpeed * (1 + GARAGE.engine.speedPerTier * this.up.engine) * (this.nitroOn ? NITRO.speedMult : 1);
      const boost = 1 + GARAGE.engine.accelPerTier * this.up.engine;
      if (inp.throttle > 0) {
        if (vf < max) vf += d.accel * boost * (this.nitroOn ? NITRO.accelMult : 1) * inp.throttle * dt;
      } else if (inp.throttle < 0) {
        if (vf > 8) vf -= d.brake * dt;
        else if (vf > -d.reverseSpeed) vf -= d.accel * 0.6 * dt;
      } else vf = approach(vf, 0, 60 * dt);
      if (inp.brake) vf = approach(vf, 0, d.brake * dt);
      this.braking = (inp.brake || inp.throttle < 0 || inp.handbrake) && vf > 12;
      vf -= vf * 0.3 * dt;
      if (vf > max) vf = approach(vf, max, 300 * dt);
      if (inp.handbrake) vf = approach(vf, 0, 90 * dt);

      vl -= vl * Math.min(1, (inp.handbrake ? d.driftGrip : d.grip) * dt);

      const sp = Math.abs(vf);
      const steerPower = Math.min(1, sp / 90) * (vf >= 0 ? 1 : -1) * (1 - 0.35 * Math.min(1, sp / d.maxSpeed));
      const turn = inp.steer * d.turnRate * steerPower * (inp.handbrake ? 1.35 : 1) * dt;
      if (turn && !this.hitsWall(map, this.x, this.y, this.heading + turn)) this.heading += turn;

      this.slip = Math.abs(vl);
      this.drifting = Math.abs(vl) > NITRO.driftMinSlip && sp > NITRO.driftMinSpeed;
      if (this.nitroOn) this.nitro = Math.max(0, this.nitro - (NITRO.drainPerSecond / (1 + GARAGE.nitro.capacity * this.up.nitro)) * dt);
      else if (this.drifting) this.nitro = Math.min(1, this.nitro + NITRO.fillPerSecond * dt);
    }

    this.vx = fx * vf - fy * vl;
    this.vy = fy * vf + fx * vl;

    // Move, one axis at a time, bouncing off buildings.
    if (this.hitsWall(map, this.x, this.y, this.heading)) {
      this.x = this.safe.x; this.y = this.safe.y; this.heading = this.safe.h;
    }
    const nx = this.x + this.vx * dt;
    if (this.hitsWall(map, nx, this.y, this.heading)) { this.lastImpact = Math.max(this.lastImpact, Math.abs(this.vx)); this.vx *= -0.25; }
    else this.x = nx;
    const ny = this.y + this.vy * dt;
    if (this.hitsWall(map, this.x, ny, this.heading)) { this.lastImpact = Math.max(this.lastImpact, Math.abs(this.vy)); this.vy *= -0.25; }
    else this.y = ny;
    if (!this.hitsWall(map, this.x, this.y, this.heading)) { this.safe.x = this.x; this.safe.y = this.y; this.safe.h = this.heading; }

    if (this.lastImpact > CAR_DAMAGE.crashMinSpeed) this.damage((this.lastImpact - CAR_DAMAGE.crashMinSpeed) * CAR_DAMAGE.crashScale, false);
    this.sync();
  }

  damage(amount: number, byPlayer: boolean): void {
    if (this.wreck) return;
    if (byPlayer) this.hurtByPlayer = true;
    this.hp -= amount;
    if (this.hp <= 0 && !this.burning) { this.burning = true; this.burnTimer = CAR_DAMAGE.burnTime; }
  }

  /** Smoke and fire. Returns true on the frame the car explodes. */
  updateDamageFx(dt: number, puff: (x: number, y: number, color: number, size: number, life: number, vx: number, vy: number, grow: number) => void): boolean {
    if (this.wreck) { this.wreckTimer -= dt; if (this.wreckTimer < 2) this.sprite.setAlpha(Math.max(0, this.wreckTimer / 2)); return false; }
    this.fxT -= dt;
    const hx = this.x + Math.cos(this.heading) * this.def.length * 0.3, hy = this.y + Math.sin(this.heading) * this.def.length * 0.3;
    if (this.burning) {
      this.burnTimer -= dt;
      if (this.fxT <= 0) {
        this.fxT = 0.05;
        if (Math.random() < 0.4) puff(hx, hy - 6, 0x222222, 9, 0.8, (Math.random() - 0.5) * 30, -50, 2);
        puff(hx, hy, Math.random() < 0.5 ? 0xff7a1a : 0xffc233, 11, 0.35, (Math.random() - 0.5) * 30, -20, 1.2);
      }
      if (this.burnTimer <= 0) {
        this.wreck = true; this.burning = false; this.wreckTimer = CAR_DAMAGE.wreckTime;
        this.driver = 'none';
        this.sprite.setTint(0x2a2a2a);
        this.beam.setVisible(false);
        this.lightbar?.setVisible(false);
        return true;
      }
    } else if (this.hp < this.maxHp * CAR_DAMAGE.smokeAt && this.fxT <= 0) {
      this.fxT = 0.12;
      puff(hx, hy, 0x9a9a9a, 9, 0.8, (Math.random() - 0.5) * 20, -30, 1.8);
    }
    return false;
  }

  /** New paint: pick a different colour. */
  respray(): void {
    const n = this.def.colors.length - 1;
    this.colorIndex = (this.colorIndex + 1 + Math.floor(Math.random() * Math.max(1, n - 1))) % Math.max(1, n);
    if (this.dirBase) { this.dirBase = `car_${this.def.id}_${this.colorIndex}`; this.battered = false; this.sprite.setFrame(`${this.dirBase}_d${this.dir}`); }
    else this.sprite.setTexture(`car_${this.def.id}_${this.colorIndex}`);
  }

  /** How bright headlights should be (0 = daytime). Set by the world's time of day. */
  static lights = 1;

  sync(): void {
    if (this.dirBase) {
      // pick the nearest of the 16 rendered directions, then turn the picture the last few degrees
      const step = Math.PI / 8, n = Math.round(this.heading / step), d = ((n % 16) + 16) % 16;
      // below half health the battered version of the car is shown
      const hurt = this.hp < this.maxHp * 0.5 && !!SHEET[this.dirBase + 'x_d0'];
      if (d !== this.dir || hurt !== this.battered) { this.dir = d; this.battered = hurt; this.sprite.setFrame(`${this.dirBase}${hurt ? 'x' : ''}_d${d}`); }
      this.sprite.setPosition(this.x, this.y).setRotation(this.heading - n * step);
    } else this.sprite.setPosition(this.x, this.y).setRotation(this.heading);
    this.sprite.setDepth(4 + this.y * 1e-5);
    const bx = this.x - Math.cos(this.heading) * this.def.length * 0.5, by = this.y - Math.sin(this.heading) * this.def.length * 0.5;
    this.glowBrake.setVisible(this.braking && !this.wreck).setPosition(bx, by - 3);
    this.shadow.setPosition(this.x + 3, this.y + 4).setRotation(this.heading);
    const lit = Car.lights > 0.2 && this.driver !== 'none' && !this.wreck;
    this.beam.setVisible(lit);
    if (lit) this.beam.setPosition(this.x + Math.cos(this.heading) * this.def.length * 0.45, this.y + Math.sin(this.heading) * this.def.length * 0.45).setRotation(this.heading).setAlpha(0.55 * Car.lights);
    if (this.lightbar) {
      this.lightbar.setPosition(this.x, this.y).setRotation(this.heading);
      const on = this.driver === 'cop' || this.roadblock;
      this.lightbar.setFillStyle(on ? (Math.floor(this.age * 5) % 2 ? 0xff2a2a : 0x2a6aff) : 0x7a2a2a);
    }
  }

  destroy(): void {
    this.removed = true;
    this.sprite.destroy();
    this.glowBrake.destroy();
    this.shadow.destroy();
    this.beam.destroy();
    this.lightbar?.destroy();
  }
}
