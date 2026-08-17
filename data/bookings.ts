import { daysFromNow, hoursFromNow } from '@/lib/demo-clock'
import type { Booking, CargoDeclaration, Container } from '@/types'
import { HERO_JOB_ID } from './jobs'

/**
 * Bookings, containers and cargo declarations.
 *
 * Cutoffs are expressed relative to the demo clock rather than as literals,
 * so the countdown rail on the dashboard always has live work on it. The
 * hero job's shipping-instruction cutoff is pinned at +2h 18m — that exact
 * figure is what the §21 exception is written against.
 */

export const BOOKINGS: Booking[] = [
  /* ── Hero: Shanghai → Nhava Sheva on MSC Aurora 626E ───────────────── */
  {
    id: 'BKG-2026-00744',
    jobId: HERO_JOB_ID,
    state: 'CONFIRMED',
    carrierId: 'CARR-MSC',
    carrierName: 'MSC',
    bookingNumber: 'MSCU626E0044118',
    vessel: 'MSC Aurora',
    voyage: '626E',
    service: 'Far East – West India Express (FIX)',
    mbl: 'MSCUSH2608441',
    hbl: 'PWZ/NSA/2608/0441',
    releaseType: 'SEAWAY_BILL',
    etd: daysFromNow(-1),
    eta: daysFromNow(2),
    // ETA moved 18h later — this is what the ETA Revision exception measures.
    originalEta: daysFromNow(2 - 0.75),
    cutoffs: {
      // +2h 18m from the demo clock. The control tower's headline countdown.
      shippingInstruction: hoursFromNow(2.3),
      vgm: hoursFromNow(6.5),
      gateIn: hoursFromNow(-30),
      documentation: hoursFromNow(28),
    },
    freeTimeDays: 7,
    freeTimeExpiry: daysFromNow(9),
    emptyPickupDepot: 'Shanghai Waigaoqiao Depot 4',
    originTerminal: 'Yangshan Phase II',
    destinationTerminal: 'JNPT — NSIGT',
    confirmedAt: daysFromNow(-8),
  },

  /* ── Northstar export, cutoff today ────────────────────────────────── */
  {
    id: 'BKG-2026-00751',
    jobId: 'PW-2026-004296',
    state: 'CONFIRMED',
    carrierId: 'CARR-MAERSK',
    carrierName: 'Maersk',
    bookingNumber: 'MAEU751IN0088',
    vessel: 'Maersk Cardiff',
    voyage: '634W',
    service: 'West India – North Europe (WIN)',
    mbl: 'MAEUNSA2609011',
    hbl: 'PWZ/RTM/2609/0088',
    releaseType: 'ORIGINAL_BL',
    etd: daysFromNow(1.5),
    eta: daysFromNow(27),
    originalEta: daysFromNow(27),
    cutoffs: {
      shippingInstruction: hoursFromNow(5.75),
      vgm: hoursFromNow(9),
      gateIn: hoursFromNow(13.5),
      documentation: hoursFromNow(31),
    },
    freeTimeDays: 14,
    freeTimeExpiry: daysFromNow(41),
    emptyPickupDepot: 'Panvel CY',
    originTerminal: 'JNPT — BMCT',
    destinationTerminal: 'Rotterdam Maasvlakte II',
    confirmedAt: daysFromNow(-4),
  },

  /* ── Kinetic import ────────────────────────────────────────────────── */
  {
    id: 'BKG-2026-00748',
    jobId: 'PW-2026-004298',
    state: 'CONFIRMED',
    carrierId: 'CARR-ONE',
    carrierName: 'ONE',
    bookingNumber: 'ONEY748NGB0221',
    vessel: 'ONE Meridian',
    voyage: '118E',
    service: 'China India Express (CIX)',
    mbl: 'ONEYNGB2609221',
    hbl: 'PWZ/NSA/2609/0221',
    releaseType: 'SEAWAY_BILL',
    etd: daysFromNow(2),
    eta: daysFromNow(23),
    originalEta: daysFromNow(23),
    cutoffs: {
      shippingInstruction: hoursFromNow(20),
      vgm: hoursFromNow(26),
      gateIn: hoursFromNow(34),
      documentation: hoursFromNow(44),
    },
    freeTimeDays: 10,
    freeTimeExpiry: daysFromNow(33),
    emptyPickupDepot: 'Ningbo Beilun Depot 2',
    originTerminal: 'Ningbo Meishan',
    destinationTerminal: 'JNPT — NSIGT',
    confirmedAt: daysFromNow(-6),
  },

  /* ── Helios Singapore → Chennai ────────────────────────────────────── */
  {
    id: 'BKG-2026-00747',
    jobId: 'PW-2026-004299',
    state: 'CONFIRMED',
    carrierId: 'CARR-CMACGM',
    carrierName: 'CMA CGM',
    bookingNumber: 'CMAU747SIN0140',
    vessel: 'CMA CGM Bengal',
    voyage: '441S',
    service: 'Straits – Bay of Bengal (SBX)',
    mbl: 'CMAUSIN2609140',
    hbl: 'PWZ/MAA/2609/0140',
    releaseType: 'TELEX_RELEASE',
    etd: daysFromNow(3),
    eta: daysFromNow(13),
    originalEta: daysFromNow(13),
    cutoffs: {
      shippingInstruction: hoursFromNow(38),
      vgm: hoursFromNow(44),
      gateIn: hoursFromNow(52),
      documentation: hoursFromNow(60),
    },
    freeTimeDays: 7,
    freeTimeExpiry: daysFromNow(20),
    originTerminal: 'PSA Pasir Panjang',
    destinationTerminal: 'Chennai — CITPL',
    confirmedAt: daysFromNow(-7),
  },

  /* ── Vertex, gate-in pending (drives the CONTAINER_NOT_GATED_IN case) ─ */
  {
    id: 'BKG-2026-00739',
    jobId: 'PW-2026-004290',
    state: 'CONFIRMED',
    carrierId: 'CARR-HAPAG',
    carrierName: 'Hapag-Lloyd',
    bookingNumber: 'HLCU739SHA0512',
    vessel: 'Hapag Kobe Express',
    voyage: '229E',
    service: 'India Pakistan Express (IPX)',
    mbl: 'HLCUSHA2609512',
    hbl: 'PWZ/NSA/2609/0512',
    releaseType: 'SEAWAY_BILL',
    etd: hoursFromNow(21),
    eta: daysFromNow(20),
    originalEta: daysFromNow(20),
    cutoffs: {
      shippingInstruction: hoursFromNow(-4),
      vgm: hoursFromNow(1.75),
      gateIn: hoursFromNow(4.25),
      documentation: hoursFromNow(14),
    },
    freeTimeDays: 7,
    freeTimeExpiry: daysFromNow(27),
    emptyPickupDepot: 'Shanghai Wusong Depot 1',
    originTerminal: 'Yangshan Phase III',
    destinationTerminal: 'JNPT — NSIGT',
    confirmedAt: daysFromNow(-5),
  },

  /* ── Apex arriving, free-time exposure ─────────────────────────────── */
  {
    id: 'BKG-2026-00698',
    jobId: 'PW-2026-004262',
    state: 'CONFIRMED',
    carrierId: 'CARR-MSC',
    carrierName: 'MSC',
    bookingNumber: 'MSCU698NGB0311',
    vessel: 'MSC Larissa',
    voyage: '618E',
    service: 'Far East – West India Express (FIX)',
    mbl: 'MSCUNGB2608311',
    hbl: 'PWZ/NSA/2608/0311',
    releaseType: 'SEAWAY_BILL',
    etd: daysFromNow(-21),
    // Berthed at 06:50 this morning — arriving today, with the free-time
    // clock already running. This is the job the Free-Time Risk case sits on.
    eta: hoursFromNow(-2.5),
    originalEta: daysFromNow(-1),
    cutoffs: {
      shippingInstruction: daysFromNow(-23),
      vgm: daysFromNow(-23),
      gateIn: daysFromNow(-22),
      documentation: daysFromNow(-22),
    },
    freeTimeDays: 7,
    // Free time expires in under two days with the box still at the terminal.
    freeTimeExpiry: hoursFromNow(41),
    originTerminal: 'Ningbo Meishan',
    destinationTerminal: 'JNPT — NSIGT',
    confirmedAt: daysFromNow(-25),
  },
]

/* ══════════════════════════════════════════════════════════════════════════
   CONTAINERS
   ══════════════════════════════════════════════════════════════════════════ */

export const CONTAINERS: Container[] = [
  /* ── Hero job: the two cards rendered verbatim on the Cargo tab ────── */
  {
    number: 'MSCU1234567',
    jobId: HERO_JOB_ID,
    isoType: '40HC',
    sealNumber: 'SL-88421',
    grossWeightKg: 18420,
    vgmKg: 18550,
    vgmMethod: 'METHOD_1_WEIGHBRIDGE',
    volumeCbm: 62.4,
    packageCount: 412,
    status: 'LOADED',
    gatedInAt: daysFromNow(-3),
    loadedAt: daysFromNow(-2),
  },
  {
    number: 'MSCU1234568',
    jobId: HERO_JOB_ID,
    isoType: '40HC',
    sealNumber: 'SL-88422',
    grossWeightKg: 18100,
    // VGM deliberately absent — this is the open operational gap the demo shows.
    vgmKg: undefined,
    vgmMethod: 'PENDING',
    volumeCbm: 61.8,
    packageCount: 398,
    status: 'GATE_IN_PENDING',
  },

  /* ── Northstar export ──────────────────────────────────────────────── */
  {
    number: 'MRKU7781204',
    jobId: 'PW-2026-004296',
    isoType: '40FT',
    sealNumber: 'SL-91130',
    grossWeightKg: 21340,
    vgmKg: 21510,
    vgmMethod: 'METHOD_2_CALCULATED',
    volumeCbm: 58.2,
    packageCount: 640,
    status: 'STUFFING',
  },
  {
    number: 'MRKU7781205',
    jobId: 'PW-2026-004296',
    isoType: '40FT',
    sealNumber: 'SL-91131',
    grossWeightKg: 20980,
    vgmMethod: 'PENDING',
    volumeCbm: 57.6,
    packageCount: 618,
    status: 'STUFFING',
  },

  /* ── Kinetic import ────────────────────────────────────────────────── */
  {
    number: 'ONEU4420118',
    jobId: 'PW-2026-004298',
    isoType: '20FT',
    sealNumber: 'SL-77210',
    grossWeightKg: 14260,
    vgmKg: 14380,
    vgmMethod: 'METHOD_1_WEIGHBRIDGE',
    volumeCbm: 28.4,
    packageCount: 210,
    status: 'GATED_IN',
    gatedInAt: hoursFromNow(-9),
  },

  /* ── Helios ────────────────────────────────────────────────────────── */
  {
    number: 'CMAU5510440',
    jobId: 'PW-2026-004299',
    isoType: '40HC',
    sealNumber: 'SL-66018',
    grossWeightKg: 17100,
    vgmKg: 17240,
    vgmMethod: 'METHOD_1_WEIGHBRIDGE',
    volumeCbm: 63.1,
    packageCount: 355,
    status: 'GATE_IN_PENDING',
  },

  /* ── Vertex — not gated in, sailing at risk ────────────────────────── */
  {
    number: 'HLXU8830571',
    jobId: 'PW-2026-004290',
    isoType: '40HC',
    sealNumber: 'SL-44902',
    grossWeightKg: 19240,
    vgmKg: 19390,
    vgmMethod: 'METHOD_1_WEIGHBRIDGE',
    volumeCbm: 64.0,
    packageCount: 480,
    status: 'GATE_IN_PENDING',
  },

  /* ── Apex arriving, free-time clock running ────────────────────────── */
  {
    number: 'MSCU9911342',
    jobId: 'PW-2026-004262',
    isoType: '40HC',
    sealNumber: 'SL-31188',
    grossWeightKg: 18960,
    vgmKg: 19110,
    vgmMethod: 'METHOD_1_WEIGHBRIDGE',
    volumeCbm: 63.7,
    packageCount: 428,
    status: 'DISCHARGED',
    gatedInAt: daysFromNow(-24),
    loadedAt: daysFromNow(-22),
  },
]

/* ══════════════════════════════════════════════════════════════════════════
   CARGO DECLARATIONS
   ══════════════════════════════════════════════════════════════════════════ */

export const CARGO_DECLARATIONS: CargoDeclaration[] = [
  {
    jobId: HERO_JOB_ID,
    commodity: 'Industrial valves and pipe fittings',
    packageCount: 810,
    grossWeightKg: 36520,
    volumeCbm: 124.2,
    dangerousGoods: false,
    temperatureControlled: false,
    specialHandling: ['NONE'],
    marksAndNumbers: 'APEX/NSA/2608 · 1–810',
  },
  {
    jobId: 'PW-2026-004296',
    commodity: 'Cotton home textiles',
    packageCount: 1258,
    grossWeightKg: 42320,
    volumeCbm: 115.8,
    dangerousGoods: false,
    temperatureControlled: false,
    specialHandling: ['NONE'],
    marksAndNumbers: 'NST/RTM/2609 · 1–1258',
  },
  {
    jobId: 'PW-2026-004298',
    commodity: 'Automotive brake components',
    packageCount: 210,
    grossWeightKg: 14260,
    volumeCbm: 28.4,
    dangerousGoods: false,
    temperatureControlled: false,
    specialHandling: ['NONE'],
    marksAndNumbers: 'KIN/NSA/2609 · 1–210',
  },
  {
    jobId: 'PW-2026-004290',
    commodity: 'Polymer resin granules',
    packageCount: 480,
    grossWeightKg: 19240,
    volumeCbm: 64.0,
    dangerousGoods: false,
    temperatureControlled: false,
    specialHandling: ['NONE'],
    marksAndNumbers: 'VTX/NSA/2609 · 1–480',
  },
  {
    jobId: 'PW-2026-004262',
    commodity: 'Industrial pumps and spares',
    packageCount: 428,
    grossWeightKg: 18960,
    volumeCbm: 63.7,
    dangerousGoods: false,
    temperatureControlled: false,
    specialHandling: ['NONE'],
    marksAndNumbers: 'APEX/NSA/2608 · 1–428',
  },
  {
    jobId: 'PW-2026-004293',
    commodity: 'Frozen marine products',
    packageCount: 1840,
    grossWeightKg: 24100,
    volumeCbm: 58.0,
    dangerousGoods: false,
    temperatureControlled: true,
    temperatureSetPoint: '−18 °C',
    specialHandling: ['REEFER', 'TEMPERATURE_CONTROLLED'],
    marksAndNumbers: 'CAS/JEA/2609 · 1–1840',
  },
]

const BOOKING_INDEX = new Map(BOOKINGS.map((b) => [b.id, b]))

export function getSeedBooking(id: string): Booking | undefined {
  return BOOKING_INDEX.get(id)
}

export function containersForJob(jobId: string): Container[] {
  return CONTAINERS.filter((c) => c.jobId === jobId)
}
