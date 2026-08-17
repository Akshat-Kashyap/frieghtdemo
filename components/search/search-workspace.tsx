'use client'

import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Bookmark, BookmarkCheck, Blocks, Clock, ShieldCheck } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'

import type { Contract, ContractLaneRate } from '@/data/contracts'
import { LANES } from '@/data/lanes'
import { RATE_BASIS, RATE_DISCLAIMER, currentRate, rateInContext } from '@/data/rate-grid'
import { requirePort } from '@/data/ports'
import { moneyUsd, percentSigned, transitRange } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { useHydrated } from '@/hooks/use-hydrated'
import { useSafeReducedMotion } from '@/hooks/use-safe-reduced-motion'
import { useContracts, useRfqs } from '@/store/hooks'
import { useIntakeStore } from '@/store/intake-store'
import { useOrgStore } from '@/store/org-store'
import type { IndicativeOption } from '@/types'

import { PageShell } from '@/components/app/app-shell'
import { MotionButton, Panel, Skeleton, StatPlate, StatusBadge } from '@/components/ui/primitives'
import { EnquiryDrawer } from '@/components/intake/enquiry-drawer'
import { IndicativeOptions } from '@/components/intake/indicative-options'
import { ChainRail } from '@/components/shipment/journey'
import { FreightSearch } from './freight-search'

/**
 * SEARCH RATES — the head of the chain
 * ══════════════════════════════════════════════════════════════════════════
 * The same search bar the marketing page uses, with four things a logged-in
 * customer gets that a visitor does not:
 *
 *  · **Their contract rate**, where one covers the lane. A customer under
 *    contract will not be charged spot, so showing spot alone would be
 *    actively misleading.
 *  · **The rate in context** — how this week compares with the eight-week
 *    average. A number with no history cannot answer "should I book now?".
 *  · **A way out when there is no rate**, into a request for quotation,
 *    which is how the fallback actually works in the trade.
 *  · **A way back in when the request has been won** — see below.
 *
 * WHY THE CONTRACT LOOKUP IS NOT `contractRateFor()`. That helper reads the
 * authored `CONTRACTS` array and matches on a `laneId` from `data/lanes.ts`,
 * which breaks the demo's most important loop in two separate ways. A contract
 * minted in this session by awarding a request is in the STORE and not in the
 * authored array, so it was invisible here; and a request is raised precisely
 * because the pair has no published lane, so the pair it covers has no `laneId`
 * to match on either. Awarding Ningbo → Mundra and searching it again therefore
 * still said "no live rate on this pair" — the one screen that should have
 * proved the award landed. This matches store contracts on the actual endpoints.
 */

/** The live contract covering this pair and equipment, from the store. */
function contractCover(
  contracts: Contract[],
  originId: string | undefined,
  destinationId: string | undefined,
  equipment: string,
): { contract: Contract; lane: ContractLaneRate } | undefined {
  if (!originId || !destinationId) return undefined
  for (const c of contracts) {
    if (c.status !== 'ACTIVE' && c.status !== 'EXPIRING') continue
    const lane = c.lanes.find(
      (l) => l.originId === originId && l.destinationId === destinationId && l.equipment === equipment,
    )
    if (lane) return { contract: c, lane }
  }
  return undefined
}

export function SearchWorkspace() {
  const hydrated = useHydrated()
  const shouldReduce = useSafeReducedMotion()
  const draft = useIntakeStore((s) => s.draft)
  const watchlist = useOrgStore((s) => s.watchlist)
  const toggleWatchlist = useOrgStore((s) => s.toggleWatchlist)
  const contracts = useContracts()
  const rfqs = useRfqs()

  const [options, setOptions] = useState<IndicativeOption[] | null>(null)
  const [selected, setSelected] = useState<IndicativeOption | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  const laneId = useMemo(() => {
    if (!draft.originId || !draft.destinationId) return null
    return (
      LANES.find(
        (l) => l.originId === draft.originId && l.destinationId === draft.destinationId && l.mode === draft.mode,
      )?.id ?? null
    )
  }, [draft.originId, draft.destinationId, draft.mode])

  const equipment = draft.cargo.containers?.[0]?.isoType === '20FT' ? '20FT' : '40HC'
  const live = laneId ? currentRate(draft.originId!, draft.destinationId!, equipment) : undefined
  const context = laneId ? rateInContext(laneId, equipment) : null
  const covered = useMemo(
    () => contractCover(contracts, draft.originId, draft.destinationId, equipment),
    [contracts, draft.originId, draft.destinationId, equipment],
  )
  const watched = laneId ? watchlist.includes(laneId) : false

  /** Requests that have stalled on an approval — the other half of this screen. */
  const awaitingApproval = useMemo(() => rfqs.filter((r) => r.status === 'UNDER_REVIEW').length, [rfqs])

  const hasPair = Boolean(draft.originId && draft.destinationId)

  const handleOptionsReady = useCallback(
    (next: IndicativeOption[]) => {
      setOptions(next)
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: shouldReduce ? 'auto' : 'smooth', block: 'start' })
      })
    },
    [shouldReduce],
  )

  return (
    <PageShell
      width="wide"
      title="Search rates"
      description="Price a lane now, or raise a request when it needs a partner to quote it. Picking an option creates the shipment — it does not send an email into a void."
      actions={<ChainRail current="search" />}
      notice={RATE_DISCLAIMER}
    >
      <FreightSearch onOptionsReady={handleOptionsReady} />

      {/* ── An approval already blocking someone ──────────────────────────
          Placed here rather than only on the requests list because this is
          where a customer arrives when a lane will not price, and a request
          sitting unawarded while its partner rates lapse is the failure the
          whole module exists to prevent. */}
      {hydrated && awaitingApproval > 0 && (
        <Link
          href={ROUTES.rfqs}
          className="pw-card pw-lift mt-5 flex items-start gap-3 px-4 py-3 no-underline"
        >
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden />
          <p className="min-w-0 flex-1 text-data leading-relaxed text-text-muted">
            <span className="font-medium text-text">
              {awaitingApproval} request{awaitingApproval === 1 ? '' : 's'} awaiting approval.
            </span>{' '}
            Partner rates expire on their own terms — an award taken after they lapse is a re-tender.
          </p>
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" aria-hidden />
        </Link>
      )}

      {/* ── What we know about this lane before you even search ─────── */}
      {hasPair && (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {!hydrated ? (
            <>
              <Skeleton className="h-[150px]" />
              <Skeleton className="h-[150px]" />
              <Skeleton className="h-[150px]" />
            </>
          ) : (
            <>
              {covered && (
                <StatPlate
                  label="Your contract rate"
                  value={moneyUsd(covered.lane.rateUsd)}
                  unit={`per ${equipment}`}
                  tone="signal"
                  trailing={<StatusBadge tone="signal">Contracted</StatusBadge>}
                  hint={`${covered.lane.freeTimeDays} free days · ${transitRange(covered.lane.transitMinDays, covered.lane.transitMaxDays)} transit. This is what you pay, not the spot rate.`}
                  footer={
                    <Link
                      href={ROUTES.contract(covered.contract.id)}
                      className="inline-flex items-center gap-1.5 font-medium text-signal hover:underline"
                    >
                      <ShieldCheck className="h-3 w-3" aria-hidden />
                      {covered.contract.id} · {covered.contract.partnerName}
                    </Link>
                  }
                />
              )}

              {live && (
                <StatPlate
                  label="Spot this week"
                  value={moneyUsd(live.cell.amountUsd)}
                  unit={`per ${equipment}`}
                  delta={
                    context
                      ? {
                          value: percentSigned(context.deltaPct, 0),
                          direction: context.deltaPct > 2 ? 'up' : context.deltaPct < -2 ? 'down' : 'flat',
                          // On a buyer's screen a rate going UP is the thing
                          // that costs them money, so up is amber, not green.
                          tone: context.deltaPct > 2 ? 'amber' : context.deltaPct < -2 ? 'signal' : 'neutral',
                          caption: `on the ${context.weeks}-week average`,
                        }
                      : undefined
                  }
                  hint={
                    covered
                      ? 'Shown for comparison. Your contract is what gets charged.'
                      : (context?.label ?? undefined)
                  }
                />
              )}

              <StatPlate
                label="This lane"
                value={requirePort(draft.originId!).code}
                unit={`→ ${requirePort(draft.destinationId!).code}`}
                hint={`${requirePort(draft.originId!).name} → ${requirePort(draft.destinationId!).name}`}
                footer={
                  <span className="flex flex-wrap items-center gap-2">
                    {laneId && (
                      <button
                        type="button"
                        onClick={() => toggleWatchlist(laneId)}
                        className="pw-tactile inline-flex min-h-[32px] items-center gap-1.5 rounded-chip px-2.5 text-micro font-medium text-text"
                      >
                        {watched ? (
                          <>
                            <BookmarkCheck className="h-3.5 w-3.5 text-signal" aria-hidden />
                            On your rate terminal
                          </>
                        ) : (
                          <>
                            <Bookmark className="h-3.5 w-3.5" aria-hidden />
                            Save to rate terminal
                          </>
                        )}
                      </button>
                    )}
                    <Link
                      href={ROUTES.rateTerminal}
                      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-chip px-1 font-medium text-text-muted transition-colors hover:text-signal"
                    >
                      Open terminal
                      <ArrowRight className="h-3 w-3" aria-hidden />
                    </Link>
                  </span>
                }
              />
            </>
          )}
        </div>
      )}

      {/* ── No live rate → the request route ─────────────────────────── */}
      {hydrated && !laneId && !covered && hasPair && (
        <Panel className="mt-5 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="pw-plate-title text-body">No live rate on this pair</p>
            <p className="mt-1 max-w-2xl text-data leading-relaxed text-text-muted">
              This lane is not on your contract or in this week’s rate grid. Raise a request and partners quote it —
              that is the normal route for a new pair, unusual equipment, or a volume you want tendered. The winning
              response becomes a contract, and this lane then prices off it.
            </p>
          </div>
          <MotionButton variant="primary" size="lg" asChild className="shrink-0">
            <Link href={ROUTES.rfqs}>
              <Blocks className="h-4 w-4" aria-hidden />
              Raise a request
            </Link>
          </MotionButton>
        </Panel>
      )}

      <p className="mt-4 text-micro leading-relaxed text-text-faint">{RATE_BASIS}</p>

      {/* ── Results ──────────────────────────────────────────────────── */}
      <div ref={resultsRef} className="scroll-mt-24">
        <AnimatePresence mode="wait">
          {options && (
            <motion.div
              key="options"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={shouldReduce ? { duration: 0 } : { duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8"
            >
              <IndicativeOptions
                options={options}
                onModify={() => setOptions(null)}
                onSelect={(option) => {
                  setSelected(option)
                  setDrawerOpen(true)
                }}
              />

              {/* Say what the next click does BEFORE it is made. The drawer
                  that follows creates six records and navigates away from
                  this page; a viewer who did not expect that reads the jump
                  as the demo losing its place. */}
              <p className={cn('mt-3 text-micro leading-relaxed text-text-faint')}>
                Choosing an option opens a confirmation, then creates the shipment file and takes you to it. Nothing is
                sent to a carrier.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <EnquiryDrawer
        option={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onModify={() => setOptions(null)}
      />
    </PageShell>
  )
}
