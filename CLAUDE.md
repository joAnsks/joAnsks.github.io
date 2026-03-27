# CLAUDE.md — Project Notes

> Keep this file updated after every structural or design change. This is the reference for every new session.

---

## Overview

**joAnsks's GitHub Pages site** — hosted at `https://joAnsks.github.io`.
Contains three retro pastel mini-games accessible from a shared game-select screen:
1. **Pastel Bounce** — brick-breaker
2. **Ball Maze** — timed maze navigation with traps and power-ups
3. **Ball Bloom** — physics sandbox where balls multiply on cushions; a cat visits; find hidden wall paths

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
    ├── maze/
    │   ├── gen.js      # generateMaze(cols, rows), mazeSize(level)
    │   ├── state.js    # Isolated mg{} object (all maze mutable state)
    │   ├── draw.js     # drawMaze(), exports CELL=40
    │   ├── update.js   # updateMaze(), tryMove(), handleTrap(), handlePowerup(),
    │   │               #   mazeUpdateHandlers{} injection point
    │   └── game.js     # Maze lifecycle: startMazeGame(), mazeLevelComplete(),
    │                   #   mazeGameOver(), mazePause(), mazeResume(),
    │                   #   mazeHandlers{}, entity placement, localStorage
    └── bloom/
        ├── state.js    # Isolated bg{} object (balls, cushions, pathNodes, cat)
        ├── gen.js      # generateCushions(level,W,H), generatePathNodes(level,W,H)
        ├── draw.js     # drawBloom() — canvas renderer
        ├── update.js   # updateBloom(), bloomUpdateHandlers{} injection point,
        │               #   setBloomHUDUpdater() (avoids circular dep with hud.js)
        └── game.js     # Bloom lifecycle: startBloomGame(), bloomLevelComplete(),
                        #   bloomGameOver(), bloomPause(), bloomResume(),
                        #   bloomHandlers{}, localStorage key 'bloom_best'
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
hud.js            ← state, share, bloom/state
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
bloom/state.js    ← no game deps
bloom/gen.js      ← state (PASTEL)
bloom/update.js   ← state, bloom/state, audio, particles
bloom/draw.js     ← state, bloom/state
bloom/game.js     ← state, bloom/state, bloom/gen, bloom/update, hud, audio
main.js           ← all of the above
```

**Circular dep avoidance pattern** (used in all three games):
- `update.js` exports `handlers{}` (null-initialized), `main.js` injects `gameOver` / `nextLevel`
- `maze/update.js` exports `mazeUpdateHandlers{}`, `maze/game.js` populates them at module load
- `bloom/update.js` exports `bloomUpdateHandlers{}`, `bloom/game.js` populates them at module load
- `bloom/update.js` also exports `setBloomHUDUpdater(fn)` — called by `bloom/game.js` to inject `updateBloomHUD` without creating a `hud.js → bloom/update.js` cycle

---

## Shared State — `g` object (`js/state.js`)

| Property | Type | Description |
|---|---|---|
| `g.gameMode` | string\|null | `null` \| `'bounce'` \| `'maze'` \| `'bloom'` |
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
| `g.keys` | object | Keyboard state — shared by all games |
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

## Bloom State — `bg` object (`js/bloom/state.js`)

Completely isolated from `g{}` and `mg{}`. Key fields:

| Property | Description |
|---|---|
| `bg.balls` | Array of `{x, y, vx, vy, r, isMain, age, color, stunned, stunnedT}` |
| `bg.cushions` | Array of `{x, y, r, color}` — bumper pads that spawn child-balls |
| `bg.pathNodes` | Array of `{x, y, r, activated, side:'N'|'S'|'E'|'W', glowT}` — hidden wall triggers |
| `bg.pathActivated` / `bg.pathTotal` | Progress toward level completion |
| `bg.cat` | Object with `phase`, position, `action`, `timer`, `cooldown`, paw animation fields |
| `bg.score` / `bg.bestScores` | Score (accumulates per level); `bestScores` is `{[level]: score}` → `localStorage` key `bloom_best` |
| `bg.startTime` / `bg.elapsed` / `bg._pausedAt` | Timer fields (same pattern as `mg`) |
| `bg.frame` | Raw frame counter for animations |
| `bg.awaitingNextLevel` | True after level complete, cleared when next begins |

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
- **Chaser:** red enemy spawns at (0,0) with the ball; starts chasing after 10 s; speed ramps up each level; catching the ball costs 1 life (shield absorbs the catch instead) and resets chaser to (0,0) with a 2 s grace period; heartbeat thumps when chaser is within 4 cells (Manhattan distance); a random meme jumpscare flashes for 1.2 s on an unshielded catch
- **Timer:** `performance.now()` sub-ms accuracy; pause shifts `mg.startTime`
- **Levels:** maze grows 7×7 → 9×9 → … → 25×25 then cycles (10 sizes)
- **Best times:** saved per level in `localStorage` key `maze_best`

### Maze Generation
- Iterative DFS (recursive backtracker) in `maze/gen.js`
- Cell walls: `{N, S, E, W}` — `true` = blocked

### Entities (~6% of cells)
Entity pool (weighted, sums to 100 at normal lives):

| Icon | Type | Kind | Weight (normal / last life) | Effect |
|---|---|---|---|---|
| ⟳ | `teleport` | Trap | 30% / 30% | Warps ball to random cell; shield blocks |
| ⌛ | `slow` | Trap | 25% / 25% | Halves player speed for 3 s; shield blocks |
| ❄ | `freeze` | Power-up | 20% / 20% | Freezes the chaser for 3 s; chaser turns blue |
| ★ | `speed` | Power-up | 19% / 19% | 2× player speed for 5 s |
| ♥ | `shield` | Power-up | 3% / 3% | Absorbs next trap hit **or** chaser catch |
| + | `life` | Power-up | **3% / 15%** | +1 life (max 5); weight triples on last life |

Traps never placed on the solution path.

---

## Game: Ball Bloom

### Gameplay
- **Goal:** trigger all hidden path nodes along the canvas walls to advance the level
- **Control:** none (passive/ambient) — ball physics run automatically; SPACE = pause
- **Lives:** 3; losing all → Game Over
- **Balls:** one main ball bounces freely; hitting cushions spawns a mini child-ball at the cushion centre; mini-balls grow (`r: 5 → 14` at `+0.02/frame`); full-size minis can also spawn children; max 12 balls total
- **Cushions:** `2 + level` bumper pads (rejection-sampled: ≥60 px from edges, ≥80 px from centre, no overlaps); each cushion hit reflects velocity + small outward impulse + spawns child ball + `+10` score
- **Path nodes:** `3 + level` nodes distributed evenly along the four canvas wall edges; initially faint (alpha 0.12); a ball passing within 18 px activates the node (glow + burst + `+50` score); all activated → level complete
- **Cat:** visits every `max(240, 600 − (level−1)×30)` frames; enters from a random edge, slides to centre, performs an action, retreats:
  - **Squash** (35%): stuns nearest ball for 60 frames (squashed ellipse); if main ball → `g.lives--`; game over when lives reach 0
  - **Play** (40%): bats a random ball with a random velocity boost (1.5–3.0); harmless
  - **Eat** (25%): removes a random mini-ball; if no minis → eats main ball (lose a life)
- **Levels:** cushions + path nodes grow each level; cat cooldown decreases; score carries across levels
- **Best scores:** saved per level in `localStorage` key `bloom_best`

### Level Progression
- Level N: `2 + N` cushions, `3 + N` path nodes
- Cat cooldown: `max(240, 600 − (N−1) × 30)` frames (reaches minimum ~120 at level 13+)
- Ball cap: 12 total

---

## UI Architecture

### Game-Select Screen (`#game-select`)
- Shown on load; three `.game-card` buttons (Brick Breaker, Ball Maze, Ball Bloom)
- Clicking a card calls `startGame()`, `startMazeGame()`, or `startBloomGame()`, shows HUD + canvas

### HUD (`#hud`)
- Hidden until a game starts
- `◀ MENU` back button (`#back-btn`) returns to game-select
- Score label dynamically switches: **SCORE** (bounce/bloom) ↔ **TIME** (maze) via `setHUDMode()`
- Maze time shown as `ss.cs` or `m:ss.cs`
- Bloom: SCORE shows cumulative score; PATH counter (`N/M`) rendered directly on canvas (top-right)

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
- Bloom: `oBtn` click → `bloomHandlers.overlayBtn()` (state-dispatched)
- `showOverlay(title, msg, btnTxt, shareText?, gameName?)` — optional 4th/5th args show `#share-btn`
- `#share-btn` (`<button>`) click calls `shareScore(shareText, gameName)` from `js/share.js`
- Share button shown on: Bounce Game Over, Maze Level Clear, Maze Game Over, Bloom Level Clear, Bloom Game Over
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

The tool draws a 1200×630 branded card: title, three game cards (🧱 / 🌀 / 🌸), and the site URL. Update `tools/make-og.html` to include the Ball Bloom card if regenerating.
After regenerating, clear Facebook's cache at: https://developers.facebook.com/tools/debug/

---

## Running Locally

ES modules require HTTP — `file://` will fail.
Use **VS Code Live Server** (right-click → Open with Live Server) or any local HTTP server.

---

## Git Config (local)
- `user.name`: joAnsks
- `user.email`: joanne.grace.cuballes@adamson.edu.ph
