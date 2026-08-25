/**
 * Difficulty definitions.
 *
 * Difficulty is graded purely by clue count, as confirmed by the ticket author.
 * This module is the single source of truth for the ranges — the generator, the
 * UI and the tests all import from here, so the ranges can never drift apart.
 */

import type { Difficulty } from "./types";

/** Inclusive clue-count range for a difficulty. */
export interface ClueRange {
  min: number;
  max: number;
}

/** The three difficulties, in ascending order of difficulty (AC #6). */
export const DIFFICULTIES: readonly Difficulty[] = [
  "easy",
  "medium",
  "hard",
] as const;

/** Human-readable labels for the difficulty selector. */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/**
 * Clue counts per difficulty. Ranges are deliberately **disjoint and strictly
 * ordered** (AC #7): every easy puzzle has more clues than every medium puzzle,
 * and every medium puzzle has more clues than every hard puzzle.
 *
 * The floor of 26 sits well above the proven 17-clue minimum for a uniquely
 * solvable Sudoku (AC #8), and well clear of the measured performance cliff
 * below ~24 clues where random digging rarely reaches a minimal puzzle.
 */
export const CLUE_RANGES: Record<Difficulty, ClueRange> = {
  easy: { min: 46, max: 50 },
  medium: { min: 34, max: 38 },
  hard: { min: 26, max: 30 },
};

/** The default difficulty a fresh game starts on. */
export const DEFAULT_DIFFICULTY: Difficulty = "easy";

/** Type guard for values arriving from outside the type system. */
export function isDifficulty(value: unknown): value is Difficulty {
  return (
    typeof value === "string" &&
    (DIFFICULTIES as readonly string[]).includes(value)
  );
}
