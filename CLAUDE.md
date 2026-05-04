# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

Open `index.html` directly in a browser — no build step, no server needed. Double-click the file or drag it into Chrome/Firefox. The only network request is the Google Fonts CDN (`Press Start 2P`); the game works offline with a monospace fallback.

## Repository

GitHub: https://github.com/helloxoxoxo007/sector-zero  
After every meaningful change: commit with a conventional message (`feat:`, `fix:`, `refactor:`) and push to `main`.

## Architecture

Everything lives in two files:

- **`index.html`** — shell only: canvas element, CSS centering, Google Fonts import, `<script src="game.js">`.
- **`game.js`** — all logic (~980 lines), structured in sections separated by banner comments.

### Game loop

A single `requestAnimationFrame` loop runs always. Each tick calls `update(dt)` then `render()`, both of which switch on the global `STATE` string to dispatch behaviour. `dt` is capped at 100ms to prevent spiral-of-death on tab blur.

### State machine

`STATE` is one of: `MENU` · `PLAYING` · `PAUSED` · `LEVEL_COMPLETE` · `BOSS_INTRO` · `GAME_OVER` · `VICTORY`. Transitions go through `setState(s)`, which handles side effects (starting waves, triggering sounds, saving the high score to `localStorage` key `topdownHS`).

### Entity model

All entities share `{ x, y, radius, dead, update(dt), draw() }`. The hierarchy:

- `Player` — reads `keys` and `mouse` globals directly inside `update()`.
- `Enemy` (base) → `Grunt`, `Rusher`, `Tank`, `Shooter`, `Boss` — each subclass calls `this.aimAt(player)` in its constructor to set velocity; velocity is fixed at spawn except for the `Boss`, which recomputes position each frame via orbit math.
- `Bullet` — `fromPlayer` bool distinguishes friendly vs enemy bullets; both types live in the same `bullets` array.
- `Particle` — purely visual, no collision.

Live entity arrays (`enemies`, `bullets`, `particles`) are filtered for `dead === true` at the end of every `PLAYING` update tick.

### Wave / spawn system

`LEVELS` is a top-level array of config objects. Each non-boss level has a `waves` array; each wave has an `enemies` array (`{type, count}`) and a `spawnInterval` (ms between spawns). `buildQueue()` flattens and shuffles the enemy list; `updateWaveRunner()` pops one entry per interval tick and calls `spawnEnemy(type)`. When the queue empties and no live enemies remain, `currentWaveIdx` advances after a 1200ms delay.

### Collision

All collision is circle–circle (`overlap(a, b)`). Checks run each frame in `doCollisions()`: player bullets vs enemies, enemy bullets vs player, enemy bodies vs player. Enemy–enemy overlap is intentional (swarming behaviour, not a bug).

### Audio

`AudioContext` is created lazily on the first click or keydown (browser autoplay policy). All sounds are procedural — oscillators + gain envelopes via `playTone()` and `playNoise()`. No audio files.

### Rendering

- Background: dark fill + 40px grid; colours come from `level.bgColor` / `level.gridColor`.
- Scanline overlay: pre-rendered once at startup to an offscreen canvas (`scanCanvas`), then `drawImage`'d every frame on top of everything.
- Neon glow: `ctx.shadowBlur` set before fill on enemies and bullets, reset to 0 immediately after.
- All coordinates are `Math.round()`'d before drawing; `imageSmoothingEnabled = false`.
- Font: `8px–28px "Press Start 2P", monospace` drawn directly onto the canvas — no DOM elements.

### Adding a new enemy type

1. Extend `Enemy`, set stats in the constructor, call `this.aimAt(player)`.
2. Implement `update(dt)` and `draw()`.
3. Add a `case` in `spawnEnemy()`.
4. Reference the new type string in the relevant `LEVELS` wave definitions.
