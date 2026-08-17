import { daysFromNow } from '@/lib/demo-clock'
import type { Milestone } from '@/types'
import { HERO_JOB_ID } from './jobs'

/**
 * The hero shipment's timeline — the full 15-event sequence.
 *
 * Against the demo clock (16 Aug 2026, 09:20 IST) events 06–16 Aug are
 * complete or in progress and 18–23 Aug are still expected, which is what
 * makes the vertical rail read as a shipment genuinely mid-journey rather
 * than a list of dates.
 *
 * Every event carries its source and responsible party because that is the
 * actual argument: a milestone nobody can attribute is a rumour, not a record.
 */

/** Days offset from the demo clock for each authored calendar date. */
const AUG = (day: number, hour = 9, minute = 0) =>
  // 16 Aug 09:20 IST is the origin; convert an August date to a day offset.
  daysFromNow(day - 16 + (hour - 9) / 24 + (minute - 20) / 1440)

let seq = 0
const mid = () => `MS-${HERO_JOB_ID.slice(-6)}-${String(++seq).padStart(2, '0')}`

export const HERO_MILESTONES: Milestone[] = [
  {
    id: mid(),
    jobId: HERO_JOB_ID,
    title: 'Enquiry created',
    at: AUG(6, 11, 5),
    location: 'PortWhizz — Mumbai desk',
    source: 'MANUAL_ENTRY',
    responsibleParty: 'Sales Desk',
    status: 'COMPLETED',
    category: 'DOCUMENTS',
    documentId: 'DOC-4281-ENQ',
    customerVisible: true,
    notes: 'Freight request received from Apex Industrial Systems for 2 × 40HC ex Shanghai.',
    audit: [],
  },
  {
    id: mid(),
    jobId: HERO_JOB_ID,
    title: 'Quote accepted',
    at: AUG(7, 16, 40),
    location: 'PortWhizz — Mumbai desk',
    source: 'EMAIL',
    responsibleParty: 'Apex Industrial Systems Pvt. Ltd.',
    status: 'COMPLETED',
    category: 'FINANCE',
    documentId: 'DOC-4281-QT',
    customerVisible: true,
    notes: 'Version 2 accepted at USD 3,690 all-in. Version 1 superseded after inland scope was added.',
    audit: [],
  },
  {
    id: mid(),
    jobId: HERO_JOB_ID,
    title: 'Booking confirmed',
    at: AUG(8, 10, 15),
    location: 'MSC — Shanghai',
    source: 'BOOKING_CONFIRMATION',
    responsibleParty: 'MSC',
    status: 'COMPLETED',
    category: 'CARRIER',
    documentId: 'DOC-4281-BKG',
    customerVisible: true,
    notes: 'MSC Aurora 626E. Booking MSCU626E0044118. Free time 7 days at destination.',
    audit: [],
  },
  {
    id: mid(),
    jobId: HERO_JOB_ID,
    title: 'Cargo received',
    at: AUG(9, 14, 20),
    location: 'Shanghai — Eastport origin warehouse',
    source: 'AGENT_UPDATE',
    responsibleParty: 'Eastport Origin Agents',
    status: 'COMPLETED',
    category: 'ORIGIN',
    customerVisible: true,
    notes: '810 packages received against the packing list. No discrepancy reported.',
    audit: [],
  },
  {
    id: mid(),
    jobId: HERO_JOB_ID,
    title: 'Container stuffed',
    at: AUG(10, 12, 0),
    location: 'Shanghai — Eastport origin warehouse',
    source: 'AGENT_UPDATE',
    responsibleParty: 'Eastport Origin Agents',
    status: 'COMPLETED',
    category: 'ORIGIN',
    documentId: 'DOC-4281-PL',
    customerVisible: true,
    notes: 'MSCU1234567 sealed SL-88421. MSCU1234568 sealed SL-88422.',
    audit: [],
  },
  {
    id: mid(),
    jobId: HERO_JOB_ID,
    title: 'VGM submitted',
    at: AUG(11, 9, 45),
    location: 'Shanghai — Yangshan Phase II',
    source: 'AGENT_UPDATE',
    responsibleParty: 'Eastport Origin Agents',
    status: 'COMPLETED',
    category: 'DOCUMENTS',
    documentId: 'DOC-4281-VGM',
    customerVisible: false,
    notes: 'MSCU1234567 verified at 18,550 kg by weighbridge. MSCU1234568 still pending confirmation.',
    audit: [],
  },
  {
    id: mid(),
    jobId: HERO_JOB_ID,
    title: 'Shipping instruction submitted',
    at: AUG(12, 15, 30),
    location: 'PortWhizz — Mumbai desk',
    source: 'MANUAL_ENTRY',
    responsibleParty: 'Arjun Mehta',
    status: 'COMPLETED',
    category: 'DOCUMENTS',
    documentId: 'DOC-4281-SI',
    customerVisible: false,
    notes: 'Draft SI submitted to MSC. Final amended SI still required before the cutoff.',
    audit: [],
  },
  {
    id: mid(),
    jobId: HERO_JOB_ID,
    title: 'Container gated in',
    at: AUG(13, 8, 10),
    location: 'Shanghai — Yangshan Phase II',
    source: 'SIMULATED_CARRIER_EVENT',
    responsibleParty: 'MSC',
    status: 'COMPLETED',
    category: 'ORIGIN',
    customerVisible: true,
    notes: 'MSCU1234567 accepted at the terminal against booking MSCU626E0044118.',
    audit: [],
  },
  {
    id: mid(),
    jobId: HERO_JOB_ID,
    title: 'Loaded on vessel',
    at: AUG(14, 19, 25),
    location: 'Shanghai — Yangshan Phase II',
    source: 'SIMULATED_CARRIER_EVENT',
    responsibleParty: 'MSC',
    status: 'COMPLETED',
    category: 'CARRIER',
    customerVisible: true,
    notes: 'Loaded aboard MSC Aurora, voyage 626E.',
    audit: [],
  },
  {
    id: mid(),
    jobId: HERO_JOB_ID,
    title: 'Vessel departed',
    at: AUG(15, 6, 40),
    location: 'Shanghai — Yangshan Phase II',
    source: 'SIMULATED_CARRIER_EVENT',
    responsibleParty: 'MSC',
    status: 'COMPLETED',
    category: 'CARRIER',
    documentId: 'DOC-4281-BL',
    customerVisible: true,
    notes: 'ATD 15 Aug 06:40. Seaway bill issued against the shipment.',
    audit: [],
  },
  {
    id: mid(),
    jobId: HERO_JOB_ID,
    title: 'ETA updated',
    at: AUG(16, 4, 15),
    location: 'MSC — schedule feed',
    source: 'SIMULATED_CARRIER_EVENT',
    responsibleParty: 'MSC',
    status: 'COMPLETED',
    category: 'EXCEPTIONS',
    customerVisible: true,
    notes: 'Arrival revised from 17 Aug 21:00 to 18 Aug 15:00 — 18 hours later. Delivery plan needs revision.',
    audit: [],
  },
  {
    id: mid(),
    jobId: HERO_JOB_ID,
    title: 'Arrival expected',
    at: AUG(18, 15, 0),
    location: 'Nhava Sheva — JNPT NSIGT',
    source: 'SIMULATED_CARRIER_EVENT',
    responsibleParty: 'MSC',
    status: 'EXPECTED',
    category: 'DESTINATION',
    customerVisible: true,
    notes: 'Revised ETA following the carrier schedule update.',
    audit: [],
  },
  {
    id: mid(),
    jobId: HERO_JOB_ID,
    title: 'Delivery order expected',
    at: AUG(20, 11, 0),
    location: 'Nhava Sheva',
    source: 'MANUAL_ENTRY',
    responsibleParty: 'Arjun Mehta',
    status: 'EXPECTED',
    category: 'DOCUMENTS',
    documentId: 'DOC-4281-DO',
    customerVisible: true,
    notes: 'Issued once clearance is confirmed by the external partner and carrier charges are settled.',
    audit: [],
  },
  {
    id: mid(),
    jobId: HERO_JOB_ID,
    title: 'Delivery target',
    at: AUG(22, 14, 0),
    location: 'Pune — Apex Industrial plant',
    source: 'TRANSPORTER_UPDATE',
    responsibleParty: 'Westline Transport Co.',
    status: 'EXPECTED',
    category: 'TRANSPORT',
    documentId: 'DOC-4281-TO',
    customerVisible: true,
    notes: 'Door delivery under the port-to-door scope. Free time expires 25 Aug.',
    audit: [],
  },
  {
    id: mid(),
    jobId: HERO_JOB_ID,
    title: 'Proof of delivery expected',
    at: AUG(23, 12, 0),
    location: 'Pune — Apex Industrial plant',
    source: 'CUSTOMER_UPLOAD',
    responsibleParty: 'Apex Industrial Systems Pvt. Ltd.',
    status: 'EXPECTED',
    category: 'TRANSPORT',
    documentId: 'DOC-4281-POD',
    customerVisible: true,
    notes: 'Signed POD closes the operational leg and releases the job for reconciliation.',
    audit: [],
  },
]

/**
 * Lighter timelines for the other jobs, so every shipment detail view has a
 * real rail rather than an empty state. Generated from each job's status so
 * the events are always consistent with where the job actually is.
 */
const TIMELINE_TEMPLATE: Array<{
  title: string
  category: Milestone['category']
  source: Milestone['source']
  party: string
  customerVisible: boolean
}> = [
  { title: 'Enquiry created', category: 'DOCUMENTS', source: 'MANUAL_ENTRY', party: 'Sales Desk', customerVisible: true },
  { title: 'Quote accepted', category: 'FINANCE', source: 'EMAIL', party: 'Customer', customerVisible: true },
  {
    title: 'Booking confirmed',
    category: 'CARRIER',
    source: 'BOOKING_CONFIRMATION',
    party: 'Carrier',
    customerVisible: true,
  },
  { title: 'Cargo received', category: 'ORIGIN', source: 'AGENT_UPDATE', party: 'Origin agent', customerVisible: true },
  { title: 'Container gated in', category: 'ORIGIN', source: 'SIMULATED_CARRIER_EVENT', party: 'Carrier', customerVisible: true },
  { title: 'Loaded on vessel', category: 'CARRIER', source: 'SIMULATED_CARRIER_EVENT', party: 'Carrier', customerVisible: true },
  { title: 'Vessel departed', category: 'CARRIER', source: 'SIMULATED_CARRIER_EVENT', party: 'Carrier', customerVisible: true },
  { title: 'Arrival expected', category: 'DESTINATION', source: 'SIMULATED_CARRIER_EVENT', party: 'Carrier', customerVisible: true },
  { title: 'Delivery order issued', category: 'DOCUMENTS', source: 'MANUAL_ENTRY', party: 'Operations', customerVisible: true },
  { title: 'Delivered', category: 'TRANSPORT', source: 'TRANSPORTER_UPDATE', party: 'Transporter', customerVisible: true },
  { title: 'Proof of delivery received', category: 'TRANSPORT', source: 'CUSTOMER_UPLOAD', party: 'Customer', customerVisible: true },
]

/** How far down the template a job of each status has progressed. */
const PROGRESS_BY_STATUS: Record<string, number> = {
  ENQUIRY: 1,
  QUOTED: 2,
  BOOKED: 3,
  ORIGIN_HANDLING: 5,
  IN_TRANSIT: 7,
  ARRIVING: 8,
  DELIVERED: 10,
  CLOSED: 11,
}

export function buildTimelineFor(
  jobId: string,
  status: string,
  createdAt: string,
  originName: string,
  destinationName: string,
): Milestone[] {
  const completed = PROGRESS_BY_STATUS[status] ?? 1
  const startMs = new Date(createdAt).getTime()
  const stepMs = 2.1 * 24 * 60 * 60 * 1000

  return TIMELINE_TEMPLATE.slice(0, Math.min(completed + 2, TIMELINE_TEMPLATE.length)).map((tpl, i) => ({
    id: `MS-${jobId.slice(-6)}-T${String(i + 1).padStart(2, '0')}`,
    jobId,
    title: tpl.title,
    at: new Date(startMs + i * stepMs).toISOString(),
    location: i <= 5 ? originName : destinationName,
    source: tpl.source,
    responsibleParty: tpl.party,
    status: i < completed ? 'COMPLETED' : 'EXPECTED',
    category: tpl.category,
    customerVisible: tpl.customerVisible,
    audit: [],
  }))
}
