'use client'

import Link from 'next/link'
import { Download, Receipt } from 'lucide-react'

import { DEMO } from '@/data/copy'
import { computeTotals } from '@/data/quotes'
import { CHARGE_FAMILY_LABEL, INVOICE_STATUS_LABEL } from '@/lib/lifecycle'
import { formatDate, money } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import type { JobFile } from '@/types'

import { Button, DemoNotice, EmptyState, Panel, StatusBadge } from '@/components/ui/primitives'
import { FigureRail, RecordPanel } from '@/components/finance/pieces'

/**
 * The customer's side of the money on one shipment.
 *
 * Shows the charge lines that were accepted and what has been invoiced
 * against them — sell only. Buy rates, partner cost and margin exist on
 * these records and are deliberately not read here.
 *
 * Exposure-only lines (detention, storage) are listed separately and
 * excluded from the total, because they are a risk the customer carries
 * rather than a charge that has been raised.
 *
 * The panels, the readings and the basis strips are the shared account-module
 * kit rather than private copies. Four modules had each rebuilt this shape
 * with a different header joint and a different figure size, which is exactly
 * how a product stops looking like one product.
 */
export function InvoiceTab({ file }: { file: JobFile }) {
  const quote = file.acceptedQuote ?? file.quotes[0]
  const invoice = file.invoice

  if (!quote) {
    return (
      <Panel className="p-8">
        <EmptyState
          icon={<Receipt className="h-6 w-6" />}
          title="Nothing to invoice yet"
          description="Charges appear here once a quote has been accepted on this shipment."
        />
      </Panel>
    )
  }

  const billable = quote.lines.filter((l) => l.applicability !== 'EXPOSURE_ONLY')
  const exposure = quote.lines.filter((l) => l.applicability === 'EXPOSURE_ONLY')
  const totals = computeTotals(quote.lines)
  const outstanding = invoice ? invoice.total - invoice.amountPaid : 0

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {/* ── The invoice, if raised ─────────────────────────────────── */}
      {invoice ? (
        <RecordPanel
          icon={<Receipt className="h-4 w-4 shrink-0 text-signal" aria-hidden />}
          title={`Invoice ${invoice.invoiceNumber}`}
          meta={`Issued ${invoice.issuedAt ? formatDate(invoice.issuedAt) : '—'} · due ${formatDate(invoice.dueAt)}`}
          emphasis={outstanding > 0 ? 'amber' : undefined}
          action={
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <StatusBadge
                tone={invoice.status === 'PAID' ? 'signal' : invoice.status === 'OVERDUE' ? 'critical' : 'route'}
              >
                {INVOICE_STATUS_LABEL[invoice.status] ?? invoice.status}
              </StatusBadge>
              <Button variant="secondary" size="sm" asChild>
                <Link href={ROUTES.financeTab('invoices')}>
                  <Download className="h-3 w-3" aria-hidden />
                  All invoices
                </Link>
              </Button>
            </div>
          }
          footnote={
            outstanding > 0
              ? `${money(outstanding, invoice.currency)} is still owed on this shipment, due ${formatDate(invoice.dueAt)}. ${DEMO.financialNotice}`
              : `Settled in full. ${DEMO.financialNotice}`
          }
        >
          <FigureRail
            columns={4}
            figures={[
              { label: 'Subtotal', value: money(invoice.subtotal, invoice.currency), sub: 'Before tax' },
              { label: 'Tax', value: money(invoice.taxAmount, invoice.currency), sub: 'As invoiced' },
              {
                label: 'Total',
                value: money(invoice.total, invoice.currency),
                strong: true,
                sub: 'What was billed',
              },
              {
                label: 'Outstanding',
                value: money(outstanding, invoice.currency),
                tone: outstanding > 0 ? 'amber' : 'signal',
                sub: outstanding > 0 ? 'Total less paid' : 'Nothing owed',
              },
            ]}
          />
        </RecordPanel>
      ) : (
        <Panel className="px-5 py-4">
          <p className="text-data leading-relaxed text-text-muted">
            No invoice has been raised on this shipment yet. The charges below are what was accepted on the quote —
            an invoice is raised against them once the carriage is done.
          </p>
        </Panel>
      )}

      {/* ── Accepted charges ───────────────────────────────────────── */}
      <RecordPanel
        title="Accepted charges"
        meta={`Quote ${quote.id} · valid to ${formatDate(quote.validUntil)}`}
        footnote={
          <>
            Every line here was on the quotation this shipment was accepted against. A charge that is not on it does
            not appear on the invoice. {DEMO.financialNotice}
          </>
        }
      >
        {/* Wide content scrolls inside its own box; `min-w-0` is what lets it,
            since a flex child will not otherwise shrink below its content. */}
        <div className="pw-table-wrap min-w-0 rounded-none border-0">
          <table className="pw-table">
            <caption className="sr-only">Charge lines accepted on this shipment</caption>
            <thead>
              <tr>
                <th scope="col">Charge</th>
                <th scope="col">Basis</th>
                <th scope="col" className="text-right">
                  Qty
                </th>
                <th scope="col" className="text-right">
                  Rate
                </th>
                <th scope="col" className="text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {billable.map((line) => (
                <tr key={line.id}>
                  <td>
                    <span className="block font-medium text-text">{line.description}</span>
                    <span className="pw-stencil mt-0.5 block">{CHARGE_FAMILY_LABEL[line.family]}</span>
                  </td>
                  <td className="text-text-muted">{line.basis.replace(/_/g, ' ').toLowerCase()}</td>
                  <td className="pw-readout text-right text-text-muted">{line.quantity}</td>
                  <td className="pw-readout text-right text-text-muted">{money(line.sellRate, line.currency)}</td>
                  <td className="pw-readout text-right font-medium">
                    {money(line.sellRate * line.quantity, line.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="text-right font-medium text-text">
                  Total ({quote.currency})
                </td>
                <td className="pw-readout text-right text-[15px] font-semibold">
                  {money(totals.sell, quote.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </RecordPanel>

      {/* ── Exposure ───────────────────────────────────────────────── */}
      {exposure.length > 0 && (
        <RecordPanel
          title="Charges you could still incur"
          meta={`${exposure.length} line${exposure.length === 1 ? '' : 's'} · not in the total`}
          footnote="These only apply if the shipment runs past its free time or needs handling beyond the agreed scope. They are shown so the exposure is known before it lands, not after."
        >
          <ul className="divide-y divide-hairline/60">
            {exposure.map((line) => (
              <li key={line.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3">
                <span className="min-w-0">
                  <span className="block text-data text-text">{line.description}</span>
                  <span className="block text-micro text-text-faint">
                    {line.basis.replace(/_/g, ' ').toLowerCase()}
                    {line.notes ? ` · ${line.notes}` : ''}
                  </span>
                </span>
                <span className="pw-readout shrink-0 text-data text-amber">
                  {money(line.sellRate, line.currency)}
                </span>
              </li>
            ))}
          </ul>
        </RecordPanel>
      )}

      <DemoNotice>
        {DEMO.financialNotice} Production tax treatment and invoice formats require accounting and legal validation.
      </DemoNotice>
    </div>
  )
}
