import type { ZenoIntent } from '@/lib/zeno'

import { financeIntent } from './finance'
import { hsLookupIntent } from './hs-lookup'
import { portChargesIntent } from './port-charges'
import { rateLookupIntent } from './rate-lookup'
import { sailingScheduleIntent } from './sailing-schedule'
import { shipmentStatusIntent } from './shipment-status'

/**
 * ZENO — THE SPECIFIC INTENTS, IN PRIORITY ORDER
 * ══════════════════════════════════════════════════════════════════════════
 * First match wins, so this order is the routing table. It is ordered by how
 * narrow an intent's entity is: an intent that requires a resolvable lane
 * plus a schedule word can only be asked one kind of question, while the
 * glossary matches on a bare "what is", which is how half of all questions
 * open. Narrow first, broad last, `explain` last of all — registered in
 * `lib/zeno/index.ts`, which appends it behind everything here.
 *
 * Why each one sits where it does:
 *
 *  1 · sailing-schedule  Needs a schedule word AND a scheduled pair. Nothing
 *                        else can satisfy both, so it is safe at the top and
 *                        it must be above rate-lookup: "what do sailings from
 *                        Shanghai to Mundra cost" contains a rate word too,
 *                        and the question asked for departures.
 *
 *  2 · rate-lookup       Needs a rate word AND a lane the grid publishes.
 *                        Above port-charges because "cost" and "charges"
 *                        overlap, and a two-port question is a lane question.
 *
 *  3 · port-charges      Needs a charge word AND exactly one profiled port.
 *                        The single-port requirement is what stops it
 *                        answering a lane question with one end's tariff.
 *
 *  4 · shipment-status   Needs a job reference or an explicit "my shipments".
 *                        Below the lane intents because a reference is
 *                        unmistakable and never collides with them.
 *
 *  5 · finance           Needs a money word. Broader than the four above —
 *                        "what do I owe" carries no other entity — so it sits
 *                        under them rather than catching "cost" first.
 *
 *  6 · hs-lookup         Needs a classification word or a code, and a line
 *                        that actually resolves. Last of the specific
 *                        intents because a commodity name alone is ambiguous
 *                        with an operations question about the same cargo.
 *
 * Then `explain`, which answers "what is X" out of the glossary and would
 * otherwise swallow "what is the 40HC rate from Shanghai to Nhava Sheva".
 */
export const INTENT_REGISTRY: ZenoIntent[] = [
  sailingScheduleIntent,
  rateLookupIntent,
  portChargesIntent,
  shipmentStatusIntent,
  financeIntent,
  hsLookupIntent,
]

export { financeIntent, hsLookupIntent, portChargesIntent, rateLookupIntent, sailingScheduleIntent, shipmentStatusIntent }
