'use client'

import Link from 'next/link'
import { Banknote, Info, Lock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { DEMO } from '@/data/copy'
import {
  ADVANCE_STATUS_LABEL,
  FACTORING,
  advanceAmount,
  advanceFee,
  advanceNetProceeds,
  advanceRetention,
  advanceSummary,
  advancesForAccount,
  type AdvanceStatus,
  type ExportAdvance,
} from '@/data/customer-finance'
import { formatDate, money, percent } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { useActingMember, useCan } from '@/store/org-store'

import { Card, MotionButton, StatusBadge, type Tone } from '@/components/ui/primitives'
import { CountdownPill } from '@/components/ui/freight'

import { CardHeading, Figure, FigureRail, NoteList, RecordPanel, TabIntro, type FigureSpec } from './pieces'

/**
 * Export factoring.
 *
 * The modelling decision worth stating: the invoice being financed is the
 * customer's OWN commercial invoice on the export sale, not a PortWhizz
 * freight invoice. PortWhizz invoices this company, so a PortWhizz invoice is
 * a payable to them — and nobody factors a payable. Where a freight invoice
 * exists on the same shipment it is linked alongside, because a controller
 * reconciling the shipment wants both, but the two are different documents
 * owed in opposite directions.
 *
 * One offer is live so the tab holds an actual decision rather than a
 * read-only ledger, and the decision is gated at the point of action.
 */

const STATUS_TONE: Record<AdvanceStatus, Tone> = {
  OFFERED: 'amber',
  ACTIVE: 'route',
  SETTLED: 'signal',
  DECLINED: 'muted',
}

export function AdvancesTab() {
  const member = useActingMember()
  /**
   * Re-checked here rather than inherited from the module frame.
   *
   * A capability check belongs next to the action it guards: the frame
   * decides whether the figures are visible, this decides whether the
   * company can be committed to a fee, and those are different questions
   * that could reasonably diverge.
   */
  const finance = useCan('finance')

  const advances = useMemo(() => advancesForAccount(), [])
  const summary = useMemo(() => advanceSummary(advances), [advances])

  /**
   * Acceptances are held for this session only.
   *
   * There is no store action for an advance — the freight store owns the job
   * file, and an advance is a record between the customer and a financing
   * partner. Rather than fake persistence, the row states plainly that the
   * acceptance lives until the page is reloaded.
   */
  const [acceptedInSession, setAcceptedInSession] = useState<ReadonlySet<string>>(new Set())

  function accept(advance: ExportAdvance) {
    setAcceptedInSession((current) => new Set(current).add(advance.id))
    toast.success('ADVANCE ACCEPTED', {
      description: `${money(advanceNetProceeds(advance))} net of fee against ${advance.exportInvoiceRef}. ${advance.financierName} releases funds once the transport document is issued.`,
      duration: 10_000,
    })
  }

  const offered = advances.filter((a) => a.status === 'OFFERED' && !acceptedInSession.has(a.id))
  const rest = advances.filter((a) => !offered.includes(a))

  return (
    <div className="flex flex-col gap-5">
      <TabIntro>{FACTORING.summary}</TabIntro>

      {/* ── The position ─────────────────────────────────────────────── */}
      <RecordPanel
        icon={<Banknote className="h-4 w-4 shrink-0 text-signal" aria-hidden />}
        title="Advances on this account"
        meta={`Arranged with ${advances[0]?.financierName ?? 'a financing partner'}`}
        footnote="PortWhizz coordinates the arrangement and links each advance to the shipment behind it. The financing partner advances the money and collects from your buyer."
      >
        <FigureRail
          columns={4}
          figures={[
            {
              label: 'Advanced and running',
              value: money(summary.outstandingInr),
              strong: true,
              tone: 'route',
              sub: `${summary.activeCount} advance${summary.activeCount === 1 ? '' : 's'} not yet settled`,
            },
            {
              label: 'Export invoice value behind it',
              value: money(summary.faceValueOutstandingInr),
              sub: 'What your buyers owe on those shipments',
            },
            {
              label: 'Fees on the running advances',
              value: money(summary.feesOnOutstandingInr),
              tone: 'amber',
              sub: 'Charged on the amount advanced, across the tenor',
            },
            {
              label: 'Offers open',
              value: String(summary.offeredCount),
              tone: summary.offeredCount > 0 ? 'amber' : undefined,
              sub: summary.offeredCount > 0 ? 'Waiting on a decision' : 'Nothing awaiting a decision',
            },
          ]}
        />
      </RecordPanel>

      {/* ── The live decision ────────────────────────────────────────── */}
      {offered.length > 0 && (
        <div className="flex flex-col gap-3">
          {offered.map((advance) => (
            <AdvanceCard
              key={advance.id}
              advance={advance}
              highlight
              action={
                <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
                  <MotionButton
                    variant={finance.allowed ? 'primary' : 'outline'}
                    size="md"
                    disabled={!finance.allowed}
                    title={finance.reason ?? undefined}
                    onClick={() => accept(advance)}
                  >
                    {finance.allowed ? 'Accept the advance' : 'Approval needed'}
                  </MotionButton>
                  {!finance.allowed && (
                    <p className="flex items-start gap-1.5 text-[11px] leading-snug text-amber">
                      <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                      {finance.reason}
                    </p>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}

      {/* ── Everything else on the account ───────────────────────────── */}
      <div className="flex flex-col gap-3">
        {rest.map((advance) => (
          <AdvanceCard
            key={advance.id}
            advance={advance}
            acceptedInSession={acceptedInSession.has(advance.id)}
          />
        ))}
      </div>

      {/* ── What to watch for ────────────────────────────────────────── */}
      <Card className="p-5">
        <CardHeading icon={<Info className="h-3.5 w-3.5" aria-hidden />}>Worth knowing before you draw</CardHeading>
        <NoteList className="mt-3" tone="amber" items={FACTORING.notes} />
        <p className="mt-4 border-t border-hairline pt-3 text-micro leading-relaxed text-text-faint shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.7)]">
          {DEMO.financialNotice} An acceptance recorded here is held for this session only and is not an instruction to
          any financing partner. You are acting as {member.name} · {member.title}.
        </p>
      </Card>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   ONE ADVANCE
   ══════════════════════════════════════════════════════════════════════════ */

function AdvanceCard({
  advance,
  action,
  highlight,
  acceptedInSession,
}: {
  advance: ExportAdvance
  action?: React.ReactNode
  highlight?: boolean
  acceptedInSession?: boolean
}) {
  const advanced = advanceAmount(advance)
  const fee = advanceFee(advance)
  const net = advanceNetProceeds(advance)
  const held = advanceRetention(advance)

  // An offer has not paid anything out yet, so the figure is in a different
  // tense from the same figure on a running advance. Once it is accepted in
  // this session it reads as drawn, which is what the viewer just did.
  const advancedLabel =
    advance.status === 'OFFERED' && !acceptedInSession ? 'Would be advanced' : 'Advanced'

  return (
    <Card className={cn('overflow-hidden p-0', highlight && 'border-amber/35')}>
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-hairline px-5 py-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-panel font-semibold text-text">{advance.shipmentLabel}</span>
            <StatusBadge tone={acceptedInSession ? 'signal' : STATUS_TONE[advance.status]}>
              {acceptedInSession ? 'Accepted' : ADVANCE_STATUS_LABEL[advance.status]}
            </StatusBadge>
            {advance.status === 'OFFERED' && advance.offerExpiresAt && !acceptedInSession && (
              <CountdownPill deadline={advance.offerExpiresAt} />
            )}
          </div>

          <p className="mt-1 text-[11px] text-text-faint">
            <span className="pw-id">{advance.id}</span> · export invoice{' '}
            <span className="pw-id">{advance.exportInvoiceRef}</span> · {advance.buyerName},{' '}
            {advance.buyerCountry} · {advance.financierName}
          </p>

          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-faint">
            {advance.jobId && (
              <Link href={ROUTES.booking(advance.jobId)} className="pw-id text-route hover:underline">
                {advance.jobId}
              </Link>
            )}
            {advance.invoiceId && (
              <span>
                Freight invoice on the same shipment: <span className="pw-id">{advance.invoiceId}</span>
              </span>
            )}
          </p>
        </div>

        {action}
      </header>

      {/* A declined invoice has no fee and no proceeds — showing them anyway
          would put money on the row that never moved. The terms it was
          declined on are shown instead, because that is the informative part. */}
      {advance.status === 'DECLINED' ? (
        <dl className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <Figure
            label="Export invoice value"
            value={money(advance.faceValueInr)}
            sub={`${advance.buyerName} · ${advance.buyerCountry}`}
          />
          <Figure
            label="Terms under discussion"
            value={`${percent(advance.advanceRatePct, 0)} over ${advance.tenorDays} days`}
            sub={`${percent(advance.feeRatePct, 2)} fee · ${money(advanced)} would have been advanced`}
          />
        </dl>
      ) : (
        <dl className="grid gap-4 px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
          <Figure
            label="Export invoice value"
            value={money(advance.faceValueInr)}
            sub={`${percent(advance.advanceRatePct, 0)} advance rate`}
          />
          <Figure
            label={advancedLabel}
            value={money(advanced)}
            strong
            tone="route"
            sub={
              advance.advancedAt
                ? `Drawn ${formatDate(advance.advancedAt)}`
                : 'Released on issue of the transport document'
            }
          />
          <Figure
            label="Fee"
            value={money(fee)}
            tone="amber"
            sub={`${percent(advance.feeRatePct, 2)} of the advance over ${advance.tenorDays} days`}
          />
          <Figure
            label="Net proceeds"
            value={money(net)}
            tone="signal"
            sub={`${money(held)} held back until your buyer settles`}
          />
        </dl>
      )}

      <div className="border-t border-hairline px-5 py-3">
        <p className="text-[12px] leading-relaxed text-text-muted">{advance.note}</p>

        {advance.declineReason && (
          <p className="mt-2 flex gap-2 text-[12px] leading-relaxed text-text-muted">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-critical" aria-hidden />
            {advance.declineReason}
          </p>
        )}

        {acceptedInSession && (
          <p className="mt-2 text-[11px] leading-relaxed text-signal">
            Accepted in this session. The record is held until the page is reloaded — it is not an instruction to the
            financing partner.
          </p>
        )}

        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-faint">
          <span>Offered {formatDate(advance.offeredAt)}</span>
          <span>Tenor {advance.tenorDays} days</span>
          <span>
            {advance.settledAt
              ? `Settled ${formatDate(advance.settledAt)}`
              : `Settlement expected ${formatDate(advance.expectedSettlementAt)}`}
          </span>
        </p>
      </div>
    </Card>
  )
}
