import { colOf, rowOf } from "@/lib/sudoku/types";

export interface SudokuCellProps {
  /** Flat board index, 0-80. */
  index: number;
  /** Current value, 0 meaning empty. */
  value: number;
  /** True when this cell is one of the puzzle's immutable starting clues. */
  isGiven: boolean;
  /** True when this cell currently holds the selection. */
  isSelected: boolean;
  /**
   * True when this cell is the board's single tab stop. The board uses a
   * roving tabindex, so exactly one cell is reachable with Tab and the arrow
   * keys move between cells from there.
   */
  isTabStop: boolean;
  /** True when this cell duplicates a value in its row, column or box. */
  isConflict: boolean;
  onSelect: (index: number) => void;
  /** Registers the underlying button so the board can focus it directly. */
  registerRef: (index: number, element: HTMLButtonElement | null) => void;
}

/**
 * A single board cell.
 *
 * Two deliberate choices that are easy to get wrong:
 *
 * 1. **Given cells are never `disabled`.** A disabled button cannot receive
 *    programmatic focus, so arrow-key navigation would silently develop dead
 *    cells wherever a clue sits - and on an easy puzzle that is most of the
 *    board. Givens are marked `aria-disabled` instead, stay focusable, and have
 *    their edits rejected by the reducer (AC #11).
 * 2. **No `role` override.** An explicit `role="gridcell"` would *replace* the
 *    implicit button role, so the cells would stop being buttons for both
 *    assistive tech and tests.
 */
export function SudokuCell({
  index,
  value,
  isGiven,
  isSelected,
  isTabStop,
  isConflict,
  onSelect,
  registerRef,
}: SudokuCellProps) {
  const row = rowOf(index);
  const col = colOf(index);

  // Thick borders on 3x3 boundaries, thin ones elsewhere. Each side emits
  // exactly one width class, so no two utilities ever fight over a property.
  const left =
    col % 3 === 0
      ? "border-l-2 border-l-slate-800 dark:border-l-slate-200"
      : "border-l border-l-slate-300 dark:border-l-slate-700";
  const top =
    row % 3 === 0
      ? "border-t-2 border-t-slate-800 dark:border-t-slate-200"
      : "border-t border-t-slate-300 dark:border-t-slate-700";
  const right =
    col === 8 ? "border-r-2 border-r-slate-800 dark:border-r-slate-200" : "";
  const bottom =
    row === 8 ? "border-b-2 border-b-slate-800 dark:border-b-slate-200" : "";

  // Background carries the cell's status; selection is a ring, so a selected
  // cell that is also conflicting shows both at once.
  let surface: string;
  if (isConflict) {
    surface = "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
  } else if (isGiven) {
    surface = "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100";
  } else {
    surface =
      "bg-white text-blue-700 dark:bg-slate-900 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800";
  }

  const weight = isGiven ? "font-semibold" : "font-normal";
  const selection = isSelected
    ? "ring-2 ring-inset ring-blue-500 dark:ring-blue-400 z-10"
    : "";

  const label = `Row ${row + 1}, column ${col + 1}, ${
    value === 0 ? "empty" : value
  }${isGiven ? ", given" : ""}`;

  return (
    <button
      type="button"
      ref={(element) => registerRef(index, element)}
      onClick={() => onSelect(index)}
      tabIndex={isTabStop ? 0 : -1}
      aria-disabled={isGiven || undefined}
      aria-label={label}
      data-index={index}
      data-given={isGiven || undefined}
      data-conflict={isConflict || undefined}
      data-selected={isSelected || undefined}
      className={`relative flex h-9 w-9 items-center justify-center text-lg tabular-nums outline-none transition-colors select-none sm:h-11 sm:w-11 sm:text-xl ${left} ${top} ${right} ${bottom} ${surface} ${weight} ${selection}`}
    >
      {value === 0 ? "" : value}
    </button>
  );
}

export default SudokuCell;
