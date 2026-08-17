import { daysFromNow } from '@/lib/demo-clock'
import type { ContainerIsoType, TransportMode } from '@/types'

/**
 * REQUESTS FOR QUOTATION
 * ══════════════════════════════════════════════════════════════════════════
 * What a customer raises when the platform cannot price a lane off the
 * shelf: a new lane, an awkward equipment type, a volume commitment, or a
 * date outside the current rate validity.
 *
 * The module exists to show two things a rate search cannot:
 *
 *  · **Responses are compared, not accepted.** Three or four partners answer
 *    the same request with different rates, transit times and free days, and
 *    the cheapest is regularly not the one worth taking. The comparison is
 *    the product.
 *
 *  · **Raising and awarding are different jobs.** A logistics manager opens
 *    the request; awarding it commits the company to a contract, and that
 *    sits with procurement. That split is the reason customer roles exist
 *    in this demo at all.
 */

export type RfqStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'RESPONSES_IN'
  | 'UNDER_REVIEW'
  | 'AWARDED'
  | 'DECLINED'
  | 'EXPIRED'

export interface RfqResponse {
  id: string
  partnerId: string
  partnerName: string
  /** All-in USD per container, on the same basis as the rate grid. */
  rateUsd: number
  transitMinDays: number
  transitMaxDays: number
  freeTimeDays: number
  validUntil: string
  respondedAt: string
  inclusions: string[]
  exclusions: string[]
  note?: string
  /** Set when this response was the one awarded. */
  awarded?: boolean
}

export interface Rfq {
  id: string
  reference: string
  status: RfqStatus
  originId: string
  destinationId: string
  mode: TransportMode
  equipment: ContainerIsoType
  /** Containers per month the customer is prepared to commit. */
  monthlyVolume: number
  commodity: string
  incoterm: string
  serviceScope: string
  cargoReadyFrom: string
  /** Responses close on this date. */
  closesAt: string
  raisedByMemberId: string
  raisedAt: string
  /** Only present once someone with the authority has awarded it. */
  awardedByMemberId?: string
  awardedAt?: string
  /** The contract this became. */
  contractId?: string
  notes: string[]
  responses: RfqResponse[]
  createdInSession?: boolean
}

/* ── Partners who respond. All exist in data/parties.ts. ─────────────── */

const MSC = { id: 'CARR-MSC', name: 'MSC' }
const MAERSK = { id: 'CARR-MAERSK', name: 'Maersk' }
const ONE = { id: 'CARR-ONE', name: 'ONE' }
const HAPAG = { id: 'CARR-HAPAG', name: 'Hapag-Lloyd' }
const CMA = { id: 'CARR-CMACGM', name: 'CMA CGM' }

const STANDARD_INCLUSIONS = ['Ocean freight', 'Origin terminal handling', 'Documentation']
const STANDARD_EXCLUSIONS = ['Destination handling', 'Duties and taxes', 'Inland delivery', 'Detention beyond free time']

export const RFQS: Rfq[] = [
  /* ══════════════════════════════════════════════════════════════════════
     AWARDED — the one that became a live contract
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: 'RFQ-2026-0118',
    reference: 'APEX/RFQ/FE-WI/Q3',
    status: 'AWARDED',
    originId: 'CNSHA',
    destinationId: 'INNSA',
    mode: 'OCEAN_FCL',
    equipment: '40HC',
    monthlyVolume: 12,
    commodity: 'Industrial valves and pipe fittings',
    incoterm: 'FOB',
    serviceScope: 'Port to door, Pune',
    cargoReadyFrom: daysFromNow(-52),
    closesAt: daysFromNow(-38),
    raisedByMemberId: 'MEM-APEX-01',
    raisedAt: daysFromNow(-46),
    awardedByMemberId: 'MEM-APEX-02',
    awardedAt: daysFromNow(-36),
    contractId: 'CTR-2026-0041',
    notes: [
      'Quarterly tender for the Far East to west India spine.',
      'Awarded on reliability and free time rather than headline rate — the cheapest response carried 5 free days against 10.',
    ],
    responses: [
      {
        id: 'RFQR-0118-1',
        partnerId: MSC.id,
        partnerName: MSC.name,
        rateUsd: 4_180,
        transitMinDays: 18,
        transitMaxDays: 22,
        freeTimeDays: 10,
        validUntil: daysFromNow(44),
        respondedAt: daysFromNow(-41),
        inclusions: [...STANDARD_INCLUSIONS, '10 free days at destination'],
        exclusions: STANDARD_EXCLUSIONS,
        note: 'Direct service, no transhipment.',
        awarded: true,
      },
      {
        id: 'RFQR-0118-2',
        partnerId: MAERSK.id,
        partnerName: MAERSK.name,
        rateUsd: 4_090,
        transitMinDays: 19,
        transitMaxDays: 24,
        freeTimeDays: 5,
        validUntil: daysFromNow(30),
        respondedAt: daysFromNow(-42),
        inclusions: STANDARD_INCLUSIONS,
        exclusions: [...STANDARD_EXCLUSIONS, 'Peak season surcharge from 01 Sep'],
        note: 'Lowest rate, but half the free time and a surcharge landing mid-contract.',
      },
      {
        id: 'RFQR-0118-3',
        partnerId: ONE.id,
        partnerName: ONE.name,
        rateUsd: 4_260,
        transitMinDays: 20,
        transitMaxDays: 25,
        freeTimeDays: 7,
        validUntil: daysFromNow(38),
        respondedAt: daysFromNow(-40),
        inclusions: STANDARD_INCLUSIONS,
        exclusions: STANDARD_EXCLUSIONS,
        note: 'Transhipment via Singapore.',
      },
      {
        id: 'RFQR-0118-4',
        partnerId: HAPAG.id,
        partnerName: HAPAG.name,
        rateUsd: 4_340,
        transitMinDays: 18,
        transitMaxDays: 21,
        freeTimeDays: 7,
        validUntil: daysFromNow(35),
        respondedAt: daysFromNow(-39),
        inclusions: [...STANDARD_INCLUSIONS, 'Priority space allocation'],
        exclusions: STANDARD_EXCLUSIONS,
      },
    ],
  },

  /* ══════════════════════════════════════════════════════════════════════
     UNDER REVIEW — the one waiting on an approver. The demo's live decision.
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: 'RFQ-2026-0143',
    reference: 'APEX/RFQ/NGB-MUN',
    status: 'UNDER_REVIEW',
    originId: 'CNNGB',
    destinationId: 'INMUN',
    mode: 'OCEAN_FCL',
    equipment: '40HC',
    monthlyVolume: 6,
    commodity: 'Machined steel components',
    incoterm: 'FOB',
    serviceScope: 'Port to port',
    cargoReadyFrom: daysFromNow(9),
    closesAt: daysFromNow(2),
    raisedByMemberId: 'MEM-APEX-01',
    raisedAt: daysFromNow(-11),
    notes: [
      'New lane — Ningbo to Mundra is not on the current contract.',
      'Three responses in, shortlisted for award. Needs procurement sign-off before the rates expire.',
    ],
    responses: [
      {
        id: 'RFQR-0143-1',
        partnerId: CMA.id,
        partnerName: CMA.name,
        rateUsd: 4_120,
        transitMinDays: 20,
        transitMaxDays: 24,
        freeTimeDays: 7,
        validUntil: daysFromNow(6),
        respondedAt: daysFromNow(-6),
        inclusions: STANDARD_INCLUSIONS,
        exclusions: STANDARD_EXCLUSIONS,
        note: 'Best on cost.',
      },
      {
        id: 'RFQR-0143-2',
        partnerId: MSC.id,
        partnerName: MSC.name,
        rateUsd: 4_310,
        transitMinDays: 18,
        transitMaxDays: 21,
        freeTimeDays: 10,
        validUntil: daysFromNow(9),
        respondedAt: daysFromNow(-5),
        inclusions: [...STANDARD_INCLUSIONS, '10 free days at destination'],
        exclusions: STANDARD_EXCLUSIONS,
        note: 'Fastest, and the most free time.',
      },
      {
        id: 'RFQR-0143-3',
        partnerId: HAPAG.id,
        partnerName: HAPAG.name,
        rateUsd: 4_255,
        transitMinDays: 21,
        transitMaxDays: 26,
        freeTimeDays: 7,
        validUntil: daysFromNow(4),
        respondedAt: daysFromNow(-4),
        inclusions: STANDARD_INCLUSIONS,
        exclusions: [...STANDARD_EXCLUSIONS, 'Congestion surcharge if applied at destination'],
      },
    ],
  },

  /* ══════════════════════════════════════════════════════════════════════
     RESPONSES IN — still arriving
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: 'RFQ-2026-0151',
    reference: 'APEX/RFQ/SIN-NSA/REEFER',
    status: 'RESPONSES_IN',
    originId: 'SGSIN',
    destinationId: 'INNSA',
    mode: 'OCEAN_FCL',
    equipment: 'REEFER',
    monthlyVolume: 2,
    commodity: 'Temperature-controlled instrument calibration units',
    incoterm: 'CIF',
    serviceScope: 'Port to door, Pune',
    cargoReadyFrom: daysFromNow(16),
    closesAt: daysFromNow(5),
    raisedByMemberId: 'MEM-APEX-01',
    raisedAt: daysFromNow(-4),
    notes: ['Reefer equipment on a lane normally run dry — expect a material premium and limited plug availability.'],
    responses: [
      {
        id: 'RFQR-0151-1',
        partnerId: MAERSK.id,
        partnerName: MAERSK.name,
        rateUsd: 3_480,
        transitMinDays: 8,
        transitMaxDays: 11,
        freeTimeDays: 5,
        validUntil: daysFromNow(12),
        respondedAt: daysFromNow(-2),
        inclusions: [...STANDARD_INCLUSIONS, 'Reefer plug at origin and destination', 'Temperature monitoring'],
        exclusions: [...STANDARD_EXCLUSIONS, 'Pre-trip inspection if requested'],
      },
      {
        id: 'RFQR-0151-2',
        partnerId: ONE.id,
        partnerName: ONE.name,
        rateUsd: 3_620,
        transitMinDays: 9,
        transitMaxDays: 12,
        freeTimeDays: 7,
        validUntil: daysFromNow(10),
        respondedAt: daysFromNow(-1),
        inclusions: [...STANDARD_INCLUSIONS, 'Reefer plug at origin and destination'],
        exclusions: STANDARD_EXCLUSIONS,
      },
    ],
  },

  /* ══════════════════════════════════════════════════════════════════════
     SUBMITTED — out with partners, nothing back yet
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: 'RFQ-2026-0156',
    reference: 'APEX/RFQ/NSA-RTM/EXPORT',
    status: 'SUBMITTED',
    originId: 'INNSA',
    destinationId: 'NLRTM',
    mode: 'OCEAN_FCL',
    equipment: '40HC',
    monthlyVolume: 4,
    commodity: 'Flow-control assemblies',
    incoterm: 'FOB',
    serviceScope: 'Port to port',
    cargoReadyFrom: daysFromNow(24),
    closesAt: daysFromNow(7),
    raisedByMemberId: 'MEM-APEX-01',
    raisedAt: daysFromNow(-2),
    notes: [
      'Export lane. Shipments run on this pair today; the AD code registration at Nhava Sheva is still in review, so export proceeds against them cannot yet be realised.',
    ],
    responses: [],
  },

  /* ══════════════════════════════════════════════════════════════════════
     DRAFT
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: 'RFQ-2026-0159',
    reference: 'APEX/RFQ/DRAFT',
    status: 'DRAFT',
    originId: 'CNSHA',
    destinationId: 'INMAA',
    mode: 'OCEAN_FCL',
    equipment: '20FT',
    monthlyVolume: 3,
    commodity: 'LED lighting assemblies',
    incoterm: 'FOB',
    serviceScope: 'Port to port',
    cargoReadyFrom: daysFromNow(30),
    closesAt: daysFromNow(14),
    raisedByMemberId: 'MEM-APEX-01',
    raisedAt: daysFromNow(-1),
    notes: ['Not yet sent to partners.'],
    responses: [],
  },

  /* ══════════════════════════════════════════════════════════════════════
     EXPIRED — the cautionary one
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: 'RFQ-2026-0102',
    reference: 'APEX/RFQ/JEA-MUN',
    status: 'EXPIRED',
    originId: 'AEJEA',
    destinationId: 'INMUN',
    mode: 'OCEAN_FCL',
    equipment: '20FT',
    monthlyVolume: 5,
    commodity: 'Aluminium extrusions',
    incoterm: 'FOB',
    serviceScope: 'Port to port',
    cargoReadyFrom: daysFromNow(-60),
    closesAt: daysFromNow(-49),
    raisedByMemberId: 'MEM-APEX-01',
    raisedAt: daysFromNow(-58),
    notes: ['Responses lapsed before a decision was taken. Re-issue if the lane is still needed.'],
    responses: [
      {
        id: 'RFQR-0102-1',
        partnerId: CMA.id,
        partnerName: CMA.name,
        rateUsd: 1_180,
        transitMinDays: 5,
        transitMaxDays: 7,
        freeTimeDays: 7,
        validUntil: daysFromNow(-42),
        respondedAt: daysFromNow(-54),
        inclusions: STANDARD_INCLUSIONS,
        exclusions: STANDARD_EXCLUSIONS,
      },
    ],
  },
]

/* ══════════════════════════════════════════════════════════════════════════
   DERIVED
   ══════════════════════════════════════════════════════════════════════════ */

export const RFQ_STATUS_LABEL: Record<RfqStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Out with partners',
  RESPONSES_IN: 'Responses in',
  UNDER_REVIEW: 'Awaiting approval',
  AWARDED: 'Awarded',
  DECLINED: 'Declined',
  EXPIRED: 'Expired',
}

export const RFQ_STATUS_TONE: Record<RfqStatus, 'neutral' | 'route' | 'signal' | 'amber' | 'critical' | 'muted'> = {
  DRAFT: 'muted',
  SUBMITTED: 'route',
  RESPONSES_IN: 'route',
  UNDER_REVIEW: 'amber',
  AWARDED: 'signal',
  DECLINED: 'critical',
  EXPIRED: 'muted',
}

/** Statuses where the request is still live and worth looking at. */
export const OPEN_RFQ_STATUSES: RfqStatus[] = ['DRAFT', 'SUBMITTED', 'RESPONSES_IN', 'UNDER_REVIEW']

export function isRfqOpen(status: RfqStatus): boolean {
  return OPEN_RFQ_STATUSES.includes(status)
}

/** Cheapest response, and the fastest — rarely the same one. */
export function bestResponses(rfq: Rfq) {
  if (rfq.responses.length === 0) return { cheapest: undefined, fastest: undefined, mostFreeTime: undefined }
  const cheapest = [...rfq.responses].sort((a, b) => a.rateUsd - b.rateUsd)[0]
  const fastest = [...rfq.responses].sort((a, b) => a.transitMaxDays - b.transitMaxDays)[0]
  const mostFreeTime = [...rfq.responses].sort((a, b) => b.freeTimeDays - a.freeTimeDays)[0]
  return { cheapest, fastest, mostFreeTime }
}

export function awardedResponse(rfq: Rfq): RfqResponse | undefined {
  return rfq.responses.find((r) => r.awarded)
}
