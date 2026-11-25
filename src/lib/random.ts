/** Mulberry32: tiny, fast, seeded PRNG so every run can be replayed exactly. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Approximately normal(0,1) using the sum of uniforms (cheap, bounded). */
export function gaussian(rand: () => number) {
  let s = 0;
  for (let i = 0; i < 6; i++) s += rand();
  return (s - 3) / Math.sqrt(0.5);
}

export function newSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}
