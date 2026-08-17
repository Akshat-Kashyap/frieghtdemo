'use client'

import Link from 'next/link'
import { ArrowRight, FileSignature } from 'lucide-react'
import { useMemo } from 'react'

import { CONTRACT_STATUS_LABEL, CONTRACT_STATUS_TONE, utilisationPct, type Contract } from '@/data/contracts'
import { requirePort } from '@/data/ports'
import { daysUntil } from '@/lib/demo-clock'
import { formatDate, moneyUsd } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { useHydrated } from '@/hooks/use-hydrated'
import { useContracts, useJobs } from '@/store/hooks'

import { PageShell } from '@/components/app/app-shell'
import { EmptyState, Meter, Panel, Skeleton, StatusBadge } from '@/components/ui/primitives'
import { ChainRail } from '@/components/shipment/journey'

/**
 * Contracts.
 *
 * Two numbers matter on this list and neither is the rate: how long the
 * agreement has left, and how far through the committed volume the company
 * is. Missing a volume commitment is what loses the rate at renewal.
 *
 * And a third thing, which is not a number: what to DO about either. A
 * contract at 25% utilisation with three weeks left is a decision, not a
 * status, so every row says what the decision is.
 */

/** The one sentence this contract's numbers add up to. */
function standingOf(c: Contract, shipments: number): { line: string; tone: 'signal' | 'amber' | 'critical' | 'route' } {
  const used = utilisationPct(c)
  const daysLeft = daysUntil(c.validUntil)

  if (c.status === 'EXPIRED' || c.status === 'SUPERSEDED') {
    return { line: 'Closed out. Rates on this lane have gone back to spot.', tone: 'route' }
  }
  if (c.status === 'DRAFT') {
    return { line: 'Not yet in force — nothing prices off it.', tone: 'route' }
  }
  if (shipments === 0) {
    return { line: 'Nothing booked against it yet. Search the lane and the contracted rate is what you get.', tone: 'amber' }
  }
  if (used >= 100) {
    return { line: 'Commitment met for this period. The rate is safe at renewal.', tone: 'signal' }
  }
  if (daysLeft <= 21 && used < 75) {
    return {
      line: `${c.committedMonthlyVolume - c.shippedThisPeriod} containers short with ${daysLeft} days left — the rate is at risk at renewal.`,
      tone: 'critical',
    }
  }
  return {
    line: `${c.committedMonthlyVolume - c.shippedThisPeriod} more container${c.committedMonthlyVolume - c.shippedThisPeriod === 1 ? '' : 's'} to meet the commitment.`,
    tone: 'amber',
  }
}

export function ContractList() {
  const hydrated = useHydrated()
  const contracts = useContracts()
  const jobs = useJobs()

  const rows = useMemo(() => {
    const rank = { ACTIVE: 0, EXPIRING: 1, DRAFT: 2, EXPIRED: 3, SUPERSEDED: 4 } as const
    return [...contracts].sort((a, b) => rank[a.status] - rank[b.status])
  }, [contracts])

  return (
    <PageShell
      title="Contracts"
      description="Agreed rates on named lanes, for a fixed window, against the volume you committed to. Every one of these started life as a request that somebody awarded."
      actions={<ChainRail current="contract" />}
      notice="Illustrative commercial terms. Production contracts require review by a qualified legal professional before signature."
    >
      {!hydrated ? (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-[190px]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Panel className="p-8">
          <EmptyState
            icon={<FileSignature className="h-6 w-6" />}
            title="No contracts yet"
            description="Award a request for quotation and the contract it becomes appears here."
            action={
              <Link href={ROUTES.rfqs} className="text-data font-medium text-signal hover:underline">
                Go to requests
              </Link>
            }
          />
        </Panel>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((c) => {
            const daysLeft = daysUntil(c.validUntil)
            const used = utilisationPct(c)
            // The linked jobs are read from the STORE rather than the authored
            // array, so a contract minted in this session counts correctly —
            // at zero, which is the honest number and the one the row acts on.
            const shipments = jobs.filter((j) => c.linkedJobIds.includes(j.id)).length
            const standing = standingOf(c, shipments)

            return (
              <li key={c.id}>
                <Link href={ROUTES.contract(c.id)} className="pw-plate pw-lift group block p-5 no-underline">
                  <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="pw-plate-title text-panel">{c.title}</span>
                        <StatusBadge tone={CONTRACT_STATUS_TONE[c.status]}>
                          {CONTRACT_STATUS_LABEL[c.status]}
                        </StatusBadge>
                        <span className="rounded-chip border border-hairline bg-raised-2 px-1.5 py-0.5 text-[10px] font-medium text-text-muted shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.55)]">
                          {c.version}
                        </span>
                        {c.createdInSession && <StatusBadge tone="route">New this session</StatusBadge>}
                      </div>
                      <p className="mt-1 text-micro text-text-faint">
                        <span className="pw-id">{c.id}</span> · {c.partnerName} · {formatDate(c.validFrom)} –{' '}
                        {formatDate(c.validUntil)}
                        {c.rfqId ? ` · awarded from ${c.rfqId}` : ''}
                      </p>
                    </div>

                    <ArrowRight
                      className="hidden h-4 w-4 shrink-0 text-text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-signal sm:block"
                      aria-hidden
                    />
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_240px]">
                    <ul className="flex flex-wrap gap-1.5">
                      {c.lanes.map((lane) => (
                        <li
                          key={`${lane.laneId}-${lane.equipment}`}
                          className="pw-rail inline-flex items-center gap-2 rounded-chip px-2.5 py-1 text-micro text-text-muted"
                        >
                          <span className="text-text">
                            {requirePort(lane.originId).name} → {requirePort(lane.destinationId).name}
                          </span>
                          <span className="pw-id text-text-faint">{lane.equipment}</span>
                          <span className="pw-readout font-medium">{moneyUsd(lane.rateUsd)}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-col gap-2">
                      <Meter
                        label={`Volume used · ${c.shippedThisPeriod} of ${c.committedMonthlyVolume}`}
                        value={used}
                        tone={used >= 90 ? 'signal' : used >= 60 ? 'route' : 'amber'}
                      />
                      {(c.status === 'ACTIVE' || c.status === 'EXPIRING') && (
                        <p className="text-micro text-text-faint">
                          {daysLeft} day{daysLeft === 1 ? '' : 's'} of validity remaining · {shipments} shipment
                          {shipments === 1 ? '' : 's'} drawn
                        </p>
                      )}
                    </div>
                  </div>

                  {/* What the two numbers above actually mean, on a machined
                      joint so it reads as part of the plate rather than a
                      caption stuck under it. */}
                  <p className="pw-groove -mx-5 -mb-5 mt-4 flex items-center gap-2 px-5 pb-3.5 pt-3">
                    <span
                      aria-hidden
                      className={cn(
                        'pw-stud h-1.5 w-1.5 shrink-0',
                        standing.tone === 'signal' && 'text-signal',
                        standing.tone === 'amber' && 'text-amber',
                        standing.tone === 'critical' && 'text-critical',
                        standing.tone === 'route' && 'text-route',
                      )}
                    />
                    <span className="min-w-0 truncate text-data text-text-muted">{standing.line}</span>
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
