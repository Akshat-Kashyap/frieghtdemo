'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { Suspense, useMemo } from 'react'

import { CONTRACTS } from '@/data/contracts'
import { DEMO } from '@/data/copy'
import { ORG_ID } from '@/data/org'
import { requirePort } from '@/data/ports'
import { DEMO_NOW_MS, isPast } from '@/lib/demo-clock'
import { formatDate, formatDateShort } from '@/lib/format'
import { CUSTOMER_PROGRESS, MODE_LABEL, RELEASE_TYPE_LABEL, customerProgressIndex } from '@/lib/lifecycle'
import { ROUTES } from '@/lib/routes'
import { useHydrated } from '@/hooks/use-hydrated'
import { useJobFile } from '@/store/hooks'
import type { Booking } from '@/types'

import { PageShell } from '@/components/app/app-shell'
import {
  EmptyState,
  InstrumentRail,
  Panel,
  Skeleton,
  type InstrumentReading,
} from '@/components/ui/primitives'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays'
import { CountdownPill, JobStatusBadge, LanePill, ModeBadge, ProgressRail } from '@/components/ui/freight'
import { ChainRail, NextStepPlate } from '@/components/shipment/journey'
import { CargoTab, DocumentsTab, OverviewTab, TimelineTab } from '@/components/shipment/tabs'
import { InvoiceTab } from './invoice-tab'

/**
 * A SHIPMENT, FROM THE CUSTOMER'S SIDE — the demo's centrepiece
 * ══════════════════════════════════════════════════════════════════════════
 * Five tabs, and the two that exist in the operations view — costs and audit
 * — are deliberately absent. A customer sees what was agreed and what has
 * happened; buy rates, partner margin and internal notes are not theirs.
 *
 * The page is built in the order the questions are asked, and each region has
 * exactly one job:
 *
 *  1. WHERE IT SITS IN THE CHAIN. A shipment did not appear from nowhere — it
 *     came from a search, a request or a contract, and the rail says so.
 *  2. WHAT HAPPENS NEXT, and whose move it is. This is the plate, and it is
 *     the loudest thing on the screen for a reason: a screen that shows a
 *     state without naming the next action ends the demo, because the person
 *     presenting has to explain what should have happened instead of clicking
 *     it. It is `NextStepPlate` from the journey module, so this page and the
 *     shipment list can never disagree about what is owed.
 *  3. THE LIVE READINGS — arrival, the next cutoff that can cost a sailing,
 *     and how long the boxes may sit before demurrage starts. They are in an
 *     instrument rail because they are measurements, not fields.
 *  4. THE RECORD, in tabs.
 */

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'cargo', label: 'Cargo' },
  { key: 'documents', label: 'Documents' },
  { key: 'invoice', label: 'Invoice' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function BookingDetail({ id }: { id: string }) {
  return (
    <Suspense fallback={<PageShell title="Shipment"><Skeleton className="h-[420px]" /></PageShell>}>
      <BookingDetailInner id={id} />
    </Suspense>
  )
}

/**
 * The next cutoff that has not passed.
 *
 * Read from the pinned demo clock rather than the wall clock: a reload has to
 * render the identical shipment or the "fixed, checkable dataset" argument of
 * the whole demo falls over.
 */
function nextCutoff(booking: Booking): { label: string; at: string } | null {
  const all = [
    { label: 'Shipping instruction', at: booking.cutoffs.shippingInstruction },
    { label: 'VGM', at: booking.cutoffs.vgm },
    { label: 'Gate-in', at: booking.cutoffs.gateIn },
    { label: 'Documentation', at: booking.cutoffs.documentation },
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

  return all.find((c) => !isPast(c.at, DEMO_NOW_MS)) ?? null
}

function BookingDetailInner({ id }: { id: string }) {
  const hydrated = useHydrated()
  const router = useRouter()
  const params = useSearchParams()
  const file = useJobFile(id)

  const tab = (params.get('tab') as TabKey) ?? 'overview'

  const customerExceptions = useMemo(
    () => file?.openExceptions.filter((e) => e.customerVisible) ?? [],
    [file],
  )

  if (!hydrated) {
    return (
      <PageShell title="Shipment">
        <Skeleton className="h-[420px]" />
      </PageShell>
    )
  }

  if (!file || file.job.customerId !== ORG_ID) {
    return (
      <PageShell title="Shipment">
        <Panel className="p-8">
          <EmptyState
            title={`No shipment with id ${id}`}
            description="It is not on this account, or it was created in a session that has since been reset."
            action={
              <Link href={ROUTES.bookings} className="text-data font-medium text-signal hover:underline">
                Back to your shipments
              </Link>
            }
          />
        </Panel>
      </PageShell>
    )
  }

  const { job, booking, quotes, acceptedQuote, invoice, containers } = file
  const origin = requirePort(job.originId)
  const destination = requirePort(job.destinationId)
  // The contract this shipment drew on, if one claims it.
  const contract = CONTRACTS.find((c) => c.linkedJobIds.includes(job.id))
  const cutoff = booking ? nextCutoff(booking) : null
  const etaRevised = Boolean(booking && booking.originalEta && booking.eta !== booking.originalEta)

  /* ── The live readings ──────────────────────────────────────────────────
     Only what is measured and moving. Everything static about the booking —
     terminals, MBL, service — lives on the Overview tab, because a rail that
     carries eleven readings is a table with a shadow. */
  const readings: InstrumentReading[] = booking
    ? [
        {
          label: 'Estimated arrival',
          value: formatDate(booking.eta),
          tone: etaRevised ? 'amber' : 'neutral',
          hint: etaRevised
            ? `Revised from ${formatDateShort(booking.originalEta)}`
            : 'On the schedule it was booked against',
        },
        {
          label: 'Next cutoff',
          value: cutoff ? cutoff.label : 'All passed',
          tone: cutoff ? 'neutral' : 'signal',
          trailing: cutoff ? <CountdownPill deadline={cutoff.at} live showIcon={false} /> : undefined,
          hint: cutoff ? 'Miss it and the box misses the sailing' : 'Nothing outstanding before departure',
        },
        {
          label: 'Free time',
          value: booking.freeTimeDays,
          unit: 'days',
          hint: `Demurrage from ${formatDateShort(booking.freeTimeExpiry)}`,
        },
        {
          label: 'Release',
          value: RELEASE_TYPE_LABEL[booking.releaseType],
          hint: `Carrier ${booking.carrierName}`,
        },
      ]
    : []

  return (
    <PageShell
      width="wide"
      title={
        <span className="flex flex-wrap items-center gap-3">
          <span className="pw-id">{job.id}</span>
          <JobStatusBadge status={job.status} />
        </span>
      }
      description={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <LanePill origin={origin.name} destination={destination.name} />
          <span aria-hidden className="text-text-faint">
            ·
          </span>
          <span className="pw-readout text-micro text-text-faint">{job.reference}</span>
          {booking && (
            <>
              <span aria-hidden className="text-text-faint">
                ·
              </span>
              <span className="pw-readout text-micro text-text-faint">
                {booking.vessel} {booking.voyage}
              </span>
            </>
          )}
        </span>
      }
      actions={<ModeBadge mode={job.mode} label={MODE_LABEL[job.mode]} />}
      notice={DEMO.timelineLabel}
    >
      <div className="flex min-w-0 flex-col gap-5">
        <ChainRail current="shipment" />

        {/* ── What happens next, and whose move it is ─────────────────── */}
        <NextStepPlate
          input={{
            job,
            quote: acceptedQuote ?? quotes[0],
            booking,
            invoice,
            containers,
            openExceptions: customerExceptions.length,
          }}
        />

        {/* ── Where it has got to, and what the instruments read ──────── */}
        <Panel className="overflow-hidden">
          {/* Seven legs with their names on do not fit a phone, and a journey
              with the labels stripped off is a row of dots. So it scrolls
              inside its own box — `min-w-0` on the wrapper is what allows
              that, since a flex child otherwise refuses to shrink below its
              content and pushes the page instead. */}
          <div className="min-w-0 overflow-x-auto px-5 pb-4 pt-5">
            <div className="min-w-[540px]">
              <ProgressRail steps={CUSTOMER_PROGRESS} currentIndex={customerProgressIndex(job.status)} />
            </div>
          </div>

          {readings.length > 0 && (
            <InstrumentRail
              ariaLabel="Live readings on this shipment"
              readings={readings}
              className="rounded-none border-x-0 border-b-0"
            />
          )}

          {contract && (
            <p className="pw-groove flex flex-wrap items-center gap-x-2 gap-y-1 px-5 py-3">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-signal" aria-hidden />
              <span className="text-data text-text-muted">Moving under contract</span>
              <Link
                href={ROUTES.contract(contract.id)}
                className="pw-id text-data font-medium text-signal hover:underline"
              >
                {contract.id}
              </Link>
              <span className="text-data text-text-muted">— the rate on this shipment is the contracted one.</span>
            </p>
          )}
        </Panel>

        {/* ── Things to know ───────────────────────────────────────────── */}
        {customerExceptions.length > 0 && (
          <div className="flex flex-col gap-2">
            {customerExceptions.map((exc) => (
              <div key={exc.id} className="pw-card flex items-start gap-3 border-amber/30 bg-amber/8 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden />
                <div className="min-w-0">
                  <p className="pw-plate-title text-data">{exc.title}</p>
                  <p className="mt-1 text-data leading-relaxed text-text-muted">{exc.businessImpact}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── The record ─────────────────────────────────────────────────
            The shared tab strip rather than a private one: a joint along the
            baseline, the marker riding between triggers, 44px targets and the
            scroll box that keeps a five-tab strip off the page's own width.
            The finance module reads identically, which is the point. */}
        <Tabs
          value={tab}
          onValueChange={(next) => router.replace(ROUTES.bookingTab(job.id, next), { scroll: false })}
          className="flex min-w-0 flex-col gap-4"
        >
          <TabsList aria-label="Shipment record">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} layoutGroup="shipment-tabs">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="min-w-0">
            <OverviewTab file={file} />
          </TabsContent>
          <TabsContent value="timeline" className="min-w-0">
            <TimelineTab file={file} />
          </TabsContent>
          <TabsContent value="cargo" className="min-w-0">
            <CargoTab file={file} />
          </TabsContent>
          <TabsContent value="documents" className="min-w-0">
            <DocumentsTab file={file} />
          </TabsContent>
          <TabsContent value="invoice" className="min-w-0">
            <InvoiceTab file={file} />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  )
}
