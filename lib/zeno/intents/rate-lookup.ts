import { contractRateFor } from '@/data/contracts'
import { portProfile } from '@/data/port-profiles'
import { laneLabel } from '@/data/ports'
import { RATE_BASIS, RATE_DISCLAIMER, currentRate, rateInContext } from '@/data/rate-grid'
import { hasSchedule } from '@/data/sailings'
import { formatDate, moneyUsd, percentSigned, transitRange } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import type { ZenoIntent } from '@/lib/zeno'
import type { ZenoBlock, ZenoCitation } from '@/lib/zeno/types'

import { EQUIPMENT_LABEL, resolveEquipment, resolveLane } from './entities'

/**
 * ZENO — RATE LOOKUP
 * ══════════════════════════════════════════════════════════════════════════
 * What a container costs on a lane this week, read from the same grid the
 * Rate Terminal renders — never recomputed here. Two screens quoting the
 * same lane at different numbers is the fastest way to lose the room.
 *
 * Two things this intent will not do:
 *
 *  · Answer for a lane the grid does not publish. There is no interpolation
 *    from a neighbouring lane; the intent returns null and the question falls
 *    through, because a plausible rate is worse than no rate.
 *
 *  · Quote a figure without its basis. `RATE_BASIS` is always attached. An
 *    all-in port-to-port number looks expensive beside a base ocean-freight
 *    number, and comparing the two without knowing which is which is the most
 *    common way a rate sheet gets misread.
 *
 * Where the lane is under contract, the contracted rate leads and spot is
 * shown beside it — the contract is what the customer will actually be
 * charged, so leading with spot would be actively misleading.
 */

const RATE_KEYWORDS =
  /(^|[^a-z0-9])(rate|rates|pricing|price|prices|cost|costs|costing|quote|quotation|how much|per container|spot)([^a-z0-9]|$)/

export const rateLookupIntent: ZenoIntent = {
  id: 'rate-lookup',
  // A rate word plus a resolvable pair. "What is the rate?" with no lane is
  // not a question this can answer honestly, so it does not claim it.
  matches: (q) => RATE_KEYWORDS.test(q) && resolveLane(q) !== null,

  answer: (q) => {
    const lane = resolveLane(q)
    if (!lane) return null

    const { equipment, stated } = resolveEquipment(q)
    const published = currentRate(lane.origin.id, lane.destination.id, equipment)
    if (!published) return null

    const { row, cell } = published
    const context = rateInContext(row.laneId, equipment)
    const contracted = contractRateFor(row.laneId, equipment)
    const label = EQUIPMENT_LABEL[equipment]
    const laneName = laneLabel(lane.origin.id, lane.destination.id)

    const blocks: ZenoBlock[] = [
      {
        kind: 'list',
        items: [
          { label: 'Lane', value: laneName },
          {
            label: 'Equipment',
            value: label,
            hint: stated ? undefined : 'assumed — none stated',
          },
          {
            label: 'Spot this week',
            value: moneyUsd(cell.amountUsd),
            hint: cell.assurance === 'ASSURED' ? 'partner-confirmed' : 'indicative',
          },
          ...(cell.deltaPct !== null
            ? [{ label: 'Week on week', value: percentSigned(cell.deltaPct), hint: cell.trend.toLowerCase() }]
            : []),
          ...(context ? [{ label: 'Against the average', value: context.label }] : []),
          { label: 'Transit', value: transitRange(row.transitMinDays, row.transitMaxDays) },
          { label: 'Valid until', value: formatDate(cell.validUntil) },
        ],
      },
    ]

    if (contracted) {
      // Rounded to the same place `percentSigned` will print it, and rounded
      // *before* the sign is read rather than after. The note below branches
      // on this number, so an unrounded +0.04 would render "+0.0%" over a
      // sentence claiming spot is below contract — the figure and the prose
      // disagreeing on screen is worse than either being slightly coarse.
      // Display still goes through `percentSigned`; this only decides.
      const differencePct = Number(
        (((contracted.lane.rateUsd - cell.amountUsd) / cell.amountUsd) * 100).toFixed(1),
      )

      blocks.push(
        {
          kind: 'list',
          items: [
            { label: 'Your contract rate', value: moneyUsd(contracted.lane.rateUsd), hint: `per ${label}` },
            { label: 'Contract', value: contracted.contract.reference, hint: contracted.contract.version },
            { label: 'Free time', value: `${contracted.lane.freeTimeDays} days`, hint: 'at destination' },
            { label: 'Contract against spot', value: percentSigned(differencePct) },
          ],
        },
        {
          kind: 'note',
          tone: 'neutral',
          text:
            differencePct > 0
              ? 'Spot is below your contracted rate this week. The contract holds the rate for its window and carries the space allocation that goes with the committed volume; a spot booking has neither.'
              : 'Your contracted rate is at or below spot this week. It is the rate this lane will be charged at while the contract runs.',
        },
      )
    }

    blocks.push(
      { kind: 'note', tone: 'neutral', text: RATE_BASIS },
      { kind: 'note', tone: 'amber', text: RATE_DISCLAIMER },
    )

    const citations: ZenoCitation[] = [
      { label: 'Rate terminal', href: ROUTES.rateTerminal },
      { label: 'Search freight', href: ROUTES.search },
    ]
    if (contracted) citations.push({ label: contracted.contract.id, href: ROUTES.contract(contracted.contract.id) })

    return {
      intent: 'rate-lookup',
      headline: contracted
        ? `${laneName}: your contracted ${label} rate is ${moneyUsd(contracted.lane.rateUsd)}, spot this week is ${moneyUsd(
            cell.amountUsd,
          )}.`
        : `${laneName}: ${moneyUsd(cell.amountUsd)} per ${label} this week.`,
      blocks,
      citations,
      followUps: [
        ...(hasSchedule(lane.origin.id, lane.destination.id)
          ? [`Show me sailings from ${lane.origin.name} to ${lane.destination.name}`]
          : []),
        ...(portProfile(lane.destination.id)
          ? [`Give me port charges of ${lane.destination.name} for a ${label} container`]
          : []),
        'What is free time?',
      ],
    }
  },
}
