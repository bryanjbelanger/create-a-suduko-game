import {
  findConflicts,
  isComplete,
  isSolved,
  isValidDigit,
} from "@/lib/sudoku/validation";
import { emptyGrid, indexOf, type Grid } from "@/lib/sudoku/types";
import { generateSolvedGrid } from "@/lib/sudoku/generator";
import { mulberry32 } from "@/lib/sudoku/rng";

/** A fixed, valid, complete solution used across these tests. */
const SOLVED: Grid = generateSolvedGrid(mulberry32(2024));

describe("findConflicts", () => {
  it("reports nothing for an empty grid", () => {
    expect(findConflicts(emptyGrid()).size).toBe(0);
  });

  it("reports nothing for a valid complete grid", () => {
    expect(findConflicts(SOLVED).size).toBe(0);
  });

  it("ignores empty cells entirely", () => {
    const grid = emptyGrid();
    // Many zeros share every row, column and box - but 0 means "empty",
    // not "a repeated digit".
    expect(findConflicts(grid).size).toBe(0);
  });

  it("flags a duplicate within a row", () => {
    const grid = emptyGrid();
    grid[indexOf(3, 0)] = 7;
    grid[indexOf(3, 8)] = 7;
    expect(findConflicts(grid)).toEqual(
      new Set([indexOf(3, 0), indexOf(3, 8)]),
    );
  });

  it("flags a duplicate within a column", () => {
    const grid = emptyGrid();
    grid[indexOf(0, 4)] = 2;
    grid[indexOf(8, 4)] = 2;
    expect(findConflicts(grid)).toEqual(
      new Set([indexOf(0, 4), indexOf(8, 4)]),
    );
  });

  it("flags a duplicate within a 3x3 box", () => {
    const grid = emptyGrid();
    // Same box (rows 3-5, cols 3-5), different row and different column.
    grid[indexOf(3, 3)] = 9;
    grid[indexOf(4, 4)] = 9;
    expect(findConflicts(grid)).toEqual(
      new Set([indexOf(3, 3), indexOf(4, 4)]),
    );
  });

  it("flags both members of a conflicting pair, not just one", () => {
    const grid = emptyGrid();
    grid[indexOf(0, 0)] = 5;
    grid[indexOf(0, 1)] = 5;
    const conflicts = findConflicts(grid);
    expect(conflicts.has(indexOf(0, 0))).toBe(true);
    expect(conflicts.has(indexOf(0, 1))).toBe(true);
    expect(conflicts.size).toBe(2);
  });

  it("flags every member of a triple", () => {
    const grid = emptyGrid();
    grid[indexOf(6, 0)] = 4;
    grid[indexOf(6, 3)] = 4;
    grid[indexOf(6, 6)] = 4;
    expect(findConflicts(grid).size).toBe(3);
  });

  it("does not flag the same digit in unrelated units", () => {
    const grid = emptyGrid();
    grid[indexOf(0, 0)] = 1;
    grid[indexOf(4, 4)] = 1;
    grid[indexOf(8, 8)] = 1;
    expect(findConflicts(grid).size).toBe(0);
  });

  // AC #12 - the flag must clear once the conflict is resolved.
  it("clears the flag once the duplicate is removed", () => {
    const grid = emptyGrid();
    grid[indexOf(2, 2)] = 6;
    grid[indexOf(2, 5)] = 6;
    expect(findConflicts(grid).size).toBe(2);

    grid[indexOf(2, 5)] = 0;
    expect(findConflicts(grid).size).toBe(0);
  });

  it("clears the flag once the duplicate is changed to a legal value", () => {
    const grid = SOLVED.slice();
    const target = indexOf(0, 0);
    const original = grid[target];
    const other = grid[indexOf(0, 1)];

    grid[target] = other;
    expect(findConflicts(grid).size).toBeGreaterThan(0);

    grid[target] = original;
    expect(findConflicts(grid).size).toBe(0);
  });

  it("does not mutate the grid", () => {
    const grid = SOLVED.slice();
    findConflicts(grid);
    expect(grid).toEqual(SOLVED);
  });
});

describe("isComplete", () => {
  it("is false for an empty grid", () => {
    expect(isComplete(emptyGrid())).toBe(false);
  });

  it("is false when a single cell is empty", () => {
    const grid = SOLVED.slice();
    grid[40] = 0;
    expect(isComplete(grid)).toBe(false);
  });

  it("is true for a fully filled grid, even an invalid one", () => {
    const grid = new Array<number>(81).fill(1);
    expect(isComplete(grid)).toBe(true);
  });
});

describe("isSolved", () => {
  // AC #13 - a genuine win.
  it("is true for a valid complete grid", () => {
    expect(isSolved(SOLVED)).toBe(true);
  });

  // AC #14 - never true while the board is incomplete.
  it("is false while any cell is empty", () => {
    const grid = SOLVED.slice();
    grid[80] = 0;
    expect(isSolved(grid)).toBe(false);
  });

  it("is false for an empty grid", () => {
    expect(isSolved(emptyGrid())).toBe(false);
  });

  // AC #14 - never true while any cell is wrong.
  it("is false for a full grid containing a conflict", () => {
    const grid = SOLVED.slice();
    grid[indexOf(0, 0)] = grid[indexOf(0, 1)];
    expect(isComplete(grid)).toBe(true);
    expect(isSolved(grid)).toBe(false);
  });

  it("is false for a full grid of identical digits", () => {
    expect(isSolved(new Array<number>(81).fill(5))).toBe(false);
  });

  it("becomes true exactly when the final cell is correctly filled", () => {
    const grid = SOLVED.slice();
    const last = 80;
    const answer = grid[last];

    grid[last] = 0;
    expect(isSolved(grid)).toBe(false);

    // A wrong digit completes the board but does not win it.
    grid[last] = answer === 1 ? 2 : 1;
    expect(isSolved(grid)).toBe(false);

    grid[last] = answer;
    expect(isSolved(grid)).toBe(true);
  });
});

describe("isValidDigit", () => {
  it("accepts 1 through 9", () => {
    for (let d = 1; d <= 9; d += 1) expect(isValidDigit(d)).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isValidDigit(0)).toBe(false);
    expect(isValidDigit(10)).toBe(false);
    expect(isValidDigit(-1)).toBe(false);
    expect(isValidDigit(1.5)).toBe(false);
    expect(isValidDigit(NaN)).toBe(false);
  });
});
