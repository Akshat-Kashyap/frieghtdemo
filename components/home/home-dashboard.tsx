'use client'

import Link from 'next/link'
import { ArrowRight, Blocks, Search, Sparkles } from 'lucide-react'

import { DEMO } from '@/data/copy'
import { ORGANISATION } from '@/data/org'
import { DEMO_NOW } from '@/lib/demo-clock'
import { formatStamp, formatTime } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { useHydrated } from '@/hooks/use-hydrated'
import { useActingMember } from '@/store/org-store'

import { PageShell } from '@/components/app/app-shell'
import { DemoNotice, StatusBadge } from '@/components/ui/primitives'

import { AccountMoney } from './account-money'
import { AttentionPanel } from './attention-panel'
import { LaneRates } from './lane-rates'
import { LatestInsights } from './latest-insights'
import { LiveShipment } from './live-shipment'
import { HomeSection } from './pieces'
import { AccountRail, StatusStrip } from './status-strip'

/**
 * HOME — THE FIRST SCREEN OF THE CUSTOMER APPLICATION
 * ══════════════════════════════════════════════════════════════════════════
 * Built last, on purpose. A dashboard designed before the modules it reports
 * on ends up inventing figures the rest of the product then has to live up
 * to; this one composes eleven finished modules and shows only what they
 * already hold.
 *
 * The order is an argument about what a shipper needs, in the order they need
 * it. Four counts, so they know the shape of the day. Then the one shipment
 * actually in flight, with its next deadline ticking. Then the market on the
 * lanes they buy, the money on the account, whatever is outstanding against
 * the company, what has been written recently, and the three things they are
 * most likely to want to start. Nothing on the page is a record — every band
 * is a window onto the module that owns it, with the way through stated.
 *
 * Two rules hold the whole screen together:
 *
 *   1 · **Nothing here is the forwarder's.** `selectDashboardMetrics` would
 *       hand this page `estimatedMarginInr` and `pendingVendorBills` in one
 *       call, and a customer must never see what their forwarder is making on
 *       their own boxes. The four counts are derived customer-side instead —
 *       see `customer-metrics.ts`.
 *
 *   2 · **Everything persisted waits.** Jobs, invoices, the watchlist and who
 *       you are acting as all live in localStorage, which the server cannot
 *       see. Each block gates on `useHydrated()` behind a height-matched
 *       placeholder, or the first screen of the demo visibly reflows on every
 *       reload — the most avoidable failure this product has.
 */

/**
 * The demo clock as an ISO string, resolved once.
 *
 * Everything time-shaped on this page reads from here rather than the wall
 * clock: the greeting says "morning" because the pinned instant is 09:20 IST,
 * not because of when the page happens to be opened, and it will still say
 * morning at a demo run at midnight.
 */
const DEMO_NOW_ISO = DEMO_NOW.toISOString()

/** Derived from the demo clock's own IST hour, via the shared formatter. */
function greetingFor(iso: string): string {
  const hour = Number(formatTime(iso).slice(0, 2))
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function HomeDashboard() {
  const hydrated = useHydrated()
  const member = useActingMember()

  /* First name only. "Good morning, Priya Raghavan" is a form letter; the
     name on its own is how a colleague would greet them. */
  const firstName = member.name.split(/\s+/)[0]

  return (
    <PageShell
      width="wide"
      title={
        <span className="flex flex-wrap items-baseline gap-x-2">
          {greetingFor(DEMO_NOW_ISO)},
          {hydrated ? (
            <span>{firstName}</span>
          ) : (
            /* The acting person is persisted, so the name arrives a frame
               late. This reserves its width rather than letting the heading
               jump — and it is a span carrying the skeleton surface rather
               than the <Skeleton> primitive, because that renders a block
               element and this sits inside a heading. */
            <span className="pw-skeleton inline-block h-[0.72em] w-[5ch] rounded-chip" aria-hidden />
          )}
        </span>
      }
      description={
        <>
          {ORGANISATION.shortName} · the demo clock is pinned to {formatStamp(DEMO_NOW_ISO)}, so every countdown,
          arrival and “this week” below is measured from that instant rather than from now.
        </>
      }
      actions={<DemoNotice variant="badge">{DEMO.badge}</DemoNotice>}
      notice={`${DEMO.simulatedValues} ${DEMO.financialNotice} Nothing on this page is typed in — every figure is read from the same seeded records the module it links to renders, so each one can be opened and checked.`}
    >
      <div className="flex flex-col gap-8">
        {/* ══ 1 · THE SHAPE OF THE DAY ═══════════════════════════════════ */}
        <HomeSection
          eyebrow="Today"
          title="Operations pulse"
          description="Live account readings first, then the four questions most likely to change the day."
        >
          <div className="grid gap-3">
            <AccountRail />
            <StatusStrip />
          </div>
        </HomeSection>

        {/* ══ 2 · THE SHIPMENT IN FLIGHT ═════════════════════════════════ */}
        <HomeSection
          eyebrow="In flight"
          title="Your live shipment"
          description="The job with the closest deadline, its progress, and anything open against it."
          href={ROUTES.bookings}
          linkLabel="All shipments"
        >
          <LiveShipment />
        </HomeSection>

        {/* ══ 3 · THE MARKET ON YOUR LANES ═══════════════════════════════ */}
        <HomeSection
          eyebrow="Rates"
          title="Your saved lanes this week"
          description="This week's all-in figure, how it moved against last week, and twelve weeks of shape behind it."
          href={ROUTES.rateTerminal}
          linkLabel="Rate terminal"
        >
          <LaneRates />
        </HomeSection>

        {/* ══ 4 · THE MONEY ══════════════════════════════════════════════ */}
        <HomeSection
          eyebrow="Money"
          title="Where the account stands"
          description="What is outstanding, what is late, and what is left to book against."
          href={ROUTES.finance}
          linkLabel="Finance"
        >
          <AccountMoney />
        </HomeSection>

        {/* ══ 5 · WHAT IS OUTSTANDING ════════════════════════════════════ */}
        <HomeSection
          eyebrow="Company"
          title="Needs your attention"
          description="Verification checks and company documents that are not clean, and what each one is holding up."
          href={ROUTES.business}
          linkLabel="Business profile"
        >
          <AttentionPanel />
        </HomeSection>

        {/* ══ 6 · READING ════════════════════════════════════════════════ */}
        <HomeSection
          eyebrow="Insights"
          title="Latest from the desk"
          description="Notes on the lanes, ports and charges this account actually trades on."
          href={ROUTES.insights}
          linkLabel="All insights"
        >
          <LatestInsights />
        </HomeSection>

        {/* ══ 7 · WHERE TO START ═════════════════════════════════════════ */}
        <HomeSection
          eyebrow="Start something"
          title="Quick actions"
          description="The three things a shipment usually begins with."
        >
          <QuickActions />
        </HomeSection>
      </div>
    </PageShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   QUICK ACTIONS
   ══════════════════════════════════════════════════════════════════════════
   Not role-gated, deliberately. Each of these opens a screen rather than
   committing anything — the gate belongs at the moment money is actually
   promised, which is where the request module puts it. Hiding the door to a
   page a viewer is allowed to read would teach the wrong rule.
   ══════════════════════════════════════════════════════════════════════════ */

const ACTIONS = [
  {
    href: ROUTES.search,
    icon: Search,
    title: 'Search rates',
    meta: 'Live pricing',
    tone: 'signal',
    body: 'Price a lane now and see indicative options for the cargo you are moving.',
  },
  {
    href: ROUTES.rfqs,
    icon: Blocks,
    title: 'Raise a request',
    meta: 'Partner RFQ',
    tone: 'amber',
    body: 'Put a lane to partners and compare what comes back on cost, transit and free time.',
  },
  {
    href: ROUTES.zeno,
    icon: Sparkles,
    title: 'Ask Zeno',
    meta: 'AI desk',
    tone: 'violet',
    body: 'Ask about a shipment, a rate, a port charge or a schedule in plain English.',
  },
] as const

const ACTION_TONES: Record<(typeof ACTIONS)[number]['tone'], { icon: string; badge: 'signal' | 'amber' | 'violet' }> = {
  signal: { icon: 'border-signal/30 bg-signal/12 text-signal', badge: 'signal' },
  amber: { icon: 'border-amber/35 bg-amber/14 text-amber', badge: 'amber' },
  violet: { icon: 'border-violet/30 bg-violet/12 text-violet', badge: 'violet' },
}

function QuickActions() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {ACTIONS.map((action) => {
        const Icon = action.icon
        const tone = ACTION_TONES[action.tone]
        return (
          <li key={action.href} className="flex">
            <Link
              href={action.href}
              className="pw-card pw-lift group flex min-h-[154px] w-full min-w-0 flex-col justify-between gap-4 p-4"
            >
              <span className="flex items-start justify-between gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-chip border shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.55)] ${tone.icon}`}
                  aria-hidden
                >
                  <Icon className="h-4 w-4" />
                </span>
                <StatusBadge tone={tone.badge} dot={false} className="max-w-[9rem] truncate">
                  {action.meta}
                </StatusBadge>
              </span>

              <span className="min-w-0">
                <span className="flex items-center gap-2 text-data font-semibold text-text">
                  {action.title}
                  <ArrowRight
                    className="h-3.5 w-3.5 text-text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-signal"
                    aria-hidden
                  />
                </span>
                <span className="mt-2 block text-[12px] leading-relaxed text-text-muted">{action.body}</span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
