# CLAUDE.md — Project Notes

> Keep this file updated after every structural or design change. This is the reference for every new session.

---

## Overview

**joAnsks's GitHub Pages site** — hosted at `https://joAnsks.github.io`.
Contains a retro pastel brick-breaker game called **Pastel Bounce**.

---

## Folder Structure

```
joAnsks.github.io/
├── index.html          # HTML shell only — loads css/style.css + js/main.js
├── CLAUDE.md           # This file
├── README.md           # Minimal GitHub repo description
├── css/
│   └── style.css       # All page + game styles (extracted from original inline <style>)
└── js/                 # ES modules — loaded via <script type="module" src="js/main.js">
    ├── state.js        # Shared canvas, constants, and mutable g{} state object
    ├── audio.js        # Web Audio API setup, sfx object, unlockAudio
    ├── particles.js    # burst() — pushes to g.particles
    ├── ball.js         # makeBall(), initBall()
    ├── bricks.js       # LAYOUTS array, initBricks()
    ├── paddle.js       # initPad(), clampPad(), basePadW(), currentPadW()
    ├── powerups.js     # PU_TYPES, randomPUType(), spawnDrop(), applyPU(), tickPUs()
    ├── hud.js          # updateHUD(), showOverlay(), hideOverlay(), oBtn export
    ├── input.js        # Keyboard / mouse / touch event listeners (side-effect module)
    ├── draw.js         # draw(), shadeColor()
    ├── update.js       # update(), ballHitsBrick(), handlers{} injection point
    ├── transitions.js  # startGame(), nextLevel(), pause(), resume(), gameOver()
    └── main.js         # Entry point: resize, loop, boot, button/space wiring
```

---

## Module Dependency Graph (no circular deps)

```
state.js          ← no game deps
audio.js          ← no game deps
particles.js      ← state
ball.js           ← state
paddle.js         ← state
bricks.js         ← state
hud.js            ← state
powerups.js       ← state, audio, ball, paddle
input.js          ← state                          (side-effect: registers listeners)
draw.js           ← state
update.js         ← state, audio, particles, powerups, paddle, ball
transitions.js    ← state, paddle, ball, bricks, hud
main.js           ← state, input, paddle, ball, bricks, hud, update, draw, transitions
```

**Key pattern:** `update.js` needs `gameOver` and `nextLevel` from `transitions.js`, but
`transitions.js` also imports from modules that `update.js` uses — to avoid a circular dep,
those two functions are injected at runtime via `handlers` object in `main.js`:
```js
handlers.gameOver  = gameOver;
handlers.nextLevel = nextLevel;
```

---

## Shared State — `g` object (`js/state.js`)

All mutable runtime values live here. Import `{ g }` from `./state.js` to read/write.

| Property | Type | Description |
|---|---|---|
| `g.state` | string | `'idle'` \| `'playing'` \| `'paused'` \| `'dead'` |
| `g.score` | number | Current score |
| `g.best` | number | High score (persisted to `localStorage` key `pb_best`) |
| `g.lives` | number | Lives remaining (max 5 with +LIFE power-up) |
| `g.level` | number | Current level (increments on level clear) |
| `g.shakeT` / `g.shakeAmt` | number | Screen shake countdown / magnitude |
| `g.padX` / `g.padW` / `g.padWidened` | number | Paddle position, width, wide-mode timer |
| `g.balls` | array | Active ball objects `{x, y, dx, dy, trail[]}` |
| `g.bricks` | array | Brick objects `{x, y, color, pts, hp, maxHp, shimmer, alive, pu}` |
| `g.drops` | array | Falling power-up capsules |
| `g.particles` | array | Active burst particles |
| `g.brickW` / `g.brickH` / `g.ROWS` | number | Set by `initBricks()` each level |
| `g.activePUs` | object | Active power-up timers e.g. `{ slow: 300 }` |
| `g.keys` | object | Keyboard state `{ ArrowLeft: true, … }` |
| `g.mouseX` | number\|null | Mouse/touch X target for paddle smoothing |

---

## Game: Pastel Bounce

### Gameplay
- **Grid:** 10 cols × dynamic rows (grows with level, max 8)
- **Control:** mouse, touch, or ← → / A D keys; Space = pause
- **Lives:** 3 (max 5 via +LIFE power-up); losing all → Game Over
- **Levels:** clearing all bricks advances the level; ball speed scales with level
- **High score:** persisted in `localStorage` (`pb_best`)

### Level Shapes (cycles every 11 levels)
| Level | Layout |
|---|---|
| 1 | Full grid |
| 2 | Diamond |
| 3 | Checkerboard |
| 4 | Pyramid |
| 5 | Cross |
| 6 | Zigzag |
| 7 | Tunnels |
| 8 | Border (ring only) |
| 9 | Diagonals (X) |
| 10 | Hourglass |
| 11 | V-shape |

### Power-ups (11% spawn chance per brick)
| ID | Effect |
|---|---|
| `wide` | Paddle 1.7× wider for 600 ticks |
| `multi` | Spawns an extra ball |
| `slow` | Slows all balls for 500 ticks |
| `life` | +1 life (max 5) |

### Scoring
- Bricks in bottom row = 10 pts × level; top row = ROWS × 10 pts × level
- Level 3+: top 2 rows have 2 HP (cracked visually, half-score on first hit)

---

## Design Choices

### Color Palette (CSS custom properties in `css/style.css`)
| Variable | Hex | Used for |
|---|---|---|
| `--pink` | `#ffb3c1` | Bricks, bubbles, overlay title |
| `--peach` | `#ffd6a5` | Bricks, bubbles |
| `--mint` | `#b5ead7` | Bricks, button gradient |
| `--blue` | `#bde0fe` | Bricks, paddle gradient, button |
| `--lavend` | `#cdb4db` | Bricks, paddle gradient, HUD labels |
| `--yellow` | `#fdffb6` | Bricks |
| `--bg` | `#fce4ec` | Page background |
| `--panel` | `#fff0f6` | HUD panel |
| `--shadow` | `#e0a8c0` | Borders, box shadows |
| `--dark` | `#3d2b4e` | Headings, button borders |
| Canvas bg | `#2a1533` | Dark purple — retro game feel |

### Typography
- **Font:** `Press Start 2P` (Google Fonts) — pixel/retro, used everywhere
- Fluid sizing via `clamp()`

### Layout
- Vertical flex column: header → HUD → canvas → power-up bar → controls hint
- Canvas: max 560 × 440px, responsive via `resize()` in `main.js`
- Overlay sits absolutely over canvas with blurred dark backdrop

### Visual Effects
- Header: animated pastel gradient (`@keyframes shimmer`)
- Page background: floating CSS bubble `<div>`s (spawned in `main.js`)
- Ball: motion trail (last 9 positions), radial glow, specular dot
- Bricks: shimmer sine-wave highlight, crack lines when hp < maxHp, particle burst on break
- Drops: pulsing glow shadow
- Screen shake on life loss

---

## Running Locally

ES modules require HTTP — opening `index.html` directly via `file://` will fail.
Use **VS Code Live Server** (right-click → Open with Live Server) or any local HTTP server.

---

## Git Config (local)
- `user.name`: joAnsks
- `user.email`: joanne.grace.cuballes@adamson.edu.ph
