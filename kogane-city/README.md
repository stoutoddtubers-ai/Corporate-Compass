# Kogane City

Browser-based top-down crime sandbox. Phaser 4 + TypeScript + Vite, WebGL only.
Currently: Act 1 alpha in progress. The east bank (Asagiri, Denpa-chō, Tetsugawa, the
Kurokawa River and the K-Route ring), story missions 1-8, Heat 1-4, placeholder pixel art
drawn in code.

## Run it

    npm install
    npm run dev

Then open the address it prints (usually http://localhost:5173).

## Controls

On foot: WASD move, mouse aim, left click fire, Space dodge roll, 1-4 or mouse wheel
switch weapon, R reload, E steal / enter a car.
Driving: W/S accelerate and brake/reverse, A/D steer, Space handbrake (drifting fills
nitro), Shift nitro, E get out. V punches. Click / Space / Enter moves a cutscene on.
F3 toggles the debug overlay; F4 skips to the next mission; F6 restarts the story.
Story progress is saved in the browser.

## Art (Blender)

Cars, people, roof materials and rooftop props are modelled and rendered in Blender by
`tools/blender/render_assets.py` (needs `pip install bpy pillow`). It writes the sprite
sheet `public/assets/atlas.png` and `src/data/atlas.json`. Re-run it after changing a
model or a colour. If the sheet is missing the game falls back to code-drawn placeholders.
The view is oblique (2.5D): the ground is seen from above, but anything with height leans
up the screen, so buildings show their camera-facing wall and cars and people show their
sides. Cars and people are rendered in 16 directions with that lean. The lean (`tilt`),
building heights and wall colours are in `src/data/map.ts`; TILT in the Blender script must match.
A full re-render takes about 3 minutes; `--only pack` just rebuilds the sheet.

## Folders

- `src/data`     — every balancing number and every line of text. Tune the game here.
- `src/scenes`   — Boot (makes placeholder shapes), World (the city), Hud (overlay)
- `src/systems`  — CityMap, Projectiles, HeatSystem, PoliceSystem, TrafficSystem, PedSystem, GangSystem,
                   Story (mission runner), missionHooks (per-mission logic), Fx
- `src/data/missions.ts` — all mission text, copied from the script doc
- `src/data/map.ts` — the city: roads, river, districts and where each story place is
- `src/entities` — Actor (a person), Player, Car
