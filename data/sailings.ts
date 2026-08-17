import { CURRENT_WEEK_INDEX, RATE_GRID, RATE_WEEKS, type RateLaneRow } from '@/data/rate-grid'
import { DEMO_NOW_MS } from '@/lib/demo-clock'
import { rng } from '@/lib/seed'

/**
 * THE SAILING SCHEDULE
 * ══════════════════════════════════════════════════════════════════════════
 * Weekly departures on the ocean lanes this account trades.
 *
 * Every other record in the demo describes a shipment that already has a
 * booking. Nothing answered the question that comes *before* a booking —
 * "when can it actually leave?" — so the first question Zeno suggests had no
 * record behind it, and an answer engine with no record either invents a
 * vessel or says nothing. This file is that record.
 *
 * How it derives, and why each dependency is deliberate:
 *
 *  · Lanes and transit bands come from the rate grid's rows, which take them
 *    from `data/lanes.ts`. A sailing cannot claim a transit the lane does not.
 *  · Departures per week is the same `sailingsPerWeek` figure the Rate
 *    Terminal publishes, so a lane cannot say "two sailings a week" on one
 *    screen and list three departures on another.
 *  · Carriers, services and vessel names are the ones already on the authored
 *    bookings, so MSC Aurora appears on an MSC service and nowhere else.
 *  · Weeks are anchored on the rate grid's own Sunday, so a rate week and a
 *    sailing week are the same week.
 *
 * Nothing is random at runtime. Every offset draws from `rng()` keyed on lane
 * and week, so the schedule read before a reload is the schedule read after
 * it — a demo whose departure dates move while someone is looking at them
 * stops being a schedule and becomes noise.
 */

/* ══════════════════════════════════════════════════════════════════════════
   SHAPE
   ══════════════════════════════════════════════════════════════════════════ */

export interface SailingCutoffs {
  shippingInstruction: string
  vgm: string
  gateIn: string
}

export interface Sailing {
  id: string
  laneId: string
  originId: string
  destinationId: string
  carrierId: string
  carrierName: string
  vessel: string
  voyage: string
  service: string
  etd: string
  eta: string
  cutoffs: SailingCutoffs
  /** Port-to-port days for this departure, inside the lane's band. */
  transitDays: number
  /** False when the rotation relays through a hub instead of sailing straight. */
  direct: boolean
  /** The hub a non-direct rotation connects at. */
  transhipmentPortId?: string
}

/* ══════════════════════════════════════════════════════════════════════════
   SERVICES
   ══════════════════════════════════════════════════════════════════════════
   Carrier names, service names and vessel names are duplicated from the seed
   rather than imported: `data/index.ts` keeps its generated-booking pools
   module-private, and exporting them purely to satisfy this file would make a
   private construction detail part of the seed's public surface. The pools are
   small and the comment is the contract — if a vessel is renamed there, rename
   it here.
   ══════════════════════════════════════════════════════════════════════════ */

interface SailingService {
  id: string
  carrierId: string
  carrierName: string
  /** Container prefix, reused in the sailing id so a service reads consistently. */
  prefix: string
  name: string
  /** The string of vessels deployed on the rotation. */
  vessels: string[]
}

const SERVICES: SailingService[] = [
  {
    id: 'SVC-MSC-FIX',
    carrierId: 'CARR-MSC',
    carrierName: 'MSC',
    prefix: 'MSCU',
    name: 'Far East – West India Express (FIX)',
    vessels: ['MSC Aurora', 'MSC Larissa', 'MSC Ilaria', 'MSC Palak', 'MSC Regulus'],
  },
  {
    id: 'SVC-ONE-CIX',
    carrierId: 'CARR-ONE',
    carrierName: 'ONE',
    prefix: 'ONEY',
    name: 'China India Express (CIX)',
    vessels: ['ONE Meridian', 'ONE Cygnus', 'ONE Apus'],
  },
  {
    id: 'SVC-HAPAG-IPX',
    carrierId: 'CARR-HAPAG',
    carrierName: 'Hapag-Lloyd',
    prefix: 'HLCU',
    name: 'India Pakistan Express (IPX)',
    vessels: ['Hapag Kobe Express', 'Hapag Osaka Express'],
  },
  {
    id: 'SVC-CMA-SBX',
    carrierId: 'CARR-CMACGM',
    carrierName: 'CMA CGM',
    prefix: 'CMAU',
    name: 'Straits – Bay of Bengal (SBX)',
    vessels: ['CMA CGM Bengal', 'CMA CGM Konya', 'CMA CGM Nabucco'],
  },
  {
    id: 'SVC-MAERSK-WIN',
    carrierId: 'CARR-MAERSK',
    carrierName: 'Maersk',
    prefix: 'MAEU',
    name: 'West India – North Europe (WIN)',
    vessels: ['Maersk Cardiff', 'Maersk Kolkata', 'Maersk Surabaya'],
  },
]

const SERVICE_INDEX = new Map(SERVICES.map((s) => [s.id, s]))

/* ══════════════════════════════════════════════════════════════════════════
   ROTATIONS — which services call a lane, and how they get there
   ══════════════════════════════════════════════════════════════════════════
   Direct versus transhipment is a property of the rotation, not a coin toss
   per departure: a service either sails the lane straight or it relays at a
   hub, week after week. Modelling it that way means the same weekly slot
   keeps the same routing, which is what lets a customer say "I always take
   the Tuesday direct one".
   ══════════════════════════════════════════════════════════════════════════ */

interface LaneRotation {
  serviceId: string
  /** Set when this rotation connects at a hub rather than sailing direct. */
  viaPortId?: string
}

const LANE_ROTATIONS: Record<string, LaneRotation[]> = {
  'CNSHA-INNSA-FCL': [
    { serviceId: 'SVC-MSC-FIX' },
    { serviceId: 'SVC-ONE-CIX' },
    { serviceId: 'SVC-HAPAG-IPX', viaPortId: 'SGSIN' },
  ],
  'CNSHA-INMUN-FCL': [{ serviceId: 'SVC-MSC-FIX' }, { serviceId: 'SVC-ONE-CIX', viaPortId: 'SGSIN' }],
  'CNSHA-INMAA-FCL': [{ serviceId: 'SVC-CMA-SBX' }, { serviceId: 'SVC-ONE-CIX', viaPortId: 'SGSIN' }],
  'CNNGB-INNSA-FCL': [{ serviceId: 'SVC-ONE-CIX' }, { serviceId: 'SVC-MSC-FIX', viaPortId: 'SGSIN' }],
  'SGSIN-INNSA-FCL': [{ serviceId: 'SVC-CMA-SBX' }, { serviceId: 'SVC-MSC-FIX' }, { serviceId: 'SVC-HAPAG-IPX' }],
  'AEJEA-INNSA-FCL': [{ serviceId: 'SVC-HAPAG-IPX' }, { serviceId: 'SVC-MSC-FIX' }],
  'AEJEA-INMUN-FCL': [{ serviceId: 'SVC-HAPAG-IPX' }, { serviceId: 'SVC-MSC-FIX' }],
  // One direct string and one that relays at Jebel Ali — the same carrier can
  // sell both, and the relay is the cheaper, slower half of the pair.
  'INNSA-NLRTM-FCL': [{ serviceId: 'SVC-MAERSK-WIN' }, { serviceId: 'SVC-MAERSK-WIN', viaPortId: 'AEJEA' }],
  'INMUN-NLRTM-FCL': [{ serviceId: 'SVC-MAERSK-WIN' }],
}

/* ══════════════════════════════════════════════════════════════════════════
   BUILD
   ══════════════════════════════════════════════════════════════════════════ */

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000
const MINUTE_MS = 60_000

/**
 * One completed week behind and eight ahead.
 *
 * The past week is there so a departure that has already sailed can be
 * excluded rather than silently absent, and eight forward weeks is what a
 * once-a-week lane needs before it can show six upcoming departures.
 */
const FIRST_WEEK_OFFSET = -1
const LAST_WEEK_OFFSET = 8

/** The rate grid's current Sunday, so both calendars agree. */
const CURRENT_WEEK_START_MS = new Date(RATE_WEEKS[CURRENT_WEEK_INDEX].startsAt).getTime()

/**
 * Voyage suffix by trade direction, following the authored bookings:
 * MSC Aurora 626E runs Far East → India, Maersk Cardiff 634W runs India →
 * Europe, CMA CGM Bengal 441S runs the Straits into the Bay of Bengal.
 */
function voyageSuffix(destinationId: string): string {
  if (destinationId === 'NLRTM') return 'W'
  if (destinationId === 'INMAA') return 'S'
  return 'E'
}

function buildLaneSailings(row: RateLaneRow): Sailing[] {
  const rotations = LANE_ROTATIONS[row.laneId]
  if (!rotations || rotations.length === 0) return []

  const perWeek = Math.max(1, row.sailingsPerWeek)
  // A service keeps its own voyage sequence, so numbers climb week on week
  // instead of jumping about — an operations person reads a voyage number as
  // an ordinal, and a schedule that breaks that reads as fake.
  const voyageBase = rng(`sailing-voyage-${row.laneId}`).int(180, 640)
  const midTransit = Math.round((row.transitMinDays + row.transitMaxDays) / 2)

  const out: Sailing[] = []

  for (let week = FIRST_WEEK_OFFSET; week <= LAST_WEEK_OFFSET; week++) {
    const weekStart = CURRENT_WEEK_START_MS + week * 7 * DAY_MS
    const weekOrdinal = week - FIRST_WEEK_OFFSET

    for (let i = 0; i < perWeek; i++) {
      const random = rng(`sailing-${row.laneId}-w${week}-${i}`)
      const rotation = rotations[(weekOrdinal * perWeek + i) % rotations.length]
      const service = SERVICE_INDEX.get(rotation.serviceId)
      if (!service) continue

      // Departures are spread across the week rather than stacked: slot i sits
      // at its share of the seven days, jittered by a day either side.
      const slot = Math.round(((i + 0.5) * 7) / perWeek)
      const day = Math.min(6, Math.max(0, slot + random.int(-1, 1)))
      const etdMs =
        weekStart + day * DAY_MS + random.int(2, 15) * HOUR_MS + random.pick([0, 15, 30, 45]) * MINUTE_MS

      // A relay adds days. Direct rotations sit in the fast half of the lane's
      // band, transhipment rotations in the slow half — which is the whole
      // reason a customer would pay more for the direct one.
      const transitDays = rotation.viaPortId
        ? random.int(midTransit, row.transitMaxDays)
        : random.int(row.transitMinDays, midTransit)

      const voyage = `${voyageBase + weekOrdinal * 2 + i}${voyageSuffix(row.destinationId)}`

      out.push({
        id: `SAIL-${row.originId}-${row.destinationId}-${service.prefix}${voyage}`,
        laneId: row.laneId,
        originId: row.originId,
        destinationId: row.destinationId,
        carrierId: service.carrierId,
        carrierName: service.carrierName,
        vessel: service.vessels[(weekOrdinal + i) % service.vessels.length],
        voyage,
        service: service.name,
        etd: new Date(etdMs).toISOString(),
        eta: new Date(etdMs + transitDays * DAY_MS).toISOString(),
        // Cutoff spacing mirrors the generated bookings in `data/index.ts`, so
        // a sailing that becomes a booking keeps the same deadlines.
        cutoffs: {
          shippingInstruction: new Date(etdMs - 48 * HOUR_MS).toISOString(),
          vgm: new Date(etdMs - 40 * HOUR_MS).toISOString(),
          gateIn: new Date(etdMs - 30 * HOUR_MS).toISOString(),
        },
        transitDays,
        direct: !rotation.viaPortId,
        transhipmentPortId: rotation.viaPortId,
      })
    }
  }

  return out
}

/** Every departure in the window, oldest first. */
export const SAILINGS: Sailing[] = RATE_GRID.flatMap(buildLaneSailings).sort(
  (a, b) => new Date(a.etd).getTime() - new Date(b.etd).getTime(),
)

/* ══════════════════════════════════════════════════════════════════════════
   LOOKUPS
   ══════════════════════════════════════════════════════════════════════════ */

export interface SailingQuery {
  /** How many departures to return. */
  limit?: number
  /** Earliest departure to include. Defaults to the demo clock. */
  fromIso?: string
}

/**
 * The next departures on a pair, in chronological order.
 *
 * Returns an empty array for a pair with no published schedule rather than
 * falling back to a neighbouring lane — Zeno reads this to answer a question
 * about a specific lane, and a near-miss answer is worse than no answer.
 */
export function sailingsBetween(originId: string, destinationId: string, opts: SailingQuery = {}): Sailing[] {
  const from = opts.fromIso ? new Date(opts.fromIso).getTime() : DEMO_NOW_MS
  const limit = opts.limit ?? 5

  const matches: Sailing[] = []
  for (const sailing of SAILINGS) {
    if (sailing.originId !== originId || sailing.destinationId !== destinationId) continue
    if (new Date(sailing.etd).getTime() < from) continue
    matches.push(sailing)
    if (matches.length >= limit) break
  }
  return matches
}

/** Published departures a week on a pair, or undefined where none is scheduled. */
export function sailingFrequency(originId: string, destinationId: string): number | undefined {
  const row = RATE_GRID.find((r) => r.originId === originId && r.destinationId === destinationId)
  if (!row || !LANE_ROTATIONS[row.laneId]) return undefined
  return row.sailingsPerWeek
}

/** Pairs with a published schedule — used to decline a lane rather than guess at it. */
export function hasSchedule(originId: string, destinationId: string): boolean {
  return sailingFrequency(originId, destinationId) !== undefined
}

/**
 * The cutoff basis, rendered wherever a departure is shown.
 *
 * A cutoff quoted without what it is counted back from is the fastest way to
 * miss one.
 */
export const SAILING_CUTOFF_BASIS =
  'Cutoffs are counted back from departure: shipping instruction 48 hours, verified gross mass 40 hours, gate-in 30 hours. Carriers vary — the booking confirmation is the authority.'

export const SAILING_DISCLAIMER =
  'Illustrative demo schedule. Vessels, voyages and departure dates are simulated and are not a carrier schedule.'
