import { g } from './state.js';

// ── Bounce HUD ────────────────────────────────────────────────
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

// ── Maze HUD ──────────────────────────────────────────────────
export function updateMazeHUD(elapsedMs, bestMs) {
  document.getElementById('score-display').textContent = formatTime(elapsedMs);
  document.getElementById('level-display').textContent = g.level;
  document.getElementById('lives-display').textContent = '♥'.repeat(Math.max(0, g.lives));
  document.getElementById('best-display').textContent  = bestMs != null ? formatTime(bestMs) : '--:--';
}

export function formatTime(ms) {
  const totalS = Math.floor(ms / 1000);
  const m      = Math.floor(totalS / 60);
  const s      = String(totalS % 60).padStart(2, '0');
  const cs     = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
  return m > 0 ? `${m}:${s}.${cs}` : `${s}.${cs}`;
}

// ── Mode switcher ─────────────────────────────────────────────
export function setHUDMode(mode) {
  const scoreLabel = document.getElementById('score-label');
  const bestLabel  = document.getElementById('best-label');
  const puBar      = document.getElementById('powerup-bar');
  const hintBounce = document.getElementById('hint-bounce');
  const hintMaze   = document.getElementById('hint-maze');

  if (mode === 'maze') {
    if (scoreLabel) scoreLabel.textContent = 'TIME';
    if (bestLabel)  bestLabel.textContent  = 'BEST';
    if (puBar)      puBar.style.display    = 'none';
    if (hintBounce) hintBounce.style.display = 'none';
    if (hintMaze)   hintMaze.style.display   = '';
  } else {
    if (scoreLabel) scoreLabel.textContent = 'SCORE';
    if (bestLabel)  bestLabel.textContent  = 'BEST';
    if (puBar)      puBar.style.display    = '';
    if (hintBounce) hintBounce.style.display = '';
    if (hintMaze)   hintMaze.style.display   = 'none';
  }
}

// ── Overlay ───────────────────────────────────────────────────
const overlay  = document.getElementById('overlay');
const oTitle   = document.getElementById('overlay-title');
const oMsg     = document.getElementById('overlay-msg');
export const oBtn = document.getElementById('overlay-btn');
const oShare   = document.getElementById('share-btn');

const SITE_URL = 'https://joAnsks.github.io';

export function showOverlay(title, msg, btnTxt, shareText) {
  oTitle.textContent    = title;
  oMsg.innerHTML        = msg;
  oBtn.textContent      = btnTxt;
  overlay.style.display = 'flex';

  if (shareText) {
    oShare.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}&quote=${encodeURIComponent(shareText)}`;
    oShare.style.display = '';
  } else {
    oShare.style.display = 'none';
  }
}

export function hideOverlay() {
  overlay.style.display = 'none';
  oShare.style.display  = 'none';
}
