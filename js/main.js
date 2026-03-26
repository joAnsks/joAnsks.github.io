import { g, canvas } from './state.js';
import './input.js';                              // registers keyboard/mouse/touch listeners
import { initPad } from './paddle.js';
import { initBall } from './ball.js';
import { initBricks } from './bricks.js';
import { updateHUD, oBtn } from './hud.js';
import { update, handlers } from './update.js';
import { draw } from './draw.js';
import { startGame, nextLevel, pause, resume, gameOver } from './transitions.js';

// Inject transition handlers into update (avoids circular dep)
handlers.gameOver  = gameOver;
handlers.nextLevel = nextLevel;

// ── Canvas resize ────────────────────────────────────────────────
function resize() {
  canvas.width  = Math.floor(Math.min(window.innerWidth - 32, 560));
  canvas.height = Math.floor(Math.min(window.innerHeight * 0.6, 440));
}
resize();
window.addEventListener('resize', () => { resize(); initBricks(); });

// ── Space key (pause / resume) ───────────────────────────────────
window.addEventListener('keydown', e => {
  if (e.key === ' ') {
    e.preventDefault();
    if (g.state === 'playing') pause();
    else if (g.state === 'paused') resume();
  }
});

// ── Overlay button ───────────────────────────────────────────────
oBtn.addEventListener('click', () => {
  if (g.state === 'paused') resume();
  else if (g.state === 'idle') resume();  // level-advance overlay — just unpause, don't reset
  else startGame();
});

// ── Background bubbles ───────────────────────────────────────────
(function spawnBubbles() {
  const container = document.getElementById('bubbles');
  const colors    = ['#ffb3c1', '#cdb4db', '#bde0fe', '#b5ead7', '#ffd6a5'];
  for (let i = 0; i < 22; i++) {
    const d    = document.createElement('div');
    d.className = 'bubble';
    const size  = 18 + Math.random() * 58;
    d.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;bottom:-80px;` +
      `background:${colors[i % colors.length]};` +
      `animation-duration:${6 + Math.random() * 10}s;` +
      `animation-delay:${Math.random() * 10}s;`;
    container.appendChild(d);
  }
})();

// ── Game loop ────────────────────────────────────────────────────
function loop() {
  if (g.state === 'playing') { update(); draw(); }
  requestAnimationFrame(loop);
}

// ── Boot ─────────────────────────────────────────────────────────
initPad(); initBall(); initBricks();
updateHUD();
loop();
