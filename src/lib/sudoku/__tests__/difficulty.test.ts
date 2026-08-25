import {
  CLUE_RANGES,
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  isDifficulty,
} from "@/lib/sudoku/difficulty";

/**
 * `difficulty.ts` is the single source of truth the generator, the UI and
 * every other test import from. `generator.test.ts` exercises `CLUE_RANGES`
 * and `DIFFICULTIES` heavily but indirectly, through generated puzzles. This
 * file tests the module's own exports directly, including `isDifficulty`,
 * which nothing in the app currently calls (persistence - the only plausible
 * caller, e.g. validating a difficulty read back from storage - is out of
 * scope) but which ships as a public type guard and should not be untested
 * dead weight.
 */

describe("isDifficulty", () => {
  it("accepts every declared difficulty", () => {
    for (const difficulty of DIFFICULTIES) {
      expect(isDifficulty(difficulty)).toBe(true);
    }
  });

  it.each([
    ["an unknown string", "expert"],
    ["the wrong case", "Easy"],
    ["an empty string", ""],
    ["a number", 42],
    ["null", null],
    ["undefined", undefined],
    ["a plain object", {}],
    ["an array", ["easy"]],
  ])("rejects %s (%p)", (_label, value) => {
    expect(isDifficulty(value)).toBe(false);
  });
});

describe("DEFAULT_DIFFICULTY", () => {
  it("is one of the three declared difficulties", () => {
    expect(DIFFICULTIES).toContain(DEFAULT_DIFFICULTY);
  });
});

describe("DIFFICULTY_LABELS", () => {
  it("has a non-empty, human-readable label for every difficulty", () => {
    for (const difficulty of DIFFICULTIES) {
      expect(typeof DIFFICULTY_LABELS[difficulty]).toBe("string");
      expect(DIFFICULTY_LABELS[difficulty].length).toBeGreaterThan(0);
    }
  });
});

describe("CLUE_RANGES", () => {
  it("declares a valid, non-inverted range for every difficulty", () => {
    for (const difficulty of DIFFICULTIES) {
      const { min, max } = CLUE_RANGES[difficulty];
      expect(min).toBeLessThanOrEqual(max);
      expect(min).toBeGreaterThanOrEqual(17); // AC #8, at the table itself
    }
  });

  // AC #7 - re-asserted directly against the config table (generator.test.ts
  // asserts the same property against the generated sample).
  it("is disjoint and strictly ordered easy > medium > hard", () => {
    expect(CLUE_RANGES.easy.min).toBeGreaterThan(CLUE_RANGES.medium.max);
    expect(CLUE_RANGES.medium.min).toBeGreaterThan(CLUE_RANGES.hard.max);
  });
});
