export interface GameStatusProps {
  /** True once the board is completely and correctly filled. */
  hasWon: boolean;
  /** Number of cells still empty. */
  remaining: number;
  /** Number of cells currently in conflict. */
  conflictCount: number;
  /** True before the first puzzle has been generated. */
  isLoading: boolean;
  onNewGame: () => void;
}

/**
 * Status line and the New Game control.
 *
 * The win banner is driven entirely by `hasWon`, which the parent derives from
 * the board itself - so it can never be shown while a cell is empty or wrong
 * (AC #13, AC #14).
 */
export function GameStatus({
  hasWon,
  remaining,
  conflictCount,
  isLoading,
  onNewGame,
}: GameStatusProps) {
  let message: string;
  if (isLoading) {
    message = "Generating a puzzle...";
  } else if (hasWon) {
    message = "Solved. Nicely done.";
  } else if (conflictCount > 0) {
    message = `${conflictCount} ${
      conflictCount === 1 ? "cell conflicts" : "cells conflict"
    } with another cell`;
  } else {
    message = `${remaining} ${remaining === 1 ? "cell" : "cells"} to go`;
  }

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <p
        role="status"
        aria-live="polite"
        data-testid="game-status"
        className={`text-sm font-medium ${
          hasWon
            ? "text-green-700 dark:text-green-400"
            : conflictCount > 0
              ? "text-red-600 dark:text-red-400"
              : "text-slate-600 dark:text-slate-400"
        }`}
      >
        {message}
      </p>

      <button
        type="button"
        onClick={onNewGame}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
      >
        New Game
      </button>

      {hasWon ? (
        <div
          data-testid="win-banner"
          className="w-full rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-center dark:border-green-800 dark:bg-green-950"
        >
          <p className="text-lg font-semibold text-green-800 dark:text-green-300">
            You solved it!
          </p>
          <p className="text-sm text-green-700 dark:text-green-400">
            Every row, column and box checks out. Start a new game to play again.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default GameStatus;
