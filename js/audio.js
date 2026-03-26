// ── Web Audio API ────────────────────────────────────────────────
export const AC = new (window.AudioContext || window.webkitAudioContext)();

export function playTone(freq, type, dur, vol = 0.18) {
  try {
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.connect(g); g.connect(AC.destination);
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
    o.start(); o.stop(AC.currentTime + dur);
  } catch (_) {}
}

export const sfx = {
  paddle: () => playTone(320, 'sine',     0.08, 0.12),
  brick:  () => playTone(520, 'square',   0.07, 0.10),
  wall:   () => playTone(200, 'sine',     0.06, 0.08),
  life:   () => { playTone(160, 'sawtooth', 0.25, 0.2); setTimeout(() => playTone(120, 'sawtooth', 0.25, 0.2), 80); },
  pu:     () => { [600, 750, 900].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.12, 0.15), i * 60)); },
  clear:  () => { [500, 600, 700, 900].forEach((f, i) => setTimeout(() => playTone(f, 'triangle', 0.18, 0.2), i * 80)); },
};

// ── Chaser proximity music ─────────────────────────────────────
let _chaserMusicHandle = null;

function _thump(startFreq, vol) {
  try {
    const o = AC.createOscillator(), gn = AC.createGain();
    o.connect(gn); gn.connect(AC.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(startFreq, AC.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, AC.currentTime + 0.12);
    gn.gain.setValueAtTime(vol, AC.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.18);
    o.start(); o.stop(AC.currentTime + 0.18);
  } catch (_) {}
}

function _chaserBeat() {
  _thump(200, 0.6);                                    // lub
  setTimeout(() => _thump(160, 0.45), 200);            // dub
  _chaserMusicHandle = setTimeout(_chaserBeat, 900);
}

export function startChaserMusic() {
  if (_chaserMusicHandle !== null) return;
  _chaserBeat();
}

export function stopChaserMusic() {
  if (_chaserMusicHandle === null) return;
  clearTimeout(_chaserMusicHandle);
  _chaserMusicHandle = null;
}

function unlockAudio() { if (AC.state === 'suspended') AC.resume(); }
document.addEventListener('click',   unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });
