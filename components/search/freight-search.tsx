'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeftRight, CalendarDays, Loader2, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { DEMO } from '@/data/copy'
import { generateIndicativeOptions } from '@/lib/indicative-options'
import { ROUTE_COPY, modeGroup, servesMode, type ModeGroup } from '@/lib/mode-locations'
import { cn } from '@/lib/utils'
import { useIntakeStore } from '@/store/intake-store'
import type { IndicativeOption, TransportMode } from '@/types'

import { CargoField } from './cargo-field'
import { RequestDetailsDrawer } from './request-details-drawer'
import { LocationField } from './location-field'

/**
 * THE FREIGHT SEARCH BAR
 * ══════════════════════════════════════════════════════════════════════════
 * The first thing on the page and the first thing you can do with it.
 *
 * Materially it is glass, and it is glass for a reason rather than for an
 * effect: it sits half on the harbour footage, so you genuinely see through
 * it to what is behind. Everything inside it is one of two things — a recess
 * you type into, or a tactile control you press — and the equipment tiles in
 * the cargo popover are the one place the product lets you feel an object.
 */

/**
 * The three ways freight actually moves, and the sub-modes inside each.
 *
 * The grouping used to be "Containers / Packages / Road", which put ocean LCL
 * in the same tab as air freight because both happen to be counted in
 * packages. That is a cargo-measurement similarity, not a freight one: LCL is
 * a vessel booking on a sailing schedule, air is a flight on an airport pair,
 * and the two share neither a partner, a transit band, a cutoff structure nor
 * a rate basis. Splitting ocean across two tabs also meant a customer
 * comparing FCL against LCL — the single most common decision on this
 * account — had to change tab to do it.
 *
 * Mode is the first choice on the page and it sets everything downstream:
 * which locations resolve (airports or seaports), which cargo fields appear,
 * and how the rate is quoted. So it maps one-to-one onto how the trade is
 * organised, not onto how the cargo is counted.
 */
const GROUPS: Array<{ key: ModeGroup; label: string; shortLabel: string; modes: TransportMode[] }> = [
  { key: 'OCEAN', label: 'Ocean freight', shortLabel: 'Ocean', modes: ['OCEAN_FCL', 'OCEAN_LCL'] },
  { key: 'AIR', label: 'Air freight', shortLabel: 'Air', modes: ['AIR'] },
  { key: 'DOMESTIC', label: 'Domestic road', shortLabel: 'Domestic', modes: ['DOMESTIC_FTL', 'DOMESTIC_LTL'] },
]

const SUB_MODE: Record<TransportMode, { label: string; hint: string }> = {
  OCEAN_FCL: { label: 'Full container (FCL)', hint: 'Priced per container' },
  OCEAN_LCL: { label: 'Shared container (LCL)', hint: 'Priced per w/m' },
  AIR: { label: 'Air freight', hint: 'Priced per chargeable kg' },
  DOMESTIC_FTL: { label: 'Full truck (FTL)', hint: 'Priced per vehicle' },
  DOMESTIC_LTL: { label: 'Part load (LTL)', hint: 'Priced per chargeable kg' },
}

export function FreightSearch({
  onOptionsReady,
  className,
}: {
  onOptionsReady: (options: IndicativeOption[]) => void
  className?: string
}) {
  const shouldReduce = useReducedMotion()
  const draft = useIntakeStore((s) => s.draft)
  const setField = useIntakeStore((s) => s.setField)
  const setCargo = useIntakeStore((s) => s.setCargo)
  const setMode = useIntakeStore((s) => s.setMode)
  const swapRoute = useIntakeStore((s) => s.swapRoute)

  const [searching, setSearching] = useState(false)
  const [touched, setTouched] = useState(false)

  const group = modeGroup(draft.mode)
  const activeGroup = GROUPS.find((g) => g.key === group)!
  const copy = ROUTE_COPY[group]

  const errors = useMemo(() => {
    const next: { originId?: string; destinationId?: string; readyDate?: string } = {}
    if (!draft.originId) next.originId = 'Choose where the cargo starts'
    else if (!servesMode(draft.originId, draft.mode)) next.originId = copy.geography
    if (!draft.destinationId) next.destinationId = 'Choose where the cargo is going'
    else if (draft.originId === draft.destinationId) next.destinationId = 'Origin and destination must differ'
    else if (!servesMode(draft.destinationId, draft.mode)) next.destinationId = copy.geography
    if (!draft.cargo.readyDate) next.readyDate = 'Set a cargo-ready date'
    return next
  }, [draft.originId, draft.destinationId, draft.mode, draft.cargo.readyDate, copy.geography])

  const valid = Object.keys(errors).length === 0

  async function handleSearch() {
    setTouched(true)
    if (!valid) return
    setSearching(true)
    // A beat of deliberate latency: instant results read as canned, and this
    // is the moment the page is claiming that work happens behind it.
    await new Promise((resolve) => setTimeout(resolve, shouldReduce ? 0 : 560))
    onOptionsReady(generateIndicativeOptions(draft))
    setSearching(false)
  }

  return (
    <div className={cn('relative', className)}>
      {/* ── Mode groups — the pill rides above the panel edge ─────────── */}
      <div className="relative z-10 flex justify-center">
        <div
          role="tablist"
          aria-label="How the cargo moves"
          className="pw-glass flex items-center gap-1 rounded-full p-1.5"
        >
          {GROUPS.map((g) => {
            const active = g.key === group
            return (
              <button
                key={g.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(g.modes[0]!)}
                className={cn(
                  'relative min-h-11 rounded-full px-3.5 py-2 text-data font-semibold transition-colors sm:px-5',
                  active ? 'text-signal' : 'text-text-muted hover:text-text',
                )}
              >
                {active && (
                  /* A milled thumb sitting in a glass channel: lit on its top
                     edge, a contact shadow welding it down, and a soft cast
                     for the millimetre of lift. Not a tinted rectangle. */
                  <motion.span
                    layoutId="search-mode-pill"
                    className="absolute inset-0 rounded-full bg-surface shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.95),inset_0_-1px_0_0_rgb(16_29_26_/_0.06),0_1px_1px_-0.5px_rgb(16_29_26_/_0.07),0_6px_14px_-8px_rgb(16_29_26_/_0.38)]"
                    transition={shouldReduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10 whitespace-nowrap">
                  {/* The full label does not fit three-across on a phone, and
                      a horizontally scrolling tab strip hides the option a
                      first-time visitor most needs to see. */}
                  <span className="sm:hidden">{g.shortLabel}</span>
                  <span className="hidden sm:inline">{g.label}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── The panel ─────────────────────────────────────────────────── */}
      <div className="pw-glass-panel -mt-6 rounded-[26px] p-3 pt-9 sm:p-4 sm:pt-10">
        {/* Sub-mode, and the one line that tells you where this mode can go.
            Both stay on screen for air too, where there is no sub-mode to
            choose but the geography still needs stating. */}
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 px-1">
          {activeGroup.modes.length > 1 && (
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Service">
              {activeGroup.modes.map((m) => {
                const active = m === draft.mode
                return (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMode(m)}
                    data-selected={active}
                    className="pw-tactile flex min-h-9 items-center gap-1.5 rounded-chip px-2.5 py-1 text-micro font-medium text-text"
                  >
                    {SUB_MODE[m].label}
                    <span className={cn('font-mono text-[9.5px]', active ? 'text-signal' : 'text-text-faint')}>
                      {SUB_MODE[m].hint}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          <p className="ml-auto text-[11px] leading-relaxed text-text-muted">{copy.geography}</p>
        </div>

        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
          {/* Origin, with the swap control straddling the two location cells. */}
          <div className="relative">
            <LocationField
              label={copy.fromLabel}
              value={draft.originId}
              onChange={(id) => setField('originId', id)}
              onClear={() => setField('originId', undefined)}
              placeholder={copy.fromPlaceholder}
              mode={draft.mode}
              endpoint="ORIGIN"
              error={touched ? errors.originId : undefined}
            />
            <button
              type="button"
              onClick={swapRoute}
              aria-label="Swap origin and destination"
              className="pw-tactile absolute -bottom-4 left-1/2 z-20 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full text-text-muted lg:-right-4 lg:bottom-auto lg:left-auto lg:top-1/2 lg:-translate-y-1/2 lg:translate-x-0"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <LocationField
            label={copy.toLabel}
            value={draft.destinationId}
            onChange={(id) => setField('destinationId', id)}
            onClear={() => setField('destinationId', undefined)}
            placeholder={copy.toPlaceholder}
            mode={draft.mode}
            endpoint="DESTINATION"
            error={touched ? errors.destinationId : undefined}
          />

          <CargoField />
        </div>

        <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_auto]">
          <label className="pw-field flex h-[68px] items-center gap-3 rounded-card px-3.5 sm:px-4">
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] leading-none text-text-muted">What are you shipping?</span>
              <input
                value={draft.cargo.commodity ?? ''}
                onChange={(e) => setCargo({ commodity: e.target.value })}
                placeholder="Commodity, e.g. electronic components"
                className="mt-1.5 w-full bg-transparent text-[17px] font-medium leading-tight text-text placeholder:font-normal placeholder:text-text-faint focus:outline-none"
              />
            </span>
          </label>

          <label
            className="pw-field flex h-[68px] items-center gap-3 rounded-card px-3.5 sm:px-4"
            data-invalid={touched && errors.readyDate ? 'true' : undefined}
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-text-faint" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] leading-none text-text-muted">Cargo ready</span>
              {/* The draft stores a full ISO instant; the control speaks
                  YYYY-MM-DD only, and silently shows nothing if handed one
                  with a time on it. */}
              <input
                type="date"
                value={(draft.cargo.readyDate ?? '').slice(0, 10)}
                onChange={(e) =>
                  setCargo({ readyDate: e.target.value ? new Date(e.target.value).toISOString() : '' })
                }
                className="tnum mt-1 w-full bg-transparent text-[15px] font-medium leading-tight text-text focus:outline-none"
              />
            </span>
          </label>

          {/* The one filled control on the panel. Its shadows are cut from the
              same mineral ground as every other cast in the product plus a
              tint of its own green — a blue-grey glow under a green button is
              the giveaway that a colour was pasted in from somewhere else. */}
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className={cn(
              'group relative flex h-[68px] items-center justify-center gap-2.5 rounded-card px-6 text-[15px] font-semibold text-on-accent lg:px-9',
              'bg-signal transition-[background-color,box-shadow,transform] duration-200',
              'shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.18),0_1px_2px_-0.5px_rgb(16_29_26_/_0.14),0_10px_24px_-10px_rgb(13_107_79_/_0.55)]',
              'hover:bg-signal/92 hover:shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.2),0_2px_4px_-1px_rgb(16_29_26_/_0.16),0_18px_34px_-12px_rgb(13_107_79_/_0.62)]',
              'active:translate-y-px active:shadow-[inset_0_2px_4px_0_rgb(16_29_26_/_0.24)]',
              'disabled:pointer-events-none disabled:opacity-70',
            )}
          >
            {searching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Checking options…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" aria-hidden />
                Search freight options
              </>
            )}
          </button>
        </div>

        {/* Errors are announced once, under the row that caused them. */}
        {touched && !valid && (
          <p role="alert" className="mt-2 px-1 text-micro text-critical">
            {Object.values(errors)[0]}
          </p>
        )}

        <div className="pw-groove mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1 pt-3">
          <RequestDetailsDrawer />
          <p className="text-micro text-text-faint">{DEMO.intakeLabel}</p>
        </div>
      </div>
    </div>
  )
}
