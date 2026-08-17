import { portProfile } from '@/data/port-profiles'
import { getPort, laneLabel } from '@/data/ports'
import {
  SAILING_CUTOFF_BASIS,
  SAILING_DISCLAIMER,
  sailingFrequency,
  sailingsBetween,
  type Sailing,
} from '@/data/sailings'
import { count, formatDateShort, formatStampShort, transitRange } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import type { Port } from '@/types'
import type { ZenoIntent } from '@/lib/zeno'
import type { ZenoBlock, ZenoCitation } from '@/lib/zeno/types'

import { resolveLane } from './entities'

/**
 * ZENO — SAILING SCHEDULE
 * ══════════════════════════════════════════════════════════════════════════
 * "When can it leave?" — the question that comes before a booking exists.
 *
 * Every figure here is read from `data/sailings.ts`, which is itself derived
 * from the lane's transit band and the same departures-per-week the Rate
 * Terminal publishes. The intent declines rather than approximates: a pair
 * with no published schedule returns null and the question falls through, so
 * Zeno never answers "roughly weekly" about a lane nobody scheduled.
 */

/** How many departures an answer shows. Fewer is a timetable fragment; more is a wall. */
const DEPARTURES = 5

const SCHEDULE_KEYWORDS =
  /(^|[^a-z0-9])(sailing|sailings|sail|sails|schedule|schedules|departure|departures|depart|departs|departing|vessel|vessels|etd|next ship|next boat)([^a-z0-9]|$)/

export const sailingScheduleIntent: ZenoIntent = {
  id: 'sailing-schedule',
  // A schedule word alone is not enough: "what is the sailing cutoff" has no
  // lane and belongs to the glossary, not here.
  matches: (q) => SCHEDULE_KEYWORDS.test(q) && resolveLane(q) !== null,

  answer: (q) => {
    const lane = resolveLane(q)
    if (!lane) return null

    const sailings = sailingsBetween(lane.origin.id, lane.destination.id, { limit: DEPARTURES })
    if (sailings.length === 0) return null

    const first = sailings[0]
    const last = sailings[sailings.length - 1]
    const perWeek = sailingFrequency(lane.origin.id, lane.destination.id)

    const transits = sailings.map((s) => s.transitDays)
    const carriers = [...new Set(sailings.map((s) => s.carrierName))]

    const blocks: ZenoBlock[] = [
      {
        kind: 'table',
        columns: ['Vessel', 'ETD', 'ETA', 'Transit', 'Routing', 'SI cutoff'],
        // Transit is the only column worth aligning on the digit — the dates
        // read as labels, not as quantities.
        numericColumns: [3],
        rows: sailings.map((s) => [
          `${s.vessel} ${s.voyage}`,
          formatDateShort(s.etd),
          formatDateShort(s.eta),
          `${s.transitDays} days`,
          routingLabel(s),
          formatStampShort(s.cutoffs.shippingInstruction),
        ]),
      },
      {
        kind: 'list',
        items: [
          { label: 'Lane', value: laneLabel(lane.origin.id, lane.destination.id) },
          ...(perWeek ? [{ label: 'Departures a week', value: count(perWeek) }] : []),
          {
            label: 'Transit',
            value: transitRange(Math.min(...transits), Math.max(...transits)),
            hint: 'on these departures',
          },
          { label: 'Carriers', value: carriers.join(' · ') },
        ],
      },
      { kind: 'note', tone: 'neutral', text: SAILING_CUTOFF_BASIS },
      { kind: 'note', tone: 'amber', text: SAILING_DISCLAIMER },
    ]

    return {
      intent: 'sailing-schedule',
      headline: `${laneLabel(lane.origin.id, lane.destination.id)} — next ${sailings.length} departures, ${formatDateShort(
        first.etd,
      )} to ${formatDateShort(last.etd)}.`,
      blocks,
      citations: [
        { label: 'Rate terminal', href: ROUTES.rateTerminal },
        ...portCitations([lane.origin, lane.destination]),
      ],
      followUps: [
        `What is the 40HC rate from ${lane.origin.name} to ${lane.destination.name}?`,
        ...(portProfile(lane.destination.id)
          ? [`Give me port charges of ${lane.destination.name} for a 40ft container`]
          : []),
        'Explain detention and demurrage',
      ],
    }
  },
}

/**
 * Direct or relayed, named.
 *
 * A transhipment is the single most useful thing to know about a departure
 * that a rate sheet never tells you: it is where a connection is missed and
 * an ETA is revised.
 */
function routingLabel(sailing: Sailing): string {
  if (sailing.direct) return 'Direct'
  const hub = sailing.transhipmentPortId ? getPort(sailing.transhipmentPortId) : undefined
  return hub ? `Via ${hub.name}` : 'Transhipment'
}

/** Only ports with a written profile are cited — a citation that opens a blank page is worse than none. */
function portCitations(ports: Port[]): ZenoCitation[] {
  return ports
    .filter((port) => Boolean(portProfile(port.id)))
    .map((port) => ({ label: `${port.name} port`, href: ROUTES.port(port.code) }))
}
