import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MAP } from '../data/map';
import { TILE_SIZE as TS, MAP_TILES_W as W, MAP_TILES_H as H, GAME_WIDTH, GAME_HEIGHT } from '../data/config';
import { LOOKS } from '../data/characters';
import { VIEW3D as V } from '../data/view3d';
import { Actor } from '../entities/Actor';
import type { Car } from '../entities/Car';
import type { Roof, Furniture, Plot } from '../systems/CityMap';
import type { WorldScene } from '../scenes/WorldScene';
import { VEHICLES } from '../data/vehicles';
import { Tile } from '../systems/CityMap';
import { loadModel, scaled, unitVehicle, asIs } from './Models';
void scaled;

/*
 * The third-person view. The game itself (missions, people, cars, police, collisions) still runs
 * exactly as before on the flat map; this draws that same world in 3D on a canvas underneath the
 * HUD, with the camera behind Jun. Game x/y on the map are 3D x/z here; 3D y is height, in game px.
 */

THREE.ColorManagement.enabled = false; // colours are used exactly as written, like the rest of the game

const col = (hex: string | number) => new THREE.Color(hex as THREE.ColorRepresentation);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// ---------- shared lighting, as shader uniforms ----------
const U = {
  uAmb: { value: new THREE.Color(0.6, 0.6, 0.6) },
  uSunCol: { value: new THREE.Color(0.5, 0.5, 0.5) },
  uSunDir: { value: new THREE.Vector3(0.45, 0.8, 0.35).normalize() },
  uFog: { value: new THREE.Color(V.sky.day) },
  uFogRange: { value: new THREE.Vector2(V.fog.dayNear, V.fog.dayFar) },
  uCam: { value: new THREE.Vector3() },
  uLamps: { value: 0 },
  uLit: { value: 0 },
  uTime: { value: 0 },
  uClip: { value: new THREE.Vector4(0, 0, 1e9, 1e9) }, // only what is inside this rectangle is drawn (x0, z0, x1, z1)
  uLight: { value: null as THREE.Texture | null },
  uMapPx: { value: new THREE.Vector2(W * TS, H * TS) },
  uCut: { value: new THREE.Vector4(0, 0, 0, 0) }, // indoors: Jun's x, z and the camera's x, z (walls between them are cut away)
  uCutOn: { value: 0 },
};
const FOG_GLSL = `
  float fogK = smoothstep(uFogRange.x, uFogRange.y, length(vWorld - uCam));
  gl_FragColor = vec4(mix(c, uFog, fogK), 1.0);`;
const CLIP_GLSL = `if (vWorld.x < uClip.x || vWorld.z < uClip.y || vWorld.x > uClip.z || vWorld.z > uClip.w) discard;`;
const COMMON = `
  uniform vec3 uAmb; uniform vec3 uSunCol; uniform vec3 uSunDir; uniform vec3 uFog; uniform vec2 uFogRange; uniform vec3 uCam;
  uniform float uLamps; uniform float uLit; uniform float uTime; uniform vec4 uClip; uniform sampler2D uLight; uniform vec2 uMapPx; uniform vec4 uCut; uniform float uCutOn;
  float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }`;

interface PersonParts { legL: THREE.InstancedMesh; legR: THREE.InstancedMesh; torso: THREE.InstancedMesh; armL: THREE.InstancedMesh; armR: THREE.InstancedMesh; head: THREE.InstancedMesh; hair: THREE.InstancedMesh; accent: THREE.InstancedMesh; gun: THREE.InstancedMesh }
interface Beam { tube: THREE.Mesh; ring: THREE.Mesh }

export class View3D {
  active = false;
  /** Which way the camera looks (radians, same convention as the game: 0 = east, PI/2 = south). */
  yaw = 0;
  pitch = V.camera.pitchStart;
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 0.6);
  private sun = new THREE.DirectionalLight(0xffffff, 0.6);
  private camPos = new THREE.Vector3();
  private camDist = V.camera.footDist;
  private lastMouse = -99;
  private time = 0;
  private region = '';
  // things in the world
  private people!: PersonParts;
  private carMeshes = new Map<string, { body: THREE.InstancedMesh; lights: THREE.InstancedMesh }>();
  private lightbars!: THREE.InstancedMesh;
  private shadows!: THREE.InstancedMesh;
  private furn: { kind: string; list: Furniture[]; parts: THREE.InstancedMesh[]; rot: number[] }[] = [];
  private signals: { x: number; y: number; a: number; axis: 'v' | 'h'; j: import('../systems/CityMap').Junction }[] = [];
  private bulbs: THREE.InstancedMesh | null = null;
  private trainMesh: THREE.InstancedMesh | null = null;
  private vertexLambert = new THREE.MeshLambertMaterial({ vertexColors: true });
  private furnGone = new Set<Furniture>();
  private furnScan = 0;
  private puffs!: THREE.Points;
  private tracers!: THREE.LineSegments;
  private beams: Beam[] = [];
  private labels: { x: number; y: number; h: number; text: string; sprite: THREE.Sprite | null }[] = [];
  private walkPhase = new WeakMap<Actor, number>();
  private lampHeads: THREE.Material[] = [];
  private carLightMat!: THREE.MeshBasicMaterial;
  private m = new THREE.Matrix4();
  private m2 = new THREE.Matrix4();
  private base = new THREE.Matrix4();
  private tmpC = new THREE.Color();
  private v3 = new THREE.Vector3();

  constructor(private world: WorldScene) {
    this.canvas = document.createElement('canvas');
    Object.assign(this.canvas.style, { position: 'fixed', left: '0', top: '0', width: '100%', height: '100%', zIndex: '0', display: 'none' });
    document.body.prepend(this.canvas);
    world.game.canvas.style.position = 'relative';
    world.game.canvas.style.zIndex = '1';
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, V.pixelRatio));
    this.camera = new THREE.PerspectiveCamera(V.fov, 16 / 9, 2, V.drawDist);
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    // a click on the 3D canvas (outside the HUD) also captures the mouse
    this.canvas.addEventListener('mousedown', () => { if (this.active) world.game.canvas.requestPointerLock?.(); });

    this.buildLightMap();
    this.buildGround();
    this.buildCity();
    this.buildFurniture();
    this.buildPeople();
    this.buildCars();
    this.buildFx();
    this.buildLabels();
    void this.loadModels();
  }

  setActive(on: boolean): void {
    this.active = on;
    this.canvas.style.display = on ? 'block' : 'none';
    if (on) { const p = this.world.player; this.yaw = p.car ? p.car.heading : p.aim; this.region = ''; }
  }

  private resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Mouse movement while the mouse is captured. */
  look(dx: number, dy: number): void {
    this.yaw = wrap(this.yaw + dx * V.camera.mouse);
    this.pitch = Math.max(V.camera.pitchMin, Math.min(V.camera.pitchMax, this.pitch + dy * V.camera.mouse));
    this.lastMouse = this.time;
  }

  // =====================================================================================
  // Building the world
  // =====================================================================================

  /** Street lamps and neon as soft pools of light painted on a picture of the whole map (1 px = 16 game px). */
  private buildLightMap(): void {
    const k = 16, c = document.createElement('canvas');
    c.width = Math.ceil((W * TS) / k); c.height = Math.ceil((H * TS) / k);
    const g = c.getContext('2d')!;
    g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'lighter';
    for (const l of this.world.map.lights) {
      const r = (l.scale * 46) / k, x = l.x / k, y = l.y / k, cc = col(l.color);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${(cc.r * 255) | 0},${(cc.g * 255) | 0},${(cc.b * 255) | 0},${0.55 * l.alpha})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    const t = new THREE.CanvasTexture(c);
    t.flipY = false; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    U.uLight.value = t;
  }

  /** The ground: one flat sheet whose shader looks up each tile's picture from the game's own tile sheet. */
  private buildGround(): void {
    const map = this.world.map;
    const data = new Uint8Array(W * H * 4);
    for (let i = 0; i < W * H; i++) { data[i * 4] = map.groundIdx[i]; data[i * 4 + 1] = map.decalIdx[i]; data[i * 4 + 3] = 255; }
    const idx = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
    idx.magFilter = idx.minFilter = THREE.NearestFilter; idx.needsUpdate = true;
    const src = this.world.textures.get('tiles').getSourceImage() as HTMLCanvasElement;
    const atlas = new THREE.CanvasTexture(src);
    atlas.flipY = false; atlas.generateMipmaps = false; atlas.minFilter = THREE.LinearFilter; atlas.magFilter = THREE.LinearFilter;
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...U, uIdx: { value: idx }, uAtlas: { value: atlas }, uAtlasSize: { value: new THREE.Vector2(src.width, src.height) }, uTiles: { value: new THREE.Vector2(W, H) } },
      vertexShader: `varying vec3 vWorld; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `${COMMON}
        uniform sampler2D uIdx; uniform sampler2D uAtlas; uniform vec2 uAtlasSize; uniform vec2 uTiles;
        varying vec3 vWorld;
        vec4 tile(float i, vec2 f) { vec2 px = vec2(mod(i, 16.0), floor(i / 16.0)) * 34.0 + 1.0 + f * 32.0; return texture2D(uAtlas, px / uAtlasSize); }
        void main() {
          ${CLIP_GLSL}
          vec2 t = vWorld.xz / ${TS}.0; vec2 cell = floor(t); vec2 f = fract(t);
          vec4 id = texture2D(uIdx, (cell + 0.5) / uTiles);
          float g = floor(id.r * 255.0 + 0.5), d = floor(id.g * 255.0 + 0.5);
          if (g > 17.5 && g < 19.5) g = 18.0 + mod(g - 18.0 + floor(uTime * 1.6), 2.0); // water ripples
          vec4 tc = tile(g, f);
          if (d < 254.5) { vec4 dc = tile(d, f); tc.rgb = mix(tc.rgb, dc.rgb, dc.a); }
          vec3 lamp = texture2D(uLight, vWorld.xz / uMapPx).rgb * uLamps;
          vec3 c = tc.rgb * (uAmb + uSunCol * uSunDir.y) + tc.rgb * lamp * 1.8 + lamp * 0.05;
          ${FOG_GLSL}
        }`,
    });
    const geo = new THREE.PlaneGeometry(W * TS, H * TS);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((W * TS) / 2, 0, (H * TS) / 2);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  /** How tall a building is in 3D, in game px. */
  private heightOf(r: Roof): number {
    const plot = r.rect as Plot;
    if (plot.roof === 'room') return (plot.height ?? 1) * V.roomScale;
    if (plot.roof) return V.low[plot.roof] ?? 40;
    const floors = Math.max(V.minFloors, Math.min(plot.district === 'asagiri' ? V.oldTownMaxFloors : V.maxFloors, Math.round((r.h - 0.04) * 90)));
    return floors * V.floor;
  }

  /** Every building as a box, merged into big pieces of the city. One shader draws windows, shop fronts and roofs. */
  private buildCity(): void {
    const castle = this.world.map.places.castle?.rect ?? null;
    const roofs = this.world.roofList.filter((r) => r.rect && r.rect !== castle);
    if (castle) this.buildCastle(castle);
    const kindCode: Record<string, number> = { '#d9d0c0': 0 };
    void kindCode;
    const chunks = new Map<string, { pos: number[]; nor: number[]; uv: number[]; colr: number[]; info: number[]; awn: number[] }>();
    const C = 2048;
    for (const r of roofs) {
      const b = r.rect!, plot = b as Plot, h = this.heightOf(r);
      const key = `${Math.floor((b.x + b.w / 2) / C)},${Math.floor((b.y + b.h / 2) / C)}`;
      let ch = chunks.get(key);
      if (!ch) chunks.set(key, (ch = { pos: [], nor: [], uv: [], colr: [], info: [], awn: [] }));
      const wall = col(r.wall ?? 0x777777), top = col(r.top ?? 0x555555);
      const windows = !plot.roof && !r.noWin ? 1 : 0, seed = ((b.x * 7 + b.y * 13) % 997) / 997;
      // room furniture gets a pattern by what it is: 1 pachinko machine, 2 shelves, 3 lockers
      // old-town buildings (four storeys or fewer) get wooden fronts and a tiled roof: pattern 4
      const oldTown = !plot.roof && plot.district === 'asagiri' && h <= 4 * V.floor;
      const pat = oldTown ? 4 : plot.roof === 'room' && plot.tint ? ({ '#c8405e': 1, '#7d8791': 2, '#5f6f7c': 3 } as Record<string, number>)[plot.tint[0]] ?? 0 : 0;
      if (oldTown) { const along = b.w >= b.h; this.oldRoofs.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, h, len: (along ? b.w : b.h) + 10, wid: (along ? b.h : b.w) + 10, rot: along ? 0 : Math.PI / 2, top: r.top ?? 0x4a5661 }); }
      const aw = r.awn?.length ? col(r.awn[Math.floor(seed * r.awn.length)]) : wall.clone().multiplyScalar(0.7);
      const ins = plot.roof === 'room' ? 0 : 0.4 + seed * 1.2; // neighbours that touch are pulled apart a hair, so their walls do not flicker
      const x0 = b.x + ins, x1 = b.x + b.w - ins, z0 = b.y + ins, z1 = b.y + b.h - ins;
      const face = (pts: number[][], n: number[], len: number, isTop: number) => {
        const c = isTop ? top : wall;
        const uvs = isTop ? [[0, 0], [0, 0], [0, 0], [0, 0]] : [[0, 0], [len, 0], [len, h], [0, h]];
        for (const i of [0, 1, 2, 0, 2, 3]) {
          ch!.pos.push(...pts[i]); ch!.nor.push(...n); ch!.uv.push(...uvs[i]);
          ch!.colr.push(c.r, c.g, c.b); ch!.info.push(isTop, windows, seed, pat); ch!.awn.push(aw.r, aw.g, aw.b);
        }
      };
      face([[x1, 0, z0], [x0, 0, z0], [x0, h, z0], [x1, h, z0]], [0, 0, -1], b.w, 0);
      face([[x0, 0, z1], [x1, 0, z1], [x1, h, z1], [x0, h, z1]], [0, 0, 1], b.w, 0);
      face([[x0, 0, z0], [x0, 0, z1], [x0, h, z1], [x0, h, z0]], [-1, 0, 0], b.h, 0);
      face([[x1, 0, z1], [x1, 0, z0], [x1, h, z0], [x1, h, z1]], [1, 0, 0], b.h, 0);
      face([[x0, h, z1], [x1, h, z1], [x1, h, z0], [x0, h, z0]], [0, 1, 0], 0, 1);
    }
    const mat = new THREE.ShaderMaterial({
      uniforms: U,
      vertexShader: `
        attribute vec3 aCol; attribute vec4 aInfo; attribute vec3 aAwn;
        varying vec3 vWorld; varying vec3 vN; varying vec2 vUv; varying vec3 vCol; varying vec4 vInfo; varying vec3 vAwn;
        void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vN = normal; vUv = uv; vCol = aCol; vInfo = aInfo; vAwn = aAwn; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `${COMMON}
        varying vec3 vWorld; varying vec3 vN; varying vec2 vUv; varying vec3 vCol; varying vec4 vInfo; varying vec3 vAwn;
        void main() {
          ${CLIP_GLSL}
          if (uCutOn > 0.5 && vWorld.y > 8.0) { // indoors: cut away anything standing between the camera and Jun
            vec2 pj = uCut.xy, cm = uCut.zw, d = cm - pj, q = vWorld.xz - pj;
            float t = dot(q, d) / max(dot(d, d), 1.0);
            if (t > 0.0 && t < 1.2 && length(q - d * clamp(t, 0.0, 1.0)) < 70.0) discard;
          }
          vec3 base = vCol; vec3 emit = vec3(0.0);
          float FL = ${V.floor}.0;
          if (vInfo.x < 0.5 && vInfo.y > 0.5 && vInfo.w > 3.5) { // the old town: wooden shophouse fronts
            float fl = floor(vUv.y / FL), cell = floor(vUv.x / 32.0);
            vec2 f = vec2(fract(vUv.x / 32.0), fract(vUv.y / FL));
            float h = hash(vec2(cell + vInfo.z * 91.0, fl));
            vec3 paper = vec3(0.93, 0.88, 0.76);
            base = vCol * (0.9 + 0.1 * step(0.5, fract(vUv.x / 4.0))); // vertical boards
            if (fl < 0.5) {
              if (f.y > 0.62 && f.y < 0.86) { if (h > 0.4 && f.x > 0.1 && f.x < 0.9) base = vAwn * (0.82 + 0.18 * step(0.5, fract(vUv.x / 6.0))); } // noren curtains over the doors
              else if (f.y < 0.6 && f.x > 0.08 && f.x < 0.92) { // sliding lattice doors with paper behind
                float slat = clamp(step(0.8, fract(vUv.x / 5.0)) + step(0.85, fract(vUv.y / 7.0)), 0.0, 1.0);
                base = mix(paper * 0.72, vCol * 0.5, slat); emit = paper * 0.5 * uLit * (1.0 - slat) * step(0.35, h);
              }
              if (f.y > 0.88) base *= 0.55; // the eave line
            } else {
              if (f.x > 0.15 && f.x < 0.85 && f.y > 0.25 && f.y < 0.8) { float slat = step(0.75, fract(vUv.x / 4.0)); base = mix(paper * 0.7, vCol * 0.45, slat); emit = paper * 0.55 * uLit * (1.0 - slat) * step(0.55, h); }
              if (f.y < 0.08) base = vCol * 0.55;
            }
          } else if (vInfo.x < 0.5 && vInfo.y > 0.5) { // a wall with windows
            float fl = floor(vUv.y / FL), cell = floor(vUv.x / 32.0);
            vec2 f = vec2(fract(vUv.x / 32.0), fract(vUv.y / FL));
            float h = hash(vec2(cell + vInfo.z * 91.0, fl));
            if (fl < 0.5) { // the ground floor: a shop front under an awning
              if (f.y > 0.66 && f.y < 0.84) base = vAwn * (0.85 + 0.15 * step(0.5, fract(vUv.x / 8.0)));
              else if (f.y < 0.62 && f.x > 0.06 && f.x < 0.94) { base = vec3(0.13, 0.15, 0.17) + 0.08 * h; emit = vec3(1.0, 0.86, 0.62) * (0.18 + 0.6 * uLit) * step(0.3, h); }
            } else {
              if (f.x > 0.18 && f.x < 0.82 && f.y > 0.28 && f.y < 0.82) { base = vec3(0.17, 0.2, 0.25) + 0.12 * h; emit = vec3(1.0, 0.83, 0.56) * uLit * step(0.62, h); }
              if (f.y < 0.05) base *= 0.82; // a ledge between storeys
            }
          }
          if (vInfo.x > 0.5) base *= 0.9 + 0.1 * hash(floor(vWorld.xz / 8.0)); // roofs: a little texture
          if (vInfo.x < 0.5 && vInfo.w > 0.5 && vInfo.w < 3.5) { // room furniture
            vec2 q = vec2(vUv.x, vUv.y);
            if (vInfo.w < 1.5) { // pachinko machines: a lit screen and a tray of balls on each
              vec2 f = vec2(fract(q.x / 16.0), q.y / 36.0);
              if (f.x > 0.12 && f.x < 0.88 && f.y > 0.45 && f.y < 0.9) { float h = hash(vec2(floor(q.x / 16.0), vInfo.z)); base = mix(vec3(1.0, 0.85, 0.3), vec3(0.4, 0.85, 1.0), h); emit = base * 0.5; }
              else if (f.y > 0.3 && f.y < 0.4) base = vec3(0.85, 0.85, 0.9);
            } else if (vInfo.w < 2.5) { // shelves full of goods
              float row = fract(q.y / 9.0);
              if (row < 0.15) base *= 0.6; else base = mix(base, vec3(hash(floor(q / 5.0)), hash(floor(q / 5.0) + 7.0), 0.5), 0.45);
            } else if (fract(q.x / 12.0) < 0.06 || fract(q.y / 22.0) < 0.05) base *= 0.6; // locker doors
          }
          vec3 n = normalize(vN);
          vec3 lamp = texture2D(uLight, vWorld.xz / uMapPx).rgb * uLamps * (1.0 - clamp(vWorld.y / 70.0, 0.0, 1.0));
          vec3 c = base * (uAmb + uSunCol * max(dot(n, uSunDir), 0.0) + lamp * 1.6) + emit;
          ${FOG_GLSL}
        }`,
    });
    for (const ch of chunks.values()) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(ch.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(ch.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(ch.uv, 2));
      g.setAttribute('aCol', new THREE.Float32BufferAttribute(ch.colr, 3));
      g.setAttribute('aInfo', new THREE.Float32BufferAttribute(ch.info, 4));
      g.setAttribute('aAwn', new THREE.Float32BufferAttribute(ch.awn, 3));
      g.computeBoundingSphere();
      this.scene.add(new THREE.Mesh(g, mat));
    }
    // the railway: the viaduct deck as long boxes, with piers under it
    const rc = this.world.map.railCorners;
    if (rc.length === 4) {
      const deckH = 70, parts: THREE.BufferGeometry[] = [];
      for (let s = 0; s < 4; s++) {
        const a = rc[s], b = rc[(s + 1) % 4], hz = a.y === b.y, len = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
        const deck = new THREE.BoxGeometry(hz ? len + 40 : 40, 6, hz ? 40 : len + 40);
        deck.translate((a.x + b.x) / 2, deckH, (a.y + b.y) / 2); parts.push(deck);
        for (let d = 0; d <= len; d += 160) {
          const pier = new THREE.BoxGeometry(8, deckH, 8);
          pier.translate(a.x + Math.sign(b.x - a.x) * d, deckH / 2, a.y + Math.sign(b.y - a.y) * d); parts.push(pier);
        }
      }
      const via = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshLambertMaterial({ color: 0x8a8780 }));
      this.scene.add(via);
      this.viaductH = deckH + 3;
    }
  }
  private viaductH = 73;
  private oldRoofs: { x: number; y: number; h: number; len: number; wid: number; rot: number; top: number }[] = [];

  /** Kogane Castle's keep: a stone base and three white storeys under green copper roofs. */
  private buildCastle(r: { x: number; y: number; w: number; h: number }): void {
    const parts: THREE.BufferGeometry[] = [], cx = r.x + r.w / 2, cz = r.y + r.h / 2;
    const add = (w: number, h: number, d: number, y: number, c: number) => {
      const g = new THREE.BoxGeometry(w, h, d).translate(cx, y + h / 2, cz), cc = col(c), n = g.attributes.position.count, a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) a.set([cc.r, cc.g, cc.b], i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(a, 3)); parts.push(g);
    };
    add(r.w + 24, 40, r.h + 24, 0, 0x8d877c); // the stone base
    let y = 40;
    for (let i = 0; i < 3; i++) {
      const k = 1 - i * 0.24, w = r.w * k, d = r.h * k;
      add(w, 34, d, y, 0xece6d6); // white walls
      add(w + 26, 6, d + 26, y + 34, 0x4f7f6c); // the copper roof, overhanging
      add(w * 0.7, 6, d * 0.7, y + 40, 0x5f8f7a);
      y += 46;
    }
    add(r.w * 0.2, 14, r.h * 0.3, y, 0x4f7f6c); // ridge
    this.scene.add(new THREE.Mesh(mergeGeometries(parts), new THREE.MeshLambertMaterial({ vertexColors: true })));
  }

  /** Street furniture: one instanced mesh per part per kind (trees, lamps, vending machines...). */
  private buildFurniture(): void {
    const map = this.world.map;
    const box = (w: number, h: number, d: number, y: number, x = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
    const lambert = (c: number) => new THREE.MeshLambertMaterial({ color: c });
    const glow = (c: number) => { const m = new THREE.MeshBasicMaterial({ color: c }); m.userData.base = c; this.lampHeads.push(m); return m; };
    // gate orientation: posts either side of the road it stands over
    const gate = map.furniture.find((f) => f.key === 'prop_gate');
    const roadNS = gate ? map.tileAt(gate.x, gate.y - 90) === 1 && map.tileAt(gate.x, gate.y + 90) === 1 : false;
    const kinds: { name?: string; test: (k: string) => boolean; parts: { geo: THREE.BufferGeometry; mat: THREE.Material; tint?: (f: Furniture) => number }[]; spin?: boolean }[] = [
      { test: (k) => k.startsWith('prop_tree'), spin: true, parts: [
        { geo: new THREE.CylinderGeometry(1.4, 2, 16, 6).translate(0, 8, 0), mat: lambert(0x5a4030) },
        { geo: new THREE.IcosahedronGeometry(11, 0).scale(1, 0.85, 1).translate(0, 24, 0), mat: lambert(0xffffff), tint: (f) => (f.key.endsWith('2') ? 0xe8a6c0 : f.key.endsWith('1') ? 0x3d6a3a : 0x55803e) },
      ] },
      { name: 'lamp', test: (k) => k === 'prop_lamp', parts: [
        { geo: mergeGeometries([new THREE.CylinderGeometry(0.9, 1.2, 48, 6).translate(0, 24, 0), box(10, 1.5, 1.5, 47.5, 5)]), mat: lambert(0x6a6e74) },
        { geo: box(5, 2, 4, 46.5, 9), mat: glow(0xfff1c8) },
      ] },
      { test: (k) => k.startsWith('prop_vending'), parts: [
        { geo: box(9, 24, 14, 12), mat: lambert(0xffffff), tint: (f) => [0xd04a4a, 0x3f7fc8, 0xe8e8e8][Number(f.key.slice(-1)) || 0] },
        { geo: box(1, 12, 10, 15, 4.6), mat: glow(0xdff4ff) },
      ] },
      { test: (k) => k === 'prop_bench', spin: true, parts: [{ geo: mergeGeometries([box(6, 2, 18, 6), box(1.5, 6, 18, 10, -3), box(5, 5, 1.5, 2.5, 0, -8), box(5, 5, 1.5, 2.5, 0, 8)]), mat: lambert(0x7a5a40) }] },
      { test: (k) => k === 'prop_bin', parts: [{ geo: new THREE.CylinderGeometry(3, 2.6, 9, 8).translate(0, 4.5, 0), mat: lambert(0x4a5a50) }] },
      { test: (k) => k === 'prop_crate', spin: true, parts: [{ geo: box(12, 12, 12, 6), mat: lambert(0x9a7a4c) }] },
      { test: (k) => k === 'prop_cone', parts: [{ geo: new THREE.ConeGeometry(3.4, 10, 8).translate(0, 5, 0), mat: lambert(0xff7a20) }] },
      { test: (k) => k === 'prop_gate', parts: [
        { geo: (() => { const g = mergeGeometries([new THREE.CylinderGeometry(4, 4.5, 80, 8).translate(0, 40, -70), new THREE.CylinderGeometry(4, 4.5, 80, 8).translate(0, 40, 70), box(12, 6, 170, 72), box(18, 7, 190, 84), box(26, 4, 200, 90)]); if (roadNS) g.rotateY(Math.PI / 2); return g; })(), mat: lambert(0xb3312f) },
        { geo: new THREE.SphereGeometry(13, 10, 8).scale(1, 1.3, 1).translate(0, 56, 0), mat: glow(0xe8483a) },
      ] },
    ];
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const k of kinds) {
      const all = map.furniture.filter((f) => k.test(f.key));
      const sq = new Map<string, Furniture[]>();
      for (const f of all) { const key = `${Math.floor(f.x / 2048)},${Math.floor(f.y / 2048)}`; if (!sq.has(key)) sq.set(key, []); sq.get(key)!.push(f); }
      for (const list of sq.values()) {
      const cx = list.reduce((a, f) => a + f.x, 0) / list.length, cz = list.reduce((a, f) => a + f.y, 0) / list.length;
      const parts = k.parts.map((p) => {
        const im = new THREE.InstancedMesh(p.geo, p.mat, list.length);
        if (p.tint) list.forEach((f, i) => im.setColorAt(i, this.tmpC.setHex(p.tint!(f))));
        // a bounding sphere round this square, so the whole square is skipped when it is out of view
        im.geometry = p.geo; im.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, 30, cz), 1600);
        this.scene.add(im);
        return im;
      });
      this.furn.push({ kind: k.name ?? '', list, parts, rot: list.map(() => (k.spin ? rnd() * Math.PI * 2 : 0)) });
      }
    }
  }

  /** Puts every piece of furniture where it is (or hides it), for the part of the world being shown. */
  private placeFurniture(): void {
    const c = U.uClip.value;
    for (const k of this.furn) {
      k.list.forEach((f, i) => {
        const x = f.roof && f.gone ? f.roof.x : f.x, y = f.roof && f.gone ? f.roof.y : f.y;
        const hide = (f.gone && (!f.roof || f.roof.dead)) || x < c.x || y < c.y || x > c.z || y > c.w;
        this.m.makeRotationY(k.rot[i] + (f.gone && f.roof ? f.roof.img.rotation : 0));
        if (f.gone && f.roof && !f.roof.dead) this.m.multiply(this.m2.makeRotationZ(1.2)); // knocked over and flying
        this.m.setPosition(x, 0, y);
        if (hide) this.m.makeScale(0, 0, 0);
        for (const im of k.parts) im.setMatrixAt(i, this.m);
      });
      for (const im of k.parts) im.instanceMatrix.needsUpdate = true;
    }
  }

  /** People are built from blocks (legs, body, arms, head, hair), each drawn for everyone at once. */
  private buildPeople(): void {
    const N = 320, mk = (geo: THREE.BufferGeometry) => {
      const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff }), N);
      im.setColorAt(0, this.tmpC.setRGB(1, 1, 1)); im.count = 0; im.frustumCulled = false; this.scene.add(im); return im;
    };
    this.people = {
      legL: mk(new THREE.BoxGeometry(3.2, 12, 3.2).translate(0, -6, 0)),
      legR: mk(new THREE.BoxGeometry(3.2, 12, 3.2).translate(0, -6, 0)),
      torso: mk(new THREE.BoxGeometry(4.8, 10.5, 8.6)),
      armL: mk(new THREE.BoxGeometry(2.6, 10, 2.6).translate(0, -5, 0)),
      armR: mk(new THREE.BoxGeometry(2.6, 10, 2.6).translate(0, -5, 0)),
      head: mk(new THREE.BoxGeometry(6, 6, 6)),
      hair: mk(new THREE.BoxGeometry(6.6, 2.2, 6.6)),
      accent: mk(new THREE.BoxGeometry(1, 1, 1)),
      gun: mk(new THREE.BoxGeometry(8, 2.4, 1.8)),
    };
    const tex = document.createElement('canvas'); tex.width = tex.height = 64;
    const g = tex.getContext('2d')!, grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    const sm = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(tex), transparent: true, depthWrite: false });
    this.shadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), sm, 600);
    this.shadows.frustumCulled = false; this.shadows.renderOrder = 1;
    this.scene.add(this.shadows);
  }

  private lookColors = new Map<string, { jacket: THREE.Color; trousers: THREE.Color; hair: THREE.Color; skin: THREE.Color; accent: THREE.Color | null; at: string }>();
  private colorsOf(look: string) {
    let c = this.lookColors.get(look);
    if (!c) {
      const L = LOOKS[look] ?? LOOKS.customer ?? { jacket: '#666666', hair: '#222222' };
      const j = col(L.jacket);
      c = { jacket: j, trousers: j.clone().multiplyScalar(V.person.trousers).lerp(col('#22232a'), 0.4), hair: col(L.hair), skin: col(L.skin ?? V.person.skin), accent: L.accent ? col(L.accent) : null, at: L.accentAt ?? 'chest' };
      this.lookColors.set(look, c);
    }
    return c;
  }

  /** Cars, scooters and trucks: boxes with painted parts, one mesh per body shape. The body colour is per car. */
  private buildCars(): void {
    const part = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, c: number) => {
      const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      const cc = col(c), n = g.attributes.position.count, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = cc.r; arr[i * 3 + 1] = cc.g; arr[i * 3 + 2] = cc.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      return g;
    };
    const BODY = 0xffffff, GLASS = 0x26303a, TYRE = 0x18181a, DARK = 0x3a3a3e;
    const wheels = (y: number, r: number, xs: number[], zs: number[]) => xs.flatMap((x) => zs.map((z) => part(x - 0.1, x + 0.1, 0, y + r, z - 0.07, z + 0.07, TYRE)));
    const shapes: Record<string, { body: THREE.BufferGeometry[]; lights: THREE.BufferGeometry[] }> = {
      car: { body: [part(-0.5, 0.5, 3, 10, -0.5, 0.5, BODY), part(-0.28, 0.2, 10, 16, -0.44, 0.44, GLASS), part(-0.26, 0.18, 16, 17, -0.42, 0.42, BODY), ...wheels(0, 5, [-0.32, 0.32], [-0.46, 0.46])],
        lights: [part(0.49, 0.51, 6, 9, -0.42, -0.2, 0xfff4c8), part(0.49, 0.51, 6, 9, 0.2, 0.42, 0xfff4c8), part(-0.51, -0.49, 6, 9, -0.44, -0.25, 0xd02020), part(-0.51, -0.49, 6, 9, 0.25, 0.44, 0xd02020)] },
      sports: { body: [part(-0.5, 0.5, 2.5, 8, -0.5, 0.5, BODY), part(-0.22, 0.14, 8, 12.5, -0.42, 0.42, GLASS), part(-0.5, -0.42, 8, 10, -0.45, 0.45, DARK), ...wheels(0, 4.5, [-0.32, 0.32], [-0.47, 0.47])],
        lights: [part(0.49, 0.51, 5, 7, -0.42, -0.18, 0xfff4c8), part(0.49, 0.51, 5, 7, 0.18, 0.42, 0xfff4c8), part(-0.51, -0.49, 5, 7.5, -0.45, 0.45, 0xd02020)] },
      police: { body: [part(-0.5, 0.5, 3, 10, -0.5, 0.5, BODY), part(-0.2, 0.25, 3, 8, -0.51, 0.51, 0x16161a), part(-0.28, 0.2, 10, 16, -0.44, 0.44, GLASS), part(-0.26, 0.18, 16, 17, -0.42, 0.42, BODY), ...wheels(0, 5, [-0.32, 0.32], [-0.46, 0.46])],
        lights: [part(0.49, 0.51, 6, 9, -0.42, -0.2, 0xfff4c8), part(0.49, 0.51, 6, 9, 0.2, 0.42, 0xfff4c8), part(-0.51, -0.49, 6, 9, -0.44, -0.25, 0xd02020), part(-0.51, -0.49, 6, 9, 0.25, 0.44, 0xd02020)] },
      truck: { body: [part(0.22, 0.5, 3, 20, -0.5, 0.5, BODY), part(0.42, 0.5, 11, 18, -0.44, 0.44, GLASS), part(-0.5, 0.2, 4, 24, -0.5, 0.5, BODY), part(-0.5, 0.2, 3, 4, -0.45, 0.45, DARK), ...wheels(0, 5.5, [-0.38, -0.2, 0.36], [-0.46, 0.46])],
        lights: [part(0.49, 0.51, 6, 9, -0.44, -0.24, 0xfff4c8), part(0.49, 0.51, 6, 9, 0.24, 0.44, 0xfff4c8), part(-0.51, -0.49, 5, 8, -0.46, -0.3, 0xd02020), part(-0.51, -0.49, 5, 8, 0.3, 0.46, 0xd02020)] },
      scooter: { body: [part(-0.35, 0.3, 5, 11, -0.28, 0.28, BODY), part(0.28, 0.38, 8, 17, -0.15, 0.15, DARK), part(-0.42, -0.3, 0, 7, -0.1, 0.1, TYRE), part(0.3, 0.44, 0, 7, -0.1, 0.1, TYRE)],
        lights: [part(0.38, 0.42, 13, 15, -0.12, 0.12, 0xfff4c8), part(-0.38, -0.35, 8, 10, -0.15, 0.15, 0xd02020)] },
      bike: { body: [part(-0.3, 0.3, 6, 12, -0.25, 0.25, BODY), part(0.25, 0.4, 10, 15, -0.25, 0.25, DARK), part(-0.48, -0.3, 0, 9, -0.1, 0.1, TYRE), part(0.3, 0.48, 0, 9, -0.1, 0.1, TYRE)],
        lights: [part(0.4, 0.44, 11, 14, -0.12, 0.12, 0xfff4c8), part(-0.34, -0.3, 9, 11, -0.15, 0.15, 0xd02020)] },
    };
    this.carLightMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    const bodyMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    for (const [shape, s] of Object.entries(shapes)) {
      const body = new THREE.InstancedMesh(mergeGeometries(s.body), bodyMat, 96);
      const lights = new THREE.InstancedMesh(mergeGeometries(s.lights), this.carLightMat, 96);
      body.setColorAt(0, this.tmpC.setRGB(1, 1, 1));
      for (const im of [body, lights]) { im.count = 0; im.frustumCulled = false; this.scene.add(im); }
      this.carMeshes.set(shape, { body, lights });
    }
    this.lightbars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 2.5, 0.7).translate(-0.04, 18.2, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), 48);
    this.lightbars.setColorAt(0, this.tmpC.setRGB(1, 1, 1)); this.lightbars.count = 0; this.lightbars.frustumCulled = false;
    this.scene.add(this.lightbars);
  }

  /** Smoke and sparks (points), bullet tracers (lines), and the beams that mark where to go. */
  private buildFx(): void {
    const N = 240, g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(N), 1));
    g.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(N), 1));
    this.puffs = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 400 } }, transparent: true, depthWrite: false,
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float uScale;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * uScale / -mv.z; vC = color; vA = alpha; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vC, vA * smoothstep(0.5, 0.2, d)); }`,
    }));
    this.puffs.frustumCulled = false;
    this.scene.add(this.puffs);
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(400 * 6), 3));
    this.tracers = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.tracers.frustumCulled = false;
    this.scene.add(this.tracers);
    const tube = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true).translate(0, 0.5, 0), ring = new THREE.RingGeometry(0.82, 1, 40).rotateX(-Math.PI / 2);
    for (let i = 0; i < 40; i++) {
      const t = new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      const r = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.7, depthWrite: false }));
      t.visible = r.visible = false; t.renderOrder = r.renderOrder = 2;
      this.scene.add(t, r);
      this.beams.push({ tube: t, ring: r });
    }
  }

  /** Names over doors (shops, stations, story places). Pictures are made the first time they come near. */
  private buildLabels(): void {
    for (const p of Object.values(this.world.map.places)) if (p.label && p.rect) this.labels.push({ x: p.x, y: p.y, h: 46, text: p.label.replace(/\n/g, ' '), sprite: null });
    for (const s of this.world.map.stations) this.labels.push({ x: s.x, y: s.y, h: this.viaductH + 26, text: s.name + ' STATION', sprite: null });
  }
  private makeLabel(text: string): THREE.Sprite {
    const c = document.createElement('canvas'), g = c.getContext('2d')!, font = 'bold 26px monospace';
    g.font = font; const w = Math.ceil(g.measureText(text).width) + 24;
    c.width = w; c.height = 40;
    g.fillStyle = 'rgba(12,12,18,0.82)'; g.fillRect(0, 0, w, 40);
    g.fillStyle = '#e8b923'; g.fillRect(0, 36, w, 4);
    g.font = font; g.fillStyle = '#f4efe2'; g.textBaseline = 'middle'; g.fillText(text, 12, 20);
    const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, fog: false }));
    s.scale.set(w / 4, 10, 1);
    this.scene.add(s);
    return s;
  }

  // =====================================================================================
  // Models made in Blender (public/models). Each one replaces its block version when it arrives.
  // =====================================================================================

  private async loadModels(): Promise<void> {
    const files: Record<string, string> = { car: 'car_sedan', sports: 'car_sports', police: 'car_police', truck: 'car_truck', scooter: 'car_scooter', bike: 'car_bike' };
    for (const [shape, file] of Object.entries(files)) {
      void loadModel(file).then((m) => {
        const mesh = this.carMeshes.get(shape), def = Object.values(VEHICLES).find((v) => v.shape === shape);
        if (!m || !mesh || !def) return;
        mesh.body.geometry = unitVehicle(m.body, m, def.length);
        mesh.body.material = this.vertexLambert;
        if (m.lights) mesh.lights.geometry = unitVehicle(m.lights, m, def.length);
        if (m.lightbar) this.lightbars.geometry = unitVehicle(m.lightbar, m, def.length);
      });
    }
    const k = V.pxPerMetre;
    void loadModel('lamp').then((m) => {
      if (!m) return;
      const pole = asIs(m.body, k), glow = m.lights ? asIs(m.lights, k) : null;
      for (const f of this.furn) if (f.kind === 'lamp') { f.parts[0].geometry = pole; f.parts[0].material = this.vertexLambert; if (glow) f.parts[1].geometry = glow; }
    });
    void loadModel('roof_hip').then((m) => {
      if (!m || !this.oldRoofs.length) return;
      // a unit roof stretched over each old-town building, in that building's roof colour
      const g = m.body.clone(), c = m.min.clone().addScaledVector(m.size, 0.5);
      g.translate(-c.x, 0, -c.z).scale(1 / m.size.x, 1 / (m.size.y - 0.05), 1 / m.size.z);
      const sq = new Map<string, typeof this.oldRoofs>();
      for (const r of this.oldRoofs) { const key = `${Math.floor(r.x / 2048)},${Math.floor(r.y / 2048)}`; if (!sq.has(key)) sq.set(key, []); sq.get(key)!.push(r); }
      for (const list of sq.values()) {
        const im = new THREE.InstancedMesh(g, this.vertexLambert, list.length);
        list.forEach((r, i) => {
          im.setMatrixAt(i, this.m.makeRotationY(r.rot).scale(this.v3.set(r.len, Math.min(r.wid * 0.38, 46), r.wid)).setPosition(r.x, r.h, r.y));
          im.setColorAt(i, this.tmpC.setHex(r.top));
        });
        const cx = list.reduce((a, r) => a + r.x, 0) / list.length, cz = list.reduce((a, r) => a + r.y, 0) / list.length;
        im.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, 100, cz), 1700);
        this.scene.add(im);
      }
    });
    void loadModel('traffic_light').then((m) => { if (m) this.buildSignals(m, k); });
    void loadModel('utility_pole').then((m) => { if (m) this.buildPoles(m, k); });
    void loadModel('train').then((m) => {
      if (!m) return;
      const R = MAP.rail, g = m.body.clone(), c = m.min.clone().addScaledVector(m.size, 0.5);
      g.translate(-c.x, -m.min.y, -c.z).scale(R.carLength / m.size.x, R.carLength / m.size.x, V.trainWidth / m.size.z);
      this.trainMesh = new THREE.InstancedMesh(g, this.vertexLambert, R.trains * R.cars);
      this.trainMesh.frustumCulled = false;
      this.scene.add(this.trainMesh);
    });
  }

  /** Traffic signals on the four corners of every junction with lights, each over the road it controls. */
  private buildSignals(m: import('./Models').Model, k: number): void {
    const map = this.world.map;
    for (const j of map.junctions) {
      if (!j.lit || j.y > MAP.cityH * TS) continue;
      const ox = j.hw + 14, oy = j.hh + 14;
      this.signals.push({ x: j.x + ox, y: j.y + oy, a: 0, axis: 'h', j }, { x: j.x - ox, y: j.y - oy, a: Math.PI, axis: 'h', j },
        { x: j.x - ox, y: j.y + oy, a: Math.PI / 2, axis: 'v', j }, { x: j.x + ox, y: j.y - oy, a: -Math.PI / 2, axis: 'v', j });
    }
    const poles = new THREE.InstancedMesh(asIs(m.body, k), this.vertexLambert, this.signals.length);
    this.signals.forEach((s, i) => poles.setMatrixAt(i, this.m.makeRotationY(-s.a).setPosition(s.x, 0, s.y)));
    poles.frustumCulled = false;
    this.scene.add(poles);
    this.bulbs = new THREE.InstancedMesh(new THREE.CircleGeometry(0.13 * k, 12).rotateY(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff }), this.signals.length);
    this.bulbs.setColorAt(0, this.tmpC.setRGB(1, 1, 1));
    this.bulbs.frustumCulled = false;
    this.scene.add(this.bulbs);
  }

  private drawSignals(): void {
    if (!this.bulbs) return;
    const k = V.pxPerMetre, tr = this.world.traffic;
    let n = 0;
    for (const s of this.signals) {
      if (Math.abs(s.x - this.camPos.x) + Math.abs(s.y - this.camPos.z) > 1500) continue;
      const ph = tr.phase(s.j), mine = s.axis === 'v' ? ph : (ph + 3) % 6; // 0 green, 1 amber, else red
      const lamp = mine === 0 ? 0 : mine === 1 ? 1 : 2;
      // lamps sit along the arm (Blender y 2.2, 2.6, 3.0 = three.js z -2.2, -2.6, -3.0), just in front of the head
      this.m.makeRotationY(-s.a).setPosition(s.x, 0, s.y).multiply(this.m2.makeTranslation(0.14 * k, 4.55 * k, -(2.2 + lamp * 0.4) * k));
      this.bulbs.setMatrixAt(n, this.m);
      this.bulbs.setColorAt(n, this.tmpC.setHex(lamp === 0 ? 0x38e0a0 : lamp === 1 ? 0xffb020 : 0xff3030));
      n++;
    }
    this.bulbs.count = n;
    this.bulbs.instanceMatrix.needsUpdate = true;
    if (this.bulbs.instanceColor) this.bulbs.instanceColor.needsUpdate = true;
  }

  /** Concrete utility poles down one side of every side street, with sagging wires between them. */
  private buildPoles(m: import('./Models').Model, k: number): void {
    const map = this.world.map, every = V.poleEvery, sw = MAP.sideWidth, cityY = (MAP.interiorBand.y - 4) * TS;
    const runs: { x: number; y: number; a: number }[][] = [];
    const walk = (tx: number, ty: number) => map.tileAt(tx * TS + 16, ty * TS + 16) === Tile.Walk;
    for (const t of MAP.vSide) { // streets running north-south: poles on the west kerb, cross arms east-west
      let run: { x: number; y: number; a: number }[] = [];
      for (let ty = 2; ty * TS < cityY; ty += every) {
        if (walk(t - 1, ty) && map.tileAt(t * TS + 16, ty * TS + 16) === Tile.Road) run.push({ x: (t - 0.6) * TS, y: (ty + 0.5) * TS, a: Math.PI / 2 });
        else { if (run.length > 1) runs.push(run); run = []; }
      }
      if (run.length > 1) runs.push(run);
    }
    for (const t of MAP.hSide) { // streets running east-west: poles on the north kerb
      let run: { x: number; y: number; a: number }[] = [];
      for (let tx = 5; tx < W - 2; tx += every) {
        if (walk(tx, t - 1) && map.tileAt(tx * TS + 16, t * TS + 16) === Tile.Road) run.push({ x: (tx + 0.5) * TS, y: (t - 0.6) * TS, a: 0 });
        else { if (run.length > 1) runs.push(run); run = []; }
      }
      if (run.length > 1) runs.push(run);
    }
    void sw;
    // group by 2048 px square so far squares are skipped, like the street furniture
    const sq = new Map<string, { poles: { x: number; y: number; a: number }[]; wires: number[] }>();
    const get = (x: number, y: number) => { const key = `${Math.floor(x / 2048)},${Math.floor(y / 2048)}`; let g = sq.get(key); if (!g) sq.set(key, (g = { poles: [], wires: [] })); return g; };
    const ends = [[-0.75, 8.3], [0.75, 8.3], [-0.75, 7.7], [0.75, 7.7]].map(([z, y]) => [z * k, y * k]);
    for (const run of runs) run.forEach((p, i) => {
      const g = get(p.x, p.y);
      g.poles.push(p);
      const q = run[i + 1];
      if (!q) return;
      // the cross arm points across the street: local +Z turns to world (-sin a, cos a)
      const ax = -Math.sin(p.a), ay = Math.cos(p.a);
      for (const [off, h] of ends) {
        const x0 = p.x + ax * off, y0 = p.y + ay * off, x1 = q.x + ax * off, y1 = q.y + ay * off;
        let px = x0, py = h, pz = y0;
        for (let s = 1; s <= 6; s++) {
          const t = s / 6, nx = x0 + (x1 - x0) * t, nz = y0 + (y1 - y0) * t, ny = h - V.wireSag * 4 * t * (1 - t);
          g.wires.push(px, py, pz, nx, ny, nz);
          px = nx; py = ny; pz = nz;
        }
      }
    });
    const geo = asIs(m.body, k), wireMat = new THREE.LineBasicMaterial({ color: 0x1a1a1c });
    for (const g of sq.values()) {
      const im = new THREE.InstancedMesh(geo, this.vertexLambert, g.poles.length);
      g.poles.forEach((p, i) => im.setMatrixAt(i, this.m.makeRotationY(-p.a).setPosition(p.x, 0, p.y)));
      const cx = g.poles.reduce((a, p) => a + p.x, 0) / g.poles.length, cz = g.poles.reduce((a, p) => a + p.y, 0) / g.poles.length;
      im.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, 70, cz), 1700);
      this.scene.add(im);
      if (g.wires.length) {
        const wg = new THREE.BufferGeometry();
        wg.setAttribute('position', new THREE.Float32BufferAttribute(g.wires, 3));
        wg.computeBoundingSphere();
        this.scene.add(new THREE.LineSegments(wg, wireMat));
      }
    }
  }

  private drawTrains(): void {
    const tm = this.trainMesh;
    if (!tm || this.world.indoors) { if (tm) tm.count = 0; return; }
    const cars = this.world.rail.cars;
    cars.forEach((c, i) => tm.setMatrixAt(i, this.m.makeRotationY(-c.heading).setPosition(c.x, this.viaductH, c.y)));
    tm.count = cars.length;
    tm.instanceMatrix.needsUpdate = true;
  }

  // =====================================================================================
  // Every frame
  // =====================================================================================

  /** Is a point visible to the 3D camera (roughly)? Used by the game to spawn people out of sight. */
  onScreen(x: number, y: number, margin: number): boolean {
    const dx = x - this.camPos.x, dy = y - this.camPos.z, d = Math.hypot(dx, dy);
    if (d < 140 + margin) return true;
    if (d > V.drawDist * 0.8) return false;
    const fx = Math.cos(this.camYaw), fy = Math.sin(this.camYaw);
    const half = Math.atan(Math.tan(THREE.MathUtils.degToRad(V.fov / 2)) * this.camera.aspect) + 0.25;
    return (dx * fx + dy * fy) / d > Math.cos(half);
  }
  private camYaw = 0;

  /** Where a point in the world appears on the HUD (960x540), or null if it is behind the camera. */
  project(x: number, y: number, h: number): { x: number; y: number } | null {
    this.v3.set(x, h, y).project(this.camera);
    if (this.v3.z > 1 || this.v3.z < -1) return null;
    const rect = this.world.game.canvas.getBoundingClientRect();
    const sx = ((this.v3.x + 1) / 2) * window.innerWidth, sy = ((1 - this.v3.y) / 2) * window.innerHeight;
    return { x: ((sx - rect.left) / rect.width) * GAME_WIDTH, y: ((sy - rect.top) / rect.height) * GAME_HEIGHT };
  }

  update(dt: number): void {
    if (!this.active) return;
    this.time += dt;
    U.uTime.value = this.time;
    const w = this.world, p = w.player;
    // what part of the world to draw: the city, or the one room Jun is in
    const room = w.indoors, reg = room ? room.id : 'city';
    if (reg !== this.region) {
      this.region = reg;
      if (room) U.uClip.value.set(room.x - TS, room.y - TS, room.x + room.w + TS, room.y + room.h + TS);
      else U.uClip.value.set(0, 0, W * TS, (MAP.interiorBand.y - 2) * TS);
      this.placeFurniture();
    }
    this.furnScan -= dt;
    let moving = false;
    if (this.furnScan <= 0) { this.furnScan = 0.25; for (const k of this.furn) for (const f of k.list) if (f.gone && !this.furnGone.has(f)) { this.furnGone.add(f); moving = true; } }
    for (const f of this.furnGone) if (f.roof && !f.roof.dead) moving = true;
    if (moving) this.placeFurniture();

    this.updateLight(room !== null);
    this.updateCamera(dt);
    this.drawPeople(dt);
    this.drawCars();
    this.drawFx();
    this.drawBeams();
    this.drawLabels();
    this.drawSignals();
    this.drawTrains();
    U.uCam.value.copy(this.camera.position);
    void p;
    this.renderer.render(this.scene, this.camera);
  }

  private updateLight(indoors: boolean): void {
    const a = this.world.ambience, sky = col(V.sky.day), tint = col(a.color);
    const dark = Math.min(1, a.alpha * 1.5);
    if (indoors) {
      const l = this.world.indoors!.def.light, lc = col(l?.color ?? 0xfff0d8);
      U.uAmb.value.copy(lc).multiplyScalar(V.room.ambient);
      U.uSunCol.value.setRGB(V.room.sun, V.room.sun, V.room.sun);
      U.uFog.value.setHex(0x050508); U.uFogRange.value.set(4000, 5000);
      U.uLamps.value = 0; U.uLit.value = 0;
      this.scene.background = col(0x050508);
    } else {
      sky.lerp(tint.clone().multiplyScalar(0.5), dark);
      U.uAmb.value.setRGB(0.58, 0.6, 0.64).lerp(tint.clone().multiplyScalar(0.6).addScalar(0.08), dark);
      const s = 0.62 * (1 - dark) ** 1.4;
      U.uSunCol.value.setRGB(s * 1.05, s, s * 0.9);
      const F = V.fog, near = a.rain ? F.rainNear : F.dayNear + (F.nightNear - F.dayNear) * dark, far = a.rain ? F.rainFar : F.dayFar + (F.nightFar - F.dayFar) * dark;
      U.uFog.value.copy(sky); U.uFogRange.value.set(near, far);
      U.uLamps.value = Math.max(0, Math.min(1, a.lights));
      U.uLit.value = Math.max(0, Math.min(1, (a.lights - 0.25) / 0.5));
      this.scene.background = sky;
    }
    this.hemi.color.copy(U.uAmb.value); this.hemi.groundColor.copy(U.uAmb.value).multiplyScalar(0.6); this.hemi.intensity = Math.PI; // (three.js divides plain lighting by pi)
    this.sun.color.copy(U.uSunCol.value); this.sun.intensity = Math.PI;
    this.sun.position.copy(U.uSunDir.value).multiplyScalar(100); this.sun.target.position.set(0, 0, 0);
    this.scene.fog = null;
    const night = U.uLamps.value;
    for (const m of this.lampHeads) (m as THREE.MeshBasicMaterial).color.setHex(m.userData.base ?? 0xffffff).multiplyScalar(0.55 + 0.45 * night); // dimmer by day, keeping its colour
    this.carLightMat.color.setScalar(0.55 + 0.45 * night);
  }

  private updateCamera(dt: number): void {
    const w = this.world, p = w.player, C = V.camera, car = p.car;
    const px = p.pos.x, py = p.pos.y;
    if (w.mode === 'cut') this.yaw = wrap(this.yaw + C.cutOrbit * dt);
    else if (car && this.time - this.lastMouse > C.carReturn) {
      const want = car.speed > 30 && car.forwardSpeed < -20 ? car.heading + Math.PI : car.heading; // reversing: look back
      this.yaw = wrap(this.yaw + wrap(want - this.yaw) * Math.min(1, dt * C.carFollow));
    }
    let dist: number, pitch: number, shoulder: number, lookH: number;
    if (w.indoors) { dist = C.roomDist; pitch = C.roomPitch; shoulder = 0; lookH = 12; }
    else if (car) { dist = C.carDist + (C.carDistFast - C.carDist) * Math.min(1, car.speed / car.def.maxSpeed); pitch = Math.max(0.12, this.pitch * 0.8); shoulder = 0; lookH = C.carLook; }
    else if (p.focus) { dist = C.aimDist; pitch = this.pitch; shoulder = C.aimShoulder; lookH = C.lookHeight; }
    else { dist = C.footDist; pitch = this.pitch; shoulder = C.shoulder; lookH = C.lookHeight; }
    const fx = Math.cos(this.yaw), fy = Math.sin(this.yaw), rx = -fy, ry = fx;
    // pull the camera in if a building is between it and Jun
    let free = dist * Math.cos(pitch);
    if (!w.indoors) for (let d = 10; d < free; d += 6) {
      const sx = px - fx * d + rx * shoulder, sy = py - fy * d + ry * shoulder;
      if (w.map.isWall(sx, sy)) { free = Math.max(14, d - 10); break; }
    }
    this.camDist += (free - this.camDist) * Math.min(1, dt * C.follow * (free < this.camDist ? 3 : 0.6));
    const cx = px - fx * this.camDist + rx * shoulder, cy = py - fy * this.camDist + ry * shoulder;
    const ch = lookH + Math.tan(pitch) * this.camDist + 6;
    const shake = w.cameras.main.shakeEffect?.isRunning ? 3 : 0;
    this.camera.position.set(cx + (Math.random() - 0.5) * shake, ch + (Math.random() - 0.5) * shake, cy);
    this.camera.lookAt(px + fx * 40 + rx * shoulder, lookH, py + fy * 40 + ry * shoulder);
    this.camPos.copy(this.camera.position);
    U.uCutOn.value = w.indoors ? 1 : 0;
    U.uCut.value.set(px, py, cx, cy);
    this.camYaw = this.yaw;
    (this.puffs.material as THREE.ShaderMaterial).uniforms.uScale.value = window.innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(V.fov / 2)));
  }

  /** Which way the camera faces on the ground: what Jun aims at on foot. */
  get aimYaw(): number { return this.yaw; }

  private inView(x: number, y: number): boolean {
    const c = U.uClip.value;
    return x >= c.x && y >= c.y && x <= c.z && y <= c.w && Math.abs(x - this.camPos.x) + Math.abs(y - this.camPos.z) < V.drawDist;
  }

  private drawPeople(dt: number): void {
    const w = this.world, P = this.people, p = w.player;
    let n = 0, sh = 0;
    const m = this.m, base = this.base, m2 = this.m2;
    const put = (im: THREE.InstancedMesh, mat: THREE.Matrix4, c: THREE.Color) => { im.setMatrixAt(n, mat); im.setColorAt(n, c); };
    const shadow = (x: number, y: number, sx: number, sz: number, rot: number) => {
      if (sh >= 600) return;
      m.makeRotationY(-rot).scale(this.v3.set(sx, 1, sz)).setPosition(x, 0.6, y);
      this.shadows.setMatrixAt(sh++, m);
    };
    const person = (look: string, x: number, y: number, facing: number, o: { swing?: number; armL?: number; armR?: number; gun?: boolean; dead?: boolean; roll?: number; seat?: boolean; alpha?: number }) => {
      if (n >= 320) return;
      const c = this.colorsOf(look);
      base.makeRotationY(-facing).setPosition(x, o.seat ? 5 : 0, y);
      if (o.dead) base.multiply(m2.makeTranslation(0, 2.4, 0)).multiply(this.m2.makeRotationZ(Math.PI / 2));
      if (o.roll) base.multiply(m2.makeTranslation(0, 9, 0)).multiply(this.m2.makeRotationZ(-o.roll)).multiply(this.m2.makeTranslation(0, -9, 0));
      const s = o.swing ?? 0, legA = o.seat ? 1.35 : s;
      const at = (dx: number, dy: number, dz: number, rz = 0) => m.copy(base).multiply(m2.makeTranslation(dx, dy, dz)).multiply(this.m2.makeRotationZ(rz));
      put(P.legL, at(0, 12, -2.2, legA), c.trousers);
      put(P.legR, at(0, 12, 2.2, o.seat ? 1.35 : -s), c.trousers);
      put(P.torso, at(0, 17.5, 0), c.jacket);
      put(P.armL, at(0, 22, -5.7, o.armL ?? -s * 0.8), c.jacket);
      put(P.armR, at(0, 22, 5.7, o.armR ?? s * 0.8), c.jacket);
      put(P.head, at(0, 25.8, 0), c.skin);
      put(P.hair, at(-0.4, 29.6, 0), c.hair);
      if (c.accent) {
        if (c.at === 'back') at(-2.5, 18, 0).multiply(m2.makeScale(0.5, 6, 6));
        else if (c.at === 'head') at(0, 28.2, 0).multiply(m2.makeScale(6.9, 1.6, 6.9));
        else at(2.5, 19.5, 2, 0).multiply(m2.makeScale(0.5, 2.6, 2.6));
        put(P.accent, m, c.accent);
      } else put(P.accent, m.makeScale(0, 0, 0), c.jacket);
      put(P.gun, o.gun ? at(11.5, 22.5, 4.8) : m.makeScale(0, 0, 0), this.tmpC.setHex(0x1a1a1e));
      if (!o.dead && !o.seat) shadow(x, y, 16, 16, 0);
      n++;
    };
    for (const a of Actor.all) {
      const sp = a.sprite;
      if (!sp.active || !sp.visible || !this.inView(a.x, a.y)) continue;
      const speed = a.body?.enable ? a.body.speed : 0;
      let ph = this.walkPhase.get(a) ?? Math.random() * 6;
      if (speed > 15) ph += speed * dt * 0.11;
      this.walkPhase.set(a, ph);
      const amp = Math.min(1, speed / 90) * 0.7, s = Math.sin(ph) * amp;
      const facing = Math.abs(sp.rotation - 1e-7) > 1e-9 ? sp.rotation : a.facing;
      const isP = a === p.actor;
      const punch = a.punchT > 0;
      const aiming = a.armed && (isP ? true : a.state === 'chase' || a.kind === 'cop');
      person(a.look, a.x, a.y, isP && p.rolling ? Math.atan2(p.actor.body.velocity.y, p.actor.body.velocity.x) : facing, {
        swing: s, dead: !a.alive, gun: a.armed && a.alive,
        armR: punch ? Math.PI / 2 : aiming ? Math.PI / 2 : undefined,
        armL: aiming ? Math.PI / 2.4 : undefined,
        roll: isP && p.rolling ? (p.rollT / 0.4) * Math.PI * 2 : 0,
      });
    }
    // riders on scooters and motorbikes
    for (const c of w.cars) {
      if (c.removed || c.driver === 'none' || (c.def.shape !== 'scooter' && c.def.shape !== 'bike') || !this.inView(c.x, c.y)) continue;
      person(p.car === c ? 'jun' : c.isPolice ? 'cop' : 'rider', c.x - Math.cos(c.heading) * 2, c.y - Math.sin(c.heading) * 2, c.heading, { seat: true, armL: 1.2, armR: 1.2 });
    }
    for (const im of Object.values(P)) { im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
    // shadows under cars too
    for (const c of w.cars) if (!c.removed && this.inView(c.x, c.y)) shadow(c.x, c.y, c.def.length * 1.15, c.def.width * 1.5, c.heading);
    this.shadows.count = sh; this.shadows.instanceMatrix.needsUpdate = true;
  }

  private drawCars(): void {
    const w = this.world, counts = new Map<string, number>();
    let bars = 0;
    for (const c of w.cars as Car[]) {
      if (c.removed || !this.inView(c.x, c.y)) continue;
      const shape = this.carMeshes.has(c.def.shape) ? c.def.shape : 'car', mesh = this.carMeshes.get(shape)!, i = counts.get(shape) ?? 0;
      if (i >= 96) continue;
      counts.set(shape, i + 1);
      this.m.makeRotationY(-c.heading).scale(this.v3.set(c.def.length, 1, c.def.width)).setPosition(c.x, 0, c.y);
      mesh.body.setMatrixAt(i, this.m); mesh.lights.setMatrixAt(i, this.m);
      this.tmpC.setHex(c.def.colors[c.colorIndex] ?? 0x888888);
      if (c.wreck) this.tmpC.multiplyScalar(0.22); else if (c.hp < c.maxHp * 0.5) this.tmpC.multiplyScalar(0.78);
      mesh.body.setColorAt(i, this.tmpC);
      if (c.isPolice && bars < 48) {
        this.lightbars.setMatrixAt(bars, this.m);
        const on = c.driver === 'cop' || c.roadblock;
        this.lightbars.setColorAt(bars, this.tmpC.setHex(on ? (Math.floor(c.age * 5) % 2 ? 0xff2a2a : 0x2a6aff) : 0x5a2a2a));
        bars++;
      }
    }
    for (const [shape, mesh] of this.carMeshes) {
      const n = counts.get(shape) ?? 0;
      mesh.body.count = mesh.lights.count = n;
      mesh.body.instanceMatrix.needsUpdate = mesh.lights.instanceMatrix.needsUpdate = true;
      if (mesh.body.instanceColor) mesh.body.instanceColor.needsUpdate = true;
    }
    this.lightbars.count = bars; this.lightbars.instanceMatrix.needsUpdate = true;
    if (this.lightbars.instanceColor) this.lightbars.instanceColor.needsUpdate = true;
  }

  private drawFx(): void {
    const w = this.world, g = this.puffs.geometry;
    const pos = g.attributes.position.array as Float32Array, colr = g.attributes.color.array as Float32Array, size = g.attributes.size.array as Float32Array, alpha = g.attributes.alpha.array as Float32Array;
    let n = 0;
    for (const q of w.fx.parts) {
      if (q.life <= 0 || n >= 240) continue;
      const img = q.img, age = 1 - q.life / q.max, sz = img.scaleX * 16;
      pos[n * 3] = img.x; pos[n * 3 + 1] = 6 + age * Math.min(60, sz * 1.5) + sz * 0.3; pos[n * 3 + 2] = img.y;
      this.tmpC.setHex(img.tintTopLeft ?? 0xffffff);
      colr[n * 3] = this.tmpC.r; colr[n * 3 + 1] = this.tmpC.g; colr[n * 3 + 2] = this.tmpC.b;
      size[n] = sz; alpha[n] = img.alpha;
      n++;
    }
    g.setDrawRange(0, n);
    for (const k of ['position', 'color', 'size', 'alpha']) g.attributes[k].needsUpdate = true;
    const tp = this.tracers.geometry.attributes.position.array as Float32Array;
    let t = 0;
    for (const b of w.projectiles.pool) {
      if (!b.active || t >= 400) continue;
      const sp = Math.hypot(b.vx, b.vy) || 1, L = 28;
      tp.set([b.x, 17, b.y, b.x - (b.vx / sp) * L, 17, b.y - (b.vy / sp) * L], t * 6);
      t++;
    }
    this.tracers.geometry.setDrawRange(0, t * 2);
    this.tracers.geometry.attributes.position.needsUpdate = true;
  }

  private drawBeams(): void {
    const w = this.world, list: { x: number; y: number; r: number; c: number; h: number }[] = [];
    if (w.mode !== 'cut') {
      const mk = w.shownMarker();
      if (mk) list.push({ x: mk.x, y: mk.y, r: Math.max(14, Math.min(mk.r, 40)), c: V.beams.mission, h: w.indoors ? 60 : 900 });
      if (!w.indoors) {
        for (const sm of w.story.sideMarkers) list.push({ x: sm.x, y: sm.y, r: 26, c: V.beams.side, h: 500 });
        if (!w.story.active && !w.side.active) for (const st of w.side.starts) list.push({ x: st.x, y: st.y, r: 24, c: V.beams.job, h: 300 });
      }
    }
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 3.5);
    this.beams.forEach((b, i) => {
      const it = list[i];
      const on = !!it && this.inView(it.x, it.y);
      b.tube.visible = b.ring.visible = on;
      if (!on) return;
      b.tube.position.set(it.x, 0, it.y); b.tube.scale.set(it.r, it.h, it.r);
      b.ring.position.set(it.x, 0.8, it.y); b.ring.scale.setScalar(it.r * (0.85 + 0.15 * pulse));
      (b.tube.material as THREE.MeshBasicMaterial).color.setHex(it.c);
      (b.tube.material as THREE.MeshBasicMaterial).opacity = 0.14 + 0.08 * pulse;
      (b.ring.material as THREE.MeshBasicMaterial).color.setHex(it.c);
    });
  }

  private drawLabels(): void {
    for (const l of this.labels) {
      const near = Math.abs(l.x - this.camPos.x) + Math.abs(l.y - this.camPos.z) < V.labelDist && this.inView(l.x, l.y);
      if (near && !l.sprite) { l.sprite = this.makeLabel(l.text); l.sprite.position.set(l.x, l.h, l.y); }
      if (l.sprite) l.sprite.visible = near;
    }
  }
}
