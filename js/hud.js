import { g } from './state.js';

// ── HUD values ───────────────────────────────────────────────────
export function updateHUD() {
  document.getElementById('score-display').textContent = g.score;
  document.getElementById('level-display').textContent = g.level;
  document.getElementById('lives-display').textContent = '♥'.repeat(Math.max(0, g.lives));
  g.best = Math.max(g.best, g.score);
  document.getElementById('best-display').textContent  = g.best;
  document.getElementById('powerup-bar').innerHTML     = puBarHTML();
}

function puBarHTML() {
  const tags = [];
  if (g.padWidened > 0)      tags.push({ label: 'WIDE', color: '#b5ead7', border: '#5c9e83' });
  if (g.activePUs.slow > 0)  tags.push({ label: 'SLOW', color: '#bde0fe', border: '#5a8fc0' });
  if (!tags.length) return 'POWER-UPS: none';
  return tags.map(t =>
    `<span class="pu-tag" style="background:${t.color};border-color:${t.border};color:#3d2b4e">${t.label}</span>`
  ).join('');
}

// ── Overlay ──────────────────────────────────────────────────────
const overlay = document.getElementById('overlay');
const oTitle  = document.getElementById('overlay-title');
const oMsg    = document.getElementById('overlay-msg');
export const oBtn = document.getElementById('overlay-btn');

export function showOverlay(title, msg, btnTxt) {
  oTitle.textContent    = title;
  oMsg.innerHTML        = msg;
  oBtn.textContent      = btnTxt;
  overlay.style.display = 'flex';
}

export function hideOverlay() {
  overlay.style.display = 'none';
}
