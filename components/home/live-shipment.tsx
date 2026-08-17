'use client'

import Link from 'next/link'
import { AlertTriangle, Ship } from 'lucide-react'
import { useMemo } from 'react'

import { HERO_JOB_ID } from '@/data/jobs'
import { DEMO_NOW_MS } from '@/lib/demo-clock'
import { count, formatDateShort, formatStampShort, teu, teuFor } from '@/lib/format'
import {
  CUSTOMER_PROGRESS,
  MODE_LABEL,
  RELEASE_TYPE_LABEL,
  customerProgressIndex,
} from '@/lib/lifecycle'
import { ROUTES } from '@/lib/routes'
import { useHydrated } from '@/hooks/use-hydrated'
import { useCutoffRail, useJobFile } from '@/store/hooks'

import {
  Card,
  EmptyState,
  InstrumentRail,
  Panel,
  Skeleton,
  StatusBadge,
  type InstrumentReading,
} from '@/components/ui/primitives'
import {
  CountdownPill,
  JobStatusBadge,
  ModeBadge,
  ProgressRail,
  SeverityBadge,
} from '@/components/ui/freight'

import { CUTOFF_HORIZON_HOURS } from './customer-metrics'
import { ModuleLink } from './pieces'

/**
 * THE SHIPMENT THAT IS ACTUALLY MOVING
 * ══════════════════════════════════════════════════════════════════════════
 * One shipment, given the space a dashboard usually spends on six.
 *
 * A customer with twenty live jobs still only has one that matters at any
 * given moment — the one whose next deadline is closest and whose exceptions
 * are open. Showing twenty rows of equal weight makes the reader do that
 * ranking themselves, on the first screen of the product, before they know
 * where anything is.
 *
 * Four things are on it and nothing else: where the cargo is on its journey,
 * when it lands, the next carrier deadline as a live countdown, and whatever
 * is open against it with the action that would clear it. Buy rates, partner
 * margin and internal notes are not the customer's and never appear.
 *
 * The booking figures sit in an `InstrumentRail` rather than a grid of
 * label/value pairs. They are readings taken off a shipment in motion — a
 * departure stamp, an arrival estimate, the free time running against it — and
 * a reading in a recessed channel reads as measured by the machine, where the
 * same reading floating on the plate reads as typed in by hand. It is the same
 * component the account rail at the top of the page uses, so the screen has
 * one grammar for "a live figure" rather than two.
 */

/** The panel is tall; the placeholder has to be too or the page jumps. */
const PANEL_SKELETON = 'h-[452px]'

export function LiveShipment() {
  const hydrated = useHydrated()
  const file = useJobFile(HERO_JOB_ID)

  // The same rail the status strip counts from, so the headline countdown
  // here and the plate above it can never name different deadlines.
  const rail = useCutoffRail(DEMO_NOW_MS, CUTOFF_HORIZON_HOURS)

  const nextCutoff = useMemo(
    () => rail.find((entry) => entry.jobId === HERO_JOB_ID && !entry.countdown.overdue),
    [rail],
  )

  const customerExceptions = useMemo(
    () => file?.openExceptions.filter((exc) => exc.customerVisible) ?? [],
    [file],
  )

  /* TEU rather than a box count on its own: two forties and two twenties are
     four containers and six TEU, and only one of those two numbers tells the
     reader how much cargo is actually moving. */
  const boxes = file?.containers ?? []
  const teuOnJob = useMemo(() => boxes.reduce((sum, c) => sum + teuFor(c.isoType), 0), [boxes])

  if (!hydrated) return <Skeleton className={PANEL_SKELETON} />

  if (!file) {
    return (
      <Panel className="p-8">
        <EmptyState
          icon={<Ship className="h-6 w-6" />}
          title="No shipment in flight"
          description="Nothing on this account is currently moving. Search a lane and book it, and it appears here."
          action={
            <Link href={ROUTES.search} className="text-data font-medium text-signal hover:underline">
              Search freight rates
            </Link>
          }
        />
      </Panel>
    )
  }

  const { job, booking, origin, destination } = file
  const etaRevised = Boolean(booking && booking.originalEta && booking.eta !== booking.originalEta)

  /* Short dates, not full ones. A rail reading truncates rather than wraps,
     and "18 Aug 2026" at 18px does not fit a 136px channel on a 360px phone —
     the year is never in doubt on a shipment that is currently at sea. */
  const readings: InstrumentReading[] = booking
    ? [
        {
          label: 'Departed',
          value: formatDateShort(booking.etd),
          hint: `${origin.code} · ${origin.name}`,
        },
        {
          label: 'Estimated arrival',
          value: formatDateShort(booking.eta),
          // Amber only when the carrier has actually moved it. A revised ETA
          // is the single most consequential change on a live shipment and the
          // one thing on this rail a customer must not scroll past.
          tone: etaRevised ? 'amber' : 'neutral',
          trailing: etaRevised ? (
            <StatusBadge tone="amber" dot={false}>
              Revised
            </StatusBadge>
          ) : undefined,
          hint: `${destination.code} · ${destination.name}`,
        },
        {
          label: 'Free time',
          value: count(booking.freeTimeDays),
          unit: 'days',
          hint: 'From arrival, before detention runs',
        },
        {
          label: 'Containers',
          value: count(boxes.length),
          unit: boxes.length === 1 ? 'box' : 'boxes',
          hint: teuOnJob > 0 ? `${teu(teuOnJob)} on this shipment` : 'Not yet released',
        },
      ]
    : []

  return (
    <Panel className="overflow-hidden">
      {/* ── Who and where ────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-hairline px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={ROUTES.booking(job.id)} className="pw-id text-data font-semibold text-text hover:underline">
              {job.id}
            </Link>
            <JobStatusBadge status={job.status} />
            <ModeBadge mode={job.mode} label={MODE_LABEL[job.mode]} />
          </div>

          <p className="mt-1.5 text-[17px] font-semibold tracking-[-0.01em] text-text">
            {origin.name} → {destination.name}
          </p>
          <p className="mt-0.5 text-[11px] text-text-faint">
            {job.reference}
            {booking?.vessel ? ` · ${booking.vessel} ${booking.voyage ?? ''}` : ''}
            {booking ? ` · ${booking.carrierName}` : ''}
            {booking ? ` · ${RELEASE_TYPE_LABEL[booking.releaseType] ?? booking.releaseType}` : ''}
          </p>
        </div>

        {/* The live one. `live` is opt-in on CountdownPill because it drives a
            1Hz re-render — this is the one deadline on the dashboard that
            genuinely earns a ticking second hand. */}
        {nextCutoff && (
          <div className="shrink-0 text-right">
            <p className="pw-stencil">Next cutoff</p>
            <div className="mt-1.5 flex flex-wrap items-center justify-end gap-2">
              <span className="text-data font-medium text-text">{nextCutoff.label}</span>
              <CountdownPill deadline={nextCutoff.at} live />
            </div>
            <p className="pw-readout mt-1 text-[11px] text-text-faint">{formatStampShort(nextCutoff.at)}</p>
          </div>
        )}
      </header>

      {/* ── The journey ──────────────────────────────────────────────── */}
      <div className="px-5 py-5">
        {/* Seven labelled steps do not fit a 360px phone, and shrinking the
            labels to fit makes them unreadable. The rail keeps its size and
            scrolls inside its own box, so the page body never does. */}
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <ProgressRail
            steps={CUSTOMER_PROGRESS}
            currentIndex={customerProgressIndex(job.status)}
            className="min-w-[480px]"
          />
        </div>

        {readings.length > 0 && (
          <InstrumentRail
            readings={readings}
            className="mt-5"
            // Not a continuous scale — four unrelated readings off one
            // shipment. Draft marks would be claiming a graduation that is
            // not there.
            ticks={false}
            ariaLabel="Booking readings for this shipment"
          />
        )}
      </div>

      {/* ── What is open on it ───────────────────────────────────────── */}
      {customerExceptions.length > 0 && (
        <div className="border-t border-hairline bg-raised-2/30 px-5 py-4">
          <h4 className="pw-eyebrow">
            {customerExceptions.length} open item{customerExceptions.length === 1 ? '' : 's'} on this shipment
          </h4>

          <ul className="mt-3 flex flex-col gap-2.5">
            {customerExceptions.map((exc) => (
              <li key={exc.id}>
                <Card className="flex flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber" aria-hidden />
                      <span className="text-data font-semibold text-text">{exc.title}</span>
                      <SeverityBadge severity={exc.severity} />
                    </span>
                    {exc.deadline && <CountdownPill deadline={exc.deadline} />}
                  </div>

                  <p className="text-[12px] leading-relaxed text-text-muted">{exc.businessImpact}</p>

                  {/* The recommended action is the reason the record exists.
                      An exception a customer can read but not act on is a
                      notification, not a workflow. */}
                  <p className="text-[12px] leading-relaxed text-text">
                    <span className="pw-stencil">What happens next</span> {exc.recommendedAction}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-hairline px-5 py-3">
        <p className="text-[11px] leading-relaxed text-text-muted">
          Milestones, vessel positions and arrival estimates are authored for this demo on a fixed clock.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <ModuleLink href={ROUTES.bookingTab(job.id, 'timeline')}>Full timeline</ModuleLink>
          <ModuleLink href={ROUTES.booking(job.id)}>Open the shipment</ModuleLink>
        </div>
      </footer>
    </Panel>
  )
}
