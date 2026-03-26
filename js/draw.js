import { g, ctx, W, H, BALL_CLR, BALL_R, PADDLE_CLR1, PADDLE_CLR2, PAD } from './state.js';

export function shadeColor(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + pct));
  const gr = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + pct));
  const b  = Math.max(0, Math.min(255, (n & 0xff) + pct));
  return `rgb(${r},${gr},${b})`;
}

export function draw() {
  // Screen shake offset
  let sx = 0, sy = 0;
  if (g.shakeT > 0) {
    sx = (Math.random() - 0.5) * g.shakeAmt;
    sy = (Math.random() - 0.5) * g.shakeAmt;
  }
  ctx.save();
  ctx.translate(sx, sy);

  // Background
  ctx.fillStyle = '#2a1533';
  ctx.fillRect(0, 0, W(), H());

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W(); x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H()); ctx.stroke(); }
  for (let y = 0; y < H(); y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W(), y); ctx.stroke(); }

  // Bricks
  g.bricks.forEach(b => {
    if (!b.alive) return;
    const glow    = 0.5 + 0.5 * Math.sin(b.shimmer);
    const cracked = b.hp < b.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.roundRect(b.x + 3, b.y + 3, g.brickW, g.brickH, 4); ctx.fill();
    ctx.fillStyle = cracked ? shadeColor(b.color, -30) : b.color;
    ctx.beginPath(); ctx.roundRect(b.x, b.y, g.brickW, g.brickH, 4); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${0.14 + glow * 0.17})`;
    ctx.beginPath(); ctx.roundRect(b.x + 2, b.y + 2, g.brickW - 4, g.brickH * 0.42, 3); ctx.fill();
    if (cracked) {
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(b.x + g.brickW * 0.3, b.y + 2);
      ctx.lineTo(b.x + g.brickW * 0.5, b.y + g.brickH * 0.6);
      ctx.lineTo(b.x + g.brickW * 0.7, b.y + g.brickH - 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(40,20,50,0.7)';
    ctx.font = `bold ${Math.max(7, g.brickH * 0.36)}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.pts, b.x + g.brickW / 2, b.y + g.brickH / 2);
  });

  // Power-up drops
  g.drops.forEach(d => {
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 180);
    ctx.save();
    ctx.shadowColor = d.type.color;
    ctx.shadowBlur  = 8 * pulse;
    ctx.fillStyle   = d.type.color;
    ctx.strokeStyle = d.type.borderColor;
    ctx.lineWidth   = 2;
    ctx.beginPath(); ctx.roundRect(d.x - 18, d.y - 8, 36, 16, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3d2b4e';
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.type.label, d.x, d.y);
    ctx.restore();
  });

  // Particles
  g.particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle   = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Ball trails + balls
  g.balls.forEach(ball => {
    ball.trail.forEach((t, i) => {
      ctx.globalAlpha = (i / ball.trail.length) * 0.38;
      ctx.fillStyle   = BALL_CLR;
      ctx.beginPath();
      ctx.arc(t.x, t.y, BALL_R * (i / ball.trail.length) * 0.65, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    const grd = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, BALL_R * 2.6);
    grd.addColorStop(0, 'rgba(255,240,255,0.5)');
    grd.addColorStop(1, 'rgba(255,180,210,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R * 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = BALL_CLR;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(ball.x - 2, ball.y - 2, BALL_R * 0.35, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Paddle
  const padTop = H() - PAD.gap - PAD.h;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.roundRect(g.padX + 3, padTop + 3, g.padW, PAD.h, 6); ctx.fill();
  const padGrd = ctx.createLinearGradient(g.padX, 0, g.padX + g.padW, 0);
  padGrd.addColorStop(0, g.padWidened > 0 ? '#b5ead7' : PADDLE_CLR1);
  padGrd.addColorStop(1, g.padWidened > 0 ? '#a2d2ff' : PADDLE_CLR2);
  ctx.fillStyle = padGrd;
  ctx.beginPath(); ctx.roundRect(g.padX, padTop, g.padW, PAD.h, 6); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.roundRect(g.padX + 4, padTop + 2, g.padW - 8, PAD.h * 0.38, 3); ctx.fill();

  // Danger zone
  ctx.strokeStyle = 'rgba(255,100,120,0.1)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.moveTo(0, H() - 2); ctx.lineTo(W(), H() - 2); ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}
