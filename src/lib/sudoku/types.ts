/**
 * Core Sudoku types and index helpers.
 *
 * A grid is a flat 81-length array of digits 0-9, row-major, where 0 means
 * "empty". A flat array (rather than number[][]) keeps the solver's hot loop
 * free of nested indexing and makes structural comparison trivial.
 */

/** Number of cells along one edge of the board. */
export const SIZE = 9;

/** Total number of cells on the board. */
export const CELL_COUNT = SIZE * SIZE;

/**
 * A Sudoku grid: 81 cells, row-major, values 0-9 where 0 means empty.
 * Complete grids contain no zeros.
 */
export type Grid = number[];

/** The three selectable difficulty levels (AC #6). */
export type Difficulty = "easy" | "medium" | "hard";

/** A generated puzzle: the starting clues plus the metadata used to build it. */
export interface Puzzle {
  /** Starting grid. Non-zero cells are the immutable givens. */
  grid: Grid;
  /** Difficulty this puzzle was generated for. */
  difficulty: Difficulty;
  /** Count of non-zero cells in `grid`. */
  clueCount: number;
}

/** Row index (0-8) of a flat cell index. */
export function rowOf(index: number): number {
  return Math.floor(index / SIZE);
}

/** Column index (0-8) of a flat cell index. */
export function colOf(index: number): number {
  return index % SIZE;
}

/** 3x3 box index (0-8, row-major) of a flat cell index. */
export function boxOf(index: number): number {
  return Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3);
}

/** Flat cell index for a row/column pair. */
export function indexOf(row: number, col: number): number {
  return row * SIZE + col;
}

/** Creates a new empty grid (all zeros). */
export function emptyGrid(): Grid {
  return new Array<number>(CELL_COUNT).fill(0);
}

/** Counts the non-empty cells in a grid. */
export function countClues(grid: Grid): number {
  let clues = 0;
  for (let i = 0; i < CELL_COUNT; i += 1) {
    if (grid[i] !== 0) clues += 1;
  }
  return clues;
}
