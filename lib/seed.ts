/**
 * SEEDED RANDOMNESS
 * ──────────────────────────────────────────────────────────────────────────
 * `Math.random()` in a Next.js render path produces different values on the
 * server and the client, which React reports as a hydration mismatch. It also
 * makes the demo different on every reload, so a number you pointed at in a
 * meeting is gone by the time someone asks about it.
 *
 * Every non-authored value in this product — background job padding, particle
 * offsets, chart jitter — draws from here with a fixed string key instead.
 */

/** mulberry32: small, fast, good enough distribution for presentation data. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a — turns a human-readable key into a stable 32-bit seed. */
export function hashSeed(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * A deterministic generator bound to a name.
 * `rng('exception-padding')` returns the same sequence on every render,
 * on the server and in the browser, forever.
 */
export function rng(key: string) {
  const next = mulberry32(hashSeed(key))

  return {
    /** [0, 1) */
    next,
    /** Integer in [min, max] inclusive. */
    int(min: number, max: number): number {
      return min + Math.floor(next() * (max - min + 1))
    },
    /** Float in [min, max) rounded to `dp` decimals. */
    float(min: number, max: number, dp = 2): number {
      const v = min + next() * (max - min)
      const f = 10 ** dp
      return Math.round(v * f) / f
    },
    /** Uniform pick. Throws on an empty list rather than returning undefined. */
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error(`rng("${key}").pick called with an empty list`)
      return items[Math.floor(next() * items.length)]!
    },
    /** Weighted pick — `[value, weight]` pairs. */
    weighted<T>(entries: readonly (readonly [T, number])[]): T {
      const total = entries.reduce((sum, [, w]) => sum + w, 0)
      let roll = next() * total
      for (const [value, weight] of entries) {
        roll -= weight
        if (roll <= 0) return value
      }
      return entries[entries.length - 1]![0]
    },
    /** True with probability `p`. */
    chance(p: number): boolean {
      return next() < p
    },
    /** Fisher-Yates on a copy — never mutates the input. */
    shuffle<T>(items: readonly T[]): T[] {
      const out = [...items]
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[out[i], out[j]] = [out[j]!, out[i]!]
      }
      return out
    },
  }
}

export type Rng = ReturnType<typeof rng>
