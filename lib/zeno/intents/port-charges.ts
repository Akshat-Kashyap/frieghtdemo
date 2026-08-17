import { DEMO } from '@/data/copy'
import { PROFILE_REVIEWED_AT, portProfile, type ChargeBand, type FreeTimeSlab } from '@/data/port-profiles'
import type { RateEquipment } from '@/data/rate-grid'
import { hasSchedule } from '@/data/sailings'
import { count, formatDate, money, moneyUsd } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import type { ZenoIntent } from '@/lib/zeno'
import type { ZenoBlock } from '@/lib/zeno/types'

import { EQUIPMENT_LABEL, resolveEquipment, resolveSinglePort } from './entities'

/**
 * ZENO — PORT CHARGES
 * ══════════════════════════════════════════════════════════════════════════
 * Terminal handling, free days and what happens after them, read from the
 * written profile in `data/port-profiles.ts`.
 *
 * Detention and storage are returned as two separate day-banded tables
 * because they are two clocks: storage accrues while the box is inside the
 * terminal and is payable to the terminal or CFS; detention accrues once it
 * has left and until the empty is returned, and is payable to the shipping
 * line. A delayed shipment can run both at once, and folding them into one
 * "demurrage" figure is how a customer budgets for half of what they owe.
 *
 * Only a port with a written profile resolves. "Port charges for Pune" is
 * declined rather than answered from a neighbouring gateway's numbers.
 */

const CHARGE_KEYWORDS =
  /(^|[^a-z0-9])(port charge|port charges|charge|charges|thc|terminal handling|handling|free time|free day|free days|detention|demurrage|storage|dpd|direct port delivery|delivery order|cfs)([^a-z0-9]|$)/

export const portChargesIntent: ZenoIntent = {
  id: 'port-charges',
  // Exactly one profiled port. Two ports is a lane question and belongs to
  // the rate or schedule intents; none is a glossary question.
  matches: (q) => CHARGE_KEYWORDS.test(q) && resolveSinglePort(q, (port) => Boolean(portProfile(port.id))) !== null,

  answer: (q) => {
    const port = resolveSinglePort(q, (p) => Boolean(portProfile(p.id)))
    if (!port) return null

    const profile = portProfile(port.id)
    if (!profile) return null

    const { equipment, stated } = resolveEquipment(q)
    const label = EQUIPMENT_LABEL[equipment]
    const bands = handlingFor(profile.handling, equipment)
    const { detentionFreeDays, storageFreeDays, detentionSlabs, storageSlabs } = profile.freeTime

    const blocks: ZenoBlock[] = [
      {
        kind: 'list',
        items: [
          { label: 'Port', value: `${port.name} (${port.code})` },
          { label: 'Authority', value: profile.authority },
          { label: 'Equipment', value: label, hint: stated ? undefined : 'assumed — none stated' },
          {
            label: 'Direct port delivery',
            value: profile.directPortDelivery ? 'Available' : 'Not available',
            hint: profile.cfsCount ? `${count(profile.cfsCount)} linked CFS` : undefined,
          },
        ],
      },
    ]

    if (bands.length > 0) {
      blocks.push({
        kind: 'table',
        columns: ['Charge', 'Indicative band', 'Basis'],
        rows: bands.map((band) => [
          band.label,
          `${bandAmount(band.low, band.currency)} – ${bandAmount(band.high, band.currency)}`,
          band.basis,
        ]),
      })

      // The profile attaches a note to the bands that need one — the reefer
      // premium, for instance. Dropping it would leave a customer reading the
      // dry rate as if it applied to their reefer.
      for (const note of new Set(bands.map((band) => band.note).filter((n): n is string => Boolean(n)))) {
        blocks.push({ kind: 'note', tone: 'neutral', text: note })
      }
    }

    blocks.push(
      {
        kind: 'list',
        items: [
          { label: 'Detention free days', value: `${detentionFreeDays} days`, hint: 'carrier' },
          { label: 'Storage free days', value: `${storageFreeDays} days`, hint: 'terminal' },
        ],
      },
      {
        kind: 'table',
        columns: ['Clock', 'Days', 'Per day', 'Basis'],
        rows: [
          ...slabRows('Detention', detentionSlabs),
          ...slabRows('Storage', storageSlabs),
        ],
      },
      {
        kind: 'note',
        tone: 'neutral',
        text: 'Two clocks, two payees: storage runs while the container is still inside the terminal and is payable to the terminal or CFS; detention runs from the moment it leaves the gate until the empty is returned, and is payable to the shipping line. Both count calendar days, weekends and holidays included.',
      },
      ...(equipment === '40HC' && quotedPer20ft(detentionSlabs, storageSlabs)
        ? ([
            {
              kind: 'note',
              tone: 'neutral',
              // The slabs are published per 20ft in the profile. Showing them
              // unqualified against a 40HC question would understate the
              // exposure by roughly half.
              text: 'The slabs above are published per 20ft. A 40ft or high-cube box is charged at roughly double the daily rate; the day bands themselves are the same.',
            },
          ] as ZenoBlock[])
        : []),
      {
        kind: 'note',
        tone: 'amber',
        text: `Indicative bands, not a tariff. Reviewed ${formatDate(
          PROFILE_REVIEWED_AT,
        )}. They vary by carrier, terminal, equipment and direction, and free time is granted by the carrier rather than the port. ${DEMO.simulatedValues}`,
      },
    )

    return {
      intent: 'port-charges',
      headline: `${port.name} — indicative ${label} handling, and what free time costs once it runs out.`,
      blocks,
      citations: [{ label: `${port.name} port`, href: ROUTES.port(port.code) }],
      followUps: [
        'Explain detention and demurrage',
        ...(hasSchedule('CNSHA', port.id) ? [`Show me sailings from Shanghai to ${port.name}`] : []),
        'What is direct port delivery?',
      ],
    }
  },
}

/**
 * The handling lines that apply to the equipment asked about.
 *
 * A band with no size in its label — CFS handling, delivery order — applies
 * whatever the box is, so it is kept. A 20ft question showing the 40ft
 * terminal handling line beside it is how a quote gets built at the wrong
 * number.
 */
function handlingFor(bands: ChargeBand[], equipment: RateEquipment): ChargeBand[] {
  const size = equipment === '20FT' ? '20' : '40'
  const matched = bands.filter((band) => {
    const stated = /(^|[^0-9])(20|40)([^0-9]|$)/.exec(band.label)
    return !stated || stated[2] === size
  })
  // A profile that never states a size (a transhipment hub, for instance)
  // should still answer rather than return an empty table.
  return matched.length > 0 ? matched : bands
}

/** Mirrors how the port profile screen writes a figure: USD plain, INR grouped. */
function bandAmount(amount: number, currency: ChargeBand['currency']): string {
  return currency === 'USD' ? moneyUsd(amount) : money(amount, 'INR')
}

/** True where the profile publishes its slabs against a 20ft box. */
function quotedPer20ft(...slabSets: FreeTimeSlab[][]): boolean {
  return slabSets.some((slabs) => slabs.some((slab) => slab.basis.includes('20ft')))
}

function slabRows(clock: string, slabs: FreeTimeSlab[]): Array<Array<string | number>> {
  return slabs.map((slab) => [
    clock,
    slab.toDay ? `Days ${slab.fromDay}–${slab.toDay}` : `Day ${slab.fromDay} onward`,
    bandAmount(slab.amount, slab.currency),
    slab.basis,
  ])
}
