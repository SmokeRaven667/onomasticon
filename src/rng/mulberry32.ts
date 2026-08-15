export type RNG = () => number;

/** Seeded PRNG returning floats in [0, 1). Same seed -> identical sequence, forever. */
export function mulberry32(seed: number): RNG {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mints a fresh 32-bit seed to start an unseeded session. Not used for generation math itself. */
export function randomSeed(): number {
  const bytes = new Uint32Array(1);
  globalThis.crypto.getRandomValues(bytes);
  return bytes[0]!;
}
