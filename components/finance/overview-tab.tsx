'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, CalendarClock, Landmark, Receipt, Wallet } from 'lucide-react'
import { useMemo } from 'react'

import { DEMO } from '@/data/copy'
import {
  accountPosition,
  advanceSummary,
  advancesForAccount,
  buildAccountExposures,
  creditUtilisationPct,
  facilityForAccount,
  invoiceBalance,
  invoicesForAccount,
} from '@/data/customer-finance'
import { ageInDays } from '@/lib/demo-clock'
import { formatDate, money, percent } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import {
  useBookings,
  useContainers,
  useCreditFacilities,
  useInvoices,
  useJobs,
  usePayments,
} from '@/store/hooks'

import { AnimatedNumber, Button, DemoNotice, EmptyState, Panel, StatPlate } from '@/components/ui/primitives'
import { CountdownPill } from '@/components/ui/freight'

import { RecordPanel } from './pieces'

/**
 * The account in four figures and one decision.
 *
 * Every tile is computed from the invoice and facility records rather than
 * written down, so the Overview cannot drift from the Invoices tab beneath
 * it. The row underneath is the point of the tab: a finance controller does
 * not open this screen to admire a total, they open it to find the one thing
 * that needs a decision today.
 *
 * The four tiles were a private `Tile` component — a Card, a 10px label and a
 * 22px mono figure — which is `StatPlate` with different numbers. Two of them
 * (the fourth tile was hand-built separately) meant three type scales for one
 * idea on one screen. They are all `StatPlate` now, which also buys the
 * material the local copy never had: a plate at --elev-1 that lifts a pixel
 * under the cursor with its cast growing and softening as the gap to the
 * ground opens, and settles back on press.
 */
export function OverviewTab() {
  const allInvoices = useInvoices()
  const payments = usePayments()
  const facilities = useCreditFacilities()
  const jobs = useJobs()
  const bookings = useBookings()
  const containers = useContainers()

  const invoices = useMemo(() => invoicesForAccount(allInvoices), [allInvoices])
  const position = useMemo(() => accountPosition(invoices), [invoices])
  const facility = useMemo(() => facilityForAccount(facilities), [facilities])

  const advances = useMemo(() => advancesForAccount(), [])
  const factoring = useMemo(() => advanceSummary(advances), [advances])

  const { exposures } = useMemo(
    () => buildAccountExposures(jobs, bookings, containers),
    [jobs, bookings, containers],
  )
  const shipmentsOnWatch = exposures.filter((e) => e.band !== 'CLEAR').length

  const urgent = position.mostOverdue
  const urgentPayment = urgent
    ? [...payments.filter((p) => p.invoiceId === urgent.id)].sort(
        (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
      )[0]
    : undefined

  return (
    <div className="flex flex-col gap-5">
      {/* ── The four figures ──────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatPlate
          label="Total outstanding"
          trailing={<Receipt className="h-3.5 w-3.5 text-text-faint" aria-hidden />}
          value={<AnimatedNumber value={position.outstandingInr} format={(n) => money(Math.round(n))} />}
          hint={`${position.openCount} invoice${position.openCount === 1 ? '' : 's'} still to settle`}
        />

        <StatPlate
          label="Of which overdue"
          trailing={
            <AlertTriangle
              className={position.overdueInr > 0 ? 'h-3.5 w-3.5 text-critical' : 'h-3.5 w-3.5 text-text-faint'}
              aria-hidden
            />
          }
          value={<AnimatedNumber value={position.overdueInr} format={(n) => money(Math.round(n))} />}
          tone={position.overdueInr > 0 ? 'critical' : 'signal'}
          hint={
            position.overdueCount > 0
              ? `${position.overdueCount} invoice${position.overdueCount === 1 ? '' : 's'} past the due date`
              : 'Nothing past its due date'
          }
        />

        <StatPlate
          label="Credit available"
          trailing={<Landmark className="h-3.5 w-3.5 text-text-faint" aria-hidden />}
          value={<AnimatedNumber value={facility?.availableInr ?? 0} format={(n) => money(Math.round(n))} />}
          tone="signal"
          hint={
            facility
              ? `of ${money(facility.limitInr)} limit · ${facility.creditDays}-day terms`
              : 'No facility on this account'
          }
        />

        {/* The next scheduled payment, not the overdue one — that has its own
            row below, and counting it twice would make the page argue with
            itself about what is due next. */}
        <StatPlate
          label="Next payment due"
          trailing={<CalendarClock className="h-3.5 w-3.5 text-text-faint" aria-hidden />}
          value={position.nextDue ? money(invoiceBalance(position.nextDue)) : '—'}
          hint={
            position.nextDue
              ? `${position.nextDue.invoiceNumber} · due ${formatDate(position.nextDue.dueAt)}`
              : 'Nothing scheduled ahead of today.'
          }
          footer={
            position.nextDue ? (
              <CountdownPill deadline={position.nextDue.dueAt} showIcon={false} />
            ) : (
              'No scheduled payment inside the credit period.'
            )
          }
        />
      </div>

      <DemoNotice className="-mt-1">Every figure on this page is an {DEMO.valueSuffix}</DemoNotice>

      {/* ── The one thing that needs a decision ───────────────────────── */}
      {urgent ? (
        // Raised a step above every other plate on the tab, because it is the
        // only one carrying a decision. Elevation is the emphasis; the crimson
        // hairline only says which kind of problem it is.
        <Panel className="pw-elev-2 overflow-hidden border-critical/35">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-5 py-4">
            <div className="flex min-w-0 gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-critical" aria-hidden />
              <div className="min-w-0">
                <p className="pw-plate-title text-panel">
                  {money(invoiceBalance(urgent))} outstanding on{' '}
                  <span className="pw-id">{urgent.invoiceNumber}</span>
                </p>
                <p className="mt-1 max-w-2xl text-data leading-relaxed text-text-muted">
                  Part-paid.{' '}
                  {urgentPayment ? (
                    <>
                      {money(urgent.amountPaid)} of {money(urgent.total)} was received by {urgentPayment.method} on{' '}
                      {formatDate(urgentPayment.receivedAt)} against{' '}
                      <span className="pw-id">{urgentPayment.reference}</span>.
                    </>
                  ) : (
                    <>
                      {money(urgent.amountPaid)} of {money(urgent.total)} has been received.
                    </>
                  )}{' '}
                  The balance is {ageInDays(urgent.dueAt)} days past the due date of {formatDate(urgent.dueAt)}, and it
                  is what is holding utilisation on the credit facility where it is.
                </p>
              </div>
            </div>

            {/* Both of these were hand-rolled anchors carrying their own height,
                radius, fill and hover — a primary button and an outline button
                redrawn from memory, and neither had the accent edge or the
                press the real ones carry. `asChild` keeps them anchors. */}
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button asChild variant="primary" size="md">
                <Link href={ROUTES.financeTab('invoices')}>
                  Open the invoice
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="md">
                <Link href={ROUTES.booking(urgent.jobId)}>
                  Shipment <span className="pw-id">{urgent.jobId}</span>
                </Link>
              </Button>
            </div>
          </div>
        </Panel>
      ) : (
        <Panel>
          <EmptyState
            icon={<Wallet className="h-6 w-6" />}
            title="Nothing overdue on this account"
            description="Every invoice raised against this company is either settled or still inside its credit period."
          />
        </Panel>
      )}

      {/* ── Where the rest of the money sits ──────────────────────────── */}
      <RecordPanel
        title="Also on this account"
        meta="Each figure is computed from the records behind it"
        footnote="These three sections are where a balance actually changes: credit decides what can still be booked, an advance turns an export invoice into cash early, and a shipment that overruns its free time adds a charge nobody quoted for."
      >
        <ul>
          <JumpRow
            href={ROUTES.financeTab('credit')}
            title="Credit facility"
            value={facility ? `${percent(creditUtilisationPct(facility), 0)} drawn` : '—'}
            body={
              facility
                ? `${money(facility.utilisedInr)} of ${money(facility.limitInr)} in use. Reviewed ${formatDate(facility.reviewDue)}.`
                : 'No facility is attached to this account.'
            }
          />
          <JumpRow
            href={ROUTES.financeTab('advances')}
            title="Export factoring"
            value={money(factoring.outstandingInr)}
            body={`${factoring.activeCount} advance${factoring.activeCount === 1 ? '' : 's'} running${
              factoring.offeredCount > 0
                ? ` · ${factoring.offeredCount} offer waiting on a decision`
                : ' · no offers open'
            }.`}
            flag={factoring.offeredCount > 0}
          />
          <JumpRow
            href={ROUTES.financeTab('cost-alerts')}
            title="Detention and storage"
            value={`${shipmentsOnWatch} of ${exposures.length}`}
            body={
              shipmentsOnWatch > 0
                ? 'Live shipments with less than a week of free time left at destination.'
                : 'No live shipment is within a week of its free time expiring.'
            }
            flag={shipmentsOnWatch > 0}
          />
        </ul>
      </RecordPanel>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   PIECES
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * A row that goes somewhere.
 *
 * The divider between rows is a groove rather than a hairline — one dark pixel
 * with one lit pixel under it — because a plain 1px line inside a plate is a
 * line drawn on a picture of a plate. It costs one class and it is most of
 * what separates "machined" from "styled".
 */
function JumpRow({
  href,
  title,
  value,
  body,
  flag,
}: {
  href: string
  title: string
  value: string
  body: string
  flag?: boolean
}) {
  return (
    <li className="pw-groove first:border-t-0 first:shadow-none">
      <Link
        href={href}
        className="group flex min-h-[44px] items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-raised-2/60"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="text-data font-medium text-text">{title}</span>
            {/* A seated stud, not a flat dot: the dome highlight is what stops
                a 6px mark reading as a full stop against a lit plate. */}
            {flag && <span className="pw-stud h-1.5 w-1.5 shrink-0 bg-amber" aria-hidden />}
          </span>
          <span className="mt-0.5 block text-micro leading-snug text-text-muted">{body}</span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span className="pw-readout whitespace-nowrap text-data font-medium">{value}</span>
          <ArrowRight
            className="h-4 w-4 text-text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-signal"
            aria-hidden
          />
        </span>
      </Link>
    </li>
  )
}
