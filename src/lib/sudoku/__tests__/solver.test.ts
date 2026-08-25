import { generatePuzzle } from "@/lib/sudoku/generator";
import {
  buildMasks,
  countSolutions,
  hasUniqueSolution,
  maskToDigits,
  solve,
} from "@/lib/sudoku/solver";
import { emptyGrid, type Grid } from "@/lib/sudoku/types";
import { findConflicts, isComplete } from "@/lib/sudoku/validation";

/** Parses an 81-character puzzle string ('0' or '.' = empty) into a Grid. */
function parseGrid(text: string): Grid {
  const cleaned = text.replace(/\s/g, "");
  expect(cleaned).toHaveLength(81);
  return [...cleaned].map((ch) => (ch === "." ? 0 : Number(ch)));
}

/** A classic puzzle with exactly one solution. */
const CLASSIC = parseGrid(`
  530070000
  600195000
  098000060
  800060003
  400803001
  700020006
  060000280
  000419005
  000080079
`);

const CLASSIC_SOLUTION = parseGrid(`
  534678912
  672195348
  198342567
  859761423
  426853791
  713924856
  961537284
  287419635
  345286179
`);

describe("maskToDigits", () => {
  it("expands a bitmask into its digits", () => {
    expect(maskToDigits(0b000000001)).toEqual([1]);
    expect(maskToDigits(0b100000000)).toEqual([9]);
    expect(maskToDigits(0b000010101)).toEqual([1, 3, 5]);
    expect(maskToDigits(0b111111111)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(maskToDigits(0)).toEqual([]);
  });
});

describe("buildMasks", () => {
  it("builds masks for a consistent grid", () => {
    expect(buildMasks(CLASSIC)).not.toBeNull();
    expect(buildMasks(emptyGrid())).not.toBeNull();
  });

  it("rejects a grid with a repeated digit in a row", () => {
    const grid = emptyGrid();
    grid[0] = 5;
    grid[8] = 5;
    expect(buildMasks(grid)).toBeNull();
  });

  it("rejects a grid with a repeated digit in a column", () => {
    const grid = emptyGrid();
    grid[0] = 5;
    grid[72] = 5;
    expect(buildMasks(grid)).toBeNull();
  });

  it("rejects a grid with a repeated digit in a box", () => {
    const grid = emptyGrid();
    grid[0] = 5;
    grid[10] = 5;
    expect(buildMasks(grid)).toBeNull();
  });
});

describe("countSolutions", () => {
  it("finds exactly one solution for a well-formed puzzle", () => {
    expect(countSolutions(CLASSIC, 2)).toBe(1);
  });

  it("counts a completed valid grid as a single solution", () => {
    expect(countSolutions(CLASSIC_SOLUTION, 2)).toBe(1);
  });

  it("returns 0 for a grid with a duplicate digit", () => {
    const grid = CLASSIC.slice();
    // Cell 2 is empty; row 0 already contains a 5 at cell 0.
    grid[2] = 5;
    expect(countSolutions(grid, 2)).toBe(0);
  });

  it("returns 0 for a consistent grid that is nonetheless unsolvable", () => {
    // Row 0 holds 1-8, forcing cell (0,8) to be 9 - but a 9 already sits
    // below it in column 8. No digit can legally fill that cell.
    const grid = emptyGrid();
    for (let c = 0; c < 8; c += 1) grid[c] = c + 1;
    grid[17] = 9;

    // The grid really is internally consistent - it has no duplicates ...
    expect(buildMasks(grid)).not.toBeNull();
    // ... yet it cannot be completed.
    expect(countSolutions(grid, 2)).toBe(0);
  });

  it("detects that a multi-solution grid has more than one solution", () => {
    // Removing every 1 and every 2 from a solved grid always yields at least
    // two solutions: the original, and the one with all 1s and 2s swapped.
    const grid = CLASSIC_SOLUTION.map((v) => (v === 1 || v === 2 ? 0 : v));
    expect(countSolutions(grid, 2)).toBe(2);
    expect(hasUniqueSolution(grid)).toBe(false);
  });

  it("stops counting at the supplied limit", () => {
    const empty = emptyGrid();
    // An empty grid has ~6.67e21 solutions. Only the cap makes this tractable,
    // and the returned value must be exactly the cap.
    expect(countSolutions(empty, 1)).toBe(1);
    expect(countSolutions(empty, 2)).toBe(2);
    expect(countSolutions(empty, 5)).toBe(5);
  });

  it("returns 0 when the limit is not positive", () => {
    expect(countSolutions(CLASSIC, 0)).toBe(0);
  });

  it("does not mutate the grid it is given", () => {
    const grid = CLASSIC.slice();
    countSolutions(grid, 2);
    expect(grid).toEqual(CLASSIC);
  });
});

describe("hasUniqueSolution", () => {
  it("is true for a well-formed puzzle", () => {
    expect(hasUniqueSolution(CLASSIC)).toBe(true);
  });

  it("is false for an empty grid", () => {
    expect(hasUniqueSolution(emptyGrid())).toBe(false);
  });

  it("is false for an unsolvable grid", () => {
    const grid = CLASSIC.slice();
    grid[2] = 5;
    expect(hasUniqueSolution(grid)).toBe(false);
  });
});

describe("solve", () => {
  it("returns the expected solution for the classic puzzle", () => {
    expect(solve(CLASSIC)).toEqual(CLASSIC_SOLUTION);
  });

  it("returns a complete, conflict-free grid", () => {
    const solved = solve(CLASSIC);
    expect(solved).not.toBeNull();
    expect(isComplete(solved as Grid)).toBe(true);
    expect(findConflicts(solved as Grid).size).toBe(0);
  });

  it("preserves every given from the puzzle", () => {
    const solved = solve(CLASSIC) as Grid;
    CLASSIC.forEach((value, index) => {
      if (value !== 0) expect(solved[index]).toBe(value);
    });
  });

  it("returns null for an unsolvable grid", () => {
    const grid = CLASSIC.slice();
    grid[2] = 5;
    expect(solve(grid)).toBeNull();
  });

  it("solves a sparse, generated hard puzzle that requires real backtracking", () => {
    // CLASSIC above is dense enough to be resolved by singles alone under the
    // MRV heuristic, so it never needs to undo a placement and retry another
    // digit. A 26-30 clue hard puzzle is sparse enough that guessing wrong is
    // routine, so this exercises the search's backtrack branch for real
    // rather than only its straight-line success path.
    const puzzle = generatePuzzle("hard");
    const solved = solve(puzzle.grid);
    expect(solved).not.toBeNull();
    expect(isComplete(solved as Grid)).toBe(true);
    expect(findConflicts(solved as Grid).size).toBe(0);
    puzzle.grid.forEach((value, index) => {
      if (value !== 0) expect((solved as Grid)[index]).toBe(value);
    });
  });
});
