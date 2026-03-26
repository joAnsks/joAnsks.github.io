import { g, W, H, PAD, BALL_R } from './state.js';

export function makeBall(x, y, dx, dy) {
  return { x, y, dx, dy, trail: [] };
}

export function initBall() {
  const spd = 3.5 + g.level * 0.35;
  const dir = Math.random() < 0.5 ? 1 : -1;
  g.balls = [makeBall(W() / 2, H() - PAD.gap - PAD.h - BALL_R - 10, dir * spd, -spd)];
}
