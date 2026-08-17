import { DEMO } from '@/data/copy'
import { CREDIT_FACILITIES, CUSTOMER_INVOICES } from '@/data/finance'
import { JOBS } from '@/data/jobs'
import { ageInDays, daysUntil, isPast } from '@/lib/demo-clock'
import { count, formatDate, money, percent } from '@/lib/format'
import { INVOICE_STATUS_LABEL } from '@/lib/lifecycle'
import { ROUTES } from '@/lib/routes'
import type { CustomerInvoice } from '@/types'
import type { ZenoIntent } from '@/lib/zeno'
import type { ZenoBlock } from '@/lib/zeno/types'

/**
 * ZENO — FINANCE
 * ══════════════════════════════════════════════════════════════════════════
 * What the account owes, what is late, and what credit is left.
 *
 * Every figure is summed from the invoice records themselves — outstanding is
 * `total − amountPaid` across the open invoices, never a stored balance.
 * A stored total drifts from the records it summarises, and a balance that
 * disagrees with the invoice list is the one number a finance team will
 * always check.
 *
 * The credit line is a facility PortWhizz records, not one it provides:
 * partners finance, this product tracks the exposure.
 */

const CUSTOMER_ID = 'CUST-APEX'
const FACILITY_ID = 'CF-APEX'

const FINANCE_KEYWORDS =
  /(^|[^a-z0-9])(invoices|invoice|invoicing|outstanding|overdue|balance|owe|owed|owing|receivable|receivables|payment|payments|paid|unpaid|due|credit|credit limit|statement|account)([^a-z0-9]|$)/

export const financeIntent: ZenoIntent = {
  id: 'finance',
  matches: (q) => FINANCE_KEYWORDS.test(q),

  answer: () => {
    const invoices = CUSTOMER_INVOICES.filter((i) => i.customerId === CUSTOMER_ID)
    if (invoices.length === 0) return null

    const open = invoices.filter((i) => balanceOf(i) > 0).sort((a, b) => dueMs(a) - dueMs(b))
    const outstanding = open.reduce((sum, i) => sum + balanceOf(i), 0)
    const overdueInvoices = open.filter((i) => isPast(i.dueAt))
    const overdue = overdueInvoices.reduce((sum, i) => sum + balanceOf(i), 0)
    const nextDue = open.find((i) => !isPast(i.dueAt))
    const facility = CREDIT_FACILITIES.find((f) => f.id === FACILITY_ID)

    const blocks: ZenoBlock[] = [
      {
        kind: 'list',
        items: [
          { label: 'Outstanding', value: money(outstanding, 'INR'), hint: `${count(open.length)} open` },
          {
            label: 'Overdue',
            value: money(overdue, 'INR'),
            hint: overdueInvoices.length > 0 ? `${count(overdueInvoices.length)} invoice` : 'nothing past due',
          },
          ...(nextDue
            ? [
                {
                  label: 'Next due',
                  value: `${nextDue.invoiceNumber} · ${money(balanceOf(nextDue), 'INR')}`,
                  hint: `${formatDate(nextDue.dueAt)} · in ${daysUntil(nextDue.dueAt)} days`,
                },
              ]
            : []),
        ],
      },
    ]

    if (open.length > 0) {
      blocks.push({
        kind: 'table',
        columns: ['Invoice', 'Due', 'Status', 'Outstanding'],
        numericColumns: [3],
        rows: open.map((invoice) => [
          invoice.invoiceNumber,
          formatDate(invoice.dueAt),
          INVOICE_STATUS_LABEL[invoice.status] ?? invoice.status,
          money(balanceOf(invoice), 'INR'),
        ]),
      })
    }

    if (facility) {
      const used = facility.limitInr === 0 ? 0 : (facility.utilisedInr / facility.limitInr) * 100
      blocks.push({
        kind: 'list',
        items: [
          { label: 'Credit available', value: money(facility.availableInr, 'INR'), hint: `of ${money(facility.limitInr, 'INR')}` },
          { label: 'Utilised', value: percent(used, 0) },
          { label: 'Terms', value: `${facility.creditDays} days` },
          { label: 'Facility review', value: formatDate(facility.reviewDue) },
        ],
      })
    }

    if (overdueInvoices.length > 0) {
      const oldest = overdueInvoices[0]
      blocks.push({
        kind: 'note',
        tone: 'amber',
        text: `${oldest.invoiceNumber} is ${count(ageInDays(oldest.dueAt))} days past its due date with ${money(
          balanceOf(oldest),
          'INR',
        )} outstanding. Utilised credit counts against the facility limit until it settles, so an overdue balance narrows what is available for new bookings.`,
      })
    }

    blocks.push({ kind: 'note', tone: 'neutral', text: DEMO.financialNotice })

    return {
      intent: 'finance',
      headline:
        overdue > 0
          ? `${money(outstanding, 'INR')} outstanding, of which ${money(overdue, 'INR')} is past due.`
          : `${money(outstanding, 'INR')} outstanding, nothing past due.`,
      blocks,
      citations: [{ label: 'Finance', href: ROUTES.finance }],
      followUps: [
        // The shipment behind the oldest unpaid invoice — the question a
        // finance answer usually leads to.
        ...(overdueInvoices.length > 0 && JOBS.some((j) => j.id === overdueInvoices[0].jobId)
          ? [`Where is ${overdueInvoices[0].jobId}?`]
          : []),
        'Show me my shipments',
        'Explain free time',
      ],
    }
  },
}

/** What is still owed on an invoice. Clamped: an overpayment is not a negative debt. */
function balanceOf(invoice: CustomerInvoice): number {
  return Math.max(0, invoice.total - invoice.amountPaid)
}

function dueMs(invoice: CustomerInvoice): number {
  return new Date(invoice.dueAt).getTime()
}
