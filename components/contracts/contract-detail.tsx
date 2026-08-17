'use client'

import Link from 'next/link'
import { ArrowRight, Check, FileSignature, History, Search, Ship, X } from 'lucide-react'

import { CONTRACT_STATUS_LABEL, CONTRACT_STATUS_TONE, utilisationPct, type Contract } from '@/data/contracts'
import { orgMember } from '@/data/org'
import { requirePort } from '@/data/ports'
import { rateCell } from '@/data/rate-grid'
import { daysUntil } from '@/lib/demo-clock'
import { formatDate, moneyUsd, transitRange } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { useHydrated } from '@/hooks/use-hydrated'
import { useContracts, useJobs } from '@/store/hooks'

import { PageShell } from '@/components/app/app-shell'
import { Card, EmptyState, Meter, MotionButton, Panel, Skeleton, StatusBadge } from '@/components/ui/primitives'
import { JobStatusBadge } from '@/components/ui/freight'
import { ChainRail } from '@/components/shipment/journey'

/**
 * A contract.
 *
 * The lane table compares each contracted rate against this week's spot
 * figure, because that comparison is the only way to answer the question a
 * customer actually has — is the agreement still worth having? A contract
 * that has drifted above spot is a renegotiation, and one well below it is
 * the reason to hit the volume commitment.
 *
 * AND IT IS NOT A LEAF. Awarding a request lands the viewer here, so this is
 * the screen where the procurement half of the journey hands over to the
 * shipment half. A contract minted in this session has no shipments on it by
 * definition, and the panel that said "nothing booked against this contract
 * yet" full stop was therefore the exact place the demo stopped. It now says
 * what to do about it and links to the search that will price off this rate.
 */
export function ContractDetail({ id }: { id: string }) {
  const hydrated = useHydrated()
  const contracts = useContracts()
  const contract = contracts.find((c) => c.id === id)

  if (!hydrated) {
    return (
      <PageShell title="Contract">
        <Skeleton className="h-[420px]" />
      </PageShell>
    )
  }

  if (!contract) {
    return (
      <PageShell title="Contract">
        <Panel className="p-8">
          <EmptyState
            title={`No contract with id ${id}`}
            description="It may have been created in a session that has since been reset."
            action={
              <Link href={ROUTES.contracts} className="text-data font-medium text-signal hover:underline">
                Back to all contracts
              </Link>
            }
          />
        </Panel>
      </PageShell>
    )
  }

  return <ContractBody contract={contract} />
}

function ContractBody({ contract }: { contract: Contract }) {
  const jobs = useJobs()
  const signedBy = orgMember(contract.signedByMemberId)
  const used = utilisationPct(contract)
  const daysLeft = daysUntil(contract.validUntil)
  const linked = jobs.filter((j) => contract.linkedJobIds.includes(j.id))
  const primaryLane = contract.lanes[0]
  const live = contract.status === 'ACTIVE' || contract.status === 'EXPIRING'

  return (
    <PageShell
      width="wide"
      title={
        <span className="flex flex-wrap items-center gap-3">
          {contract.title}
          <StatusBadge tone={CONTRACT_STATUS_TONE[contract.status]}>
            {CONTRACT_STATUS_LABEL[contract.status]}
          </StatusBadge>
        </span>
      }
      description={
        <>
          <span className="pw-id">{contract.id}</span> · {contract.reference} · {contract.partnerName} ·{' '}
          {formatDate(contract.validFrom)} – {formatDate(contract.validUntil)}
        </>
      }
      actions={<ChainRail current="contract" />}
      notice="Illustrative commercial terms for demonstration. Liability, insurance, indemnity and dispute clauses require review by a qualified legal professional before production use."
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          {/* ══════════════════════════════════════════════════════════════
              WHAT TO DO WITH IT
              The handover from the procurement half of the journey to the
              shipment half. Without it, awarding a request ends here.
              ══════════════════════════════════════════════════════════════ */}
          {live && (
            <section className="pw-plate overflow-hidden" aria-label="What happens next">
              <div className="px-5 pb-4 pt-4">
                <p className="mb-2 flex items-center gap-2">
                  <span aria-hidden className="h-[3px] w-3 shrink-0 rounded-full bg-signal/60" />
                  <span className="pw-stencil">Next on this contract</span>
                </p>
                <h3 className="pw-plate-title text-[17px] leading-tight">
                  {linked.length === 0
                    ? 'Book a shipment on it'
                    : used >= 100
                      ? 'Commitment met — keep booking on it'
                      : `Ship ${contract.committedMonthlyVolume - contract.shippedThisPeriod} more to meet the commitment`}
                </h3>
                <p className="mt-1.5 max-w-2xl text-data leading-relaxed text-text-muted">
                  {linked.length === 0 ? (
                    <>
                      Nothing has drawn on this agreement yet. Search{' '}
                      {primaryLane
                        ? `${requirePort(primaryLane.originId).name} → ${requirePort(primaryLane.destinationId).name}`
                        : 'the lane'}{' '}
                      and the contracted rate is what prices it — not the spot figure. Picking an option from there
                      creates the shipment.
                    </>
                  ) : (
                    <>
                      Every shipment booked on this lane counts towards the committed volume. Falling short is what puts
                      the rate at risk when the agreement is reopened.
                    </>
                  )}
                </p>
              </div>
              <div className="pw-groove flex flex-wrap items-center gap-3 px-5 pb-4 pt-3.5">
                <MotionButton variant="primary" size="lg" asChild>
                  <Link href={ROUTES.search}>
                    <Search className="h-4 w-4" aria-hidden />
                    Price this lane
                  </Link>
                </MotionButton>
                {contract.rfqId && (
                  <Link
                    href={ROUTES.rfq(contract.rfqId)}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-chip px-1 text-data font-medium text-text-muted transition-colors hover:text-signal"
                  >
                    Awarded from {contract.rfqId}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                )}
              </div>
            </section>
          )}

          {/* ── Rates, against this week's spot ─────────────────────── */}
          <Panel className="overflow-hidden">
            <header className="pw-groove-b flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
              <h3 className="pw-plate-title text-body">Contracted lanes</h3>
              <p className="text-micro text-text-faint">Compared with this week’s spot rate</p>
            </header>

            <div className="pw-table-wrap border-0">
              <table className="pw-table">
                <thead>
                  <tr>
                    <th>Lane</th>
                    <th>Equipment</th>
                    <th className="text-right">Your rate</th>
                    <th className="text-right">Spot this week</th>
                    <th className="text-right">Difference</th>
                    <th className="text-right">Free time</th>
                    <th className="text-right">Transit</th>
                  </tr>
                </thead>
                <tbody>
                  {contract.lanes.map((lane) => {
                    const spot = rateCell(lane.laneId, lane.equipment === '20FT' ? '20FT' : '40HC')
                    const delta = spot ? Math.round(((lane.rateUsd - spot.amountUsd) / spot.amountUsd) * 100) : null

                    return (
                      <tr key={`${lane.laneId}-${lane.equipment}`}>
                        <td className="font-medium text-text">
                          {requirePort(lane.originId).name} → {requirePort(lane.destinationId).name}
                        </td>
                        <td className="text-text-muted">{lane.equipment}</td>
                        <td className="pw-readout text-right font-semibold">{moneyUsd(lane.rateUsd)}</td>
                        <td className="pw-readout text-right text-text-muted">
                          {spot ? moneyUsd(spot.amountUsd) : 'No published lane'}
                        </td>
                        <td
                          className={cn(
                            'pw-readout text-right font-medium',
                            delta === null ? 'text-text-faint' : delta < 0 ? 'text-signal' : 'text-amber',
                          )}
                        >
                          {delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta}%`}
                        </td>
                        <td className="pw-readout text-right text-text-muted">{lane.freeTimeDays} days</td>
                        <td className="pw-readout text-right text-text-muted">
                          {transitRange(lane.transitMinDays, lane.transitMaxDays)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="pw-groove bg-raised-2/50 px-5 py-2.5 text-micro leading-relaxed text-text-muted">
              A negative difference means the contract is beating this week’s spot market. Where it turns positive and
              stays there, the agreement is worth reopening at renewal. A lane with no published spot figure is one this
              contract exists precisely because nobody quotes off the shelf.
            </p>
          </Panel>

          {/* ── Scope ────────────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <ScopeCard title="What the rate includes" items={contract.inclusions} tone="signal" />
            <ScopeCard title="What it does not" items={contract.exclusions} tone="muted" />
          </div>

          {/* ── Shipments drawn against it ──────────────────────────── */}
          <Panel className="overflow-hidden">
            <header className="pw-groove-b border-b border-hairline px-5 py-3.5">
              <h3 className="pw-plate-title flex items-center gap-2 text-body">
                <Ship className="h-4 w-4 text-signal" aria-hidden />
                Shipments on this contract
              </h3>
            </header>
            {linked.length === 0 ? (
              <EmptyState
                icon={<Ship className="h-5 w-5" />}
                title="Nothing booked against it yet"
                description={
                  live
                    ? 'Shipments appear here as soon as one is raised on a contracted lane. The rate above is what will price it.'
                    : 'No shipment ever drew on this agreement.'
                }
                action={
                  live ? (
                    <Link href={ROUTES.search} className="text-data font-medium text-signal hover:underline">
                      Search this lane
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <ul className="divide-y divide-hairline">
                {linked.map((job) => (
                  <li key={job.id}>
                    <Link
                      href={ROUTES.booking(job.id)}
                      className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-raised-2/60"
                    >
                      <span className="min-w-0">
                        <span className="pw-id block text-data font-medium text-text">{job.id}</span>
                        <span className="block text-micro text-text-faint">
                          {requirePort(job.originId).name} → {requirePort(job.destinationId).name}
                        </span>
                      </span>
                      <JobStatusBadge status={job.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          <Card className="p-5">
            <h3 className="pw-stencil">Commitment</h3>
            <div className="mt-3">
              <Meter
                label={`${contract.shippedThisPeriod} of ${contract.committedMonthlyVolume} containers`}
                value={used}
                tone={used >= 90 ? 'signal' : used >= 60 ? 'route' : 'amber'}
              />
            </div>
            <p className="mt-2.5 text-micro leading-relaxed text-text-muted">
              {used >= 100
                ? 'Commitment met for this period.'
                : `${contract.committedMonthlyVolume - contract.shippedThisPeriod} more container${
                    contract.committedMonthlyVolume - contract.shippedThisPeriod === 1 ? '' : 's'
                  } to meet the committed volume. Falling short is what puts the rate at risk at renewal.`}
            </p>
            {live && (
              <p className="pw-groove mt-3 pt-2.5 text-micro text-text-faint">
                {daysLeft} day{daysLeft === 1 ? '' : 's'} of validity remaining
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="pw-stencil">Signature</h3>
            <dl className="mt-3 flex flex-col gap-2.5">
              <Row label="Partner" value={contract.partnerName} />
              <Row label="Signed by" value={`${signedBy.name} · ${signedBy.title}`} />
              <Row label="Signed" value={formatDate(contract.signedAt)} />
              <Row label="Version" value={contract.version} />
              {contract.rfqId && <Row label="Awarded from" value={contract.rfqId} />}
            </dl>
            {contract.rfqId && (
              <Link
                href={ROUTES.rfq(contract.rfqId)}
                className="pw-groove mt-3 inline-flex items-center gap-1.5 pt-2.5 text-micro font-medium text-signal hover:underline"
              >
                See the responses it beat
                <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            )}
          </Card>

          <Card className="overflow-hidden p-0">
            <h3 className="pw-stencil pw-groove-b flex items-center gap-2 border-b border-hairline px-5 py-3">
              <History className="h-3.5 w-3.5" aria-hidden />
              Amendment history
            </h3>
            <ol className="divide-y divide-hairline">
              {contract.amendments.map((a) => (
                <li key={a.version} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="pw-readout text-data font-medium">{a.version}</span>
                    <span className="text-micro text-text-faint">{formatDate(a.at)}</span>
                  </div>
                  <p className="mt-1 text-data leading-relaxed text-text-muted">{a.summary}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}

function ScopeCard({ title, items, tone }: { title: string; items: string[]; tone: 'signal' | 'muted' }) {
  const Icon = tone === 'signal' ? Check : X
  return (
    <Card className="p-5">
      <h3 className="pw-stencil flex items-center gap-2">
        <FileSignature className="h-3.5 w-3.5" aria-hidden />
        {title}
      </h3>
      <ul className="mt-3 flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-data leading-relaxed text-text-muted">
            <Icon
              className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', tone === 'signal' ? 'text-signal' : 'text-text-faint')}
              aria-hidden
            />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 font-mono text-micro uppercase tracking-[0.08em] text-text-faint">{label}</dt>
      <dd className="min-w-0 text-right text-data text-text">{value}</dd>
    </div>
  )
}
