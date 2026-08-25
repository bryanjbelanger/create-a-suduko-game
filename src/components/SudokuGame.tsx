"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import { DifficultySelector } from "@/components/DifficultySelector";
import { GameStatus } from "@/components/GameStatus";
import { SudokuBoard } from "@/components/SudokuBoard";
import {
  createInitialState,
  gameReducer,
  type Direction,
} from "@/lib/game/reducer";
import { DEFAULT_DIFFICULTY } from "@/lib/sudoku/difficulty";
import { generatePuzzle } from "@/lib/sudoku/generator";
import type { Difficulty } from "@/lib/sudoku/types";
import { findConflicts, isSolved } from "@/lib/sudoku/validation";

const NO_CONFLICTS: ReadonlySet<number> = new Set<number>();

/**
 * The game container: owns state, generates puzzles, and wires up the board.
 *
 * **The first puzzle is generated in a mount effect, not in a lazy `useState`
 * initialiser.** This component is server-rendered and then hydrated; if the
 * first puzzle were created during render, the server would bake one random
 * puzzle into the HTML and the client would generate a different one, which is
 * a guaranteed hydration mismatch (AC #21). Starting from a `null` board means
 * the server and the first client render produce identical markup.
 *
 * Generation takes single-digit milliseconds, so the placeholder is not
 * perceptible and no loading spinner or async plumbing is warranted (AC #20).
 */
export function SudokuGame() {
  const [state, dispatch] = useReducer(
    gameReducer,
    DEFAULT_DIFFICULTY,
    createInitialState,
  );

  const startedRef = useRef(false);

  useEffect(() => {
    // Guard so React's development-mode double-invocation of effects does not
    // throw away a freshly generated puzzle.
    if (startedRef.current) return;
    startedRef.current = true;
    dispatch({
      type: "NEW_GAME",
      puzzle: generatePuzzle(DEFAULT_DIFFICULTY),
    });
  }, []);

  const { board, puzzle, selected, difficulty } = state;

  // Conflicts and the win state are derived from the board on every render,
  // never stored - so a flag can never go stale (AC #12).
  const conflicts = useMemo(
    () => (board === null ? NO_CONFLICTS : findConflicts(board)),
    [board],
  );

  const hasWon = board !== null && isSolved(board);
  const remaining =
    board === null ? 0 : board.reduce((n, value) => (value === 0 ? n + 1 : n), 0);

  const startGame = useCallback((next: Difficulty) => {
    dispatch({ type: "NEW_GAME", puzzle: generatePuzzle(next) });
  }, []);

  // AC #15 - a fresh puzzle at the current difficulty, at any time.
  const handleNewGame = useCallback(() => {
    startGame(difficulty);
  }, [startGame, difficulty]);

  // AC #16 - switching difficulty starts a new puzzle at that difficulty.
  const handleDifficultyChange = useCallback(
    (next: Difficulty) => {
      startGame(next);
    },
    [startGame],
  );

  const handleSelect = useCallback((index: number) => {
    dispatch({ type: "SELECT_CELL", index });
  }, []);

  const handleMove = useCallback((direction: Direction) => {
    dispatch({ type: "MOVE_SELECTION", direction });
  }, []);

  const handleDigit = useCallback((digit: number) => {
    dispatch({ type: "ENTER_DIGIT", digit });
  }, []);

  const handleClear = useCallback(() => {
    dispatch({ type: "CLEAR_CELL" });
  }, []);

  return (
    <main className="flex flex-col items-center gap-6 px-4 py-10">
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Sudoku
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Every puzzle is generated fresh and has exactly one solution.
        </p>
      </header>

      <DifficultySelector
        value={difficulty}
        onChange={handleDifficultyChange}
      />

      <SudokuBoard
        board={board}
        puzzle={puzzle}
        selected={selected}
        conflicts={conflicts as Set<number>}
        onSelect={handleSelect}
        onMove={handleMove}
        onDigit={handleDigit}
        onClear={handleClear}
      />

      <div className="w-full max-w-md">
        <GameStatus
          hasWon={hasWon}
          remaining={remaining}
          conflictCount={conflicts.size}
          isLoading={board === null}
          onNewGame={handleNewGame}
        />
      </div>

      <p className="max-w-md text-center text-xs text-slate-500 dark:text-slate-400">
        Click a cell or move with the arrow keys, type 1-9 to fill it, and press
        Backspace or Delete to clear it. Starting clues are shaded and cannot be
        changed.
      </p>
    </main>
  );
}

export default SudokuGame;
