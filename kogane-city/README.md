# Kogane City

Browser-based top-down crime sandbox. Phaser 4 + TypeScript + Vite, WebGL only.
Currently: Milestone 1 (grey-box prototype).

## Run it

    npm install
    npm run dev

Then open the address it prints (usually http://localhost:5173).

## Folders

- `src/scenes`   — screens: Boot, World (the city); HUD comes later
- `src/systems`  — rules that run the world (scaling now; Heat, traffic, camera later)
- `src/entities` — things in the world (player, cars, pedestrians, bullets)
- `src/data`     — every balancing number and every line of text
