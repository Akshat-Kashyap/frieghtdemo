import { daysFromNow } from '@/lib/demo-clock'
import type { ContainerIsoType } from '@/types'

/**
 * FREIGHT CONTRACTS
 * ══════════════════════════════════════════════════════════════════════════
 * What an awarded request becomes: agreed rates on named lanes, for a fixed
 * window, against a volume the customer has committed to.
 *
 * The reason this is a module rather than a PDF is the link back into the
 * rest of the app — a contracted lane shows its contract rate in Search and
 * in the Rate Terminal instead of the spot figure, and the utilisation
 * counter is what tells a customer whether they are on track to hit the
 * commitment they signed.
 */

export type ContractStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'SUPERSEDED' | 'DRAFT'

export interface ContractLaneRate {
  laneId: string
  originId: string
  destinationId: string
  equipment: ContainerIsoType
  /** All-in USD per container, on the rate-grid basis. */
  rateUsd: number
  freeTimeDays: number
  transitMinDays: number
  transitMaxDays: number
}

export interface ContractAmendment {
  version: string
  at: string
  summary: string
  byMemberId?: string
}

export interface Contract {
  id: string
  reference: string
  title: string
  status: ContractStatus
  version: string
  partnerId: string
  partnerName: string
  /** The request this was awarded from. */
  rfqId?: string
  validFrom: string
  validUntil: string
  signedByMemberId: string
  signedAt: string
  /** Containers per month the customer committed to. */
  committedMonthlyVolume: number
  /** Containers actually shipped against it so far this period. */
  shippedThisPeriod: number
  lanes: ContractLaneRate[]
  inclusions: string[]
  exclusions: string[]
  amendments: ContractAmendment[]
  /** Bookings that drew on this contract. */
  linkedJobIds: string[]
  createdInSession?: boolean
}

export const CONTRACTS: Contract[] = [
  {
    id: 'CTR-2026-0041',
    reference: 'APEX/MSC/FE-WI/2026-Q3',
    title: 'Far East → West India · Ocean FCL',
    status: 'ACTIVE',
    version: 'v2',
    partnerId: 'CARR-MSC',
    partnerName: 'MSC',
    rfqId: 'RFQ-2026-0118',
    validFrom: daysFromNow(-35),
    validUntil: daysFromNow(56),
    signedByMemberId: 'MEM-APEX-02',
    signedAt: daysFromNow(-36),
    committedMonthlyVolume: 12,
    shippedThisPeriod: 9,
    lanes: [
      {
        laneId: 'CNSHA-INNSA-FCL',
        originId: 'CNSHA',
        destinationId: 'INNSA',
        equipment: '40HC',
        rateUsd: 4_180,
        freeTimeDays: 10,
        transitMinDays: 18,
        transitMaxDays: 22,
      },
      {
        laneId: 'CNSHA-INMUN-FCL',
        originId: 'CNSHA',
        destinationId: 'INMUN',
        equipment: '40HC',
        rateUsd: 4_240,
        freeTimeDays: 10,
        transitMinDays: 19,
        transitMaxDays: 24,
      },
      {
        laneId: 'CNNGB-INNSA-FCL',
        originId: 'CNNGB',
        destinationId: 'INNSA',
        equipment: '40HC',
        rateUsd: 4_120,
        freeTimeDays: 10,
        transitMinDays: 19,
        transitMaxDays: 23,
      },
    ],
    inclusions: [
      'Ocean freight',
      'Origin terminal handling',
      'Documentation',
      '10 free days at destination',
      'Priority space allocation on committed volume',
    ],
    exclusions: [
      'Destination terminal handling',
      'Duties, taxes and clearance charges',
      'Inland delivery beyond the named door',
      'Detention and storage beyond free time',
      'Peak season surcharge if published',
    ],
    amendments: [
      {
        version: 'v2',
        at: daysFromNow(-12),
        summary: 'Ningbo → Nhava Sheva added at USD 4,120 per 40HC on the same terms.',
        byMemberId: 'MEM-APEX-02',
      },
      { version: 'v1', at: daysFromNow(-36), summary: 'Contract signed following award of RFQ-2026-0118.', byMemberId: 'MEM-APEX-02' },
    ],
    linkedJobIds: ['PW-2026-004281', 'PW-2026-004262', 'PW-2026-004283'],
  },

  {
    id: 'CTR-2026-0033',
    reference: 'APEX/WESTLINE/INLAND/2026',
    title: 'Nhava Sheva → Pune · Inland haulage',
    status: 'EXPIRING',
    version: 'v1',
    partnerId: 'VND-WESTLINE',
    partnerName: 'Westline Transport',
    validFrom: daysFromNow(-160),
    validUntil: daysFromNow(19),
    signedByMemberId: 'MEM-APEX-02',
    signedAt: daysFromNow(-162),
    committedMonthlyVolume: 14,
    shippedThisPeriod: 11,
    lanes: [
      {
        laneId: 'INNSA-INPNQ-FTL',
        originId: 'INNSA',
        destinationId: 'INPNQ',
        equipment: '40HC',
        rateUsd: 265,
        freeTimeDays: 0,
        transitMinDays: 1,
        transitMaxDays: 2,
      },
    ],
    inclusions: ['Trailer haulage', 'One-way toll', 'Two hours free waiting at each end'],
    exclusions: ['Waiting beyond two hours', 'Detention of the trailer', 'Escort or permit charges'],
    amendments: [{ version: 'v1', at: daysFromNow(-162), summary: 'Annual inland haulage agreement signed.' }],
    linkedJobIds: ['PW-2026-004281'],
  },

  {
    id: 'CTR-2025-0187',
    reference: 'APEX/MAERSK/FE-WI/2026-Q2',
    title: 'Far East → West India · Ocean FCL',
    status: 'SUPERSEDED',
    version: 'v1',
    partnerId: 'CARR-MAERSK',
    partnerName: 'Maersk',
    validFrom: daysFromNow(-126),
    validUntil: daysFromNow(-36),
    signedByMemberId: 'MEM-APEX-02',
    signedAt: daysFromNow(-128),
    committedMonthlyVolume: 10,
    shippedThisPeriod: 0,
    lanes: [
      {
        laneId: 'CNSHA-INNSA-FCL',
        originId: 'CNSHA',
        destinationId: 'INNSA',
        equipment: '40HC',
        rateUsd: 3_960,
        freeTimeDays: 7,
        transitMinDays: 19,
        transitMaxDays: 24,
      },
    ],
    inclusions: ['Ocean freight', 'Origin terminal handling', 'Documentation', '7 free days at destination'],
    exclusions: ['Destination handling', 'Duties and taxes', 'Inland delivery', 'Detention beyond free time'],
    amendments: [
      { version: 'v1', at: daysFromNow(-128), summary: 'Previous quarter agreement. Replaced by CTR-2026-0041.' },
    ],
    linkedJobIds: [],
  },
]

/* ══════════════════════════════════════════════════════════════════════════
   DERIVED
   ══════════════════════════════════════════════════════════════════════════ */

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  EXPIRING: 'Expiring soon',
  EXPIRED: 'Expired',
  SUPERSEDED: 'Superseded',
}

export const CONTRACT_STATUS_TONE: Record<ContractStatus, 'neutral' | 'route' | 'signal' | 'amber' | 'critical' | 'muted'> =
  {
    DRAFT: 'muted',
    ACTIVE: 'signal',
    EXPIRING: 'amber',
    EXPIRED: 'muted',
    SUPERSEDED: 'muted',
  }

export function contract(id: string): Contract | undefined {
  return CONTRACTS.find((c) => c.id === id)
}

/**
 * The contracted rate for a lane, if one is live.
 *
 * Search and the Rate Terminal call this before showing a spot figure: if a
 * customer has a contract on the lane, the spot rate is not the number they
 * will be charged, and showing it would be actively misleading.
 */
export function contractRateFor(laneId: string, equipment: ContainerIsoType = '40HC') {
  for (const c of CONTRACTS) {
    if (c.status !== 'ACTIVE' && c.status !== 'EXPIRING') continue
    const lane = c.lanes.find((l) => l.laneId === laneId && l.equipment === equipment)
    if (lane) return { contract: c, lane }
  }
  return undefined
}

/** Progress against the committed volume, as a percentage. */
export function utilisationPct(c: Contract): number {
  if (c.committedMonthlyVolume === 0) return 0
  return Math.round((c.shippedThisPeriod / c.committedMonthlyVolume) * 100)
}

export const ACTIVE_CONTRACT_STATUSES: ContractStatus[] = ['ACTIVE', 'EXPIRING']
