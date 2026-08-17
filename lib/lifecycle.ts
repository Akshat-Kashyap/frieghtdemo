/**
 * LIFECYCLE STATE MACHINES
 * ══════════════════════════════════════════════════════════════════════════
 * Every status transition in the product is declared here, once.
 *
 * The alternative — each screen hardcoding which buttons to show — is how a
 * workflow app ends up letting someone "Confirm" an already-cancelled booking
 * from one screen but not another. Instead the UI asks `nextStates(current)`
 * and renders what comes back, so the rules and the interface cannot drift.
 */

import type {
  BookingState,
  ContainerStatus,
  DocStatus,
  EnquiryStage,
  ExceptionStatus,
  JobStatus,
  QuoteStatus,
  Severity,
} from '@/types'

/* ══════════════════════════════════════════════════════════════════════════
   Shared shape
   ══════════════════════════════════════════════════════════════════════════ */

export interface StateMeta {
  label: string
  /** Which signal colour this state carries. Colour is state, never decoration. */
  tone: 'neutral' | 'route' | 'signal' | 'amber' | 'critical' | 'violet' | 'muted'
  description: string
}

interface Machine<S extends string> {
  order: readonly S[]
  meta: Record<S, StateMeta>
  transitions: Record<S, readonly S[]>
}

function machineHelpers<S extends string>(m: Machine<S>) {
  return {
    ...m,
    canTransition: (from: S, to: S): boolean => m.transitions[from].includes(to),
    nextStates: (from: S): readonly S[] => m.transitions[from],
    /** Position on the happy path, for progress rails. -1 when off-path. */
    indexOf: (state: S): number => m.order.indexOf(state),
    isTerminal: (state: S): boolean => m.transitions[state].length === 0,
    labelOf: (state: S): string => m.meta[state].label,
    toneOf: (state: S): StateMeta['tone'] => m.meta[state].tone,
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   JOB — the master shipment lifecycle
   ══════════════════════════════════════════════════════════════════════════ */

export const JobLifecycle = machineHelpers<JobStatus>({
  order: [
    'ENQUIRY',
    'QUOTED',
    'BOOKED',
    'ORIGIN_HANDLING',
    'IN_TRANSIT',
    'ARRIVING',
    'DELIVERED',
    'CLOSED',
  ],
  meta: {
    ENQUIRY: { label: 'Enquiry', tone: 'neutral', description: 'Freight request captured, not yet priced.' },
    QUOTED: { label: 'Quoted', tone: 'violet', description: 'Commercial offer issued, awaiting acceptance.' },
    BOOKED: { label: 'Booked', tone: 'route', description: 'Carrier space confirmed against the job.' },
    ORIGIN_HANDLING: {
      label: 'Origin Handling',
      tone: 'route',
      description: 'Cargo received, stuffed and moving to the terminal.',
    },
    IN_TRANSIT: { label: 'In Transit', tone: 'route', description: 'On the water or in the air.' },
    ARRIVING: { label: 'Arriving', tone: 'amber', description: 'Discharge and delivery coordination window.' },
    DELIVERED: { label: 'Delivered', tone: 'signal', description: 'Cargo delivered, proof of delivery expected.' },
    CLOSED: { label: 'Closed', tone: 'muted', description: 'Reconciled, invoiced and settled.' },
  },
  transitions: {
    ENQUIRY: ['QUOTED'],
    QUOTED: ['BOOKED', 'ENQUIRY'],
    BOOKED: ['ORIGIN_HANDLING'],
    ORIGIN_HANDLING: ['IN_TRANSIT'],
    IN_TRANSIT: ['ARRIVING'],
    ARRIVING: ['DELIVERED'],
    DELIVERED: ['CLOSED'],
    CLOSED: [],
  },
})

/** Statuses that count as an active freight job on the dashboard. */
export const ACTIVE_JOB_STATUSES: readonly JobStatus[] = [
  'ENQUIRY',
  'QUOTED',
  'BOOKED',
  'ORIGIN_HANDLING',
  'IN_TRANSIT',
  'ARRIVING',
]

/** The customer-facing progress rail from §11 — deliberately coarser than
 *  the internal status, because a customer does not need eight states. */
export const CUSTOMER_PROGRESS = [
  'Enquiry',
  'Quoted',
  'Booked',
  'Loaded',
  'Departed',
  'Arriving',
  'Delivered',
] as const

export function customerProgressIndex(status: JobStatus): number {
  const map: Record<JobStatus, number> = {
    ENQUIRY: 0,
    QUOTED: 1,
    BOOKED: 2,
    ORIGIN_HANDLING: 3,
    IN_TRANSIT: 4,
    ARRIVING: 5,
    DELIVERED: 6,
    CLOSED: 6,
  }
  return map[status]
}

/* ══════════════════════════════════════════════════════════════════════════
   ENQUIRY PIPELINE
   ══════════════════════════════════════════════════════════════════════════ */

export const EnquiryLifecycle = machineHelpers<EnquiryStage>({
  order: [
    'NEW',
    'INFORMATION_REQUIRED',
    'RATES_REQUESTED',
    'QUOTE_DRAFTED',
    'QUOTE_SENT',
    'ACCEPTED',
    'BOOKING_PENDING',
    'CONVERTED',
    'LOST',
    'EXPIRED',
  ],
  meta: {
    NEW: { label: 'New', tone: 'neutral', description: 'Freight request received, not yet triaged.' },
    INFORMATION_REQUIRED: {
      label: 'Information Required',
      tone: 'amber',
      description: 'Blocked on missing cargo, lane or scope detail from the customer.',
    },
    RATES_REQUESTED: {
      label: 'Rates Requested',
      tone: 'violet',
      description: 'Buy rates requested from partners, awaiting response.',
    },
    QUOTE_DRAFTED: { label: 'Quote Drafted', tone: 'route', description: 'Charge lines built, not yet issued.' },
    QUOTE_SENT: { label: 'Quote Sent', tone: 'route', description: 'Offer with the customer, validity running.' },
    ACCEPTED: { label: 'Accepted', tone: 'signal', description: 'Customer accepted the commercial offer.' },
    BOOKING_PENDING: {
      label: 'Booking Pending',
      tone: 'amber',
      description: 'Accepted, awaiting carrier space confirmation.',
    },
    CONVERTED: { label: 'Converted', tone: 'signal', description: 'Became a live freight job.' },
    LOST: { label: 'Lost', tone: 'critical', description: 'Not won — reason recorded for lane analytics.' },
    EXPIRED: { label: 'Expired', tone: 'muted', description: 'Quote validity lapsed without a decision.' },
  },
  transitions: {
    NEW: ['INFORMATION_REQUIRED', 'RATES_REQUESTED', 'LOST'],
    INFORMATION_REQUIRED: ['RATES_REQUESTED', 'LOST', 'EXPIRED'],
    RATES_REQUESTED: ['QUOTE_DRAFTED', 'INFORMATION_REQUIRED', 'LOST'],
    QUOTE_DRAFTED: ['QUOTE_SENT', 'RATES_REQUESTED', 'LOST'],
    QUOTE_SENT: ['ACCEPTED', 'LOST', 'EXPIRED', 'QUOTE_DRAFTED'],
    ACCEPTED: ['BOOKING_PENDING', 'LOST'],
    BOOKING_PENDING: ['CONVERTED', 'LOST'],
    CONVERTED: [],
    LOST: ['NEW'],
    EXPIRED: ['NEW', 'RATES_REQUESTED'],
  },
})

/** Columns that represent live work — used for pipeline value roll-ups. */
export const OPEN_ENQUIRY_STAGES: readonly EnquiryStage[] = [
  'NEW',
  'INFORMATION_REQUIRED',
  'RATES_REQUESTED',
  'QUOTE_DRAFTED',
  'QUOTE_SENT',
  'ACCEPTED',
  'BOOKING_PENDING',
]

/* ══════════════════════════════════════════════════════════════════════════
   QUOTE — commercial status, separate from its document status
   ══════════════════════════════════════════════════════════════════════════ */

export const QuoteLifecycle = machineHelpers<QuoteStatus>({
  order: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED', 'CANCELLED'],
  meta: {
    DRAFT: { label: 'Draft', tone: 'neutral', description: 'Being priced internally.' },
    SENT: { label: 'Sent', tone: 'route', description: 'With the customer, validity running.' },
    ACCEPTED: { label: 'Accepted', tone: 'signal', description: 'Commercially agreed.' },
    REJECTED: { label: 'Rejected', tone: 'critical', description: 'Declined by the customer.' },
    EXPIRED: { label: 'Expired', tone: 'muted', description: 'Validity lapsed.' },
    SUPERSEDED: { label: 'Superseded', tone: 'muted', description: 'Replaced by a later version.' },
    CANCELLED: { label: 'Cancelled', tone: 'muted', description: 'Withdrawn before decision.' },
  },
  transitions: {
    DRAFT: ['SENT', 'CANCELLED'],
    SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED', 'CANCELLED'],
    ACCEPTED: ['SUPERSEDED'],
    REJECTED: ['SUPERSEDED'],
    EXPIRED: ['SUPERSEDED'],
    SUPERSEDED: [],
    CANCELLED: [],
  },
})

/* ══════════════════════════════════════════════════════════════════════════
   DOCUMENT — governs the vault, quotes-as-documents and the legal layer
   ══════════════════════════════════════════════════════════════════════════ */

export const DocumentLifecycle = machineHelpers<DocStatus>({
  order: ['DRAFT', 'ISSUED', 'SENT', 'ACCEPTED', 'AMENDED', 'SUPERSEDED', 'CANCELLED', 'ARCHIVED'],
  meta: {
    DRAFT: { label: 'Draft', tone: 'neutral', description: 'Being prepared, not yet a record.' },
    ISSUED: { label: 'Issued', tone: 'violet', description: 'Finalised internally and version-stamped.' },
    SENT: { label: 'Sent', tone: 'route', description: 'Transmitted to the counterparty.' },
    ACCEPTED: { label: 'Accepted', tone: 'signal', description: 'Acknowledged or countersigned.' },
    AMENDED: { label: 'Amended', tone: 'amber', description: 'Changed after issue; a new version exists.' },
    SUPERSEDED: { label: 'Superseded', tone: 'muted', description: 'Replaced by a later version.' },
    CANCELLED: { label: 'Cancelled', tone: 'critical', description: 'Withdrawn; no longer operative.' },
    ARCHIVED: { label: 'Archived', tone: 'muted', description: 'Closed out and retained for audit.' },
  },
  transitions: {
    DRAFT: ['ISSUED', 'CANCELLED'],
    ISSUED: ['SENT', 'AMENDED', 'CANCELLED'],
    SENT: ['ACCEPTED', 'AMENDED', 'CANCELLED'],
    ACCEPTED: ['AMENDED', 'ARCHIVED'],
    AMENDED: ['ISSUED', 'SENT', 'SUPERSEDED', 'CANCELLED'],
    SUPERSEDED: ['ARCHIVED'],
    CANCELLED: ['ARCHIVED'],
    ARCHIVED: [],
  },
})

/* ══════════════════════════════════════════════════════════════════════════
   BOOKING
   ══════════════════════════════════════════════════════════════════════════ */

export const BookingLifecycle = machineHelpers<BookingState>({
  order: ['REQUESTED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'AMENDED', 'ROLLED_OVER', 'CANCELLED', 'CLOSED'],
  meta: {
    REQUESTED: { label: 'Requested', tone: 'neutral', description: 'Space requested from the carrier.' },
    PENDING_CONFIRMATION: {
      label: 'Pending Confirmation',
      tone: 'amber',
      description: 'Awaiting the carrier booking note.',
    },
    CONFIRMED: { label: 'Confirmed', tone: 'signal', description: 'Space confirmed; cutoffs are live.' },
    AMENDED: { label: 'Amended', tone: 'amber', description: 'Changed after confirmation.' },
    ROLLED_OVER: {
      label: 'Rolled Over',
      tone: 'critical',
      description: 'Missed the intended sailing; moved to a later vessel.',
    },
    CANCELLED: { label: 'Cancelled', tone: 'critical', description: 'Booking withdrawn.' },
    CLOSED: { label: 'Closed', tone: 'muted', description: 'Carriage complete.' },
  },
  transitions: {
    REQUESTED: ['PENDING_CONFIRMATION', 'CANCELLED'],
    PENDING_CONFIRMATION: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['AMENDED', 'ROLLED_OVER', 'CANCELLED', 'CLOSED'],
    AMENDED: ['CONFIRMED', 'ROLLED_OVER', 'CANCELLED'],
    ROLLED_OVER: ['CONFIRMED', 'CANCELLED'],
    CANCELLED: [],
    CLOSED: [],
  },
})

/* ══════════════════════════════════════════════════════════════════════════
   CONTAINER
   ══════════════════════════════════════════════════════════════════════════ */

export const ContainerLifecycle = machineHelpers<ContainerStatus>({
  order: [
    'EMPTY_DISPATCHED',
    'STUFFING',
    'GATE_IN_PENDING',
    'GATED_IN',
    'LOADED',
    'DISCHARGED',
    'DELIVERED',
    'EMPTY_RETURNED',
  ],
  meta: {
    EMPTY_DISPATCHED: { label: 'Empty dispatched', tone: 'neutral', description: 'Empty box released from the depot.' },
    STUFFING: { label: 'Stuffing', tone: 'route', description: 'Cargo being loaded into the container.' },
    GATE_IN_PENDING: {
      label: 'Gate-in pending',
      tone: 'amber',
      description: 'Stuffed but not yet accepted at the terminal.',
    },
    GATED_IN: { label: 'Gated in', tone: 'route', description: 'Accepted at the terminal against the booking.' },
    LOADED: { label: 'Loaded', tone: 'signal', description: 'On board the vessel.' },
    DISCHARGED: { label: 'Discharged', tone: 'route', description: 'Landed at the destination terminal.' },
    DELIVERED: { label: 'Delivered', tone: 'signal', description: 'Delivered to the consignee.' },
    EMPTY_RETURNED: { label: 'Empty returned', tone: 'muted', description: 'Box returned; detention clock stopped.' },
  },
  transitions: {
    EMPTY_DISPATCHED: ['STUFFING'],
    STUFFING: ['GATE_IN_PENDING'],
    GATE_IN_PENDING: ['GATED_IN'],
    GATED_IN: ['LOADED'],
    LOADED: ['DISCHARGED'],
    DISCHARGED: ['DELIVERED'],
    DELIVERED: ['EMPTY_RETURNED'],
    EMPTY_RETURNED: [],
  },
})

/* ══════════════════════════════════════════════════════════════════════════
   EXCEPTION
   ══════════════════════════════════════════════════════════════════════════ */

export const ExceptionLifecycle = machineHelpers<ExceptionStatus>({
  order: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REOPENED'],
  meta: {
    OPEN: { label: 'Open', tone: 'critical', description: 'Raised and unowned work.' },
    IN_PROGRESS: { label: 'In Progress', tone: 'amber', description: 'Being actively worked.' },
    RESOLVED: { label: 'Resolved', tone: 'signal', description: 'Closed with a resolution note.' },
    REOPENED: { label: 'Reopened', tone: 'critical', description: 'Recurred after being closed.' },
  },
  transitions: {
    OPEN: ['IN_PROGRESS', 'RESOLVED'],
    IN_PROGRESS: ['RESOLVED', 'OPEN'],
    RESOLVED: ['REOPENED'],
    REOPENED: ['IN_PROGRESS', 'RESOLVED'],
  },
})

export const OPEN_EXCEPTION_STATUSES: readonly ExceptionStatus[] = ['OPEN', 'IN_PROGRESS', 'REOPENED']

export function isExceptionOpen(status: ExceptionStatus): boolean {
  return OPEN_EXCEPTION_STATUSES.includes(status)
}

/* ══════════════════════════════════════════════════════════════════════════
   SEVERITY — ordered so queues sort by "what will hurt soonest"
   ══════════════════════════════════════════════════════════════════════════ */

export const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

export const SEVERITY_META: Record<Severity, StateMeta> = {
  CRITICAL: { label: 'Critical', tone: 'critical', description: 'Money or the sailing is at stake right now.' },
  HIGH: { label: 'High', tone: 'critical', description: 'Will become critical without action today.' },
  MEDIUM: { label: 'Medium', tone: 'amber', description: 'Needs a decision this week.' },
  LOW: { label: 'Low', tone: 'neutral', description: 'Tracked, not urgent.' },
}

export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITY_ORDER[a] - SEVERITY_ORDER[b]
}

/* ══════════════════════════════════════════════════════════════════════════
   Shared label tables for enums without a machine
   ══════════════════════════════════════════════════════════════════════════ */

export const MODE_LABEL: Record<string, string> = {
  OCEAN_FCL: 'Ocean FCL',
  OCEAN_LCL: 'Ocean LCL',
  AIR: 'Air',
  DOMESTIC_FTL: 'Domestic FTL',
  DOMESTIC_LTL: 'Domestic LTL',
}

export const MODE_SHORT: Record<string, string> = {
  OCEAN_FCL: 'FCL',
  OCEAN_LCL: 'LCL',
  AIR: 'AIR',
  DOMESTIC_FTL: 'FTL',
  DOMESTIC_LTL: 'LTL',
}

export const DIRECTION_LABEL: Record<string, string> = {
  IMPORT: 'Import',
  EXPORT: 'Export',
  DOMESTIC: 'Domestic',
}

export const SERVICE_SCOPE_LABEL: Record<string, string> = {
  PORT_TO_PORT: 'Port to port',
  DOOR_TO_PORT: 'Door to port',
  PORT_TO_DOOR: 'Port to door',
  DOOR_TO_DOOR: 'Door to door',
}

export const SPECIAL_HANDLING_LABEL: Record<string, string> = {
  NONE: 'None',
  REEFER: 'Reefer',
  DANGEROUS_GOODS: 'Dangerous goods',
  OVERSIZED: 'Oversized cargo',
  FRAGILE: 'Fragile cargo',
  TEMPERATURE_CONTROLLED: 'Temperature controlled',
}

export const CHARGE_BASIS_LABEL: Record<string, string> = {
  PER_CONTAINER: 'Per container',
  PER_BL: 'Per BL',
  PER_SHIPMENT: 'Per shipment',
  PER_KG: 'Per kg',
  PER_CBM: 'Per CBM',
  PER_TON: 'Per ton',
  PER_VEHICLE: 'Per vehicle',
  PER_DAY: 'Per day',
  PER_HOUR: 'Per hour',
  PERCENTAGE: 'Percentage',
  LUMPSUM: 'Lump sum',
}

export const CHARGE_FAMILY_LABEL: Record<string, string> = {
  MAIN_CARRIAGE: 'Main carriage',
  FUEL_SURCHARGE: 'Fuel surcharge',
  ORIGIN_HANDLING: 'Origin handling',
  DESTINATION_HANDLING: 'Destination handling',
  TERMINAL_HANDLING: 'Terminal handling',
  DOCUMENTATION: 'Documentation',
  INLAND: 'Inland movement',
  INSURANCE: 'Insurance',
  WAITING: 'Waiting',
  STORAGE: 'Storage exposure',
  DETENTION: 'Detention exposure',
  SPECIAL_HANDLING: 'Special handling',
  DELIVERY_ORDER: 'Delivery order',
  CFS: 'CFS',
}

export const CHARGE_SOURCE_LABEL: Record<string, string> = {
  CONTRACT_RATE: 'Contract rate',
  SPOT_RATE: 'Spot rate',
  PARTNER_QUOTE: 'Partner quote',
  PUBLISHED_TARIFF: 'Published tariff',
  MANUAL: 'Manual',
  ESTIMATE: 'Estimate',
}

export const TAX_TREATMENT_LABEL: Record<string, string> = {
  GST_18: 'GST 18%',
  GST_5: 'GST 5%',
  ZERO_RATED: 'Zero rated',
  EXEMPT: 'Exempt',
  REVERSE_CHARGE: 'Reverse charge',
  OUT_OF_SCOPE: 'Out of scope',
}

export const PAYER_LABEL: Record<string, string> = {
  CUSTOMER: 'Customer',
  SHIPPER: 'Shipper',
  CONSIGNEE: 'Consignee',
  PORTWHIZZ: 'PortWhizz',
  THIRD_PARTY: 'Third party',
}

export const APPLICABILITY_LABEL: Record<string, string> = {
  CONFIRMED: 'Confirmed',
  CONDITIONAL: 'Conditional',
  EXPOSURE_ONLY: 'Exposure only',
}

export const MILESTONE_SOURCE_LABEL: Record<string, string> = {
  SIMULATED_CARRIER_EVENT: 'Simulated carrier event',
  MANUAL_ENTRY: 'Manual entry',
  BOOKING_CONFIRMATION: 'Booking confirmation',
  CUSTOMER_UPLOAD: 'Customer upload',
  AGENT_UPDATE: 'Agent update',
  TRANSPORTER_UPDATE: 'Transporter update',
  EMAIL: 'Email',
}

export const MILESTONE_CATEGORY_LABEL: Record<string, string> = {
  CARRIER: 'Carrier',
  ORIGIN: 'Origin',
  DESTINATION: 'Destination',
  TRANSPORT: 'Transport',
  DOCUMENTS: 'Documents',
  EXCEPTIONS: 'Exceptions',
  FINANCE: 'Finance',
}

export const EXCEPTION_TYPE_LABEL: Record<string, string> = {
  SHIPPING_INSTRUCTION_CUTOFF: 'Shipping Instruction Cutoff',
  VGM_CUTOFF: 'VGM Cutoff',
  ETA_REVISION: 'ETA Revision',
  FREE_TIME_RISK: 'Free-Time Risk',
  CONTAINER_NOT_GATED_IN: 'Container Not Gated In',
  VENDOR_INVOICE_MISMATCH: 'Vendor Invoice Mismatch',
  BOOKING_ROLLOVER: 'Booking Rollover',
  DOCUMENT_DELAY: 'Document Delay',
  CLEARANCE_DEPENDENCY: 'Clearance Dependency',
  DELIVERY_DELAY: 'Delivery Delay',
  CARGO_DAMAGE: 'Cargo Damage',
  PAYMENT_OVERDUE: 'Payment Overdue',
}

export const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  CUSTOMER_ENQUIRY: 'Customer enquiry',
  RATE_REQUEST: 'Rate request',
  QUOTE: 'Quote',
  BOOKING_CONFIRMATION: 'Booking confirmation',
  SHIPPING_INSTRUCTION: 'Shipping instruction',
  VGM_RECORD: 'VGM record',
  BILL_OF_LADING: 'Bill of lading',
  ARRIVAL_NOTICE: 'Arrival notice',
  DELIVERY_ORDER: 'Delivery order',
  TRANSPORT_ORDER: 'Transport order',
  PROOF_OF_DELIVERY: 'Proof of delivery',
  VENDOR_INVOICE: 'Vendor invoice',
  CUSTOMER_INVOICE: 'Customer invoice',
  PACKING_LIST: 'Packing list',
  CARGO_PHOTOGRAPHS: 'Cargo photographs',
}

export const RELEASE_TYPE_LABEL: Record<string, string> = {
  ORIGINAL_BL: 'Original BL',
  SEAWAY_BILL: 'Seaway bill',
  TELEX_RELEASE: 'Telex release',
  EXPRESS_RELEASE: 'Express release',
}

export const VGM_METHOD_LABEL: Record<string, string> = {
  METHOD_1_WEIGHBRIDGE: 'Method 1 — weighbridge',
  METHOD_2_CALCULATED: 'Method 2 — calculated',
  PENDING: 'Pending confirmation',
}

export const VEHICLE_TYPE_LABEL: Record<string, string> = {
  '19FT_SXL': '19ft SXL',
  '24FT_SXL': '24ft SXL',
  '32FT_SXL': '32ft SXL',
  '32FT_MXL': '32ft MXL',
  TRAILER_40FT: '40ft trailer',
  CONTAINER_20FT: '20ft container truck',
}

export const RISK_LABEL: Record<string, string> = {
  CLEAR: 'Clear',
  WATCH: 'Watch',
  AT_RISK: 'At risk',
}

export const VENDOR_BILL_STATUS_LABEL: Record<string, string> = {
  AWAITED: 'Awaited',
  RECEIVED: 'Received',
  UNDER_REVIEW: 'Under review',
  MATCHED: 'Matched',
  DISPUTED: 'Disputed',
  APPROVED: 'Approved',
  PAID: 'Paid',
}

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  ISSUED: 'Issued',
  SENT: 'Sent',
  PART_PAID: 'Part paid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
  CREDITED: 'Credited',
}
