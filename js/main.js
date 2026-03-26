import { g, canvas }              from './state.js';
import './input.js';                              // registers keyboard/mouse/touch listeners
import { initPad }                from './paddle.js';
import { initBall }               from './ball.js';
import { initBricks }             from './bricks.js';
import { updateHUD, oBtn, setHUDMode } from './hud.js';
import { update, handlers }       from './update.js';
import { draw }                   from './draw.js';
import { startGame, nextLevel, pause, resume, gameOver } from './transitions.js';
import { drawMaze }               from './maze/draw.js';
import { updateMaze }             from './maze/update.js';
import { startMazeGame, mazePause, mazeResume, mazeHandlers } from './maze/game.js';

// Inject transition handlers into bounce update (avoids circular dep)
handlers.gameOver  = gameOver;
handlers.nextLevel = nextLevel;

// ── DOM refs ──────────────────────────────────────────────────
const gameSelect  = document.getElementById('game-select');
const hud         = document.getElementById('hud');
const canvasWrap  = document.getElementById('canvas-wrap');
const mazeDpad    = document.getElementById('maze-dpad');
const powerupBar  = document.getElementById('powerup-bar');
const controlHint = document.getElementById('controls-hint');
const backBtn     = document.getElementById('back-btn');
const cardBounce  = document.getElementById('card-bounce');
const cardMaze    = document.getElementById('card-maze');

// ── D-pad wiring ──────────────────────────────────────────────
const DPAD_KEYS = { 'dpad-up': 'ArrowUp', 'dpad-down': 'ArrowDown', 'dpad-left': 'ArrowLeft', 'dpad-right': 'ArrowRight' };
Object.entries(DPAD_KEYS).forEach(([id, key]) => {
  const btn = document.getElementById(id);
  const press   = () => { g.keys[key] = true; };
  const release = () => { g.keys[key] = false; };
  btn.addEventListener('touchstart',  e => { e.preventDefault(); press(); },   { passive: false });
  btn.addEventListener('touchend',    e => { e.preventDefault(); release(); }, { passive: false });
  btn.addEventListener('touchcancel', e => { e.preventDefault(); release(); }, { passive: false });
  btn.addEventListener('mousedown',  press);
  btn.addEventListener('mouseup',    release);
  btn.addEventListener('mouseleave', release);
});

// ── Canvas resize ─────────────────────────────────────────────
function resize() {
  canvas.width  = Math.floor(Math.min(window.innerWidth - 32, 560));
  canvas.height = Math.floor(Math.min(window.innerHeight * 0.6, 440));
}
resize();
window.addEventListener('resize', () => {
  resize();
  if (g.gameMode === 'bounce') initBricks();
});

// ── Show/hide UI for a given mode ─────────────────────────────
function showGameUI(mode) {
  gameSelect.style.display  = 'none';
  hud.style.display         = 'flex';
  canvasWrap.style.display  = '';
  controlHint.style.display = '';
  if (mode === 'bounce') {
    powerupBar.style.display = '';
    mazeDpad.style.display   = 'none';
  } else if (mode === 'maze') {
    mazeDpad.style.display   = 'grid';
  }
  setHUDMode(mode);
}

function showSelectScreen() {
  gameSelect.style.display  = '';
  hud.style.display         = 'none';
  canvasWrap.style.display  = 'none';
  mazeDpad.style.display    = 'none';
  powerupBar.style.display  = 'none';
  controlHint.style.display = 'none';
  g.gameMode = null;
  g.state    = 'idle';
}

// ── Game-select card handlers ─────────────────────────────────
cardBounce.addEventListener('click', () => {
  g.gameMode = 'bounce';
  showGameUI('bounce');
  initPad(); initBall(); initBricks();
  updateHUD();
  startGame();
});

cardMaze.addEventListener('click', () => {
  g.gameMode = 'maze';
  showGameUI('maze');
  startMazeGame();
});

// ── Back to menu ─────────────────────────────────────────────
backBtn.addEventListener('click', () => {
  showSelectScreen();
});

// ── Space key (pause / resume) ───────────────────────────────
window.addEventListener('keydown', e => {
  if (e.key === ' ') {
    e.preventDefault();
    if (g.gameMode === 'bounce') {
      if (g.state === 'playing') pause();
      else if (g.state === 'paused') resume();
    } else if (g.gameMode === 'maze') {
      if (g.state === 'playing') mazePause();
      else if (g.state === 'paused') mazeResume();
    }
  }
});

// ── Overlay button ────────────────────────────────────────────
oBtn.addEventListener('click', () => {
  if (g.gameMode === 'maze') {
    mazeHandlers.overlayBtn();
    return;
  }
  // bounce
  if (g.state === 'paused') resume();
  else if (g.state === 'idle') resume();   // level-advance overlay
  else startGame();
});

// ── Background bubbles ───────────────────────────────────────
(function spawnBubbles() {
  const container = document.getElementById('bubbles');
  const colors    = ['#ffb3c1', '#cdb4db', '#bde0fe', '#b5ead7', '#ffd6a5'];
  for (let i = 0; i < 22; i++) {
    const d = document.createElement('div');
    d.className = 'bubble';
    const size  = 18 + Math.random() * 58;
    d.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;bottom:-80px;` +
      `background:${colors[i % colors.length]};` +
      `animation-duration:${6 + Math.random() * 10}s;` +
      `animation-delay:${Math.random() * 10}s;`;
    container.appendChild(d);
  }
})();

// ── Game loop ────────────────────────────────────────────────
function loop() {
  if (g.state === 'playing') {
    if (g.gameMode === 'bounce') { update(); draw(); }
    else if (g.gameMode === 'maze') { updateMaze(); drawMaze(); }
  }
  requestAnimationFrame(loop);
}

// ── Boot ─────────────────────────────────────────────────────
initPad(); initBall(); initBricks();
loop();
