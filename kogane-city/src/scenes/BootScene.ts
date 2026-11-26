import * as Phaser from 'phaser';

/**
 * First scene. There is no art yet, so it paints the few simple shapes the
 * prototype needs (a dot, a person, a car, a bullet, a lantern) and starts the world.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  private paint(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): void {
    const tex = this.textures.createCanvas(key, w, h)!;
    draw(tex.getContext());
    tex.refresh();
  }

  create(): void {
    this.paint('dot', 16, 16, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(8, 8, 8, 0, Math.PI * 2); g.fill(); });
    this.paint('person', 16, 16, (g) => {
      g.fillStyle = '#fff'; g.beginPath(); g.arc(8, 8, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(11, 6, 5, 4); // the way they are facing
    });
    const car = (police: boolean) => (g: CanvasRenderingContext2D) => {
      g.fillStyle = '#fff'; g.fillRect(1, 1, 46, 22);
      if (police) { g.fillStyle = '#222'; g.fillRect(1, 1, 9, 22); g.fillRect(37, 1, 10, 22); }
      g.fillStyle = 'rgba(10,14,24,0.85)'; g.fillRect(27, 3, 8, 18); g.fillRect(9, 4, 5, 16); // windscreen, rear window
      g.fillStyle = '#ffe9a0'; g.fillRect(45, 2, 2, 5); g.fillRect(45, 17, 2, 5); // headlights (front is +x)
      g.fillStyle = '#c33'; g.fillRect(1, 2, 2, 5); g.fillRect(1, 17, 2, 5);
    };
    this.paint('car', 48, 24, car(false));
    this.paint('carPolice', 48, 24, car(true));
    this.paint('bullet', 10, 2, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 10, 2); });
    this.paint('lantern', 14, 20, (g) => {
      g.fillStyle = '#fff';
      g.fillRect(4, 0, 6, 3); g.fillRect(4, 17, 6, 3);
      g.beginPath(); g.ellipse(7, 10, 7, 8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(3, 6, 8, 1); g.fillRect(2, 10, 10, 1); g.fillRect(3, 14, 8, 1);
    });
    this.paint('minimapFrame', 112, 112, (g) => {
      g.fillStyle = '#0b0b10'; g.fillRect(0, 0, 112, 112);
      g.globalCompositeOperation = 'destination-out';
      g.beginPath(); g.arc(56, 56, 52, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = '#e8b923'; g.lineWidth = 2; g.beginPath(); g.arc(56, 56, 52, 0, Math.PI * 2); g.stroke();
    });
    this.scene.start('World');
  }
}
