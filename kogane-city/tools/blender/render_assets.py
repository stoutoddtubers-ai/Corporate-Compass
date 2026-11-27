"""
Kogane City asset pipeline: models every sprite in Blender and renders it from directly above.

Run with Blender's Python module (pip install bpy pillow):
    python tools/blender/render_assets.py
It writes one sprite sheet, public/assets/atlas.png, and src/data/atlas.json (where each
sprite sits in the sheet). Everything is rendered at twice game size for crisp scaling.
One Blender unit = one game pixel.
"""
import bpy, json, math, os, sys
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)
SCALE = 2  # render at 2x game size
ONLY = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else ''

# ---- colours copied from src/data/vehicles.ts and src/data/characters.ts ----
VEHICLES = {
    'sedan': dict(L=46, W=22, shape='car', colors=[0x8fa3b8, 0xb8b08f, 0x7d9c84, 0xa98f8f, 0xd9d9d9, 0x17171c]),
    'sports': dict(L=44, W=21, shape='sports', colors=[0xd8343a, 0xe8b923, 0x3aa0d8, 0x7a4ad8, 0x17171c]),
    'police': dict(L=46, W=22, shape='police', colors=[0xf2f2f2]),
    'scooter': dict(L=22, W=10, shape='scooter', colors=[0xe9e3d2]),
    'bike': dict(L=28, W=10, shape='bike', colors=[0x5b2a8a]),
    'truck': dict(L=56, W=24, shape='truck', colors=[0xe8e8e8, 0xd8b02a]),
}
LOOKS = {
    'jun': ('#17171c', '#2a2622', '#e8b923', 'back'), 'mika': ('#f0ece2', '#3a2a22', '#d8343a', 'head'),
    'goro': ('#7d8088', '#9a9a9a', '#3a3a3a', 'head'), 'sawada': ('#b9a37e', '#1c1a1a', None, None),
    'cop': ('#27408f', '#f2f2f2', '#e8c84a', 'chest'), 'thug': ('#101014', '#0c0c0c', '#8a1c1c', 'chest'),
    'raijin': ('#5b2a8a', '#e8d24a', '#f2f2f2', 'back'), 'kenta': ('#f2f2f2', '#e8d24a', '#5b2a8a', 'back'),
    'hikari': ('#3a3f55', '#28d8e8', '#f040a0', 'chest'), 'glitch': ('#15181c', '#28d8e8', '#28d8e8', 'back'),
    'ogata': ('#f4f4f0', '#2a2622', '#c9a84a', 'chest'), 'windbreaker': ('#2f6f8a', '#1c1a1a', '#f2f2f2', 'back'),
    'guard': ('#5a5f66', '#22242a', '#d8b02a', 'chest'), 'courier': ('#3a2f2a', '#0c0c0c', '#8a1c1c', 'chest'),
    'customer': ('#4f7f8a', '#55504a', None, None), 'elder': ('#8a7f6a', '#d8d8d8', None, None),
    'salaryman': ('#3d4a6a', '#1c1a1a', '#f2f2f2', 'chest'), 'student': ('#c9c9d6', '#2a2622', '#3a5aa8', 'back'),
    'grandmother': ('#a8788f', '#d8d8d8', None, None), 'rider': ('#3f9a5a', '#e04a3a', '#f2f2f2', 'back'),
    'builder': ('#c98a2a', '#f2d02a', None, None), 'shopkeeper': ('#35607a', '#3a2a22', '#f0ece2', 'chest'),
}

def rgb(c):
    if isinstance(c, str): c = int(c[1:], 16)
    f = lambda v: (v / 255) ** 2.2  # sRGB -> linear
    return (f(c >> 16), f((c >> 8) & 255), f(c & 255), 1)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = 'CYCLES'; s.cycles.device = 'CPU'; s.cycles.samples = 48
    s.cycles.use_denoising = False
    s.render.film_transparent = True
    s.view_settings.view_transform = 'Standard'
    s.render.image_settings.file_format = 'PNG'; s.render.image_settings.color_mode = 'RGBA'
    w = bpy.data.worlds.new('w'); s.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[1].default_value = 0.45
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.75, 0.8, 0.95, 1)
    bpy.ops.object.light_add(type='SUN', rotation=(math.radians(38), 0, math.radians(140)))
    sun = bpy.context.object; sun.data.energy = 2.4; sun.data.angle = math.radians(12)
    bpy.ops.object.camera_add(location=(0, 0, 200))
    s.camera = bpy.context.object; s.camera.data.type = 'ORTHO'; s.camera.data.clip_end = 500
    return s

MATS = {}
def mat(name, color, rough=0.5, metal=0.0, emit=0.0):
    key = (name, str(color), rough, metal, emit)
    if key in MATS: return MATS[key]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = rgb(color)
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = rgb(color); b.inputs['Emission Strength'].default_value = emit
    MATS[key] = m
    return m

def box(loc, size, m, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        b = o.modifiers.new('b', 'BEVEL'); b.width = bevel; b.segments = 3
        bpy.ops.object.shade_smooth()
    o.data.materials.append(m)
    return o

def ball(loc, scale, m):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=loc, segments=20, ring_count=10)
    o = bpy.context.object; o.scale = scale; bpy.ops.object.shade_smooth(); o.data.materials.append(m)
    return o

def cyl(loc, r, depth, m, rot=(0, 0, 0), verts=20):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.object; bpy.ops.object.shade_smooth(); o.data.materials.append(m)
    return o


def render(s, name, w, h):
    """Render a w x h (game pixels) area centred on the origin."""
    s.render.resolution_x = int(w * SCALE); s.render.resolution_y = int(h * SCALE)
    s.camera.data.ortho_scale = max(w, h)
    s.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)

# ---------------------------------------------------------------- vehicles
def vehicle(vid, v, ci):
    s = reset(); MATS.clear()
    L, W, shape, col = v['L'], v['W'], v['shape'], v['colors'][ci]
    paint = mat('paint', col, 0.32, 0.35); dark = mat('dark', 0x111114, 0.6); glass = mat('glass', 0x1a2a3c, 0.08, 0.6)
    tyre = mat('tyre', 0x0b0b0b, 0.9); head = mat('head', 0xfff3c0, 0.3, 0, 4); tail = mat('tail', 0xe03030, 0.3, 0, 2.5)
    chrome = mat('chrome', 0xc8ccd0, 0.2, 0.9)
    def wheels(xs, y, r=3.4, wd=3):
        for x in xs:
            for sy in (-1, 1): cyl((x, sy * y, r), r, wd, tyre, (math.pi / 2, 0, 0))
    def lights(x0, x1, y, z):
        for sy in (-1, 1):
            box((x1, sy * y, z), (1.4, 4, 2), head); box((x0, sy * y, z), (1.4, 4, 2), tail)
    if shape in ('car', 'police', 'sports'):
        sports = shape == 'sports'
        bh = 5 if sports else 6.5
        box((0, 0, 2 + bh / 2), (L, W, bh), paint, 2.6)
        box((L / 2 - 1.2, 0, 3.2), (2, W - 3, 2.5), dark, 0.6); box((-L / 2 + 1.2, 0, 3.2), (2, W - 3, 2.5), dark, 0.6)  # bumpers
        cx = -3 if sports else -1.5; cl = L * (0.4 if sports else 0.5)
        box((cx, 0, 2 + bh + 2), (cl, W - 3.5, 4.4), glass, 2.2)  # glasshouse
        box((cx - 0.5, 0, 2 + bh + 4.3), (cl * 0.62, W - 6.5, 0.9), mat('roof', 0xf2f2f2, 0.35, 0.2) if shape == 'police' else paint, 0.4)
        wheels((L * 0.3, -L * 0.3), W / 2 - 0.6)
        lights(-L / 2 + 0.6, L / 2 - 0.6, W / 2 - 4, 2 + bh - 1.6)
        if sports:
            box((-L / 2 + 2.5, 0, 2 + bh + 2.2), (3, W - 2, 0.8), dark, 0.3)  # spoiler
            for sy in (-1, 1): box((L * 0.3, sy * 2.2, 2 + bh + 0.05), (L * 0.3, 1.2, 0.2), mat('stripe', 0xf4f4f4, 0.4))
        if shape == 'police':
            blk = mat('blk', 0x15151a, 0.35, 0.3)
            box((L * 0.33, 0, 2 + bh + 0.06), (L * 0.3, W - 1.5, 0.3), blk, 0.1); box((-L * 0.36, 0, 2 + bh + 0.06), (L * 0.22, W - 1.5, 0.3), blk, 0.1)
            box((cx - 0.5, -3.2, 2 + bh + 5.4), (3, 5.6, 1.6), mat('red', 0xff2020, 0.3, 0, 3), 0.3)
            box((cx - 0.5, 3.2, 2 + bh + 5.4), (3, 5.6, 1.6), mat('blue', 0x2060ff, 0.3, 0, 3), 0.3)
    elif shape == 'truck':
        box((-7, 0, 9), (L - 15, W, 14), paint, 1.2)  # cargo box
        for x in range(-int(L / 2) + 6, int(L / 2) - 16, 7): box((x, 0, 16.1), (0.8, W - 2, 0.4), mat('rib', 0x9a9a9a, 0.5, 0.4))
        box((L / 2 - 7, 0, 6.5), (13, W - 1, 9), mat('cab', 0x3a4250, 0.4, 0.3), 2)
        box((L / 2 - 5, 0, 10.5), (7, W - 4, 2.5), glass, 0.8)
        wheels((L * 0.3, -L * 0.28), W / 2 - 0.6, 4, 3.4); lights(-L / 2 + 0.6, L / 2 - 0.6, W / 2 - 4, 5)
    else:  # scooter / bike
        bike = shape == 'bike'
        for x in (L / 2 - 3.2, -L / 2 + 3.2): cyl((x, 0, 3.2), 3.2, 2.2, tyre, (math.pi / 2, 0, 0))
        box((0, 0, 5), (L - 5, 5 if bike else 6, 4), paint, 1.6)
        box((-1.5, 0, 7.4), (8, 3.6, 1.4), dark, 0.6)  # seat
        box((L / 2 - 6, 0, 8.5), (1.4, W - 1, 1.2), chrome, 0.3)  # handlebars
        box((L / 2 - 2.4, 0, 6.4), (1.4, 2.4, 2), head)
        if bike:
            box((L / 2 - 7, 0, 9.5), (4, 6.5, 5), mat('fair', 0xf2f2f2, 0.3, 0.2), 1.4)  # tall fairing
            for sy in (-1, 1): cyl((-L / 2 + 6, sy * 2.6, 4.5), 0.9, 8, chrome, (0, math.pi / 2, 0))
        else:
            box((-L / 2 + 4.5, 0, 8.5), (7, W - 1.5, 6), mat('boxw', 0xf4f0e6, 0.5), 0.8)  # soup rack
            box((-L / 2 + 4.5, 0, 11.7), (5, W - 4, 0.5), mat('boxr', 0xb3312f, 0.5), 0.2)
    render(s, f'car_{vid}_{ci}', L + 6, W + 6)

# ---------------------------------------------------------------- people
def person(lid, look):
    s = reset(); MATS.clear()
    jacket, hair, accent, at = look
    j = mat('j', jacket, 0.7); skin = mat('skin', '#e0b08a', 0.6); h = mat('h', hair, 0.5)
    ball((-0.6, 0, 5.5), (4.0, 7.0, 3.2), j)  # shoulders
    for sy in (-1, 1):
        ball((3.2, sy * 5.4, 5.4), (3.6, 1.7, 1.7), j); ball((6.8, sy * 4.6, 5.4), (1.4, 1.4, 1.4), skin)  # arms, hands
    box((8.2, 2.0, 5.6), (4.6, 1.3, 1.3), mat('gun', 0x151515, 0.4, 0.5), 0.2)
    ball((1.2, 0, 9.4), (3.0, 3.0, 3.0), skin)  # face peeks out in front
    ball((0.2, 0, 10.0), (3.3, 3.4, 3.2), h)  # hair / hat
    if accent and at == 'back': box((-3.6, 0, 8.2), (1.2, 5, 1.4), mat('a', accent, 0.5), 0.3)
    if accent and at == 'chest': box((3.0, 0, 8.3), (1.0, 2.6, 1.0), mat('a', accent, 0.5), 0.2)
    if accent and at == 'head': box((0.2, 0, 12.6), (4.6, 6.4, 1.4), mat('a', accent, 0.5), 0.6)
    render(s, f'p_{lid}', 22, 22)

# ---------------------------------------------------------------- roof materials (tileable, grey: tinted in game)
def roof_tile(name):
    s = reset(); MATS.clear()
    g = mat('g', 0x8e8e8e, 0.7)
    box((0, 0, -1), (200, 200, 2), g)
    if name == 'tile':  # kawara: rows of half-round tiles, repeating every 8
        for y in range(-48, 49, 8):
            for x in range(-48, 49, 8): cyl((x, y, 0), 3.6, 7.6, g, (math.pi / 2, 0, 0), 12)
            box((0, y + 4, 0.4), (200, 1.0, 1.6), mat('d', 0x5a5a5a, 0.7))
    elif name == 'metal':  # corrugated sheet, ridges every 4
        for x in range(-48, 49, 4): cyl((x, 0, 0), 1.6, 200, g, (math.pi / 2, 0, 0), 10)
    elif name == 'plank':  # boards every 8 with a gap
        for i, x in enumerate(range(-48, 49, 8)): box((x, 0, 0.6 + (i % 2) * 0.25), (7.2, 200, 1.2), g, 0.3)
    elif name == 'flat':  # concrete slabs with joints every 32
        for x in range(-64, 65, 32):
            for y in range(-64, 65, 32): box((x, y, 0.3), (31.2, 31.2, 0.6), g, 0.4)
    render(s, f'roof_{name}', 32, 32)

# ---------------------------------------------------------------- props (with their own soft shadow)
def prop(name):
    s = reset(); MATS.clear()
    steel = mat('steel', 0xaab2ba, 0.35, 0.7); grey = mat('grey', 0x8a9096, 0.6); dark = mat('dark', 0x33373c, 0.6)
    size = 28
    if name == 'ac':  # air-conditioning unit with a fan
        box((0, 0, 4), (20, 14, 8), grey, 1); cyl((0, 0, 8.2), 5.2, 0.6, dark); cyl((0, 0, 8.6), 1.2, 0.6, steel)
        for a in range(0, 360, 60): box((math.cos(math.radians(a)) * 2.8, math.sin(math.radians(a)) * 2.8, 8.6), (4, 0.8, 0.3), steel).rotation_euler = (0, 0, math.radians(a))
    elif name == 'tank':  # water tank
        cyl((0, 0, 9), 9, 12, mat('tank', 0x7f9fb0, 0.4, 0.3), verts=28); cyl((0, 0, 15.4), 9.4, 1, steel, verts=28); cyl((0, 0, 16.2), 2, 1, dark)
    elif name == 'vent':
        cyl((0, 0, 5), 4, 10, steel); cyl((0, 0, 10.6), 5.4, 1.2, dark); size = 18
    elif name == 'skylight':
        box((0, 0, 2), (22, 12, 4), grey, 0.6); box((0, 0, 4.2), (19, 9, 0.6), mat('gl', 0x9fd0e8, 0.05, 0.5), 0.2)
    elif name == 'dish':
        cyl((0, 0, 3), 1, 6, dark); ball((0, 0, 7), (7, 7, 1.6), mat('dish', 0xe8e8e8, 0.4)); size = 20
    elif name == 'solar':
        box((0, 0, 2), (24, 14, 1.2), mat('sol', 0x1c2f5a, 0.15, 0.6), 0.2)
        for x in (-8, 0, 8): box((x, 0, 2.7), (0.5, 14, 0.2), steel)
    elif name.startswith('vending'):
        c = {'vending0': 0xe04a4a, 'vending1': 0x4a9ae0, 'vending2': 0xf2f2f2}[name]
        box((0, 0, 9), (13, 9, 18), mat('v', c, 0.4, 0.2), 0.8); box((0, -4.6, 11), (10, 0.4, 9), mat('lit', 0xffffff, 0.3, 0, 2.5)); size = 20
    elif name == 'lamp':
        cyl((0, 0, 14), 1.1, 28, dark); box((3, 0, 28), (8, 1.4, 1), dark); ball((6.5, 0, 27.4), (1.8, 1.8, 1), mat('bulb', 0xffe2b0, 0.3, 0, 6)); size = 20
    elif name == 'tree':
        cyl((0, 0, 5), 1.6, 10, mat('trunk', 0x5a4030, 0.8))
        for (x, y, z, r) in ((0, 0, 14, 9), (5, 3, 12, 6), (-5, -2, 12, 6.5), (1, -5, 13, 6)): ball((x, y, z), (r, r, r * 0.8), mat('leaf', 0x3f7a45, 0.8))
    render(s, f'prop_{name}', size, size)

# ---------------------------------------------------------------- run everything, then pack the sheet
jobs = []
for vid, v in VEHICLES.items():
    for ci in range(len(v['colors'])): jobs.append(('car', lambda vid=vid, v=v, ci=ci: vehicle(vid, v, ci)))
for lid, look in LOOKS.items(): jobs.append(('person', lambda lid=lid, look=look: person(lid, look)))
for n in ('tile', 'metal', 'plank', 'flat'): jobs.append(('roof', lambda n=n: roof_tile(n)))
for n in ('ac', 'tank', 'vent', 'skylight', 'dish', 'solar', 'vending0', 'vending1', 'vending2', 'lamp', 'tree'): jobs.append(('prop', lambda n=n: prop(n)))
for kind, job in jobs:
    if not ONLY or ONLY == kind: job()

from PIL import Image, ImageFilter
# props get a soft drop shadow, added here so it is easy to tune
for f in os.listdir(OUT):
    if not f.startswith('prop_'): continue
    im = Image.open(os.path.join(OUT, f)).convert('RGBA')
    a = im.split()[3]
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
    sh.paste(Image.new('RGBA', im.size, (0, 0, 0, 110)), (3 * SCALE, 3 * SCALE), a)
    sh = sh.filter(ImageFilter.GaussianBlur(1.5 * SCALE))
    sh.alpha_composite(im)
    sh.save(os.path.join(OUT, f))
files = sorted(f for f in os.listdir(OUT) if f.endswith('.png'))
imgs = [(f[:-4], Image.open(os.path.join(OUT, f)).convert('RGBA')) for f in files]
PAD, SHEET_W = 2, 1024
x = y = PAD; row = 0; frames = {}
for name, im in sorted(imgs, key=lambda t: -t[1].height):
    if x + im.width + PAD > SHEET_W: x = PAD; y += row + PAD; row = 0
    frames[name] = dict(x=x, y=y, w=im.width, h=im.height); x += im.width + PAD; row = max(row, im.height)
sheet = Image.new('RGBA', (SHEET_W, y + row + PAD), (0, 0, 0, 0))
for name, im in imgs: sheet.paste(im, (frames[name]['x'], frames[name]['y']))
os.makedirs(os.path.join(ROOT, 'public', 'assets'), exist_ok=True)
sheet.save(os.path.join(ROOT, 'public', 'assets', 'atlas.png'), optimize=True)
json.dump(dict(scale=SCALE, frames=frames), open(os.path.join(ROOT, 'src', 'data', 'atlas.json'), 'w'), indent=1)
print('ATLAS', sheet.size, len(frames), 'sprites')
