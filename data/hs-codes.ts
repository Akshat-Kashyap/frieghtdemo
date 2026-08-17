/**
 * HS CODE REFERENCE
 * ══════════════════════════════════════════════════════════════════════════
 * A classification lookup, and deliberately nothing more.
 *
 * What this is: the hierarchy of a code (chapter → heading → subheading →
 * national tariff line), the published rate percentages that attach to it,
 * its import-policy status, and any separate clearance a consignment needs.
 *
 * What this is not, and must not become: a calculator. The moment a screen
 * takes a shipment value and works out what is owed, this stops being a
 * reference tool and becomes a customs product — which is a different
 * product with different obligations. `lib/boundaries.ts` bans the
 * vocabulary of that arithmetic and `tests/boundaries.test.ts` enforces it.
 *
 * On the numbers: digits 1–6 are harmonised worldwide by the WCO, so the
 * chapter, heading and subheading are stable everywhere. Digits 7–8 are
 * India's own subdivision under ITC-HS. Rates are published percentages and
 * they change — every screen that shows one also shows when it was reviewed.
 */

export type PolicyStatus = 'FREE' | 'RESTRICTED' | 'PROHIBITED' | 'STATE_TRADING'

export interface RequiredClearance {
  authority: string
  what: string
}

export interface HsCode {
  /** Eight digits, formatted 0000.00.00 */
  code: string
  chapter: string
  chapterTitle: string
  heading: string
  headingTitle: string
  subheading: string
  subheadingTitle: string
  /** Official tariff wording for the national line. */
  description: string
  /** Plain-language names a customer would actually search for. */
  aliases: string[]

  rates: {
    /** Basic customs duty, as a published percentage. */
    basicDutyPct: number
    /**
     * Social Welfare Surcharge, expressed as a percentage *of the basic
     * duty* — not of the shipment value. This is the single most commonly
     * misread figure on an Indian import, so it is stored and labelled as
     * what it is.
     */
    socialWelfareSurchargePctOfBasic: number
    /** Integrated GST, as a published percentage. */
    igstPct: number
    /** True where the line is subject to a specific or compound rate. */
    compound?: boolean
    note?: string
  }

  policy: {
    status: PolicyStatus
    note?: string
  }

  /**
   * Clearances a consignment may need regardless of policy status. Modelled
   * separately on purpose: a Free item can still require a BIS licence, and
   * folding the two together is how a shipment gets held at the port.
   */
  clearances: RequiredClearance[]
}

const BIS: RequiredClearance = { authority: 'BIS', what: 'Product certification under the applicable Indian Standard' }
const CDSCO: RequiredClearance = { authority: 'CDSCO', what: 'Import registration and consignment NOC' }
const FSSAI: RequiredClearance = { authority: 'FSSAI', what: 'Food import clearance and labelling compliance' }
const WPC: RequiredClearance = { authority: 'WPC', what: 'Equipment type approval for wireless devices' }

export const HS_CODES: HsCode[] = [
  /* ── Chapter 84 · Machinery ─────────────────────────────────────────── */
  {
    code: '8481.80.30',
    chapter: '84',
    chapterTitle: 'Nuclear reactors, boilers, machinery and mechanical appliances',
    heading: '8481',
    headingTitle: 'Taps, cocks, valves and similar appliances for pipes, boiler shells, tanks, vats or the like',
    subheading: '8481.80',
    subheadingTitle: 'Other appliances',
    description: 'Industrial valves (excluding pressure-reducing and thermostatically controlled valves)',
    aliases: ['industrial valve', 'valves', 'ball valve', 'gate valve', 'flow control'],
    rates: { basicDutyPct: 7.5, socialWelfareSurchargePctOfBasic: 10, igstPct: 18 },
    policy: { status: 'FREE' },
    clearances: [BIS],
  },
  {
    code: '8481.80.90',
    chapter: '84',
    chapterTitle: 'Nuclear reactors, boilers, machinery and mechanical appliances',
    heading: '8481',
    headingTitle: 'Taps, cocks, valves and similar appliances',
    subheading: '8481.80',
    subheadingTitle: 'Other appliances',
    description: 'Other taps, cocks and valves, not elsewhere specified',
    aliases: ['pipe fittings', 'cocks', 'taps'],
    rates: { basicDutyPct: 7.5, socialWelfareSurchargePctOfBasic: 10, igstPct: 18 },
    policy: { status: 'FREE' },
    clearances: [],
  },
  {
    code: '8413.70.10',
    chapter: '84',
    chapterTitle: 'Nuclear reactors, boilers, machinery and mechanical appliances',
    heading: '8413',
    headingTitle: 'Pumps for liquids; liquid elevators',
    subheading: '8413.70',
    subheadingTitle: 'Other centrifugal pumps',
    description: 'Primarily designed to handle water',
    aliases: ['centrifugal pump', 'water pump', 'pumps'],
    rates: { basicDutyPct: 7.5, socialWelfareSurchargePctOfBasic: 10, igstPct: 18 },
    policy: { status: 'FREE' },
    clearances: [BIS],
  },

  /* ── Chapter 85 · Electrical machinery ──────────────────────────────── */
  {
    code: '8542.31.00',
    chapter: '85',
    chapterTitle: 'Electrical machinery and equipment and parts thereof',
    heading: '8542',
    headingTitle: 'Electronic integrated circuits',
    subheading: '8542.31',
    subheadingTitle:
      'Processors and controllers, whether or not combined with memories, converters, logic circuits, amplifiers, clock and timing circuits, or other circuits',
    description: 'Processors and controllers',
    aliases: ['electronic components', 'integrated circuit', 'processor', 'microcontroller', 'semiconductor', 'chip'],
    rates: {
      basicDutyPct: 0,
      socialWelfareSurchargePctOfBasic: 10,
      igstPct: 18,
      note: 'Basic duty is nil on this line, so the surcharge — being a percentage of the basic duty — is also nil.',
    },
    policy: { status: 'FREE' },
    clearances: [],
  },
  {
    code: '8539.52.00',
    chapter: '85',
    chapterTitle: 'Electrical machinery and equipment and parts thereof',
    heading: '8539',
    headingTitle: 'Electric filament or discharge lamps; light-emitting diode (LED) light sources',
    subheading: '8539.52',
    subheadingTitle: 'Light-emitting diode (LED) light sources',
    description: 'LED lamps and light sources',
    aliases: ['led lighting', 'led lamp', 'lighting assemblies'],
    rates: { basicDutyPct: 20, socialWelfareSurchargePctOfBasic: 10, igstPct: 18 },
    policy: { status: 'FREE' },
    clearances: [BIS],
  },
  {
    code: '8517.62.90',
    chapter: '85',
    chapterTitle: 'Electrical machinery and equipment and parts thereof',
    heading: '8517',
    headingTitle: 'Telephone sets and other apparatus for the transmission or reception of voice, images or data',
    subheading: '8517.62',
    subheadingTitle: 'Machines for the reception, conversion and transmission of voice, images or other data',
    description: 'Other communication apparatus',
    aliases: ['router', 'networking equipment', 'wireless module', 'telecom equipment'],
    rates: { basicDutyPct: 20, socialWelfareSurchargePctOfBasic: 10, igstPct: 18 },
    policy: { status: 'FREE' },
    clearances: [WPC, BIS],
  },

  /* ── Chapter 29 · Organic chemicals ─────────────────────────────────── */
  {
    code: '2905.31.00',
    chapter: '29',
    chapterTitle: 'Organic chemicals',
    heading: '2905',
    headingTitle: 'Acyclic alcohols and their halogenated, sulphonated, nitrated or nitrosated derivatives',
    subheading: '2905.31',
    subheadingTitle: 'Ethylene glycol (ethanediol)',
    description: 'Ethylene glycol (ethanediol)',
    aliases: ['ethylene glycol', 'meg', 'organic chemicals', 'glycol'],
    rates: {
      basicDutyPct: 10,
      socialWelfareSurchargePctOfBasic: 10,
      igstPct: 18,
      note: 'Sources differ on the GST rate for this line. Verify against the current tariff before relying on it.',
    },
    policy: { status: 'FREE' },
    clearances: [],
  },

  /* ── Chapter 39 · Plastics ──────────────────────────────────────────── */
  {
    code: '3901.10.00',
    chapter: '39',
    chapterTitle: 'Plastics and articles thereof',
    heading: '3901',
    headingTitle: 'Polymers of ethylene, in primary forms',
    subheading: '3901.10',
    subheadingTitle: 'Polyethylene having a specific gravity of less than 0.94',
    description: 'Low-density polyethylene in primary form',
    aliases: ['polymer resin', 'polyethylene', 'ldpe', 'resin granules', 'plastic granules'],
    rates: { basicDutyPct: 7.5, socialWelfareSurchargePctOfBasic: 10, igstPct: 18 },
    policy: { status: 'FREE' },
    clearances: [],
  },

  /* ── Chapter 61 · Knitted apparel ───────────────────────────────────── */
  {
    code: '6109.10.00',
    chapter: '61',
    chapterTitle: 'Articles of apparel and clothing accessories, knitted or crocheted',
    heading: '6109',
    headingTitle: 'T-shirts, singlets and other vests, knitted or crocheted',
    subheading: '6109.10',
    subheadingTitle: 'Of cotton',
    description: 'T-shirts, singlets and other vests, of cotton',
    aliases: ['cotton t-shirt', 'apparel', 'home textiles', 'knitwear', 'garments'],
    rates: {
      basicDutyPct: 20,
      socialWelfareSurchargePctOfBasic: 10,
      igstPct: 5,
      compound: true,
      note: 'Apparel lines commonly carry a compound rate — a percentage or a fixed amount per piece, whichever is higher. GST is 5% below the per-piece value threshold and 18% above it.',
    },
    policy: { status: 'FREE' },
    clearances: [],
  },

  /* ── Chapter 87 · Vehicles ──────────────────────────────────────────── */
  {
    code: '8708.99.00',
    chapter: '87',
    chapterTitle: 'Vehicles other than railway or tramway rolling stock',
    heading: '8708',
    headingTitle: 'Parts and accessories of the motor vehicles of headings 8701 to 8705',
    subheading: '8708.99',
    subheadingTitle: 'Other parts and accessories',
    description: 'Other',
    aliases: ['auto parts', 'automotive components', 'brake components', 'vehicle parts'],
    rates: {
      basicDutyPct: 15,
      socialWelfareSurchargePctOfBasic: 10,
      igstPct: 18,
      note: 'Published sources conflict on the rates for this line. Confirm the current tariff for the specific part before relying on it.',
    },
    policy: { status: 'FREE' },
    clearances: [BIS],
  },

  /* ── Chapter 30 · Pharmaceuticals ───────────────────────────────────── */
  {
    code: '3004.90.99',
    chapter: '30',
    chapterTitle: 'Pharmaceutical products',
    heading: '3004',
    headingTitle: 'Medicaments consisting of mixed or unmixed products for therapeutic or prophylactic uses, in measured doses or retail packing',
    subheading: '3004.90',
    subheadingTitle: 'Other',
    description: 'Other medicaments, not elsewhere specified',
    aliases: ['pharmaceuticals', 'medicaments', 'medicine', 'temperature-controlled pharmaceuticals'],
    rates: {
      basicDutyPct: 10,
      socialWelfareSurchargePctOfBasic: 10,
      igstPct: 5,
      note: 'Basic duty is fully waived on a notified list of life-saving drugs. Check whether the specific formulation is on it.',
    },
    policy: { status: 'RESTRICTED', note: 'Import requires registration and consignment-level clearance from the drug authority.' },
    clearances: [CDSCO],
  },

  /* ── Chapter 72/73 · Iron and steel ─────────────────────────────────── */
  {
    code: '7318.15.00',
    chapter: '73',
    chapterTitle: 'Articles of iron or steel',
    heading: '7318',
    headingTitle: 'Screws, bolts, nuts, coach screws, screw hooks, rivets, cotters, washers and similar articles, of iron or steel',
    subheading: '7318.15',
    subheadingTitle: 'Other screws and bolts, whether or not with their nuts or washers',
    description: 'Other screws and bolts',
    aliases: ['steel fasteners', 'bolts', 'screws', 'fasteners'],
    rates: { basicDutyPct: 15, socialWelfareSurchargePctOfBasic: 10, igstPct: 18 },
    policy: { status: 'FREE' },
    clearances: [BIS],
  },
  {
    code: '7308.90.90',
    chapter: '73',
    chapterTitle: 'Articles of iron or steel',
    heading: '7308',
    headingTitle: 'Structures and parts of structures, of iron or steel',
    subheading: '7308.90',
    subheadingTitle: 'Other',
    description: 'Other structures and parts of structures',
    aliases: ['machined steel components', 'steel structures', 'fabricated steel'],
    rates: { basicDutyPct: 15, socialWelfareSurchargePctOfBasic: 10, igstPct: 18 },
    policy: { status: 'FREE' },
    clearances: [],
  },

  /* ── Chapter 76 · Aluminium ─────────────────────────────────────────── */
  {
    code: '7604.21.00',
    chapter: '76',
    chapterTitle: 'Aluminium and articles thereof',
    heading: '7604',
    headingTitle: 'Aluminium bars, rods and profiles',
    subheading: '7604.21',
    subheadingTitle: 'Hollow profiles',
    description: 'Hollow profiles of aluminium alloys',
    aliases: ['aluminium extrusions', 'aluminium profiles', 'extrusions'],
    rates: { basicDutyPct: 10, socialWelfareSurchargePctOfBasic: 10, igstPct: 18 },
    policy: { status: 'FREE' },
    clearances: [],
  },

  /* ── Chapter 03 · Fish, for the restricted/clearance contrast ───────── */
  {
    code: '0306.17.00',
    chapter: '03',
    chapterTitle: 'Fish and crustaceans, molluscs and other aquatic invertebrates',
    heading: '0306',
    headingTitle: 'Crustaceans, whether in shell or not, live, fresh, chilled, frozen, dried, salted or in brine',
    subheading: '0306.17',
    subheadingTitle: 'Other shrimps and prawns',
    description: 'Other shrimps and prawns, frozen',
    aliases: ['frozen marine products', 'shrimp', 'prawns', 'seafood'],
    rates: { basicDutyPct: 30, socialWelfareSurchargePctOfBasic: 10, igstPct: 5 },
    policy: { status: 'FREE', note: 'Freely importable, but subject to food safety and sanitary clearance on every consignment.' },
    clearances: [FSSAI],
  },
]

/* ══════════════════════════════════════════════════════════════════════════
   LOOKUP
   ══════════════════════════════════════════════════════════════════════════ */

export const POLICY_LABEL: Record<PolicyStatus, string> = {
  FREE: 'Free',
  RESTRICTED: 'Restricted',
  PROHIBITED: 'Prohibited',
  STATE_TRADING: 'State trading enterprise',
}

export const POLICY_DETAIL: Record<PolicyStatus, string> = {
  FREE: 'Freely importable. No authorisation needed from the trade directorate.',
  RESTRICTED: 'Importable only against an authorisation obtained before shipment. Apply online; import authorisations are typically valid for 18 months.',
  PROHIBITED: 'Not permitted for import. There is no licence route.',
  STATE_TRADING: 'Import only through the designated canalising agency.',
}

export const POLICY_TONE: Record<PolicyStatus, 'signal' | 'amber' | 'critical' | 'violet'> = {
  FREE: 'signal',
  RESTRICTED: 'amber',
  PROHIBITED: 'critical',
  STATE_TRADING: 'violet',
}

export function findHsCode(code: string): HsCode | undefined {
  const normalised = code.replace(/\D/g, '')
  return HS_CODES.find((c) => c.code.replace(/\D/g, '') === normalised)
}

/** Search by code fragment, official wording, or the words people actually use. */
export function searchHsCodes(query: string, limit = 12): HsCode[] {
  const q = query.trim().toLowerCase()
  if (!q) return HS_CODES.slice(0, limit)

  const digits = q.replace(/\D/g, '')

  const scored = HS_CODES.map((entry) => {
    let score = 0
    const flat = entry.code.replace(/\D/g, '')

    if (digits && flat.startsWith(digits)) score += 1000 - digits.length
    if (entry.aliases.some((a) => a === q)) score += 800
    if (entry.aliases.some((a) => a.includes(q))) score += 500
    if (entry.description.toLowerCase().includes(q)) score += 300
    if (entry.subheadingTitle.toLowerCase().includes(q)) score += 200
    if (entry.headingTitle.toLowerCase().includes(q)) score += 150
    if (entry.chapterTitle.toLowerCase().includes(q)) score += 60

    return { entry, score }
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map((s) => s.entry)
}

/** Chapters present in the reference set, for browsing. */
export function hsChapters() {
  const map = new Map<string, { chapter: string; title: string; count: number }>()
  for (const entry of HS_CODES) {
    const existing = map.get(entry.chapter)
    if (existing) existing.count += 1
    else map.set(entry.chapter, { chapter: entry.chapter, title: entry.chapterTitle, count: 1 })
  }
  return [...map.values()].sort((a, b) => a.chapter.localeCompare(b.chapter))
}

export const HS_DISCLAIMER =
  'Reference information only. Classification is the importer’s responsibility and rates change — confirm the current tariff and policy for your specific goods before relying on anything here.'
