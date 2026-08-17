'use client'

import Link from 'next/link'
import { ArrowRight, Blocks, Send } from 'lucide-react'
import { useMemo, useState } from 'react'

import { OPEN_RFQ_STATUSES, RFQ_STATUS_LABEL, RFQ_STATUS_TONE, bestResponses, type Rfq, type RfqStatus } from '@/data/rfqs'
import { orgMember } from '@/data/org'
import { requirePort } from '@/data/ports'
import { countdown } from '@/lib/demo-clock'
import { formatDate, moneyUsd } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { useHydrated } from '@/hooks/use-hydrated'
import { useRfqs } from '@/store/hooks'

import { PageShell } from '@/components/app/app-shell'
import { EmptyState, Panel, SegmentedControl, Skeleton, StatusBadge } from '@/components/ui/primitives'
import { ChainRail, RoleGate } from '@/components/shipment/journey'

type Scope = 'open' | 'awarded' | 'all'

/**
 * The request list.
 *
 * Sorted by what needs a decision: anything awaiting approval first, then by
 * how soon the responses expire. A request whose rates lapse before someone
 * awards it is the failure this module exists to prevent, so the closing
 * countdown is a column, not a detail.
 *
 * Every row also carries WHAT HAPPENS NEXT on it. A status word alone —
 * "Out with partners", "Responses in" — tells a reader where a request is but
 * not what is being waited on or by whom, and a list of six requests in six
 * states with no next action is a list nobody can work.
 */

/** What each state is waiting on, and who holds it. */
function waitingOn(rfq: Rfq): string {
  switch (rfq.status) {
    case 'DRAFT':
      return 'Not sent yet — open it and send it to partners'
    case 'SUBMITTED':
      return `Out with partners since ${formatDate(rfq.raisedAt)}. Nothing back yet`
    case 'RESPONSES_IN':
      return `${rfq.responses.length} back — compare them and send for approval`
    case 'UNDER_REVIEW':
      return 'Shortlisted. Needs the Procurement Approver to award it'
    case 'AWARDED':
      return rfq.contractId ? `Awarded — became contract ${rfq.contractId}` : 'Awarded'
    case 'EXPIRED':
      return 'Responses lapsed before a decision. Re-issue if the lane is still needed'
    case 'DECLINED':
    default:
      return 'Closed without an award'
  }
}

export function RfqList() {
  const hydrated = useHydrated()
  const rfqs = useRfqs()
  const [scope, setScope] = useState<Scope>('open')

  const rows = useMemo(() => {
    const filtered = rfqs.filter((r) => {
      if (scope === 'open') return OPEN_RFQ_STATUSES.includes(r.status)
      if (scope === 'awarded') return r.status === 'AWARDED'
      return true
    })
    return filtered.sort((a, b) => {
      const urgency = (s: RfqStatus) => (s === 'UNDER_REVIEW' ? 0 : s === 'RESPONSES_IN' ? 1 : 2)
      if (urgency(a.status) !== urgency(b.status)) return urgency(a.status) - urgency(b.status)
      return new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime()
    })
  }, [rfqs, scope])

  const awaiting = useMemo(() => rfqs.filter((r) => r.status === 'UNDER_REVIEW'), [rfqs])

  return (
    <PageShell
      title="Requests for quotation"
      description="Raised when a lane cannot be priced off the shelf — a new pair, unusual equipment, or a volume commitment worth tendering. The winning response becomes a contract, and the contract prices the lane from then on."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <ChainRail current="request" />
          <SegmentedControl<Scope>
            ariaLabel="Request scope"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'awarded', label: 'Awarded' },
              { value: 'all', label: 'All' },
            ]}
          />
        </div>
      }
      notice="Partner responses are simulated. In production these arrive from the partners a request was sent to, on their own terms and validity."
    >
      {/* ── The decision waiting on a person ──────────────────────────────
          The gate is rendered here, not just on the detail screen, because a
          request stalled on an approval is invisible from a list of statuses
          and the countdown on it is running against real partner validity. */}
      {hydrated && awaiting.length > 0 && (
        <RoleGate
          className="mb-5"
          capability="award"
          allowedLine={
            <>
              {awaiting.length} request{awaiting.length === 1 ? '' : 's'} {awaiting.length === 1 ? 'is' : 'are'} shortlisted
              and waiting on you. Awarding one signs a freight contract at the response’s rate and terms.
            </>
          }
          blockedLine={
            <>
              {awaiting.length} request{awaiting.length === 1 ? '' : 's'} {awaiting.length === 1 ? 'is' : 'are'} shortlisted
              and cannot move. Awarding commits the company to a freight contract, so it does not sit with whoever raised
              the request.
            </>
          }
        />
      )}

      {!hydrated ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[110px]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Panel className="p-8">
          <EmptyState
            icon={<Blocks className="h-6 w-6" />}
            title={scope === 'awarded' ? 'Nothing awarded yet' : 'No open requests'}
            description={
              scope === 'awarded'
                ? 'Awarded requests become contracts and appear here with the partner that won them.'
                : 'Raise one from a rate search when a lane has no live rate.'
            }
            action={
              <Link href={ROUTES.search} className="text-data font-medium text-signal hover:underline">
                Search a lane
              </Link>
            }
          />
        </Panel>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((rfq) => {
            const origin = requirePort(rfq.originId)
            const destination = requirePort(rfq.destinationId)
            const best = bestResponses(rfq)
            const closes = countdown(rfq.closesAt)
            const raisedBy = orgMember(rfq.raisedByMemberId)
            const pressing = rfq.status === 'UNDER_REVIEW'

            return (
              <li key={rfq.id}>
                <Link
                  href={ROUTES.rfq(rfq.id)}
                  className={cn(
                    'pw-card pw-lift group block p-4 no-underline sm:p-5',
                    pressing && 'border-amber/40',
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="pw-id text-data font-semibold text-text">{rfq.id}</span>
                        <StatusBadge tone={RFQ_STATUS_TONE[rfq.status]}>{RFQ_STATUS_LABEL[rfq.status]}</StatusBadge>
                      </div>
                      <p className="pw-plate-title mt-1.5 text-panel">
                        {origin.name} → {destination.name}
                      </p>
                      <p className="mt-0.5 text-micro text-text-faint">
                        {rfq.equipment} · {rfq.monthlyVolume}/month · {rfq.commodity} · raised by {raisedBy.name}
                      </p>
                    </div>

                    <dl className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2">
                      <div>
                        <dt className="pw-stencil">Responses</dt>
                        <dd className="pw-readout mt-0.5 text-data font-medium">{rfq.responses.length}</dd>
                      </div>
                      <div>
                        <dt className="pw-stencil">Best rate</dt>
                        <dd className="pw-readout mt-0.5 text-data font-medium">
                          {best.cheapest ? moneyUsd(best.cheapest.rateUsd) : '—'}
                        </dd>
                      </div>
                      <div className="min-w-[92px]">
                        <dt className="pw-stencil">{rfq.status === 'AWARDED' ? 'Awarded' : 'Closes'}</dt>
                        <dd
                          className={cn(
                            'pw-readout mt-0.5 text-data font-medium',
                            rfq.status === 'AWARDED'
                              ? 'text-text'
                              : closes.band === 'overdue' || closes.band === 'critical' || closes.band === 'urgent'
                                ? 'text-critical'
                                : 'text-text',
                          )}
                        >
                          {rfq.status === 'AWARDED' && rfq.awardedAt
                            ? formatDate(rfq.awardedAt)
                            : formatDate(rfq.closesAt)}
                        </dd>
                      </div>
                      <ArrowRight
                        className="hidden h-4 w-4 text-text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-signal sm:block"
                        aria-hidden
                      />
                    </dl>
                  </div>

                  {/* The next action, on every row. A machined joint separates
                      it from the record above it rather than a bare hairline. */}
                  <p className="pw-groove -mx-4 -mb-4 mt-3.5 flex items-center gap-2 px-4 pb-3 pt-2.5 sm:-mx-5 sm:-mb-5 sm:px-5">
                    <span
                      aria-hidden
                      className={cn(
                        'pw-stud h-1.5 w-1.5 shrink-0',
                        pressing
                          ? 'text-amber'
                          : rfq.status === 'AWARDED'
                            ? 'text-signal'
                            : rfq.status === 'DRAFT'
                              ? 'text-text-faint'
                              : 'text-route',
                      )}
                    />
                    <span className="min-w-0 truncate text-data text-text-muted">{waitingOn(rfq)}</span>
                    {rfq.status === 'DRAFT' && (
                      <Send className="ml-auto hidden h-3.5 w-3.5 shrink-0 text-text-faint sm:block" aria-hidden />
                    )}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </PageShell>
  )
}
