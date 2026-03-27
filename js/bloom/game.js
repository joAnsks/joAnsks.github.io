import { g, canvas }                      from '../state.js';
import { bg }                              from './state.js';
import { generateCushions, generatePathNodes } from './gen.js';
import { bloomUpdateHandlers, setBloomHUDUpdater } from './update.js';
import { showOverlay, hideOverlay, updateBloomHUD } from '../hud.js';
import { sfx }                             from '../audio.js';
import { recordLevelComplete } from '../aquarium.js';

// Wire the HUD updater into update.js (avoids circular import)
setBloomHUDUpdater(updateBloomHUD);

// ── Mouse tracking (module-level, runs once on import) ────────────────────────
// Stores canvas-relative cursor position in bg.mouseX/Y for update.js to read.
// Gated on bloom mode so it's a no-op when other games are active.
canvas.addEventListener('mousemove', e => {
  if (g.gameMode !== 'bloom' || g.state !== 'playing') { bg.mouseX = null; bg.mouseY = null; return; }
  const rect = canvas.getBoundingClientRect();
  bg.mouseX = e.clientX - rect.left;
  bg.mouseY = e.clientY - rect.top;
});
canvas.addEventListener('mouseleave', () => { bg.mouseX = null; bg.mouseY = null; });

const LS_KEY = 'bloom_best';

function loadBest() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    bg.best = raw ? +raw || 0 : 0;
  } catch (_) {
    bg.best = 0;
  }
}

function saveBest(score) {
  if (score > bg.best) {
    bg.best = score;
    try { localStorage.setItem(LS_KEY, String(bg.best)); } catch (_) {}
  }
}

// ── Level initialisation ──────────────────────────────────────────────────────
function initBloomLevel() {
  const cW = canvas.width, cH = canvas.height;

  // Main ball starts at canvas centre — player steers it from rest
  bg.balls = [{
    x:        cW / 2,
    y:        cH / 2,
    vx:       0,
    vy:       0,
    r:        16,
    isMain:   true,
    age:      0,
    color:    '#fff9fb',
    stunned:  false,
    stunnedT: 0,
  }];

  bg.cushions  = generateCushions(g.level, cW, cH);
  bg.pathNodes = generatePathNodes(g.level, cW, cH);

  bg.pathActivated  = 0;
  bg.pathTotal      = bg.pathNodes.length;

  bg.cat = {
    phase:        'idle',
    x: 0, y: 0,
    targetX: 0, targetY: 0,
    entryX:  0, entryY:  0,
    action:       null,
    timer:        0,
    cooldown:     Math.max(240, 600 - (g.level - 1) * 30), // first cat visit
    pawX: 0, pawY: 0,
    pawT:         0,
    targetBallIdx: -1,
  };

  bg.startTime        = performance.now();
  bg.elapsed          = 0;
  bg._pausedAt        = null;
  bg.frame            = 0;
  bg.awaitingNextLevel = false;
  bg.mainTrail        = [];

  g.particles.length = 0; // clear leftover particles from previous level
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
export function startBloomGame() {
  loadBest();
  g.lives = 3;
  g.level = 1;
  bg.score = 0;
  g.state  = 'idle';

  initBloomLevel();
  updateBloomHUD();

  showOverlay(
    'BALL BLOOM',
    'Steer your ball into cushions<br>to bloom mini child-balls!<br><br>' +
    'Find and touch all hidden<br>PATH nodes along the walls.<br><br>' +
    'Mini-balls grow and help<br>activate nodes too!<br><br>' +
    'Watch out for the cat... 🐱<br><br>' +
    'WASD / ARROWS or MOUSE<br>SPACE = pause',
    'START ▶'
  );
}

export function bloomLevelComplete() {
  g.state = 'idle';
  bg.awaitingNextLevel = true;
  saveBest(bg.score);
  recordLevelComplete();
  sfx.clear();

  showOverlay(
    'BLOOM! 🌸',
    `All paths lit!<br>Score: ${bg.score}<br>Level ${g.level} complete!`,
    'NEXT LEVEL ▶',
    `I bloomed level ${g.level} in Ball Bloom! 🌸 Play at joAnsks.github.io`,
    'Ball Bloom',
    bg.score,
    'SCORE'
  );
}

export function bloomGameOver() {
  g.state = 'dead';
  saveBest(bg.score);

  showOverlay(
    'GAME OVER',
    `The cat won...<br>You reached level ${g.level}.<br>Score: ${bg.score}`,
    'TRY AGAIN ▶',
    `I reached level ${g.level} in Ball Bloom! 🌸 Play at joAnsks.github.io`,
    'Ball Bloom',
    `LVL ${g.level}`,
    'LEVEL REACHED'
  );
}

export function bloomPause() {
  if (g.state !== 'playing') return;
  bg._pausedAt = performance.now();
  g.state = 'paused';
  showOverlay('PAUSED', '', 'RESUME ▶');
}

export function bloomResume() {
  if (g.state !== 'paused') return;
  if (bg._pausedAt != null) {
    bg.startTime += performance.now() - bg._pausedAt;
    bg._pausedAt = null;
  }
  g.state = 'playing';
  hideOverlay();
}

// ── Overlay button dispatch ───────────────────────────────────────────────────
export const bloomHandlers = {
  overlayBtn() {
    if (g.state === 'paused') {
      bloomResume();
    } else if (g.state === 'dead') {
      startBloomGame();
    } else if (g.state === 'idle') {
      if (bg.awaitingNextLevel) {
        g.level++;
        initBloomLevel();
        updateBloomHUD();
        g.state = 'playing';
        hideOverlay();
      } else {
        // Intro overlay dismissed → start playing
        g.state = 'playing';
        hideOverlay();
      }
    }
  },
};

// ── Wire update handlers at module load (avoids circular dep) ────────────────
bloomUpdateHandlers.gameOver      = bloomGameOver;
bloomUpdateHandlers.levelComplete = bloomLevelComplete;
