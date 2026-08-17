'use client'

import { useMemo } from 'react'

import { useFreightStore, type FreightState } from './freight-store'
import {
  selectClosureChecklist,
  selectCutoffRail,
  selectDashboardMetrics,
  selectEtaDeviation,
  selectExceptionQueue,
  selectJobCost,
  selectJobFile,
  selectJobsByStatus,
  selectSearch,
  type ExceptionFilters,
} from './selectors'

/**
 * DERIVED-STATE HOOKS
 * ══════════════════════════════════════════════════════════════════════════
 * Every selector in `selectors.ts` builds a NEW object or array each call —
 * that is correct for a pure function, and fatal if passed directly to
 * `useFreightStore(...)`.
 *
 * Zustand v5 compares the selector's result with `Object.is`. A freshly
 * built object never equals the previous one, so the component re-renders,
 * which re-runs the selector, which builds another new object… React caps
 * this at "Maximum update depth exceeded" and the screen dies.
 *
 * The fix is to subscribe only to the raw slices — which ARE stable
 * references between mutations, because the store replaces them only when
 * something actually changes — and then derive inside `useMemo`. Every
 * screen goes through these hooks; nothing calls a `select*` function
 * directly from a component.
 */

/** Assembles the minimal state shape the pure selectors expect. */
type Slices = Pick<
  FreightState,
  | 'jobs'
  | 'enquiries'
  | 'quotes'
  | 'bookings'
  | 'containers'
  | 'cargo'
  | 'milestones'
  | 'exceptions'
  | 'documents'
  | 'vendorBills'
  | 'invoices'
  | 'payments'
  | 'creditFacilities'
  | 'activity'
  | 'audit'
>

/**
 * Subscribes to each slice individually.
 *
 * Individually, not as one object: `useFreightStore(s => ({a: s.a, b: s.b}))`
 * would rebuild the wrapper every render and reintroduce exactly the loop
 * this file exists to prevent.
 */
function useSlices(): Slices {
  const jobs = useFreightStore((s) => s.jobs)
  const enquiries = useFreightStore((s) => s.enquiries)
  const quotes = useFreightStore((s) => s.quotes)
  const bookings = useFreightStore((s) => s.bookings)
  const containers = useFreightStore((s) => s.containers)
  const cargo = useFreightStore((s) => s.cargo)
  const milestones = useFreightStore((s) => s.milestones)
  const exceptions = useFreightStore((s) => s.exceptions)
  const documents = useFreightStore((s) => s.documents)
  const vendorBills = useFreightStore((s) => s.vendorBills)
  const invoices = useFreightStore((s) => s.invoices)
  const payments = useFreightStore((s) => s.payments)
  const creditFacilities = useFreightStore((s) => s.creditFacilities)
  const activity = useFreightStore((s) => s.activity)
  const audit = useFreightStore((s) => s.audit)

  return useMemo(
    () => ({
      jobs,
      enquiries,
      quotes,
      bookings,
      containers,
      cargo,
      milestones,
      exceptions,
      documents,
      vendorBills,
      invoices,
      payments,
      creditFacilities,
      activity,
      audit,
    }),
    [
      jobs,
      enquiries,
      quotes,
      bookings,
      containers,
      cargo,
      milestones,
      exceptions,
      documents,
      vendorBills,
      invoices,
      payments,
      creditFacilities,
      activity,
      audit,
    ],
  )
}

const asState = (slices: Slices) => slices as unknown as FreightState

/* ══════════════════════════════════════════════════════════════════════════
   PUBLIC HOOKS
   ══════════════════════════════════════════════════════════════════════════ */

export function useDashboardMetrics() {
  const slices = useSlices()
  return useMemo(() => selectDashboardMetrics(asState(slices)), [slices])
}

export function useJobFile(jobId: string) {
  const slices = useSlices()
  return useMemo(() => selectJobFile(asState(slices), jobId), [slices, jobId])
}

export function useJobCost(jobId: string) {
  const slices = useSlices()
  return useMemo(() => selectJobCost(asState(slices), jobId), [slices, jobId])
}

export function useExceptionQueue(filters: ExceptionFilters = {}) {
  const slices = useSlices()
  // Filters are usually object literals from a render, so key the memo on
  // their contents rather than their identity.
  const key = JSON.stringify(filters)
  return useMemo(() => selectExceptionQueue(asState(slices), filters), [slices, key]) // eslint-disable-line react-hooks/exhaustive-deps
}

export function useCutoffRail(now: number, horizonHours = 72) {
  const slices = useSlices()
  return useMemo(() => selectCutoffRail(asState(slices), now, horizonHours), [slices, now, horizonHours])
}

export function useJobsByStatus() {
  const slices = useSlices()
  return useMemo(() => selectJobsByStatus(asState(slices)), [slices])
}

export function useEtaDeviation() {
  const slices = useSlices()
  return useMemo(() => selectEtaDeviation(asState(slices)), [slices])
}

export function useClosureChecklist(jobId: string) {
  const slices = useSlices()
  return useMemo(() => selectClosureChecklist(asState(slices), jobId), [slices, jobId])
}

export function useSearch(query: string, limit = 12) {
  const slices = useSlices()
  return useMemo(() => selectSearch(asState(slices), query, limit), [slices, query, limit])
}

/**
 * Margin across every open job, strongest first.
 * Used by the dashboard's margin snapshot and the job-costs screen.
 */
export function useMarginRows() {
  const slices = useSlices()
  return useMemo(() => {
    const state = asState(slices)
    return slices.jobs
      .map((job) => ({ job, cost: selectJobCost(state, job.id) }))
      .sort((a, b) => b.cost.marginInr - a.cost.marginInr)
  }, [slices])
}

/** Raw slice accessors — safe to use directly, references are stable. */
export const useJobs = () => useFreightStore((s) => s.jobs)
export const useEnquiries = () => useFreightStore((s) => s.enquiries)
export const useQuotes = () => useFreightStore((s) => s.quotes)
export const useBookings = () => useFreightStore((s) => s.bookings)
export const useContainers = () => useFreightStore((s) => s.containers)
export const useMilestones = () => useFreightStore((s) => s.milestones)
export const useExceptions = () => useFreightStore((s) => s.exceptions)
export const useDocuments = () => useFreightStore((s) => s.documents)
export const useLegalDocuments = () => useFreightStore((s) => s.legalDocuments)
export const useVendorBills = () => useFreightStore((s) => s.vendorBills)
export const useInvoices = () => useFreightStore((s) => s.invoices)
export const usePayments = () => useFreightStore((s) => s.payments)
export const useCreditFacilities = () => useFreightStore((s) => s.creditFacilities)
export const useRateCards = () => useFreightStore((s) => s.rateCards)
export const useRfqs = () => useFreightStore((s) => s.rfqs)
export const useContracts = () => useFreightStore((s) => s.contracts)
export const useActivity = () => useFreightStore((s) => s.activity)
export const useAudit = () => useFreightStore((s) => s.audit)
