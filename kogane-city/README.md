# Kogane City

Browser-based top-down crime sandbox. Phaser 4 + TypeScript + Vite, WebGL only.
Currently: Milestone 1, the grey-box prototype (one city block, no art).

## Run it

    npm install
    npm run dev

Then open the address it prints (usually http://localhost:5173).

## Controls

On foot: WASD move, mouse aim, left click fire, Space dodge roll, 1-4 or mouse wheel
switch weapon, R reload, E steal / enter a car.
Driving: W/S accelerate and brake/reverse, A/D steer, Space handbrake (drifting fills
nitro), Shift nitro, E get out. F3 toggles the debug overlay.

## Folders

- `src/data`     — every balancing number and every line of text. Tune the game here.
- `src/scenes`   — Boot (makes placeholder shapes), World (the city), Hud (overlay)
- `src/systems`  — CityMap, Projectiles, HeatSystem, PoliceSystem, TrafficSystem, PedSystem, Fx
- `src/entities` — Actor (a person), Player, Car
