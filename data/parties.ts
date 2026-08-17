import type { AppUser, Party, RoleId } from '@/types'

/**
 * Counterparties and people. Every name here is fictional.
 *
 * Carrier names use the real market's shorthand (MSC, Maersk) because a
 * freight demo that invents carrier names reads as unfamiliar to the exact
 * audience it is for — but nothing about their actual schedules, rates or
 * services is represented as real.
 */

export const PARTIES: Party[] = [
  /* ── Customers ─────────────────────────────────────────────────────── */
  {
    id: 'CUST-APEX',
    name: 'Apex Industrial Systems Pvt. Ltd.',
    kind: 'CUSTOMER',
    country: 'India',
    creditDays: 30,
    contactPerson: 'Priya Raghavan',
    email: 'priya.r@apexindustrial.example',
    phone: '+91 98200 41102',
  },
  {
    id: 'CUST-VERTEX',
    name: 'Vertex Polymers Ltd.',
    kind: 'CUSTOMER',
    country: 'India',
    creditDays: 45,
    contactPerson: 'Sandeep Kulkarni',
    email: 'sandeep.k@vertexpolymers.example',
    phone: '+91 98330 77410',
  },
  {
    id: 'CUST-KINETIC',
    name: 'Kinetic Auto Components',
    kind: 'CUSTOMER',
    country: 'India',
    creditDays: 30,
    contactPerson: 'Rhea Fernandes',
    email: 'rhea.f@kineticauto.example',
    phone: '+91 99870 33218',
  },
  {
    id: 'CUST-NORTHSTAR',
    name: 'Northstar Textiles Pvt. Ltd.',
    kind: 'CUSTOMER',
    country: 'India',
    creditDays: 60,
    contactPerson: 'Imran Qureshi',
    email: 'imran.q@northstartex.example',
    phone: '+91 98110 55023',
  },
  {
    id: 'CUST-HELIOS',
    name: 'Helios Electricals',
    kind: 'CUSTOMER',
    country: 'India',
    creditDays: 30,
    contactPerson: 'Nandini Rao',
    email: 'nandini.rao@helioselec.example',
    phone: '+91 90040 18876',
  },
  {
    id: 'CUST-MERIDIAN',
    name: 'Meridian Pharma Exports',
    kind: 'CUSTOMER',
    country: 'India',
    creditDays: 45,
    contactPerson: 'Dr. Alok Sinha',
    email: 'alok.sinha@meridianpharma.example',
    phone: '+91 96540 71190',
  },
  {
    id: 'CUST-CASCADE',
    name: 'Cascade Foods International',
    kind: 'CUSTOMER',
    country: 'India',
    creditDays: 30,
    contactPerson: 'Farida Merchant',
    email: 'farida.m@cascadefoods.example',
    phone: '+91 98690 22047',
  },
  {
    id: 'CUST-IRONGATE',
    name: 'Irongate Engineering Works',
    kind: 'CUSTOMER',
    country: 'India',
    creditDays: 30,
    contactPerson: 'Vikram Bedi',
    email: 'vikram.b@irongateworks.example',
    phone: '+91 97020 66315',
  },

  /* ── Carriers ──────────────────────────────────────────────────────── */
  { id: 'CARR-MSC', name: 'MSC', kind: 'CARRIER', country: 'Switzerland' },
  { id: 'CARR-MAERSK', name: 'Maersk', kind: 'CARRIER', country: 'Denmark' },
  { id: 'CARR-CMACGM', name: 'CMA CGM', kind: 'CARRIER', country: 'France' },
  { id: 'CARR-HAPAG', name: 'Hapag-Lloyd', kind: 'CARRIER', country: 'Germany' },
  { id: 'CARR-ONE', name: 'ONE', kind: 'CARRIER', country: 'Singapore' },
  { id: 'CARR-EMIRATES', name: 'Emirates SkyCargo', kind: 'CARRIER', country: 'United Arab Emirates' },

  /* ── Execution partners ────────────────────────────────────────────── */
  { id: 'VND-WESTLINE', name: 'Westline Transport Co.', kind: 'TRANSPORTER', country: 'India' },
  { id: 'VND-SAHYADRI', name: 'Sahyadri Roadways', kind: 'TRANSPORTER', country: 'India' },
  { id: 'VND-JNPT-TERM', name: 'JNPT Terminal Services', kind: 'TERMINAL', country: 'India' },
  { id: 'VND-SPEEDCFS', name: 'Speedlink CFS', kind: 'CFS', country: 'India' },
  { id: 'VND-HARBOUR-WH', name: 'Harbour Point Warehousing', kind: 'WAREHOUSE', country: 'India' },
  { id: 'VND-EASTPORT', name: 'Eastport Origin Agents', kind: 'OVERSEAS_AGENT', country: 'China' },
  { id: 'VND-GULFLINK', name: 'Gulflink Agencies', kind: 'OVERSEAS_AGENT', country: 'United Arab Emirates' },

  /* ── Clearance partners — coordination only. See lib/boundaries.ts. ── */
  { id: 'VND-COASTAL-CLR', name: 'Coastal Clearance Partners', kind: 'CLEARANCE_PARTNER', country: 'India' },
  { id: 'VND-TRIDENT-CLR', name: 'Trident Clearance Services', kind: 'CLEARANCE_PARTNER', country: 'India' },

  /* ── Financial ─────────────────────────────────────────────────────── */
  { id: 'VND-SEASHIELD', name: 'Seashield Marine Insurance', kind: 'INSURER', country: 'India' },
  { id: 'VND-BRIDGEFIN', name: 'Bridgefin Trade Capital', kind: 'FINANCIER', country: 'India' },
]

const PARTY_INDEX = new Map(PARTIES.map((p) => [p.id, p]))

export function getParty(id: string): Party | undefined {
  return PARTY_INDEX.get(id)
}

export function requireParty(id: string): Party {
  const party = PARTY_INDEX.get(id)
  if (!party) throw new Error(`Unknown party id: ${id}`)
  return party
}

export function partiesOfKind(kind: Party['kind']): Party[] {
  return PARTIES.filter((p) => p.kind === kind)
}

export const CUSTOMERS = PARTIES.filter((p) => p.kind === 'CUSTOMER')

/* ══════════════════════════════════════════════════════════════════════════
   PEOPLE — the six demo roles
   ══════════════════════════════════════════════════════════════════════════ */

export const USERS: AppUser[] = [
  {
    id: 'USR-ARJUN',
    name: 'Arjun Mehta',
    title: 'Freight Forwarder — Operations',
    role: 'arjun',
    initials: 'AM',
  },
  {
    id: 'USR-MEERA',
    name: 'Meera Iyer',
    title: 'Branch Head / Operations Manager',
    role: 'meera',
    initials: 'MI',
  },
  {
    id: 'USR-PRIYA',
    name: 'Priya Raghavan',
    title: 'Importer — Logistics Manager',
    role: 'priya',
    initials: 'PR',
    partyId: 'CUST-APEX',
  },
  {
    id: 'USR-SALES',
    name: 'Sales Desk',
    title: 'Enquiry and Quote User',
    role: 'sales',
    initials: 'SD',
  },
  {
    id: 'USR-FINANCE',
    name: 'Finance User',
    title: 'Cost and Settlement User',
    role: 'finance',
    initials: 'FU',
  },
  {
    id: 'USR-PLATFORM',
    name: 'Platform Ops',
    title: 'System Operations User',
    role: 'platform-ops',
    initials: 'PO',
  },
]

const USER_INDEX = new Map(USERS.map((u) => [u.id, u]))
const USER_BY_ROLE = new Map(USERS.map((u) => [u.role, u]))

export function getUser(id: string): AppUser | undefined {
  return USER_INDEX.get(id)
}

export function requireUser(id: string): AppUser {
  const user = USER_INDEX.get(id)
  if (!user) throw new Error(`Unknown user id: ${id}`)
  return user
}

export function userForRole(role: RoleId): AppUser {
  const user = USER_BY_ROLE.get(role)
  if (!user) throw new Error(`No user for role: ${role}`)
  return user
}

/** Ops users an exception can actually be assigned to. */
export const ASSIGNABLE_USERS = USERS.filter((u) => u.role !== 'priya')
