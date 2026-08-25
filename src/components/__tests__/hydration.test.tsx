/**
 * Hydration safety (AC #21).
 *
 * This is the one failure mode that `npm run build`, `npm run lint` and an
 * ordinary Testing Library `render()` all pass straight through: a mismatch
 * between the server-rendered HTML and the client's first render is a *runtime*
 * browser error. `render()` never hydrates, so it cannot catch it.
 *
 * These tests therefore server-render the component with `renderToString` and
 * then genuinely `hydrateRoot` that markup, failing on any React warning.
 */

import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import { SudokuGame } from "@/components/SudokuGame";
import { CELL_COUNT } from "@/lib/sudoku/types";

describe("server rendering", () => {
  it("renders a deterministic, digit-free placeholder board", () => {
    // If the first puzzle were generated during render, the server would bake
    // one random puzzle into the HTML and the client would produce another.
    const first = renderToString(<SudokuGame />);
    const second = renderToString(<SudokuGame />);
    expect(first).toEqual(second);
  });

  it("does not put any puzzle digits into the server HTML", () => {
    const html = renderToString(<SudokuGame />);
    const board = html.slice(html.indexOf('data-testid="sudoku-board"'));
    // The placeholder cells are empty divs; no cell content is emitted.
    expect(board).toContain('aria-busy="true"');
    expect(board).not.toContain("data-given");
  });
});

describe("hydration", () => {
  let container: HTMLDivElement;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    container.remove();
  });

  it("hydrates the server markup with no errors or warnings", () => {
    container.innerHTML = renderToString(<SudokuGame />);

    act(() => {
      hydrateRoot(container, <SudokuGame />);
    });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("becomes a playable board after hydration", () => {
    container.innerHTML = renderToString(<SudokuGame />);

    act(() => {
      hydrateRoot(container, <SudokuGame />);
    });

    // The mount effect has now generated the real puzzle.
    const cells = container.querySelectorAll("button[data-index]");
    expect(cells).toHaveLength(CELL_COUNT);
    expect(container.querySelectorAll("[data-given]").length).toBeGreaterThan(0);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
