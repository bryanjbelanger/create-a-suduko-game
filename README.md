# Sudoku

A single-page Sudoku game. Every puzzle is generated in the browser when you ask
for it, and every puzzle has **exactly one** solution.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build    # production build
npm run lint     # ESLint (note: `next build` no longer lints in Next.js 16)
npm test         # Jest
```

## How to play

- **Click** a cell, or move around with the **arrow keys**.
- Type **1-9** to fill the selected cell.
- Press **Backspace**, **Delete** or **0** to clear it.
- Starting clues are shaded and cannot be changed.
- Any cell that duplicates a value in its row, column or 3x3 box is flagged in
  red as soon as you enter it, and unflagged as soon as you fix it.
- Fill the grid correctly and the game says so. **New Game** deals a fresh
  puzzle at any time; picking a different difficulty does the same.

## Difficulty

Difficulty is graded by **clue count** - how many digits you start with. The
ranges are deliberately disjoint and strictly ordered, so every easy puzzle
starts with more clues than every medium puzzle, and every medium puzzle starts
with more clues than every hard one.

| Difficulty | Starting clues |
| ---------- | -------------- |
| Easy       | 46-50          |
| Medium     | 34-38          |
| Hard       | 26-30          |

The floor of 26 sits well above 17, the proven minimum number of clues for a
uniquely solvable Sudoku. It is also well clear of the point (around 22 clues)
where random clue removal starts failing to find a valid puzzle and generation
times blow up.

## How puzzles are guaranteed solvable

This is the part of the app that matters most. A puzzle with no solution, or
with two, is worse than a hard puzzle: the player cannot tell a broken board
from a difficult one, so they blame themselves.

Generation therefore makes solvability true *by construction*, not by luck:

1. Build a complete, valid solution grid using randomised backtracking with a
   minimum-remaining-values heuristic.
2. Remove one clue at a time, in random order. **After every single removal,
   re-count the solutions - and put the clue straight back unless exactly one
   solution remains.**
3. Stop as soon as the target clue count for the chosen difficulty is reached.

Because a clue is never removed unless uniqueness survives, the resulting puzzle
always has exactly one solution. Its starting clues are also guaranteed to be
internally consistent, since they are a subset of a valid solution.

The solution counter stops as soon as it finds a second solution. That cap is
what keeps this fast: uniqueness only needs to distinguish "one" from "more than
one", never to count them all. In practice a puzzle is generated in single-digit
milliseconds, which is why there is no loading spinner.

## Architecture

```
src/lib/sudoku/     pure, framework-free puzzle logic
  types.ts          Grid / Difficulty / Puzzle and index helpers
  difficulty.ts     the clue ranges above - the single source of truth
  rng.ts            injectable random source (seedable for tests)
  solver.ts         countSolutions() with early exit; hasUniqueSolution()
  generator.ts      generateSolvedGrid() and generatePuzzle()
  validation.ts     findConflicts(), isComplete(), isSolved()
src/lib/game/
  reducer.ts        pure game state machine - no randomness, no I/O
src/components/     React presentation layer
```

All the correctness-critical logic is plain TypeScript with no React in it, so
it is tested by calling functions rather than by rendering.

Conflict flags and the win state are **derived** from the board on every render
rather than stored, so they cannot go stale. The solution is deliberately never
kept in state - nothing needs it, and not holding it means it cannot leak to a
curious player through React DevTools.

The game is entirely client-side: **no backend, no database, no environment
variables, and no network requests after the page loads**. The `/` route is
statically prerendered.

### One thing not to "simplify"

The first puzzle is generated in a mount `useEffect`, and the board starts as
`null`. Generating it in a lazy `useState` initialiser instead would make the
server render one random puzzle and the client hydrate a different one - a
guaranteed hydration mismatch. That failure passes `build`, `lint` and the jsdom
tests, so it would only show up in a real browser console.

## Tests

```bash
npm test
```

The generator suite proves correctness on a real sample rather than a single
puzzle: it generates **20 puzzles per difficulty (60 in total)** and asserts on
every one that it has exactly one solution, that its clues are internally
consistent, that its clue count is inside the documented range, and that no two
layouts are identical.
