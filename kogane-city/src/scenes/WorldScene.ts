import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../data/config';
import { MAP } from '../data/map';
import { PLAYER, CAMERA } from '../data/player';
import { VEHICLES, VehicleDef, CAR_DAMAGE } from '../data/vehicles';
import { PEDS, PARKED, PICKUPS } from '../data/ai';
import { HEAT } from '../data/heat';
import { WEAPONS } from '../data/weapons';
import { BARKS, pick, t } from '../data/strings';
import { CityMap } from '../systems/CityMap';
import { Fx } from '../systems/Fx';
import { Projectiles } from '../systems/Projectiles';
import { HeatSystem } from '../systems/HeatSystem';
import { PedSystem } from '../systems/PedSystem';
import { TrafficSystem } from '../systems/TrafficSystem';
import { PoliceSystem } from '../systems/PoliceSystem';
import { Actor } from '../entities/Actor';
import { Car } from '../entities/Car';
import { Player } from '../entities/Player';

type Keys = Record<'W' | 'A' | 'S' | 'D' | 'E' | 'R' | 'SPACE' | 'SHIFT' | 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'F3', Phaser.Input.Keyboard.Key>;
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
  heat!: HeatSystem;
  projectiles!: Projectiles;
  pickups: Pickup[] = [];
  keys!: Keys;
  /** 'play', or showing the death / arrest screen. */
  mode: 'play' | 'dead' | 'arrested' = 'play';
  modeT = 0;
  bill = 0;
  debugOn = true;
  private cam = { x: 0, y: 0, zoom: 1 };
  private prompt!: Phaser.GameObjects.Text;
  private bars!: Phaser.GameObjects.Graphics;

  constructor() {
    super('World');
  }

  create(): void {
    this.cars = []; this.pickups = []; this.mode = 'play';
    this.map = new CityMap();
    this.map.bake(this, 'city');
    this.add.image(0, 0, 'city').setOrigin(0).setDepth(0);
    for (const spot of [MAP.policeBox, MAP.hospital]) {
      const [x, y, w] = spot.tile;
      this.add.text((x + w / 2) * TILE_SIZE, y * TILE_SIZE + 12, spot.label.replace(' ', '\n'), {
        fontFamily: 'sans-serif', fontSize: '10px', color: '#fff', align: 'center',
      }).setOrigin(0.5, 0).setDepth(1);
    }
    this.physics.world.setBounds(0, 0, this.map.widthPx, this.map.heightPx);

    // Invisible solid boxes for every building, so people can't walk through them.
    this.walls = this.physics.add.staticGroup();
    const W = this.map.widthPx, H = this.map.heightPx, edge = 2 * TILE_SIZE;
    const solids = [...this.map.buildings, { x: 0, y: 0, w: W, h: edge }, { x: 0, y: H - edge, w: W, h: edge }, { x: 0, y: 0, w: edge, h: H }, { x: W - edge, y: 0, w: edge, h: H }];
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
    this.player = new Player(this, MAP.playerStart[0] * TILE_SIZE, MAP.playerStart[1] * TILE_SIZE);
    this.peds = new PedSystem(this);
    this.police = new PoliceSystem(this);

    // parked cars in each car park, alternating sedan / sports
    this.map.lots.forEach((l, li) => {
      for (let i = 0; i < PARKED.perLot; i++) {
        const def = (li + i) % 2 ? VEHICLES.sports : VEHICLES.sedan;
        this.addCar(def, l.x + 56 + i * 96 + (li % 2) * 48, l.y + l.h / 2, -Math.PI / 2);
      }
    });
    this.traffic = new TrafficSystem(this);

    // weapon pickups (so you can re-arm after an arrest)
    const guns = ['kitsune9', 'suzume', 'sawnoff'];
    guns.forEach((id, i) => {
      const l = this.map.lots[(i + 1) % this.map.lots.length];
      this.addPickup(l.x + l.w - 24, l.y + 20 + i * 4, 'weapon', 0, id, PICKUPS.weaponRespawn);
    });

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,E,R,SPACE,SHIFT,ONE,TWO,THREE,FOUR,F3') as Keys;
    this.input.mouse?.disableContextMenu();
    this.input.setDefaultCursor('crosshair');
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      const n = this.player.weapons.length;
      if (!this.player.car) this.player.switchTo((this.player.current + (dy > 0 ? 1 : n - 1)) % n);
    });

    this.prompt = this.add.text(0, 0, t('PROMPT_STEAL'), { fontFamily: 'monospace', fontSize: '11px', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(9).setVisible(false);
    this.bars = this.add.graphics().setDepth(9);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H);
    this.cam = { x: this.player.actor.x, y: this.player.actor.y, zoom: 1 };
    cam.centerOn(this.cam.x, this.cam.y);

    this.scene.launch('Hud');
    (window as unknown as { __kc: WorldScene }).__kc = this; // handy for testing from the browser console
  }

  // ---------- helpers used by the systems ----------

  onScreen(x: number, y: number, margin: number): boolean {
    const v = this.cameras.main.worldView;
    return x > v.x - margin && x < v.right + margin && y > v.y - margin && y < v.bottom + margin;
  }

  addCar(def: VehicleDef, x: number, y: number, heading: number, police = false): Car {
    const c = new Car(this, def, x, y, heading, police);
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
    if (byPlayer) this.heat.crime(a.kind === 'cop' ? 'hitOfficer' : how === 'melee' ? 'punch' : 'assault');
    if (a.kind === 'ped') { a.state = 'flee'; a.timer = PEDS.fleeTime; a.tx = this.player.pos.x; a.ty = this.player.pos.y; }
    if (a.hp > 0) return;
    a.kill();
    a.timer = 8; // how long the body stays
    if (byPlayer) this.heat.crime('kill');
    if (a.kind === 'ped') this.addPickup(a.x, a.y, 'cash', Phaser.Math.Between(PEDS.cashDrop[0], PEDS.cashDrop[1]), '', 0);
    else if (Math.random() < HEAT.cop.dropChance) this.addPickup(a.x, a.y, 'weapon', 0, HEAT.cop.weapon, 0);
  }

  addPickup(x: number, y: number, kind: 'cash' | 'weapon', value: number, weapon: string, respawn: number): void {
    const obj = this.add.rectangle(x, y, kind === 'cash' ? 7 : 12, 7, kind === 'cash' ? 0xe8b923 : 0xf2f2f2).setDepth(1.5).setStrokeStyle(1, 0x000000);
    const label = kind === 'weapon' ? this.add.text(x, y - 6, WEAPONS[weapon].name, { fontFamily: 'monospace', fontSize: '9px', color: '#fff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5, 1).setDepth(1.5) : null;
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
    this.peds.list.forEach(blast); this.police.cops.forEach(blast);
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
          const ma = a.wreck ? a.def.mass * 2 : a.def.mass, mb = b.wreck ? b.def.mass * 2 : b.def.mass, tot = ma + mb;
          a.x -= nx * over * (mb / tot); a.y -= ny * over * (mb / tot);
          b.x += nx * over * (ma / tot); b.y += ny * over * (ma / tot);
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) {
            const jimp = (-1.25 * rv) / (1 / ma + 1 / mb);
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

  private collideCarPeople(): void {
    const everyone: Actor[] = [...this.peds.list, ...this.police.cops];
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
    const spot = dead ? MAP.hospital.spawn : MAP.policeBox.spawn;
    p.actor.body.reset(spot[0] * TILE_SIZE, spot[1] * TILE_SIZE);
    p.heal();
    p.rollT = -1; p.actor.sprite.setAlpha(1).setScale(1);
    if (dead) p.armour = 0; // death costs your armour, weapons kept (bible)
    else p.resetWeapons(['fists']); // arrest costs every weapon except melee (bible)
    this.heat.clear(false);
    this.police.standDown(true);
    this.mode = 'play';
    this.cam.x = p.actor.x; this.cam.y = p.actor.y;
  }

  // ---------- main loop ----------

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    if (Phaser.Input.Keyboard.JustDown(this.keys.F3)) this.debugOn = !this.debugOn;

    if (this.mode === 'play') this.player.update(dt);
    else {
      this.modeT -= dt;
      this.player.actor.body.setVelocity(0, 0);
      if (this.modeT <= 0) this.respawn();
    }

    this.traffic.update(dt);
    this.police.update(dt);
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const c = this.cars[i];
      if (c.removed) { this.cars.splice(i, 1); continue; }
      c.update(dt, this.map, c.input);
      if (c.updateDamageFx(dt, (x, y, col, size, life, vx, vy, grow) => this.fx.puff(x, y, col, size, life, vx, vy, grow))) this.explode(c);
      if (c.wreck && c.wreckTimer <= 0) { c.destroy(); this.cars.splice(i, 1); }
    }
    this.collideCars();
    this.collideCarPeople();
    for (const c of this.cars) c.sync();
    this.peds.update(dt);
    this.projectiles.update(dt);
    this.heat.update(dt);
    this.updatePickups(dt);
    this.fx.update(dt);
    this.updateCamera(dt);
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
      fy = p.actor.y + ((ptr.y - GAME_HEIGHT / 2) / (GAME_HEIGHT / 2)) * CAMERA.aimLead * GAME_HEIGHT;
    }
    const k = Math.min(1, CAMERA.followLerp * dt);
    this.cam.x += (fx - this.cam.x) * k; this.cam.y += (fy - this.cam.y) * k;
    this.cam.zoom += (zoom - this.cam.zoom) * Math.min(1, CAMERA.zoomLerp * dt);
    cam.setZoom(this.cam.zoom);
    cam.centerOn(this.cam.x, this.cam.y);
  }

  /** The "E — Steal" prompt and the break-in / arrest progress bars, drawn in the world. */
  private updateWorldUi(): void {
    const p = this.player, g = this.bars;
    g.clear();
    let near: Car | null = null;
    if (!p.car && this.mode === 'play' && !p.entering) near = this.nearestCar(p.actor.x, p.actor.y, PLAYER.enterRange);
    this.prompt.setVisible(!!near);
    if (near) this.prompt.setPosition(near.x, near.y - 20);
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
