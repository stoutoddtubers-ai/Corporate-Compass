import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../data/config';
import { MAP } from '../data/map';
import { PLAYER, CAMERA } from '../data/player';
import { VEHICLES, VehicleDef, CAR_DAMAGE } from '../data/vehicles';
import { PEDS, PARKED, PICKUPS, TRAFFIC } from '../data/ai';
import { HEAT } from '../data/heat';
import { WEAPONS } from '../data/weapons';
import { BARKS, pick, t } from '../data/strings';
import { CityMap, Roof, Furniture } from '../systems/CityMap';
import { DAY } from '../data/missions';
import { Fx } from '../systems/Fx';
import { Projectiles } from '../systems/Projectiles';
import { HeatSystem } from '../systems/HeatSystem';
import { PedSystem } from '../systems/PedSystem';
import { TrafficSystem } from '../systems/TrafficSystem';
import { PoliceSystem } from '../systems/PoliceSystem';
import { GangSystem } from '../systems/GangSystem';
import { Story } from '../systems/Story';
import { TurfSystem } from '../systems/TurfSystem';
import { SideJobs } from '../systems/SideJobs';
import { Shop } from '../systems/Shop';
import { SaveGame } from '../systems/SaveGame';
import { createSideJobs } from '../systems/sideJobsImpl';
import { GARAGE } from '../data/garage';
import { Actor } from '../entities/Actor';
import { Car } from '../entities/Car';
import { Player } from '../entities/Player';

type Keys = Record<'W' | 'A' | 'S' | 'D' | 'E' | 'R' | 'SPACE' | 'SHIFT' | 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE' | 'UP' | 'DOWN' | 'ENTER' | 'V' | 'F3' | 'F4' | 'F6', Phaser.Input.Keyboard.Key>;
interface Pickup { x: number; y: number; kind: 'cash' | 'weapon'; value: number; weapon: string; obj: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text | null; respawn: number; hidden: number }

/** The city block: owns every system and runs them in order each frame. */
export class WorldScene extends Phaser.Scene {
  map!: CityMap;
  fx!: Fx;
  walls!: Phaser.Physics.Arcade.StaticGroup;
  people!: Phaser.GameObjects.Group;
  cars: Car[] = [];
  player!: Player;
  peds!: PedSystem;
  traffic!: TrafficSystem;
  police!: PoliceSystem;
  gang!: GangSystem;
  story!: Story;
  turf!: TurfSystem;
  side!: SideJobs;
  shop!: Shop;
  private atHome = false;
  /** True while the player's car is parked in Goro's spray booth with the menu up. */
  garageOpen = false;
  /** Writes the whole game to the browser's storage (set up by the save system). */
  saveGame?: () => void;
  ambience: { color: number; alpha: number; lights: number; rain: boolean } = { color: 0, alpha: 0, lights: 0, rain: false };
  private roofs: Roof[] = [];
  private wallG!: Phaser.GameObjects.Graphics;
  private halo!: Phaser.GameObjects.Image;
  /** Free roam: the clock runs and the light changes. Missions switch this off. */
  dayCycle = false;
  /** Time of day, 0..1. */
  clock: number = DAY.startAt;
  private rainT: number = DAY.rainEvery;
  private raining = 0;
  /** Strips of ground hidden behind buildings this frame [x0, y0, x1, y1]. */
  private occl: number[][] = [];
  private posts = new Map<number, Furniture[]>();
  private debris: { roof: Roof; vx: number; vy: number; spin: number; life: number }[] = [];
  private shade!: Phaser.GameObjects.Rectangle;
  private glows: Phaser.GameObjects.Image[] = [];
  private slowT = 0;
  private lotCars = new Map<number, Car[]>();
  /** Which district the player is in (HUD shows a title card when it changes). */
  districtId = '';
  heat!: HeatSystem;
  projectiles!: Projectiles;
  pickups: Pickup[] = [];
  keys!: Keys;
  /** 'play', or showing the death / arrest screen. */
  mode: 'play' | 'dead' | 'arrested' | 'cut' = 'play';
  modeT = 0;
  bill = 0;
  debugOn = false; // F3 shows the debug overlay
  private cam = { x: 0, y: 0, zoom: 1 };
  private prompt!: Phaser.GameObjects.Text;
  private bars!: Phaser.GameObjects.Graphics;

  constructor() {
    super('World');
  }

  create(): void {
    this.cars = []; this.pickups = []; this.mode = 'play';
    this.map = new CityMap();
    this.map.makeGround(this);
    // rooftops (they slide with the camera to look tall), and the signs painted on them
    this.roofs = this.map.makeRoofs(this);
    this.wallG = this.add.graphics().setDepth(19);
    // street furniture that can be hit, sorted into a grid so cars only check what is near them
    for (const f of this.map.furniture) {
      if (!f.solid) continue;
      const key = (Math.floor(f.x / 128) << 10) | Math.floor(f.y / 128);
      if (!this.posts.has(key)) this.posts.set(key, []);
      this.posts.get(key)!.push(f);
    }
    // a faint gold glow under Jun so he is easy to find, even at night or behind a building
    this.halo = this.add.image(0, 0, 'glow').setTint(0xe8b923).setScale(0.42).setAlpha(0.4).setDepth(31).setBlendMode(Phaser.BlendModes.ADD);
    for (const pl of Object.values(this.map.places)) {
      if (!pl.label) continue;
      const txt = this.add.text(pl.sx, pl.sy, pl.label, { fontFamily: 'sans-serif', fontSize: '11px', color: '#fff8e8', align: 'center', stroke: '#1a1410', strokeThickness: 3 }).setOrigin(0.5).setDepth(21).setScale(1, 1 / MAP.squash);
      const on = this.roofs.find((r) => r.rect === pl.rect); // a sign sits on its building's roof
      this.roofs.push({ img: txt, x: pl.sx, y: pl.sy, h: on ? on.h : 0 });
    }
    // night shade over everything, with pools of light on top. Only the lights near the
    // camera are drawn: a small pool of glow sprites is moved to wherever they are needed.
    this.shade = this.add.rectangle(0, 0, this.map.widthPx, this.map.heightPx, 0x000000, 0).setOrigin(0).setDepth(30);
    this.glows = [];
    for (let i = 0; i < 90; i++) this.glows.push(this.add.image(0, 0, 'glow').setDepth(31).setBlendMode(Phaser.BlendModes.ADD).setVisible(false));
    this.physics.world.setBounds(0, 0, this.map.widthPx, this.map.heightPx);

    // Invisible solid boxes for every building, so people can't walk through them.
    this.walls = this.physics.add.staticGroup();
    const W = this.map.widthPx, H = this.map.heightPx, edge = 2 * TILE_SIZE;
    const solids = [...this.map.buildings, ...this.map.water, { x: 0, y: 0, w: W, h: edge }, { x: 0, y: H - edge, w: W, h: edge }, { x: 0, y: 0, w: edge, h: H }, { x: W - edge, y: 0, w: edge, h: H }];
    for (const r of solids) {
      const z = this.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h);
      this.physics.add.existing(z, true);
      this.walls.add(z);
    }
    this.people = this.add.group();
    this.physics.add.collider(this.people, this.walls);

    this.fx = new Fx(this);
    this.projectiles = new Projectiles(this);
    this.heat = new HeatSystem(this);
    this.player = new Player(this, this.map.places.prison.x, this.map.places.prison.y);
    this.peds = new PedSystem(this);
    this.police = new PoliceSystem(this);
    this.gang = new GangSystem(this);
    this.story = new Story(this);
    this.turf = new TurfSystem(this);
    this.side = createSideJobs(this);
    this.shop = new Shop(this);
    SaveGame.load(this);
    this.saveGame = () => SaveGame.save(this);

    this.traffic = new TrafficSystem(this);

    // weapon pickups in the three car parks nearest the start
    const guns = ['kitsune9', 'suzume', 'sawnoff'];
    const start = this.player.actor;
    const near = [...this.map.lots].sort((a, b) => Math.hypot(a.x - start.x, a.y - start.y) - Math.hypot(b.x - start.x, b.y - start.y));
    guns.forEach((id, i) => { const l = near[i + 1] ?? near[0]; this.addPickup(l.x + l.w - 24, l.y + 22, 'weapon', 0, id, PICKUPS.weaponRespawn); });

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,E,R,V,SPACE,SHIFT,ONE,TWO,THREE,FOUR,FIVE,UP,DOWN,ENTER,F3,F4,F6') as Keys;
    this.input.mouse?.disableContextMenu();
    this.input.setDefaultCursor('crosshair');
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      const n = this.player.weapons.length;
      if (!this.player.car) this.player.switchTo((this.player.current + (dy > 0 ? 1 : n - 1)) % n);
    });

    this.prompt = this.add.text(0, 0, t('PROMPT_STEAL'), { fontFamily: 'monospace', fontSize: '11px', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(41).setVisible(false).setScale(1, 1 / MAP.squash);
    this.bars = this.add.graphics().setDepth(41);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H);
    this.cam = { x: this.player.actor.x, y: this.player.actor.y, zoom: 1 };
    cam.centerOn(this.cam.x, this.cam.y);

    this.story.begin();
    this.cam.x = this.player.actor.x; this.cam.y = this.player.actor.y;
    cam.centerOn(this.cam.x, this.cam.y);
    this.scene.launch('Hud');
    (window as unknown as { __kc: WorldScene }).__kc = this; // handy for testing from the browser console
  }

  // ---------- helpers used by the systems ----------

  onScreen(x: number, y: number, margin: number): boolean {
    const v = this.cameras.main.worldView;
    return x > v.x - margin && x < v.right + margin && y > v.y - margin && y < v.bottom + margin;
  }

  /** Everyone the player can hurt: bystanders, police and gang members. */
  npcs(): Actor[] {
    return [...this.peds.list, ...this.police.cops, ...this.gang.thugs];
  }

  /** Time of day: how dark it is, how bright the lamps are, whether it rains. */
  setAmbience(a: { color: number; alpha: number; lights: number; rain: boolean }): void {
    this.ambience = a;
    this.shade.setFillStyle(a.color, a.alpha);
    Car.lights = a.lights;
    this.slowT = 0;
  }

  addCar(def: VehicleDef, x: number, y: number, heading: number, police = false, colorIndex = -1): Car {
    const c = new Car(this, def, x, y, heading, police, colorIndex);
    this.cars.push(c);
    return c;
  }

  nearestCar(x: number, y: number, range: number): Car | null {
    let best: Car | null = null, bd = range;
    for (const c of this.cars) {
      if (c.wreck || c.removed) continue;
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  /** A free spot beside a car (side 1 = driver's side, the right; -1 = left). */
  sidePoint(c: Car, side: number): { x: number; y: number } {
    const rx = -Math.sin(c.heading), ry = Math.cos(c.heading), off = c.def.width / 2 + 12;
    for (const s of [side, -side]) {
      const p = { x: c.x + rx * off * s, y: c.y + ry * off * s };
      if (!this.map.isSolid(p.x, p.y) && !this.map.isSolid(p.x + rx * 6 * s, p.y + ry * 6 * s)) return p;
    }
    return { x: c.x - Math.cos(c.heading) * (c.def.length / 2 + 12), y: c.y - Math.sin(c.heading) * (c.def.length / 2 + 12) };
  }

  /** Did any bystander or officer see something happen at this spot? */
  witnessed(x: number, y: number): boolean {
    const see = (a: Actor) => a.alive && Math.hypot(a.x - x, a.y - y) < HEAT.witnessRadius && this.map.los(a.x, a.y, x, y);
    return this.peds.list.some(see) || this.police.cops.some(see);
  }

  onGunshot(x: number, y: number, noise: number): void {
    this.peds.scare(x, y, noise);
    this.traffic.scare(x, y, noise);
    if (this.witnessed(x, y)) this.heat.witnessedShot();
  }

  /** Damage a person. Handles crimes, deaths and what they drop. */
  hurtActor(a: Actor, dmg: number, byPlayer: boolean, how: 'bullet' | 'melee' | 'car' | 'blast'): void {
    if (!a.alive) return;
    if (a.kind === 'player') { this.player.takeDamage(dmg, how === 'bullet'); return; }
    a.hp -= dmg;
    if (a.kind === 'thug') { // gang members: no crime, and they fight back
      if (a.state === 'wait' || a.state === 'guard' || a.state === 'smash' || a.state === 'idle') a.state = 'chase';
      for (const o of this.gang.thugs) if (o.state === 'idle' && o.data.turf === a.data.turf && Math.hypot(o.x - a.x, o.y - a.y) < 320) o.state = 'chase'; // their friends join in
      if (a.hp <= 0) { a.kill(); a.timer = 8; if (byPlayer) this.turf.onThugKilled(a); this.addPickup(a.x, a.y, 'cash', Phaser.Math.Between(PEDS.cashDrop[0], PEDS.cashDrop[1]), '', 0); }
      return;
    }
    if (byPlayer) this.heat.crime(a.kind === 'cop' ? 'hitOfficer' : how === 'melee' ? 'punch' : 'assault');
    if (a.kind === 'ped') { a.state = 'flee'; a.timer = PEDS.fleeTime; a.tx = this.player.pos.x; a.ty = this.player.pos.y; }
    if (a.hp > 0) return;
    a.kill();
    a.timer = 8; // how long the body stays
    this.fx.mark(a.x, a.y, 'dot', Math.random() * 6, 1.3, 0.9, 0x5a0d0d, 0.6, 30); // a stain where they fell
    if (byPlayer) { this.heat.crime('kill'); if (a.kind === 'cop') this.heat.officerDown(); }
    if (a.kind === 'ped') this.addPickup(a.x, a.y, 'cash', Phaser.Math.Between(PEDS.cashDrop[0], PEDS.cashDrop[1]), '', 0);
    else if (Math.random() < HEAT.cop.dropChance) this.addPickup(a.x, a.y, 'weapon', 0, HEAT.cop.weapon, 0);
  }

  addPickup(x: number, y: number, kind: 'cash' | 'weapon', value: number, weapon: string, respawn: number): void {
    const obj = this.add.rectangle(x, y, kind === 'cash' ? 7 : 12, 7, kind === 'cash' ? 0xe8b923 : 0xf2f2f2).setDepth(1.5).setStrokeStyle(1, 0x000000);
    const label = kind === 'weapon' ? this.add.text(x, y - 6, WEAPONS[weapon].name, { fontFamily: 'monospace', fontSize: '9px', color: '#fff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5, 1).setDepth(1.5).setScale(1, 1 / MAP.squash) : null;
    this.pickups.push({ x, y, kind, value, weapon, obj, label, respawn, hidden: 0 });
  }

  private updatePickups(dt: number): void {
    const p = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const k = this.pickups[i];
      if (k.hidden > 0) {
        k.hidden -= dt;
        if (k.hidden <= 0) { k.obj.setVisible(true); k.label?.setVisible(true); }
        continue;
      }
      if (p.car || Math.hypot(p.actor.x - k.x, p.actor.y - k.y) > 16) continue;
      if (k.kind === 'cash') p.cash += k.value; else p.giveWeapon(k.weapon);
      if (k.respawn > 0) { k.hidden = k.respawn; k.obj.setVisible(false); k.label?.setVisible(false); }
      else { k.obj.destroy(); k.label?.destroy(); this.pickups.splice(i, 1); }
    }
  }

  private explode(c: Car): void {
    const R = CAR_DAMAGE.explosionRadius;
    this.fx.explosion(c.x, c.y, R);
    this.peds.scare(c.x, c.y, 500);
    if (this.player.car === c) this.player.takeDamage(999, false);
    const blast = (a: Actor) => {
      const d = Math.hypot(a.x - c.x, a.y - c.y);
      if (a.alive && d < R) this.hurtActor(a, CAR_DAMAGE.explosionDamage * (1 - d / R), c.hurtByPlayer, 'blast');
    };
    this.npcs().forEach(blast);
    if (!this.player.car) blast(this.player.actor);
    for (const o of this.cars) {
      if (o === c || o.removed) continue;
      const d = Math.hypot(o.x - c.x, o.y - c.y);
      if (d >= R) continue;
      o.damage(CAR_DAMAGE.explosionDamage * (1 - d / R), c.hurtByPlayer);
      o.vx += ((o.x - c.x) / (d || 1)) * 160; o.vy += ((o.y - c.y) / (d || 1)) * 160;
    }
  }

  private collideCars(): void {
    const cars = this.cars;
    for (let i = 0; i < cars.length; i++) {
      const a = cars[i];
      for (let j = i + 1; j < cars.length; j++) {
        const b = cars[j];
        if (Math.abs(a.x - b.x) > 60 || Math.abs(a.y - b.y) > 60) continue;
        for (let m = 0; m < 4; m++) {
          const ca = a.circle((m & 1) as 0 | 1), cb = b.circle(((m >> 1) & 1) as 0 | 1);
          const dx = cb.x - ca.x, dy = cb.y - ca.y, d = Math.hypot(dx, dy) || 0.01, over = ca.r + cb.r - d;
          if (over <= 0) continue;
          const nx = dx / d, ny = dy / d;
          const ma = a.def.mass * (a.wreck ? 2 : 1 + GARAGE.armour.mass * a.up.armour), mb = b.def.mass * (b.wreck ? 2 : 1 + GARAGE.armour.mass * b.up.armour), tot = ma + mb;
          a.x -= nx * over * (mb / tot); a.y -= ny * over * (mb / tot);
          b.x += nx * over * (ma / tot); b.y += ny * over * (ma / tot);
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) {
            const jimp = (-1.25 * rv) / (1 / ma + 1 / mb);
            a.bump = Math.max(a.bump, -rv); b.bump = Math.max(b.bump, -rv);
            a.vx -= (jimp / ma) * nx; a.vy -= (jimp / ma) * ny;
            b.vx += (jimp / mb) * nx; b.vy += (jimp / mb) * ny;
            if (-rv > CAR_DAMAGE.crashMinSpeed) {
              const dmg = (-rv - CAR_DAMAGE.crashMinSpeed) * CAR_DAMAGE.crashScale;
              const pl = a.driver === 'player' || b.driver === 'player';
              a.damage(dmg, pl && a.driver !== 'player'); b.damage(dmg, pl && b.driver !== 'player');
              if (pl && (a.driver === 'cop' || b.driver === 'cop')) this.heat.crime('hitOfficer');
              this.fx.spark((ca.x + cb.x) / 2, (ca.y + cb.y) / 2);
            }
          }
        }
      }
    }
  }

  /** Cars hit street furniture: trees, lamps and vending machines stop them; bins, benches, cones and crates go flying. */
  private collideFurniture(dt: number): void {
    for (const c of this.cars) {
      if (c.removed || c.speed < 25) continue;
      const cx = Math.floor(c.x / 128), cy = Math.floor(c.y / 128);
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const list = this.posts.get(((cx + i) << 10) | (cy + j));
        if (!list) continue;
        for (const f of list) {
          if (f.gone) continue;
          for (let m = 0; m < 2; m++) {
            const k = c.circle(m as 0 | 1), dx = k.x - f.x, dy = k.y - f.y, d = Math.hypot(dx, dy) || 0.01, over = k.r + 5 - d;
            if (over <= 0) continue;
            if (f.solid === 'loose') {
              f.gone = true;
              if (f.roof) this.debris.push({ roof: f.roof, vx: c.vx * 0.9 + (Math.random() - 0.5) * 120, vy: c.vy * 0.9 + (Math.random() - 0.5) * 120, spin: (Math.random() - 0.5) * 14, life: 1.1 });
              c.vx *= 0.95; c.vy *= 0.95;
              break;
            }
            const nx = dx / d, ny = dy / d, vn = c.vx * nx + c.vy * ny;
            c.x += nx * over; c.y += ny * over;
            if (vn < 0) {
              c.vx -= 1.3 * vn * nx; c.vy -= 1.3 * vn * ny;
              if (-vn > CAR_DAMAGE.crashMinSpeed) c.damage((-vn - CAR_DAMAGE.crashMinSpeed) * CAR_DAMAGE.crashScale, false);
              if (-vn > 60) this.fx.spark(f.x, f.y);
            }
          }
        }
      }
    }
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      d.roof.x += d.vx * dt; d.roof.y += d.vy * dt; d.vx *= 1 - 2.5 * dt; d.vy *= 1 - 2.5 * dt;
      d.roof.img.rotation += d.spin * dt;
      d.roof.img.setAlpha(Math.max(0, Math.min(1, d.life * 2)));
      if (d.life <= 0) { d.roof.dead = true; this.debris.splice(i, 1); }
    }
  }

  /** The nearest vending machine within reach, if any. */
  vendingNear(x: number, y: number): Furniture | null {
    const cx = Math.floor(x / 128), cy = Math.floor(y / 128);
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++)
      for (const f of this.posts.get(((cx + i) << 10) | (cy + j)) ?? []) if (f.key.startsWith('prop_vending') && Math.hypot(f.x - x, f.y - y) < 34) return f;
    return null;
  }

  /** Vending-machine drink: +25 HP for ¥150 (bible). */
  buyDrink(): void {
    const p = this.player, v = this.vendingNear(p.actor.x, p.actor.y);
    if (!v || p.hp >= PLAYER.maxHp || p.cash < PLAYER.drink.price) return;
    p.cash -= PLAYER.drink.price;
    p.hp = Math.min(PLAYER.maxHp, p.hp + PLAYER.drink.hp);
    this.fx.bark(p.actor.sprite, `+${PLAYER.drink.hp} HP`, '#7fe08a');
  }

  private collideCarPeople(): void {
    const everyone: Actor[] = this.npcs();
    if (!this.player.car) everyone.push(this.player.actor);
    for (const c of this.cars) {
      if (c.removed) continue;
      const sp = c.speed;
      for (const a of everyone) {
        if (!a.alive || Math.abs(a.x - c.x) > 40 || Math.abs(a.y - c.y) > 40) continue;
        if (a.kind === 'player' && this.player.invulnerable) continue;
        for (let m = 0; m < 2; m++) {
          const k = c.circle(m as 0 | 1);
          const dx = a.x - k.x, dy = a.y - k.y, d = Math.hypot(dx, dy) || 0.01, over = k.r + PLAYER.radius - d;
          if (over <= 0) continue;
          const nx = dx / d, ny = dy / d;
          if (!this.map.isSolid(a.x + nx * (over + 6), a.y + ny * (over + 6))) { a.sprite.x += nx * over; a.sprite.y += ny * over; }
          const toward = c.vx * nx + c.vy * ny;
          if (sp > CAR_DAMAGE.runOverMinSpeed && toward > 30 && a.carHitCooldown <= 0) {
            a.carHitCooldown = 0.5;
            this.hurtActor(a, (sp - 50) * CAR_DAMAGE.runOverScale * c.def.mass, c.driver === 'player', 'car');
            c.vx *= 0.92; c.vy *= 0.92;
            if (a.kind === 'player') this.fx.bark(a.sprite, pick(BARKS.junHitByCar), '#e8b923', 'jun', 3);
            else if (a.alive) a.stun = 1;
          }
        }
      }
    }
  }

  // ---------- death and arrest ----------

  playerDied(): void {
    if (this.mode !== 'play') return;
    this.bill = Math.round(this.player.cash * PLAYER.deathCashLoss);
    this.endRun('dead');
  }

  arrest(): void {
    if (this.mode !== 'play') return;
    this.bill = Math.round(this.player.cash * PLAYER.arrestCashLoss);
    this.endRun('arrested');
  }

  private endRun(mode: 'dead' | 'arrested'): void {
    this.mode = mode; this.modeT = PLAYER.screenTime;
    const p = this.player;
    if (p.car) { p.car.input.throttle = 0; p.car.input.steer = 0; }
    p.actor.body.setVelocity(0, 0);
    p.entering = null;
  }

  private respawn(): void {
    const p = this.player, dead = this.mode === 'dead';
    p.cash -= this.bill;
    if (p.car) p.exitCar();
    const spot = dead ? this.map.places.hospital : this.map.places.policeBox;
    p.actor.body.reset(spot.x, spot.y);
    p.heal();
    this.mode = 'play';
    p.rollT = -1; p.actor.sprite.setAlpha(1).setScale(p.baseScale);
    if (dead) p.armour = 0; // death costs your armour, weapons kept (bible)
    else p.resetWeapons(['fists']); // arrest costs every weapon except melee (bible)
    this.heat.clear(false);
    this.police.standDown(true);
    this.turf.abort();
    this.side.abort();
    this.story.onRespawn(); // a failed mission restarts from its beginning
    this.cam.x = p.actor.x; this.cam.y = p.actor.y;
  }

  // ---------- main loop ----------

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    if (Phaser.Input.Keyboard.JustDown(this.keys.F3)) this.debugOn = !this.debugOn;

    if (Phaser.Input.Keyboard.JustDown(this.keys.F4)) this.story.jumpTo(this.story.index + 1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.F6)) this.story.jumpTo(0);
    this.story.update(dt);
    if (this.mode === 'cut') { this.player.actor.body.setVelocity(0, 0); this.updateCamera(dt); this.updateWorldUi(); return; } // the world waits during cutscenes

    if (this.mode === 'play') this.player.update(dt);
    else {
      this.modeT -= dt;
      this.player.actor.body.setVelocity(0, 0);
      if (this.modeT <= 0) this.respawn();
    }

    this.traffic.update(dt);
    this.police.update(dt);
    this.gang.update(dt);
    this.turf.update(dt);
    if (!this.story.active && this.mode === 'play') this.side.update(dt); else if (this.side.active) this.side.abort();
    this.updateGarage();
    this.shop.update();
    // the safehouse (the room above Sakamaki Ramen, once mission 1 is done): heals you and saves the game
    const home = this.map.places.ramen, hp = this.player;
    const inside = this.story.index >= 1 && !this.story.active && !hp.car && this.mode === 'play' && Math.hypot(hp.actor.x - home.x, hp.actor.y - home.y) < 44;
    if (inside && !this.atHome) { hp.heal(); this.saveGame?.(); this.story.phone.push({ from: 'MIKA', text: t('UI_SAVED', { safehouse: 'Sakamaki Ramen' }), t: 3 }); }
    this.atHome = inside;
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const c = this.cars[i];
      if (c.removed) { this.cars.splice(i, 1); continue; }
      c.update(dt, this.map, c.input);
      if (c.updateDamageFx(dt, (x, y, col, size, life, vx, vy, grow) => this.fx.puff(x, y, col, size, life, vx, vy, grow))) this.explode(c);
      if (c.wreck && c.wreckTimer <= 0) { c.destroy(); this.cars.splice(i, 1); }
    }
    this.player.actor.animate(dt);
    for (const a of this.npcs()) a.animate(dt);
    for (const a of this.story.actors) a.animate(dt);
    // small signs of life: tyre marks when sliding, exhaust when pulling away
    for (const c of this.cars) {
      if (c.removed || c.wreck || c.driver === 'none') continue;
      const fx = Math.cos(c.heading), fy = Math.sin(c.heading), rx = c.x - fx * c.def.length * 0.3, ry = c.y - fy * c.def.length * 0.3;
      if ((c.drifting || (c.input.handbrake && c.slip > 45)) && this.onScreen(c.x, c.y, 40)) {
        for (const sd of [-1, 1]) this.fx.mark(rx - fy * sd * c.def.width * 0.4, ry + fx * sd * c.def.width * 0.4, 'bullet', Math.atan2(c.vy, c.vx), 0.9, 1.5, 0x0a0a0a, 0.5, 9);
      }
      if (c.input.throttle > 0 && c.speed < 150 && Math.random() < 0.2 && this.onScreen(c.x, c.y, 40)) this.fx.puff(c.x - fx * c.def.length * 0.5, c.y - fy * c.def.length * 0.5, 0x9a9a9a, 5, 0.5, -fx * 30, -fy * 30, 1.6, 0.35);
    }
    this.collideCars();
    this.collideFurniture(dt);
    this.collideCarPeople();
    for (const c of this.cars) c.sync();
    this.peds.update(dt);
    this.projectiles.update(dt);
    this.heat.update(dt);
    this.updatePickups(dt);
    this.fx.update(dt);
    this.updateCamera(dt);
    this.slowT -= dt;
    if (this.slowT <= 0) { this.slowT = 0.3; this.slowUpdate(); }
    this.updateWorldUi();
  }

  /** On foot: lead toward the aim. In a car: look ahead and zoom out with speed. */
  private updateCamera(dt: number): void {
    const cam = this.cameras.main, p = this.player;
    let fx: number, fy: number, zoom: number = CAMERA.footZoom;
    if (p.car) {
      const c = p.car;
      zoom = Phaser.Math.Linear(CAMERA.footZoom, CAMERA.carZoomAtTopSpeed, Math.min(1, c.speed / c.def.maxSpeed));
      fx = c.x + c.vx * CAMERA.carLead; fy = c.y + c.vy * CAMERA.carLead;
    } else {
      const ptr = this.input.activePointer;
      fx = p.actor.x + ((ptr.x - GAME_WIDTH / 2) / (GAME_WIDTH / 2)) * CAMERA.aimLead * GAME_WIDTH;
      fy = p.actor.y + (((ptr.y - GAME_HEIGHT / 2) / (GAME_HEIGHT / 2)) * CAMERA.aimLead * GAME_HEIGHT) / MAP.squash;
    }
    const k = Math.min(1, CAMERA.followLerp * dt);
    this.cam.x += (fx - this.cam.x) * k; this.cam.y += (fy - this.cam.y) * k;
    this.cam.zoom += (zoom - this.cam.zoom) * Math.min(1, CAMERA.zoomLerp * dt);
    cam.setZoom(this.cam.zoom, this.cam.zoom * MAP.squash); // the three-quarter view: the world is drawn shorter top-to-bottom
    cam.centerOn(this.cam.x, this.cam.y);
    // slide the rooftops away from the middle of the screen so buildings look tall
    // 2.5D buildings: each roof slides and grows away from the middle of the screen, and
    // walls are drawn from the footprint up to it, so buildings look tall (the GTA 2 trick).
    const mid = cam.midPoint, vw = cam.worldView, g = this.wallG, pp = this.player.pos;
    const lit = this.ambience.lights > 0.4;
    g.clear();
    this.occl.length = 0;
    for (const r of this.roofs) {
      if (r.dead) { r.img.setVisible(false); continue; }
      const on = Math.abs(r.x - mid.x) < vw.width / 2 + 360 && Math.abs(r.y - mid.y) < vw.height / 2 + 360;
      r.img.setVisible(on);
      if (!on) continue;
      if (r.paint && !r.made) { r.paint(); (r.img as Phaser.GameObjects.Image).setTexture(r.key!); r.made = true; } // paint this roof the first time it is seen
      // oblique view: height leans up the screen, plus a little slide away from the screen centre
      const k = r.h, ps = k * MAP.perspective, lean = k * MAP.heightScale * MAP.tilt;
      r.img.setPosition(r.x + (r.x - mid.x) * ps, r.y + (r.y - mid.y) * ps - lean);
      if (r.sway) r.img.rotation = Math.sin(this.time.now / 900 + r.x) * 0.035; // trees move in the wind
      const b = r.rect;
      if (!b) continue;
      (r.img as Phaser.GameObjects.Image).setScale(1 + ps);
      const x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h;
      const X0 = x0 + (x0 - mid.x) * ps, Y0 = y0 + (y0 - mid.y) * ps - lean, X1 = x1 + (x1 - mid.x) * ps, Y1 = y1 + (y1 - mid.y) * ps - lean; // roof corners
      if (r.smoke && Math.random() < 0.1) this.fx.puff(X0 + (X1 - X0) * 0.3, Y0 + (Y1 - Y0) * 0.3, 0x8a8a8a, 10, 2.2, -8 + Math.random() * 6, -26, 1.1, 0.45); // factory chimneys
      if (r.beacon && Math.floor(this.time.now / 700 + r.x) % 2) this.fx.puff(X1 - 8, Y0 + 8, 0xff3030, 5, 0.08, 0, 0, 0, 0.9); // blinking roof beacons
      this.occl.push([Math.min(x0, X0), Y0, Math.max(x1, X1), y0]); // the ground this building hides
      // if the player is hidden behind this building, make it see-through
      const hidden = pp.x > X0 - 8 && pp.x < X1 + 8 && pp.y > Y0 - 8 && pp.y < Y1 + 8;
      const alpha = hidden ? 0.4 : 1;
      r.img.setAlpha(alpha);
      const col = r.wall ?? 0x666666, dark = Phaser.Display.Color.IntegerToColor(col).darken(28).color;
      const tall = k >= 0.06, day = !lit, seed = (b.x * 7 + b.y * 13) | 0, awn = r.awn;
      const wall = (ax: number, ay: number, bx: number, by: number, AX: number, AY: number, BX: number, BY: number, c: number, side: number) => {
        g.fillStyle(c, alpha).fillTriangle(ax, ay, bx, by, BX, BY).fillTriangle(ax, ay, BX, BY, AX, AY);
        const rise = Math.hypot(AX - ax, AY - ay);
        if (!tall || rise < 7) return; // low things (fences, containers) and walls seen nearly edge-on get no windows
        // a point on the wall: s along the wall, t from the ground (0) up to the roof (1)
        const px = (s: number, t: number) => ax + (bx - ax) * s + (AX - ax + (BX - AX - bx + ax) * s) * t;
        const py = (s: number, t: number) => ay + (by - ay) * s + (AY - ay + (BY - AY - by + ay) * s) * t;
        g.fillStyle(0x000000, 0.22 * alpha).fillTriangle(px(0, 0), py(0, 0), px(1, 0), py(1, 0), px(1, 0.14), py(1, 0.14)).fillTriangle(px(0, 0), py(0, 0), px(1, 0.14), py(1, 0.14), px(0, 0.14), py(0, 0.14)); // shop-front band
        const n = Math.max(1, Math.floor(Math.hypot(bx - ax, by - ay) / 22)), rows = k > 0.12 ? 3 : 2;
        if (awn && side !== 2) { // shop awnings along the wall, a different colour for each shop
          const shops = Math.max(1, Math.floor(n / 3));
          for (let j = 0; j < shops; j++) {
            if ((seed + j * 3 + side) % 4 === 0) continue; // some shops have none
            const s0 = (j + 0.05) / shops, s1 = (j + 0.95) / shops;
            g.fillStyle(awn[(seed + j) % awn.length], alpha);
            g.fillTriangle(px(s0, 0.15), py(s0, 0.15), px(s1, 0.15), py(s1, 0.15), px(s1, 0.27), py(s1, 0.27)).fillTriangle(px(s0, 0.15), py(s0, 0.15), px(s1, 0.27), py(s1, 0.27), px(s0, 0.27), py(s0, 0.27));
          }
        }
        for (let row = 0; row < rows; row++) {
          const t0 = 0.32 + (row * 0.62) / rows, t1 = t0 + 0.42 / rows;
          for (let i = 0; i < n; i++) {
            const s0 = (i + 0.22) / n, s1 = (i + 0.78) / n;
            const on = !day && ((seed + i * 31 + row * 17 + side * 5) % 7) < 3; // some windows are lit at night
            g.fillStyle(day ? 0x4a6478 : on ? 0xffd98a : 0x141c26, alpha * (day ? 0.85 : on ? 0.9 : 0.8));
            g.fillTriangle(px(s0, t0), py(s0, t0), px(s1, t0), py(s1, t0), px(s1, t1), py(s1, t1)).fillTriangle(px(s0, t0), py(s0, t0), px(s1, t1), py(s1, t1), px(s0, t1), py(s0, t1));
          }
        }
      };
      if (X0 > x0) wall(x0, y0, x0, y1, X0, Y0, X0, Y1, dark, 0); // we see its west wall
      else if (X1 < x1) wall(x1, y0, x1, y1, X1, Y0, X1, Y1, dark, 1); // east wall
      if (Y0 > y0) wall(x0, y0, x1, y0, X0, Y0, X1, Y0, col, 2); // north wall
      else if (Y1 < y1) wall(x0, y1, x1, y1, X0, Y1, X1, Y1, col, 3); // the south wall faces the camera // south wall
    }
  }

  /** Goro's Garage: park in the spray booth (after mission 3) and press 1-4 to buy. */
  private updateGarage(): void {
    const p = this.player, c = p.car, spot = this.map.places.spray;
    this.garageOpen = !!c && this.story.index >= 3 && !this.story.active && this.mode === 'play' && Math.hypot(c.x - spot.x, c.y - spot.y) < 36 && c.speed < 60;
    if (!c || !this.garageOpen) return;
    const k = this.keys, down = (key: Phaser.Input.Keyboard.Key) => Phaser.Input.Keyboard.JustDown(key);
    const pay = (price: number) => { if (p.cash < price) return false; p.cash -= price; this.fx.puff(c.x, c.y, 0xffffff, 40, 0.5, 0, 0, 2, 0.6); return true; };
    if (down(k.ONE) && this.heat.level <= 3 && pay(GARAGE.respray.price)) { c.respray(); if (!this.heat.seen) this.heat.clear(true); }
    if (down(k.TWO) && c.up.engine < 3 && pay(GARAGE.engine.prices[c.up.engine])) c.up.engine++;
    if (down(k.THREE) && !c.up.nitro && pay(GARAGE.nitro.price)) c.up.nitro = 1;
    if (down(k.FOUR) && !c.up.armour && pay(GARAGE.armour.price)) { c.up.armour = 1; c.maxHp = c.def.hp * (1 + GARAGE.armour.hp); c.hp = c.maxHp; c.burning = false; }
  }

  /** Free roam: move the clock on and blend the light between the times of day; now and then it rains. */
  private tickDay(dt: number): void {
    this.clock = (this.clock + dt / (DAY.minutes * 60)) % 1;
    const K = DAY.keys;
    let i = 0;
    while (i < K.length - 2 && K[i + 1][0] <= this.clock) i++;
    const [t0, a] = K[i], [t1, b] = K[i + 1], k = Phaser.Math.Clamp((this.clock - t0) / (t1 - t0 || 1), 0, 1);
    const mix = (shift: number) => Math.round(Phaser.Math.Linear((a.color >> shift) & 255, (b.color >> shift) & 255, k)) << shift;
    this.rainT -= dt;
    if (this.raining > 0) this.raining -= dt;
    else if (this.rainT <= 0) { this.rainT = DAY.rainEvery; if (Math.random() < DAY.rainChance) this.raining = DAY.rainFor; }
    const wet = this.raining > 0;
    this.ambience = { color: mix(16) | mix(8) | mix(0), alpha: Phaser.Math.Linear(a.alpha, b.alpha, k) + (wet ? 0.08 : 0), lights: Math.max(Phaser.Math.Linear(a.lights, b.lights, k), wet ? 0.4 : 0), rain: wet };
    this.shade.setFillStyle(this.ambience.color, this.ambience.alpha);
    Car.lights = this.ambience.lights;
  }

  /** A few times a second: move the light pool to the lamps on screen, and fill / empty nearby car parks. */
  private slowUpdate(): void {
    this.map.shimmer(); // water ripples
    // forget rooftop pictures that are far behind us
    const here = this.cameras.main.midPoint;
    for (const r of this.roofs) if (r.made && (Math.abs(r.x - here.x) > 2600 || Math.abs(r.y - here.y) > 2000)) { (r.img as Phaser.GameObjects.Image).setTexture('dot'); this.textures.remove(r.key!); r.made = false; }
    if (this.dayCycle) this.tickDay(0.3);
    const v = this.cameras.main.worldView, p = this.player.pos, a = this.ambience;
    let n = 0;
    if (a.lights > 0.05) for (const l of this.map.lights) {
      if (n >= this.glows.length) break;
      if (l.x < v.x - 160 || l.x > v.right + 160 || l.y < v.y - 160 || l.y > v.bottom + 160) continue;
      const flicker = l.scale > 1 && l.scale < 1.2 ? 0.75 + Math.random() * 0.3 : 1; // neon billboards buzz
      this.glows[n++].setPosition(l.x, l.y).setTint(l.color).setScale(l.scale).setAlpha(l.alpha * a.lights * flicker).setVisible(true);
    }
    for (; n < this.glows.length; n++) this.glows[n].setVisible(false);

    // parked cars exist only in car parks near the player
    this.map.lots.forEach((l, i) => {
      const d = Math.hypot(l.x + l.w / 2 - p.x, l.y + l.h / 2 - p.y), have = this.lotCars.get(i);
      if (l === this.map.places.warehouse.rect) return; // nobody parks inside the police compound
      if (!have && d < PARKED.spawnDist && this.cars.length < TRAFFIC.vehicleCap - 4 && !this.onScreen(l.x + l.w / 2, l.y + l.h / 2, Math.max(l.w, l.h) / 2)) {
        const made: Car[] = [], count = Math.min(PARKED.perLot, Math.floor(l.w / 96));
        for (let k = 0; k < count; k++) {
          const x = l.x + 48 + k * 96 + (i % 2) * 48, y = l.y + l.h / 2;
          if (x > l.x + l.w - 30 || this.cars.some((c) => Math.hypot(c.x - x, c.y - y) < 70)) continue;
          made.push(this.addCar((i + k) % 3 === 0 ? VEHICLES.sports : VEHICLES.sedan, x, y, (i + k) % 2 ? Math.PI / 2 : -Math.PI / 2));
        }
        this.lotCars.set(i, made);
      } else if (have && d > PARKED.removeDist) {
        for (const c of have) if (!c.removed && c.driver === 'none' && !c.unlocked && !c.story) c.destroy();
        this.lotCars.delete(i);
      }
    });

    const id = MAP.districtAt(p.x / TILE_SIZE, p.y / TILE_SIZE);
    if (id !== this.districtId) { this.districtId = id; this.story.stamp = 3; }
  }

  /** The "E — Steal" prompt and the break-in / arrest progress bars, drawn in the world. */
  private updateWorldUi(): void {
    const p = this.player, g = this.bars;
    g.clear();
    this.halo.setPosition(p.pos.x, p.pos.y).setVisible(!p.car && this.mode !== 'cut');
    for (const sh of this.shop.places) if (this.onScreen(sh.x, sh.y, 60)) g.lineStyle(2, 0xf0a030, 0.75).strokeCircle(sh.x, sh.y, 22); // Hachiman Hardware: orange rings
    if (this.story.index >= 3 && !this.story.active) { const sp = this.map.places.spray; g.lineStyle(2, 0x7fe0ff, 0.7).strokeCircle(sp.x, sp.y, 30); } // Goro's spray booth
    for (const sm of this.story.sideMarkers) g.lineStyle(2, 0xc060ff, 0.5 + 0.4 * Math.sin(this.time.now / 200)).strokeCircle(sm.x, sm.y, 26); // side stories: violet rings
    if (!this.story.active) for (const st of this.side.starts) if (!this.side.active && this.onScreen(st.x, st.y, 60)) g.lineStyle(2, 0x40d0c0, 0.75).strokeCircle(st.x, st.y, 24); // side jobs: teal rings
    const mk = this.story.marker ?? this.side.marker;
    if (mk && this.mode !== 'cut') { // the gold ring that shows where to go
      const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 180), r = Math.max(14, Math.min(mk.r, 40));
      g.lineStyle(2, 0xe8b923, 0.5 + 0.4 * pulse).strokeCircle(mk.x, mk.y, r * (0.8 + 0.2 * pulse));
      g.fillStyle(0xe8b923, 0.12).fillCircle(mk.x, mk.y, r);
    }
    let near: Car | null = null;
    if (!p.car && this.mode === 'play' && !p.entering) near = this.nearestCar(p.actor.x, p.actor.y, PLAYER.enterRange);
    // vending machines sell drinks when you are hurt and no car is in reach
    const vend = !near && !p.car && this.mode === 'play' && !p.entering && p.hp < PLAYER.maxHp ? this.vendingNear(p.actor.x, p.actor.y) : null;
    this.prompt.setVisible(!!near || !!vend);
    if (near) this.prompt.setText(t('PROMPT_STEAL')).setPosition(near.x, near.y - 30);
    else if (vend) this.prompt.setText(t('PROMPT_DRINK', { price: PLAYER.drink.price })).setPosition(vend.x, vend.y - 34);
    // enemies and pickups hidden behind a building show through as rings
    const hidden = (x: number, y: number) => this.occl.some((o) => x > o[0] && x < o[2] && y > o[1] && y < o[3]);
    for (const a of this.police.cops) if (a.alive && hidden(a.x, a.y)) g.lineStyle(2, 0x4a8cff, 0.9).strokeCircle(a.x, a.y - 8, 8);
    for (const a of this.gang.thugs) if (a.alive && hidden(a.x, a.y)) g.lineStyle(2, 0xc060ff, 0.9).strokeCircle(a.x, a.y - 8, 8);
    for (const k of this.pickups) if (k.hidden <= 0 && hidden(k.x, k.y)) g.lineStyle(2, 0xe8b923, 0.9).strokeRect(k.x - 6, k.y - 6, 12, 12);
    for (const c of this.cars) if ((c.driver === 'cop' || c.driver === 'gang') && hidden(c.x, c.y)) g.lineStyle(2, c.driver === 'cop' ? 0x4a8cff : 0xc060ff, 0.9).strokeCircle(c.x, c.y - 8, 16);
    if (p.entering && p.entering.need > 0) {
      const c = p.entering.car;
      g.fillStyle(0x000000, 0.7).fillRect(c.x - 21, c.y - 27, 42, 6);
      g.fillStyle(0xe8b923, 1).fillRect(c.x - 20, c.y - 26, 40 * Math.min(1, p.entering.t / p.entering.need), 4);
    }
    const ar = this.police.arrestProgress;
    if (ar > 0.05 && this.mode === 'play') {
      g.fillStyle(0x000000, 0.7).fillRect(p.pos.x - 21, p.pos.y - 25, 42, 6);
      g.fillStyle(0x4a8cff, 1).fillRect(p.pos.x - 20, p.pos.y - 24, 40 * Math.min(1, ar), 4);
    }
  }
}
