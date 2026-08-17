'use client'

import { useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'

/**
 * `true` when it is safe to run expressive motion.
 *
 * Wraps framer's `useReducedMotion` so call sites read positively
 * (`motionSafe && <particles/>`) instead of double-negatively, and so there
 * is one place to add further gates later (battery, low-end device).
 */
export function useMotionSafe(): boolean {
  const shouldReduce = useReducedMotion()
  return !shouldReduce
}

/**
 * WebGL capability probe.
 *
 * The 3D freight network is the centrepiece of the marketing page, and it is
 * shown on whatever laptop the room happens to have — including ones with
 * hardware acceleration disabled by IT policy. Returns `null` while probing
 * so callers can hold the layout, then `false` to fall back to the static
 * SVG lane map rather than rendering a black rectangle or throwing.
 */
export function useWebGLSupport(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null)

  useEffect(() => {
    let ok = false
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
      ok = Boolean(gl)
      // Release the probe context immediately — browsers cap how many exist.
      const lose = (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')
      lose?.loseContext()
    } catch {
      ok = false
    }
    setSupported(ok)
  }, [])

  return supported
}

/**
 * Whether an element is currently near the viewport.
 * Used to suspend the R3F render loop when the globe is scrolled away —
 * an idle WebGL canvas still burns a demo laptop's battery otherwise.
 */
export function useInViewport<T extends Element>(ref: React.RefObject<T | null>, rootMargin = '200px'): boolean {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), { rootMargin })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, rootMargin])

  return inView
}

/** Matches a media query, SSR-safe (false until mounted). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    setMatches(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
