import * as Phaser from 'phaser';
import { PLAYER } from '../data/player';
import { SHEET } from '../systems/sprites';
import type { WorldScene } from '../scenes/WorldScene';

/** A tiny rotation that means "the facing has been read": lets animate() notice when someone turns the sprite. */
const FACING_READ = 1e-7;

export type ActorKind = 'player' | 'ped' | 'cop' | 'thug';

/**
 * A person on foot: the player, a pedestrian or a police officer.
 * Movement and wall collisions are handled by Phaser's Arcade physics.
 */
export class Actor {
  readonly sprite: Phaser.Physics.Arcade.Image;
  hp: number;
  alive = true;
  /** Seconds left knocked down / stunned. */
  stun = 0;
  /** Seconds before a car can hurt this person again. */
  carHitCooldown = 0;
  // Free-form fields used by the AI systems.
  state = 'idle';
  timer = 0;
  tx = 0; ty = 0;
  data: Record<string, number | string | boolean> = {};
  private base: string;
  private frame = 0;
  private walk = 0;
  /** True when this look has pictures for 16 directions on the sprite sheet. */
  private dirs = false;
  private dir = 0;
  /** Which way the person faces, in radians. */
  facing = 0;
  private punchT = 0;

  /** Show the punching pose for a moment. */
  punch(): void { this.punchT = 0.2; }

  constructor(scene: WorldScene, readonly kind: ActorKind, x: number, y: number, look: string, hp: number) {
    this.base = 'p_' + look;
    const sheet = SHEET[this.base + '_0_d0'];
    this.dirs = !!sheet;
    this.sprite = sheet ? scene.physics.add.image(x, y, sheet, this.base + '_0_d0').setDepth(4) : scene.physics.add.image(x, y, this.base).setDepth(4);
    if (this.sprite.width > 20) { // Blender sprite, drawn at twice game size
      const k = PLAYER.spriteScale, r = PLAYER.radius / k; // the collision circle stays the same size on the ground
      this.sprite.setScale(k);
      const fr = this.sprite.frame, feet = fr.customPivot ? fr.pivotY : 0.5; // and sits at the feet
      this.sprite.setCircle(r, this.sprite.width / 2 - r, this.sprite.height * feet - r);
    } else this.sprite.setCircle(PLAYER.radius, 1, 1);
    this.sprite.setCollideWorldBounds(true);
    scene.people.add(this.sprite); // everyone in this group bumps into buildings
    this.hp = hp;
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
  get body(): Phaser.Physics.Arcade.Body { return this.sprite.body as Phaser.Physics.Arcade.Body; }

  setVelocity(vx: number, vy: number): void {
    this.body.setVelocity(vx, vy);
    if (vx || vy) this.sprite.rotation = Math.atan2(vy, vx);
  }

  /** Walk toward a point at a speed. Returns the distance left. */
  moveTo(x: number, y: number, speed: number): number {
    const dx = x - this.x, dy = y - this.y, d = Math.hypot(dx, dy);
    if (d < 2) { this.body.setVelocity(0, 0); return d; }
    this.setVelocity((dx / d) * speed, (dy / d) * speed);
    return d;
  }

  /**
   * Picks the picture to show: which of 16 directions the person faces, and which walking
   * frame (standing, left step, right step). The rest of the game still just sets
   * `sprite.rotation` to turn someone; this reads that and swaps the picture instead.
   */
  animate(dt: number): void {
    if (!this.alive) return;
    this.sprite.setDepth(4 + this.sprite.y * 1e-5); // whoever is lower on the screen is drawn in front
    if (this.dirs && this.sprite.rotation !== FACING_READ) { this.facing = this.sprite.rotation; this.sprite.rotation = FACING_READ; }
    const sp = this.body.enable ? this.body.speed : 0;
    let f = 0;
    if (sp > 15) { this.walk += sp * dt * 0.075; f = [1, 0, 2, 0][Math.floor(this.walk) % 4]; }
    this.punchT -= dt;
    if (this.punchT > 0) f = 3;
    const d = this.dirs ? (((Math.round(this.facing / (Math.PI / 8)) % 16) + 16) % 16) : 0;
    if (f === this.frame && d === this.dir) return;
    this.frame = f; this.dir = d;
    if (this.dirs) this.sprite.setFrame(`${this.base}_${f}_d${d}`);
    else { const key = f ? `${this.base}_${f}` : this.base; if (this.sprite.scene.textures.exists(key)) this.sprite.setTexture(key); }
  }

  kill(): void {
    this.alive = false;
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    if (this.dirs && this.sprite.texture.has(`${this.base}_4_d${this.dir}`)) this.sprite.setFrame(`${this.base}_4_d${this.dir}`).setTint(0xb0a0a0).setDepth(2); // lying on the ground
    else this.sprite.setTint(0x551a1a).setAlpha(0.7).setDepth(2);
  }

  destroy(): void {
    this.alive = false;
    this.sprite.destroy();
  }
}
