// Gilded Shadow — the level. "The Gilded Archive" at night: one hand-built
// floor plan, so patrols are learnable and every route can be reasoned about.
// Walls and crates block movement AND sight; bushes hide the player; shadow
// patches slow detection; the vault holds the Sunstone.
import { COLS, ROWS, TILE } from './config.js';

// Rectangles are {x, y, w, h} in tiles. (0,0) is the top-left tile.
const WALL_RECTS = [
  // Outer border.
  { x: 0, y: 0, w: 32, h: 1 }, { x: 0, y: 17, w: 32, h: 1 },
  { x: 0, y: 0, w: 1, h: 18 }, { x: 31, y: 0, w: 1, h: 18 },
  // Central vault (Sunstone inside). Door gaps: top at x=15, bottom at x=16.
  { x: 13, y: 6, w: 2, h: 1 }, { x: 16, y: 6, w: 3, h: 1 },
  { x: 13, y: 11, w: 3, h: 1 }, { x: 17, y: 11, w: 2, h: 1 },
  { x: 13, y: 7, w: 1, h: 4 }, { x: 18, y: 7, w: 1, h: 4 },
  // Library shelves, left wing (block sight: learnable cover).
  { x: 3, y: 4, w: 5, h: 1 }, { x: 2, y: 8, w: 5, h: 1 }, { x: 3, y: 12, w: 6, h: 1 },
  // Gallery pillars, right wing.
  { x: 24, y: 4, w: 1, h: 1 }, { x: 27, y: 7, w: 1, h: 1 },
  { x: 24, y: 10, w: 1, h: 1 }, { x: 27, y: 13, w: 1, h: 1 },
  // Bottom-corridor divider with two door gaps (x=14 and x=19).
  { x: 9, y: 14, w: 5, h: 1 }, { x: 15, y: 14, w: 4, h: 1 }, { x: 20, y: 14, w: 2, h: 1 },
];

// Single-tile crates: low cover, blocks movement and sight.
const CRATES = [
  [5, 6], [6, 6], [10, 10], [11, 10], [22, 5], [25, 12], [8, 15], [28, 3],
  [20, 2], [6, 15],
];

// Fern planters: walkable, hide the player from guards (unless very close).
const BUSHES = [
  { x: 2, y: 14, w: 2, h: 2 }, { x: 9, y: 2, w: 2, h: 1 },
  { x: 21, y: 13, w: 2, h: 1 }, { x: 28, y: 8, w: 2, h: 2 },
  { x: 11, y: 2, w: 1, h: 1 },
];

// Dark floor: detection fills much slower while the player stands in one.
const SHADOWS = [
  { x: 6, y: 15, w: 4, h: 2 }, { x: 23, y: 2, w: 4, h: 1 },
  { x: 11, y: 12, w: 2, h: 1 }, { x: 29, y: 5, w: 2, h: 2 },
];

export const LEVEL = {
  spawn: { x: 1.5 * TILE, y: 16.5 * TILE },
  exit: { x: 29.5 * TILE, y: 16.5 * TILE, radius: 26 },
  sunstone: { x: 15.5 * TILE, y: 8.5 * TILE },
  keys: [
    { x: 4.5 * TILE, y: 2.5 * TILE, id: 'key-north' },
    { x: 27.5 * TILE, y: 2.5 * TILE, id: 'key-east' },
  ],
  guards: [
    {
      name: 'Corridor', waypoints: [[2, 1.5], [30, 1.5]],
      loop: false, pauseAtEnds: 1.2,
    },
    {
      name: 'Stacks', waypoints: [[1.5, 5.5], [9, 5.5], [9, 13.5], [1.5, 13.5]],
      loop: true, pauseAtEnds: 0.8,
    },
    {
      name: 'Gallery', waypoints: [[22, 6.5], [30, 6.5], [30, 15.5], [22, 15.5]],
      loop: true, pauseAtEnds: 0.8,
    },
    {
      name: 'Vault', waypoints: [[12, 5.5], [19, 5.5], [19, 12.5], [12, 12.5]],
      loop: true, pauseAtEnds: 0.6,
    },
  ],
};

// ---- Tile grid -------------------------------------------------------------
const grid = new Uint8Array(COLS * ROWS); // 0 floor, 1 wall, 2 crate
function paintRect(rect, value) {
  for (let y = rect.y; y < rect.y + rect.h; y += 1) {
    for (let x = rect.x; x < rect.x + rect.w; x += 1) {
      if (x >= 0 && x < COLS && y >= 0 && y < ROWS) grid[y * COLS + x] = value;
    }
  }
}
for (const rect of WALL_RECTS) paintRect(rect, 1);
for (const [x, y] of CRATES) grid[y * COLS + x] = 2;

export function tileAt(px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return 1;
  return grid[ty * COLS + tx];
}
export function isWallTile(tx, ty) {
  if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return true;
  return grid[ty * COLS + tx] === 1;
}
export function blocksSight(px, py) { return tileAt(px, py) !== 0; }
export function blocksMove(px, py) { return tileAt(px, py) !== 0; }

function inRects(rects, px, py) {
  for (const r of rects) {
    if (px >= r.x * TILE && px < (r.x + r.w) * TILE && py >= r.y * TILE && py < (r.y + r.h) * TILE) return true;
  }
  return false;
}
export function inBush(px, py) { return inRects(BUSHES, px, py); }
export function inShadow(px, py) { return inRects(SHADOWS, px, py); }

export function wallTiles() {
  const out = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (grid[y * COLS + x] === 1) out.push([x, y]);
    }
  }
  return out;
}
export function crateTiles() {
  const out = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (grid[y * COLS + x] === 2) out.push([x, y]);
    }
  }
  return out;
}
export function bushRects() { return BUSHES; }
export function shadowRects() { return SHADOWS; }

// ---- Pathfinding (BFS on the tile grid, 4-directional) ---------------------
export function findPathTiles(fromPx, fromPy, toPx, toPy) {
  const start = [Math.floor(fromPx / TILE), Math.floor(fromPy / TILE)];
  const goal = [Math.floor(toPx / TILE), Math.floor(toPy / TILE)];
  if (tileAt(toPx, toPy) !== 0) return null;
  const key = (x, y) => y * COLS + x;
  const prev = new Map([[key(start[0], start[1]), null]]);
  const queue = [start];
  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    if (cx === goal[0] && cy === goal[1]) {
      const path = [];
      let cur = [cx, cy];
      while (cur !== null) {
        path.unshift([(cur[0] + 0.5) * TILE, (cur[1] + 0.5) * TILE]);
        cur = prev.get(key(cur[0], cur[1]));
      }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      if (grid[ny * COLS + nx] !== 0) continue;
      if (prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), [cx, cy]);
      queue.push([nx, ny]);
    }
  }
  return null;
}
