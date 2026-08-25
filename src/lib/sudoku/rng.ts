/**
 * Random number generation.
 *
 * All randomness in the generator flows through an injectable `Rng` so that
 * tests can pin a seed for reproducibility while the shipped game stays
 * genuinely unpredictable (it defaults to `Math.random`).
 */

/** A random source returning a float in [0, 1), like `Math.random`. */
export type Rng = () => number;

/** The default random source used by the game. */
export const defaultRng: Rng = Math.random;

/**
 * mulberry32 — a small, fast, seedable PRNG with good statistical properties.
 * Used only by tests that need reproducible puzzles.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns a random integer in the inclusive range [min, max]. */
export function randomInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Fisher-Yates shuffle. Mutates and returns the array it is given. */
export function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}
