'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { Suspense } from 'react'

import { DEMO } from '@/data/copy'
import { ROUTES } from '@/lib/routes'
import { useHydrated } from '@/hooks/use-hydrated'
import { useActingMember, useCan } from '@/store/org-store'

import { PageShell } from '@/components/app/app-shell'
import { Skeleton } from '@/components/ui/primitives'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays'

import { GateNotice, RecordPanel } from './pieces'

import { AdvancesTab } from './advances-tab'
import { CostAlertsTab } from './cost-alerts-tab'
import { CreditTab } from './credit-tab'
import { DocumentsTab } from './documents-tab'
import { InvoicesTab } from './invoices-tab'
import { OverviewTab } from './overview-tab'

/**
 * FINANCE — the money side of the account.
 *
 * Six sections that a freight customer's finance controller actually works
 * from: what is owed, what can still be booked on credit, the invoices
 * themselves, the advances taken against export receivables, the charges the
 * account is exposed to but has not yet incurred, and the paperwork behind
 * all of it.
 *
 * Two decisions shape this file.
 *
 * The selected tab lives in the URL, not in state. A finance conversation is
 * a conversation about a specific screen — "look at the cost alerts" has to
 * be a link someone can send, and the back button has to return to the tab
 * they came from rather than to the previous page.
 *
 * The whole module sits behind one capability. Credit limits, outstanding
 * balances and factoring terms are commercially sensitive inside the
 * customer's own organisation, not merely read-only to other roles — so the
 * gate hides the figures rather than disabling the buttons over them. A
 * module that greys out its actions while leaving the numbers on screen has
 * not restricted anything.
 */

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'credit', label: 'Credit' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'advances', label: 'Advances' },
  { key: 'cost-alerts', label: 'Cost alerts' },
  { key: 'documents', label: 'Documents' },
] as const

type TabKey = (typeof TABS)[number]['key']

const TAB_KEYS = TABS.map((t) => t.key) as readonly string[]

/** What the module holds — shown to people who cannot open it. */
const MODULE_CONTENTS: Array<{ title: string; body: string }> = [
  {
    title: 'Credit and PayLater',
    body: 'The limit on this account, how much of it is drawn, the credit period, and what would move the limit.',
  },
  {
    title: 'Invoices and payments',
    body: 'Every invoice raised against this company, what has been paid against each one, and the balance carried.',
  },
  {
    title: 'Export factoring advances',
    body: 'Advances taken against export invoices, the fee on each, and any offer waiting on a decision.',
  },
  {
    title: 'Detention and storage exposure',
    body: 'What each live shipment would cost per day if it ran past its free time at the destination port.',
  },
  {
    title: 'The finance document vault',
    body: 'Facility agreements, invoice and credit-note formats, and the commercial paperwork behind the account.',
  },
]

export function FinanceWorkspace() {
  // `useSearchParams` opts the subtree into client rendering, and Next
  // requires the boundary to be explicit. Without it the whole route falls
  // back to dynamic rendering with no fallback of its own.
  return (
    <Suspense
      fallback={
        <FinanceFrame>
          <WorkspaceSkeleton />
        </FinanceFrame>
      }
    >
      <FinanceWorkspaceInner />
    </Suspense>
  )
}

function FinanceWorkspaceInner() {
  const hydrated = useHydrated()
  const router = useRouter()
  const params = useSearchParams()
  const member = useActingMember()
  const finance = useCan('finance')

  // An unknown or absent ?tab= falls back rather than rendering nothing — a
  // stale link from a previous build should land somewhere, not on a blank
  // panel with the tab strip showing no selection.
  const requested = params.get('tab') ?? ''
  const tab = (TAB_KEYS.includes(requested) ? requested : 'overview') as TabKey

  /**
   * One hydration gate for the module rather than one per tab.
   *
   * The acting member is itself persisted, so before rehydration this
   * component cannot know whether the viewer may see any of it. Gating each
   * tab separately would render the frame for the default role and then
   * swap it out — a visible flash of the wrong permission, which is the one
   * flash a permissions demo must not have.
   */
  if (!hydrated) {
    return (
      <FinanceFrame>
        <WorkspaceSkeleton />
      </FinanceFrame>
    )
  }

  if (!finance.allowed) {
    return (
      <FinanceFrame>
        <FinanceLocked reason={finance.reason} actingAs={`${member.name} · ${member.title}`} />
      </FinanceFrame>
    )
  }

  return (
    <FinanceFrame>
      <Tabs
        value={tab}
        onValueChange={(next) => router.replace(ROUTES.financeTab(next), { scroll: false })}
        className="flex flex-col gap-5"
      >
        <TabsList aria-label="Finance sections">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key} layoutGroup="finance-tabs">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="credit">
          <CreditTab />
        </TabsContent>
        <TabsContent value="invoices">
          <InvoicesTab />
        </TabsContent>
        <TabsContent value="advances">
          <AdvancesTab />
        </TabsContent>
        <TabsContent value="cost-alerts">
          <CostAlertsTab />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab />
        </TabsContent>
      </Tabs>
    </FinanceFrame>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   THE FRAME
   Identical whether or not the viewer may see inside it, so switching person
   in the top bar changes the contents rather than the page.
   ══════════════════════════════════════════════════════════════════════════ */

function FinanceFrame({ children }: { children: React.ReactNode }) {
  return (
    <PageShell
      width="wide"
      title="Finance"
      description="What this account owes, what it can still book on credit, and what a delayed shipment would cost before it costs it."
      notice={DEMO.financialNotice}
    >
      {children}
    </PageShell>
  )
}

/**
 * Matched-height placeholder.
 *
 * The four Overview tiles and the panel under them are what lands first, so
 * that is what the skeleton is shaped like — a placeholder of the wrong
 * height makes the page jump the moment persisted state arrives.
 */
function WorkspaceSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-[44px]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          // Matched to a `StatPlate`: stencil, 28px figure, hint, groove and
          // footer strip. A placeholder of the wrong height makes the page
          // jump the instant persisted state arrives.
          <Skeleton key={i} className="h-[150px] rounded-panel" />
        ))}
      </div>
      <Skeleton className="h-[132px] rounded-panel" />
      <Skeleton className="h-[196px] rounded-panel" />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   THE GATE
   ══════════════════════════════════════════════════════════════════════════ */

function FinanceLocked({ reason, actingAs }: { reason: string | null; actingAs: string }) {
  return (
    <div className="flex flex-col gap-5">
      <GateNotice allowed={false}>
        <span className="font-medium text-text">Finance is not yours to open.</span> {reason} Switch person in the top
        bar to continue.
      </GateNotice>

      <RecordPanel
        icon={<ShieldCheck className="h-4 w-4 shrink-0 text-signal" aria-hidden />}
        title="What this module holds"
        meta={`Acting as ${actingAs}`}
        footnote="Balances, limits and factoring terms are held back entirely rather than shown behind disabled controls. Restricting the actions while leaving the figures visible would not restrict anything."
      >
        <ul className="divide-y divide-hairline">
          {MODULE_CONTENTS.map((item) => (
            <li key={item.title} className="px-5 py-3">
              <p className="text-data font-medium text-text">{item.title}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </RecordPanel>
    </div>
  )
}
