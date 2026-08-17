import type { ChargeBasis, ChargeFamily, ChargePayer, ChargeSource, Currency, TaxTreatment } from '@/types'

/**
 * THE CHARGE CATALOGUE
 * ──────────────────────────────────────────────────────────────────────────
 * Every charge the quote builder can add. A freight quote is not a price —
 * it is a structure of lines, each with its own basis, payer, validity, tax
 * treatment and source. That structure is the actual product here, so it is
 * defined once and every quote line is stamped from it.
 *
 * `applicability` distinguishes three genuinely different things that all look
 * like money on a quote:
 *   CONFIRMED      — will be charged
 *   CONDITIONAL    — charged only if the trigger occurs (waiting, special handling)
 *   EXPOSURE_ONLY  — not charged, but the customer is exposed (storage, detention)
 * Collapsing those three is how a forwarder ends up eating a detention bill.
 */

export interface ChargeCatalogEntry {
  code: string
  description: string
  family: ChargeFamily
  basis: ChargeBasis
  defaultPayer: ChargePayer
  defaultCurrency: Currency
  defaultSource: ChargeSource
  taxTreatment: TaxTreatment
  applicability: 'CONFIRMED' | 'CONDITIONAL' | 'EXPOSURE_ONLY'
  /** Indicative buy/sell per unit, used to seed quotes and options. */
  typicalBuy: number
  typicalSell: number
  /** Which modes this charge is offered on. */
  modes: readonly string[]
  note?: string
}

const ALL_OCEAN = ['OCEAN_FCL', 'OCEAN_LCL'] as const
const ALL_MODES = ['OCEAN_FCL', 'OCEAN_LCL', 'AIR', 'DOMESTIC_FTL', 'DOMESTIC_LTL'] as const

export const CHARGE_CATALOG: ChargeCatalogEntry[] = [
  /* ── Main carriage ─────────────────────────────────────────────────── */
  {
    code: 'OFR',
    description: 'Ocean Freight',
    family: 'MAIN_CARRIAGE',
    basis: 'PER_CONTAINER',
    defaultPayer: 'CUSTOMER',
    defaultCurrency: 'USD',
    defaultSource: 'CONTRACT_RATE',
    taxTreatment: 'ZERO_RATED',
    applicability: 'CONFIRMED',
    typicalBuy: 1200,
    typicalSell: 1350,
    modes: ALL_OCEAN,
  },
  {
    code: 'AFR',
    description: 'Air Freight',
    family: 'MAIN_CARRIAGE',
    basis: 'PER_KG',
    defaultPayer: 'CUSTOMER',
    defaultCurrency: 'USD',
    defaultSource: 'CONTRACT_RATE',
    taxTreatment: 'ZERO_RATED',
    applicability: 'CONFIRMED',
    typicalBuy: 3.4,
    typicalSell: 4.2,
    modes: ['AIR'],
  },
  {
    code: 'RTF',
    description: 'Road Freight',
    family: 'MAIN_CARRIAGE',
    basis: 'PER_VEHICLE',
    defaultPayer: 'CUSTOMER',
    defaultCurrency: 'INR',
    defaultSource: 'CONTRACT_RATE',
    taxTreatment: 'GST_5',
    applicability: 'CONFIRMED',
    typicalBuy: 16500,
    typicalSell: 19800,
    modes: ['DOMESTIC_FTL'],
  },
  {
    code: 'LTL',
    description: 'Part Load Freight',
    family: 'MAIN_CARRIAGE',
    basis: 'PER_KG',
    defaultPayer: 'CUSTOMER',
    defaultCurrency: 'INR',
    defaultSource: 'PUBLISHED_TARIFF',
    taxTreatment: 'GST_5',
    applicability: 'CONFIRMED',
    typicalBuy: 9.2,
    typicalSell: 12.5,
    modes: ['DOMESTIC_LTL'],
  },

  /* ── Surcharges ────────────────────────────────────────────────────── */
  {
    code: 'BAF',
    description: 'Bunker Adjustment Factor',
    family: 'FUEL_SURCHARGE',
    basis: 'PER_CONTAINER',
    defaultPayer: 'CUSTOMER',
    defaultCurrency: 'USD',
    defaultSource: 'PUBLISHED_TARIFF',
    taxTreatment: 'ZERO_RATED',
    applicability: 'CONFIRMED',
    typicalBuy: 180,
    typicalSell: 205,
    modes: ALL_OCEAN,
    note: 'Floats with the carrier bunker index; revalidated each validity window.',
  },
  {
    code: 'FSC',
    description: 'Fuel Surcharge',
    family: 'FUEL_SURCHARGE',
    basis: 'PER_KG',
    defaultPayer: 'CUSTOMER',
    defaultCurrency: 'USD',
    defaultSource: 'PUBLISHED_TARIFF',
    taxTreatment: 'ZERO_RATED',
    applicability: 'CONFIRMED',
    typicalBuy: 0.65,
    typicalSell: 0.78,
    modes: ['AIR'],
  },

  /* ── Handling ──────────────────────────────────────────────────────── */
  {
    code: 'OHC',
    description: 'Origin Handling',
    family: 'ORIGIN_HANDLING',
    basis: 'PER_CONTAINER',
    defaultPayer: 'CUSTOMER',
    defaultCurrency: 'USD',
    defaultSource: 'PARTNER_QUOTE',
    taxTreatment: 'ZERO_RATED',
    applicability: 'CONFIRMED',
    typicalBuy: 180,
    typicalSell: 220,
    modes: ALL_MODES,
  },
  {
    code: 'DHC',
    description: 'Destination Handling',
    family: 'DESTINATION_HANDLING',
    basis: 'PER_CONTAINER',
    defaultPayer: 'CUSTOMER',
    defaultCurrency: 'INR',
    defaultSource: 'PARTNER_QUOTE',
    taxTreatment: 'GST_18',
    applicability: 'CONFIRMED',
    typicalBuy: 8200,
    typicalSell: 10400,
    modes: ALL_MODES,
  },
  {
    code: 'THC',
    description: 'Terminal Handling Charge',
    family: 'TERMINAL_HANDLING',
    basis: 'PER_CONTAINER',
    defaultPayer: 'CUSTOMER',
    defaultCurrency: 'INR',
    defaultSource: 'PUBLISHED_TARIFF',
    taxTreatment: 'GST_18',
    applicability: 'CONFIRMED',
    typicalBuy: 9600,
    typicalSell: 11200,
    modes: ALL_OCEAN,
  },
  {
    code: 'CFS',
    description: 'CFS Handling',
    family: 'CFS',
    basis: 'PER_CBM',
    defaultPayer: 'CUSTOMER',
    defaultCurrency: 'INR',
    defaultSource: 'PARTNER_QUOTE',
    taxTreatment: 'GST_18',
    applicability: 'CONFIRMED',
    typicalBuy: 620,
    typicalSell: 810,
    modes: ['OCEAN_LCL'],
  },

  /* ── Documentation ─────────────────────────────────────────────────── */
  {
    code: 'DOC',
    description: 'Documentation',
    family: 'DOCUMENTATION',
    basis: 'PER_BL',
    defaultPayer: 'CUSTOMER',
    defaultCurrency: 'USD',
    defaultSource: 'PUBLISHED_TARIFF',
    taxTreatment: 'ZERO_RATED',
    applicability: 'CONFIRMED',
    typicalBuy: 50,
    typicalSell: 75,
    modes: ALL_MODES,
  },
  {
    code: 'DO',
    description: 'Delivery Order',
    family: 'DELIVERY_ORDER',
    basis: 'PER_SHIPMENT',
    defaultPayer: 'CUSTOMER',
    defaultCurrency: 'INR',
    defaultSource: 'PUBLISHED_TARIFF',
    taxTreatment: 'GST_18',
    applicability: 'CONFIRMED',
    typicalBuy: 3800,
    typicalSell: 5200,
    modes: ALL_OCEAN,
  },

  /* ── Inland ────────────────────────────────────────────────────────── */
  {
    code: 'IHC',
    description: 'Inland Haulage',
    family: 'INLAND',
    basis: 'PER_CONTAINER',
    defaultPayer: 'CUSTOMER',
    defaultCurrency: 'INR',
    defaultSource: 'PARTNER_QUOTE',
    taxTreatment: 'GST_5',
    applicability: 'CONFIRMED',
    typicalBuy: 18400,
    typicalSell: 22600,
    modes: ALL_MODES,
  },

  /* ── Insurance ─────────────────────────────────────────────────────── */
  {
    code: 'INS',
    description: 'Marine Cargo Insurance',
    family: 'INSURANCE',
    basis: 'PERCENTAGE',
    defaultPayer: 'CUSTOMER',
    defaultCurrency: 'INR',
    defaultSource: 'PARTNER_QUOTE',
    taxTreatment: 'GST_18',
    applicability: 'CONDITIONAL',
    typicalBuy: 0.08,
    typicalSell: 0.12,
    modes: ALL_MODES,
    note: 'Percentage of declared cargo value. Placed with an external insurer.',
  },

  /* ── Conditional & exposure ────────────────────────────────────────── */
  {
    code: 'WAIT',
    description: 'Waiting / Detention at Site',
    family: 'WAITING',
    basis: 'PER_HOUR',
    defaultPayer: 'CUSTOMER',
    defaultCurrency: 'INR',
    defaultSource: 'PUBLISHED_TARIFF',
    taxTreatment: 'GST_5',
    applicability: 'CONDITIONAL',
    typicalBuy: 350,
    typicalSell: 500,
    modes: ALL_MODES,
    note: 'Charged only beyond the free waiting window at pickup or delivery.',
  },
  {
    code: 'STOR',
    description: 'Port / CFS Storage',
    family: 'STORAGE',
    basis: 'PER_DAY',
    defaultPayer: 'CUSTOMER',
    defaultCurrency: 'INR',
    defaultSource: 'PUBLISHED_TARIFF',
    taxTreatment: 'GST_18',
    applicability: 'EXPOSURE_ONLY',
    typicalBuy: 1450,
    typicalSell: 1850,
    modes: ALL_MODES,
    note: 'Exposure, not a quoted charge. Accrues per container per day past free time.',
  },
  {
    code: 'DET',
    description: 'Container Detention',
    family: 'DETENTION',
    basis: 'PER_DAY',
    defaultPayer: 'CUSTOMER',
    defaultCurrency: 'USD',
    defaultSource: 'PUBLISHED_TARIFF',
    taxTreatment: 'ZERO_RATED',
    applicability: 'EXPOSURE_ONLY',
    typicalBuy: 42,
    typicalSell: 55,
    modes: ALL_OCEAN,
    note: 'Exposure only. Starts when carrier free time expires and the box is not returned.',
  },
  {
    code: 'SPH',
    description: 'Special Handling',
    family: 'SPECIAL_HANDLING',
    basis: 'PER_SHIPMENT',
    defaultPayer: 'CUSTOMER',
    defaultCurrency: 'INR',
    defaultSource: 'PARTNER_QUOTE',
    taxTreatment: 'GST_18',
    applicability: 'CONDITIONAL',
    typicalBuy: 12500,
    typicalSell: 16800,
    modes: ALL_MODES,
    note: 'Reefer monitoring, DG handling, oversized lift or fragile packing.',
  },
]

const CATALOG_INDEX = new Map(CHARGE_CATALOG.map((c) => [c.code, c]))

export function getChargeEntry(code: string): ChargeCatalogEntry | undefined {
  return CATALOG_INDEX.get(code)
}

export function requireChargeEntry(code: string): ChargeCatalogEntry {
  const entry = CATALOG_INDEX.get(code)
  if (!entry) throw new Error(`Unknown charge code: ${code}`)
  return entry
}

export function chargesForMode(mode: string): ChargeCatalogEntry[] {
  return CHARGE_CATALOG.filter((c) => c.modes.includes(mode))
}

/** Grouped for the quote builder's "add charge" menu. */
export function catalogByFamily(): Map<ChargeFamily, ChargeCatalogEntry[]> {
  const grouped = new Map<ChargeFamily, ChargeCatalogEntry[]>()
  for (const entry of CHARGE_CATALOG) {
    const list = grouped.get(entry.family) ?? []
    list.push(entry)
    grouped.set(entry.family, list)
  }
  return grouped
}

/** The demo's fixed USD→INR rate. Pinned so margins are reproducible. */
export const DEMO_FX_USD_INR = 87.4
