'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

import { ORGANISATION } from '@/data/org'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/store/session-store'

import { PortWhizzLogo, PortWhizzMark } from '@/components/brand/logo'
import { Tooltip } from '@/components/ui/overlays'
import { NAV_GROUPS, activeNavItem } from './nav-config'

/**
 * The customer sidebar.
 *
 * Every item is visible to every role. Customer-side roles gate *actions*
 * (who may award a request, who sees credit) rather than navigation —
 * hiding Finance from a logistics manager would only make them ask a
 * colleague to read the screen aloud.
 *
 * MATERIAL — the rail is GROUND, and that is the whole idea.
 * ══════════════════════════════════════════════════════════════════════════
 * It has no fill of its own: it is the same mineral surface the entire app
 * sits on, with the draft grid running unbroken from the rail into the content
 * column. If the chrome were another near-white plate, the plates in the
 * content column would have nothing to sit *on* and the product would read as
 * one flat wall from edge to edge. Here the modules float past a fixed
 * surface, and the single plate in the rail is the module you are in.
 *
 * Which is also why glass is wrong here and right in the top bar: nothing
 * passes behind this column, so a blur would be an expensive way to draw
 * nothing. The top bar has the whole page scrolling under it, so it gets glass.
 *
 * Two joints are cut rather than bordered. The rail's right edge and the
 * header's bottom edge each get a dark line with a lit pixel on the far side —
 * the light is overhead and slightly in front, so a vertical joint catches on
 * its right face and a horizontal one on the surface below it. A bare 1px
 * border in both places is what made the chrome read as drawn rather than
 * assembled.
 */
export function AppSidebar() {
  const pathname = usePathname()
  const collapsed = useSessionStore((s) => s.sidebarCollapsed)
  const toggle = useSessionStore((s) => s.toggleSidebar)
  const shouldReduce = useReducedMotion()

  const active = activeNavItem(pathname)

  return (
    <aside
      className={cn(
        // Nothing ever scrolls under it — the content is a sibling column, not
        // beneath. `transition-[width]` is the one width animation in the
        // product and it is deliberate: the rail is a layout container, so
        // there is no transform that would move the content column with it.
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-hairline lg:flex',
        'shadow-[1px_0_0_0_rgb(255_255_255_/_0.55)] transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
        collapsed ? 'w-[68px]' : 'w-[252px]',
      )}
    >
      <div
        className={cn(
          'pw-groove-b flex h-16 shrink-0 items-center border-b border-hairline',
          collapsed ? 'justify-center px-2' : 'px-4',
        )}
      >
        <Link href={ROUTES.home} className="rounded-chip" aria-label="PortWhizz home">
          {collapsed ? <PortWhizzMark className="h-6 w-6" /> : <PortWhizzLogo subtitle="Freight" />}
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3" aria-label="Main">
        {NAV_GROUPS.map((group, groupIndex) => (
          <div key={group.label ?? `group-${groupIndex}`} className={cn(groupIndex > 0 && 'mt-4')}>
            {group.label && !collapsed && (
              // The registration mark in front of the label is what makes the
              // group name read as stencilled onto the rail rather than typed
              // above it. Same device as `SectionHeader`, one span.
              <p className="mb-1.5 flex items-center gap-2 px-3">
                <span aria-hidden className="h-[3px] w-2.5 shrink-0 rounded-full bg-signal/50" />
                <span className="pw-stencil truncate">{group.label}</span>
              </p>
            )}
            {group.label && collapsed && groupIndex > 0 && (
              // Collapsed, the group name has nowhere to go, so the division
              // is cut as a groove instead: dark line, lit pixel under it.
              <div className="pw-groove mx-3 mb-2 h-px" aria-hidden />
            )}

            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = active?.key === item.key

                const link = (
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      // 40px on the desktop rail rather than 44: this is a
                      // pointer-only surface (the whole aside is `lg:flex`),
                      // it carries thirteen items, and the touch equivalents —
                      // the mobile drawer and the collapsed icon rail below —
                      // are both at 44.
                      'group relative flex min-h-[40px] items-center gap-2.5 rounded-chip px-3 text-data',
                      'transition-colors duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
                      collapsed && 'min-h-[44px] justify-center px-0',
                      isActive
                        ? 'font-display font-semibold tracking-[-0.005em] text-text'
                        : 'text-text-muted hover:bg-surface/70 hover:text-text active:translate-y-px',
                    )}
                  >
                    {/* The active item is a plate lifted off the ground with a
                        lit marker on its leading edge. It rides between items
                        on one shared layoutId, so the rail reads as one object
                        moving rather than two fading.

                        No negative z-index: nothing between here and the root
                        opens a stacking context, and the shell's own ground is
                        painted *after* negative-z descendants of it — `-z-10`
                        would bury the plate under the surface it is supposed
                        to sit on. The plate goes first in DOM order and the
                        content is positioned over it instead. */}
                    {isActive && (
                      <motion.span
                        layoutId="app-nav-active"
                        className="pw-plate absolute inset-0 overflow-hidden rounded-chip"
                        transition={shouldReduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 34 }}
                        aria-hidden
                      >
                        {/* A lit bar, not a painted one. The halo is what makes
                            a 3px marker legible at a glance from across a desk,
                            and it is the same device as `.pw-lamp` on a live
                            indicator — this rail item IS the live one. */}
                        <span className="absolute inset-y-1 left-0 w-[3px] rounded-r-full bg-signal shadow-[0_0_6px_0_color-mix(in_oklab,var(--color-signal)_55%,transparent)]" />
                      </motion.span>
                    )}
                    <Icon
                      className={cn(
                        'relative h-4 w-4 shrink-0 transition-colors',
                        isActive ? 'text-signal' : 'text-text-faint group-hover:text-text-muted',
                      )}
                      aria-hidden
                    />
                    {!collapsed && <span className="relative truncate">{item.label}</span>}
                  </Link>
                )

                return (
                  <li key={item.key}>
                    {collapsed ? (
                      <Tooltip content={item.label} side="right">
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* `.pw-groove` carries its own top border plus the lit pixel under it —
          the joint above a region, cut the way the light actually falls. */}
      <div className="pw-groove shrink-0 p-2">
        {!collapsed && (
          // Who you are looking at, milled into the ground rather than printed
          // on another card. A rail here and a plate for the active nav item
          // is the same two-material argument the whole product runs on:
          // recessed is context, raised is where you are.
          <div className="pw-rail mb-2 rounded-card px-3 py-2.5">
            <p className="truncate font-display text-[12px] font-semibold tracking-[-0.005em] text-text">
              {ORGANISATION.shortName}
            </p>
            <p className="pw-stencil mt-1 truncate">{ORGANISATION.country} · Demo org</p>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          className={cn(
            'flex min-h-[44px] w-full items-center gap-2.5 rounded-chip px-3 text-data text-text-muted',
            'transition-[background-color,color,transform] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
            'hover:bg-surface/70 hover:text-text active:translate-y-px',
            collapsed && 'justify-center px-0',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
