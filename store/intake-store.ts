'use client'

import { create } from 'zustand'
import { requirePort } from '@/data/ports'
import { daysFromNow } from '@/lib/demo-clock'
import { chargeableWeight, volumetricWeight } from '@/lib/format'
import { modeGroup, resolveRouteForMode, servesMode } from '@/lib/mode-locations'
import type { IntakeDraft, TransportMode } from '@/types'

/**
 * The quote-intake draft.
 *
 * Session-only, deliberately: a half-filled quote form restored three days
 * later is noise, not a feature. The moment it becomes an enquiry it moves
 * into the persisted job-file store, which is where it belongs.
 */

export type IntakeStep = 0 | 1 | 2 | 3

export const INTAKE_STEPS = [
  { key: 'route', label: 'Route', hint: 'Where the cargo moves' },
  { key: 'cargo', label: 'Cargo', hint: 'What is moving' },
  { key: 'scope', label: 'Commercial scope', hint: 'Terms and services' },
  { key: 'customer', label: 'Customer', hint: 'Who we send it to' },
] as const

/** The lane this account actually runs, and the mode it runs it in. */
const START_ROUTE = { originId: 'CNSHA', destinationId: 'INNSA' } as const

function emptyDraft(): IntakeDraft {
  return {
    ...START_ROUTE,
    direction: 'IMPORT',
    mode: 'OCEAN_FCL',
    // Drawn from the same table `setMode` uses, so the opening state and the
    // state you get by switching back to FCL are the same state.
    cargo: cargoDefaultsFor('OCEAN_FCL', START_ROUTE),
    incoterm: 'FOB',
    serviceScope: 'PORT_TO_DOOR',
    inlandDeliveryRequired: true,
    insuranceRequired: false,
    specialHandling: 'NONE',
    clearanceCoordinationRequired: false,
    // Prefilled with demo values, clearly labelled as simulated in the UI.
    companyName: 'Apex Industrial Systems Pvt. Ltd.',
    contactPerson: 'Priya Raghavan',
    email: 'priya.r@apexindustrial.example',
    phone: '+91 98200 41102',
    preferredContact: 'EMAIL',
  }
}

export interface IntakeState {
  draft: IntakeDraft
  step: IntakeStep
  /** Direction of travel, so the step transition slides the right way. */
  direction: 1 | -1
  submitted: boolean

  setField: <K extends keyof IntakeDraft>(key: K, value: IntakeDraft[K]) => void
  setCargo: (patch: Partial<IntakeDraft['cargo']>) => void
  setMode: (mode: TransportMode) => void
  swapRoute: () => void
  goToStep: (step: IntakeStep) => void
  next: () => void
  back: () => void
  submit: () => void
  reset: () => void
}

/**
 * Mode-appropriate cargo defaults.
 *
 * Built fresh from `base` on every mode change rather than patched onto what
 * was there, which is the whole point: a "2 × 40HC" air shipment is nonsense,
 * and a container line left behind by a previous mode would flow straight
 * through into the enquiry record and be priced. Each branch returns ONLY the
 * fields that mode is actually quoted on.
 *
 * The road branches take the resolved route, because "pickup city" on a
 * domestic job is not decoration — it is the address the vehicle goes to, and
 * hard-coding Nhava Sheva → Pune under a Delhi → Chennai route is the kind of
 * quiet contradiction that gets spotted from the back of the room.
 */
function cargoDefaultsFor(
  mode: TransportMode,
  route: { originId: string; destinationId: string },
): IntakeDraft['cargo'] {
  const base = {
    commodity: 'Industrial valves and pipe fittings',
    readyDate: daysFromNow(7),
    dangerousGoods: false,
    temperatureControlled: false,
    specialHandling: [] as never[],
  }

  switch (mode) {
    case 'OCEAN_FCL':
      return { ...base, containers: [{ isoType: '40HC', quantity: 2 }], grossWeightKg: 36520, volumeCbm: 124.2, packageCount: 810 }
    case 'OCEAN_LCL':
      return { ...base, packageCount: 96, volumeCbm: 18.4, grossWeightKg: 4200 }
    case 'AIR': {
      const dims = { length: 120, width: 80, height: 95 }
      const pieces = 46
      const actual = 1840
      const vol = volumetricWeight(dims.length, dims.width, dims.height, pieces)
      return {
        ...base,
        packageCount: pieces,
        dimensionsCm: dims,
        actualWeightKg: actual,
        volumetricWeightKg: vol,
        chargeableWeightKg: chargeableWeight(actual, vol),
        grossWeightKg: actual,
      }
    }
    case 'DOMESTIC_FTL':
      return {
        ...base,
        vehicleType: '32FT_SXL',
        grossWeightKg: 14000,
        waitingHours: 6,
        pickupCity: requirePort(route.originId).city,
        deliveryCity: requirePort(route.destinationId).city,
      }
    case 'DOMESTIC_LTL':
      return { ...base, packageCount: 64, volumeCbm: 11.2, grossWeightKg: 2800, deliveryDeadline: daysFromNow(9) }
  }
}

/** Lanes flip direction when you swap the endpoints. */
function directionFor(originId?: string, destinationId?: string): IntakeDraft['direction'] {
  const isIndia = (id?: string) => Boolean(id?.startsWith('IN'))
  if (isIndia(originId) && isIndia(destinationId)) return 'DOMESTIC'
  if (isIndia(destinationId)) return 'IMPORT'
  return 'EXPORT'
}

export const useIntakeStore = create<IntakeState>()((set, get) => ({
  draft: emptyDraft(),
  step: 0,
  direction: 1,
  submitted: false,

  setField: (key, value) =>
    set((s) => {
      const draft = { ...s.draft, [key]: value }
      // Route changes re-derive direction rather than letting it go stale.
      if (key === 'originId' || key === 'destinationId') {
        draft.direction = directionFor(draft.originId, draft.destinationId)
        // On a full truck the route IS the cargo's pickup and delivery
        // address, so the two cannot be edited independently.
        if (draft.mode === 'DOMESTIC_FTL') {
          draft.cargo = {
            ...draft.cargo,
            pickupCity: draft.originId ? requirePort(draft.originId).city : draft.cargo.pickupCity,
            deliveryCity: draft.destinationId ? requirePort(draft.destinationId).city : draft.cargo.deliveryCity,
          }
        }
      }
      return { draft }
    }),

  setCargo: (patch) =>
    set((s) => {
      const cargo = { ...s.draft.cargo, ...patch }

      // Air: chargeable weight is derived, never typed. Recomputed on EVERY
      // cargo edit, including edits that do not touch the dimensions — typing
      // a new actual weight changes which of the two is greater, and a
      // chargeable figure that only refreshed when a dimension moved would
      // sit on screen contradicting the weight directly above it.
      if (s.draft.mode === 'AIR') {
        const dims = cargo.dimensionsCm
        const pieces = cargo.packageCount ?? 1
        const vol = dims ? volumetricWeight(dims.length, dims.width, dims.height, pieces) : (cargo.volumetricWeightKg ?? 0)
        cargo.volumetricWeightKg = vol
        cargo.chargeableWeightKg = chargeableWeight(cargo.actualWeightKg ?? 0, vol)
        cargo.grossWeightKg = cargo.actualWeightKg ?? cargo.grossWeightKg
      }

      return { draft: { ...s.draft, cargo } }
    }),

  /**
   * A mode change is a change of product, not a filter.
   *
   * Three things have to move together or the draft goes quietly wrong:
   * the cargo (rebuilt from scratch for the new basis), the route (air is
   * airport-to-airport, ocean port-to-port, domestic city-to-city, and the
   * previous mode's endpoints are usually not servable by the new one), and
   * the commercial scope (a road quote already contains the inland leg, so
   * carrying "inland delivery required" across from an ocean draft would
   * price the same movement twice).
   */
  setMode: (mode) =>
    set((s) => {
      const route = resolveRouteForMode(s.draft.originId, s.draft.destinationId, mode)
      const isDomestic = modeGroup(mode) === 'DOMESTIC'

      return {
        draft: {
          ...s.draft,
          mode,
          originId: route.originId,
          destinationId: route.destinationId,
          direction: directionFor(route.originId, route.destinationId),
          cargo: cargoDefaultsFor(mode, route),
          serviceScope: isDomestic ? 'DOOR_TO_DOOR' : s.draft.serviceScope,
          inlandDeliveryRequired: isDomestic ? false : s.draft.inlandDeliveryRequired,
        },
      }
    }),

  swapRoute: () =>
    set((s) => {
      const originId = s.draft.destinationId
      const destinationId = s.draft.originId
      return {
        draft: { ...s.draft, originId, destinationId, direction: directionFor(originId, destinationId) },
      }
    }),

  goToStep: (step) => set((s) => ({ step, direction: step > s.step ? 1 : -1 })),

  next: () =>
    set((s) => (s.step < 3 ? { step: (s.step + 1) as IntakeStep, direction: 1 } : {})),

  back: () => set((s) => (s.step > 0 ? { step: (s.step - 1) as IntakeStep, direction: -1 } : {})),

  submit: () => set({ submitted: true }),

  reset: () => set({ draft: emptyDraft(), step: 0, direction: 1, submitted: false }),
}))

/* ══════════════════════════════════════════════════════════════════════════
   VALIDATION — per step, so the wizard can gate "Continue"
   ══════════════════════════════════════════════════════════════════════════ */

export interface StepValidation {
  valid: boolean
  errors: Record<string, string>
}

export function validateStep(step: IntakeStep, draft: IntakeDraft): StepValidation {
  const errors: Record<string, string> = {}

  if (step === 0) {
    if (!draft.originId) errors.originId = 'Select an origin'
    if (!draft.destinationId) errors.destinationId = 'Select a destination'
    if (draft.originId && draft.originId === draft.destinationId)
      errors.destinationId = 'Origin and destination must differ'

    // A mode can only be quoted from a place that serves it. This normally
    // cannot happen — `setMode` re-resolves both ends — but a deep link or a
    // restored draft can carry a seaport into an air request, and a quote
    // built on an unservable endpoint is worse than one that refuses.
    const geography: Record<string, string> = {
      OCEAN: 'Ocean freight moves port to port — choose a seaport or ICD',
      AIR: 'Air freight moves airport to airport — choose an airport',
      DOMESTIC: 'Domestic road runs between Indian cities — choose a city',
    }
    const message = geography[modeGroup(draft.mode)]!
    if (draft.originId && !servesMode(draft.originId, draft.mode)) errors.originId = message
    if (draft.destinationId && !servesMode(draft.destinationId, draft.mode)) errors.destinationId = message
  }

  if (step === 1) {
    const c = draft.cargo
    if (!c.commodity?.trim()) errors.commodity = 'Describe the commodity'
    if (!c.readyDate) errors.readyDate = 'Set a cargo-ready date'

    // Each mode is gated on exactly what it is priced on. Asking a full-
    // container shipper for cubic metres, or accepting an air booking with no
    // dimensions and then quoting a chargeable weight, is how a quote tool
    // ends up producing numbers nobody can stand behind.
    if (draft.mode === 'OCEAN_FCL') {
      const qty = (c.containers ?? []).reduce((s, x) => s + x.quantity, 0)
      if (qty < 1) errors.containers = 'Add at least one container'
      if (!c.grossWeightKg) errors.grossWeightKg = 'Enter the gross weight'
    }
    if (draft.mode === 'OCEAN_LCL') {
      if (!c.packageCount) errors.packageCount = 'Enter the package count'
      if (!c.volumeCbm) errors.volumeCbm = 'Enter the cargo volume — LCL prices on the greater of volume and weight'
      if (!c.grossWeightKg) errors.grossWeightKg = 'Enter the gross weight — LCL prices on the greater of volume and weight'
    }
    if (draft.mode === 'AIR') {
      if (!c.packageCount) errors.packageCount = 'Enter the piece count'
      if (!c.actualWeightKg) errors.actualWeightKg = 'Enter the actual weight'
      const d = c.dimensionsCm
      if (!d || !d.length || !d.width || !d.height)
        errors.dimensionsCm = 'Enter the dimensions — chargeable weight cannot be derived without them'
    }
    if (draft.mode === 'DOMESTIC_FTL') {
      if (!c.vehicleType) errors.vehicleType = 'Select a vehicle type'
      if (!c.grossWeightKg) errors.grossWeightKg = 'Enter the load weight'
    }
    if (draft.mode === 'DOMESTIC_LTL') {
      if (!c.packageCount) errors.packageCount = 'Enter the package count'
      if (!c.volumeCbm) errors.volumeCbm = 'Enter the cargo volume'
      if (!c.grossWeightKg) errors.grossWeightKg = 'Enter the gross weight'
      if (!c.deliveryDeadline) errors.deliveryDeadline = 'Set the delivery deadline'
    }
  }

  if (step === 3) {
    if (!draft.companyName.trim()) errors.companyName = 'Enter the company name'
    if (!draft.contactPerson.trim()) errors.contactPerson = 'Enter a contact person'
    if (!draft.email.trim()) errors.email = 'Enter an email address'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) errors.email = 'Enter a valid email address'
    if (!draft.phone.trim()) errors.phone = 'Enter a phone number'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

export function isDraftComplete(draft: IntakeDraft): boolean {
  return ([0, 1, 2, 3] as IntakeStep[]).every((s) => validateStep(s, draft).valid)
}
