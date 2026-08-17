'use client'

import Link from 'next/link'
import { ArrowRight, Minus, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { contractRateFor } from '@/data/contracts'
import { LANES } from '@/data/lanes'
import {
  CURRENT_WEEK_INDEX,
  RATE_BASIS,
  RATE_DISCLAIMER,
  RATE_GRID,
  RATE_WEEKS,
  type RateCell,
  type RateEquipment,
  type RateLaneRow,
} from '@/data/rate-grid'
import { requirePort } from '@/data/ports'
import { flagEmoji } from '@/lib/flag'
import { formatDate, moneyUsd } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { useHydrated } from '@/hooks/use-hydrated'
import { useOrgStore } from '@/store/org-store'

import { PageShell } from '@/components/app/app-shell'
import {
  DataRow,
  EmptyState,
  InstrumentRail,
  MotionButton,
  Panel,
  SegmentedControl,
  Skeleton,
  StatusBadge,
} from '@/components/ui/primitives'
import { RateTrendMark } from '@/components/ui/freight'
import { Drawer } from '@/components/ui/overlays'
import { Basis, CardHeading, RecordPanel } from '@/components/finance/pieces'
import { RateSparkline } from './sparkline'

type EquipmentView = '20FT' | '40HC' | 'BOTH'

/**
 * THE RATE TERMINAL
 * ══════════════════════════════════════════════════════════════════════════
 * Weekly rates across the lanes this customer has saved.
 *
 * Four columns: one completed week, the current one, and two ahead. The past
 * week is what makes the trend arrows mean anything — a grid of four future
 * numbers with no history behind them is decoration.
 *
 * Where a lane is under contract the contracted figure is shown instead of
 * spot and marked as such, because that is the number the customer will
 * actually be charged.
 *
 * ── Why it is built as an instrument panel ────────────────────────────────
 * A rate sheet is read DOWN a column — "is this lane worse than last week" —
 * so the grid is set in mono at one size with the basis printed under every
 * figure, and the movement mark sits on the same baseline in every cell. A
 * rate with no stated basis is not a rate: an all-in port-to-port figure and
 * a bare ocean-freight figure differ by a third, and a buyer comparing the
 * two without the basis reaches the wrong conclusion with total confidence.
 *
 * ── Why the controls are on the panel and not in the page header ──────────
 * `PageShell`'s action slot does not shrink below its content, so a control
 * row wider than a 360px viewport pushes the whole page sideways. The
 * equipment switch and the lane manager belong to the grid rather than to the
 * page anyway, so they sit on the panel's own header, which wraps.
 */
export function RateTerminal() {
  const hydrated = useHydrated()
  const watchlist = useOrgStore((s) => s.watchlist)
  const toggleWatchlist = useOrgStore((s) => s.toggleWatchlist)

  const [view, setView] = useState<EquipmentView>('40HC')
  const [managing, setManaging] = useState(false)
  const [openCell, setOpenCell] = useState<{ row: RateLaneRow; cell: RateCell } | null>(null)

  const rows = useMemo(() => RATE_GRID.filter((r) => watchlist.includes(r.laneId)), [watchlist])
  const available = useMemo(() => RATE_GRID.filter((r) => !watchlist.includes(r.laneId)), [watchlist])

  const equipments: RateEquipment[] = view === 'BOTH' ? ['20FT', '40HC'] : [view]
  const currentWeek = RATE_WEEKS[CURRENT_WEEK_INDEX]!

  /**
   * How the board is moving this week, on the reference equipment.
   *
   * This is the reading a buyer opens the terminal for and it was previously
   * only derivable by scanning sixteen cells: how many of my lanes are firming
   * — that is, costing me more than they did last week.
   */
  const movement = useMemo(() => {
    let firming = 0
    let softening = 0
    for (const row of rows) {
      const cell = row.cells.find((c) => c.equipment === '40HC' && c.weekIndex === CURRENT_WEEK_INDEX)
      if (cell?.trend === 'FIRMING') firming += 1
      else if (cell?.trend === 'SOFTENING') softening += 1
    }
    return { firming, softening }
  }, [rows])

  return (
    <PageShell
      width="wide"
      title="Rate terminal"
      description="Weekly all-in rates across your saved trade lanes — one closed week, this week, and two ahead. The closed column is what makes the movement mean anything."
      notice={`${RATE_DISCLAIMER} ${RATE_BASIS}.`}
    >
      {!hydrated ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[84px]" />
          <Skeleton className="h-[380px]" />
        </div>
      ) : rows.length === 0 ? (
        <Panel className="p-8">
          <EmptyState
            title="No lanes on your terminal"
            description="Add the lanes you move regularly and their weekly rates appear here."
            action={
              <MotionButton variant="primary" size="md" onClick={() => setManaging(true)}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add lanes
              </MotionButton>
            }
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {/* ── The board's own readings ──────────────────────────────────
              Set above the grid rather than inside it: these answer "what
              happened this week" before a single cell has been read. */}
          <InstrumentRail
            ariaLabel="Board summary"
            ticks={false}
            readings={[
              {
                label: 'Lanes tracked',
                value: rows.length,
                unit: rows.length === 1 ? 'lane' : 'lanes',
                hint: 'Saved to your terminal',
              },
              {
                label: 'Week',
                value: currentWeek.label,
                hint: 'Rates settle on a Sunday',
              },
              {
                label: 'Firming',
                value: movement.firming,
                unit: 'on 40HC',
                tone: movement.firming > 0 ? 'amber' : 'neutral',
                hint: 'Costing more than last week',
              },
              {
                label: 'Softening',
                value: movement.softening,
                unit: 'on 40HC',
                tone: movement.softening > 0 ? 'signal' : 'neutral',
                hint: 'Cheaper than last week',
              },
            ]}
          />

          <RecordPanel
            title="Weekly rate grid"
            meta={`${rows.length} lane${rows.length === 1 ? '' : 's'} · ${RATE_BASIS.toLowerCase()}`}
            action={
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <SegmentedControl<EquipmentView>
                  ariaLabel="Equipment"
                  size="sm"
                  value={view}
                  onChange={setView}
                  options={[
                    { value: '20FT', label: '20ft' },
                    { value: '40HC', label: '40HC' },
                    { value: 'BOTH', label: 'Both' },
                  ]}
                />
                <MotionButton variant="secondary" size="sm" onClick={() => setManaging(true)}>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Manage lanes
                </MotionButton>
              </div>
            }
            footnote={
              <>
                <span className="font-medium text-text">Assured</span> means a partner has confirmed the rate for that
                week. <span className="font-medium text-text">Indicative</span> is our read of the market and moves.{' '}
                <span className="font-medium text-text">Contract</span> is your agreed rate and overrides both — it is
                fixed for the term, so it carries no weekly movement. Every figure is {RATE_BASIS.toLowerCase()}.
              </>
            }
          >
            {/* The grid is genuinely wider than a phone, so it scrolls inside
                its own box. `min-w-0` on this wrapper is what lets it: a flex
                or grid child defaults to `min-width: auto` and refuses to
                shrink below its content, so without it the scroll box never
                gets the chance to scroll and the PAGE scrolls instead. */}
            <div className="pw-table-wrap min-w-0 rounded-none border-0">
              <table className="pw-table min-w-[820px]">
                <caption className="sr-only">
                  Weekly all-in freight rates for your saved lanes, one column per week
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="sticky left-0 z-[2] bg-raised-2">
                      Trade lane
                    </th>
                    {RATE_WEEKS.map((week) => (
                      <th
                        key={week.index}
                        scope="col"
                        className={cn('min-w-[9.5rem]', week.isCurrent && 'text-signal')}
                      >
                        <span className="block">
                          Week {week.index + 1}
                          {week.isCurrent && ' · now'}
                          {week.isPast && ' · closed'}
                        </span>
                        <span className="pw-readout mt-0.5 block text-[11px] font-normal normal-case tracking-normal text-text-muted">
                          {week.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => {
                    const origin = requirePort(row.originId)
                    const destination = requirePort(row.destinationId)

                    return equipments.map((equipment, eqIndex) => (
                      <tr key={`${row.laneId}-${equipment}`} className={cn(eqIndex > 0 && 'bg-raised-2/25')}>
                        {eqIndex === 0 && (
                          <th
                            scope="row"
                            rowSpan={equipments.length}
                            // The lane stays on screen while the weeks scroll
                            // under it — a rate you cannot attribute to a lane
                            // is not a reading.
                            className="pw-hairline-r sticky left-0 z-[1] min-w-[13rem] bg-surface align-top normal-case tracking-normal"
                          >
                            <span className="flex items-center gap-1.5 text-data font-medium normal-case tracking-normal text-text">
                              <span aria-hidden>{flagEmoji(origin.countryCode)}</span>
                              {origin.name}
                            </span>
                            <span className="mt-0.5 flex items-center gap-1.5 text-data font-medium normal-case tracking-normal text-text">
                              <span aria-hidden>{flagEmoji(destination.countryCode)}</span>
                              {destination.name}
                            </span>
                            <span className="pw-readout mt-1.5 block text-[10px] font-normal normal-case tracking-normal text-text-faint">
                              {row.transitMinDays}–{row.transitMaxDays} days ·{' '}
                              {row.sailingsPerWeek === 1 ? 'weekly' : `${row.sailingsPerWeek}× a week`}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleWatchlist(row.laneId)}
                              className="mt-1.5 inline-flex min-h-[24px] items-center gap-1 rounded-chip text-[10px] font-medium normal-case tracking-normal text-text-faint transition-colors hover:text-critical"
                            >
                              <X className="h-3 w-3" aria-hidden />
                              Remove
                            </button>
                          </th>
                        )}

                        {RATE_WEEKS.map((week) => {
                          const cell = row.cells.find(
                            (c) => c.equipment === equipment && c.weekIndex === week.index,
                          )
                          if (!cell) return <td key={week.index} />
                          const contracted = contractRateFor(row.laneId, equipment === '20FT' ? '20FT' : '40HC')
                          const fixed = Boolean(contracted) && week.index >= CURRENT_WEEK_INDEX

                          return (
                            <td key={week.index} className="px-2 py-2 align-top">
                              <button
                                type="button"
                                onClick={() => setOpenCell({ row, cell })}
                                aria-label={`${origin.name} to ${destination.name}, ${equipment}, ${week.label}`}
                                className={cn(
                                  'w-full rounded-card border px-3 py-2.5 text-left transition-[background-color,border-color,box-shadow]',
                                  week.isCurrent
                                    ? 'pw-elev-0 border-signal/30 bg-signal/6 hover:border-signal/55'
                                    : 'border-transparent hover:border-hairline-strong hover:bg-raised-2/60',
                                  week.isPast && 'opacity-70',
                                )}
                              >
                                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <StatusBadge
                                    tone={fixed ? 'signal' : cell.assurance === 'ASSURED' ? 'route' : 'neutral'}
                                    dot={false}
                                    className="px-1.5 py-0 text-[9.5px] tracking-[0.06em]"
                                  >
                                    {fixed ? 'Contract' : cell.assurance === 'ASSURED' ? 'Assured' : 'Indicative'}
                                  </StatusBadge>

                                  {/* A contracted rate is fixed for the term,
                                      so a week-on-week delta would be the spot
                                      market's movement wearing the contract's
                                      label. */}
                                  {fixed ? (
                                    <span className="pw-readout text-[10px] font-medium text-signal">fixed</span>
                                  ) : (
                                    <RateTrendMark cell={cell} />
                                  )}
                                </span>

                                <span className="pw-readout mt-1.5 block text-[15px] font-medium">
                                  {moneyUsd(fixed ? contracted!.lane.rateUsd : cell.amountUsd)}
                                </span>

                                {/* The basis under every figure. Without it a
                                    reader cannot tell an all-in rate from an
                                    ocean-freight-only one. */}
                                <span className="mt-0.5 block font-mono text-[10px] text-text-faint">
                                  USD · per {equipment} · all-in
                                </span>
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    ))
                  })}
                </tbody>
              </table>
            </div>
          </RecordPanel>
        </div>
      )}

      {/* ── Cell detail ─────────────────────────────────────────────── */}
      <Drawer
        open={Boolean(openCell)}
        onOpenChange={(open) => !open && setOpenCell(null)}
        title={
          openCell
            ? `${requirePort(openCell.row.originId).name} → ${requirePort(openCell.row.destinationId).name}`
            : ''
        }
        description={openCell ? `${openCell.cell.equipment} · ${RATE_WEEKS[openCell.cell.weekIndex]?.label}` : ''}
        width="md"
      >
        {openCell && <CellDetail row={openCell.row} cell={openCell.cell} />}
      </Drawer>

      {/* ── Manage lanes ────────────────────────────────────────────── */}
      <Drawer
        open={managing}
        onOpenChange={setManaging}
        title="Manage your lanes"
        description="Add the pairs you move regularly. Rates for them appear on the terminal each week."
        width="md"
      >
        <div className="flex flex-col gap-6">
          <section>
            <CardHeading className="mb-2">On your terminal</CardHeading>
            {rows.length === 0 ? (
              <p className="text-data text-text-muted">Nothing saved yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {rows.map((row) => (
                  <li key={row.laneId} className="pw-card flex items-center justify-between gap-3 px-3 py-2">
                    <span className="min-w-0 text-data text-text">
                      {requirePort(row.originId).name} → {requirePort(row.destinationId).name}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleWatchlist(row.laneId)}
                      className="inline-flex min-h-[32px] shrink-0 items-center gap-1 rounded-chip px-1 text-micro font-medium text-text-muted transition-colors hover:text-critical"
                    >
                      <Minus className="h-3 w-3" aria-hidden />
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <CardHeading className="mb-2">Available to add</CardHeading>
            {available.length === 0 ? (
              <p className="text-data text-text-muted">Every priced lane is already on your terminal.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {available.map((row) => (
                  <li key={row.laneId} className="pw-card flex items-center justify-between gap-3 px-3 py-2">
                    <span className="min-w-0 text-data text-text">
                      {requirePort(row.originId).name} → {requirePort(row.destinationId).name}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleWatchlist(row.laneId)}
                      className="inline-flex min-h-[32px] shrink-0 items-center gap-1 rounded-chip px-1 text-micro font-medium text-signal"
                    >
                      <Plus className="h-3 w-3" aria-hidden />
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-micro leading-relaxed text-text-faint">
            Only lanes with a priced rate can be tracked. For anything else, raise a{' '}
            <Link href={ROUTES.rfqs} className="font-medium text-signal hover:underline">
              request for quotation
            </Link>
            .
          </p>
        </div>
      </Drawer>
    </PageShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   PIECES
   ══════════════════════════════════════════════════════════════════════════ */

function CellDetail({ row, cell }: { row: RateLaneRow; cell: RateCell }) {
  const lane = LANES.find((l) => l.id === row.laneId)
  const contracted = contractRateFor(row.laneId, cell.equipment === '20FT' ? '20FT' : '40HC')

  return (
    <div className="flex flex-col gap-5">
      {/* The headline figure sits in a recess, because a figure in a channel
          reads as measured and the same figure on a raised chip reads as
          typed in by hand. */}
      <Panel className="overflow-hidden">
        <div className="px-5 pb-4 pt-4">
          <p className="pw-stencil">{contracted ? 'Your contract rate' : 'Rate for this week'}</p>
          <p className="pw-readout mt-1.5 text-[28px] font-medium leading-none tracking-[-0.03em]">
            {moneyUsd(contracted?.lane.rateUsd ?? cell.amountUsd)}
          </p>
          <p className="mt-2 font-mono text-micro text-text-faint">
            USD · per {cell.equipment} · {RATE_BASIS.toLowerCase()}
          </p>
          {contracted && (
            <p className="mt-2 text-data leading-relaxed text-text-muted">
              Under{' '}
              <Link
                href={ROUTES.contract(contracted.contract.id)}
                className="font-medium text-signal hover:underline"
              >
                {contracted.contract.id}
              </Link>
              . Spot this week is {moneyUsd(cell.amountUsd)} — the contract is what you are charged.
            </p>
          )}
        </div>
        <Basis>
          {contracted
            ? 'A contracted rate is fixed for the term of the contract, so it carries no weekly movement.'
            : 'Indicative rates are our read of the market and move week to week. Assured rates are confirmed by a partner for that week only.'}
        </Basis>
      </Panel>

      <RecordPanel
        title="Twelve weeks"
        meta="40HC"
        footnote="The dashed line is the eight-week average — the same window the terminal reasons over."
        bodyClassName="px-5 py-4"
      >
        {/* Milled into the plate rather than stuck on top of it. */}
        <div className="pw-rail rounded-card px-3 py-3">
          <RateSparkline points={row.history} />
        </div>
      </RecordPanel>

      <RecordPanel title="This lane" bodyClassName="px-5 py-1">
        <div className="divide-y divide-hairline/60">
          <DataRow label="Transit" value={`${row.transitMinDays}–${row.transitMaxDays} days`} mono />
          <DataRow
            label="Departures"
            value={row.sailingsPerWeek === 1 ? 'Weekly' : `${row.sailingsPerWeek} a week`}
          />
          <DataRow label="Rate valid to" value={formatDate(cell.validUntil)} mono />
          <DataRow
            label="Confidence"
            value={cell.assurance === 'ASSURED' ? 'Partner-confirmed' : 'Indicative — moves weekly'}
          />
          {lane && <DataRow label="Mode" value="Ocean FCL" />}
        </div>
      </RecordPanel>

      <div className="flex flex-wrap gap-2">
        <MotionButton variant="primary" size="lg" asChild>
          <Link href={ROUTES.search}>
            Book this lane
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </MotionButton>
        <MotionButton variant="secondary" size="lg" asChild>
          <Link href={ROUTES.rfqs}>Request a contract rate</Link>
        </MotionButton>
      </div>
    </div>
  )
}
