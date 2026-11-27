"""
Kogane City asset pipeline: models every sprite in Blender and renders it from directly above.

Run with Blender's Python module (pip install bpy pillow):
    python tools/blender/render_assets.py
It writes one sprite sheet, public/assets/atlas.png, and src/data/atlas.json (where each
sprite sits in the sheet). Everything is rendered at twice game size for crisp scaling.
One Blender unit = one game pixel.
"""
import bpy, json, math, os, sys
from mathutils import Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)
SCALE = 2  # render at 2x game size
# The game's camera is tilted about 45 degrees: halfway between overhead and behind the
# shoulder. The game gets that by squashing the whole world vertically (MAP.squash) and
# leaning anything with height up the screen. Models are leaned the same way here before
# being rendered from above; after the game's squash that is exactly what a tilted camera
# sees. TILT is pixels of lean per pixel of height and must equal MAP.tilt in src/data/map.ts.
TILT = 1.0
DIRS = 16
ONLY = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else ''
# '--looks a,b,c' renders just those characters (all poses and the portrait)
ONLY_LOOKS = sys.argv[sys.argv.index('--looks') + 1].split(',') if '--looks' in sys.argv else None

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
    # Act 2-3 cast and factions
    'saeko': ('#f4f4f0', '#141218', '#8a8f98', 'back'), 'genzo': ('#22222a', '#c8c8c8', '#6a4a2a', 'chest'),
    'mibu': ('#6a1f2e', '#101010', '#e8c84a', 'chest'), 'amane': ('#0e0e12', '#d0d4dc', '#9aa0aa', 'chest'),
    'tetsu': ('#1a1c20', '#8a8a8a', '#4a5a3a', 'chest'), 'hachiro': ('#d8d2c0', '#e0b08a', '#2a5a8a', 'chest'),
    'pip': ('#28d8e8', '#3a2a22', '#15181c', 'back'), 'fujita': ('#6f7078', '#2a2622', '#f2f2f2', 'chest'),
    'yatagarasu': ('#e8e8f0', '#1a1c20', '#9aa0aa', 'chest'), 'umibozu': ('#2f8f86', '#3a2a22', '#d8702a', 'back'),
    'riot': ('#1e2a4a', '#1a1c20', '#f2f2f2', 'back'), 'priest': ('#c8a030', '#e0b08a', None, None),
    'mama': ('#a02a5a', '#2a1a1a', '#f0d030', 'chest'),
}

def rgb(c):
    if isinstance(c, str): c = int(c[1:], 16)
    f = lambda v: (v / 255) ** 2.2  # sRGB -> linear
    return (f(c >> 16), f((c >> 8) & 255), f(c & 255), 1)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = 'CYCLES'; s.cycles.device = 'CPU'; s.cycles.samples = 24
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


ORIGIN = {}  # frame name -> where the model's footprint centre sits in the picture (0..1 from the top)

def render_dirs(s, name, size, tall=0.0, dirs=DIRS):
    """
    Render the scene's model leaning up-screen, once per direction (0 = facing right, then
    clockwise). `tall` is the model's height: the picture gets that much extra room on top.
    """
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    base = [o.matrix_world.copy() for o in objs]
    extra = tall * TILT
    shear = Matrix.Identity(4); shear[1][2] = TILT if tall else 0
    for i in range(dirs):
        m = shear @ Matrix.Rotation(-i * 2 * math.pi / dirs, 4, 'Z')
        for o, b in zip(objs, base): o.matrix_world = m @ b
        n = name if dirs == 1 else f'{name}_d{i}'
        render(s, n, size, size + extra, extra / 2)
        ORIGIN[n] = 0.5 + (extra / 2) / (size + extra)

def render(s, name, w, h, cy=0.0):
    """Render a w x h (game pixels) area centred on (0, cy)."""
    s.camera.location = (0, cy, 200)
    s.render.resolution_x = int(w * SCALE); s.render.resolution_y = int(h * SCALE)
    s.camera.data.ortho_scale = max(w, h)
    s.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)

def taper(loc, size, top, m, bevel=0.0):
    """A box whose top face is shrunk (top = (x, y) scale): sloped glass, wedge bonnets."""
    import bmesh
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    for v in bm.verts:
        if v.co.z > 0: v.co.x *= top[0]; v.co.y *= top[1]
    bm.to_mesh(o.data); bm.free()
    if bevel:
        b = o.modifiers.new('b', 'BEVEL'); b.width = bevel; b.segments = 3
        bpy.ops.object.shade_smooth()
    o.data.materials.append(m)
    return o

# ---------------------------------------------------------------- vehicles
def vehicle(vid, v, ci):
    s = reset(); MATS.clear()
    L, W, shape, col = v['L'], v['W'], v['shape'], v['colors'][ci]
    paint = mat('paint', col, 0.28, 0.45); dark = mat('dark', 0x111114, 0.6); glass = mat('glass', 0x0a1018, 0.22, 0.0)
    tyre = mat('tyre', 0x0b0b0b, 0.9); head = mat('head', 0xfff3c0, 0.3, 0, 5); tail = mat('tail', 0xe03030, 0.3, 0, 3)
    chrome = mat('chrome', 0xc8ccd0, 0.18, 0.95); trim = mat('trim', 0x1c1c20, 0.5, 0.3)
    def wheels(xs, y, r=3.4, wd=3):
        for x in xs:
            for sy in (-1, 1):
                cyl((x, sy * y, r), r, wd, tyre, (math.pi / 2, 0, 0)); cyl((x, sy * (y + wd / 2), r), r * 0.55, 0.4, chrome, (math.pi / 2, 0, 0))
    def lights(x0, x1, y, z, wide=4.5):
        for sy in (-1, 1):
            box((x1, sy * y, z), (1.6, wide, 2), head, 0.3); box((x0, sy * y, z), (1.6, wide, 2), tail, 0.3)
    def mirrors(x, z):
        for sy in (-1, 1): box((x, sy * (W / 2 + 0.9), z), (2, 1.8, 1.2), paint, 0.3)
    if shape in ('car', 'police', 'sports'):
        sports = shape == 'sports'
        bh = 4.6 if sports else 6.2
        box((0, 0, 2 + bh / 2), (L, W, bh), paint, 2.8)                                   # lower body
        for sy in (-1, 1):                                                                # sills and wheel arches
            box((0, sy * (W / 2 - 0.3), 2.6), (L * 0.52, 1, 1.6), trim, 0.3)
            for x in (L * 0.3, -L * 0.3): box((x, sy * (W / 2 - 0.2), 2 + bh - 0.6), (9.5, 1.4, 1.4), paint, 0.6)
        box((L / 2 - 1.1, 0, 3.3), (2.2, W - 2.5, 2.6), trim, 0.7); box((-L / 2 + 1.1, 0, 3.3), (2.2, W - 2.5, 2.6), trim, 0.7)  # bumpers
        box((L / 2 - 0.4, 0, 4.2), (0.8, W * 0.42, 1.4), chrome, 0.2)                     # grille
        box((-L / 2 + 0.3, 0, 4.4), (0.6, 5.5, 1.6), mat('plate', 0xf4f4e8, 0.5))         # number plate
        cx = -3.5 if sports else -1.5; cl = L * (0.44 if sports else 0.52); gh = 3.8 if sports else 4.8
        taper((cx, 0, 2 + bh + gh / 2), (cl, W - 2.6, gh), (0.62, 0.8), glass, 1.2)       # glasshouse: sloped screens
        rl = cl * 0.46
        box((cx - 0.3, 0, 2 + bh + gh + 0.1), (rl, (W - 2.6) * 0.74, 0.8), mat('roofw', 0xf2f2f2, 0.3, 0.3) if shape == 'police' else paint, 0.5)  # roof
        for sy in (-1, 1): box((cx - 0.3, sy * (W - 2.6) * 0.4, 2 + bh + gh * 0.5), (rl * 0.12, 0.8, gh), paint, 0.2)  # door pillars
        for sy in (-1, 1): box((cx + cl * 0.02, sy * (W / 2 - 0.2), 2 + bh * 0.55), (0.35, 0.5, bh * 0.7), trim)  # door line
        box((L * 0.33, 0, 2 + bh + 0.05), (L * 0.22, 0.3, 0.2), trim)                     # bonnet crease
        mirrors(cx + cl * 0.36, 2 + bh + 0.9)
        wheels((L * 0.3, -L * 0.3), W / 2 - 0.7)
        lights(-L / 2 + 0.7, L / 2 - 0.7, W / 2 - 4.2, 2 + bh - 1.5)
        if sports:
            for sy in (-1, 1): box((-L / 2 + 3, sy * (W / 2 - 3), 2 + bh + 1.4), (1, 1, 2.6), trim)
            box((-L / 2 + 2.6, 0, 2 + bh + 3), (3.6, W - 1, 0.7), trim, 0.3)               # wing
            taper((L * 0.3, 0, 2 + bh + 0.6), (7, 5, 1.2), (0.7, 0.7), trim, 0.3)          # bonnet scoop
            for sy in (-1, 1): box((L * 0.34, sy * 2.4, 2 + bh + 0.08), (L * 0.24, 1.3, 0.12), mat('stripe', 0xf4f4f4, 0.4)); box((cx - 0.3, sy * 2.4, 2 + bh + gh + 0.55), (rl, 1.3, 0.12), mat('stripe', 0xf4f4f4, 0.4))
        if shape == 'police':
            blk = mat('blk', 0x15151a, 0.3, 0.4)
            box((L * 0.32, 0, 2 + bh + 0.06), (L * 0.3, W - 1.2, 0.3), blk, 0.1); box((-L * 0.37, 0, 2 + bh + 0.06), (L * 0.2, W - 1.2, 0.3), blk, 0.1)
            box((cx - 0.3, 0, 2 + bh + gh + 0.8), (3.4, W * 0.62, 0.8), trim, 0.2)
            box((cx - 0.3, -3.4, 2 + bh + gh + 1.5), (3, 5.4, 1.4), mat('red', 0xff2020, 0.3, 0, 4), 0.4)
            box((cx - 0.3, 3.4, 2 + bh + gh + 1.5), (3, 5.4, 1.4), mat('blue', 0x2060ff, 0.3, 0, 4), 0.4)
    elif shape == 'truck':
        box((-7.5, 0, 9.5), (L - 15, W, 14), paint, 1.0)                                   # cargo box
        for x in range(-int(L / 2) + 5, int(L / 2) - 17, 6): box((x, 0, 16.6), (0.9, W - 1.5, 0.5), mat('rib', 0xa8a8a8, 0.45, 0.5), 0.2)
        box((-7.5, 0, 16.4), (L - 17, 1.2, 0.5), mat('rib', 0xa8a8a8, 0.45, 0.5))
        cab = mat('cab', 0x3a4250, 0.35, 0.4)
        box((L / 2 - 7, 0, 6.5), (13, W - 1, 9), cab, 2.2)
        taper((L / 2 - 6.5, 0, 12), (9, W - 3, 3.5), (0.7, 0.85), glass, 0.8); box((L / 2 - 7.5, 0, 14), (5, W - 6, 0.6), cab, 0.3)
        box((L / 2 - 0.5, 0, 4), (1, W - 3, 3), trim, 0.5)
        for sy in (-1, 1): box((L / 2 - 6, sy * (W / 2 + 1), 9), (2.2, 2, 3), trim, 0.4)
        wheels((L * 0.32, -L * 0.2, -L * 0.34), W / 2 - 0.6, 4, 3.4); lights(-L / 2 + 0.6, L / 2 - 0.4, W / 2 - 4, 5)
    else:  # scooter / bike, with the frame, forks and mudguards visible from above
        bike = shape == 'bike'
        for x in (L / 2 - 3.4, -L / 2 + 3.4):
            cyl((x, 0, 3.4), 3.4, 2.4, tyre, (math.pi / 2, 0, 0)); box((x, 0, 6.4), (5.5, 3, 0.8), paint, 0.4)  # tyre + mudguard
        taper((-0.5, 0, 5.2), (L - 11, 6 if bike else 7, 4.4), (0.8, 0.6), paint, 1.6)   # body / tank
        box((-2.5, 0, 8), (9 if bike else 8, 4, 1.6), mat('seat', 0x1a1a1c, 0.75), 0.7)   # seat
        box((L / 2 - 6.5, 0, 9), (1.2, W + 1, 1.1), chrome, 0.4)                          # handlebars
        for sy in (-1, 1): box((L / 2 - 6.5, sy * (W / 2 + 0.3), 9.2), (2.4, 1.4, 1.4), trim, 0.5)  # grips
        box((L / 2 - 4.5, 0, 6.8), (3.4, 3.4, 3), paint, 1.2); box((L / 2 - 2.6, 0, 7), (0.9, 2.6, 2), head, 0.4)  # headlamp
        box((-L / 2 + 1.2, 0, 6.6), (0.8, 2.6, 1.2), tail, 0.3)
        if bike:
            taper((L / 2 - 7, 0, 11), (4.5, 8.5, 6), (0.5, 0.7), mat('fair', 0xf2f2f2, 0.3, 0.3), 1.4)  # tall fairing
            for sy in (-1, 1): cyl((-L / 2 + 6.5, sy * 3.1, 4.6), 1.0, 9, chrome, (0, math.pi / 2, 0))   # twin pipes
            box((-L / 2 + 4, 0, 10), (1.2, 4, 5), trim, 0.4)                                # sissy bar
        else:
            box((-L / 2 + 5, 0, 9), (7.5, W - 1, 6.5), mat('boxw', 0xf4f0e6, 0.5), 0.9)     # soup rack
            box((-L / 2 + 5, 0, 12.5), (5.5, W - 3.5, 0.6), mat('boxr', 0xb3312f, 0.5), 0.2)
            box((2.5, 0, 4.4), (6, W - 1, 1), trim, 0.4)                                    # footboard
    render_dirs(s, f'car_{vid}_{ci}', L + 14, 18)

# ---------------------------------------------------------------- people: 3 frames (standing, left step, right step)
HATS = {'riot': 'helmet', 'yatagarasu': 'cap', 'mama': 'bun', 'cop': 'cap', 'builder': 'helmet', 'mika': 'bandana', 'goro': 'goggles', 'rider': 'helmet', 'grandmother': 'bun', 'hikari': 'spiky', 'glitch': 'hood', 'kenta': 'pomp', 'raijin': 'pomp'}
def person(lid, look, frame):
    s = reset(); MATS.clear()
    jacket, hair, accent, at = look
    j = mat('j', jacket, 0.75); skin = mat('skin', '#e0b08a', 0.6); h = mat('h', hair, 0.5); shoe = mat('shoe', 0x1a1612, 0.7)
    if frame == 4:  # knocked down: lying flat on the ground
        ball((0, 0, 2.3), (6.5, 4.4, 2.3), j); ball((8.6, 0, 2.6), (2.9, 2.9, 2.6), skin); ball((8.0, 0, 3.0), (3.0, 3.1, 2.6), h)
        for sy in (-1, 1):
            ball((1.5, sy * 6.6, 1.5), (2, 3.6, 1.4), j); ball((2, sy * 10, 1.4), (1.3, 1.3, 1.2), skin)
            ball((-8.5, sy * 2.2, 1.6), (4.6, 1.6, 1.5), mat('legs', 0x2a2a30, 0.8)); ball((-13, sy * 2.4, 1.6), (1.6, 1.5, 1.4), shoe)
        if accent and at == 'back': box((0, 0, 4.4), (4, 5, 0.6), mat('a', accent, 0.5), 0.2)
        render_dirs(s, f'p_{lid}_{frame}', 24, 14)
        return
    step = {0: 0, 1: 1, 2: -1, 3: 0}[frame]
    for sy in (-1, 1):                                    # feet: one forward, one back when walking
        ball((sy * step * 3.4, sy * 2.4, 1.4), (2.6, 1.5, 1.2), shoe)
    ball((-0.6, 0, 5.5), (3.8, 7.0, 3.2), j)              # shoulders
    ball((-0.9, 0, 5.0), (3.2, 4.6, 3.4), j)              # back
    for sy in (-1, 1):                                    # arms swing opposite to the feet
        ax = 3.0 - sy * step * 2.2
        if frame == 3 and sy == 1:  # punching: this arm is thrown forward
            ball((6.5, sy * 4.2, 5.8), (5.2, 1.8, 1.8), j); ball((11.6, sy * 3.8, 5.8), (1.9, 1.9, 1.7), skin); continue
        ball((ax, sy * 5.5, 5.4), (3.3, 1.7, 1.7), j); ball((ax + 3.4, sy * 4.8, 5.3), (1.4, 1.4, 1.3), skin)
    ball((1.3, 0, 9.3), (2.9, 2.9, 2.9), skin)            # face peeks out in front
    hat = HATS.get(lid)
    if hat == 'hood': ball((-0.2, 0, 9.8), (3.9, 3.9, 3.5), j)
    else: ball((0.1, 0, 9.9), (3.2, 3.3, 3.2), h)        # hair
    if hat == 'cap': cyl((0.2, 0, 12.4), 3.5, 1.4, h); box((3.4, 0, 11.8), (2.6, 4.6, 0.5), mat('peak', 0x15151a, 0.4), 0.2)
    if hat == 'helmet': ball((0.1, 0, 10.6), (3.9, 3.9, 3.2), h); box((3.6, 0, 10.4), (1.6, 5, 0.6), h, 0.2)
    if hat == 'bandana': box((0.3, 0, 12.6), (5.2, 6.6, 1.2), mat('a', accent, 0.6), 0.6)
    if hat == 'goggles': box((2.8, 0, 11.6), (1.4, 5.6, 1.4), mat('a', accent, 0.3, 0.6), 0.4)
    if hat == 'bun': ball((-2.4, 0, 12.2), (1.8, 1.8, 1.6), h)
    if hat == 'spiky':
        for a in range(0, 360, 60): ball((0.1 + math.cos(math.radians(a)) * 2.6, math.sin(math.radians(a)) * 2.6, 11.8), (1.5, 1.5, 1.3), h)
    if hat == 'pomp': ball((2.6, 0, 11.6), (2.2, 2.4, 1.6), h)
    if accent and at == 'back': box((-3.7, 0, 8.0), (1.0, 5.4, 1.8), mat('a', accent, 0.5), 0.3)
    if accent and at == 'chest' and not hat == 'cap': box((3.0, 0, 8.2), (1.0, 2.4, 1.0), mat('a', accent, 0.5), 0.2)
    if accent and at == 'chest' and hat == 'cap': box((2.6, 2.6, 8.4), (0.8, 1.4, 0.8), mat('a', accent, 0.3, 0.8), 0.2)
    render_dirs(s, f'p_{lid}_{frame}', 24, 14)

# ---------------------------------------------------------------- portraits for cutscene text boxes (front view)
def bust(lid, look):
    s = reset(); MATS.clear()
    jacket, hair, accent, at = look
    j = mat('j', jacket, 0.75); skin = mat('skin', '#e0b08a', 0.55); h = mat('h', hair, 0.45); ink = mat('ink', 0x1a1414, 0.6)
    bpy.ops.object.light_add(type='SUN', rotation=(math.radians(65), 0, math.radians(-25))); bpy.context.object.data.energy = 2.2
    s.camera.location = (0, -200, 17); s.camera.rotation_euler = (math.pi / 2, 0, 0)
    ball((0, 0, 3), (15, 7, 9), j)                           # shoulders
    cyl((0, 0, 11), 3.2, 5, mat('neck', '#c99870', 0.6))
    ball((0, 0, 19), (7.2, 6.8, 8.2), skin)                  # head
    for sx in (-1, 1):
        ball((sx * 7, 0, 18.5), (1.3, 1.6, 2.2), skin)       # ears
        ball((sx * 2.9, -6.3, 19.6), (1.0, 0.6, 1.2), ink)   # eyes
        box((sx * 2.9, -6.6, 21.6), (2.8, 0.5, 0.6), ink)    # brows
    box((0, -6.6, 15.4), (3.2, 0.5, 0.6), mat('mouth', 0x6a2a2a, 0.6))
    ball((0, -7, 17.6), (0.9, 0.8, 1.1), mat('nose', '#d0a07c', 0.6))
    hat = HATS.get(lid)
    ball((0, 1.2, 22.6), (7.8, 7.4, 6.4), j if hat == 'hood' else h)   # hair
    if hat not in ('cap', 'helmet', 'hood'):
        for sx in (-1, 1): ball((sx * 6.6, 0.5, 20.5), (1.8, 5, 4.6), h)   # sides
    if hat == 'cap': cyl((0, 0.5, 26.6), 8.2, 2.8, h); box((0, -7.5, 25.2), (11, 5, 0.8), ink, 0.3); box((0, -7.6, 26.6), (2.4, 0.6, 1.8), mat('badge', 0xe8c84a, 0.3, 0.8))
    if hat == 'helmet': ball((0, 0, 24), (8.6, 8.2, 6.6), h)
    if hat == 'bandana': box((0, -1, 25.4), (16, 13, 2.4), mat('a', accent, 0.6), 0.8)
    if hat == 'goggles': box((0, -5.4, 25.6), (13, 3, 2.6), mat('a', accent, 0.3, 0.6), 0.8)
    if hat == 'bun': ball((0, 2, 30), (3.2, 3.2, 3), h)
    if hat == 'spiky':
        for sx in (-6, -2, 2, 6): taper((sx, 0, 29), (3.2, 4, 5), (0.15, 0.3), h, 0.3)
    if hat == 'pomp': ball((0, -4.5, 27.5), (5.6, 4.4, 3.6), h)
    if accent and at != 'head':
        box((0, -6.6, 6), (2.2, 0.8, 7), mat('a', accent, 0.5), 0.3)    # tie / zip / stripe
    box((-4, -6.2, 9), (4.6, 0.8, 1.6), j, 0.3).rotation_euler = (0, math.radians(35), 0)   # collar
    box((4, -6.2, 9), (4.6, 0.8, 1.6), j, 0.3).rotation_euler = (0, math.radians(-35), 0)
    s.render.film_transparent = True
    s.camera.location = (0, -200, 17)
    s.render.resolution_x = s.render.resolution_y = 36 * SCALE; s.camera.data.ortho_scale = 36
    s.render.filepath = os.path.join(OUT, f'f_{lid}.png')
    bpy.ops.render.render(write_still=True)

# ---------------------------------------------------------------- ground tiles (grey: coloured in game) and decals
def noisy(name, color, scale, bump, rough=0.9, contrast=0.08, seed=0.0):
    """A material with fine speckle and bumps (asphalt, water)."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = 8
    mp = nt.nodes.new('ShaderNodeMapping'); tc = nt.nodes.new('ShaderNodeTexCoord'); mp.inputs['Location'].default_value = (seed, seed * 2, 0)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], n.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); c = rgb(color)
    ramp.color_ramp.elements[0].color = tuple(max(0, v - contrast) for v in c[:3]) + (1,)
    ramp.color_ramp.elements[1].color = tuple(min(1, v + contrast) for v in c[:3]) + (1,)
    nt.links.new(n.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    bn = nt.nodes.new('ShaderNodeBump'); bn.inputs['Strength'].default_value = bump
    nt.links.new(n.outputs['Fac'], bn.inputs['Height']); nt.links.new(bn.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = rough
    return m

def ground(name):
    s = reset(); MATS.clear()
    stone = mat('stone', 0x8e8e8e, 0.8)
    if name.startswith('asphalt'):
        box((0, 0, -1), (200, 200, 2), noisy('asph', 0x7c7c7c, 0.9, 0.5, seed=int(name[-1]) * 13.7))
        if name == 'asphalt2': cyl((3, -2, 0.05), 5.5, 0.2, mat('cover', 0x6a6a6a, 0.45, 0.7), verts=24); cyl((3, -2, 0.2), 4.4, 0.2, mat('cover2', 0x5a5a5a, 0.5, 0.7), verts=24)  # manhole
    elif name == 'paver':  # paving slabs in a brick bond, repeating every 32
        box((0, 0, -1), (200, 200, 2), mat('gap', 0x4a4a4a, 0.9))
        for r, y in enumerate(range(-40, 41, 16)):
            for x in range(-48, 49, 16): box((x + (8 if r % 2 else 0), y, 0.3 + ((x * 7 + y * 3) % 5) * 0.03), (15, 15, 1), stone, 0.5)
    elif name == 'kerb':  # a raised kerb stone along the left edge only
        for y in range(-24, 25, 16): box((-14.2, y, 1.2), (3.6, 15.4, 2.4), mat('kerb', 0xc8c8c8, 0.7), 0.5)
    elif name.startswith('water'):
        box((0, 0, -1), (200, 200, 2), noisy('water', 0x808890, 0.12, 1.0, rough=0.12, contrast=0.05, seed=int(name[-1]) * 9.1))
    elif name == 'planks':
        box((0, 0, -1), (200, 200, 2), mat('gap', 0x3a3a3a, 0.9))
        for i, y in enumerate(range(-40, 41, 8)): box((0, y, 0.4 + (i % 3) * 0.12), (200, 7.2, 1), stone, 0.3)
        for x in (-12, 12):
            for y in range(-40, 41, 8): cyl((x, y, 1.0), 0.5, 0.3, mat('nail', 0x555555, 0.4, 0.8))
    elif name == 'awning':  # a strip of pleated cloth along the top edge (white: tinted in game)
        for x in range(-15, 16, 3): cyl((x, 12, 3), 1.5, 8, mat('cloth', 0xdadada, 0.85), (math.pi / 2, 0, 0), 10)
        box((0, 15.6, 3.6), (31, 0.8, 1.2), mat('rail', 0x555555, 0.5, 0.6))
    render(s, f'ground_{name}', 32, 32)

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
        cyl((-4, 0, 1), 2.6, 2, dark); cyl((-4, 0, 14), 1.3, 28, steel); box((1, 0, 28), (10, 1.6, 1.2), steel, 0.3)
        box((6, 0, 27.6), (5, 3.4, 1.6), dark, 0.5); ball((6, 0, 26.6), (2, 1.5, 0.8), mat('bulb', 0xffe2b0, 0.3, 0, 8)); size = 20
    elif name == 'gate':  # the Hozuki-mon temple gate with its giant red lantern
        red = mat('gred', 0xd8343a, 0.5); blackw = mat('gblk', 0x1c1a18, 0.6)
        for x in (-86, 86): cyl((x, 0, 23), 7, 46, red, verts=24); cyl((x, 0, 2), 9, 4, blackw, verts=24)
        box((0, 0, 42), (196, 8, 8), red, 1); box((0, 0, 51), (214, 12, 5), mat('gbeam', 0xb02a30, 0.5), 1.5); box((0, 0, 55), (206, 16, 3), mat('gtile', 0x8a2a2a, 0.55), 1)
        ball((0, 0, 24), (17, 17, 15), mat('lant', 0xe03a3a, 0.5, 0, 0.6)); cyl((0, 0, 39), 9, 3, blackw); cyl((0, 0, 9), 9, 3, blackw)
        for z in (16, 22, 28, 34): cyl((0, 0, z), 16.6 - abs(z - 24) * 0.45, 0.6, mat('rib', 0x9a2020, 0.6), verts=28)
        size = 224
    elif name == 'bench':
        for y in (-3, 0, 3): box((0, y, 4), (18, 2.4, 0.8), mat('wood', 0x8a6a4a, 0.7), 0.2)
        for x in (-7, 7): box((x, 0, 2), (1.4, 8, 3.6), dark, 0.2)
        size = 22
    elif name == 'bin':
        cyl((0, 0, 4), 4, 8, mat('bin', 0x3f6b4a, 0.5, 0.3)); cyl((0, 0, 8.2), 4.3, 0.6, dark); cyl((0, 0, 8.6), 2.4, 0.3, mat('hole', 0x101010, 0.9)); size = 14
    elif name == 'cone':
        cyl((0, 0, 0.4), 3.4, 0.8, mat('base', 0x202020, 0.8), verts=4); taper((0, 0, 4.5), (5, 5, 8), (0.2, 0.2), mat('cone', 0xf06a1a, 0.5), 0.4); size = 12
    elif name == 'crate':
        box((0, 0, 5), (14, 14, 10), mat('crate', 0xa07a4a, 0.8), 0.4)
        for x in (-4.5, 0, 4.5): box((x, 0, 10.1), (0.8, 14, 0.3), mat('slat', 0x6a4a2a, 0.8))
        size = 20
    elif name.startswith('tree'):
        import random
        rs = random.Random(int(name[-1]) + 5); leaf = {'tree0': 0x3f7a45, 'tree1': 0x4f8a3a, 'tree2': 0xd98aa8}[name]  # tree2: cherry blossom
        cyl((0, 0, 5), 1.8, 10, mat('trunk', 0x5a4030, 0.8))
        for i in range(14):
            a, d, r = rs.uniform(0, 6.28), rs.uniform(0, 11), rs.uniform(4.5, 8)
            ball((math.cos(a) * d, math.sin(a) * d, 13 + rs.uniform(0, 6)), (r, r, r * 0.8), mat('leaf%d' % (i % 3), leaf + (i % 3) * 0x060a04, 0.85))
        size = 44
    # things that stand on the street lean like everything else; rooftop props are painted flat onto roofs
    tall = next((h for k, h in (('vending', 19), ('lamp', 30), ('tree', 24), ('bench', 5), ('bin', 9), ('cone', 9), ('crate', 11), ('gate', 58)) if name.startswith(k)), 0)
    render_dirs(s, f'prop_{name}', size, tall, 1)

# ---------------------------------------------------------------- run everything, then pack the sheet
jobs = []
for vid, v in VEHICLES.items():
    for ci in range(len(v['colors'])): jobs.append(('car', lambda vid=vid, v=v, ci=ci: vehicle(vid, v, ci)))
for lid, look in LOOKS.items():
    if ONLY_LOOKS is not None and lid not in ONLY_LOOKS: continue
    for fr in (0, 1, 2): jobs.append(('person', lambda lid=lid, look=look, fr=fr: person(lid, look, fr)))
    for fr in (3, 4): jobs.append(('pose', lambda lid=lid, look=look, fr=fr: person(lid, look, fr)))  # punch, knocked down
    jobs.append(('bust', lambda lid=lid, look=look: bust(lid, look)))
for n in ('asphalt0', 'asphalt1', 'asphalt2', 'paver', 'kerb', 'water0', 'water1', 'planks', 'awning'): jobs.append(('ground', lambda n=n: ground(n)))
for n in ('tile', 'metal', 'plank', 'flat'): jobs.append(('roof', lambda n=n: roof_tile(n)))
for n in ('ac', 'tank', 'vent', 'skylight', 'dish', 'solar', 'vending0', 'vending1', 'vending2', 'lamp', 'tree0', 'tree1', 'tree2', 'bench', 'bin', 'cone', 'crate', 'gate'): jobs.append(('prop', lambda n=n: prop(n)))
for kind, job in jobs:
    if ONLY_LOOKS is not None:
        if kind in ('person', 'pose', 'bust'): job()
    elif ONLY != 'pack' and (not ONLY or ONLY == kind): job()  # '--only pack' just rebuilds the sheets

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
# cars and people are rendered with spare room round them; trim it so the sheet stays under 4096 px tall
TRIM = {}
def load(f):
    im = Image.open(os.path.join(OUT, f)).convert('RGBA')
    t = next((v for k, v in TRIM.items() if f.startswith(k)), 0)
    return im.crop((t, t, im.width - t, im.height - t)) if t else im
imgs = [(f[:-4], load(f)) for f in files]
# Two sheets, so neither goes over 4096 px (the largest picture some graphics cards take):
# sheet 0 holds vehicles, props, ground and portraits; sheet 1 holds the people.
PAD, SHEET_W = 2, 4096
frames = {}
os.makedirs(os.path.join(ROOT, 'public', 'assets'), exist_ok=True)
pages = [[t for t in imgs if not t[0].startswith('p_')], [t for t in imgs if t[0].startswith('p_')]]
for page, group in enumerate(pages):
    x = y = PAD; row = 0
    for name, im in sorted(group, key=lambda t: -t[1].height):
        if x + im.width + PAD > SHEET_W: x = PAD; y += row + PAD; row = 0
        frames[name] = dict(page=page, x=x, y=y, w=im.width, h=im.height); x += im.width + PAD; row = max(row, im.height)
    sheet = Image.new('RGBA', (SHEET_W, y + row + PAD), (0, 0, 0, 0))
    for name, im in group: sheet.paste(im, (frames[name]['x'], frames[name]['y']))
    sheet.save(os.path.join(ROOT, 'public', 'assets', f'atlas{page}.png'), optimize=True)
    print('ATLAS', page, sheet.size, len(group), 'sprites')
old = os.path.join(ROOT, 'public', 'assets', 'atlas.png')
if os.path.exists(old): os.remove(old)
# origins are remembered between runs, so rendering only part of the set keeps the rest
_op = os.path.join(OUT, 'origins.json')
_all = json.load(open(_op)) if os.path.exists(_op) else {}
_all.update(ORIGIN); ORIGIN = _all
json.dump(ORIGIN, open(_op, 'w'))
for n, oy in ORIGIN.items():
    if n in frames and abs(oy - 0.5) > 0.001: frames[n]['oy'] = round(oy, 4)
json.dump(dict(scale=SCALE, tilt=TILT, pages=len(pages), frames=frames), open(os.path.join(ROOT, 'src', 'data', 'atlas.json'), 'w'), indent=1)
