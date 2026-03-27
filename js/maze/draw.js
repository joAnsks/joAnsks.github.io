import { ctx, W, H } from '../state.js';
import { mg }        from './state.js';

export const CELL = 40;   // pixels per cell — shared with update.js

// ── Camera smooth pan ─────────────────────────────────────────
function updateCamera() {
  const mazeW = mg.cols * CELL;
  const mazeH = mg.rows * CELL;

  // When maze is smaller than canvas, centre it
  if (mazeW <= W()) { mg.camX = (mazeW - W()) / 2; }
  else {
    const targetX = mg.ballPx - W() / 2;
    mg.camX += (targetX - mg.camX) * 0.12;
    mg.camX = Math.max(0, Math.min(mazeW - W(), mg.camX));
  }

  if (mazeH <= H()) { mg.camY = (mazeH - H()) / 2; }
  else {
    const targetY = mg.ballPy - H() / 2;
    mg.camY += (targetY - mg.camY) * 0.12;
    mg.camY = Math.max(0, Math.min(mazeH - H(), mg.camY));
  }
}

export function drawMaze() {
  if (!mg.grid) return;
  updateCamera();

  // Background
  ctx.fillStyle = '#2a1533';
  ctx.fillRect(0, 0, W(), H());

  // Dot grid background
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let x = 0; x < W(); x += 20)
    for (let y = 0; y < H(); y += 20)
      ctx.fillRect(x, y, 1, 1);

  ctx.save();
  ctx.translate(-mg.camX, -mg.camY);

  // ── Cell floors ───────────────────────────────────────────────
  for (let r = 0; r < mg.rows; r++) {
    for (let c = 0; c < mg.cols; c++) {
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      ctx.fillRect(c * CELL + 3, r * CELL + 3, CELL - 6, CELL - 6);
    }
  }

  // ── Exit cell ─────────────────────────────────────────────────
  const ec = mg.cols - 1, er = mg.rows - 1;
  const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 400);
  ctx.save();
  ctx.shadowColor = '#b5ead7';
  ctx.shadowBlur  = 16 * pulse;
  ctx.fillStyle   = `rgba(181,234,215,${0.22 * pulse})`;
  ctx.fillRect(ec * CELL + 3, er * CELL + 3, CELL - 6, CELL - 6);
  ctx.restore();
  ctx.fillStyle    = '#b5ead7';
  ctx.font         = `${Math.floor(CELL * 0.48)}px serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', ec * CELL + CELL / 2, er * CELL + CELL / 2);

  // ── Start cell marker ─────────────────────────────────────────
  ctx.fillStyle    = 'rgba(253,255,182,0.15)';
  ctx.fillRect(3, 3, CELL - 6, CELL - 6);

  // ── Entities (traps & power-ups) ──────────────────────────────
  for (const ent of mg.entities) {
    if (ent.hit) continue;
    const ex = ent.col * CELL + CELL / 2;
    const ey = ent.row * CELL + CELL / 2;
    const ep = 0.7 + 0.3 * Math.sin(Date.now() / 300 + ent.col + ent.row);

    const ICONS  = { teleport: '⟳', freeze: '❄', speed: '★', shield: '♥', life: '+' };
    const COLORS = { teleport: '#ffb3c1', freeze: '#bde0fe', speed: '#fdffb6', shield: '#cdb4db', life: '#ffb3c1' };

    ctx.save();
    ctx.shadowColor = COLORS[ent.type];
    ctx.shadowBlur  = 8 * ep;
    ctx.fillStyle   = COLORS[ent.type];
    ctx.font        = `${Math.floor(CELL * 0.38)}px 'Press Start 2P', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ICONS[ent.type], ex, ey);
    ctx.restore();
  }

  // ── Walls ─────────────────────────────────────────────────────
  ctx.strokeStyle = '#cdb4db';
  ctx.lineWidth   = 3;
  ctx.lineCap     = 'square';

  for (let r = 0; r < mg.rows; r++) {
    for (let c = 0; c < mg.cols; c++) {
      const cell = mg.grid[r][c];
      const px   = c * CELL, py = r * CELL;

      // Draw N and W per cell to avoid doubling shared walls
      if (cell.walls.N) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + CELL, py); ctx.stroke(); }
      if (cell.walls.W) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + CELL); ctx.stroke(); }
      if (r === mg.rows - 1 && cell.walls.S) {
        ctx.beginPath(); ctx.moveTo(px, py + CELL); ctx.lineTo(px + CELL, py + CELL); ctx.stroke();
      }
      if (c === mg.cols - 1 && cell.walls.E) {
        ctx.beginPath(); ctx.moveTo(px + CELL, py); ctx.lineTo(px + CELL, py + CELL); ctx.stroke();
      }
    }
  }

  // ── Chaser ────────────────────────────────────────────────────
  {
    // Pulse faster as it gets closer to the ball
    const dx    = mg.chaserPx - mg.ballPx, dy = mg.chaserPy - mg.ballPy;
    const dist  = Math.sqrt(dx * dx + dy * dy);
    const rate  = mg.chaserDelay > 0 ? 500 : Math.max(80, dist * 1.5);
    const pulse = 0.55 + 0.45 * Math.sin(Date.now() / rate);
    const alpha = mg.chaserDelay > 60 ? 0 : mg.chaserDelay > 0 ? (1 - mg.chaserDelay / 60) * 0.6 : 1;

    if (alpha > 0) {
      const chaserColor = mg.chaserFrozen ? '#bde0fe' : '#ff6b6b';
      ctx.save();
      ctx.globalAlpha = alpha;
      // Glow
      ctx.shadowColor = chaserColor;
      ctx.shadowBlur  = 18 * pulse;
      // Body
      ctx.fillStyle = chaserColor;
      ctx.beginPath(); ctx.arc(mg.chaserPx, mg.chaserPy, 9, 0, Math.PI * 2); ctx.fill();
      // Angry eyes
      ctx.shadowBlur = 0;
      ctx.fillStyle  = '#2a1533';
      ctx.beginPath(); ctx.arc(mg.chaserPx - 3, mg.chaserPy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(mg.chaserPx + 3, mg.chaserPy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
      // Angry brow lines
      ctx.strokeStyle = '#2a1533';
      ctx.lineWidth   = 1.5;
      ctx.beginPath(); ctx.moveTo(mg.chaserPx - 5.5, mg.chaserPy - 5); ctx.lineTo(mg.chaserPx - 1, mg.chaserPy - 3.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mg.chaserPx + 5.5, mg.chaserPy - 5); ctx.lineTo(mg.chaserPx + 1, mg.chaserPy - 3.5); ctx.stroke();
      ctx.restore();
    }
  }

  // ── Shield ring around ball ───────────────────────────────────
  if (mg.shielded) {
    const sr = 0.7 + 0.3 * Math.sin(Date.now() / 180);
    ctx.save();
    ctx.strokeStyle = `rgba(205,180,219,${sr})`;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.arc(mg.ballPx, mg.ballPy, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── Freeze tint ───────────────────────────────────────────────
  if (mg.frozen) {
    ctx.fillStyle = 'rgba(189,224,254,0.07)';
    ctx.fillRect(0, 0, mg.cols * CELL, mg.rows * CELL);
  }

  // ── Ball glow ─────────────────────────────────────────────────
  const ballColor = mg.boosted ? '#fdffb6' : mg.frozen ? '#bde0fe' : '#fff9fb';
  const grd = ctx.createRadialGradient(mg.ballPx, mg.ballPy, 0, mg.ballPx, mg.ballPy, 20);
  grd.addColorStop(0, 'rgba(255,240,255,0.55)');
  grd.addColorStop(1, 'rgba(255,180,210,0)');
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(mg.ballPx, mg.ballPy, 20, 0, Math.PI * 2); ctx.fill();

  // ── Ball body ─────────────────────────────────────────────────
  ctx.fillStyle = ballColor;
  ctx.beginPath(); ctx.arc(mg.ballPx, mg.ballPy, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.arc(mg.ballPx - 2, mg.ballPy - 2, 3, 0, Math.PI * 2); ctx.fill();

  ctx.restore();

  // ── On-canvas effect labels (freeze/boost timers) ─────────────
  if (mg.boosted || mg.chaserFrozen) {
    ctx.font         = '7px "Press Start 2P", monospace';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'top';
    if (mg.boosted) {
      ctx.fillStyle = '#fdffb6';
      ctx.fillText('SPEED!', W() - 8, 8);
    }
    if (mg.chaserFrozen) {
      ctx.fillStyle = '#bde0fe';
      ctx.fillText('CHASER FROZEN!', W() - 8, mg.boosted ? 20 : 8);
    }
  }
}
