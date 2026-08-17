'use client'

import Link from 'next/link'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import { ArrowRight, Radar } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { BOUNDARY, DEMO, FIRST_VIEW } from '@/data/copy'
import { HERO_JOB_ID } from '@/data/jobs'
import { useMediaQuery } from '@/hooks/use-motion-safe'
import { ROUTES } from '@/lib/routes'
import { fadeUp, stagger } from '@/lib/motion'
import type { IndicativeOption } from '@/types'

import { EnquiryDrawer } from '@/components/intake/enquiry-drawer'
import { IndicativeOptions } from '@/components/intake/indicative-options'
import { FreightSearch } from '@/components/search/freight-search'
import { HarbourPlate } from './harbour-plate'

/**
 * THE FIRST VIEW
 * ══════════════════════════════════════════════════════════════════════════
 * A photograph of the thing the product coordinates, and the one control the
 * page is asking you to use, in the same screen.
 *
 * ── Why the footage is now a plate and not a wash ─────────────────────────
 * It used to bleed to all four edges of the browser and dissolve into the page
 * at the bottom, which is what every hero video does and it flattered nothing:
 * a 1920×1280 frame stretched across a 2560px display is a soft, cropped band
 * with no relationship to the layout. It is a plate now — the same object the
 * rest of the product is built from, at `--elev-2`, with a hairline, a milled
 * top edge, a real bottom edge and the page ground visible around it. The
 * picture is CONTAINED, so it is composed rather than merely wide, and it
 * belongs to the same material system as everything below it.
 *
 * ── Why the search panel straddles the bottom edge ────────────────────────
 * The claim of this page is that a booking screen is attached to a real
 * movement, so the control is half on the harbour and half on the page ground.
 * It is glass for that reason and not for the effect: you see the water
 * through it.
 *
 * ── Legibility outranks the picture ───────────────────────────────────────
 * The headline is three sentences and sets to roughly 620px, and it was being
 * read off the bow of a vessel. `.pw-footage-scrim` cuts the clearing it sits
 * on, and it now holds full strength past the end of the longest line — see
 * the note on that rule in `app/globals.css`. Nothing here paints its own
 * scrim on top to compensate.
 *
 * ── Depth without a canvas ────────────────────────────────────────────────
 * Three planes, three speeds: the footage drifts with scroll and leans a few
 * pixels away from the cursor, the clearing and the plate edge are fixed, and
 * the copy rises very slightly faster than the page. Transform and opacity
 * only, and all of it collapses to nothing under `prefers-reduced-motion` or a
 * coarse pointer. See the note at the foot of this file for why it is not
 * WebGL.
 */

/** How far each plane travels over one screen of scroll. */
const FOOTAGE_DRIFT = 84
const COPY_RISE = -26
/** Cursor lean, in pixels at the edge of the plate. Small on purpose. */
const LEAN_X = 16
const LEAN_Y = 11

export function Hero() {
  const shouldReduce = useReducedMotion()
  const finePointer = useMediaQuery('(pointer: fine)')
  const parallax = Boolean(finePointer) && !shouldReduce

  const [options, setOptions] = useState<IndicativeOption[] | null>(null)
  const [selected, setSelected] = useState<IndicativeOption | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const optionsRef = useRef<HTMLDivElement>(null)
  const plateRef = useRef<HTMLDivElement>(null)

  // ── Scroll depth ────────────────────────────────────────────────────────
  const { scrollYProgress } = useScroll({ target: plateRef, offset: ['start start', 'end start'] })
  const driftY = useTransform(scrollYProgress, [0, 1], shouldReduce ? [0, 0] : [0, FOOTAGE_DRIFT])
  const copyY = useTransform(scrollYProgress, [0, 1], shouldReduce ? [0, 0] : [0, COPY_RISE])

  // ── Cursor depth ────────────────────────────────────────────────────────
  // Springed rather than tracked directly: a picture that snaps to the mouse
  // reads as a bug, and a heavy spring is the difference between a plate with
  // depth behind it and a novelty.
  const leanX = useSpring(useMotionValue(0), { stiffness: 70, damping: 18, mass: 0.8 })
  const leanY = useSpring(useMotionValue(0), { stiffness: 70, damping: 18, mass: 0.8 })

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // Touch reports a pointer position too, and letting a tap shove the
      // footage sideways is exactly the sort of motion nobody asked for.
      if (!parallax || event.pointerType !== 'mouse') return
      const box = event.currentTarget.getBoundingClientRect()
      if (!box.width || !box.height) return
      leanX.set(-((event.clientX - box.left) / box.width - 0.5) * LEAN_X * 2)
      leanY.set(-((event.clientY - box.top) / box.height - 0.5) * LEAN_Y * 2)
    },
    [parallax, leanX, leanY],
  )

  const handlePointerLeave = useCallback(() => {
    leanX.set(0)
    leanY.set(0)
  }, [leanX, leanY])

  const handleOptionsReady = useCallback(
    (next: IndicativeOption[]) => {
      setOptions(next)
      // Scroll the results into view rather than snapping — the viewer has to
      // see that the options came out of the panel above them.
      requestAnimationFrame(() => {
        optionsRef.current?.scrollIntoView({ behavior: shouldReduce ? 'auto' : 'smooth', block: 'start' })
      })
    },
    [shouldReduce],
  )

  const handleModify = useCallback(() => {
    setOptions(null)
    document.getElementById('search')?.scrollIntoView({ behavior: shouldReduce ? 'auto' : 'smooth', block: 'start' })
  }, [shouldReduce])

  return (
    <section id="search" className="relative isolate pb-16 pt-[92px] lg:pb-20 lg:pt-[104px]">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        {/* ── The harbour plate ──────────────────────────────────────────── */}
        <div
          ref={plateRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className="pw-elev-2 relative min-h-[620px] overflow-hidden rounded-panel border border-hairline sm:min-h-[660px] lg:min-h-[600px]"
        >
          <HarbourPlate driftY={driftY} pointerX={parallax ? leanX : undefined} pointerY={parallax ? leanY : undefined} />

          <motion.div
            style={{ y: copyY }}
            variants={stagger(0.08)}
            initial="hidden"
            animate="show"
            className="relative max-w-[620px] px-5 pb-14 pt-10 sm:px-8 sm:pt-12 lg:px-12 lg:pb-16 lg:pt-16"
          >
            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="pw-stencil text-signal">{FIRST_VIEW.eyebrow}</span>

              {/* The demo badge states what this environment is, so it is built
                  like every other state chip in the product: an amber lamp on an
                  amber-washed face, mono because it is a machine condition and
                  not prose. The long form cannot set on a 360px screen without
                  wrapping to two lines inside its own chip, which reads as a
                  broken control, so a phone gets the short form. */}
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-chip border border-amber/30 bg-amber-dim/55 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-amber">
                <span className="pw-lamp h-1.5 w-1.5 shrink-0" aria-hidden />
                <span className="sm:hidden">{DEMO.badgeShort}</span>
                <span className="hidden sm:inline">{DEMO.badge}</span>
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-4 text-balance font-display text-[clamp(1.85rem,5vw,3.4rem)] font-semibold leading-[1.06] tracking-[-0.032em] text-text"
            >
              {FIRST_VIEW.heading}
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-5 max-w-[54ch] text-[15px] leading-[1.7] text-text-muted sm:text-[16px]"
            >
              {FIRST_VIEW.supporting}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-6">
              <Link
                href={ROUTES.booking(HERO_JOB_ID)}
                className="group inline-flex min-h-11 items-center gap-2 rounded-chip text-data font-semibold text-text transition-colors hover:text-signal"
              >
                <Radar className="h-4 w-4 text-signal" aria-hidden />
                {FIRST_VIEW.ctaAlternative}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* ── The search bar, straddling the plate's bottom edge ─────────── */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduce ? { duration: 0 } : { duration: 0.55, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 -mt-16 sm:-mt-20 lg:-mt-24"
        >
          <FreightSearch onOptionsReady={handleOptionsReady} />
        </motion.div>

        <p className="mx-auto mt-6 max-w-3xl text-center text-micro leading-relaxed text-text-faint">
          {BOUNDARY.statement}
        </p>

        {/* ── Results ────────────────────────────────────────────────────── */}
        <div ref={optionsRef} className="scroll-mt-24">
          <AnimatePresence mode="wait">
            {options && (
              <motion.div
                key="options"
                initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="mt-12"
              >
                <IndicativeOptions
                  options={options}
                  onModify={handleModify}
                  onSelect={(option) => {
                    setSelected(option)
                    setDrawerOpen(true)
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <EnquiryDrawer option={selected} open={drawerOpen} onOpenChange={setDrawerOpen} onModify={handleModify} />
    </section>
  )
}

/**
 * WHY THERE IS NO WEBGL IN THIS HERO
 * ══════════════════════════════════════════════════════════════════════════
 * `components/marketing/three/textures.ts` existed with zero importers — a
 * procedural chart, cast and environment map for a 3D magnifier that was never
 * built. It was good work: token-driven, seeded, one light. It has been
 * deleted anyway, and deliberately.
 *
 * A glass magnifier hovering over a freight hero is decoration, and the first
 * line of this product's theme file is that colour and depth are STATE and
 * never ornament. It would also have been a second, fake search affordance
 * sitting a few hundred pixels above the real one, on the screen where the
 * whole page is asking you to use the real one. And it would have cost a
 * WebGL context and the whole of three on the LCP screen to light a 60px
 * reflection, on a demo that is opened on whatever laptop the room has.
 *
 * The brief for that scene was depth — parallax between footage, scrim and
 * panel, and a response to the pointer. All of that is above, in three
 * transforms, at no bundle cost and with no fallback to maintain.
 */
