"""
Builds the 3D models for the third-person view and saves them in public/models/ as glTF
(.gltf.json: one JSON file with the model inside).

    python tools/blender/models3d.py            (needs `pip install bpy`)
    python tools/blender/models3d.py --only sedan,lamp

Rules (see the Specs sheet of the asset list):
- metres; the model faces +X (Blender's X), with its origin on the ground at its centre;
- a material called "paint" is the part the game recolours (each car's paint colour);
- materials whose names start with "light" glow (headlights, tail lights, lamps);
- a material called "lightbar" is the police light bar, which the game flashes red and blue.
Colours are written as plain hex values, the way the rest of the game uses them.
"""
import base64
import json
import math
import os
import sys

import bpy  # (import bpy first: it makes bmesh and mathutils available)
import bmesh
from mathutils import Matrix, Vector

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'models')


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


MATS = {}


def mat(name, color, glow=False):
    key = name
    if key in MATS:
        return MATS[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    rgb = hexrgb(color)
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = 0.6
    if glow:
        b.inputs['Emission Color'].default_value = (*rgb, 1)
        b.inputs['Emission Strength'].default_value = 1.0
    MATS[key] = m
    return m


def link(bm, name, m):
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(m)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def box(name, x0, x1, y0, y1, z0, z1, m, top=None, bevel=0.0):
    """A box from (x0,y0,z0) to (x1,y1,z1). `top` = (x0, x1, y0, y1) of the top face, for slopes."""
    bm = bmesh.new()
    t = top or (x0, x1, y0, y1)
    v = []
    for z, (a0, a1, b0, b1) in ((z0, (x0, x1, y0, y1)), (z1, t)):
        for x, y in ((a0, b0), (a1, b0), (a1, b1), (a0, b1)):
            v.append(bm.verts.new((x, y, z)))
    for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
        bm.faces.new([v[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    if bevel:
        try:
            bmesh.ops.bevel(bm, geom=list(bm.edges) + list(bm.verts), offset=bevel, segments=1, affect='EDGES')
        except TypeError:
            pass
    return link(bm, name, m)


def cyl(name, x, y, z, r, depth, m, axis='Z', seg=12, r2=None):
    """A cylinder centred at (x, y, z) along an axis."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    rot = {'Z': Matrix.Identity(4), 'Y': Matrix.Rotation(math.pi / 2, 4, 'X'), 'X': Matrix.Rotation(math.pi / 2, 4, 'Y')}[axis]
    bmesh.ops.transform(bm, matrix=Matrix.Translation((x, y, z)) @ rot, verts=list(bm.verts))
    return link(bm, name, m)


def wheels(xs, half_track, r, w):
    tyre, hub = mat('tyre', '#18181a'), mat('chrome', '#9a9ea4')
    for i, x in enumerate(xs):
        for s in (-1, 1):
            cyl(f'tyre{i}{s}', x, s * half_track, r, r, w, tyre, 'Y', 12)
            cyl(f'hub{i}{s}', x, s * (half_track + w / 2 + 0.005), r, r * 0.55, 0.02, hub, 'Y', 10)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()


def save(name):
    os.makedirs(OUT, exist_ok=True)
    # glTF as one JSON file with the model data inside it (.gltf.json): the web host that serves
    # the shared test link takes .json files but not .glb ones. The game reads either.
    tmp = os.path.join(OUT, name + '.gltf')
    bpy.ops.export_scene.gltf(filepath=tmp, export_format='GLTF_SEPARATE', export_yup=True, export_apply=True,
                              export_materials='EXPORT', export_normals=True, export_texcoords=False)
    # put the separate .bin data inside the JSON (Blender 4.2+ no longer writes embedded glTF itself)
    with open(tmp) as f:
        doc = json.load(f)
    for buf in doc.get('buffers', []):
        uri = buf.get('uri')
        if uri and not uri.startswith('data:'):
            binpath = os.path.join(OUT, uri)
            with open(binpath, 'rb') as f:
                buf['uri'] = 'data:application/octet-stream;base64,' + base64.b64encode(f.read()).decode()
            os.remove(binpath)
    path = os.path.join(OUT, name + '.gltf.json')
    with open(path, 'w') as f:
        json.dump(doc, f, separators=(',', ':'))
    os.remove(tmp)
    old = os.path.join(OUT, name + '.glb')
    if os.path.exists(old):
        os.remove(old)
    print('wrote', path, os.path.getsize(path), 'bytes')


# --------------------------------------------------------------------------------------
# Vehicles
# --------------------------------------------------------------------------------------

def car_lights(front, rear, hw, z0, z1, inner=0.45):
    head, tail = mat('light_head', '#fff1c8', True), mat('light_tail', '#d82020', True)
    for s in (-1, 1):
        a, b = sorted((s * inner, s * hw))
        box(f'head{s}', front - 0.03, front + 0.02, a, b, z0, z1, head)
        box(f'tail{s}', rear - 0.02, rear + 0.03, a, b, z0, z1, tail)


def sedan(police=False):
    paint, glass, trim = mat('paint', '#ffffff'), mat('glass', '#26303a'), mat('trim', '#2a2a2e')
    L, hw = 4.6, 0.87
    box('body', -2.3, 2.3, -hw, hw, 0.3, 0.86, paint, top=(-2.24, 2.2, -hw + 0.03, hw - 0.03), bevel=0.05)
    box('cabin', -1.2, 1.05, -0.8, 0.8, 0.86, 1.4, glass, top=(-0.85, 0.5, -0.7, 0.7))
    box('roof', -0.86, 0.52, -0.71, 0.71, 1.4, 1.46, paint, bevel=0.02)
    box('pillarL', -0.2, 0.1, 0.79, 0.81, 0.86, 1.4, paint, top=(-0.2, 0.1, 0.69, 0.71))
    box('pillarR', -0.2, 0.1, -0.81, -0.79, 0.86, 1.4, paint, top=(-0.2, 0.1, -0.71, -0.69))
    box('bumperF', 2.24, 2.38, -hw, hw, 0.26, 0.5, trim, bevel=0.03)
    box('bumperR', -2.38, -2.24, -hw, hw, 0.26, 0.5, trim, bevel=0.03)
    box('grille', 2.29, 2.33, -0.42, 0.42, 0.5, 0.7, trim)
    box('sill', -1.5, 1.5, -hw - 0.01, hw + 0.01, 0.28, 0.36, trim)
    for s in (-1, 1):
        box(f'mirror{s}', 0.85, 1.0, s * 0.87, s * 1.0, 0.9, 1.0, paint) if s > 0 else box(f'mirror{s}', 0.85, 1.0, -1.0, -0.87, 0.9, 1.0, paint)
    if police:
        black = mat('doors', '#141418')
        box('doorsL', -1.1, 1.1, hw, hw + 0.012, 0.36, 0.84, black)
        box('doorsR', -1.1, 1.1, -hw - 0.012, -hw, 0.36, 0.84, black)
        box('bar', -0.35, 0.05, -0.62, 0.62, 1.46, 1.6, mat('lightbar', '#ffffff', True), bevel=0.02)
    car_lights(2.3, -2.3, 0.82, 0.62, 0.78)
    wheels([-1.42, 1.42], 0.78, 0.33, 0.24)


def sports():
    paint, glass, trim = mat('paint', '#ffffff'), mat('glass', '#22282f'), mat('trim', '#1c1c20')
    hw = 0.9
    box('body', -2.15, 2.15, -hw, hw, 0.24, 0.74, paint, top=(-2.1, 2.05, -hw + 0.04, hw - 0.04), bevel=0.06)
    box('hood', 0.4, 2.1, -0.8, 0.8, 0.74, 0.78, paint, top=(0.5, 2.0, -0.75, 0.75))
    box('cabin', -1.3, 0.45, -0.78, 0.78, 0.74, 1.18, glass, top=(-1.0, -0.05, -0.66, 0.66))
    box('roof', -1.0, -0.05, -0.66, 0.66, 1.18, 1.23, paint)
    box('wingL', -2.15, -1.95, 0.55, 0.62, 0.74, 1.0, trim)
    box('wingR', -2.15, -1.95, -0.62, -0.55, 0.74, 1.0, trim)
    box('wing', -2.25, -1.9, -0.88, 0.88, 1.0, 1.05, paint)
    box('bumperF', 2.08, 2.2, -hw, hw, 0.2, 0.42, trim)
    box('bumperR', -2.2, -2.08, -hw, hw, 0.2, 0.42, trim)
    box('sill', -1.4, 1.4, -hw - 0.01, hw + 0.01, 0.22, 0.32, trim)
    car_lights(2.15, -2.15, 0.85, 0.5, 0.62, 0.4)
    wheels([-1.32, 1.32], 0.8, 0.31, 0.26)


def truck():
    paint, glass, trim = mat('paint', '#ffffff'), mat('glass', '#26303a'), mat('trim', '#2a2a2e')
    box('cab', 1.55, 3.0, -1.05, 1.05, 0.55, 2.45, paint, top=(1.6, 2.85, -1.0, 1.0), bevel=0.05)
    box('windscreen', 2.86, 2.93, -0.95, 0.95, 1.45, 2.3, glass, top=(2.8, 2.86, -0.95, 0.95))
    box('sideWinL', 1.9, 2.8, 1.04, 1.06, 1.45, 2.25, glass)
    box('sideWinR', 1.9, 2.8, -1.06, -1.04, 1.45, 2.25, glass)
    box('cargo', -3.0, 1.5, -1.08, 1.08, 0.75, 2.95, paint, bevel=0.03)
    box('cargoDoor', -3.02, -2.98, -1.0, 1.0, 0.8, 2.9, mat('door', '#c8c8c8'))
    box('chassis', -2.9, 2.9, -0.8, 0.8, 0.35, 0.75, trim)
    box('bumperF', 2.95, 3.1, -1.05, 1.05, 0.35, 0.65, trim)
    car_lights(3.0, -3.0, 0.95, 0.75, 0.95, 0.65)
    wheels([-2.1, -1.4, 2.1], 0.9, 0.42, 0.3)


def scooter():
    paint, trim, seat = mat('paint', '#ffffff'), mat('trim', '#2a2a2e'), mat('seat', '#1c1c1e')
    box('floor', -0.55, 0.45, -0.2, 0.2, 0.25, 0.38, paint, bevel=0.03)
    box('rearbody', -0.8, -0.15, -0.22, 0.22, 0.3, 0.68, paint, top=(-0.75, -0.25, -0.2, 0.2), bevel=0.05)
    box('seat', -0.75, -0.2, -0.17, 0.17, 0.68, 0.76, seat, bevel=0.03)
    box('shield', 0.42, 0.6, -0.24, 0.24, 0.28, 1.0, paint, top=(0.38, 0.5, -0.2, 0.2), bevel=0.03)
    cyl('column', 0.5, 0, 1.1, 0.03, 0.2, trim)
    box('bars', 0.45, 0.55, -0.34, 0.34, 1.15, 1.2, trim)
    box('deliveryBox', -0.95, -0.45, -0.25, 0.25, 0.8, 1.2, mat('crate', '#c83a2e'), bevel=0.02)
    box('head', 0.58, 0.62, -0.08, 0.08, 0.88, 0.98, mat('light_head', '#fff1c8', True))
    box('tail', -0.97, -0.95, -0.1, 0.1, 0.88, 0.95, mat('light_tail', '#d82020', True))
    tyre = mat('tyre', '#18181a')
    for x in (-0.6, 0.6):
        cyl(f'tyre{x}', x, 0, 0.22, 0.22, 0.12, tyre, 'Y', 12)


def bike():
    paint, trim, chrome, seat = mat('paint', '#ffffff'), mat('trim', '#2a2a2e'), mat('chrome', '#a8acb2'), mat('seat', '#141416')
    box('engine', -0.3, 0.35, -0.2, 0.2, 0.3, 0.68, trim, bevel=0.04)
    box('tank', -0.15, 0.45, -0.22, 0.22, 0.7, 0.98, paint, top=(-0.05, 0.4, -0.16, 0.16), bevel=0.05)
    box('seat', -0.75, -0.12, -0.18, 0.18, 0.78, 0.9, seat, bevel=0.03)
    box('tail', -1.0, -0.7, -0.16, 0.16, 0.72, 0.92, paint, bevel=0.03)
    box('fairing', 0.45, 0.75, -0.3, 0.3, 0.8, 1.55, paint, top=(0.38, 0.55, -0.22, 0.22), bevel=0.04)
    box('backrest', -1.0, -0.92, -0.12, 0.12, 0.9, 1.6, chrome)
    cyl('exhaust', -0.5, 0.22, 0.42, 0.05, 0.9, chrome, 'X', 8)
    box('fork', 0.6, 0.68, -0.08, 0.08, 0.3, 0.85, chrome, top=(0.5, 0.58, -0.08, 0.08))
    box('head', 0.74, 0.78, -0.1, 0.1, 1.0, 1.12, mat('light_head', '#fff1c8', True))
    box('rear', -1.03, -1.0, -0.08, 0.08, 0.8, 0.86, mat('light_tail', '#d82020', True))
    tyre = mat('tyre', '#18181a')
    for x in (-0.72, 0.75):
        cyl(f'tyre{x}', x, 0, 0.32, 0.32, 0.14, tyre, 'Y', 14)


def train():
    """One carriage of the Wa-sen Loop Line: silver with a green stripe (colours are fixed, no "paint")."""
    silver, green, glass, dark = mat('silver', '#c9ced4'), mat('stripe', '#5fae3f'), mat('glass', '#26303a'), mat('dark', '#2a2c30')
    L, hw = 20.0, 1.45
    box('body', -L / 2, L / 2, -hw, hw, 0.9, 3.7, silver, bevel=0.08)
    box('stripeL', -L / 2, L / 2, hw, hw + 0.02, 1.6, 1.85, green)
    box('stripeR', -L / 2, L / 2, -hw - 0.02, -hw, 1.6, 1.85, green)
    for s in (-1, 1):
        y0, y1 = (hw, hw + 0.025) if s > 0 else (-hw - 0.025, -hw)
        box(f'windows{s}', -L / 2 + 0.6, L / 2 - 0.6, y0, y1, 2.0, 3.0, glass)
        for x in (-6.5, -2.2, 2.2, 6.5):
            box(f'door{s}{x}', x - 0.65, x + 0.65, y0 * 1.001, y1 * 1.001, 1.0, 3.2, mat('doorgrey', '#9aa0a6'))
    box('roofUnit', -2.0, 2.0, -0.8, 0.8, 3.7, 4.05, mat('roofgrey', '#8a8f96'))
    for x in (-7.0, 7.0):
        box(f'bogie{x}', x - 1.3, x + 1.3, -1.1, 1.1, 0.25, 0.9, dark)


# --------------------------------------------------------------------------------------
# Street furniture
# --------------------------------------------------------------------------------------

def lamp():
    """A modern street lamp, 4.6 m: a tapered pole, a curved arm, and a lamp head (which glows)."""
    grey = mat('pole', '#6c7076')
    cyl('pole', 0, 0, 2.3, 0.08, 4.6, grey, 'Z', 10, 0.06)
    box('base', -0.14, 0.14, -0.14, 0.14, 0, 0.5, grey, bevel=0.02)
    box('arm1', -0.04, 0.5, -0.04, 0.04, 4.45, 4.55, grey, top=(0.02, 0.55, -0.035, 0.035))
    box('arm2', 0.5, 0.9, -0.04, 0.04, 4.45, 4.52, grey)
    box('head', 0.62, 1.12, -0.13, 0.13, 4.33, 4.46, grey, bevel=0.02)
    box('glass', 0.66, 1.08, -0.1, 0.1, 4.31, 4.33, mat('light_lamp', '#fff1c8', True))


def traffic_light():
    """A Japanese traffic signal: pole on the corner, an arm out over the road (along +Y), a flat
    horizontal signal head facing +X with three round lamps. The game lights the lamps itself, at
    Blender y = 2.2 (blue-green), 2.6 (amber) and 3.0 (red), z = 4.55, just in front of x = 0.13."""
    grey, dark = mat('pole', '#7a7e84'), mat('housing', '#3a3e44')
    cyl('pole', 0, 0, 2.6, 0.09, 5.2, grey, 'Z', 10)
    box('arm', -0.05, 0.05, 0, 3.3, 4.85, 4.95, grey)
    box('head', -0.12, 0.12, 1.9, 3.3, 4.35, 4.75, dark, bevel=0.03)
    for y in (2.2, 2.6, 3.0):
        cyl(f'visor{y}', 0.16, y, 4.62, 0.17, 0.08, dark, 'X', 12)
        cyl(f'lens{y}', 0.125, y, 4.55, 0.15, 0.01, mat('lens', '#1a1d22'), 'X', 12)
    box('ped', 0.05, 0.3, -0.18, 0.18, 2.3, 2.95, dark, bevel=0.02)
    box('sign', 0.1, 0.13, -0.3, 0.3, 3.4, 3.7, mat('signblue', '#2d5fa8'))


def utility_pole():
    """A concrete utility pole, 9 m, with two cross arms and a transformer. Wires (drawn by the game)
    hang from the ends of the cross arms: Blender y = +/-0.75 at z = 8.3 and 7.7."""
    concrete, dark, grey = mat('concrete', '#a8a49c'), mat('arm', '#4a4c50'), mat('transformer', '#8e949a')
    cyl('pole', 0, 0, 4.5, 0.16, 9.0, concrete, 'Z', 10, 0.12)
    box('arm1', -0.06, 0.06, -0.85, 0.85, 8.24, 8.36, dark)
    box('arm2', -0.06, 0.06, -0.85, 0.85, 7.64, 7.76, dark)
    for z in (8.36, 7.76):
        for y in (-0.75, 0.0, 0.75):
            cyl(f'ins{z}{y}', 0, y, z + 0.06, 0.04, 0.12, mat('insulator', '#e8e4dc'), 'Z', 6)
    cyl('transformer', 0.32, 0, 6.6, 0.22, 0.9, grey, 'Z', 10)
    box('bracket', 0.0, 0.2, -0.05, 0.05, 6.5, 6.7, dark)
    box('plate', 0.15, 0.17, -0.12, 0.12, 2.2, 2.6, mat('plate', '#e0d8b0'))


# --------------------------------------------------------------------------------------
# Building kit: Asagiri (the old town)
# --------------------------------------------------------------------------------------

def roof_hip():
    """A tiled hip roof for the old town's low buildings, one unit square (the game stretches it to
    each building) and one unit tall, with the eaves overhanging the walls. The tiles are "paint",
    so each building keeps its own roof colour; ridges are dark."""
    tiles, ridge, eave = mat('paint', '#ffffff'), mat('ridge', '#2a2c30'), mat('eave', '#3a3028')
    bm = bmesh.new()
    a = [bm.verts.new(v) for v in ((-0.5, -0.5, 0), (0.5, -0.5, 0), (0.5, 0.5, 0), (-0.5, 0.5, 0), (-0.22, 0, 1), (0.22, 0, 1))]
    for f in ((0, 1, 5, 4), (2, 3, 4, 5), (1, 2, 5), (3, 0, 4)):
        bm.faces.new([a[i] for i in f])
    bm.faces.new([a[i] for i in (3, 2, 1, 0)])
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    link(bm, 'tiles', tiles)
    box('ridge', -0.25, 0.25, -0.03, 0.03, 0.97, 1.06, ridge)
    for (x0, y0, x1, y1) in ((-0.5, -0.5, 0.22, 0), (-0.5, 0, 0.22, 0.5)):
        pass
    box('eaves', -0.5, 0.5, -0.5, 0.5, -0.05, 0.0, eave)
    # corner ridges (the hips), as thin dark strips
    for sx in (-1, 1):
        for sy in (-1, 1):
            bm2 = bmesh.new()
            p0, p1 = Vector((sx * 0.5, sy * 0.5, 0.0)), Vector((sx * 0.22, 0, 1.0))
            side = Vector((sy * 0.02, -sx * 0.02, 0))
            v = [bm2.verts.new(p0 - side), bm2.verts.new(p0 + side), bm2.verts.new(p1 + side + Vector((0, 0, 0.04))), bm2.verts.new(p1 - side + Vector((0, 0, 0.04)))]
            bm2.faces.new(v)
            link(bm2, f'hip{sx}{sy}', ridge)


BUILD = {
    'roof_hip': roof_hip,
    'car_sedan': lambda: sedan(False), 'car_police': lambda: sedan(True), 'car_sports': sports,
    'car_truck': truck, 'car_scooter': scooter, 'car_bike': bike, 'train': train,
    'lamp': lamp, 'traffic_light': traffic_light, 'utility_pole': utility_pole,
}

if __name__ == '__main__':
    only = None
    if '--only' in sys.argv:
        only = set(sys.argv[sys.argv.index('--only') + 1].split(','))
    for name, make in BUILD.items():
        if only and name not in only:
            continue
        reset()
        make()
        save(name)
