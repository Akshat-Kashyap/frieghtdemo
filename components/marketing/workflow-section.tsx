'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, FileCheck2, MousePointerClick } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { pad2 } from '@/lib/format'
import { fadeUp, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * HOW THE JOB CONNECTS
 * ══════════════════════════════════════════════════════════════════════════
 * Nine stages of a freight job, told from the customer's side of the desk.
 *
 * Each stage discloses three things: what you receive, what you can do, and
 * what it looks like when the stage goes wrong. The third one is the reason
 * this section exists. Any product can draw a happy path; naming the failure
 * modes — free time running down, a cutoff missed, an ETA that moved — is
 * what a freight customer recognises as written by someone who has run a
 * shipment.
 *
 * Internal costing, partner rates and margin do not appear here, because
 * they do not appear on the customer's side of the product either.
 *
 * ── The material argument ─────────────────────────────────────────────────
 * The stage selector is the one moment this section gets, so it is built as a
 * real control rather than a row of dots: nine milled tiles seated in a
 * channel milled into the plate. Tactile is the correct language here and
 * glass would be wrong — there is nothing behind these to see through, and a
 * translucent surface on a flat band is an expensive way to draw a white box.
 * A tile you press travels a pixel and turns its shadow inward, which is the
 * whole difference between a control and a picture of one.
 */

interface Stage {
  key: string
  label: string
  summary: string
  receive: string[]
  actions: string[]
  risks: string[]
}

const STAGES: Stage[] = [
  {
    key: 'enquiry',
    label: 'Enquiry',
    summary:
      'Your lane, cargo and service scope are captured as a freight request with a reference of its own, so every later step points back to the same record.',
    receive: ['Enquiry reference', 'Request summary', 'Indicative transit band'],
    actions: ['Search freight options', 'Add cargo and service detail', 'Ask for a scope change'],
    risks: ['Incomplete cargo detail delays pricing', 'A lane nobody has quoted before takes longer to price'],
  },
  {
    key: 'quote',
    label: 'Quote',
    summary:
      'Charges are set out line by line — freight, terminal handling, documentation, inland, and the exposures that are not included — with a validity date attached.',
    receive: ['Versioned quotation', 'Charge lines with basis and quantity', 'Validity window'],
    actions: ['Accept a version', 'Request changes', 'Compare against an earlier version'],
    risks: ['Rate validity expires before you decide', 'Scope quoted narrower than assumed'],
  },
  {
    key: 'booking',
    label: 'Booking',
    summary:
      'Acceptance becomes a booking request. Once the carrier confirms, the job inherits a real schedule — vessel, voyage and the cutoffs that come with them.',
    receive: ['Booking confirmation', 'Vessel and voyage', 'Cutoff dates and free-time terms'],
    actions: ['Confirm the booking request', 'Review cutoffs', 'Nominate delivery contact'],
    risks: ['Booking rolled to the next sailing', 'Shipping instruction submitted after cutoff'],
  },
  {
    key: 'origin',
    label: 'Origin handling',
    summary:
      'Cargo is received, stuffed, sealed and weighed at origin. Containers become tracked records against the booking rather than numbers in an email.',
    receive: ['Container and seal numbers', 'Packing list', 'VGM confirmation'],
    actions: ['Check cargo received against your packing list', 'Upload supporting documents'],
    risks: ['VGM outstanding blocks loading', 'Container not gated in before cutoff'],
  },
  {
    key: 'departure',
    label: 'Departure',
    summary: 'Loading and sailing are confirmed by the carrier, and the bill of lading is issued against the booking.',
    receive: ['Bill of lading', 'Loaded and departed events', 'Estimated arrival'],
    actions: ['Download the bill of lading', 'Share tracking with your team'],
    risks: ['Short-shipped container left behind', 'Draft BL corrections become chargeable amendments'],
  },
  {
    key: 'transit',
    label: 'In transit',
    summary:
      'Carrier and agent events land on one timeline, each attributed to whoever reported it, so an arrival estimate is never just a rumour.',
    receive: ['Live milestone timeline', 'ETA revisions with a reason', 'Transhipment updates'],
    actions: ['Follow the shipment', 'See what changed and when'],
    risks: ['ETA moves and nobody tells you', 'A transhipment connection is missed'],
  },
  {
    key: 'arrival',
    label: 'Arrival',
    summary:
      'Arrival, discharge and terminal handling at destination, alongside the clearance dependency held by your licensed clearance partner.',
    receive: ['Arrival notice', 'Discharge confirmation', 'Free-time expiry date'],
    actions: ['Plan delivery', 'Track free time remaining'],
    risks: ['Free time runs down into storage and detention', 'Clearance dependency still open at arrival'],
  },
  {
    key: 'delivery',
    label: 'Delivery',
    summary: 'Delivery order, inland movement and a signed proof of delivery close the operational leg of the job.',
    receive: ['Delivery order', 'Transport confirmation', 'Signed proof of delivery'],
    actions: ['Confirm the delivery window', 'Report damage on arrival'],
    risks: ['Delivery slot missed', 'Damage discovered at unloading'],
  },
  {
    key: 'settlement',
    label: 'Settlement',
    summary:
      'Your invoice is raised against the charge lines you accepted, with any variance stated rather than absorbed silently.',
    receive: ['Customer invoice', 'Charge-line breakdown', 'Credit or debit notes'],
    actions: ['Download the invoice', 'Query a charge line'],
    risks: ['Charges appear that were never quoted', 'Invoice raised before the final costs are known'],
  },
]

export function WorkflowSection() {
  const [active, setActive] = useState(0)
  const shouldReduce = useReducedMotion()
  const stage = STAGES[active]!

  const trackRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  /* A nine-tile rail does not fit a phone, so it scrolls in its own box — and
     the selected tile has to come to the reader rather than the other way
     round. `scrollTo` on the container is used instead of
     `Element.scrollIntoView`, which would also drag the PAGE to the rail. */
  useEffect(() => {
    const track = trackRef.current
    const el = tabRefs.current[active]
    if (!track || !el) return
    const left = el.offsetLeft - track.clientWidth / 2 + el.offsetWidth / 2
    track.scrollTo({ left: Math.max(0, left), behavior: shouldReduce ? 'auto' : 'smooth' })
  }, [active, shouldReduce])

  /* A tablist is a single tab stop with arrow keys inside it. Without this the
     keyboard user tabs through nine controls to reach the panel, which is the
     behaviour `role="tablist"` promises them is not going to happen. */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const last = STAGES.length - 1
      let next: number | null = null
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = active === last ? 0 : active + 1
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = active === 0 ? last : active - 1
      else if (event.key === 'Home') next = 0
      else if (event.key === 'End') next = last
      if (next === null) return
      event.preventDefault()
      setActive(next)
      tabRefs.current[next]?.focus()
    },
    [active],
  )

  return (
    <section
      id="workflow"
      className="relative border-t border-hairline bg-ink py-20 lg:py-28"
      aria-label="How a freight job connects"
    >
      {/* The room light: key from top-centre, the same direction every plate on
          this page is lit from. */}
      <div aria-hidden className="pw-vignette pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={stagger(0.035)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          <motion.p variants={fadeUp} className="flex items-center gap-2">
            <span aria-hidden className="h-[3px] w-3 shrink-0 rounded-full bg-signal/60" />
            <span className="pw-stencil">How it connects</span>
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mt-3 max-w-[20ch] text-[clamp(1.75rem,3.6vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-text"
          >
            Nine stages. One job file.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 max-w-[62ch] text-[16px] leading-[1.65] text-text-muted">
            Select a stage to see what you receive, what you can do, and what it looks like when that stage does not
            go to plan.
          </motion.p>

          {/* ── The stage selector ────────────────────────────────────────
              A channel milled into the ground with nine tiles seated in it.
              The channel is what stops nine buttons in a row reading as a
              toolbar someone forgot to style. */}
          <motion.div variants={fadeUp} className="pw-rail mt-9 p-2">
            <div ref={trackRef} className="relative overflow-x-auto">
              <div
                role="tablist"
                aria-label="Freight job stages"
                className="flex min-w-[740px] items-stretch gap-1.5"
              >
                {STAGES.map((s, i) => {
                  const isActive = i === active
                  const isPast = i < active

                  return (
                    <button
                      key={s.key}
                      ref={(node) => {
                        tabRefs.current[i] = node
                      }}
                      type="button"
                      role="tab"
                      id={`stage-tab-${s.key}`}
                      aria-selected={isActive}
                      aria-controls={`stage-panel-${s.key}`}
                      tabIndex={isActive ? 0 : -1}
                      data-selected={isActive}
                      onClick={() => setActive(i)}
                      onKeyDown={onKeyDown}
                      className="pw-tactile flex h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-chip px-2"
                    >
                      <span
                        className={cn(
                          'pw-readout text-[10px] font-medium leading-none',
                          isActive ? 'text-signal' : isPast ? 'text-signal/70' : 'text-text-faint',
                        )}
                      >
                        {pad2(i + 1)}
                      </span>
                      <span
                        className={cn(
                          'w-full truncate text-center text-[11px] leading-none transition-colors',
                          isActive ? 'font-semibold text-text' : 'text-text-muted',
                        )}
                      >
                        {s.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>

          {/* ── The panel ─────────────────────────────────────────────── */}
          <motion.div variants={fadeUp} className="mt-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={stage.key}
                id={`stage-panel-${stage.key}`}
                role="tabpanel"
                aria-labelledby={`stage-tab-${stage.key}`}
                tabIndex={0}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={shouldReduce ? { duration: 0 } : { duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                className="pw-panel overflow-hidden"
              >
                <div className="border-b border-hairline px-5 py-5 sm:px-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="pw-plate-title text-[19px]">{stage.label}</h3>
                    <p className="pw-readout shrink-0 text-micro text-text-faint">
                      Stage {pad2(active + 1)} / {pad2(STAGES.length)}
                    </p>
                  </div>
                  <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-text-muted">{stage.summary}</p>
                </div>

                {/* Three regions of one plate, divided by a hairline. Regions,
                    not cards: a box inside a plate that casts its own shadow is
                    a physics error you can feel before you can name. */}
                <div className="grid md:grid-cols-3">
                  <StageColumn
                    icon={<FileCheck2 className="h-3.5 w-3.5" />}
                    title="What you receive"
                    items={stage.receive}
                    tone="signal"
                  />
                  <StageColumn
                    icon={<MousePointerClick className="h-3.5 w-3.5" />}
                    title="What you can do"
                    items={stage.actions}
                    tone="neutral"
                    className="border-t border-hairline md:border-l md:border-t-0"
                  />
                  <StageColumn
                    icon={<AlertTriangle className="h-3.5 w-3.5" />}
                    title="What can go wrong"
                    items={stage.risks}
                    tone="amber"
                    className="border-t border-hairline md:border-l md:border-t-0"
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

function StageColumn({
  icon,
  title,
  items,
  tone,
  className,
}: {
  icon: React.ReactNode
  title: string
  items: string[]
  tone: 'neutral' | 'signal' | 'amber'
  className?: string
}) {
  const toneClass = { neutral: 'text-text-faint', signal: 'text-signal', amber: 'text-amber' }[tone]

  return (
    <div className={cn('px-5 py-5 sm:px-6', className)}>
      <p className={cn('mb-3.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]', toneClass)}>
        {icon}
        {title}
      </p>
      <ul className="flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-text-muted">
            {/* A seated stud rather than a bullet — the dome highlight is what
                stops a 5px dot reading as a full stop. */}
            <span className={cn('pw-stud mt-[7px] h-[5px] w-[5px] shrink-0', toneClass)} aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
