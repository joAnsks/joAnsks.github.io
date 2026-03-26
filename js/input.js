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

// ── Touch ─────────────────────────────────────────────────────────
wrap.addEventListener('touchmove', e => {
  if (g.state !== 'playing') return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  g.mouseX = e.touches[0].clientX - rect.left - g.padW / 2;
}, { passive: false });
