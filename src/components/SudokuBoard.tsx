import { useCallback, useEffect, useRef } from "react";

import { SudokuCell } from "@/components/SudokuCell";
import type { Direction } from "@/lib/game/reducer";
import { CELL_COUNT, type Grid, type Puzzle } from "@/lib/sudoku/types";

const ARROW_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const CLEAR_KEYS = new Set(["Backspace", "Delete", "0"]);

export interface SudokuBoardProps {
  /** The player's working board, or `null` before the first puzzle exists. */
  board: Grid | null;
  /** The puzzle whose non-zero cells are the immutable givens. */
  puzzle: Puzzle | null;
  selected: number | null;
  /** Indices currently in conflict, recomputed by the caller each render. */
  conflicts: Set<number>;
  onSelect: (index: number) => void;
  onMove: (direction: Direction) => void;
  onDigit: (digit: number) => void;
  onClear: () => void;
}

/**
 * The 9x9 board.
 *
 * Keyboard handling lives here rather than on each cell: a single `onKeyDown`
 * on the container catches events bubbling up from whichever cell has focus.
 *
 * Before the first puzzle is generated, `board` is `null` and a static
 * placeholder is rendered. That placeholder is what the server sends and what
 * the client renders on its first pass, so hydration cannot mismatch (AC #21).
 */
export function SudokuBoard({
  board,
  puzzle,
  selected,
  conflicts,
  onSelect,
  onMove,
  onDigit,
  onClear,
}: SudokuBoardProps) {
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const registerRef = useCallback(
    (index: number, element: HTMLButtonElement | null) => {
      cellRefs.current[index] = element;
    },
    [],
  );

  // Keep DOM focus on the selected cell so that arrow-key navigation continues
  // to work after the selection moves. Clicking a cell focuses it natively, so
  // this is a no-op in that case.
  useEffect(() => {
    if (selected === null) return;
    cellRefs.current[selected]?.focus();
  }, [selected]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (board === null) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const direction = ARROW_DIRECTIONS[event.key];
    if (direction !== undefined) {
      // Stop the arrow keys from scrolling the page.
      event.preventDefault();
      onMove(direction);
      return;
    }

    if (event.key >= "1" && event.key <= "9" && event.key.length === 1) {
      event.preventDefault();
      onDigit(Number(event.key));
      return;
    }

    if (CLEAR_KEYS.has(event.key)) {
      event.preventDefault();
      onClear();
    }
  };

  const gridClasses =
    "grid grid-cols-9 bg-white shadow-sm dark:bg-slate-900 w-fit";

  if (board === null || puzzle === null) {
    return (
      <div
        data-testid="sudoku-board"
        aria-label="Sudoku board"
        aria-busy="true"
        className={gridClasses}
      >
        {Array.from({ length: CELL_COUNT }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="h-9 w-9 border-t border-l border-slate-300 sm:h-11 sm:w-11 dark:border-slate-700"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      data-testid="sudoku-board"
      aria-label="Sudoku board"
      onKeyDown={handleKeyDown}
      className={gridClasses}
    >
      {board.map((value, index) => (
        <SudokuCell
          key={index}
          index={index}
          value={value}
          isGiven={puzzle.grid[index] !== 0}
          isSelected={selected === index}
          isTabStop={selected === null ? index === 0 : selected === index}
          isConflict={conflicts.has(index)}
          onSelect={onSelect}
          registerRef={registerRef}
        />
      ))}
    </div>
  );
}

export default SudokuBoard;
