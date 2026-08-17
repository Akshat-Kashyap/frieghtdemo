/**
 * THE JOB FILE
 * ══════════════════════════════════════════════════════════════════════════
 * "One shipment. One job file. One source of truth." is the product promise,
 * so it is also the shape of the data. `Job` is the aggregate root and every
 * other record carries a `jobId`. That is what lets resolving an exception
 * update the queue, the shipment, the timeline, the activity stream and the
 * audit log in one transaction — rather than five screens each keeping their
 * own copy of the truth, which is the spreadsheet problem this replaces.
 */

import type { AllowedClearanceStatus } from '@/lib/boundaries'
import type { Currency } from '@/lib/format'

export type { Currency }

/* ══════════════════════════════════════════════════════════════════════════
   IDENTIFIERS — branded so a QuoteId can never be passed where a JobId goes
   ══════════════════════════════════════════════════════════════════════════ */

export type JobId = string & { readonly __brand?: 'JobId' }
export type EnquiryId = string
export type QuoteId = string
export type BookingId = string
export type ExceptionId = string
export type DocumentId = string
export type MilestoneId = string
export type ContainerNumber = string
export type PartyId = string
export type UserId = string

/* ══════════════════════════════════════════════════════════════════════════
   FREIGHT VOCABULARY
   ══════════════════════════════════════════════════════════════════════════ */

export type TransportMode = 'OCEAN_FCL' | 'OCEAN_LCL' | 'AIR' | 'DOMESTIC_FTL' | 'DOMESTIC_LTL'

export type Direction = 'IMPORT' | 'EXPORT' | 'DOMESTIC'

export type Incoterm = 'EXW' | 'FOB' | 'CIF' | 'DAP' | 'DDP' | 'OTHER'

export type ServiceScope = 'PORT_TO_PORT' | 'DOOR_TO_PORT' | 'PORT_TO_DOOR' | 'DOOR_TO_DOOR'

export type SpecialHandling =
  | 'NONE'
  | 'REEFER'
  | 'DANGEROUS_GOODS'
  | 'OVERSIZED'
  | 'FRAGILE'
  | 'TEMPERATURE_CONTROLLED'

export type ContainerIsoType = '20FT' | '40FT' | '40HC' | 'REEFER' | 'OOG'

export type VehicleType = '19FT_SXL' | '24FT_SXL' | '32FT_SXL' | '32FT_MXL' | 'TRAILER_40FT' | 'CONTAINER_20FT'

export type PreferredContactMethod = 'EMAIL' | 'PHONE' | 'WHATSAPP'

/* ══════════════════════════════════════════════════════════════════════════
   LOCATIONS
   ══════════════════════════════════════════════════════════════════════════ */

export type LocationKind = 'SEAPORT' | 'AIRPORT' | 'INLAND' | 'ICD'

export interface Port {
  id: string
  /** UN/LOCODE — the identifier freight people actually quote. */
  code: string
  name: string
  city: string
  country: string
  countryCode: string
  kind: LocationKind
  lat: number
  lng: number
  /** Shown in the search list to disambiguate similarly named places. */
  hint?: string
  /** Drives "Popular lanes" ordering on the intake panel. */
  popularity: number
  timezone: string
}

export interface Lane {
  id: string
  originId: string
  destinationId: string
  mode: TransportMode
  transitMinDays: number
  transitMaxDays: number
  /** Indicative per-unit sell used to seed the options view. */
  indicativeSellUsd: number
  popularity: number
}

/* ══════════════════════════════════════════════════════════════════════════
   PARTIES & PEOPLE
   ══════════════════════════════════════════════════════════════════════════ */

export type PartyKind =
  | 'CUSTOMER'
  | 'CARRIER'
  | 'TRANSPORTER'
  | 'TERMINAL'
  | 'CFS'
  | 'WAREHOUSE'
  | 'CLEARANCE_PARTNER'
  | 'OVERSEAS_AGENT'
  | 'INSURER'
  | 'FINANCIER'

export interface Party {
  id: PartyId
  name: string
  kind: PartyKind
  country: string
  /** Only meaningful for CUSTOMER — drives the receivables and credit views. */
  creditDays?: number
  contactPerson?: string
  email?: string
  phone?: string
}

export type RoleId = 'arjun' | 'meera' | 'priya' | 'sales' | 'finance' | 'platform-ops'

export interface AppUser {
  id: UserId
  name: string
  title: string
  role: RoleId
  initials: string
  /** Which party this user belongs to — Priya sits on the customer side. */
  partyId?: PartyId
}

/* ══════════════════════════════════════════════════════════════════════════
   THE CUSTOMER ORGANISATION
   ══════════════════════════════════════════════════════════════════════════
   Everything below describes the company *using* PortWhizz, not the company
   running it. There is deliberately no operations, admin or platform role in
   this union — the four here are the ones a shipper's own logistics desk
   actually splits along, and the only thing they gate is who may commit the
   company to money.
   ══════════════════════════════════════════════════════════════════════════ */

export type CustomerRoleId = 'logistics-manager' | 'procurement-approver' | 'finance-controller' | 'viewer'

export interface CustomerRole {
  id: CustomerRoleId
  label: string
  /** One line, shown in the role switcher — what this person is here to do. */
  summary: string
  /** Capability flags. Absent = not permitted. */
  can: {
    /** Raise an RFQ, request a rate, start a booking. */
    request?: true
    /** Award an RFQ and sign the company up to a contract. */
    award?: true
    /** See credit limits, invoices and factoring. */
    finance?: true
    /** Change company profile and documents. */
    manageProfile?: true
  }
}

export interface OrgMember {
  id: string
  name: string
  initials: string
  title: string
  role: CustomerRoleId
  email: string
  phone?: string
  /** What this person is authorised to handle, in their own words. */
  authorityScope?: string
}

export type KybItemStatus = 'VERIFIED' | 'IN_REVIEW' | 'ACTION_NEEDED' | 'NOT_STARTED'

export interface KybItem {
  id: string
  label: string
  /** The identifier itself, masked where it would be sensitive in reality. */
  value: string
  status: KybItemStatus
  verifiedAt?: string
  /** What staying unverified actually costs the customer. */
  unlocks: string
}

export type PortPairStatus = 'ACTIVE' | 'DOCUMENTATION_PENDING' | 'NOT_ENABLED'

export interface OperationalPortPair {
  id: string
  originId: string
  destinationId: string
  status: PortPairStatus
  enabledAt?: string
  note?: string
}

export type CompanyDocumentStatus = 'VALID' | 'EXPIRING' | 'EXPIRED' | 'MISSING'

export interface CompanyDocument {
  id: string
  name: string
  category: 'REGISTRATION' | 'TAX' | 'LICENCE' | 'AUTHORISATION' | 'INSURANCE'
  reference: string
  issuedAt?: string
  expiresAt?: string
  status: CompanyDocumentStatus
}

export type RewardTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'

export interface RewardEntry {
  id: string
  at: string
  description: string
  /** Positive earns, negative redeems. */
  points: number
  relatedId?: string
}

export interface CustomerOrganisation {
  id: PartyId
  name: string
  /** Trading identity a freight desk would recognise. */
  shortName: string
  country: string
  industry: string
  registeredAddress: string
  members: OrgMember[]
  kyb: KybItem[]
  portPairs: OperationalPortPair[]
  documents: CompanyDocument[]
  rewards: {
    tier: RewardTier
    points: number
    pointsToNextTier: number
    nextTier?: RewardTier
    benefits: string[]
    ledger: RewardEntry[]
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   LIFECYCLE STATES
   ══════════════════════════════════════════════════════════════════════════ */

export type JobStatus =
  | 'ENQUIRY'
  | 'QUOTED'
  | 'BOOKED'
  | 'ORIGIN_HANDLING'
  | 'IN_TRANSIT'
  | 'ARRIVING'
  | 'DELIVERED'
  | 'CLOSED'

export type EnquiryStage =
  | 'NEW'
  | 'INFORMATION_REQUIRED'
  | 'RATES_REQUESTED'
  | 'QUOTE_DRAFTED'
  | 'QUOTE_SENT'
  | 'ACCEPTED'
  | 'BOOKING_PENDING'
  | 'CONVERTED'
  | 'LOST'
  | 'EXPIRED'

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'SUPERSEDED' | 'CANCELLED'

/** Document lifecycle — deliberately separate from QuoteStatus, per spec §17. */
export type DocStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'SENT'
  | 'ACCEPTED'
  | 'AMENDED'
  | 'SUPERSEDED'
  | 'CANCELLED'
  | 'ARCHIVED'

export type BookingState =
  | 'REQUESTED'
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'AMENDED'
  | 'ROLLED_OVER'
  | 'CANCELLED'
  | 'CLOSED'

export type ContainerStatus =
  | 'EMPTY_DISPATCHED'
  | 'STUFFING'
  | 'GATE_IN_PENDING'
  | 'GATED_IN'
  | 'LOADED'
  | 'DISCHARGED'
  | 'DELIVERED'
  | 'EMPTY_RETURNED'

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type ExceptionStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REOPENED'

export type RiskLevel = 'CLEAR' | 'WATCH' | 'AT_RISK'

/**
 * External customs coordination — the ONLY customs vocabulary in this product.
 * Constrained to the allow-list in lib/boundaries.ts; the boundary test asserts
 * this union has not grown. See lib/boundaries.ts for why.
 */
export type ClearanceCoordinationStatus = AllowedClearanceStatus

/* ══════════════════════════════════════════════════════════════════════════
   AUDIT & ACTIVITY — appended by store middleware, never by hand
   ══════════════════════════════════════════════════════════════════════════ */

export type AuditEntityType =
  | 'JOB'
  | 'ENQUIRY'
  | 'QUOTE'
  | 'BOOKING'
  | 'CONTAINER'
  | 'MILESTONE'
  | 'EXCEPTION'
  | 'DOCUMENT'
  | 'VENDOR_BILL'
  | 'CUSTOMER_INVOICE'

export interface AuditEvent {
  id: string
  entityType: AuditEntityType
  entityId: string
  jobId?: JobId
  actor: string
  action: string
  /** Human-readable field-level delta. Kept as strings — this is a record of
   *  what changed, not a diffing engine. */
  before?: string
  after?: string
  at: string
}

export type ActivityChannel = 'SYSTEM' | 'USER' | 'PARTNER' | 'CUSTOMER' | 'EMAIL' | 'CARRIER_FEED'

export interface ActivityEvent {
  id: string
  jobId: JobId
  actor: string
  verb: string
  target: string
  at: string
  channel: ActivityChannel
  severity?: Severity
}

/* ══════════════════════════════════════════════════════════════════════════
   CARGO
   ══════════════════════════════════════════════════════════════════════════ */

export interface ContainerRequest {
  isoType: ContainerIsoType
  quantity: number
}

/** What the customer asked for, before it becomes an actual cargo record. */
export interface CargoRequest {
  mode: TransportMode
  commodity: string
  readyDate: string

  /** Ocean FCL */
  containers?: ContainerRequest[]

  /** LCL / LTL / Air */
  packageCount?: number
  volumeCbm?: number

  /** Air */
  actualWeightKg?: number
  volumetricWeightKg?: number
  chargeableWeightKg?: number
  dimensionsCm?: { length: number; width: number; height: number }

  /** Domestic FTL */
  vehicleType?: VehicleType
  waitingHours?: number
  pickupCity?: string
  deliveryCity?: string
  deliveryDeadline?: string

  /** Common */
  grossWeightKg: number
  dangerousGoods: boolean
  temperatureControlled: boolean
  specialHandling: SpecialHandling[]
}

/** The confirmed cargo on a live job. */
export interface CargoDeclaration {
  jobId: JobId
  commodity: string
  packageCount: number
  grossWeightKg: number
  volumeCbm: number
  chargeableWeightKg?: number
  dangerousGoods: boolean
  unNumber?: string
  temperatureControlled: boolean
  temperatureSetPoint?: string
  specialHandling: SpecialHandling[]
  marksAndNumbers?: string
}

export type VgmMethod = 'METHOD_1_WEIGHBRIDGE' | 'METHOD_2_CALCULATED' | 'PENDING'

export interface Container {
  number: ContainerNumber
  jobId: JobId
  isoType: ContainerIsoType
  sealNumber: string
  grossWeightKg: number
  /** Undefined until the shipper submits it — this is a real operational gap
   *  the demo shows, not missing data. */
  vgmKg?: number
  vgmMethod: VgmMethod
  volumeCbm: number
  packageCount: number
  status: ContainerStatus
  gatedInAt?: string
  loadedAt?: string
}

/* ══════════════════════════════════════════════════════════════════════════
   COMMERCIAL — quotes and charge lines
   ══════════════════════════════════════════════════════════════════════════ */

export type ChargeBasis =
  | 'PER_CONTAINER'
  | 'PER_BL'
  | 'PER_SHIPMENT'
  | 'PER_KG'
  | 'PER_CBM'
  | 'PER_TON'
  | 'PER_VEHICLE'
  | 'PER_DAY'
  | 'PER_HOUR'
  | 'PERCENTAGE'
  | 'LUMPSUM'

export type ChargePayer = 'CUSTOMER' | 'SHIPPER' | 'CONSIGNEE' | 'PORTWHIZZ' | 'THIRD_PARTY'

export type ChargeSource = 'CONTRACT_RATE' | 'SPOT_RATE' | 'PARTNER_QUOTE' | 'PUBLISHED_TARIFF' | 'MANUAL' | 'ESTIMATE'

export type TaxTreatment = 'GST_18' | 'GST_5' | 'ZERO_RATED' | 'EXEMPT' | 'REVERSE_CHARGE' | 'OUT_OF_SCOPE'

export type ChargeFamily =
  | 'MAIN_CARRIAGE'
  | 'FUEL_SURCHARGE'
  | 'ORIGIN_HANDLING'
  | 'DESTINATION_HANDLING'
  | 'TERMINAL_HANDLING'
  | 'DOCUMENTATION'
  | 'INLAND'
  | 'INSURANCE'
  | 'WAITING'
  | 'STORAGE'
  | 'DETENTION'
  | 'SPECIAL_HANDLING'
  | 'DELIVERY_ORDER'
  | 'CFS'

/** Applicability: whether a line is certain, conditional, or a risk exposure. */
export type ChargeApplicability = 'CONFIRMED' | 'CONDITIONAL' | 'EXPOSURE_ONLY'

export interface ChargeLine {
  id: string
  code: string
  description: string
  family: ChargeFamily
  basis: ChargeBasis
  quantity: number
  buyRate: number
  sellRate: number
  currency: Currency
  /** Rate to INR at the time the line was priced. */
  fx: number
  payer: ChargePayer
  validUntil: string
  source: ChargeSource
  applicability: ChargeApplicability
  taxTreatment: TaxTreatment
  /** Vendor this cost is expected from — drives cost accrual and bill matching. */
  vendorId?: PartyId
  notes?: string
}

export interface QuoteTotals {
  buy: number
  sell: number
  margin: number
  marginPct: number
  /** Same figures converted to INR at line-level FX. */
  buyInr: number
  sellInr: number
  marginInr: number
}

export interface Quote {
  id: QuoteId
  jobId: JobId
  enquiryId: EnquiryId
  version: number
  status: QuoteStatus
  docStatus: DocStatus
  currency: Currency
  fxRate: number
  validFrom: string
  validUntil: string
  lines: ChargeLine[]
  createdBy: string
  createdAt: string
  sentAt?: string
  acceptedAt?: string
  supersededByQuoteId?: QuoteId
  notes?: string
}

/** A published/contracted rate the quote builder can pull from. */
export interface RateCard {
  id: string
  laneId: string
  mode: TransportMode
  vendorId: PartyId
  vendorName: string
  equipment: string
  buyRate: number
  currency: Currency
  validFrom: string
  validUntil: string
  source: ChargeSource
  transitMinDays: number
  transitMaxDays: number
  freeTimeDays: number
}

/* ══════════════════════════════════════════════════════════════════════════
   ENQUIRY
   ══════════════════════════════════════════════════════════════════════════ */

export type EnquirySource = 'WEB_INTAKE' | 'EMAIL' | 'PHONE' | 'SALES_DESK' | 'CUSTOMER_PORTAL' | 'PARTNER_REFERRAL'

/** A rate request sent to a partner while an enquiry is being priced. */
export interface PartnerRateRequest {
  id: string
  vendorId: PartyId
  vendorName: string
  requestedAt: string
  respondedAt?: string
  status: 'REQUESTED' | 'RECEIVED' | 'DECLINED' | 'EXPIRED'
  quotedBuy?: number
  currency?: Currency
  transitDays?: number
}

export interface Enquiry {
  id: EnquiryId
  jobId: JobId
  stage: EnquiryStage
  source: EnquirySource
  customerId: PartyId
  contactPerson: string
  contactEmail: string
  contactPhone: string
  preferredContact: PreferredContactMethod
  originId: string
  destinationId: string
  direction: Direction
  mode: TransportMode
  incoterm: Incoterm
  serviceScope: ServiceScope
  inlandDeliveryRequired: boolean
  insuranceRequired: boolean
  cargo: CargoRequest
  /** Present only if the customer flagged that clearance will be needed.
   *  Status only — no checklist, no fields. */
  clearanceCoordinationRequired: boolean
  ownerId: UserId
  createdAt: string
  updatedAt: string
  estimatedValueInr: number
  nextAction: string
  riskLevel: RiskLevel
  quoteIds: QuoteId[]
  rateRequests: PartnerRateRequest[]
  notes: string[]
  lostReason?: string
  /** Marks records the viewer created during this session, so the UI can
   *  point at them ("you just made this"). */
  createdInSession?: boolean
}

/* ══════════════════════════════════════════════════════════════════════════
   BOOKING
   ══════════════════════════════════════════════════════════════════════════ */

export type ReleaseType = 'ORIGINAL_BL' | 'SEAWAY_BILL' | 'TELEX_RELEASE' | 'EXPRESS_RELEASE'

export interface BookingCutoffs {
  vgm: string
  shippingInstruction: string
  gateIn: string
  documentation: string
}

export interface Booking {
  id: BookingId
  jobId: JobId
  state: BookingState
  carrierId: PartyId
  carrierName: string
  bookingNumber: string
  vessel?: string
  voyage?: string
  flightNumber?: string
  service: string
  mbl?: string
  hbl?: string
  releaseType: ReleaseType
  etd: string
  eta: string
  /** Original ETA, retained so ETA-deviation is measurable rather than asserted. */
  originalEta: string
  cutoffs: BookingCutoffs
  freeTimeDays: number
  freeTimeExpiry: string
  emptyPickupDepot?: string
  originTerminal: string
  destinationTerminal: string
  confirmedAt?: string
  rolledFromBookingId?: BookingId
}

/* ══════════════════════════════════════════════════════════════════════════
   MILESTONES
   ══════════════════════════════════════════════════════════════════════════ */

export type MilestoneSource =
  | 'SIMULATED_CARRIER_EVENT'
  | 'MANUAL_ENTRY'
  | 'BOOKING_CONFIRMATION'
  | 'CUSTOMER_UPLOAD'
  | 'AGENT_UPDATE'
  | 'TRANSPORTER_UPDATE'
  | 'EMAIL'

export type MilestoneCategory =
  | 'CARRIER'
  | 'ORIGIN'
  | 'DESTINATION'
  | 'TRANSPORT'
  | 'DOCUMENTS'
  | 'EXCEPTIONS'
  | 'FINANCE'

export type MilestoneStatus = 'COMPLETED' | 'IN_PROGRESS' | 'EXPECTED' | 'DELAYED' | 'CANCELLED'

export interface Milestone {
  id: MilestoneId
  jobId: JobId
  title: string
  at: string
  location: string
  source: MilestoneSource
  responsibleParty: string
  status: MilestoneStatus
  category: MilestoneCategory
  documentId?: DocumentId
  customerVisible: boolean
  notes?: string
  audit: AuditEvent[]
}

/* ══════════════════════════════════════════════════════════════════════════
   EXCEPTIONS — first-class records, not flags on a shipment
   ══════════════════════════════════════════════════════════════════════════ */

export type ExceptionType =
  | 'SHIPPING_INSTRUCTION_CUTOFF'
  | 'VGM_CUTOFF'
  | 'ETA_REVISION'
  | 'FREE_TIME_RISK'
  | 'CONTAINER_NOT_GATED_IN'
  | 'VENDOR_INVOICE_MISMATCH'
  | 'BOOKING_ROLLOVER'
  | 'DOCUMENT_DELAY'
  | 'CLEARANCE_DEPENDENCY'
  | 'DELIVERY_DELAY'
  | 'CARGO_DAMAGE'
  | 'PAYMENT_OVERDUE'

export interface Exception {
  id: ExceptionId
  jobId: JobId
  type: ExceptionType
  title: string
  severity: Severity
  status: ExceptionStatus
  ownerId: UserId
  deadline?: string
  openedAt: string
  resolvedAt?: string
  businessImpact: string
  recommendedAction: string
  customerVisible: boolean
  milestoneId?: MilestoneId
  /** Money at stake, where the exception has a quantifiable exposure. */
  exposureInr?: number
  resolutionNote?: string
  notes: ExceptionNote[]
  audit: AuditEvent[]
}

export interface ExceptionNote {
  id: string
  author: string
  at: string
  body: string
}

/* ══════════════════════════════════════════════════════════════════════════
   DOCUMENTS
   ══════════════════════════════════════════════════════════════════════════ */

export type FreightDocumentType =
  | 'CUSTOMER_ENQUIRY'
  | 'RATE_REQUEST'
  | 'QUOTE'
  | 'BOOKING_CONFIRMATION'
  | 'SHIPPING_INSTRUCTION'
  | 'VGM_RECORD'
  | 'BILL_OF_LADING'
  | 'ARRIVAL_NOTICE'
  | 'DELIVERY_ORDER'
  | 'TRANSPORT_ORDER'
  | 'PROOF_OF_DELIVERY'
  | 'VENDOR_INVOICE'
  | 'CUSTOMER_INVOICE'
  | 'PACKING_LIST'
  | 'CARGO_PHOTOGRAPHS'

export interface FreightDocument {
  id: DocumentId
  jobId: JobId
  type: FreightDocumentType
  title: string
  version: number
  status: DocStatus
  createdBy: string
  createdAt: string
  issuedAt?: string
  sentAt?: string
  acceptedAt?: string
  updatedAt: string
  supportingDocumentIds: DocumentId[]
  supersedesDocumentId?: DocumentId
  /** Placeholder commercial copy only — never operative legal text. */
  bodyBlocks: DocumentBlock[]
  audit: AuditEvent[]
  customerVisible: boolean
}

export interface DocumentBlock {
  heading: string
  lines: string[]
}

/* ── Legal & commercial document layer ────────────────────────────────── */

export type LegalDocumentCategory =
  | 'CUSTOMER_TO_PORTWHIZZ'
  | 'COMMERCIAL'
  | 'SHIPMENT'
  | 'FINANCE'
  | 'CREDIT'
  | 'LEGAL_COMPLIANCE'

export interface LegalDocument {
  id: string
  category: LegalDocumentCategory
  title: string
  /** Who signs / who receives. */
  partyFrom: string
  partyTo: string
  version: string
  status: DocStatus
  effectiveFrom?: string
  reviewDue?: string
  jobId?: JobId
  /** Names the clause blocks a production document would need, without
   *  drafting operative legal text. */
  clauseAnatomy: string[]
  purpose: string
  audit: AuditEvent[]
}

/* ══════════════════════════════════════════════════════════════════════════
   FINANCE & SETTLEMENT
   ══════════════════════════════════════════════════════════════════════════ */

export type VendorBillStatus = 'AWAITED' | 'RECEIVED' | 'UNDER_REVIEW' | 'MATCHED' | 'DISPUTED' | 'APPROVED' | 'PAID'

export interface VendorBill {
  id: string
  jobId: JobId
  vendorId: PartyId
  vendorName: string
  billNumber: string
  receivedAt?: string
  dueAt: string
  currency: Currency
  fx: number
  /** What the quote said this would cost. */
  accruedAmount: number
  /** What the vendor actually billed. Undefined until received. */
  billedAmount?: number
  status: VendorBillStatus
  chargeFamily: ChargeFamily
  varianceNote?: string
  audit: AuditEvent[]
}

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'SENT' | 'PART_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'CREDITED'

export interface CustomerInvoice {
  id: string
  jobId: JobId
  customerId: PartyId
  invoiceNumber: string
  issuedAt?: string
  dueAt: string
  currency: Currency
  fx: number
  subtotal: number
  taxAmount: number
  total: number
  amountPaid: number
  status: InvoiceStatus
  lineIds: string[]
  audit: AuditEvent[]
}

export interface PaymentRecord {
  id: string
  invoiceId: string
  jobId: JobId
  amount: number
  currency: Currency
  receivedAt: string
  method: 'NEFT' | 'RTGS' | 'CHEQUE' | 'WIRE' | 'UPI'
  reference: string
}

/** Estimated → provisional → final. Margin firms up as reality lands. */
export type MarginBasis = 'ESTIMATED' | 'PROVISIONAL' | 'FINAL'

export interface JobCostSummary {
  jobId: JobId
  basis: MarginBasis
  sellInr: number
  accruedCostInr: number
  actualCostInr: number
  marginInr: number
  marginPct: number
  /** Cost lines with a material gap between accrual and actual. */
  varianceCount: number
  varianceInr: number
}

export interface CreditFacility {
  id: string
  customerId: PartyId
  customerName: string
  limitInr: number
  utilisedInr: number
  availableInr: number
  creditDays: number
  status: 'ACTIVE' | 'ON_HOLD' | 'REVIEW_DUE' | 'SUSPENDED'
  reviewDue: string
}

/* ══════════════════════════════════════════════════════════════════════════
   THE AGGREGATE ROOT
   ══════════════════════════════════════════════════════════════════════════ */

export interface Job {
  id: JobId
  reference: string
  status: JobStatus
  direction: Direction
  mode: TransportMode
  originId: string
  destinationId: string
  customerId: PartyId
  incoterm: Incoterm
  serviceScope: ServiceScope
  ownerId: UserId
  createdAt: string
  updatedAt: string

  enquiryId?: EnquiryId
  acceptedQuoteId?: QuoteId
  bookingId?: BookingId

  /** Partner coordination status only. Never checklist data. See boundaries.ts. */
  clearanceCoordination?: ClearanceCoordinationStatus
  clearancePartnerId?: PartyId
  clearanceUpdatedAt?: string

  riskLevel: RiskLevel
  customerVisible: boolean
  tags: string[]
  closedAt?: string
  createdInSession?: boolean
}

/**
 * The assembled job file — what `selectJobFile()` returns and what every
 * shipment screen renders from. This type existing at all is the product
 * argument: one call, one shipment, everything about it.
 */
export interface JobFile {
  job: Job
  customer: Party
  owner: AppUser
  origin: Port
  destination: Port
  enquiry?: Enquiry
  quotes: Quote[]
  acceptedQuote?: Quote
  booking?: Booking
  containers: Container[]
  cargo?: CargoDeclaration
  milestones: Milestone[]
  exceptions: Exception[]
  openExceptions: Exception[]
  documents: FreightDocument[]
  vendorBills: VendorBill[]
  invoice?: CustomerInvoice
  costSummary: JobCostSummary
  activity: ActivityEvent[]
  audit: AuditEvent[]
}

/* ══════════════════════════════════════════════════════════════════════════
   INTAKE — the shape the marketing-side wizard produces
   ══════════════════════════════════════════════════════════════════════════ */

export interface IntakeDraft {
  originId?: string
  destinationId?: string
  direction: Direction
  mode: TransportMode
  cargo: Partial<CargoRequest>
  incoterm: Incoterm
  serviceScope: ServiceScope
  inlandDeliveryRequired: boolean
  insuranceRequired: boolean
  specialHandling: SpecialHandling
  clearanceCoordinationRequired: boolean
  companyName: string
  contactPerson: string
  email: string
  phone: string
  preferredContact: PreferredContactMethod
}

export type OptionKind = 'BALANCED' | 'FASTEST' | 'COST_OPTIMISED'

export interface IndicativeOption {
  id: string
  kind: OptionKind
  label: string
  serviceLevel: string
  description: string
  mode: TransportMode
  transitMinDays: number
  transitMaxDays: number
  estimatedDeparture: string
  estimatedArrival: string
  totalUsd: number
  currency: Currency
  validUntil: string
  scheduleFlexibility: 'LOW' | 'MEDIUM' | 'HIGH'
  includedServices: string[]
  excludedServices: string[]
  riskIndicators: string[]
  partnerConfirmationStatus: string
  chargeCategories: OptionChargeCategory[]
}

export interface OptionChargeCategory {
  family: ChargeFamily
  label: string
  amountUsd: number
  basis: string
  note?: string
  /** Exposure-only categories are risks, not quoted charges. */
  exposureOnly?: boolean
}
