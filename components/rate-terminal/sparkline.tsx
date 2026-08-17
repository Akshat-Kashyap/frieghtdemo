'use client'

import { useCallback, useId, useMemo, useRef, useState } from 'react'

import { CURRENT_WEEK_INDEX, RATE_WEEKS } from '@/data/rate-grid'
import { formatDateShort, moneyUsd, percentSigned } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * THE TWELVE-WEEK RATE LINE — A MEASUREMENT, NOT A DECORATION
 * ══════════════════════════════════════════════════════════════════════════
 * The predecessor was a pretty green squiggle. It had no axis, no reference,
 * no way to interrogate a point and no idea which way was expensive, which
 * meant it could not answer the only question a buyer opens a rate screen
 * with: *is this a good week to book?* A shape with no scale is a texture.
 *
 * Four things were added, and each one is load-bearing:
 *
 *  1 · **A reference line.** The eight-week average, dashed, drawn across the
 *      whole plot. A price means nothing on its own — "USD 4,240" is only
 *      information once you can see it sitting below the line. Eight weeks
 *      because that is the window `rateInContext()` in `data/rate-grid.ts`
 *      already reasons over, and two windows disagreeing about what "the
 *      average" is would be worse than having none.
 *
 *  2 · **A readout.** The figure under the cursor, its week, and what it did
 *      against the week before — printed above the plot in a fixed row rather
 *      than floating in a tooltip. Fixed, because a 72px plot has nowhere to
 *      put a floating label at 360px without clipping it, and because a
 *      readout that is always present is an instrument whereas one that
 *      appears on hover is a garnish. With no cursor it reads the latest week,
 *      so the component always says something true.
 *
 *  3 · **An axis.** Twelve ticks under the plot, one per point, the current
 *      week's taller — plus the span in words at either end. That is what
 *      turns "a line" into "twelve weekly observations".
 *
 *  4 · **Direction is colour.** Rising is amber and falling is green, which
 *      looks inverted until you remember whose screen this is: the buyer's. A
 *      rate going up is the thing that costs them money. It matches
 *      `RateTrendMark`, so a wall of these scans the same way as the arrows
 *      beside them.
 *
 * ── Why the markers are HTML and the lines are SVG ────────────────────────
 * The plot stretches to whatever width its container is, which means
 * `preserveAspectRatio="none"`, which means the horizontal scale is not the
 * vertical one. Straight lines survive that (with `vector-effect`, a 1px
 * stroke stays 1px); circles do not — they come out as ellipses, and a
 * squashed dot on every card is exactly the sort of small wrongness that adds
 * up to "generated". So the paths are SVG and every round thing is an
 * absolutely-positioned HTML element placed in percentages against the same
 * box. Both layers read from one `coords` array, so they cannot drift apart.
 *
 * ── Interaction ───────────────────────────────────────────────────────────
 * Pointer *and* keyboard. The plot is focusable and the arrow keys walk the
 * series, because a hover-only readout is a measurement that only exists for
 * people with a mouse. Nothing here animates position: the crosshair tracks
 * the pointer, and a tracked element that eases into place lags the finger
 * and feels broken. Only opacity fades, which the reduced-motion rule in
 * globals.css already flattens.
 */

/* ══════════════════════════════════════════════════════════════════════════
   THE WEEK SCALE
   ══════════════════════════════════════════════════════════════════════════
   `RateLaneRow.history` is twelve 40HC observations, oldest first, ending on
   the current week — the contract stated in `data/rate-grid.ts`. So the label
   for any point is derivable: count back from the current week's start.

   Resolved once at module scope from the pinned demo clock. Never
   `Date.now()`: a reload has to draw the identical axis or the whole "this is
   a fixed, checkable dataset" argument of the demo falls over.
   ══════════════════════════════════════════════════════════════════════════ */

const WEEK_MS = 7 * 86_400_000
const CURRENT_WEEK_START_MS = new Date(RATE_WEEKS[CURRENT_WEEK_INDEX]!.startsAt).getTime()

/** The window the reference line averages. Matches `rateInContext()`. */
export const AVERAGE_WINDOW = 8

/** "12 Jul" for the point `weeksBack` weeks before the current week. */
function weekLabel(weeksBack: number): string {
  return formatDateShort(new Date(CURRENT_WEEK_START_MS - weeksBack * WEEK_MS).toISOString())
}

/* ══════════════════════════════════════════════════════════════════════════
   GEOMETRY
   ══════════════════════════════════════════════════════════════════════════ */

/** The viewBox is unitless — the plot stretches, so only the ratios matter. */
const VB_W = 100
const VB_H = 100
/** Head- and foot-room so the line never touches the edge of its own box. */
const PAD = 8

interface Plot {
  coords: Array<{ x: number; y: number; value: number; leftPct: number; topPct: number }>
  line: string
  area: string
  min: number
  max: number
  average: number
  averageTopPct: number
  /** Overall movement across the whole series, as a rounded percentage. */
  changePct: number
  rising: boolean
}

function buildPlot(points: number[]): Plot {
  const min = Math.min(...points)
  const max = Math.max(...points)
  // A perfectly flat series has no span to divide by; pin it to the middle
  // rather than dividing by zero and drawing NaNs into the path.
  const span = max - min || 1
  const usable = VB_H - PAD * 2

  const coords = points.map((value, i) => {
    const x = (i / (points.length - 1)) * VB_W
    const y = PAD + (1 - (value - min) / span) * usable
    return { x, y, value, leftPct: (x / VB_W) * 100, topPct: (y / VB_H) * 100 }
  })

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ')
  const area = `${line} L${VB_W},${VB_H} L0,${VB_H} Z`

  const window = points.slice(-AVERAGE_WINDOW)
  const average = window.reduce((sum, v) => sum + v, 0) / window.length
  const averageY = PAD + (1 - (average - min) / span) * usable

  const first = points[0]!
  const last = points[points.length - 1]!
  const changePct = Math.round(((last - first) / first) * 100)

  return {
    coords,
    line,
    area,
    min,
    max,
    average: Math.round(average),
    averageTopPct: (averageY / VB_H) * 100,
    changePct,
    rising: last > first,
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   THE COMPONENT
   ══════════════════════════════════════════════════════════════════════════ */

export function RateSparkline({
  points,
  height = 72,
  /**
   * Plot only — no readout, no axis, no caption. For the recessed strip inside
   * a `StatPlate`, which is 48px tall and has room for the shape and nothing
   * else. The figures are still reachable: they are in the accessible name.
   */
  compact = false,
  className,
}: {
  /** Oldest first, ending on the current week. */
  points: number[]
  height?: number
  compact?: boolean
  className?: string
}) {
  const id = useId()
  const plotRef = useRef<HTMLDivElement>(null)
  const [cursor, setCursor] = useState<number | null>(null)

  const plot = useMemo(() => (points.length >= 2 ? buildPlot(points) : null), [points])

  /* Nearest point to the pointer, not the one to its left: on a twelve-point
     series the gaps are wide, and rounding down makes the crosshair feel like
     it is dragging half a week behind the cursor. */
  const track = useCallback(
    (clientX: number) => {
      const el = plotRef.current
      if (!el || points.length < 2) return
      const box = el.getBoundingClientRect()
      if (box.width === 0) return
      const ratio = (clientX - box.left) / box.width
      const index = Math.round(ratio * (points.length - 1))
      setCursor(Math.min(points.length - 1, Math.max(0, index)))
    },
    [points.length],
  )

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const last = points.length - 1
      const from = cursor ?? last
      if (event.key === 'ArrowLeft') setCursor(Math.max(0, from - 1))
      else if (event.key === 'ArrowRight') setCursor(Math.min(last, from + 1))
      else if (event.key === 'Home') setCursor(0)
      else if (event.key === 'End') setCursor(last)
      else if (event.key === 'Escape') setCursor(null)
      else return
      // Only once a key we handle has landed — swallowing every keystroke
      // would take the page's own scrolling away from the keyboard.
      event.preventDefault()
    },
    [cursor, points.length],
  )

  if (!plot) return null

  const last = plot.coords.length - 1
  const active = cursor ?? last
  const activePoint = plot.coords[active]!
  const previous = active > 0 ? plot.coords[active - 1]!.value : null
  const activeDeltaPct =
    previous === null ? null : Number((((activePoint.value - previous) / previous) * 100).toFixed(1))

  /* One tone for the whole component. The buyer's reading: a lane that has
     firmed over twelve weeks is the one costing them money. */
  const stroke = plot.rising ? 'var(--color-amber)' : 'var(--color-signal)'
  const toneText = plot.rising ? 'text-amber' : 'text-signal'

  const summary =
    `${points.length}-week rate history. ` +
    `Now ${moneyUsd(activePoint.value)}, ${plot.changePct >= 0 ? 'up' : 'down'} ` +
    `${Math.abs(plot.changePct)} percent over the period. ` +
    `Low ${moneyUsd(plot.min)}, high ${moneyUsd(plot.max)}, ` +
    `${AVERAGE_WINDOW}-week average ${moneyUsd(plot.average)}.`

  return (
    <figure className={cn('m-0 min-w-0', className)}>
      {/* ── The readout ──────────────────────────────────────────────────
          Above the plot and always populated, so the component reads as an
          instrument with a display rather than a chart with a tooltip. */}
      {!compact && (
        <div
          className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
          aria-live="polite"
        >
          <span className="pw-readout text-data font-medium text-text">{moneyUsd(activePoint.value)}</span>
          <span className="flex items-baseline gap-1.5 text-micro text-text-faint">
            <span className="pw-readout">
              {active === last ? 'this week' : `w/c ${weekLabel(last - active)}`}
            </span>
            {activeDeltaPct !== null && (
              <span
                className={cn(
                  'pw-readout font-medium',
                  activeDeltaPct > 0 ? 'text-amber' : activeDeltaPct < 0 ? 'text-signal' : 'text-text-faint',
                )}
              >
                {percentSigned(activeDeltaPct)}
              </span>
            )}
          </span>
        </div>
      )}

      {/* ── The plot ─────────────────────────────────────────────────────
          Focusable and arrow-key driven. `touch-action: pan-y` so dragging
          across the plot on a phone still scrolls the page vertically while
          we read the horizontal position. */}
      <div
        ref={plotRef}
        role="img"
        aria-label={summary}
        tabIndex={compact ? -1 : 0}
        onPointerMove={compact ? undefined : (e) => track(e.clientX)}
        onPointerLeave={compact ? undefined : () => setCursor(null)}
        onBlur={compact ? undefined : () => setCursor(null)}
        onKeyDown={compact ? undefined : onKeyDown}
        className={cn('relative w-full touch-pan-y select-none rounded-chip', !compact && 'cursor-crosshair')}
        style={{ height }}
      >
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          <defs>
            <linearGradient id={`pw-spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>

          <path d={plot.area} fill={`url(#pw-spark-${id})`} />

          {/* The reference line, under the series so the series always wins
              the overlap. Dashed because it is a construction line, not an
              observation — the same convention as a draft mark on a hull. */}
          <line
            x1="0"
            x2={VB_W}
            y1={(plot.averageTopPct / 100) * VB_H}
            y2={(plot.averageTopPct / 100) * VB_H}
            stroke="var(--color-text-faint)"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.5"
            vectorEffect="non-scaling-stroke"
          />

          <path
            d={plot.line}
            fill="none"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* The crosshair. Full height so it reads as a measuring line
              dropped onto the series rather than a highlight on it. */}
          {cursor !== null && (
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1="0"
              y2={VB_H}
              stroke="var(--color-text-muted)"
              strokeWidth="1"
              opacity="0.35"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* ── Round things live here ───────────────────────────────────
            HTML, positioned in percentages, so they stay circular however
            wide the plot is stretched. */}
        <span
          aria-hidden
          className="pw-lamp absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${plot.coords[last]!.leftPct}%`,
            top: `${plot.coords[last]!.topPct}%`,
            color: stroke,
          }}
        />

        {cursor !== null && cursor !== last && (
          <span
            aria-hidden
            className="pw-stud absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${activePoint.leftPct}%`, top: `${activePoint.topPct}%`, color: stroke }}
          />
        )}

        {/* The reference line earns a label or it is just a dashed line. Sat
            on the plate's own face at 88% so it stays legible where the
            series runs underneath it. */}
        {!compact && (
          <span
            aria-hidden
            className="pw-readout pointer-events-none absolute right-0 -translate-y-1/2 rounded-[3px] bg-surface/88 px-1 text-[9px] leading-[1.4] text-text-faint"
            style={{ top: `${plot.averageTopPct}%` }}
          >
            {AVERAGE_WINDOW}-wk avg
          </span>
        )}
      </div>

      {/* ── The axis ─────────────────────────────────────────────────────
          One tick per observation, the current week's taller and darker. A
          line without a scale is a texture; twelve ticks are what say
          "twelve weekly readings". */}
      {!compact && (
        <>
          <div aria-hidden className="mt-1 flex h-1.5 items-end justify-between">
            {plot.coords.map((c, i) => (
              <span
                key={c.x}
                className={cn(
                  'w-px rounded-full',
                  i === last ? 'h-1.5 bg-hairline-strong' : 'h-1 bg-hairline',
                  cursor === i && 'h-1.5 bg-text-muted',
                )}
              />
            ))}
          </div>

          {/* Two scales, one per line. The vertical one first, because the
              question a rate buyer asks of a shape is "how high is high" —
              and a chart whose y-axis is left to the imagination is the
              decoration this component was rewritten to stop being. */}
          <figcaption className="mt-1.5 flex flex-col gap-0.5 text-micro text-text-faint">
            <span className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="pw-readout">
                low {moneyUsd(plot.min)} · high {moneyUsd(plot.max)}
              </span>
              <span className="pw-readout">
                avg {moneyUsd(plot.average)} · {AVERAGE_WINDOW} wks
              </span>
            </span>
            <span className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="pw-readout">w/c {weekLabel(last)}</span>
              <span className={cn('pw-readout font-medium', toneText)}>
                {plot.changePct >= 0 ? '+' : '−'}
                {Math.abs(plot.changePct)}% over {points.length} weeks
              </span>
              <span className="pw-readout">this week</span>
            </span>
          </figcaption>
        </>
      )}
    </figure>
  )
}
