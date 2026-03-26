import { g }              from '../state.js';
import { mg }             from './state.js';
import { sfx, startChaserMusic, stopChaserMusic } from '../audio.js';
import { burst }          from '../particles.js';
import { updateMazeHUD }  from '../hud.js';
import { CELL }           from './draw.js';

const BASE_SPEED = 0.14;  // step fraction per frame at normal speed

const _SCARE_IMGS = [
  'https://i.imgflip.com/s/meme/Batman-Slapping-Robin.jpg',
  'https://i.imgflip.com/s/meme/Change-My-Mind.jpg',
  'https://i.imgflip.com/s/meme/Trade-Offer.jpg',
  'https://i.imgflip.com/s/meme/Woman-Yelling-At-Cat.jpg',
  'https://i.imgflip.com/s/meme/Clown-Applying-Makeup.jpg',
  'https://i.imgflip.com/s/meme/Buff-Doge-vs-Cheems.jpg',
  'https://i.imgflip.com/s/meme/Expanding-Brain.jpg',
  'https://i.imgflip.com/s/meme/Tuxedo-Winnie-The-Pooh.jpg',
  'https://i.imgflip.com/s/meme/Blank-Nut-Button.jpg',
  'https://i.imgflip.com/s/meme/One-Does-Not-Simply.jpg',
];

const _jumpscareEl = document.getElementById('jumpscare');
const _jumpscareImg = document.getElementById('jumpscare-img');
function showJumpscare() {
  _jumpscareImg.src = _SCARE_IMGS[Math.floor(Math.random() * _SCARE_IMGS.length)];
  _jumpscareEl.classList.add('active');
  setTimeout(() => _jumpscareEl.classList.remove('active'), 1200);
}

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

  updateChaser();
  if (g.state !== 'playing') return;

  // Chaser proximity music
  if (mg.chaserDelay <= 0) {
    const dist = Math.abs(mg.chaserCol - mg.ballCol) + Math.abs(mg.chaserRow - mg.ballRow);
    if (dist <= 4) startChaserMusic(); else stopChaserMusic();
  } else {
    stopChaserMusic();
  }

  updateMazeHUD(mg.elapsed, mg.bestTimes[g.level] || null);
}

// ── Ease in-out curve for smooth animation ────────────────────
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// ── BFS: find next step from chaser toward ball ───────────────
function chaserBFS() {
  const sc = mg.chaserCol, sr = mg.chaserRow;
  const tc = mg.ballCol,   tr = mg.ballRow;
  if (sc === tc && sr === tr) return null;

  const DIRS = [
    { dr: -1, dc:  0, wall: 'N' },
    { dr:  1, dc:  0, wall: 'S' },
    { dr:  0, dc:  1, wall: 'E' },
    { dr:  0, dc: -1, wall: 'W' },
  ];
  const parent  = Array.from({ length: mg.rows }, () => new Array(mg.cols).fill(null));
  const visited = Array.from({ length: mg.rows }, () => new Array(mg.cols).fill(false));
  const queue   = [{ r: sr, c: sc }];
  visited[sr][sc] = true;

  let found = false;
  outer: while (queue.length) {
    const { r, c } = queue.shift();
    if (r === tr && c === tc) { found = true; break outer; }
    for (const { dr, dc, wall } of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < mg.rows && nc >= 0 && nc < mg.cols &&
          !visited[nr][nc] && !mg.grid[r][c].walls[wall]) {
        visited[nr][nc] = true;
        parent[nr][nc]  = { r, c };
        queue.push({ r: nr, c: nc });
      }
    }
  }
  if (!found) return null;

  // Walk back from target to find the first step after chaser start
  let cur = { r: tr, c: tc };
  while (parent[cur.r][cur.c] && !(parent[cur.r][cur.c].r === sr && parent[cur.r][cur.c].c === sc)) {
    cur = parent[cur.r][cur.c];
  }
  return { col: cur.c, row: cur.r };
}

// ── Tick chaser movement and check collision ──────────────────
function updateChaser() {
  if (mg.chaserDelay > 0) { mg.chaserDelay--; return; }

  if (mg.chaserMoving) {
    mg.chaserMoveT = Math.min(1, mg.chaserMoveT + mg.chaserSpeed);
    const t = easeInOut(mg.chaserMoveT);
    mg.chaserPx = (mg.chaserMoveFrom.col + (mg.chaserMoveTo.col - mg.chaserMoveFrom.col) * t) * CELL + CELL / 2;
    mg.chaserPy = (mg.chaserMoveFrom.row + (mg.chaserMoveTo.row - mg.chaserMoveFrom.row) * t) * CELL + CELL / 2;

    if (mg.chaserMoveT >= 1) {
      mg.chaserMoving = false;
      mg.chaserCol    = mg.chaserMoveTo.col;
      mg.chaserRow    = mg.chaserMoveTo.row;
      mg.chaserPx     = mg.chaserCol * CELL + CELL / 2;
      mg.chaserPy     = mg.chaserRow * CELL + CELL / 2;

      // Collision check on arrival
      if (mg.chaserCol === mg.ballCol && mg.chaserRow === mg.ballRow) {
        stopChaserMusic();
        sfx.life();
        burst(mg.chaserPx, mg.chaserPy, '#ff6b6b', 20);
        g.lives--;
        updateMazeHUD(mg.elapsed, mg.bestTimes[g.level] || null);
        if (g.lives <= 0) { mazeUpdateHandlers.gameOver(); return; }
        showJumpscare();
        // Reset chaser to start position with a grace period
        mg.chaserCol    = 0;
        mg.chaserRow    = 0;
        mg.chaserPx     = CELL / 2;
        mg.chaserPy     = CELL / 2;
        mg.chaserMoving = false;
        mg.chaserMoveT  = 0;
        mg.chaserDelay  = 120;
        return;
      }
    }
  } else {
    const next = chaserBFS();
    if (next) {
      mg.chaserMoving   = true;
      mg.chaserMoveFrom = { col: mg.chaserCol, row: mg.chaserRow };
      mg.chaserMoveTo   = { col: next.col,     row: next.row };
      mg.chaserMoveT    = 0;
    }
  }
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
