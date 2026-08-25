/**
 * Pure game state and transitions.
 *
 * The reducer is deliberately **pure**: it never calls `Math.random`, `Date`,
 * or any I/O. Puzzle generation happens in the caller (an event handler or the
 * mount effect) and the finished puzzle arrives on the `NEW_GAME` payload.
 *
 * Two things fall out of that. Gameplay behaviour is testable as plain function
 * calls, independent of React; and the same board can be reproduced exactly in
 * a test without stubbing randomness.
 */

import { DEFAULT_DIFFICULTY } from "@/lib/sudoku/difficulty";
import { isValidDigit } from "@/lib/sudoku/validation";
import { CELL_COUNT, SIZE, colOf, rowOf, indexOf } from "@/lib/sudoku/types";
import type { Difficulty, Grid, Puzzle } from "@/lib/sudoku/types";

/** Directions the selection can be moved with the arrow keys. */
export type Direction = "up" | "down" | "left" | "right";

export interface GameState {
  /** Difficulty of the puzzle currently in play. */
  difficulty: Difficulty;
  /**
   * The puzzle as generated. Non-zero cells are the givens and are immutable.
   * `null` before the first puzzle has been generated.
   */
  puzzle: Puzzle | null;
  /** The player's working board. `null` until the first puzzle arrives. */
  board: Grid | null;
  /** Index of the selected cell, or `null` when nothing is selected. */
  selected: number | null;
}

export type GameAction =
  | { type: "NEW_GAME"; puzzle: Puzzle }
  | { type: "SELECT_CELL"; index: number }
  | { type: "MOVE_SELECTION"; direction: Direction }
  | { type: "ENTER_DIGIT"; digit: number }
  | { type: "CLEAR_CELL" };

/**
 * The state before any puzzle exists.
 *
 * The board starts as `null` on purpose. Generating the first puzzle in a lazy
 * `useState` initialiser would make the server render one random puzzle and the
 * client hydrate a different one - a guaranteed hydration mismatch (AC #21).
 * Starting from `null` keeps the server and client markup identical.
 */
export function createInitialState(
  difficulty: Difficulty = DEFAULT_DIFFICULTY,
): GameState {
  return { difficulty, puzzle: null, board: null, selected: null };
}

/** True when `index` is one of the puzzle's immutable starting clues. */
export function isGiven(state: GameState, index: number): boolean {
  return state.puzzle !== null && state.puzzle.grid[index] !== 0;
}

/** True when the index addresses a real cell. */
function isCellIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < CELL_COUNT;
}

/** Moves an index one step in `direction`, clamping at the board edges. */
function move(index: number, direction: Direction): number {
  const row = rowOf(index);
  const col = colOf(index);
  switch (direction) {
    case "up":
      return indexOf(Math.max(0, row - 1), col);
    case "down":
      return indexOf(Math.min(SIZE - 1, row + 1), col);
    case "left":
      return indexOf(row, Math.max(0, col - 1));
    case "right":
      return indexOf(row, Math.min(SIZE - 1, col + 1));
  }
}

/**
 * Writes `value` into the selected cell, if that is legal.
 *
 * Every mutation funnels through here, so the rule that starting clues can
 * never be modified (AC #11) is enforced in one place, in state - not merely by
 * disabling a button, which the player could bypass.
 */
function writeSelected(state: GameState, value: number): GameState {
  const { board, selected } = state;
  if (board === null || selected === null) return state;
  // AC #11: givens are immutable. Selecting one and typing is a no-op.
  if (isGiven(state, selected)) return state;
  if (board[selected] === value) return state;

  const next = board.slice();
  next[selected] = value;
  return { ...state, board: next };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    // AC #15, AC #16: a fresh puzzle replaces the board outright, at whatever
    // difficulty the puzzle was generated for.
    case "NEW_GAME":
      return {
        difficulty: action.puzzle.difficulty,
        puzzle: action.puzzle,
        board: action.puzzle.grid.slice(),
        selected: null,
      };

    case "SELECT_CELL": {
      if (state.board === null) return state;
      if (!isCellIndex(action.index)) return state;
      if (state.selected === action.index) return state;
      return { ...state, selected: action.index };
    }

    case "MOVE_SELECTION": {
      if (state.board === null) return state;
      // The first arrow press with nothing selected enters the board.
      const from = state.selected ?? 0;
      const to = state.selected === null ? from : move(from, action.direction);
      if (to === state.selected) return state;
      return { ...state, selected: to };
    }

    // AC #9: enter a digit 1-9 into the selected cell.
    case "ENTER_DIGIT": {
      if (!isValidDigit(action.digit)) return state;
      return writeSelected(state, action.digit);
    }

    // AC #10: clear a digit the player previously entered.
    case "CLEAR_CELL":
      return writeSelected(state, 0);

    default:
      return state;
  }
}
