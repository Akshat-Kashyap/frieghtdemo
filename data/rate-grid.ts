import { LANES } from '@/data/lanes'
import { DEMO_NOW_MS } from '@/lib/demo-clock'
import { rng } from '@/lib/seed'

/**
 * THE WEEKLY RATE GRID
 * ══════════════════════════════════════════════════════════════════════════
 * Rows are trade lanes, columns are calendar weeks, cells are an all-in USD
 * rate per container.
 *
 * Three decisions worth knowing:
 *
 * 1. **The window opens one week in the past.** Three forward weeks and one
 *    completed one, because a rate with no previous week has no trend, and
 *    the trend is the reason anyone opens this screen.
 *
 * 2. **The basis is stated everywhere.** These are all-in port-to-port
 *    figures including origin handling and documentation — which is why a
 *    20ft here can look expensive next to a base ocean-freight number quoted
 *    elsewhere. Comparing the two without the basis is the most common way
 *    to misread a rate sheet.
 *
 * 3. **Nothing is random at runtime.** Every figure derives from the seeded
 *    PRNG keyed on lane and week, so the grid a viewer saw before a reload is
 *    the grid they see after it. `Math.random()` here would quietly break the
 *    week-over-week arrows.
 */

export type RateEquipment = '20FT' | '40HC'
export type RateTrend = 'FIRMING' | 'SOFTENING' | 'STABLE'
export type RateAssurance = 'ASSURED' | 'INDICATIVE'

export interface RateWeek {
  index: number
  startsAt: string
  endsAt: string
  /** "09 Aug – 15 Aug" */
  label: string
  shortLabel: string
  isCurrent: boolean
  isPast: boolean
}

export interface RateCell {
  laneId: string
  equipment: RateEquipment
  weekIndex: number
  amountUsd: number
  /** Movement against the previous week. Null in the first column. */
  deltaPct: number | null
  trend: RateTrend
  assurance: RateAssurance
  validUntil: string
}

export interface RateLaneRow {
  laneId: string
  originId: string
  destinationId: string
  transitMinDays: number
  transitMaxDays: number
  /** Departures per week on this lane, from the seeded schedule. */
  sailingsPerWeek: number
  cells: RateCell[]
  /** Twelve weeks of 40HC history for the sparkline, oldest first. */
  history: number[]
}

/* ══════════════════════════════════════════════════════════════════════════
   WEEKS — Sunday to Saturday, anchored on the demo clock
   ══════════════════════════════════════════════════════════════════════════ */

const DAY_MS = 86_400_000

function startOfWeek(ms: number): number {
  const d = new Date(ms)
  const utc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return utc - new Date(utc).getUTCDay() * DAY_MS
}

const WEEK_FMT = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })

/** One completed week, the current week, then two ahead. */
export const RATE_WEEKS: RateWeek[] = Array.from({ length: 4 }, (_, i) => {
  const start = startOfWeek(DEMO_NOW_MS) + (i - 1) * 7 * DAY_MS
  const end = start + 6 * DAY_MS
  return {
    index: i,
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(end).toISOString(),
    label: `${WEEK_FMT.format(start)} – ${WEEK_FMT.format(end)}`,
    shortLabel: WEEK_FMT.format(start),
    isCurrent: i === 1,
    isPast: i === 0,
  }
})

export const CURRENT_WEEK_INDEX = 1

/* ══════════════════════════════════════════════════════════════════════════
   LANE ANCHORS
   ══════════════════════════════════════════════════════════════════════════
   The 20ft figure is the anchor; 40HC derives from it. Across the trade a
   20ft runs roughly 60–70% of the 40ft rate, so the ratio sits near 1.5 and
   varies a little by lane rather than being applied as a constant.
   ══════════════════════════════════════════════════════════════════════════ */

interface LaneAnchor {
  laneId: string
  base20: number
  ratio40: number
  sailingsPerWeek: number
  assured: boolean
  /** Seasonal pressure: positive firms the lane, negative softens it. */
  drift: number
}

const ANCHORS: LaneAnchor[] = [
  { laneId: 'CNSHA-INNSA-FCL', base20: 2_690, ratio40: 1.53, sailingsPerWeek: 2, assured: true, drift: 0.9 },
  { laneId: 'CNSHA-INMUN-FCL', base20: 2_750, ratio40: 1.54, sailingsPerWeek: 2, assured: true, drift: 1.1 },
  { laneId: 'CNSHA-INMAA-FCL', base20: 2_850, ratio40: 1.56, sailingsPerWeek: 1, assured: false, drift: 0.6 },
  { laneId: 'CNNGB-INNSA-FCL', base20: 2_640, ratio40: 1.52, sailingsPerWeek: 1, assured: true, drift: 0.8 },
  { laneId: 'SGSIN-INNSA-FCL', base20: 1_780, ratio40: 1.49, sailingsPerWeek: 3, assured: false, drift: -0.4 },
  { laneId: 'AEJEA-INMUN-FCL', base20: 1_120, ratio40: 1.47, sailingsPerWeek: 2, assured: false, drift: -0.8 },
  { laneId: 'INNSA-NLRTM-FCL', base20: 2_180, ratio40: 1.58, sailingsPerWeek: 1, assured: true, drift: 0.2 },
  { laneId: 'AEJEA-INNSA-FCL', base20: 1_150, ratio40: 1.48, sailingsPerWeek: 2, assured: false, drift: -0.6 },
  { laneId: 'INMUN-NLRTM-FCL', base20: 2_240, ratio40: 1.57, sailingsPerWeek: 1, assured: false, drift: 0.3 },
]

/** Rounded the way a rate desk quotes: to the nearest 5 dollars. */
function quote(value: number): number {
  return Math.round(value / 5) * 5
}

function trendFor(deltaPct: number | null): RateTrend {
  if (deltaPct === null || Math.abs(deltaPct) < 0.6) return 'STABLE'
  return deltaPct > 0 ? 'FIRMING' : 'SOFTENING'
}

function buildRow(anchor: LaneAnchor): RateLaneRow | null {
  const lane = LANES.find((l) => l.id === anchor.laneId)
  if (!lane) return null

  const random = rng(`rate-grid-${anchor.laneId}`)

  /**
   * Week-on-week multiplier, measured *from the current week*.
   *
   * The anchor is this week's published figure, so the current column returns
   * it exactly and the surrounding weeks drift either side. Applying the
   * wobble to every column would leave the headline rate a few dollars off
   * the number the lane is actually quoted at.
   */
  const weekFactor = (weekIndex: number) => {
    if (weekIndex === CURRENT_WEEK_INDEX) return 1
    const offset = weekIndex - CURRENT_WEEK_INDEX
    const drift = 1 + (anchor.drift / 100) * offset
    const wobble = 1 + random.float(-0.018, 0.022, 4)
    return drift * wobble
  }

  const cells: RateCell[] = []

  for (const equipment of ['20FT', '40HC'] as RateEquipment[]) {
    const base = equipment === '20FT' ? anchor.base20 : anchor.base20 * anchor.ratio40
    let previous: number | null = null

    for (const week of RATE_WEEKS) {
      const amount = quote(base * weekFactor(week.index))
      const deltaPct = previous === null ? null : Number((((amount - previous) / previous) * 100).toFixed(1))

      cells.push({
        laneId: anchor.laneId,
        equipment,
        weekIndex: week.index,
        amountUsd: amount,
        deltaPct,
        trend: trendFor(deltaPct),
        // Only the current and next week can be partner-confirmed; nobody
        // assures a rate three weeks out.
        assurance: anchor.assured && week.index >= CURRENT_WEEK_INDEX && week.index <= CURRENT_WEEK_INDEX + 1
          ? 'ASSURED'
          : 'INDICATIVE',
        validUntil: week.endsAt,
      })
      previous = amount
    }
  }

  // Twelve weeks of 40HC history, ending at the current week's figure.
  const current40 = cells.find((c) => c.equipment === '40HC' && c.weekIndex === CURRENT_WEEK_INDEX)!.amountUsd
  const history = Array.from({ length: 12 }, (_, i) => {
    const weeksBack = 11 - i
    const seasonal = 1 - (anchor.drift / 100) * weeksBack
    return quote(current40 * seasonal * (1 + random.float(-0.03, 0.03, 4)))
  })
  history[history.length - 1] = current40

  return {
    laneId: anchor.laneId,
    originId: lane.originId,
    destinationId: lane.destinationId,
    transitMinDays: lane.transitMinDays,
    transitMaxDays: lane.transitMaxDays,
    sailingsPerWeek: anchor.sailingsPerWeek,
    cells,
    history,
  }
}

export const RATE_GRID: RateLaneRow[] = ANCHORS.map(buildRow).filter((r): r is RateLaneRow => r !== null)

/* ══════════════════════════════════════════════════════════════════════════
   LOOKUPS
   ══════════════════════════════════════════════════════════════════════════ */

export function rateRow(laneId: string): RateLaneRow | undefined {
  return RATE_GRID.find((r) => r.laneId === laneId)
}

export function rateCell(laneId: string, equipment: RateEquipment, weekIndex = CURRENT_WEEK_INDEX): RateCell | undefined {
  return rateRow(laneId)?.cells.find((c) => c.equipment === equipment && c.weekIndex === weekIndex)
}

/** The live rate on a lane, for Search and Zeno. */
export function currentRate(originId: string, destinationId: string, equipment: RateEquipment = '40HC') {
  const row = RATE_GRID.find((r) => r.originId === originId && r.destinationId === destinationId)
  if (!row) return undefined
  const cell = row.cells.find((c) => c.equipment === equipment && c.weekIndex === CURRENT_WEEK_INDEX)
  return cell ? { row, cell } : undefined
}

/**
 * How this week's rate compares with the eight-week average.
 *
 * The single most useful thing to say next to a price. A number on its own
 * tells a customer nothing about whether now is a good time to book.
 */
export function rateInContext(laneId: string, equipment: RateEquipment = '40HC') {
  const row = rateRow(laneId)
  if (!row) return null

  const cell = row.cells.find((c) => c.equipment === equipment && c.weekIndex === CURRENT_WEEK_INDEX)
  if (!cell) return null

  const window = row.history.slice(-8)
  const average = window.reduce((sum, v) => sum + v, 0) / window.length
  // History is held in 40HC terms; scale it when asking about a 20ft.
  const scale = equipment === '40HC' ? 1 : cell.amountUsd / (row.history.at(-1) ?? cell.amountUsd)
  const comparable = average * scale
  const deltaPct = Number((((cell.amountUsd - comparable) / comparable) * 100).toFixed(0))

  return {
    deltaPct,
    average: quote(comparable),
    weeks: window.length,
    label:
      Math.abs(deltaPct) < 3
        ? `In line with the ${window.length}-week average`
        : `${Math.abs(deltaPct)}% ${deltaPct > 0 ? 'above' : 'below'} the ${window.length}-week average`,
  }
}

/** The basis line. Rendered wherever a figure from this grid appears. */
export const RATE_BASIS =
  'All-in, port to port · includes origin terminal handling and documentation · excludes destination charges, duties and inland delivery'

export const RATE_DISCLAIMER =
  'Illustrative demo rates, not a quote. Ocean spot rates move weekly and are exposed to season, capacity and routing.'
