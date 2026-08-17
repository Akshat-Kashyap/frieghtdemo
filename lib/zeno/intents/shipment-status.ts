import { createSeed } from '@/data'
import { EXCEPTIONS } from '@/data/exceptions'
import { HERO_JOB_ID, JOBS } from '@/data/jobs'
import { HERO_MILESTONES, buildTimelineFor } from '@/data/milestones'
import { requirePort } from '@/data/ports'
import { countdown, relativeToDemoNow } from '@/lib/demo-clock'
import { formatDate, formatStampShort } from '@/lib/format'
import { JobLifecycle, MODE_LABEL, isExceptionOpen } from '@/lib/lifecycle'
import { ROUTES } from '@/lib/routes'
import type { Booking, Job, Milestone } from '@/types'
import type { ZenoIntent } from '@/lib/zeno'
import type { ZenoBlock } from '@/lib/zeno/types'

import { resolveJobReference } from './entities'

/**
 * ZENO — SHIPMENT STATUS
 * ══════════════════════════════════════════════════════════════════════════
 * Where a shipment is, what it is on, and what is about to expire on it.
 *
 * The account is Apex Industrial and this is the customer's view of it, so an
 * open exception is reported only where the record is marked customer-visible.
 * An internal one — a vendor invoice under dispute, a margin note — is not
 * withheld to be coy; it is withheld because leaking an internal record
 * through an answer box is how a demo turns into an incident.
 *
 * A reference that matches nothing returns null. There is no "did you mean",
 * because a near-miss on a shipment number would answer about the wrong
 * shipment, and every number in that answer would be confidently wrong.
 */

const CUSTOMER_ID = 'CUST-APEX'

/**
 * Bookings as the seed assembles them, not as `data/bookings.ts` authors them.
 *
 * Six shipments have a hand-written booking; the rest are generated in the
 * seed from the job's status. Reading only the authored six would have Zeno
 * report "awaiting booking" for a shipment whose Bookings row shows a vessel
 * and an ETA — the same record, two answers.
 *
 * Built once, on the first shipment question, because `createSeed()` deep
 * clones the whole book. Zeno reads the seed rather than the live store: it
 * is a pure module outside React, so records created during a session are
 * not visible to it, which is the honest trade for keeping the answer engine
 * free of store subscriptions.
 */
let seedBookings: Booking[] | null = null

function bookingFor(jobId: string): Booking | undefined {
  seedBookings ??= createSeed().bookings
  return seedBookings.find((b) => b.jobId === jobId)
}

/** Longest alternative first, so "my shipments" is not read as "my shipment". */
const FLEET_KEYWORDS =
  /(^|[^a-z0-9])(my (shipments|shipment|containers|container|bookings|booking|cargo|freight)|shipment status|where (is|are) my|track my|what.s moving|in transit)([^a-z0-9]|$)/

export const shipmentStatusIntent: ZenoIntent = {
  id: 'shipment-status',
  matches: (q) => resolveJobReference(q) !== null || FLEET_KEYWORDS.test(q),

  answer: (q) => {
    const reference = resolveJobReference(q)
    if (reference) {
      const job = JOBS.find((j) => j.id === reference && j.customerId === CUSTOMER_ID)
      return job ? answerForJob(job) : null
    }
    return answerForFleet()
  },
}

/* ══════════════════════════════════════════════════════════════════════════
   ONE SHIPMENT
   ══════════════════════════════════════════════════════════════════════════ */

function answerForJob(job: Job): ReturnType<ZenoIntent['answer']> {
  const origin = requirePort(job.originId)
  const destination = requirePort(job.destinationId)
  const booking = bookingFor(job.id)
  const latest = latestUpdate(job)

  const cutoff = booking ? nextCutoff(booking) : null
  const exception = EXCEPTIONS.find((e) => e.jobId === job.id && e.customerVisible && isExceptionOpen(e.status))

  const blocks: ZenoBlock[] = [
    {
      kind: 'list',
      items: [
        { label: 'Shipment', value: job.id, hint: job.reference },
        { label: 'Status', value: JobLifecycle.labelOf(job.status), hint: MODE_LABEL[job.mode] },
        { label: 'Lane', value: `${origin.name} → ${destination.name}` },
        ...(booking?.vessel
          ? [{ label: 'Vessel', value: `${booking.vessel} ${booking.voyage ?? ''}`.trim(), hint: booking.carrierName }]
          : []),
        ...(booking
          ? [
              { label: 'ETD', value: formatDate(booking.etd) },
              { label: 'ETA', value: formatDate(booking.eta), hint: relativeToDemoNow(booking.eta) },
              { label: 'Free time', value: `${booking.freeTimeDays} days`, hint: `to ${formatDate(booking.freeTimeExpiry)}` },
            ]
          : []),
        ...(latest ? [{ label: 'Last update', value: latest.title, hint: relativeToDemoNow(latest.at) }] : []),
      ],
    },
  ]

  if (cutoff) {
    blocks.push({
      kind: 'list',
      items: [
        {
          label: `Next cutoff — ${cutoff.label}`,
          value: formatStampShort(cutoff.at),
          hint: countdown(cutoff.at).label,
        },
      ],
    })
  }

  if (exception) {
    blocks.push({
      kind: 'note',
      // Amber, not neutral: this is the one thing on the answer the customer
      // may need to act on today.
      tone: 'amber',
      text: `${exception.title}. ${exception.businessImpact} Next: ${exception.recommendedAction.toLowerCase()}.`,
    })
  }

  if (!booking) {
    blocks.push({
      kind: 'note',
      tone: 'neutral',
      text: 'No carrier booking is confirmed against this job yet, so there is no vessel or ETA to report. The shipment file opens on the enquiry and quote.',
    })
  }

  return {
    intent: 'shipment-status',
    headline: `${job.id} is ${JobLifecycle.labelOf(job.status).toLowerCase()} — ${origin.name} → ${destination.name}${
      booking ? `, arriving ${formatDate(booking.eta)}` : ''
    }.`,
    blocks,
    citations: [{ label: 'Shipment file', href: ROUTES.booking(job.id) }],
    followUps: [
      'Show me my shipments',
      ...(booking ? [`Give me port charges of ${destination.name} for a 40ft container`] : []),
      'What are my outstanding invoices?',
    ],
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   THE WHOLE BOOK
   ══════════════════════════════════════════════════════════════════════════ */

/** The statuses a customer means by "my shipments" — everything still moving. */
const MOVING: string[] = ['BOOKED', 'ORIGIN_HANDLING', 'IN_TRANSIT', 'ARRIVING']

/** Rows shown before the answer stops being a summary and becomes a report. */
const FLEET_ROWS = 8

function answerForFleet(): ReturnType<ZenoIntent['answer']> {
  const jobs = JOBS.filter((j) => j.customerId === CUSTOMER_ID && j.customerVisible && MOVING.includes(j.status))
  if (jobs.length === 0) return null

  // Soonest arrival first: on a moving book, the next thing to land is the
  // next thing that needs a decision.
  const rows = jobs
    .map((job) => ({ job, booking: bookingFor(job.id) }))
    .sort((a, b) => etaMs(a.booking) - etaMs(b.booking))

  const shown = rows.slice(0, FLEET_ROWS)
  const arriving = jobs.filter((j) => j.status === 'ARRIVING').length

  return {
    intent: 'shipment-status',
    headline: `${jobs.length} shipments are moving${arriving > 0 ? `, ${arriving} of them arriving` : ''}.`,
    blocks: [
      {
        kind: 'table',
        columns: ['Shipment', 'Lane', 'Status', 'ETA'],
        rows: shown.map(({ job, booking }) => [
          job.id,
          `${requirePort(job.originId).name} → ${requirePort(job.destinationId).name}`,
          JobLifecycle.labelOf(job.status),
          booking ? formatDate(booking.eta) : 'Awaiting booking',
        ]),
      },
      {
        kind: 'note',
        tone: 'neutral',
        text:
          rows.length > shown.length
            ? `The ${shown.length} arriving soonest, of ${rows.length} moving. Enquiries and quotes still being priced are not listed — Bookings holds the full file on every one.`
            : 'Enquiries and quotes still being priced are not listed here — Bookings holds the full file on every one.',
      },
    ],
    citations: [{ label: 'Bookings', href: ROUTES.bookings }],
    followUps: [
      `Where is ${shown[0].job.id}?`,
      'What are my outstanding invoices?',
      'Explain detention and demurrage',
    ],
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   READING THE RECORDS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The most recent completed, customer-visible milestone.
 *
 * The hero shipment has an authored timeline; every other job's is generated
 * from its status by the same function the seed uses, so this cannot report a
 * different history from the shipment's own timeline tab.
 */
function latestUpdate(job: Job): Milestone | undefined {
  const timeline =
    job.id === HERO_JOB_ID
      ? HERO_MILESTONES
      : buildTimelineFor(
          job.id,
          job.status,
          job.createdAt,
          requirePort(job.originId).name,
          requirePort(job.destinationId).name,
        )

  return [...timeline]
    .filter((m) => m.status === 'COMPLETED' && m.customerVisible)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .pop()
}

/** The first cutoff still ahead of the demo clock. A passed cutoff is history, not a deadline. */
function nextCutoff(booking: Booking): { label: string; at: string } | null {
  const candidates: Array<{ label: string; at: string }> = [
    { label: 'shipping instruction', at: booking.cutoffs.shippingInstruction },
    { label: 'verified gross mass', at: booking.cutoffs.vgm },
    { label: 'gate-in', at: booking.cutoffs.gateIn },
    { label: 'documentation', at: booking.cutoffs.documentation },
  ]

  return (
    candidates
      .filter((c) => !countdown(c.at).overdue)
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())[0] ?? null
  )
}

function etaMs(booking?: Booking): number {
  return booking ? new Date(booking.eta).getTime() : Number.MAX_SAFE_INTEGER
}
