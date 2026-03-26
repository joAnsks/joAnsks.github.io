const SITE_URL = 'https://joAnsks.github.io';
const W = 1200, H = 630;

// ── Public API ────────────────────────────────────────────────
export async function shareScore(shareText, gameName) {
  let imageFile = null;
  try {
    imageFile = await generateScoreCard(shareText, gameName);
  } catch { /* proceed without image */ }

  // Web Share API with image (mobile + modern desktop)
  if (imageFile && navigator.canShare?.({ files: [imageFile] })) {
    try {
      await navigator.share({ files: [imageFile], title: gameName, url: SITE_URL });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return; // user cancelled — don't fall through
    }
  }

  // Fallback: open Facebook sharer in popup
  window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}&quote=${encodeURIComponent(shareText)}`,
    '_blank',
    'noopener,noreferrer,width=620,height=520'
  );
}

// ── Score-card canvas ─────────────────────────────────────────
async function generateScoreCard(shareText, gameName) {
  // Ensure pixel font is available for canvas rendering
  const loaded = await document.fonts.load('bold 52px "Press Start 2P"');
  const font   = loaded.length > 0 ? '"Press Start 2P", monospace' : 'monospace';

  const cv  = document.createElement('canvas');
  cv.width  = W;
  cv.height = H;
  const ctx = cv.getContext('2d');

  // ── Background ──────────────────────────────────────────────
  ctx.fillStyle = '#2a1533';
  ctx.fillRect(0, 0, W, H);

  // Diagonal gradient sheen
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0,   'rgba(255,179,193,.20)');
  grad.addColorStop(.5,  'rgba(205,180,219,.12)');
  grad.addColorStop(1,   'rgba(189,224,254,.20)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // ── Border ───────────────────────────────────────────────────
  ctx.strokeStyle = '#cdb4db';
  ctx.lineWidth   = 8;
  roundRect(ctx, 20, 20, W - 40, H - 40, 18);
  ctx.stroke();

  // Inner accent border
  ctx.strokeStyle = 'rgba(205,180,219,.35)';
  ctx.lineWidth   = 3;
  roundRect(ctx, 34, 34, W - 68, H - 68, 12);
  ctx.stroke();

  // ── Decorative stars row ─────────────────────────────────────
  ctx.fillStyle  = '#fdffb6';
  ctx.font       = '34px sans-serif';
  ctx.textAlign  = 'center';
  ctx.fillText('★   ★   ★', W / 2, 94);

  // ── Game name ────────────────────────────────────────────────
  ctx.fillStyle = '#ffb3c1';
  ctx.font      = `bold 58px ${font}`;
  ctx.textAlign = 'center';
  // Text shadow via two passes
  ctx.fillStyle = 'rgba(62,43,78,.7)';
  ctx.fillText(gameName, W / 2 + 4, 180 + 4);
  ctx.fillStyle = '#ffb3c1';
  ctx.fillText(gameName, W / 2, 180);

  // ── Divider ──────────────────────────────────────────────────
  const divGrad = ctx.createLinearGradient(80, 0, W - 80, 0);
  divGrad.addColorStop(0,   'transparent');
  divGrad.addColorStop(.2,  '#cdb4db');
  divGrad.addColorStop(.8,  '#cdb4db');
  divGrad.addColorStop(1,   'transparent');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth   = 3;
  ctx.beginPath();
  ctx.moveTo(80, 214); ctx.lineTo(W - 80, 214);
  ctx.stroke();

  // ── Score / message text (word-wrapped) ──────────────────────
  // Strip trailing URL hint — it'll appear in the footer instead
  const coreText = shareText.replace(/ Play at .+$/i, '').trim();
  ctx.fillStyle  = '#fdffb6';
  ctx.font       = `bold 40px ${font}`;
  ctx.textAlign  = 'center';
  wrapText(ctx, coreText, W / 2, 302, W - 180, 66);

  // ── Footer URL ───────────────────────────────────────────────
  ctx.fillStyle = '#b5ead7';
  ctx.font      = `26px ${font}`;
  ctx.textAlign = 'center';
  ctx.fillText('joAnsks.github.io', W / 2, H - 52);

  // Bottom stars
  ctx.fillStyle = '#fdffb6';
  ctx.font      = '22px sans-serif';
  ctx.fillText('⭐ ⭐ ⭐', W / 2, H - 26);

  return new Promise((resolve, reject) => {
    cv.toBlob(blob => {
      if (!blob) { reject(new Error('toBlob failed')); return; }
      resolve(new File([blob], 'score.png', { type: 'image/png' }));
    }, 'image/png');
  });
}

// ── Helpers ───────────────────────────────────────────────────
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x,     y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x,     y,     x + r, y);
  ctx.closePath();
}
