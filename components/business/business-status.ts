import {
  CUSTOMER_ROLES,
  ORGANISATION,
  documentsNeedingAttention,
  roleCan,
} from '@/data/org'
import { requirePort } from '@/data/ports'
import { ROUTES } from '@/lib/routes'
import type {
  CompanyDocument,
  CompanyDocumentStatus,
  CustomerRole,
  CustomerRoleId,
  KybItem,
  KybItemStatus,
  OperationalPortPair,
  OrgMember,
  PortPairStatus,
  RewardTier,
} from '@/types'

import type { Tone } from '@/components/ui/primitives'

/**
 * BUSINESS PROFILE — LABELS, TONES AND THE DERIVED VIEWS
 * ══════════════════════════════════════════════════════════════════════════
 * The profile renders the same four enums in five different places: a KYB
 * status appears in the attention panel, in the verification list and again
 * as the reason a lane is closed. Written inline each time, "Action needed"
 * eventually becomes "Action required" in one of them and the screen quietly
 * stops looking like one product.
 *
 * So every enum gets exactly one label map and one tone map here, and the
 * genuinely derived views — what needs attention, which check is holding a
 * lane shut, what a role may do — are functions rather than sentences typed
 * into JSX that would go stale the moment `data/org.ts` changed.
 */

/* ══════════════════════════════════════════════════════════════════════════
   VERIFICATION (KYB)
   ══════════════════════════════════════════════════════════════════════════ */

export const KYB_STATUS_LABEL: Record<KybItemStatus, string> = {
  VERIFIED: 'Verified',
  IN_REVIEW: 'In review',
  ACTION_NEEDED: 'Action needed',
  NOT_STARTED: 'Not started',
}

/**
 * Verified is healthy, in-review is in-flight, action-needed is on the
 * customer. Not-started stays neutral rather than amber: nothing is wrong
 * with a check nobody has begun, and colouring it as a warning would put
 * five reds on a profile that only has two real problems.
 */
export const KYB_STATUS_TONE: Record<KybItemStatus, Tone> = {
  VERIFIED: 'signal',
  IN_REVIEW: 'route',
  ACTION_NEEDED: 'amber',
  NOT_STARTED: 'neutral',
}

/* ══════════════════════════════════════════════════════════════════════════
   TRADING LANES
   ══════════════════════════════════════════════════════════════════════════ */

export const PORT_PAIR_LABEL: Record<PortPairStatus, string> = {
  ACTIVE: 'Active',
  DOCUMENTATION_PENDING: 'Documentation pending',
  NOT_ENABLED: 'Not enabled',
}

export const PORT_PAIR_TONE: Record<PortPairStatus, Tone> = {
  ACTIVE: 'signal',
  DOCUMENTATION_PENDING: 'amber',
  NOT_ENABLED: 'neutral',
}

/** What the group heading means in operational terms, not in enum terms. */
export const PORT_PAIR_MEANING: Record<PortPairStatus, string> = {
  ACTIVE: 'Bookings can be raised on these today.',
  DOCUMENTATION_PENDING: 'Something upstream is still outstanding — see what is holding each one.',
  NOT_ENABLED: 'Nothing on file yet. Your logistics contact opens these.',
}

/** Fixed rendering order: what you can use, then what is nearly ready. */
export const PORT_PAIR_ORDER: readonly PortPairStatus[] = ['ACTIVE', 'DOCUMENTATION_PENDING', 'NOT_ENABLED']

export function portPairsByStatus(): Array<{ status: PortPairStatus; pairs: OperationalPortPair[] }> {
  return PORT_PAIR_ORDER.map((status) => ({
    status,
    pairs: ORGANISATION.portPairs.filter((pair) => pair.status === status),
  })).filter((group) => group.pairs.length > 0)
}

/**
 * The verification item standing in the way of a lane.
 *
 * Derived by matching an outstanding check's label against the ports on the
 * pair, rather than by hardcoding "PP-05 is held up by KYB-ADCODE". Pair ids
 * are seed data; a sentence pinned to one would survive exactly until someone
 * adds a seventh lane. The match is not a coincidence either — AD code
 * registration is granted per port, so the port name in the label *is* the
 * link between the two records.
 */
export function blockingKybItem(pair: OperationalPortPair): KybItem | undefined {
  if (pair.status === 'ACTIVE') return undefined

  const names = [requirePort(pair.originId).name, requirePort(pair.destinationId).name]
  return ORGANISATION.kyb.find(
    (item) => item.status !== 'VERIFIED' && names.some((name) => item.label.includes(name)),
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   COMPANY DOCUMENTS
   ══════════════════════════════════════════════════════════════════════════ */

export const COMPANY_DOC_LABEL: Record<CompanyDocumentStatus, string> = {
  VALID: 'Valid',
  EXPIRING: 'Expiring',
  EXPIRED: 'Expired',
  MISSING: 'Missing',
}

/**
 * A lapsed document and an absent one are both critical: in each case the
 * company is already operating without cover it is supposed to have. Only
 * the one with a date still ahead of it gets the amber "diary note" band.
 */
export const COMPANY_DOC_TONE: Record<CompanyDocumentStatus, Tone> = {
  VALID: 'signal',
  EXPIRING: 'amber',
  EXPIRED: 'critical',
  MISSING: 'critical',
}

/**
 * What a company document being out of date actually stops.
 *
 * `CompanyDocument` carries no `unlocks` field the way `KybItem` does, and an
 * attention row that says only "expired" gives the reader nothing to act on.
 * Keyed on category rather than on document id, so a seventh document
 * inherits a sensible line instead of rendering a blank.
 */
export const DOCUMENT_BLOCKS: Record<CompanyDocument['category'], string> = {
  REGISTRATION: 'Company identity on every booking and invoice raised in this name.',
  TAX: 'Tax invoicing and input credit on freight charges.',
  LICENCE: 'Shipments of the goods this licence certifies, until it is renewed.',
  AUTHORISATION: 'Who may sign for the company — request awards and contract signature.',
  INSURANCE: 'Cargo cover on anything booked after the policy lapses.',
}

/* ══════════════════════════════════════════════════════════════════════════
   NEEDS ATTENTION — the merge that justifies the module
   ══════════════════════════════════════════════════════════════════════════ */

export interface AttentionItem {
  id: string
  kind: 'VERIFICATION' | 'DOCUMENT'
  /** Shown as a chip so the reader knows which list a row came from. */
  kindLabel: string
  title: string
  /** The identifier itself, masked, where the record carries one. */
  reference?: string
  /** What staying outstanding costs the company. */
  blocks: string
  /** Whose move it is next. */
  nextStep: string
  tone: Tone
  statusLabel: string
  /** Present only where a real date is running against the item. */
  expiresAt?: string
  rank: number
}

/**
 * Worst first — and "worst" is not the same as "most red".
 *
 * Both ranks below live on one number line so the two lists interleave
 * properly: 0 lapsed document · 1 missing document · 2 action needed ·
 * 3 not started · 4 expiring document · 5 in review.
 *
 * A lapsed or absent document sits at the top because the company is already
 * operating without it. An ACTION_NEEDED check is next, since it is the only
 * other row where somebody here has to move. A policy with four weeks left is
 * a diary note, and IN_REVIEW is waiting on onboarding rather than on the
 * customer — so it lands last even though it is the item closing a lane.
 * `VERIFIED` and `VALID` never reach this list; they rank at infinity so a
 * future caller that forgets to filter still sorts them off the bottom.
 */
const DOCUMENT_ATTENTION_RANK: Record<CompanyDocumentStatus, number> = {
  EXPIRED: 0,
  MISSING: 1,
  EXPIRING: 4,
  VALID: Number.POSITIVE_INFINITY,
}

const KYB_ATTENTION_RANK: Record<KybItemStatus, number> = {
  ACTION_NEEDED: 2,
  NOT_STARTED: 3,
  IN_REVIEW: 5,
  VERIFIED: Number.POSITIVE_INFINITY,
}

const KYB_NEXT_STEP: Record<KybItemStatus, string> = {
  VERIFIED: 'Nothing outstanding.',
  IN_REVIEW: 'With PortWhizz onboarding. Nothing to do here until it comes back.',
  ACTION_NEEDED: 'Your move — this check cannot clear until the details are confirmed.',
  NOT_STARTED: 'Nothing has been submitted against this check yet.',
}

const DOCUMENT_NEXT_STEP: Record<CompanyDocumentStatus, string> = {
  VALID: 'Nothing outstanding.',
  EXPIRING: 'Renew it before the date runs out — cover does not carry over.',
  EXPIRED: 'Already lapsed. Replace it before the next shipment that relies on it.',
  MISSING: 'Not on file. Nothing has been uploaded against this record.',
}

/**
 * Everything outstanding on the profile, in one list.
 *
 * The merge is the point of the whole module. Verification checks and company
 * documents are separate records with separate lifecycles, but a reader
 * arriving at this page has exactly one question — what is stopping me
 * shipping — and answering it from two panels means they have to rank the
 * two lists against each other in their head.
 */
export function attentionItems(): AttentionItem[] {
  const fromVerification = ORGANISATION.kyb
    .filter((item) => item.status !== 'VERIFIED')
    .map<AttentionItem>((item) => ({
      id: item.id,
      kind: 'VERIFICATION',
      kindLabel: 'Verification',
      title: item.label,
      reference: item.value,
      blocks: item.unlocks,
      nextStep: KYB_NEXT_STEP[item.status],
      tone: KYB_STATUS_TONE[item.status],
      statusLabel: KYB_STATUS_LABEL[item.status],
      rank: KYB_ATTENTION_RANK[item.status],
    }))

  const fromDocuments = documentsNeedingAttention().map<AttentionItem>((doc) => ({
    id: doc.id,
    kind: 'DOCUMENT',
    kindLabel: 'Company document',
    title: doc.name,
    reference: doc.reference,
    blocks: DOCUMENT_BLOCKS[doc.category],
    nextStep: DOCUMENT_NEXT_STEP[doc.status],
    tone: COMPANY_DOC_TONE[doc.status],
    statusLabel: COMPANY_DOC_LABEL[doc.status],
    expiresAt: doc.expiresAt,
    rank: DOCUMENT_ATTENTION_RANK[doc.status],
  }))

  return [...fromVerification, ...fromDocuments].sort((a, b) => a.rank - b.rank)
}

/* ══════════════════════════════════════════════════════════════════════════
   PEOPLE & CAPABILITIES
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Capability flags in plain language.
 *
 * The People cards derive their chips from `CustomerRole.can` through this
 * map rather than listing "Raise requests, award" under each person by hand.
 * Hand-typed lists drift from the role definitions, and a profile that says
 * someone can award when the store says otherwise is worse than no list.
 */
export const CAPABILITY_LABEL: Record<keyof CustomerRole['can'], string> = {
  request: 'Raise requests',
  award: 'Award and sign',
  finance: 'Credit and invoices',
  manageProfile: 'Manage this profile',
}

/** Object key order fixes the chip order, so cards line up down a column. */
const CAPABILITY_ORDER = Object.keys(CAPABILITY_LABEL) as Array<keyof CustomerRole['can']>

export function capabilitiesOf(roleId: CustomerRoleId): string[] {
  const role = CUSTOMER_ROLES[roleId]
  return CAPABILITY_ORDER.filter((capability) => role.can[capability]).map(
    (capability) => CAPABILITY_LABEL[capability],
  )
}

/** Who in this organisation actually holds a capability. */
export function membersWhoCan(capability: keyof CustomerRole['can']): OrgMember[] {
  return ORGANISATION.members.filter((member) => roleCan(member.role, capability))
}

/* ══════════════════════════════════════════════════════════════════════════
   REWARDS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Tiers deliberately do not get their own colour ramp.
 *
 * The palette in this product encodes urgency — amber means "look at this",
 * critical means "this is already costing you". Painting a Gold tier amber
 * because gold is amber-ish would make a healthy standing read as a warning
 * on a page whose entire job is to show what is wrong. So a tier is either
 * neutral or healthy, and the ladder is carried by the label and the meter.
 */
export const TIER_TONE: Record<RewardTier, Tone> = {
  BRONZE: 'neutral',
  SILVER: 'neutral',
  GOLD: 'signal',
  PLATINUM: 'signal',
}

/**
 * Where a ledger entry's `relatedId` points.
 *
 * Matched on the id prefix rather than by searching the store: the ledger is
 * authored copy that references records living in two different slices, and a
 * reward row is not worth subscribing a component to the whole job list for.
 * An unrecognised prefix returns null and the row simply renders without a
 * link — a reward that quietly stops linking is a far smaller failure than a
 * link that 404s in front of an audience.
 */
export function rewardLink(relatedId: string): { href: string; label: string } | null {
  if (relatedId.startsWith('PW-')) return { href: ROUTES.booking(relatedId), label: `Open ${relatedId}` }
  if (relatedId.startsWith('INV-')) return { href: ROUTES.finance, label: `Open ${relatedId} in finance` }
  return null
}
