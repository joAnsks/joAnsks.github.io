// ── imgBB API key ─────────────────────────────────────────────
// Get a free key at https://imgbb.com/account/api (free account, ~30 s)
// Without a key, Facebook will share the link without an image preview.
const IMGBB_KEY = '';

const SITE_URL = 'https://joAnsks.github.io';
const W = 1200, H = 630;

// ── Public API ────────────────────────────────────────────────
// shareText  — full quote for FB (plain text)
// gameName   — 'Pastel Bounce' | 'Ball Maze'
// stat       — the featured number/time, e.g. 1500 or '45.23'
// statLabel  — 'SCORE' | 'TIME' | 'LEVEL REACHED'
// btnEl      — share button element (shows loading state)
export async function shareScore(shareText, gameName, stat, statLabel, btnEl) {
  const origText = btnEl?.textContent ?? '📘 SHARE';
  if (btnEl) { btnEl.textContent = 'SHARING...'; btnEl.disabled = true; }

  try {
    let pictureUrl = '';

    if (IMGBB_KEY) {
      try {
        const file = await generateScoreCard(shareText, gameName, stat, statLabel);
        pictureUrl = await uploadToImgBB(file);
      } catch (e) {
        console.warn('[share] image upload failed:', e.message);
      }
    }

    let fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}&quote=${encodeURIComponent(shareText)}`;
    if (pictureUrl) fbUrl += `&picture=${encodeURIComponent(pictureUrl)}`;

    window.open(fbUrl, '_blank', 'noopener,noreferrer,width=620,height=520');
  } finally {
    if (btnEl) { btnEl.textContent = origText; btnEl.disabled = false; }
  }
}

// ── imgBB upload ──────────────────────────────────────────────
async function uploadToImgBB(file) {
  const base64 = await fileToBase64(file);
  const form = new FormData();
  form.append('image', base64.replace(/^data:image\/\w+;base64,/, ''));

  const res  = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: form });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'unknown');
  return json.data.url;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ── Score card (1200 × 630) ───────────────────────────────────
async function generateScoreCard(shareText, gameName, stat, statLabel) {
  await document.fonts.ready; // ensure Press Start 2P is loaded

  const pf  = document.fonts.check('bold 96px "Press Start 2P"')
                ? '"Press Start 2P", monospace'
                : 'monospace';

  const cv  = document.createElement('canvas');
  cv.width  = W; cv.height = H;
  const ctx = cv.getContext('2d');

  // ── Background ───────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,  '#3b1a4e');
  bg.addColorStop(.5, '#2a1533');
  bg.addColorStop(1,  '#1c0e26');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Radial color sheen (top-left)
  const sheen = ctx.createRadialGradient(W * .2, H * .25, 0, W * .2, H * .25, W * .65);
  sheen.addColorStop(0,  'rgba(255,179,193,.14)');
  sheen.addColorStop(.6, 'rgba(205,180,219,.07)');
  sheen.addColorStop(1,  'transparent');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);

  // ── Outer border ─────────────────────────────────────────────
  ctx.strokeStyle = '#cdb4db';
  ctx.lineWidth   = 7;
  roundRect(ctx, 16, 16, W - 32, H - 32, 22);
  ctx.stroke();

  // Inner accent border
  ctx.strokeStyle = 'rgba(205,180,219,.25)';
  ctx.lineWidth   = 2;
  roundRect(ctx, 30, 30, W - 60, H - 60, 14);
  ctx.stroke();

  // ── Stars ─────────────────────────────────────────────────────
  ctx.fillStyle = '#fdffb6';
  ctx.font      = '32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★  ★  ★  ★  ★', W / 2, 78);

  // ── Game name ─────────────────────────────────────────────────
  ctx.font      = `bold 58px ${pf}`;
  ctx.textAlign = 'center';
  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillText(gameName.toUpperCase(), W / 2 + 5, 153);
  // Text
  ctx.fillStyle = '#ffb3c1';
  ctx.fillText(gameName.toUpperCase(), W / 2, 148);

  // ── Divider ───────────────────────────────────────────────────
  const divGrad = ctx.createLinearGradient(60, 0, W - 60, 0);
  divGrad.addColorStop(0,   'transparent');
  divGrad.addColorStop(.15, '#cdb4db');
  divGrad.addColorStop(.85, '#cdb4db');
  divGrad.addColorStop(1,   'transparent');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth   = 2;
  line(ctx, 60, 176, W - 60, 176);

  // ── Stat box ──────────────────────────────────────────────────
  const bx = W / 2 - 310, by = 196, bw = 620, bh = 202;

  // Box fill
  ctx.fillStyle = 'rgba(255,255,255,.06)';
  roundRect(ctx, bx, by, bw, bh, 18);
  ctx.fill();

  // Box border
  ctx.strokeStyle = 'rgba(205,180,219,.55)';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Stat label
  ctx.fillStyle = '#cdb4db';
  ctx.font      = `18px ${pf}`;
  ctx.textAlign = 'center';
  ctx.fillText((statLabel ?? 'SCORE').toUpperCase(), W / 2, by + 42);

  // Stat value — auto-size to fit box, glowing
  const statStr  = stat != null ? String(stat) : '—';
  let   fontSize = 96;
  ctx.font = `bold ${fontSize}px ${pf}`;
  while (ctx.measureText(statStr).width > bw - 60 && fontSize > 42) {
    fontSize -= 6;
    ctx.font = `bold ${fontSize}px ${pf}`;
  }
  ctx.save();
  ctx.shadowColor = '#fdffb6';
  ctx.shadowBlur  = 32;
  ctx.fillStyle   = '#fdffb6';
  ctx.fillText(statStr, W / 2, by + 50 + fontSize * .85);
  ctx.restore();

  // ── Tagline ───────────────────────────────────────────────────
  const tagline = shareText
    .replace(/\s*Play at .+$/i, '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  ctx.fillStyle = '#d8b8f0';
  ctx.font      = `20px ${pf}`;
  ctx.textAlign = 'center';
  const tagY = by + bh + 36;
  wrapText(ctx, tagline, W / 2, tagY, W - 220, 38);

  // ── Footer ────────────────────────────────────────────────────
  ctx.strokeStyle = divGrad;
  ctx.lineWidth   = 2;
  line(ctx, 60, 522, W - 60, 522);

  ctx.fillStyle = '#b5ead7';
  ctx.font      = `22px ${pf}`;
  ctx.textAlign = 'center';
  ctx.fillText('joAnsks.github.io', W / 2, 562);

  ctx.fillStyle = '#fdffb6';
  ctx.font      = '26px sans-serif';
  ctx.fillText('⭐ ⭐ ⭐', W / 2, 604);

  return new Promise((resolve, reject) => {
    cv.toBlob(b => {
      if (!b) { reject(new Error('toBlob failed')); return; }
      resolve(new File([b], 'score.png', { type: 'image/png' }));
    }, 'image/png');
  });
}

// ── Drawing helpers ───────────────────────────────────────────
function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let row = '';
  for (const word of words) {
    const test = row ? `${row} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && row) {
      ctx.fillText(row, x, y);
      row = word;
      y  += lineHeight;
    } else {
      row = test;
    }
  }
  if (row) ctx.fillText(row, x, y);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);   ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);   ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
  ctx.lineTo(x, y + r);       ctx.quadraticCurveTo(x,     y,     x + r, y);
  ctx.closePath();
}
