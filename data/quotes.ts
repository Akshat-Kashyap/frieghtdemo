import { daysFromNow } from '@/lib/demo-clock'
import type { ChargeLine, Quote, QuoteTotals } from '@/types'
import { DEMO_FX_USD_INR } from './charge-catalog'
import { HERO_JOB_ID } from './jobs'

/**
 * Quotes and their charge lines.
 *
 * A quote here is a structure, not a price. Every line carries basis,
 * quantity, buy, sell, currency, FX, payer, validity, source, applicability
 * and tax treatment — because that is what a forwarder actually argues about
 * internally, and what determines whether the job makes money.
 */

/** Line-level margin, and the roll-up in both the quote currency and INR. */
export function lineMargin(line: ChargeLine): number {
  return (line.sellRate - line.buyRate) * line.quantity
}

export function computeTotals(lines: ChargeLine[]): QuoteTotals {
  let buyInr = 0
  let sellInr = 0
  let buy = 0
  let sell = 0

  for (const line of lines) {
    // Exposure-only lines are risks the customer carries, not quoted revenue.
    // Including them would overstate both the quote and the margin.
    if (line.applicability === 'EXPOSURE_ONLY') continue
    buy += line.buyRate * line.quantity
    sell += line.sellRate * line.quantity
    buyInr += line.buyRate * line.quantity * line.fx
    sellInr += line.sellRate * line.quantity * line.fx
  }

  const margin = sell - buy
  const marginInr = sellInr - buyInr

  return {
    buy: round2(buy),
    sell: round2(sell),
    margin: round2(margin),
    marginPct: sell === 0 ? 0 : round2((margin / sell) * 100),
    buyInr: Math.round(buyInr),
    sellInr: Math.round(sellInr),
    marginInr: Math.round(marginInr),
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100

/* ══════════════════════════════════════════════════════════════════════════
   HERO QUOTE — Shanghai → Nhava Sheva, 2 × 40HC, port to door
   Seeded with the worked example: Ocean Freight 1200/1350, Origin Handling
   180/220, Documentation 50/75 — margins USD 300, 80, 25 respectively.
   ══════════════════════════════════════════════════════════════════════════ */

const HERO_LINES: ChargeLine[] = [
  {
    id: 'CL-4281-01',
    code: 'OFR',
    description: 'Ocean Freight',
    family: 'MAIN_CARRIAGE',
    basis: 'PER_CONTAINER',
    quantity: 2,
    buyRate: 1200,
    sellRate: 1350,
    currency: 'USD',
    fx: DEMO_FX_USD_INR,
    payer: 'CUSTOMER',
    validUntil: daysFromNow(-1),
    source: 'CONTRACT_RATE',
    applicability: 'CONFIRMED',
    taxTreatment: 'ZERO_RATED',
    vendorId: 'CARR-MSC',
    notes: 'MSC FIX service contract rate, 40HC.',
  },
  {
    id: 'CL-4281-02',
    code: 'BAF',
    description: 'Bunker Adjustment Factor',
    family: 'FUEL_SURCHARGE',
    basis: 'PER_CONTAINER',
    quantity: 2,
    buyRate: 180,
    sellRate: 205,
    currency: 'USD',
    fx: DEMO_FX_USD_INR,
    payer: 'CUSTOMER',
    validUntil: daysFromNow(-1),
    source: 'PUBLISHED_TARIFF',
    applicability: 'CONFIRMED',
    taxTreatment: 'ZERO_RATED',
    vendorId: 'CARR-MSC',
  },
  {
    id: 'CL-4281-03',
    code: 'OHC',
    description: 'Origin Handling',
    family: 'ORIGIN_HANDLING',
    basis: 'PER_CONTAINER',
    quantity: 2,
    buyRate: 180,
    sellRate: 220,
    currency: 'USD',
    fx: DEMO_FX_USD_INR,
    payer: 'CUSTOMER',
    validUntil: daysFromNow(-1),
    source: 'PARTNER_QUOTE',
    applicability: 'CONFIRMED',
    taxTreatment: 'ZERO_RATED',
    vendorId: 'VND-EASTPORT',
  },
  {
    id: 'CL-4281-04',
    code: 'DOC',
    description: 'Documentation',
    family: 'DOCUMENTATION',
    basis: 'PER_BL',
    quantity: 1,
    buyRate: 50,
    sellRate: 75,
    currency: 'USD',
    fx: DEMO_FX_USD_INR,
    payer: 'CUSTOMER',
    validUntil: daysFromNow(-1),
    source: 'PUBLISHED_TARIFF',
    applicability: 'CONFIRMED',
    taxTreatment: 'ZERO_RATED',
  },
  {
    id: 'CL-4281-05',
    code: 'THC',
    description: 'Terminal Handling Charge — destination',
    family: 'TERMINAL_HANDLING',
    basis: 'PER_CONTAINER',
    quantity: 2,
    buyRate: 9600,
    sellRate: 11200,
    currency: 'INR',
    fx: 1,
    payer: 'CUSTOMER',
    validUntil: daysFromNow(-1),
    source: 'PUBLISHED_TARIFF',
    applicability: 'CONFIRMED',
    taxTreatment: 'GST_18',
    vendorId: 'VND-JNPT-TERM',
  },
  {
    id: 'CL-4281-05b',
    code: 'DHC',
    description: 'Destination Handling',
    family: 'DESTINATION_HANDLING',
    basis: 'PER_CONTAINER',
    quantity: 2,
    buyRate: 8200,
    sellRate: 10400,
    currency: 'INR',
    fx: 1,
    payer: 'CUSTOMER',
    validUntil: daysFromNow(-1),
    source: 'PARTNER_QUOTE',
    applicability: 'CONFIRMED',
    taxTreatment: 'GST_18',
    vendorId: 'VND-SPEEDCFS',
  },
  {
    id: 'CL-4281-06',
    code: 'DO',
    description: 'Delivery Order',
    family: 'DELIVERY_ORDER',
    basis: 'PER_SHIPMENT',
    quantity: 1,
    buyRate: 3800,
    sellRate: 5200,
    currency: 'INR',
    fx: 1,
    payer: 'CUSTOMER',
    validUntil: daysFromNow(-1),
    source: 'PUBLISHED_TARIFF',
    applicability: 'CONFIRMED',
    taxTreatment: 'GST_18',
    vendorId: 'CARR-MSC',
  },
  {
    id: 'CL-4281-07',
    code: 'IHC',
    description: 'Inland Haulage — Nhava Sheva to Pune',
    family: 'INLAND',
    basis: 'PER_CONTAINER',
    quantity: 2,
    buyRate: 18400,
    sellRate: 22600,
    currency: 'INR',
    fx: 1,
    payer: 'CUSTOMER',
    validUntil: daysFromNow(-1),
    source: 'PARTNER_QUOTE',
    applicability: 'CONFIRMED',
    taxTreatment: 'GST_5',
    vendorId: 'VND-WESTLINE',
    notes: 'Added in version 2 when the scope moved from port-to-port to port-to-door.',
  },
  {
    id: 'CL-4281-08',
    code: 'WAIT',
    description: 'Waiting at delivery point',
    family: 'WAITING',
    basis: 'PER_HOUR',
    quantity: 6,
    buyRate: 350,
    sellRate: 500,
    currency: 'INR',
    fx: 1,
    payer: 'CUSTOMER',
    validUntil: daysFromNow(-1),
    source: 'PUBLISHED_TARIFF',
    applicability: 'CONDITIONAL',
    taxTreatment: 'GST_5',
    vendorId: 'VND-WESTLINE',
    notes: 'Charged only beyond the 6-hour free unloading window at the plant.',
  },
  {
    id: 'CL-4281-09',
    code: 'STOR',
    description: 'Port storage beyond free time',
    family: 'STORAGE',
    basis: 'PER_DAY',
    quantity: 2,
    buyRate: 1450,
    sellRate: 1850,
    currency: 'INR',
    fx: 1,
    payer: 'CUSTOMER',
    validUntil: daysFromNow(-1),
    source: 'PUBLISHED_TARIFF',
    applicability: 'EXPOSURE_ONLY',
    taxTreatment: 'GST_18',
    notes: 'Exposure only — shown so the customer sees the risk, not billed on this quote.',
  },
  {
    id: 'CL-4281-10',
    code: 'DET',
    description: 'Container detention beyond free time',
    family: 'DETENTION',
    basis: 'PER_DAY',
    quantity: 2,
    buyRate: 42,
    sellRate: 55,
    currency: 'USD',
    fx: DEMO_FX_USD_INR,
    payer: 'CUSTOMER',
    validUntil: daysFromNow(-1),
    source: 'PUBLISHED_TARIFF',
    applicability: 'EXPOSURE_ONLY',
    taxTreatment: 'ZERO_RATED',
    notes: 'Exposure only — 7 days carrier free time, then USD 55 per container per day.',
  },
]

/** Version 1: port to port, before inland scope was added. */
const HERO_LINES_V1: ChargeLine[] = HERO_LINES.filter(
  (l) => !['CL-4281-07', 'CL-4281-08'].includes(l.id),
).map((l) => ({ ...l, id: `${l.id}-v1` }))

export const QUOTES: Quote[] = [
  {
    id: 'QT-2026-00291-V1',
    jobId: HERO_JOB_ID,
    enquiryId: 'ENQ-2026-00318',
    version: 1,
    status: 'SUPERSEDED',
    docStatus: 'SUPERSEDED',
    currency: 'USD',
    fxRate: DEMO_FX_USD_INR,
    validFrom: daysFromNow(-10),
    validUntil: daysFromNow(-3),
    lines: HERO_LINES_V1,
    createdBy: 'Sales Desk',
    createdAt: daysFromNow(-10),
    sentAt: daysFromNow(-10),
    supersededByQuoteId: 'QT-2026-00291-V2',
    notes: 'Issued port to port. Superseded when the customer asked for door delivery to Pune.',
  },
  {
    id: 'QT-2026-00291-V2',
    jobId: HERO_JOB_ID,
    enquiryId: 'ENQ-2026-00318',
    version: 2,
    status: 'ACCEPTED',
    docStatus: 'ACCEPTED',
    currency: 'USD',
    fxRate: DEMO_FX_USD_INR,
    validFrom: daysFromNow(-9),
    validUntil: daysFromNow(-1),
    lines: HERO_LINES,
    createdBy: 'Sales Desk',
    createdAt: daysFromNow(-9),
    sentAt: daysFromNow(-9),
    acceptedAt: daysFromNow(-9.2),
    notes: 'Port to door including inland haulage to the Pune plant. Accepted 07 Aug.',
  },
]

/**
 * Lighter quotes for the remaining jobs, so the Quotes module and every
 * shipment's Costs tab have real charge structures rather than placeholders.
 * Built from the same catalogue so the shape is identical everywhere.
 */
export function buildQuoteLines(
  jobId: string,
  containerQty: number,
  opts: { inland?: boolean; insurance?: boolean; scale?: number } = {},
): ChargeLine[] {
  const { inland = false, insurance = false, scale = 1 } = opts
  const short = jobId.slice(-6)
  const lines: ChargeLine[] = [
    {
      id: `CL-${short}-01`,
      code: 'OFR',
      description: 'Ocean Freight',
      family: 'MAIN_CARRIAGE',
      basis: 'PER_CONTAINER',
      quantity: containerQty,
      buyRate: round2(1180 * scale),
      // ~10% on main carriage. The hero job's authored quote runs richer at
      // 12.5%, which is the point — a key account on a contracted lane earns
      // more than the average of the book.
      sellRate: round2(1309 * scale),
      currency: 'USD',
      fx: DEMO_FX_USD_INR,
      payer: 'CUSTOMER',
      validUntil: daysFromNow(6),
      source: 'CONTRACT_RATE',
      applicability: 'CONFIRMED',
      taxTreatment: 'ZERO_RATED',
    },
    {
      id: `CL-${short}-02`,
      code: 'BAF',
      description: 'Bunker Adjustment Factor',
      family: 'FUEL_SURCHARGE',
      basis: 'PER_CONTAINER',
      quantity: containerQty,
      buyRate: 175,
      sellRate: 200,
      currency: 'USD',
      fx: DEMO_FX_USD_INR,
      payer: 'CUSTOMER',
      validUntil: daysFromNow(6),
      source: 'PUBLISHED_TARIFF',
      applicability: 'CONFIRMED',
      taxTreatment: 'ZERO_RATED',
    },
    {
      id: `CL-${short}-03`,
      code: 'OHC',
      description: 'Origin Handling',
      family: 'ORIGIN_HANDLING',
      basis: 'PER_CONTAINER',
      quantity: containerQty,
      buyRate: 175,
      sellRate: 215,
      currency: 'USD',
      fx: DEMO_FX_USD_INR,
      payer: 'CUSTOMER',
      validUntil: daysFromNow(6),
      source: 'PARTNER_QUOTE',
      applicability: 'CONFIRMED',
      taxTreatment: 'ZERO_RATED',
    },
    {
      id: `CL-${short}-04`,
      code: 'DOC',
      description: 'Documentation',
      family: 'DOCUMENTATION',
      basis: 'PER_BL',
      quantity: 1,
      buyRate: 50,
      sellRate: 75,
      currency: 'USD',
      fx: DEMO_FX_USD_INR,
      payer: 'CUSTOMER',
      validUntil: daysFromNow(6),
      source: 'PUBLISHED_TARIFF',
      applicability: 'CONFIRMED',
      taxTreatment: 'ZERO_RATED',
    },
    {
      id: `CL-${short}-05`,
      code: 'THC',
      description: 'Terminal Handling Charge',
      family: 'TERMINAL_HANDLING',
      basis: 'PER_CONTAINER',
      quantity: containerQty,
      buyRate: 9600,
      sellRate: 11100,
      currency: 'INR',
      fx: 1,
      payer: 'CUSTOMER',
      validUntil: daysFromNow(6),
      source: 'PUBLISHED_TARIFF',
      applicability: 'CONFIRMED',
      taxTreatment: 'GST_18',
    },
  ]

  if (inland) {
    lines.push({
      id: `CL-${short}-06`,
      code: 'IHC',
      description: 'Inland Haulage',
      family: 'INLAND',
      basis: 'PER_CONTAINER',
      quantity: containerQty,
      buyRate: 18400,
      sellRate: 22600,
      currency: 'INR',
      fx: 1,
      payer: 'CUSTOMER',
      validUntil: daysFromNow(6),
      source: 'PARTNER_QUOTE',
      applicability: 'CONFIRMED',
      taxTreatment: 'GST_5',
    })
  }

  if (insurance) {
    lines.push({
      id: `CL-${short}-07`,
      code: 'INS',
      description: 'Marine Cargo Insurance',
      family: 'INSURANCE',
      basis: 'PERCENTAGE',
      quantity: 1,
      buyRate: 6200,
      sellRate: 8900,
      currency: 'INR',
      fx: 1,
      payer: 'CUSTOMER',
      validUntil: daysFromNow(6),
      source: 'PARTNER_QUOTE',
      applicability: 'CONDITIONAL',
      taxTreatment: 'GST_18',
    })
  }

  return lines
}
