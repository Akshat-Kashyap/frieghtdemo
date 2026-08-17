'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

import { fastTween, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useSafeReducedMotion } from '@/hooks/use-safe-reduced-motion'

import { SectionHeader } from '@/components/ui/primitives'

/**
 * SHARED PIECES FOR THE HOME DASHBOARD
 * ══════════════════════════════════════════════════════════════════════════
 * The dashboard is seven stacked sections, each one a window onto a module
 * that owns the data behind it. Four shapes repeat across every section — the
 * heading with its "open the module" link, that link on its own, the link as a
 * plate's footer strip, and the staggered arrival of a grid of plates — so
 * they are declared once here.
 *
 * Written down rather than repeated because the link is the argument of the
 * whole page: nothing on this screen is the record, everything is a pointer
 * at the module that holds it. A section that quietly ships without its way
 * through is a dead end on the first screen of the product.
 */

/* ══════════════════════════════════════════════════════════════════════════
   THE WAY THROUGH
   ══════════════════════════════════════════════════════════════════════════ */

export function ModuleLink({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex min-h-[32px] items-center gap-1.5 rounded-chip text-data font-medium text-signal transition-colors hover:underline',
        className,
      )}
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  )
}

/**
 * The same way through, cut as a plate's footer strip.
 *
 * `StatPlate` renders a `<div>`, not a link — correctly, because a plate is a
 * reading and wrapping a whole instrument face in an anchor makes every figure
 * on it announce as link text. So the way through is a real link filling the
 * footer groove instead: one unambiguous target, comfortably past 44px with
 * the strip's own padding, and the figure above it stays a figure.
 */
export function PlateLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group -my-1 flex min-h-[36px] items-center justify-between gap-2 rounded-chip text-micro font-medium text-text-muted transition-colors hover:text-signal"
    >
      <span className="truncate">{children}</span>
      <ArrowRight
        className="h-3.5 w-3.5 shrink-0 text-text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-signal"
        aria-hidden
      />
    </Link>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   ARRIVAL
   ══════════════════════════════════════════════════════════════════════════
   A grid of plates that lands one after another rather than all at once.

   35ms, and the number is the whole point: below about 25ms the eye reads the
   grid as a single flash and the stagger is wasted work; above about 60ms it
   reads as a slideshow being played at you, which on a screen someone opens
   forty times a day is an irritation rather than a flourish. At 35ms across
   four plates the last one lands 105ms after the first — felt as one
   considered movement with a direction, not as a queue.

   Reduced motion keeps the sequence and drops the travel: the plates still
   resolve in order, they just do not move. `useSafeReducedMotion` rather than
   framer's hook because the choice of variant changes the `initial` style that
   goes into the server HTML, and a mismatch there would fire for exactly the
   users who asked for less motion.
   ══════════════════════════════════════════════════════════════════════════ */

const RISE = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: fastTween },
}

const FADE = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.12 } },
}

export function StaggerGrid({
  children,
  className,
  as = 'ul',
}: {
  children: React.ReactNode
  className?: string
  /** `ul` for a list of things, `div` where the children are not peers. */
  as?: 'ul' | 'div'
}) {
  const reduce = useSafeReducedMotion()
  const Comp = as === 'ul' ? motion.ul : motion.div

  return (
    <Comp className={className} variants={stagger(reduce ? 0.02 : 0.035)} initial="hidden" animate="show">
      {children}
    </Comp>
  )
}

/** One cell of a `StaggerGrid`. Stretches so plates in a row match height. */
export function StaggerCell({
  children,
  className,
  as = 'li',
}: {
  children: React.ReactNode
  className?: string
  as?: 'li' | 'div'
}) {
  const reduce = useSafeReducedMotion()
  const Comp = as === 'li' ? motion.li : motion.div

  return (
    <Comp variants={reduce ? FADE : RISE} className={cn('flex min-w-0', className)}>
      {children}
    </Comp>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   SECTION
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * One band of the dashboard.
 *
 * `<section>` with a real heading rather than a styled div, so the page reads
 * as an outline to a screen reader working down it — this is the first screen
 * of the application and the one most likely to be navigated by landmark.
 */
export function HomeSection({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
  children,
  className,
}: {
  eyebrow?: string
  title: string
  description?: React.ReactNode
  /** The module that owns this data. Omitted only where nothing owns it. */
  href?: string
  linkLabel?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('min-w-0', className)} aria-label={title}>
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={href && linkLabel ? <ModuleLink href={href}>{linkLabel}</ModuleLink> : undefined}
      />
      <div className="mt-3.5">{children}</div>
    </section>
  )
}
