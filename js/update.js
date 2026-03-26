import { g, W, H, BALL_R, PAD } from './state.js';
import { sfx } from './audio.js';
import { burst } from './particles.js';
import { tickPUs, spawnDrop, applyPU, randomPUType } from './powerups.js';
import { clampPad } from './paddle.js';
import { initBall } from './ball.js';
import { updateHUD } from './hud.js';

// gameOver / nextLevel injected by main.js to avoid circular dep with transitions.js
export const handlers = { gameOver: null, nextLevel: null };

function ballHitsBrick(ball, b) {
  return ball.x + BALL_R > b.x && ball.x - BALL_R < b.x + g.brickW &&
         ball.y + BALL_R > b.y && ball.y - BALL_R < b.y + g.brickH;
}

export function update() {
  tickPUs();

  // Paddle movement
  if (g.mouseX !== null) {
    g.padX += (g.mouseX - g.padX) * 0.3;
  }
  if (g.keys['ArrowLeft']  || g.keys['a']) { g.padX -= PAD.speed + g.level * 0.5; g.mouseX = null; }
  if (g.keys['ArrowRight'] || g.keys['d']) { g.padX += PAD.speed + g.level * 0.5; g.mouseX = null; }
  clampPad();

  // Balls
  for (let bi = g.balls.length - 1; bi >= 0; bi--) {
    const ball = g.balls[bi];

    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 9) ball.trail.shift();

    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall bounce
    if (ball.x - BALL_R < 0)    { ball.x = BALL_R;      ball.dx =  Math.abs(ball.dx); sfx.wall(); }
    if (ball.x + BALL_R > W())  { ball.x = W() - BALL_R; ball.dx = -Math.abs(ball.dx); sfx.wall(); }
    if (ball.y - BALL_R < 0)    { ball.y = BALL_R;      ball.dy =  Math.abs(ball.dy); sfx.wall(); }

    // Paddle bounce
    const padTop = H() - PAD.gap - PAD.h;
    if (ball.dy > 0 &&
        ball.y + BALL_R >= padTop &&
        ball.y - BALL_R <= padTop + PAD.h &&
        ball.x > g.padX - 4 &&
        ball.x < g.padX + g.padW + 4) {
      ball.dy = -Math.abs(ball.dy);
      const rel    = (ball.x - g.padX) / g.padW;
      ball.dx      = (rel - 0.5) * (8 + g.level * 0.4);
      const spd    = Math.hypot(ball.dx, ball.dy);
      const target = (g.activePUs.slow > 0 ? 2.5 : 3.5) + g.level * 0.35;
      ball.dx *= target / spd;
      ball.dy *= target / spd;
      ball.y = padTop - BALL_R;
      sfx.paddle();
    }

    // Brick collisions
    for (const b of g.bricks) {
      if (!b.alive) continue;
      if (ballHitsBrick(ball, b)) {
        const overlapX = Math.min(ball.x + BALL_R - b.x,   b.x + g.brickW - (ball.x - BALL_R));
        const overlapY = Math.min(ball.y + BALL_R - b.y,   b.y + g.brickH - (ball.y - BALL_R));
        if (overlapX < overlapY) ball.dx = -ball.dx;
        else                     ball.dy = -ball.dy;
        b.hp--;
        sfx.brick();
        if (b.hp <= 0) {
          b.alive = false;
          g.score += b.pts * g.level;
          updateHUD();
          burst(b.x + g.brickW / 2, b.y + g.brickH / 2, b.color);
          if (b.pu) spawnDrop(b.x + g.brickW / 2, b.y + g.brickH / 2, randomPUType());
        } else {
          burst(b.x + g.brickW / 2, b.y + g.brickH / 2, '#fff', 5);
        }
        break;
      }
    }

    // Ball lost
    if (ball.y - BALL_R > H()) g.balls.splice(bi, 1);
  }

  // No balls left
  if (g.balls.length === 0) {
    g.lives--;
    sfx.life();
    g.shakeT = 12; g.shakeAmt = 7;
    updateHUD();
    if (g.lives <= 0) { handlers.gameOver(); return; }
    initBall();
  }

  // Level clear
  if (g.bricks.every(b => !b.alive)) {
    sfx.clear();
    g.level++;
    updateHUD();
    handlers.nextLevel();
    return;
  }

  // Drop updates
  const padTop = H() - PAD.gap - PAD.h;
  for (let di = g.drops.length - 1; di >= 0; di--) {
    const d = g.drops[di];
    if (!d.alive) { g.drops.splice(di, 1); continue; }
    d.y += d.vy;
    if (d.y > padTop && d.y < padTop + PAD.h + 12 && d.x > g.padX && d.x < g.padX + g.padW) {
      applyPU(d.type);
      d.alive = false;
      g.drops.splice(di, 1);
      continue;
    }
    if (d.y > H() + 20) g.drops.splice(di, 1);
  }

  // Particles + shimmer
  g.bricks.forEach(b => { b.shimmer += 0.03; });
  g.particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.08;
    p.life -= p.decay;
    p.r    *= 0.97;
  });
  g.particles = g.particles.filter(p => p.life > 0);

  // Shake decay
  if (g.shakeT > 0) g.shakeT--;
}
