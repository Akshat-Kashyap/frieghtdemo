/**
 * MOTION SYSTEM
 * ──────────────────────────────────────────────────────────────────────────
 * Shared variants, springs and easings. No component hand-rolls a duration —
 * that is how motion drifts from "considered" to "busy" across 20 modules.
 *
 * Budget: 180–320ms. Springs for panels and layout, expo-out for transforms.
 * Nothing loops forever except the port pulse and route particles, both of
 * which are gated on `useReducedMotion()` at their call sites.
 */

import type { Transition, Variants } from 'framer-motion'

/* ── Easings & springs ────────────────────────────────────────────────── */

/** The house easing. Fast start, long settle — reads as "precise", not "bouncy". */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const

export const DUR = {
  fast: 0.18,
  base: 0.24,
  slow: 0.32,
  /** Reserved for the globe → shipment-detail transition only. */
  cinematic: 0.6,
} as const

/** Panels, drawers, anything with weight. */
export const panelSpring: Transition = { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 }

/** Layout shifts (Kanban reflow, list reorder) — slightly stiffer so rows settle fast. */
export const layoutSpring: Transition = { type: 'spring', stiffness: 340, damping: 34, mass: 0.7 }

/** Numbers counting up. Critically damped: no overshoot on a currency value. */
export const numberSpring: Transition = { type: 'spring', stiffness: 120, damping: 24, mass: 0.6 }

export const baseTween: Transition = { duration: DUR.base, ease: EASE_OUT_EXPO }
export const fastTween: Transition = { duration: DUR.fast, ease: EASE_OUT_EXPO }

/* ── Core variants ────────────────────────────────────────────────────── */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: baseTween },
  exit: { opacity: 0, y: -8, transition: fastTween },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: baseTween },
  exit: { opacity: 0, transition: fastTween },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  show: { opacity: 1, scale: 1, transition: panelSpring },
  exit: { opacity: 0, scale: 0.98, transition: fastTween },
}

/**
 * Parent for staggered entrances. Children use `fadeUp`.
 * `staggerChildren` is deliberately short — 45ms reads as one considered
 * movement; 120ms reads as a slideshow.
 */
export function stagger(staggerChildren = 0.045, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren, delayChildren } },
    exit: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
  }
}

/** The intake wizard's horizontal step transition. Direction-aware. */
export function stepSlide(direction: 1 | -1): Variants {
  return {
    hidden: { opacity: 0, x: direction * 28 },
    show: { opacity: 1, x: 0, transition: { ...baseTween, duration: DUR.slow } },
    exit: { opacity: 0, x: direction * -28, transition: fastTween },
  }
}

/** Drawer from the right — the confirmation and detail surfaces. */
export const drawerSlide: Variants = {
  hidden: { x: '100%' },
  show: { x: 0, transition: panelSpring },
  exit: { x: '100%', transition: { duration: DUR.base, ease: EASE_IN_OUT } },
}

export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: fastTween },
  exit: { opacity: 0, transition: fastTween },
}

/** Accordion / expandable charge categories. */
export const collapse: Variants = {
  hidden: { height: 0, opacity: 0 },
  show: { height: 'auto', opacity: 1, transition: { height: panelSpring, opacity: { duration: DUR.fast } } },
  exit: { height: 0, opacity: 0, transition: { height: fastTween, opacity: { duration: 0.1 } } },
}

/* ── SVG path drawing (route lines) ───────────────────────────────────── */

export const drawPath: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  show: {
    pathLength: 1,
    opacity: 1,
    transition: { pathLength: { duration: 0.9, ease: EASE_OUT_EXPO }, opacity: { duration: 0.12 } },
  },
  exit: { pathLength: 0, opacity: 0, transition: fastTween },
}

/* ── Interaction feedback ─────────────────────────────────────────────── */

/** The house CTA feel: a small lift on hover, a real press on tap. */
export const pressable = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.985, y: 0 },
  transition: fastTween,
} as const

export const liftable = {
  whileHover: { y: -2 },
  transition: fastTween,
} as const

/* ── Reduced motion ───────────────────────────────────────────────────── */

/**
 * Collapses any variant set to opacity-only. Call sites pass the result of
 * `useReducedMotion()` and get a set that still *transitions* (so
 * AnimatePresence exit still works) but never translates or scales.
 */
export function reduce(variants: Variants, shouldReduce: boolean | null): Variants {
  if (!shouldReduce) return variants
  return {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.12 } },
    exit: { opacity: 0, transition: { duration: 0.12 } },
  }
}
