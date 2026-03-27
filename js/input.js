import { g, wrap, canvas } from './state.js';

// ── Keyboard ─────────────────────────────────────────────────────
// Space (pause/resume) is handled in main.js to avoid a circular dependency.
window.addEventListener('keydown', e => { g.keys[e.key] = true; });
window.addEventListener('keyup',   e => { g.keys[e.key] = false; });

// ── Mouse ─────────────────────────────────────────────────────────
wrap.addEventListener('mousemove', e => {
  if (g.state !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  g.mouseX = e.clientX - rect.left - g.padW / 2;
});
wrap.addEventListener('mouseleave', () => { g.mouseX = null; });

// ── Touch — bounce paddle ─────────────────────────────────────────
wrap.addEventListener('touchmove', e => {
  if (g.state !== 'playing' || g.gameMode !== 'bounce') return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  g.mouseX = e.touches[0].clientX - rect.left - g.padW / 2;
}, { passive: false });

// ── Touch — maze swipe ────────────────────────────────────────────
let _swipeX = null, _swipeY = null;
const SWIPE_THRESHOLD = 24;

wrap.addEventListener('touchstart', e => {
  if ((g.gameMode !== 'maze' && g.gameMode !== 'bloom') || g.state !== 'playing') return;
  e.preventDefault();
  _swipeX = e.touches[0].clientX;
  _swipeY = e.touches[0].clientY;
}, { passive: false });

wrap.addEventListener('touchend', e => {
  if ((g.gameMode !== 'maze' && g.gameMode !== 'bloom') || g.state !== 'playing' || _swipeX === null) return;
  e.preventDefault();
  const dx = e.changedTouches[0].clientX - _swipeX;
  const dy = e.changedTouches[0].clientY - _swipeY;
  _swipeX = _swipeY = null;
  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
  const key = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft')
    : (dy > 0 ? 'ArrowDown'  : 'ArrowUp');
  // Bloom uses a slightly longer hold so the physics feel responsive
  const holdMs = g.gameMode === 'bloom' ? 200 : 150;
  g.keys[key] = true;
  setTimeout(() => { g.keys[key] = false; }, holdMs);
}, { passive: false });

wrap.addEventListener('touchcancel', () => { _swipeX = _swipeY = null; });
