import { daysFromNow, hoursFromNow } from '@/lib/demo-clock'
import type { Exception } from '@/types'
import { HERO_JOB_ID } from './jobs'

/**
 * Exceptions are first-class records here, not flags on a shipment.
 *
 * That distinction is the whole control-tower argument: an exception has its
 * own id, owner, deadline, quantified impact, recommended action, customer
 * visibility, notes and audit trail — so it can be assigned, escalated,
 * resolved and reported on. A boolean `isDelayed` on a shipment row cannot
 * do any of those things.
 *
 * The first five are the named cases from the spec, authored against the demo
 * clock so their countdowns read exactly as specified.
 */

export const EXCEPTIONS: Exception[] = [
  /* ══════════════════════════════════════════════════════════════════════
     1 · SHIPPING INSTRUCTION CUTOFF — the headline countdown, 2h 18m
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: 'EXC-2026-00892',
    jobId: HERO_JOB_ID,
    type: 'SHIPPING_INSTRUCTION_CUTOFF',
    title: 'Shipping Instruction Cutoff',
    severity: 'HIGH',
    status: 'OPEN',
    ownerId: 'USR-ARJUN',
    deadline: hoursFromNow(2.3), // → "2h 18m"
    openedAt: hoursFromNow(-5),
    businessImpact:
      'The carrier will not accept an amended shipping instruction after the cutoff. Missing it means the bill of lading is issued against the draft, and any correction becomes a chargeable amendment with a documentation delay at destination.',
    recommendedAction: 'Upload final shipping instruction',
    customerVisible: false,
    exposureInr: 42000,
    notes: [
      {
        id: 'EXN-00892-1',
        author: 'Arjun Mehta',
        at: hoursFromNow(-4.2),
        body: 'Consignee details amended after the draft went in. Awaiting confirmation of the notify party address from Apex before resubmitting.',
      },
    ],
    audit: [],
  },

  /* ══════════════════════════════════════════════════════════════════════
     2 · ETA REVISION — 18 hours later
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: 'EXC-2026-00894',
    jobId: HERO_JOB_ID,
    type: 'ETA_REVISION',
    title: 'ETA Revision',
    severity: 'MEDIUM',
    status: 'IN_PROGRESS',
    ownerId: 'USR-ARJUN',
    deadline: hoursFromNow(26),
    openedAt: hoursFromNow(-5.1),
    businessImpact:
      'Arrival delayed by 18 hours. The booked delivery slot at the Pune plant no longer aligns with discharge, and the transporter allocation needs to move with it.',
    recommendedAction: 'We are confirming a revised delivery slot with the transporter',
    customerVisible: true,
    notes: [
      {
        id: 'EXN-00894-1',
        author: 'Arjun Mehta',
        at: hoursFromNow(-3.5),
        body: 'Westline contacted about moving the vehicle allocation to the 22nd. Awaiting their confirmation.',
      },
    ],
    audit: [],
  },

  /* ══════════════════════════════════════════════════════════════════════
     3 · FREE-TIME RISK — critical, storage & detention exposure
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: 'EXC-2026-00887',
    jobId: 'PW-2026-004262',
    type: 'FREE_TIME_RISK',
    title: 'Free-Time Risk',
    severity: 'CRITICAL',
    status: 'OPEN',
    ownerId: 'USR-ARJUN',
    deadline: hoursFromNow(41),
    openedAt: hoursFromNow(-13),
    businessImpact:
      // The figures are the ones Nhava Sheva publishes (data/port-profiles.ts)
      // and the ones the free-time projection in data/customer-finance.ts
      // charges. An exception that quotes its own rates is a third number on
      // the same box, and the customer meets all three in two clicks.
      'Potential storage or detention exposure. Seven days of carrier free time expire with the container still at the terminal; storage then accrues at ₹1,450 per container per day from day 6, and detention at USD 60 per 20ft per day from day 8.',
    recommendedAction: 'We are coordinating delivery so the container leaves the terminal before free time expires',
    customerVisible: true,
    exposureInr: 96500,
    notes: [
      {
        id: 'EXN-00887-1',
        author: 'Meera Iyer',
        at: hoursFromNow(-9),
        body: 'Escalated to the customer. Apex confirmed the plant can receive on the 17th if the delivery order is released tomorrow.',
      },
      {
        id: 'EXN-00887-2',
        author: 'Arjun Mehta',
        at: hoursFromNow(-2),
        body: 'Clearance partner has confirmed the update was received. Delivery order can be raised once carrier charges settle.',
      },
    ],
    audit: [],
  },

  /* ══════════════════════════════════════════════════════════════════════
     4 · CONTAINER NOT GATED IN — sailing at risk
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: 'EXC-2026-00896',
    jobId: 'PW-2026-004290',
    type: 'CONTAINER_NOT_GATED_IN',
    title: 'Container Not Gated In',
    severity: 'HIGH',
    status: 'OPEN',
    ownerId: 'USR-ARJUN',
    deadline: hoursFromNow(4.25),
    openedAt: hoursFromNow(-7),
    businessImpact:
      'Potential sailing miss. HLXU8830571 is stuffed and sealed but has not been accepted at Yangshan against the booking. If it misses the gate-in cutoff the box rolls to the next vessel, adding roughly seven days to transit.',
    recommendedAction: 'Contact origin transporter',
    customerVisible: false,
    exposureInr: 138000,
    notes: [
      {
        id: 'EXN-00896-1',
        author: 'Arjun Mehta',
        at: hoursFromNow(-6),
        body: 'Eastport report terminal congestion at the Phase III gate. Truck is in the queue.',
      },
    ],
    audit: [],
  },

  /* ══════════════════════════════════════════════════════════════════════
     5 · VENDOR INVOICE MISMATCH — ₹48,500 variance
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: 'EXC-2026-00871',
    jobId: 'PW-2026-004241',
    type: 'VENDOR_INVOICE_MISMATCH',
    title: 'Vendor Invoice Mismatch',
    severity: 'MEDIUM',
    status: 'OPEN',
    ownerId: 'USR-FINANCE',
    deadline: daysFromNow(3),
    openedAt: daysFromNow(-2),
    businessImpact:
      'Variance of ₹48,500 between the accrued inland haulage cost and the transporter invoice. Approving as billed would take the job margin below the quoted position.',
    recommendedAction: 'Review vendor invoice',
    customerVisible: false,
    exposureInr: 48500,
    notes: [
      {
        id: 'EXN-00871-1',
        author: 'Finance User',
        at: daysFromNow(-1),
        body: 'Westline have billed 14 hours of waiting against a 6-hour free window. Detention at site claim needs supporting proof before approval.',
      },
    ],
    audit: [],
  },

  /* ══════════════════════════════════════════════════════════════════════
     Supporting queue — so the exception board is a real queue
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: 'EXC-2026-00897',
    jobId: 'PW-2026-004296',
    type: 'VGM_CUTOFF',
    title: 'VGM Cutoff Approaching',
    severity: 'HIGH',
    status: 'OPEN',
    ownerId: 'USR-ARJUN',
    deadline: hoursFromNow(9),
    openedAt: hoursFromNow(-3),
    businessImpact:
      'MRKU7781205 has no verified gross mass submitted. Without VGM the carrier will not load the container, regardless of gate-in status.',
    recommendedAction: 'Obtain weighbridge certificate from the shipper',
    customerVisible: false,
    exposureInr: 61000,
    notes: [],
    audit: [],
  },
  {
    id: 'EXC-2026-00893',
    jobId: HERO_JOB_ID,
    type: 'CLEARANCE_DEPENDENCY',
    title: 'Clearance Dependency Open',
    severity: 'MEDIUM',
    status: 'IN_PROGRESS',
    ownerId: 'USR-ARJUN',
    deadline: daysFromNow(2),
    openedAt: hoursFromNow(-19),
    businessImpact:
      'The delivery order cannot be raised until the external customs partner confirms clearance status. This sits on the critical path to the 22 Aug delivery target.',
    recommendedAction: 'We are chasing the assigned clearance partner for a status update',
    customerVisible: true,
    notes: [
      {
        id: 'EXN-00893-1',
        author: 'Arjun Mehta',
        at: hoursFromNow(-18),
        body: 'Coastal Clearance Partners assigned and acknowledged. Awaiting their status update.',
      },
    ],
    audit: [],
  },
  {
    id: 'EXC-2026-00889',
    jobId: 'PW-2026-004283',
    type: 'DOCUMENT_DELAY',
    title: 'Arrival Notice Not Received',
    severity: 'MEDIUM',
    status: 'OPEN',
    ownerId: 'USR-ARJUN',
    deadline: daysFromNow(1),
    openedAt: hoursFromNow(-28),
    businessImpact:
      'Consol arrival notice outstanding from the co-loader. Without it the CFS cannot be nominated and destination handling stalls.',
    recommendedAction: 'Chase the co-loader for the arrival notice',
    customerVisible: false,
    notes: [],
    audit: [],
  },
  {
    id: 'EXC-2026-00885',
    jobId: 'PW-2026-004305',
    type: 'DOCUMENT_DELAY',
    title: 'Quote Validity Expiring',
    severity: 'MEDIUM',
    status: 'OPEN',
    ownerId: 'USR-SALES',
    deadline: hoursFromNow(31),
    openedAt: daysFromNow(-1),
    businessImpact:
      'Quote QT-2026-00298-V1 expires tomorrow with no customer decision. Reefer buy rates have moved since it was issued; requoting will not hold the same position.',
    recommendedAction: 'Follow up with the customer or reissue at current rates',
    customerVisible: false,
    exposureInr: 24000,
    notes: [],
    audit: [],
  },
  {
    id: 'EXC-2026-00878',
    jobId: 'PW-2026-004264',
    type: 'DELIVERY_DELAY',
    title: 'Delivery Slot Missed',
    severity: 'LOW',
    status: 'IN_PROGRESS',
    ownerId: 'USR-MEERA',
    deadline: daysFromNow(2),
    openedAt: daysFromNow(-1),
    businessImpact:
      'Consignee could not receive on the booked slot. Rebooking to the next available window; no cost impact while the container remains within free time.',
    recommendedAction: 'We are rebooking the delivery slot with the consignee',
    customerVisible: true,
    notes: [],
    audit: [],
  },
  {
    id: 'EXC-2026-00866',
    jobId: 'PW-2026-004241',
    type: 'PAYMENT_OVERDUE',
    title: 'Invoice Overdue',
    severity: 'MEDIUM',
    status: 'OPEN',
    ownerId: 'USR-FINANCE',
    deadline: daysFromNow(4),
    openedAt: daysFromNow(-4),
    businessImpact:
      'Customer invoice INV-2026-01188 is 12 days past its due date. Utilised credit on this account is approaching the agreed limit.',
    recommendedAction: 'Escalate to the account owner and hold new bookings on this account',
    customerVisible: false,
    exposureInr: 284000,
    notes: [],
    audit: [],
  },
  {
    id: 'EXC-2026-00858',
    jobId: 'PW-2026-004276',
    type: 'ETA_REVISION',
    title: 'ETA Revision — Mundra',
    severity: 'LOW',
    status: 'IN_PROGRESS',
    ownerId: 'USR-ARJUN',
    deadline: daysFromNow(3),
    openedAt: daysFromNow(-2),
    businessImpact: 'Arrival moved forward by 9 hours. No delivery impact; the destination plan absorbs it.',
    recommendedAction: 'We are updating the arrival date on this shipment; no action is needed from you',
    customerVisible: true,
    notes: [],
    audit: [],
  },
  {
    id: 'EXC-2026-00849',
    jobId: 'PW-2026-004292',
    type: 'BOOKING_ROLLOVER',
    title: 'Booking Rolled by Carrier',
    severity: 'HIGH',
    status: 'REOPENED',
    ownerId: 'USR-MEERA',
    deadline: daysFromNow(1),
    openedAt: daysFromNow(-3),
    businessImpact:
      'Carrier rolled the OOG unit to the next sailing citing stowage. Adds seven days and puts the customer’s contractual delivery window at risk.',
    recommendedAction: 'We are confirming the replacement vessel and reissuing your booking confirmation',
    customerVisible: true,
    exposureInr: 118000,
    notes: [
      {
        id: 'EXN-00849-1',
        author: 'Meera Iyer',
        at: daysFromNow(-2),
        body: 'Marked resolved when the carrier offered space on the 19th, then reopened when that allocation was also withdrawn.',
      },
    ],
    audit: [],
  },
  {
    id: 'EXC-2026-00847',
    jobId: 'PW-2026-004313',
    type: 'DOCUMENT_DELAY',
    title: 'Cargo Details Incomplete',
    severity: 'LOW',
    status: 'OPEN',
    ownerId: 'USR-SALES',
    deadline: daysFromNow(2),
    openedAt: hoursFromNow(-27),
    businessImpact:
      'LCL enquiry cannot be priced without confirmed CBM and package dimensions. The enquiry ages while the lane rate validity runs down.',
    recommendedAction: 'Request cargo dimensions from the customer',
    customerVisible: false,
    notes: [],
    audit: [],
  },

  /* ── Resolved, retained so the queue's history filter has something ── */
  {
    id: 'EXC-2026-00841',
    jobId: 'PW-2026-004243',
    type: 'CARGO_DAMAGE',
    title: 'Packaging Damage Reported at Delivery',
    severity: 'LOW',
    status: 'RESOLVED',
    ownerId: 'USR-ARJUN',
    openedAt: daysFromNow(-5),
    resolvedAt: daysFromNow(-3),
    businessImpact: 'Two cartons water-marked on arrival. Cargo itself undamaged; consignee accepted with a remark on the POD.',
    recommendedAction: 'The cargo photographs are filed against this shipment for you to review',
    customerVisible: true,
    resolutionNote:
      'Photographs filed against the job and shared with the customer. No claim raised — consignee confirmed contents were unaffected.',
    notes: [],
    audit: [],
  },
]

/**
 * The dashboard reports 14 open exceptions — and all fourteen are authored
 * above, so every row in the queue opens a real record with a real owner,
 * deadline and audit trail. A metric tile whose count exceeds the rows behind
 * it is the fastest way to lose an operations audience.
 *
 * The count is computed in store/selectors.ts, never typed into the tile.
 */
export const BACKGROUND_OPEN_EXCEPTION_COUNT = 0
