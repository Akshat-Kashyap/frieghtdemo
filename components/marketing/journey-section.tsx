'use client'

import { motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { Anchor, ChevronDown, ClipboardCheck, FileText, Ship, Truck } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { STORY } from '@/data/copy'
import { pad2 } from '@/lib/format'
import { fadeUp, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useInViewport, useMediaQuery } from '@/hooks/use-motion-safe'
import { useSafeReducedMotion } from '@/hooks/use-safe-reduced-motion'

/**
 * THE JOURNEY
 * ══════════════════════════════════════════════════════════════════════════
 * The vessel comes alongside as you scroll.
 *
 * The footage is scrubbed rather than played: scroll position maps to
 * `currentTime`, so the ship's approach is under the reader's control and
 * each caption lands on the frame it describes. The clip is encoded
 * all-intra for this — seeking a normal inter-frame encode has to decode
 * back to the previous keyframe, which stutters under a scroll handler.
 *
 * ── Why this never ran ────────────────────────────────────────────────────
 * `body` carried `overflow-x: hidden`, which makes a browser compute
 * `overflow-y: auto` and promotes body to a scroll container. The viewport
 * then stops being the scrolling element, which kills `position: sticky` on
 * every descendant AND leaves framer's `useScroll` measuring something that
 * never moves. The sticky frame below never stuck and `scrollYProgress` sat
 * at 0, so the whole section rendered as a frozen first frame. That is fixed
 * at the root (`overflow-x: clip`), and everything here now depends on it.
 *
 * ── What the scroll is doing ──────────────────────────────────────────────
 * The section is 460vh of travel wrapping one 100dvh sticky frame, and
 * `offset: ['start start', 'end end']` maps progress 0→1 onto exactly the
 * span where that frame is pinned. Three things are driven from it, all from
 * the SAME motion value so the frame, the caption and the rail can never
 * disagree: the video's `currentTime`, the beat crossfade, and a lamp
 * travelling along the voyage rail from node to node. The shipment is
 * literally moving down the rail as the vessel closes on the berth.
 *
 * Three ways out, all of them intentional:
 *   · reduced motion  → the still plate, legs stacked, no scrub
 *   · narrow viewport → the still plate (2.3 MB is not a mobile asset)
 *   · video refuses   → the poster stays, the rail and captions still work
 */

const SCRUB_SRC = '/media/port-approach-scrub.mp4'
const POSTER = '/media/port-approach-poster.jpg'

interface Beat {
  key: string
  icon: typeof Ship
  label: string
  title: string
  body: string
}

const BEATS: Beat[] = [
  {
    key: 'request',
    icon: FileText,
    label: 'Request',
    title: 'Every freight journey starts as a request.',
    body: 'A lane, a cargo, a ready date. PortWhizz records it as an enquiry with an identity of its own, so nothing that follows has to be reconstructed from an email thread.',
  },
  {
    key: 'booking',
    icon: ClipboardCheck,
    label: 'Booking',
    title: 'A booking turns an option into a real movement.',
    body: 'Accepting an option creates the booking record — carrier, vessel, voyage and the cutoffs that come with them. From here the dates are somebody else’s schedule, not an estimate.',
  },
  {
    key: 'berth',
    icon: Anchor,
    label: 'Arrival',
    title: 'The vessel comes alongside.',
    body: 'Arrival, discharge and terminal handling are executed by the port and the carrier. What PortWhizz holds is the timeline: what happened, when, and who reported it.',
  },
  {
    key: 'handover',
    icon: Ship,
    label: 'Cargo',
    title: 'Cargo changes hands several times.',
    body: 'Terminal to CFS, CFS to transporter, transporter to your door. Each handover is a moment a shipment usually goes quiet — and the moment the job file has to hold.',
  },
  {
    key: 'delivery',
    icon: Truck,
    label: 'Delivery',
    title: 'From the berth to the final address.',
    body: 'Delivery order, inland movement, proof of delivery. The journey closes on a signed POD against the same job number the enquiry opened with.',
  },
]

export function JourneySection() {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const shouldReduce = useSafeReducedMotion()
  const isNarrow = useMediaQuery('(max-width: 900px)')
  const [ready, setReady] = useState(false)
  const [activeBeat, setActiveBeat] = useState(0)

  const scrub = !shouldReduce && !isNarrow

  /* 2.3 MB must not compete with the hero for the first paint's bandwidth, so
     the clip is not in the document until the section is roughly one screen
     away. The latch is one-way: unmounting it on the way back out would throw
     away the decode and re-download the whole thing on the return scroll. */
  const near = useInViewport(sectionRef, '600px')
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (near) setArmed(true)
  }, [near])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  /** Hold the first and last frames a beat so the ends do not feel clipped. */
  const voyage = useTransform(scrollYProgress, [0, 0.08, 0.92, 1], [0, 0, 1, 1])
  /** The prompt retires itself the moment it has been obeyed. */
  const hintOpacity = useTransform(scrollYProgress, [0, 0.04], [1, 0])

  /* Seeks are coalesced to one per animation frame. A scroll handler fires far
     more often than a video can decode, and issuing a second seek while the
     first is still resolving is what turns a scrub into a slideshow. */
  const targetTime = useRef(0)
  const rafId = useRef<number | null>(null)

  const scheduleSeek = useCallback(() => {
    if (rafId.current !== null) return
    rafId.current = requestAnimationFrame(function apply() {
      rafId.current = null
      const el = videoRef.current
      if (!el) return
      if (el.seeking) {
        // Still resolving — retry next frame rather than stacking a seek.
        rafId.current = requestAnimationFrame(apply)
        return
      }
      const t = targetTime.current
      if (Math.abs(el.currentTime - t) < 0.02) return
      // `fastSeek` skips the exact-frame search. On an all-intra encode every
      // frame is a keyframe, so it lands on the right one anyway — for free.
      if (typeof el.fastSeek === 'function') el.fastSeek(t)
      else el.currentTime = t
    })
  }, [])

  useEffect(
    () => () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current)
    },
    [],
  )

  const beatRef = useRef(0)

  useMotionValueEvent(voyage, 'change', (p) => {
    const el = videoRef.current
    const duration = el?.duration
    if (el && ready && typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
      // Clamped just short of the end: seeking to exactly `duration` parks some
      // browsers on a blank frame and fires `ended`.
      targetTime.current = Math.min(duration - 0.05, Math.max(0, p * duration))
      scheduleSeek()
    }

    // React state is the expensive half of this handler, so it only moves when
    // the beat actually turns over — not on every one of ~60 events a second.
    const index = Math.min(BEATS.length - 1, Math.max(0, Math.floor(p * BEATS.length)))
    if (index !== beatRef.current) {
      beatRef.current = index
      setActiveBeat(index)
    }
  })

  // A scrubbed video is never "played", so it needs an explicit nudge to decode
  // a first frame. Seeded from the current scroll position rather than 0, so
  // arriving mid-section (a deep link, a restored scroll) shows the right frame.
  useEffect(() => {
    if (!scrub || !ready) return
    const el = videoRef.current
    if (!el || !Number.isFinite(el.duration)) return
    el.currentTime = Math.max(0, voyage.get() * el.duration)
  }, [scrub, ready, voyage])

  return (
    <section
      ref={sectionRef}
      id="journey"
      aria-labelledby="journey-heading"
      className={cn('relative border-t border-hairline bg-ink', scrub ? 'h-[460vh]' : 'py-16 lg:py-20')}
    >
      {scrub ? (
        <div className="sticky top-0 h-dvh overflow-hidden">
          {/* ── The footage ───────────────────────────────────────────── */}
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={POSTER} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
            {armed && (
              <video
                ref={videoRef}
                src={SCRUB_SRC}
                poster={POSTER}
                muted
                playsInline
                preload="auto"
                aria-hidden
                onLoadedData={() => setReady(true)}
                className="absolute inset-0 h-full w-full object-cover [filter:saturate(1.02)_contrast(1.02)]"
              />
            )}
            <div className="pw-footage-scrim-soft absolute inset-0" />
          </div>

          {/* ── The story, read left, over the cleared field ───────────── */}
          <div className="relative mx-auto flex h-full w-full max-w-[1280px] flex-col justify-between px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
            <header className="max-w-[38ch]">
              <p className="flex items-center gap-2">
                <span aria-hidden className="h-[3px] w-3 shrink-0 rounded-full bg-signal/60" />
                <span className="pw-stencil">The journey</span>
              </p>
              <h2 id="journey-heading" className="mt-2 text-[17px] font-medium leading-snug text-text-muted">
                {STORY.heading}
              </h2>
            </header>

            {/* The visual beats crossfade in place, which is unreadable to a
                screen reader that is not scrolling. The animated stack is
                therefore hidden from AT outright and the full sequence is
                published once, in order, below. */}
            <div className="w-full max-w-[560px]" aria-hidden>
              <div className="relative min-h-[236px]">
                {BEATS.map((beat, i) => (
                  <motion.article
                    key={beat.key}
                    initial={false}
                    animate={{ opacity: i === activeBeat ? 1 : 0, y: i === activeBeat ? 0 : 16 }}
                    // Opacity and transform only. The previous pass animated a
                    // `blur()` filter here, which re-rasterises the whole text
                    // block every frame of a scroll-driven crossfade.
                    transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                      'absolute inset-x-0 top-0',
                      i === activeBeat ? 'z-10' : 'pointer-events-none z-0',
                    )}
                  >
                    <BeatBody beat={beat} />
                  </motion.article>
                ))}
              </div>
            </div>

            <ol className="sr-only">
              {BEATS.map((beat) => (
                <li key={beat.key}>
                  <h3>
                    {beat.label} — {beat.title}
                  </h3>
                  <p>{beat.body}</p>
                </li>
              ))}
            </ol>

            {/* ── The voyage rail ───────────────────────────────────────
                The one place on this page where glass is the honest material:
                it floats over moving footage, and you can see the harbour
                through it. */}
            <VoyageRail voyage={voyage} hintOpacity={hintOpacity} active={activeBeat} />
          </div>
        </div>
      ) : (
        <StaticJourney />
      )}
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   THE VOYAGE RAIL
   ══════════════════════════════════════════════════════════════════════════
   A recessed channel with five nodes and a lamp running along it. Geometry is
   the whole trick: a five-column grid puts node centres at 10 / 30 / 50 / 70 /
   90 % of the track, so mapping both the lamp's travel and the fill's scale to
   that same 10→90 span makes the lamp arrive on a node exactly as its beat
   turns over. Anything else and the marker drifts off the studs.

   Both driven quantities are transforms — `x` and `scaleX` — so the rail runs
   on the compositor and never touches layout.
   ══════════════════════════════════════════════════════════════════════════ */
function VoyageRail({
  voyage,
  hintOpacity,
  active,
}: {
  voyage: MotionValue<number>
  hintOpacity: MotionValue<number>
  active: number
}) {
  const travel = useTransform(voyage, [0, 1], ['10%', '90%'])
  const fill = useTransform(voyage, [0, 1], [0.1, 0.9])

  return (
    <div className="pw-glass-panel rounded-panel px-4 py-3.5 sm:px-5" aria-hidden>
      <div className="flex items-center gap-5">
        <div className="shrink-0">
          <p className="pw-stencil">Leg</p>
          <p className="pw-readout mt-1 text-[15px] font-medium leading-none">
            {pad2(active + 1)}
            <span className="text-text-faint"> / {pad2(BEATS.length)}</span>
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-3.5">
            {/* The channel. Clipped, so the fill's ends take its radius. */}
            <div className="pw-rail absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full">
              <motion.span
                style={{ scaleX: fill }}
                className="absolute inset-0 origin-left bg-signal/45"
              />
            </div>

            {/* Nodes sit OUTSIDE the clip: a lamp's halo is 3px of spread and
                the channel would shear it off. */}
            <div className="absolute inset-0 grid grid-cols-5">
              {BEATS.map((beat, i) => (
                <span key={beat.key} className="flex items-center justify-center">
                  <span
                    className={cn(
                      'h-2 w-2',
                      i <= active ? 'pw-stud text-signal' : 'pw-socket',
                    )}
                  />
                </span>
              ))}
            </div>

            {/* Full-width layer translated by a percentage of its own box, so
                one `x` covers the whole track without measuring anything. */}
            <motion.div style={{ x: travel }} className="pointer-events-none absolute inset-y-0 left-0 w-full">
              <span className="pw-lamp absolute left-0 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 text-signal" />
            </motion.div>
          </div>

          <div className="mt-2.5 grid grid-cols-5">
            {BEATS.map((beat, i) => (
              <span
                key={beat.key}
                className={cn(
                  'pw-stencil truncate text-center transition-colors duration-300',
                  i === active && 'text-text',
                )}
              >
                {beat.label}
              </span>
            ))}
          </div>
        </div>

        <motion.p
          style={{ opacity: hintOpacity }}
          className="pw-stencil hidden shrink-0 items-center gap-1.5 lg:flex"
        >
          Scroll
          <ChevronDown className="h-3 w-3" />
        </motion.p>
      </div>
    </div>
  )
}

function BeatBody({ beat }: { beat: Beat }) {
  const Icon = beat.icon
  return (
    <>
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-signal">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {beat.label}
      </p>
      <h3 className="mt-3 text-[clamp(1.4rem,2.6vw,1.9rem)] font-semibold leading-[1.15] tracking-[-0.025em] text-text">
        {beat.title}
      </h3>
      <p className="mt-3 max-w-[520px] text-[15px] leading-[1.65] text-text-muted">{beat.body}</p>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   THE STILL PLATE — reduced motion, or a phone
   ══════════════════════════════════════════════════════════════════════════
   Deliberately NOT the same story told as a grid of five cards. It is one
   object: the poster full-bleed into the head of a plate, then the five legs
   as regions of that same plate divided by machined grooves. A single plate
   with internal joints reads as a made thing; five boxes on a wash is exactly
   the "generic" this page was pulled up for.
   ══════════════════════════════════════════════════════════════════════════ */
function StaticJourney() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
      <motion.header
        variants={stagger(0.035)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        className="max-w-[46ch]"
      >
        <motion.p variants={fadeUp} className="flex items-center gap-2">
          <span aria-hidden className="h-[3px] w-3 shrink-0 rounded-full bg-signal/60" />
          <span className="pw-stencil">The journey</span>
        </motion.p>
        <motion.h2
          variants={fadeUp}
          id="journey-heading"
          className="mt-3 text-[clamp(1.6rem,3.4vw,2.25rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-text"
        >
          {STORY.heading}
        </motion.h2>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="pw-panel mt-8 overflow-hidden"
      >
        <div className="relative aspect-[16/10] sm:aspect-[21/9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={POSTER}
            alt="A container vessel coming alongside at a container terminal."
            className="h-full w-full object-cover"
          />
          {/* The footage has to land in the plate, not sit on top of it. */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-surface" />
        </div>

        <motion.ol
          variants={stagger(0.035)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          className="relative"
        >
          {BEATS.map((beat, i) => {
            const Icon = beat.icon
            return (
              <motion.li
                key={beat.key}
                variants={fadeUp}
                className={cn('relative flex gap-3.5 px-5 py-5 sm:gap-4 sm:px-7 sm:py-6', i > 0 && 'pw-groove')}
              >
                {/* The channel running behind the studs: one continuous line
                    through the plate, so the five legs read as one voyage. */}
                {i < BEATS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-[calc(1.25rem+13px)] top-9 w-px bg-hairline sm:left-[calc(1.75rem+13px)]"
                  />
                )}
                <span className="pw-rail relative z-10 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full">
                  <span className="pw-readout text-[10px] font-medium text-text-muted">{pad2(i + 1)}</span>
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-signal">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {beat.label}
                  </p>
                  <h3 className="pw-plate-title mt-2 text-[clamp(1.05rem,2.4vw,1.3rem)] leading-[1.2]">
                    {beat.title}
                  </h3>
                  <p className="mt-2 max-w-[62ch] text-[14px] leading-[1.65] text-text-muted">{beat.body}</p>
                </div>
              </motion.li>
            )
          })}
        </motion.ol>
      </motion.div>
    </div>
  )
}
