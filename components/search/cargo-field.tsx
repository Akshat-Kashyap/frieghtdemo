'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Box, CalendarClock, ChevronDown, Container, Minus, Package, Plus, Timer, Truck } from 'lucide-react'
import { useState } from 'react'

import { weightKg } from '@/lib/format'
import { cargoUnitsFor } from '@/lib/indicative-options'
import { cn } from '@/lib/utils'
import { useIntakeStore } from '@/store/intake-store'
import type { ContainerIsoType, TransportMode, VehicleType } from '@/types'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlays'

/**
 * THE CARGO CELL
 * ══════════════════════════════════════════════════════════════════════════
 * What is actually moving. The trigger collapses to the shorthand a freight
 * desk would write on a booking — "2 × 40HC" — and opens into the fields that
 * shorthand stands for.
 *
 * Every mode asks for what THAT mode is priced on, and nothing else. A full
 * container is priced per box, so it asks for boxes; LCL is priced on the
 * revenue ton, so it asks for both volume and weight and then says which of
 * the two won; air is priced on chargeable weight, so it asks for dimensions
 * and shows the division that produced the number. A single generic cargo
 * form that collects everything and explains nothing is how a quote tool ends
 * up unable to price anything correctly — and how a customer ends up arguing
 * about an invoice six weeks later.
 *
 * The equipment and vehicle tiles are the one deliberately tactile control in
 * the search bar: a container is a physical object with a size you pick by
 * feel, and the tile press should have some of that. Everything else here is
 * a recess — a channel milled into the panel — because fields are holes, not
 * chips.
 */

const CONTAINER_TYPES: Array<{ iso: ContainerIsoType; name: string; detail: string }> = [
  { iso: '20FT', name: '20ft Standard', detail: '33 cbm · general cargo' },
  { iso: '40FT', name: '40ft Standard', detail: '67 cbm · general cargo' },
  { iso: '40HC', name: '40ft High-Cube', detail: '76 cbm · extra height' },
  { iso: 'REEFER', name: '40ft Reefer', detail: 'Temperature controlled' },
  { iso: 'OOG', name: 'Out-of-gauge', detail: 'Special handling' },
]

const VEHICLE_TYPES: Array<{ value: VehicleType; name: string; detail: string }> = [
  { value: '19FT_SXL', name: '19ft SXL', detail: 'Up to 7 t' },
  { value: '24FT_SXL', name: '24ft SXL', detail: 'Up to 9 t' },
  { value: '32FT_SXL', name: '32ft SXL', detail: 'Up to 16 t' },
  { value: '32FT_MXL', name: '32ft MXL', detail: 'Up to 21 t' },
  { value: 'TRAILER_40FT', name: '40ft Trailer', detail: 'Up to 25 t' },
  { value: 'CONTAINER_20FT', name: '20ft Container', detail: 'Up to 20 t' },
]

const MODE_ICON: Record<TransportMode, typeof Container> = {
  OCEAN_FCL: Container,
  OCEAN_LCL: Package,
  AIR: Box,
  DOMESTIC_FTL: Truck,
  DOMESTIC_LTL: Package,
}

export function CargoField({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const draft = useIntakeStore((s) => s.draft)

  const Icon = MODE_ICON[draft.mode]
  const units = cargoUnitsFor(draft)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'pw-field group flex h-[68px] w-full items-center gap-3 rounded-card px-3.5 text-left sm:px-4',
            open && 'border-signal/55',
            className,
          )}
          aria-label={`Cargo details — ${units.summary}, charged ${units.basisLabel}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-raised-2">
            <Icon className={cn('h-4 w-4', open ? 'text-signal' : 'text-text-muted')} aria-hidden />
          </span>

          <span className="min-w-0 flex-1">
            {/* The basis is stated at the first place anyone touches the
                product, not held back until the results. */}
            <span className="block truncate text-[11px] leading-none text-text-muted">
              Cargo · charged {units.basisLabel}
            </span>
            <span className="mt-1.5 block truncate text-[17px] font-medium leading-tight text-text">
              {units.summary}
            </span>
          </span>

          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-text-faint transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        aria-label="Cargo details"
        className="w-[min(440px,calc(100vw-2rem))] p-4"
      >
        <div className="flex flex-col gap-4">
          {draft.mode === 'OCEAN_FCL' && <ContainerPicker />}
          {draft.mode === 'OCEAN_LCL' && <LclFields />}
          {draft.mode === 'AIR' && <AirFields />}
          {draft.mode === 'DOMESTIC_FTL' && <VehiclePicker />}
          {draft.mode === 'DOMESTIC_LTL' && <LtlFields />}

          <ChargeableReadout />
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   THE CHARGEABLE READOUT — what is actually being priced, and why
   ══════════════════════════════════════════════════════════════════════════
   A rail, not a card: a reading in a recess reads as measured by the machine,
   a reading on a raised chip reads as typed in by hand. It is the last thing
   in every mode's panel because it is the sentence the customer will repeat
   back — "so I'm paying on volume, not weight".
   ══════════════════════════════════════════════════════════════════════════ */

function ChargeableReadout() {
  const draft = useIntakeStore((s) => s.draft)
  const units = cargoUnitsFor(draft)

  return (
    <div className="pw-rail flex flex-col gap-1.5 px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="pw-stencil">Chargeable</span>
        <span className="pw-readout text-[15px] font-medium">{units.qtyLabel}</span>
      </div>
      {units.driver ? (
        <>
          <p className="text-micro font-medium text-signal">{units.driver.headline}</p>
          <p className="text-[11px] leading-relaxed text-text-muted">{units.driver.detail}</p>
        </>
      ) : (
        <p className="text-[11px] leading-relaxed text-text-muted">
          The rate is applied {units.basisLabel}. Weight is declared for stowage and equipment planning, not for pricing.
        </p>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   OCEAN FCL — equipment tiles plus the quantity that goes with them
   ══════════════════════════════════════════════════════════════════════════ */

function ContainerPicker() {
  const draft = useIntakeStore((s) => s.draft)
  const setCargo = useIntakeStore((s) => s.setCargo)

  const line = draft.cargo.containers?.[0] ?? { isoType: '40HC' as ContainerIsoType, quantity: 1 }
  const setLine = (patch: Partial<typeof line>) => setCargo({ containers: [{ ...line, ...patch }] })

  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="pw-stencil mb-2">Equipment</legend>
        <div className="grid grid-cols-2 gap-2">
          {CONTAINER_TYPES.map((type) => {
            const selected = line.isoType === type.iso
            return (
              <button
                key={type.iso}
                type="button"
                onClick={() => setLine({ isoType: type.iso })}
                data-selected={selected}
                aria-pressed={selected}
                className="pw-tactile flex min-h-11 flex-col items-start gap-0.5 rounded-card px-3 py-2.5 text-left"
              >
                <span className={cn('text-data font-medium', selected ? 'text-signal' : 'text-text')}>
                  {type.name}
                </span>
                <span className="text-[10px] leading-tight text-text-faint">{type.detail}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="flex items-end gap-3">
        <Stepper label="Quantity" value={line.quantity} min={1} max={20} onChange={(quantity) => setLine({ quantity })} />
        <NumberField
          label="Gross weight (kg)"
          value={draft.cargo.grossWeightKg ?? 0}
          onChange={(v) => setCargo({ grossWeightKg: v })}
          step={500}
          className="flex-1"
        />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   OCEAN LCL — volume and weight both, because both compete for the price
   ══════════════════════════════════════════════════════════════════════════ */

function LclFields() {
  const draft = useIntakeStore((s) => s.draft)
  const setCargo = useIntakeStore((s) => s.setCargo)
  const cbm = draft.cargo.volumeCbm ?? 0
  const tonnes = (draft.cargo.grossWeightKg ?? 0) / 1000
  const byVolume = cbm >= tonnes

  return (
    <div className="flex flex-col gap-3">
      <NumberField
        label="Packages"
        value={draft.cargo.packageCount ?? 0}
        onChange={(v) => setCargo({ packageCount: v })}
        step={1}
      />
      {/* Side by side and marked, because the comparison between these two is
          the price. Splitting them across rows hides the one relationship the
          customer needs to see. */}
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Volume (CBM)"
          value={cbm}
          onChange={(v) => setCargo({ volumeCbm: v })}
          step={0.1}
          decimals={1}
          driving={byVolume}
        />
        <NumberField
          label="Gross weight (kg)"
          value={draft.cargo.grossWeightKg ?? 0}
          onChange={(v) => setCargo({ grossWeightKg: v })}
          step={100}
          driving={!byVolume}
        />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   AIR — the derivation, not just the answer
   ══════════════════════════════════════════════════════════════════════════ */

function AirFields() {
  const draft = useIntakeStore((s) => s.draft)
  const setCargo = useIntakeStore((s) => s.setCargo)
  const cargo = draft.cargo
  const dims = cargo.dimensionsCm
  const actual = cargo.actualWeightKg ?? 0
  const volumetric = cargo.volumetricWeightKg ?? 0

  const setDim = (dim: 'length' | 'width' | 'height', value: number) =>
    setCargo({
      dimensionsCm: {
        length: dims?.length ?? 0,
        width: dims?.width ?? 0,
        height: dims?.height ?? 0,
        [dim]: value,
      },
    })

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Pieces"
          value={cargo.packageCount ?? 0}
          onChange={(v) => setCargo({ packageCount: v })}
          step={1}
        />
        <NumberField
          label="Actual weight (kg)"
          value={actual}
          onChange={(v) => setCargo({ actualWeightKg: v })}
          step={10}
          driving={actual >= volumetric}
        />
      </div>

      <fieldset>
        <legend className="pw-stencil mb-1.5">Dimensions per piece (cm)</legend>
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="Length" value={dims?.length ?? 0} onChange={(v) => setDim('length', v)} step={1} />
          <NumberField label="Width" value={dims?.width ?? 0} onChange={(v) => setDim('width', v)} step={1} />
          <NumberField label="Height" value={dims?.height ?? 0} onChange={(v) => setDim('height', v)} step={1} />
        </div>
      </fieldset>

      {/* The working, shown. An air quote that states a chargeable weight
          without the division that produced it is a number the customer has
          to take on trust — and the first one they will dispute. */}
      <div className="pw-groove flex items-baseline justify-between gap-3 pt-2.5">
        <span className="text-[11px] leading-relaxed text-text-muted">
          {dims ? `${dims.length} × ${dims.width} × ${dims.height} ÷ 6000 × ${cargo.packageCount ?? 0}` : 'Enter dimensions'}
        </span>
        <span
          className={cn('pw-readout shrink-0 text-data font-medium', volumetric > actual ? 'text-signal' : 'text-text-muted')}
        >
          {weightKg(volumetric)} volumetric
        </span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   DOMESTIC
   ══════════════════════════════════════════════════════════════════════════ */

function VehiclePicker() {
  const draft = useIntakeStore((s) => s.draft)
  const setCargo = useIntakeStore((s) => s.setCargo)

  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="pw-stencil mb-2">Vehicle</legend>
        <div className="grid grid-cols-2 gap-2">
          {VEHICLE_TYPES.map((v) => {
            const selected = draft.cargo.vehicleType === v.value
            return (
              <button
                key={v.value}
                type="button"
                onClick={() => setCargo({ vehicleType: v.value })}
                data-selected={selected}
                aria-pressed={selected}
                className="pw-tactile flex min-h-11 flex-col items-start gap-0.5 rounded-card px-3 py-2.5 text-left"
              >
                <span className={cn('text-data font-medium', selected ? 'text-signal' : 'text-text')}>{v.name}</span>
                <span className="text-[10px] leading-tight text-text-faint">{v.detail}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Load weight (kg)"
          value={draft.cargo.grossWeightKg ?? 0}
          onChange={(v) => setCargo({ grossWeightKg: v })}
          step={500}
        />
        {/* Free waiting hours are the single most disputed line on a road
            bill, so the window is agreed here rather than discovered later. */}
        <NumberField
          label="Free waiting (hours)"
          icon={<Timer className="h-3 w-3" aria-hidden />}
          value={draft.cargo.waitingHours ?? 0}
          onChange={(v) => setCargo({ waitingHours: v })}
          step={1}
        />
      </div>
    </div>
  )
}

function LtlFields() {
  const draft = useIntakeStore((s) => s.draft)
  const setCargo = useIntakeStore((s) => s.setCargo)
  const cbm = draft.cargo.volumeCbm ?? 0
  const weight = draft.cargo.grossWeightKg ?? 0
  const byVolume = cbm * 180 > weight

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Packages"
          value={draft.cargo.packageCount ?? 0}
          onChange={(v) => setCargo({ packageCount: v })}
          step={1}
        />
        <NumberField
          label="Volume (CBM)"
          value={cbm}
          onChange={(v) => setCargo({ volumeCbm: v })}
          step={0.1}
          decimals={1}
          driving={byVolume}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Gross weight (kg)"
          value={weight}
          onChange={(v) => setCargo({ grossWeightKg: v })}
          step={50}
          driving={!byVolume}
        />
        <DateField
          label="Delivery deadline"
          value={draft.cargo.deliveryDeadline}
          onChange={(iso) => setCargo({ deliveryDeadline: iso })}
        />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   FIELDS
   ══════════════════════════════════════════════════════════════════════════ */

function Stepper({
  label,
  value,
  min = 0,
  max = 99,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}) {
  const reduce = useReducedMotion()
  const clamp = (n: number) => Math.min(max, Math.max(min, n))

  return (
    <div className="flex flex-col gap-1.5">
      <span className="pw-stencil">{label}</span>
      <div className="flex items-center gap-1">
        <StepperButton onClick={() => onChange(clamp(value - 1))} disabled={value <= min} label={`Decrease ${label}`}>
          <Minus className="h-3.5 w-3.5" />
        </StepperButton>

        {/* A recess between two raised steppers: the readout is read, not pressed. */}
        <div className="pw-field relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-chip">
          <motion.span
            key={value}
            initial={reduce ? false : { y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="pw-readout text-data font-medium"
            aria-live="polite"
          >
            {value}
          </motion.span>
        </div>

        <StepperButton onClick={() => onChange(clamp(value + 1))} disabled={value >= max} label={`Increase ${label}`}>
          <Plus className="h-3.5 w-3.5" />
        </StepperButton>
      </div>
    </div>
  )
}

function StepperButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="pw-tactile flex h-11 w-11 items-center justify-center rounded-chip text-text-muted disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  decimals = 0,
  className,
  icon,
  /** Marks the measurement currently setting the price. */
  driving = false,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  step?: number
  decimals?: number
  className?: string
  icon?: React.ReactNode
  driving?: boolean
}) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <span className="pw-stencil flex items-center gap-1">
        {icon}
        {label}
        {driving && (
          <span className="ml-auto rounded-chip bg-signal/10 px-1 py-px text-[9px] font-semibold tracking-[0.08em] text-signal">
            DRIVING
          </span>
        )}
      </span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const next = Number.parseFloat(e.target.value)
          onChange(Number.isFinite(next) ? Number(next.toFixed(decimals)) : 0)
        }}
        className={cn(
          'pw-field pw-readout h-11 w-full rounded-chip px-2.5 text-data focus:outline-none',
          driving && 'border-signal/45',
        )}
      />
    </label>
  )
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string
  value?: string
  onChange: (iso: string) => void
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="pw-stencil flex items-center gap-1">
        <CalendarClock className="h-3 w-3" aria-hidden />
        {label}
      </span>
      <input
        type="date"
        // The draft stores a full ISO instant; the control speaks YYYY-MM-DD
        // only, and silently shows nothing if handed one with a time on it.
        value={(value ?? '').slice(0, 10)}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
        className="pw-field pw-readout h-11 w-full rounded-chip px-2.5 text-data focus:outline-none"
      />
    </label>
  )
}
