import { g }                        from '../state.js';
import { mg }                       from './state.js';
import { generateMaze, mazeSize }   from './gen.js';
import { mazeUpdateHandlers }       from './update.js';
import { showOverlay, hideOverlay, updateMazeHUD } from '../hud.js';

const BEST_KEY = 'maze_best';

// ── Persist best times ─────────────────────────────────────────
function loadBestTimes() {
  try { mg.bestTimes = JSON.parse(localStorage.getItem(BEST_KEY)) || {}; }
  catch { mg.bestTimes = {}; }
}

function saveBestTime(level, ms) {
  if (!mg.bestTimes[level] || ms < mg.bestTimes[level]) {
    mg.bestTimes[level] = ms;
    try { localStorage.setItem(BEST_KEY, JSON.stringify(mg.bestTimes)); } catch {}
  }
}

// ── Scatter traps & power-ups ─────────────────────────────────
function placeEntities(cols, rows) {
  mg.entities = [];
  const TYPES   = ['spike', 'spike', 'freeze', 'freeze', 'speed', 'shield'];
  const density = 0.10;  // ~10% of cells get an entity
  const total   = Math.floor(cols * rows * density);

  const used = new Set(['0,0', `${cols-1},${rows-1}`]); // skip start + exit

  for (let i = 0; i < total; i++) {
    let col, row, key;
    let attempts = 0;
    do {
      col = Math.floor(Math.random() * cols);
      row = Math.floor(Math.random() * rows);
      key = `${col},${row}`;
      attempts++;
    } while (used.has(key) && attempts < 200);
    if (attempts >= 200) break;

    used.add(key);
    mg.entities.push({ col, row, type: TYPES[Math.floor(Math.random() * TYPES.length)], hit: false });
  }
}

// ── Initialise one maze level ─────────────────────────────────
function initMazeLevel() {
  const { cols, rows } = mazeSize(g.level);
  mg.cols = cols;
  mg.rows = rows;
  mg.grid = generateMaze(cols, rows);

  mg.ballCol = 0; mg.ballRow = 0;
  mg.ballPx  = 40 / 2; mg.ballPy = 40 / 2;  // CELL/2
  mg.moving  = false; mg.moveT = 0;
  mg.camX    = 0; mg.camY = 0;

  mg.shielded    = false;
  mg.frozen      = false; mg.freezeTimer = 0;
  mg.boosted     = false; mg.boostTimer  = 0;
  mg.moveSpeed   = 0.14;

  placeEntities(cols, rows);

  mg.startTime = performance.now();
  mg.elapsed   = 0;
  mg._pausedAt = null;
  mg.awaitingNextLevel = false;
}

// ── Start (or restart) the maze game ─────────────────────────
export function startMazeGame() {
  loadBestTimes();
  g.lives  = 3;
  g.level  = 1;
  g.state  = 'idle';
  g.gameMode = 'maze';
  initMazeLevel();
  updateMazeHUD(0, mg.bestTimes[g.level] || null);
  showOverlay(
    'BALL MAZE',
    'Reach the ★ exit to complete each level.<br><br>' +
    '✕ spike costs a life &nbsp;|&nbsp; ❄ slows you<br>' +
    '★ speed boost &nbsp;|&nbsp; ♥ shield<br><br>' +
    'WASD or ARROW KEYS to move.<br>SPACE to pause.',
    'START ▶'
  );
}

// ── Level complete ────────────────────────────────────────────
export function mazeLevelComplete() {
  saveBestTime(g.level, mg.elapsed);
  mg.awaitingNextLevel = true;
  g.state = 'idle';

  const t    = mg.elapsed;
  const prev = mg.bestTimes[g.level];
  const isNew = prev === t;  // we just saved it so they're equal if it's a new best
  const timeStr = formatTimeLocal(t);
  const bestStr = prev ? formatTimeLocal(prev) : '--:--';

  showOverlay(
    'LEVEL CLEAR!',
    `Time: ${timeStr}<br>Best: ${bestStr}<br><br>Level ${g.level} complete!`,
    'NEXT LEVEL ▶'
  );
}

// ── Game over ─────────────────────────────────────────────────
export function mazeGameOver() {
  g.state = 'dead';
  showOverlay(
    'GAME OVER',
    `You reached level ${g.level}.<br><br>Better luck next time!`,
    'TRY AGAIN ▶'
  );
}

// ── Pause / Resume ────────────────────────────────────────────
export function mazePause() {
  if (g.state !== 'playing') return;
  g.state       = 'paused';
  mg._pausedAt  = performance.now();
  showOverlay('PAUSED', 'SPACE or click to resume.', 'RESUME ▶');
}

export function mazeResume() {
  if (g.state !== 'paused') return;
  if (mg._pausedAt !== null) {
    mg.startTime += performance.now() - mg._pausedAt;
    mg._pausedAt  = null;
  }
  g.state = 'playing';
  hideOverlay();
}

// ── Overlay button handler (injected into main.js) ────────────
export const mazeHandlers = {
  overlayBtn() {
    if (g.state === 'paused') {
      mazeResume();
    } else if (g.state === 'dead') {
      startMazeGame();
    } else if (g.state === 'idle') {
      if (mg.awaitingNextLevel) {
        // Advance to next level
        g.level++;
        initMazeLevel();
        updateMazeHUD(0, mg.bestTimes[g.level] || null);
        g.state = 'playing';
        hideOverlay();
      } else {
        // Intro overlay — start playing
        g.state = 'playing';
        hideOverlay();
      }
    }
  },
};

// ── Wire update-module callbacks ──────────────────────────────
mazeUpdateHandlers.gameOver      = mazeGameOver;
mazeUpdateHandlers.levelComplete = mazeLevelComplete;

// ── Local time formatter (avoids circular import from hud.js) ─
function formatTimeLocal(ms) {
  const totalS = Math.floor(ms / 1000);
  const m  = Math.floor(totalS / 60);
  const s  = String(totalS % 60).padStart(2, '0');
  const cs = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
  return m > 0 ? `${m}:${s}.${cs}` : `${s}.${cs}`;
}
