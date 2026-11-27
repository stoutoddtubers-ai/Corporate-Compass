import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Loads a model made by tools/blender/models3d.py (public/models/<name>.gltf.json, or a .glb) and turns it into
 * plain shapes the 3D view can draw many copies of at once:
 *  - body: everything solid, coloured per vertex from its material. The material called "paint"
 *    is white, so the game's per-car colour shows through it;
 *  - lights: the glowing parts (materials whose names start with "light");
 *  - lightbar: the police light bar.
 * Sizes are in metres; `min` and `size` are the box round the whole model.
 */
export interface Model { body: THREE.BufferGeometry; lights: THREE.BufferGeometry | null; lightbar: THREE.BufferGeometry | null; min: THREE.Vector3; size: THREE.Vector3 }

const loader = new GLTFLoader();
const cache = new Map<string, Promise<Model | null>>();

export function loadModel(name: string): Promise<Model | null> {
  let p = cache.get(name);
  if (!p) {
    // the script writes .gltf.json; a .glb dropped in by hand is tried if that is missing
    p = loader.loadAsync(`models/${name}.gltf.json`).catch(() => loader.loadAsync(`models/${name}.glb`)).then((gltf) => {
      const groups: Record<'body' | 'lights' | 'lightbar', THREE.BufferGeometry[]> = { body: [], lights: [], lightbar: [] };
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const name = mat?.name ?? '';
        let g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
        if (g.index) g = g.toNonIndexed();
        for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
        if (!g.attributes.normal) g.computeVertexNormals();
        // colour every vertex with its material's colour (the glowing parts use their glow colour)
        const glow = name.startsWith('light') || name === 'lightbar';
        const c = name === 'paint' ? new THREE.Color(1, 1, 1) : glow && mat.emissive && mat.emissive.getHex() ? mat.emissive.clone() : (mat?.color?.clone() ?? new THREE.Color(0.5, 0.5, 0.5));
        const n = g.attributes.position.count, arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
        g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
        groups[name === 'lightbar' ? 'lightbar' : glow ? 'lights' : 'body'].push(g);
      });
      if (!groups.body.length) return null;
      const all = mergeGeometries([...groups.body, ...groups.lights, ...groups.lightbar]);
      all.computeBoundingBox();
      const box = all.boundingBox!;
      return {
        body: mergeGeometries(groups.body),
        lights: groups.lights.length ? mergeGeometries(groups.lights) : null,
        lightbar: groups.lightbar.length ? mergeGeometries(groups.lightbar) : null,
        min: box.min.clone(), size: box.getSize(new THREE.Vector3()),
      };
    }).catch((e) => { console.warn(`Model ${name} could not be loaded; the block version stays.`, e); return null; });
    cache.set(name, p);
  }
  return p;
}

/** Scales a model's shape: uniformly by `k` (game px per metre), centred on x/z, standing on the ground. */
export function scaled(g: THREE.BufferGeometry, m: Model, k: number): THREE.BufferGeometry {
  const c = m.min.clone().addScaledVector(m.size, 0.5);
  return g.clone().translate(-c.x, -m.min.y, -c.z).scale(k, k, k);
}

/** A pole-like model (lamp, signal, utility pole) keeps its own origin at the foot; only scaled. */
export function asIs(g: THREE.BufferGeometry, k: number): THREE.BufferGeometry { return g.clone().scale(k, k, k); }

/** Squeezes a vehicle to one unit long and one unit wide (the game stretches it to each car's size); height in px. */
export function unitVehicle(g: THREE.BufferGeometry, m: Model, lengthPx: number): THREE.BufferGeometry {
  const c = m.min.clone().addScaledVector(m.size, 0.5);
  return g.clone().translate(-c.x, -m.min.y, -c.z).scale(1 / m.size.x, lengthPx / m.size.x, 1 / m.size.z);
}
