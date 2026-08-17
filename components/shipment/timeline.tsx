'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Eye, EyeOff, FileText } from 'lucide-react'
import { useMemo, useState } from 'react'

import { DEMO } from '@/data/copy'
import { formatStamp } from '@/lib/format'
import { MILESTONE_CATEGORY_LABEL, MILESTONE_SOURCE_LABEL } from '@/lib/lifecycle'
import { isPast } from '@/lib/demo-clock'
import { cn } from '@/lib/utils'
import type { Milestone, MilestoneCategory } from '@/types'

import { Chip, DemoNotice, SegmentedControl, StatusBadge, type Tone } from '@/components/ui/primitives'

/**
 * THE SHIPMENT TIMELINE
 * ══════════════════════════════════════════════════════════════════════════
 * A vertical rail where completed events are solid and expected ones are
 * hollow, with the demo clock's "now" marked between them.
 *
 * Every event carries its source and responsible party, because that is the
 * difference between a record and a rumour — "ETA updated" means one thing
 * from a carrier feed and quite another from a phone call someone half
 * remembers.
 *
 * ── The material ──────────────────────────────────────────────────────────
 * The spine is a milled channel rather than a hairline, and the nodes are the
 * same three objects the progress rail uses, for the same reasons: a drilled
 * SOCKET for an event that has not happened (shade at the top lip, catch at
 * the bottom — the light run backwards, which is what makes it read as a hole
 * and not a switched-off dot), a filled STUD for one that has, and a lit LAMP
 * with a halo for the one in progress. A row of flat dots on a line is a
 * drawing of a timeline; this is one.
 */

const STATUS_TONE: Record<Milestone['status'], Tone> = {
  COMPLETED: 'signal',
  IN_PROGRESS: 'route',
  EXPECTED: 'neutral',
  DELAYED: 'amber',
  CANCELLED: 'muted',
}

const FILTERS: Array<{ value: MilestoneCategory | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'CARRIER', label: 'Carrier' },
  { value: 'ORIGIN', label: 'Origin' },
  { value: 'DESTINATION', label: 'Destination' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'DOCUMENTS', label: 'Documents' },
  { value: 'EXCEPTIONS', label: 'Exceptions' },
  { value: 'FINANCE', label: 'Finance' },
]

export function ShipmentTimeline({
  milestones,
  onToggleVisibility,
}: {
  milestones: Milestone[]
  onToggleVisibility?: (milestoneId: string, visible: boolean) => void
}) {
  const [filter, setFilter] = useState<MilestoneCategory | 'ALL'>('ALL')
  const shouldReduce = useReducedMotion()

  const visible = useMemo(
    () => (filter === 'ALL' ? milestones : milestones.filter((m) => m.category === filter)),
    [milestones, filter],
  )

  /** Where "now" sits in the list — the boundary between done and expected. */
  const nowIndex = useMemo(() => {
    const idx = visible.findIndex((m) => !isPast(m.at))
    return idx === -1 ? visible.length : idx
  }, [visible])

  const completed = visible.filter((m) => m.status === 'COMPLETED').length

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <SegmentedControl
          size="sm"
          ariaLabel="Timeline filter"
          options={FILTERS}
          value={filter}
          onChange={setFilter}
          className="min-w-0"
        />
        <span className="pw-readout shrink-0 text-micro text-text-faint">
          {completed} of {visible.length} complete
        </span>
      </div>

      <ol className="relative flex min-w-0 flex-col">
        {/* The spine: a channel milled through the plate, graduated the whole
            way down. Ticks only beside the unfinished part is the giveaway —
            a real scale is graduated end to end. */}
        <span aria-hidden className="pw-rail absolute bottom-2 left-[6px] top-2 w-[3px] rounded-full" />

        {visible.map((milestone, i) => {
          const done = milestone.status === 'COMPLETED'
          const live = milestone.status === 'IN_PROGRESS'
          const delayed = milestone.status === 'DELAYED'
          const isNowBoundary = i === nowIndex

          return (
            <li key={milestone.id} className="min-w-0">
              {isNowBoundary && <NowMarker />}

              <motion.div
                initial={shouldReduce ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.24, delay: shouldReduce ? 0 : Math.min(i * 0.025, 0.3) }}
                className="relative flex min-w-0 gap-3 py-2.5"
              >
                {/* The node, seated in the channel. The ring is the plate face
                    showing through, which is what lets a 9px node interrupt
                    the spine cleanly instead of sitting on top of it. */}
                <span className="relative z-10 mt-1 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full ring-4 ring-surface">
                  <span
                    className={cn(
                      'h-[9px] w-[9px] rounded-full',
                      done && 'pw-stud text-signal',
                      live && 'pw-lamp text-route',
                      delayed && 'pw-stud text-amber',
                      !done && !live && !delayed && 'pw-socket',
                    )}
                  />
                </span>

                {/* Body */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h4
                      className={cn(
                        'pw-plate-title min-w-0 text-data',
                        done ? 'text-text' : 'font-medium text-text-muted',
                      )}
                    >
                      {milestone.title}
                    </h4>
                    <time
                      dateTime={milestone.at}
                      className="pw-readout shrink-0 whitespace-nowrap text-[10px] text-text-faint"
                    >
                      {formatStamp(milestone.at)}
                    </time>
                  </div>

                  <p className="mt-0.5 text-micro text-text-faint">{milestone.location}</p>

                  {milestone.notes && (
                    <p className="mt-1.5 text-micro leading-relaxed text-text-muted">{milestone.notes}</p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatusBadge tone={STATUS_TONE[milestone.status]}>
                      {milestone.status.replace(/_/g, ' ')}
                    </StatusBadge>
                    <Chip>{MILESTONE_CATEGORY_LABEL[milestone.category]}</Chip>
                    <Chip>{MILESTONE_SOURCE_LABEL[milestone.source]}</Chip>
                    <Chip>{milestone.responsibleParty}</Chip>
                    {milestone.documentId && (
                      <Chip className="gap-1">
                        <FileText className="h-2.5 w-2.5" aria-hidden />
                        {milestone.documentId}
                      </Chip>
                    )}

                    {/* Customer visibility is a per-event decision, and it is
                        editable here — hiding an event from a customer is an
                        operational choice that should leave a trail. It is a
                        thing you press, so it is machined rather than drawn. */}
                    <button
                      type="button"
                      onClick={() => onToggleVisibility?.(milestone.id, !milestone.customerVisible)}
                      disabled={!onToggleVisibility}
                      className={cn(
                        'inline-flex min-h-[24px] items-center gap-1 rounded-chip border px-1.5 font-mono text-[10px] uppercase tracking-[0.06em] transition-colors',
                        'shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.5)]',
                        milestone.customerVisible
                          ? 'border-route/30 bg-route/12 text-route'
                          : 'border-hairline bg-transparent text-text-faint',
                        onToggleVisibility && 'hover:border-signal/45 active:translate-y-px',
                      )}
                      aria-label={
                        milestone.customerVisible ? 'Visible to customer — hide' : 'Hidden from customer — show'
                      }
                    >
                      {milestone.customerVisible ? (
                        <Eye className="h-2.5 w-2.5" aria-hidden />
                      ) : (
                        <EyeOff className="h-2.5 w-2.5" aria-hidden />
                      )}
                      {milestone.customerVisible ? 'Customer visible' : 'Internal only'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </li>
          )
        })}

        {nowIndex === visible.length && <NowMarker />}
      </ol>

      <DemoNotice>{DEMO.timelineLabel}</DemoNotice>
    </div>
  )
}

/**
 * The demo clock, drawn into the rail.
 *
 * A lit lamp rather than a dashed circle: this is the one live reading on the
 * timeline, and the halo is what makes a 7px indicator findable at a glance
 * on a list of thirty events.
 */
function NowMarker() {
  return (
    <div className="relative flex items-center gap-3 py-2" aria-label="Current time">
      <span className="relative z-10 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full ring-4 ring-surface">
        <span className="pw-lamp h-[7px] w-[7px] text-signal" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="pw-stencil text-signal">Now</span>
        <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-signal/40 to-transparent" />
      </span>
    </div>
  )
}
