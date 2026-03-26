// src/utils/hexMath.js

export const COL_HEIGHTS = [7, 12, 11, 10, 11, 12, 11, 12, 11, 10, 11, 12, 7];
export const NUM_COLS = COL_HEIGHTS.length; // 13

// Obstacles / Lairs
export const OBSTACLE_SET = new Set(["2,-5", "11,-5", "6,0", "1,4", "10,5"]);

export const HEX_SIZE = 28;
export const SVG_W = 860;
export const SVG_H = 760;
export const MOVE_RANGE = 3;

// Build all cells
export const CELLS = (() => {
  const cells = [];
  for (let c = 0; c < NUM_COLS; c++) {
    const n = COL_HEIGHTS[c];
    const rStart = -Math.floor(n / 2);
    for (let i = 0; i < n; i++) {
      const r = rStart + i;
      cells.push({ c, r, key: `${c},${r}` });
    }
  }
  return cells;
})();

// Compute centering offsets
const allPX = CELLS.map(({ c }) => c * 1.5 * HEX_SIZE);
const allPY = CELLS.map(({ c, r }) => (r + (c % 2 === 1 ? 0.5 : 0)) * Math.sqrt(3) * HEX_SIZE);
export const OX = (SVG_W - (Math.max(...allPX) - Math.min(...allPX))) / 2 - Math.min(...allPX);
export const OY = (SVG_H - (Math.max(...allPY) - Math.min(...allPY))) / 2 - Math.min(...allPY);

export function getXY(c, r) {
  return {
    px: OX + c * 1.5 * HEX_SIZE,
    py: OY + (r + (c % 2 === 1 ? 0.5 : 0)) * Math.sqrt(3) * HEX_SIZE,
  };
}

export function hexPoints(cx, cy, size) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i); // Flat Top
    return `${(cx + size * Math.cos(a)).toFixed(2)},${(cy + size * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

// Offset → cube coordinates (flat-top, even-col)
export function toCube(c, r) {
  const x = c;
  const z = r - Math.floor(c / 2);
  const y = -x - z;
  return { x, y, z };
}

export function hexDist(c1, r1, c2, r2) {
  const a = toCube(c1, r1);
  const b = toCube(c2, r2);
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}