import { DEMO_NOW_MS, daysFromNow, isPast } from '@/lib/demo-clock'
import { containerSummary, money, moneyUsd, teuFor } from '@/lib/format'
import type {
  Booking,
  Container,
  CreditFacility,
  CustomerInvoice,
  Direction,
  Incoterm,
  Job,
  JobId,
  JobStatus,
  PartyId,
} from '@/types'

import { DEMO_FX_USD_INR } from './charge-catalog'
import { ORG_ID } from './org'
import { portProfile, type FreeTimeSlab } from './port-profiles'

/**
 * THE CUSTOMER'S SIDE OF THE MONEY
 * ══════════════════════════════════════════════════════════════════════════
 * `data/finance.ts` is the forwarder's ledger — every customer's invoices,
 * every customer's credit facility, the vendor bills behind them. This file
 * is the other half: the things that only exist because a *customer* is
 * looking at their own account, and the derivations that keep the Finance
 * module from typing a figure in.
 *
 * Three concerns live here.
 *
 *   1 · PayLater — the words. A credit facility that a customer cannot
 *       explain to their own board is a facility they will not use, and the
 *       one sentence that must never drift is who carries the money.
 *       PortWhizz coordinates the facility; a financing partner funds it.
 *
 *   2 · Export factoring — the records. Authored here rather than in the
 *       shared seed because factoring is a customer-facing product, not part
 *       of the forwarder's own books.
 *
 *   3 · The detention and storage exposure model — the arithmetic. This is
 *       the genuinely computed part of the module: free-time expiry from the
 *       booking, slab structure from the destination port profile, equipment
 *       from the container records. Nothing is typed; change a booking and
 *       the projection moves.
 *
 * Every figure below resolves against the demo clock and the pinned demo FX
 * rate, so the module renders identically before and after a reload.
 */

/* ══════════════════════════════════════════════════════════════════════════
   PAYLATER — the credit story, in words a customer can repeat
   ══════════════════════════════════════════════════════════════════════════ */

export interface PayLaterStep {
  id: string
  title: string
  body: string
}

export const PAYLATER_STEPS: PayLaterStep[] = [
  {
    id: 'PL-01',
    title: 'Book without paying up front',
    body: 'Confirm a booking on terms. The value of the job is drawn against the facility limit the moment it is raised, so the available figure on this page is always what is left to book against.',
  },
  {
    id: 'PL-02',
    title: 'Ship, then receive one invoice',
    body: 'PortWhizz raises a single invoice for the shipment once it has been delivered and the partner bills behind it have been reconciled — not one invoice per charge, and not one per vendor.',
  },
  {
    id: 'PL-03',
    title: 'Settle within the credit period',
    body: 'Payment falls due a fixed number of days after the invoice date. As each invoice is settled the drawn amount returns to the available limit and can be booked against again.',
  },
  {
    id: 'PL-04',
    title: 'Reviewed, not open-ended',
    body: 'The facility carries a review date. Utilisation, settlement history and the verification items on the company profile all feed that review — which is why an outstanding verification item is a commercial matter, not an administrative one.',
  },
]

/**
 * The positioning statement is load-bearing, not marketing.
 *
 * A forwarding platform that lets a customer believe it is the lender has
 * mis-described a regulated product. `lib/boundaries.ts` fails the build on
 * the claim; this is where the true version is written once so that every
 * surface repeats the same thing.
 */
export const PAYLATER = {
  name: 'PortWhizz PayLater',
  /** The facility this account holds. Everything on the Credit tab reads it. */
  facilityId: 'CF-APEX',
  partnerId: 'VND-BRIDGEFIN' as PartyId,
  partnerName: 'Bridgefin Trade Capital',

  summary:
    'Book freight now and settle on agreed terms instead of paying at the point of booking. The credit is provided by a financing partner; PortWhizz coordinates it and keeps the booking, the invoice and the settlement on one record.',

  steps: PAYLATER_STEPS,

  /** Who does what. Repeated verbatim wherever the facility is described. */
  boundaries: [
    'The facility is provided and funded by Bridgefin Trade Capital, a financing partner. PortWhizz does not provide the credit and does not carry it.',
    'PortWhizz coordinates the facility: it holds the booking, the invoice and the settlement record, and reports the drawn and repaid position to the partner.',
    'The limit, the pricing and the decision to extend the facility are the partner’s, taken on this company’s verification status and settlement history.',
  ],
} as const

/**
 * What would move the limit.
 *
 * `kybItemId` is the point of the section: it reaches into the company
 * profile rather than restating it, so an item that is outstanding over
 * there is visibly costing the customer something over here.
 */
export interface LimitLever {
  id: string
  title: string
  body: string
  /** Resolves against `ORGANISATION.kyb` — rendered with its live status. */
  kybItemId?: string
}

export const LIMIT_LEVERS: LimitLever[] = [
  {
    id: 'LEV-BANK',
    title: 'Complete bank account verification',
    body: 'The financing partner cannot raise a limit against an account it has not verified. This is the single outstanding item on this company profile, and it gates both a higher limit and export factoring advances.',
    kybItemId: 'KYB-BANK',
  },
  {
    id: 'LEV-ADCODE',
    title: 'Finish the AD code registration at Nhava Sheva',
    body: 'Export proceeds against shipments from that port cannot be realised until the registration completes, so export receivables from it are not yet counted towards the facility.',
    kybItemId: 'KYB-ADCODE',
  },
  {
    id: 'LEV-HISTORY',
    title: 'Keep settling within terms',
    body: 'Settlement history is the strongest input to the review. Invoices cleared inside the credit period build the case for a higher limit; a balance carried past its due date is the argument against one.',
  },
]

/* ══════════════════════════════════════════════════════════════════════════
   EXPORT FACTORING
   ══════════════════════════════════════════════════════════════════════════
   The invoice being financed is the customer's OWN commercial invoice on the
   export sale — not a PortWhizz freight invoice. Getting that wrong would be
   a modelling error a finance controller would spot in seconds: PortWhizz
   invoices the customer, so a PortWhizz invoice is a payable to them, and
   nobody factors a payable. `invoiceId` therefore links the freight invoice
   raised on the same shipment, purely so the two sit side by side.
   ══════════════════════════════════════════════════════════════════════════ */

export const FACTORING = {
  name: 'Export factoring',
  /** Two sentences, in the glossary's plain voice. */
  summary:
    'Factoring turns an export invoice into cash now: a financing partner advances most of its value as soon as the cargo ships, then collects from your overseas buyer when the invoice falls due. You pay a fee for the wait, and the partner — not PortWhizz — carries the money and the collection.',
  notes: [
    'The advance rate is set on the buyer, not on you. A partner that cannot get comfortable with an overseas buyer will offer a lower rate, or decline the invoice outright.',
    'The fee is charged on the amount advanced for the length of the tenor. Settling early costs less; a buyer who pays late is what makes factoring expensive.',
    'An advance is not a sale of the debt unless the offer says so. Where the arrangement is with recourse, an unpaid invoice comes back to you.',
  ],
} as const

export type AdvanceStatus = 'OFFERED' | 'ACTIVE' | 'SETTLED' | 'DECLINED'

export const ADVANCE_STATUS_LABEL: Record<AdvanceStatus, string> = {
  OFFERED: 'Offered',
  ACTIVE: 'Advanced',
  SETTLED: 'Settled',
  DECLINED: 'Declined',
}

export interface ExportAdvance {
  id: string
  customerId: PartyId
  /** The shipment the export invoice sits on, where it is a job on this account. */
  jobId?: JobId
  /** Named shipment, for the row header — a lane reads better than an id. */
  shipmentLabel: string
  /** The customer's own commercial invoice on the export sale. */
  exportInvoiceRef: string
  /** The PortWhizz freight invoice raised on the same shipment, if there is one. */
  invoiceId?: string
  buyerName: string
  buyerCountry: string
  financierId: PartyId
  financierName: string
  /** Face value of the export invoice, in INR. */
  faceValueInr: number
  /** Share of the face value advanced on drawdown. */
  advanceRatePct: number
  /** Fee charged on the amount advanced, across the tenor. */
  feeRatePct: number
  tenorDays: number
  status: AdvanceStatus
  offeredAt: string
  /** Only on an OFFERED row — an offer with no expiry is not a decision. */
  offerExpiresAt?: string
  advancedAt?: string
  expectedSettlementAt: string
  settledAt?: string
  note: string
  declineReason?: string
}

/**
 * Four states, on purpose.
 *
 * One live offer so the tab holds an actual decision, two running advances
 * so the outstanding position is not zero, one settled so the customer can
 * see what the fee cost in the end, and one declined — because a factoring
 * tab where every invoice is accepted teaches the viewer nothing about what
 * the partner is actually underwriting.
 */
export const EXPORT_ADVANCES: ExportAdvance[] = [
  {
    id: 'ADV-2026-00118',
    customerId: ORG_ID,
    jobId: 'PW-2026-004296',
    shipmentLabel: 'Nhava Sheva → Rotterdam · 2 × 40FT',
    exportInvoiceRef: 'APEX/EXP/2026/0918',
    buyerName: 'Halden Industrial B.V.',
    buyerCountry: 'Netherlands',
    financierId: 'VND-BRIDGEFIN',
    financierName: 'Bridgefin Trade Capital',
    faceValueInr: 6_240_000,
    advanceRatePct: 80,
    feeRatePct: 1.15,
    tenorDays: 60,
    status: 'OFFERED',
    offeredAt: daysFromNow(-1),
    offerExpiresAt: daysFromNow(3),
    expectedSettlementAt: daysFromNow(61),
    note: 'Offered against the export invoice on the Rotterdam sailing. Release needs two things: the transport document issued, not just the booking — and the AD code registration at Nhava Sheva completed, since proceeds from that gateway cannot be realised until it is.',
  },
  {
    id: 'ADV-2026-00109',
    customerId: ORG_ID,
    jobId: 'PW-2026-004292',
    shipmentLabel: 'Mundra → Rotterdam · out-of-gauge',
    exportInvoiceRef: 'APEX/EXP/2026/0904',
    buyerName: 'Halden Industrial B.V.',
    buyerCountry: 'Netherlands',
    financierId: 'VND-BRIDGEFIN',
    financierName: 'Bridgefin Trade Capital',
    faceValueInr: 4_860_000,
    advanceRatePct: 80,
    feeRatePct: 0.95,
    tenorDays: 45,
    status: 'ACTIVE',
    offeredAt: daysFromNow(-14),
    advancedAt: daysFromNow(-11),
    expectedSettlementAt: daysFromNow(34),
    note: 'Drawn on the same buyer as the Rotterdam offer. Settlement is expected against the buyer’s 45-day term.',
  },
  {
    id: 'ADV-2026-00104',
    customerId: ORG_ID,
    jobId: 'PW-2026-004280',
    shipmentLabel: 'Chennai → Singapore · 1 × 40HC',
    exportInvoiceRef: 'APEX/EXP/2026/0830',
    buyerName: 'Straitway Engineering Pte Ltd',
    buyerCountry: 'Singapore',
    financierId: 'VND-BRIDGEFIN',
    financierName: 'Bridgefin Trade Capital',
    faceValueInr: 2_160_000,
    advanceRatePct: 75,
    feeRatePct: 0.85,
    tenorDays: 30,
    status: 'ACTIVE',
    offeredAt: daysFromNow(-24),
    advancedAt: daysFromNow(-21),
    expectedSettlementAt: daysFromNow(9),
    note: 'A shorter tenor and a lower advance rate than the Rotterdam lane — this buyer is newer to the partner’s book.',
  },
  {
    id: 'ADV-2026-00091',
    customerId: ORG_ID,
    jobId: 'PW-2026-004221',
    shipmentLabel: 'Mumbai → Rotterdam · air',
    exportInvoiceRef: 'APEX/EXP/2026/0724',
    invoiceId: 'INV-2026-01149',
    buyerName: 'Halden Industrial B.V.',
    buyerCountry: 'Netherlands',
    financierId: 'VND-BRIDGEFIN',
    financierName: 'Bridgefin Trade Capital',
    faceValueInr: 3_480_000,
    advanceRatePct: 80,
    feeRatePct: 1.05,
    tenorDays: 45,
    status: 'SETTLED',
    offeredAt: daysFromNow(-58),
    advancedAt: daysFromNow(-55),
    expectedSettlementAt: daysFromNow(-10),
    settledAt: daysFromNow(-11),
    note: 'Buyer paid a day inside the term. The balance of the invoice, less the fee, was released on settlement.',
  },
  {
    id: 'ADV-2026-00097',
    customerId: ORG_ID,
    jobId: 'PW-2026-004293',
    shipmentLabel: 'Nhava Sheva → Jebel Ali · reefer',
    exportInvoiceRef: 'APEX/EXP/2026/0904-R',
    buyerName: 'Gulf Cold Chain LLC',
    buyerCountry: 'United Arab Emirates',
    financierId: 'VND-BRIDGEFIN',
    financierName: 'Bridgefin Trade Capital',
    faceValueInr: 1_890_000,
    advanceRatePct: 70,
    feeRatePct: 1.4,
    tenorDays: 45,
    status: 'DECLINED',
    offeredAt: daysFromNow(-19),
    expectedSettlementAt: daysFromNow(26),
    note: 'Submitted with the booking on the Jebel Ali sailing.',
    declineReason:
      'The partner could not confirm cover on this buyer. A first-time buyer with no settlement history is the usual reason an invoice is turned down.',
  },
]

/* ── Derived, so the data can never disagree with itself ───────────────── */

/** What is actually paid out on drawdown, before the fee. */
export function advanceAmount(advance: ExportAdvance): number {
  return Math.round((advance.faceValueInr * advance.advanceRatePct) / 100)
}

/** Fee on the advanced amount across the tenor, deducted at drawdown. */
export function advanceFee(advance: ExportAdvance): number {
  return Math.round((advanceAmount(advance) * advance.feeRatePct) / 100)
}

/** Cash the customer actually receives on the day. */
export function advanceNetProceeds(advance: ExportAdvance): number {
  return advanceAmount(advance) - advanceFee(advance)
}

/** The balance the partner holds back until the buyer settles. */
export function advanceRetention(advance: ExportAdvance): number {
  return advance.faceValueInr - advanceAmount(advance)
}

export interface AdvanceSummary {
  /** Advanced and not yet settled. */
  outstandingInr: number
  /** Face value behind that outstanding position. */
  faceValueOutstandingInr: number
  /** Fees charged on the advances currently running. */
  feesOnOutstandingInr: number
  offeredCount: number
  activeCount: number
}

export function advanceSummary(advances: ExportAdvance[]): AdvanceSummary {
  const active = advances.filter((a) => a.status === 'ACTIVE')
  return {
    outstandingInr: active.reduce((sum, a) => sum + advanceAmount(a), 0),
    faceValueOutstandingInr: active.reduce((sum, a) => sum + a.faceValueInr, 0),
    feesOnOutstandingInr: active.reduce((sum, a) => sum + advanceFee(a), 0),
    offeredCount: advances.filter((a) => a.status === 'OFFERED').length,
    activeCount: active.length,
  }
}

/** This is a single-customer application — the filter belongs in one place. */
export function advancesForAccount(customerId: PartyId = ORG_ID): ExportAdvance[] {
  return EXPORT_ADVANCES.filter((a) => a.customerId === customerId)
}

/* ══════════════════════════════════════════════════════════════════════════
   THE ACCOUNT POSITION
   ══════════════════════════════════════════════════════════════════════════
   Four tiles on the Overview come from here, and so does the totals row on
   the Invoices table. One function, so the two can never disagree — a
   headline that contradicts its own drill-down is worse than no headline.
   ══════════════════════════════════════════════════════════════════════════ */

/** Statuses where nothing more is owed, whatever the arithmetic says. */
const SETTLED_INVOICE_STATUSES = ['PAID', 'CANCELLED', 'CREDITED'] as const

export function invoiceBalance(invoice: CustomerInvoice): number {
  return Math.max(0, invoice.total - invoice.amountPaid)
}

export function isInvoiceSettled(invoice: CustomerInvoice): boolean {
  return (SETTLED_INVOICE_STATUSES as readonly string[]).includes(invoice.status) || invoiceBalance(invoice) === 0
}

export function isInvoiceOverdue(invoice: CustomerInvoice, now: number = DEMO_NOW_MS): boolean {
  return !isInvoiceSettled(invoice) && isPast(invoice.dueAt, now)
}

/**
 * Invoices belonging to this account, ordered the way a controller reads them.
 *
 * Unsettled first and by due date, then everything settled by issue date. A
 * strict newest-first ledger buries the one invoice that needs paying under
 * three that are already closed, which is precisely the wrong way round.
 */
export function invoicesForAccount(
  invoices: CustomerInvoice[],
  customerId: PartyId = ORG_ID,
): CustomerInvoice[] {
  return invoices
    .filter((i) => i.customerId === customerId)
    .sort((a, b) => {
      const settledA = isInvoiceSettled(a)
      const settledB = isInvoiceSettled(b)
      if (settledA !== settledB) return settledA ? 1 : -1
      if (!settledA) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      return new Date(b.issuedAt ?? b.dueAt).getTime() - new Date(a.issuedAt ?? a.dueAt).getTime()
    })
}

export interface AccountPosition {
  /** Everything invoiced and not yet settled. */
  outstandingInr: number
  /** The part of it that is already past its due date. */
  overdueInr: number
  invoicedInr: number
  paidInr: number
  openCount: number
  overdueCount: number
  /** Earliest due date still ahead — what leaves the bank next. */
  nextDue?: CustomerInvoice
  /** Longest-overdue balance. The one thing on the account that needs a decision. */
  mostOverdue?: CustomerInvoice
}

export function accountPosition(invoices: CustomerInvoice[], now: number = DEMO_NOW_MS): AccountPosition {
  const open = invoices.filter((i) => !isInvoiceSettled(i))
  const overdue = open.filter((i) => isPast(i.dueAt, now))
  const byDue = (a: CustomerInvoice, b: CustomerInvoice) =>
    new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()

  return {
    outstandingInr: open.reduce((sum, i) => sum + invoiceBalance(i), 0),
    overdueInr: overdue.reduce((sum, i) => sum + invoiceBalance(i), 0),
    invoicedInr: invoices.reduce((sum, i) => sum + i.total, 0),
    paidInr: invoices.reduce((sum, i) => sum + i.amountPaid, 0),
    openCount: open.length,
    overdueCount: overdue.length,
    // Deliberately the earliest *future* due date: the overdue balance is
    // reported on its own tile and its own action row, and counting it twice
    // would make the page argue with itself.
    nextDue: [...open].filter((i) => !isPast(i.dueAt, now)).sort(byDue)[0],
    mostOverdue: [...overdue].sort(byDue)[0],
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   CREDIT
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The one facility this account holds.
 *
 * The seed carries six facilities because the forwarder has six customers.
 * This is a single-customer application, so the other five must never reach
 * a screen — and the safest way to guarantee that is for the customer app to
 * have exactly one way of asking for a facility.
 */
export function facilityForAccount(
  facilities: CreditFacility[],
  customerId: PartyId = ORG_ID,
): CreditFacility | undefined {
  return facilities.find((f) => f.customerId === customerId)
}

export function creditUtilisationPct(facility: CreditFacility): number {
  if (facility.limitInr <= 0) return 0
  return (facility.utilisedInr / facility.limitInr) * 100
}

/**
 * Utilisation bands.
 *
 * Deliberately inverted against the contract-volume meter elsewhere in the
 * product: hitting 95% of a committed volume is the goal, and hitting 95% of
 * a credit limit means the next booking may not go through.
 */
export type UtilisationBand = 'HEADROOM' | 'STEADY' | 'TIGHT' | 'AT_LIMIT'

export function utilisationBand(pct: number): UtilisationBand {
  if (pct >= 90) return 'AT_LIMIT'
  if (pct >= 75) return 'TIGHT'
  if (pct >= 45) return 'STEADY'
  return 'HEADROOM'
}

export const UTILISATION_BAND_NOTE: Record<UtilisationBand, string> = {
  HEADROOM: 'Comfortable headroom. Bookings on this account will not be held for credit.',
  STEADY: 'Normal working level. Worth watching as invoices come due rather than acting on.',
  TIGHT: 'Little room left. A large booking may exceed the limit before the next invoice settles.',
  AT_LIMIT:
    'At the limit. New bookings will be held until an outstanding invoice is settled or the partner raises the limit.',
}

/* ══════════════════════════════════════════════════════════════════════════
   DETENTION AND STORAGE — the exposure model
   ══════════════════════════════════════════════════════════════════════════
   Two clocks, and the entire point of this section is that they are two.
   They start at different moments, they are payable to different parties,
   and a shipment held up at destination runs both at once. Collapsing them
   into one "demurrage" figure is how a customer under-provisions by half.

   Nothing here is a tariff. The slabs come from the destination port profile
   and are indicative bands; the customer's own booking terms govern. What is
   worth knowing is the shape — that the charge escalates on a fixed day and
   again later — because that is what changes behaviour.
   ══════════════════════════════════════════════════════════════════════════ */

/** The projection window. Seven days is a week of slipped delivery planning. */
export const PROJECTION_DAYS = 7

export const EXPOSURE_BASIS =
  'Calendar days, weekends and public holidays included. Indicative bands from the destination port profile, not a carrier tariff — the free time and rates on your own booking govern.'

export const EXPOSURE_FX_NOTE = `Dollar bands converted at the demo’s fixed rate of ${money(
  DEMO_FX_USD_INR,
  'INR',
  true,
)} per US dollar.`

export type ExposureClock = 'DETENTION' | 'STORAGE'

export interface SlabProjection {
  clock: ExposureClock
  label: string
  /** What starts and stops this particular clock. */
  meaning: string
  /** Who the money goes to. The two clocks do not share a payee. */
  payableTo: string
  freeDays: number
  /** First day that carries a charge — free days plus one. */
  firstChargeableDay: number
  /** The slab that first day lands in. */
  slab: FreeTimeSlab
  /** How the slab is multiplied: 20-foot equivalents, or whole containers. */
  units: number
  unitLabel: string
  /** Charge on the first chargeable day, in INR. */
  dailyInr: number
  /** Days one to seven of an overrun, walking the slab table as it escalates. */
  projectedInr: number
  /** True when the seven days cross into a higher slab. */
  escalatesWithinWindow: boolean
  /** The published band, in its own currency. */
  rateLabel: string
}

export interface FreeTimeExposure {
  jobId: JobId
  bookingId: string
  direction: Direction
  incoterm: Incoterm
  carrierName: string
  originPortId: string
  destinationPortId: string
  destinationTerminal: string
  containerCount: number
  teuCount: number
  /** "2 × 40HC" — built from the container records, never assumed. */
  equipmentLabel: string
  freeTimeDays: number
  freeTimeExpiry: string
  /** Fractional days to expiry. Negative once the clocks are running. */
  daysRemaining: number
  band: ExposureBand
  detention: SlabProjection | null
  storage: SlabProjection | null
}

export type ExposureBand = 'RUNNING' | 'CRITICAL' | 'WATCH' | 'CLEAR'

export const EXPOSURE_BAND_LABEL: Record<ExposureBand, string> = {
  RUNNING: 'Free time expired',
  CRITICAL: 'Inside two days',
  WATCH: 'Inside a week',
  CLEAR: 'Clear for now',
}

const DAY_MS = 86_400_000

function slabForDay(slabs: readonly FreeTimeSlab[], day: number): FreeTimeSlab | undefined {
  return slabs.find((s) => day >= s.fromDay && (s.toDay === undefined || day <= s.toDay))
}

/** One slab day, in rupees, for the number of units on the shipment. */
function slabDayInr(slab: FreeTimeSlab, units: number): number {
  const perUnit = slab.currency === 'USD' ? slab.amount * DEMO_FX_USD_INR : slab.amount
  return Math.round(perUnit * units)
}

/**
 * The published band as the port profile states it, in its own currency.
 *
 * Dollar bands keep the "USD" word rather than the $ glyph — the same shape
 * the port and Zeno surfaces use. On a screen that also carries rupee figures,
 * a bare $ beside a ₹ is the one pair a reader can misattribute at a glance.
 */
function rateLabelFor(slab: FreeTimeSlab): string {
  const amount = slab.currency === 'USD' ? moneyUsd(slab.amount) : money(slab.amount, 'INR')
  return `${amount} · ${slab.basis}`
}

function projectClock(args: {
  clock: ExposureClock
  label: string
  meaning: string
  payableTo: string
  slabs: readonly FreeTimeSlab[]
  freeDays: number
  units: number
  unitLabel: string
}): SlabProjection | null {
  const { clock, label, meaning, payableTo, slabs, freeDays, units, unitLabel } = args
  if (slabs.length === 0 || units <= 0) return null

  const firstChargeableDay = freeDays + 1
  const slab = slabForDay(slabs, firstChargeableDay)
  if (!slab) return null

  // Walk the window day by day rather than multiplying the first rate out.
  // At Nhava Sheva a seven-day detention overrun crosses from the day 8–12
  // band into the day 13+ band on its sixth day, and a flat multiplication
  // understates it by exactly the amount a customer would be surprised by.
  let projectedInr = 0
  let escalatesWithinWindow = false
  for (let offset = 0; offset < PROJECTION_DAYS; offset++) {
    const day = firstChargeableDay + offset
    const dailySlab = slabForDay(slabs, day)
    if (!dailySlab) continue
    if (dailySlab.fromDay !== slab.fromDay) escalatesWithinWindow = true
    projectedInr += slabDayInr(dailySlab, units)
  }

  return {
    clock,
    label,
    meaning,
    payableTo,
    freeDays,
    firstChargeableDay,
    slab,
    units,
    unitLabel,
    dailyInr: slabDayInr(slab, units),
    projectedInr,
    escalatesWithinWindow,
    rateLabel: rateLabelFor(slab),
  }
}

/** "2 × 40HC + 1 × 20FT" — grouped from the actual container records. */
function equipmentLabelFor(containers: Container[]): string {
  const counts = new Map<string, number>()
  for (const c of containers) counts.set(c.isoType, (counts.get(c.isoType) ?? 0) + 1)
  return [...counts.entries()].map(([iso, qty]) => containerSummary(qty, iso)).join(' + ')
}

function bandFor(daysRemaining: number): ExposureBand {
  if (daysRemaining < 0) return 'RUNNING'
  if (daysRemaining < 2) return 'CRITICAL'
  if (daysRemaining < 7) return 'WATCH'
  return 'CLEAR'
}

/**
 * The projection for one shipment.
 *
 * Returns null where there is nothing honest to project: no container
 * records means no equipment to multiply by, and a destination without a
 * written profile has no published slabs to read. Guessing either would put
 * a number on the screen that no record behind it supports.
 */
export function projectFreeTimeExposure(
  job: Job,
  booking: Booking,
  containers: Container[],
  now: number = DEMO_NOW_MS,
): FreeTimeExposure | null {
  if (containers.length === 0) return null

  const profile = portProfile(job.destinationId)
  if (!profile) return null

  const teuCount = containers.reduce((sum, c) => sum + teuFor(c.isoType), 0)
  const { detentionFreeDays, storageFreeDays, detentionSlabs, storageSlabs } = profile.freeTime
  const daysRemaining = (new Date(booking.freeTimeExpiry).getTime() - now) / DAY_MS

  return {
    jobId: job.id,
    bookingId: booking.id,
    direction: job.direction,
    incoterm: job.incoterm,
    carrierName: booking.carrierName,
    originPortId: job.originId,
    destinationPortId: job.destinationId,
    destinationTerminal: booking.destinationTerminal,
    containerCount: containers.length,
    teuCount,
    equipmentLabel: equipmentLabelFor(containers),
    freeTimeDays: booking.freeTimeDays,
    freeTimeExpiry: booking.freeTimeExpiry,
    daysRemaining,
    band: bandFor(daysRemaining),

    detention: projectClock({
      clock: 'DETENTION',
      label: 'Detention',
      meaning:
        'Runs from the moment the container leaves the terminal gate until the empty is returned to the carrier’s depot.',
      payableTo: 'Payable to the shipping line',
      slabs: detentionSlabs,
      freeDays: detentionFreeDays,
      // Detention is published per 20ft, so a 40ft box counts twice. That is
      // exactly what a TEU is, which is why the equivalent — not the box
      // count — is the multiplier here.
      units: teuCount,
      unitLabel: `${teuCount} × 20ft equivalent`,
    }),

    storage: projectClock({
      clock: 'STORAGE',
      label: 'Storage',
      meaning:
        'Runs while the loaded container is still inside the terminal after the free period ends — usually because delivery or an external dependency has not cleared.',
      payableTo: 'Payable to the terminal or the line',
      slabs: storageSlabs,
      freeDays: storageFreeDays,
      // Storage is published per container, whatever its size.
      units: containers.length,
      unitLabel: `${containers.length} × container`,
    }),
  }
}

/**
 * Statuses where the clocks can still cost the customer something.
 *
 * An enquiry or a quote has no booking to read free time from, and by the
 * time a job is delivered and closed the box has been returned and both
 * clocks have stopped. Everything in between is live exposure.
 */
const EXPOSED_JOB_STATUSES: readonly JobStatus[] = ['BOOKED', 'ORIGIN_HANDLING', 'IN_TRANSIT', 'ARRIVING']

export interface AccountExposures {
  /** Most urgent first — least free time remaining. */
  exposures: FreeTimeExposure[]
  /**
   * Live shipments that could not be projected because no equipment has been
   * declared against the booking yet. Reported rather than hidden: a table
   * that quietly drops rows is how a customer learns to distrust the total.
   */
  withoutEquipment: number
}

export function buildAccountExposures(
  jobs: Job[],
  bookings: Booking[],
  containers: Container[],
  customerId: PartyId = ORG_ID,
  now: number = DEMO_NOW_MS,
): AccountExposures {
  const exposures: FreeTimeExposure[] = []
  let withoutEquipment = 0

  for (const job of jobs) {
    if (job.customerId !== customerId) continue
    if (!EXPOSED_JOB_STATUSES.includes(job.status)) continue

    const booking = bookings.find((b) => b.jobId === job.id)
    if (!booking) continue

    const boxes = containers.filter((c) => c.jobId === job.id)
    const projection = projectFreeTimeExposure(job, booking, boxes, now)
    if (projection) exposures.push(projection)
    else if (boxes.length === 0) withoutEquipment += 1
  }

  exposures.sort((a, b) => a.daysRemaining - b.daysRemaining)
  return { exposures, withoutEquipment }
}

/** Totals across a set of projections. Kept per clock — never one figure. */
export function exposureTotals(exposures: FreeTimeExposure[]): {
  detentionInr: number
  storageInr: number
  shipments: number
} {
  return {
    detentionInr: exposures.reduce((sum, e) => sum + (e.detention?.projectedInr ?? 0), 0),
    storageInr: exposures.reduce((sum, e) => sum + (e.storage?.projectedInr ?? 0), 0),
    shipments: exposures.length,
  }
}
