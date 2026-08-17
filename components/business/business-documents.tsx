'use client'

import { FileText } from 'lucide-react'

import { ORGANISATION, documentsNeedingAttention } from '@/data/org'
import { count, formatDate, humanise } from '@/lib/format'
import { cn } from '@/lib/utils'

import { StatusBadge } from '@/components/ui/primitives'
import { RecordPanel } from '@/components/finance/pieces'

import { COMPANY_DOC_LABEL, COMPANY_DOC_TONE } from './business-status'
import { ExpiryClock } from './expiry-clock'

/**
 * Licences, registrations and cover — the full list, in file order.
 *
 * The attention panel at the top of the page has already pulled the two rows
 * that are a problem, so this table's job is the opposite one: show the whole
 * record, including the four documents that are perfectly fine, because "what
 * else is on file" is a question the desk asks at renewal time and a list
 * that only ever shows problems cannot answer it.
 *
 * The two bad rows are still tinted. A table where the expired licence looks
 * like every other row is how it stays expired for another month.
 *
 * MATERIAL: the panel, its header joint and its basis strip are `RecordPanel`
 * — the same frame the finance tables sit in — and the expiry figures are
 * readings in a channel rather than badges. The table itself scrolls inside
 * its own box at narrow widths; the page never does.
 */
export function BusinessDocuments() {
  const outstanding = documentsNeedingAttention().length

  return (
    <RecordPanel
      icon={<FileText className="h-4 w-4 shrink-0 text-signal" aria-hidden />}
      title="Company documents"
      meta={`${count(ORGANISATION.documents.length)} on file · ${count(outstanding)} out of date`}
      footnote="References are masked, as they would be for anyone without profile rights. A document with no expiry is one that does not lapse — it is superseded instead, and replacing it starts a new row rather than renewing this one."
    >
      <div className="pw-table-wrap border-0">
        <table className="pw-table">
          <caption className="sr-only">Company licences, registrations and cover held on the account</caption>
          <thead>
            <tr>
              <th scope="col">Document</th>
              <th scope="col">Category</th>
              <th scope="col">Reference</th>
              <th scope="col">Issued</th>
              <th scope="col">Expires</th>
              <th scope="col" className="text-right">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {ORGANISATION.documents.map((doc) => (
              <tr
                key={doc.id}
                className={cn(
                  doc.status === 'EXPIRED' && 'bg-critical/6',
                  doc.status === 'MISSING' && 'bg-critical/6',
                  doc.status === 'EXPIRING' && 'bg-amber/6',
                )}
              >
                <td className="font-medium text-text">{doc.name}</td>
                <td className="text-text-muted">{humanise(doc.category)}</td>
                <td>
                  <span className="pw-id text-text-muted">{doc.reference}</span>
                </td>
                <td>
                  <span className="pw-readout text-text-muted">{doc.issuedAt ? formatDate(doc.issuedAt) : '—'}</span>
                </td>
                <td>
                  {doc.expiresAt ? (
                    <span className="flex flex-col items-start gap-1">
                      <span className="pw-readout">{formatDate(doc.expiresAt)}</span>
                      <ExpiryClock expiresAt={doc.expiresAt} />
                    </span>
                  ) : (
                    <span className="text-micro text-text-faint">No expiry</span>
                  )}
                </td>
                <td className="text-right">
                  <StatusBadge tone={COMPANY_DOC_TONE[doc.status]}>{COMPANY_DOC_LABEL[doc.status]}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </RecordPanel>
  )
}
