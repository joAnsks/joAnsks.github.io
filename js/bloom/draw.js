import { ctx, W, H, g } from '../state.js';
import { bg }            from './state.js';

const TAU = Math.PI * 2;

function hexToRgba(hex, a) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ── Cat renderer (local) ──────────────────────────────────────────────────────
function drawCat(cat) {
  const { x: cx, y: cy, phase, pawX, pawY, pawT, action } = cat;

  ctx.save();

  // Triangle ears
  ctx.fillStyle = '#cdb4db';
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy - 10);
  ctx.lineTo(cx - 6,  cy - 23);
  ctx.lineTo(cx + 1,  cy - 11);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + 10, cy - 10);
  ctx.lineTo(cx + 6,  cy - 23);
  ctx.lineTo(cx - 1,  cy - 11);
  ctx.closePath();
  ctx.fill();

  // Head
  ctx.fillStyle = '#ffd6a5';
  ctx.beginPath();
  ctx.arc(cx, cy, 13, 0, TAU);
  ctx.fill();

  // Blush cheeks (for 'play' action only)
  if (action === 'play') {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ffb3c1';
    ctx.beginPath(); ctx.arc(cx - 8, cy + 3, 4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 8, cy + 3, 4, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Eyes
  ctx.fillStyle = '#3d2b4e';
  ctx.beginPath(); ctx.arc(cx - 4, cy - 2, 2.5, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 4, cy - 2, 2.5, 0, TAU); ctx.fill();

  // Eye shine
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx - 3, cy - 3, 1, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 5, cy - 3, 1, 0, TAU); ctx.fill();

  // Nose
  ctx.fillStyle = '#ffb3c1';
  ctx.beginPath();
  ctx.moveTo(cx, cy + 2);
  ctx.lineTo(cx - 2, cy);
  ctx.lineTo(cx + 2, cy);
  ctx.closePath();
  ctx.fill();

  // Whiskers
  ctx.strokeStyle = '#fff9fb';
  ctx.lineWidth   = 1;
  ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(cx - 5, cy + 1); ctx.lineTo(cx - 17, cy);     ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 5, cy + 3); ctx.lineTo(cx - 17, cy + 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 5, cy + 1); ctx.lineTo(cx + 17, cy);     ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 5, cy + 3); ctx.lineTo(cx + 17, cy + 5); ctx.stroke();
  ctx.globalAlpha = 1;

  // Paw (only during 'act' phase when pawT > 0)
  if (phase === 'act' && pawT > 0) {
    // Arm line from cat body to paw
    ctx.strokeStyle = '#ffd6a5';
    ctx.lineWidth   = 2;
    ctx.globalAlpha = 0.5 * pawT;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 10);
    ctx.lineTo(pawX, pawY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Paw pad
    ctx.fillStyle = '#ffd6a5';
    ctx.beginPath(); ctx.arc(pawX, pawY, 7, 0, TAU); ctx.fill();

    // Toe bumps
    ctx.fillStyle = action === 'squash' ? '#ffb3c1' : '#ffc8dd';
    const toes = [[-3, -4], [0, -5.5], [3, -4]];
    for (const [tx, ty] of toes) {
      ctx.beginPath(); ctx.arc(pawX + tx, pawY + ty, 2.5, 0, TAU); ctx.fill();
    }
  }

  ctx.restore();
}

// ── Main draw function ────────────────────────────────────────────────────────
export function drawBloom() {
  const cW = W(), cH = H();

  // 1. Background
  ctx.fillStyle = '#2a1533';
  ctx.fillRect(0, 0, cW, cH);

  // Faint dot-grid overlay
  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = '#ffffff';
  const spacing = 20;
  for (let x = spacing; x < cW; x += spacing) {
    for (let y = spacing; y < cH; y += spacing) {
      ctx.beginPath(); ctx.arc(x, y, 1, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();

  // 2. Path nodes
  for (const n of bg.pathNodes) {
    ctx.save();
    if (n.activated) {
      // Glowing solid fill
      ctx.shadowColor = '#fdffb6';
      ctx.shadowBlur  = 18;
      ctx.fillStyle   = 'rgba(253,255,182,0.75)';
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r - 2, 0, TAU); ctx.fill();

      ctx.strokeStyle = '#fdffb6';
      ctx.lineWidth   = 2.5;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.stroke();

      // Fresh-activate expanding ring
      if (n.glowT > 0) {
        const alpha  = n.glowT / 60;
        const rOuter = n.r + (60 - n.glowT) * 0.5;
        ctx.strokeStyle = `rgba(253,255,182,${alpha})`;
        ctx.lineWidth   = 2;
        ctx.shadowBlur  = 0;
        ctx.beginPath(); ctx.arc(n.x, n.y, rOuter, 0, TAU); ctx.stroke();
        n.glowT--;
      }
    } else {
      // Faint outline — barely visible, truly "hidden"
      ctx.globalAlpha = 0.12 + 0.05 * Math.sin(bg.frame / 60 + n.x);
      ctx.strokeStyle = '#fdffb6';
      ctx.lineWidth   = 1.5;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  // 3. Cushions (fade in/out based on c.fadeT)
  for (let i = 0; i < bg.cushions.length; i++) {
    const c     = bg.cushions[i];
    if (c.fadeT <= 0) continue;
    const pulse = 0.6 + 0.4 * Math.sin(bg.frame / 30 + i * 1.2);

    ctx.save();
    ctx.shadowColor = c.color;
    ctx.shadowBlur  = 12 * pulse * c.fadeT;

    // Outer ring
    ctx.strokeStyle = c.color;
    ctx.lineWidth   = 3;
    ctx.globalAlpha = 0.8 * c.fadeT;
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.stroke();

    // Inner fill
    ctx.globalAlpha = (0.12 + 0.1 * pulse) * c.fadeT;
    ctx.fillStyle   = c.color;
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill();

    ctx.restore();
  }

  // 4. Particles
  ctx.save();
  for (const p of g.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle   = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
  }
  ctx.restore();

  // 5. Rainbow trail for main ball
  if (bg.mainTrail.length > 1) {
    const hueBase = Date.now() / 30;
    ctx.save();
    for (let i = 0; i < bg.mainTrail.length; i++) {
      const frac = i / bg.mainTrail.length;
      ctx.globalAlpha = frac * 0.55;
      ctx.fillStyle   = `hsl(${(hueBase + i * (360 / bg.mainTrail.length)) % 360}, 100%, 65%)`;
      ctx.beginPath();
      ctx.arc(bg.mainTrail[i].x, bg.mainTrail[i].y, 10 * frac * 0.7, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // 6. Balls
  for (const b of bg.balls) {
    ctx.save();

    if (b.stunned) {
      // Squashed: wider than tall, semi-transparent flicker
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(bg.frame * 0.5);
      ctx.scale(1, 0.45);
      ctx.fillStyle = b.isMain ? '#fff9fb' : b.color;
      ctx.beginPath(); ctx.arc(b.x, b.y / 0.45, b.r * 1.5, 0, TAU); ctx.fill();
      ctx.restore();
      continue;
    }

    // Glow halo
    const haloR = b.r * 3;
    const grd   = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, haloR);
    if (b.isMain) {
      grd.addColorStop(0, 'rgba(255,240,255,0.45)');
      grd.addColorStop(1, 'rgba(255,180,210,0)');
    } else {
      grd.addColorStop(0, hexToRgba(b.color, 0.35));
      grd.addColorStop(1, hexToRgba(b.color, 0));
    }
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(b.x, b.y, haloR, 0, TAU); ctx.fill();

    // Body
    ctx.fillStyle = b.isMain ? '#fff9fb' : b.color;
    ctx.shadowColor = b.isMain ? '#ffb3c1' : b.color;
    ctx.shadowBlur  = 8;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.shadowBlur  = 0;

    // Specular highlight
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.28, 0, TAU); ctx.fill();

    // ── Player-ball indicators ──
    if (b.isMain) {
      // Pulsing outer ring — shows this is the player ball
      ctx.strokeStyle = '#cdb4db';
      ctx.lineWidth   = 1.5;
      ctx.globalAlpha = 0.45 + 0.3 * Math.sin(bg.frame * 0.1);
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 5, 0, TAU); ctx.stroke();

      // Velocity arrow — shows direction of travel
      const spd = Math.hypot(b.vx, b.vy);
      if (spd > 0.4) {
        const nx = b.vx / spd, ny = b.vy / spd;
        const arrowTip = { x: b.x + nx * (b.r + 10), y: b.y + ny * (b.r + 10) };
        const arrowBase = { x: b.x + nx * b.r, y: b.y + ny * b.r };
        const perpLen = 3.5;

        ctx.globalAlpha = Math.min(1, spd / 2) * 0.85;
        ctx.strokeStyle = '#cdb4db';
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(arrowBase.x, arrowBase.y);
        ctx.lineTo(arrowTip.x, arrowTip.y);
        ctx.stroke();

        // Arrow head
        ctx.fillStyle = '#cdb4db';
        ctx.beginPath();
        ctx.moveTo(arrowTip.x, arrowTip.y);
        ctx.lineTo(
          arrowTip.x - nx * 5 + (-ny) * perpLen,
          arrowTip.y - ny * 5 + ( nx) * perpLen
        );
        ctx.lineTo(
          arrowTip.x - nx * 5 - (-ny) * perpLen,
          arrowTip.y - ny * 5 - ( nx) * perpLen
        );
        ctx.closePath();
        ctx.fill();
      }
    }

    // Growth progress arc for growing mini-balls
    if (!b.isMain && b.r < 14) {
      const pct = (b.r - 5) / 9; // 0 → 1
      ctx.strokeStyle = b.color;
      ctx.lineWidth   = 1.5;
      ctx.globalAlpha = 0.4;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(b.x, b.y, 14, -Math.PI / 2, -Math.PI / 2 + TAU * pct); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // 7. Cat (when not idle)
  if (bg.cat.phase !== 'idle') {
    drawCat(bg.cat);
  }

  // 8. PATH label (on-canvas supplement to HUD)
  ctx.save();
  ctx.font          = '7px "Press Start 2P", monospace';
  ctx.textAlign     = 'right';
  ctx.textBaseline  = 'top';
  ctx.fillStyle     = '#fdffb6';
  ctx.globalAlpha   = 0.8;
  ctx.fillText(`PATH ${bg.pathActivated}/${bg.pathTotal}`, cW - 8, 8);
  ctx.restore();
}
