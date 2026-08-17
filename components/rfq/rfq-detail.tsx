'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Clock, Lock, Search, Send, ShieldCheck, Trophy, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { RFQ_STATUS_LABEL, RFQ_STATUS_TONE, bestResponses, type Rfq, type RfqResponse } from '@/data/rfqs'
import { orgMember } from '@/data/org'
import { requirePort } from '@/data/ports'
import { formatDate, moneyUsd, transitRange } from '@/lib/format'
import { MODE_LABEL } from '@/lib/lifecycle'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { useHydrated } from '@/hooks/use-hydrated'
import { useActingMember, useCan } from '@/store/org-store'
import { useFreightStore } from '@/store/freight-store'
import { useRfqs } from '@/store/hooks'

import { PageShell } from '@/components/app/app-shell'
import { Card, EmptyState, MotionButton, Panel, Skeleton, StatusBadge } from '@/components/ui/primitives'
import { Modal } from '@/components/ui/overlays'
import { ChainRail, RoleGate, capabilityHolders } from '@/components/shipment/journey'

/**
 * A request, and the responses to it.
 *
 * The comparison table is the module. Four partners answering the same
 * question rarely agree on more than the lane, and the cheapest response is
 * routinely the wrong one — this one carries half the free time, that one
 * adds a surcharge inside the contract window. Markers call out best on
 * cost, on transit and on free time separately, because they are different
 * questions.
 *
 * EVERY STATE HAS A MOVE. It used to have exactly one: a request sitting in
 * DRAFT had no way to be sent, so the seeded draft was a screen the demo could
 * open and not leave, and `submitRfq` existed in the store with no caller. Each
 * state now renders the single action that state affords, and the one that
 * commits money renders the person who holds it instead of a dead control.
 */
export function RfqDetail({ id }: { id: string }) {
  const hydrated = useHydrated()
  const rfqs = useRfqs()
  const rfq = rfqs.find((r) => r.id === id)

  if (!hydrated) {
    return (
      <PageShell title="Request">
        <Skeleton className="h-[420px]" />
      </PageShell>
    )
  }

  if (!rfq) {
    return (
      <PageShell title="Request">
        <Panel className="p-8">
          <EmptyState
            title={`No request with id ${id}`}
            description="It may have been created in a session that has since been reset."
            action={
              <Link href={ROUTES.rfqs} className="text-data font-medium text-signal hover:underline">
                Back to all requests
              </Link>
            }
          />
        </Panel>
      </PageShell>
    )
  }

  return <RfqDetailBody rfq={rfq} />
}

function RfqDetailBody({ rfq }: { rfq: Rfq }) {
  const router = useRouter()
  const member = useActingMember()
  const award = useCan('award')
  const awardRfq = useFreightStore((s) => s.awardRfq)
  const shortlistRfq = useFreightStore((s) => s.shortlistRfq)
  const submitRfq = useFreightStore((s) => s.submitRfq)

  const [confirming, setConfirming] = useState<RfqResponse | null>(null)

  const origin = requirePort(rfq.originId)
  const destination = requirePort(rfq.destinationId)
  const best = useMemo(() => bestResponses(rfq), [rfq])
  const raisedBy = orgMember(rfq.raisedByMemberId)
  const awardedBy = rfq.awardedByMemberId ? orgMember(rfq.awardedByMemberId) : undefined
  const approver = capabilityHolders('award')[0] ?? 'an approver'

  const canAwardNow = rfq.status === 'UNDER_REVIEW' || rfq.status === 'RESPONSES_IN'
  const chainLink = rfq.status === 'AWARDED' ? 'contract' : canAwardNow ? 'award' : 'request'

  function confirmAward(response: RfqResponse) {
    const contractId = awardRfq(rfq.id, response.id, member.name, member.id)
    setConfirming(null)
    if (!contractId) return
    toast.success('REQUEST AWARDED', {
      description: `${response.partnerName} won ${origin.name} → ${destination.name} at ${moneyUsd(response.rateUsd)} per ${rfq.equipment}. Contract ${contractId} is signed in ${member.name}’s name — opening it now.`,
      duration: 11_000,
      action: { label: 'Open contract', onClick: () => router.push(ROUTES.contract(contractId)) },
    })
    router.push(ROUTES.contract(contractId))
  }

  function sendToPartners() {
    submitRfq(rfq.id, member.name)
    toast.success('REQUEST SENT TO PARTNERS', {
      description: `${rfq.id} is out to tender. Responses close ${formatDate(rfq.closesAt)} and land on this screen as they arrive.`,
      duration: 9_000,
    })
  }

  function sendForApproval() {
    shortlistRfq(rfq.id, member.name)
    toast.success('SENT FOR APPROVAL', {
      description: `${rfq.id} is now with ${approver}. Awarding commits the company to a contract, so it is not ${member.name}’s to take.`,
      duration: 10_000,
    })
  }

  return (
    <PageShell
      width="wide"
      title={
        <span className="flex flex-wrap items-center gap-3">
          {origin.name} → {destination.name}
          <StatusBadge tone={RFQ_STATUS_TONE[rfq.status]}>{RFQ_STATUS_LABEL[rfq.status]}</StatusBadge>
        </span>
      }
      description={
        <>
          <span className="pw-id">{rfq.id}</span> · {rfq.reference} · raised by {raisedBy.name} on{' '}
          {formatDate(rfq.raisedAt)}
        </>
      }
      actions={<ChainRail current={chainLink} />}
      notice="Simulated partner responses and a simulated award. A production award would issue a contract for counter-signature and require legal review of its terms."
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          {/* ══════════════════════════════════════════════════════════════
              WHAT THIS REQUEST NEEDS NEXT
              One plate, one move. The state machine decides which.
              ══════════════════════════════════════════════════════════════ */}
          {rfq.status === 'DRAFT' && (
            <NextMove
              title="This request has not been sent"
              body={`Nothing goes to a partner until you send it. Responses would close ${formatDate(rfq.closesAt)}.`}
              cta={
                <MotionButton variant="primary" size="lg" onClick={sendToPartners}>
                  <Send className="h-4 w-4" aria-hidden />
                  Send to partners
                </MotionButton>
              }
            />
          )}

          {rfq.status === 'SUBMITTED' && (
            <NextMove
              tone="route"
              title="Out with partners"
              body={`Sent on ${formatDate(rfq.raisedAt)}. Responses close ${formatDate(rfq.closesAt)} and appear below as partners answer — there is nothing for you to press while it is out.`}
            />
          )}

          {rfq.status === 'RESPONSES_IN' && (
            <NextMove
              title={`${rfq.responses.length} response${rfq.responses.length === 1 ? '' : 's'} in — compare them, then send for approval`}
              body={`The cheapest response is regularly not the one worth taking. Once you have a preference, ${approver} takes the award decision.`}
              cta={
                <MotionButton variant="primary" size="lg" onClick={sendForApproval}>
                  Send for approval
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </MotionButton>
              }
            />
          )}

          {/* ── The decision gate ─────────────────────────────────────────
              THE demo's best moment. Raise as the Logistics Manager, be
              refused here, switch person in the top bar, award. So the
              refusal is a plate that names the person, not a tooltip. */}
          {canAwardNow && (
            <RoleGate
              capability="award"
              allowedLine={
                <>
                  Awarding creates a freight contract in {`Apex Industrial’s`} name at the rate and terms of the
                  response you pick, and marks the others as not taken.
                </>
              }
              blockedLine={
                <>
                  Awarding this request signs {`Apex Industrial`} up to a freight contract at a partner’s rate. That is
                  a commitment of company money, so it does not sit with the person who raised the request.
                </>
              }
            />
          )}

          {/* ── What it became ───────────────────────────────────────────── */}
          {rfq.status === 'AWARDED' && rfq.contractId && (
            <section className="pw-plate overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-5 pb-4 pt-4">
                <div className="min-w-0">
                  <p className="mb-2 flex items-center gap-2">
                    <span aria-hidden className="h-[3px] w-3 shrink-0 rounded-full bg-signal/60" />
                    <span className="pw-stencil">What this became</span>
                  </p>
                  <h3 className="pw-plate-title text-[17px] leading-tight">
                    Contract {rfq.contractId} is live on this lane
                  </h3>
                  <p className="mt-1.5 max-w-2xl text-data leading-relaxed text-text-muted">
                    The lane now prices off the contract rather than the spot market. Search it and the contracted rate
                    is what you see — that is the whole point of running the tender.
                  </p>
                </div>
              </div>
              <div className="pw-groove flex flex-wrap items-center gap-3 px-5 pb-4 pt-3.5">
                <MotionButton variant="primary" size="lg" asChild>
                  <Link href={ROUTES.contract(rfq.contractId)}>
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                    Open contract {rfq.contractId}
                  </Link>
                </MotionButton>
                <Link
                  href={ROUTES.search}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-chip px-1 text-data font-medium text-text-muted transition-colors hover:text-signal"
                >
                  <Search className="h-3.5 w-3.5" aria-hidden />
                  Price this lane on the contract
                </Link>
              </div>
            </section>
          )}

          {/* ── Responses ─────────────────────────────────────────────── */}
          <Panel className="overflow-hidden">
            <header className="pw-groove-b flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
              <h3 className="pw-plate-title text-body">
                {rfq.responses.length} partner response{rfq.responses.length === 1 ? '' : 's'}
              </h3>
              <p className="text-micro text-text-faint">All-in USD per {rfq.equipment}, port to port</p>
            </header>

            {rfq.responses.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-6 w-6" />}
                title={rfq.status === 'DRAFT' ? 'Not sent yet' : 'Waiting on partners'}
                description={
                  rfq.status === 'DRAFT'
                    ? 'This request is still a draft. Send it to partners and responses collect here.'
                    : 'Responses appear here as partners answer. Nothing has come back yet.'
                }
              />
            ) : (
              <ul className="divide-y divide-hairline">
                {rfq.responses.map((response) => {
                  const markers = [
                    best.cheapest?.id === response.id && 'Best on cost',
                    best.fastest?.id === response.id && 'Fastest',
                    best.mostFreeTime?.id === response.id && 'Most free time',
                  ].filter(Boolean) as string[]

                  return (
                    <li key={response.id} className={cn('px-5 py-4', response.awarded && 'bg-signal/5')}>
                      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="pw-plate-title text-panel">{response.partnerName}</span>
                            {response.awarded && (
                              <StatusBadge tone="signal">
                                <Trophy className="mr-0.5 h-3 w-3" aria-hidden />
                                Awarded
                              </StatusBadge>
                            )}
                            {markers.map((m) => (
                              <span
                                key={m}
                                className="rounded-chip border border-route/25 bg-route/8 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-route shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.5)]"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                          {response.note && <p className="mt-1 text-data text-text-muted">{response.note}</p>}
                        </div>

                        <div className="flex shrink-0 flex-wrap items-end gap-6">
                          <dl className="flex gap-6">
                            <Metric label="Rate" value={moneyUsd(response.rateUsd)} strong />
                            <Metric
                              label="Transit"
                              value={transitRange(response.transitMinDays, response.transitMaxDays)}
                            />
                            <Metric label="Free time" value={`${response.freeTimeDays} days`} />
                            <Metric label="Valid to" value={formatDate(response.validUntil)} />
                          </dl>

                          {canAwardNow &&
                            (award.allowed ? (
                              <MotionButton variant="primary" size="md" onClick={() => setConfirming(response)}>
                                Award
                              </MotionButton>
                            ) : (
                              // Not a bare disabled button: it names the person
                              // who can, which is the answer to the question the
                              // room is about to ask.
                              <span className="inline-flex items-center gap-1.5 rounded-chip border border-amber/35 bg-amber/10 px-2.5 py-2 text-micro font-medium text-amber shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.5)]">
                                <Lock className="h-3 w-3" aria-hidden />
                                Needs {approver}
                              </span>
                            ))}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <IncExc title="Included" items={response.inclusions} tone="signal" />
                        <IncExc title="Not included" items={response.exclusions} tone="muted" />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          <Card className="p-5">
            <h3 className="pw-stencil">The request</h3>
            <dl className="mt-3 flex flex-col gap-2.5">
              <Row label="Mode" value={MODE_LABEL[rfq.mode] ?? rfq.mode} />
              <Row label="Equipment" value={rfq.equipment} />
              <Row label="Volume" value={`${rfq.monthlyVolume} per month`} />
              <Row label="Commodity" value={rfq.commodity} />
              <Row label="Incoterm" value={rfq.incoterm} />
              <Row label="Service" value={rfq.serviceScope} />
              <Row label="Cargo ready" value={formatDate(rfq.cargoReadyFrom)} />
              <Row label="Responses close" value={formatDate(rfq.closesAt)} />
            </dl>
          </Card>

          {(awardedBy || rfq.awardedAt) && (
            <Card className="p-5">
              <h3 className="pw-stencil">Award record</h3>
              <dl className="mt-3 flex flex-col gap-2.5">
                {awardedBy && <Row label="Awarded by" value={`${awardedBy.name} · ${awardedBy.title}`} />}
                {rfq.awardedAt && <Row label="Recorded" value={formatDate(rfq.awardedAt)} />}
                {rfq.contractId && <Row label="Contract" value={rfq.contractId} />}
              </dl>
              <p className="pw-groove mt-3 pt-2.5 text-micro leading-relaxed text-text-faint">
                Simulated approval record. Production awards need legal review of the contract terms before signature.
              </p>
            </Card>
          )}

          {rfq.notes.length > 0 && (
            <Card className="p-5">
              <h3 className="pw-stencil">Notes</h3>
              <ul className="mt-3 flex flex-col gap-2.5">
                {rfq.notes.map((n) => (
                  <li key={n} className="flex gap-2.5 text-data leading-relaxed text-text-muted">
                    <span aria-hidden className="pw-stud mt-[7px] h-1 w-1 shrink-0 text-text-faint" />
                    {n}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {/* ── Award confirmation ───────────────────────────────────────── */}
      <Modal
        open={Boolean(confirming)}
        onOpenChange={(open) => !open && setConfirming(null)}
        title="Award this request?"
        description={
          confirming
            ? `${confirming.partnerName} at ${moneyUsd(confirming.rateUsd)} per ${rfq.equipment}, ${confirming.freeTimeDays} free days.`
            : undefined
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <MotionButton variant="ghost" size="md" onClick={() => setConfirming(null)}>
              Cancel
            </MotionButton>
            <MotionButton variant="primary" size="md" onClick={() => confirming && confirmAward(confirming)}>
              Award and create contract
            </MotionButton>
          </div>
        }
      >
        <p className="text-data leading-relaxed text-text-muted">
          This creates a freight contract in {`Apex Industrial’s`} name on the awarded terms, marks the other responses
          as not taken, and takes you straight to the contract it mints. You are acting as{' '}
          <span className="font-medium text-text">
            {member.name} · {member.title}
          </span>
          .
        </p>
      </Modal>
    </PageShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   PIECES
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The one move this state affords.
 *
 * A plate rather than a banner: it is the most-read object on the screen, and
 * a request that shows a status without showing the move is a request nobody
 * can progress.
 */
function NextMove({
  title,
  body,
  cta,
  tone = 'signal',
}: {
  title: string
  body: string
  cta?: React.ReactNode
  tone?: 'signal' | 'route'
}) {
  return (
    <section className="pw-plate overflow-hidden" aria-label="What happens next">
      <div className="px-5 pb-4 pt-4">
        <p className="mb-2 flex items-center gap-2">
          <span
            aria-hidden
            className={cn('h-[3px] w-3 shrink-0 rounded-full', tone === 'signal' ? 'bg-signal/60' : 'bg-route/60')}
          />
          <span className="pw-stencil">Next on this request</span>
        </p>
        <h3 className="pw-plate-title text-[17px] leading-tight">{title}</h3>
        <p className="mt-1.5 max-w-2xl text-data leading-relaxed text-text-muted">{body}</p>
      </div>
      {cta && <div className="pw-groove px-5 pb-4 pt-3.5">{cta}</div>}
    </section>
  )
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="pw-stencil">{label}</dt>
      <dd className={cn('pw-readout mt-0.5 text-data', strong && 'font-semibold')}>{value}</dd>
    </div>
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

function IncExc({ title, items, tone }: { title: string; items: string[]; tone: 'signal' | 'muted' }) {
  const Icon = tone === 'signal' ? Check : X
  return (
    <div className="pw-rail rounded-chip px-3 py-2.5">
      <p className="pw-stencil mb-1.5">{title}</p>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-1.5 text-micro leading-snug text-text-muted">
            <Icon
              className={cn('mt-0.5 h-3 w-3 shrink-0', tone === 'signal' ? 'text-signal' : 'text-text-faint')}
              aria-hidden
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
