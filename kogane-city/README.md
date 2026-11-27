# Kogane City

A browser crime sandbox set in a fictional Tokyo, seen from a three-quarter camera.
Phaser 4 + TypeScript + Vite, WebGL only, 960x540 scaled up in whole steps.

What is in the game now:

- The whole city: eight districts on both banks of the Kurokawa River, the bay, the port
  island and the K-Route ring road. The street plan follows Tokyo: wide avenues with narrow
  side streets between them, superblocks, shopping lanes for people on foot, parks with
  ponds, a moated castle garden, and the Kanjō Line, an elevated loop railway with six
  stations and running trains.
- Interiors: walk into the ramen shop (Jun's room is upstairs: sleep to heal and save),
  a konbini in every big block, Hachiman Hardware, the pachinko hall, arcades, bars, capsule
  inns (a paid bed in every district) and the buildings the story's indoor scenes use.
- The full story: 24 missions in three acts, the yakuza / police fork at mission 15 and
  three endings. All text is copied from the Script and Writing doc.
- Twelve side stories in four chains of three (Daigo's Road, Building 41, Old Debts,
  Sea Spirit).
- Repeatable side jobs: ramen delivery, taxi fares, K-Route time trials, 100 lucky cats.
- Turf wars over 37 zones, with daily income from the zones you hold.
- Heat levels 1-5, police on foot and in cars, roadblocks.
- Ten weapons besides fists, Hachiman Hardware shops, a garage with upgrades and resprays,
  vending machines, beds that heal and save.
- A day and night cycle with rain, and a title screen with Continue / New game.

## Run it

    npm install
    npm run dev

Then open the address it prints (usually http://localhost:5173).

`npm run build` makes the finished game in `dist/`. `play.html` is the page used for the
shared test link; it needs `assets/game.js`, `assets/atlas0.webp` and `assets/atlas1.webp`
from `dist/assets/` beside it.

## Controls

**Third-person view (the default).** Click the game to capture the mouse (Esc lets it go).
Mouse turns the camera; WASD walks relative to the camera; guns aim at the crosshair; right
click steadies your aim (the camera moves over the shoulder). Fists and blades face the way
you walk. In a car the camera swings back behind you when you stop moving the mouse.
**C switches between the third-person view and the original three-quarter view.** The
choice is remembered. `?3d` or `?2d` on the address forces one.

**Three-quarter view:**

On foot: WASD move, mouse aim, left click fire, right click steady aim, Space dodge roll,
1-5 or mouse wheel switch weapon, R reload, V punch or swing, E get in a car / go through
a door / use. Doors stay shut while the police are after you.
Driving: W/S accelerate and brake/reverse, A/D steer, Space handbrake (drifting fills
nitro), Shift nitro, E get out.
Menus (garage, shop): Up/Down and Enter. Story choices: 1, 2 or 3.
Click / Space / Enter moves a cutscene on.
F3 toggles the debug overlay; F4 skips to the next mission; F6 restarts the story.
Progress is saved in the browser. "New game" on the title screen wipes it.

## How the city is laid out (`src/data/map.ts`)

- `vRoads` / `hRoads` are the avenues. Story places name the big blocks between them
  ("2-3", "w1-0", "p1"), so the story does not care how far apart the avenues are.
- `GAPS_V` / `GAPS_H` say how wide the new small blocks in each gap are. Bigger numbers =
  a bigger city.
- `GRAIN` gives each district its Tokyo character: how often a side street runs through,
  how often it is a walking lane instead, and how many parks.
- `rail` is the loop railway; `castle` is the moated garden.
- Places written as `tile: [x, y]` are measured on the first, small plan; the game moves
  them to the new plan by itself.

## Interiors (`src/data/interiors.ts`)

A room is a small text map: `#` wall, `.` floor, `D` way out, `<` `>` stairs, letters for
counters, tables, shelves and machines, digits for named spots a mission can use. The
legend is at the top of the file. A line in `DOORS` joins a street door to a room. The
missions' own rooms are in `interiors_act1.ts`, `interiors_act2.ts`, `interiors_act3.ts`
and `interiors_side.ts`. Rooms are kept out of sight south of the bay and Jun is moved
between street and room when he uses a door (E).

## Where to change things

- `src/data` holds every balancing number and every line of text. Tune the game here.
  Numbers the design docs do not give are marked `PLACEHOLDER`.
  - `missions.ts` (Act 1), `missions_act2.ts`, `missions_act3.ts`, `missions_side.ts`:
    mission text and each mission's tuning numbers.
  - `map.ts`: roads, river, districts and where each story place is.
  - `weapons.ts`, `vehicles.ts`, `player.ts`, `heat.ts`, `ai.ts`, `turf.ts`, `garage.ts`,
    `shop.ts`, `sidejobs.ts`: the numbers for each system.
  - `characters.ts`: who speaks, their name colour and their portrait.
  - `strings.ts`: on-screen wording.
- `src/scenes`: Boot (loads the art), Title, World (the city), Hud (the overlay).
- `src/systems`: CityMap, Story (the mission runner), `missionHooks.ts` / `hooks_act2.ts` /
  `hooks_act3.ts` / `hooks_side.ts` (the logic each mission needs), Heat, Police, Traffic,
  Peds, Gangs, Turf, SideJobs, Shop, SaveGame, Projectiles, Fx.
- `src/entities`: Actor (a person), Player, Car.

## The third-person view (`src/view3d/View3D.ts`)

The game still runs on the flat map exactly as before: movement, collisions, AI, missions.
The 3D view only draws that world with three.js on a canvas under the HUD:

- the ground is the game's own tile sheet, looked up per tile by a shader;
- buildings are boxes; one shader draws windows (lit at night), shop fronts and awnings;
- people are built from blocks in their look's colours and animated (walk, aim, punch, roll,
  fall); cars, scooters and trucks are block models in their paint colour;
- street furniture, the railway viaduct, the castle keep, smoke, sparks, bullet tracers and
  the beams that mark where to go;
- indoors, only the room you are in is drawn, the camera rises, and walls between the
  camera and Jun are cut away.

Its numbers (camera distances, mouse speed, storey height, fog, colours) are in
`src/data/view3d.ts`. The automated tests play in the three-quarter view.

## Art (Blender)

Cars, people, portraits, ground and roof materials and street furniture are modelled and
rendered in Blender by `tools/blender/render_assets.py` (needs `pip install bpy pillow`).
It writes two sprite sheets, `public/assets/atlas0.webp` (vehicles, props, ground,
portraits) and `public/assets/atlas1.webp` (people), plus `src/data/atlas.json`. Re-run it
after changing a model or a colour. If the sheets are missing the game falls back to
simple shapes drawn in code.

The camera is a three-quarter view, about 45 degrees. The game draws the whole world
shorter top-to-bottom (`squash`) and leans anything with height up the screen (`tilt`);
both are in `src/data/map.ts`. Cars and people are rendered in 16 directions with the same
lean, so TILT in the Blender script must match `tilt`. A full re-render takes several
minutes; `--only pack` just rebuilds the sheets.

## Tests

Scripted playthroughs in `tools/test` drive the real game in a headless browser. They
teleport Jun to each objective and remove enemies instantly, so they prove every mission
can be started, progressed and finished without errors. They do not prove a mission is
fun or fair; that needs a person playing.

    npm run build
    python3 -m http.server 4173 -d dist &
    GAME_URL=http://localhost:4173/ node tools/test/act1.cjs      # missions 1-8
    GAME_URL=http://localhost:4173/ node tools/test/act2.cjs      # missions 9-16, both paths
    GAME_URL=http://localhost:4173/ node tools/test/act3.cjs      # missions 17-24, all endings
    GAME_URL=http://localhost:4173/ node tools/test/side.cjs      # the twelve side stories
    GAME_URL=http://localhost:4173/ node tools/test/sidejobs.cjs  # side jobs and lucky cats

## What stands in for what

The engine has streets, rooms, cars and people, but no boats, no aircraft and no walking
on rooftops. Until those exist:

- Rooftop scenes are staged in rooms or yards (there is no walking on roofs).
- Boat chases are car chases along the shore. The ship in the finale is a drawing beside
  the north quay and its deck is the quay. Boats in the side stories are cars and trucks.
- The helicopter is a drawing over an invisible truck, which is what bullets hit.
- Weapons the story names but the game does not have yet (the Inspector's Revolver,
  Black Iron) are stood in by existing guns.
- Side-story rewards: the money and Daigo's bike are real. Faction standing, escorts,
  tips, the free drink and similar are named on the result card only.
- Mission payouts and most timings are placeholders inside the bible's ranges.
