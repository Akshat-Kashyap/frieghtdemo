'use client'

import { Lock, ShieldCheck } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Panel, type Tone } from '@/components/ui/primitives'

/**
 * THE ACCOUNT-MODULE LAYOUT KIT
 * ══════════════════════════════════════════════════════════════════════════
 * Module-neutral. Nothing here knows about money, freight or a company
 * profile — it is the four shapes that the account modules (finance, business
 * profile, port information, HS finder, your profile) had each rebuilt for
 * themselves, slightly differently, which is exactly how a product stops
 * looking like one product.
 *
 * WHAT WAS DUPLICATED, and is now one thing:
 *   · a plate with a header, a body and a basis line — six copies in finance,
 *     six more written inline across business, ports, hs-codes and profile.
 *     Three of them cut the header joint as a bare 1px border, three as a
 *     border plus a highlight, so two panels sitting side by side on the same
 *     screen were lit from two different places;
 *   · the footnote strip under a panel — eight copies, four different tints;
 *   · the label/value row — four copies, now `DataRow` from the primitives;
 *   · the figure-with-a-label — three copies at three different type sizes.
 *
 * It physically lives in `components/finance/` because that is where five of
 * its callers already import it from and moving the file would churn work
 * another agent is holding open. Its proper home is `components/ui/`, and the
 * API is deliberately shaped so that move is a path change and nothing else.
 *
 * MATERIAL: every surface here obeys the scale in `app/globals.css`. A panel
 * is a plate at --elev-1, its header joint is a groove (dark line, lit pixel
 * under it) rather than a border, its basis strip is lit on its own top edge
 * because it sits BELOW the content, and readings sit in recesses because a
 * figure in a channel reads as measured and the same figure on a raised chip
 * reads as typed in by hand. Nothing here picks its own shadow.
 */

/* ══════════════════════════════════════════════════════════════════════════
   THE BASIS STRIP
   ══════════════════════════════════════════════════════════════════════════
   Almost every panel in these modules owes the reader a line saying what the
   figures above it are computed from. Making it part of the frame is what
   stops one panel quietly shipping without one.

   The light: this strip is UNDER the content, so the lit pixel of the joint
   falls inside it (an inset highlight) rather than outside. Cut the other way
   round it reads as a lid rather than a floor, which is the sort of thing you
   feel rather than see — and feel on all eight of them at once.
   ══════════════════════════════════════════════════════════════════════════ */

export function Basis({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'border-t border-hairline bg-raised-2/60 px-5 py-2.5 text-micro leading-relaxed text-text-muted',
        'shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.8)]',
        className,
      )}
    >
      {children}
    </p>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   THE RECORD PANEL
   ══════════════════════════════════════════════════════════════════════════ */

export function RecordPanel({
  icon,
  title,
  meta,
  action,
  footnote,
  children,
  className,
  bodyClassName,
  /** Emphasis for a panel carrying the problem — the one plate on the page
      that should find the eye. Raises it one step and tints its hairline. */
  emphasis,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  /** Small print on the right of the header — usually the basis or a count. */
  meta?: React.ReactNode
  action?: React.ReactNode
  /** Runs along the bottom of the panel, inside its border. */
  footnote?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  emphasis?: 'critical' | 'amber' | 'signal'
}) {
  return (
    <Panel
      className={cn(
        'overflow-hidden',
        // A plate that is the point of the page is lifted one step off the
        // ground rather than recoloured. Elevation is the emphasis; the tinted
        // hairline only says which kind of problem it is.
        emphasis === 'critical' && 'pw-elev-2 border-critical/35',
        emphasis === 'amber' && 'pw-elev-2 border-amber/35',
        emphasis === 'signal' && 'pw-elev-2 border-signal/35',
        className,
      )}
    >
      {/* The joint above the body: dark line, lit pixel beneath it. A bare
          border here is a line drawn on a picture of a plate. */}
      <header className="pw-groove-b flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline px-5 py-3.5">
        <h3 className="pw-plate-title flex min-w-0 items-center gap-2 text-panel leading-tight">
          {icon}
          <span className="min-w-0 truncate">{title}</span>
        </h3>
        {meta && <div className="min-w-0 text-micro text-text-faint">{meta}</div>}
        {action}
      </header>

      <div className={bodyClassName}>{children}</div>

      {footnote && <Basis>{footnote}</Basis>}
    </Panel>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   READINGS
   ══════════════════════════════════════════════════════════════════════════ */

export type FigureTone = 'amber' | 'signal' | 'critical' | 'route' | 'violet'

const FIGURE_TONE: Record<FigureTone, string> = {
  amber: 'text-amber',
  signal: 'text-signal',
  critical: 'text-critical',
  route: 'text-route',
  violet: 'text-violet',
}

export interface FigureSpec {
  /** What is being measured. Stencilled, so keep it short. */
  label: string
  /** Already formatted through `lib/format`. */
  value: React.ReactNode
  /** The basis under the figure. Wraps — it is usually a full sentence. */
  sub?: React.ReactNode
  /** The one figure in the group that is the answer to the question. */
  strong?: boolean
  /** Colour only when the figure *is* a state. Default ink otherwise. */
  tone?: FigureTone
  /** Stable key where two readings share a label. */
  id?: string
}

/**
 * One reading. Stencilled name, mono figure, basis underneath.
 *
 * The figure is `.pw-readout` — mono, tabular, tracked in — because every
 * number in this product is a machine reading and digits that shift width
 * between two cards is the fastest way to look unfinished.
 */
export function Figure({ label, value, sub, strong, tone }: FigureSpec) {
  return (
    <div className="min-w-0">
      <dt className="pw-stencil truncate">{label}</dt>
      <dd
        className={cn(
          'pw-readout mt-1.5',
          strong ? 'text-[19px] font-semibold leading-none tracking-[-0.02em]' : 'text-data',
          tone ? FIGURE_TONE[tone] : 'text-text',
        )}
      >
        {value}
      </dd>
      {sub && <p className="mt-1 text-micro leading-snug text-text-faint">{sub}</p>}
    </div>
  )
}

/**
 * A group of readings in a milled channel.
 *
 * The recess is the whole point and it replaces five hand-rolled
 * `<dl className="grid gap-4 px-5 py-4 …">` blocks that were four different
 * paddings on four different tabs. A reading sunk into the plate reads as
 * taken by the instrument; the same figure floating on the plate face reads
 * as something a person typed in.
 *
 * Deliberately NOT `InstrumentRail` from the primitives, which is the right
 * component when the qualifier is a word or two: it truncates its hint on one
 * line, and the hints here are the basis sentences — "Payable to the shipping
 * lines", "of ₹60,00,000 limit · 30-day terms" — which a truncation would
 * turn into a figure with no stated basis. Losing the basis is a content
 * regression, not a layout one.
 */
export function FigureRail({
  figures,
  columns = 3,
  className,
}: {
  figures: readonly FigureSpec[]
  columns?: 2 | 3 | 4
  className?: string
}) {
  if (figures.length === 0) return null

  return (
    <div className={cn('px-5 py-4', className)}>
      <dl
        className={cn(
          'pw-rail grid gap-x-5 gap-y-4 rounded-card px-4 py-3.5',
          // One column at 360px, always. A channel that scrolls sideways on a
          // phone hides the figure the reader came for.
          columns === 2 && 'sm:grid-cols-2',
          columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
          columns === 4 && 'sm:grid-cols-2 xl:grid-cols-4',
        )}
      >
        {figures.map((figure) => (
          <Figure key={figure.id ?? figure.label} {...figure} />
        ))}
      </dl>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB INTRODUCTION
   Every tab in these modules opens by saying what it is. Finance and
   verification vocabulary is the part of freight customers are least sure of,
   and a tab that opens on a table assumes a fluency the reader may not have.
   ══════════════════════════════════════════════════════════════════════════ */

export function TabIntro({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('max-w-3xl text-data leading-relaxed text-text-muted', className)}>{children}</p>
}

/* ══════════════════════════════════════════════════════════════════════════
   THE ROLE GATE NOTICE
   ══════════════════════════════════════════════════════════════════════════
   Rendered wherever a capability decides what the viewer may do. It was
   written out twice — once on the finance module frame, once on the business
   profile — with two different border weights and two different icons for the
   same two states.

   It is a sheet rather than a plate: it is a note ON the page, not an object
   the page is built from, and giving it a cast would make an advisory band
   sit higher than the data it is advising about.
   ══════════════════════════════════════════════════════════════════════════ */

export function GateNotice({
  allowed,
  children,
  className,
}: {
  allowed: boolean
  children: React.ReactNode
  className?: string
}) {
  const Icon = allowed ? ShieldCheck : Lock

  return (
    <div
      className={cn(
        // min-h matches the <Skeleton /> every caller holds the space with, so
        // rehydration never nudges the panel below it down the page.
        'pw-card flex min-h-16 items-start gap-3 px-4 py-3',
        allowed ? 'border-signal/25 bg-signal/6' : 'border-amber/25 bg-amber/6',
        className,
      )}
    >
      <Icon
        className={cn('mt-0.5 h-4 w-4 shrink-0', allowed ? 'text-signal' : 'text-amber')}
        aria-hidden
      />
      <p className="text-data leading-relaxed text-text-muted">{children}</p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   BULLETED NOTES
   ══════════════════════════════════════════════════════════════════════════
   Seven lists across these modules each drew their own bullet as
   `<span className="mt-[7px] h-1 w-1 rounded-full bg-…" />` — a flat dot,
   which against a lit plate reads as a full stop rather than a mark. `.pw-stud`
   is the same dot with the light on it, so it reads as seated in the surface.
   ══════════════════════════════════════════════════════════════════════════ */

export function NoteList({
  items,
  tone = 'neutral',
  className,
}: {
  items: readonly string[]
  tone?: Extract<Tone, 'neutral' | 'signal' | 'amber' | 'critical' | 'violet'>
  className?: string
}) {
  const dot = {
    neutral: 'bg-text-faint',
    signal: 'bg-signal',
    amber: 'bg-amber',
    critical: 'bg-critical',
    violet: 'bg-violet',
  }[tone]

  return (
    <ul className={cn('flex flex-col gap-2.5', className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-[12px] leading-relaxed text-text-muted">
          <span aria-hidden className={cn('pw-stud mt-[7px] h-1 w-1 shrink-0', dot)} />
          {item}
        </li>
      ))}
    </ul>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   A QUIET SECTION HEADING INSIDE A SHEET
   ══════════════════════════════════════════════════════════════════════════
   `text-[11px] font-semibold uppercase tracking-[0.12em] text-text-faint` was
   written out fourteen times across these files, at three different sizes and
   two different trackings. It is `.pw-stencil`, and a stencil is what it was
   always trying to be: painted-on identification, not a heading competing with
   the plate title above it.
   ══════════════════════════════════════════════════════════════════════════ */

export function CardHeading({
  icon,
  children,
  className,
}: {
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <h3 className={cn('pw-stencil flex items-center gap-2', className)}>
      {icon}
      {children}
    </h3>
  )
}
