/**
 * COPY & DISCLAIMERS
 * ──────────────────────────────────────────────────────────────────────────
 * Every "this is simulated" label in the product lives here.
 *
 * Scattering disclaimers inline across 20 modules guarantees they drift — one
 * screen says "demo data", another says "sample data", a third forgets. This
 * demo makes commercial-sounding claims (rates, margins, transit times) so the
 * labelling has to be consistent and auditable from one file.
 */

export const BRAND = {
  name: 'PortWhizz',
  module: 'Freight Forwarding',
  primaryMessage: 'Run the shipment. Not the spreadsheet.',
  secondaryMessage: 'One shipment. One job file. One source of truth.',
} as const

export const DEMO = {
  /** Top-nav badge. */
  badge: 'Freight forwarding demo · Simulated environment',
  badgeShort: 'Demo environment',

  /** Sits beside the intake panel on the first view. */
  intakeLabel: 'Illustrative quote-intake experience · Demo data',

  /** Header on the indicative options results view. */
  optionsHeader: 'Indicative demo options',
  optionsSubHeader: 'Simulated operational data · Not a live carrier quote',

  /** The full disclaimer under indicative options. */
  optionsDisclaimer:
    'Indicative options are simulated for this demo. Production pricing would depend on approved partner rates, lane, equipment, service scope, surcharges, currency, validity, and final operational confirmation.',

  /** Quote builder screen label. */
  quoteBuilderLabel: 'Illustrative commercial prototype',
  quoteBuilderSubLabel: 'Demo rate data',

  /** Footer on the shipment timeline. */
  timelineLabel: 'Demo timeline · Simulated operational data',

  /** Stamped on every generated document body. */
  documentNotice: 'Illustrative demo document. Requires legal review before production use.',

  /** Legal & commercial documents area. */
  legalNotice:
    'This is an architectural and workflow demonstration. It is not legal advice and is not a replacement for lawyer-drafted agreements. Document bodies use placeholder commercial copy only.',

  /** Applied to every financial figure. */
  financialNotice: 'All financial values are illustrative demo values.',
  valueSuffix: 'illustrative demo value',

  /** Applied to port and network statistics. */
  simulatedValues: 'All values are simulated.',

  /** Reset control. */
  resetTitle: 'Reset demo data',
  resetBody:
    'This restores the seeded job pipeline and discards anything created during this session, including enquiries you generated from the intake flow.',
} as const

/**
 * What PortWhizz is, and — just as importantly — what it is not.
 * Used verbatim in the product story and About surfaces so the positioning
 * cannot drift into claiming we move the freight ourselves.
 */
export const POSITIONING = {
  owns: [
    'Enquiry record',
    'Quote and charge-line structure',
    'Booking record',
    'Cargo record',
    'Container record',
    'Milestone timeline',
    'Exception record',
    'Freight document vault',
    'Customer-facing visibility',
    'Vendor cost tracking',
    'Customer invoicing workflow',
    'Reconciliation',
    'Job margin',
    'Audit trail',
    'Partner coordination',
  ],
  partnersExecute: [
    'Carrier movement',
    'Transport',
    'Terminal operations',
    'CFS handling',
    'Warehousing',
    'Customs clearance',
    'Financing',
  ],
  statement:
    'PortWhizz owns the digital operating layer. Carriers, transporters, terminals, CFS operators, warehouses, clearance partners and financiers execute the physical and regulated work.',
} as const

/**
 * External customs coordination.
 *
 * This is the ONLY place customs appears in this product. It is an operational
 * dependency with a status, an owner and an update history — never a checklist,
 * never a calculation, never a field-level record. See lib/boundaries.ts.
 */
export const CLEARANCE = {
  moduleName: 'External Clearance Handoff',
  sectionLabel: 'External customs coordination',
  explainer:
    'Clearance is executed by an external customs partner. PortWhizz tracks the coordination status and the dependency it creates on the freight job — it does not perform or record the clearance itself.',
} as const

export const FIRST_VIEW = {
  eyebrow: 'Freight forwarding',
  heading: 'Book freight. Track every milestone. Stay in control.',
  supporting:
    'Tell us where the cargo starts, what is moving, and when it is ready. PortWhizz turns that into a freight request, indicative options, a booking, and a shipment you can follow to delivery.',
  ctaPrimary: 'Search freight options',
  ctaSecondary: 'Explore the Demo',
  ctaAlternative: 'Track an existing shipment',
} as const

/**
 * Where PortWhizz stops and a licensed operator starts.
 *
 * Stated on the marketing surface rather than buried in a terms page: a
 * forwarding platform that lets a customer assume it owns the vessel, the
 * berth or the clearance is setting up a dispute, not a booking.
 */
export const BOUNDARY = {
  statement:
    'PortWhizz coordinates the digital freight journey. Carriers, terminals, transporters, CFS operators and licensed clearance partners execute the physical and regulated movement.',
} as const

export const STORY = {
  heading: 'Every freight job has a story. PortWhizz keeps it together.',
} as const

export const TOASTS = {
  enquiryCreated: {
    title: 'ENQUIRY CREATED',
    body: 'The freight request has been added to the PortWhizz job pipeline.',
  },
} as const
