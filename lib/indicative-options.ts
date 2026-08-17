import { DEMO_NOW_MS, daysFromNow } from '@/lib/demo-clock'
import { chargeableWeight, count, teuFor, volumeCbm as formatCbm, weightKg } from '@/lib/format'
import { modeGroup, type ModeGroup } from '@/lib/mode-locations'
import { rng } from '@/lib/seed'
import { haversineKm, transitBandFor } from '@/data/lanes'
import { requirePort } from '@/data/ports'
import type { IndicativeOption, IntakeDraft, OptionChargeCategory, OptionKind, TransportMode } from '@/types'

/**
 * INDICATIVE OPTIONS
 * ══════════════════════════════════════════════════════════════════════════
 * Turns an intake draft into three simulated options.
 *
 * This does NOT pretend to contact carriers. It builds a plausible, internally
 * consistent commercial structure from the lane, the mode, the cargo and the
 * requested scope — so the numbers move sensibly when the viewer changes the
 * inputs, which is the only thing that makes the demo feel real.
 *
 * Every mode is priced on ITS OWN basis, and the basis is stated everywhere a
 * figure appears. Five modes scaled off one ocean number is the shortcut that
 * makes a quote tool useless the first time someone checks it: a container
 * rate is per box, LCL is per revenue ton, air is per chargeable kilo and a
 * truck is a truck. They also do not share a charge structure — LCL pays a CFS
 * and never pays detention, a full container pays detention and never sees a
 * CFS — so the category tables below are per mode, not per mode family.
 *
 * Deterministic: same inputs always produce the same options, so a figure
 * pointed at in a meeting is still there when someone asks about it.
 */

/* ── Chargeable units by mode ─────────────────────────────────────────── */

export interface CargoUnits {
  /** The quantity the main-carriage charge is applied to. */
  chargeableQty: number
  /** Singular noun for one unit of that quantity: "container", "w/m", "kg". */
  unit: string
  /** The quantity with its unit: "2 containers", "18.4 w/m", "6,992 kg". */
  qtyLabel: string
  /** Human summary of the cargo itself: "2 × 40HC", "96 packages · 18.40 CBM". */
  summary: string
  /** Container equivalent units, where containers exist. */
  teu: number
  /** How the rate is expressed: "per container", "per w/m". */
  basisLabel: string
  /**
   * Where two measurements compete for the price, which one won and why.
   * This is the single most misunderstood thing in freight — an LCL shipper
   * who budgeted on cubic metres and gets billed on weight thinks they have
   * been overcharged — so it is shown, never left to be inferred.
   */
  driver?: { headline: string; detail: string }
}

export function cargoUnitsFor(draft: IntakeDraft): CargoUnits {
  const cargo = draft.cargo

  switch (draft.mode) {
    case 'OCEAN_FCL': {
      const containers = cargo.containers ?? []
      const qty = containers.reduce((s, c) => s + c.quantity, 0) || 1
      const teu = containers.reduce((s, c) => s + teuFor(c.isoType, c.quantity), 0) || 1
      const summary = containers.length
        ? containers.map((c) => `${c.quantity} × ${c.isoType}`).join(' + ')
        : '1 × 40HC'
      return {
        chargeableQty: qty,
        unit: 'container',
        qtyLabel: `${count(qty)} ${qty === 1 ? 'container' : 'containers'}`,
        summary,
        teu,
        basisLabel: 'per container',
      }
    }

    case 'OCEAN_LCL': {
      // LCL charges on the revenue ton — the GREATER of cubic metres and
      // tonnes, at 1 CBM = 1,000 kg. Written "w/m", weight or measure.
      const cbm = cargo.volumeCbm ?? 1
      const tonnes = (cargo.grossWeightKg ?? 0) / 1000
      const revenueTons = Math.max(cbm, tonnes)
      const byVolume = cbm >= tonnes
      return {
        chargeableQty: Math.max(1, Math.round(revenueTons * 10) / 10),
        unit: 'w/m',
        qtyLabel: `${revenueTons.toFixed(1)} w/m`,
        summary: `${count(cargo.packageCount ?? 0)} packages · ${formatCbm(cbm)}`,
        teu: 0,
        basisLabel: 'per w/m (revenue ton)',
        driver: {
          headline: byVolume ? 'Volume is setting the price' : 'Weight is setting the price',
          detail: `${formatCbm(cbm)} against ${tonnes.toFixed(2)} t. LCL charges on the greater of the two at 1 CBM = 1,000 kg, so this books as ${revenueTons.toFixed(1)} w/m.`,
        },
      }
    }

    case 'AIR': {
      const actual = cargo.actualWeightKg ?? cargo.grossWeightKg ?? 0
      const volumetric = cargo.volumetricWeightKg ?? 0
      const chargeable = cargo.chargeableWeightKg ?? chargeableWeight(actual, volumetric)
      const dims = cargo.dimensionsCm
      const pieces = cargo.packageCount ?? 0
      const byVolume = volumetric > actual
      return {
        chargeableQty: Math.max(1, Math.round(chargeable)),
        unit: 'kg',
        qtyLabel: `${weightKg(chargeable)} chargeable`,
        summary: `${count(pieces)} pieces · ${weightKg(chargeable)} chargeable`,
        teu: 0,
        basisLabel: 'per kg chargeable',
        driver: {
          headline: byVolume ? 'Volumetric weight is setting the price' : 'Actual weight is setting the price',
          detail: dims
            ? `${dims.length} × ${dims.width} × ${dims.height} cm ÷ 6000 × ${count(pieces)} pieces = ${weightKg(volumetric)} volumetric, against ${weightKg(actual)} actual.`
            : `${weightKg(volumetric)} volumetric against ${weightKg(actual)} actual, at the 1:6000 air ratio.`,
        },
      }
    }

    case 'DOMESTIC_FTL': {
      const tonnes = (cargo.grossWeightKg ?? 0) / 1000
      return {
        chargeableQty: 1,
        unit: 'vehicle',
        qtyLabel: '1 vehicle',
        summary: `1 × ${(cargo.vehicleType ?? '32FT_SXL').replace(/_/g, ' ')} · ${tonnes.toFixed(1)} t`,
        teu: 0,
        basisLabel: 'per vehicle',
      }
    }

    case 'DOMESTIC_LTL': {
      const cbm = cargo.volumeCbm ?? 1
      const weight = cargo.grossWeightKg ?? 0
      // Road part-load charges on 1 CBM ≈ 180 kg, whichever is greater.
      const volumetric = cbm * 180
      const chargeable = Math.max(weight, volumetric)
      const byVolume = volumetric > weight
      return {
        chargeableQty: Math.max(1, Math.round(chargeable)),
        unit: 'kg',
        qtyLabel: `${weightKg(chargeable)} chargeable`,
        summary: `${count(cargo.packageCount ?? 0)} packages · ${formatCbm(cbm)} · ${weightKg(weight)}`,
        teu: 0,
        basisLabel: 'per kg chargeable',
        driver: {
          headline: byVolume ? 'Volume is setting the price' : 'Weight is setting the price',
          detail: `${formatCbm(cbm)} at the road ratio of 1 CBM = 180 kg is ${weightKg(volumetric)}, against ${weightKg(weight)} actual.`,
        },
      }
    }
  }
}

/** The per-unit main-carriage rate implied by a generated option. */
export function perUnitRate(option: IndicativeOption, units: CargoUnits): number | null {
  const main = option.chargeCategories.find((c) => c.family === 'MAIN_CARRIAGE')
  if (!main || units.chargeableQty <= 0) return null
  return Math.round((main.amountUsd / units.chargeableQty) * 100) / 100
}

/* ── Per-unit base rates by mode (USD) ────────────────────────────────── */

const BASE_RATE: Record<TransportMode, number> = {
  OCEAN_FCL: 1350,
  OCEAN_LCL: 62,
  AIR: 4.2,
  DOMESTIC_FTL: 240,
  DOMESTIC_LTL: 0.19,
}

/** Rate scales with distance, but sub-linearly — freight is not a taxi meter. */
function distanceFactor(km: number, mode: TransportMode): number {
  const reference = mode === 'AIR' ? 6000 : mode.startsWith('DOMESTIC') ? 1200 : 8200
  return 0.55 + 0.45 * Math.pow(km / reference, 0.75)
}

/* ── What the three options mean, in each mode's own language ─────────── */

interface Profile {
  label: string
  /** Multiplier on the balanced total. */
  priceFactor: number
  /** Multiplier on the balanced transit band. */
  transitFactor: [number, number]
  flexibility: 'LOW' | 'MEDIUM' | 'HIGH'
}

const PROFILE: Record<OptionKind, Profile> = {
  BALANCED: { label: 'Balanced', priceFactor: 1, transitFactor: [1, 1], flexibility: 'MEDIUM' },
  FASTEST: { label: 'Fastest', priceFactor: 1.28, transitFactor: [0.78, 0.79], flexibility: 'LOW' },
  COST_OPTIMISED: { label: 'Cost Optimised', priceFactor: 0.84, transitFactor: [1.22, 1.28], flexibility: 'HIGH' },
}

/**
 * "Fastest" is not one product. On the water it is a direct sailing you pay a
 * premium to be allocated; in the air it is a different uplift class; on the
 * road it is a dedicated vehicle that does not stop. Describing all three with
 * "Priority service" is the wording that tells a freight person the tool does
 * not know which mode it is quoting.
 */
const MODE_PROFILE: Record<ModeGroup, Record<OptionKind, { serviceLevel: string; description: string; departureOffsetDays: number }>> = {
  OCEAN: {
    BALANCED: {
      serviceLevel: 'Direct service, weekly sailing',
      description: 'Balanced cost and reliability on the standard string, with normal partner coordination.',
      departureOffsetDays: 4,
    },
    FASTEST: {
      serviceLevel: 'Priority allocation, first available sailing',
      description: 'Space secured on the earliest departure. Higher indicative cost and a tighter cargo cutoff.',
      departureOffsetDays: 2,
    },
    COST_OPTIMISED: {
      serviceLevel: 'Transhipment routing via a hub',
      description: 'Routed through a transhipment port. Longer transit range and more schedule variability.',
      departureOffsetDays: 7,
    },
  },
  AIR: {
    BALANCED: {
      serviceLevel: 'Consolidated uplift, daily departures',
      description: 'Cargo moves on the daily consolidation. Standard handling at both airports.',
      departureOffsetDays: 2,
    },
    FASTEST: {
      serviceLevel: 'Express, next available flight',
      description: 'Booked as express on the next uplift. Highest rate per kilo, shortest airport-to-airport time.',
      departureOffsetDays: 1,
    },
    COST_OPTIMISED: {
      serviceLevel: 'Deferred uplift, space available',
      description: 'Moves when space clears, often on a later flight. Lowest rate, least certain departure.',
      departureOffsetDays: 4,
    },
  },
  DOMESTIC: {
    BALANCED: {
      serviceLevel: 'Scheduled vehicle placement',
      description: 'Vehicle placed on the agreed day, single drop, standard running hours.',
      departureOffsetDays: 2,
    },
    FASTEST: {
      serviceLevel: 'Priority placement, direct run',
      description: 'Dedicated vehicle placed next day and driven through. No consolidation stops.',
      departureOffsetDays: 1,
    },
    COST_OPTIMISED: {
      serviceLevel: 'Standard placement, multi-drop routing',
      description: 'Shares the run with other consignments. Cheapest per unit, widest delivery window.',
      departureOffsetDays: 3,
    },
  },
}

/** How long a rate of this kind is worth anything. Air moves fastest of all. */
const VALIDITY_DAYS: Record<ModeGroup, number> = { OCEAN: 14, AIR: 7, DOMESTIC: 30 }

/* ── Charge category shape per mode ───────────────────────────────────── */

interface CategorySpec {
  family: OptionChargeCategory['family']
  label: string
  /** Share of the main-carriage figure this category represents. */
  share: number
  basis: string
  note?: string
  exposureOnly?: boolean
  /** Only include when the scope calls for it. */
  requires?: (draft: IntakeDraft) => boolean
}

const needsInland = (d: IntakeDraft) =>
  d.inlandDeliveryRequired || d.serviceScope === 'PORT_TO_DOOR' || d.serviceScope === 'DOOR_TO_DOOR'

const OCEAN_FCL_CATEGORIES: CategorySpec[] = [
  { family: 'MAIN_CARRIAGE', label: 'Main carriage', share: 1, basis: 'Per container' },
  { family: 'FUEL_SURCHARGE', label: 'Bunker adjustment', share: 0.152, basis: 'Per container', note: 'Floats with the carrier bunker index.' },
  { family: 'ORIGIN_HANDLING', label: 'Origin handling', share: 0.163, basis: 'Per container' },
  { family: 'TERMINAL_HANDLING', label: 'Terminal handling', share: 0.095, basis: 'Per container' },
  { family: 'DESTINATION_HANDLING', label: 'Destination handling', share: 0.088, basis: 'Per container' },
  { family: 'DOCUMENTATION', label: 'Documentation', share: 0.028, basis: 'Per bill of lading' },
  { family: 'INLAND', label: 'Inland movement', share: 0.192, basis: 'Per container', requires: needsInland },
  {
    family: 'INSURANCE',
    label: 'Insurance',
    share: 0.042,
    basis: 'Percentage of declared value',
    note: 'Placed with an external insurer.',
    requires: (d) => d.insuranceRequired,
  },
  { family: 'SPECIAL_HANDLING', label: 'Special handling', share: 0.115, basis: 'Per shipment', requires: (d) => d.specialHandling !== 'NONE' },
  {
    family: 'STORAGE',
    label: 'Storage exposure',
    share: 0.048,
    basis: 'Per container per day',
    note: 'Exposure only. Accrues past free time; not billed on this option.',
    exposureOnly: true,
  },
  {
    family: 'DETENTION',
    label: 'Detention exposure',
    share: 0.061,
    basis: 'Per container per day',
    note: 'Exposure only. Starts when carrier free time expires.',
    exposureOnly: true,
  },
]

/**
 * LCL is not FCL divided by a number. The cargo never occupies a box of its
 * own, so there is no detention to run and no terminal handling per container
 * — instead it pays a container freight station at both ends, which is the
 * charge that surprises every first-time LCL shipper.
 */
const OCEAN_LCL_CATEGORIES: CategorySpec[] = [
  { family: 'MAIN_CARRIAGE', label: 'Main carriage', share: 1, basis: 'Per w/m' },
  { family: 'FUEL_SURCHARGE', label: 'Bunker adjustment', share: 0.138, basis: 'Per w/m' },
  { family: 'CFS', label: 'Origin CFS receipt', share: 0.22, basis: 'Per w/m', note: 'Charged by the container freight station that consolidates the box.' },
  { family: 'ORIGIN_HANDLING', label: 'Origin handling', share: 0.12, basis: 'Per w/m' },
  { family: 'DESTINATION_HANDLING', label: 'Destination CFS de-stuffing', share: 0.26, basis: 'Per w/m', note: 'Collected at destination before cargo release.' },
  { family: 'DOCUMENTATION', label: 'Documentation', share: 0.085, basis: 'Per house bill of lading' },
  { family: 'DELIVERY_ORDER', label: 'Delivery order', share: 0.06, basis: 'Per consignment' },
  { family: 'INLAND', label: 'Inland movement', share: 0.24, basis: 'Per shipment', requires: needsInland },
  {
    family: 'INSURANCE',
    label: 'Insurance',
    share: 0.05,
    basis: 'Percentage of declared value',
    note: 'Placed with an external insurer.',
    requires: (d) => d.insuranceRequired,
  },
  { family: 'SPECIAL_HANDLING', label: 'Special handling', share: 0.14, basis: 'Per shipment', requires: (d) => d.specialHandling !== 'NONE' },
  {
    family: 'STORAGE',
    label: 'CFS storage exposure',
    share: 0.075,
    basis: 'Per w/m per day',
    note: 'Exposure only. Accrues at the destination CFS past free time.',
    exposureOnly: true,
  },
]

const AIR_CATEGORIES: CategorySpec[] = [
  { family: 'MAIN_CARRIAGE', label: 'Main carriage', share: 1, basis: 'Per kg chargeable' },
  { family: 'FUEL_SURCHARGE', label: 'Fuel surcharge', share: 0.185, basis: 'Per kg chargeable' },
  { family: 'TERMINAL_HANDLING', label: 'Airline terminal charge', share: 0.072, basis: 'Per kg chargeable' },
  { family: 'ORIGIN_HANDLING', label: 'Origin handling and screening', share: 0.11, basis: 'Per shipment' },
  { family: 'DESTINATION_HANDLING', label: 'Destination handling', share: 0.098, basis: 'Per shipment' },
  { family: 'DOCUMENTATION', label: 'Documentation', share: 0.032, basis: 'Per air waybill' },
  { family: 'INLAND', label: 'Inland movement', share: 0.14, basis: 'Per shipment', requires: (d) => d.inlandDeliveryRequired || d.serviceScope.includes('DOOR') },
  { family: 'INSURANCE', label: 'Insurance', share: 0.05, basis: 'Percentage of declared value', requires: (d) => d.insuranceRequired },
  { family: 'SPECIAL_HANDLING', label: 'Special handling', share: 0.16, basis: 'Per shipment', requires: (d) => d.specialHandling !== 'NONE' },
  {
    family: 'STORAGE',
    label: 'Airport storage exposure',
    share: 0.03,
    basis: 'Per day at the airport terminal',
    note: 'Exposure only. Accrues if cargo is not collected inside free time.',
    exposureOnly: true,
  },
]

const ROAD_FTL_CATEGORIES: CategorySpec[] = [
  { family: 'MAIN_CARRIAGE', label: 'Vehicle freight', share: 1, basis: 'Per vehicle' },
  { family: 'FUEL_SURCHARGE', label: 'Fuel surcharge', share: 0.11, basis: 'Per vehicle' },
  { family: 'ORIGIN_HANDLING', label: 'Loading', share: 0.06, basis: 'Per vehicle' },
  { family: 'DESTINATION_HANDLING', label: 'Unloading', share: 0.06, basis: 'Per vehicle' },
  { family: 'DOCUMENTATION', label: 'Transport documentation', share: 0.02, basis: 'Per consignment' },
  {
    family: 'WAITING',
    label: 'Detention at site',
    share: 0.075,
    basis: 'Per hour beyond the free window',
    note: 'Conditional — charged only beyond the free loading and unloading hours.',
  },
  { family: 'INSURANCE', label: 'Insurance', share: 0.04, basis: 'Percentage of declared value', requires: (d) => d.insuranceRequired },
  { family: 'SPECIAL_HANDLING', label: 'Special handling', share: 0.12, basis: 'Per consignment', requires: (d) => d.specialHandling !== 'NONE' },
]

/**
 * A part load shares the vehicle, so it never pays for one: no vehicle
 * detention, no dedicated loading, and a hub charge at each end instead.
 */
const ROAD_LTL_CATEGORIES: CategorySpec[] = [
  { family: 'MAIN_CARRIAGE', label: 'Part-load freight', share: 1, basis: 'Per kg chargeable' },
  { family: 'FUEL_SURCHARGE', label: 'Fuel surcharge', share: 0.115, basis: 'Per kg chargeable' },
  { family: 'ORIGIN_HANDLING', label: 'Pickup and hub inward', share: 0.13, basis: 'Per consignment' },
  { family: 'DESTINATION_HANDLING', label: 'Hub outward and delivery', share: 0.16, basis: 'Per consignment' },
  { family: 'DOCUMENTATION', label: 'Transport documentation', share: 0.03, basis: 'Per consignment' },
  { family: 'INSURANCE', label: 'Insurance', share: 0.04, basis: 'Percentage of declared value', requires: (d) => d.insuranceRequired },
  { family: 'SPECIAL_HANDLING', label: 'Special handling', share: 0.12, basis: 'Per consignment', requires: (d) => d.specialHandling !== 'NONE' },
  {
    family: 'STORAGE',
    label: 'Hub storage exposure',
    share: 0.05,
    basis: 'Per day at the hub',
    note: 'Exposure only. Accrues if delivery cannot be made on the first attempt.',
    exposureOnly: true,
  },
]

const CATEGORIES: Record<TransportMode, CategorySpec[]> = {
  OCEAN_FCL: OCEAN_FCL_CATEGORIES,
  OCEAN_LCL: OCEAN_LCL_CATEGORIES,
  AIR: AIR_CATEGORIES,
  DOMESTIC_FTL: ROAD_FTL_CATEGORIES,
  DOMESTIC_LTL: ROAD_LTL_CATEGORIES,
}

/* ── Included / excluded services ─────────────────────────────────────── */

/** What each mode's main carriage actually buys you, in its own words. */
const MODE_INCLUSIONS: Record<TransportMode, string[]> = {
  OCEAN_FCL: ['Terminal handling at destination', 'Container release coordination'],
  OCEAN_LCL: ['Consolidation into the shared container at origin', 'De-stuffing at the destination CFS'],
  AIR: ['Airline booking and uplift coordination', 'Air waybill issue'],
  DOMESTIC_FTL: ['Vehicle placement at the pickup point', 'Proof of delivery capture'],
  DOMESTIC_LTL: ['Pickup to the origin hub', 'Delivery attempt at the consignee address'],
}

function servicesFor(draft: IntakeDraft, kind: OptionKind): { included: string[]; excluded: string[] } {
  const group = modeGroup(draft.mode)
  const included: string[] = ['Main carriage', 'Origin handling', 'Documentation', 'Milestone tracking in PortWhizz']
  const excluded: string[] = []

  included.push(...MODE_INCLUSIONS[draft.mode])

  // A domestic road quote IS the inland movement — offering "inland delivery"
  // on top of it would be quoting the same leg twice.
  if (group !== 'DOMESTIC') {
    if (draft.inlandDeliveryRequired || draft.serviceScope.includes('DOOR')) included.push('Inland delivery')
    else excluded.push(group === 'AIR' ? 'Delivery beyond the destination airport' : 'Inland delivery beyond the destination port')
  }

  if (draft.insuranceRequired) included.push('Marine cargo insurance placement')
  else excluded.push('Cargo insurance')

  if (draft.specialHandling !== 'NONE') included.push(`Special handling — ${draft.specialHandling.replace(/_/g, ' ').toLowerCase()}`)

  // The one permitted customs statement: coordination, never execution.
  if (draft.clearanceCoordinationRequired) included.push('External customs partner coordination')
  if (group !== 'DOMESTIC') excluded.push('Customs clearance charges levied by the external partner')

  if (draft.mode === 'OCEAN_FCL') excluded.push('Storage and detention beyond free time')
  if (draft.mode === 'OCEAN_LCL') excluded.push('CFS storage beyond free time')
  if (draft.mode === 'AIR') excluded.push('Airport storage beyond free time')
  if (group === 'DOMESTIC') excluded.push('Waiting beyond the free loading and unloading window')

  if (group !== 'DOMESTIC') excluded.push('Duties, taxes and statutory levies')
  else excluded.push('Statutory levies and tolls billed at actuals')

  if (kind === 'COST_OPTIMISED') {
    if (group === 'OCEAN') excluded.push('Guaranteed sailing on the first available vessel')
    if (group === 'AIR') excluded.push('Guaranteed uplift on a named flight')
    if (group === 'DOMESTIC') excluded.push('Guaranteed single-drop routing')
  }

  return { included, excluded }
}

/** The things that actually go wrong, per mode and per option positioning. */
function riskIndicatorsFor(draft: IntakeDraft, kind: OptionKind): string[] {
  const group = modeGroup(draft.mode)
  const risks: string[] = []

  if (kind === 'COST_OPTIMISED') {
    if (group === 'OCEAN') risks.push('Transhipment routing — higher rollover probability')
    if (group === 'AIR') risks.push('Space-available uplift — cargo can be offloaded for a paying priority booking')
    if (group === 'DOMESTIC') risks.push('Multi-drop routing — delivery sequence is not guaranteed')
    risks.push('Wider arrival window; delivery planning less certain')
  }
  if (kind === 'FASTEST') {
    risks.push(
      group === 'AIR'
        ? 'Tight airline cutoff — cargo must reach the terminal before acceptance closes'
        : 'Tight cutoffs — cargo must be ready before the stated date',
    )
    risks.push('Limited flexibility if the cargo-ready date slips')
  }
  if (kind === 'BALANCED') {
    risks.push(
      group === 'DOMESTIC'
        ? 'Standard vehicle availability for this corridor'
        : 'Standard schedule reliability for this lane',
    )
  }

  if (draft.mode === 'OCEAN_LCL') risks.push('Consolidation waits for the box to fill — departure can move by a sailing')
  if (draft.mode === 'DOMESTIC_LTL') risks.push('Part load — transit depends on hub connections at both ends')

  if (draft.specialHandling === 'DANGEROUS_GOODS')
    risks.push(
      group === 'AIR'
        ? 'Dangerous goods acceptance subject to airline approval and packing certification'
        : 'Dangerous goods acceptance subject to carrier approval',
    )
  if (draft.specialHandling === 'REEFER' || draft.specialHandling === 'TEMPERATURE_CONTROLLED')
    risks.push(
      group === 'AIR'
        ? 'Temperature-controlled build-up depends on cool-chain capacity at the terminal'
        : 'Reefer plug availability at the terminal is not guaranteed',
    )
  if (draft.specialHandling === 'OVERSIZED')
    risks.push(group === 'AIR' ? 'Out-of-gauge pieces subject to aircraft door and floor-loading limits' : 'Out-of-gauge stowage subject to vessel approval')
  if (draft.clearanceCoordinationRequired)
    risks.push('Clearance is executed by an external partner — timing depends on their update')

  return risks
}

const PARTNER_STATUS: Record<OptionKind, string> = {
  BALANCED: 'Standard partner coordination — rates subject to partner confirmation',
  FASTEST: 'Priority allocation — requires partner confirmation before booking',
  COST_OPTIMISED: 'Subject to space availability and partner confirmation',
}

/* ══════════════════════════════════════════════════════════════════════════
   THE GENERATOR
   ══════════════════════════════════════════════════════════════════════════ */

export function generateIndicativeOptions(draft: IntakeDraft): IndicativeOption[] {
  if (!draft.originId || !draft.destinationId) return []

  const origin = requirePort(draft.originId)
  const destination = requirePort(draft.destinationId)
  const km = haversineKm(origin, destination)
  const units = cargoUnitsFor(draft)
  const band = transitBandFor(draft.originId, draft.destinationId, draft.mode, km)
  const group = modeGroup(draft.mode)

  // Seeded on the actual request, so identical inputs always price identically.
  const seedKey = `${draft.originId}-${draft.destinationId}-${draft.mode}-${units.chargeableQty}`
  const jitter = rng(seedKey)

  const mainCarriagePerUnit = BASE_RATE[draft.mode] * distanceFactor(km, draft.mode) * jitter.float(0.96, 1.05, 3)
  const specs = CATEGORIES[draft.mode].filter((spec) => !spec.requires || spec.requires(draft))

  return (['BALANCED', 'FASTEST', 'COST_OPTIMISED'] as OptionKind[]).map((kind) => {
    const profile = PROFILE[kind]
    const modeProfile = MODE_PROFILE[group][kind]
    const mainCarriage = mainCarriagePerUnit * units.chargeableQty * profile.priceFactor

    const chargeCategories: OptionChargeCategory[] = specs.map((spec) => ({
      family: spec.family,
      label: spec.label,
      // Exposure categories don't scale with the option's price positioning —
      // detention costs the same whichever service you booked.
      amountUsd: round(mainCarriage * spec.share * (spec.exposureOnly ? 1 / profile.priceFactor : 1)),
      basis: spec.basis,
      note: spec.note,
      exposureOnly: spec.exposureOnly,
    }))

    // The headline total excludes exposure — those are risks, not charges.
    const totalUsd = round(chargeCategories.filter((c) => !c.exposureOnly).reduce((s, c) => s + c.amountUsd, 0))

    const transitMin = Math.max(1, Math.round(band.min * profile.transitFactor[0]))
    const transitMax = Math.max(transitMin + 1, Math.round(band.max * profile.transitFactor[1]))

    const departureMs = DEMO_NOW_MS + modeProfile.departureOffsetDays * 864e5
    const { included, excluded } = servicesFor(draft, kind)

    return {
      id: `OPT-${kind}`,
      kind,
      label: profile.label,
      serviceLevel: modeProfile.serviceLevel,
      description: modeProfile.description,
      mode: draft.mode,
      transitMinDays: transitMin,
      transitMaxDays: transitMax,
      estimatedDeparture: new Date(departureMs).toISOString(),
      estimatedArrival: new Date(departureMs + transitMax * 864e5).toISOString(),
      totalUsd,
      currency: 'USD',
      validUntil: daysFromNow(VALIDITY_DAYS[group]),
      scheduleFlexibility: profile.flexibility,
      includedServices: included,
      excludedServices: excluded,
      riskIndicators: riskIndicatorsFor(draft, kind),
      partnerConfirmationStatus: PARTNER_STATUS[kind],
      chargeCategories,
    }
  })
}

const round = (n: number) => Math.round(n * 100) / 100

/** Transit band for the live route preview, before any option is generated. */
export function previewTransit(draft: IntakeDraft): { min: number; max: number; estimated: boolean } | null {
  if (!draft.originId || !draft.destinationId) return null
  const km = haversineKm(requirePort(draft.originId), requirePort(draft.destinationId))
  return transitBandFor(draft.originId, draft.destinationId, draft.mode, km)
}

export function laneDistanceKm(draft: IntakeDraft): number | null {
  if (!draft.originId || !draft.destinationId) return null
  return haversineKm(requirePort(draft.originId), requirePort(draft.destinationId))
}
