import { g } from './state.js';
import { initPad } from './paddle.js';
import { initBall } from './ball.js';
import { initBricks } from './bricks.js';
import { updateHUD, showOverlay, hideOverlay } from './hud.js';

export function startGame() {
  g.score = 0; g.lives = 3; g.level = 1;
  g.drops = []; g.particles = []; g.activePUs = {}; g.padWidened = 0;
  initPad(); initBall(); initBricks();
  updateHUD();
  hideOverlay();
  g.state = 'playing';
}

export function nextLevel() {
  g.state = 'idle';
  g.drops = []; g.activePUs = {}; g.padWidened = 0;
  updateHUD();
  showOverlay(`LEVEL ${g.level}!`, `Score: ${g.score}<br><br>✦ Get ready... ✦`, 'NEXT ▶');
  initBall(); initBricks(); initPad();
}

export function pause() {
  g.state = 'paused';
  showOverlay('PAUSED', 'Press SPACE or click to resume.', 'RESUME ▶');
}

export function resume() {
  hideOverlay();
  g.state = 'playing';
}

export function gameOver() {
  g.state = 'dead';
  if (g.score > g.best) { g.best = g.score; localStorage.setItem('pb_best', g.best); }
  updateHUD();
  showOverlay(
    'GAME OVER',
    `Final score: ${g.score}<br><br>${g.score >= g.best && g.score > 0 ? '✦ New Best! ✦' : `Best: ${g.best}`}`,
    'PLAY AGAIN ▶',
    `I scored ${g.score} in Pastel Bounce! 🧱 Can you beat me? Play at joAnsks.github.io`
  );
}
