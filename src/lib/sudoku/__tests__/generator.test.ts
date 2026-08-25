import { CLUE_RANGES, DIFFICULTIES } from "@/lib/sudoku/difficulty";
import { generatePuzzle, generateSolvedGrid } from "@/lib/sudoku/generator";
import { mulberry32 } from "@/lib/sudoku/rng";
import { buildMasks, countSolutions } from "@/lib/sudoku/solver";
import { CELL_COUNT, countClues, type Difficulty, type Puzzle } from "@/lib/sudoku/types";
import { findConflicts, isComplete, isSolved } from "@/lib/sudoku/validation";

/**
 * Sample size per difficulty. AC #5 requires at least 20 puzzles per
 * difficulty (60 total): a single-sample test proves nothing, because it can
 * pass on luck.
 */
const SAMPLE_SIZE = 20;

/** Generated once and shared, so the expensive work happens a single time. */
const SAMPLES: Record<Difficulty, Puzzle[]> = {
  easy: [],
  medium: [],
  hard: [],
};

beforeAll(() => {
  for (const difficulty of DIFFICULTIES) {
    for (let i = 0; i < SAMPLE_SIZE; i += 1) {
      SAMPLES[difficulty].push(generatePuzzle(difficulty));
    }
  }
}, 60_000);

describe("generateSolvedGrid", () => {
  it("produces a complete, valid solution", () => {
    const grid = generateSolvedGrid();
    expect(grid).toHaveLength(CELL_COUNT);
    expect(isComplete(grid)).toBe(true);
    expect(findConflicts(grid).size).toBe(0);
    expect(isSolved(grid)).toBe(true);
  });

  it("contains each digit exactly nine times", () => {
    const grid = generateSolvedGrid();
    for (let digit = 1; digit <= 9; digit += 1) {
      expect(grid.filter((v) => v === digit)).toHaveLength(9);
    }
  });

  it("produces a different grid on each call", () => {
    const a = generateSolvedGrid();
    const b = generateSolvedGrid();
    expect(a.join("")).not.toEqual(b.join(""));
  });

  it("is reproducible when given a seeded rng", () => {
    const a = generateSolvedGrid(mulberry32(12345));
    const b = generateSolvedGrid(mulberry32(12345));
    expect(a).toEqual(b);
  });
});

describe.each(DIFFICULTIES)("generatePuzzle(%s)", (difficulty) => {
  it(`generates ${SAMPLE_SIZE} puzzles for the sample`, () => {
    expect(SAMPLES[difficulty]).toHaveLength(SAMPLE_SIZE);
  });

  // AC #1 and AC #2 - the core requirement of this ticket.
  it("every puzzle has exactly one solution", () => {
    for (const puzzle of SAMPLES[difficulty]) {
      expect(countSolutions(puzzle.grid, 2)).toBe(1);
    }
  });

  // AC #3 - starting clues never contradict each other.
  it("every puzzle's starting clues are internally consistent", () => {
    for (const puzzle of SAMPLES[difficulty]) {
      expect(findConflicts(puzzle.grid).size).toBe(0);
      expect(buildMasks(puzzle.grid)).not.toBeNull();
    }
  });

  // AC #7 - clue count lands inside the documented range.
  it("every puzzle's clue count is inside the documented range", () => {
    const { min, max } = CLUE_RANGES[difficulty];
    for (const puzzle of SAMPLES[difficulty]) {
      const clues = countClues(puzzle.grid);
      expect(clues).toBeGreaterThanOrEqual(min);
      expect(clues).toBeLessThanOrEqual(max);
      // The reported clue count must match the grid it describes.
      expect(puzzle.clueCount).toBe(clues);
    }
  });

  // AC #8 - never below the proven minimum for a uniquely solvable Sudoku.
  it("no puzzle has fewer than 17 clues", () => {
    for (const puzzle of SAMPLES[difficulty]) {
      expect(countClues(puzzle.grid)).toBeGreaterThanOrEqual(17);
    }
  });

  it("reports the difficulty it was asked for", () => {
    for (const puzzle of SAMPLES[difficulty]) {
      expect(puzzle.difficulty).toBe(difficulty);
    }
  });

  it("only contains digits 0-9", () => {
    for (const puzzle of SAMPLES[difficulty]) {
      expect(puzzle.grid).toHaveLength(CELL_COUNT);
      for (const value of puzzle.grid) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(9);
      }
    }
  });

  // AC #4 - puzzles are generated per request, not served from a fixture.
  it("produces a distinct clue layout every time", () => {
    const layouts = new Set(SAMPLES[difficulty].map((p) => p.grid.join("")));
    expect(layouts.size).toBe(SAMPLE_SIZE);
  });

  it("two consecutive requests differ", () => {
    const first = generatePuzzle(difficulty);
    const second = generatePuzzle(difficulty);
    expect(first.grid.join("")).not.toEqual(second.grid.join(""));
  });
});

// AC #7 - the ranges must be disjoint AND strictly ordered, not merely
// "different". This is asserted against the real generated sample, not just
// against the configuration table.
describe("difficulty ordering", () => {
  it("declares disjoint, strictly ordered ranges", () => {
    expect(CLUE_RANGES.easy.min).toBeGreaterThan(CLUE_RANGES.medium.max);
    expect(CLUE_RANGES.medium.min).toBeGreaterThan(CLUE_RANGES.hard.max);
    expect(CLUE_RANGES.hard.min).toBeGreaterThanOrEqual(17);
  });

  it("every easy puzzle has more clues than every medium puzzle", () => {
    const easiest = Math.min(...SAMPLES.easy.map((p) => countClues(p.grid)));
    const richestMedium = Math.max(
      ...SAMPLES.medium.map((p) => countClues(p.grid)),
    );
    expect(easiest).toBeGreaterThan(richestMedium);
  });

  it("every medium puzzle has more clues than every hard puzzle", () => {
    const leanestMedium = Math.min(
      ...SAMPLES.medium.map((p) => countClues(p.grid)),
    );
    const richestHard = Math.max(...SAMPLES.hard.map((p) => countClues(p.grid)));
    expect(leanestMedium).toBeGreaterThan(richestHard);
  });

  it("exposes exactly three difficulties", () => {
    expect(DIFFICULTIES).toEqual(["easy", "medium", "hard"]);
  });
});

// AC #20 - generation must not visibly stall the UI.
describe("performance", () => {
  it("generates a puzzle at every difficulty well within a second", () => {
    for (const difficulty of DIFFICULTIES) {
      const started = performance.now();
      generatePuzzle(difficulty);
      const elapsed = performance.now() - started;
      expect(elapsed).toBeLessThan(1000);
    }
  });
});
