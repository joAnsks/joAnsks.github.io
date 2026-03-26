// ── Maze generation: iterative DFS (recursive backtracker) ─────
// Each cell: { row, col, walls: { N, S, E, W } }
// wall = true  → passage is BLOCKED
// wall = false → passage is OPEN

export function mazeSize(level) {
  // Level 1 = 7×7, grows by 2 per level, caps at 25×25 then cycles
  const MIN = 7, MAX = 25, STEP = 2;
  const steps = (MAX - MIN) / STEP;                // 9  (gives 10 distinct sizes)
  const idx   = (level - 1) % (steps + 1);         // 0–9, cycles
  const size  = MIN + idx * STEP;                   // 7, 9, 11 … 25
  return { cols: size, rows: size };
}

export function generateMaze(cols, rows) {
  // Build grid with all walls closed
  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = { row: r, col: c, walls: { N: true, S: true, E: true, W: true }, visited: false };
    }
  }

  // Direction descriptors: which wall on current cell opens, and which on neighbour
  const DIRS = [
    { dr: -1, dc:  0, wall: 'N', opp: 'S' },
    { dr:  1, dc:  0, wall: 'S', opp: 'N' },
    { dr:  0, dc:  1, wall: 'E', opp: 'W' },
    { dr:  0, dc: -1, wall: 'W', opp: 'E' },
  ];

  const stack = [grid[0][0]];
  grid[0][0].visited = true;

  while (stack.length) {
    const cell      = stack[stack.length - 1];
    const unvisited = [];

    for (const d of DIRS) {
      const nr = cell.row + d.dr;
      const nc = cell.col + d.dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].visited) {
        unvisited.push({ neighbour: grid[nr][nc], d });
      }
    }

    if (unvisited.length === 0) {
      stack.pop();
    } else {
      const { neighbour, d } = unvisited[Math.floor(Math.random() * unvisited.length)];
      cell.walls[d.wall]       = false;
      neighbour.walls[d.opp]   = false;
      neighbour.visited        = true;
      stack.push(neighbour);
    }
  }

  // Strip visited flags — not needed at runtime
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      delete grid[r][c].visited;

  return grid;
}
