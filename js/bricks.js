import { g, W, H, COLS, BRICK_GAP, PASTEL } from './state.js';

// One layout per level; cycles with modulo after the last entry.
const LAYOUTS = [
  null,           // level 1  — full grid
  'diamond',      // level 2
  'checkerboard', // level 3
  'pyramid',      // level 4
  'cross',        // level 5
  'zigzag',       // level 6
  'tunnels',      // level 7
  'border',       // level 8
  'diagonals',    // level 9
  'hourglass',    // level 10
  'V',            // level 11  (then cycles back)
];

export function initBricks() {
  g.ROWS   = Math.min(4 + Math.floor(g.level / 2), 8);
  g.brickW = (W() - (COLS + 1) * BRICK_GAP) / COLS;
  g.brickH = Math.max(14, H() * 0.045);
  g.bricks = [];

  const layout = LAYOUTS[(g.level - 1) % LAYOUTS.length];

  for (let r = 0; r < g.ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let alive = true;

      if (layout === 'diamond') {
        const mid = (COLS - 1) / 2, rmid = (g.ROWS - 1) / 2;
        alive = (Math.abs(c - mid) + Math.abs(r - rmid)) <= Math.min(mid, rmid) + 1;
      } else if (layout === 'checkerboard') {
        alive = (r + c) % 2 === 0;
      } else if (layout === 'pyramid') {
        const margin = Math.floor(r / 2);
        alive = c >= margin && c < COLS - margin;
      } else if (layout === 'cross') {
        alive = r === Math.floor(g.ROWS / 2) || c === Math.floor(COLS / 2);
      } else if (layout === 'zigzag') {
        alive = (r % 2 === 0) ? c < COLS - 2 : c >= 2;
      } else if (layout === 'tunnels') {
        alive = c < 4 || c > 5;
      } else if (layout === 'border') {
        alive = r === 0 || r === g.ROWS - 1 || c === 0 || c === COLS - 1;
      } else if (layout === 'diagonals') {
        alive = Math.abs(c - r) <= 1 || Math.abs((COLS - 1 - c) - r) <= 1;
      } else if (layout === 'hourglass') {
        const mid = (g.ROWS - 1) / 2;
        const squeeze = Math.round(Math.abs(r - mid) / mid * (COLS / 2 - 1));
        alive = c >= (COLS / 2 - 1 - squeeze) && c < (COLS / 2 + squeeze + 1);
      } else if (layout === 'V') {
        const margin = Math.floor((g.ROWS - 1 - r) / 2);
        alive = c >= margin && c < COLS - margin;
      }

      if (!alive) continue;

      const hp = g.level >= 3 && r < 2 ? 2 : 1;
      g.bricks.push({
        x:       BRICK_GAP + c * (g.brickW + BRICK_GAP),
        y:       38 + r * (g.brickH + BRICK_GAP),
        color:   PASTEL[(r * COLS + c) % PASTEL.length],
        pts:     (g.ROWS - r) * 10,
        hp,
        maxHp:   hp,
        shimmer: Math.random() * Math.PI * 2,
        alive:   true,
        pu:      Math.random() < 0.11 ? 'random' : null,
      });
    }
  }
}
