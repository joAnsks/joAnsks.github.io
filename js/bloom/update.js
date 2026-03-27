import { g, W, H, PASTEL }    from '../state.js';
import { bg }                  from './state.js';
import { sfx }                 from '../audio.js';
import { burst }               from '../particles.js';

// Populated by game.js at module load (avoids circular dep)
export const bloomUpdateHandlers = { gameOver: null, levelComplete: null };

// Imported lazily to avoid circular dep (hud → bloom/state → ok)
let _updateBloomHUD = null;
export function setBloomHUDUpdater(fn) { _updateBloomHUD = fn; }

// ── Helpers ───────────────────────────────────────────────────────────────────
function clampSpeed(b) {
  const spd = Math.hypot(b.vx, b.vy);
  if (spd < 1.5) { b.vx = b.vx / spd * 1.5; b.vy = b.vy / spd * 1.5; }
  if (spd > 5.0) { b.vx = b.vx / spd * 5.0; b.vy = b.vy / spd * 5.0; }
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

function weightedCatAction() {
  const r = Math.random() * 100;
  if (r < 35) return 'squash';
  if (r < 75) return 'play';
  return 'eat';
}

// ── Ball physics ──────────────────────────────────────────────────────────────
function updateBalls() {
  const cW = W(), cH = H();

  for (let i = bg.balls.length - 1; i >= 0; i--) {
    const b = bg.balls[i];

    // Stunned: freeze in place
    if (b.stunned) {
      b.stunnedT--;
      if (b.stunnedT <= 0) b.stunned = false;
      continue;
    }

    // Integrate
    b.x += b.vx;
    b.y += b.vy;

    // Wall bounce
    if (b.x - b.r < 0)    { b.x = b.r;       b.vx =  Math.abs(b.vx) + rand(-0.1, 0.1); sfx.wall(); }
    if (b.x + b.r > cW)   { b.x = cW - b.r;  b.vx = -Math.abs(b.vx) + rand(-0.1, 0.1); sfx.wall(); }
    if (b.y - b.r < 0)    { b.y = b.r;        b.vy =  Math.abs(b.vy) + rand(-0.1, 0.1); sfx.wall(); }
    if (b.y + b.r > cH)   { b.y = cH - b.r;   b.vy = -Math.abs(b.vy) + rand(-0.1, 0.1); sfx.wall(); }
    clampSpeed(b);

    // Mini-ball growth
    if (!b.isMain && b.r < 14) {
      b.r += 0.02;
      if (b.r > 14) b.r = 14;
    }

    b.age++;

    // Cushion collisions
    for (const c of bg.cushions) {
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
        b.vx += nx * 0.5;
        b.vy += ny * 0.5;
        clampSpeed(b);

        // Spawn mini-ball if cap not reached; only full-size or main balls spawn
        if (bg.balls.length < 12 && (b.isMain || b.r >= 14)) {
          const spread = rand(-0.8, 0.8);
          bg.balls.push({
            x:       c.x,
            y:       c.y,
            vx:      b.vx * 0.6 + spread,
            vy:      b.vy * 0.6 + spread,
            r:       5,
            isMain:  false,
            age:     0,
            color:   PASTEL[Math.floor(Math.random() * PASTEL.length)],
            stunned: false,
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
    if (!b) return;
    b.stunned   = true;
    b.stunnedT  = 60;
    sfx.wall();
    burst(b.x, b.y, '#ffd6a5', 12);
    if (b.isMain) {
      g.lives--;
      if (_updateBloomHUD) _updateBloomHUD();
      if (g.lives <= 0 && bloomUpdateHandlers.gameOver) bloomUpdateHandlers.gameOver();
    }

  } else if (cat.action === 'play') {
    if (!b) return;
    const boost = 1.5 + Math.random() * 1.5;
    const angle = Math.random() * Math.PI * 2;
    b.vx += Math.cos(angle) * boost;
    b.vy += Math.sin(angle) * boost;
    clampSpeed(b);
    sfx.paddle();
    burst(b.x, b.y, '#b5ead7', 10);

  } else if (cat.action === 'eat') {
    const minis = bg.balls.reduce((acc, ball, idx) => {
      if (!ball.isMain) acc.push(idx);
      return acc;
    }, []);

    if (minis.length > 0) {
      const idx    = minis[Math.floor(Math.random() * minis.length)];
      const eaten  = bg.balls[idx];
      burst(eaten.x, eaten.y, '#ffb3c1', 14);
      bg.balls.splice(idx, 1);
      sfx.life();
    } else {
      // No minis — eat main ball (lose a life)
      const main = bg.balls.find(ball => ball.isMain);
      if (main) burst(main.x, main.y, '#ff9ec4', 18);
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

    // Pick random edge entry
    const edge = Math.floor(Math.random() * 4); // 0=N 1=S 2=E 3=W
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
      // Pick target ball
      if (cat.action === 'eat') {
        // Prefer minis for eat
        const minis = bg.balls.map((b, i) => ({ b, i })).filter(({ b }) => !b.isMain);
        cat.targetBallIdx = minis.length > 0
          ? minis[Math.floor(Math.random() * minis.length)].i
          : nearestBallIdx(cat.x, cat.y);
      } else {
        cat.targetBallIdx = nearestBallIdx(cat.x, cat.y);
      }
    }

  } else if (cat.phase === 'act') {
    cat.pawT = 1 - cat.timer / 30;
    // Animate paw arc toward target ball
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

  updateBalls();
  checkNodeActivation();
  updateCat();
  tickParticles();

  if (_updateBloomHUD) _updateBloomHUD();

  // Level complete
  if (bg.pathActivated >= bg.pathTotal && !bg.awaitingNextLevel) {
    bg.awaitingNextLevel = true;
    if (bloomUpdateHandlers.levelComplete) bloomUpdateHandlers.levelComplete();
  }
}
