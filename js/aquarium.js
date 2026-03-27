// ── Achievement Aquarium ──────────────────────────────────────
// Tracks total levels completed across all three games.
// Every 10 levels = 1 fish earned. Fish swim in the menu tank.

const LS_KEY = 'aquarium_levels';

const FISH = ['🐠', '🐡', '🐟', '🦈', '🐬', '🦑', '🦐', '🦞', '🦀', '🐙'];

// Call this every time any game completes a level.
export function recordLevelComplete() {
  const lvls = (parseInt(localStorage.getItem(LS_KEY) || '0', 10) || 0) + 1;
  localStorage.setItem(LS_KEY, String(lvls));
  refreshAquarium();
}

// Call on page load (and after recordLevelComplete) to sync the tank UI.
export function refreshAquarium() {
  const lvls      = parseInt(localStorage.getItem(LS_KEY) || '0', 10) || 0;
  const fishCount = Math.floor(lvls / 10);
  const progress  = lvls % 10;

  const progressEl = document.getElementById('aq-progress');
  const tankEl     = document.getElementById('aq-tank');
  const emptyEl    = document.getElementById('aq-empty');
  if (!tankEl) return;

  // Progress label
  if (progressEl) {
    if (fishCount === 0) {
      progressEl.textContent = `${progress} / 10 levels for first fish`;
    } else {
      progressEl.textContent = `${fishCount} fish  ·  ${progress} / 10 for next`;
    }
  }

  // Clear existing fish
  tankEl.querySelectorAll('.aq-fish, .aq-bubble').forEach(el => el.remove());

  if (fishCount === 0) {
    if (emptyEl) emptyEl.style.display = '';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  // Bubbles (always add a few for atmosphere)
  for (let i = 0; i < 5; i++) {
    const b  = document.createElement('div');
    b.className = 'aq-bubble';
    const sz = 3 + (i * 2.3) % 7;
    const lf = 8 + (i * 19) % 80;
    const dur = 2.8 + (i * 1.1) % 3.5;
    const del = (i * 0.9) % 4;
    b.style.cssText = `width:${sz}px;height:${sz}px;left:${lf}%;bottom:14px;` +
      `animation-duration:${dur}s;animation-delay:-${del}s`;
    tankEl.appendChild(b);
  }

  // Spawn fish (cap at 12 on screen; count is still tracked beyond that)
  const shown = Math.min(fishCount, 12);
  for (let i = 0; i < shown; i++) {
    const fish = document.createElement('span');
    // Alternate swim direction per fish
    const ltr = i % 2 !== 0;
    fish.className = 'aq-fish' + (ltr ? ' ltr' : '');
    fish.textContent = FISH[i % FISH.length];

    // Deterministic positioning so fish don't jump on re-render
    const topPct = 8  + (i * 17 + 5)  % 58;   // 8 – 66 %
    const dur    = 9  + (i * 4.3 + 2) % 13;   // 9 – 22 s
    const delay  = -((i * 3.1 + 1)    % dur);  // start mid-swim
    const size   = 1.1 + (i % 3) * 0.2;        // 1.1 / 1.3 / 1.5 em

    fish.style.top               = `${topPct}%`;
    fish.style.fontSize          = `${size}em`;
    fish.style.animationDuration = `${dur}s`;
    fish.style.animationDelay   = `${delay}s`;

    tankEl.appendChild(fish);
  }
}
