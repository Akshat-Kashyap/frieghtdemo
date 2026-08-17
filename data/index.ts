import { hoursFromNow } from '@/lib/demo-clock'
import { requirePort } from './ports'
import { ACTIVITY } from './activity'
import { CONTRACTS, type Contract } from './contracts'
import { RFQS, type Rfq } from './rfqs'
import { BOOKINGS, CARGO_DECLARATIONS, CONTAINERS } from './bookings'
import { ENQUIRIES } from './enquiries'
import { EXCEPTIONS } from './exceptions'
import { FREIGHT_DOCUMENTS, LEGAL_DOCUMENTS } from './documents'
import { CREDIT_FACILITIES, CUSTOMER_INVOICES, PAYMENTS, RATE_CARDS, VENDOR_BILLS } from './finance'
import { HERO_JOB_ID, JOBS } from './jobs'
import { HERO_MILESTONES, buildTimelineFor } from './milestones'
import { QUOTES, buildQuoteLines, computeTotals } from './quotes'
import type {
  ActivityEvent,
  AuditEvent,
  Booking,
  CargoDeclaration,
  Container,
  CreditFacility,
  CustomerInvoice,
  Enquiry,
  Exception,
  FreightDocument,
  Job,
  LegalDocument,
  Milestone,
  PaymentRecord,
  Quote,
  RateCard,
  VendorBill,
} from '@/types'

export { HERO_JOB_ID }

/**
 * THE SEED
 * ──────────────────────────────────────────────────────────────────────────
 * Assembles the authored records into the shape the store holds, and fills
 * the gaps: every job gets a timeline and a quote, whether or not one was
 * hand-written for it, so no shipment detail view ever opens on an empty tab.
 *
 * Built once at module load. Deterministic — no Math.random, no Date.now.
 */

export interface FreightSeed {
  jobs: Job[]
  enquiries: Enquiry[]
  quotes: Quote[]
  bookings: Booking[]
  containers: Container[]
  cargo: CargoDeclaration[]
  milestones: Milestone[]
  exceptions: Exception[]
  documents: FreightDocument[]
  legalDocuments: LegalDocument[]
  vendorBills: VendorBill[]
  invoices: CustomerInvoice[]
  payments: PaymentRecord[]
  creditFacilities: CreditFacility[]
  rateCards: RateCard[]
  activity: ActivityEvent[]
  audit: AuditEvent[]
  rfqs: Rfq[]
  contracts: Contract[]
}

/** How many containers a job of each mode is assumed to carry when not authored. */
function assumedContainerQty(job: Job): number {
  if (job.mode === 'OCEAN_FCL') return 2
  return 1
}

/**
 * Every job past QUOTED needs a booking, or its Booking and Cargo tabs open
 * empty and its ETA is unknown — which also means it can never appear in
 * "Arriving Today". Six are authored in full; the rest are generated here
 * from the job's status so the whole book has a schedule.
 */
const GENERATED_CARRIERS: Array<{ id: string; name: string; prefix: string; service: string }> = [
  { id: 'CARR-MSC', name: 'MSC', prefix: 'MSCU', service: 'Far East – West India Express (FIX)' },
  { id: 'CARR-MAERSK', name: 'Maersk', prefix: 'MAEU', service: 'West India – North Europe (WIN)' },
  { id: 'CARR-CMACGM', name: 'CMA CGM', prefix: 'CMAU', service: 'Straits – Bay of Bengal (SBX)' },
  { id: 'CARR-HAPAG', name: 'Hapag-Lloyd', prefix: 'HLCU', service: 'India Pakistan Express (IPX)' },
  { id: 'CARR-ONE', name: 'ONE', prefix: 'ONEY', service: 'China India Express (CIX)' },
]

const GENERATED_VESSELS = [
  'MSC Ilaria', 'Maersk Kolkata', 'CMA CGM Konya', 'Hapag Osaka Express', 'ONE Cygnus',
  'MSC Palak', 'Maersk Surabaya', 'CMA CGM Nabucco', 'ONE Apus', 'MSC Regulus',
]

/** How far a job of each status is from its arrival, in days. */
const ETA_OFFSET_BY_STATUS: Record<string, number> = {
  BOOKED: 21,
  ORIGIN_HANDLING: 17,
  IN_TRANSIT: 6,
  ARRIVING: 0, // arriving today — this is what the metric counts
  DELIVERED: -5,
  CLOSED: -14,
}

function buildBookingFor(job: Job, index: number): Booking {
  const carrier = GENERATED_CARRIERS[index % GENERATED_CARRIERS.length]!
  const short = job.id.slice(-5)
  const etaDays = ETA_OFFSET_BY_STATUS[job.status] ?? 10

  // ARRIVING jobs land at staggered hours across the demo day, so "arriving
  // today" is a real count of real ETAs rather than a typed-in number.
  const etaOffset = job.status === 'ARRIVING' ? (index % 12) * 1.4 + 2 : etaDays * 24
  const etdOffset = etaOffset - 20 * 24

  return {
    id: `BKG-GEN-${short}`,
    jobId: job.id,
    state: job.status === 'CLOSED' ? 'CLOSED' : 'CONFIRMED',
    carrierId: carrier.id,
    carrierName: carrier.name,
    bookingNumber: `${carrier.prefix}${short}00${index}`,
    vessel: GENERATED_VESSELS[index % GENERATED_VESSELS.length],
    voyage: `${600 + index}${index % 2 === 0 ? 'E' : 'W'}`,
    service: carrier.service,
    mbl: `${carrier.prefix}${short}2609`,
    hbl: `PWZ/GEN/${short}`,
    releaseType: 'SEAWAY_BILL',
    etd: hoursFromNow(etdOffset),
    eta: hoursFromNow(etaOffset),
    originalEta: hoursFromNow(etaOffset - (index % 3 === 0 ? 12 : 0)),
    cutoffs: {
      shippingInstruction: hoursFromNow(etdOffset - 48),
      vgm: hoursFromNow(etdOffset - 40),
      gateIn: hoursFromNow(etdOffset - 30),
      documentation: hoursFromNow(etdOffset - 20),
    },
    freeTimeDays: 7,
    freeTimeExpiry: hoursFromNow(etaOffset + 7 * 24),
    originTerminal: `${requirePort(job.originId).name} terminal`,
    destinationTerminal: `${requirePort(job.destinationId).name} terminal`,
    confirmedAt: job.createdAt,
  }
}

const NEEDS_BOOKING = ['BOOKED', 'ORIGIN_HANDLING', 'IN_TRANSIT', 'ARRIVING', 'DELIVERED', 'CLOSED']

function buildSeed(): FreightSeed {
  /* ── Bookings: authored where they matter, generated everywhere else ── */
  const bookings: Booking[] = [...BOOKINGS]
  const bookedJobIds = new Set(BOOKINGS.map((b) => b.jobId))
  let bookingIndex = 0
  for (const job of JOBS) {
    if (bookedJobIds.has(job.id)) continue
    if (!NEEDS_BOOKING.includes(job.status)) continue
    bookings.push(buildBookingFor(job, bookingIndex++))
  }

  /* ── Milestones: hero authored in full, others generated from status ── */
  const milestones: Milestone[] = [...HERO_MILESTONES]
  for (const job of JOBS) {
    if (job.id === HERO_JOB_ID) continue
    milestones.push(
      ...buildTimelineFor(
        job.id,
        job.status,
        job.createdAt,
        requirePort(job.originId).name,
        requirePort(job.destinationId).name,
      ),
    )
  }

  /* ── Quotes: hero authored, others built from the same catalogue ────── */
  const quotes: Quote[] = [...QUOTES]
  for (const job of JOBS) {
    if (job.id === HERO_JOB_ID) continue
    const enquiry = ENQUIRIES.find((e) => e.jobId === job.id)
    const qty = assumedContainerQty(job)
    const lines = buildQuoteLines(job.id, qty, {
      inland: job.serviceScope === 'PORT_TO_DOOR' || job.serviceScope === 'DOOR_TO_DOOR',
      insurance: enquiry?.insuranceRequired ?? false,
      scale: job.mode === 'AIR' ? 2.6 : 1,
    })

    // Jobs past QUOTED have an accepted quote; earlier ones are still in play.
    const accepted = !['ENQUIRY', 'QUOTED'].includes(job.status)
    quotes.push({
      id: job.acceptedQuoteId ?? `QT-${job.id.slice(-6)}-V1`,
      jobId: job.id,
      enquiryId: job.enquiryId ?? `ENQ-${job.id.slice(-6)}`,
      version: 1,
      status: accepted ? 'ACCEPTED' : job.status === 'QUOTED' ? 'SENT' : 'DRAFT',
      docStatus: accepted ? 'ACCEPTED' : job.status === 'QUOTED' ? 'SENT' : 'DRAFT',
      currency: 'USD',
      fxRate: 87.4,
      validFrom: job.createdAt,
      validUntil: new Date(new Date(job.createdAt).getTime() + 12 * 864e5).toISOString(),
      lines,
      createdBy: 'Sales Desk',
      createdAt: job.createdAt,
      sentAt: job.status === 'ENQUIRY' ? undefined : job.createdAt,
      acceptedAt: accepted ? job.updatedAt : undefined,
    })
  }

  return {
    jobs: JOBS,
    enquiries: ENQUIRIES,
    quotes,
    bookings,
    containers: CONTAINERS,
    cargo: CARGO_DECLARATIONS,
    milestones,
    exceptions: EXCEPTIONS,
    documents: FREIGHT_DOCUMENTS,
    legalDocuments: LEGAL_DOCUMENTS,
    vendorBills: VENDOR_BILLS,
    invoices: CUSTOMER_INVOICES,
    payments: PAYMENTS,
    creditFacilities: CREDIT_FACILITIES,
    rateCards: RATE_CARDS,
    activity: ACTIVITY,
    audit: [],
    rfqs: RFQS,
    contracts: CONTRACTS,
  }
}

/**
 * Returns a fresh deep copy every call.
 *
 * The store mutates these records; handing out the module-level arrays would
 * mean "Reset demo data" restores state that has already been written over.
 * `structuredClone` is available in every browser this runs in and in Node 18+.
 */
export function createSeed(): FreightSeed {
  return structuredClone(buildSeed())
}

export { computeTotals }
