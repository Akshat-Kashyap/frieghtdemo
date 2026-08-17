'use client'

import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'
import { forwardRef, useEffect, useId, useState } from 'react'

import { useSafeReducedMotion } from '@/hooks/use-safe-reduced-motion'
import { fastTween, numberSpring, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * SHARED PRIMITIVES
 * ══════════════════════════════════════════════════════════════════════════
 * Written once, used by every module. This is what keeps ~20 screens looking
 * and behaving like one product rather than twenty — a status badge means the
 * same thing on the dashboard, in the vault and on a shipment.
 *
 * Everything here is cut for "draft marks": the ground is a mineral grey-green
 * surface, panels are near-white plates sitting *on* it with a milled edge,
 * live readings sit in recessed rails, and colour is state and nothing else.
 *
 * The material rules live in `app/globals.css` and nothing in this file is
 * allowed to reinvent them. In particular: no component picks its own shadow.
 * Depth is the `--elev-0…4` scale, the light is always top-centre, and every
 * tint is made of the ground (rgb 16 29 26). Twenty cards each choosing a
 * plausible blur radius is precisely the look the client called "generated" —
 * not because any one of them was wrong, but because no two agreed.
 */

/* ══════════════════════════════════════════════════════════════════════════
   MACHINED EDGES — for surfaces the CSS classes cannot reach
   ══════════════════════════════════════════════════════════════════════════
   `.pw-tactile` covers every neutral control. These three exist for the ONE
   case it cannot: a control with a filled accent face, where the highlight has
   to be white-on-green rather than white-on-near-white and the cast has to be
   tinted with the accent (a green object throws a green-ish shadow; a neutral
   grey cast under a green button is the same "grime" mistake as a blue-grey
   shadow on a green ground, just smaller).

   The geometry still comes from the scale — contact + ambient, negative
   spread, light from top-centre — so a primary button sits at the same height
   as everything else at --elev-1.
   ══════════════════════════════════════════════════════════════════════════ */

/** Filled-accent face at --elev-1: lit top edge, shaded underside, tinted cast. */
const EDGE_LIFT =
  'shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.26),inset_0_-1px_0_0_rgb(16_29_26_/_0.18),0_1px_1px_-0.5px_rgb(16_29_26_/_0.2),0_8px_18px_-10px_color-mix(in_oklab,var(--color-signal)_58%,transparent)]'
/** …and at --elev-2: the object came up a pixel, so the cast grew and softened. */
const EDGE_LIFT_HOVER =
  'hover:shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.3),inset_0_-1px_0_0_rgb(16_29_26_/_0.16),0_2px_3px_-1px_rgb(16_29_26_/_0.18),0_14px_28px_-12px_color-mix(in_oklab,var(--color-signal)_72%,transparent)]'
/**
 * The press. A control that only changes colour has not been pressed — the
 * whole point of a tactile control is that the shadow turns inward and the
 * face travels the millimetre it was sitting above the ground.
 */
const EDGE_PRESS =
  'active:translate-y-px active:shadow-[inset_0_2px_5px_0_rgb(16_29_26_/_0.34),inset_0_1px_1px_0_rgb(16_29_26_/_0.24)]'

/* ══════════════════════════════════════════════════════════════════════════
   BUTTON
   ══════════════════════════════════════════════════════════════════════════ */

const buttonVariants = cva(
  cn(
    'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
    'disabled:pointer-events-none disabled:opacity-40',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal',
    '[&_svg]:shrink-0',
  ),
  {
    variants: {
      variant: {
        // The primary action is marine green with white on it — the one
        // filled accent in the product, so it is never ambiguous which
        // control commits.
        primary: cn('bg-signal text-on-accent hover:bg-signal/92', EDGE_LIFT, EDGE_LIFT_HOVER, EDGE_PRESS),
        // A machined plate: `.pw-tactile` carries the gradient, the strong
        // hairline and its own press, so it must not get EDGE_PRESS too or
        // the control travels twice as far as it should.
        secondary: 'pw-tactile text-text',
        ghost: 'text-text-muted hover:bg-raised-2 hover:text-text active:bg-raised-2 active:translate-y-px',
        // An edge and nothing else — the quiet sibling of secondary. Filling
        // it would make two variants that look the same at a glance.
        outline: cn(
          'border border-hairline-strong bg-transparent text-text',
          'hover:border-signal/45 hover:bg-signal/8 hover:text-text',
          EDGE_PRESS,
        ),
        // Destructive, and it must not look inviting: a washed face rather
        // than a filled one, so it reads as a warning you have to mean.
        danger: cn(
          'border border-critical/35 bg-critical/12 text-critical hover:bg-critical/20 hover:border-critical/50',
          'shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.5)]',
          EDGE_PRESS,
        ),
        link: 'h-auto p-0 text-route underline-offset-4 decoration-route/40 hover:underline',
      },
      size: {
        sm: 'h-8 rounded-chip px-3 text-micro',
        md: 'h-9 rounded-chip px-3.5 text-data',
        lg: 'h-11 rounded-card px-5 text-body',
        icon: 'h-9 w-9 rounded-chip',
        'icon-sm': 'h-7 w-7 rounded-chip',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  },
)
Button.displayName = 'Button'

/**
 * A motion-enabled Slot, so `asChild` composes with the hover/press feel.
 * Created once at module scope — `motion.create()` inside a render would make
 * a new component type every pass and remount the child on every render.
 */
const MotionSlot = motion.create(Slot)

/** The house CTA: a small lift on hover, a real press on tap. */
export function MotionButton({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const reduce = useReducedMotion()
  // `asChild` is a Slot concern, not an HTML attribute — forwarding it to a
  // DOM node is a React warning and a stray attribute in the markup.
  const Comp = asChild ? MotionSlot : motion.button

  return (
    <Comp
      whileHover={reduce ? undefined : { y: -1 }}
      whileTap={reduce ? undefined : { scale: 0.985, y: 0 }}
      transition={fastTween}
      className={cn(buttonVariants({ variant, size }), className)}
      {...(props as React.ComponentProps<typeof motion.button>)}
    />
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   SURFACES — a plate and a sheet, not two radii of the same rectangle
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The plate. A milled top edge catching light, a contact shadow welding it to
 * the ground, an ambient shadow giving it height, and a near-white face with a
 * trace of tooth in it — the way an instrument face sits in a bezel.
 *
 * `--elev-1`. Reserved for panels carrying real content and readings;
 * everything gets heavier if everything is a plate.
 */
export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('pw-plate', className)} {...props} />
}

/**
 * The sheet. Same material, `--elev-0`: the milled edge and nothing under it,
 * so a Card inside a Panel reads as a REGION of that plate rather than a second
 * object stacked on it, and a Card on the ground reads as the lighter, quieter
 * thing it is.
 *
 * Dropping the cast is the whole point. The difference between these two
 * surfaces is elevation, and a sheet that casts a shadow onto its own parent
 * is just a smaller plate with a physics error. It no longer overrides the
 * shadow inline either — `.pw-card` carries the full edge pair now, and the
 * bottom hairline of shade is half of what makes a surface read as thick.
 */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('pw-card', className)} {...props} />
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {/* The eyebrow is painted-on identification, not a second heading. The
            rule in front of it is a registration mark: it is what makes the
            label read as stencilled onto the surface rather than typed above
            it, and it costs one span. */}
        {eyebrow && (
          <p className="mb-1.5 flex items-center gap-2">
            <span aria-hidden className="h-[3px] w-3 shrink-0 rounded-full bg-signal/60" />
            <span className="pw-stencil truncate">{eyebrow}</span>
          </p>
        )}
        <h2 className="pw-plate-title text-[17px] leading-tight">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-data text-text-muted">{description}</p>}
      </div>
      {/* The action slot is usually a button, sometimes a whole control row.
          Wrapped so whatever arrives is a flex child that may shrink and is
          capped at the header's width, rather than one that sets it. */}
      {action && <div className="flex min-w-0 max-w-full items-center">{action}</div>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   STATUS — colour is state, never decoration
   ══════════════════════════════════════════════════════════════════════════ */

export type Tone = 'neutral' | 'route' | 'signal' | 'amber' | 'critical' | 'violet' | 'muted'

/**
 * Badge fills. Cut against the plate (#F8FAF9) rather than the old paper: a
 * 10% wash disappeared on a near-white face, so the fills carry a little more
 * body and the hairline does the separating.
 */
const TONE_CLASS: Record<Tone, string> = {
  neutral: 'border-hairline-strong bg-raised-2 text-text-muted',
  route: 'border-route/30 bg-route/12 text-route',
  signal: 'border-signal/30 bg-signal/12 text-signal',
  amber: 'border-amber/35 bg-amber/14 text-amber',
  critical: 'border-critical/40 bg-critical/14 text-critical',
  violet: 'border-violet/30 bg-violet/12 text-violet',
  muted: 'border-hairline bg-transparent text-text-faint',
}

const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-text-faint',
  route: 'bg-route',
  signal: 'bg-signal',
  amber: 'bg-amber',
  critical: 'bg-critical',
  violet: 'bg-violet',
  muted: 'bg-text-faint',
}

/** Readout ink. Used where the figure itself is the state, not its container. */
const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-text',
  route: 'text-route',
  signal: 'text-signal',
  amber: 'text-amber',
  critical: 'text-critical',
  violet: 'text-violet',
  muted: 'text-text-faint',
}

export function StatusBadge({
  tone = 'neutral',
  children,
  dot = true,
  pulse = false,
  className,
}: {
  tone?: Tone
  children: React.ReactNode
  dot?: boolean
  /** Reserved for live/critical states — the one place a badge may animate. */
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-chip border px-2 py-[3px] font-mono text-micro uppercase leading-[1.3] tracking-[0.08em] whitespace-nowrap',
        // A badge is a small object on the plate, so it gets the same top-edge
        // catch as everything else — one hairline, no cast. Without it a row of
        // badges reads as coloured text boxes; with it they read as tags.
        'shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.5)]',
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {pulse && <span className={cn('absolute inline-flex h-full w-full rounded-full pw-pulse', TONE_DOT[tone])} />}
          {/* A seated stud rather than a bullet: the dome highlight is what
              stops a 6px dot reading as a full stop. No halo — inside a badge
              the fill is already carrying the state, and a glow around a dot
              inside a coloured box is two things saying one thing. */}
          <span className={cn('pw-stud relative inline-flex h-1.5 w-1.5', TONE_DOT[tone])} />
        </span>
      )}
      {children}
    </span>
  )
}

/** A quiet label chip for metadata (source, party, basis). */
export function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-chip border border-hairline bg-raised-2/70 px-1.5 py-0.5 text-micro text-text-muted whitespace-nowrap',
        'shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.55)]',
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   ANIMATED NUMBER
   Counts to its target with a critically damped spring — no overshoot on a
   currency value. Mono and tabular by default: every figure in this product
   is a machine reading, and digits that shift width mid-count look unfinished.
   A caller that wants the display face for a headline figure passes it and
   wins, because utilities outrank the `.pw-readout` component class.
   ══════════════════════════════════════════════════════════════════════════ */

export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  className,
}: {
  value: number
  format?: (n: number) => string
  className?: string
}) {
  const reduce = useReducedMotion()
  const motionValue = useMotionValue(value)
  const spring = useSpring(motionValue, numberSpring)
  const display = useTransform(spring, (latest) => format(latest))
  const [text, setText] = useState(() => format(value))

  useEffect(() => {
    if (reduce) {
      setText(format(value))
      return
    }
    motionValue.set(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce])

  useEffect(() => {
    if (reduce) return
    return display.on('change', (v) => setText(v))
  }, [display, reduce])

  return <span className={cn('pw-readout tnum tabular-nums', className)}>{text}</span>
}

/* ══════════════════════════════════════════════════════════════════════════
   DELTA — the movement glyph shared by the rail and the stat plate
   ══════════════════════════════════════════════════════════════════════════
   A filled triangle, not an arrow icon. Instruments print triangles because
   they read at 7px and carry no line weight to get lost; an arrow glyph at
   this size turns to mush and, worse, looks like the icon set rather than the
   instrument. Drawn inline so a UI primitive stays free of an icon dependency.
   ══════════════════════════════════════════════════════════════════════════ */

export interface StatDelta {
  /** Already formatted through `lib/format` — "+4.2%", "−1,240". */
  value: React.ReactNode
  /** Which way the figure moved. What that MEANS is `tone`, below. */
  direction: 'up' | 'down' | 'flat'
  /**
   * Whether up is good news is the caller's call, never ours: on a buyer's
   * screen a rate going up is the thing that costs them money, and a component
   * that hard-codes green-for-up gets that exactly backwards.
   */
  tone?: Tone
  /** Trailing words — "on last week", "vs. plan". */
  caption?: string
}

function DeltaGlyph({ direction }: { direction: StatDelta['direction'] }) {
  if (direction === 'flat') {
    return <span aria-hidden className="block h-[2px] w-2 shrink-0 rounded-full bg-current opacity-70" />
  }
  return (
    <svg
      viewBox="0 0 8 7"
      aria-hidden
      className={cn('h-[7px] w-2 shrink-0 fill-current', direction === 'down' && 'rotate-180')}
    >
      <path d="M4 0 8 7H0Z" />
    </svg>
  )
}

function DeltaMark({ delta, className }: { delta: StatDelta; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1.5 text-micro font-medium',
        TONE_TEXT[delta.tone ?? 'neutral'],
        className,
      )}
    >
      <span className="inline-flex -translate-y-px items-center">
        <DeltaGlyph direction={delta.direction} />
      </span>
      <span className="pw-readout tnum tabular-nums">{delta.value}</span>
      {delta.caption && <span className="font-sans font-normal text-text-faint">{delta.caption}</span>}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   INSTRUMENT RAIL — the device the product is meant to be remembered by
   ══════════════════════════════════════════════════════════════════════════
   A recessed channel carrying live readings: a stencilled name for what is
   being measured, the figure in mono, and whatever qualifies it — a trend, a
   countdown, a badge. The recess is doing the work. A reading in a channel
   reads as measured by the machine; the same reading on a raised chip reads
   as typed in by hand.

   The dividers are grooves rather than borders — one dark pixel with one lit
   pixel beside it — because a plain 1px line inside a recess is a line drawn
   on a picture of a recess. It is a two-hundred-byte detail and it is the
   difference between "machined" and "styled".

   Typed structurally on purpose: a UI primitive never imports from `data/`,
   so callers format through `lib/format` and hand over finished figures.
   ══════════════════════════════════════════════════════════════════════════ */

export interface InstrumentReading {
  /** What is being measured. Painted on, so keep it short. */
  label: string
  /** The figure itself, already formatted through `lib/format`. */
  value: React.ReactNode
  /** Unit or basis printed after the figure — "USD/40'", "days", "per week". */
  unit?: string
  /** Colour only when the reading *is* a state. Default ink otherwise. */
  tone?: Tone
  /** A trend mark, countdown pill or badge, set against the right edge. */
  trailing?: React.ReactNode
  /** One line of context under the readout. */
  hint?: string
  /** Stable key when two readings share a label. */
  id?: string
}

export function InstrumentRail({
  readings,
  className,
  ticks = true,
  ariaLabel,
}: {
  readings: readonly InstrumentReading[]
  className?: string
  /** Draft marks along the channel. They mean "continuous scale" — drop them
      on a rail of two or three unrelated figures. */
  ticks?: boolean
  ariaLabel?: string
}) {
  // Branching markup (not just a transition) on the preference, so this has
  // to be the hydration-safe hook or reduced-motion users get a mismatch.
  const reduce = useSafeReducedMotion()

  if (readings.length === 0) return null

  return (
    // `min-w-0`: the rail is nearly always a flex or grid child, and such a
    // child defaults to `min-width:auto` — it refuses to shrink below the
    // width of its own content, so the scroll box below never gets the chance
    // to scroll and the PAGE scrolls instead. This one class is the whole
    // difference between "wide content scrolls in its box" and "the document
    // is 505px wide on a 360px phone".
    <div className={cn('pw-rail relative min-w-0 overflow-hidden', className)} role="group" aria-label={ariaLabel}>
      {ticks && (
        <>
          {/* Draft marks on both lips. One row reads as decoration on the top
              edge; a matched pair reads as a graduated channel. They are laid
              on the floor of the channel, behind the readings — the `relative`
              on the list below is what puts them there. */}
          <span aria-hidden className="pw-ticks pointer-events-none absolute inset-x-0 top-0 h-2 opacity-55" />
          <span aria-hidden className="pw-ticks pointer-events-none absolute inset-x-0 bottom-0 h-1 opacity-25" />
        </>
      )}

      {/* Wide rails scroll inside their own box; the page body never does.
          On a phone that box holds two of five readings, and a channel that
          simply stops at the right edge looks like a channel with two
          readings in it — so below `sm` the last 2.5rem of the run is masked
          off to nothing, which is the same thing a real instrument does when
          a scale continues past the window. An edge fade rather than a
          two-column grid at this breakpoint because the rail IS one
          continuous channel: the readings are ordered and the grooves between
          them are cut vertically, and both of those stop meaning anything
          once the run is chopped into rows. `black` here is an alpha stop in
          a mask, not a colour in the palette.

          The mask is conditional on there being more than two readings,
          because two always fit and fading a reading that is fully visible is
          a lie about there being more. */}
      <motion.dl
        className={cn(
          'relative flex min-w-0 overflow-x-auto',
          readings.length > 2 &&
            'max-sm:[mask-image:linear-gradient(to_right,black_0,black_calc(100%_-_2.5rem),transparent_100%)]',
        )}
        variants={stagger(reduce ? 0 : 0.035)}
        initial="hidden"
        animate="show"
      >
        {readings.map((reading, i) => (
          <motion.div
            key={reading.id ?? reading.label}
            variants={
              reduce
                ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.12 } } }
                : { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: fastTween } }
            }
            className={cn('min-w-[8.5rem] flex-1 px-3.5 pb-3 pt-3.5 sm:px-4', i > 0 && 'pw-groove-v')}
          >
            <dt className="pw-stencil truncate">{reading.label}</dt>
            <dd className="mt-1.5 flex items-baseline gap-1.5">
              <span
                className={cn(
                  'pw-readout truncate text-[18px] font-medium leading-none',
                  TONE_TEXT[reading.tone ?? 'neutral'],
                )}
              >
                {reading.value}
              </span>
              {reading.unit && (
                <span className="shrink-0 font-mono text-micro text-text-faint">{reading.unit}</span>
              )}
              {reading.trailing && <span className="ml-auto shrink-0 self-center">{reading.trailing}</span>}
            </dd>
            {reading.hint && <p className="mt-1 truncate text-micro text-text-faint">{reading.hint}</p>}
          </motion.div>
        ))}
      </motion.dl>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   STAT PLATE — the card the client was complaining about, done properly
   ══════════════════════════════════════════════════════════════════════════
   A headline figure on a plate. There are only four moving parts and every
   one of them is doing a job:

     · the stencilled label names the reading, small and painted on, so the
       figure is unmistakably the subject and the label is not competing;
     · the figure is mono, tabular and large, set tight — this is a machine
       reading, and it should look like one from across a desk;
     · the delta is a filled triangle and a signed figure, toned by the CALLER
       because whether "up" is good depends entirely on which side of the
       invoice you are standing on;
     · an optional sparkline sits in a recessed strip, because a chart milled
       into the plate reads as part of the instrument and a chart floating on
       top of it reads as a screenshot someone pasted in.

   And the plate behaves like an object: --elev-1 at rest, lifting one pixel to
   --elev-2 under the cursor with the cast growing and softening as the gap to
   the ground opens, settling back on press. That single pixel is most of the
   difference between a card and a thing.

   Structurally typed. A UI primitive never imports from `data/`; callers
   format through `lib/format` and hand over finished strings.
   ══════════════════════════════════════════════════════════════════════════ */

export type StatPlateDelta = StatDelta

export function StatPlate({
  label,
  value,
  unit,
  delta,
  hint,
  tone = 'neutral',
  trailing,
  sparkline,
  footer,
  className,
}: {
  /** What is being measured. Stencilled, so keep it to three or four words. */
  label: string
  /** The headline figure, already formatted. */
  value: React.ReactNode
  /** Unit or basis printed after the figure — "USD/40'", "days", "TEU". */
  unit?: string
  /** Movement, with the caller's reading of whether it is good news. */
  delta?: StatDelta
  /** One line of context under the figure. */
  hint?: string
  /** Colour only when the figure *is* a state. Default ink otherwise. */
  tone?: Tone
  /** A badge or countdown, set against the top-right corner. */
  trailing?: React.ReactNode
  /** A sparkline or micro-chart; framed in a recess by this component. */
  sparkline?: React.ReactNode
  /** A footer strip below a machined groove — a link, a source, a basis. */
  footer?: React.ReactNode
  className?: string
}) {
  return (
    // `min-w-0`: these are laid out four to a grid row, and a grid item sized
    // by `min-width:auto` is sized by the 28px readout inside it — a long
    // figure would widen the whole grid rather than the plate wrapping it.
    <div className={cn('pw-plate pw-lift flex min-w-0 flex-col gap-3 p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="pw-stencil min-w-0 truncate pt-0.5">{label}</p>
        {trailing && <span className="shrink-0">{trailing}</span>}
      </div>

      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span
            className={cn(
              'pw-readout text-[28px] font-medium leading-none tracking-[-0.03em]',
              TONE_TEXT[tone],
            )}
          >
            {value}
          </span>
          {unit && (
            <span className="shrink-0 font-mono text-micro uppercase tracking-[0.08em] text-text-faint">
              {unit}
            </span>
          )}
        </p>
        {delta && <DeltaMark delta={delta} className="mt-2" />}
      </div>

      {sparkline && (
        // The chart is milled into the plate, not stuck on top of it.
        <div className="pw-rail relative h-12 overflow-hidden rounded-chip px-1 py-1">{sparkline}</div>
      )}

      {hint && <p className="text-micro leading-relaxed text-text-faint">{hint}</p>}

      {footer && (
        // Full-bleed groove: the rule runs edge to edge like a joint in the
        // plate, rather than stopping short in the padding like a divider in
        // a document.
        <div className="pw-groove -mx-4 -mb-4 mt-auto px-4 pb-3.5 pt-2.5 text-micro text-text-muted">
          {footer}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   SKELETON & EMPTY STATE
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Height-matched placeholder for anything gated on `useHydrated()`.
 *
 * Matching the real height matters: a skeleton that is the wrong size makes
 * the page jump the instant persisted state arrives. So does the wrong
 * *value* — `.pw-skeleton` is painted at the plate's face colour and carries
 * the plate's milled edge, so a gate standing in for a Panel resolves without
 * a flash of a different grey.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('pw-skeleton rounded-chip', className)} />
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-12 text-center', className)}>
      {/* The icon sits in a recess: an empty state is still an instrument
          reading, it is just reading nothing. */}
      {icon && (
        <div className="pw-rail mb-2 flex h-11 w-11 items-center justify-center rounded-full text-text-faint">
          {icon}
        </div>
      )}
      <p className="pw-plate-title text-body">{title}</p>
      {description && <p className="max-w-sm text-data leading-relaxed text-text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   DEMO NOTICES — every "this is simulated" label routes through here
   ══════════════════════════════════════════════════════════════════════════ */

export function DemoNotice({
  children,
  variant = 'inline',
  className,
}: {
  children: React.ReactNode
  variant?: 'inline' | 'block' | 'badge'
  className?: string
}) {
  if (variant === 'badge') {
    return (
      // The longest of these labels is 46 characters of tracked mono — wider
      // than a 360px viewport on its own. It is a disclaimer, not a figure, so
      // it takes a second line rather than pushing the page: `max-w-full`
      // gives it a ceiling to wrap against and `break-words` covers the case
      // where a single token is still too long. Aligned to the top with the
      // stud dropped onto the first line's centre, so a two-line badge does
      // not float its dot in the gutter between the lines.
      <span
        className={cn(
          'inline-flex max-w-full items-start gap-1.5 rounded-chip border border-amber/30 bg-amber/10 px-2 py-1 font-mono text-micro uppercase leading-[1.45] tracking-[0.1em] text-amber',
          'break-words',
          'shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.5)]',
          className,
        )}
      >
        <span aria-hidden className="pw-stud mt-[0.5em] h-1 w-1 shrink-0 bg-amber" />
        <span className="min-w-0">{children}</span>
      </span>
    )
  }

  if (variant === 'block') {
    return (
      <div
        className={cn(
          'pw-rail rounded-card px-3.5 py-3 text-data leading-relaxed text-text-muted',
          className,
        )}
      >
        {children}
      </div>
    )
  }

  return (
    <p className={cn('font-mono text-micro uppercase tracking-[0.1em] text-text-faint', className)}>{children}</p>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   FIELD PRIMITIVES — inputs are recesses, controls are machined
   ══════════════════════════════════════════════════════════════════════════ */

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
  htmlFor,
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
  htmlFor?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="pw-stencil flex items-baseline gap-1.5">
        {label}
        {required && <span className="text-critical">*</span>}
        {hint && (
          <span className="ml-auto font-sans text-micro normal-case tracking-normal text-text-faint">{hint}</span>
        )}
      </label>
      {children}
      {error && (
        <p className="flex items-start gap-1.5 text-micro text-critical">
          <span aria-hidden className="pw-stud mt-[5px] h-1 w-1 shrink-0 bg-critical" />
          {error}
        </p>
      )}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        // `.pw-field` is the recess and carries its own focus ring, so there
        // is no second ring here to fight it.
        'pw-field h-10 w-full rounded-chip px-3 text-body text-text placeholder:text-text-faint',
        'focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const NumberInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <Input ref={ref} type="number" inputMode="decimal" className={cn('tnum font-mono', className)} {...props} />
  ),
)
NumberInput.displayName = 'NumberInput'

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'pw-field min-h-[80px] w-full resize-y rounded-chip px-3 py-2 text-body leading-relaxed text-text placeholder:text-text-faint',
        'focus:outline-none',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

/**
 * Segmented control. Used for mode, direction, scope — anywhere the options
 * are few enough that a dropdown would hide information the user needs to
 * compare.
 *
 * The track is a recess and the selected option is the one raised thing in
 * it, which is what makes the state readable without reading the labels. The
 * unselected options press into the channel on tap; the selected one is
 * already down and stays put, because a control that pops up when you press
 * it is a control that is lying about which state it is in.
 *
 * WRAPS, never scrolls. A six-option control at 360px is the case that
 * decides it: scrolled inside its own box, four of the six options are off
 * screen with nothing to say they exist, and the one thing a segmented
 * control is for — comparing the options at a glance — is gone. Wrapped, all
 * six stay visible and tappable on two rows, the channel simply gets taller,
 * and a two-option control never wraps at all so it is unaffected. The thumb
 * animates between rows on `layoutId` exactly as it does along one.
 *
 * `max-w-full` is the other half: as a flex child this is an `inline-flex`
 * box that would otherwise size to its widest possible line, and a wrapping
 * container that is never told how wide it may be has no reason to wrap.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
  ariaLabel,
}: {
  options: Array<{ value: T; label: string; hint?: string }>
  value: T
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
  ariaLabel?: string
}) {
  const reduce = useReducedMotion()
  // Two controls sharing one `layoutId` make the thumb fly across the page
  // between them, so an unnamed group falls back to an instance-unique id
  // rather than to the string "group".
  const uid = useId()
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('pw-rail inline-flex max-w-full flex-wrap gap-1 rounded-chip p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative rounded-[4px] transition-[color,transform] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
              size === 'sm' ? 'px-2.5 py-1 text-micro' : 'px-3 py-1.5 text-data',
              active ? 'text-on-accent' : 'text-text-muted hover:text-text active:translate-y-px',
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${ariaLabel ?? uid}`}
                // The thumb is the one raised object in the channel: lit on its
                // top edge, a contact shadow under it, and a whisper of the
                // accent's own cast so it sits in the recess rather than
                // floating over it.
                className="absolute inset-0 rounded-[4px] bg-signal shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.24),inset_0_-1px_0_0_rgb(16_29_26_/_0.2),0_1px_2px_-0.5px_rgb(16_29_26_/_0.3)]"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10 whitespace-nowrap font-medium">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   MISC
   ══════════════════════════════════════════════════════════════════════════ */

export function Divider({ className, label }: { className?: string; label?: string }) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <span className="h-px flex-1 bg-hairline" />
        <span className="pw-stencil shrink-0">{label}</span>
        <span className="h-px flex-1 bg-hairline" />
      </div>
    )
  }
  return <div className={cn('h-px w-full bg-hairline', className)} />
}

/**
 * Label/value row used across every detail panel in the product.
 *
 * The dotted leader is not decoration. Twenty of these stacked in a panel is a
 * ladder of floating pairs, and the eye loses which value belongs to which
 * label somewhere around the sixth row — the leader is how printed schedules,
 * manifests and timetables have solved that for a century. It shrinks to
 * nothing before the value does, so a long value never gets truncated to make
 * room for a decoration.
 */
export function DataRow({
  label,
  value,
  mono = false,
  className,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 items-baseline justify-between gap-2 py-1.5', className)}>
      <span className="shrink-0 font-mono text-micro uppercase tracking-[0.1em] text-text-faint">{label}</span>
      <span
        aria-hidden
        className="mb-[3px] min-w-2 flex-1 shrink self-end border-b border-dotted border-hairline-strong/60"
      />
      {/* `break-words` because half the values in this product are container
          numbers, MBLs and booking references — single unbroken tokens that a
          narrow panel cannot wrap at a space, and which would otherwise run
          out of the plate they are printed on. */}
      <span className={cn('min-w-0 break-words text-right text-data text-text', mono && 'pw-id')}>{value}</span>
    </div>
  )
}

/**
 * Progress bar. `tone` carries meaning — utilisation over 90% is not "fine".
 *
 * The track is a recessed channel and the ticks are laid *over* the fill, not
 * under it, so the bar reads as liquid rising behind a graduated window rather
 * than a coloured rectangle with a texture on the empty part. That is the
 * difference between a gauge and a progress bar, and this product is full of
 * gauges.
 *
 * The fill is laid out at its final width and animated on `scaleX`: animating
 * `width` would put a layout pass in every frame.
 */
export function Meter({
  value,
  max = 100,
  tone = 'signal',
  className,
  label,
}: {
  value: number
  max?: number
  tone?: Tone
  className?: string
  label?: string
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const reduce = useReducedMotion()

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {label && (
        <div className="flex min-w-0 items-baseline justify-between gap-2">
          <span className="pw-stencil truncate">{label}</span>
          <span className={cn('pw-readout shrink-0 text-micro', TONE_TEXT[tone])}>{pct.toFixed(0)}%</span>
        </div>
      )}
      <div
        className="pw-rail relative h-2 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <motion.div
          className={cn(
            'h-full origin-left rounded-full shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.3)]',
            TONE_DOT[tone],
          )}
          style={{ width: `${pct}%` }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={reduce ? { duration: 0 } : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
        {/* Graduations over the whole channel, filled and empty alike. */}
        <span aria-hidden className="pw-ticks pointer-events-none absolute inset-0 opacity-30" />
      </div>
    </div>
  )
}
