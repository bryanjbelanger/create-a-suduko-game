/**
 * Derived board state: conflicts, completeness and win detection.
 *
 * Nothing here is ever stored. Conflicts are recomputed from the board on every
 * render (81 cells - the cost is negligible), which means a conflict flag can
 * never go stale: resolving a duplicate clears its flag automatically, with no
 * invalidation logic to get wrong (AC #12).
 */

import { CELL_COUNT, boxOf, colOf, rowOf, type Grid } from "./types";

/**
 * Returns the indices of every filled cell whose value duplicates another
 * value in its row, column or 3x3 box. Empty cells are never conflicts.
 *
 * Both members of a duplicate pair are returned, so the UI can highlight the
 * whole conflict rather than arbitrarily blaming one cell.
 */
export function findConflicts(grid: Grid): Set<number> {
  const conflicts = new Set<number>();

  // For each unit (row / column / box), bucket cell indices by digit; any
  // bucket holding more than one index is a conflict.
  const scanUnit = (indices: number[]): void => {
    const seen = new Map<number, number[]>();
    for (const index of indices) {
      const value = grid[index];
      if (value === 0) continue;
      const bucket = seen.get(value);
      if (bucket === undefined) seen.set(value, [index]);
      else bucket.push(index);
    }
    for (const bucket of seen.values()) {
      if (bucket.length > 1) {
        for (const index of bucket) conflicts.add(index);
      }
    }
  };

  const rows: number[][] = Array.from({ length: 9 }, () => []);
  const cols: number[][] = Array.from({ length: 9 }, () => []);
  const boxes: number[][] = Array.from({ length: 9 }, () => []);

  for (let i = 0; i < CELL_COUNT; i += 1) {
    rows[rowOf(i)].push(i);
    cols[colOf(i)].push(i);
    boxes[boxOf(i)].push(i);
  }

  for (let u = 0; u < 9; u += 1) {
    scanUnit(rows[u]);
    scanUnit(cols[u]);
    scanUnit(boxes[u]);
  }

  return conflicts;
}

/** True when every cell holds a digit (the board may still be wrong). */
export function isComplete(grid: Grid): boolean {
  for (let i = 0; i < CELL_COUNT; i += 1) {
    if (grid[i] === 0) return false;
  }
  return true;
}

/**
 * True when the board is a valid, finished Sudoku solution (AC #13, AC #14).
 *
 * Completeness plus the absence of conflicts is sufficient, and needs no stored
 * answer key: a fully filled 9x9 grid with no duplicate in any row, column or
 * box *is* by definition a valid solution. Because the puzzle has exactly one
 * solution and the givens cannot be edited, that grid must be the intended one.
 *
 * Deliberately not storing the solution also means it cannot leak to a curious
 * player through React DevTools.
 */
export function isSolved(grid: Grid): boolean {
  return isComplete(grid) && findConflicts(grid).size === 0;
}

/** True when the digit is a legal Sudoku entry (1-9). */
export function isValidDigit(digit: number): boolean {
  return Number.isInteger(digit) && digit >= 1 && digit <= 9;
}
