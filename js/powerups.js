import { g } from './state.js';
import { sfx } from './audio.js';
import { makeBall } from './ball.js';
import { currentPadW } from './paddle.js';

export const PU_TYPES = [
  { id: 'wide',  label: 'WIDE',      color: '#b5ead7', borderColor: '#5c9e83' },
  { id: 'multi', label: 'MULTIBALL', color: '#ffc8dd', borderColor: '#c0607a' },
  { id: 'slow',  label: 'SLOW',      color: '#bde0fe', borderColor: '#5a8fc0' },
  { id: 'life',  label: '+LIFE',     color: '#fdffb6', borderColor: '#a0a050' },
];

export function randomPUType() {
  return PU_TYPES[Math.floor(Math.random() * PU_TYPES.length)];
}

export function spawnDrop(bx, by, puType) {
  g.drops.push({ x: bx, y: by, vy: 2, type: puType, alive: true });
}

export function applyPU(type) {
  sfx.pu();
  if (type.id === 'wide') {
    g.padWidened = 600;
  } else if (type.id === 'multi') {
    const extras = g.balls.slice(0, 1).map(b =>
      makeBall(b.x, b.y, -b.dx + (Math.random() - 0.5), b.dy)
    );
    g.balls.push(...extras);
  } else if (type.id === 'slow') {
    g.activePUs.slow = 500;
    g.balls.forEach(b => {
      const spd = Math.hypot(b.dx, b.dy);
      if (spd > 2) { b.dx *= 0.6; b.dy *= 0.6; }
    });
  } else if (type.id === 'life') {
    g.lives = Math.min(g.lives + 1, 5);
  }
}

export function tickPUs() {
  if (g.padWidened > 0) {
    g.padWidened--;
    g.padW = currentPadW();
  }
  if (g.activePUs.slow > 0) g.activePUs.slow--;
}
