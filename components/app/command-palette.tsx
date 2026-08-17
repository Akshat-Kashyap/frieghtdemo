'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Command } from 'cmdk'
import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownLeft, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { overlayFade, scaleIn } from '@/lib/motion'
import { useSearch } from '@/store/hooks'

import { ALL_NAV_ITEMS } from './nav-config'

/**
 * ⌘K.
 *
 * Two groups: records the customer actually owns (searched through the same
 * selector the rest of the app uses) and the modules themselves. Every hit
 * carries a route, and `tests/nav.test.ts` checks those routes exist.
 *
 * This is the one surface in the product built for someone who already knows
 * where they are going, so it is dressed like one: the query line is set in
 * mono because what gets typed here is a shipment number as often as a word,
 * the group names are stencilled, the selected row is marked on its leading
 * edge the way the nav rail marks the active module and prints the key that
 * would open it, and the keys that drive the whole thing run along the bottom
 * instead of being folklore.
 *
 * MATERIAL — glass, because it floats over the entire application.
 * ══════════════════════════════════════════════════════════════════════════
 * `.pw-overlay` at 96% density, and that number is an accessibility result
 * rather than a taste call: the rows carry 11px `text-text-faint`, which
 * models at 4.38:1 over the scrim at 93% and 4.5:1 at 96%. Legibility outranks
 * the effect; the effect survives in the saturation lift and in the page
 * visibly moving behind the edges.
 *
 * It sits at --elev-4 rather than the --elev-3 `.pw-overlay` defaults to. A
 * menu hangs off something; this is a modal over a scrim with nothing between
 * it and the viewer, and it should cast like one.
 */

/** A printed key cap — machined, never interactive. */
function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="pw-tactile inline-flex min-w-[1.25rem] items-center justify-center rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] leading-none text-text-faint">
      {children}
    </kbd>
  )
}

/**
 * cmdk renders its group heading inside the group, so it has to be styled
 * from the parent. The stencil is spelled out in utilities rather than
 * reusing `.pw-stencil`: a Tailwind variant can only wrap a Tailwind utility,
 * and `[&_x]:pw-stencil` silently compiles to nothing.
 */
const GROUP_HEADING = [
  '[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3',
  '[&_[cmdk-group-heading]]:font-display [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold',
  '[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.22em] [&_[cmdk-group-heading]]:text-text-faint',
].join(' ')

/**
 * A row. 44px minimum, because this list is driven as often by thumb as by
 * arrow key on a laptop trackpad, and a 36px row in a 340px scroller is a
 * coin toss.
 *
 * The selected row is a wash and a marker, NOT a raised plate. Selection in a
 * list is a place the cursor is, not an object that has lifted off the page —
 * lifting each row as the arrow key runs down it would make the whole panel
 * ripple.
 */
const ITEM = [
  'group relative flex min-h-[44px] cursor-pointer items-center gap-3 rounded-chip px-2.5 py-2',
  'transition-colors data-[selected=true]:bg-signal/10',
].join(' ')

/** The same lit marker the nav rail paints on the module you are in. */
function SelectedMark() {
  return (
    <span
      aria-hidden
      className="absolute inset-y-1.5 left-0 hidden w-[3px] rounded-r-full bg-signal shadow-[0_0_6px_0_color-mix(in_oklab,var(--color-signal)_55%,transparent)] group-data-[selected=true]:block"
    />
  )
}

/** Printed on the row under the cursor: the key that would open it. */
function EnterHint() {
  return (
    <span
      aria-hidden
      className="hidden shrink-0 text-signal group-data-[selected=true]:inline-flex"
      title="Press enter to open"
    >
      <CornerDownLeft className="h-3 w-3" />
    </span>
  )
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const hits = useSearch(query, 8)

  function go(href: string) {
    onOpenChange(false)
    setQuery('')
    router.push(href)
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
                className="pw-scrim fixed inset-0 z-[80] backdrop-blur-[2px]"
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                variants={scaleIn}
                initial="hidden"
                animate="show"
                exit="exit"
                className="pw-overlay pw-elev-4 fixed left-1/2 top-[12vh] z-[81] w-[min(620px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-panel"
              >
                <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>

                <Command shouldFilter={false} loop>
                  {/* The joint under the query line is cut, not bordered: the
                      dark pixel then the lit one beneath it, because the light
                      comes from above and this is a lid over the list. */}
                  <div className="pw-groove-b flex items-center gap-3 border-b border-hairline px-4">
                    <Search className="h-4 w-4 shrink-0 text-text-faint" aria-hidden />
                    <Command.Input
                      autoFocus
                      value={query}
                      onValueChange={setQuery}
                      placeholder="Shipment, request, port, module…"
                      className="h-14 w-full bg-transparent font-mono text-body tracking-[-0.01em] text-text placeholder:font-sans placeholder:tracking-normal placeholder:text-text-faint focus:outline-none"
                    />
                    <Key>esc</Key>
                  </div>

                  <Command.List className="max-h-[340px] overflow-y-auto p-2">
                    <Command.Empty className="px-3 py-8 text-center text-data text-text-muted">
                      Nothing matches “{query}”. Try a shipment number, a port, or a module name.
                    </Command.Empty>

                    {hits.length > 0 && (
                      <Command.Group heading="Your records" className={GROUP_HEADING}>
                        {hits.map((hit) => (
                          <Command.Item
                            key={`${hit.kind}-${hit.id}`}
                            value={`${hit.kind} ${hit.id} ${hit.title}`}
                            onSelect={() => go(hit.href)}
                            className={ITEM}
                          >
                            <SelectedMark />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-data font-medium text-text">{hit.title}</span>
                              <span className="block truncate text-micro text-text-faint">{hit.subtitle}</span>
                            </span>
                            <EnterHint />
                            {/* The record kind is stamped, not written: mono,
                                tracked, seated in a recess so it reads as a
                                classification off the record rather than a
                                word somebody added to the row. */}
                            <span className="pw-rail shrink-0 rounded-chip px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted">
                              {hit.kind}
                            </span>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}

                    <Command.Group heading="Go to" className={GROUP_HEADING}>
                      {ALL_NAV_ITEMS.filter((item) =>
                        query.trim()
                          ? `${item.label} ${item.hint ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())
                          : true,
                      ).map((item) => {
                        const Icon = item.icon
                        return (
                          <Command.Item
                            key={item.key}
                            value={`nav ${item.label}`}
                            onSelect={() => go(item.href)}
                            className={ITEM}
                          >
                            <SelectedMark />
                            <Icon
                              className="h-4 w-4 shrink-0 text-text-faint transition-colors group-data-[selected=true]:text-signal"
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-data text-text">{item.label}</span>
                              {item.hint && (
                                <span className="block truncate text-micro text-text-faint">{item.hint}</span>
                              )}
                            </span>
                            <EnterHint />
                          </Command.Item>
                        )
                      })}
                    </Command.Group>
                  </Command.List>

                  {/* The keys, printed on the instrument rather than learned.
                      The strip is BELOW the list, so its lit pixel falls inside
                      it — an inset highlight, not an outset one. */}
                  <div className="flex items-center gap-4 border-t border-hairline bg-raised-2/60 px-4 py-2.5 shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.8)]">
                    <span className="flex items-center gap-1.5 text-micro text-text-faint">
                      <Key>↑</Key>
                      <Key>↓</Key>
                      move
                    </span>
                    <span className="flex items-center gap-1.5 text-micro text-text-faint">
                      <Key>
                        <CornerDownLeft className="h-2.5 w-2.5" aria-hidden />
                      </Key>
                      open
                    </span>
                    <span className="pw-stencil ml-auto">Simulated records</span>
                  </div>
                </Command>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}
