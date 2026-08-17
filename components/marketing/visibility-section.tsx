'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, FileText, Clock3, Ship } from 'lucide-react'
import { useMemo } from 'react'

import { BOOKINGS, containersForJob } from '@/data/bookings'
import { DEMO } from '@/data/copy'
import { FREIGHT_DOCUMENTS } from '@/data/documents'
import { EXCEPTIONS } from '@/data/exceptions'
import { HERO_JOB_ID, JOBS } from '@/data/jobs'
import { ROUTES } from '@/lib/routes'
import { HERO_MILESTONES } from '@/data/milestones'
import { requirePort } from '@/data/ports'
import { containerSummary, formatDate, formatDateShort, formatStampShort } from '@/lib/format'
import { fadeUp, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { InstrumentRail, type InstrumentReading } from '@/components/ui/primitives'

/**
 * WHAT THE CUSTOMER SEES
 * ══════════════════════════════════════════════════════════════════════════
 * Not a feature list. The actual customer view of the seeded shipment,
 * assembled from the same records the application renders — the timeline is
 * filtered on `customerVisible`, the documents carry their real versions and
 * statuses, and the update is the ETA revision that is genuinely open on
 * this job at the demo clock.
 *
 * Anything a customer should not see is filtered out here by the same flag
 * the product uses, rather than by writing a shorter list for the brochure.
 *
 * ── The material argument ─────────────────────────────────────────────────
 * This is one object, not a section of cards: a single plate carrying a
 * stencilled header, a recessed instrument rail of live readings, and two
 * machined regions below it. The readings go in a RECESS on purpose — a
 * figure in a channel reads as measured by the machine, the same figure on a
 * raised chip reads as typed in by hand — and the timeline runs on studs,
 * lamps and sockets so a finished leg, the live leg and a leg not yet run are
 * three physically different things rather than three shades of dot.
 */

const DOC_LABEL: Record<string, string> = {
  QUOTATION: 'Quotation',
  BOOKING_CONFIRMATION: 'Booking confirmation',
  BILL_OF_LADING: 'Bill of lading',
  ARRIVAL_NOTICE: 'Arrival notice',
  DELIVERY_ORDER: 'Delivery order',
  PROOF_OF_DELIVERY: 'Proof of delivery',
  CUSTOMER_INVOICE: 'Customer invoice',
  PACKING_LIST: 'Packing list',
}

export function VisibilitySection() {
  const job = JOBS.find((j) => j.id === HERO_JOB_ID)!
  const booking = BOOKINGS.find((b) => b.jobId === HERO_JOB_ID)!
  const origin = requirePort(job.originId)
  const destination = requirePort(job.destinationId)

  const timeline = useMemo(() => HERO_MILESTONES.filter((m) => m.customerVisible), [])
  const lastCompleted = useMemo(
    () => timeline.reduce((acc, m, i) => (m.status === 'COMPLETED' ? i : acc), 0),
    [timeline],
  )
  const completed = useMemo(() => timeline.filter((m) => m.status === 'COMPLETED').length, [timeline])

  const documents = useMemo(
    () =>
      FREIGHT_DOCUMENTS.filter(
        (d) => d.jobId === HERO_JOB_ID && d.customerVisible && DOC_LABEL[d.type] && d.status !== 'ARCHIVED',
      ).slice(0, 5),
    [],
  )

  const update = useMemo(() => EXCEPTIONS.find((e) => e.jobId === HERO_JOB_ID && e.customerVisible), [])

  const containers = useMemo(() => containersForJob(HERO_JOB_ID), [])
  const equipment = containers[0]
    ? containerSummary(containers.length, containers[0].isoType)
    : containerSummary(2, '40HC')

  /* Every reading is derived from the records rendered below it, not authored
     for the brochure — which is the only reason a rail like this is worth
     showing on a marketing page at all. */
  const readings: InstrumentReading[] = [
    {
      label: 'Arrival (ETA)',
      value: formatDateShort(booking.eta),
      tone: 'amber',
      hint: 'Revised — 18h later',
    },
    { label: 'Free time', value: booking.freeTimeDays, unit: 'days', hint: 'From discharge' },
    { label: 'Equipment', value: equipment, hint: booking.destinationTerminal },
    {
      label: 'Milestones',
      value: `${completed}/${timeline.length}`,
      tone: 'signal',
      hint: 'Logged and attributed',
    },
    { label: 'Documents', value: documents.length, unit: 'live', hint: 'Available to you now' },
  ]

  return (
    <section id="visibility" className="relative border-t border-hairline bg-ink py-20 lg:py-28">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={stagger(0.035)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="max-w-[640px]"
        >
          <motion.p variants={fadeUp} className="flex items-center gap-2">
            <span aria-hidden className="h-[3px] w-3 shrink-0 rounded-full bg-signal/60" />
            <span className="pw-stencil">What you see</span>
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mt-3 text-[clamp(1.75rem,3.6vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-text"
          >
            One shipment. One customer view.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-[16px] leading-[1.65] text-text-muted">
            Every milestone, document and update on a job lands in one place, attributed to whoever reported it.
            Internal costing, partner rates and operational notes stay on the operations side of the line.
          </motion.p>
        </motion.div>

        {/* ══ The customer view ══════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="pw-panel mt-10 overflow-hidden"
        >
          {/* ── Shipment header ───────────────────────────────────────── */}
          <div className="px-5 pb-5 pt-5 sm:px-7">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="pw-id text-[15px] font-semibold text-text">{job.id}</span>
                <span className="inline-flex items-center gap-1.5 rounded-chip border border-route/25 bg-route/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-route shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.5)]">
                  <span className="pw-stud h-1.5 w-1.5 text-route" aria-hidden />
                  In transit
                </span>
                <span className="pw-id text-micro text-text-faint">{job.reference}</span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[15px] font-medium text-text">
                <span>
                  {origin.name} <span className="pw-id text-micro font-normal text-text-faint">{origin.code}</span>
                </span>
                <span className="relative flex h-px w-10 items-center bg-hairline-strong sm:w-16" aria-hidden>
                  <span className="absolute -right-1 h-1.5 w-1.5 rotate-45 border-r border-t border-hairline-strong" />
                </span>
                <span>
                  {destination.name}{' '}
                  <span className="pw-id text-micro font-normal text-text-faint">{destination.code}</span>
                </span>
              </div>

              <p className="mt-2 text-data text-text-muted">
                Ocean FCL · {equipment} · {booking.vessel} <span className="pw-id">{booking.voyage}</span> ·{' '}
                {booking.carrierName} · Port to door, Pune
              </p>
            </div>

            {/* ── The readings ───────────────────────────────────────────
                Milled into the plate rather than laid on it. Wide rails scroll
                inside their own box; the page body never does. */}
            <InstrumentRail readings={readings} className="mt-5" ariaLabel="Shipment readings" />
            <p className="pw-stencil mt-2.5">{DEMO.simulatedValues}</p>
          </div>

          <div className="grid border-t border-hairline lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            {/* ── Timeline ───────────────────────────────────────────── */}
            <div className="border-b border-hairline p-5 sm:p-7 lg:border-b-0 lg:border-r">
              <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-faint">
                <Ship className="h-3.5 w-3.5" aria-hidden />
                Shipment timeline
              </h3>

              <motion.ol
                variants={stagger(0.035)}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-40px' }}
                className="mt-5"
              >
                {timeline.map((event, i) => {
                  const done = event.status === 'COMPLETED'
                  const current = i === lastCompleted
                  const last = i === timeline.length - 1
                  return (
                    <motion.li variants={fadeUp} key={event.id} className="relative flex gap-3.5 pb-5 last:pb-0">
                      {!last && (
                        <span
                          className={cn(
                            'absolute left-[7px] top-4 h-full w-px',
                            done ? 'bg-signal/30' : 'bg-hairline',
                          )}
                          aria-hidden
                        />
                      )}
                      {/* Three physically different objects, not three greys: a
                          lamp is live, a stud is a leg that has run, a socket is
                          a hole where a leg has not happened yet. */}
                      <span className="relative mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                        {current ? (
                          <span className="pw-lamp h-2.5 w-2.5 text-signal" aria-hidden />
                        ) : done ? (
                          <span className="pw-stud h-2.5 w-2.5 text-signal/65" aria-hidden />
                        ) : (
                          <span className="pw-socket h-2.5 w-2.5" aria-hidden />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <p className={cn('text-data', done ? 'font-medium text-text' : 'text-text-muted')}>
                            {event.title}
                          </p>
                          <p className="pw-readout shrink-0 text-[10px] text-text-faint">
                            {formatStampShort(event.at)}
                            {!done && ' · expected'}
                          </p>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-text-faint">{event.location}</p>
                      </div>
                    </motion.li>
                  )
                })}
              </motion.ol>

              <p className="pw-groove mt-5 pt-3 text-[10px] uppercase tracking-[0.1em] text-text-faint">
                {DEMO.timelineLabel}
              </p>
            </div>

            {/* ── Updates + documents ────────────────────────────────── */}
            <div className="flex flex-col gap-6 p-5 sm:p-7">
              {update && (
                <div>
                  <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-faint">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden />
                    Update for you
                  </h3>
                  <div className="pw-card mt-3 border-amber/30 bg-amber/8 p-4">
                    <p className="flex items-center gap-2 text-data font-semibold text-text">
                      <span className="pw-lamp h-2 w-2 shrink-0 text-amber" aria-hidden />
                      Arrival estimate revised
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
                      Your vessel arrival moved 18 hours later, to {formatDate(booking.eta)}. The delivery appointment
                      at Pune is being re-coordinated with the transporter.
                    </p>
                    <p className="mt-2.5 text-[11px] text-text-faint">
                      Reported by carrier schedule update · {formatStampShort(update.openedAt)}
                    </p>
                  </div>
                </div>
              )}

              <div className="min-w-0">
                <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-faint">
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  Documents available to you
                </h3>

                <motion.ul
                  variants={stagger(0.035)}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-40px' }}
                  className="pw-card mt-3 divide-y divide-hairline overflow-hidden"
                >
                  {documents.map((doc) => (
                    <motion.li
                      variants={fadeUp}
                      key={doc.id}
                      className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-raised-2/60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-data font-medium text-text">{DOC_LABEL[doc.type]}</span>
                        <span className="pw-id block truncate text-[10px] text-text-faint">
                          {doc.id} · v{doc.version}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'shrink-0 rounded-chip border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em]',
                          'shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.5)]',
                          doc.status === 'ACCEPTED'
                            ? 'border-signal/30 bg-signal/12 text-signal'
                            : 'border-hairline-strong bg-raised-2 text-text-muted',
                        )}
                      >
                        {doc.status.toLowerCase()}
                      </span>
                    </motion.li>
                  ))}
                </motion.ul>

                <p className="mt-3 text-[11px] leading-relaxed text-text-faint">
                  Arrival notice, delivery order and proof of delivery appear here as the shipment reaches them.
                </p>
              </div>

              <Link
                href={ROUTES.booking(HERO_JOB_ID)}
                className="pw-tactile group mt-auto inline-flex h-11 items-center gap-2 self-start rounded-chip px-4 text-data font-semibold text-text"
              >
                Open this shipment in the demo
                <ArrowRight
                  className="h-3.5 w-3.5 text-signal transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
