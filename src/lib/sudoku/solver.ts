/**
 * Sudoku solver and solution counter.
 *
 * The single most important function in this app is `countSolutions`: it is
 * what lets the generator prove that every puzzle it emits has exactly one
 * solution (AC #1, AC #2) rather than hoping so.
 *
 * Implementation notes:
 *
 * - Occupancy is tracked as 9-bit masks per row, column and box. Bit (d-1) is
 *   set when digit d is used. Candidate digits for a cell are therefore a
 *   single bitwise expression rather than a scan of 20 peers.
 * - Cell selection uses the minimum-remaining-values (MRV) heuristic: always
 *   branch on the most constrained empty cell. This collapses the search tree
 *   dramatically compared to scanning in index order.
 * - `countSolutions` takes a `limit` and stops as soon as it is reached. This
 *   is not a micro-optimisation: counting *all* solutions of a sparse grid is
 *   exponential, and uniqueness only ever needs to distinguish "1" from
 *   "more than 1". Every uniqueness check therefore passes limit = 2.
 */

import { CELL_COUNT, boxOf, colOf, rowOf, type Grid } from "./types";

/** All nine digits as a bitmask: 0b111111111. */
const ALL_DIGITS = 0x1ff;

/** Number of set bits in a 9-bit mask. */
function popcount(mask: number): number {
  let count = 0;
  let m = mask;
  while (m !== 0) {
    m &= m - 1;
    count += 1;
  }
  return count;
}

/** Expands a 9-bit candidate mask into the digits it represents. */
export function maskToDigits(mask: number): number[] {
  const digits: number[] = [];
  for (let d = 1; d <= 9; d += 1) {
    if ((mask & (1 << (d - 1))) !== 0) digits.push(d);
  }
  return digits;
}

/** Row/column/box occupancy masks for a grid. */
export interface Masks {
  rows: Int16Array;
  cols: Int16Array;
  boxes: Int16Array;
}

/**
 * Builds occupancy masks for a grid.
 *
 * Returns `null` when the grid is internally inconsistent — that is, when some
 * digit already repeats within a row, column or box. Such a grid has zero
 * solutions and must not be searched.
 */
export function buildMasks(grid: Grid): Masks | null {
  const rows = new Int16Array(9);
  const cols = new Int16Array(9);
  const boxes = new Int16Array(9);

  for (let i = 0; i < CELL_COUNT; i += 1) {
    const value = grid[i];
    if (value === 0) continue;
    const bit = 1 << (value - 1);
    const r = rowOf(i);
    const c = colOf(i);
    const b = boxOf(i);
    if ((rows[r] & bit) !== 0 || (cols[c] & bit) !== 0 || (boxes[b] & bit) !== 0) {
      return null;
    }
    rows[r] |= bit;
    cols[c] |= bit;
    boxes[b] |= bit;
  }

  return { rows, cols, boxes };
}

/**
 * Counts the solutions of `grid`, stopping early once `limit` is reached.
 *
 * The returned number is therefore capped at `limit` — a result of 2 with
 * limit 2 means "two or more", not "exactly two". That is all uniqueness
 * checking needs, and the cap is what keeps the search fast.
 */
export function countSolutions(grid: Grid, limit = 2): number {
  if (limit <= 0) return 0;

  const masks = buildMasks(grid);
  // An inconsistent starting grid has no solutions at all.
  if (masks === null) return 0;

  const work = grid.slice();
  const { rows, cols, boxes } = masks;
  let count = 0;

  function search(): void {
    // Pick the empty cell with the fewest candidates (MRV).
    let bestIndex = -1;
    let bestMask = 0;
    let bestCount = 10;

    for (let i = 0; i < CELL_COUNT; i += 1) {
      if (work[i] !== 0) continue;
      const used = rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOf(i)];
      const candidates = ~used & ALL_DIGITS;
      const n = popcount(candidates);
      if (n < bestCount) {
        bestCount = n;
        bestIndex = i;
        bestMask = candidates;
        // A forced cell (or a dead end) cannot be improved upon.
        if (n <= 1) break;
      }
    }

    // No empty cells remain: the grid is complete and valid.
    if (bestIndex === -1) {
      count += 1;
      return;
    }

    // Some empty cell has no legal digit: this branch is dead.
    if (bestCount === 0) return;

    const r = rowOf(bestIndex);
    const c = colOf(bestIndex);
    const b = boxOf(bestIndex);

    for (let d = 1; d <= 9; d += 1) {
      const bit = 1 << (d - 1);
      if ((bestMask & bit) === 0) continue;

      work[bestIndex] = d;
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;

      search();

      work[bestIndex] = 0;
      rows[r] &= ~bit;
      cols[c] &= ~bit;
      boxes[b] &= ~bit;

      if (count >= limit) return;
    }
  }

  search();
  return count;
}

/**
 * True when `grid` has exactly one solution.
 *
 * This is the predicate the generator uses after every clue removal, and it is
 * the reason every puzzle this app produces is solvable and unambiguous.
 */
export function hasUniqueSolution(grid: Grid): boolean {
  return countSolutions(grid, 2) === 1;
}

/**
 * Returns a solution for `grid`, or `null` when it has none.
 * Not used by the game itself (hints and auto-solve are out of scope); it
 * exists so tests can assert a puzzle's solution directly.
 */
export function solve(grid: Grid): Grid | null {
  const masks = buildMasks(grid);
  if (masks === null) return null;

  const work = grid.slice();
  const { rows, cols, boxes } = masks;

  function search(): boolean {
    let bestIndex = -1;
    let bestMask = 0;
    let bestCount = 10;

    for (let i = 0; i < CELL_COUNT; i += 1) {
      if (work[i] !== 0) continue;
      const used = rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOf(i)];
      const candidates = ~used & ALL_DIGITS;
      const n = popcount(candidates);
      if (n < bestCount) {
        bestCount = n;
        bestIndex = i;
        bestMask = candidates;
        if (n <= 1) break;
      }
    }

    if (bestIndex === -1) return true;
    if (bestCount === 0) return false;

    const r = rowOf(bestIndex);
    const c = colOf(bestIndex);
    const b = boxOf(bestIndex);

    for (const d of maskToDigits(bestMask)) {
      const bit = 1 << (d - 1);
      work[bestIndex] = d;
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;

      if (search()) return true;

      work[bestIndex] = 0;
      rows[r] &= ~bit;
      cols[c] &= ~bit;
      boxes[b] &= ~bit;
    }

    return false;
  }

  return search() ? work : null;
}
