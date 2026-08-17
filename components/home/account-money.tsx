'use client'

import { AlertTriangle, Landmark, Lock, Receipt } from 'lucide-react'
import { useMemo } from 'react'

import { DEMO } from '@/data/copy'
import {
  UTILISATION_BAND_NOTE,
  accountPosition,
  creditUtilisationPct,
  facilityForAccount,
  invoiceBalance,
  invoicesForAccount,
  utilisationBand,
} from '@/data/customer-finance'
import { formatDate, money, percent } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { useHydrated } from '@/hooks/use-hydrated'
import { useCreditFacilities, useInvoices } from '@/store/hooks'
import { useCan } from '@/store/org-store'

import { Card, Panel, Skeleton } from '@/components/ui/primitives'
import { Figure } from '@/components/finance/pieces'

import { ModuleLink } from './pieces'

/**
 * THE MONEY, IF THE MONEY IS YOURS
 * ══════════════════════════════════════════════════════════════════════════
 * Three figures — what is outstanding, how much of it is late, and what is
 * left to book against — behind the `finance` capability.
 *
 * The gate is the point of the section, not an obstacle in front of it. Two
 * of the four people on this account cannot see a credit limit or an invoice
 * balance, and a home screen that shows the numbers to everyone teaches the
 * viewer that the roles in this demo are decoration. So a role without the
 * capability gets the shape of the section, the reason it is closed and the
 * name of somebody who can open it — never a blank space, and never the
 * figures behind a blur.
 *
 * The tiles reuse the Finance module's own `Figure`, so a number here and the
 * same number on the Finance overview are rendered by the same component and
 * cannot drift apart typographically.
 */

/** Height of this block in both of its states, and of its placeholder. */
const BLOCK_H = 'h-[228px]'
const BLOCK_MIN_H = 'min-h-[228px]'

export function AccountMoney() {
  const hydrated = useHydrated()
  const finance = useCan('finance')

  const allInvoices = useInvoices()
  const facilities = useCreditFacilities()

  const invoices = useMemo(() => invoicesForAccount(allInvoices), [allInvoices])
  const position = useMemo(() => accountPosition(invoices), [invoices])
  const facility = useMemo(() => facilityForAccount(facilities), [facilities])

  /* Both the capability and the invoices come from persisted state, so the
     whole block waits rather than rendering the figures for one frame and
     then locking them — which would be a genuine disclosure, not a flicker.

     One constant for the placeholder and the locked panel, sized to the
     figures panel, so neither arrival moves the sections underneath. The
     figures panel is content-height and can run a few pixels over when a
     sub-line wraps at a narrow width; pinning the two states that CAN be
     pinned is what removes the visible jump. */
  if (!hydrated) return <Skeleton className={BLOCK_H} />

  if (!finance.allowed) {
    return (
      <Panel className={cn('flex flex-col justify-center gap-2 px-5 py-5', BLOCK_MIN_H)}>
        <p className="flex items-center gap-2 text-data font-semibold text-text">
          {/* The lock sits in a milled recess rather than floating on the
              plate: a closed capability is still an instrument reading, it is
              just reading "closed". */}
          <span className="pw-rail flex h-7 w-7 shrink-0 items-center justify-center rounded-chip text-amber">
            <Lock className="h-3.5 w-3.5" aria-hidden />
          </span>
          The money on this account is not yours to see
        </p>
        <p className="max-w-2xl text-data leading-relaxed text-text-muted">
          {finance.reason} Invoices, the credit facility and export advances all sit with the finance role. Switch
          person in the top bar to open them — nothing else on this page changes.
        </p>
      </Panel>
    )
  }

  const utilisation = facility ? creditUtilisationPct(facility) : 0
  const band = utilisationBand(utilisation)

  return (
    <Panel className="overflow-hidden">
      {/* Each figure is a SHEET on the plate, not a column of a grid.
          `.pw-card` is `--elev-0` — the milled edge and no cast — so the three
          read as regions machined into the panel rather than three more cards
          stacked on top of it. It also holds up at 360px, where a grid divided
          by vertical grooves would be drawing walls between things that are
          stacked one above the other.

          `<div>` inside `<dl>` is deliberate and valid: it groups a dt/dd pair,
          which is exactly what each of these is. */}
      <dl className="grid gap-3 px-5 py-4 sm:grid-cols-3">
        <div className="pw-card min-w-0 px-4 py-3">
          <Figure
            label="Outstanding"
            value={money(position.outstandingInr)}
            strong
            sub={
              <span className="flex items-center gap-1.5">
                <Receipt className="h-3 w-3 shrink-0" aria-hidden />
                {position.openCount} invoice{position.openCount === 1 ? '' : 's'} still to settle
              </span>
            }
          />
        </div>

        <div className="pw-card min-w-0 px-4 py-3">
          <Figure
            label="Of which overdue"
            value={money(position.overdueInr)}
            strong
            /* Critical only when there is genuinely something late. A red zero
               is an alarm about nothing. */
            tone={position.overdueInr > 0 ? 'critical' : 'signal'}
            sub={
              position.overdueCount > 0 ? (
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                  {position.mostOverdue
                    ? `${position.mostOverdue.invoiceNumber} was due ${formatDate(position.mostOverdue.dueAt)}`
                    : `${position.overdueCount} past the due date`}
                </span>
              ) : (
                'Nothing past its due date'
              )
            }
          />
        </div>

        <div className="pw-card min-w-0 px-4 py-3">
          <Figure
            label="Credit available"
            value={facility ? money(facility.availableInr) : '—'}
            strong
            tone="signal"
            sub={
              facility ? (
                <span className="flex items-center gap-1.5">
                  <Landmark className="h-3 w-3 shrink-0" aria-hidden />
                  {percent(utilisation, 0)} of {money(facility.limitInr)} drawn · {facility.creditDays}-day terms
                </span>
              ) : (
                'No facility on this account'
              )
            }
          />
        </div>
      </dl>

      {/* What the next thing to leave the bank is, where there is one. The
          overdue balance is deliberately not repeated here — it has its own
          figure above, and counting it twice makes the block argue with
          itself about what is due next. */}
      {position.nextDue && (
        <Card className="mx-5 mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-3">
          <span className="text-data text-text-muted">
            Next payment <span className="font-medium text-text">{money(invoiceBalance(position.nextDue))}</span> on{' '}
            <span className="pw-id">{position.nextDue.invoiceNumber}</span>, due{' '}
            {formatDate(position.nextDue.dueAt)}
          </span>
          <ModuleLink href={ROUTES.financeTab('invoices')}>Open invoices</ModuleLink>
        </Card>
      )}

      <p className="border-t border-hairline bg-raised-2/40 px-5 py-2.5 text-[11px] leading-relaxed text-text-muted">
        {facility ? `${UTILISATION_BAND_NOTE[band]} ` : ''}
        Credit is provided by a financing partner and coordinated by PortWhizz. Every figure here is an{' '}
        {DEMO.valueSuffix}.
      </p>
    </Panel>
  )
}
