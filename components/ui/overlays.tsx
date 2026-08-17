'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { forwardRef } from 'react'

import { drawerSlide, overlayFade, panelSpring, reduce as reduceVariants, scaleIn } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * OVERLAYS
 * ══════════════════════════════════════════════════════════════════════════
 * Built on Radix so focus trapping, escape handling, scroll locking, ARIA
 * wiring and roving tabindex come for free and are correct. Hand-rolling any
 * of those is how a keyboard user gets stuck inside a drawer with no way out.
 *
 * Framer wraps the presentation only.
 *
 * MATERIAL: this file is where glass belongs, because everything in it
 * genuinely floats over something you can see. `.pw-overlay` is glass —
 * blurred, saturation-lifted, and 96% dense on purpose.
 *
 * That last number is the whole argument. Every one of these surfaces carries
 * 11–13px type, much of it `text-text-faint`, which clears AA by a hair on a
 * solid plate. Modelling the blend over the scrim: at 93% density the faint
 * ink lands at 4.38:1 and fails; at 96% it holds 4.5:1. So the density is not
 * a taste call, it is the highest transparency the type survives — legibility
 * first, effect second, and the effect is still there in the saturation and
 * the movement behind the edges.
 *
 * The genuinely see-through glass (`.pw-glass`, `.pw-glass-panel`) is reserved
 * for the header and the search panel, which float over bright harbour footage
 * rather than over a dark scrim.
 *
 * Elevation: drawers and modals sit at --elev-4, menus and tooltips at
 * --elev-3. Neither picks a shadow of its own.
 */

/* ══════════════════════════════════════════════════════════════════════════
   DRAWER — the confirmation and detail surface
   ══════════════════════════════════════════════════════════════════════════ */

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = 'md',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  width?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const shouldReduce = useReducedMotion()

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                variants={overlayFade}
                initial="hidden"
                animate="show"
                exit="exit"
                className="fixed inset-0 z-50 pw-scrim backdrop-blur-[2px]"
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                variants={reduceVariants(drawerSlide, shouldReduce)}
                initial="hidden"
                animate="show"
                exit="exit"
                className={cn(
                  'pw-overlay pw-elev-4 fixed inset-y-0 right-0 z-50 flex w-full flex-col rounded-l-panel',
                  widths[width],
                )}
              >
                {/* The header sits above the content, so its joint is cut the
                    way a joint above something is cut: the dark line, then the
                    lit pixel below it. A bare 1px border here is a line drawn
                    on a picture of a drawer. */}
                <header className="pw-groove-b flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
                  <div className="min-w-0">
                    <DialogPrimitive.Title className="pw-plate-title text-[15px] leading-tight">
                      {title}
                    </DialogPrimitive.Title>
                    {description && (
                      <DialogPrimitive.Description className="mt-1 text-data text-text-muted">
                        {description}
                      </DialogPrimitive.Description>
                    )}
                  </div>
                  {/* 44px, because this is the control every user reaches for
                      first and on a phone it is the only way out. */}
                  <DialogPrimitive.Close
                    className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-chip text-text-faint transition-colors hover:bg-raised-2 hover:text-text active:translate-y-px"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </DialogPrimitive.Close>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

                {/* The footer is BELOW the content, so its lit pixel falls
                    inside the footer: `inset` top highlight, not an outset. */}
                {footer && (
                  <footer className="border-t border-hairline px-5 py-3.5 shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.8)]">
                    {footer}
                  </footer>
                )}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   MODAL — centred, for confirmations
   ══════════════════════════════════════════════════════════════════════════ */

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children?: React.ReactNode
  footer?: React.ReactNode
}) {
  const shouldReduce = useReducedMotion()

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                variants={overlayFade}
                initial="hidden"
                animate="show"
                exit="exit"
                className="fixed inset-0 z-50 pw-scrim backdrop-blur-[2px]"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                variants={reduceVariants(scaleIn, shouldReduce)}
                initial="hidden"
                animate="show"
                exit="exit"
                className="pw-overlay pw-elev-4 fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-panel"
              >
                <header className="pw-groove-b border-b border-hairline px-5 py-4">
                  <DialogPrimitive.Title className="pw-plate-title text-[15px] leading-tight">
                    {title}
                  </DialogPrimitive.Title>
                  {description && (
                    <DialogPrimitive.Description className="mt-1 text-data text-text-muted">
                      {description}
                    </DialogPrimitive.Description>
                  )}
                </header>
                {children && <div className="px-5 py-4">{children}</div>}
                {footer && (
                  <footer className="border-t border-hairline px-5 py-3.5 shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.8)]">
                    {footer}
                  </footer>
                )}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   TOOLTIP
   ══════════════════════════════════════════════════════════════════════════ */

export const TooltipProvider = TooltipPrimitive.Provider

export function Tooltip({
  content,
  children,
  side = 'top',
  delay = 200,
}: {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  delay?: number
}) {
  return (
    <TooltipPrimitive.Root delayDuration={delay}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="pw-overlay z-[60] max-w-xs rounded-chip px-2.5 py-1.5 text-micro leading-relaxed text-text data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-raised" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   POPOVER
   ══════════════════════════════════════════════════════════════════════════ */

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger

export const PopoverContent = forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'start', sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn('pw-overlay z-[60] rounded-card p-1', className)}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = 'PopoverContent'

/* ══════════════════════════════════════════════════════════════════════════
   TABS — the underline rides between triggers via layoutId
   ══════════════════════════════════════════════════════════════════════════ */

export const Tabs = TabsPrimitive.Root
export const TabsContent = TabsPrimitive.Content

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      // The baseline is a machined joint, not a hairline: dark line, lit pixel
      // under it. It costs one class and it is the difference between a tab
      // strip that sits *in* the plate and one drawn on top of it.
      //
      // `min-w-0` pairs with the scroll box: a strip of six tabs is routinely
      // wider than a phone, and as a flex or grid child sized by
      // `min-width:auto` it would never shrink far enough to scroll — the page
      // would scroll in its place.
      className={cn(
        'pw-groove-b flex min-w-0 items-center gap-0.5 overflow-x-auto border-b border-hairline',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Tab labels are signage, not prose: the display face at a small size with a
 * touch of tracking is what makes a row of six read as one instrument's
 * controls rather than six links.
 *
 * 44px minimum height, because a tab strip is primary navigation and a 38px
 * target on a phone is a coin toss. The marker under the active tab carries a
 * short glow in its own colour — a 2px bar alone reads as a border, a 2px bar
 * with light coming off it reads as a lit indicator.
 */

export function TabsTrigger({
  className,
  value,
  children,
  layoutGroup = 'tabs',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & { layoutGroup?: string }) {
  const shouldReduce = useReducedMotion()

  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        'group relative inline-flex min-h-[44px] items-center whitespace-nowrap px-3 py-2.5 font-display text-data font-medium tracking-[-0.005em] transition-colors',
        'text-text-muted hover:text-text data-[state=active]:text-text',
        className,
      )}
      {...props}
    >
      {children}
      <span className="absolute inset-x-0 -bottom-px hidden h-[2px] group-data-[state=active]:block">
        <motion.span
          layoutId={layoutGroup}
          className="block h-full w-full rounded-full bg-signal shadow-[0_1px_6px_-1px_color-mix(in_oklab,var(--color-signal)_65%,transparent)]"
          transition={shouldReduce ? { duration: 0 } : panelSpring}
        />
      </span>
    </TabsPrimitive.Trigger>
  )
}
