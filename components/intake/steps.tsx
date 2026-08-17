'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeftRight, Info } from 'lucide-react'

import { DEMO } from '@/data/copy'
import { CLEARANCE } from '@/data/copy'
import {
  DIRECTION_LABEL,
  SERVICE_SCOPE_LABEL,
  SPECIAL_HANDLING_LABEL,
  VEHICLE_TYPE_LABEL,
} from '@/lib/lifecycle'
import { collapse, fadeUp, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useIntakeStore, validateStep, type IntakeStep } from '@/store/intake-store'
import type {
  ContainerIsoType,
  Direction,
  Incoterm,
  PreferredContactMethod,
  ServiceScope,
  SpecialHandling,
  TransportMode,
  VehicleType,
} from '@/types'

import { PortCombobox } from './port-combobox'
import {
  Button,
  DemoNotice,
  Field,
  Input,
  NumberInput,
  SegmentedControl,
} from '@/components/ui/primitives'

/**
 * THE INTAKE STEPS
 * ══════════════════════════════════════════════════════════════════════════
 * The tail of the search flow, cut from the same stock as the search panel it
 * sits inside: fields are recesses milled into the plate, anything you press
 * is a machined face (`.pw-tactile`, which carries its own press and its own
 * selected state), every derived figure is a reading in a channel, and every
 * label is stencilled on rather than set as a heading.
 *
 * Nothing here hand-rolls a shadow, a selected-state ring or a chip border —
 * a wizard whose controls are drawn slightly differently from the controls on
 * the screen behind it is the fastest way to make a product look assembled.
 */

/* ══════════════════════════════════════════════════════════════════════════
   STEP 1 — ROUTE
   ══════════════════════════════════════════════════════════════════════════ */

const MODE_OPTIONS: Array<{ value: TransportMode; label: string }> = [
  { value: 'OCEAN_FCL', label: 'Ocean FCL' },
  { value: 'OCEAN_LCL', label: 'Ocean LCL' },
  { value: 'AIR', label: 'Air' },
  { value: 'DOMESTIC_FTL', label: 'Domestic FTL' },
  { value: 'DOMESTIC_LTL', label: 'Domestic LTL' },
]

const DIRECTION_OPTIONS: Array<{ value: Direction; label: string }> = [
  { value: 'IMPORT', label: DIRECTION_LABEL.IMPORT! },
  { value: 'EXPORT', label: DIRECTION_LABEL.EXPORT! },
  { value: 'DOMESTIC', label: DIRECTION_LABEL.DOMESTIC! },
]

/** The lanes this desk runs most — the fastest path to a filled route. */
const QUICK_LANES: Array<{
  id: string
  label: string
  originId: string
  destinationId: string
  mode: TransportMode
  modeShort: string
}> = [
  { id: 'q1', label: 'Shanghai → Nhava Sheva', originId: 'CNSHA', destinationId: 'INNSA', mode: 'OCEAN_FCL', modeShort: 'FCL' },
  { id: 'q2', label: 'Ningbo → Nhava Sheva', originId: 'CNNGB', destinationId: 'INNSA', mode: 'OCEAN_FCL', modeShort: 'FCL' },
  { id: 'q3', label: 'Dubai → Mundra', originId: 'AEJEA', destinationId: 'INMUN', mode: 'OCEAN_FCL', modeShort: 'FCL' },
  { id: 'q4', label: 'Nhava Sheva → Rotterdam', originId: 'INNSA', destinationId: 'NLRTM', mode: 'OCEAN_FCL', modeShort: 'FCL' },
  { id: 'q5', label: 'Nhava Sheva → Pune', originId: 'INNSA', destinationId: 'INPNQ', mode: 'DOMESTIC_FTL', modeShort: 'FTL' },
  { id: 'q6', label: 'Mumbai → Rotterdam', originId: 'INBOM', destinationId: 'NLRTM', mode: 'AIR', modeShort: 'AIR' },
]

export function RouteStep({ errors }: { errors: Record<string, string> }) {
  const { draft, setField, setMode, swapRoute } = useIntakeStore()

  return (
    <motion.div variants={stagger()} initial="hidden" animate="show" className="flex flex-col gap-5">
      <motion.div variants={fadeUp} className="relative grid gap-3 sm:grid-cols-2">
        {/* `mode` and `endpoint` replaced the old `recentIds` list: which
            locations are offerable is a function of how the cargo travels —
            air resolves airports, ocean resolves seaports, domestic resolves
            inland points — so the combobox derives its own candidates rather
            than being handed a hardcoded pair that was wrong for three of the
            five modes. */}
        <PortCombobox
          id="intake-origin"
          label="From"
          value={draft.originId}
          onChange={(id) => setField('originId', id)}
          error={errors.originId}
          mode={draft.mode}
          endpoint="ORIGIN"
        />
        <PortCombobox
          id="intake-destination"
          label="To"
          value={draft.destinationId}
          onChange={(id) => setField('destinationId', id)}
          error={errors.destinationId}
          mode={draft.mode}
          endpoint="DESTINATION"
        />

        {/* Swap sits between the fields on desktop, below on mobile. It is a
            thing you press, so it is a machined face rather than a bordered
            circle — `.pw-tactile` carries the milled edge, the lift and the
            press, and it is the same control material as every button. */}
        <button
          type="button"
          onClick={swapRoute}
          aria-label="Swap origin and destination"
          className="pw-tactile absolute left-1/2 top-[38px] hidden h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full text-text-muted hover:text-signal sm:flex"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Field label="Direction">
          <SegmentedControl
            ariaLabel="Direction"
            options={DIRECTION_OPTIONS}
            value={draft.direction}
            onChange={(v) => setField('direction', v)}
          />
        </Field>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Field label="Mode" hint="Changes the cargo fields">
          <SegmentedControl
            ariaLabel="Mode"
            options={MODE_OPTIONS}
            value={draft.mode}
            onChange={setMode}
          />
        </Field>
      </motion.div>

      {/* Quick-select for the lanes this desk actually runs. Faster than typing
          both endpoints, and it fills what would otherwise be dead space on
          the shortest step of the wizard. */}
      <motion.div variants={fadeUp}>
        <Field label="Popular lanes" hint="One click to fill the route">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_LANES.map((lane) => {
              const active = draft.originId === lane.originId && draft.destinationId === lane.destinationId
              return (
                <button
                  key={lane.id}
                  type="button"
                  data-selected={active}
                  aria-pressed={active}
                  onClick={() => {
                    setField('originId', lane.originId)
                    setField('destinationId', lane.destinationId)
                    if (lane.mode !== draft.mode) setMode(lane.mode)
                  }}
                  className={cn(
                    'pw-tactile inline-flex min-h-[32px] items-center gap-1.5 rounded-chip px-2.5 text-micro',
                    active ? 'text-text' : 'text-text-muted hover:text-text',
                  )}
                >
                  <span className="whitespace-nowrap">{lane.label}</span>
                  <span className="pw-readout text-[9.5px] text-text-faint">{lane.modeShort}</span>
                </button>
              )
            })}
          </div>
        </Field>
      </motion.div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 2 — CARGO (mode-conditional)
   Each mode asks for what that mode is actually priced on. A single generic
   cargo form is how a quote tool ends up unable to price anything correctly.
   ══════════════════════════════════════════════════════════════════════════ */

const ISO_TYPES: ContainerIsoType[] = ['20FT', '40FT', '40HC', 'REEFER', 'OOG']

export function CargoStep({ errors }: { errors: Record<string, string> }) {
  const { draft, setCargo } = useIntakeStore()
  const cargo = draft.cargo

  return (
    <motion.div variants={stagger()} initial="hidden" animate="show" className="flex flex-col gap-5">
      {/* ── Common to every mode ────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="grid gap-3 sm:grid-cols-2">
        <Field label="Commodity" required error={errors.commodity} htmlFor="intake-commodity">
          <Input
            id="intake-commodity"
            value={cargo.commodity ?? ''}
            onChange={(e) => setCargo({ commodity: e.target.value })}
            placeholder="What is being shipped"
          />
        </Field>
        <Field label="Cargo-ready date" required error={errors.readyDate} htmlFor="intake-ready">
          <Input
            id="intake-ready"
            type="date"
            value={(cargo.readyDate ?? '').slice(0, 10)}
            onChange={(e) => setCargo({ readyDate: new Date(e.target.value).toISOString() })}
            className="tnum font-mono"
          />
        </Field>
      </motion.div>

      {/* ── Ocean FCL ───────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {draft.mode === 'OCEAN_FCL' && (
          <motion.div key="fcl" variants={collapse} initial="hidden" animate="show" exit="exit" className="overflow-hidden">
            <div className="flex flex-col gap-4">
              <Field label="Containers" required error={errors.containers}>
                <div className="flex flex-col gap-2">
                  {(cargo.containers ?? []).map((container, i) => (
                    // Wraps rather than shrinks: five equipment types and a
                    // stepper do not fit a 360px viewport on one line, and a
                    // row that refuses to wrap pushes the whole page sideways.
                    <div key={i} className="flex min-w-0 flex-wrap items-center gap-2">
                      <SegmentedControl
                        size="sm"
                        ariaLabel={`Container ${i + 1} type`}
                        options={ISO_TYPES.map((t) => ({ value: t, label: t }))}
                        value={container.isoType}
                        onChange={(isoType) => {
                          const next = [...(cargo.containers ?? [])]
                          next[i] = { ...container, isoType }
                          setCargo({ containers: next })
                        }}
                      />
                      <div className="flex items-center gap-1.5">
                        <QtyStepper
                          value={container.quantity}
                          onChange={(quantity) => {
                            const next = [...(cargo.containers ?? [])]
                            next[i] = { ...container, quantity }
                            setCargo({ containers: next })
                          }}
                        />
                        {(cargo.containers?.length ?? 0) > 1 && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setCargo({ containers: (cargo.containers ?? []).filter((_, j) => j !== i) })}
                            aria-label={`Remove container line ${i + 1}`}
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    onClick={() => setCargo({ containers: [...(cargo.containers ?? []), { isoType: '40HC', quantity: 1 }] })}
                  >
                    + Add equipment type
                  </Button>
                </div>
              </Field>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Gross weight" hint="kg" required error={errors.grossWeightKg} htmlFor="intake-weight">
                  <NumberInput
                    id="intake-weight"
                    value={cargo.grossWeightKg ?? ''}
                    onChange={(e) => setCargo({ grossWeightKg: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Cargo volume" hint="CBM" htmlFor="intake-volume">
                  <NumberInput
                    id="intake-volume"
                    value={cargo.volumeCbm ?? ''}
                    onChange={(e) => setCargo({ volumeCbm: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Packages" htmlFor="intake-packages">
                  <NumberInput
                    id="intake-packages"
                    value={cargo.packageCount ?? ''}
                    onChange={(e) => setCargo({ packageCount: Number(e.target.value) })}
                  />
                </Field>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Ocean LCL ─────────────────────────────────────────────── */}
        {draft.mode === 'OCEAN_LCL' && (
          <motion.div key="lcl" variants={collapse} initial="hidden" animate="show" exit="exit" className="overflow-hidden">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Package count" required error={errors.packageCount} htmlFor="lcl-packages">
                <NumberInput
                  id="lcl-packages"
                  value={cargo.packageCount ?? ''}
                  onChange={(e) => setCargo({ packageCount: Number(e.target.value) })}
                />
              </Field>
              <Field label="Weight" hint="kg" required error={errors.grossWeightKg} htmlFor="lcl-weight">
                <NumberInput
                  id="lcl-weight"
                  value={cargo.grossWeightKg ?? ''}
                  onChange={(e) => setCargo({ grossWeightKg: Number(e.target.value) })}
                />
              </Field>
              <Field label="Volume" hint="CBM" required error={errors.volumeCbm} htmlFor="lcl-cbm">
                <NumberInput
                  id="lcl-cbm"
                  value={cargo.volumeCbm ?? ''}
                  onChange={(e) => setCargo({ volumeCbm: Number(e.target.value) })}
                />
              </Field>
            </div>
          </motion.div>
        )}

        {/* ── Air ───────────────────────────────────────────────────── */}
        {draft.mode === 'AIR' && (
          <motion.div key="air" variants={collapse} initial="hidden" animate="show" exit="exit" className="overflow-hidden">
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Pieces" required error={errors.packageCount} htmlFor="air-pieces">
                  <NumberInput
                    id="air-pieces"
                    value={cargo.packageCount ?? ''}
                    onChange={(e) => setCargo({ packageCount: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Actual weight" hint="kg" required error={errors.actualWeightKg} htmlFor="air-actual">
                  <NumberInput
                    id="air-actual"
                    value={cargo.actualWeightKg ?? ''}
                    onChange={(e) => setCargo({ actualWeightKg: Number(e.target.value) })}
                  />
                </Field>
              </div>

              <Field label="Dimensions per piece" hint="cm — L × W × H">
                <div className="grid grid-cols-3 gap-2">
                  {(['length', 'width', 'height'] as const).map((dim) => (
                    <NumberInput
                      key={dim}
                      aria-label={dim}
                      placeholder={dim}
                      value={cargo.dimensionsCm?.[dim] ?? ''}
                      onChange={(e) =>
                        setCargo({
                          dimensionsCm: {
                            length: cargo.dimensionsCm?.length ?? 0,
                            width: cargo.dimensionsCm?.width ?? 0,
                            height: cargo.dimensionsCm?.height ?? 0,
                            [dim]: Number(e.target.value),
                          },
                        })
                      }
                    />
                  ))}
                </div>
              </Field>

              {/* Derived, never typed — so the summary can't disagree with the
                  dimensions on screen. Both sit in a milled channel, because
                  a figure the machine worked out belongs in a recess and the
                  fields it was worked out from do not. */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <DerivedTile
                  label="Volumetric weight"
                  value={`${(cargo.volumetricWeightKg ?? 0).toLocaleString('en-IN')} kg`}
                  note="L × W × H ÷ 6000"
                />
                <DerivedTile
                  label="Chargeable weight"
                  value={`${(cargo.chargeableWeightKg ?? 0).toLocaleString('en-IN')} kg`}
                  note="Greater of actual and volumetric"
                  emphasis
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Domestic FTL ──────────────────────────────────────────── */}
        {draft.mode === 'DOMESTIC_FTL' && (
          <motion.div key="ftl" variants={collapse} initial="hidden" animate="show" exit="exit" className="overflow-hidden">
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Pickup city" htmlFor="ftl-pickup">
                  <Input id="ftl-pickup" value={cargo.pickupCity ?? ''} onChange={(e) => setCargo({ pickupCity: e.target.value })} />
                </Field>
                <Field label="Delivery city" htmlFor="ftl-delivery">
                  <Input id="ftl-delivery" value={cargo.deliveryCity ?? ''} onChange={(e) => setCargo({ deliveryCity: e.target.value })} />
                </Field>
              </div>

              <Field label="Vehicle type" required error={errors.vehicleType}>
                <SegmentedControl
                  size="sm"
                  ariaLabel="Vehicle type"
                  options={(Object.keys(VEHICLE_TYPE_LABEL) as VehicleType[]).map((v) => ({
                    value: v,
                    label: VEHICLE_TYPE_LABEL[v]!,
                  }))}
                  value={cargo.vehicleType ?? '32FT_SXL'}
                  onChange={(vehicleType) => setCargo({ vehicleType })}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Load weight" hint="kg" required error={errors.grossWeightKg} htmlFor="ftl-weight">
                  <NumberInput
                    id="ftl-weight"
                    value={cargo.grossWeightKg ?? ''}
                    onChange={(e) => setCargo({ grossWeightKg: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Free waiting window" hint="hours" htmlFor="ftl-waiting">
                  <NumberInput
                    id="ftl-waiting"
                    value={cargo.waitingHours ?? ''}
                    onChange={(e) => setCargo({ waitingHours: Number(e.target.value) })}
                  />
                </Field>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Domestic LTL ──────────────────────────────────────────── */}
        {draft.mode === 'DOMESTIC_LTL' && (
          <motion.div key="ltl" variants={collapse} initial="hidden" animate="show" exit="exit" className="overflow-hidden">
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Package count" required error={errors.packageCount} htmlFor="ltl-packages">
                  <NumberInput
                    id="ltl-packages"
                    value={cargo.packageCount ?? ''}
                    onChange={(e) => setCargo({ packageCount: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Weight" hint="kg" required error={errors.grossWeightKg} htmlFor="ltl-weight">
                  <NumberInput
                    id="ltl-weight"
                    value={cargo.grossWeightKg ?? ''}
                    onChange={(e) => setCargo({ grossWeightKg: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Volume" hint="CBM" required error={errors.volumeCbm} htmlFor="ltl-cbm">
                  <NumberInput
                    id="ltl-cbm"
                    value={cargo.volumeCbm ?? ''}
                    onChange={(e) => setCargo({ volumeCbm: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <Field label="Delivery deadline" htmlFor="ltl-deadline">
                <Input
                  id="ltl-deadline"
                  type="date"
                  className="tnum font-mono"
                  value={(cargo.deliveryDeadline ?? '').slice(0, 10)}
                  onChange={(e) => setCargo({ deliveryDeadline: new Date(e.target.value).toISOString() })}
                />
              </Field>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cargo characteristics ───────────────────────────────────── */}
      <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
        <Toggle
          label="Dangerous goods"
          checked={cargo.dangerousGoods ?? false}
          onChange={(dangerousGoods) => setCargo({ dangerousGoods })}
        />
        <Toggle
          label="Temperature controlled"
          checked={cargo.temperatureControlled ?? false}
          onChange={(temperatureControlled) => setCargo({ temperatureControlled })}
        />
      </motion.div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 3 — COMMERCIAL SCOPE
   ══════════════════════════════════════════════════════════════════════════ */

const INCOTERMS: Incoterm[] = ['EXW', 'FOB', 'CIF', 'DAP', 'DDP', 'OTHER']
const SCOPES: ServiceScope[] = ['PORT_TO_PORT', 'DOOR_TO_PORT', 'PORT_TO_DOOR', 'DOOR_TO_DOOR']
const HANDLING: SpecialHandling[] = ['NONE', 'REEFER', 'DANGEROUS_GOODS', 'OVERSIZED', 'FRAGILE', 'TEMPERATURE_CONTROLLED']

export function ScopeStep() {
  const { draft, setField } = useIntakeStore()

  return (
    <motion.div variants={stagger()} initial="hidden" animate="show" className="flex flex-col gap-5">
      <motion.div variants={fadeUp}>
        <Field label="Incoterm">
          <SegmentedControl
            size="sm"
            ariaLabel="Incoterm"
            options={INCOTERMS.map((i) => ({ value: i, label: i }))}
            value={draft.incoterm}
            onChange={(v) => setField('incoterm', v)}
          />
        </Field>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Field label="Service scope">
          <SegmentedControl
            size="sm"
            ariaLabel="Service scope"
            options={SCOPES.map((s) => ({ value: s, label: SERVICE_SCOPE_LABEL[s]! }))}
            value={draft.serviceScope}
            onChange={(v) => setField('serviceScope', v)}
          />
        </Field>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Field label="Special handling">
          <SegmentedControl
            size="sm"
            ariaLabel="Special handling"
            options={HANDLING.map((h) => ({ value: h, label: SPECIAL_HANDLING_LABEL[h]! }))}
            value={draft.specialHandling}
            onChange={(v) => setField('specialHandling', v)}
          />
        </Field>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
        <Toggle
          label="Inland delivery required"
          checked={draft.inlandDeliveryRequired}
          onChange={(v) => setField('inlandDeliveryRequired', v)}
        />
        <Toggle label="Insurance required" checked={draft.insuranceRequired} onChange={(v) => setField('insuranceRequired', v)} />
        <Toggle
          label="Customs coordination required"
          checked={draft.clearanceCoordinationRequired}
          onChange={(v) => setField('clearanceCoordinationRequired', v)}
        />
      </motion.div>

      {/*
        The ONLY customs surface in this product.
        Selecting it states a coordination requirement and stops. No checklist
        opens, no fields are captured, nothing is calculated.
        See lib/boundaries.ts.
      */}
      <AnimatePresence>
        {draft.clearanceCoordinationRequired && (
          <motion.div variants={collapse} initial="hidden" animate="show" exit="exit" className="overflow-hidden">
            <div className="pw-card flex items-start gap-2.5 border-violet/25 bg-violet/8 px-3.5 py-3">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet" aria-hidden />
              <div className="min-w-0">
                <p className="pw-plate-title text-data">External customs partner required</p>
                <p className="mt-1 text-micro leading-relaxed text-text-muted">{CLEARANCE.explainer}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 4 — CUSTOMER
   ══════════════════════════════════════════════════════════════════════════ */

const CONTACT_METHODS: PreferredContactMethod[] = ['EMAIL', 'PHONE', 'WHATSAPP']

export function CustomerStep({ errors }: { errors: Record<string, string> }) {
  const { draft, setField } = useIntakeStore()

  return (
    <motion.div variants={stagger()} initial="hidden" animate="show" className="flex flex-col gap-5">
      <motion.div variants={fadeUp}>
        <DemoNotice variant="block" className="flex items-start gap-2.5">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" aria-hidden />
          <span>
            These fields are pre-filled with simulated demo values. Nothing entered here leaves this browser — the
            enquiry is created in local demo state only.
          </span>
        </DemoNotice>
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-3 sm:grid-cols-2">
        <Field label="Company name" required error={errors.companyName} htmlFor="cust-company">
          <Input id="cust-company" value={draft.companyName} onChange={(e) => setField('companyName', e.target.value)} />
        </Field>
        <Field label="Contact person" required error={errors.contactPerson} htmlFor="cust-person">
          <Input id="cust-person" value={draft.contactPerson} onChange={(e) => setField('contactPerson', e.target.value)} />
        </Field>
        <Field label="Email" required error={errors.email} htmlFor="cust-email">
          <Input id="cust-email" type="email" value={draft.email} onChange={(e) => setField('email', e.target.value)} />
        </Field>
        <Field label="Phone" required error={errors.phone} htmlFor="cust-phone">
          <Input id="cust-phone" type="tel" value={draft.phone} onChange={(e) => setField('phone', e.target.value)} />
        </Field>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Field label="Preferred contact method">
          <SegmentedControl
            size="sm"
            ariaLabel="Preferred contact"
            options={CONTACT_METHODS.map((m) => ({ value: m, label: m.charAt(0) + m.slice(1).toLowerCase() }))}
            value={draft.preferredContact}
            onChange={(v) => setField('preferredContact', v)}
          />
        </Field>
      </motion.div>

      <motion.div variants={fadeUp}>
        <DemoNotice>{DEMO.intakeLabel}</DemoNotice>
      </motion.div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   SHARED SMALL PARTS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * A quantity, in a recess with a machined face either side of it.
 *
 * The channel is the field; the two faces are things you press. Both halves
 * matter — a stepper drawn as one flat box is a number you cannot tell is
 * editable until you hover it.
 */
function QtyStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="pw-field flex items-center gap-0 rounded-chip">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="h-8 w-8 rounded-l-chip text-text-muted transition-colors hover:bg-raised-2 hover:text-text active:translate-y-px"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="pw-readout w-9 text-center text-data" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(99, value + 1))}
        className="h-8 w-8 rounded-r-chip text-text-muted transition-colors hover:bg-raised-2 hover:text-text active:translate-y-px"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}

/**
 * A switch that looks like what it is: a control you press, so it is a
 * machined face and `.pw-tactile` gives it the milled edge, the press that
 * genuinely travels, and the seated selected state — the same three things
 * every other pressable surface in the product has.
 */
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-selected={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'pw-tactile inline-flex min-h-[36px] items-center gap-2 rounded-chip px-2.5 text-data',
        checked ? 'text-text' : 'text-text-muted hover:text-text',
      )}
    >
      <span
        className={cn(
          'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-colors',
          checked
            ? 'border-signal bg-signal text-on-accent shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.28)]'
            : 'pw-recess border-hairline-strong bg-raised-2',
        )}
        aria-hidden
      >
        {checked && (
          <svg viewBox="0 0 10 10" className="h-2 w-2" fill="none">
            <path
              d="M1.5 5.2 3.8 7.5 8.5 2.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      {label}
    </button>
  )
}

/** A figure the machine worked out, sunk into the plate it was worked out on. */
function DerivedTile({
  label,
  value,
  note,
  emphasis = false,
}: {
  label: string
  value: string
  note: string
  emphasis?: boolean
}) {
  return (
    <div className={cn('pw-rail min-w-0 rounded-card px-3.5 py-3', emphasis && 'border-signal/30')}>
      <p className="pw-stencil truncate">{label}</p>
      <p className={cn('pw-readout mt-1.5 text-[15px] font-medium', emphasis ? 'text-signal' : 'text-text')}>
        {value}
      </p>
      <p className="mt-1 font-mono text-[10px] text-text-faint">{note}</p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP ROUTER
   ══════════════════════════════════════════════════════════════════════════ */

export function IntakeStepContent({ step }: { step: IntakeStep }) {
  const draft = useIntakeStore((s) => s.draft)
  const { errors } = validateStep(step, draft)

  if (step === 0) return <RouteStep errors={errors} />
  if (step === 1) return <CargoStep errors={errors} />
  if (step === 2) return <ScopeStep />
  return <CustomerStep errors={errors} />
}
