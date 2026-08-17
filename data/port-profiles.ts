import { DEMO_NOW } from '@/lib/demo-clock'

/**
 * PORT PROFILES
 * ══════════════════════════════════════════════════════════════════════════
 * Reference detail for the ports in `data/ports.ts`, which carries only
 * identity and coordinates.
 *
 * On numbers: terminal names, operators and port authorities are real and
 * checkable. Handling charges, free days and the detention and storage
 * slabs are *bands*, not tariffs — they differ by carrier, by terminal, by
 * import versus export, and they are revised once or twice a year. Every
 * one of them renders behind an "indicative" label, and the free-day and
 * slab structure matters far more to a customer than any single figure:
 * knowing the charge escalates on day 8 and again on day 13 is what changes
 * behaviour, not the exact rupee amount.
 *
 * Detention and storage are modelled as two separate clocks on purpose.
 * They are routinely conflated, they are payable to different parties, and
 * a delayed shipment can run both at once.
 */

export interface ChargeBand {
  label: string
  /** Indicative range, in the stated currency. */
  low: number
  high: number
  currency: 'INR' | 'USD'
  basis: string
  note?: string
}

export interface FreeTimeSlab {
  /** Inclusive day range, counted in calendar days including holidays. */
  fromDay: number
  toDay?: number
  amount: number
  currency: 'INR' | 'USD'
  basis: string
}

export interface PortTerminal {
  name: string
  operator: string
  note?: string
}

export interface PortProfile {
  portId: string
  authority: string
  /** Seaport, ICD, inland — mirrors the `Port.kind` but stated in words. */
  typeLabel: string
  firstPortOfEntry: boolean
  overview: string

  terminals: PortTerminal[]

  /** Indicative terminal handling and related charges. */
  handling: ChargeBand[]

  /** Direct port delivery available to eligible importers. */
  directPortDelivery: boolean
  cfsCount?: number

  freeTime: {
    /** Free days before detention starts, by equipment class. */
    detentionFreeDays: number
    storageFreeDays: number
    detentionSlabs: FreeTimeSlab[]
    storageSlabs: FreeTimeSlab[]
  }

  statistics: Array<{ label: string; value: string; note?: string }>

  /** Operational notes a customer would actually act on. */
  advisories: string[]
}

const NHAVA_SHEVA: PortProfile = {
  portId: 'INNSA',
  authority: 'Jawaharlal Nehru Port Authority (JNPA)',
  typeLabel: 'Gateway seaport',
  firstPortOfEntry: true,
  overview:
    'India’s largest container gateway, handling more than half the country’s containerised trade across five terminals. For an importer the decision that matters here is direct port delivery versus routing through a container freight station — it is usually a day or two of dwell and a different charge structure.',
  terminals: [
    { name: 'BMCT', operator: 'PSA International', note: 'Largest single terminal at the port' },
    { name: 'NSIGT', operator: 'DP World' },
    { name: 'NSICT', operator: 'DP World' },
    { name: 'GTIPL', operator: 'APM Terminals with CONCOR' },
    { name: 'NSFT', operator: 'JM Baxi with CMA CGM' },
  ],
  handling: [
    { label: 'Terminal handling — 20ft dry', low: 9_000, high: 15_000, currency: 'INR', basis: 'per container' },
    { label: 'Terminal handling — 40ft dry', low: 13_500, high: 22_000, currency: 'INR', basis: 'per container' },
    {
      label: 'Terminal handling — reefer',
      low: 15_000,
      high: 26_000,
      currency: 'INR',
      basis: 'per container',
      note: 'Reefer, hazardous and out-of-gauge all carry a material premium over the dry rate.',
    },
    { label: 'CFS handling', low: 620, high: 980, currency: 'INR', basis: 'per CBM' },
    { label: 'Delivery order', low: 3_800, high: 5_600, currency: 'INR', basis: 'per shipment' },
  ],
  directPortDelivery: true,
  cfsCount: 30,
  freeTime: {
    detentionFreeDays: 7,
    storageFreeDays: 5,
    detentionSlabs: [
      { fromDay: 8, toDay: 12, amount: 60, currency: 'USD', basis: 'per 20ft, per calendar day' },
      { fromDay: 13, toDay: 18, amount: 80, currency: 'USD', basis: 'per 20ft, per calendar day' },
      { fromDay: 19, amount: 110, currency: 'USD', basis: 'per 20ft, per calendar day' },
    ],
    storageSlabs: [
      { fromDay: 6, toDay: 10, amount: 1_450, currency: 'INR', basis: 'per container, per calendar day' },
      { fromDay: 11, amount: 2_900, currency: 'INR', basis: 'per container, per calendar day' },
    ],
  },
  statistics: [
    { label: 'Container terminals', value: '5' },
    { label: 'Linked CFS facilities', value: '~30' },
    { label: 'Share of India’s container trade', value: 'Over 50%' },
    { label: 'Direct port delivery', value: 'Available', note: 'For eligible importers with documentation complete on arrival' },
  ],
  advisories: [
    'Free time runs on calendar days, including weekends and public holidays.',
    'Detention and storage are separate clocks: storage accrues while the box is inside the terminal, detention once it has left and until the empty is returned.',
    'A 40ft container is charged at roughly double the 20ft detention rate.',
    'The port authority has waived storage during disruption events in the past. Waivers are announced per event and are not a standing entitlement.',
  ],
}

const MUNDRA: PortProfile = {
  portId: 'INMUN',
  authority: 'Adani Ports and Special Economic Zone (APSEZ)',
  typeLabel: 'Gateway seaport',
  firstPortOfEntry: true,
  overview:
    'India’s largest commercial port by volume and the main west-coast alternative to Nhava Sheva. Deeper draft and strong rail connectivity inland make it the usual choice for cargo moving to north India.',
  terminals: [
    { name: 'AMCT', operator: 'Adani Ports' },
    { name: 'CT-3 / CT-3 extension', operator: 'Adani Ports' },
    { name: 'CT-4', operator: 'Adani Ports with CMA Terminals' },
  ],
  handling: [
    { label: 'Terminal handling — 20ft dry', low: 9_500, high: 15_500, currency: 'INR', basis: 'per container' },
    { label: 'Terminal handling — 40ft dry', low: 14_000, high: 23_000, currency: 'INR', basis: 'per container' },
    { label: 'CFS handling', low: 590, high: 940, currency: 'INR', basis: 'per CBM' },
    { label: 'Delivery order', low: 3_600, high: 5_400, currency: 'INR', basis: 'per shipment' },
  ],
  directPortDelivery: true,
  cfsCount: 18,
  freeTime: {
    detentionFreeDays: 7,
    storageFreeDays: 5,
    detentionSlabs: [
      { fromDay: 8, toDay: 12, amount: 60, currency: 'USD', basis: 'per 20ft, per calendar day' },
      { fromDay: 13, toDay: 18, amount: 80, currency: 'USD', basis: 'per 20ft, per calendar day' },
      { fromDay: 19, amount: 110, currency: 'USD', basis: 'per 20ft, per calendar day' },
    ],
    storageSlabs: [
      { fromDay: 6, toDay: 10, amount: 1_350, currency: 'INR', basis: 'per container, per calendar day' },
      { fromDay: 11, amount: 2_700, currency: 'INR', basis: 'per container, per calendar day' },
    ],
  },
  statistics: [
    { label: 'Container terminals', value: '3' },
    { label: 'Rail connectivity', value: 'Dedicated freight corridor linked' },
    { label: 'Direct port delivery', value: 'Available' },
  ],
  advisories: [
    'Inland container haulage to north India is typically quoted rail-inclusive from Mundra; compare the door rate rather than the ocean rate alone.',
    'Free time is granted by the carrier, not the port, and varies by contract.',
  ],
}

const CHENNAI: PortProfile = {
  portId: 'INMAA',
  authority: 'Chennai Port Authority',
  typeLabel: 'Gateway seaport',
  firstPortOfEntry: true,
  overview:
    'The principal east-coast container gateway, serving southern India’s automotive and engineering belt. East-coast rotations from the Far East usually run a few days longer than the west-coast equivalent.',
  terminals: [
    { name: 'Chennai Container Terminal', operator: 'DP World' },
    { name: 'Chennai International Terminal', operator: 'PSA International' },
  ],
  handling: [
    { label: 'Terminal handling — 20ft dry', low: 9_200, high: 15_000, currency: 'INR', basis: 'per container' },
    { label: 'Terminal handling — 40ft dry', low: 13_800, high: 22_500, currency: 'INR', basis: 'per container' },
    { label: 'CFS handling', low: 640, high: 1_010, currency: 'INR', basis: 'per CBM' },
  ],
  directPortDelivery: true,
  cfsCount: 22,
  freeTime: {
    detentionFreeDays: 5,
    storageFreeDays: 4,
    detentionSlabs: [
      { fromDay: 6, toDay: 10, amount: 65, currency: 'USD', basis: 'per 20ft, per calendar day' },
      { fromDay: 11, toDay: 16, amount: 85, currency: 'USD', basis: 'per 20ft, per calendar day' },
      { fromDay: 17, amount: 115, currency: 'USD', basis: 'per 20ft, per calendar day' },
    ],
    storageSlabs: [
      { fromDay: 5, toDay: 9, amount: 1_500, currency: 'INR', basis: 'per container, per calendar day' },
      { fromDay: 10, amount: 3_000, currency: 'INR', basis: 'per container, per calendar day' },
    ],
  },
  statistics: [
    { label: 'Container terminals', value: '2' },
    { label: 'Typical free time', value: '5 days', note: 'Shorter than the west-coast gateways' },
  ],
  advisories: [
    'Free time here is commonly shorter than at Nhava Sheva or Mundra — plan delivery before arrival, not after.',
    'Reefer plug availability should be confirmed at booking for temperature-controlled cargo.',
  ],
}

const SHANGHAI: PortProfile = {
  portId: 'CNSHA',
  authority: 'Shanghai International Port Group',
  typeLabel: 'Origin seaport',
  firstPortOfEntry: false,
  overview:
    'The world’s busiest container port and the primary origin for this account’s inbound lanes. Yangshan deep-water and Waigaoqiao handle the bulk of the container traffic.',
  terminals: [
    { name: 'Yangshan Deep-Water Port', operator: 'Shanghai International Port Group' },
    { name: 'Waigaoqiao', operator: 'Shanghai International Port Group' },
  ],
  handling: [
    { label: 'Origin terminal handling — 20ft', low: 130, high: 190, currency: 'USD', basis: 'per container' },
    { label: 'Origin terminal handling — 40ft', low: 190, high: 265, currency: 'USD', basis: 'per container' },
    { label: 'Documentation', low: 45, high: 85, currency: 'USD', basis: 'per bill of lading' },
  ],
  directPortDelivery: false,
  freeTime: {
    detentionFreeDays: 7,
    storageFreeDays: 7,
    detentionSlabs: [{ fromDay: 8, amount: 45, currency: 'USD', basis: 'per 20ft, per calendar day' }],
    storageSlabs: [{ fromDay: 8, amount: 40, currency: 'USD', basis: 'per container, per calendar day' }],
  },
  statistics: [
    { label: 'Sailing frequency to west India', value: 'Every 3–4 days' },
    { label: 'Peak season', value: 'May – August', note: 'Rates on this lane firm through the peak' },
  ],
  advisories: [
    'Shipping instruction and VGM cutoffs at this origin are typically 48–72 hours before vessel departure.',
    'Chinese public holidays materially compress cutoffs — check the sailing calendar around Golden Week and Lunar New Year.',
  ],
}

const NINGBO: PortProfile = {
  portId: 'CNNGB',
  authority: 'Ningbo Zhoushan Port Group',
  typeLabel: 'Origin seaport',
  firstPortOfEntry: false,
  overview:
    'The second Chinese origin on this account’s lanes, often priced marginally below Shanghai and used as an alternative when Shanghai space is tight.',
  terminals: [{ name: 'Beilun container terminals', operator: 'Ningbo Zhoushan Port Group' }],
  handling: [
    { label: 'Origin terminal handling — 20ft', low: 125, high: 185, currency: 'USD', basis: 'per container' },
    { label: 'Origin terminal handling — 40ft', low: 185, high: 255, currency: 'USD', basis: 'per container' },
  ],
  directPortDelivery: false,
  freeTime: {
    detentionFreeDays: 7,
    storageFreeDays: 7,
    detentionSlabs: [{ fromDay: 8, amount: 45, currency: 'USD', basis: 'per 20ft, per calendar day' }],
    storageSlabs: [{ fromDay: 8, amount: 38, currency: 'USD', basis: 'per container, per calendar day' }],
  },
  statistics: [{ label: 'Sailing frequency to west India', value: 'Weekly' }],
  advisories: ['Transit to Nhava Sheva typically runs a day longer than the Shanghai equivalent.'],
}

const SINGAPORE: PortProfile = {
  portId: 'SGSIN',
  authority: 'Maritime and Port Authority of Singapore',
  typeLabel: 'Transhipment hub',
  firstPortOfEntry: false,
  overview:
    'The dominant transhipment hub for this region. Most cargo here is not origin cargo — it is a connection, which is why a missed connection at Singapore is a common cause of an ETA revision.',
  terminals: [{ name: 'PSA Singapore terminals', operator: 'PSA International' }],
  handling: [
    { label: 'Transhipment handling — 20ft', low: 110, high: 160, currency: 'USD', basis: 'per container' },
    { label: 'Transhipment handling — 40ft', low: 165, high: 230, currency: 'USD', basis: 'per container' },
  ],
  directPortDelivery: false,
  freeTime: {
    detentionFreeDays: 7,
    storageFreeDays: 5,
    detentionSlabs: [{ fromDay: 8, amount: 50, currency: 'USD', basis: 'per 20ft, per calendar day' }],
    storageSlabs: [{ fromDay: 6, amount: 45, currency: 'USD', basis: 'per container, per calendar day' }],
  },
  statistics: [{ label: 'Role on your lanes', value: 'Transhipment' }],
  advisories: [
    'Cargo routed via a transhipment hub carries connection risk that a direct service does not. Where a lane offers both, the direct service is usually worth a premium on time-sensitive cargo.',
  ],
}

const JEBEL_ALI: PortProfile = {
  portId: 'AEJEA',
  authority: 'DP World — Jebel Ali',
  typeLabel: 'Origin seaport and hub',
  firstPortOfEntry: false,
  overview:
    'The Middle East’s largest container port, used on this account as both an origin and a relay for west-India services.',
  terminals: [{ name: 'Jebel Ali Terminals 1–4', operator: 'DP World' }],
  handling: [
    { label: 'Origin terminal handling — 20ft', low: 120, high: 175, currency: 'USD', basis: 'per container' },
    { label: 'Origin terminal handling — 40ft', low: 180, high: 245, currency: 'USD', basis: 'per container' },
  ],
  directPortDelivery: false,
  freeTime: {
    detentionFreeDays: 10,
    storageFreeDays: 7,
    detentionSlabs: [{ fromDay: 11, amount: 40, currency: 'USD', basis: 'per 20ft, per calendar day' }],
    storageSlabs: [{ fromDay: 8, amount: 35, currency: 'USD', basis: 'per container, per calendar day' }],
  },
  statistics: [{ label: 'Transit to Mundra', value: '4–6 days' }],
  advisories: ['Short transit to west India makes this lane unusually sensitive to documentation delay rather than sailing delay.'],
}

const ROTTERDAM: PortProfile = {
  portId: 'NLRTM',
  authority: 'Port of Rotterdam Authority',
  typeLabel: 'Destination seaport',
  firstPortOfEntry: false,
  overview: 'Europe’s largest port and the destination on this account’s outbound lane from Nhava Sheva.',
  terminals: [
    { name: 'Maasvlakte II terminals', operator: 'APM Terminals and RWG' },
    { name: 'ECT Delta', operator: 'Hutchison Ports' },
  ],
  handling: [
    { label: 'Destination terminal handling — 20ft', low: 165, high: 230, currency: 'USD', basis: 'per container' },
    { label: 'Destination terminal handling — 40ft', low: 245, high: 330, currency: 'USD', basis: 'per container' },
  ],
  directPortDelivery: false,
  freeTime: {
    detentionFreeDays: 7,
    storageFreeDays: 5,
    detentionSlabs: [{ fromDay: 8, amount: 55, currency: 'USD', basis: 'per 20ft, per calendar day' }],
    storageSlabs: [{ fromDay: 6, amount: 50, currency: 'USD', basis: 'per container, per calendar day' }],
  },
  statistics: [{ label: 'Transit from Nhava Sheva', value: '22–26 days' }],
  advisories: ['Realising export proceeds on this lane requires the AD code registration at the origin gateway to be complete.'],
}

export const PORT_PROFILES: PortProfile[] = [
  NHAVA_SHEVA,
  MUNDRA,
  CHENNAI,
  SHANGHAI,
  NINGBO,
  SINGAPORE,
  JEBEL_ALI,
  ROTTERDAM,
]

export function portProfile(portId: string): PortProfile | undefined {
  return PORT_PROFILES.find((p) => p.portId === portId)
}

/** Ports with a written profile — the index only lists what it can open. */
export const PROFILED_PORT_IDS = PORT_PROFILES.map((p) => p.portId)

/**
 * The date these bands were last reviewed. Rendered next to every figure —
 * an undated charge is the one most likely to be quoted back at you.
 */
export const PROFILE_REVIEWED_AT = DEMO_NOW.toISOString()
