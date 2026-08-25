/**
 * Puzzle generation.
 *
 * Two steps:
 *
 * 1. `generateSolvedGrid` fills an empty grid via randomised MRV backtracking,
 *    producing a complete, valid solution.
 * 2. `generatePuzzle` removes clues from that solution one at a time. **After
 *    every removal it re-checks that exactly one solution remains**, and puts
 *    the clue back if not.
 *
 * Because a clue is never removed unless uniqueness survives, the invariants
 * the ticket cares about hold *by construction* rather than by sampling luck:
 *
 * - every puzzle has at least one solution (AC #1),
 * - every puzzle has exactly one solution (AC #2),
 * - every puzzle's clues are internally consistent (AC #3) - the clues are a
 *   subset of a valid solution, and any subset of a consistent grid is itself
 *   consistent.
 */

import { CLUE_RANGES } from "./difficulty";
import { countSolutions, maskToDigits } from "./solver";
import { defaultRng, randomInt, shuffle, type Rng } from "./rng";
import {
  CELL_COUNT,
  boxOf,
  colOf,
  countClues,
  emptyGrid,
  rowOf,
  type Difficulty,
  type Grid,
  type Puzzle,
} from "./types";

const ALL_DIGITS = 0x1ff;

/**
 * Upper bound on full restarts before we give up on hitting the clue target.
 * At the configured clue ranges this has never been observed to trigger; the
 * bound exists so that a pathological case fails loudly instead of hanging.
 */
const MAX_ATTEMPTS = 20;

function popcount(mask: number): number {
  let count = 0;
  let m = mask;
  while (m !== 0) {
    m &= m - 1;
    count += 1;
  }
  return count;
}

/**
 * Produces a complete, valid 9x9 solution grid.
 *
 * Uses the same MRV + bitmask search as the solver, but tries candidate digits
 * in a random order so that every call yields a different grid (AC #4).
 */
export function generateSolvedGrid(rng: Rng = defaultRng): Grid {
  const grid = emptyGrid();
  const rows = new Int16Array(9);
  const cols = new Int16Array(9);
  const boxes = new Int16Array(9);

  function fill(): boolean {
    let bestIndex = -1;
    let bestMask = 0;
    let bestCount = 10;

    for (let i = 0; i < CELL_COUNT; i += 1) {
      if (grid[i] !== 0) continue;
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

    for (const d of shuffle(maskToDigits(bestMask), rng)) {
      const bit = 1 << (d - 1);
      grid[bestIndex] = d;
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;

      if (fill()) return true;

      grid[bestIndex] = 0;
      rows[r] &= ~bit;
      cols[c] &= ~bit;
      boxes[b] &= ~bit;
    }

    return false;
  }

  // A blank grid can always be completed, so this cannot fail in practice.
  if (!fill()) {
    throw new Error("Failed to generate a solved Sudoku grid");
  }

  return grid;
}

/**
 * Generates a puzzle for `difficulty` with a clue count drawn from that
 * difficulty's range.
 *
 * Digging stops the instant the target clue count is reached, so the puzzle
 * lands on a precise clue count rather than an approximate one - which is what
 * makes the per-difficulty ranges disjoint and strictly ordered (AC #7).
 */
export function generatePuzzle(
  difficulty: Difficulty,
  rng: Rng = defaultRng,
): Puzzle {
  const range = CLUE_RANGES[difficulty];
  const target = randomInt(rng, range.min, range.max);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const grid = generateSolvedGrid(rng);
    const order = shuffle(
      Array.from({ length: CELL_COUNT }, (_, i) => i),
      rng,
    );

    let clues = CELL_COUNT;

    for (const index of order) {
      if (clues <= target) break;

      const removed = grid[index];
      grid[index] = 0;

      // The heart of the ticket: only keep the removal if the puzzle still has
      // exactly one solution. Limit 2 is enough - we never need to know whether
      // there are 3 solutions or 300, only whether there is more than one.
      if (countSolutions(grid, 2) === 1) {
        clues -= 1;
      } else {
        grid[index] = removed;
      }
    }

    if (clues === target) {
      return { grid, difficulty, clueCount: clues };
    }
    // Otherwise every remaining clue was load-bearing before we hit the target;
    // discard this attempt and dig from a fresh solution grid.
  }

  throw new Error(
    `Unable to generate a ${difficulty} puzzle with ${target} clues after ${MAX_ATTEMPTS} attempts`,
  );
}

/** Convenience wrapper used by tests and assertions. */
export function puzzleClueCount(puzzle: Puzzle): number {
  return countClues(puzzle.grid);
}
