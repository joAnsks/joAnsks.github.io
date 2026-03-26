// ── Maze game mutable state ────────────────────────────────────
// Completely isolated from the brick-breaker g{} in state.js.
// All maze modules import this mg object.

export const mg = {
  // Grid
  grid:  null,   // 2-D array from generateMaze()
  cols:  0,
  rows:  0,

  // Ball — cell coords
  ballCol: 0,
  ballRow: 0,

  // Ball — pixel centre (interpolated during animation)
  ballPx: 0,
  ballPy: 0,

  // Smooth sliding animation between cells
  moving:    false,
  moveFrom:  { col: 0, row: 0 },
  moveTo:    { col: 0, row: 0 },
  moveT:     0,        // 0 → 1 progress of current step
  moveSpeed: 0.14,     // fraction of step per frame (modified by traps/powerups)

  // Camera — pixel offset of top-left corner
  camX: 0,
  camY: 0,

  // Active effect timers (in frames)
  shielded:    false,
  frozen:      false,
  freezeTimer: 0,
  boosted:     false,
  boostTimer:  0,

  // Scattered entities: { col, row, type: 'teleport'|'freeze'|'speed'|'shield', hit: false }
  entities: [],

  // Timer
  startTime:  0,   // performance.now() when level started
  elapsed:    0,   // ms since start (updated each frame)
  _pausedAt:  null, // performance.now() when paused

  // Best times per level number (loaded/saved via localStorage)
  bestTimes: {},

  // Flow flag: true after mazeLevelComplete(), cleared when next level begins
  awaitingNextLevel: false,

  // Chaser — enemy that hunts the ball via BFS
  chaserCol:      0,
  chaserRow:      0,
  chaserPx:       0,
  chaserPy:       0,
  chaserMoving:   false,
  chaserMoveFrom: { col: 0, row: 0 },
  chaserMoveTo:   { col: 0, row: 0 },
  chaserMoveT:    0,
  chaserSpeed:    0.07,   // slower than player's 0.14
  chaserDelay:    600,    // frames before chaser activates (10 s head start)
};
