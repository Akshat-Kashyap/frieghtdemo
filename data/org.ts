import { daysFromNow } from '@/lib/demo-clock'
import type {
  CustomerOrganisation,
  CustomerRole,
  CustomerRoleId,
  OrgMember,
} from '@/types'

/**
 * THE CUSTOMER ORGANISATION
 * ══════════════════════════════════════════════════════════════════════════
 * Apex Industrial Systems is the company the whole demo is seen through. It
 * already exists as a `Party` (CUST-APEX) and owns the hero shipment; this
 * file gives it the things a *customer* account has that a counterparty
 * record does not — people, verification state, the lanes it is documented
 * to trade on, its licences, and its loyalty standing.
 *
 * Deliberately one organisation. A demo with an org switcher spends its
 * first thirty seconds explaining the switcher instead of the product.
 */

export const ORG_ID = 'CUST-APEX'

/* ══════════════════════════════════════════════════════════════════════════
   ROLES — four, and only one of them can spend money
   ══════════════════════════════════════════════════════════════════════════ */

export const CUSTOMER_ROLES: Record<CustomerRoleId, CustomerRole> = {
  'logistics-manager': {
    id: 'logistics-manager',
    label: 'Logistics Manager',
    summary: 'Searches rates, raises requests and runs the shipments day to day.',
    can: { request: true },
  },
  'procurement-approver': {
    id: 'procurement-approver',
    label: 'Procurement Approver',
    summary: 'Awards requests and commits the company to a freight contract.',
    can: { request: true, award: true },
  },
  'finance-controller': {
    id: 'finance-controller',
    label: 'Finance Controller',
    summary: 'Owns credit, invoices and the money side of every shipment.',
    can: { finance: true, manageProfile: true },
  },
  viewer: {
    id: 'viewer',
    label: 'Viewer',
    summary: 'Read-only access to shipments and documents.',
    can: {},
  },
}

export const CUSTOMER_ROLE_IDS = Object.keys(CUSTOMER_ROLES) as CustomerRoleId[]

export function customerRole(id: CustomerRoleId): CustomerRole {
  return CUSTOMER_ROLES[id]
}

/** `true` when the acting role holds the capability. Absent flag = no. */
export function roleCan(id: CustomerRoleId, capability: keyof CustomerRole['can']): boolean {
  return Boolean(CUSTOMER_ROLES[id].can[capability])
}

/* ══════════════════════════════════════════════════════════════════════════
   PEOPLE
   ══════════════════════════════════════════════════════════════════════════ */

const MEMBERS: OrgMember[] = [
  {
    id: 'MEM-APEX-01',
    name: 'Priya Raghavan',
    initials: 'PR',
    title: 'Logistics Manager',
    role: 'logistics-manager',
    email: 'priya.r@apexindustrial.example',
    phone: '+91 98200 41102',
    authorityScope: 'Books freight, coordinates delivery windows, raises rate requests.',
  },
  {
    id: 'MEM-APEX-02',
    name: 'Devansh Kapoor',
    initials: 'DK',
    title: 'Head of Procurement',
    role: 'procurement-approver',
    email: 'devansh.k@apexindustrial.example',
    phone: '+91 98200 41118',
    authorityScope: 'Awards rate requests and signs freight contracts up to ₹50L per lane.',
  },
  {
    id: 'MEM-APEX-03',
    name: 'Sunita Iyer',
    initials: 'SI',
    title: 'Finance Controller',
    role: 'finance-controller',
    email: 'sunita.i@apexindustrial.example',
    phone: '+91 98200 41125',
    authorityScope: 'Approves invoices, manages the credit facility and export factoring.',
  },
  {
    id: 'MEM-APEX-04',
    name: 'Rohit Menon',
    initials: 'RM',
    title: 'Plant Coordinator — Pune',
    role: 'viewer',
    email: 'rohit.m@apexindustrial.example',
    authorityScope: 'Watches inbound arrivals for the Pune plant. Read-only.',
  },
]

/** The member the demo opens as. */
export const DEFAULT_MEMBER_ID = 'MEM-APEX-01'

export function orgMember(id: string): OrgMember {
  return MEMBERS.find((m) => m.id === id) ?? MEMBERS[0]!
}

/* ══════════════════════════════════════════════════════════════════════════
   THE ORGANISATION
   ══════════════════════════════════════════════════════════════════════════ */

export const ORGANISATION: CustomerOrganisation = {
  id: ORG_ID,
  name: 'Apex Industrial Systems Pvt. Ltd.',
  shortName: 'Apex Industrial',
  country: 'India',
  industry: 'Industrial valves, pipe fittings and flow-control assemblies',
  registeredAddress: 'Plot 44, Chakan Industrial Area, Phase II, Pune 410501, Maharashtra, India',
  members: MEMBERS,

  /* ── Verification ────────────────────────────────────────────────────
     Three verified, one in review and one needing action — a profile with
     five green ticks teaches the viewer nothing about what the module is
     for. The AD code being the outstanding one is the realistic case: it is
     the item that actually blocks export proceeds. */
  kyb: [
    {
      id: 'KYB-PAN',
      label: 'PAN',
      value: 'AAJCA••••K',
      status: 'VERIFIED',
      verifiedAt: daysFromNow(-214),
      unlocks: 'Company identity across all documentation.',
    },
    {
      id: 'KYB-GST',
      label: 'GST registration',
      value: '27AAJCA••••K1ZR',
      status: 'VERIFIED',
      verifiedAt: daysFromNow(-214),
      unlocks: 'Tax invoicing and input credit on freight charges.',
    },
    {
      id: 'KYB-IEC',
      label: 'Importer Exporter Code',
      value: '0308••••42',
      status: 'VERIFIED',
      verifiedAt: daysFromNow(-209),
      unlocks: 'Import and export shipments in the company name.',
    },
    {
      id: 'KYB-ADCODE',
      label: 'AD code registration — Nhava Sheva',
      value: '6390••••0000',
      status: 'IN_REVIEW',
      unlocks: 'Export proceeds realisation against shipments from this port.',
    },
    {
      id: 'KYB-BANK',
      label: 'Bank account verification',
      value: 'HDFC •••• 8841',
      status: 'ACTION_NEEDED',
      unlocks: 'Higher credit limits and export factoring advances.',
    },
  ],

  /* ── Lanes the company is documented to trade on ─────────────────────
     Every lane the seeded shipment book actually runs appears here, and the
     statuses agree with it. A profile that tells a customer a pair "cannot
     carry a booking" while a confirmed booking on that pair sits in their own
     shipment list is the fastest way to lose the room, so the only lane shown
     as closed is one nothing is running on.

     The AD code registration is a banking dependency, not a booking one: it
     gates realisation of export proceeds from Nhava Sheva — which is what
     `KYB-ADCODE.unlocks` says, and what the export factoring lever in
     data/customer-finance.ts says. The lane itself is open, and PP-05 carries
     the dependency as a note rather than as a closed status. */
  portPairs: [
    { id: 'PP-01', originId: 'CNSHA', destinationId: 'INNSA', status: 'ACTIVE', enabledAt: daysFromNow(-201) },
    { id: 'PP-02', originId: 'CNNGB', destinationId: 'INNSA', status: 'ACTIVE', enabledAt: daysFromNow(-186) },
    { id: 'PP-03', originId: 'CNSHA', destinationId: 'INMUN', status: 'ACTIVE', enabledAt: daysFromNow(-142) },
    { id: 'PP-04', originId: 'SGSIN', destinationId: 'INNSA', status: 'ACTIVE', enabledAt: daysFromNow(-96) },
    {
      id: 'PP-05',
      originId: 'INNSA',
      destinationId: 'NLRTM',
      status: 'ACTIVE',
      enabledAt: daysFromNow(-54),
      note: 'Bookings run on this lane today. Realising export proceeds against shipments from Nhava Sheva is waiting on the AD code registration below.',
    },
    { id: 'PP-06', originId: 'AEJEA', destinationId: 'INMUN', status: 'ACTIVE', enabledAt: daysFromNow(-88) },
    { id: 'PP-07', originId: 'AEJEA', destinationId: 'INNSA', status: 'ACTIVE', enabledAt: daysFromNow(-171) },
    { id: 'PP-08', originId: 'CNSHA', destinationId: 'INMAA', status: 'ACTIVE', enabledAt: daysFromNow(-134) },
    { id: 'PP-09', originId: 'SGSIN', destinationId: 'INMAA', status: 'ACTIVE', enabledAt: daysFromNow(-118) },
    { id: 'PP-10', originId: 'INMAA', destinationId: 'SGSIN', status: 'ACTIVE', enabledAt: daysFromNow(-110) },
    { id: 'PP-11', originId: 'INMUN', destinationId: 'NLRTM', status: 'ACTIVE', enabledAt: daysFromNow(-77) },
    { id: 'PP-12', originId: 'INBOM', destinationId: 'NLRTM', status: 'ACTIVE', enabledAt: daysFromNow(-63) },
    { id: 'PP-13', originId: 'INNSA', destinationId: 'AEJEA', status: 'ACTIVE', enabledAt: daysFromNow(-49) },
    { id: 'PP-14', originId: 'INNSA', destinationId: 'INPNQ', status: 'ACTIVE', enabledAt: daysFromNow(-160) },
    {
      id: 'PP-15',
      originId: 'INDEL',
      destinationId: 'NLRTM',
      status: 'NOT_ENABLED',
      note: 'No documentation on file for this pair. Nothing has been booked on it.',
    },
  ],

  /* ── Licences and registrations, with the expiry clock running ───── */
  documents: [
    {
      id: 'CDOC-01',
      name: 'Certificate of Incorporation',
      category: 'REGISTRATION',
      reference: 'U29120PN2011PTC••••',
      issuedAt: daysFromNow(-5310),
      status: 'VALID',
    },
    {
      id: 'CDOC-02',
      name: 'GST registration certificate',
      category: 'TAX',
      reference: '27AAJCA••••K1ZR',
      issuedAt: daysFromNow(-2914),
      status: 'VALID',
    },
    {
      id: 'CDOC-03',
      name: 'Importer Exporter Code certificate',
      category: 'LICENCE',
      reference: '0308••••42',
      issuedAt: daysFromNow(-2890),
      status: 'VALID',
    },
    {
      id: 'CDOC-04',
      name: 'Marine open cover policy',
      category: 'INSURANCE',
      reference: 'SEASHIELD/MOC/2026/0441',
      issuedAt: daysFromNow(-337),
      expiresAt: daysFromNow(28),
      status: 'EXPIRING',
    },
    {
      id: 'CDOC-05',
      name: 'Authorised signatory board resolution',
      category: 'AUTHORISATION',
      reference: 'APEX/BR/2026/07',
      issuedAt: daysFromNow(-198),
      expiresAt: daysFromNow(167),
      status: 'VALID',
    },
    {
      id: 'CDOC-06',
      name: 'BIS licence — flow control assemblies',
      category: 'LICENCE',
      reference: 'CM/L-••••2213',
      issuedAt: daysFromNow(-760),
      expiresAt: daysFromNow(-12),
      status: 'EXPIRED',
    },
  ],

  /* ── Loyalty ─────────────────────────────────────────────────────── */
  rewards: {
    tier: 'GOLD',
    points: 18_420,
    pointsToNextTier: 6_580,
    nextTier: 'PLATINUM',
    benefits: [
      'Priority booking confirmation on contracted lanes',
      // Worded as a redemption, not an entitlement, because a redemption is
      // what the ledger below actually records (RW-04) and what the free-time
      // projection in data/customer-finance.ts actually models: it reads the
      // destination port's published free days and nothing else. A benefit
      // promising two automatic free days would be contradicted by the
      // storage clock on the cost-alerts tab the first time a box sat.
      'Storage-day waivers at destination, redeemable against points',
      'Dedicated logistics contact',
      'Quarterly lane rate review',
    ],
    ledger: [
      { id: 'RW-01', at: daysFromNow(-2), description: 'Booking confirmed · PW-2026-004281', points: 820, relatedId: 'PW-2026-004281' },
      { id: 'RW-02', at: daysFromNow(-9), description: 'Invoice settled within terms · INV-2026-01151', points: 400, relatedId: 'INV-2026-01151' },
      { id: 'RW-03', at: daysFromNow(-16), description: 'Contract renewed · Far East → West India', points: 2_500 },
      { id: 'RW-04', at: daysFromNow(-23), description: 'Redeemed — storage day waiver at Nhava Sheva', points: -1_200 },
      { id: 'RW-05', at: daysFromNow(-38), description: 'Booking confirmed · PW-2026-004262', points: 760, relatedId: 'PW-2026-004262' },
    ],
  },
}

/* ══════════════════════════════════════════════════════════════════════════
   DERIVED
   ══════════════════════════════════════════════════════════════════════════ */

/** Verification is only "complete" when nothing is outstanding. */
export function kybProgress(): { verified: number; total: number; complete: boolean } {
  const verified = ORGANISATION.kyb.filter((k) => k.status === 'VERIFIED').length
  return { verified, total: ORGANISATION.kyb.length, complete: verified === ORGANISATION.kyb.length }
}

/** Lanes the company can actually book on today. */
export function activePortPairs() {
  return ORGANISATION.portPairs.filter((p) => p.status === 'ACTIVE')
}

/**
 * Company documents that are expired, expiring or absent.
 *
 * Sorted worst-first: an expired licence is a live problem, an expiring one
 * is a diary note, and showing them in file order buries the difference.
 */
const DOCUMENT_URGENCY = { EXPIRED: 0, MISSING: 1, EXPIRING: 2, VALID: 3 } as const

export function documentsNeedingAttention() {
  return ORGANISATION.documents
    .filter((d) => d.status !== 'VALID')
    .sort((a, b) => DOCUMENT_URGENCY[a.status] - DOCUMENT_URGENCY[b.status])
}
