'use client'

import { useReducedMotion } from 'framer-motion'

import { useHydrated } from './use-hydrated'

/**
 * `prefers-reduced-motion`, safe to branch markup on.
 *
 * framer's `useReducedMotion` resolves the media query synchronously on the
 * client but has nothing to read on the server, so any component that chooses
 * *what to render* from it — a scrubbed video versus a static plate, an
 * initial transform versus none — emits one tree on the server and a
 * different one on the first client render. React throws a hydration
 * mismatch and rebuilds the subtree, and it only happens for the users who
 * asked for less motion, which is the worst possible group to break.
 *
 * This returns `false` until mount so both renders agree, then the real
 * preference. Anything that only feeds a `transition` can use framer's hook
 * directly — transitions are not part of the server HTML.
 */
export function useSafeReducedMotion(): boolean {
  const reduce = useReducedMotion()
  const hydrated = useHydrated()
  return hydrated ? Boolean(reduce) : false
}
