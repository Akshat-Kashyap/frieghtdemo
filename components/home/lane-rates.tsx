'use client'

import Link from 'next/link'
import { useMemo } from 'react'

import {
  CURRENT_WEEK_INDEX,
  RATE_BASIS,
  RATE_GRID,
  RATE_WEEKS,
  rateInContext,
  type RateCell,
} from '@/data/rate-grid'
import { requirePort } from '@/data/ports'
import { moneyUsd, percentSigned, transitRange } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { useHydrated } from '@/hooks/use-hydrated'
import { useOrgStore } from '@/store/org-store'

import {
  EmptyState,
  Panel,
  Skeleton,
  StatPlate,
  StatusBadge,
  type StatPlateDelta,
} from '@/components/ui/primitives'
import { LanePill } from '@/components/ui/freight'
import { RateSparkline } from '@/components/rate-terminal/sparkline'

import { StaggerCell, StaggerGrid } from './pieces'

/**
 * WHAT THE LANES YOU WATCH ARE DOING
 * ══════════════════════════════════════════════════════════════════════════
 * The saved watchlist crossed with this week's rate grid, one plate per lane.
 *
 * Four things travel together here and none of them works alone: the figure,
 * the movement against last week, twelve weeks of shape behind it, and where
 * this week sits against the eight-week average. A rate on its own tells a
 * buyer nothing about whether now is a good moment to book — which is the only
 * question this section exists to answer — and the basis line underneath is
 * what stops an all-in port-to-port number being read against a bare
 * ocean-freight quote from somewhere else.
 *
 * The sparkline is milled into the plate rather than sitting on it: `StatPlate`
 * frames it in a recess, which is what makes it read as part of the instrument
 * instead of a chart someone pasted onto a card.
 *
 * ── Why the movement uses the plate's own delta glyph ─────────────────────
 * `RateTrendMark` is the atom for rate movement in *tables* — the rate
 * terminal's cells, the contract rows — and it stays there. On a plate the
 * figure is the subject and the movement belongs directly under it, which is
 * what `StatPlate`'s `delta` slot is for, and its filled triangle is the glyph
 * every other plate in the product prints. What must never differ between the
 * two is the *reading*: firming is amber and softening is green on both,
 * because this is the buyer's screen and a rate going up is the thing that
 * costs them money. Both are fed by `percentSigned` for the same reason.
 *
 * The watchlist is persisted, so everything is gated on hydration. Only lanes
 * with a published row in `RATE_GRID` are shown: a saved id with no rate
 * behind it would render a blank plate with no explanation for why it is blank.
 */

/** Three fits one row on a wide screen and reads as a summary, not a table. */
const LANES_SHOWN = 3

/** Pinned so the hydration placeholder cannot be the wrong size. */
const PLATE_H = 'min-h-[262px]'
const PLATE_SKELETON_H = 'h-[262px]'

/** The buyer's reading of a movement, applied once. */
function deltaFor(cell: RateCell): StatPlateDelta | undefined {
  if (cell.deltaPct === null) return undefined
  return {
    value: percentSigned(cell.deltaPct),
    direction: cell.trend === 'FIRMING' ? 'up' : cell.trend === 'SOFTENING' ? 'down' : 'flat',
    tone: cell.trend === 'FIRMING' ? 'amber' : cell.trend === 'SOFTENING' ? 'signal' : 'muted',
    caption: 'on last week',
  }
}

export function LaneRates() {
  const hydrated = useHydrated()
  const watchlist = useOrgStore((s) => s.watchlist)

  const watched = useMemo(() => RATE_GRID.filter((row) => watchlist.includes(row.laneId)), [watchlist])
  const shown = watched.slice(0, LANES_SHOWN)
  const week = RATE_WEEKS[CURRENT_WEEK_INDEX]

  if (!hydrated) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className={PLATE_SKELETON_H} />
        ))}
      </div>
    )
  }

  if (shown.length === 0) {
    return (
      <Panel className="p-8">
        <EmptyState
          title="No lanes saved yet"
          description="Save the pairs you move regularly and their weekly rate, movement and twelve-week shape land here."
          action={
            <Link href={ROUTES.rateTerminal} className="text-data font-medium text-signal hover:underline">
              Open the rate terminal
            </Link>
          }
        />
      </Panel>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <StaggerGrid className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((row) => {
          const origin = requirePort(row.originId)
          const destination = requirePort(row.destinationId)
          const cell = row.cells.find((c) => c.equipment === '40HC' && c.weekIndex === CURRENT_WEEK_INDEX)
          const context = rateInContext(row.laneId, '40HC')

          return (
            <StaggerCell key={row.laneId}>
              <StatPlate
                className={`w-full ${PLATE_H}`}
                // Codes in the stencil, names in the footer. A stencilled
                // label is painted identification — a berth number, a box
                // code — and "Nhava Sheva → Rotterdam" set in it would be a
                // sentence pretending to be a marking.
                label={`${origin.code} → ${destination.code}`}
                trailing={
                  <StatusBadge tone={cell?.assurance === 'ASSURED' ? 'route' : 'muted'} dot={false}>
                    {cell?.assurance === 'ASSURED' ? 'Assured' : 'Indicative'}
                  </StatusBadge>
                }
                value={cell ? moneyUsd(cell.amountUsd) : '—'}
                unit="per 40HC"
                delta={cell ? deltaFor(cell) : undefined}
                sparkline={<RateSparkline points={row.history} height={40} compact />}
                hint={
                  context
                    ? `${context.label}. ${week.label}`.trim()
                    : `Published for ${week.label}.`
                }
                footer={
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <LanePill origin={origin.name} destination={destination.name} size="sm" />
                    <span className="truncate">
                      {transitRange(row.transitMinDays, row.transitMaxDays)} ·{' '}
                      {row.sailingsPerWeek === 1 ? 'weekly departure' : `${row.sailingsPerWeek} departures a week`}
                    </span>
                  </span>
                }
              />
            </StaggerCell>
          )
        })}
      </StaggerGrid>

      {/* The basis travels with the figures, always — see the note in the
          rate terminal. Stated here rather than in the page footer because a
          reader who scrolls past this section has already read the numbers. */}
      <p className="text-[11px] leading-relaxed text-text-muted">
        <span className="font-medium text-text">Basis</span> · {RATE_BASIS}.
        {watched.length > LANES_SHOWN && (
          <>
            {' '}
            {watched.length - LANES_SHOWN} more saved lane
            {watched.length - LANES_SHOWN === 1 ? ' is' : 's are'} on the{' '}
            <Link href={ROUTES.rateTerminal} className="font-medium text-signal hover:underline">
              rate terminal
            </Link>
            .
          </>
        )}
      </p>
    </div>
  )
}
