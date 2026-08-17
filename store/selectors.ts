'use client'

import { BACKGROUND_ACTIVE_JOB_COUNT, BACKGROUND_ARRIVING_TODAY } from '@/data/jobs'
import { BACKGROUND_OPEN_EXCEPTION_COUNT } from '@/data/exceptions'
import { BACKGROUND_PENDING_VENDOR_BILLS } from '@/data/finance'
import { computeTotals } from '@/data/quotes'
import { getParty, requireParty, requireUser } from '@/data/parties'
import { requirePort } from '@/data/ports'
import { ROUTES } from '@/lib/routes'
import { DEMO_NOW_MS, countdown, isDemoToday } from '@/lib/demo-clock'
import { ACTIVE_JOB_STATUSES, compareSeverity, isExceptionOpen } from '@/lib/lifecycle'
import type { Exception, Job, JobCostSummary, JobFile, Severity } from '@/types'
import type { FreightState } from './freight-store'

/**
 * DERIVED STATE
 * ══════════════════════════════════════════════════════════════════════════
 * Nothing here is stored; everything is computed from the job file. That is
 * deliberate — the moment a metric is stored alongside the records it counts,
 * the two drift, and a dashboard that disagrees with its own drill-down is
 * worse than no dashboard.
 */

/* ══════════════════════════════════════════════════════════════════════════
   THE JOB FILE — one call, one shipment, everything about it
   ══════════════════════════════════════════════════════════════════════════ */

export function selectJobFile(state: FreightState, jobId: string): JobFile | null {
  const job = state.jobs.find((j) => j.id === jobId)
  if (!job) return null

  const quotes = state.quotes.filter((q) => q.jobId === jobId)
  const exceptions = [...state.exceptions.filter((e) => e.jobId === jobId)].sort(sortExceptions)

  return {
    job,
    customer: requireParty(job.customerId),
    owner: requireUser(job.ownerId),
    origin: requirePort(job.originId),
    destination: requirePort(job.destinationId),
    enquiry: state.enquiries.find((e) => e.jobId === jobId),
    quotes,
    acceptedQuote: quotes.find((q) => q.id === job.acceptedQuoteId) ?? quotes.find((q) => q.status === 'ACCEPTED'),
    booking: state.bookings.find((b) => b.jobId === jobId),
    containers: state.containers.filter((c) => c.jobId === jobId),
    cargo: state.cargo.find((c) => c.jobId === jobId),
    milestones: [...state.milestones.filter((m) => m.jobId === jobId)].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    ),
    exceptions,
    openExceptions: exceptions.filter((e) => isExceptionOpen(e.status)),
    documents: state.documents.filter((d) => d.jobId === jobId),
    vendorBills: state.vendorBills.filter((b) => b.jobId === jobId),
    invoice: state.invoices.find((i) => i.jobId === jobId),
    costSummary: selectJobCost(state, jobId),
    activity: state.activity.filter((a) => a.jobId === jobId),
    audit: state.audit.filter((a) => a.jobId === jobId),
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   MARGIN — estimated → provisional → final
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Margin firms up as reality lands:
 *   ESTIMATED   — nothing billed yet; margin is entirely the quote's promise
 *   PROVISIONAL — some vendor bills in; a mix of accrual and actual
 *   FINAL       — every bill received and matched; this is the real number
 *
 * Showing one "margin" figure without saying which of the three it is, is how
 * a forwarder discovers in month-end that the job lost money.
 */
export function selectJobCost(state: FreightState, jobId: string): JobCostSummary {
  const job = state.jobs.find((j) => j.id === jobId)
  const quote = state.quotes.find((q) => q.id === job?.acceptedQuoteId) ?? state.quotes.find((q) => q.jobId === jobId)
  const bills = state.vendorBills.filter((b) => b.jobId === jobId)

  const totals = quote ? computeTotals(quote.lines) : { sellInr: 0, buyInr: 0, marginInr: 0 }
  const sellInr = totals.sellInr
  const accruedCostInr = totals.buyInr

  let actualCostInr = 0
  let varianceInr = 0
  let varianceCount = 0
  let received = 0

  for (const bill of bills) {
    const accrued = bill.accruedAmount * bill.fx
    if (bill.billedAmount == null) {
      // Not yet billed — carry the accrual so the total is never understated.
      actualCostInr += accrued
      continue
    }
    received += 1
    const billed = bill.billedAmount * bill.fx
    actualCostInr += billed
    const delta = billed - accrued
    if (Math.abs(delta) > 1) {
      varianceInr += delta
      varianceCount += 1
    }
  }

  // Jobs with no bill records at all fall back to the quoted cost position.
  if (bills.length === 0) actualCostInr = accruedCostInr

  const basis: JobCostSummary['basis'] =
    bills.length === 0 || received === 0
      ? 'ESTIMATED'
      : bills.every((b) => b.status === 'MATCHED' || b.status === 'APPROVED' || b.status === 'PAID')
        ? 'FINAL'
        : 'PROVISIONAL'

  const marginInr = sellInr - actualCostInr

  return {
    jobId,
    basis,
    sellInr: Math.round(sellInr),
    accruedCostInr: Math.round(accruedCostInr),
    actualCostInr: Math.round(actualCostInr),
    marginInr: Math.round(marginInr),
    marginPct: sellInr === 0 ? 0 : Math.round((marginInr / sellInr) * 1000) / 10,
    varianceCount,
    varianceInr: Math.round(varianceInr),
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   DASHBOARD METRICS
   ══════════════════════════════════════════════════════════════════════════ */

export interface DashboardMetrics {
  activeJobs: number
  atRisk: number
  arrivingToday: number
  cutoffsToday: number
  openExceptions: number
  pendingVendorBills: number
  estimatedMarginInr: number
  openEnquiries: number
  quotesAwaiting: number
  overdueReceivablesInr: number
  creditUtilisationPct: number
  myShipments: number
}

/**
 * Computed from the seed, never typed into a tile.
 *
 * Where a headline exceeds what is authored in full (128 active jobs against
 * 24 detailed ones), the difference is an explicit named constant rather than
 * a magic number — so it is obvious that the pipeline is padded, and by
 * exactly how much.
 */
export function selectDashboardMetrics(state: FreightState): DashboardMetrics {
  const now = DEMO_NOW_MS

  const activeJobs = state.jobs.filter((j) => ACTIVE_JOB_STATUSES.includes(j.status))
  const openExceptions = state.exceptions.filter((e) => isExceptionOpen(e.status))

  const arrivingToday = state.bookings.filter((b) => isDemoToday(b.eta, now)).length + BACKGROUND_ARRIVING_TODAY
  const cutoffsToday = state.bookings.reduce((sum, b) => {
    const cutoffs = [b.cutoffs.shippingInstruction, b.cutoffs.vgm, b.cutoffs.gateIn, b.cutoffs.documentation]
    return sum + cutoffs.filter((c) => isDemoToday(c, now)).length
  }, 0)

  // Margin across every live job — the branch's current position.
  const estimatedMarginInr = activeJobs.reduce((sum, job) => sum + selectJobCost(state, job.id).marginInr, 0)

  const pendingBillStatuses = ['AWAITED', 'RECEIVED', 'UNDER_REVIEW', 'DISPUTED']
  const pendingVendorBills =
    state.vendorBills.filter((b) => pendingBillStatuses.includes(b.status)).length + BACKGROUND_PENDING_VENDOR_BILLS

  const overdueReceivablesInr = state.invoices
    .filter((i) => i.status === 'OVERDUE' || (i.status !== 'PAID' && new Date(i.dueAt).getTime() < now))
    .reduce((sum, i) => sum + (i.total - i.amountPaid), 0)

  const totalLimit = state.creditFacilities.reduce((s, f) => s + f.limitInr, 0)
  const totalUtilised = state.creditFacilities.reduce((s, f) => s + f.utilisedInr, 0)

  // The demo is a single organisation's account, so "mine" is simply the
  // shipments on it that have not closed.
  const myShipments = state.jobs.filter((j) => j.customerId === 'CUST-APEX' && j.status !== 'CLOSED').length

  return {
    activeJobs: activeJobs.length + BACKGROUND_ACTIVE_JOB_COUNT,
    atRisk: state.jobs.filter((j) => j.riskLevel === 'AT_RISK' && ACTIVE_JOB_STATUSES.includes(j.status)).length,
    arrivingToday,
    cutoffsToday,
    openExceptions: openExceptions.length + BACKGROUND_OPEN_EXCEPTION_COUNT,
    pendingVendorBills,
    estimatedMarginInr,
    openEnquiries: state.enquiries.filter(
      (e) => !['CONVERTED', 'LOST', 'EXPIRED'].includes(e.stage),
    ).length,
    quotesAwaiting: state.quotes.filter((q) => q.status === 'SENT').length,
    overdueReceivablesInr,
    creditUtilisationPct: totalLimit === 0 ? 0 : Math.round((totalUtilised / totalLimit) * 1000) / 10,
    myShipments,
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   EXCEPTION QUEUE
   ══════════════════════════════════════════════════════════════════════════ */

/** Worst first, then soonest deadline. This is triage order, not list order. */
export function sortExceptions(a: Exception, b: Exception): number {
  const openDelta = Number(isExceptionOpen(b.status)) - Number(isExceptionOpen(a.status))
  if (openDelta !== 0) return openDelta

  const sev = compareSeverity(a.severity, b.severity)
  if (sev !== 0) return sev

  const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER
  const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER
  return aDeadline - bDeadline
}

export interface ExceptionFilters {
  severities?: Severity[]
  ownerId?: string
  jobId?: string
  openOnly?: boolean
  search?: string
}

export function selectExceptionQueue(state: FreightState, filters: ExceptionFilters = {}): Exception[] {
  const { severities, ownerId, jobId, openOnly = true, search } = filters
  const q = search?.trim().toLowerCase()

  return state.exceptions
    .filter((e) => {
      if (openOnly && !isExceptionOpen(e.status)) return false
      if (severities?.length && !severities.includes(e.severity)) return false
      if (ownerId && e.ownerId !== ownerId) return false
      if (jobId && e.jobId !== jobId) return false
      if (q) {
        const haystack = `${e.id} ${e.title} ${e.jobId} ${e.businessImpact} ${e.recommendedAction}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
    .sort(sortExceptions)
}

/* ══════════════════════════════════════════════════════════════════════════
   CUTOFF RAIL
   ══════════════════════════════════════════════════════════════════════════ */

export interface CutoffEntry {
  jobId: string
  bookingId: string
  label: string
  kind: 'shippingInstruction' | 'vgm' | 'gateIn' | 'documentation'
  at: string
  carrierName: string
  vessel?: string
  countdown: ReturnType<typeof countdown>
}

const CUTOFF_LABELS: Record<CutoffEntry['kind'], string> = {
  shippingInstruction: 'Shipping instruction',
  vgm: 'VGM',
  gateIn: 'Gate-in',
  documentation: 'Documentation',
}

/** Every live cutoff across the book, soonest first. Past cutoffs drop out. */
export function selectCutoffRail(state: FreightState, now: number = DEMO_NOW_MS, horizonHours = 72): CutoffEntry[] {
  const entries: CutoffEntry[] = []

  for (const booking of state.bookings) {
    const job = state.jobs.find((j) => j.id === booking.jobId)
    if (!job || job.status === 'CLOSED' || job.status === 'DELIVERED') continue

    for (const kind of ['shippingInstruction', 'vgm', 'gateIn', 'documentation'] as const) {
      const at = booking.cutoffs[kind]
      const cd = countdown(at, now)
      // Keep overdue-but-recent so a missed cutoff stays visible, not hidden.
      if (cd.totalMs > horizonHours * 3600_000) continue
      if (cd.totalMs < -12 * 3600_000) continue

      entries.push({
        jobId: job.id,
        bookingId: booking.id,
        label: CUTOFF_LABELS[kind],
        kind,
        at,
        carrierName: booking.carrierName,
        vessel: booking.vessel,
        countdown: cd,
      })
    }
  }

  return entries.sort((a, b) => a.countdown.totalMs - b.countdown.totalMs)
}

/* ══════════════════════════════════════════════════════════════════════════
   BOARDS & LISTS
   ══════════════════════════════════════════════════════════════════════════ */

export function selectJobsByStatus(state: FreightState): Record<string, Job[]> {
  const grouped: Record<string, Job[]> = {}
  for (const job of state.jobs) {
    ;(grouped[job.status] ??= []).push(job)
  }
  return grouped
}

export function selectEnquiriesByStage(state: FreightState) {
  const grouped: Record<string, typeof state.enquiries> = {}
  for (const enquiry of state.enquiries) {
    ;(grouped[enquiry.stage] ??= []).push(enquiry)
  }
  return grouped
}

/** ETA deviation in hours, per live job. Positive = later than originally quoted. */
export function selectEtaDeviation(state: FreightState): Array<{ jobId: string; hours: number; label: string }> {
  return state.bookings
    .filter((b) => {
      const job = state.jobs.find((j) => j.id === b.jobId)
      return job && ACTIVE_JOB_STATUSES.includes(job.status)
    })
    .map((b) => ({
      jobId: b.jobId,
      hours: Math.round((new Date(b.eta).getTime() - new Date(b.originalEta).getTime()) / 3600_000),
      label: b.jobId.slice(-6),
    }))
    .sort((a, b) => b.hours - a.hours)
}

/** Jobs the customer role is allowed to see. */
export function selectCustomerJobs(state: FreightState, customerId: string): Job[] {
  return state.jobs.filter((j) => j.customerId === customerId && j.customerVisible)
}

/* ══════════════════════════════════════════════════════════════════════════
   CLOSURE — derived, never a button
   ══════════════════════════════════════════════════════════════════════════ */

export interface ClosureCheck {
  label: string
  done: boolean
  detail: string
}

/**
 * A job closes when the work is actually finished, not when someone clicks
 * "close". Each check reads from the job file, so the checklist cannot claim
 * a job is ready while an exception is still open.
 */
export function selectClosureChecklist(state: FreightState, jobId: string): ClosureCheck[] {
  const file = selectJobFile(state, jobId)
  if (!file) return []

  const podDoc = file.documents.find((d) => d.type === 'PROOF_OF_DELIVERY')
  const unmatchedBills = file.vendorBills.filter(
    (b) => !['MATCHED', 'APPROVED', 'PAID'].includes(b.status),
  )
  const unacceptedDocs = file.documents.filter(
    (d) => !['ACCEPTED', 'ARCHIVED', 'SUPERSEDED', 'CANCELLED'].includes(d.status),
  )

  return [
    {
      label: 'Cargo delivered',
      done: ['DELIVERED', 'CLOSED'].includes(file.job.status),
      detail: `Job status is ${file.job.status.replace(/_/g, ' ').toLowerCase()}`,
    },
    {
      label: 'Proof of delivery received',
      done: podDoc?.status === 'ACCEPTED' || podDoc?.status === 'ARCHIVED',
      detail: podDoc ? `POD is ${podDoc.status.toLowerCase()}` : 'No proof of delivery on file',
    },
    {
      label: 'All exceptions resolved',
      done: file.openExceptions.length === 0,
      detail:
        file.openExceptions.length === 0
          ? 'No open exceptions'
          : `${file.openExceptions.length} still open`,
    },
    {
      label: 'Vendor bills matched',
      done: file.vendorBills.length > 0 && unmatchedBills.length === 0,
      detail:
        file.vendorBills.length === 0
          ? 'No vendor bills recorded'
          : unmatchedBills.length === 0
            ? `All ${file.vendorBills.length} bills matched`
            : `${unmatchedBills.length} of ${file.vendorBills.length} outstanding`,
    },
    {
      label: 'Customer invoice raised',
      done: Boolean(file.invoice),
      detail: file.invoice ? `${file.invoice.invoiceNumber} · ${file.invoice.status.toLowerCase()}` : 'Not yet raised',
    },
    {
      label: 'Invoice settled',
      done: file.invoice?.status === 'PAID',
      detail: file.invoice
        ? file.invoice.status === 'PAID'
          ? 'Paid in full'
          : `${Math.round((file.invoice.amountPaid / file.invoice.total) * 100)}% received`
        : 'No invoice',
    },
    {
      label: 'Documents finalised',
      done: unacceptedDocs.length === 0,
      detail:
        unacceptedDocs.length === 0
          ? 'Every document accepted or archived'
          : `${unacceptedDocs.length} still in draft or in flight`,
    },
    {
      label: 'Margin finalised',
      done: file.costSummary.basis === 'FINAL',
      detail: `Margin basis is ${file.costSummary.basis.toLowerCase()}`,
    },
  ]
}

/* ══════════════════════════════════════════════════════════════════════════
   SEARCH — powers the command palette
   ══════════════════════════════════════════════════════════════════════════ */

export interface SearchHit {
  id: string
  kind: 'Shipment' | 'Enquiry' | 'Exception' | 'Quote' | 'Document' | 'Container'
  title: string
  subtitle: string
  href: string
}

export function selectSearch(state: FreightState, query: string, limit = 12): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []

  const hits: SearchHit[] = []

  for (const job of state.jobs) {
    const customer = getParty(job.customerId)
    if (`${job.id} ${job.reference} ${customer?.name ?? ''}`.toLowerCase().includes(q)) {
      hits.push({
        id: job.id,
        kind: 'Shipment',
        title: job.id,
        subtitle: `${customer?.name ?? '—'} · ${job.status.replace(/_/g, ' ').toLowerCase()}`,
        href: ROUTES.booking(job.id),
      })
    }
  }

  for (const enquiry of state.enquiries) {
    if (enquiry.id.toLowerCase().includes(q)) {
      hits.push({
        id: enquiry.id,
        kind: 'Enquiry',
        title: enquiry.id,
        subtitle: enquiry.stage.replace(/_/g, ' ').toLowerCase(),
        href: ROUTES.rfq(enquiry.id),
      })
    }
  }

  for (const exc of state.exceptions) {
    if (`${exc.id} ${exc.title}`.toLowerCase().includes(q)) {
      hits.push({
        id: exc.id,
        kind: 'Exception',
        title: exc.title,
        subtitle: `${exc.id} · ${exc.severity.toLowerCase()}`,
        href: ROUTES.booking(exc.jobId),
      })
    }
  }

  for (const container of state.containers) {
    if (container.number.toLowerCase().includes(q)) {
      hits.push({
        id: container.number,
        kind: 'Container',
        title: container.number,
        subtitle: `${container.isoType} · ${container.jobId}`,
        href: ROUTES.bookingTab(container.jobId, 'cargo'),
      })
    }
  }

  for (const doc of state.documents) {
    if (`${doc.id} ${doc.title}`.toLowerCase().includes(q)) {
      hits.push({
        id: doc.id,
        kind: 'Document',
        title: doc.title,
        subtitle: `${doc.id} · ${doc.status.toLowerCase()}`,
        href: ROUTES.bookingTab(doc.jobId, 'documents'),
      })
    }
  }

  return hits.slice(0, limit)
}
