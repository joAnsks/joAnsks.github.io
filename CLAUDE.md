# CLAUDE.md — Project Notes

> Keep this file updated after every structural or design change. This is the reference for every new session.

---

## Overview

**joAnsks's GitHub Pages site** — hosted at `https://joAnsks.github.io`.
Contains two retro pastel mini-games accessible from a shared game-select screen:
1. **Pastel Bounce** — brick-breaker
2. **Ball Maze** — timed maze navigation with traps and power-ups

---

## Folder Structure

```
joAnsks.github.io/
├── index.html          # HTML shell — game-select + shared HUD/canvas
├── CLAUDE.md           # This file
├── README.md           # Minimal GitHub repo description
├── css/
│   └── style.css       # All page + game styles (includes game-card, back-btn)
└── js/
    ├── state.js        # Shared canvas, constants, mutable g{} (gameMode added)
    ├── audio.js        # Web Audio API — sfx object, unlockAudio, startChaserMusic/stopChaserMusic
    ├── particles.js    # burst()
    ├── ball.js         # makeBall(), initBall()
    ├── bricks.js       # 11-layout LAYOUTS array, initBricks()
    ├── paddle.js       # initPad(), clampPad(), basePadW(), currentPadW()
    ├── powerups.js     # PU_TYPES, spawnDrop(), applyPU(), tickPUs()
    ├── share.js        # shareScore(), generateScoreCard() — Web Share API + FB fallback
    ├── hud.js          # updateHUD(), updateMazeHUD(), setHUDMode(), formatTime(),
    │                   #   showOverlay(), hideOverlay(), oBtn export
    ├── input.js        # Keyboard/mouse/touch listeners (side-effect module)
    ├── draw.js         # Bounce renderer: draw(), shadeColor()
    ├── update.js       # Bounce logic: update(), handlers{} injection point
    ├── transitions.js  # Bounce lifecycle: startGame(), nextLevel(), pause(),
    │                   #   resume(), gameOver()
    ├── main.js         # Entry point: game-select wiring, resize, game loop,
    │                   #   space/overlay-btn handlers, bubble spawner
    └── maze/
        ├── gen.js      # generateMaze(cols, rows), mazeSize(level)
        ├── state.js    # Isolated mg{} object (all maze mutable state)
        ├── draw.js     # drawMaze(), exports CELL=40
        ├── update.js   # updateMaze(), tryMove(), handleTrap(), handlePowerup(),
        │               #   mazeUpdateHandlers{} injection point
        └── game.js     # Maze lifecycle: startMazeGame(), mazeLevelComplete(),
                        #   mazeGameOver(), mazePause(), mazeResume(),
                        #   mazeHandlers{}, entity placement, localStorage
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
share.js          ← no game deps
hud.js            ← state, share
powerups.js       ← state, audio, ball, paddle
input.js          ← state                          (side-effect: registers listeners)
draw.js           ← state
update.js         ← state, audio, particles, powerups, paddle, ball
transitions.js    ← state, paddle, ball, bricks, hud
maze/gen.js       ← no game deps
maze/state.js     ← no game deps
maze/draw.js      ← state, maze/state
maze/update.js    ← state, maze/state, audio, particles, hud, maze/draw
maze/game.js      ← state, maze/state, maze/gen, maze/update, hud
main.js           ← all of the above
```

**Circular dep avoidance pattern** (used in both games):
- `update.js` exports `handlers{}` (null-initialized), `main.js` injects `gameOver` / `nextLevel`
- `maze/update.js` exports `mazeUpdateHandlers{}`, `maze/game.js` populates them at module load

---

## Shared State — `g` object (`js/state.js`)

| Property | Type | Description |
|---|---|---|
| `g.gameMode` | string\|null | `null` \| `'bounce'` \| `'maze'` |
| `g.state` | string | `'idle'` \| `'playing'` \| `'paused'` \| `'dead'` |
| `g.score` | number | Bounce score |
| `g.best` | number | Bounce high score (`localStorage` key `pb_best`) |
| `g.lives` | number | Lives remaining |
| `g.level` | number | Current level |
| `g.shakeT` / `g.shakeAmt` | number | Screen shake countdown / magnitude |
| `g.padX` / `g.padW` / `g.padWidened` | number | Paddle position, width, wide-timer |
| `g.balls` / `g.bricks` / `g.drops` / `g.particles` | array | Game objects |
| `g.brickW` / `g.brickH` / `g.ROWS` | number | Set by `initBricks()` |
| `g.activePUs` | object | Active bounce power-up timers |
| `g.keys` | object | Keyboard state — shared by both games |
| `g.mouseX` | number\|null | Mouse/touch X for paddle |

## Maze State — `mg` object (`js/maze/state.js`)

Completely isolated from `g{}`. Key fields:

| Property | Description |
|---|---|
| `mg.grid` | 2-D cell array `{walls:{N,S,E,W}}` from `generateMaze()` |
| `mg.cols` / `mg.rows` | Maze dimensions |
| `mg.ballCol` / `mg.ballRow` | Cell position |
| `mg.ballPx` / `mg.ballPy` | Pixel centre (interpolated during animation) |
| `mg.moving`, `mg.moveFrom`, `mg.moveTo`, `mg.moveT`, `mg.moveSpeed` | Animation state |
| `mg.camX` / `mg.camY` | Camera pixel offset |
| `mg.shielded`, `mg.frozen`, `mg.boosted` | Active effects |
| `mg.freezeTimer` / `mg.boostTimer` | Effect countdown (frames) |
| `mg.chaserFrozen` | True while chaser is frozen by ❄ power-up |
| `mg.chaserFreezeTimer` | Countdown frames for chaser freeze (180 = 3 s) |
| `mg.entities` | Array of `{col, row, type, hit}` |
| `mg.startTime` / `mg.elapsed` / `mg._pausedAt` | Timer fields |
| `mg.bestTimes` | `{[level]: ms}` — loaded/saved via `localStorage` key `maze_best` |
| `mg.awaitingNextLevel` | True after level complete, cleared when next begins |
| `mg.chaserCol` / `mg.chaserRow` | Chaser cell position |
| `mg.chaserPx` / `mg.chaserPy` | Chaser pixel centre (interpolated) |
| `mg.chaserMoving`, `mg.chaserMoveFrom`, `mg.chaserMoveTo`, `mg.chaserMoveT` | Chaser animation state |
| `mg.chaserSpeed` | Step fraction per frame; ramps from 0.07 → 0.11 with level |
| `mg.chaserDelay` | Countdown frames before chaser activates (600 = 10 s) |

---

## Game: Pastel Bounce

### Gameplay
- **Grid:** 10 cols × dynamic rows (grows with level, max 8)
- **Control:** mouse, touch, ← → / A D; Space = pause
- **Lives:** 3 (max 5 via +LIFE power-up); losing all → Game Over
- **Levels:** clearing all bricks advances; ball speed scales with level

### Level Shapes (cycles every 11 levels via `(level-1) % 11`)
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

---

## Game: Ball Maze

### Gameplay
- **Goal:** navigate ball from (0,0) top-left to ★ exit at bottom-right
- **Control:** WASD or arrow keys; Space = pause; swipe on canvas (mobile)
- **Lives:** 3; losing all → Game Over
- **Chaser:** red enemy spawns at (0,0) with the ball; starts chasing after 10 s; speed ramps up each level; catching the ball costs 1 life (unless shielded) and resets chaser to (0,0) with a 2 s grace period; heartbeat thumps when chaser is within 4 cells (Manhattan distance); a random meme jumpscare flashes for 1.2 s if the player survives the catch unshielded
- **Timer:** `performance.now()` sub-ms accuracy; pause shifts `mg.startTime`
- **Levels:** maze grows 7×7 → 9×9 → … → 25×25 then cycles (10 sizes)
- **Best times:** saved per level in `localStorage` key `maze_best`

### Maze Generation
- Iterative DFS (recursive backtracker) in `maze/gen.js`
- Cell walls: `{N, S, E, W}` — `true` = blocked

### Entities (~10% of cells)
Entity pool: `['teleport', 'teleport', 'freeze', 'speed', 'shield', 'life']` — equal weight, traps never placed on the solution path.

| Icon | Type | Kind | Effect |
|---|---|---|---|
| ⟳ | `teleport` | Trap | Warps ball to random cell; shield blocks |
| ❄ | `freeze` | Power-up | Freezes the chaser for 3 s; chaser turns blue |
| ★ | `speed` | Power-up | 2× player speed for 5 s |
| ♥ | `shield` | Power-up | Absorbs next trap hit **or** chaser catch (no life lost, no jumpscare) |
| + | `life` | Power-up | +1 life (max 5) |

---

## UI Architecture

### Game-Select Screen (`#game-select`)
- Shown on load; two `.game-card` buttons (Brick Breaker, Ball Maze)
- Clicking a card calls `startGame()` or `startMazeGame()`, shows HUD + canvas

### HUD (`#hud`)
- Hidden until a game starts
- `◀ MENU` back button (`#back-btn`) returns to game-select
- Score label dynamically switches: **SCORE** (bounce) ↔ **TIME** (maze) via `setHUDMode()`
- Maze time shown as `ss.cs` or `m:ss.cs`

### Maze swipe (mobile)
- Swipe on `#canvas-wrap`: 24px threshold, fires a 150ms key pulse for one cell move
- Feeds into `tryMove()` in `maze/update.js` via `g.keys[Arrow*]` — no extra logic

### Jumpscare (`#jumpscare`)
- Hidden `div` (contains `<img id="jumpscare-img">`) inside `#canvas-wrap`; toggled via `.active` CSS class
- On catch (lives remaining): picks a random image from `_SCARE_IMGS` array in `maze/update.js`, displays it for 1200 ms; `_lastScareIdx` tracks the previous pick so the same image never appears twice in a row
- Images: 10 popular imgflip memes sourced via `api.imgflip.com/get_memes` (Batman Slapping Robin, Change My Mind, Trade Offer, Woman Yelling at Cat, Clown Applying Makeup, Buff Doge vs Cheems, Expanding Brain, Tuxedo Winnie the Pooh, Blank Nut Button, One Does Not Simply); URLs are direct `i.imgflip.com` CDN links (e.g. `https://i.imgflip.com/9ehk.jpg`)
- `z-index: 20` — renders above `#overlay`

### Chaser Heartbeat (`startChaserMusic` / `stopChaserMusic` in `js/audio.js`)
- Frequency-sweep thump: 200 Hz → 40 Hz in 12 ms, lub-dub pattern at ~67 BPM
- Audible on laptop speakers (unlike a pure sub-bass sine); volume 0.6 / 0.45
- Starts when `mg.chaserDelay <= 0` and Manhattan distance to ball ≤ 4; stops otherwise
- Also stopped on: pause, level complete, game over, menu return

### Overlay
- Shared for both games: title, message, action button
- Bounce: `oBtn` click → `resume()` / `startGame()`
- Maze: `oBtn` click → `mazeHandlers.overlayBtn()` (state-dispatched)
- `showOverlay(title, msg, btnTxt, shareText?, gameName?)` — optional 4th/5th args show `#share-btn`
- `#share-btn` (`<button>`) click calls `shareScore(shareText, gameName)` from `js/share.js`
- Share button shown on: Bounce Game Over, Maze Level Clear, Maze Game Over
- Share button hidden on: pause, resume, intro, next-level overlays

### Share (`js/share.js`)
- `shareScore(shareText, gameName, stat, statLabel, btnEl)` — generates score card, uploads it, opens FB sharer
  1. Generates 1200×630 PNG score card on a hidden canvas
  2. Uploads to **imgBB** (`IMGBB_KEY` constant — get free key at imgbb.com/account/api)
  3. Opens `facebook.com/sharer/sharer.php?u=SITE&picture=IMG_URL&quote=TEXT` in a popup
  4. If upload fails or no key set: opens FB sharer without the `picture=` param (text only)
  5. `btnEl` shows "SHARING..." + disabled during upload, restored after
- `generateScoreCard(shareText, gameName, stat, statLabel)` — canvas card layout:
  - 1200×630, dark purple bg + radial pink/lavender sheen + double rounded border
  - Stars → game name (pink, drop-shadow) → divider → **stat box** (semi-transparent fill)
  - Stat box: label (lavender, small) + stat value (yellow, glowing `shadowBlur=32`, auto-sized to fit)
  - Tagline (emoji-stripped share text) → divider → mint URL footer → yellow stars
  - Uses `document.fonts.ready` then `fonts.check()` to use Press Start 2P or fall back to monospace

---

## Design Choices

### Color Palette (CSS custom properties)
| Variable | Hex | Used for |
|---|---|---|
| `--pink` | `#ffb3c1` | Bricks, spike entity, overlay title |
| `--peach` | `#ffd6a5` | Bricks, bubbles |
| `--mint` | `#b5ead7` | Bricks, exit cell, button gradient |
| `--blue` | `#bde0fe` | Bricks, freeze entity, button |
| `--lavend` | `#cdb4db` | Bricks, walls, shield entity, HUD labels |
| `--yellow` | `#fdffb6` | Bricks, speed entity |
| `--bg` | `#fce4ec` | Page background |
| `--panel` | `#fff0f6` | HUD panel, game cards |
| `--shadow` | `#e0a8c0` | Borders, box shadows |
| `--dark` | `#3d2b4e` | Headings, button text |
| Canvas bg | `#2a1533` | Dark purple — retro feel |

### Typography
- **Font:** `Press Start 2P` (Google Fonts) — pixel/retro
- Fluid sizing via `clamp()`

### Layout
- Vertical flex column: header → game-select OR (HUD + canvas + bars)
- Canvas: max 560 × 440px, responsive
- Overlay: absolute over canvas, blurred dark backdrop

---

## Open Graph / Social Sharing

`index.html` contains `og:*` and `twitter:card` meta tags pointing to `og-image.png` in the repo root.
This image is **not committed** — generate it once using the tool below.

### Generating `og-image.png`
1. Open `tools/make-og.html` via Live Server (requires HTTP, not `file://`)
2. Click **⬇ Download og-image.png**
3. Move the downloaded file to the project root (next to `index.html`)
4. Commit and push — Facebook/Twitter will use it for all link previews

The tool draws a 1200×630 branded card: title, two game cards (🧱 / 🌀), and the site URL.
After regenerating, clear Facebook's cache at: https://developers.facebook.com/tools/debug/

---

## Running Locally

ES modules require HTTP — `file://` will fail.
Use **VS Code Live Server** (right-click → Open with Live Server) or any local HTTP server.

---

## Git Config (local)
- `user.name`: joAnsks
- `user.email`: joanne.grace.cuballes@adamson.edu.ph
