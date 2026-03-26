// ── Canvas ──────────────────────────────────────────────────────
export const canvas = document.getElementById('game');
export const ctx    = canvas.getContext('2d');
export const wrap   = document.getElementById('canvas-wrap');
export const W = () => canvas.width;
export const H = () => canvas.height;

// ── Visual constants ─────────────────────────────────────────────
export const PASTEL = ['#ffb3c1','#ffd6a5','#b5ead7','#bde0fe','#cdb4db','#fdffb6','#ffc8dd','#a2d2ff'];
export const BALL_CLR    = '#fff9fb';
export const PADDLE_CLR1 = '#cdb4db';
export const PADDLE_CLR2 = '#bde0fe';

// ── Physics constants ────────────────────────────────────────────
export const BALL_R    = 7;
export const COLS      = 10;
export const BRICK_GAP = 5;
export const PAD       = { h: 11, gap: 16, speed: 6 };

// ── Shared mutable game state ────────────────────────────────────
// All modules import this object and read/write its properties.
export const g = {
  // Top-level game mode
  gameMode: null,  // null | 'bounce' | 'maze'

  // Game flow
  state: 'idle',   // 'idle' | 'playing' | 'paused' | 'dead'
  score: 0,
  best:  +localStorage.getItem('pb_best') || 0,
  lives: 3,
  level: 1,

  // Screen shake
  shakeT:   0,
  shakeAmt: 0,

  // Paddle
  padX:      0,
  padW:      0,
  padWidened: 0,

  // Entities
  balls:     [],
  bricks:    [],
  drops:     [],
  particles: [],

  // Brick dimensions (set by initBricks)
  brickW: 0,
  brickH: 0,
  ROWS:   0,

  // Active power-up timers
  activePUs: {},

  // Input
  keys:   {},
  mouseX: null,
};
