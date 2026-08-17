'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Search, Sparkles } from 'lucide-react'

import { DEMO } from '@/data/copy'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'

import { NAV_GROUPS, activeNavItem } from './nav-config'
import { RoleSwitcher } from './role-switcher'

/**
 * The application top bar.
 *
 * Carries the current module name, the two global entry points (search and
 * Zeno) and who you are acting as. The demo badge is permanent and not
 * dismissible — every figure below it is simulated, and that should never be
 * more than one glance away.
 *
 * MATERIAL — this is the one piece of chrome that gets GLASS, and it earns it.
 * ══════════════════════════════════════════════════════════════════════════
 * The entire page scrolls underneath it. That is the test: glass belongs where
 * you would physically see through to something moving behind, and on a flat
 * section it is an expensive way to draw a box. So the bar is tinted with the
 * GROUND rather than with the plate face — a near-white glass here would put a
 * white band across the top of every screen and the plates would appear to
 * scroll into a wall. Ground-tinted, they scroll *under* a surface.
 *
 * Three lines make it read as a pane with thickness rather than a translucent
 * div: a bright catch along its top edge, a fainter wrap where the light grazes
 * the chamfer, and the shaded lip underneath. The saturation lift is not
 * decoration either — a blur on its own desaturates whatever passes behind it,
 * and a green plate that goes grey as it slides under the bar looks like a
 * smudge on the lens.
 *
 * The module is identified the way a berth is: the section painted above the
 * name in stencil. Two lines at 10px and 15px carry more orientation than one
 * line at 15px did.
 */
export function AppTopbar({
  onOpenPalette,
  onOpenMobileNav,
  onOpenZeno,
}: {
  onOpenPalette: () => void
  onOpenMobileNav: () => void
  onOpenZeno: () => void
}) {
  const pathname = usePathname()
  const active = activeNavItem(pathname)

  // The section this module belongs to, read from the same array the sidebar
  // renders — never a second list to drift out of step. Home's group is
  // deliberately unlabelled in the nav, so it falls back to the workspace.
  const section = active
    ? (NAV_GROUPS.find((group) => group.items.some((item) => item.key === active.key))?.label ?? 'Workspace')
    : 'Workspace'

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-hairline',
        // Tinted with `ink` — the ground token — not with the plate face.
        'bg-ink/78 backdrop-blur-2xl backdrop-saturate-[1.7]',
        // Top catch · chamfer wrap · shaded lip · the cast the page falls into.
        'shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.7),inset_0_0_0_1px_rgb(255_255_255_/_0.1),0_1px_0_0_rgb(255_255_255_/_0.5),0_10px_22px_-18px_rgb(16_29_26_/_0.45)]',
      )}
    >
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-chip text-text-muted lg:hidden',
            'transition-[background-color,color,transform] duration-[180ms] hover:bg-surface hover:text-text active:translate-y-px',
          )}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 shrink">
          <p className="flex items-center gap-1.5">
            <span aria-hidden className="h-[3px] w-2 shrink-0 rounded-full bg-signal/60" />
            <span className="pw-stencil truncate">{section}</span>
          </p>
          <h1 className="mt-0.5 truncate font-display text-[15px] font-semibold leading-none tracking-[-0.015em] text-text">
            {active?.label ?? 'Freight workspace'}
          </h1>
        </div>

        {/* Search is a button, not an input: it opens the palette, and an input
            that does not accept typing where it stands is a lie. It is cut as a
            recess — shade at the top lip where the near wall blocks the ceiling
            light, catch on the far lip below — so it still reads as the place
            text goes without pretending to be one. */}
        <button
          type="button"
          onClick={onOpenPalette}
          className={cn(
            'pw-field ml-auto hidden h-10 min-w-[240px] items-center gap-2 rounded-chip px-3 md:flex',
            'text-data text-text-faint transition-colors hover:text-text-muted',
          )}
        >
          <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">Search shipments, rates, ports…</span>
          <kbd className="pw-tactile ml-auto shrink-0 rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] leading-none text-text-faint">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <button
            type="button"
            onClick={onOpenPalette}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-chip text-text-muted md:hidden',
              'transition-[background-color,color,transform] duration-[180ms] hover:bg-surface hover:text-text active:translate-y-px',
            )}
            aria-label="Search"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>

          {/* A filled-accent control, so the highlight has to be white-on-green
              and the cast tinted with the accent — a neutral grey shadow under
              a green button is the same "grime" mistake as a blue-grey shadow
              on a green ground, just smaller. 44px square until the label
              appears at 640px, because until then it is an icon-only target. */}
          <button
            type="button"
            onClick={onOpenZeno}
            className={cn(
              'inline-flex h-11 w-11 items-center justify-center gap-1.5 rounded-chip sm:h-10 sm:w-auto sm:px-3',
              'border border-signal/35 bg-signal/12 font-display text-data font-semibold tracking-[-0.005em] text-signal',
              'shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.55),0_1px_1px_-0.5px_rgb(16_29_26_/_0.06),0_6px_14px_-10px_color-mix(in_oklab,var(--color-signal)_60%,transparent)]',
              'transition-[background-color,box-shadow,transform] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
              'hover:bg-signal/18 hover:shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.6),0_2px_3px_-1px_rgb(16_29_26_/_0.06),0_12px_24px_-12px_color-mix(in_oklab,var(--color-signal)_72%,transparent)]',
              'active:translate-y-px active:shadow-[inset_0_2px_4px_0_rgb(16_29_26_/_0.16)]',
            )}
            aria-label="Ask Zeno"
          >
            <Sparkles className="h-4 w-4 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
            <span className="hidden sm:inline">Ask Zeno</span>
          </button>

          <Link
            href={ROUTES.landing}
            className={cn(
              'hidden items-center gap-1.5 rounded-full border border-amber/30 bg-amber/10 px-2.5 py-1 xl:inline-flex',
              'font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-amber',
              'shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.5)] transition-colors hover:bg-amber/16',
            )}
            title="This is a simulated environment. Return to the marketing page."
          >
            {/* A lamp, not a bullet: the halo is what makes a 4px indicator
                legible against the glass at a glance. */}
            <span className="pw-lamp h-1 w-1 text-amber" aria-hidden />
            {DEMO.badgeShort}
          </Link>

          <RoleSwitcher />
        </div>
      </div>
    </header>
  )
}
