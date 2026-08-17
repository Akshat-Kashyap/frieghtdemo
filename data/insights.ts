import { DEMO_FX_USD_INR } from '@/data/charge-catalog'
import { CONTRACTS, utilisationPct, type Contract } from '@/data/contracts'
import { DEMO } from '@/data/copy'
import { ORGANISATION, documentsNeedingAttention } from '@/data/org'
import { portProfile, type ChargeBand, type FreeTimeSlab, type PortProfile } from '@/data/port-profiles'
import { requirePort } from '@/data/ports'
import {
  CURRENT_WEEK_INDEX,
  RATE_BASIS,
  RATE_WEEKS,
  rateCell,
  rateInContext,
  rateRow,
  type RateCell,
  type RateEquipment,
  type RateLaneRow,
} from '@/data/rate-grid'
import { RFQS, type Rfq, type RfqResponse } from '@/data/rfqs'
import { daysFromNow, daysUntil } from '@/lib/demo-clock'
// `moneyUsd` aliased to `usd`: the rate spelling this file needs is the one
// lib/format already owns — "USD 4,235", not money()'s "$4,235" — and an
// article quoting a lane must read identically to the rate terminal quoting
// the same lane. The alias keeps the ~40 call sites below unchanged.
import { count, money, moneyUsd as usd, percent, transitRange } from '@/lib/format'
import { ROUTES } from '@/lib/routes'

/**
 * INSIGHTS — THE EDITORIAL SURFACE
 * ══════════════════════════════════════════════════════════════════════════
 * Eight written pieces about the freight this account actually moves.
 *
 * The whole point of this module is that it is *not* a blog bolted onto a
 * product. Every figure quoted below is read out of the same seeded data the
 * rest of the application renders — the rate grid, the port profiles, the
 * contracts, the requests and the organisation's own verification state — so
 * a reader can follow the deep links at the foot of an article and land on
 * the screen showing the identical number.
 *
 * That is why the prose is assembled with template literals rather than typed
 * out as flat copy. A hand-typed "USD 4,180" is correct for exactly as long
 * as nobody touches `data/contracts.ts`, and an article that contradicts the
 * screen it links to is worse than no article at all. Anything that could
 * drift is derived here; only the interpretation is authored.
 *
 * The boundary applies in full. Customs appears in one piece, as an external
 * partner dependency with a status, and nowhere else — see `lib/boundaries.ts`.
 */

/* ══════════════════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════════════════ */

export type InsightCategory = 'MARKET' | 'OPERATIONS' | 'COMMERCIAL' | 'GUIDE'

/**
 * The block vocabulary an article may use.
 *
 * Deliberately small and deliberately not markdown. A closed union means the
 * renderer can switch exhaustively — adding a block kind here is a compile
 * error in `components/insights/insight-article.tsx` until it is drawn — and
 * it keeps arbitrary markup out of a surface that only ever needs six shapes.
 */
export type InsightBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; ordered?: boolean; items: string[] }
  | { kind: 'callout'; tone: 'neutral' | 'amber'; title?: string; text: string }
  | {
      kind: 'table'
      columns: string[]
      rows: Array<Array<string | number>>
      /** Column indices to right-align and set in tabular figures. */
      numericColumns?: number[]
      caption?: string
    }
  | { kind: 'quote'; text: string; attribution: string }

export interface InsightArticle {
  slug: string
  title: string
  /** One-sentence standfirst. Carries the numbers so the title can stay short. */
  dek: string
  category: InsightCategory
  author: { name: string; title: string }
  publishedAt: string
  readMinutes: number
  tags: string[]
  /** Three "what this changes" takeaways, shown above the body. */
  summary: string[]
  body: InsightBlock[]
  relatedSlugs: string[]
  /** Deep links into the application, always built from `ROUTES`. */
  links: Array<{ label: string; href: string }>
}

/**
 * What an article is authored as.
 *
 * `readMinutes` is computed from the body rather than typed in, because a
 * hand-set read time is wrong the moment a paragraph is added and nobody ever
 * remembers to change it.
 */
type AuthoredInsight = Omit<InsightArticle, 'readMinutes'>

/* ══════════════════════════════════════════════════════════════════════════
   LOOKUPS THAT THROW
   ══════════════════════════════════════════════════════════════════════════
   Every helper below refuses to return undefined. An article that silently
   renders "USD undefined" is the exact failure this module exists to prevent,
   so a missing lane or a renamed charge band breaks the build instead.
   ══════════════════════════════════════════════════════════════════════════ */

function requireRow(laneId: string): RateLaneRow {
  const row = rateRow(laneId)
  if (!row) throw new Error(`insights: no rate row for lane ${laneId}`)
  return row
}

function requireCell(laneId: string, equipment: RateEquipment, weekIndex = CURRENT_WEEK_INDEX): RateCell {
  const cell = rateCell(laneId, equipment, weekIndex)
  if (!cell) throw new Error(`insights: no ${equipment} rate for ${laneId} in week ${weekIndex}`)
  return cell
}

function requireContext(laneId: string, equipment: RateEquipment) {
  const context = rateInContext(laneId, equipment)
  if (!context) throw new Error(`insights: no rate context for ${laneId} ${equipment}`)
  return context
}

function requireProfile(portId: string): PortProfile {
  const profile = portProfile(portId)
  if (!profile) throw new Error(`insights: no port profile for ${portId}`)
  return profile
}

function requireContract(id: string): Contract {
  const found = CONTRACTS.find((c) => c.id === id)
  if (!found) throw new Error(`insights: no contract ${id}`)
  return found
}

function requireContractLane(contract: Contract, laneId: string) {
  const lane = contract.lanes.find((l) => l.laneId === laneId)
  if (!lane) throw new Error(`insights: contract ${contract.id} has no lane ${laneId}`)
  return lane
}

function requireRfq(id: string): Rfq {
  const found = RFQS.find((r) => r.id === id)
  if (!found) throw new Error(`insights: no request ${id}`)
  return found
}

function requireResponse(rfq: Rfq, partnerName: string): RfqResponse {
  const found = rfq.responses.find((r) => r.partnerName === partnerName)
  if (!found) throw new Error(`insights: ${rfq.id} has no response from ${partnerName}`)
  return found
}

function requireBand(profile: PortProfile, label: string): ChargeBand {
  const band = profile.handling.find((b) => b.label === label)
  if (!band) throw new Error(`insights: ${profile.portId} has no handling band "${label}"`)
  return band
}

/* ══════════════════════════════════════════════════════════════════════════
   PROSE HELPERS
   ══════════════════════════════════════════════════════════════════════════ */

/** "down USD 10 on the week" · "unchanged on the week" */
function weekMove(current: number, previous: number): string {
  const delta = current - previous
  if (delta === 0) return 'unchanged on the week'
  return `${delta < 0 ? 'down' : 'up'} ${usd(Math.abs(delta))} on the week`
}

/**
 * "1 sailing" · "2 sailings" · "3 containers".
 *
 * Grammar that survives a data change. Every one of these counts is derived,
 * so a hand-written plural is a sentence waiting to read "1 sailings" the day
 * a schedule is edited.
 */
function counted(n: number, singular: string, plural = `${singular}s`): string {
  return `${count(n)} ${n === 1 ? singular : plural}`
}

/**
 * What a slab table actually costs, for days `freeDays + 1` through `lastDay`.
 *
 * Written as a day-by-day walk rather than a multiplication because the whole
 * point of a slab structure is that the rate changes partway through: a box
 * held twelve days at Nhava Sheva pays five days at the first storage rate and
 * two at the second, and anyone multiplying by a single figure understates it.
 */
function slabAccrual(slabs: FreeTimeSlab[], freeDays: number, lastDay: number): number {
  let total = 0
  for (let day = freeDays + 1; day <= lastDay; day++) {
    const slab = slabs.find((s) => day >= s.fromDay && day <= (s.toDay ?? Number.POSITIVE_INFINITY))
    if (slab) total += slab.amount
  }
  return total
}

function firstSlab(slabs: FreeTimeSlab[]): FreeTimeSlab {
  const slab = slabs[0]
  if (!slab) throw new Error('insights: free-time slab table is empty')
  return slab
}

/** How many weeks in a history series closed higher than the one before. */
function risingWeeks(history: number[]): { up: number; of: number } {
  let up = 0
  for (let i = 1; i < history.length; i++) if (history[i]! > history[i - 1]!) up++
  return { up, of: history.length - 1 }
}

const ASSURANCE_LABEL: Record<RateCell['assurance'], string> = {
  ASSURED: 'Partner-confirmed',
  INDICATIVE: 'Indicative',
}

/* ══════════════════════════════════════════════════════════════════════════
   THE FIGURES EVERY ARTICLE DRAWS ON
   ══════════════════════════════════════════════════════════════════════════ */

const SHA_MUN = 'CNSHA-INMUN-FCL'
const SHA_NSA = 'CNSHA-INNSA-FCL'
const NGB_NSA = 'CNNGB-INNSA-FCL'
const SHA_MAA = 'CNSHA-INMAA-FCL'
const NSA_RTM = 'INNSA-NLRTM-FCL'

const NSA = requireProfile('INNSA')
const MUNDRA = requireProfile('INMUN')
const CHENNAI = requireProfile('INMAA')

const FE_CONTRACT = requireContract('CTR-2026-0041')
const INLAND_CONTRACT = requireContract('CTR-2026-0033')
const PREVIOUS_CONTRACT = requireContract('CTR-2025-0187')

const AWARDED_RFQ = requireRfq('RFQ-2026-0118')
const LIVE_RFQ = requireRfq('RFQ-2026-0143')
const EXPORT_RFQ = requireRfq('RFQ-2026-0156')
const LAPSED_RFQ = requireRfq('RFQ-2026-0102')

const THIS_WEEK = RATE_WEEKS[CURRENT_WEEK_INDEX]!
const LAST_WEEK = RATE_WEEKS[CURRENT_WEEK_INDEX - 1]!
const NEXT_WEEK = RATE_WEEKS[CURRENT_WEEK_INDEX + 1]!
const WEEK_AFTER = RATE_WEEKS[CURRENT_WEEK_INDEX + 2]!

/* ══════════════════════════════════════════════════════════════════════════
   1 · MARKET — the weekly rate note
   ══════════════════════════════════════════════════════════════════════════ */

const munRow = requireRow(SHA_MUN)
const mun20 = requireCell(SHA_MUN, '20FT')
const mun20Prev = requireCell(SHA_MUN, '20FT', CURRENT_WEEK_INDEX - 1)
const mun20Next = requireCell(SHA_MUN, '20FT', CURRENT_WEEK_INDEX + 1)
const mun20Far = requireCell(SHA_MUN, '20FT', CURRENT_WEEK_INDEX + 2)
const mun40 = requireCell(SHA_MUN, '40HC')
const mun20Ctx = requireContext(SHA_MUN, '20FT')
const mun40Ctx = requireContext(SHA_MUN, '40HC')
const munContractLane = requireContractLane(FE_CONTRACT, SHA_MUN)
const munFiveWeeksBack = munRow.history[munRow.history.length - 6]!
const munRise = risingWeeks(munRow.history)

const RATE_NOTE: AuthoredInsight = {
  slug: 'shanghai-mundra-20ft-this-week',
  title: 'Why the Shanghai–Mundra 20ft moved this week',
  dek: `The 20ft prints at ${usd(mun20.amountUsd)} for ${THIS_WEEK.label}, ${weekMove(mun20.amountUsd, mun20Prev.amountUsd)} — and the eight-week average says the fall is noise while the level is not.`,
  category: 'MARKET',
  author: { name: 'Meera Nambiar', title: 'Rate desk' },
  publishedAt: daysFromNow(-1),
  tags: ['Rates', 'Far East – West India', 'Booking timing'],
  summary: [
    `The week-on-week move is ${percent(Math.abs(mun20.deltaPct ?? 0), 1)} and the board still reads ${mun20.trend.toLowerCase()}. Do not book off a step that small.`,
    `The lane is ${mun20Ctx.label.toLowerCase()} — that is the figure that should decide timing, not the week.`,
    `Your contracted 40HC on this lane is ${usd(munContractLane.rateUsd)} against ${usd(mun40.amountUsd)} spot. The commitment has caught up with the market.`,
  ],
  body: [
    {
      kind: 'paragraph',
      text: `The 20ft on Shanghai to Mundra is quoted at ${usd(mun20.amountUsd)} for the week of ${THIS_WEEK.label}, ${weekMove(mun20.amountUsd, mun20Prev.amountUsd)} against ${usd(mun20Prev.amountUsd)} for ${LAST_WEEK.label}. The rate terminal marks that cell ${mun20.trend.toLowerCase()} rather than softening, and the distinction is deliberate: a step of ${percent(Math.abs(mun20.deltaPct ?? 0), 1)} sits inside the band the board treats as noise. Ten dollars a container is not a market signal. It is the difference between two quotes issued four days apart.`,
    },
    {
      kind: 'paragraph',
      text: `Weekly movement on an ocean lane is close to meaningless on its own, which is why every figure on the terminal carries its eight-week context alongside it. On this lane that context reads ${mun20Ctx.label.toLowerCase()}: the comparable average is ${usd(mun20Ctx.average)} and today’s print is above it. The 40HC tells the same story from a different base — ${usd(mun40.amountUsd)} today against an average of ${usd(mun40Ctx.average)}.`,
    },
    { kind: 'heading', text: 'Read the level, not the week' },
    {
      kind: 'paragraph',
      text: `The twelve-week history behind the sparkline closed higher than the week before it on ${count(munRise.up)} of ${count(munRise.of)} occasions. That is a lane grinding upward with regular weeks off, not a lane that has turned. Five weeks ago the same 40HC was around ${usd(munFiveWeeksBack)}. It is ${usd(mun40.amountUsd)} now. Anyone who read the last soft week as the start of a correction has spent five weeks waiting for a rate that never came back.`,
    },
    {
      kind: 'table',
      columns: ['Week', '20ft', '40HC', 'Assurance'],
      rows: RATE_WEEKS.map((week) => {
        const twenty = requireCell(SHA_MUN, '20FT', week.index)
        const forty = requireCell(SHA_MUN, '40HC', week.index)
        return [
          week.isCurrent ? `${week.label} · this week` : week.label,
          usd(twenty.amountUsd),
          usd(forty.amountUsd),
          ASSURANCE_LABEL[twenty.assurance],
        ]
      }),
      numericColumns: [1, 2],
      caption: `All-in, port to port, on the basis stated at the foot of the rate terminal. ${LAST_WEEK.label} is a completed week; the two after this one are forward quotes.`,
    },
    { kind: 'heading', text: 'What the forward weeks are actually telling you' },
    {
      kind: 'list',
      items: [
        `${NEXT_WEEK.label} is quoted at ${usd(mun20Next.amountUsd)} for a 20ft and is ${ASSURANCE_LABEL[mun20Next.assurance].toLowerCase()}. ${WEEK_AFTER.label} is ${usd(mun20Far.amountUsd)} and is not — nobody confirms a rate three weeks out.`,
        `There are ${counted(munRow.sailingsPerWeek, 'sailing')} a week on this lane. A booking that slips a week slips every one of them, and on a firming lane the departures you slip to are the expensive ones.`,
        `Transit is ${transitRange(munRow.transitMinDays, munRow.transitMaxDays)}. A box gated in against the last partner-confirmed week still arrives inside the same month as one gated in today.`,
      ],
    },
    {
      kind: 'callout',
      tone: 'amber',
      title: 'Assurance is not a forecast',
      text: 'A partner-confirmed cell means someone has committed to that number for that week. An indicative cell is the desk’s read of where the market is heading and it moves. Plan against the confirmed weeks; treat the rest as a planning figure, not a price.',
    },
    { kind: 'heading', text: 'On this lane, the contract has already caught up' },
    {
      kind: 'paragraph',
      text: `${FE_CONTRACT.id} carries Shanghai to Mundra at ${usd(munContractLane.rateUsd)} for a 40HC with ${counted(munContractLane.freeTimeDays, 'free day')} at destination. Spot this week is ${usd(mun40.amountUsd)}. The two are effectively level, and five weeks ago they were not: the contract looked expensive against a spot board around ${usd(munFiveWeeksBack)}, and the free time it carries was the only obvious thing it was buying.`,
    },
    {
      kind: 'paragraph',
      text: `That is what a volume commitment is for. It is not a bet that the desk can pick the bottom of a market — it is a ceiling bought in advance, and the premium is only ever visible in hindsight. The corollary matters just as much: with the contract now level with spot, the case for hitting the committed volume this period is stronger, not weaker, because the rate is not going to be re-offered at this level if the commitment is missed.`,
    },
    {
      kind: 'quote',
      text: 'Customers ask us whether the rate is good. The honest answer is that a rate is never good or bad on its own — it is only high or low against the eight weeks behind it and the free time attached to it.',
      attribution: 'Meera Nambiar, rate desk',
    },
    {
      kind: 'paragraph',
      text: `The practical read for the week: book against the partner-confirmed columns, do not wait for the ten dollars to come back, and put the renewal conversation in the diary now rather than in the last fortnight of validity — by then the only number anyone has to negotiate with is the one on the screen.`,
    },
  ],
  relatedSlugs: ['contracted-rate-versus-spot', 'what-all-in-port-to-port-includes', 'free-time-at-indian-gateway-ports'],
  links: [
    { label: 'Open the rate terminal', href: ROUTES.rateTerminal },
    { label: `Open ${FE_CONTRACT.id}`, href: ROUTES.contract(FE_CONTRACT.id) },
    { label: 'Mundra port profile', href: ROUTES.port('INMUN') },
    { label: 'Price this lane now', href: ROUTES.search },
  ],
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · OPERATIONS — the two clocks
   ══════════════════════════════════════════════════════════════════════════ */

const nsaDetention = NSA.freeTime.detentionSlabs
const nsaStorage = NSA.freeTime.storageSlabs
const nsaDetentionFirst = firstSlab(nsaDetention)
const nsaStorageFirst = firstSlab(nsaStorage)
const nsaStorageLast = nsaStorage[nsaStorage.length - 1]!
const nsaDetentionLast = nsaDetention[nsaDetention.length - 1]!

/** The worked example: discharged day 0, out of the terminal day 12, empty back day 10 after that. */
const GATE_OUT_DAY = 12
const EMPTY_RETURN_DAY = 10
const storageBill = slabAccrual(nsaStorage, NSA.freeTime.storageFreeDays, GATE_OUT_DAY)
const detentionBill20 = slabAccrual(nsaDetention, NSA.freeTime.detentionFreeDays, EMPTY_RETURN_DAY)
const detentionBill40 = detentionBill20 * 2

const TWO_CLOCKS: AuthoredInsight = {
  slug: 'detention-and-storage-are-two-clocks',
  title: 'Detention and storage are two clocks, not one',
  dek: `Storage at Nhava Sheva gives you ${counted(NSA.freeTime.storageFreeDays, 'day')} and detention ${count(NSA.freeTime.detentionFreeDays)}; they start on different events, they are payable to different parties, and a delayed shipment runs both at once.`,
  category: 'OPERATIONS',
  author: { name: 'Farhan Qureshi', title: 'Gateway operations' },
  publishedAt: daysFromNow(-4),
  tags: ['Free time', 'Nhava Sheva', 'Detention', 'Storage'],
  summary: [
    'Storage runs while the box is inside the terminal. Detention runs from the moment it leaves until the empty is returned. They are different charges to different parties and both can be running.',
    `The slabs escalate. At Nhava Sheva storage roughly doubles on day ${count(nsaStorageLast.fromDay)}, and detention reaches ${usd(nsaDetentionLast.amount)} a day per 20ft from day ${count(nsaDetentionLast.fromDay)}.`,
    `One slipped delivery week on a single 40HC is worth roughly ${money(storageBill, 'INR')} of storage and ${usd(detentionBill40)} of detention. Neither appears on your quote.`,
  ],
  body: [
    {
      kind: 'paragraph',
      text: 'These two charges are confused more often than any other pair in the business, and the confusion is expensive rather than academic. They are levied by different parties, they start on different events, and being clear about which one is running tells you exactly which lever to pull.',
    },
    {
      kind: 'paragraph',
      text: `Storage — invoiced in India as port or CFS storage, and called demurrage in most of the rest of the world — accrues while the loaded container is still sitting inside the terminal after the free period ends. Detention accrues from the moment the container passes the terminal gate until you hand the empty back at the carrier’s nominated depot. At Nhava Sheva the free periods are ${count(NSA.freeTime.storageFreeDays)} days and ${count(NSA.freeTime.detentionFreeDays)} days respectively, counted in calendar days including weekends and public holidays.`,
    },
    { kind: 'heading', text: 'The slabs are the part that hurts' },
    {
      kind: 'paragraph',
      text: `Neither charge is flat. Both escalate, and the escalation is the mechanism designed to get the box back. Knowing that storage steps up on day ${count(nsaStorageLast.fromDay)} changes behaviour in a way that knowing the day-one rate never does — it converts a vague “we should sort this out soon” into a dated decision.`,
    },
    {
      kind: 'table',
      columns: ['Clock', 'Free days', 'Then', 'And then', 'Payable to'],
      rows: [
        [
          'Storage — box inside the terminal',
          NSA.freeTime.storageFreeDays,
          `${money(nsaStorageFirst.amount, 'INR')} / day (days ${nsaStorageFirst.fromDay}–${nsaStorageFirst.toDay ?? ''})`,
          `${money(nsaStorageLast.amount, 'INR')} / day from day ${nsaStorageLast.fromDay}`,
          'Terminal or line',
        ],
        [
          'Detention — box outside, empty not returned',
          NSA.freeTime.detentionFreeDays,
          `${usd(nsaDetentionFirst.amount)} / day per 20ft (days ${nsaDetentionFirst.fromDay}–${nsaDetentionFirst.toDay ?? ''})`,
          `${usd(nsaDetentionLast.amount)} / day per 20ft from day ${nsaDetentionLast.fromDay}`,
          'Shipping line',
        ],
      ],
      numericColumns: [1],
      caption: `Indicative bands from the Nhava Sheva profile. A 40ft container is charged at roughly double the 20ft detention rate. ${DEMO.simulatedValues}`,
    },
    { kind: 'heading', text: 'A worked example, because the arithmetic is the argument' },
    {
      kind: 'paragraph',
      text: `Take one 40HC discharged at Nhava Sheva. The delivery plan slips and the box leaves the terminal on day ${count(GATE_OUT_DAY)}. Storage has been running since day ${count(NSA.freeTime.storageFreeDays + 1)}, and because it crosses a slab boundary the bill is not one rate multiplied by seven days — it is ${money(storageBill, 'INR')}.`,
    },
    {
      kind: 'paragraph',
      text: `Now the second clock starts. The box goes to the plant, waits to be unloaded, and the empty is returned ${count(EMPTY_RETURN_DAY)} days after it left the terminal. Detention free time covers the first ${count(NSA.freeTime.detentionFreeDays)} of those days; the remainder accrues at ${usd(nsaDetentionFirst.amount)} per 20ft per day, so roughly ${usd(detentionBill40)} for a 40HC. Combined exposure on one container, from one slipped week: ${money(storageBill, 'INR')} and ${usd(detentionBill40)}.`,
    },
    {
      kind: 'callout',
      tone: 'amber',
      title: 'Neither of these is on your quote',
      text: 'Both are carried in this product as exposure rather than as a quoted charge, because they are only owed if something goes wrong. A quote that lists them as line items is quietly telling you it expects them, and a quote that never mentions them is telling you nothing at all.',
    },
    { kind: 'heading', text: 'What to do with this' },
    {
      kind: 'list',
      ordered: true,
      items: [
        'Know both free-time numbers for the arrival port before the vessel berths, not after. They are on every port profile in this product.',
        'Treat the day the first slab starts as the real deadline, and work the delivery plan backwards from it.',
        'If the cargo cannot be taken quickly, get the box de-stuffed and the empty returned — that stops the detention clock even while the cargo waits.',
        'Where free time is negotiable, negotiate it at the request stage rather than at arrival. Ten free days written into a contract costs a fraction of five days of detention bought at the gate.',
      ],
    },
    {
      kind: 'paragraph',
      text: `One last thing worth recognising: waivers happen. The port authority has waived storage during disruption events in the past. They are announced per event, they are not a standing entitlement, and no delivery plan should assume one.`,
    },
  ],
  relatedSlugs: ['free-time-at-indian-gateway-ports', 'direct-port-delivery-or-cfs', 'what-all-in-port-to-port-includes'],
  links: [
    { label: 'Nhava Sheva port profile', href: ROUTES.port('INNSA') },
    { label: 'All port profiles', href: ROUTES.ports },
    { label: 'Your shipments and their free-time clocks', href: ROUTES.bookings },
  ],
}

/* ══════════════════════════════════════════════════════════════════════════
   3 · OPERATIONS — the gateway comparison
   ══════════════════════════════════════════════════════════════════════════ */

const chennaiDetentionFirst = firstSlab(CHENNAI.freeTime.detentionSlabs)
const chennaiStorageFirst = firstSlab(CHENNAI.freeTime.storageSlabs)
const mundraStorageFirst = firstSlab(MUNDRA.freeTime.storageSlabs)
const mundraDetentionFirst = firstSlab(MUNDRA.freeTime.detentionSlabs)
const maaRow = requireRow(SHA_MAA)
const nsaRow = requireRow(SHA_NSA)
const maa20 = requireCell(SHA_MAA, '20FT')
const nsa20 = requireCell(SHA_NSA, '20FT')
const freeDayGap = NSA.freeTime.detentionFreeDays - CHENNAI.freeTime.detentionFreeDays

const GATEWAY_FREE_TIME: AuthoredInsight = {
  slug: 'free-time-at-indian-gateway-ports',
  title: 'Free time at Indian gateway ports: why Chennai’s five days changes your delivery plan',
  dek: `Chennai grants ${count(CHENNAI.freeTime.detentionFreeDays)} detention days against ${count(NSA.freeTime.detentionFreeDays)} at Nhava Sheva and Mundra, and its first slab is both earlier and dearer — which is a delivery-planning problem, not a rates problem.`,
  category: 'OPERATIONS',
  author: { name: 'Farhan Qureshi', title: 'Gateway operations' },
  publishedAt: daysFromNow(-8),
  tags: ['Free time', 'Chennai', 'Gateway choice'],
  summary: [
    `${counted(freeDayGap, 'fewer detention day')} at Chennai means the delivery plan has to be finished before arrival rather than after it.`,
    `Chennai’s first storage slab is ${money(chennaiStorageFirst.amount, 'INR')} a day from day ${count(chennaiStorageFirst.fromDay)}; Nhava Sheva’s is ${money(nsaStorageFirst.amount, 'INR')} from day ${count(nsaStorageFirst.fromDay)}.`,
    `Chennai is the faster water — ${transitRange(maaRow.transitMinDays, maaRow.transitMaxDays)} from Shanghai — but there is only ${counted(maaRow.sailingsPerWeek, 'sailing')} a week, so a missed cutoff costs seven days.`,
  ],
  body: [
    {
      kind: 'paragraph',
      text: 'Free time is the single most useful number to know about an arriving shipment, because everything after it is an escalating daily charge. It is also the number most often assumed rather than checked, and the assumption is usually built on whichever gateway the company used last.',
    },
    {
      kind: 'paragraph',
      text: `The three Indian gateways on this account do not agree. Nhava Sheva and Mundra both grant ${count(NSA.freeTime.detentionFreeDays)} detention days and ${count(NSA.freeTime.storageFreeDays)} storage days. Chennai grants ${count(CHENNAI.freeTime.detentionFreeDays)} and ${count(CHENNAI.freeTime.storageFreeDays)}. Two days sounds like a rounding difference until you notice that Chennai’s first storage slab is also higher and starts a day sooner — the shorter clock and the steeper charge compound.`,
    },
    {
      kind: 'table',
      columns: ['Gateway', 'Detention free', 'Storage free', 'First detention slab (20ft)', 'First storage slab'],
      rows: [
        [
          requirePort('INNSA').name,
          NSA.freeTime.detentionFreeDays,
          NSA.freeTime.storageFreeDays,
          `${usd(nsaDetentionFirst.amount)} from day ${nsaDetentionFirst.fromDay}`,
          `${money(nsaStorageFirst.amount, 'INR')} from day ${nsaStorageFirst.fromDay}`,
        ],
        [
          requirePort('INMUN').name,
          MUNDRA.freeTime.detentionFreeDays,
          MUNDRA.freeTime.storageFreeDays,
          `${usd(mundraDetentionFirst.amount)} from day ${mundraDetentionFirst.fromDay}`,
          `${money(mundraStorageFirst.amount, 'INR')} from day ${mundraStorageFirst.fromDay}`,
        ],
        [
          requirePort('INMAA').name,
          CHENNAI.freeTime.detentionFreeDays,
          CHENNAI.freeTime.storageFreeDays,
          `${usd(chennaiDetentionFirst.amount)} from day ${chennaiDetentionFirst.fromDay}`,
          `${money(chennaiStorageFirst.amount, 'INR')} from day ${chennaiStorageFirst.fromDay}`,
        ],
      ],
      numericColumns: [1, 2],
      caption: `Indicative bands, per container per calendar day, weekends and holidays included. Free time is granted by the carrier and varies by contract. ${DEMO.simulatedValues}`,
    },
    { kind: 'heading', text: 'The trade is water against land' },
    {
      kind: 'paragraph',
      text: `Chennai is not the slow option. From Shanghai it runs ${transitRange(maaRow.transitMinDays, maaRow.transitMaxDays)} against ${transitRange(nsaRow.transitMinDays, nsaRow.transitMaxDays)} into Nhava Sheva — the east-coast rotation is quicker on this pairing, and for cargo destined for the southern engineering belt it also removes several hundred kilometres of inland haulage. What it costs you is schedule density and slack on the ground.`,
    },
    {
      kind: 'list',
      items: [
        `Sailings: ${counted(maaRow.sailingsPerWeek, 'departure')} a week from Shanghai to Chennai against ${counted(nsaRow.sailingsPerWeek, 'departure')} to Nhava Sheva. A missed cutoff at origin is a seven-day wait, not a three-day one.`,
        `Rate: ${usd(maa20.amountUsd)} for a 20ft this week against ${usd(nsa20.amountUsd)} into Nhava Sheva — a premium of ${usd(maa20.amountUsd - nsa20.amountUsd)} a box before any inland saving is counted.`,
        `Free time: ${counted(freeDayGap, 'day')} fewer, on a clock that runs through weekends. A vessel arriving on a Friday burns most of its storage allowance before anyone is back at a desk.`,
      ],
    },
    {
      kind: 'callout',
      tone: 'neutral',
      title: 'The rule this leads to',
      text: 'Choose the gateway on the delivery plan, not on the ocean rate. A lane that is a hundred dollars cheaper and gives you two fewer days is a saving only if the cargo can actually move on arrival — and if it cannot, two days of storage and detention on a 40HC will take the saving and more.',
    },
    { kind: 'heading', text: 'What a tighter clock actually demands' },
    {
      kind: 'paragraph',
      text: 'With five days rather than seven, the sequence has to be complete before the vessel berths: documentation released, the external customs partner briefed and holding a status you can see, the transporter booked against a named slot, and the receiving site able to take the container on the day it is offered. None of that is unusual — what is unusual is finishing it in advance rather than starting it on arrival.',
    },
    {
      kind: 'paragraph',
      text: `Chennai also asks one specific question earlier than the west-coast gateways: reefer plug availability should be confirmed at booking rather than assumed, because temperature-controlled cargo with nowhere to plug in has no free time at all. For dry cargo the practical answer is duller and more effective — work backwards from day ${count(chennaiStorageFirst.fromDay)}, and treat the day before it as the delivery deadline.`,
    },
  ],
  relatedSlugs: ['detention-and-storage-are-two-clocks', 'direct-port-delivery-or-cfs', 'shanghai-mundra-20ft-this-week'],
  links: [
    { label: 'Chennai port profile', href: ROUTES.port('INMAA') },
    { label: 'Nhava Sheva port profile', href: ROUTES.port('INNSA') },
    { label: 'Compare gateways in the rate terminal', href: ROUTES.rateTerminal },
  ],
}

/* ══════════════════════════════════════════════════════════════════════════
   4 · COMMERCIAL — what the basis line means
   ══════════════════════════════════════════════════════════════════════════ */

const dthcBand = requireBand(NSA, 'Terminal handling — 40ft dry')
const doBand = requireBand(NSA, 'Delivery order')
const inlandLane = requireContractLane(INLAND_CONTRACT, 'INNSA-INPNQ-FTL')
const midBand = (band: ChargeBand) => Math.round((band.low + band.high) / 2)
const inlandInr = Math.round(inlandLane.rateUsd * DEMO_FX_USD_INR)
const destinationSideInr = midBand(dthcBand) + midBand(doBand) + inlandInr
const destinationSideUsd = Math.round(destinationSideInr / DEMO_FX_USD_INR)
const nsa40 = requireCell(SHA_NSA, '40HC')
const destinationSidePct = Math.round((destinationSideUsd / nsa40.amountUsd) * 100)

const ALL_IN_BASIS: AuthoredInsight = {
  slug: 'what-all-in-port-to-port-includes',
  title: 'What “all-in, port to port” actually includes — and the three charges it does not',
  dek: `A port-to-port 40HC into Nhava Sheva is ${usd(nsa40.amountUsd)} this week. Getting the same box to a door in Pune adds roughly ${usd(destinationSideUsd)} in charges the rate never claimed to cover.`,
  category: 'COMMERCIAL',
  author: { name: 'Kavitha Rao', title: 'Commercial desk' },
  publishedAt: daysFromNow(-12),
  tags: ['Rate basis', 'Charges', 'Comparing quotes'],
  summary: [
    'All-in means all-in for a defined scope. The scope is the sentence printed under every rate in this product, and it stops at the destination quay.',
    `The three charges that land after it — destination terminal handling, the delivery order and inland haulage — add about ${percent(destinationSidePct, 0)} to a Far East 40HC.`,
    'Detention and storage are a fourth category and behave differently: they are exposure, not a charge, and they only appear if something goes wrong.',
  ],
  body: [
    {
      kind: 'paragraph',
      text: 'Two quotes on the same lane, one materially cheaper than the other, are almost never priced on the same basis. Before comparing the numbers it is worth reading the sentence underneath them, because that sentence is the actual product being sold.',
    },
    { kind: 'quote', text: RATE_BASIS, attribution: 'The basis line printed under every rate in this product' },
    {
      kind: 'paragraph',
      text: `That is why a 20ft here can look expensive next to a base ocean-freight figure quoted elsewhere: the base figure is one component and this one is several. Origin terminal handling and documentation are already inside it. Comparing the two without reading the basis is the most common way to misread a rate sheet, and it is the one mistake that reliably survives a procurement process.`,
    },
    { kind: 'heading', text: 'The three charges that land after the quay' },
    {
      kind: 'table',
      columns: ['Charge', 'When it lands', 'Indicative', 'Payable to'],
      rows: [
        [
          'Destination terminal handling',
          'On discharge, per 40ft container',
          `${money(dthcBand.low, 'INR')} – ${money(dthcBand.high, 'INR')}`,
          'Terminal, billed through the carrier',
        ],
        [
          'Delivery order',
          'Before the container can be released',
          `${money(doBand.low, 'INR')} – ${money(doBand.high, 'INR')}`,
          'Carrier or its agent',
        ],
        [
          `Inland haulage to ${requirePort(inlandLane.destinationId).name}`,
          `Per 40HC, under ${INLAND_CONTRACT.id}`,
          `${usd(inlandLane.rateUsd)}`,
          INLAND_CONTRACT.partnerName,
        ],
        [
          'Detention and storage',
          'Only if free time runs out',
          `From ${money(nsaStorageFirst.amount, 'INR')} and ${usd(nsaDetentionFirst.amount)} a day`,
          'Terminal and shipping line',
        ],
      ],
      caption: `Bands from the Nhava Sheva profile; the haulage figure is the contracted rate on ${INLAND_CONTRACT.id}. ${DEMO.financialNotice}`,
    },
    {
      kind: 'paragraph',
      text: `Taken at the middle of each band and converted at the demo’s pinned rate, the destination side comes to about ${money(destinationSideInr, 'INR')} — roughly ${usd(destinationSideUsd)}, or ${percent(destinationSidePct, 0)} on top of the ${usd(nsa40.amountUsd)} port-to-port figure. It is not a hidden cost. It is a cost that was never claimed, which is a different thing, and the only way to be surprised by it is to compare two quotes without checking where each one stops.`,
    },
    { kind: 'heading', text: 'And one category that is outside the product entirely' },
    {
      kind: 'paragraph',
      text: 'Duties and taxes are not in the rate and are not in this platform. Clearance is executed by an external customs partner; PortWhizz tracks the coordination status and the dependency that creates on the freight job, and does nothing else with it. That boundary is deliberate — a freight platform that implies it has performed the regulated work is setting up a dispute rather than a booking.',
    },
    {
      kind: 'callout',
      tone: 'neutral',
      title: 'How to make two quotes comparable in one minute',
      text: 'Write both on the same scope before looking at either number. Add destination handling, the delivery order and haulage to the port-to-port figure, note the free days each one carries, and check the validity date. The cheaper quote changes identity surprisingly often.',
    },
    { kind: 'heading', text: 'Where the basis is stated in the product' },
    {
      kind: 'list',
      items: [
        'Under every cell of the rate terminal, on the same line as the assurance label.',
        'On every request response, as an explicit inclusions and exclusions list rather than a footnote.',
        `On every contract, split into what the rate includes and what it does not — ${FE_CONTRACT.id} lists ${count(FE_CONTRACT.inclusions.length)} inclusions and ${count(FE_CONTRACT.exclusions.length)} exclusions.`,
        'On the quote itself, where each line carries its own basis, payer and tax treatment rather than collapsing into a single total.',
      ],
    },
    {
      kind: 'paragraph',
      text: 'The structure is the product. A freight quote is not a price — it is a set of lines, each with a basis, a payer, a validity and a source, and the moment those collapse into one number the ability to compare anything goes with them.',
    },
  ],
  relatedSlugs: ['contracted-rate-versus-spot', 'writing-a-request-for-quotation', 'detention-and-storage-are-two-clocks'],
  links: [
    { label: 'Rate terminal and its basis line', href: ROUTES.rateTerminal },
    { label: `Inclusions and exclusions on ${INLAND_CONTRACT.id}`, href: ROUTES.contract(INLAND_CONTRACT.id) },
    { label: 'Nhava Sheva handling charges', href: ROUTES.port('INNSA') },
  ],
}

/* ══════════════════════════════════════════════════════════════════════════
   5 · OPERATIONS — direct port delivery
   ══════════════════════════════════════════════════════════════════════════ */

const cfsBand = requireBand(NSA, 'CFS handling')

const DPD_OR_CFS: AuthoredInsight = {
  slug: 'direct-port-delivery-or-cfs',
  title: 'Direct port delivery or CFS: the day-and-a-half question',
  dek: `Taking the box straight off the terminal saves a handling step and a day or two of dwell — and swaps a ${count(NSA.freeTime.storageFreeDays)}-day storage clock for a ${count(NSA.freeTime.detentionFreeDays)}-day detention one.`,
  category: 'OPERATIONS',
  author: { name: 'Farhan Qureshi', title: 'Gateway operations' },
  publishedAt: daysFromNow(-17),
  tags: ['Direct port delivery', 'CFS', 'Nhava Sheva'],
  summary: [
    'Direct port delivery is faster and cheaper when the paperwork is genuinely ready on arrival, because there is no container freight station buffer to absorb a delay.',
    `Routing through one of Nhava Sheva’s ${count(NSA.cfsCount ?? 0)} container freight stations costs a handling step but de-stuffs the box, which stops the detention clock while the cargo waits.`,
    'For LCL the question does not arise — the CFS is where the container is de-stuffed, and it is not optional.',
  ],
  body: [
    {
      kind: 'paragraph',
      text: `Eligible importers at Nhava Sheva and Mundra can move a container directly from the terminal to their own premises rather than routing it through a container freight station to be de-stuffed. It removes a handling step and usually a day or two of dwell. It is also the option that punishes an incomplete file hardest, and understanding why is the whole decision.`,
    },
    { kind: 'heading', text: 'What each route does to your two clocks' },
    {
      kind: 'paragraph',
      text: `Direct port delivery gets the box out of the terminal quickly, which stops storage early. But detention starts the moment it passes the gate, and it does not stop until the empty is back at the depot. If the receiving site cannot unload promptly, direct delivery has simply moved the exposure from one meter to the other — usually to the one denominated in dollars.`,
    },
    {
      kind: 'paragraph',
      text: `A container freight station does something structurally different: it de-stuffs the container and the empty goes back. The cargo can then sit and wait without a box sitting with it. That is worth paying a handling step for whenever the receiving site is the constraint rather than the port.`,
    },
    {
      kind: 'table',
      columns: ['Question', 'Direct port delivery', 'Via a container freight station'],
      rows: [
        ['Dwell at the gateway', 'Lowest — a day or two saved', 'One extra handling step'],
        [
          'Storage clock',
          `Stops as soon as the box leaves (free time ${NSA.freeTime.storageFreeDays} days)`,
          'Runs at the terminal, then the station applies its own',
        ],
        [
          'Detention clock',
          `Starts at the gate (free time ${NSA.freeTime.detentionFreeDays} days)`,
          'Stops once the box is de-stuffed and returned',
        ],
        ['What has to be true', 'File complete on arrival, transporter and site both ready', 'Only that the station has space'],
        ['Best when', 'Full container loads on a plant that can unload the same day', 'Cargo that must wait, or any part-container consignment'],
      ],
      caption: 'Nhava Sheva structure. Mundra behaves the same way; the charge bands differ slightly.',
    },
    { kind: 'heading', text: 'The part-container case is not a choice' },
    {
      kind: 'paragraph',
      text: `Less than container load cargo goes to a station by definition — that is where the shared container is opened and the consignments separated. At Nhava Sheva that handling is charged on volume, indicatively ${money(cfsBand.low, 'INR')} to ${money(cfsBand.high, 'INR')} per cubic metre, and it is the main reason a part-container transit runs longer than the vessel schedule suggests: consolidation at origin and de-consolidation at destination are both real steps with real queues.`,
    },
    {
      kind: 'callout',
      tone: 'amber',
      title: 'The dependency that actually decides this',
      text: 'Direct delivery only works if everything the release depends on is complete when the vessel berths. Clearance is executed by an external customs partner, so what matters operationally is whether you can see that partner’s coordination status before arrival rather than after. If the status is still open on berthing day, the station is the safer route and the cheaper one.',
    },
    { kind: 'heading', text: 'A rough decision rule' },
    {
      kind: 'list',
      ordered: true,
      items: [
        'Full container, file complete, site able to unload within the detention free period: take it direct.',
        'Full container, file complete, but the site cannot take it for over a week: send it to a station, de-stuff, return the empty and let the cargo wait there.',
        'Any doubt about the release on arrival: station. The buffer is what you are buying.',
        'Part container: station, always. The only decision left is which one.',
      ],
    },
    {
      kind: 'paragraph',
      text: `The saving from direct delivery is real but modest — a handling step and a day and a half, give or take. The cost of getting it wrong is a container sitting outside the terminal accruing ${usd(nsaDetentionFirst.amount)} a day per 20ft while somebody chases a document. That asymmetry, rather than the headline saving, is what should decide it.`,
    },
  ],
  relatedSlugs: ['detention-and-storage-are-two-clocks', 'free-time-at-indian-gateway-ports', 'what-all-in-port-to-port-includes'],
  links: [
    { label: 'Nhava Sheva profile and free-time slabs', href: ROUTES.port('INNSA') },
    { label: 'Your arriving shipments', href: ROUTES.bookings },
    { label: 'Ask Zeno about a specific box', href: ROUTES.zeno },
  ],
}

/* ══════════════════════════════════════════════════════════════════════════
   6 · GUIDE — writing a request that gets comparable answers
   ══════════════════════════════════════════════════════════════════════════ */

const awardedResponse = requireResponse(AWARDED_RFQ, 'MSC')
const cheapestResponse = requireResponse(AWARDED_RFQ, 'Maersk')
const rateGap = awardedResponse.rateUsd - cheapestResponse.rateUsd
const freeDayGapAwarded = awardedResponse.freeTimeDays - cheapestResponse.freeTimeDays
const detentionPerDay40 = nsaDetentionFirst.amount * 2
const freeDayValue = freeDayGapAwarded * detentionPerDay40
const liveCheapest = requireResponse(LIVE_RFQ, 'CMA CGM')
const liveBest = requireResponse(LIVE_RFQ, 'MSC')

const WRITING_AN_RFQ: AuthoredInsight = {
  slug: 'writing-a-request-for-quotation',
  title: 'What a request for quotation should ask for, so the responses are comparable',
  dek: `On ${AWARDED_RFQ.id} the cheapest response was ${usd(cheapestResponse.rateUsd)} and the awarded one was ${usd(awardedResponse.rateUsd)}. The ${usd(rateGap)} difference bought ${counted(freeDayGapAwarded, 'extra free day')}, worth roughly ${usd(freeDayValue)} of exposure a container.`,
  category: 'GUIDE',
  author: { name: 'Kavitha Rao', title: 'Commercial desk' },
  publishedAt: daysFromNow(-23),
  tags: ['Requests', 'Procurement', 'Comparing responses'],
  summary: [
    'A request that leaves a field open gets answers that cannot be compared. State all eight things, every time.',
    'The cheapest response is regularly the wrong one — usually because of free time, a surcharge landing mid-contract, or a transhipment leg.',
    `Validity is a field, not a formality: ${LAPSED_RFQ.id} lapsed before a decision was taken and had to be re-issued.`,
  ],
  body: [
    {
      kind: 'paragraph',
      text: 'A request for quotation is a comparison instrument. If four partners answer four slightly different questions, the responses will look like a price list and behave like noise — and the desk ends up choosing on the only field that is genuinely comparable, which is the headline rate. That is how the wrong carrier gets awarded.',
    },
    { kind: 'heading', text: 'The eight things a request must state' },
    {
      kind: 'list',
      ordered: true,
      items: [
        'The lane and the mode. Not "Far East to India" — a named origin, a named destination and whether it is full container, part container or air.',
        'The equipment. A 40HC, a 20ft and a reefer on the same lane are three different markets.',
        'The monthly volume you are prepared to commit to. This is the field that changes the rate most and the field most often left blank.',
        'The commodity. It drives handling, stowage and whether the cargo is accepted at all.',
        'The incoterm, so everyone knows which legs are yours to buy.',
        'The service scope — port to port, port to door, door to door. A door quote against a port quote is not a comparison.',
        'The cargo-ready date, so the response is valid for the window you will actually book in.',
        'The date responses close, so a decision has a deadline attached to it.',
      ],
    },
    {
      kind: 'paragraph',
      text: `Those are the eight fields this product asks for when a request is raised, and they are not a form-design preference — they are the minimum set that makes four answers commensurable. ${AWARDED_RFQ.id} states all eight: ${requirePort(AWARDED_RFQ.originId).name} to ${requirePort(AWARDED_RFQ.destinationId).name}, full container, ${AWARDED_RFQ.equipment}, ${counted(AWARDED_RFQ.monthlyVolume, 'container')} a month, ${AWARDED_RFQ.commodity.toLowerCase()}, ${AWARDED_RFQ.incoterm}, and a service scope of “${AWARDED_RFQ.serviceScope}”.`,
    },
    { kind: 'heading', text: 'And the five things every response must carry back' },
    {
      kind: 'list',
      items: [
        'The rate, with its currency and its basis. All-in port to port and base ocean freight are not the same number.',
        'A transit band rather than a single figure, because a real transit is never one number.',
        'Free days at destination, which is the field that most often decides the award.',
        'A validity date.',
        'Inclusions and exclusions in full — the exclusions are where the surprises live.',
      ],
    },
    {
      kind: 'table',
      columns: ['Partner', 'Rate', 'Transit', 'Free days', 'What else the response says'],
      rows: AWARDED_RFQ.responses.map((response) => [
        response.awarded ? `${response.partnerName} · awarded` : response.partnerName,
        usd(response.rateUsd),
        transitRange(response.transitMinDays, response.transitMaxDays),
        response.freeTimeDays,
        response.note ?? (response.inclusions.length > 3 ? response.inclusions[response.inclusions.length - 1]! : '—'),
      ]),
      numericColumns: [1, 3],
      caption: `The four responses to ${AWARDED_RFQ.id}, as recorded on the request. ${DEMO.financialNotice}`,
    },
    { kind: 'heading', text: 'Why the cheapest lost' },
    {
      kind: 'paragraph',
      text: `${cheapestResponse.partnerName} answered ${usd(rateGap)} below the awarded response and carried ${counted(cheapestResponse.freeTimeDays, 'free day')} against ${count(awardedResponse.freeTimeDays)}. At Nhava Sheva’s indicative first detention slab — ${usd(nsaDetentionFirst.amount)} per 20ft per day, so roughly ${usd(detentionPerDay40)} for a 40HC — those ${counted(freeDayGapAwarded, 'day')} are about ${usd(freeDayValue)} of cover per container. The saving was real; the exposure it left open was several times larger.`,
    },
    {
      kind: 'paragraph',
      text: `The same response also excluded a peak season surcharge from a date inside the contract window, which is an exclusion doing the work of a price increase. None of that is visible if the comparison stops at the rate column, and all of it is visible if the request demanded inclusions and exclusions in the first place.`,
    },
    {
      kind: 'callout',
      tone: 'amber',
      title: 'Validity is a live constraint, not paperwork',
      text: `${LIVE_RFQ.id} is sitting with an approver now: ${liveCheapest.partnerName} is best on cost at ${usd(liveCheapest.rateUsd)}, ${liveBest.partnerName} is ${usd(liveBest.rateUsd - liveCheapest.rateUsd)} more for the fastest transit and ${counted(liveBest.freeTimeDays, 'free day')}, and each response expires on its own date. ${LAPSED_RFQ.id} shows the other outcome — responses lapsed before anyone decided, and the lane had to be re-tendered from scratch.`,
    },
    {
      kind: 'paragraph',
      text: 'One structural point worth stating plainly: raising a request and awarding it are different jobs. A logistics manager opens it; awarding commits the company to a contract, and that authority sits with procurement. Building the request properly is what lets the approver decide in minutes instead of re-running the comparison themselves.',
    },
  ],
  relatedSlugs: ['contracted-rate-versus-spot', 'what-all-in-port-to-port-includes', 'detention-and-storage-are-two-clocks'],
  links: [
    { label: `Open ${AWARDED_RFQ.id}`, href: ROUTES.rfq(AWARDED_RFQ.id) },
    { label: `Open ${LIVE_RFQ.id} — awaiting approval`, href: ROUTES.rfq(LIVE_RFQ.id) },
    { label: 'All requests for quotation', href: ROUTES.rfqs },
  ],
}

/* ══════════════════════════════════════════════════════════════════════════
   7 · COMMERCIAL — reading a utilisation meter
   ══════════════════════════════════════════════════════════════════════════ */

const feUtilisation = utilisationPct(FE_CONTRACT)
const feDaysLeft = daysUntil(FE_CONTRACT.validUntil)
const feShortfall = FE_CONTRACT.committedMonthlyVolume - FE_CONTRACT.shippedThisPeriod
const inlandUtilisation = utilisationPct(INLAND_CONTRACT)
const inlandDaysLeft = daysUntil(INLAND_CONTRACT.validUntil)
const previousLane = requireContractLane(PREVIOUS_CONTRACT, SHA_NSA)
const currentNsaLane = requireContractLane(FE_CONTRACT, SHA_NSA)
const renewalPremium = currentNsaLane.rateUsd - previousLane.rateUsd
const extraFreeDays = currentNsaLane.freeTimeDays - previousLane.freeTimeDays

const CONTRACT_VERSUS_SPOT: AuthoredInsight = {
  slug: 'contracted-rate-versus-spot',
  title: 'Contracted rate versus spot: reading a utilisation meter before renewal',
  dek: `${FE_CONTRACT.id} is ${percent(feUtilisation, 0)} through its committed volume with ${counted(feDaysLeft, 'day')} of validity left, and all three of its lanes now sit at or above this week’s spot. Both facts belong in the same conversation.`,
  category: 'COMMERCIAL',
  author: { name: 'Kavitha Rao', title: 'Commercial desk' },
  publishedAt: daysFromNow(-29),
  tags: ['Contracts', 'Renewal', 'Utilisation'],
  summary: [
    `${counted(feShortfall, 'container')} short of the committed ${count(FE_CONTRACT.committedMonthlyVolume)} with ${counted(feDaysLeft, 'day')} to run. Missing a commitment is what loses the rate at renewal.`,
    'A contract drifting above spot is not automatically a bad contract — check what the free time is worth before reopening it.',
    `The last renewal cost ${usd(renewalPremium)} a box and bought ${counted(extraFreeDays, 'extra free day')}. That trade paid for itself.`,
  ],
  body: [
    {
      kind: 'paragraph',
      text: 'A freight contract has two numbers that matter and neither of them is the rate. The first is how long it has left. The second is how far through the committed volume the company actually is. Get those two the wrong way round at renewal and the rate goes with them.',
    },
    { kind: 'heading', text: 'The meter is a forecast, not a scoreboard' },
    {
      kind: 'paragraph',
      text: `${FE_CONTRACT.id} shows ${count(FE_CONTRACT.shippedThisPeriod)} of ${count(FE_CONTRACT.committedMonthlyVolume)} containers against the period commitment — ${percent(feUtilisation, 0)}, with ${counted(feDaysLeft, 'day')} of validity remaining. The meter is coloured on purpose: below sixty per cent it reads amber, because at that point the commitment is unlikely to be met and the conversation to have is with the partner, now, rather than with procurement after the renewal is declined.`,
    },
    {
      kind: 'paragraph',
      text: `The inland agreement is the tighter case. ${INLAND_CONTRACT.id} is at ${percent(inlandUtilisation, 0)} and expires in ${counted(inlandDaysLeft, 'day')}. A haulage contract at that point in its life is a diary item this week, not next month — renewal quotes take time to gather and an expired inland rate means every container off the gateway prices at whatever the market offers on the day.`,
    },
    { kind: 'heading', text: 'What the lanes are doing against spot' },
    {
      kind: 'table',
      columns: ['Lane', 'Your rate', 'Spot this week', 'Difference', 'Free days'],
      rows: FE_CONTRACT.lanes.map((lane) => {
        const spotCell = requireCell(lane.laneId, lane.equipment === '20FT' ? '20FT' : '40HC')
        const delta = Math.round(((lane.rateUsd - spotCell.amountUsd) / spotCell.amountUsd) * 100)
        return [
          `${requirePort(lane.originId).name} → ${requirePort(lane.destinationId).name}`,
          usd(lane.rateUsd),
          usd(spotCell.amountUsd),
          `${delta > 0 ? '+' : ''}${percent(delta, 0)}`,
          lane.freeTimeDays,
        ]
      }),
      numericColumns: [1, 2, 3, 4],
      caption: `Contracted 40HC rates against the current week of the rate grid — the same comparison the contract screen draws. ${DEMO.financialNotice}`,
    },
    {
      kind: 'paragraph',
      text: `A negative difference means the contract is beating the market. Where it turns positive and stays there for several weeks, the agreement is worth reopening. Where it turns positive for one week on a firming lane, it is worth nothing at all — that is exactly the week the contract was bought for.`,
    },
    { kind: 'heading', text: 'Price the free time before you reopen anything' },
    {
      kind: 'paragraph',
      text: `The previous agreement on this lane, ${PREVIOUS_CONTRACT.id}, carried ${usd(previousLane.rateUsd)} with ${counted(previousLane.freeTimeDays, 'free day')}. The current one is ${usd(currentNsaLane.rateUsd)} with ${count(currentNsaLane.freeTimeDays)}. The renewal cost ${usd(renewalPremium)} a container and bought ${counted(extraFreeDays, 'extra day')} of cover at destination — at the indicative first detention slab for a 40HC that is around ${usd(extraFreeDays * detentionPerDay40)} of exposure removed. The dearer contract is the cheaper one on any shipment that runs late, and roughly half of them do.`,
    },
    {
      kind: 'callout',
      tone: 'neutral',
      title: 'What to do at each band',
      text: 'Above ninety per cent: hold the lane, open the renewal early and ask for the same free time. Sixty to ninety: the commitment is reachable — consolidate bookings onto the contracted lanes rather than spot-booking around them. Below sixty with under a month left: talk to the partner before the period closes, because a renegotiated commitment is a far better outcome than a missed one.',
    },
    {
      kind: 'paragraph',
      text: `One more habit worth forming: check which version of the contract you are reading. ${FE_CONTRACT.id} is on ${FE_CONTRACT.version} — a lane was added at ${usd(requireContractLane(FE_CONTRACT, NGB_NSA).rateUsd)} on the same terms partway through the window, and the amendment history is the only reason anyone can say when. A contract without a version and an amendment trail is an assertion, not a record.`,
    },
  ],
  relatedSlugs: ['shanghai-mundra-20ft-this-week', 'writing-a-request-for-quotation', 'what-all-in-port-to-port-includes'],
  links: [
    { label: `Open ${FE_CONTRACT.id}`, href: ROUTES.contract(FE_CONTRACT.id) },
    { label: `Open ${INLAND_CONTRACT.id} — expiring`, href: ROUTES.contract(INLAND_CONTRACT.id) },
    { label: 'All contracts', href: ROUTES.contracts },
    { label: 'This week’s spot board', href: ROUTES.rateTerminal },
  ],
}

/* ══════════════════════════════════════════════════════════════════════════
   8 · GUIDE — the registration that blocks a lane
   ══════════════════════════════════════════════════════════════════════════ */

const adCode = ORGANISATION.kyb.find((k) => k.id === 'KYB-ADCODE')
if (!adCode) throw new Error('insights: the organisation has no AD code registration record')

const exportPair = ORGANISATION.portPairs.find((p) => p.originId === 'INNSA' && p.destinationId === 'NLRTM')
if (!exportPair) throw new Error('insights: the organisation has no Nhava Sheva → Rotterdam port pair')

const rtmRow = requireRow(NSA_RTM)
const rtm40 = requireCell(NSA_RTM, '40HC')
const exportRfqCloses = daysUntil(EXPORT_RFQ.closesAt)
const exportCargoReady = daysUntil(EXPORT_RFQ.cargoReadyFrom)

const AD_CODE_BLOCK: AuthoredInsight = {
  slug: 'ad-code-registration-blocks-an-export-lane',
  title: 'Why an AD code registration holds up an export lane before a single box moves',
  dek: `${requirePort('INNSA').name} to ${requirePort('NLRTM').name} is priced, tendered and shipping — but the registration that lets the proceeds be realised is still in review, cargo is ready in ${counted(exportCargoReady, 'day')}, and the lane runs ${counted(rtmRow.sailingsPerWeek, 'sailing')} a week.`,
  category: 'GUIDE',
  author: { name: 'Devika Sundaram', title: 'Onboarding and lane enablement' },
  publishedAt: daysFromNow(-36),
  tags: ['Export', 'Onboarding', 'Lane enablement'],
  summary: [
    'An authorised dealer code is a banking registration held against a named port. Without it the port cannot associate an export from that gateway with the bank that will realise the proceeds.',
    `It is why the ${requirePort('INNSA').name} → ${requirePort('NLRTM').name} pair carries a registration note on the business profile, and why export receivables from that gateway are not yet counted towards the credit limit.`,
    `The boxes still move. What waits is the money: until the code is registered, proceeds against those exports cannot be realised and no advance can be raised against the invoice.`,
  ],
  body: [
    {
      kind: 'paragraph',
      text: 'Most freight problems are visible: a missed cutoff, a rolled container, a vessel two days late. This one is invisible right up until the day the bank is asked to realise the proceeds — the cargo has sailed, the invoice is out, and the money has nowhere to land.',
    },
    {
      kind: 'paragraph',
      text: `An authorised dealer code is issued by the bank that will handle your export proceeds, and it has to be registered against each port you intend to export from. Register it at ${requirePort('INNSA').name} and it does nothing for ${requirePort('INMUN').name}. It is a banking and registration dependency rather than an operational one, which is exactly why it gets missed — nobody in the shipping department owns it, and nothing in the physical process fails until the very last step.`,
    },
    { kind: 'heading', text: 'What it is blocking on this account' },
    {
      kind: 'paragraph',
      text: `The business profile carries a single row for it — “${adCode.label}”, currently ${adCode.status.replace(/_/g, ' ').toLowerCase()}. What it unlocks is written on the same row: ${adCode.unlocks.toLowerCase()} Be precise about what that does and does not stop. Bookings on the ${requirePort(exportPair.originId).name} to ${requirePort(exportPair.destinationId).name} pair are open and running; the lane carries a note rather than a closed status. What is held is the banking end — the proceeds against those exports, and with them the release of the factoring advance already offered against the export invoice on this lane.`,
    },
    {
      kind: 'table',
      columns: ['What exists today', 'State', 'What it is waiting on'],
      rows: [
        [adCode.label, 'In review', 'Bank confirmation, then registration at the gateway'],
        [
          `${requirePort(exportPair.originId).name} → ${requirePort(exportPair.destinationId).name} port pair`,
          'Active — bookings run today',
          'Nothing for the booking; the registration above for the proceeds',
        ],
        [
          `${EXPORT_RFQ.id} · ${count(EXPORT_RFQ.monthlyVolume)} × ${EXPORT_RFQ.equipment} a month`,
          'Out with partners',
          `Responses close in ${counted(exportRfqCloses, 'day')}`,
        ],
        [`Spot rate, ${EXPORT_RFQ.equipment}`, usd(rtm40.amountUsd), 'Nothing — the rate is available now'],
      ],
      caption: 'Everything operational on this lane is ready. The banking registration behind it is not.',
    },
    { kind: 'heading', text: 'The sequence, in the order it has to happen' },
    {
      kind: 'list',
      ordered: true,
      items: [
        'The bank issues the authorised dealer code letter against the exporting entity.',
        'The registration is lodged at the gateway you intend to export from. Your external customs partner handles this; PortWhizz records the status and the dependency it creates.',
        'The verification row clears on the business profile and the note comes off the lane.',
        'Export proceeds from that gateway can be realised — and the receivables behind them start counting towards the credit limit and the factoring advance.',
      ],
    },
    {
      kind: 'callout',
      tone: 'amber',
      title: 'The note already on the record',
      text: exportPair.note ?? 'Awaiting the AD code registration before export proceeds from this gateway can be realised.',
    },
    { kind: 'heading', text: 'Why the timing is tighter than it looks' },
    {
      kind: 'paragraph',
      text: `Cargo is ready in ${counted(exportCargoReady, 'day')}. Responses to ${EXPORT_RFQ.id} close in ${count(exportRfqCloses)}. The lane offers ${counted(rtmRow.sailingsPerWeek, 'sailing')} a week and a transit of ${transitRange(rtmRow.transitMinDays, rtmRow.transitMaxDays)} into ${requirePort('NLRTM').name}. On a weekly service the shipping side has no slack — miss a sailing and the delivery date moves by seven days, not by one — and the registration has to clear before the proceeds against those boxes can be banked. Two clocks, one of them nobody in the shipping department owns.`,
    },
    {
      kind: 'paragraph',
      text: 'It is worth being precise about the division of labour here, because it is the difference between a platform that helps and a platform that overreaches. PortWhizz does not perform the registration and does not perform clearance. It holds the record of what the lane depends on, shows the dependency as a status somebody owns, and carries it through to the screens where it costs money — the lane note on the profile, the lever on the credit limit, the advance that cannot yet be raised. Carriers, terminals, transporters, banks and licensed clearance partners execute; this is the operating layer that keeps the sequence honest.',
    },
    {
      kind: 'paragraph',
      text: `The same screen is worth a slow read for the other clocks running on it: ${counted(documentsNeedingAttention().length, 'company document')} need attention today, and an expired licence or a lapsed policy stops a shipment on the day it is least convenient. Every one of these is visible now. None of them will announce itself later.`,
    },
  ],
  relatedSlugs: ['writing-a-request-for-quotation', 'what-all-in-port-to-port-includes', 'contracted-rate-versus-spot'],
  links: [
    { label: 'Business profile and verification', href: ROUTES.business },
    { label: `Open ${EXPORT_RFQ.id}`, href: ROUTES.rfq(EXPORT_RFQ.id) },
    { label: `${requirePort('NLRTM').name} port profile`, href: ROUTES.port('NLRTM') },
  ],
}

/* ══════════════════════════════════════════════════════════════════════════
   THE COLLECTION
   ══════════════════════════════════════════════════════════════════════════ */

const AUTHORED: AuthoredInsight[] = [
  RATE_NOTE,
  TWO_CLOCKS,
  GATEWAY_FREE_TIME,
  ALL_IN_BASIS,
  DPD_OR_CFS,
  WRITING_AN_RFQ,
  CONTRACT_VERSUS_SPOT,
  AD_CODE_BLOCK,
]

/** Words in a block, counting everything a reader's eye actually crosses. */
function wordsIn(block: InsightBlock): number {
  const tally = (text: string) => text.trim().split(/\s+/).filter(Boolean).length
  switch (block.kind) {
    case 'paragraph':
    case 'heading':
      return tally(block.text)
    case 'list':
      return block.items.reduce((sum, item) => sum + tally(item), 0)
    case 'callout':
      return tally(block.text) + (block.title ? tally(block.title) : 0)
    case 'quote':
      return tally(block.text) + tally(block.attribution)
    case 'table':
      // The explicit `reduce<number>` is load-bearing. A table cell is
      // `string | number`, so `0` satisfies the non-generic `reduce` overload
      // and TypeScript infers the accumulator as `string | number` — which
      // then refuses to be added to anything. Naming the accumulator type
      // picks the generic overload and keeps the arithmetic honest.
      return (
        block.columns.reduce((sum, column) => sum + tally(column), 0) +
        block.rows.reduce<number>(
          (sum, row) => sum + row.reduce<number>((rowSum, cell) => rowSum + tally(String(cell)), 0),
          0,
        ) +
        (block.caption ? tally(block.caption) : 0)
      )
  }
}

/**
 * Read time, computed rather than declared.
 *
 * 200 words a minute is the usual figure for continuous prose; this is dense
 * material with tables in it, so the divisor is deliberately conservative and
 * the result is floored at one minute — "0 min read" is worse than useless.
 */
const WORDS_PER_MINUTE = 200

function readMinutesFor(body: InsightBlock[]): number {
  const words = body.reduce((sum, block) => sum + wordsIn(block), 0)
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

/** Newest first. The list and the featured lead both depend on this order. */
export const INSIGHTS: InsightArticle[] = AUTHORED.map((article) => ({
  ...article,
  readMinutes: readMinutesFor(article.body),
})).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

export function insightBySlug(slug: string): InsightArticle | undefined {
  return INSIGHTS.find((article) => article.slug === slug)
}

/**
 * Related reading.
 *
 * Authored relations first, then anything in the same category, then the most
 * recent. The padding matters: an article whose named relations are all
 * already read still needs somewhere to send the reader, and an empty
 * "related" block reads as a dead end.
 */
export function relatedInsights(slug: string, limit = 3): InsightArticle[] {
  const article = insightBySlug(slug)
  if (!article) return INSIGHTS.slice(0, limit)

  const picked: InsightArticle[] = []
  const take = (candidate: InsightArticle | undefined) => {
    if (!candidate) return
    if (candidate.slug === slug) return
    if (picked.some((p) => p.slug === candidate.slug)) return
    if (picked.length >= limit) return
    picked.push(candidate)
  }

  for (const related of article.relatedSlugs) take(insightBySlug(related))
  for (const candidate of INSIGHTS) if (candidate.category === article.category) take(candidate)
  for (const candidate of INSIGHTS) take(candidate)

  return picked
}

export const INSIGHT_CATEGORY_LABEL: Record<InsightCategory, string> = {
  MARKET: 'Market',
  OPERATIONS: 'Operations',
  COMMERCIAL: 'Commercial',
  GUIDE: 'Guide',
}

/**
 * Category tones.
 *
 * Typed as a literal union rather than imported from the primitives, because
 * `data/` must not depend on `components/` — the same reason `data/contracts.ts`
 * spells its status tones out. Amber and critical are deliberately absent: in
 * this product they mean "needs attention" and "something has failed", and a
 * reading category must never borrow a state colour it does not carry.
 */
export const INSIGHT_CATEGORY_TONE: Record<InsightCategory, 'neutral' | 'route' | 'signal' | 'violet'> = {
  MARKET: 'route',
  OPERATIONS: 'signal',
  COMMERCIAL: 'violet',
  GUIDE: 'neutral',
}

/**
 * The footer on every insights screen.
 *
 * Composed from `data/copy.ts` rather than written fresh — this demo makes
 * commercial-sounding claims, and a disclaimer that drifts from the one on the
 * rate terminal is a disclaimer nobody can audit.
 */
export const INSIGHT_DISCLAIMER = `${DEMO.simulatedValues} ${DEMO.financialNotice} Every figure in these notes is read from the same seeded demo data the rest of the application renders, so each one can be opened on the linked screen. Bylines are illustrative. Nothing here is commercial, tax or legal advice.`
