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

  constructor(scene: WorldScene, readonly kind: ActorKind, x: number, y: number, look: string, hp: number) {
    this.sprite = scene.physics.add.image(x, y, 'p_' + look).setDepth(4);
    this.sprite.setCircle(PLAYER.radius, 1, 1);
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
