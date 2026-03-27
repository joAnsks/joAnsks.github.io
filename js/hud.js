import { g }          from './state.js';
import { bg }         from './bloom/state.js';
import { shareScore } from './share.js';

// ── Bounce HUD ────────────────────────────────────────────────
export function updateHUD() {
  document.getElementById('score-display').textContent = g.score;
  document.getElementById('level-display').textContent = g.level;
  document.getElementById('lives-display').textContent = '♥'.repeat(Math.max(0, g.lives));
  const newBest = Math.max(g.best, g.score);
  if (newBest > g.best) { g.best = newBest; localStorage.setItem('pb_best', g.best); }
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

// ── Bloom HUD ──────────────────────────────────────────────────
export function updateBloomHUD() {
  document.getElementById('score-display').textContent = bg.score;
  document.getElementById('level-display').textContent = g.level;
  document.getElementById('lives-display').textContent = '♥'.repeat(Math.max(0, g.lives));
  const newBest = Math.max(bg.best, bg.score);
  if (newBest > bg.best) { bg.best = newBest; try { localStorage.setItem('bloom_best', String(bg.best)); } catch (_) {} }
  document.getElementById('best-display').textContent  = bg.best;
}

// ── Mode switcher ─────────────────────────────────────────────
export function setHUDMode(mode) {
  const scoreLabel = document.getElementById('score-label');
  const bestLabel  = document.getElementById('best-label');
  const puBar      = document.getElementById('powerup-bar');
  const hintBounce = document.getElementById('hint-bounce');
  const hintMaze   = document.getElementById('hint-maze');
  const hintBloom  = document.getElementById('hint-bloom');

  if (mode === 'maze') {
    if (scoreLabel) scoreLabel.textContent = 'TIME';
    if (bestLabel)  bestLabel.textContent  = 'BEST';
    if (puBar)      puBar.style.display    = 'none';
    if (hintBounce) hintBounce.style.display = 'none';
    if (hintMaze)   hintMaze.style.display   = '';
    if (hintBloom)  hintBloom.style.display  = 'none';
  } else if (mode === 'bloom') {
    if (scoreLabel) scoreLabel.textContent = 'SCORE';
    if (bestLabel)  bestLabel.textContent  = 'BEST';
    if (puBar)      puBar.style.display    = 'none';
    if (hintBounce) hintBounce.style.display = 'none';
    if (hintMaze)   hintMaze.style.display   = 'none';
    if (hintBloom)  hintBloom.style.display  = '';
  } else {
    if (scoreLabel) scoreLabel.textContent = 'SCORE';
    if (bestLabel)  bestLabel.textContent  = 'BEST';
    if (puBar)      puBar.style.display    = '';
    if (hintBounce) hintBounce.style.display = '';
    if (hintMaze)   hintMaze.style.display   = 'none';
    if (hintBloom)  hintBloom.style.display  = 'none';
  }
}

// ── Overlay ───────────────────────────────────────────────────
const overlay  = document.getElementById('overlay');
const oTitle   = document.getElementById('overlay-title');
const oMsg     = document.getElementById('overlay-msg');
export const oBtn = document.getElementById('overlay-btn');
const oShare   = document.getElementById('share-btn');

let _pendingShare = null; // { shareText, gameName, stat, statLabel }

oShare.addEventListener('click', () => {
  if (_pendingShare) {
    const { shareText, gameName, stat, statLabel } = _pendingShare;
    shareScore(shareText, gameName, stat, statLabel, oShare);
  }
});

export function showOverlay(title, msg, btnTxt, shareText, gameName, stat, statLabel) {
  oTitle.textContent    = title;
  oMsg.innerHTML        = msg;
  oBtn.textContent      = btnTxt;
  overlay.style.display = 'flex';

  if (shareText) {
    _pendingShare        = { shareText, gameName: gameName || 'Pastel Bounce', stat, statLabel };
    oShare.style.display = '';
  } else {
    _pendingShare        = null;
    oShare.style.display = 'none';
  }
}

export function hideOverlay() {
  overlay.style.display = 'none';
  oShare.style.display  = 'none';
  _pendingShare         = null;
}
