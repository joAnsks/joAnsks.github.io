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

function _chaserBeat() {
  playTone(55, 'sine', 0.18, 0.28);                        // lub
  setTimeout(() => playTone(58, 'sine', 0.14, 0.22), 100); // dub
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
