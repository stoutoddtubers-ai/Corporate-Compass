import * as Phaser from 'phaser';

interface Part { img: Phaser.GameObjects.Image; vx: number; vy: number; life: number; max: number; grow: number; a: number }
interface Bark { txt: Phaser.GameObjects.Text; life: number; follow: { x: number; y: number } | null; dy: number }

/** Cheap visual effects: smoke, sparks, explosions, and floating "bark" text. */
export class Fx {
  private parts: Part[] = [];
  private barks: Bark[] = [];
  private lastBark = new Map<string, number>();
  private marks: { img: Phaser.GameObjects.Image; life: number; max: number; a: number }[] = [];
  private markI = 0;

  constructor(private scene: Phaser.Scene) {}

  puff(x: number, y: number, color: number, size: number, life: number, vx = 0, vy = 0, grow = 1, alpha = 0.8): void {
    let p = this.parts.find((q) => q.life <= 0);
    if (!p) {
      if (this.parts.length >= 220) return;
      p = { img: this.scene.add.image(0, 0, 'dot').setDepth(32), vx: 0, vy: 0, life: 0, max: 1, grow: 1, a: 1 };
      this.parts.push(p);
    }
    p.img.setPosition(x, y).setTint(color).setScale(size / 16).setAlpha(alpha).setVisible(true);
    p.vx = vx; p.vy = vy; p.life = p.max = life; p.grow = grow; p.a = alpha;
  }

  /** A stain on the ground that slowly fades: tyre marks, blood. */
  mark(x: number, y: number, key: string, rot: number, sx: number, sy: number, color: number, alpha: number, life: number): void {
    let m = this.marks[this.markI];
    if (!m) { m = { img: this.scene.add.image(0, 0, key).setDepth(1.3), life: 0, max: 1, a: 1 }; this.marks[this.markI] = m; }
    this.markI = (this.markI + 1) % 260; // oldest marks are reused
    m.img.setTexture(key).setPosition(x, y).setRotation(rot).setScale(sx, sy).setTint(color).setAlpha(alpha).setVisible(true);
    m.life = m.max = life; m.a = alpha;
  }

  spark(x: number, y: number, color = 0xffe08a): void {
    for (let i = 0; i < 3; i++) this.puff(x, y, color, 3, 0.15, (Math.random() - 0.5) * 160, (Math.random() - 0.5) * 160, 0);
  }

  explosion(x: number, y: number, radius: number): void {
    this.puff(x, y, 0xfff2c0, radius * 1.6, 0.18, 0, 0, 1.5, 0.9);
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 160;
      this.puff(x, y, i % 3 ? 0xff8a2a : 0x3a3a3a, 18 + Math.random() * 22, 0.5 + Math.random() * 0.6, Math.cos(a) * s, Math.sin(a) * s, 2);
    }
    this.scene.cameras.main.shake(220, 0.008);
  }

  /** Floating line above a character. `key` stops the same speaker spamming. */
  bark(follow: { x: number; y: number }, text: string, color = '#ffffff', key = '', minGap = 2.5): void {
    const now = this.scene.time.now / 1000;
    if (key) {
      if ((this.lastBark.get(key) ?? -99) + minGap > now) return;
      this.lastBark.set(key, now);
    }
    let b = this.barks.find((q) => q.life <= 0);
    if (!b) {
      if (this.barks.length >= 10) return;
      const txt = this.scene.add.text(0, 0, '', {
        fontFamily: 'monospace', fontSize: '11px', color: '#fff', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(40);
      b = { txt, life: 0, follow: null, dy: 0 };
      this.barks.push(b);
    }
    b.txt.setText(text.slice(0, 60)).setColor(color).setVisible(true).setAlpha(1);
    b.follow = follow; b.life = 1.8; b.dy = 0;
  }

  update(dt: number): void {
    for (const p of this.parts) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.img.setVisible(false); continue; }
      p.img.x += p.vx * dt; p.img.y += p.vy * dt;
      p.vx *= 1 - 2 * dt; p.vy *= 1 - 2 * dt;
      p.img.setScale(p.img.scaleX * (1 + p.grow * dt));
      p.img.setAlpha(p.a * (p.life / p.max));
    }
    for (const m of this.marks) {
      if (m.life <= 0) continue;
      m.life -= dt;
      if (m.life <= 0) m.img.setVisible(false); else if (m.life < m.max * 0.4) m.img.setAlpha(m.a * (m.life / (m.max * 0.4)));
    }
    for (const b of this.barks) {
      if (b.life <= 0) continue;
      b.life -= dt; b.dy += 10 * dt;
      if (b.life <= 0 || !b.follow) { b.txt.setVisible(false); b.life = 0; continue; }
      b.txt.setPosition(b.follow.x, b.follow.y - 14 - b.dy).setAlpha(Math.min(1, b.life * 2));
    }
  }

  get activeCount(): number {
    let n = 0;
    for (const p of this.parts) if (p.life > 0) n++;
    return n;
  }
}
