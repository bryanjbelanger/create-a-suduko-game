import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  CLUE_RANGES,
} from "@/lib/sudoku/difficulty";
import type { Difficulty } from "@/lib/sudoku/types";

export interface DifficultySelectorProps {
  value: Difficulty;
  onChange: (difficulty: Difficulty) => void;
}

/**
 * The three-way difficulty control (AC #6).
 *
 * Choosing a difficulty immediately starts a new puzzle at that level (AC #16),
 * which the parent handles - this component only reports the choice.
 */
export function DifficultySelector({
  value,
  onChange,
}: DifficultySelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        id="difficulty-label"
        className="text-sm font-medium text-slate-600 dark:text-slate-400"
      >
        Difficulty
      </span>
      <div
        role="group"
        aria-labelledby="difficulty-label"
        className="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600"
      >
        {DIFFICULTIES.map((difficulty) => {
          const isActive = difficulty === value;
          const { min, max } = CLUE_RANGES[difficulty];
          return (
            <button
              key={difficulty}
              type="button"
              onClick={() => onChange(difficulty)}
              aria-pressed={isActive}
              title={`${DIFFICULTY_LABELS[difficulty]} - ${min} to ${max} starting clues`}
              className={`px-4 py-2 text-sm font-medium transition-colors not-last:border-r not-last:border-slate-300 dark:not-last:border-slate-600 ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {DIFFICULTY_LABELS[difficulty]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DifficultySelector;
