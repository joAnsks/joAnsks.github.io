export const bg = {
  balls:     [],   // { x, y, vx, vy, r, isMain, age, color, stunned, stunnedT }
  cushions:  [],   // { x, y, r, color }
  pathNodes: [],   // { x, y, r, activated, side:'N'|'S'|'E'|'W', glowT }

  pathActivated: 0,
  pathTotal:     0,

  cat: {
    phase:        'idle',  // 'idle' | 'enter' | 'act' | 'retreat'
    x: 0, y: 0,
    targetX: 0, targetY: 0,
    entryX:  0, entryY:  0,
    action: null,          // 'squash' | 'play' | 'eat'
    timer:        0,
    cooldown:     0,
    pawX: 0, pawY: 0,
    pawT:         0,
    targetBallIdx: -1,
  },

  score:       0,
  bestScores:  {},         // { [level]: bestScore } — persisted to 'bloom_best'

  startTime:   0,
  elapsed:     0,
  _pausedAt:   null,

  frame:             0,
  awaitingNextLevel: false,
};
