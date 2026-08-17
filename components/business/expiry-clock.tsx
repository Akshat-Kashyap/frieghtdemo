'use client'

import { ageInDays, daysUntil, isPast } from '@/lib/demo-clock'
import { count, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * The clock on a dated licence, policy or registration.
 *
 * Shared between the attention panel and the document table so a lapsed BIS
 * licence cannot read "expired" in one place and "12 days ago" in the other.
 *
 * The band comes from the date, not from the record's own status field. A
 * status is authored once and then the demo clock keeps moving; the date is
 * the only part of the pair that stays true, and a document marked EXPIRING
 * that is in fact three days past its date should not be rendering amber.
 *
 * MATERIAL: this used to be a `StatusBadge` — a raised chip with a coloured
 * fill — which said "state" when what it actually carries is a MEASUREMENT.
 * It is a reading now: a stencilled name for what is being measured, the
 * figure in mono, and the whole thing sunk into a milled channel. A number in
 * a recess reads as taken off the instrument; the same number on a coloured
 * chip reads as a label somebody attached. The colour is kept for the two
 * bands that are genuinely a state — lapsed, and close enough to matter.
 */

const CLOCK_TONE = {
  critical: 'text-critical',
  amber: 'text-amber',
  neutral: 'text-text-muted',
} as const

export function ExpiryClock({ expiresAt, className }: { expiresAt: string; className?: string }) {
  const lapsed = isPast(expiresAt)
  // Renewing a marine policy or a product licence takes weeks, not days, so
  // six weeks out is the point at which it stops being background and starts
  // being something the desk has to book time for.
  const days = lapsed ? ageInDays(expiresAt) : daysUntil(expiresAt)
  const tone = lapsed ? 'critical' : days <= 45 ? 'amber' : 'neutral'

  return (
    <span
      className={cn('pw-rail inline-flex items-baseline gap-1.5 whitespace-nowrap rounded-chip px-2 py-1', className)}
      title={`${lapsed ? 'Expired' : 'Expires'} ${formatDate(expiresAt)}`}
    >
      <span className="pw-stencil">{lapsed ? 'Lapsed' : 'Left'}</span>
      <span className={cn('pw-readout text-data font-medium leading-none', CLOCK_TONE[tone])}>{count(days)}</span>
      <span className="font-mono text-micro leading-none text-text-faint">{days === 1 ? 'day' : 'days'}</span>
    </span>
  )
}
