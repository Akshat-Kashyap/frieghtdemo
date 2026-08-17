'use client'

import { useMemo } from 'react'

import { ORG_ID } from '@/data/org'
import { CURRENT_WEEK_INDEX, RATE_GRID } from '@/data/rate-grid'
import { DEMO_NOW_MS, daysUntil, isPast } from '@/lib/demo-clock'
import { teuFor } from '@/lib/format'
import { ACTIVE_JOB_STATUSES } from '@/lib/lifecycle'
import { useBookings, useContainers, useCutoffRail, useExceptionQueue, useJobs } from '@/store/hooks'
import { useOrgStore } from '@/store/org-store'
import type { CutoffEntry } from '@/store/selectors'
import type { Booking, Exception, Job } from '@/types'

/**
 * THE CUSTOMER'S OWN NUMBERS
 * ══════════════════════════════════════════════════════════════════════════
 * `selectDashboardMetrics` is the forwarder's control tower. It returns
 * `estimatedMarginInr`, `pendingVendorBills`, `openEnquiries` and
 * `quotesAwaiting` — the branch's commercial position across every account it
 * handles. A shipper must never see the margin their own forwarder is making
 * on their own boxes, and the padded background counts in that selector
 * (`+108` active jobs, `+9` arriving today) describe a book this customer has
 * no part in.
 *
 * So the home dashboard derives its own figures here rather than borrowing the
 * shared selector and hiding the fields it must not show. Every one of them
 * answers a question a shipper actually has — how many of my shipments are
 * running, how much steel is on the water, what lands this week, what deadline
 * is closest, what is waiting on me, and what the lanes I buy are doing — and
 * every one is scoped to this organisation.
 *
 * The counts deliberately match the screens the tiles link into: `inProgress`
 * uses the same status set as the "In progress" tab on the shipments list, so
 * a tile reading 20 cannot open a page showing 18. A headline that disagrees
 * with its own drill-down is worse than no headline.
 *
 * Nothing in this file is typed in. Every figure is a fold over the same
 * seeded records the module behind it renders, which is the property that lets
 * a viewer click any reading on the home screen and check it.
 */

/** The window the arrivals tile counts. A week is one delivery-planning cycle. */
const ARRIVAL_WINDOW_DAYS = 7

/**
 * How far ahead the cutoff tile looks.
 *
 * Exported because the live-shipment panel reads the same rail for its
 * headline countdown, and two horizons would let the tile claim a deadline
 * the panel below it does not show.
 */
export const CUTOFF_HORIZON_HOURS = 72

/** A shipment landing inside the arrival window, with the booking behind it. */
export interface UpcomingArrival {
  job: Job
  booking: Booking
}

export interface CustomerMetrics {
  /** Shipments on this account that have not been delivered or closed. */
  inProgress: number
  /** Containers on those shipments, and the same figure in TEU. */
  boxesInFlight: number
  teuInFlight: number
  /** Of those, the ones whose estimated arrival falls inside the week. */
  arrivals: UpcomingArrival[]
  /** Live cutoffs on this account inside the horizon, soonest first. */
  cutoffs: CutoffEntry[]
  /** Open exceptions this customer is meant to see, worst first. */
  needsYou: Exception[]
}

/**
 * Assembled from the raw slices through the shared hooks.
 *
 * Nothing here calls a `select*` function directly — `useCutoffRail` and
 * `useExceptionQueue` already memoise around the store's stable slice
 * references, which is what keeps Zustand v5 from re-rendering this into a
 * loop. See the header of `store/hooks.ts`.
 */
export function useCustomerMetrics(): CustomerMetrics {
  const jobs = useJobs()
  const bookings = useBookings()
  const containers = useContainers()

  // Pinned to the demo clock rather than a ticking one: the rail is a list,
  // and re-deriving every shipment's deadlines once a second to move a label
  // is work the `CountdownPill` already does on its own.
  const rail = useCutoffRail(DEMO_NOW_MS, CUTOFF_HORIZON_HOURS)
  const openExceptions = useExceptionQueue({ openOnly: true })

  return useMemo(() => {
    // Both halves of the test, always: the account *and* the visibility flag.
    // Every reading below is customer-facing, and a record the seed marks
    // not-customer-visible must not reach one — the exception filter a few
    // lines down applies the same rule to its own list.
    const own = jobs.filter((job) => job.customerId === ORG_ID && job.customerVisible)
    const ownIds = new Set(own.map((job) => job.id))
    const live = own.filter((job) => ACTIVE_JOB_STATUSES.includes(job.status))
    const liveIds = new Set(live.map((job) => job.id))

    // Boxes are counted from the container records rather than from the
    // booking's declared quantity, because a container that has not been
    // released yet has no record and should not be claimed as "in flight".
    // TEU rather than a bare box count because a 40ft is two, and a customer
    // moving four forties does not have four containers' worth of exposure.
    const boxes = containers.filter((c) => liveIds.has(c.jobId))
    const teuInFlight = boxes.reduce((sum, c) => sum + teuFor(c.isoType), 0)

    const arrivals = live
      .map((job) => ({ job, booking: bookings.find((b) => b.jobId === job.id) }))
      .filter((row): row is UpcomingArrival => Boolean(row.booking))
      // `daysUntil` floors at zero, so a date already behind us also reads as
      // "0 days away". The `isPast` guard is what stops last week's arrival
      // being counted as this week's.
      .filter(({ booking }) => !isPast(booking.eta) && daysUntil(booking.eta) <= ARRIVAL_WINDOW_DAYS)
      .sort((a, b) => new Date(a.booking.eta).getTime() - new Date(b.booking.eta).getTime())

    // The rail keeps recently missed cutoffs so a forwarder can still see
    // them. On the customer's own reading that would be a countdown to a
    // moment that has already gone, so only live deadlines are counted.
    const cutoffs = rail.filter((entry) => ownIds.has(entry.jobId) && !entry.countdown.overdue)

    const needsYou = openExceptions.filter((exc) => exc.customerVisible && ownIds.has(exc.jobId))

    return {
      inProgress: live.length,
      boxesInFlight: boxes.length,
      teuInFlight,
      arrivals,
      cutoffs,
      needsYou,
    }
  }, [jobs, bookings, containers, rail, openExceptions])
}

/* ══════════════════════════════════════════════════════════════════════════
   THE MARKET ON THE LANES THIS ACCOUNT ACTUALLY BUYS
   ══════════════════════════════════════════════════════════════════════════
   One reading, and it is the only one on the home screen that is about money
   the customer has not yet spent: what a 40HC is averaging this week across
   the lanes they have saved, and which way it moved.

   Averaged rather than listed because the rail is a summary — the per-lane
   figures are three sections further down, and repeating them here would make
   the top of the page argue with the middle of it. The average is unweighted
   on purpose: this is "what the market is doing to my lanes", not "what my
   next shipment will cost", and weighting by volume would quietly turn one
   into the other.
   ══════════════════════════════════════════════════════════════════════════ */

export interface WatchedLaneReading {
  /** How many saved lanes have a published rate behind them. */
  laneCount: number
  /** Unweighted mean of this week's 40HC figure across those lanes. */
  averageUsd: number
  /** Mean week-on-week movement, or null in the opening week of the grid. */
  averageDeltaPct: number | null
  /** How many of those lanes firmed against last week. */
  firming: number
}

export function useWatchedLanes(): WatchedLaneReading {
  const watchlist = useOrgStore((s) => s.watchlist)

  return useMemo(() => {
    const rows = RATE_GRID.filter((row) => watchlist.includes(row.laneId))
    const cells = rows
      .map((row) => row.cells.find((c) => c.equipment === '40HC' && c.weekIndex === CURRENT_WEEK_INDEX))
      .filter((cell): cell is NonNullable<typeof cell> => Boolean(cell))

    if (cells.length === 0) {
      return { laneCount: 0, averageUsd: 0, averageDeltaPct: null, firming: 0 }
    }

    const averageUsd = Math.round(cells.reduce((sum, c) => sum + c.amountUsd, 0) / cells.length)

    // Only the cells that actually carry a delta are averaged. Treating a null
    // as a zero would drag the mean towards "flat" every time a lane joined
    // the grid, which is a movement nobody made.
    const moved = cells.filter((c) => c.deltaPct !== null)
    const averageDeltaPct =
      moved.length === 0
        ? null
        : Number((moved.reduce((sum, c) => sum + (c.deltaPct ?? 0), 0) / moved.length).toFixed(1))

    return {
      laneCount: cells.length,
      averageUsd,
      averageDeltaPct,
      firming: cells.filter((c) => c.trend === 'FIRMING').length,
    }
  }, [watchlist])
}
