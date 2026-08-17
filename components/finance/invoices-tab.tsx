'use client'

import Link from 'next/link'
import { ChevronRight, Receipt } from 'lucide-react'
import { useMemo, useState } from 'react'

import { DEMO } from '@/data/copy'
import {
  accountPosition,
  invoiceBalance,
  invoicesForAccount,
  isInvoiceOverdue,
} from '@/data/customer-finance'
import { ageInDays } from '@/lib/demo-clock'
import { formatDate, money } from '@/lib/format'
import { INVOICE_STATUS_LABEL } from '@/lib/lifecycle'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { useInvoices, usePayments } from '@/store/hooks'
import type { CustomerInvoice, InvoiceStatus, PaymentRecord } from '@/types'

import { Button, DataRow, EmptyState, Panel, StatusBadge, type Tone } from '@/components/ui/primitives'

import { CardHeading, RecordPanel, TabIntro } from './pieces'

/**
 * Every invoice raised against this company, and what has been paid on it.
 *
 * The balance column is the one people read, so it is derived rather than
 * stored — `total − paid`, every time. An invoice record that carries its own
 * "balance" field is an invoice record that will eventually disagree with the
 * payments listed underneath it.
 *
 * Payments are collapsed by default and expand in place. They belong to the
 * invoice, not beside it: "which of the three transfers cleared this one" is
 * a question about a specific row, and a separate payments table makes the
 * reader do the joining.
 */

const INVOICE_STATUS_TONE: Record<InvoiceStatus, Tone> = {
  DRAFT: 'neutral',
  ISSUED: 'route',
  SENT: 'route',
  PART_PAID: 'amber',
  PAID: 'signal',
  OVERDUE: 'critical',
  CANCELLED: 'muted',
  CREDITED: 'muted',
}

export function InvoicesTab() {
  const allInvoices = useInvoices()
  const payments = usePayments()

  const invoices = useMemo(() => invoicesForAccount(allInvoices), [allInvoices])
  const position = useMemo(() => accountPosition(invoices), [invoices])

  const paymentsByInvoice = useMemo(() => {
    const map = new Map<string, PaymentRecord[]>()
    for (const payment of payments) {
      const list = map.get(payment.invoiceId)
      if (list) list.push(payment)
      else map.set(payment.invoiceId, [payment])
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
    }
    return map
  }, [payments])

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (invoices.length === 0) {
    return (
      <Panel className="p-8">
        <EmptyState
          icon={<Receipt className="h-6 w-6" />}
          title="No invoices on this account yet"
          description="An invoice is raised once a shipment has been delivered and the partner bills behind it have been reconciled."
          action={
            <Button asChild variant="secondary" size="md">
              <Link href={ROUTES.bookings}>Go to your shipments</Link>
            </Button>
          }
        />
      </Panel>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <TabIntro>
        One invoice per shipment, raised after delivery and reconciliation rather than charge by charge. Select a row
        to see the payments recorded against it.
      </TabIntro>

      <RecordPanel
        icon={<Receipt className="h-4 w-4 shrink-0 text-signal" aria-hidden />}
        title={`${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`}
        meta={`${position.openCount} open · ${position.overdueCount} overdue · unsettled listed first`}
        footnote={
          <>
            The balance column is <span className="font-medium text-text">total less paid</span> on each row, and the
            figure in the totals line is the same number the Overview reports as outstanding. {DEMO.financialNotice}
          </>
        }
      >
        <div className="pw-table-wrap border-0">
          <table className="pw-table">
            <caption className="sr-only">
              Invoices raised against this account, with payments recorded against each one
            </caption>
            <thead>
              <tr>
                <th scope="col">Invoice</th>
                <th scope="col">Shipment</th>
                <th scope="col">Issued</th>
                <th scope="col">Due</th>
                <th scope="col" className="text-right">
                  Total
                </th>
                <th scope="col" className="text-right">
                  Paid
                </th>
                <th scope="col" className="text-right">
                  Balance
                </th>
                <th scope="col">Status</th>
              </tr>
            </thead>

            <tbody>
              {invoices.map((invoice) => {
                const isOpen = expanded.has(invoice.id)
                const balance = invoiceBalance(invoice)
                const overdue = isInvoiceOverdue(invoice)
                const rows = paymentsByInvoice.get(invoice.id) ?? []

                return (
                  <InvoiceRow
                    key={invoice.id}
                    invoice={invoice}
                    balance={balance}
                    overdue={overdue}
                    payments={rows}
                    open={isOpen}
                    onToggle={() => toggle(invoice.id)}
                  />
                )
              })}
            </tbody>

            {/* The totals line is a machined footer, not another data row:
                the joint above it is cut (dark line, lit pixel under it) and
                the strip is filled, so the eye reads it as the bottom of the
                instrument rather than as a fifteenth invoice. */}
            <tfoot className="[&_td]:border-b-0 [&_td]:bg-raised-2/70 [&_td]:shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.8)]">
              <tr>
                <td colSpan={4} className="text-right font-medium text-text">
                  Totals across {invoices.length} invoice{invoices.length === 1 ? '' : 's'}
                </td>
                <td className="pw-readout text-right font-medium text-text">{money(position.invoicedInr)}</td>
                <td className="pw-readout text-right text-text-muted">{money(position.paidInr)}</td>
                <td
                  className={cn(
                    'pw-readout text-right text-[15px] font-semibold',
                    position.outstandingInr > 0 ? 'text-amber' : 'text-signal',
                  )}
                >
                  {money(position.outstandingInr)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </RecordPanel>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   ONE INVOICE, AND THE PAYMENTS UNDER IT
   ══════════════════════════════════════════════════════════════════════════ */

function InvoiceRow({
  invoice,
  balance,
  overdue,
  payments,
  open,
  onToggle,
}: {
  invoice: CustomerInvoice
  balance: number
  overdue: boolean
  payments: PaymentRecord[]
  open: boolean
  onToggle: () => void
}) {
  const detailId = `invoice-detail-${invoice.id}`
  const overdueBy = overdue ? ageInDays(invoice.dueAt) : 0

  return (
    <>
      <tr className={cn(open && 'bg-raised-2/50')}>
        <td>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={detailId}
            className="group flex min-h-[32px] items-center gap-1.5 rounded-chip text-left active:translate-y-px"
          >
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5 shrink-0 text-text-faint transition-transform group-hover:text-signal',
                open && 'rotate-90 text-signal',
              )}
              aria-hidden
            />
            <span className="pw-id font-medium text-text">{invoice.invoiceNumber}</span>
          </button>
        </td>

        <td>
          <Link href={ROUTES.booking(invoice.jobId)} className="pw-id text-route hover:underline">
            {invoice.jobId}
          </Link>
        </td>

        <td className="pw-readout whitespace-nowrap text-text-muted">
          {invoice.issuedAt ? formatDate(invoice.issuedAt) : '—'}
        </td>

        <td className={cn('pw-readout whitespace-nowrap', overdue ? 'font-medium text-critical' : 'text-text-muted')}>
          {formatDate(invoice.dueAt)}
          {overdue && (
            <span className="ml-1.5 text-[10px] font-normal uppercase tracking-[0.06em]">
              {overdueBy}d late
            </span>
          )}
        </td>

        <td className="pw-readout text-right font-medium text-text">{money(invoice.total, invoice.currency)}</td>
        <td className="pw-readout text-right text-text-muted">{money(invoice.amountPaid, invoice.currency)}</td>
        <td
          className={cn(
            'pw-readout text-right font-semibold',
            balance === 0 ? 'text-signal' : overdue ? 'text-critical' : 'text-amber',
          )}
        >
          {money(balance, invoice.currency)}
        </td>

        <td>
          <StatusBadge tone={INVOICE_STATUS_TONE[invoice.status]}>
            {INVOICE_STATUS_LABEL[invoice.status] ?? invoice.status}
          </StatusBadge>
        </td>
      </tr>

      {open && (
        // The expanded region is a RECESS in the table, not a second plate
        // stacked on it: the row opened into the surface, so the light runs
        // backwards — shade at the top lip, catch on the far lip below.
        // (The recess is painted on the cell, not the row: a `box-shadow` on a
        // `<tr>` is not reliably rendered under `border-collapse: separate`.)
        <tr id={detailId} className="bg-raised-2/40">
          <td colSpan={8} className="pw-recess px-4 py-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
              {/* ── How the invoice is made up ─────────────────────── */}
              {/* `DataRow` from the primitives. This was a private `Line` —
                  the fourth private label/value row in this module — and the
                  dotted leader it lacked is what keeps the eye on the right
                  pairing when four of them are stacked. */}
              <dl className="pw-card flex flex-col px-4 py-2.5">
                <DataRow label="Subtotal" value={money(invoice.subtotal, invoice.currency)} mono />
                <DataRow label="Tax" value={money(invoice.taxAmount, invoice.currency)} mono />
                <DataRow
                  label="Total"
                  value={<span className="font-semibold">{money(invoice.total, invoice.currency)}</span>}
                  mono
                />
                <DataRow
                  label="Balance"
                  value={
                    <span className={cn('font-semibold', balance === 0 ? 'text-signal' : 'text-amber')}>
                      {money(balance, invoice.currency)}
                    </span>
                  }
                  mono
                />
              </dl>

              {/* ── What has been received ─────────────────────────── */}
              <div className="pw-card px-4 py-3">
                <CardHeading>Payments recorded</CardHeading>

                {payments.length === 0 ? (
                  <p className="mt-2 text-[12px] leading-relaxed text-text-muted">
                    Nothing has been received against this invoice yet. It falls due{' '}
                    {formatDate(invoice.dueAt)}.
                  </p>
                ) : (
                  <ul className="mt-2 divide-y divide-hairline">
                    {payments.map((payment) => (
                      <li
                        key={payment.id}
                        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0"
                      >
                        <span className="min-w-0">
                          <span className="block text-data text-text">
                            {payment.method} · <span className="pw-id">{payment.reference}</span>
                          </span>
                          <span className="block text-micro text-text-faint">
                            Received {formatDate(payment.receivedAt)}
                          </span>
                        </span>
                        <span className="pw-readout shrink-0 text-data font-medium text-signal">
                          {money(payment.amount, payment.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {balance > 0 && payments.length > 0 && (
                  <p className="mt-2.5 border-t border-hairline pt-2 text-micro leading-relaxed text-text-muted shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.7)]">
                    Part-paid. {money(balance, invoice.currency)} remains against this invoice.
                  </p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
