'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, Minus, Plane, Ship, TrendingDown, TrendingUp, Truck } from 'lucide-react'

import { useDemoClock } from '@/hooks/use-demo-clock'
import { countdown, relativeToDemoNow } from '@/lib/demo-clock'
import { formatDateShort, money, moneySigned, percentSigned, type Currency } from '@/lib/format'
import {
  BookingLifecycle,
  ContainerLifecycle,
  DocumentLifecycle,
  EnquiryLifecycle,
  ExceptionLifecycle,
  JobLifecycle,
  QuoteLifecycle,
  SEVERITY_META,
} from '@/lib/lifecycle'
import { cn } from '@/lib/utils'
import type {
  BookingState,
  ContainerStatus,
  DocStatus,
  EnquiryStage,
  ExceptionStatus,
  JobStatus,
  QuoteStatus,
  Severity,
  TransportMode,
} from '@/types'

import { StatusBadge, type Tone } from './primitives'

/**
 * FREIGHT-SPECIFIC PRIMITIVES
 * ══════════════════════════════════════════════════════════════════════════
 * Domain components that know the lifecycle machines. Because every status
 * badge reads its label and tone from lib/lifecycle.ts, a status can never
 * render one colour on the dashboard and a different one on the shipment.
 */

/* ══════════════════════════════════════════════════════════════════════════
   STATUS BADGES — one per machine, all reading from the same source
   ══════════════════════════════════════════════════════════════════════════ */

export function JobStatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  return (
    <StatusBadge tone={JobLifecycle.toneOf(status)} pulse={status === 'IN_TRANSIT'} className={className}>
      {JobLifecycle.labelOf(status)}
    </StatusBadge>
  )
}

export function EnquiryStageBadge({ stage, className }: { stage: EnquiryStage; className?: string }) {
  return (
    <StatusBadge tone={EnquiryLifecycle.toneOf(stage)} className={className}>
      {EnquiryLifecycle.labelOf(stage)}
    </StatusBadge>
  )
}

export function QuoteStatusBadge({ status, className }: { status: QuoteStatus; className?: string }) {
  return (
    <StatusBadge tone={QuoteLifecycle.toneOf(status)} className={className}>
      {QuoteLifecycle.labelOf(status)}
    </StatusBadge>
  )
}

export function DocStatusBadge({ status, className }: { status: DocStatus; className?: string }) {
  return (
    <StatusBadge tone={DocumentLifecycle.toneOf(status)} className={className}>
      {DocumentLifecycle.labelOf(status)}
    </StatusBadge>
  )
}

export function BookingStateBadge({ state, className }: { state: BookingState; className?: string }) {
  return (
    <StatusBadge tone={BookingLifecycle.toneOf(state)} className={className}>
      {BookingLifecycle.labelOf(state)}
    </StatusBadge>
  )
}

export function ContainerStatusBadge({ status, className }: { status: ContainerStatus; className?: string }) {
  return (
    <StatusBadge tone={ContainerLifecycle.toneOf(status)} className={className}>
      {ContainerLifecycle.labelOf(status)}
    </StatusBadge>
  )
}

export function ExceptionStatusBadge({ status, className }: { status: ExceptionStatus; className?: string }) {
  return (
    <StatusBadge tone={ExceptionLifecycle.toneOf(status)} className={className}>
      {ExceptionLifecycle.labelOf(status)}
    </StatusBadge>
  )
}

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const meta = SEVERITY_META[severity]
  return (
    <StatusBadge tone={meta.tone} pulse={severity === 'CRITICAL'} className={className}>
      {meta.label}
    </StatusBadge>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   MODE
   ══════════════════════════════════════════════════════════════════════════ */

const MODE_ICON: Record<TransportMode, typeof Ship> = {
  OCEAN_FCL: Ship,
  OCEAN_LCL: Ship,
  AIR: Plane,
  DOMESTIC_FTL: Truck,
  DOMESTIC_LTL: Truck,
}

const MODE_TONE: Record<TransportMode, Tone> = {
  OCEAN_FCL: 'route',
  OCEAN_LCL: 'route',
  AIR: 'violet',
  DOMESTIC_FTL: 'signal',
  DOMESTIC_LTL: 'signal',
}

export function ModeIcon({ mode, className }: { mode: TransportMode; className?: string }) {
  const Icon = MODE_ICON[mode]
  return <Icon className={cn('h-3.5 w-3.5', className)} aria-hidden />
}

export function ModeBadge({ mode, label, className }: { mode: TransportMode; label: string; className?: string }) {
  return (
    <StatusBadge tone={MODE_TONE[mode]} dot={false} className={cn('gap-1.5', className)}>
      <ModeIcon mode={mode} />
      {label}
    </StatusBadge>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   LANE
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The mark between two places. A node, a dashed run and an arrowhead — the way
 * a leg is drawn on a routing sheet, and the same visual language as the route
 * arcs on the globe and the dashed lanes in the SVG previews.
 *
 * It replaces a stock arrow glyph, which is the single most-repeated shape in
 * generated UI and said nothing about what this product is. Drawn rather than
 * imported so it stays crisp at 8px, where an icon-font arrow goes soft.
 */
function RouteMark({ size }: { size: 'sm' | 'md' }) {
  return (
    <svg
      viewBox="0 0 22 8"
      fill="none"
      aria-hidden
      // Scaled uniformly — the node has to stay a circle, and a stretched
      // viewBox turns it into an ellipse at the smaller size.
      className={cn('shrink-0 text-route', size === 'sm' ? 'h-[6px] w-[17px]' : 'h-2 w-[22px]')}
    >
      <circle cx="2" cy="4" r="1.5" fill="currentColor" opacity="0.6" />
      <path d="M4.8 4h10.6" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2.2" opacity="0.5" />
      <path
        d="M15.8 1.6 19.4 4l-3.6 2.4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Origin → destination.
 *
 * The names stay in the sans face: these are places, not figures, and setting
 * "Nhava Sheva" in mono would say it is a code when it is not. The mark between
 * them is toned `route` because that is what the colour means everywhere else —
 * a movement between two points.
 */
export function LanePill({
  origin,
  destination,
  className,
  size = 'md',
}: {
  origin: string
  destination: string
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <span
      className={cn(
        // Wraps between the two places rather than nowrap across the pair:
        // "Nhava Sheva → Rotterdam" is wider than a 360px row on its own, and
        // a lane that pushes the page sideways is worse than a lane set on two
        // lines. The mark stays with the origin, which is how a routing sheet
        // breaks a leg across a line too.
        'inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 font-medium tracking-[-0.005em] text-text',
        size === 'sm' ? 'text-micro' : 'text-data',
        className,
      )}
    >
      {origin}
      <RouteMark size={size} />
      {destination}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   COUNTDOWN — the cutoff rail's atom
   ══════════════════════════════════════════════════════════════════════════ */

const BAND_TONE: Record<ReturnType<typeof countdown>['band'], Tone> = {
  overdue: 'critical',
  critical: 'critical',
  urgent: 'amber',
  soon: 'route',
  clear: 'neutral',
}

/**
 * A ticking deadline.
 *
 * `live` drives a 1Hz re-render, so it is opt-in: a dense board of forty rows
 * each ticking per second is wasted work, but the headline cutoff on the
 * control tower genuinely needs to move.
 */
export function CountdownPill({
  deadline,
  live = false,
  showIcon = true,
  className,
}: {
  deadline: string
  live?: boolean
  showIcon?: boolean
  className?: string
}) {
  const now = useDemoClock(live ? 1000 : 60_000)
  const cd = countdown(deadline, now)
  const tone = BAND_TONE[cd.band]
  const alarming = cd.band === 'overdue' || cd.band === 'critical'

  return (
    <StatusBadge
      tone={tone}
      dot={false}
      pulse={false}
      // `tabular-nums` is not decoration on a ticking figure: without it the
      // pill changes width every time a 1 rolls past and the row jitters.
      className={cn(
        'gap-1.5 tnum tabular-nums tracking-[0.04em]',
        // A missed cutoff is the one thing on the screen that has to find the
        // eye without being looked for. A soft halo in its own colour does
        // that on a board of forty rows where a red fill alone does not — and
        // it is a halo, not a second fill, so the label stays as readable as
        // every other badge in the table.
        alarming && 'shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.5),0_0_0_3px_color-mix(in_oklab,var(--color-critical)_11%,transparent)]',
        className,
      )}
    >
      {showIcon && cd.band !== 'clear' && <AlertTriangle className="h-3 w-3" aria-hidden />}
      {cd.label}
    </StatusBadge>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   MONEY
   ══════════════════════════════════════════════════════════════════════════ */

/** Right-aligned, tabular, and coloured only when the sign carries meaning. */
export function MoneyCell({
  amount,
  currency = 'INR',
  signed = false,
  className,
}: {
  amount: number
  currency?: Currency
  signed?: boolean
  className?: string
}) {
  const tone = !signed ? '' : amount > 0 ? 'text-signal' : amount < 0 ? 'text-critical' : 'text-text-muted'
  return (
    <span className={cn('pw-readout tnum tabular-nums whitespace-nowrap text-data', tone, className)}>
      {signed ? moneySigned(amount, currency) : money(amount, currency)}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   RATE MOVEMENT
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Week-on-week movement on a rate cell.
 *
 * Firming is amber and softening is signal, which looks inverted until you
 * remember who is reading: this is the buyer's screen, and a rate going up is
 * the thing that costs them money.
 *
 * It lives here, beside the status badges, for the same reason they do. The
 * home dashboard, the rate terminal and the profile all show the same watched
 * lane, and three private copies of this component had already drifted — one
 * printed JS's ASCII hyphen for a fall while the others printed a typographic
 * minus at one decimal, and one dropped the icon entirely when a lane was
 * stable. An arrow that means "good" on one screen and "bad" on the next is
 * worse than no arrow at all; the same is true of a figure that is typeset
 * two ways on two screens.
 *
 * Typed structurally rather than against `RateCell` so a design primitive
 * does not reach into `data/`.
 */
export function RateTrendMark({
  cell,
  caption,
  className,
}: {
  cell: { deltaPct: number | null; trend: 'FIRMING' | 'SOFTENING' | 'STABLE' }
  /** Trailing words, e.g. "on last week". Omitted where space is tight. */
  caption?: string
  className?: string
}) {
  if (cell.deltaPct === null) return null

  const Icon = cell.trend === 'FIRMING' ? TrendingUp : cell.trend === 'SOFTENING' ? TrendingDown : Minus
  const label = cell.trend === 'FIRMING' ? 'Firming' : cell.trend === 'SOFTENING' ? 'Softening' : 'Stable'
  const move = percentSigned(cell.deltaPct)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-micro font-medium',
        cell.trend === 'FIRMING' ? 'text-amber' : cell.trend === 'SOFTENING' ? 'text-signal' : 'text-text-faint',
        className,
      )}
      title={`${label} — ${move} on the previous week`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span className="pw-readout tnum tabular-nums text-micro">{move}</span>
      {caption && <span className="font-sans text-text-faint">{caption}</span>}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   PROGRESS RAIL — the customer-facing shipment journey
   ══════════════════════════════════════════════════════════════════════════ */

/** What a screen reader is told about each leg. */
const LEG_STATE = {
  done: 'completed',
  active: 'current leg',
  todo: 'not started',
} as const

/**
 * The shipment journey, and the thing a customer looks at first.
 *
 * It is built as a machined channel rather than a row of dots joined by a
 * line, and every part of that is doing work:
 *
 *  · each segment is a RECESS with draft marks running the whole way along it,
 *    filled and empty alike, so the completed length reads as liquid rising
 *    behind a graduated window rather than a coloured rectangle sitting on a
 *    grey one. Ticks only under the empty part is the giveaway — real gauges
 *    graduate the whole scale;
 *  · the nodes are seated *in* the channel and there are three of them, not
 *    two states of one: a drilled SOCKET for a leg not yet run (shade at the
 *    top lip, catch at the bottom — the light run backwards, which is what
 *    makes it read as a hole and not a switched-off dot), a filled STUD for a
 *    leg that has run, and a lit LAMP with a halo for where the cargo is now;
 *  · the fill carries a hairline of light on its own top edge, because it is
 *    a surface too and the light source does not stop at the channel wall.
 *
 * The fill animates on `scaleX` with a stagger down the rail, so the journey
 * draws itself left to right once, in about a third of a second, and then
 * holds still. The pulse on the live node is rendered unconditionally and
 * stopped by the reduced-motion rule in globals.css — branching the markup on
 * a client-only media query is how a hydration mismatch gets shipped to
 * exactly the users who asked for less motion.
 *
 * Accessibility: in `compact` there is no visible text at all, so every leg
 * carries an off-screen name and state. A row of unlabelled dots is not a
 * progress indicator to anyone using a screen reader.
 */
export function ProgressRail({
  steps,
  currentIndex,
  className,
  compact = false,
}: {
  steps: readonly string[]
  currentIndex: number
  className?: string
  compact?: boolean
}) {
  const shouldReduce = useReducedMotion()

  return (
    <ol className={cn('flex items-start gap-0', className)} aria-label="Shipment progress">
      {steps.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        const state = active ? LEG_STATE.active : done ? LEG_STATE.done : LEG_STATE.todo

        return (
          <li key={step} className={cn('flex min-w-0 items-start', i < steps.length - 1 && 'flex-1')}>
            <div className="flex min-w-0 flex-col items-center gap-2">
              <span
                className={cn(
                  'relative flex h-3 w-3 shrink-0 items-center justify-center transition-colors',
                  done && 'pw-stud text-signal',
                  active && 'pw-lamp text-signal',
                  !done && !active && 'pw-socket',
                )}
                aria-current={active ? 'step' : undefined}
              >
                {active && <span className="pw-pulse absolute inset-0 rounded-full bg-signal/40" aria-hidden />}
              </span>

              {compact ? (
                <span className="sr-only">
                  {step} — {state}
                </span>
              ) : (
                <span
                  // Not `whitespace-nowrap`: six leg names set on one
                  // unbreakable line is wider than a phone, and the rail would
                  // take the page with it. A two-word leg wraps under itself
                  // and the column stays inside the viewport.
                  className={cn(
                    'text-center font-display text-[10px] uppercase leading-[1.25] tracking-[0.06em]',
                    active
                      ? 'font-semibold text-text'
                      : done
                        ? 'font-medium text-text-muted'
                        : 'font-medium text-text-faint',
                  )}
                >
                  {step}
                  <span className="sr-only"> — {state}</span>
                </span>
              )}
            </div>

            {i < steps.length - 1 && (
              // 3px lines the 6px channel up with the centre of a 12px node.
              <div className="pw-rail relative mx-1.5 mt-[3px] h-1.5 flex-1 overflow-hidden rounded-full">
                {done && (
                  <motion.div
                    className="h-full w-full origin-left rounded-full bg-signal shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.28)]"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={
                      shouldReduce
                        ? { duration: 0 }
                        : { duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }
                    }
                  />
                )}
                <span aria-hidden className="pw-ticks pointer-events-none absolute inset-0 opacity-40" />
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   PARTY & TIME
   ══════════════════════════════════════════════════════════════════════════ */

export function PartyChip({ name, initials, className }: { name: string; initials?: string; className?: string }) {
  const derived = initials ?? name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
  return (
    // The name already carries `truncate`, but truncation inside a flex row
    // only fires once the item is allowed to be narrower than its text — hence
    // `min-w-0` on the name and a ceiling on the chip itself. Without them the
    // ellipsis never appears and a long party name pushes the row instead.
    <span className={cn('inline-flex min-w-0 max-w-full items-center gap-1.5', className)}>
      {/* The disc is a recess: initials stamped into the plate, not a sticker
          stuck on it. */}
      <span className="pw-rail flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-medium text-text-muted">
        {derived}
      </span>
      <span className="min-w-0 truncate text-data text-text-muted">{name}</span>
    </span>
  )
}

/** "3d ago" — always relative to the demo clock, never the wall clock. */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  return (
    <time
      dateTime={iso}
      className={cn('pw-readout whitespace-nowrap text-micro tabular-nums text-text-faint', className)}
    >
      {relativeToDemoNow(iso)}
    </time>
  )
}

export function DateStamp({ iso, className }: { iso: string; className?: string }) {
  return (
    <time dateTime={iso} className={cn('pw-readout tnum tabular-nums whitespace-nowrap text-data', className)}>
      {formatDateShort(iso)}
    </time>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   RISK
   ══════════════════════════════════════════════════════════════════════════ */

export function RiskDot({ level, className }: { level: 'CLEAR' | 'WATCH' | 'AT_RISK'; className?: string }) {
  const map = {
    CLEAR: { tone: 'text-signal', label: 'Clear' },
    WATCH: { tone: 'text-amber', label: 'Watch' },
    AT_RISK: { tone: 'text-critical', label: 'At risk' },
  } as const
  const { tone, label } = map[level]

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} title={label}>
      {/* A lamp, not a bullet. The halo is what makes a 6px indicator legible
          against a plate at a glance, and the dome highlight is what makes it
          an indicator rather than a full stop. `.pw-lamp` takes its fill and
          its halo from `currentColor`, so the state is set once. */}
      <span aria-hidden className={cn('pw-lamp h-1.5 w-1.5 shrink-0', tone)} />
      <span className="sr-only">{label}</span>
    </span>
  )
}
