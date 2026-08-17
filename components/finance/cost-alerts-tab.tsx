'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Anchor, Clock, Container, TimerReset } from 'lucide-react'
import { useMemo } from 'react'

import {
  EXPOSURE_BAND_LABEL,
  EXPOSURE_BASIS,
  EXPOSURE_FX_NOTE,
  PROJECTION_DAYS,
  buildAccountExposures,
  exposureTotals,
  type ExposureBand,
  type FreeTimeExposure,
  type SlabProjection,
} from '@/data/customer-finance'
import { DEMO } from '@/data/copy'
import { requirePort } from '@/data/ports'
import { formatDate, money } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { useBookings, useContainers, useJobs } from '@/store/hooks'

import { Button, Card, DemoNotice, EmptyState, Panel, StatusBadge, type Tone } from '@/components/ui/primitives'
import { CountdownPill, LanePill } from '@/components/ui/freight'

import { Basis, CardHeading, FigureRail, NoteList, RecordPanel, TabIntro } from './pieces'

/**
 * Detention and storage — what a delayed shipment costs before it costs it.
 *
 * This is the computed section of the module. Nothing here is written down:
 * free-time expiry comes from the booking, the slab structure from the
 * destination port profile, and the multiplier from the container records on
 * the job. Move a booking and every figure below moves with it.
 *
 * The modelling point, and the reason the two are never added together: they
 * are two clocks with different start conditions and different payees.
 * Storage accrues while the box is still inside the terminal; detention
 * accrues once it has left and until the empty is returned. A shipment held
 * up at destination runs both at the same time, which is exactly why a
 * customer who has budgeted for "demurrage" as one figure under-provisions.
 *
 * What is shown is a projection of freight charges against published bands,
 * not a tariff and not an invoice. The basis is stated under every figure.
 *
 * DESIGN: each clock now carries a graduated channel rather than two numbers
 * and a sentence. The free days and the chargeable days are drawn on ONE
 * scale, so the thing the reader is here to understand — how little of the
 * clock is free — is visible instead of arithmetic they have to do. See
 * `FreeTimeRail`.
 */

const BAND_TONE: Record<ExposureBand, Tone> = {
  RUNNING: 'critical',
  CRITICAL: 'critical',
  WATCH: 'amber',
  CLEAR: 'neutral',
}

export function CostAlertsTab() {
  const jobs = useJobs()
  const bookings = useBookings()
  const containers = useContainers()

  const { exposures, withoutEquipment } = useMemo(
    () => buildAccountExposures(jobs, bookings, containers),
    [jobs, bookings, containers],
  )

  const totals = useMemo(() => exposureTotals(exposures), [exposures])
  const onWatch = exposures.filter((e) => e.band !== 'CLEAR')

  if (exposures.length === 0) {
    return (
      <Panel className="p-8">
        <EmptyState
          icon={<TimerReset className="h-6 w-6" />}
          title="Nothing to project yet"
          description="Free-time exposure is projected once a live shipment has equipment declared against its booking and a destination with published free-time bands."
          action={
            <Button asChild variant="secondary" size="md">
              <Link href={ROUTES.bookings}>Go to your shipments</Link>
            </Button>
          }
        />
      </Panel>
    )
  }

  // Sorted by urgency in the model, so the first row is always the shipment
  // with the least free time left.
  const soonest = exposures[0]!
  const soonestDays = Math.max(0, Math.floor(soonest.daysRemaining))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <TabIntro className="min-w-0 flex-1">
          Two clocks run on every container at destination, and they are not the same clock. Storage accrues while the
          box is still inside the terminal; detention accrues once it has left and until the empty is returned. They
          are payable to different parties and a delayed shipment can run both at once — so they are projected
          separately here, and never added together.
        </TabIntro>
        <DemoNotice variant="badge">{DEMO.simulatedValues}</DemoNotice>
      </div>

      {/* ── The position across the book ─────────────────────────────── */}
      <RecordPanel
        icon={<Clock className="h-4 w-4 shrink-0 text-signal" aria-hidden />}
        title="If every live shipment overran by a week"
        emphasis={onWatch.length > 0 ? 'amber' : undefined}
        meta={`${exposures.length} shipment${exposures.length === 1 ? '' : 's'} projected · ${onWatch.length} inside the watch window`}
        footnote={
          <>
            {EXPOSURE_BASIS} {EXPOSURE_FX_NOTE}
            {withoutEquipment > 0 && (
              <>
                {' '}
                {withoutEquipment} further live shipment{withoutEquipment === 1 ? ' has' : 's have'} no equipment
                declared against the booking yet, so there is nothing to project against — they are excluded rather
                than estimated.
              </>
            )}
          </>
        }
      >
        <FigureRail
          columns={3}
          figures={[
            {
              label: `Detention · ${PROJECTION_DAYS} days`,
              value: money(totals.detentionInr),
              strong: true,
              tone: 'amber',
              sub: 'Payable to the shipping lines',
            },
            {
              label: `Storage · ${PROJECTION_DAYS} days`,
              value: money(totals.storageInr),
              strong: true,
              tone: 'amber',
              sub: 'Payable to the terminals',
            },
            {
              label: 'Free time left, soonest',
              value: soonestDays === 0 ? 'Expired' : `${soonestDays} day${soonestDays === 1 ? '' : 's'}`,
              tone: soonestDays < 2 ? 'critical' : undefined,
              sub: `on ${soonest.jobId}`,
            },
          ]}
        />
      </RecordPanel>

      {/* ── Shipment by shipment, most urgent first ──────────────────── */}
      <div className="flex flex-col gap-4">
        {exposures.map((exposure) => (
          <ExposureCard key={exposure.jobId} exposure={exposure} />
        ))}
      </div>

      <Card className="p-5">
        <CardHeading icon={<Anchor className="h-3.5 w-3.5" aria-hidden />}>How to read these figures</CardHeading>
        <NoteList
          className="mt-3"
          items={[
            'These are projections of freight charges against the bands published for the destination port. Your own booking sets the free time and the carrier sets the rate — where the two differ, the booking governs.',
            'Free time runs on calendar days. A shipment landing on a Friday before a long weekend loses three of its free days to days nobody works.',
            'Detention is quoted per 20-foot equivalent, so a 40ft box counts twice. Storage is quoted per container whatever its size. That is why the two columns do not scale together.',
            'Where the incoterm places destination charges with the buyer, the exposure is theirs rather than yours — check the term on the shipment before acting on a figure here.',
          ]}
        />
      </Card>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   ONE SHIPMENT, TWO CLOCKS
   ══════════════════════════════════════════════════════════════════════════ */

function ExposureCard({ exposure }: { exposure: FreeTimeExposure }) {
  const origin = requirePort(exposure.originPortId)
  const destination = requirePort(exposure.destinationPortId)
  const running = exposure.band === 'RUNNING'

  return (
    // A shipment already accruing is the one plate on the tab that has to find
    // the eye without being looked for, so it comes up a step off the ground
    // rather than merely changing colour.
    <Panel className={cn('overflow-hidden', running && 'pw-elev-2 border-critical/35')}>
      <header className="pw-groove-b flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-hairline px-5 py-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={ROUTES.booking(exposure.jobId)}
              className="pw-id rounded-chip text-panel font-semibold text-route hover:underline"
            >
              {exposure.jobId}
            </Link>
            <StatusBadge tone={BAND_TONE[exposure.band]}>{EXPOSURE_BAND_LABEL[exposure.band]}</StatusBadge>
            <CountdownPill deadline={exposure.freeTimeExpiry} />
          </div>

          <div className="mt-1.5">
            <LanePill origin={origin.name} destination={destination.name} size="sm" />
          </div>

          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-micro text-text-faint">
            <span className="inline-flex items-center gap-1.5">
              <Container className="h-3 w-3" aria-hidden />
              {exposure.equipmentLabel}
            </span>
            <span>{exposure.carrierName}</span>
            <span>{exposure.destinationTerminal}</span>
            <Link href={ROUTES.port(destination.code)} className="rounded-chip text-route hover:underline">
              {destination.name} free-time bands
            </Link>
          </p>
        </div>

        {/* The expiry is a measurement, so it sits in a channel with its name
            stencilled over it rather than as three lines of right-aligned
            prose. */}
        <div className="pw-rail shrink-0 rounded-card px-3.5 py-2.5 text-right">
          <p className="pw-stencil">Free time expires</p>
          <p className="pw-readout mt-1 text-data font-medium">{formatDate(exposure.freeTimeExpiry)}</p>
          <p className="mt-0.5 text-micro text-text-faint">{exposure.freeTimeDays} days granted on the booking</p>
        </div>
      </header>

      <div className="grid gap-px bg-hairline sm:grid-cols-2">
        <ClockBlock projection={exposure.detention} fallback="No detention band is published for this destination." />
        <ClockBlock projection={exposure.storage} fallback="No storage band is published for this destination." />
      </div>

      <Basis>
        {EXPOSURE_BASIS}
        {/* The two free-day figures on this card genuinely differ, and saying
            why is better than letting the reader assume one of them is wrong:
            the carrier grants detention free time on the booking, the terminal
            publishes its own, and the slab tables are indexed on the latter. */}
        {exposure.detention && exposure.detention.freeDays !== exposure.freeTimeDays && (
          <>
            {' '}
            The booking grants {exposure.freeTimeDays} days of carrier free time against the{' '}
            {exposure.detention.freeDays} published for {destination.name}; where your booking is the more generous of
            the two, charging starts later than the band below implies.
          </>
        )}
        {exposure.direction === 'EXPORT' && (
          <>
            {' '}
            This is an export on {exposure.incoterm} terms — where the term places destination charges with the buyer,
            the exposure is carried by them.
          </>
        )}
      </Basis>
    </Panel>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   THE GRADUATED CLOCK
   ══════════════════════════════════════════════════════════════════════════
   The free days and the projected overrun drawn on ONE scale, in a milled
   channel with draft marks running the whole length of it — filled and empty
   alike, because a real gauge graduates its whole scale and ticks only under
   the unfilled part is the giveaway that it is a progress bar in disguise.

   Why it earns its place: the sentence "6 free days, then ₹1,450 a day"
   requires the reader to picture the ratio. The rail shows it. On a shipment
   with six free days and a seven-day projection, more than half the channel is
   amber, and that is the entire point of the tab in one glance.

   The fills are laid out at their final width and animated on `scaleX` —
   animating `width` would put a layout pass in every frame of the entrance.
   ══════════════════════════════════════════════════════════════════════════ */

function FreeTimeRail({ freeDays, chargeableDays }: { freeDays: number; chargeableDays: number }) {
  const reduce = useReducedMotion()
  const total = Math.max(1, freeDays + chargeableDays)
  const freePct = (freeDays / total) * 100

  return (
    <div>
      <div
        className="pw-rail relative h-2.5 w-full overflow-hidden rounded-full"
        role="img"
        aria-label={`${freeDays} free days, then ${chargeableDays} chargeable days projected`}
      >
        {/* The chargeable stretch is laid first and runs the full width, so the
            free stretch is drawn ON it. Two boxes side by side would leave a
            seam at whatever sub-pixel the split lands on. */}
        <motion.span
          aria-hidden
          className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-amber/85 shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.3)]"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={reduce ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.span
          aria-hidden
          className="absolute inset-y-0 left-0 origin-left rounded-full bg-signal shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.3)]"
          style={{ width: `${freePct}%` }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={reduce ? { duration: 0 } : { duration: 0.45, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        />
        {/* Draft marks over the whole channel, free and chargeable alike. */}
        <span aria-hidden className="pw-ticks pointer-events-none absolute inset-0 opacity-30" />
      </div>

      <p className="mt-1.5 flex items-baseline justify-between gap-2 text-[10px]">
        <span className="inline-flex items-center gap-1.5 text-signal">
          <span aria-hidden className="pw-stud h-1 w-1 shrink-0 bg-signal" />
          <span className="pw-readout">{freeDays}</span> free
        </span>
        <span className="inline-flex items-center gap-1.5 text-amber">
          <span aria-hidden className="pw-stud h-1 w-1 shrink-0 bg-amber" />
          <span className="pw-readout">{chargeableDays}</span> chargeable, projected
        </span>
      </p>
    </div>
  )
}

function ClockBlock({ projection, fallback }: { projection: SlabProjection | null; fallback: string }) {
  if (!projection) {
    return (
      <div className="bg-surface px-5 py-4">
        <p className="text-data text-text-muted">{fallback}</p>
      </div>
    )
  }

  const slabRange = projection.slab.toDay
    ? `days ${projection.slab.fromDay}–${projection.slab.toDay}`
    : `day ${projection.slab.fromDay} onward`

  return (
    <div className="flex flex-col gap-3 bg-surface px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="pw-plate-title text-data">{projection.label}</h4>
        <StatusBadge tone="signal" dot={false}>
          {projection.freeDays} free days
        </StatusBadge>
      </div>

      <p className="text-micro leading-snug text-text-faint">{projection.meaning}</p>

      <FreeTimeRail freeDays={projection.freeDays} chargeableDays={PROJECTION_DAYS} />

      <dl className="grid grid-cols-2 gap-4">
        <div className="min-w-0">
          <dt className="pw-stencil truncate">Per day, once it starts</dt>
          <dd className="pw-readout mt-1.5 text-data">{money(projection.dailyInr)}</dd>
          <p className="mt-1 text-micro leading-snug text-text-faint">
            {projection.unitLabel} at the {slabRange} band
          </p>
        </div>
        <div className="min-w-0">
          <dt className="pw-stencil truncate">Days 1–{PROJECTION_DAYS} of an overrun</dt>
          <dd className="pw-readout mt-1.5 text-[19px] font-semibold leading-none tracking-[-0.02em] text-amber">
            {money(projection.projectedInr)}
          </dd>
          <p className="mt-1 text-micro leading-snug text-text-faint">
            {projection.escalatesWithinWindow
              ? 'Crosses into the next band inside the week'
              : 'Stays inside one band across the week'}
          </p>
        </div>
      </dl>

      <p className="border-t border-hairline pt-2 text-[10px] leading-relaxed text-text-faint shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.7)]">
        Charging starts on day {projection.firstChargeableDay} · published band {projection.rateLabel} ·{' '}
        {projection.payableTo}
      </p>
    </div>
  )
}
