'use client'

import Link from 'next/link'
import { FileText, FolderOpen, Receipt, Ship } from 'lucide-react'
import { useMemo } from 'react'

import { DEMO } from '@/data/copy'
import { ORGANISATION } from '@/data/org'
import { formatDate } from '@/lib/format'
import { DOCUMENT_TYPE_LABEL } from '@/lib/lifecycle'
import { ROUTES } from '@/lib/routes'
import { isPast } from '@/lib/demo-clock'
import { cn } from '@/lib/utils'
import { useDocuments, useLegalDocuments } from '@/store/hooks'
import type { FreightDocument, LegalDocument, LegalDocumentCategory } from '@/types'

import { Chip, Panel } from '@/components/ui/primitives'
import { DocStatusBadge } from '@/components/ui/freight'

import { RecordPanel, TabIntro } from './pieces'

/**
 * The finance document vault.
 *
 * Not every document in the product — the paperwork on this account that this
 * customer is a party to. Two categories from the legal layer (the formats
 * their invoices and credit notes are produced in, and the commercial
 * documents each invoice is raised under) plus the invoice documents that sit
 * on individual shipments.
 *
 * The version, the effective date and the review date are the point. A
 * document with no version is a document two parties can hold different
 * copies of, and a template whose review date has passed is a commercial risk
 * rather than a filing error.
 */

/** Which slices of the legal layer belong to finance, and why. */
const CATEGORIES: Array<{
  category: LegalDocumentCategory
  title: string
  blurb: string
  icon: React.ReactNode
}> = [
  {
    category: 'FINANCE',
    title: 'Finance',
    blurb: 'The formats every invoice and credit note on this account is produced in.',
    icon: <Receipt className="h-4 w-4 text-signal" aria-hidden />,
  },
  {
    category: 'COMMERCIAL',
    title: 'Commercial',
    blurb:
      'The priced offer and its acceptance — the documents an invoice is raised under and disputed against.',
    icon: <FileText className="h-4 w-4 text-signal" aria-hidden />,
  },
]

/**
 * The visibility rule for this tab, in one place.
 *
 * The legal layer holds both sides of the business: the documents this
 * customer signs, and the ones PortWhizz signs with its partners and its
 * financier. Only the first belong on a customer's screen — a vendor rate
 * confirmation names the buy rate a job's margin is calculated against, an
 * internal reconciliation format names the variance codes behind it, and the
 * working-capital facility is an agreement this customer is not party to and
 * would reasonably mistake for their own PayLater line.
 *
 * So the test is party membership rather than a category allow-list: a
 * document reaches this tab only if this company signed it, or if it is a
 * standard format issued to customers generally.
 */
const CUSTOMER_PARTIES: ReadonlySet<string> = new Set([ORGANISATION.name, 'Customer', 'All customers'])

function isCustomerParty(doc: LegalDocument): boolean {
  return CUSTOMER_PARTIES.has(doc.partyFrom) || CUSTOMER_PARTIES.has(doc.partyTo)
}

const INVOICE_DOCUMENT_TYPES: ReadonlyArray<FreightDocument['type']> = ['CUSTOMER_INVOICE', 'VENDOR_INVOICE']

export function DocumentsTab() {
  const legalDocuments = useLegalDocuments()
  const documents = useDocuments()

  const grouped = useMemo(
    () =>
      CATEGORIES.map((group) => ({
        ...group,
        items: legalDocuments.filter((d) => d.category === group.category && isCustomerParty(d)),
      })),
    [legalDocuments],
  )

  const invoiceDocuments = useMemo(
    () => documents.filter((d) => INVOICE_DOCUMENT_TYPES.includes(d.type) && d.customerVisible),
    [documents],
  )

  /**
   * Customer invoice documents that exist but have not been raised yet.
   *
   * Counted rather than hidden. An empty section that says nothing looks
   * broken, whereas the reason this one is empty — the invoice on the live
   * shipment is still in draft pending proof of delivery — is exactly the
   * kind of thing a controller chasing paperwork wants to know.
   *
   * Partner invoices are excluded from the count on purpose: they are
   * PortWhizz's cost side and will never appear here whatever their status.
   */
  const pendingCustomerInvoices = useMemo(
    () => documents.filter((d) => d.type === 'CUSTOMER_INVOICE' && !d.customerVisible),
    [documents],
  )

  return (
    <div className="flex flex-col gap-5">
      <TabIntro>
        The paperwork behind the money on this account: the formats invoices are produced in, the commercial documents
        each one is raised under, and the invoice documents held on individual shipments. Agreements PortWhizz holds
        with its own partners and financier are not part of this account and are not shown here.
      </TabIntro>

      {grouped.map((group) =>
        group.items.length === 0 ? null : (
          <RecordPanel
            key={group.category}
            icon={group.icon}
            title={group.title}
            meta={`${group.items.length} document${group.items.length === 1 ? '' : 's'}`}
            footnote={group.blurb}
          >
            <ul className="divide-y divide-hairline">
              {group.items.map((doc) => (
                <LegalRow key={doc.id} doc={doc} />
              ))}
            </ul>
          </RecordPanel>
        ),
      )}

      {/* ── Invoice documents on individual shipments ─────────────────── */}
      <RecordPanel
        icon={<Ship className="h-4 w-4 text-signal" aria-hidden />}
        title="Shipment invoice documents"
        meta={`${invoiceDocuments.length} shared with this account`}
        footnote="An invoice document appears here once it has been raised and shared. Partner invoices behind a shipment are PortWhizz’s cost side and are not shared with the customer."
      >
        {invoiceDocuments.length === 0 ? (
          <div className="px-5 py-5">
            <p className="text-data leading-relaxed text-text-muted">
              No invoice document is shared on this account yet.
              {pendingCustomerInvoices.length > 0 && (
                <>
                  {' '}
                  {pendingCustomerInvoices.length} customer invoice{' '}
                  {pendingCustomerInvoices.length === 1 ? 'document is' : 'documents are'} still in draft on a live
                  shipment — an invoice document appears here the moment it is raised.
                </>
              )}
            </p>
            <Link
              href={ROUTES.financeTab('invoices')}
              className="mt-2 inline-flex text-data font-medium text-signal hover:underline"
            >
              See the invoices already raised
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-hairline">
            {invoiceDocuments.map((doc) => (
              <FreightRow key={doc.id} doc={doc} />
            ))}
          </ul>
        )}
      </RecordPanel>

      {/* DEMO.legalNotice, verbatim — the one disclaimer this tab owes. */}
      <Panel className="px-5 py-4">
        <p className="flex gap-2.5 text-[12px] leading-relaxed text-text-muted">
          <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" aria-hidden />
          {DEMO.legalNotice}
        </p>
      </Panel>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   ROWS
   ══════════════════════════════════════════════════════════════════════════ */

function LegalRow({ doc }: { doc: LegalDocument }) {
  const reviewOverdue = Boolean(doc.reviewDue && isPast(doc.reviewDue))
  const covers = doc.clauseAnatomy.slice(0, 3)
  const remaining = doc.clauseAnatomy.length - covers.length

  return (
    <li className="px-5 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-data font-medium text-text">{doc.title}</span>
            <DocStatusBadge status={doc.status} />
            <span className="rounded-chip border border-hairline bg-raised-2 px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
              {doc.version}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-text-faint">
            <span className="pw-id">{doc.id}</span> · {doc.partyFrom} → {doc.partyTo}
          </p>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-text-muted">{doc.purpose}</p>
        </div>

        <div className="shrink-0 text-right">
          {doc.effectiveFrom && (
            <p className="tnum font-mono text-[11px] text-text-muted">
              Effective {formatDate(doc.effectiveFrom)}
            </p>
          )}
          {doc.reviewDue && (
            <p className={cn('tnum font-mono text-[11px]', reviewOverdue ? 'text-critical' : 'text-text-faint')}>
              Review {reviewOverdue ? 'was due' : 'due'} {formatDate(doc.reviewDue)}
            </p>
          )}
          {doc.jobId && (
            <Link href={ROUTES.booking(doc.jobId)} className="pw-id mt-0.5 inline-block text-[11px] text-route hover:underline">
              {doc.jobId}
            </Link>
          )}
        </div>
      </div>

      {covers.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {covers.map((clause) => (
            <li key={clause}>
              <Chip>{clause}</Chip>
            </li>
          ))}
          {remaining > 0 && (
            <li>
              <Chip>+{remaining} more</Chip>
            </li>
          )}
        </ul>
      )}
    </li>
  )
}

function FreightRow({ doc }: { doc: FreightDocument }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 px-5 py-3.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-data font-medium text-text">{doc.title}</span>
          <DocStatusBadge status={doc.status} />
          <span className="rounded-chip border border-hairline bg-raised-2 px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
            v{doc.version}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-text-faint">
          <span className="pw-id">{doc.id}</span> · {DOCUMENT_TYPE_LABEL[doc.type] ?? doc.type} · issued by{' '}
          {doc.createdBy}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="tnum font-mono text-[11px] text-text-muted">
          {doc.issuedAt ? `Issued ${formatDate(doc.issuedAt)}` : `Created ${formatDate(doc.createdAt)}`}
        </p>
        <Link href={ROUTES.booking(doc.jobId)} className="pw-id mt-0.5 inline-block text-[11px] text-route hover:underline">
          {doc.jobId}
        </Link>
      </div>
    </li>
  )
}
