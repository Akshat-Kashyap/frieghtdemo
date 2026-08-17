'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, Check, ChevronDown, Clock, Gauge, Minus, ShieldAlert, X } from 'lucide-react'
import { useState } from 'react'

import { DEMO } from '@/data/copy'
import { requirePort } from '@/data/ports'
import { formatDate, money, transitRange } from '@/lib/format'
import { MODE_LABEL } from '@/lib/lifecycle'
import { collapse, fadeUp, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { cargoUnitsFor } from '@/lib/indicative-options'
import { useIntakeStore } from '@/store/intake-store'
import type { IndicativeOption, OptionKind } from '@/types'

import { Button, DemoNotice, MotionButton, SectionHeader, StatusBadge } from '@/components/ui/primitives'
import { LanePill, ModeBadge } from '@/components/ui/freight'

/**
 * INDICATIVE OPTIONS
 * ══════════════════════════════════════════════════════════════════════════
 * Three simulated options — never presented as live carrier quotes.
 *
 * The charge categories expand because that is the actual product argument:
 * a freight price is a structure, and the difference between "confirmed",
 * "conditional" and "exposure only" is the difference between a forwarder
 * that makes money and one that absorbs a detention bill. Collapsing those
 * three into a single number is what a spreadsheet does.
 *
 * MATERIAL: these are the tail of the search flow, so they are cut from the
 * same stock as the search panel above them — a sheet with machined joints
 * between its regions, readings sunk into milled channels, stencilled labels,
 * and every figure in mono. Each option is a `.pw-card` rather than a plate:
 * three of them side by side are regions of one comparison, not three objects
 * stacked on the page.
 */

const KIND_ACCENT: Record<OptionKind, { ring: string; text: string; badge: 'signal' | 'violet' | 'route' }> = {
  BALANCED: { ring: 'hover:border-signal/45', text: 'text-signal', badge: 'signal' },
  FASTEST: { ring: 'hover:border-violet/45', text: 'text-violet', badge: 'violet' },
  COST_OPTIMISED: { ring: 'hover:border-route/45', text: 'text-route', badge: 'route' },
}

const FLEX_LABEL = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' } as const

export function IndicativeOptions({
  options,
  onSelect,
  onModify,
}: {
  options: IndicativeOption[]
  onSelect: (option: IndicativeOption) => void
  onModify: () => void
}) {
  const draft = useIntakeStore((s) => s.draft)
  const units = cargoUnitsFor(draft)

  const origin = draft.originId ? requirePort(draft.originId) : undefined
  const destination = draft.destinationId ? requirePort(draft.destinationId) : undefined

  return (
    <motion.section
      variants={stagger(0.06)}
      initial="hidden"
      animate="show"
      className="flex min-w-0 flex-col gap-5"
      aria-label="Indicative options"
    >
      <motion.div variants={fadeUp}>
        <SectionHeader
          eyebrow={DEMO.optionsSubHeader}
          title={DEMO.optionsHeader}
          description={
            origin && destination ? (
              <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                <LanePill origin={origin.name} destination={destination.name} />
                <span aria-hidden className="text-text-faint">
                  ·
                </span>
                <span>{MODE_LABEL[draft.mode]}</span>
                <span aria-hidden className="text-text-faint">
                  ·
                </span>
                <span>{units.summary}</span>
              </span>
            ) : undefined
          }
          action={
            <Button variant="outline" size="sm" onClick={onModify}>
              Modify request
            </Button>
          }
        />
      </motion.div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-3">
        {options.map((option, i) => (
          <OptionCard key={option.id} option={option} index={i} onSelect={() => onSelect(option)} />
        ))}
      </div>

      <motion.div variants={fadeUp}>
        <DemoNotice variant="block" className="flex items-start gap-2.5">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" aria-hidden />
          <span>{DEMO.optionsDisclaimer}</span>
        </DemoNotice>
      </motion.div>
    </motion.section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   OPTION CARD
   ══════════════════════════════════════════════════════════════════════════ */

function OptionCard({ option, index, onSelect }: { option: IndicativeOption; index: number; onSelect: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const shouldReduce = useReducedMotion()
  const accent = KIND_ACCENT[option.kind]

  const quoted = option.chargeCategories.filter((c) => !c.exposureOnly)
  const exposures = option.chargeCategories.filter((c) => c.exposureOnly)

  return (
    <motion.article
      variants={fadeUp}
      whileHover={shouldReduce ? undefined : { y: -2 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={cn('pw-card flex min-w-0 flex-col overflow-hidden transition-colors', accent.ring)}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="pw-groove-b border-b border-hairline px-4 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className={cn('pw-plate-title text-[15px]', accent.text)}>{option.label}</h3>
            <p className="mt-0.5 text-micro text-text-faint">{option.serviceLevel}</p>
          </div>
          <ModeBadge mode={option.mode} label={MODE_LABEL[option.mode]!} />
        </div>
        <p className="mt-2 text-micro leading-relaxed text-text-muted">{option.description}</p>
      </header>

      {/* ── Headline readings, milled into the sheet ──────────────────── */}
      <div className="grid grid-cols-2 gap-2 px-4 py-3">
        <Reading
          icon={<Clock className="h-3 w-3" aria-hidden />}
          label="Transit"
          value={transitRange(option.transitMinDays, option.transitMaxDays)}
        />
        <Reading
          icon={<Gauge className="h-3 w-3" aria-hidden />}
          label="Flexibility"
          value={FLEX_LABEL[option.scheduleFlexibility]}
        />
      </div>

      {/* ── The price, and what it is a price for ─────────────────────── */}
      <div className="pw-groove border-b border-hairline px-4 pb-3.5 pt-3">
        <p className="pw-stencil">Indicative total</p>
        <p className="pw-readout mt-1.5 text-[22px] font-medium leading-none tracking-[-0.02em]">
          {money(option.totalUsd, option.currency)}
        </p>
        <p className="mt-1.5 font-mono text-micro text-text-faint">
          {option.currency} · all-in · valid to {formatDate(option.validUntil)}
        </p>

        <dl className="mt-3 flex flex-col gap-1">
          <MiniRow label="Est. departure" value={formatDate(option.estimatedDeparture)} />
          <MiniRow label="Est. arrival" value={formatDate(option.estimatedArrival)} />
        </dl>
      </div>

      {/* ── Charge categories ─────────────────────────────────────────── */}
      <div className="border-b border-hairline">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex min-h-[40px] w-full items-center justify-between gap-2 px-4 py-2.5 text-data text-text-muted transition-colors hover:bg-raised-2/50 hover:text-text"
        >
          <span className="min-w-0 text-left">
            Charge categories
            <span className="pw-readout ml-1.5 text-micro text-text-faint">
              {quoted.length} quoted · {exposures.length} exposure
            </span>
          </span>
          <ChevronDown
            className={cn('h-3.5 w-3.5 shrink-0 transition-transform', expanded && 'rotate-180')}
            aria-hidden
          />
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div variants={collapse} initial="hidden" animate="show" exit="exit" className="overflow-hidden">
              <div className="px-4 pb-3.5">
                <table className="w-full">
                  <caption className="sr-only">Charge structure behind {option.label}</caption>
                  <tbody>
                    {quoted.map((cat) => (
                      <tr key={cat.family} className="align-top">
                        <td className="py-1.5 pr-2">
                          <span className="block text-data text-text">{cat.label}</span>
                          <span className="block text-[10px] text-text-faint">{cat.basis}</span>
                          {cat.note && (
                            <span className="mt-0.5 block text-[10px] italic text-text-faint">{cat.note}</span>
                          )}
                        </td>
                        <td className="pw-readout whitespace-nowrap py-1.5 text-right text-data">
                          {money(cat.amountUsd, option.currency)}
                        </td>
                      </tr>
                    ))}

                    {exposures.length > 0 && (
                      <>
                        <tr>
                          <td colSpan={2} className="pb-1 pt-3">
                            <span className="pw-stencil text-amber/80">Exposure — not billed on this option</span>
                          </td>
                        </tr>
                        {exposures.map((cat) => (
                          <tr key={cat.family} className="align-top">
                            <td className="py-1.5 pr-2">
                              <span className="block text-data text-text-muted">{cat.label}</span>
                              <span className="block text-[10px] text-text-faint">{cat.basis}</span>
                              {cat.note && (
                                <span className="mt-0.5 block text-[10px] italic text-text-faint">{cat.note}</span>
                              )}
                            </td>
                            <td className="pw-readout whitespace-nowrap py-1.5 text-right text-data text-amber">
                              {money(cat.amountUsd, option.currency)}
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Included / excluded / risk ────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 px-4 py-3.5">
        <ServiceList title="Included" items={option.includedServices} icon={<Check className="h-3 w-3 text-signal" />} />
        <ServiceList
          title="Excluded"
          items={option.excludedServices}
          icon={<X className="h-3 w-3 text-text-faint" />}
          muted
        />

        {option.riskIndicators.length > 0 && (
          <div>
            <p className="pw-stencil mb-1.5">Risk indicators</p>
            <ul className="flex flex-col gap-1">
              {option.riskIndicators.map((risk) => (
                <li key={risk} className="flex items-start gap-1.5 text-micro leading-relaxed text-text-muted">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber" aria-hidden />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Partner status + CTA ──────────────────────────────────────── */}
      <footer className="pw-groove px-4 pb-3.5 pt-3">
        <div className="mb-3 flex items-start gap-2">
          <StatusBadge tone="violet" className="shrink-0">
            Partner
          </StatusBadge>
          <p className="min-w-0 text-[10px] leading-relaxed text-text-faint">{option.partnerConfirmationStatus}</p>
        </div>
        <MotionButton variant={index === 0 ? 'primary' : 'outline'} size="md" onClick={onSelect} className="w-full">
          Select this option
        </MotionButton>
      </footer>
    </motion.article>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   SMALL PARTS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * One reading in a milled channel.
 *
 * These were two tiles separated by a 1px gap showing the sheet through it,
 * which reads as a table cell. A figure in a recess reads as measured by the
 * machine; the same figure on a flat tile reads as typed in by hand.
 */
function Reading({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="pw-rail min-w-0 rounded-chip px-3 py-2">
      <div className="flex items-center gap-1.5 text-text-faint">
        {icon}
        <span className="pw-stencil truncate">{label}</span>
      </div>
      <p className="pw-readout mt-1 text-data font-medium">{value}</p>
    </div>
  )
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="pw-stencil">{label}</dt>
      <dd className="pw-readout text-micro text-text-muted">{value}</dd>
    </div>
  )
}

function ServiceList({
  title,
  items,
  icon,
  muted = false,
}: {
  title: string
  items: string[]
  icon: React.ReactNode
  muted?: boolean
}) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? items : items.slice(0, 3)

  return (
    <div className="min-w-0">
      <p className="pw-stencil mb-1.5">{title}</p>
      <ul className="flex flex-col gap-1">
        {visible.map((item) => (
          <li
            key={item}
            className={cn(
              'flex items-start gap-1.5 text-micro leading-relaxed',
              muted ? 'text-text-faint' : 'text-text-muted',
            )}
          >
            <span className="mt-0.5 shrink-0">{icon}</span>
            {item}
          </li>
        ))}
      </ul>
      {items.length > 3 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-1 inline-flex min-h-[24px] items-center gap-1 rounded-chip text-[10px] text-text-faint transition-colors hover:text-text-muted"
        >
          <Minus className="h-2.5 w-2.5" aria-hidden />
          {showAll ? 'Show fewer' : `${items.length - 3} more`}
        </button>
      )}
    </div>
  )
}
