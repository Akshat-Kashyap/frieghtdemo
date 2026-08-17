/**
 * FORMATTING
 * ──────────────────────────────────────────────────────────────────────────
 * Every currency, weight, volume, TEU and timestamp in this product passes
 * through here. No component formats a number inline — that is how a
 * 20-module app ends up with four different ways to write ₹8,42,000.
 *
 * All Intl formatters are constructed once at module scope: building them
 * per-render is a genuine cost in dense tables.
 */

import { DEMO_TZ, DEMO_TZ_LABEL } from './demo-clock'

/* ── Currency ─────────────────────────────────────────────────────────── */

export type Currency = 'INR' | 'USD' | 'EUR' | 'AED' | 'SGD' | 'CNY'

const CURRENCY_SYMBOL: Record<Currency, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  AED: 'AED ',
  SGD: 'S$',
  CNY: '¥',
}

const inrGrouping = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const inrGrouping2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const intGrouping = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const intGrouping2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Money with the correct grouping for the currency's own convention:
 * INR uses the Indian lakh/crore grouping (8,42,000), everything else
 * uses thousands (842,000).
 */
export function money(amount: number, currency: Currency = 'INR', decimals = false): string {
  const symbol = CURRENCY_SYMBOL[currency]
  const abs = Math.abs(amount)
  const grouped =
    currency === 'INR'
      ? (decimals ? inrGrouping2 : inrGrouping).format(abs)
      : (decimals ? intGrouping2 : intGrouping).format(abs)
  return `${amount < 0 ? '−' : ''}${symbol}${grouped}`
}

/**
 * Indian short-form money — the format Indian freight desks actually speak in.
 * 842_000 → "₹8.42L" · 12_400_000 → "₹1.24Cr"
 * This is what produces the ₹8.42L dashboard metric.
 */
export function moneyShortInr(amount: number): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '−' : ''
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`
  return `${sign}₹${abs}`
}

/** Signed money for margin/variance cells, where the + carries meaning. */
export function moneySigned(amount: number, currency: Currency = 'INR'): string {
  const formatted = money(Math.abs(amount), currency)
  if (amount === 0) return formatted
  return amount > 0 ? `+${formatted}` : `−${formatted}`
}

export function currencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOL[currency]
}

/**
 * "USD 4,240" — the form an ocean freight desk actually quotes a rate in.
 *
 * Deliberately not `money(n, 'USD')`, which renders "$4,240". Rate grids, RFQ
 * responses and contract lanes are all read on screens that carry INR figures
 * too, and a bare "$" sitting a column away from a "₹" invites a misread of
 * which currency a number is in — the ISO code cannot be misread.
 *
 * It exists because nine screens had each hand-rolled
 * `amount.toLocaleString('en-US')` behind a literal "USD " to get this, which
 * is exactly the drift this module was written to stop: the moment one of
 * them needed decimals or a different grouping, the product would have had
 * two ways to write a freight rate.
 */
export function moneyUsd(amount: number): string {
  return `USD ${intGrouping.format(amount)}`
}

/* ── Percentages & plain numbers ──────────────────────────────────────── */

export function percent(value: number, dp = 1): string {
  return `${value.toFixed(dp)}%`
}

export function percentSigned(value: number, dp = 1): string {
  if (value === 0) return `0.0%`
  return `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(dp)}%`
}

/** Zero-padded metric display — the dashboard shows "07", not "7". */
export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function count(n: number): string {
  return intGrouping.format(n)
}

/* ── Freight units ────────────────────────────────────────────────────── */

/** 18420 → "18,420 kg" · switches to tonnes above 100t where kg stops being useful. */
export function weightKg(kg: number): string {
  if (kg >= 100_000) return `${intGrouping2.format(kg / 1000)} t`
  return `${intGrouping.format(Math.round(kg))} kg`
}

export function volumeCbm(cbm: number): string {
  return `${intGrouping2.format(cbm)} CBM`
}

/** Air freight convention: L×W×H in cm ÷ 6000 = volumetric kg. */
export function volumetricWeight(lengthCm: number, widthCm: number, heightCm: number, pieces = 1): number {
  return Math.round(((lengthCm * widthCm * heightCm) / 6000) * pieces * 100) / 100
}

/** Chargeable weight is the greater of actual and volumetric. */
export function chargeableWeight(actualKg: number, volumetricKg: number): number {
  return Math.max(actualKg, volumetricKg)
}

/** Container equivalent units — a 40ft box is 2 TEU. */
export function teuFor(isoType: string, quantity = 1): number {
  const forty = /^(40|45)/.test(isoType)
  return (forty ? 2 : 1) * quantity
}

export function teu(value: number): string {
  return `${intGrouping.format(value)} TEU`
}

/** "2 × 40HC" — the canonical cargo shorthand used across every screen. */
export function containerSummary(quantity: number, isoType: string): string {
  return `${quantity} × ${isoType}`
}

/* ── Dates & times (always IST — this is an Indian ops desk) ───────────── */

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: DEMO_TZ,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const dateShortFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: DEMO_TZ,
  day: '2-digit',
  month: 'short',
})

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: DEMO_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** "18 Aug 2026" */
export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso))
}

/** "18 Aug" */
export function formatDateShort(iso: string): string {
  return dateShortFmt.format(new Date(iso))
}

/** "08:40" */
export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso))
}

/** "18 Aug 2026 · 08:40 IST" — the full operational stamp on milestones and audit rows. */
export function formatStamp(iso: string): string {
  return `${dateFmt.format(new Date(iso))} · ${timeFmt.format(new Date(iso))} ${DEMO_TZ_LABEL}`
}

/** "18 Aug · 08:40" — the compact stamp for dense timelines. */
export function formatStampShort(iso: string): string {
  return `${dateShortFmt.format(new Date(iso))} · ${timeFmt.format(new Date(iso))}`
}

/** Transit expressed as a band, because a real freight ETA is never one number. */
export function transitRange(minDays: number, maxDays: number): string {
  return minDays === maxDays ? `${minDays} days` : `${minDays}–${maxDays} days`
}

/* ── Identity & text ──────────────────────────────────────────────────── */

/** "Arjun Mehta" → "AM" */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

/** "PORT_TO_DOOR" → "Port to door" — for enum labels not worth a lookup table. */
export function humanise(value: string): string {
  const spaced = value.replace(/[_-]+/g, ' ').toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
