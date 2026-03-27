import { g, W, H, PASTEL }    from '../state.js';
import { bg }                  from './state.js';
import { sfx }                 from '../audio.js';
import { burst }               from '../particles.js';

// Populated by game.js at module load (avoids circular dep)
export const bloomUpdateHandlers = { gameOver: null, levelComplete: null };

// Injected by game.js to avoid hud.js → bloom/update.js cycle
let _updateBloomHUD = null;
export function setBloomHUDUpdater(fn) { _updateBloomHUD = fn; }

// ── Physics constants ─────────────────────────────────────────────────────────
const PLAYER_ACCEL     = 0.32;  // acceleration per frame when key held (was 0.4)
const PLAYER_FRICTION  = 0.84;  // damping per frame when no input on that axis (was 0.88)
const PLAYER_MAX_SPEED = 3.2;   // px/frame cap for main ball (was 4.0)
const MINI_MIN_SPEED   = 1.5;   // mini-balls never stop
const MINI_MAX_SPEED   = 5.0;
const DRIFT_STRENGTH   = 0.06;  // ambient current that slowly rotates direction

// ── Cushion timing constants ──────────────────────────────────────────────────
const CUSHION_VISIBLE_DUR  = 240;  // frames visible (4 s)
const CUSHION_HIDDEN_DUR   = 150;  // frames hidden (2.5 s)
const CUSHION_FADE_FRAMES  = 25;   // frames to fade in or out

// ── Helpers ───────────────────────────────────────────────────────────────────
function clampSpeedPlayer(b) {
  const spd = Math.hypot(b.vx, b.vy);
  if (spd > PLAYER_MAX_SPEED) {
    b.vx = b.vx / spd * PLAYER_MAX_SPEED;
    b.vy = b.vy / spd * PLAYER_MAX_SPEED;
  }
}

function clampSpeedMini(b) {
  const spd = Math.hypot(b.vx, b.vy);
  if (spd < MINI_MIN_SPEED && spd > 0) {
    b.vx = b.vx / spd * MINI_MIN_SPEED;
    b.vy = b.vy / spd * MINI_MIN_SPEED;
  }
  if (spd > MINI_MAX_SPEED) {
    b.vx = b.vx / spd * MINI_MAX_SPEED;
    b.vy = b.vy / spd * MINI_MAX_SPEED;
  }
}

function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
function lerp(a, b, t) { return a + (b - a) * t; }
function easeOut(t)    { return 1 - (1 - t) * (1 - t); }
function easeIn(t)     { return t * t; }

function nearestBallIdx(x, y) {
  let best = -1, bestDist = Infinity;
  for (let i = 0; i < bg.balls.length; i++) {
    const d = Math.hypot(bg.balls[i].x - x, bg.balls[i].y - y);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

function mainBallIdx() {
  return bg.balls.findIndex(b => b.isMain);
}

function weightedCatAction() {
  const r = Math.random() * 100;
  if (r < 35) return 'squash';
  if (r < 75) return 'play';
  return 'eat';
}

// ── Cushion visibility cycling ────────────────────────────────────────────────
function updateCushions() {
  for (const c of bg.cushions) {
    if (c.visible) {
      c.visibleTimer--;
      // Fade in from start
      c.fadeT = Math.min(1, c.fadeT + 1 / CUSHION_FADE_FRAMES);
      if (c.visibleTimer <= 0) {
        c.visible     = false;
        c.hiddenTimer = CUSHION_HIDDEN_DUR;
      }
    } else {
      c.hiddenTimer--;
      // Fade out
      c.fadeT = Math.max(0, c.fadeT - 1 / CUSHION_FADE_FRAMES);
      if (c.hiddenTimer <= 0) {
        c.visible     = true;
        c.visibleTimer = CUSHION_VISIBLE_DUR;
      }
    }
  }
}

// ── Player input → main ball ──────────────────────────────────────────────────
function applyPlayerInput(b) {
  const kLeft  = g.keys['ArrowLeft']  || g.keys['a'] || g.keys['A'];
  const kRight = g.keys['ArrowRight'] || g.keys['d'] || g.keys['D'];
  const kUp    = g.keys['ArrowUp']    || g.keys['w'] || g.keys['W'];
  const kDown  = g.keys['ArrowDown']  || g.keys['s'] || g.keys['S'];

  const anyKey = kLeft || kRight || kUp || kDown;

  // Keyboard acceleration
  if (kLeft)  b.vx -= PLAYER_ACCEL;
  if (kRight) b.vx += PLAYER_ACCEL;
  if (kUp)    b.vy -= PLAYER_ACCEL;
  if (kDown)  b.vy += PLAYER_ACCEL;

  // Axis friction when no key pressed on that axis
  if (!kLeft && !kRight) b.vx *= PLAYER_FRICTION;
  if (!kUp   && !kDown)  b.vy *= PLAYER_FRICTION;

  // Ambient drift — a gentle current whose direction rotates over time
  const driftAngle = bg.frame / 320;
  b.vx += Math.cos(driftAngle) * DRIFT_STRENGTH;
  b.vy += Math.sin(driftAngle) * DRIFT_STRENGTH;

  // Mouse pull — only when keyboard is idle (so mouse doesn't fight keys)
  if (!anyKey && bg.mouseX != null && bg.mouseY != null) {
    const mdx  = bg.mouseX - b.x;
    const mdy  = bg.mouseY - b.y;
    const dist = Math.hypot(mdx, mdy);
    if (dist > 20) {
      b.vx += (mdx / dist) * 0.3;
      b.vy += (mdy / dist) * 0.3;
    }
  }

  clampSpeedPlayer(b);
}

// ── Ball physics ──────────────────────────────────────────────────────────────
function updateBalls() {
  const cW = W(), cH = H();

  for (let i = bg.balls.length - 1; i >= 0; i--) {
    const b = bg.balls[i];

    // Stun: freeze in place, flicker handled in draw
    if (b.stunned) {
      b.stunnedT--;
      if (b.stunnedT <= 0) b.stunned = false;
      continue;
    }

    // Player input for main ball; autonomous inertia for mini-balls
    if (b.isMain) {
      applyPlayerInput(b);
    }

    // Integrate
    b.x += b.vx;
    b.y += b.vy;

    // Wall bounce
    if (b.x - b.r < 0)  { b.x = b.r;      b.vx =  Math.abs(b.vx) + rand(-0.08, 0.08); sfx.wall(); }
    if (b.x + b.r > cW) { b.x = cW - b.r; b.vx = -Math.abs(b.vx) + rand(-0.08, 0.08); sfx.wall(); }
    if (b.y - b.r < 0)  { b.y = b.r;      b.vy =  Math.abs(b.vy) + rand(-0.08, 0.08); sfx.wall(); }
    if (b.y + b.r > cH) { b.y = cH - b.r; b.vy = -Math.abs(b.vy) + rand(-0.08, 0.08); sfx.wall(); }

    // Re-clamp after wall bounce (walls shouldn't launch player above max)
    if (b.isMain) clampSpeedPlayer(b);
    else          clampSpeedMini(b);

    // Mini-ball growth
    if (!b.isMain && b.r < 14) {
      b.r += 0.02;
      if (b.r > 14) b.r = 14;
    }

    b.age++;

    // Cushion collisions (only with cushions that are at least half visible)
    for (const c of bg.cushions) {
      if (c.fadeT < 0.5) continue;
      const dx   = b.x - c.x;
      const dy   = b.y - c.y;
      const dist = Math.hypot(dx, dy);
      if (dist < b.r + c.r + 1 && dist > 0) {
        // Resolve overlap
        const overlap = b.r + c.r + 1 - dist;
        const nx = dx / dist, ny = dy / dist;
        b.x += nx * overlap;
        b.y += ny * overlap;

        // Reflect velocity
        const dot = b.vx * nx + b.vy * ny;
        b.vx -= 2 * dot * nx;
        b.vy -= 2 * dot * ny;

        // Small outward impulse
        b.vx += nx * 0.4;
        b.vy += ny * 0.4;

        if (b.isMain) clampSpeedPlayer(b);
        else          clampSpeedMini(b);

        // Spawn mini-ball if cap not reached (main ball or full-size mini)
        if (bg.balls.length < 12 && (b.isMain || b.r >= 14)) {
          const spread = rand(-0.8, 0.8);
          bg.balls.push({
            x:        c.x,
            y:        c.y,
            vx:       b.vx * 0.6 + spread,
            vy:       b.vy * 0.6 + spread,
            r:        5,
            isMain:   false,
            age:      0,
            color:    PASTEL[Math.floor(Math.random() * PASTEL.length)],
            stunned:  false,
            stunnedT: 0,
          });
          bg.score += 10;
          sfx.paddle();
          burst(c.x, c.y, c.color, 8);
        }

        break; // one cushion hit per ball per frame
      }
    }
  }
}

// ── Path node activation ──────────────────────────────────────────────────────
function checkNodeActivation() {
  for (const b of bg.balls) {
    // Only fully-grown mini-balls can activate path nodes
    if (b.isMain || b.r < 14) continue;
    for (const n of bg.pathNodes) {
      if (n.activated) continue;
      if (Math.hypot(b.x - n.x, b.y - n.y) < 18) {
        n.activated = true;
        n.glowT     = 60;
        bg.pathActivated++;
        bg.score += 50;
        sfx.pu();
        burst(n.x, n.y, '#fdffb6', 14);
        if (_updateBloomHUD) _updateBloomHUD();
      }
    }
  }
}

// ── Cat state machine ─────────────────────────────────────────────────────────
function applyAction() {
  const cat = bg.cat;
  const bi  = cat.targetBallIdx;
  const b   = (bi >= 0 && bi < bg.balls.length) ? bg.balls[bi] : null;

  if (cat.action === 'squash') {
    // Squash always hits the player — apply stun and cost a life
    const mi = mainBallIdx();
    const mb = mi >= 0 ? bg.balls[mi] : null;
    if (!mb) return;
    mb.stunned  = true;
    mb.stunnedT = 60;
    sfx.wall();
    burst(mb.x, mb.y, '#ffd6a5', 12);
    g.lives--;
    if (_updateBloomHUD) _updateBloomHUD();
    if (g.lives <= 0 && bloomUpdateHandlers.gameOver) bloomUpdateHandlers.gameOver();

  } else if (cat.action === 'play') {
    // Play bats any ball (fun, not harmful)
    if (!b) return;
    const boost = 1.5 + Math.random() * 1.5;
    const angle = Math.random() * Math.PI * 2;
    b.vx += Math.cos(angle) * boost;
    b.vy += Math.sin(angle) * boost;
    if (b.isMain) clampSpeedPlayer(b);
    else          clampSpeedMini(b);
    sfx.paddle();
    burst(b.x, b.y, '#b5ead7', 10);

  } else if (cat.action === 'eat') {
    // Eat prefers mini-balls; no minis → costs a life
    const minis = bg.balls.reduce((acc, ball, idx) => {
      if (!ball.isMain) acc.push(idx);
      return acc;
    }, []);

    if (minis.length > 0) {
      const idx   = minis[Math.floor(Math.random() * minis.length)];
      const eaten = bg.balls[idx];
      burst(eaten.x, eaten.y, '#ffb3c1', 14);
      bg.balls.splice(idx, 1);
      sfx.life();
    } else {
      const mi = mainBallIdx();
      if (mi >= 0) burst(bg.balls[mi].x, bg.balls[mi].y, '#ff9ec4', 18);
      g.lives--;
      sfx.life();
      if (_updateBloomHUD) _updateBloomHUD();
      if (g.lives <= 0 && bloomUpdateHandlers.gameOver) bloomUpdateHandlers.gameOver();
    }
  }
}

function updateCat() {
  const cat = bg.cat;
  const cW  = W(), cH = H();

  if (cat.phase === 'idle') {
    cat.cooldown--;
    if (cat.cooldown > 0) return;

    const edge = Math.floor(Math.random() * 4);
    if      (edge === 0) { cat.entryX = rand(40, cW - 40); cat.entryY = -35; }
    else if (edge === 1) { cat.entryX = rand(40, cW - 40); cat.entryY = cH + 35; }
    else if (edge === 2) { cat.entryX = cW + 35; cat.entryY = rand(40, cH - 40); }
    else                 { cat.entryX = -35;      cat.entryY = rand(40, cH - 40); }

    cat.x = cat.entryX;
    cat.y = cat.entryY;
    cat.targetX = cW * 0.3 + Math.random() * cW * 0.4;
    cat.targetY = cH * 0.3 + Math.random() * cH * 0.4;
    cat.action  = weightedCatAction();
    cat.phase   = 'enter';
    cat.timer   = 40;

  } else if (cat.phase === 'enter') {
    const t = easeOut(1 - cat.timer / 40);
    cat.x = lerp(cat.entryX, cat.targetX, t);
    cat.y = lerp(cat.entryY, cat.targetY, t);
    cat.timer--;
    if (cat.timer <= 0) {
      cat.x = cat.targetX;
      cat.y = cat.targetY;
      cat.phase = 'act';
      cat.timer = 30;
      cat.pawT  = 0;
      // Squash → always targets player; eat → prefers minis; play → any ball
      if (cat.action === 'squash') {
        cat.targetBallIdx = mainBallIdx();
      } else if (cat.action === 'eat') {
        const minis = bg.balls.map((b, i) => ({ b, i })).filter(({ b }) => !b.isMain);
        cat.targetBallIdx = minis.length > 0
          ? minis[Math.floor(Math.random() * minis.length)].i
          : mainBallIdx();
      } else {
        cat.targetBallIdx = Math.floor(Math.random() * bg.balls.length);
      }
    }

  } else if (cat.phase === 'act') {
    cat.pawT = 1 - cat.timer / 30;
    const tb = (cat.targetBallIdx >= 0 && cat.targetBallIdx < bg.balls.length)
      ? bg.balls[cat.targetBallIdx] : null;
    if (tb) {
      const midX = (cat.x + tb.x) / 2;
      const midY = (cat.y + tb.y) / 2 - 30;
      const t    = cat.pawT;
      cat.pawX   = (1-t)*(1-t)*cat.x + 2*(1-t)*t*midX + t*t*tb.x;
      cat.pawY   = (1-t)*(1-t)*cat.y + 2*(1-t)*t*midY + t*t*tb.y;
    }
    cat.timer--;
    if (cat.timer <= 0) {
      applyAction();
      cat.phase = 'retreat';
      cat.timer = 30;
    }

  } else if (cat.phase === 'retreat') {
    const t = easeIn(1 - cat.timer / 30);
    cat.x = lerp(cat.targetX, cat.entryX, t);
    cat.y = lerp(cat.targetY, cat.entryY, t);
    cat.timer--;
    if (cat.timer <= 0) {
      cat.phase    = 'idle';
      cat.cooldown = Math.max(240, 600 - (g.level - 1) * 30);
    }
  }
}

// ── Particle tick ─────────────────────────────────────────────────────────────
function tickParticles() {
  for (let i = g.particles.length - 1; i >= 0; i--) {
    const p = g.particles[i];
    p.x    += p.vx;
    p.y    += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) g.particles.splice(i, 1);
  }
}

// ── Main update entry point ───────────────────────────────────────────────────
export function updateBloom() {
  bg.frame++;
  bg.elapsed = performance.now() - bg.startTime;

  updateCushions();
  updateBalls();

  // Rainbow trail — track main ball position each frame
  const _mb = bg.balls.find(b => b.isMain);
  if (_mb && !_mb.stunned) {
    bg.mainTrail.push({ x: _mb.x, y: _mb.y });
    if (bg.mainTrail.length > 18) bg.mainTrail.shift();
  }
  checkNodeActivation();
  updateCat();
  tickParticles();

  if (_updateBloomHUD) _updateBloomHUD();

  if (bg.pathActivated >= bg.pathTotal && !bg.awaitingNextLevel) {
    bg.awaitingNextLevel = true;
    if (bloomUpdateHandlers.levelComplete) bloomUpdateHandlers.levelComplete();
  }
}
