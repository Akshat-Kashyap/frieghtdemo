'use client'

import { AlertTriangle, Anchor, Ship, Timer } from 'lucide-react'

import { count, formatDateShort, moneyUsd, pad2, percentSigned, truncate } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { useHydrated } from '@/hooks/use-hydrated'

import {
  AnimatedNumber,
  InstrumentRail,
  Skeleton,
  StatPlate,
  type InstrumentReading,
  type Tone,
} from '@/components/ui/primitives'
import { CountdownPill } from '@/components/ui/freight'

import { CUTOFF_HORIZON_HOURS, useCustomerMetrics, useWatchedLanes } from './customer-metrics'
import { PlateLink, StaggerCell, StaggerGrid } from './pieces'

/**
 * THE SHAPE OF THE DAY
 * ══════════════════════════════════════════════════════════════════════════
 * Two devices, and the split between them is the argument.
 *
 * The RAIL is a recessed channel of continuous account readings — how much
 * steel is on the water, what a box is averaging on the lanes this account
 * buys, how long until the next carrier deadline. These are quantities that
 * are always true of the account and always changing; they belong milled into
 * a strip, the way an instrument prints the readings you glance at rather than
 * act on. Nothing in the rail is a link, because none of it is a question.
 *
 * The PLATES underneath are the four things that ARE questions: how many
 * shipments are running, what lands this week, what deadline is closest, what
 * is waiting on a decision from you. Each one is a count with a way through to
 * the records behind it, and each one lifts under the cursor because it is a
 * thing you can pick up rather than a number painted on the page.
 *
 * Putting all nine figures in one grid of nine identical cards is what the
 * previous version did, and it is the thing that reads as generated: nine
 * boxes of equal weight tell the reader that nothing on the screen matters
 * more than anything else, which cannot be true of any real operation.
 *
 * Every figure is derived — see `customer-metrics.ts`. Nothing on this file
 * types a number into a tile.
 */

/* Both blocks are height-pinned and their placeholders match exactly. The
   strip sits above everything else on the first screen of the product, so a
   placeholder of the wrong size makes the whole page jump the instant
   persisted state lands — the most avoidable failure this demo has. */
const RAIL_H = 'h-[84px]'
const PLATE_H = 'min-h-[180px]'
const PLATE_SKELETON_H = 'h-[180px]'

/* ══════════════════════════════════════════════════════════════════════════
   THE RAIL
   ══════════════════════════════════════════════════════════════════════════ */

/** Deliberately not coloured until a deadline is genuinely near. A strip that
    is always amber has stopped saying anything. */
const CUTOFF_TONE: Record<string, Tone> = {
  overdue: 'critical',
  critical: 'critical',
  urgent: 'amber',
  soon: 'route',
  clear: 'neutral',
}

export function AccountRail() {
  const hydrated = useHydrated()
  const metrics = useCustomerMetrics()
  const lanes = useWatchedLanes()

  if (!hydrated) return <Skeleton className={RAIL_H} />

  const nextCutoff = metrics.cutoffs[0]

  /* Readings are ordered by how far the cargo is from the customer: what they
     have running, what is physically on the water, what lands this week, the
     next deadline, then the market. Reading left to right is reading outwards
     from the desk. */
  const readings: InstrumentReading[] = [
    {
      label: 'Shipments live',
      value: <AnimatedNumber value={metrics.inProgress} format={(n) => pad2(Math.round(n))} />,
      unit: 'jobs',
      hint: 'Booked, moving or being arranged',
    },
    {
      label: 'Cargo in flight',
      value: <AnimatedNumber value={metrics.teuInFlight} format={(n) => count(Math.round(n))} />,
      unit: 'TEU',
      hint: `${count(metrics.boxesInFlight)} container${metrics.boxesInFlight === 1 ? '' : 's'} released`,
    },
    {
      label: 'Lands this week',
      value: <AnimatedNumber value={metrics.arrivals.length} format={(n) => pad2(Math.round(n))} />,
      unit: 'jobs',
      hint: metrics.arrivals[0]
        ? `Next ${formatDateShort(metrics.arrivals[0].booking.eta)}`
        : 'Nothing inside seven days',
    },
    {
      label: 'Next cutoff',
      // The countdown itself is the reading here, not a count of them — the
      // plate below already carries how many there are, and a rail that
      // repeats the plate under it is a rail with nothing to say.
      value: nextCutoff ? nextCutoff.countdown.label : '—',
      tone: nextCutoff ? CUTOFF_TONE[nextCutoff.countdown.band] : 'muted',
      hint: nextCutoff ? nextCutoff.label : `Nothing inside ${CUTOFF_HORIZON_HOURS} hours`,
    },
    {
      label: 'Saved lanes · 40HC',
      value: lanes.laneCount > 0 ? moneyUsd(lanes.averageUsd) : '—',
      unit: lanes.laneCount > 0 ? 'avg' : undefined,
      hint:
        lanes.laneCount === 0
          ? 'No lanes saved yet'
          : lanes.averageDeltaPct === null
            ? `Across ${count(lanes.laneCount)} lanes`
            : `${percentSigned(lanes.averageDeltaPct)} on last week · ${count(lanes.laneCount)} lanes`,
    },
  ]

  return (
    <InstrumentRail
      readings={readings}
      className={RAIL_H}
      // Draft marks mean "continuous scale". These five readings are not
      // points on one, so the channel stays plain.
      ticks={false}
      ariaLabel="Live account readings"
    />
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   THE PLATES
   ══════════════════════════════════════════════════════════════════════════ */

export function StatusStrip() {
  const hydrated = useHydrated()
  const metrics = useCustomerMetrics()

  if (!hydrated) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className={PLATE_SKELETON_H} />
        ))}
      </div>
    )
  }

  const nextArrival = metrics.arrivals[0]
  const nextCutoff = metrics.cutoffs[0]
  const worstOpenItem = metrics.needsYou[0]

  return (
    <StaggerGrid className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StaggerCell>
        <Plate
          icon={<Ship className="h-3.5 w-3.5" aria-hidden />}
          label="Shipments in progress"
          value={metrics.inProgress}
          unit="jobs"
          hint="Everything booked, moving or still being arranged on this account."
          href={ROUTES.bookings}
          linkLabel="Open all shipments"
        />
      </StaggerCell>

      <StaggerCell>
        <Plate
          icon={<Anchor className="h-3.5 w-3.5" aria-hidden />}
          label="Arriving this week"
          value={metrics.arrivals.length}
          unit="jobs"
          hint={
            nextArrival
              ? `Next is ${nextArrival.job.id} on ${nextArrival.booking.carrierName}, estimated ${formatDateShort(nextArrival.booking.eta)}.`
              : 'Nothing lands in the next seven days.'
          }
          href={nextArrival ? ROUTES.booking(nextArrival.job.id) : ROUTES.bookings}
          linkLabel={nextArrival ? `Open ${nextArrival.job.id}` : 'Open all shipments'}
        />
      </StaggerCell>

      <StaggerCell>
        <Plate
          icon={<Timer className="h-3.5 w-3.5" aria-hidden />}
          label={`Cutoffs in ${CUTOFF_HORIZON_HOURS}h`}
          value={metrics.cutoffs.length}
          unit="due"
          // Colour only inside the last stretch. A deadline two days out is
          // information, not an alarm.
          tone={nextCutoff?.countdown.band === 'critical' ? 'critical' : undefined}
          trailing={nextCutoff ? <CountdownPill deadline={nextCutoff.at} /> : undefined}
          hint={
            nextCutoff
              ? `${nextCutoff.label} is the closest, on ${nextCutoff.jobId}.`
              : 'No carrier deadline inside the window.'
          }
          href={nextCutoff ? ROUTES.booking(nextCutoff.jobId) : ROUTES.bookings}
          linkLabel={nextCutoff ? `Open ${nextCutoff.jobId}` : 'Open all shipments'}
        />
      </StaggerCell>

      <StaggerCell>
        <Plate
          icon={<AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
          label="Open items needing you"
          value={metrics.needsYou.length}
          unit="open"
          tone={metrics.needsYou.length > 0 ? 'amber' : undefined}
          hint={
            worstOpenItem
              ? truncate(worstOpenItem.recommendedAction, 88)
              : 'Nothing is waiting on a decision from you.'
          }
          href={worstOpenItem ? ROUTES.booking(worstOpenItem.jobId) : ROUTES.bookings}
          linkLabel={worstOpenItem ? `Open ${worstOpenItem.jobId}` : 'Open all shipments'}
        />
      </StaggerCell>
    </StaggerGrid>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   ONE PLATE
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * `pad2` rather than a bare integer: two fixed digits give the strip the
 * instrument reading the rest of the product uses for counts, and the width
 * cannot change underneath the counting animation.
 *
 * A zero is toned `muted` rather than left in full ink. "00 open items" is
 * good news, and printing it at the same weight as "04" makes the reader stop
 * and check a number that did not need checking.
 */
function Plate({
  icon,
  label,
  value,
  unit,
  hint,
  href,
  linkLabel,
  tone,
  trailing,
}: {
  icon: React.ReactNode
  label: string
  value: number
  unit: string
  hint: string
  href: string
  linkLabel: string
  /** Set only where the count itself is the warning. Colour is state. */
  tone?: 'amber' | 'critical'
  trailing?: React.ReactNode
}) {
  return (
    <StatPlate
      className={`w-full ${PLATE_H}`}
      label={label}
      value={<AnimatedNumber value={value} format={(n) => pad2(Math.round(n))} />}
      unit={unit}
      tone={value === 0 ? 'muted' : (tone ?? 'neutral')}
      trailing={
        trailing ?? (
          <span className="flex h-6 w-6 items-center justify-center rounded-chip text-text-faint" aria-hidden>
            {icon}
          </span>
        )
      }
      hint={hint}
      footer={<PlateLink href={href}>{linkLabel}</PlateLink>}
    />
  )
}
