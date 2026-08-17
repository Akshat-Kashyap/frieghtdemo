'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Lock, ShieldCheck, Waves } from 'lucide-react'
import { toast } from 'sonner'

import { ORGANISATION, roleCan } from '@/data/org'
import { formatDate } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { useFreightStore } from '@/store/freight-store'
import { useActingMember, useCan } from '@/store/org-store'
import type { Booking, Container, CustomerInvoice, CustomerRole, Job, Quote } from '@/types'

import { MotionButton, StatusBadge } from '@/components/ui/primitives'

/**
 * THE CHAIN
 * ══════════════════════════════════════════════════════════════════════════
 * One module answering the two questions a demo lives or dies on: **where is
 * this in the journey**, and **what happens next**.
 *
 * It exists because the answer was previously scattered — the shipment list
 * knew a status, the shipment file knew a progress rail, and neither said what
 * the viewer was supposed to do with either. A screen that shows a state
 * without naming the next action is a screen that ends the demo, because the
 * person presenting has to explain what should have happened instead of
 * clicking it.
 *
 * Three rules the whole file obeys:
 *
 *  1. EVERY step names its ACTOR. Freight is a relay — some steps are the
 *     customer's, some are the PortWhizz desk's, some belong to a carrier and
 *     arrive on their schedule. Presenting all three as buttons the viewer can
 *     press is the lie that makes a workflow demo fall apart on the second
 *     question from the room.
 *  2. Where a step is the customer's but the ACTING MEMBER may not take it, the
 *     step names the person who can. A greyed-out button with no explanation is
 *     indistinguishable from a broken one — and the split between the person
 *     who raises freight and the person who commits money to it is the whole
 *     reason roles exist in this product.
 *  3. Where a counterparty's step genuinely cannot be simulated, it says so in
 *     those words and points at a record where it has already happened. That is
 *     honest, and it keeps the room moving.
 */

type Capability = keyof CustomerRole['can']

/** Who in this organisation actually holds a capability. */
export function capabilityHolders(capability: Capability): string[] {
  return ORGANISATION.members.filter((m) => roleCan(m.role, capability)).map((m) => m.name)
}

/* ══════════════════════════════════════════════════════════════════════════
   THE END-TO-END CHAIN — the procurement half and the shipment half
   ══════════════════════════════════════════════════════════════════════════
   Search and Requests feed Contracts; Contracts and quotes feed Shipments;
   Shipments feed Finance. A customer arriving on a request has no way to know
   that from the record alone, so every screen on the path draws the same five
   links with its own lit.
   ══════════════════════════════════════════════════════════════════════════ */

export const CHAIN_LINKS = [
  { key: 'search', label: 'Search', href: ROUTES.search },
  { key: 'request', label: 'Request', href: ROUTES.rfqs },
  { key: 'award', label: 'Award', href: ROUTES.rfqs },
  { key: 'contract', label: 'Contract', href: ROUTES.contracts },
  { key: 'shipment', label: 'Shipment', href: ROUTES.bookings },
  { key: 'invoice', label: 'Invoice', href: ROUTES.financeTab('invoices') },
] as const

export type ChainKey = (typeof CHAIN_LINKS)[number]['key']

/**
 * The chain, drawn as a recessed channel with the current link lit.
 *
 * Links before the current one stay navigable — a viewer who has just landed
 * on a contract wants to see the request it came from, and making them find it
 * in the sidebar is how a demo loses its thread.
 */
export function ChainRail({ current, className }: { current: ChainKey; className?: string }) {
  const currentIndex = CHAIN_LINKS.findIndex((l) => l.key === current)

  return (
    <nav aria-label="Where this sits in the freight journey" className={cn('pw-rail flex flex-wrap items-center gap-x-1 gap-y-1 rounded-chip px-2 py-1.5', className)}>
      {CHAIN_LINKS.map((link, i) => {
        const active = i === currentIndex
        const passed = i < currentIndex
        return (
          <span key={link.key} className="inline-flex items-center gap-1">
            {i > 0 && (
              <span aria-hidden className="mx-0.5 h-px w-3 shrink-0 bg-hairline-strong/70" />
            )}
            <Link
              href={link.href}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'inline-flex min-h-[28px] items-center gap-1.5 rounded-[4px] px-2 font-display text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors',
                active
                  ? 'bg-signal text-on-accent shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.24),inset_0_-1px_0_0_rgb(16_29_26_/_0.2),0_1px_2px_-0.5px_rgb(16_29_26_/_0.3)]'
                  : passed
                    ? 'text-text-muted hover:text-signal'
                    : 'text-text-faint hover:text-text-muted',
              )}
            >
              {passed && <Check className="h-2.5 w-2.5" aria-hidden />}
              {link.label}
            </Link>
          </span>
        )
      })}
    </nav>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   THE NEXT STEP ON A SHIPMENT
   ══════════════════════════════════════════════════════════════════════════ */

/** Who the next move belongs to. Presenting all four as buttons is the lie. */
export type StepActor =
  /** The acting member, subject to their role. */
  | 'you'
  /** The PortWhizz desk — simulated here, and labelled as such. */
  | 'desk'
  /** A carrier or terminal. Arrives on their schedule; nothing to press. */
  | 'partner'
  /** Nothing outstanding. */
  | 'done'

export type StepAction = 'issue-quote' | 'accept-quote' | 'raise-invoice'

export interface JourneyStep {
  /** Where the shipment sits, in the product's own words. */
  stage: string
  /** What has to happen next, as a sentence someone could act on. */
  headline: string
  detail: string
  actor: StepActor
  /** The store write the primary control makes, when there is one. */
  action?: StepAction
  /** The capability that write needs. Absent = anyone on the account. */
  capability?: Capability
  ctaLabel?: string
  /** Where to go when the step is somebody else's to take. */
  href?: string
  hrefLabel?: string
}

/**
 * The minimum a screen must hand over to be told what comes next.
 *
 * Structural rather than `JobFile`, so the shipment LIST can answer the same
 * question from its raw slices without assembling a full job file per row —
 * twenty job files rebuilt on every keystroke is a real cost on a list that
 * also re-sorts.
 */
export interface JourneyInput {
  job: Job
  quote?: Quote
  booking?: Booking
  invoice?: CustomerInvoice
  containers?: Container[]
  openExceptions?: number
}

export function nextStepForJob(input: JourneyInput): JourneyStep {
  const { job, quote, booking, invoice, containers = [], openExceptions = 0 } = input

  switch (job.status) {
    case 'ENQUIRY': {
      // A customer cannot issue their own quotation, so the honest split is
      // two steps with two different owners rather than one button that
      // pretends the desk and the buyer are the same person.
      if (!quote || quote.status === 'DRAFT') {
        return {
          stage: 'Enquiry captured',
          headline: 'PortWhizz is pricing this request',
          detail:
            'The charge structure is already built from the option you selected. Issuing the quotation is the freight desk’s step — in this demo you can run it yourself to keep the journey moving.',
          actor: 'desk',
          action: 'issue-quote',
          ctaLabel: 'Issue the quotation',
        }
      }
      return {
        stage: 'Quotation with you',
        headline: 'Accept the quotation to move this to booking',
        detail: `${quote.id} is valid to ${formatDate(quote.validUntil)}. Accepting it is what turns a request into a shipment PortWhizz requests carrier space against.`,
        actor: 'you',
        action: 'accept-quote',
        capability: 'request',
        ctaLabel: 'Accept quotation',
      }
    }

    case 'QUOTED': {
      if (booking && booking.state !== 'CONFIRMED') {
        return {
          stage: 'Booking requested',
          headline: `Waiting on ${booking.carrierName} to confirm space`,
          detail: `Booking ${booking.bookingNumber} is with the carrier. Cutoffs start counting from the moment it is confirmed.`,
          actor: 'partner',
          href: ROUTES.bookingTab(job.id, 'timeline'),
          hrefLabel: 'Open the timeline',
        }
      }
      return {
        stage: 'Accepted — awaiting carrier space',
        headline: 'PortWhizz is requesting space with the carrier',
        detail:
          'Carrier confirmation is not simulated on shipments raised inside this demo — it arrives from the carrier’s own system. Every shipment already past this point carries a real booking, its cutoffs and its documents.',
        actor: 'partner',
        href: ROUTES.bookings,
        hrefLabel: 'See a confirmed shipment',
      }
    }

    case 'BOOKED': {
      const vgmPending = containers.filter((c) => c.vgmKg == null).length
      if (vgmPending > 0) {
        return {
          stage: 'Booked · cutoffs live',
          headline: `Submit VGM for ${vgmPending} container${vgmPending === 1 ? '' : 's'}`,
          detail:
            'A container without a verified gross mass does not get loaded. It is the cutoff that most often costs a sailing.',
          actor: 'you',
          href: ROUTES.bookingTab(job.id, 'cargo'),
          hrefLabel: 'Open cargo',
        }
      }
      return {
        stage: 'Booked · cutoffs live',
        headline: 'Get the boxes gated in before the terminal cutoff',
        detail: `Space is confirmed${booking ? ` on ${booking.vessel ?? booking.carrierName}` : ''}. What is left before departure is documentation and gate-in.`,
        actor: 'you',
        href: ROUTES.bookingTab(job.id, 'cargo'),
        hrefLabel: 'Open cargo',
      }
    }

    case 'ORIGIN_HANDLING':
      return {
        stage: 'Origin handling',
        headline: 'Cargo is being stuffed and moved to the terminal',
        detail: `Every container status change lands on the timeline as it happens${booking ? `, against ${booking.vessel ?? booking.carrierName}` : ''}.`,
        actor: 'partner',
        href: ROUTES.bookingTab(job.id, 'cargo'),
        hrefLabel: 'Advance a container',
      }

    case 'IN_TRANSIT':
      return {
        stage: 'On the water',
        headline: openExceptions > 0 ? 'Clear the open exceptions on this shipment' : 'Nothing is owed until arrival',
        detail:
          openExceptions > 0
            ? `${openExceptions} thing${openExceptions === 1 ? '' : 's'} on this shipment need a decision. Everything else is the carrier’s until discharge.`
            : `Arrival is${booking ? ` ${formatDate(booking.eta)}` : ' ahead'}. Carrier events land on the timeline; the delivery order and arrival notice follow discharge.`,
        actor: openExceptions > 0 ? 'you' : 'partner',
        href: ROUTES.bookingTab(job.id, 'timeline'),
        hrefLabel: 'Open the timeline',
      }

    case 'ARRIVING':
      if (!invoice) {
        return {
          stage: 'Arriving',
          headline: 'Raise the customer invoice',
          detail:
            'Charges are settled enough to bill: the carriage is done and the accepted quotation is what gets invoiced. Free time starts at discharge, so the delivery order is the other thing worth chasing today.',
          actor: 'you',
          action: 'raise-invoice',
          capability: 'finance',
          ctaLabel: 'Raise the invoice',
        }
      }
      return {
        stage: 'Arriving',
        headline: 'Take delivery before free time runs out',
        detail: `Invoice ${invoice.invoiceNumber} is already raised${booking ? `. Free time expires ${formatDate(booking.freeTimeExpiry)}` : ''}.`,
        actor: 'you',
        href: ROUTES.bookingTab(job.id, 'timeline'),
        hrefLabel: 'Open the timeline',
      }

    case 'DELIVERED':
      if (!invoice) {
        return {
          stage: 'Delivered',
          headline: 'Raise the customer invoice',
          detail: 'Cargo is delivered and the charge lines are final. Invoicing is the last step before this shipment closes.',
          actor: 'you',
          action: 'raise-invoice',
          capability: 'finance',
          ctaLabel: 'Raise the invoice',
        }
      }
      if (invoice.status !== 'PAID') {
        return {
          stage: 'Delivered',
          headline: `Settle invoice ${invoice.invoiceNumber}`,
          detail: `Due ${formatDate(invoice.dueAt)}. The shipment closes once proof of delivery is accepted and the invoice is settled.`,
          actor: 'you',
          capability: 'finance',
          href: ROUTES.financeTab('invoices'),
          hrefLabel: 'Open Finance',
        }
      }
      return {
        stage: 'Delivered',
        headline: 'Waiting on proof of delivery to close',
        detail: 'Everything commercial is settled. The shipment closes when the signed proof of delivery is on file.',
        actor: 'partner',
        href: ROUTES.bookingTab(job.id, 'documents'),
        hrefLabel: 'Open documents',
      }

    case 'CLOSED':
    default:
      return {
        stage: 'Closed',
        headline: 'Nothing outstanding on this shipment',
        detail: 'Delivered, invoiced, reconciled and settled. The full record stays here for audit.',
        actor: 'done',
        href: ROUTES.bookings,
        hrefLabel: 'Back to your shipments',
      }
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   ROLE GATE — the demo's best moment, made unmissable
   ══════════════════════════════════════════════════════════════════════════
   When the acting member may act, this is a quiet green line. When they may
   not, it is the loudest thing on the screen and it names the person, because
   "switch to Devansh Kapoor and try again" is the sentence the room remembers.
   ══════════════════════════════════════════════════════════════════════════ */

export function RoleGate({
  capability,
  allowedLine,
  blockedLine,
  className,
}: {
  capability: Capability
  /** What the acting member is being told they CAN do. Omit to stay silent. */
  allowedLine?: React.ReactNode
  /** What the action would commit the company to, said plainly. */
  blockedLine: React.ReactNode
  className?: string
}) {
  const member = useActingMember()
  const { allowed } = useCan(capability)
  const holders = capabilityHolders(capability)
  const who = holders.length > 0 ? holders.join(' or ') : 'nobody on this account'

  if (allowed) {
    if (!allowedLine) return null
    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-card border border-signal/25 bg-signal/6 px-4 py-3',
          'shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.6)]',
          className,
        )}
      >
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
        <p className="text-data leading-relaxed text-text-muted">
          <span className="font-medium text-text">
            You are acting as {member.name}, {member.title}.
          </span>{' '}
          {allowedLine}
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-card border border-amber/35 bg-amber/8',
        'shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.6),var(--cast-1)]',
        className,
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber/35 bg-amber/12 text-amber"
        >
          <Lock className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="pw-plate-title text-body">This one is not yours to do</p>
          <p className="mt-1 text-data leading-relaxed text-text-muted">{blockedLine}</p>
        </div>
      </div>

      {/* The instruction, in a recess, because it is the thing to act on. */}
      <div className="pw-rail flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-none border-x-0 border-b-0 px-4 py-2.5">
        <span className="pw-stencil">Held by</span>
        <span className="text-data font-medium text-text">{who}</span>
        <span aria-hidden className="h-3 w-px bg-hairline-strong" />
        <span className="text-data text-text-muted">
          Switch person in the top bar — you are {member.name}, {member.title}.
        </span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   THE NEXT-STEP PLATE — the shipment file's centrepiece
   ══════════════════════════════════════════════════════════════════════════ */

const ACTOR_BADGE: Record<StepActor, { label: string; tone: 'signal' | 'route' | 'amber' | 'muted' }> = {
  you: { label: 'Yours to do', tone: 'signal' },
  desk: { label: 'PortWhizz desk', tone: 'amber' },
  partner: { label: 'Carrier or terminal', tone: 'route' },
  done: { label: 'Nothing outstanding', tone: 'muted' },
}

/**
 * What happens next on this shipment, and who owns it.
 *
 * Rendered as a plate rather than a banner because it is the most-read object
 * on the screen: the reading sits in a recess at the top, the sentence is
 * signage, and the control is the one filled accent in the region so it is
 * never ambiguous which thing commits.
 */
export function NextStepPlate({ input, className }: { input: JourneyInput; className?: string }) {
  const router = useRouter()
  const member = useActingMember()
  const step = nextStepForJob(input)

  // Hooks are unconditional; which verdict matters is decided below.
  const requestGate = useCan('request')
  const financeGate = useCan('finance')

  const sendQuote = useFreightStore((s) => s.sendQuote)
  const acceptQuote = useFreightStore((s) => s.acceptQuote)
  const raiseCustomerInvoice = useFreightStore((s) => s.raiseCustomerInvoice)

  const gate = step.capability === 'finance' ? financeGate : step.capability === 'request' ? requestGate : null
  const blocked = step.actor === 'you' && gate !== null && !gate.allowed
  const badge = ACTOR_BADGE[step.actor]

  function run() {
    const quote = input.quote
    switch (step.action) {
      case 'issue-quote':
        if (!quote) return
        sendQuote(quote.id)
        toast.success('QUOTATION ISSUED', {
          description: `${quote.id} is with you now, valid to ${formatDate(quote.validUntil)}. Accept it and PortWhizz requests carrier space.`,
          duration: 8_000,
        })
        return
      case 'accept-quote':
        if (!quote) return
        acceptQuote(quote.id)
        toast.success('QUOTATION ACCEPTED', {
          description: `${input.job.id} moves to booking. The acceptance, the enquiry stage and the audit trail all updated in one write.`,
          duration: 8_000,
        })
        return
      case 'raise-invoice':
        raiseCustomerInvoice(input.job.id, member.name)
        toast.success('CUSTOMER INVOICE RAISED', {
          description: `Raised against ${input.job.id} from the accepted quotation. Opening it in Finance.`,
          duration: 9_000,
          action: { label: 'Open Finance', onClick: () => router.push(ROUTES.financeTab('invoices')) },
        })
        router.push(ROUTES.financeTab('invoices'))
        return
      default:
        return
    }
  }

  return (
    <section className={cn('pw-plate overflow-hidden', className)} aria-label="What happens next">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-5 pb-4 pt-4">
        <div className="min-w-0 flex-1">
          <p className="mb-2 flex items-center gap-2">
            <span aria-hidden className="h-[3px] w-3 shrink-0 rounded-full bg-signal/60" />
            <span className="pw-stencil truncate">Next on this shipment</span>
          </p>
          <h3 className="pw-plate-title text-[17px] leading-tight">{step.headline}</h3>
          <p className="mt-1.5 max-w-2xl text-data leading-relaxed text-text-muted">{step.detail}</p>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
          <span className="pw-readout text-micro text-text-faint">{step.stage}</span>
        </div>
      </div>

      {/* ── The control ────────────────────────────────────────────────── */}
      {(step.action || step.href) && (
        <div className="pw-groove flex flex-wrap items-center gap-3 px-5 pb-4 pt-3.5">
          {step.action && !blocked && (
            <MotionButton
              variant={step.actor === 'desk' ? 'outline' : 'primary'}
              size="lg"
              onClick={run}
              className="shrink-0"
            >
              {step.ctaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </MotionButton>
          )}

          {step.action && blocked && (
            <MotionButton variant="outline" size="lg" disabled className="shrink-0">
              <Lock className="h-4 w-4" aria-hidden />
              Needs {capabilityHolders(step.capability!)[0] ?? 'an approver'}
            </MotionButton>
          )}

          {step.href && (
            <Link
              href={step.href}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-chip px-1 text-data font-medium text-text-muted transition-colors hover:text-signal"
            >
              {step.hrefLabel ?? 'Open'}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          )}

          {step.actor === 'desk' && (
            <p className="min-w-[16rem] flex-1 text-micro leading-relaxed text-text-faint">
              Simulated counterparty step. In production the freight desk issues the quotation and it arrives here on
              its own.
            </p>
          )}

          {step.actor === 'partner' && !step.action && (
            <p className="inline-flex items-center gap-1.5 text-micro text-text-faint">
              <Waves className="h-3 w-3" aria-hidden />
              Nothing for you to press — this one arrives from the partner.
            </p>
          )}
        </div>
      )}

      {/* ── The gate, when the step is the customer's but not this person's ── */}
      {blocked && step.capability && (
        <div className="px-5 pb-4">
          <RoleGate
            capability={step.capability}
            blockedLine={
              step.capability === 'finance'
                ? 'Raising an invoice puts a receivable on the company’s books, so it sits with finance rather than with whoever is running the shipment.'
                : 'Accepting a quotation commits the company to the freight charges on it.'
            }
          />
        </div>
      )}
    </section>
  )
}

/**
 * The same answer, one line, for a list row.
 *
 * Deliberately not the plate at a smaller size: a list is scanned, so it gets
 * the sentence and the owner and nothing else.
 */
export function NextStepLine({ input, className }: { input: JourneyInput; className?: string }) {
  const step = nextStepForJob(input)
  const badge = ACTOR_BADGE[step.actor]

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <span
        aria-hidden
        className={cn(
          'pw-stud h-1.5 w-1.5 shrink-0',
          badge.tone === 'signal' && 'text-signal',
          badge.tone === 'amber' && 'text-amber',
          badge.tone === 'route' && 'text-route',
          badge.tone === 'muted' && 'text-text-faint',
        )}
      />
      <span className="truncate text-data text-text-muted">{step.headline}</span>
    </span>
  )
}
