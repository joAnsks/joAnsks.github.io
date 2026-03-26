import { g } from './state.js';

export function burst(x, y, color, n = 14) {
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 / n) * i + Math.random() * 0.4;
    const spd   = 1.5 + Math.random() * 2.5;
    g.particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      r:  2 + Math.random() * 3,
      color,
      life:  1,
      decay: 0.025 + Math.random() * 0.02,
    });
  }
}
