import * as Phaser from 'phaser';
import { LOOKS, Look } from '../data/characters';
import { VEHICLES, VehicleDef } from '../data/vehicles';
import ATLAS from '../data/atlas.json';
import { SHEET } from '../systems/sprites';

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
/** Lighten (amt > 0) or darken (amt < 0) a colour. */
export function shade(color: string, amt: number): string {
  const n = parseInt(color.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/**
 * First scene. All art is still placeholder, but it is now drawn pixel art rather than
 * plain boxes: people with shoulders and heads, cars with glass and lights, glows.
 * Everything is painted here in code, so there are no image files to download yet.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // the sprite sheets rendered in Blender (tools/blender/render_assets.py)
    for (let i = 0; i < ATLAS.pages; i++) this.load.image('atlas' + i, `assets/atlas${i}.png`);
  }

  /**
   * Registers every Blender-rendered sprite. Cars, people and street furniture are drawn
   * straight from the sheets; textures that get painted into tiles, rooftops and portraits
   * are also cut out as their own small pictures. If a sheet is missing, the game still
   * runs on the code-drawn placeholders.
   */
  private useAtlas(): void {
    for (let i = 0; i < ATLAS.pages; i++) if (this.textures.exists('atlas' + i)) this.textures.get('atlas' + i).setFilter(Phaser.Textures.FilterMode.LINEAR); // rendered art is scaled down smoothly (set once per sheet: it is slow)
    for (const [key, f] of Object.entries(ATLAS.frames)) {
      const name = 'atlas' + f.page;
      if (!this.textures.exists(name)) continue;
      const sheet = this.textures.get(name);
      const fr = sheet.add(key, 0, f.x, f.y, f.w, f.h);
      SHEET[key] = name;
      const oy = (f as { oy?: number }).oy;
      if (fr && oy) { fr.customPivot = true; fr.pivotX = 0.5; fr.pivotY = oy; } // tall pictures are anchored at their feet
      if (!/^(ground_|roof_|prop_|f_)/.test(key)) continue;
      if (this.textures.exists(key)) this.textures.remove(key);
      const tex = this.textures.createCanvas(key, f.w, f.h)!;
      tex.getContext().drawImage(sheet.getSourceImage() as HTMLImageElement, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
      tex.refresh();
      tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  }

  private paint(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): void {
    const tex = this.textures.createCanvas(key, w, h)!;
    draw(tex.getContext());
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST); // keep pixels crisp when scaled up
  }

  /** A person seen from above, facing right: shoulders, arms, head. */
  private person(look: Look) {
    return (g: CanvasRenderingContext2D) => {
      const skin = look.skin ?? '#e0b08a';
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(8, 9, 5, 7, 0, 0, Math.PI * 2); g.fill(); // soft shadow
      g.fillStyle = shade(look.jacket.startsWith('#') ? look.jacket : '#444444', -30);
      g.beginPath(); g.ellipse(7, 8, 4.5, 7.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = look.jacket; g.beginPath(); g.ellipse(7, 8, 3.6, 6.6, 0, 0, Math.PI * 2); g.fill(); // shoulders
      g.fillStyle = skin; g.fillRect(10, 2, 3, 2); g.fillRect(10, 12, 3, 2); // hands
      g.fillStyle = '#1a1a1a'; g.fillRect(11, 7, 5, 2); // what they hold / point with
      if (look.accent && look.accentAt === 'back') { g.fillStyle = look.accent; g.fillRect(3, 6, 2, 4); g.fillRect(4, 7, 2, 2); }
      if (look.accent && look.accentAt === 'chest') { g.fillStyle = look.accent; g.fillRect(9, 7, 1, 2); }
      g.fillStyle = skin; g.beginPath(); g.arc(8.5, 8, 3.4, 0, Math.PI * 2); g.fill(); // face edge
      g.fillStyle = look.hair; g.beginPath(); g.arc(7.8, 8, 3.2, 0, Math.PI * 2); g.fill(); // hair / hat
      if (look.accent && look.accentAt === 'head') { g.fillStyle = look.accent; g.fillRect(6, 5, 2, 6); }
    };
  }

  /** A head-and-shoulders portrait for cutscene text boxes. */
  private bust(look: Look) {
    return (g: CanvasRenderingContext2D) => {
      const skin = look.skin ?? '#e0b08a';
      g.fillStyle = look.jacket; g.beginPath(); g.ellipse(16, 34, 15, 12, 0, 0, 7); g.fill(); // shoulders
      g.fillStyle = shade(look.jacket, -35); g.fillRect(15, 24, 2, 8); // zip / lapel line
      if (look.accent && look.accentAt !== 'head') { g.fillStyle = look.accent; g.fillRect(20, 26, 4, 3); }
      g.fillStyle = shade(skin, -25); g.fillRect(13, 19, 6, 5); // neck
      g.fillStyle = skin; g.beginPath(); g.ellipse(16, 13, 7, 8, 0, 0, 7); g.fill(); // face
      g.fillStyle = look.hair; g.beginPath(); g.ellipse(16, 8, 8, 5, 0, 0, 7); g.fill(); g.fillRect(8, 8, 2, 6); g.fillRect(22, 8, 2, 6); // hair
      if (look.accent && look.accentAt === 'head') { g.fillStyle = look.accent; g.fillRect(8, 8, 16, 3); }
      g.fillStyle = '#1a1414'; g.fillRect(12, 13, 2, 2); g.fillRect(18, 13, 2, 2); g.fillRect(14, 18, 4, 1); // eyes, mouth
    };
  }

  /** A vehicle seen from above, front pointing right, in one body colour. */
  private vehicle(def: VehicleDef, body: string) {
    const L = def.length, W = def.width;
    return (g: CanvasRenderingContext2D) => {
      const rr = (x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
      if (def.shape === 'scooter' || def.shape === 'bike') {
        const bike = def.shape === 'bike';
        g.fillStyle = '#111'; rr(0, W / 2 - 2, 5, 4, 1); rr(L - 6, W / 2 - 2, 6, 4, 1); // wheels
        g.fillStyle = shade(body, -40); rr(3, 1, L - 7, W - 2, 3);
        g.fillStyle = body; rr(4, 2, L - 9, W - 4, 2);
        g.fillStyle = '#1c1c1c'; rr(bike ? 9 : 8, 3, 7, W - 6, 1); // seat
        if (bike) { g.fillStyle = '#f2f2f2'; rr(L - 10, 1, 4, W - 2, 1); g.fillStyle = '#e8d24a'; g.fillRect(4, W / 2 - 1, 5, 2); } // tall fairing, pipes
        else { g.fillStyle = '#f4f0e6'; rr(1, 1, 7, W - 2, 1); g.fillStyle = '#b3312f'; g.fillRect(3, 3, 3, W - 6); } // soup rack
        g.fillStyle = '#ffe9a0'; g.fillRect(L - 2, W / 2 - 1, 2, 2);
        return;
      }
      if (def.shape === 'truck') {
        g.fillStyle = '#0d0d0d'; for (const x of [8, L - 16]) { g.fillRect(x, 0, 8, 2); g.fillRect(x, W - 2, 8, 2); }
        g.fillStyle = shade(body, -60); rr(0, 1, L, W - 2, 3);
        g.fillStyle = body; rr(1, 2, L - 16, W - 4, 2); // cargo box
        g.fillStyle = shade(body, -18); for (let x = 8; x < L - 18; x += 8) g.fillRect(x, 3, 1, W - 6);
        g.fillStyle = shade(body, -35); rr(L - 14, 2, 13, W - 4, 3); // cab
        g.fillStyle = '#16212e'; rr(L - 8, 4, 5, W - 8, 1);
        g.fillStyle = '#fff3c0'; g.fillRect(L - 2, 3, 2, 4); g.fillRect(L - 2, W - 7, 2, 4);
        g.fillStyle = '#e03030'; g.fillRect(0, 3, 2, 4); g.fillRect(0, W - 7, 2, 4);
        return;
      }
      const sports = def.shape === 'sports', police = def.shape === 'police';
      g.fillStyle = '#0d0d0d'; // tyres peeking out
      for (const x of [6, L - 13]) { g.fillRect(x, 0, 7, 2); g.fillRect(x, W - 2, 7, 2); }
      g.fillStyle = shade(body, -55); rr(0, 1, L, W - 2, sports ? 6 : 4); // outline
      g.fillStyle = body; rr(1, 2, L - 2, W - 4, sports ? 5 : 3);
      g.fillStyle = shade(body, 22); g.fillRect(3, 3, L - 6, 2); // highlight down one side
      if (police) { g.fillStyle = '#16161a'; rr(1, 2, 9, W - 4, 3); rr(L - 13, 2, 12, W - 4, 3); }
      const c0 = Math.round(L * (sports ? 0.3 : 0.24)), c1 = Math.round(L * (sports ? 0.66 : 0.7)); // cabin
      g.fillStyle = '#16212e'; rr(c0, 3, c1 - c0, W - 6, 3); // glass all round
      g.fillStyle = 'rgba(150,190,220,0.35)'; g.fillRect(c1 - 5, 4, 2, W - 8); // windscreen glint
      g.fillStyle = police ? '#f2f2f2' : shade(body, 12); rr(c0 + 5, 4, c1 - c0 - 11, W - 8, 2); // roof panel
      if (sports) {
        g.fillStyle = shade(body, -70); g.fillRect(1, 3, 3, W - 6); // spoiler
        g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(c1, W / 2 - 2, L - c1 - 3, 1); g.fillRect(c1, W / 2 + 1, L - c1 - 3, 1); // stripes
      }
      if (police) { g.fillStyle = '#d02a2a'; g.fillRect(c0 + 9, 4, 3, W / 2 - 4); g.fillStyle = '#2a5ad0'; g.fillRect(c0 + 9, W / 2, 3, W / 2 - 4); }
      g.fillStyle = '#fff3c0'; g.fillRect(L - 3, 3, 2, 4); g.fillRect(L - 3, W - 7, 2, 4); // headlights
      g.fillStyle = '#e03030'; g.fillRect(1, 3, 2, 4); g.fillRect(1, W - 7, 2, 4); // tail lights
    };
  }

  create(): void {
    this.paint('dot', 16, 16, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(8, 8, 8, 0, Math.PI * 2); g.fill(); });
    for (const [id, look] of Object.entries(LOOKS)) { this.paint('p_' + id, 16, 16, this.person(look)); this.paint('f_' + id, 32, 32, this.bust(look)); }
    for (const def of Object.values(VEHICLES)) def.colors.forEach((c, i) => this.paint(`car_${def.id}_${i}`, def.length, def.width, this.vehicle(def, hex(c))));
    this.paint('carShadow', 48, 24, (g) => { g.fillStyle = 'rgba(0,0,0,0.38)'; g.beginPath(); g.roundRect(0, 0, 48, 24, 6); g.fill(); });
    this.paint('bullet', 10, 2, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 10, 2); });
    // soft round light, and a headlight beam
    this.paint('glow', 96, 96, (g) => {
      const r = g.createRadialGradient(48, 48, 0, 48, 48, 48);
      r.addColorStop(0, 'rgba(255,255,255,0.75)'); r.addColorStop(0.35, 'rgba(255,255,255,0.28)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.fillRect(0, 0, 96, 96);
    });
    this.paint('beam', 120, 80, (g) => {
      const r = g.createLinearGradient(0, 0, 120, 0);
      r.addColorStop(0, 'rgba(255,244,200,0.55)'); r.addColorStop(1, 'rgba(255,244,200,0)');
      g.fillStyle = r; g.beginPath(); g.moveTo(0, 34); g.lineTo(120, 0); g.lineTo(120, 80); g.lineTo(0, 46); g.fill();
    });
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
    this.useAtlas();
    this.scene.start('World');
  }
}
