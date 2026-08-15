import type { RNG } from "./mulberry32.js";

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";

function pickChar(rng: RNG, alphabet: string): string {
  const index = Math.floor(rng() * alphabet.length);
  return alphabet[index]!;
}

/** Consumes one RNG call each. Match the {L}/{l}/{D} procedural pattern tokens in schema/pack.schema.json. */
export function pickUpperLetter(rng: RNG): string {
  return pickChar(rng, UPPER);
}

export function pickLowerLetter(rng: RNG): string {
  return pickChar(rng, LOWER);
}

export function pickDigit(rng: RNG): string {
  return pickChar(rng, DIGITS);
}
