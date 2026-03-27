import { g }                        from '../state.js';
import { mg }                       from './state.js';
import { generateMaze, mazeSize }   from './gen.js';
import { mazeUpdateHandlers }       from './update.js';
import { showOverlay, hideOverlay, updateMazeHUD } from '../hud.js';
import { stopChaserMusic } from '../audio.js';

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

// ── BFS to find the solution path (start → exit) ─────────────
function solveMazePath(cols, rows) {
  const DIRS = [
    { dr: -1, dc:  0, wall: 'N' },
    { dr:  1, dc:  0, wall: 'S' },
    { dr:  0, dc:  1, wall: 'E' },
    { dr:  0, dc: -1, wall: 'W' },
  ];
  const parent  = Array.from({ length: rows }, () => new Array(cols).fill(null));
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const queue   = [{ r: 0, c: 0 }];
  visited[0][0] = true;

  outer: while (queue.length) {
    const { r, c } = queue.shift();
    if (r === rows - 1 && c === cols - 1) break outer;
    for (const { dr, dc, wall } of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
          !visited[nr][nc] && !mg.grid[r][c].walls[wall]) {
        visited[nr][nc] = true;
        parent[nr][nc]  = { r, c };
        queue.push({ r: nr, c: nc });
      }
    }
  }

  // Reconstruct path as a Set of "col,row" keys
  const path = new Set();
  let cur = { r: rows - 1, c: cols - 1 };
  while (cur) {
    path.add(`${cur.c},${cur.r}`);
    cur = parent[cur.r][cur.c];
  }
  return path;
}

// ── Scatter traps & power-ups ─────────────────────────────────
function placeEntities(cols, rows) {
  mg.entities = [];
  // Weighted entity picker — weights sum to 100 at normal lives.
  // life jumps to 15% on last life so a rescue pickup is likely to appear.
  const WEIGHTS = [
    ['teleport', 30], ['slow', 25], ['freeze', 20], ['speed', 19],
    ['shield', 3],    ['life', g.lives === 1 ? 15 : 3],
  ];
  const pickType = () => {
    const total = WEIGHTS.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [t, w] of WEIGHTS) { r -= w; if (r <= 0) return t; }
    return WEIGHTS.at(-1)[0];
  };

  const TRAP_TYPES = new Set(['teleport', 'slow']);
  const density    = 0.10;  // ~10% of cells get an entity
  const total      = Math.floor(cols * rows * density);

  // Traps must never sit on the only path from start to exit
  const solutionPath = solveMazePath(cols, rows);
  const used = new Set(['0,0', `${cols-1},${rows-1}`]); // skip start + exit

  for (let i = 0; i < total; i++) {
    let col, row, key, type;
    let attempts = 0;
    do {
      col  = Math.floor(Math.random() * cols);
      row  = Math.floor(Math.random() * rows);
      key  = `${col},${row}`;
      type = pickType();
      attempts++;
    } while ((used.has(key) || (TRAP_TYPES.has(type) && solutionPath.has(key))) && attempts < 200);
    if (attempts >= 200) break;

    used.add(key);
    mg.entities.push({ col, row, type, hit: false });
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
  mg.chaserFrozen = false; mg.chaserFreezeTimer = 0;
  mg.moveSpeed   = 0.14;

  placeEntities(cols, rows);

  // Place chaser at same start as ball (0,0); activates after 10 s
  mg.chaserCol      = 0;
  mg.chaserRow      = 0;
  mg.chaserPx       = 20;  // CELL/2
  mg.chaserPy       = 20;
  mg.chaserMoving   = false;
  mg.chaserMoveT    = 0;
  mg.chaserSpeed    = Math.min(0.07 + (g.level - 1) * 0.004, 0.11);  // ramps up with level
  mg.chaserDelay    = 600;  // 10 s head start

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
    '⟳ teleport warps you &nbsp;|&nbsp; ⌛ slows you (traps)<br>' +
    '❄ freezes the chaser &nbsp;|&nbsp; ★ speed boost<br>' +
    '♥ shield (blocks chaser &amp; traps) &nbsp;|&nbsp; + extra life<br><br>' +
    'A red chaser starts with you — it chases after 10 s!<br><br>' +
    'WASD or ARROW KEYS to move.<br>SPACE to pause.',
    'START ▶'
  );
}

// ── Level complete ────────────────────────────────────────────
export function mazeLevelComplete() {
  stopChaserMusic();
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
    'NEXT LEVEL ▶',
    `I cleared level ${g.level} of Ball Maze in ${timeStr}! 🌀 Play at joAnsks.github.io`,
    'Ball Maze',
    timeStr,
    'TIME'
  );
}

// ── Game over ─────────────────────────────────────────────────
export function mazeGameOver() {
  stopChaserMusic();
  g.state = 'dead';
  showOverlay(
    'GAME OVER',
    `You reached level ${g.level}.<br><br>Better luck next time!`,
    'TRY AGAIN ▶',
    `I reached level ${g.level} in Ball Maze! 🌀 Can you go further? Play at joAnsks.github.io`,
    'Ball Maze',
    `LVL ${g.level}`,
    'LEVEL REACHED'
  );
}

// ── Pause / Resume ────────────────────────────────────────────
export function mazePause() {
  if (g.state !== 'playing') return;
  stopChaserMusic();
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
