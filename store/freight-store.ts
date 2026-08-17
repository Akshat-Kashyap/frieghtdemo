'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import { createSeed, type FreightSeed } from '@/data'
import type { Contract } from '@/data/contracts'
import { requirePort } from '@/data/ports'
import { computeTotals } from '@/data/quotes'
import { DEMO_NOW_MS } from '@/lib/demo-clock'
import { DocumentLifecycle, MODE_LABEL, isExceptionOpen } from '@/lib/lifecycle'
import type {
  ActivityChannel,
  ActivityEvent,
  AuditEntityType,
  AuditEvent,
  ChargeLine,
  ClearanceCoordinationStatus,
  DocStatus,
  Enquiry,
  Exception,
  ExceptionStatus,
  IndicativeOption,
  IntakeDraft,
  Job,
  Milestone,
  Severity,
} from '@/types'

/**
 * THE JOB-FILE STORE
 * ══════════════════════════════════════════════════════════════════════════
 * One store, one source of truth. Actions are intent-shaped
 * (`resolveException`, not `setExceptionStatus`) because the product promise
 * is that one action updates everything it should — the queue, the shipment,
 * the timeline, the activity stream and the audit trail — in a single
 * transaction. Exposing raw setters would let a screen update three of the
 * five and quietly break that promise.
 *
 * Persisted to localStorage with `skipHydration`, rehydrated by StoreProvider.
 * See hooks/use-hydrated.ts for why that matters.
 */

/* ── Monotonic ids without Math.random ────────────────────────────────── */
let idCounter = 0
function nextId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${String(idCounter).padStart(4, '0')}`
}

/**
 * Advance the counter past anything already persisted.
 *
 * `idCounter` lives at module scope, so it resets to 0 on every page load —
 * but localStorage does not. Without this, the sequence is: create a record
 * (MS-0001), reload, create another (MS-0001 again) → two React children with
 * the same key, and a list that silently drops one of them.
 *
 * Called by StoreProvider immediately after rehydration.
 */
export function primeIdCounter(): void {
  const state = useFreightStore.getState()
  let highest = 0

  const scan = (ids: Array<string | undefined>) => {
    for (const id of ids) {
      const match = id?.match(/-(\d{4,})$/)
      if (match) highest = Math.max(highest, Number(match[1]))
    }
  }

  scan(state.milestones.map((m) => m.id))
  scan(state.activity.map((a) => a.id))
  scan(state.audit.map((a) => a.id))
  scan(state.invoices.map((i) => i.id))
  scan(state.exceptions.flatMap((e) => e.notes.map((n) => n.id)))
  // Added with the customer app: a request or contract minted in a previous
  // session must not have its id handed out again after a reload.
  scan(state.rfqs.map((r) => r.id))
  scan(state.contracts.map((c) => c.id))

  idCounter = Math.max(idCounter, highest)
}

/** Session writes stamp the real wall clock; seeded data uses the demo clock. */
function nowIso(): string {
  return new Date(DEMO_NOW_MS + idCounter * 1000).toISOString()
}

export interface FreightState extends FreightSeed {
  /** Bumped on every mutation so selectors can memoise cheaply. */
  revision: number

  /* ── Audit & activity ──────────────────────────────────────────────── */
  logActivity: (event: Omit<ActivityEvent, 'id' | 'at'> & { at?: string }) => void
  logAudit: (event: Omit<AuditEvent, 'id' | 'at'> & { at?: string }) => void

  /* ── Intake → enquiry ──────────────────────────────────────────────── */
  createEnquiryFromIntake: (
    draft: IntakeDraft,
    option: IndicativeOption,
  ) => { enquiryId: string; jobId: string; quoteId: string }

  /* ── Enquiry ───────────────────────────────────────────────────────── */
  moveEnquiryStage: (enquiryId: string, stage: Enquiry['stage']) => void
  addEnquiryNote: (enquiryId: string, note: string) => void
  assignEnquiry: (enquiryId: string, userId: string) => void

  /* ── Quote ─────────────────────────────────────────────────────────── */
  addChargeLine: (quoteId: string, line: ChargeLine) => void
  updateChargeLine: (quoteId: string, lineId: string, patch: Partial<ChargeLine>) => void
  removeChargeLine: (quoteId: string, lineId: string) => void
  sendQuote: (quoteId: string) => void
  acceptQuote: (quoteId: string) => void
  rejectQuote: (quoteId: string) => void

  /* ── Booking & cargo ───────────────────────────────────────────────── */
  confirmBooking: (bookingId: string) => void
  submitVgm: (containerNumber: string, vgmKg: number) => void
  advanceContainer: (containerNumber: string) => void

  /* ── Milestones ────────────────────────────────────────────────────── */
  addMilestone: (milestone: Omit<Milestone, 'id' | 'audit'>) => void
  setMilestoneVisibility: (milestoneId: string, visible: boolean) => void

  /* ── Exceptions ────────────────────────────────────────────────────── */
  openException: (exception: Omit<Exception, 'id' | 'audit' | 'notes' | 'status'>) => void
  assignException: (exceptionId: string, userId: string) => void
  changeExceptionSeverity: (exceptionId: string, severity: Severity) => void
  addExceptionNote: (exceptionId: string, body: string, author: string) => void
  setExceptionVisibility: (exceptionId: string, visible: boolean) => void
  resolveException: (exceptionId: string, resolutionNote: string, actor: string) => void
  reopenException: (exceptionId: string, actor: string) => void

  /* ── Documents ─────────────────────────────────────────────────────── */
  advanceDocumentStatus: (documentId: string, next: DocStatus, actor: string) => void

  /* ── Finance ───────────────────────────────────────────────────────── */
  matchVendorBill: (billId: string, actor: string) => void
  disputeVendorBill: (billId: string, note: string, actor: string) => void
  raiseCustomerInvoice: (jobId: string, actor: string) => void

  /* ── Requests for quotation ────────────────────────────────────────── */
  submitRfq: (rfqId: string, actor: string) => void
  shortlistRfq: (rfqId: string, actor: string) => void
  /** Awards a response and mints the contract it becomes. */
  awardRfq: (rfqId: string, responseId: string, actor: string, memberId: string) => string | null

  /* ── Clearance coordination — partner status only ──────────────────── */
  setClearanceCoordination: (jobId: string, status: ClearanceCoordinationStatus, actor: string) => void

  /* ── Demo control ──────────────────────────────────────────────────── */
  resetDemo: () => void
}

/**
 * Wraps a mutation so it cannot forget its audit trail.
 *
 * Every state change goes through here, which is what makes the Audit tab on
 * a shipment credible rather than decorative — there is no code path that
 * changes a record without leaving a record of the change.
 */
function withAudit(
  set: (fn: (state: FreightState) => Partial<FreightState>) => void,
  entry: {
    entityType: AuditEntityType
    entityId: string
    jobId?: string
    actor: string
    action: string
    before?: string
    after?: string
    activity?: { verb: string; target: string; channel?: ActivityChannel; severity?: Severity }
  },
  mutate: (state: FreightState) => Partial<FreightState>,
) {
  set((state) => {
    const patch = mutate(state)
    const at = nowIso()

    const audit: AuditEvent = {
      id: nextId('AUD'),
      entityType: entry.entityType,
      entityId: entry.entityId,
      jobId: entry.jobId,
      actor: entry.actor,
      action: entry.action,
      before: entry.before,
      after: entry.after,
      at,
    }

    const activity: ActivityEvent[] =
      entry.activity && entry.jobId
        ? [
            {
              id: nextId('ACT'),
              jobId: entry.jobId,
              actor: entry.actor,
              verb: entry.activity.verb,
              target: entry.activity.target,
              at,
              channel: entry.activity.channel ?? 'USER',
              severity: entry.activity.severity,
            },
          ]
        : []

    return {
      ...patch,
      audit: [audit, ...(patch.audit ?? state.audit)],
      activity: [...activity, ...(patch.activity ?? state.activity)],
      revision: state.revision + 1,
    }
  })
}

export const useFreightStore = create<FreightState>()(
  persist(
    (set, get) => ({
      ...createSeed(),
      revision: 0,

      /* ══════════════════════════════════════════════════════════════════
         AUDIT & ACTIVITY
         ══════════════════════════════════════════════════════════════════ */
      logActivity: (event) =>
        set((state) => ({
          activity: [{ ...event, id: nextId('ACT'), at: event.at ?? nowIso() }, ...state.activity],
          revision: state.revision + 1,
        })),

      logAudit: (event) =>
        set((state) => ({
          audit: [{ ...event, id: nextId('AUD'), at: event.at ?? nowIso() }, ...state.audit],
          revision: state.revision + 1,
        })),

      /* ══════════════════════════════════════════════════════════════════
         INTAKE → ENQUIRY
         The eight things this must do, in one transaction. If any of them
         is skipped the intake flow becomes a dead end, which is the single
         most common failure in a demo like this.
         ══════════════════════════════════════════════════════════════════ */
      createEnquiryFromIntake: (draft, option) => {
        const state = get()
        const serial = 342 + state.enquiries.filter((e) => e.createdInSession).length
        const enquiryId = `ENQ-2026-${String(serial).padStart(5, '0')}`
        const jobSerial = 4315 + state.jobs.filter((j) => j.createdInSession).length
        const jobId = `PW-2026-00${jobSerial}`
        const quoteId = `QT-2026-${String(serial).padStart(5, '0')}-V1`
        const at = nowIso()

        const customerRef = draft.companyName.trim() || 'New customer'

        /* 1 · The job — the aggregate root everything else attaches to. */
        const job: Job = {
          id: jobId,
          reference: `${customerRef.slice(0, 6).toUpperCase().replace(/\s/g, '')}/NEW/${serial}`,
          status: 'ENQUIRY',
          direction: draft.direction,
          mode: draft.mode,
          originId: draft.originId!,
          destinationId: draft.destinationId!,
          customerId: 'CUST-APEX', // demo: new customers map to the demo account
          incoterm: draft.incoterm,
          serviceScope: draft.serviceScope,
          ownerId: 'USR-SALES',
          createdAt: at,
          updatedAt: at,
          enquiryId,
          clearanceCoordination: draft.clearanceCoordinationRequired
            ? 'External customs partner required'
            : undefined,
          riskLevel: 'CLEAR',
          customerVisible: true,
          tags: ['created-in-demo'],
          createdInSession: true,
        }

        /* 2 · The enquiry itself. */
        const enquiry: Enquiry = {
          id: enquiryId,
          jobId,
          stage: 'NEW',
          source: 'WEB_INTAKE',
          customerId: 'CUST-APEX',
          contactPerson: draft.contactPerson,
          contactEmail: draft.email,
          contactPhone: draft.phone,
          preferredContact: draft.preferredContact,
          originId: draft.originId!,
          destinationId: draft.destinationId!,
          direction: draft.direction,
          mode: draft.mode,
          incoterm: draft.incoterm,
          serviceScope: draft.serviceScope,
          inlandDeliveryRequired: draft.inlandDeliveryRequired,
          insuranceRequired: draft.insuranceRequired,
          cargo: {
            mode: draft.mode,
            commodity: draft.cargo.commodity ?? 'General cargo',
            readyDate: draft.cargo.readyDate ?? at,
            containers: draft.cargo.containers,
            packageCount: draft.cargo.packageCount,
            volumeCbm: draft.cargo.volumeCbm,
            actualWeightKg: draft.cargo.actualWeightKg,
            volumetricWeightKg: draft.cargo.volumetricWeightKg,
            chargeableWeightKg: draft.cargo.chargeableWeightKg,
            vehicleType: draft.cargo.vehicleType,
            grossWeightKg: draft.cargo.grossWeightKg ?? 0,
            dangerousGoods: draft.cargo.dangerousGoods ?? false,
            temperatureControlled: draft.cargo.temperatureControlled ?? false,
            specialHandling: [draft.specialHandling],
          },
          clearanceCoordinationRequired: draft.clearanceCoordinationRequired,
          ownerId: 'USR-SALES',
          createdAt: at,
          updatedAt: at,
          estimatedValueInr: Math.round(option.totalUsd * 87.4),
          nextAction: 'Triage and request partner rates',
          riskLevel: 'CLEAR',
          quoteIds: [quoteId],
          rateRequests: [],
          notes: [`Created from the web intake flow. Customer selected the "${option.label}" indicative option.`],
          createdInSession: true,
        }

        /* 3 · A pre-populated draft quote, so the builder is not empty. */
        const lines: ChargeLine[] = option.chargeCategories.map((cat, i) => ({
          id: `CL-${serial}-${String(i + 1).padStart(2, '0')}`,
          code: cat.family.slice(0, 4),
          description: cat.label,
          family: cat.family,
          basis: 'PER_SHIPMENT',
          quantity: 1,
          buyRate: Math.round(cat.amountUsd * 0.82 * 100) / 100,
          sellRate: cat.amountUsd,
          currency: 'USD',
          fx: 87.4,
          payer: 'CUSTOMER',
          validUntil: option.validUntil,
          source: 'ESTIMATE',
          applicability: cat.exposureOnly ? 'EXPOSURE_ONLY' : 'CONFIRMED',
          taxTreatment: 'ZERO_RATED',
          notes: cat.note,
        }))

        /* 4 · A timeline event, so the shipment has a story from minute one. */
        const milestone: Milestone = {
          id: nextId('MS'),
          jobId,
          title: 'Enquiry created',
          at,
          location: 'PortWhizz — web intake',
          source: 'MANUAL_ENTRY',
          responsibleParty: customerRef,
          status: 'COMPLETED',
          category: 'DOCUMENTS',
          customerVisible: true,
          notes: `Freight request captured through the PortWhizz intake flow. Selected option: ${option.label}.`,
          audit: [],
        }

        set((s) => ({
          jobs: [job, ...s.jobs],
          enquiries: [enquiry, ...s.enquiries],
          quotes: [
            {
              id: quoteId,
              jobId,
              enquiryId,
              version: 1,
              status: 'DRAFT',
              docStatus: 'DRAFT',
              currency: 'USD',
              fxRate: 87.4,
              validFrom: at,
              validUntil: option.validUntil,
              lines,
              createdBy: 'Web intake',
              createdAt: at,
            },
            ...s.quotes,
          ],
          milestones: [...s.milestones, milestone],
          /* 5 · Activity event. */
          activity: [
            {
              id: nextId('ACT'),
              jobId,
              actor: customerRef,
              verb: 'submitted a freight request for',
              target: `${option.label} · ${option.transitMinDays}–${option.transitMaxDays} days`,
              at,
              channel: 'CUSTOMER' as ActivityChannel,
            },
            ...s.activity,
          ],
          /* 6 · Audit event. */
          audit: [
            {
              id: nextId('AUD'),
              entityType: 'ENQUIRY' as AuditEntityType,
              entityId: enquiryId,
              jobId,
              actor: 'Web intake',
              action: 'Enquiry created from quote intake',
              after: `${enquiryId} · ${option.label}`,
              at,
            },
            ...s.audit,
          ],
          revision: s.revision + 1,
        }))

        return { enquiryId, jobId, quoteId }
      },

      /* ══════════════════════════════════════════════════════════════════
         ENQUIRY
         ══════════════════════════════════════════════════════════════════ */
      moveEnquiryStage: (enquiryId, stage) => {
        const enquiry = get().enquiries.find((e) => e.id === enquiryId)
        if (!enquiry) return
        withAudit(
          set,
          {
            entityType: 'ENQUIRY',
            entityId: enquiryId,
            jobId: enquiry.jobId,
            actor: 'Sales Desk',
            action: 'Stage changed',
            before: enquiry.stage,
            after: stage,
            activity: { verb: 'moved the enquiry to', target: `${stage.replace(/_/g, ' ').toLowerCase()}` },
          },
          (s) => ({
            enquiries: s.enquiries.map((e) => (e.id === enquiryId ? { ...e, stage, updatedAt: nowIso() } : e)),
          }),
        )
      },

      addEnquiryNote: (enquiryId, note) => {
        const enquiry = get().enquiries.find((e) => e.id === enquiryId)
        if (!enquiry) return
        withAudit(
          set,
          {
            entityType: 'ENQUIRY',
            entityId: enquiryId,
            jobId: enquiry.jobId,
            actor: 'Sales Desk',
            action: 'Note added',
            after: note,
          },
          (s) => ({
            enquiries: s.enquiries.map((e) =>
              e.id === enquiryId ? { ...e, notes: [...e.notes, note], updatedAt: nowIso() } : e,
            ),
          }),
        )
      },

      assignEnquiry: (enquiryId, userId) => {
        const enquiry = get().enquiries.find((e) => e.id === enquiryId)
        if (!enquiry) return
        withAudit(
          set,
          {
            entityType: 'ENQUIRY',
            entityId: enquiryId,
            jobId: enquiry.jobId,
            actor: 'Sales Desk',
            action: 'Owner changed',
            before: enquiry.ownerId,
            after: userId,
          },
          (s) => ({
            enquiries: s.enquiries.map((e) => (e.id === enquiryId ? { ...e, ownerId: userId } : e)),
          }),
        )
      },

      /* ══════════════════════════════════════════════════════════════════
         QUOTE
         ══════════════════════════════════════════════════════════════════ */
      addChargeLine: (quoteId, line) => {
        const quote = get().quotes.find((q) => q.id === quoteId)
        if (!quote) return
        withAudit(
          set,
          {
            entityType: 'QUOTE',
            entityId: quoteId,
            jobId: quote.jobId,
            actor: 'Sales Desk',
            action: 'Charge line added',
            after: `${line.code} — ${line.description}`,
          },
          (s) => ({
            quotes: s.quotes.map((q) => (q.id === quoteId ? { ...q, lines: [...q.lines, line] } : q)),
          }),
        )
      },

      updateChargeLine: (quoteId, lineId, patch) => {
        const quote = get().quotes.find((q) => q.id === quoteId)
        const line = quote?.lines.find((l) => l.id === lineId)
        if (!quote || !line) return
        withAudit(
          set,
          {
            entityType: 'QUOTE',
            entityId: quoteId,
            jobId: quote.jobId,
            actor: 'Sales Desk',
            action: `Charge line ${line.code} updated`,
            before: `buy ${line.buyRate} / sell ${line.sellRate}`,
            after: `buy ${patch.buyRate ?? line.buyRate} / sell ${patch.sellRate ?? line.sellRate}`,
          },
          (s) => ({
            quotes: s.quotes.map((q) =>
              q.id === quoteId ? { ...q, lines: q.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) } : q,
            ),
          }),
        )
      },

      removeChargeLine: (quoteId, lineId) => {
        const quote = get().quotes.find((q) => q.id === quoteId)
        const line = quote?.lines.find((l) => l.id === lineId)
        if (!quote || !line) return
        withAudit(
          set,
          {
            entityType: 'QUOTE',
            entityId: quoteId,
            jobId: quote.jobId,
            actor: 'Sales Desk',
            action: 'Charge line removed',
            before: `${line.code} — ${line.description}`,
          },
          (s) => ({
            quotes: s.quotes.map((q) => (q.id === quoteId ? { ...q, lines: q.lines.filter((l) => l.id !== lineId) } : q)),
          }),
        )
      },

      sendQuote: (quoteId) => {
        const quote = get().quotes.find((q) => q.id === quoteId)
        if (!quote) return
        withAudit(
          set,
          {
            entityType: 'QUOTE',
            entityId: quoteId,
            jobId: quote.jobId,
            actor: 'Sales Desk',
            action: 'Quote sent',
            before: quote.status,
            after: 'SENT',
            activity: { verb: 'sent quotation', target: quoteId, channel: 'EMAIL' },
          },
          (s) => ({
            quotes: s.quotes.map((q) =>
              q.id === quoteId ? { ...q, status: 'SENT', docStatus: 'SENT', sentAt: nowIso() } : q,
            ),
          }),
        )
      },

      acceptQuote: (quoteId) => {
        const quote = get().quotes.find((q) => q.id === quoteId)
        if (!quote) return
        withAudit(
          set,
          {
            entityType: 'QUOTE',
            entityId: quoteId,
            jobId: quote.jobId,
            actor: 'Customer',
            action: 'Quote accepted',
            before: quote.status,
            after: 'ACCEPTED',
            activity: { verb: 'accepted quotation', target: quoteId, channel: 'CUSTOMER' },
          },
          (s) => ({
            quotes: s.quotes.map((q) =>
              q.id === quoteId ? { ...q, status: 'ACCEPTED', docStatus: 'ACCEPTED', acceptedAt: nowIso() } : q,
            ),
            // Accepting a quote moves the job forward — one action, both records.
            jobs: s.jobs.map((j) =>
              j.id === quote.jobId && j.status === 'ENQUIRY'
                ? { ...j, status: 'QUOTED', acceptedQuoteId: quoteId, updatedAt: nowIso() }
                : j,
            ),
            enquiries: s.enquiries.map((e) =>
              e.jobId === quote.jobId ? { ...e, stage: 'ACCEPTED', updatedAt: nowIso() } : e,
            ),
          }),
        )
      },

      rejectQuote: (quoteId) => {
        const quote = get().quotes.find((q) => q.id === quoteId)
        if (!quote) return
        withAudit(
          set,
          {
            entityType: 'QUOTE',
            entityId: quoteId,
            jobId: quote.jobId,
            actor: 'Customer',
            action: 'Quote rejected',
            before: quote.status,
            after: 'REJECTED',
          },
          (s) => ({
            quotes: s.quotes.map((q) => (q.id === quoteId ? { ...q, status: 'REJECTED' } : q)),
          }),
        )
      },

      /* ══════════════════════════════════════════════════════════════════
         BOOKING & CARGO
         ══════════════════════════════════════════════════════════════════ */
      confirmBooking: (bookingId) => {
        const booking = get().bookings.find((b) => b.id === bookingId)
        if (!booking) return
        withAudit(
          set,
          {
            entityType: 'BOOKING',
            entityId: bookingId,
            jobId: booking.jobId,
            actor: 'Arjun Mehta',
            action: 'Booking confirmed',
            before: booking.state,
            after: 'CONFIRMED',
            activity: { verb: 'confirmed booking', target: booking.bookingNumber, channel: 'CARRIER_FEED' },
          },
          (s) => ({
            bookings: s.bookings.map((b) =>
              b.id === bookingId ? { ...b, state: 'CONFIRMED', confirmedAt: nowIso() } : b,
            ),
          }),
        )
      },

      submitVgm: (containerNumber, vgmKg) => {
        const container = get().containers.find((c) => c.number === containerNumber)
        if (!container) return
        withAudit(
          set,
          {
            entityType: 'CONTAINER',
            entityId: containerNumber,
            jobId: container.jobId,
            actor: 'Arjun Mehta',
            action: 'VGM submitted',
            before: 'Pending confirmation',
            after: `${vgmKg} kg · Method 1, weighbridge`,
            activity: { verb: 'submitted VGM for', target: containerNumber },
          },
          (s) => ({
            containers: s.containers.map((c) =>
              c.number === containerNumber ? { ...c, vgmKg, vgmMethod: 'METHOD_1_WEIGHBRIDGE' } : c,
            ),
          }),
        )
      },

      advanceContainer: (containerNumber) => {
        const container = get().containers.find((c) => c.number === containerNumber)
        if (!container) return
        const order = [
          'EMPTY_DISPATCHED',
          'STUFFING',
          'GATE_IN_PENDING',
          'GATED_IN',
          'LOADED',
          'DISCHARGED',
          'DELIVERED',
          'EMPTY_RETURNED',
        ] as const
        const idx = order.indexOf(container.status)
        const next = order[idx + 1]
        if (!next) return

        withAudit(
          set,
          {
            entityType: 'CONTAINER',
            entityId: containerNumber,
            jobId: container.jobId,
            actor: 'Arjun Mehta',
            action: 'Container status advanced',
            before: container.status,
            after: next,
            activity: { verb: 'advanced container', target: `${containerNumber} → ${next.replace(/_/g, ' ').toLowerCase()}` },
          },
          (s) => ({
            containers: s.containers.map((c) => (c.number === containerNumber ? { ...c, status: next } : c)),
          }),
        )
      },

      /* ══════════════════════════════════════════════════════════════════
         MILESTONES
         ══════════════════════════════════════════════════════════════════ */
      addMilestone: (milestone) => {
        withAudit(
          set,
          {
            entityType: 'MILESTONE',
            entityId: milestone.title,
            jobId: milestone.jobId,
            actor: milestone.responsibleParty,
            action: 'Milestone added',
            after: milestone.title,
            activity: { verb: 'added milestone', target: milestone.title },
          },
          (s) => ({
            milestones: [...s.milestones, { ...milestone, id: nextId('MS'), audit: [] }],
          }),
        )
      },

      setMilestoneVisibility: (milestoneId, visible) => {
        const milestone = get().milestones.find((m) => m.id === milestoneId)
        if (!milestone) return
        withAudit(
          set,
          {
            entityType: 'MILESTONE',
            entityId: milestoneId,
            jobId: milestone.jobId,
            actor: 'Arjun Mehta',
            action: 'Customer visibility changed',
            before: String(milestone.customerVisible),
            after: String(visible),
          },
          (s) => ({
            milestones: s.milestones.map((m) => (m.id === milestoneId ? { ...m, customerVisible: visible } : m)),
          }),
        )
      },

      /* ══════════════════════════════════════════════════════════════════
         EXCEPTIONS
         ══════════════════════════════════════════════════════════════════ */
      openException: (exception) => {
        const id = `EXC-2026-0${900 + idCounter}`
        withAudit(
          set,
          {
            entityType: 'EXCEPTION',
            entityId: id,
            jobId: exception.jobId,
            actor: 'Arjun Mehta',
            action: 'Exception opened',
            after: `${exception.title} · ${exception.severity}`,
            activity: { verb: 'raised an exception on', target: exception.title, severity: exception.severity },
          },
          (s) => ({
            exceptions: [{ ...exception, id, status: 'OPEN' as ExceptionStatus, notes: [], audit: [] }, ...s.exceptions],
          }),
        )
      },

      assignException: (exceptionId, userId) => {
        const exc = get().exceptions.find((e) => e.id === exceptionId)
        if (!exc) return
        withAudit(
          set,
          {
            entityType: 'EXCEPTION',
            entityId: exceptionId,
            jobId: exc.jobId,
            actor: 'Meera Iyer',
            action: 'Owner changed',
            before: exc.ownerId,
            after: userId,
            activity: { verb: 'reassigned', target: `${exc.title} (${exceptionId})` },
          },
          (s) => ({
            exceptions: s.exceptions.map((e) =>
              e.id === exceptionId ? { ...e, ownerId: userId, status: e.status === 'OPEN' ? 'IN_PROGRESS' : e.status } : e,
            ),
          }),
        )
      },

      changeExceptionSeverity: (exceptionId, severity) => {
        const exc = get().exceptions.find((e) => e.id === exceptionId)
        if (!exc) return
        withAudit(
          set,
          {
            entityType: 'EXCEPTION',
            entityId: exceptionId,
            jobId: exc.jobId,
            actor: 'Meera Iyer',
            action: 'Severity changed',
            before: exc.severity,
            after: severity,
            activity: { verb: 'changed severity on', target: `${exc.title} → ${severity}`, severity },
          },
          (s) => ({
            exceptions: s.exceptions.map((e) => (e.id === exceptionId ? { ...e, severity } : e)),
          }),
        )
      },

      addExceptionNote: (exceptionId, body, author) => {
        const exc = get().exceptions.find((e) => e.id === exceptionId)
        if (!exc) return
        withAudit(
          set,
          {
            entityType: 'EXCEPTION',
            entityId: exceptionId,
            jobId: exc.jobId,
            actor: author,
            action: 'Note added',
            after: body,
          },
          (s) => ({
            exceptions: s.exceptions.map((e) =>
              e.id === exceptionId
                ? { ...e, notes: [...e.notes, { id: nextId('EXN'), author, at: nowIso(), body }] }
                : e,
            ),
          }),
        )
      },

      setExceptionVisibility: (exceptionId, visible) => {
        const exc = get().exceptions.find((e) => e.id === exceptionId)
        if (!exc) return
        withAudit(
          set,
          {
            entityType: 'EXCEPTION',
            entityId: exceptionId,
            jobId: exc.jobId,
            actor: 'Arjun Mehta',
            action: 'Customer visibility changed',
            before: String(exc.customerVisible),
            after: String(visible),
            activity: visible
              ? { verb: 'notified the customer about', target: exc.title, channel: 'CUSTOMER' as ActivityChannel }
              : undefined,
          },
          (s) => ({
            exceptions: s.exceptions.map((e) => (e.id === exceptionId ? { ...e, customerVisible: visible } : e)),
          }),
        )
      },

      /**
       * Resolving an exception is the demo's central proof.
       *
       * ONE action, SIX consequences: the exception closes, the job's risk
       * level is recomputed, a milestone lands on the timeline, activity is
       * written, audit is written, and the queue count drops. All of it here,
       * in one transaction, because they all read from one job file.
       */
      resolveException: (exceptionId, resolutionNote, actor) => {
        const state = get()
        const exc = state.exceptions.find((e) => e.id === exceptionId)
        if (!exc) return

        const at = nowIso()

        // Will this job still have open exceptions after this one closes?
        const remainingOpen = state.exceptions.filter(
          (e) => e.jobId === exc.jobId && e.id !== exceptionId && isExceptionOpen(e.status),
        )

        withAudit(
          set,
          {
            entityType: 'EXCEPTION',
            entityId: exceptionId,
            jobId: exc.jobId,
            actor,
            action: 'Exception resolved',
            before: exc.status,
            after: 'RESOLVED',
            activity: { verb: 'resolved', target: `${exc.title} (${exceptionId})` },
          },
          (s) => ({
            /* 1 · The exception itself. */
            exceptions: s.exceptions.map((e) =>
              e.id === exceptionId ? { ...e, status: 'RESOLVED', resolvedAt: at, resolutionNote } : e,
            ),
            /* 2 · The job's risk level, recomputed from what remains. */
            jobs: s.jobs.map((j) =>
              j.id === exc.jobId
                ? {
                    ...j,
                    riskLevel: remainingOpen.some((e) => e.severity === 'CRITICAL' || e.severity === 'HIGH')
                      ? 'AT_RISK'
                      : remainingOpen.length > 0
                        ? 'WATCH'
                        : 'CLEAR',
                    updatedAt: at,
                  }
                : j,
            ),
            /* 3 · The timeline gains an event. */
            milestones: [
              ...s.milestones,
              {
                id: nextId('MS'),
                jobId: exc.jobId,
                title: `Exception resolved — ${exc.title}`,
                at,
                location: 'PortWhizz',
                source: 'MANUAL_ENTRY' as const,
                responsibleParty: actor,
                status: 'COMPLETED' as const,
                category: 'EXCEPTIONS' as const,
                customerVisible: exc.customerVisible,
                notes: resolutionNote,
                audit: [],
              },
            ],
          }),
        )
      },

      reopenException: (exceptionId, actor) => {
        const exc = get().exceptions.find((e) => e.id === exceptionId)
        if (!exc) return
        withAudit(
          set,
          {
            entityType: 'EXCEPTION',
            entityId: exceptionId,
            jobId: exc.jobId,
            actor,
            action: 'Exception reopened',
            before: exc.status,
            after: 'REOPENED',
            activity: { verb: 'reopened', target: `${exc.title} (${exceptionId})`, severity: exc.severity },
          },
          (s) => ({
            exceptions: s.exceptions.map((e) =>
              e.id === exceptionId ? { ...e, status: 'REOPENED', resolvedAt: undefined } : e,
            ),
            jobs: s.jobs.map((j) => (j.id === exc.jobId ? { ...j, riskLevel: 'AT_RISK', updatedAt: nowIso() } : j)),
          }),
        )
      },

      /* ══════════════════════════════════════════════════════════════════
         DOCUMENTS
         ══════════════════════════════════════════════════════════════════ */
      advanceDocumentStatus: (documentId, next, actor) => {
        const doc = get().documents.find((d) => d.id === documentId)
        if (!doc) return
        // The lifecycle machine decides what is legal — not the button.
        if (!DocumentLifecycle.canTransition(doc.status, next)) return

        const at = nowIso()
        withAudit(
          set,
          {
            entityType: 'DOCUMENT',
            entityId: documentId,
            jobId: doc.jobId,
            actor,
            action: 'Document status advanced',
            before: doc.status,
            after: next,
            activity: { verb: `moved ${doc.title} to`, target: DocumentLifecycle.labelOf(next) },
          },
          (s) => ({
            documents: s.documents.map((d) =>
              d.id === documentId
                ? {
                    ...d,
                    status: next,
                    updatedAt: at,
                    issuedAt: next === 'ISSUED' ? at : d.issuedAt,
                    sentAt: next === 'SENT' ? at : d.sentAt,
                    acceptedAt: next === 'ACCEPTED' ? at : d.acceptedAt,
                    version: next === 'AMENDED' ? d.version + 1 : d.version,
                  }
                : d,
            ),
          }),
        )
      },

      /* ══════════════════════════════════════════════════════════════════
         FINANCE
         ══════════════════════════════════════════════════════════════════ */
      matchVendorBill: (billId, actor) => {
        const bill = get().vendorBills.find((b) => b.id === billId)
        if (!bill) return
        withAudit(
          set,
          {
            entityType: 'VENDOR_BILL',
            entityId: billId,
            jobId: bill.jobId,
            actor,
            action: 'Vendor bill matched',
            before: bill.status,
            after: 'MATCHED',
            activity: { verb: 'matched vendor bill', target: `${bill.vendorName} · ${bill.billNumber}` },
          },
          (s) => ({
            vendorBills: s.vendorBills.map((b) => (b.id === billId ? { ...b, status: 'MATCHED' } : b)),
          }),
        )
      },

      disputeVendorBill: (billId, note, actor) => {
        const bill = get().vendorBills.find((b) => b.id === billId)
        if (!bill) return
        withAudit(
          set,
          {
            entityType: 'VENDOR_BILL',
            entityId: billId,
            jobId: bill.jobId,
            actor,
            action: 'Vendor bill disputed',
            before: bill.status,
            after: 'DISPUTED',
            activity: { verb: 'disputed vendor bill', target: `${bill.vendorName} · ${bill.billNumber}`, severity: 'MEDIUM' },
          },
          (s) => ({
            vendorBills: s.vendorBills.map((b) =>
              b.id === billId ? { ...b, status: 'DISPUTED', varianceNote: note } : b,
            ),
          }),
        )
      },

      raiseCustomerInvoice: (jobId, actor) => {
        const state = get()
        const job = state.jobs.find((j) => j.id === jobId)
        if (!job) return
        if (state.invoices.some((i) => i.jobId === jobId)) return

        const quote = state.quotes.find((q) => q.id === job.acceptedQuoteId)
        const totals = quote ? computeTotals(quote.lines) : null
        const subtotal = totals?.sellInr ?? 0
        const taxAmount = Math.round(subtotal * 0.09)
        const at = nowIso()
        const number = `PW/2026-27/0${1210 + state.invoices.length}`

        withAudit(
          set,
          {
            entityType: 'CUSTOMER_INVOICE',
            entityId: number,
            jobId,
            actor,
            action: 'Customer invoice raised',
            after: `${number} · subtotal ${subtotal}`,
            activity: { verb: 'raised customer invoice', target: number },
          },
          (s) => ({
            invoices: [
              {
                id: nextId('INV'),
                jobId,
                customerId: job.customerId,
                invoiceNumber: number,
                issuedAt: at,
                dueAt: new Date(new Date(at).getTime() + 30 * 864e5).toISOString(),
                currency: 'INR' as const,
                fx: 1,
                subtotal,
                taxAmount,
                total: subtotal + taxAmount,
                amountPaid: 0,
                status: 'ISSUED' as const,
                lineIds: [],
                audit: [],
              },
              ...s.invoices,
            ],
          }),
        )
      },

      /* ══════════════════════════════════════════════════════════════════
         REQUESTS FOR QUOTATION
         ══════════════════════════════════════════════════════════════════
         Awarding is the only write in the customer app that commits the
         company to money, which is why it is also the only one gated on a
         role. The gate itself lives in the UI (it needs the acting member);
         this action assumes the caller was allowed and records who did it.
         ══════════════════════════════════════════════════════════════════ */
      submitRfq: (rfqId, actor) => {
        const rfq = get().rfqs.find((r) => r.id === rfqId)
        if (!rfq || rfq.status !== 'DRAFT') return
        withAudit(
          set,
          {
            entityType: 'ENQUIRY',
            entityId: rfqId,
            actor,
            action: 'Request sent to partners',
            before: 'DRAFT',
            after: 'SUBMITTED',
          },
          (s) => ({ rfqs: s.rfqs.map((r) => (r.id === rfqId ? { ...r, status: 'SUBMITTED' as const } : r)) }),
        )
      },

      shortlistRfq: (rfqId, actor) => {
        const rfq = get().rfqs.find((r) => r.id === rfqId)
        if (!rfq || rfq.status !== 'RESPONSES_IN') return
        withAudit(
          set,
          {
            entityType: 'ENQUIRY',
            entityId: rfqId,
            actor,
            action: 'Responses shortlisted for approval',
            before: 'RESPONSES_IN',
            after: 'UNDER_REVIEW',
          },
          (s) => ({ rfqs: s.rfqs.map((r) => (r.id === rfqId ? { ...r, status: 'UNDER_REVIEW' as const } : r)) }),
        )
      },

      awardRfq: (rfqId, responseId, actor, memberId) => {
        const rfq = get().rfqs.find((r) => r.id === rfqId)
        const response = rfq?.responses.find((r) => r.id === responseId)
        if (!rfq || !response) return null
        if (rfq.status === 'AWARDED') return rfq.contractId ?? null

        // Seeded contracts read CTR-2026-0041; a session-minted CTR-9016 beside
        // them looks like a different system wrote it.
        const contractId = `CTR-2026-${String(9000 + get().contracts.length + 1).slice(-4)}`
        const at = nowIso()

        const contract: Contract = {
          id: contractId,
          reference: `${rfq.reference}/AWARD`,
          title: `${requirePort(rfq.originId).name} → ${requirePort(rfq.destinationId).name} · ${MODE_LABEL[rfq.mode] ?? rfq.mode}`,
          status: 'ACTIVE',
          version: 'v1',
          partnerId: response.partnerId,
          partnerName: response.partnerName,
          rfqId: rfq.id,
          validFrom: at,
          validUntil: response.validUntil,
          signedByMemberId: memberId,
          signedAt: at,
          committedMonthlyVolume: rfq.monthlyVolume,
          shippedThisPeriod: 0,
          lanes: [
            {
              laneId: `${rfq.originId}-${rfq.destinationId}-FCL`,
              originId: rfq.originId,
              destinationId: rfq.destinationId,
              equipment: rfq.equipment,
              rateUsd: response.rateUsd,
              freeTimeDays: response.freeTimeDays,
              transitMinDays: response.transitMinDays,
              transitMaxDays: response.transitMaxDays,
            },
          ],
          inclusions: response.inclusions,
          exclusions: response.exclusions,
          amendments: [{ version: 'v1', at, summary: `Contract created on award of ${rfq.id}.`, byMemberId: memberId }],
          linkedJobIds: [],
          createdInSession: true,
        }

        withAudit(
          set,
          {
            entityType: 'ENQUIRY',
            entityId: rfqId,
            actor,
            action: `Awarded to ${response.partnerName}`,
            before: rfq.status,
            after: 'AWARDED',
            activity: { verb: 'awarded request to', target: response.partnerName, channel: 'USER' },
          },
          (s) => ({
            rfqs: s.rfqs.map((r) =>
              r.id === rfqId
                ? {
                    ...r,
                    status: 'AWARDED' as const,
                    awardedAt: at,
                    awardedByMemberId: memberId,
                    contractId,
                    responses: r.responses.map((resp) => ({ ...resp, awarded: resp.id === responseId })),
                  }
                : r,
            ),
            contracts: [contract, ...s.contracts],
          }),
        )

        return contractId
      },

      /* ══════════════════════════════════════════════════════════════════
         CLEARANCE COORDINATION — partner status only.
         This is the entire customs surface of this product. It sets a status
         string from a fixed allow-list and records who changed it. There is
         no checklist, no field capture, no calculation. See lib/boundaries.ts.
         ══════════════════════════════════════════════════════════════════ */
      setClearanceCoordination: (jobId, status, actor) => {
        const job = get().jobs.find((j) => j.id === jobId)
        if (!job) return
        withAudit(
          set,
          {
            entityType: 'JOB',
            entityId: jobId,
            jobId,
            actor,
            action: 'Clearance coordination status updated',
            before: job.clearanceCoordination ?? '—',
            after: status,
            activity: { verb: 'updated clearance coordination on', target: status, channel: 'PARTNER' },
          },
          (s) => ({
            jobs: s.jobs.map((j) =>
              j.id === jobId ? { ...j, clearanceCoordination: status, clearanceUpdatedAt: nowIso() } : j,
            ),
          }),
        )
      },

      /* ══════════════════════════════════════════════════════════════════
         RESET
         ══════════════════════════════════════════════════════════════════ */
      resetDemo: () => {
        idCounter = 0
        set(() => ({ ...createSeed(), revision: 0 }))
      },
    }),
    {
      /**
       * The key carries a version suffix, and changing it is deliberate.
       * The state shape grew two collections and the acting-role model was
       * replaced outright; a browser holding the old blob would rehydrate a
       * half-shaped store and render empty modules with no error. Renaming
       * orphans the stale blob instead of trying to reshape it — the right
       * trade for a demo, where there is no user data worth migrating.
       */
      name: 'portwhizz-freight-demo-v2',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      /**
       * CRITICAL: the server cannot read localStorage, so hydrating during
       * render produces HTML that disagrees with the client and React throws.
       * StoreProvider calls `rehydrate()` in an effect instead.
       */
      skipHydration: true,
      // Functions are not serialisable; persist only the data.
      partialize: (state) => ({
        jobs: state.jobs,
        enquiries: state.enquiries,
        quotes: state.quotes,
        bookings: state.bookings,
        containers: state.containers,
        cargo: state.cargo,
        milestones: state.milestones,
        exceptions: state.exceptions,
        documents: state.documents,
        legalDocuments: state.legalDocuments,
        vendorBills: state.vendorBills,
        invoices: state.invoices,
        payments: state.payments,
        creditFacilities: state.creditFacilities,
        rateCards: state.rateCards,
        activity: state.activity,
        audit: state.audit,
        rfqs: state.rfqs,
        contracts: state.contracts,
        revision: state.revision,
      }),
    },
  ),
)
