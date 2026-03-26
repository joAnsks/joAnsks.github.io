import { g }              from '../state.js';
import { mg }             from './state.js';
import { sfx }            from '../audio.js';
import { burst }          from '../particles.js';
import { updateMazeHUD }  from '../hud.js';
import { CELL }           from './draw.js';

const BASE_SPEED = 0.14;  // step fraction per frame at normal speed

// ── Handlers injected by maze/game.js ────────────────────────
export const mazeUpdateHandlers = { gameOver: null, levelComplete: null };

// ── Main update (called every frame while playing) ────────────
export function updateMaze() {
  // Timer
  mg.elapsed = performance.now() - mg.startTime;

  // Effect timers
  if (mg.frozen  && --mg.freezeTimer <= 0) { mg.frozen  = false; mg.moveSpeed = BASE_SPEED; }
  if (mg.boosted && --mg.boostTimer  <= 0) { mg.boosted = false; mg.moveSpeed = BASE_SPEED; }

  // Animate ball between cells
  if (mg.moving) {
    mg.moveT = Math.min(1, mg.moveT + mg.moveSpeed);
    const t   = easeInOut(mg.moveT);
    mg.ballPx = (mg.moveFrom.col + (mg.moveTo.col - mg.moveFrom.col) * t) * CELL + CELL / 2;
    mg.ballPy = (mg.moveFrom.row + (mg.moveTo.row - mg.moveFrom.row) * t) * CELL + CELL / 2;

    if (mg.moveT >= 1) {
      // Arrived — snap and resolve cell
      mg.moving  = false;
      mg.ballCol = mg.moveTo.col;
      mg.ballRow = mg.moveTo.row;
      mg.ballPx  = mg.ballCol * CELL + CELL / 2;
      mg.ballPy  = mg.ballRow * CELL + CELL / 2;
      onLanded();
      if (g.state !== 'playing') return; // gameOver / levelComplete may change state
    }
  } else {
    // Idle — try reading input
    mg.ballPx = mg.ballCol * CELL + CELL / 2;
    mg.ballPy = mg.ballRow * CELL + CELL / 2;
    tryMove();
  }

  updateMazeHUD(mg.elapsed, mg.bestTimes[g.level] || null);
}

// ── Ease in-out curve for smooth animation ────────────────────
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// ── Read keyboard input and start a move if the wall is open ──
function tryMove() {
  if (mg.moving || !mg.grid) return;
  const k = g.keys;
  let dr = 0, dc = 0;

  if      (k['ArrowUp']    || k['w'] || k['W']) dr = -1;
  else if (k['ArrowDown']  || k['s'] || k['S']) dr =  1;
  else if (k['ArrowLeft']  || k['a'] || k['A']) dc = -1;
  else if (k['ArrowRight'] || k['d'] || k['D']) dc =  1;
  else return;

  const wallDir = dr === -1 ? 'N' : dr === 1 ? 'S' : dc === -1 ? 'W' : 'E';
  const cell    = mg.grid[mg.ballRow][mg.ballCol];
  if (cell.walls[wallDir]) return;  // blocked

  const nr = mg.ballRow + dr;
  const nc = mg.ballCol + dc;
  if (nr < 0 || nr >= mg.rows || nc < 0 || nc >= mg.cols) return;

  mg.moving   = true;
  mg.moveFrom = { col: mg.ballCol, row: mg.ballRow };
  mg.moveTo   = { col: nc, row: nr };
  mg.moveT    = 0;
}

// ── Resolve the cell the ball just entered ────────────────────
function onLanded() {
  // Check exit
  if (mg.ballCol === mg.cols - 1 && mg.ballRow === mg.rows - 1) {
    mazeUpdateHandlers.levelComplete();
    return;
  }
  // Check entities
  for (const ent of mg.entities) {
    if (!ent.hit && ent.col === mg.ballCol && ent.row === mg.ballRow) {
      ent.hit = true;
      if (ent.type === 'teleport' || ent.type === 'freeze') handleTrap(ent.type);
      else                                               handlePowerup(ent.type);
      break;
    }
  }
}

// ── Traps ─────────────────────────────────────────────────────
function handleTrap(type) {
  if (mg.shielded) {
    mg.shielded = false;
    sfx.pu();
    burst(mg.ballPx, mg.ballPy, '#cdb4db', 10);
    return;
  }

  if (type === 'teleport') {
    sfx.pu();
    burst(mg.ballPx, mg.ballPy, '#ffb3c1', 18);

    // Pick a random cell that isn't the current one or the exit
    let tc, tr;
    do {
      tc = Math.floor(Math.random() * mg.cols);
      tr = Math.floor(Math.random() * mg.rows);
    } while (tc === mg.ballCol && tr === mg.ballRow);

    mg.ballCol = tc; mg.ballRow = tr;
    mg.ballPx  = tc * CELL + CELL / 2;
    mg.ballPy  = tr * CELL + CELL / 2;
    mg.moving  = false; mg.moveT = 0;

    burst(mg.ballPx, mg.ballPy, '#ffb3c1', 18);

  } else if (type === 'freeze') {
    sfx.wall();
    burst(mg.ballPx, mg.ballPy, '#bde0fe', 10);
    mg.frozen      = true;
    mg.freezeTimer = 180;               // 3 s at 60 fps
    mg.moveSpeed   = BASE_SPEED * 0.5;
  }
}

// ── Power-ups ─────────────────────────────────────────────────
function handlePowerup(type) {
  sfx.pu();
  burst(mg.ballPx, mg.ballPy, '#fdffb6', 12);

  if (type === 'speed') {
    mg.boosted    = true;
    mg.boostTimer = 300;                // 5 s at 60 fps
    mg.moveSpeed  = BASE_SPEED * 2;
  } else if (type === 'shield') {
    mg.shielded = true;
  }
}
