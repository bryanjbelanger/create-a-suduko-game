import type { Metadata } from "next";

import { SudokuGame } from "@/components/SudokuGame";

// `metadata` is only supported in Server Components, so this file must stay one
// - the interactive game lives behind the 'use client' boundary in SudokuGame.
export const metadata: Metadata = {
  title: "Sudoku",
  description:
    "Play a freshly generated Sudoku puzzle with a guaranteed unique solution, at easy, medium or hard difficulty.",
};

export default function Home() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="w-full max-w-3xl">
        <SudokuGame />
      </div>
    </div>
  );
}
