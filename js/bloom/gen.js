import { PASTEL } from '../state.js';

// ── Cushion generation ────────────────────────────────────────────────────────
// Returns array of { x, y, r, color }
// Level 1 → 3 cushions; each level adds 1 (capped at 8 for performance).
export function generateCushions(level, W, H) {
  const count  = Math.min(2 + level, 8);
  const result = [];
  const MAX_ITER = 400;

  for (let i = 0; i < count; i++) {
    const r     = 16 + Math.random() * 10;  // 16–26 px radius
    const color = PASTEL[i % PASTEL.length];
    let placed  = false;

    for (let iter = 0; iter < MAX_ITER; iter++) {
      const x = 60 + Math.random() * (W - 120);
      const y = 60 + Math.random() * (H - 120);

      // Must be ≥60px from each edge
      if (x - r < 60 || x + r > W - 60) continue;
      if (y - r < 60 || y + r > H - 60) continue;

      // Must be ≥80px from canvas centre (keep spawn lane clear)
      const dx = x - W / 2, dy = y - H / 2;
      if (Math.hypot(dx, dy) < 80) continue;

      // Must not overlap existing cushions (gap ≥ 20px between edges)
      let overlap = false;
      for (const c of result) {
        if (Math.hypot(x - c.x, y - c.y) < r + c.r + 20) { overlap = true; break; }
      }
      if (overlap) continue;

      result.push({ x, y, r, color });
      placed = true;
      break;
    }

    // If placement failed after MAX_ITER, skip this cushion rather than hang
    if (!placed) break;
  }

  return result;
}

// ── Path node generation ──────────────────────────────────────────────────────
// Returns array of { x, y, r:12, activated:false, side, glowT:0 }
// Level 1 → 4 nodes; each level adds 1.
// Nodes are distributed evenly around all four canvas edges.
export function generatePathNodes(level, W, H) {
  const total  = 3 + level;
  const r      = 12;
  const margin = 18;  // node centre is 18px from edge
  const edgePad = 40; // minimum distance from corner along edge

  // Allocate nodes per side (floor distribute, remainder spread)
  const base      = Math.floor(total / 4);
  const remainder = total % 4;
  // Sides: N, S, E, W
  const counts = [base, base, base, base];
  for (let i = 0; i < remainder; i++) counts[i]++;

  const result = [];

  // North edge  (y = margin, x varies)
  for (let i = 0; i < counts[0]; i++) {
    const span = W - edgePad * 2;
    const x    = edgePad + (span / (counts[0] + 1)) * (i + 1);
    result.push({ x, y: margin, r, activated: false, side: 'N', glowT: 0 });
  }
  // South edge  (y = H - margin, x varies)
  for (let i = 0; i < counts[1]; i++) {
    const span = W - edgePad * 2;
    const x    = edgePad + (span / (counts[1] + 1)) * (i + 1);
    result.push({ x, y: H - margin, r, activated: false, side: 'S', glowT: 0 });
  }
  // East edge   (x = W - margin, y varies)
  for (let i = 0; i < counts[2]; i++) {
    const span = H - edgePad * 2;
    const y    = edgePad + (span / (counts[2] + 1)) * (i + 1);
    result.push({ x: W - margin, y, r, activated: false, side: 'E', glowT: 0 });
  }
  // West edge   (x = margin, y varies)
  for (let i = 0; i < counts[3]; i++) {
    const span = H - edgePad * 2;
    const y    = edgePad + (span / (counts[3] + 1)) * (i + 1);
    result.push({ x: margin, y, r, activated: false, side: 'W', glowT: 0 });
  }

  return result;
}
