'use client'

import Link from 'next/link'
import { ArrowRight, Ship } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ORG_ID } from '@/data/org'
import { requirePort } from '@/data/ports'
import { formatDate } from '@/lib/format'
import { CUSTOMER_PROGRESS, MODE_LABEL, customerProgressIndex, isExceptionOpen } from '@/lib/lifecycle'
import { ROUTES } from '@/lib/routes'
import { useHydrated } from '@/hooks/use-hydrated'
import {
  useBookings,
  useContainers,
  useExceptions,
  useInvoices,
  useJobs,
  useMilestones,
  useQuotes,
} from '@/store/hooks'

import { PageShell } from '@/components/app/app-shell'
import { EmptyState, Panel, SegmentedControl, Skeleton } from '@/components/ui/primitives'
import { JobStatusBadge, LanePill, ModeBadge, ProgressRail } from '@/components/ui/freight'
import { ChainRail, NextStepLine } from '@/components/shipment/journey'

type Tab = 'in-progress' | 'completed' | 'cancelled'

/** Which job statuses belong under each customer-facing tab. */
const TAB_STATUSES: Record<Tab, string[]> = {
  'in-progress': ['ENQUIRY', 'QUOTED', 'BOOKED', 'ORIGIN_HANDLING', 'IN_TRANSIT', 'ARRIVING'],
  completed: ['DELIVERED', 'CLOSED'],
  cancelled: ['CANCELLED'],
}

/**
 * Your shipments, all modes.
 *
 * Ordered by how soon each one needs attention rather than by id: arriving
 * shipments first, then in transit, then everything still being arranged.
 * A list sorted by reference number is a filing cabinet, not a workspace.
 *
 * Every row answers the two questions a shipment list is opened with — where
 * is it, and what is owed on it. The progress channel answers the first and
 * `NextStepLine` answers the second, both from the same journey module the
 * shipment file uses, so a row and the record it opens can never disagree.
 *
 * The status filter sits in the body rather than in `PageShell`'s action slot:
 * that slot does not shrink below its content, so a three-segment control was
 * pushing the whole page sideways at 360px.
 */
export function BookingList() {
  const hydrated = useHydrated()
  const jobs = useJobs()
  const bookings = useBookings()
  const milestones = useMilestones()
  const quotes = useQuotes()
  const invoices = useInvoices()
  const containers = useContainers()
  const exceptions = useExceptions()
  const [tab, setTab] = useState<Tab>('in-progress')

  const rows = useMemo(() => {
    const order = ['ARRIVING', 'IN_TRANSIT', 'ORIGIN_HANDLING', 'BOOKED', 'QUOTED', 'ENQUIRY', 'DELIVERED', 'CLOSED']
    return jobs
      // The visibility flag is part of the test, not an afterthought: the
      // tile on the home dashboard counts the same way, and a list and a
      // count that disagree about the same shipments is the first thing a
      // sceptical reader notices.
      .filter((j) => j.customerId === ORG_ID && j.customerVisible && TAB_STATUSES[tab].includes(j.status))
      .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))
      .map((job) => {
        const booking = bookings.find((b) => b.jobId === job.id)
        const next = milestones
          .filter((m) => m.jobId === job.id && m.customerVisible && m.status === 'EXPECTED')
          .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())[0]
        return {
          job,
          booking,
          next,
          // Raw slices rather than a full job file per row: twenty job files
          // rebuilt on every re-sort is a real cost on a list that re-sorts.
          quote: quotes.find((q) => q.jobId === job.id),
          invoice: invoices.find((inv) => inv.jobId === job.id),
          jobContainers: containers.filter((c) => c.jobId === job.id),
          // Only what the customer can see: an internal chase does not become
          // a thing the buyer is told to go and clear.
          openExceptions: exceptions.filter(
            (e) => e.jobId === job.id && e.customerVisible && isExceptionOpen(e.status),
          ).length,
        }
      })
  }, [jobs, bookings, milestones, quotes, invoices, containers, exceptions, tab])

  const counts = useMemo(() => {
    const own = jobs.filter((j) => j.customerId === ORG_ID && j.customerVisible)
    return {
      'in-progress': own.filter((j) => TAB_STATUSES['in-progress'].includes(j.status)).length,
      completed: own.filter((j) => TAB_STATUSES.completed.includes(j.status)).length,
      cancelled: own.filter((j) => TAB_STATUSES.cancelled.includes(j.status)).length,
    }
  }, [jobs])

  return (
    <PageShell
      width="wide"
      title="Your shipments"
      description="All modes — ocean FCL, LCL, air and domestic road. Ordered by what needs attention soonest, not by reference number."
      notice="Simulated shipment data on a fixed demo clock. Milestones, vessels and arrival estimates are authored, not live carrier feeds."
    >
      {/* ── Where this sits, and what is being filtered ────────────────── */}
      <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <SegmentedControl<Tab>
          ariaLabel="Shipment status"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'in-progress', label: `In progress${hydrated ? ` (${counts['in-progress']})` : ''}` },
            { value: 'completed', label: `Completed${hydrated ? ` (${counts.completed})` : ''}` },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <ChainRail current="shipment" className="min-w-0" />
      </div>

      {!hydrated ? (
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[118px] rounded-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Panel className="p-8">
          <EmptyState
            icon={<Ship className="h-6 w-6" />}
            title={
              tab === 'cancelled'
                ? 'No cancelled shipments'
                : tab === 'completed'
                  ? 'Nothing completed yet'
                  : 'No shipments in progress'
            }
            description={
              tab === 'cancelled'
                ? 'Nothing has been cancelled on this account.'
                : 'Search a lane and book it, and the shipment appears here.'
            }
            action={
              tab !== 'cancelled' ? (
                <Link href={ROUTES.search} className="text-data font-medium text-signal hover:underline">
                  Search freight rates
                </Link>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map(({ job, booking, next, quote, invoice, jobContainers, openExceptions }) => {
            const origin = requirePort(job.originId)
            const destination = requirePort(job.destinationId)
            const etaRevised = booking && booking.originalEta && booking.eta !== booking.originalEta

            return (
              <li key={job.id}>
                {/* `a.pw-card` answers the cursor on its own — the lift is part
                    of the material, not something each list re-invents. */}
                <Link href={ROUTES.booking(job.id)} className="pw-card group block p-4 no-underline sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="pw-id text-data font-semibold text-text">{job.id}</span>
                        <JobStatusBadge status={job.status} />
                        <ModeBadge mode={job.mode} label={MODE_LABEL[job.mode]} />
                      </div>
                      <p className="mt-2">
                        <LanePill origin={origin.name} destination={destination.name} className="text-[15px]" />
                      </p>
                      <p className="pw-readout mt-1 text-[10px] text-text-faint">
                        {job.reference}
                        {booking ? ` · ${booking.vessel} ${booking.voyage}` : ''}
                      </p>
                    </div>

                    {/* `min-w-0`, never `shrink-0`: a reading block that
                        refuses to shrink is what pushes a page sideways. */}
                    <dl className="flex min-w-0 flex-wrap items-start gap-x-6 gap-y-2">
                      {booking && (
                        <div className="min-w-0">
                          <dt className="pw-stencil">Arrival</dt>
                          <dd className="pw-readout mt-1 text-data font-medium">
                            {formatDate(booking.eta)}
                            {etaRevised && (
                              <span className="ml-1.5 font-sans text-[10px] font-normal text-amber">revised</span>
                            )}
                          </dd>
                        </div>
                      )}
                      {next && (
                        <div className="min-w-0 max-w-[190px]">
                          <dt className="pw-stencil">Next event</dt>
                          <dd className="mt-1 truncate text-data text-text-muted">{next.title}</dd>
                        </div>
                      )}
                      <ArrowRight
                        className="mt-3 hidden h-4 w-4 shrink-0 text-text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-signal sm:block"
                        aria-hidden
                      />
                    </dl>
                  </div>

                  {/* A joint in the plate, not a rule drawn on a picture of one. */}
                  <div className="pw-groove mt-4 pt-3.5">
                    <ProgressRail
                      steps={CUSTOMER_PROGRESS}
                      currentIndex={customerProgressIndex(job.status)}
                      compact
                    />
                    <NextStepLine
                      className="mt-3"
                      input={{ job, quote, booking, invoice, containers: jobContainers, openExceptions }}
                    />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </PageShell>
  )
}
