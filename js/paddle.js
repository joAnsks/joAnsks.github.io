import { g, W, PAD } from './state.js';

export function basePadW()    { return W() * 0.18; }
export function currentPadW() { return g.padWidened > 0 ? basePadW() * 1.7 : basePadW(); }

export function initPad() {
  g.padW = currentPadW();
  g.padX = (W() - g.padW) / 2;
}

export function clampPad() {
  g.padX = Math.max(0, Math.min(W() - g.padW, g.padX));
}
