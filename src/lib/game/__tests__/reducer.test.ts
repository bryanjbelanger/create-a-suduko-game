import {
  createInitialState,
  gameReducer,
  isGiven,
  type GameState,
} from "@/lib/game/reducer";
import { generatePuzzle } from "@/lib/sudoku/generator";
import { mulberry32 } from "@/lib/sudoku/rng";
import { indexOf, type Puzzle } from "@/lib/sudoku/types";
import { isSolved } from "@/lib/sudoku/validation";
import { solve } from "@/lib/sudoku/solver";

/** Deterministic puzzles, so every assertion below is reproducible. */
const EASY: Puzzle = generatePuzzle("easy", mulberry32(1));
const HARD: Puzzle = generatePuzzle("hard", mulberry32(2));

/** A started game with a known puzzle. */
function started(puzzle: Puzzle = EASY): GameState {
  return gameReducer(createInitialState(), { type: "NEW_GAME", puzzle });
}

/** Index of the first empty (therefore editable) cell. */
function firstEmpty(state: GameState): number {
  const index = (state.board as number[]).findIndex((v) => v === 0);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

/** Index of the first given (therefore immutable) cell. */
function firstGiven(state: GameState): number {
  const index = (state.board as number[]).findIndex((v) => v !== 0);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

describe("createInitialState", () => {
  it("starts with no board, so server and client markup match (AC #21)", () => {
    const state = createInitialState();
    expect(state.board).toBeNull();
    expect(state.puzzle).toBeNull();
    expect(state.selected).toBeNull();
    expect(state.difficulty).toBe("easy");
  });

  it("accepts an explicit starting difficulty", () => {
    expect(createInitialState("hard").difficulty).toBe("hard");
  });

  it("ignores every interaction before a puzzle exists", () => {
    const state = createInitialState();
    expect(gameReducer(state, { type: "SELECT_CELL", index: 0 })).toBe(state);
    expect(gameReducer(state, { type: "ENTER_DIGIT", digit: 5 })).toBe(state);
    expect(gameReducer(state, { type: "CLEAR_CELL" })).toBe(state);
    expect(
      gameReducer(state, { type: "MOVE_SELECTION", direction: "down" }),
    ).toBe(state);
  });
});

describe("NEW_GAME", () => {
  it("installs the puzzle as the starting board", () => {
    const state = started();
    expect(state.puzzle).toBe(EASY);
    expect(state.board).toEqual(EASY.grid);
    expect(state.selected).toBeNull();
  });

  it("copies the grid so play cannot mutate the puzzle (AC #11)", () => {
    const state = started();
    expect(state.board).not.toBe(EASY.grid);

    const snapshot = EASY.grid.slice();
    const target = firstEmpty(state);
    const played = gameReducer(
      gameReducer(state, { type: "SELECT_CELL", index: target }),
      { type: "ENTER_DIGIT", digit: 5 },
    );
    expect(played.board?.[target]).toBe(5);
    expect(EASY.grid).toEqual(snapshot);
  });

  // AC #15 - New Game discards the current grid, including mid-game.
  it("discards in-progress work", () => {
    const state = started();
    const target = firstEmpty(state);
    const midGame = gameReducer(
      gameReducer(state, { type: "SELECT_CELL", index: target }),
      { type: "ENTER_DIGIT", digit: 4 },
    );
    expect(midGame.board?.[target]).toBe(4);

    const replacement = generatePuzzle("easy", mulberry32(99));
    const fresh = gameReducer(midGame, {
      type: "NEW_GAME",
      puzzle: replacement,
    });
    expect(fresh.board).toEqual(replacement.grid);
    expect(fresh.selected).toBeNull();
  });

  // AC #16 - switching difficulty starts a new puzzle at that difficulty.
  it("adopts the difficulty of the incoming puzzle", () => {
    const state = started(EASY);
    expect(state.difficulty).toBe("easy");

    const switched = gameReducer(state, { type: "NEW_GAME", puzzle: HARD });
    expect(switched.difficulty).toBe("hard");
    expect(switched.board).toEqual(HARD.grid);
  });
});

describe("SELECT_CELL", () => {
  it("selects a cell", () => {
    const state = gameReducer(started(), { type: "SELECT_CELL", index: 42 });
    expect(state.selected).toBe(42);
  });

  it("allows selecting a given cell (it just cannot be edited)", () => {
    const state = started();
    const given = firstGiven(state);
    expect(gameReducer(state, { type: "SELECT_CELL", index: given }).selected)
      .toBe(given);
  });

  it("ignores out-of-range indices", () => {
    const state = started();
    expect(gameReducer(state, { type: "SELECT_CELL", index: -1 })).toBe(state);
    expect(gameReducer(state, { type: "SELECT_CELL", index: 81 })).toBe(state);
    expect(gameReducer(state, { type: "SELECT_CELL", index: 1.5 })).toBe(state);
  });

  it("is a no-op when the cell is already selected", () => {
    const state = gameReducer(started(), { type: "SELECT_CELL", index: 10 });
    expect(gameReducer(state, { type: "SELECT_CELL", index: 10 })).toBe(state);
  });
});

describe("MOVE_SELECTION", () => {
  it("enters the board at the top-left when nothing is selected", () => {
    const state = gameReducer(started(), {
      type: "MOVE_SELECTION",
      direction: "down",
    });
    expect(state.selected).toBe(0);
  });

  it("moves in all four directions", () => {
    let state = gameReducer(started(), {
      type: "SELECT_CELL",
      index: indexOf(4, 4),
    });

    state = gameReducer(state, { type: "MOVE_SELECTION", direction: "up" });
    expect(state.selected).toBe(indexOf(3, 4));

    state = gameReducer(state, { type: "MOVE_SELECTION", direction: "down" });
    expect(state.selected).toBe(indexOf(4, 4));

    state = gameReducer(state, { type: "MOVE_SELECTION", direction: "left" });
    expect(state.selected).toBe(indexOf(4, 3));

    state = gameReducer(state, { type: "MOVE_SELECTION", direction: "right" });
    expect(state.selected).toBe(indexOf(4, 4));
  });

  it("clamps at every edge rather than wrapping", () => {
    const base = started();
    const at = (index: number) =>
      gameReducer(base, { type: "SELECT_CELL", index });

    expect(
      gameReducer(at(indexOf(0, 3)), {
        type: "MOVE_SELECTION",
        direction: "up",
      }).selected,
    ).toBe(indexOf(0, 3));

    expect(
      gameReducer(at(indexOf(8, 3)), {
        type: "MOVE_SELECTION",
        direction: "down",
      }).selected,
    ).toBe(indexOf(8, 3));

    expect(
      gameReducer(at(indexOf(3, 0)), {
        type: "MOVE_SELECTION",
        direction: "left",
      }).selected,
    ).toBe(indexOf(3, 0));

    expect(
      gameReducer(at(indexOf(3, 8)), {
        type: "MOVE_SELECTION",
        direction: "right",
      }).selected,
    ).toBe(indexOf(3, 8));
  });

  it("traverses givens instead of skipping them", () => {
    // Givens stay selectable, so navigation never develops dead cells.
    let state = gameReducer(started(), { type: "SELECT_CELL", index: 0 });
    for (let step = 0; step < 8; step += 1) {
      state = gameReducer(state, {
        type: "MOVE_SELECTION",
        direction: "right",
      });
      expect(state.selected).toBe(step + 1);
    }
  });
});

describe("ENTER_DIGIT", () => {
  // AC #9
  it("writes a digit into an empty cell", () => {
    const state = started();
    const target = firstEmpty(state);
    const next = gameReducer(
      gameReducer(state, { type: "SELECT_CELL", index: target }),
      { type: "ENTER_DIGIT", digit: 7 },
    );
    expect(next.board?.[target]).toBe(7);
  });

  it("overwrites a digit the player entered earlier", () => {
    const state = started();
    const target = firstEmpty(state);
    let next = gameReducer(state, { type: "SELECT_CELL", index: target });
    next = gameReducer(next, { type: "ENTER_DIGIT", digit: 3 });
    next = gameReducer(next, { type: "ENTER_DIGIT", digit: 8 });
    expect(next.board?.[target]).toBe(8);
  });

  it("accepts every digit from 1 to 9", () => {
    const state = started();
    const target = firstEmpty(state);
    const selected = gameReducer(state, {
      type: "SELECT_CELL",
      index: target,
    });
    for (let digit = 1; digit <= 9; digit += 1) {
      expect(
        gameReducer(selected, { type: "ENTER_DIGIT", digit }).board?.[target],
      ).toBe(digit);
    }
  });

  it("rejects digits outside 1-9", () => {
    const state = started();
    const selected = gameReducer(state, {
      type: "SELECT_CELL",
      index: firstEmpty(state),
    });
    for (const digit of [0, 10, -1, 1.5, NaN]) {
      expect(gameReducer(selected, { type: "ENTER_DIGIT", digit })).toBe(
        selected,
      );
    }
  });

  // AC #11 - the load-bearing immutability rule.
  it("refuses to modify a given cell", () => {
    const state = started();
    const given = firstGiven(state);
    const original = state.board?.[given];
    const selected = gameReducer(state, { type: "SELECT_CELL", index: given });

    const attempted = gameReducer(selected, { type: "ENTER_DIGIT", digit: 9 });
    expect(attempted).toBe(selected);
    expect(attempted.board?.[given]).toBe(original);
    expect(isGiven(attempted, given)).toBe(true);
  });

  it("does nothing when no cell is selected", () => {
    const state = started();
    expect(gameReducer(state, { type: "ENTER_DIGIT", digit: 5 })).toBe(state);
  });

  it("leaves other cells untouched", () => {
    const state = started();
    const target = firstEmpty(state);
    const next = gameReducer(
      gameReducer(state, { type: "SELECT_CELL", index: target }),
      { type: "ENTER_DIGIT", digit: 6 },
    );
    (state.board as number[]).forEach((value, index) => {
      if (index !== target) expect(next.board?.[index]).toBe(value);
    });
  });
});

describe("CLEAR_CELL", () => {
  // AC #10
  it("clears a digit the player entered", () => {
    const state = started();
    const target = firstEmpty(state);
    let next = gameReducer(state, { type: "SELECT_CELL", index: target });
    next = gameReducer(next, { type: "ENTER_DIGIT", digit: 2 });
    expect(next.board?.[target]).toBe(2);

    next = gameReducer(next, { type: "CLEAR_CELL" });
    expect(next.board?.[target]).toBe(0);
  });

  // AC #11
  it("refuses to clear a given cell", () => {
    const state = started();
    const given = firstGiven(state);
    const selected = gameReducer(state, { type: "SELECT_CELL", index: given });
    const attempted = gameReducer(selected, { type: "CLEAR_CELL" });
    expect(attempted).toBe(selected);
    expect(attempted.board?.[given]).not.toBe(0);
  });

  it("does nothing when no cell is selected", () => {
    const state = started();
    expect(gameReducer(state, { type: "CLEAR_CELL" })).toBe(state);
  });

  it("is a no-op on an already empty cell", () => {
    const state = started();
    const selected = gameReducer(state, {
      type: "SELECT_CELL",
      index: firstEmpty(state),
    });
    expect(gameReducer(selected, { type: "CLEAR_CELL" })).toBe(selected);
  });
});

describe("winning", () => {
  // AC #13 and AC #14, played out through the reducer.
  it("is not solved until the last correct digit is entered", () => {
    const puzzle = generatePuzzle("easy", mulberry32(7));
    const answer = solve(puzzle.grid) as number[];
    let state = gameReducer(createInitialState(), {
      type: "NEW_GAME",
      puzzle,
    });

    const blanks = puzzle.grid
      .map((value, index) => (value === 0 ? index : -1))
      .filter((index) => index >= 0);

    blanks.forEach((index, position) => {
      state = gameReducer(state, { type: "SELECT_CELL", index });
      state = gameReducer(state, {
        type: "ENTER_DIGIT",
        digit: answer[index],
      });
      const isLast = position === blanks.length - 1;
      // The win state must not appear one move early.
      expect(isSolved(state.board as number[])).toBe(isLast);
    });

    expect(state.board).toEqual(answer);
  });

  it("is not solved when the board is full but wrong", () => {
    const puzzle = generatePuzzle("easy", mulberry32(8));
    const answer = solve(puzzle.grid) as number[];
    let state = gameReducer(createInitialState(), {
      type: "NEW_GAME",
      puzzle,
    });

    const blanks = puzzle.grid
      .map((value, index) => (value === 0 ? index : -1))
      .filter((index) => index >= 0);

    // Fill everything correctly except the final cell, which gets a wrong digit.
    blanks.forEach((index, position) => {
      const correct = answer[index];
      const digit =
        position === blanks.length - 1 ? (correct === 9 ? 1 : correct + 1) : correct;
      state = gameReducer(state, { type: "SELECT_CELL", index });
      state = gameReducer(state, { type: "ENTER_DIGIT", digit });
    });

    expect((state.board as number[]).every((v) => v !== 0)).toBe(true);
    expect(isSolved(state.board as number[])).toBe(false);
  });
});

describe("purity", () => {
  it("returns the same state object when nothing changes", () => {
    const state = started();
    // Referential equality is the cheap signal React uses to skip re-renders.
    expect(gameReducer(state, { type: "ENTER_DIGIT", digit: 5 })).toBe(state);
  });

  it("never mutates the state it is given", () => {
    const state = started();
    const snapshot = JSON.stringify(state);
    gameReducer(state, { type: "SELECT_CELL", index: 40 });
    gameReducer(state, { type: "ENTER_DIGIT", digit: 5 });
    gameReducer(state, { type: "MOVE_SELECTION", direction: "right" });
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it("is deterministic - the same input always yields the same board", () => {
    const a = gameReducer(createInitialState(), {
      type: "NEW_GAME",
      puzzle: EASY,
    });
    const b = gameReducer(createInitialState(), {
      type: "NEW_GAME",
      puzzle: EASY,
    });
    expect(a.board).toEqual(b.board);
  });
});
