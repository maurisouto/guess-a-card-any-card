import { createSeededRandom } from "@/lib/utils/seededRandom";

/** Fisher–Yates shuffle with a deterministic RNG. Returns a new array. */
export function shuffleWithSeed<T>(items: readonly T[], seed: string): T[] {
  const rand = createSeededRandom(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
