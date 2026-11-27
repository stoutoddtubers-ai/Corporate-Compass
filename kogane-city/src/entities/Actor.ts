import * as Phaser from 'phaser';
import { PLAYER } from '../data/player';
import type { WorldScene } from '../scenes/WorldScene';

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

  constructor(scene: WorldScene, readonly kind: ActorKind, x: number, y: number, look: string, hp: number) {
    this.base = 'p_' + look;
    this.sprite = scene.physics.add.image(x, y, this.base).setDepth(4);
    if (this.sprite.width > 20) { // Blender sprite, drawn at twice game size
      this.sprite.setScale(0.5);
      this.sprite.setCircle(PLAYER.radius * 2, this.sprite.width / 2 - PLAYER.radius * 2, this.sprite.height / 2 - PLAYER.radius * 2);
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

  /** Walking animation: swaps between the standing frame and two stepping frames as the person moves. */
  animate(dt: number): void {
    if (!this.alive || !this.body.enable) return;
    const sp = this.body.speed;
    let f = 0;
    if (sp > 15) { this.walk += sp * dt * 0.075; f = [1, 0, 2, 0][Math.floor(this.walk) % 4]; }
    if (f === this.frame) return;
    this.frame = f;
    const key = f ? `${this.base}_${f}` : this.base;
    if (this.sprite.scene.textures.exists(key)) this.sprite.setTexture(key);
  }

  kill(): void {
    this.alive = false;
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.sprite.setTint(0x551a1a).setAlpha(0.7).setDepth(2);
  }

  destroy(): void {
    this.alive = false;
    this.sprite.destroy();
  }
}
