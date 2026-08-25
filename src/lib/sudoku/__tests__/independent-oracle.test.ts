import { DIFFICULTIES, CLUE_RANGES } from "@/lib/sudoku/difficulty";
import { generatePuzzle } from "@/lib/sudoku/generator";
import type { Grid } from "@/lib/sudoku/types";

/**
 * A deliberately naive, independent solution counter.
 *
 * `generator.test.ts` proves uniqueness using `countSolutions` from
 * `solver.ts` - the same function the generator itself calls while digging
 * clues. That is a circular oracle: if `countSolutions` had a subtle bug, the
 * generator and its own test would agree with each other, and the suite
 * would stay green while the ticket's primary requirement (AC #1, #2 - every
 * puzzle has exactly one solution) went unproven.
 *
 * This counter shares zero code with `solver.ts`: no bitmasks, legality is
 * checked by walking each cell's row/column/box peers directly instead of
 * mask lookups, and it's a separate implementation top to bottom.
 *
 * It does branch on the empty cell with the fewest remaining legal digits
 * rather than the first empty cell in index order. Branching in plain index
 * order is naive backtracking with no pruning at all, and on a sparse
 * (hard-difficulty, 26-30 clue) grid that can blow up combinatorially and
 * never return - not "slow", an actual hang, since this is synchronous and
 * blocks the event loop rather than yielding. Independence here is about not
 * trusting solver.ts's implementation, not about being deliberately
 * unpruned: this still shares no code or data representation with it, and
 * only changes which cell gets branched on first.
 */
/**
 * True when no two givens already on the board conflict with each other.
 *
 * `isLegal` below only ever checks a digit being newly placed against the
 * rest of the board - a pre-filled cell is never re-validated against other
 * pre-filled cells. Without this check, a starting grid with two conflicting
 * givens (like the "contradictory" case below) is unsolvable, but the search
 * doesn't know that: it just keeps trying to complete the other 79 cells
 * around the fixed conflict, and that search doesn't converge in any
 * reasonable time. This walks the same peers `isLegal` does, just for every
 * given instead of one candidate placement.
 */
function isConsistentStart(board: Grid): boolean {
  for (let i = 0; i < board.length; i += 1) {
    const digit = board[i];
    if (digit === 0) continue;
    const row = Math.floor(i / 9);
    const col = i % 9;
    for (let k = 0; k < 9; k += 1) {
      if (k !== col && board[row * 9 + k] === digit) return false;
      if (k !== row && board[k * 9 + col] === digit) return false;
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        const idx = (boxRow + r) * 9 + (boxCol + c);
        if (idx !== i && board[idx] === digit) return false;
      }
    }
  }
  return true;
}

function independentSolutionCount(grid: Grid, limit: number): number {
  const board = grid.slice();
  if (!isConsistentStart(board)) return 0;
  let found = 0;

  const isLegal = (index: number, digit: number): boolean => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    for (let k = 0; k < 9; k += 1) {
      if (board[row * 9 + k] === digit) return false;
      if (board[k * 9 + col] === digit) return false;
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        if (board[(boxRow + r) * 9 + (boxCol + c)] === digit) return false;
      }
    }
    return true;
  };

  const search = (): void => {
    if (found >= limit) return;

    let bestIndex = -1;
    let bestCandidates: number[] = [];
    for (let i = 0; i < board.length; i += 1) {
      if (board[i] !== 0) continue;
      const candidates: number[] = [];
      for (let digit = 1; digit <= 9; digit += 1) {
        if (isLegal(i, digit)) candidates.push(digit);
      }
      if (bestIndex === -1 || candidates.length < bestCandidates.length) {
        bestIndex = i;
        bestCandidates = candidates;
        if (candidates.length <= 1) break; // can't do better than a forced cell
      }
    }

    if (bestIndex === -1) {
      found += 1;
      return;
    }
    if (bestCandidates.length === 0) return; // dead end: some empty cell has no legal digit

    for (const digit of bestCandidates) {
      board[bestIndex] = digit;
      search();
      board[bestIndex] = 0;
      if (found >= limit) return;
    }
  };

  search();
  return found;
}

describe("independent solution oracle", () => {
  it("is not vacuous: an empty grid has more than one solution, a contradictory grid has none", () => {
    const empty = new Array<number>(81).fill(0);
    expect(independentSolutionCount(empty, 2)).toBe(2);

    const contradictory = new Array<number>(81).fill(0);
    contradictory[0] = 5;
    contradictory[1] = 5; // same row, same digit - immediately inconsistent
    expect(independentSolutionCount(contradictory, 2)).toBe(0);
  });

  it.each(DIFFICULTIES)(
    "%s: 20 independently-sampled puzzles each have exactly one solution",
    (difficulty) => {
      const seenLayouts = new Set<string>();

      for (let i = 0; i < 20; i += 1) {
        const puzzle = generatePuzzle(difficulty);

        // AC #1, #2 - re-checked with a solver that shares no code with the
        // one the generator used to produce this puzzle in the first place.
        expect(independentSolutionCount(puzzle.grid, 2)).toBe(1);

        const clueCount = puzzle.grid.filter((value) => value !== 0).length;
        expect(clueCount).toBe(puzzle.clueCount);

        // AC #7, #8 - clue count lands in the documented, disjoint range.
        expect(clueCount).toBeGreaterThanOrEqual(CLUE_RANGES[difficulty].min);
        expect(clueCount).toBeLessThanOrEqual(CLUE_RANGES[difficulty].max);
        expect(clueCount).toBeGreaterThanOrEqual(17);

        seenLayouts.add(puzzle.grid.join(""));
      }

      // AC #4 - distinct layouts across independently-sampled puzzles too.
      expect(seenLayouts.size).toBe(20);
    },
    120_000,
  );
});
